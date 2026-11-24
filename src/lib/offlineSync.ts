import type { SabbathSchoolEdition } from '../hooks/usePreferences';
import { putSyncMeta, type SabbathSchoolSyncMeta } from './offlineDb';
import {
  fetchDayRead,
  fetchLessonDetail,
  fetchQuarterlies,
  fetchQuarterlyDetail,
  filterQuarterliesByEdition,
  getQuarterIdPrefixForDate,
  resolveActiveQuarterly,
} from './sabbathSchoolApi';

export const SS_SYNC_META_KEY = 'sabbath-school-quarter';
export const HYMN_MIDI_CACHE_NAME = 'hymn-midi-cache';
export const TOTAL_HYMN_MIDIS = 695;

const MIDI_PATH_RE = /\/midi\/\d{3}\.mid$/i;

function getBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export function buildMidiUrl(hymnNumber: number): string {
  const filename = `${String(Math.max(1, Math.floor(hymnNumber))).padStart(3, '0')}.mid`;
  const path = `${getBaseUrl()}midi/${filename}`;
  return typeof window !== 'undefined' ? new URL(path, window.location.origin).href : path;
}

function hasMthdHeaderBytes(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 14) return false;
  const bytes = new Uint8Array(buffer, 0, 4);
  return bytes[0] === 0x4d && bytes[1] === 0x54 && bytes[2] === 0x68 && bytes[3] === 0x64;
}

export async function getCachedMidiCount(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  try {
    const cache = await caches.open(HYMN_MIDI_CACHE_NAME);
    const keys = await cache.keys();
    return keys.filter((req) => MIDI_PATH_RE.test(req.url)).length;
  } catch {
    return 0;
  }
}

export interface PersistentStorageReport {
  persisted: boolean;
  usageBytes: number;
  quotaBytes: number;
}

export async function requestPersistentStorage(): Promise<PersistentStorageReport> {
  let persisted = false;
  let usageBytes = 0;
  let quotaBytes = 0;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (typeof navigator.storage.persisted === 'function') {
        persisted = await navigator.storage.persisted();
      }
      if (!persisted && typeof navigator.storage.persist === 'function') {
        persisted = await navigator.storage.persist();
      }
      if (typeof navigator.storage.estimate === 'function') {
        const est = await navigator.storage.estimate();
        usageBytes = est.usage || 0;
        quotaBytes = est.quota || 0;
      }
    } catch {
      // Ignore unsupported browser storage calls
    }
  }

  return { persisted, usageBytes, quotaBytes };
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let nextIdx = 0;
  async function runWorker() {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      await worker(items[idx]);
    }
  }
  const count = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: count }, runWorker));
}

const ALL_EDITIONS: SabbathSchoolEdition[] = ['adult', 'inverse', 'cornerstone'];

/**
 * Downloads and caches the current calendar quarter for all 3 editions
 * (Adult, Inverse, Cornerstone Connections) into IndexedDB.
 */
export async function syncCurrentSabbathSchoolQuarter(
  onProgress?: (detail: string) => void,
  forceNetwork = false,
): Promise<SabbathSchoolSyncMeta> {
  const now = new Date();
  const quarterPrefix = getQuarterIdPrefixForDate(now);
  onProgress?.(`Checking quarter ${quarterPrefix}...`);

  const quarterlies = await fetchQuarterlies({ forceNetwork });
  const syncedQuarterIds: Partial<Record<SabbathSchoolEdition, string>> = {};
  let lessonsCached = 0;
  let daysCached = 0;
  let hadError = false;
  let lastError: string | undefined;

  for (const edition of ALL_EDITIONS) {
    const editionList = filterQuarterliesByEdition(quarterlies, edition);
    const active = resolveActiveQuarterly(editionList, now);
    if (!active) continue;

    syncedQuarterIds[edition] = active.id;
    onProgress?.(`Syncing ${edition} (${active.id})...`);

    try {
      const detail = await fetchQuarterlyDetail(active.id, { forceNetwork });

      await mapWithConcurrency(detail.lessons, 4, async (lesson) => {
        try {
          const lessonDetail = await fetchLessonDetail(active.id, lesson.id, { forceNetwork });
          lessonsCached += 1;

          if (lessonDetail.days.length > 0) {
            await mapWithConcurrency(lessonDetail.days, 4, async (day) => {
              try {
                await fetchDayRead(active.id, lesson.id, day.id, { forceNetwork });
                daysCached += 1;
              } catch (err) {
                hadError = true;
                lastError = err instanceof Error ? err.message : 'Day sync error';
              }
            });
          } else if (lessonDetail.pdfs.length > 0 && typeof caches !== 'undefined') {
            // Best-effort cache warm-up for Cornerstone Connections PDFs
            try {
              const cache = await caches.open('ss-pdf-cache');
              for (const pdf of lessonDetail.pdfs.slice(0, 1)) {
                const existing = await cache.match(pdf.src);
                if (!existing) {
                  const res = await fetch(pdf.src).catch(() => null);
                  if (res && res.ok) {
                    await cache.put(pdf.src, res);
                  }
                }
              }
            } catch {
              // Cross-origin PDF caching is best-effort
            }
          }
        } catch (err) {
          hadError = true;
          lastError = err instanceof Error ? err.message : 'Lesson sync error';
        }
      });
    } catch (err) {
      hadError = true;
      lastError = err instanceof Error ? err.message : 'Quarterly sync error';
    }
  }

  const meta: SabbathSchoolSyncMeta = {
    quarterPrefix,
    syncedQuarterIds,
    lessonsCached,
    daysCached,
    lastSyncedAt: Date.now(),
    status: hadError && lessonsCached === 0 ? 'error' : hadError ? 'partial' : 'ready',
    lastError,
  };

  await putSyncMeta(SS_SYNC_META_KEY, meta);
  onProgress?.(
    meta.status === 'ready'
      ? `Synced ${lessonsCached} lessons across 3 editions`
      : `Synced ${lessonsCached} lessons (${meta.status})`,
  );

  return meta;
}

/**
 * Progressively warms Cache Storage with all 695 hymnal MIDI files so full offline
 * playback works in Airplane Mode without bloating the Service Worker install phase.
 */
export async function syncAllHymnMidisOffline(
  onProgress?: (cached: number, total: number) => void,
): Promise<number> {
  if (typeof caches === 'undefined' || typeof window === 'undefined') return 0;

  const cache = await caches.open(HYMN_MIDI_CACHE_NAME);
  const existingKeys = await cache.keys();
  const existingUrls = new Set(existingKeys.map((req) => req.url));

  const missing: number[] = [];
  for (let num = 1; num <= TOTAL_HYMN_MIDIS; num += 1) {
    if (!existingUrls.has(buildMidiUrl(num))) {
      missing.push(num);
    }
  }

  let cachedCount = existingKeys.filter((req) => MIDI_PATH_RE.test(req.url)).length;
  onProgress?.(Math.min(TOTAL_HYMN_MIDIS, cachedCount), TOTAL_HYMN_MIDIS);

  if (missing.length === 0) return Math.min(TOTAL_HYMN_MIDIS, cachedCount);
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return Math.min(TOTAL_HYMN_MIDIS, cachedCount);
  }

  let completedInBatch = 0;

  await mapWithConcurrency(missing, 4, async (num) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const url = buildMidiUrl(num);
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      if (!hasMthdHeaderBytes(buf)) return;

      await cache.put(
        url,
        new Response(buf, {
          status: 200,
          headers: { 'Content-Type': 'audio/midi' },
        }),
      );
      cachedCount += 1;
      completedInBatch += 1;
      if (completedInBatch % 15 === 0) {
        onProgress?.(Math.min(TOTAL_HYMN_MIDIS, cachedCount), TOTAL_HYMN_MIDIS);
      }
    } catch {
      // Skip transient offline/network error; next online session resumes missing tracks
    }
  });

  const finalKeys = await cache.keys();
  const finalCount = finalKeys.filter((req) => MIDI_PATH_RE.test(req.url)).length;
  onProgress?.(Math.min(TOTAL_HYMN_MIDIS, finalCount), TOTAL_HYMN_MIDIS);
  return Math.min(TOTAL_HYMN_MIDIS, finalCount);
}
