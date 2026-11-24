import { BIBLE_BOOK_BY_ID } from '../data/bibleBooks';
import type { BibleVersionId } from '../hooks/usePreferences';
import {
  getOfflineBibleChapter,
  getOfflineBibleVersions,
  putBibleChaptersBatch,
  putOfflineBibleChapter,
  putOfflineBibleVersionMeta,
  searchOfflineBibleVersion,
  type OfflineBibleChapterRecord,
} from './offlineDb';

export interface BibleVersionMeta {
  id: BibleVersionId;
  name: string;
  provider: 'bolls' | 'helloao';
}

export const BIBLE_VERSIONS: BibleVersionMeta[] = [
  { id: 'NKJV', name: 'New King James Version', provider: 'bolls' },
  { id: 'KJV', name: 'King James Version', provider: 'bolls' },
  { id: 'ESV', name: 'English Standard Version', provider: 'bolls' },
  { id: 'NLT', name: 'New Living Translation', provider: 'bolls' },
  { id: 'WEB', name: 'World English Bible', provider: 'bolls' },
  { id: 'BSB', name: 'Berean Standard Bible', provider: 'helloao' },
];

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleSearchHit {
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

const chapterCache = new Map<string, BibleVerse[]>();
const STORAGE_PREFIX = 'sabbath-light:bible:ch:';

/**
 * Removes Strong's <S>7225</S> tags, footnotes <sup>...</sup>, and HTML markup safely.
 */
export function sanitizeBollsVerseText(rawHtml: string): string {
  if (!rawHtml) return '';
  return rawHtml
    .replace(/<S>[^<]*<\/S>/gi, '')
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;|—/g, ', ')
    .replace(/&ndash;|–/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

interface HelloAoContentPart {
  text?: string;
  lineBreak?: boolean;
  noteId?: number;
}

interface HelloAoBlock {
  type: string;
  number?: number;
  content?: Array<string | HelloAoContentPart>;
}

interface HelloAoChapterResponse {
  chapter?: {
    content?: HelloAoBlock[];
  };
}

function extractHelloAoVerses(payload: HelloAoChapterResponse): BibleVerse[] {
  const blocks = payload?.chapter?.content || [];
  const verses: BibleVerse[] = [];
  for (const block of blocks) {
    if (block.type !== 'verse' || typeof block.number !== 'number') continue;
    const parts: string[] = [];
    for (const item of block.content || []) {
      if (typeof item === 'string') {
        parts.push(item);
      } else if (item && typeof item === 'object') {
        if (typeof item.text === 'string') {
          parts.push(item.text);
        } else if (item.lineBreak) {
          parts.push(' ');
        }
      }
    }
    const text = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (text) {
      verses.push({ verse: block.number, text });
    }
  }
  return verses;
}

function readLegacyLocalChapter(cacheKey: string): BibleVerse[] | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BibleVerse[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function fetchBibleChapter(
  version: BibleVersionId,
  bookId: number,
  chapter: number,
): Promise<BibleVerse[]> {
  const cacheKey = `${version}:${bookId}:${chapter}`;
  const inMem = chapterCache.get(cacheKey);
  if (inMem) return inMem;

  const idbCached = await getOfflineBibleChapter(version, bookId, chapter).catch(() => null);
  if (idbCached) {
    chapterCache.set(cacheKey, idbCached);
    return idbCached;
  }

  const meta = BIBLE_VERSIONS.find((v) => v.id === version);
  const book = BIBLE_BOOK_BY_ID.get(bookId);
  if (!meta || !book) {
    throw new Error(`Invalid version (${version}) or book (${bookId})`);
  }

  try {
    let verses: BibleVerse[];
    if (meta.provider === 'helloao') {
      const res = await fetch(`https://bible.helloao.org/api/${version}/${book.usfm}/${chapter}.json`);
      if (!res.ok) throw new Error(`HelloAO HTTP ${res.status}`);
      const json = (await res.json()) as HelloAoChapterResponse;
      verses = extractHelloAoVerses(json);
    } else {
      const res = await fetch(`https://bolls.life/get-text/${version}/${bookId}/${chapter}/`);
      if (!res.ok) throw new Error(`Bolls HTTP ${res.status}`);
      const raw = (await res.json()) as Array<{ verse: number; text: string }>;
      verses = raw
        .map((v) => ({
          verse: Number(v.verse),
          text: sanitizeBollsVerseText(v.text),
        }))
        .filter((v) => v.verse > 0 && v.text.length > 0);
    }

    chapterCache.set(cacheKey, verses);
    await putOfflineBibleChapter(version, bookId, chapter, verses).catch(() => {});
    return verses;
  } catch (err) {
    const legacy = readLegacyLocalChapter(cacheKey);
    if (legacy) {
      chapterCache.set(cacheKey, legacy);
      await putOfflineBibleChapter(version, bookId, chapter, legacy).catch(() => {});
      return legacy;
    }

    // Fallback to HelloAO for KJV/WEB if Bolls fails while online
    if (typeof navigator !== 'undefined' && navigator.onLine && (version === 'KJV' || version === 'WEB')) {
      const fallbackId = version === 'KJV' ? 'eng_kjv' : 'ENGWEBP';
      try {
        const res = await fetch(
          `https://bible.helloao.org/api/${fallbackId}/${book.usfm}/${chapter}.json`,
        );
        if (res.ok) {
          const json = (await res.json()) as HelloAoChapterResponse;
          const verses = extractHelloAoVerses(json);
          chapterCache.set(cacheKey, verses);
          await putOfflineBibleChapter(version, bookId, chapter, verses).catch(() => {});
          return verses;
        }
      } catch {
        // Fall through to offline error below
      }
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error(
        `Offline: ${book.name} ${chapter} (${version}) is not saved yet. Download ${version} in the Bible version switcher while online.`,
      );
    }

    throw err instanceof Error ? err : new Error('Failed to load Bible chapter');
  }
}

export async function fetchCompareChapters(
  leftVersion: BibleVersionId,
  rightVersion: BibleVersionId,
  bookId: number,
  chapter: number,
): Promise<{ left: BibleVerse[]; right: BibleVerse[] }> {
  const [left, right] = await Promise.all([
    fetchBibleChapter(leftVersion, bookId, chapter),
    fetchBibleChapter(rightVersion, bookId, chapter),
  ]);
  return { left, right };
}

interface RawBulkVerse {
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

/**
 * Downloads an entire English translation JSON from bolls.life and indexes all
 * 1,189 chapters into IndexedDB without blocking the UI thread.
 */
export async function downloadBibleVersionOffline(
  version: BibleVersionId,
  onProgress?: (pct: number, detail: string) => void,
): Promise<{ chapterCount: number; verseCount: number }> {
  onProgress?.(3, `Connecting for ${version}...`);
  const res = await fetch(`https://bolls.life/static/translations/${version}.json`);
  if (!res.ok) {
    throw new Error(`Failed downloading ${version} (${res.status})`);
  }

  let jsonText: string;
  const contentLength = Number(res.headers.get('content-length') || 0);

  if (res.body && typeof res.body.getReader === 'function') {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        if (contentLength > 0) {
          const pct = Math.min(78, Math.max(5, Math.round((received / contentLength) * 78)));
          const mb = (received / (1024 * 1024)).toFixed(1);
          const totalMb = (contentLength / (1024 * 1024)).toFixed(1);
          onProgress?.(pct, `Downloading ${version} (${mb}/${totalMb} MB)...`);
        } else {
          onProgress?.(40, `Downloading ${version}...`);
        }
      }
    }

    const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      combined.set(c, offset);
      offset += c.byteLength;
    }
    jsonText = new TextDecoder().decode(combined);
  } else {
    onProgress?.(45, `Downloading ${version}...`);
    jsonText = await res.text();
  }

  onProgress?.(81, `Indexing ${version} chapters...`);
  const rawList = JSON.parse(jsonText) as RawBulkVerse[];

  const grouped = new Map<string, OfflineBibleChapterRecord>();
  let verseCount = 0;
  const now = Date.now();

  for (const row of rawList) {
    const bookId = Number(row.book);
    const chapter = Number(row.chapter);
    const verseNum = Number(row.verse);
    if (bookId < 1 || bookId > 66 || chapter < 1 || verseNum < 1) continue;
    if (!BIBLE_BOOK_BY_ID.has(bookId)) continue;

    const clean = sanitizeBollsVerseText(row.text);
    if (!clean) continue;

    const key = `${version}:${bookId}:${chapter}`;
    let record = grouped.get(key);
    if (!record) {
      record = {
        key,
        version,
        bookId,
        chapter,
        verses: [],
        updatedAt: now,
      };
      grouped.set(key, record);
    }
    record.verses.push({ verse: verseNum, text: clean });
    verseCount += 1;
  }

  const allRecords = Array.from(grouped.values());
  const CHUNK_SIZE = 60;
  for (let i = 0; i < allRecords.length; i += CHUNK_SIZE) {
    const slice = allRecords.slice(i, i + CHUNK_SIZE);
    await putBibleChaptersBatch(slice);
    for (const r of slice) {
      chapterCache.set(r.key, r.verses);
    }
    const pct = 82 + Math.round(((i + slice.length) / Math.max(1, allRecords.length)) * 17);
    onProgress?.(Math.min(99, pct), `Saving ${i + slice.length}/${allRecords.length} chapters...`);
    await new Promise((r) => setTimeout(r, 0));
  }

  await putOfflineBibleVersionMeta({
    version,
    downloadedAt: Date.now(),
    chapterCount: allRecords.length,
    verseCount,
  });

  onProgress?.(100, `Saved ${version} offline (${allRecords.length} chapters)`);
  return { chapterCount: allRecords.length, verseCount };
}

export async function searchBibleText(
  version: BibleVersionId,
  query: string,
  page = 1,
): Promise<{ total: number; hits: BibleSearchHit[]; note?: string }> {
  const trimmed = query.trim();
  if (!trimmed) return { total: 0, hits: [] };

  const downloaded = await getOfflineBibleVersions().catch(() => []);
  const hasFullOffline = downloaded.some((m) => m.version === version);
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (hasFullOffline || isOffline) {
    const bookMap = new Map<number, string>();
    for (const [id, meta] of BIBLE_BOOK_BY_ID.entries()) {
      bookMap.set(id, meta.name);
    }
    const hits = await searchOfflineBibleVersion(version, trimmed, bookMap, 40);
    return {
      total: hits.length,
      hits,
      note: hasFullOffline
        ? `Searched full offline copy of ${version}.`
        : `Offline mode: searched locally cached ${version} chapters.`,
    };
  }

  // HelloAO has no full-text search endpoint, so cross-query via Bolls WEB and resolve BSB verses if possible
  const searchSlug = version === 'BSB' ? 'WEB' : version;
  const url = `https://bolls.life/v2/find/${searchSlug}?search=${encodeURIComponent(
    trimmed,
  )}&match_whole=true&limit=35&page=${page}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Search request failed (${res.status})`);
  }
  const data = (await res.json()) as {
    total?: number;
    results?: Array<{ book: number; chapter: number; verse: number; text: string }>;
  };

  const canonical = (data.results || []).filter(
    (r) => r.book >= 1 && r.book <= 66 && BIBLE_BOOK_BY_ID.has(r.book),
  );

  const hits: BibleSearchHit[] = canonical.map((r) => ({
    bookId: r.book,
    bookName: BIBLE_BOOK_BY_ID.get(r.book)!.name,
    chapter: r.chapter,
    verse: r.verse,
    text: sanitizeBollsVerseText(r.text),
  }));

  if (version === 'BSB' && hits.length > 0) {
    const uniqueChaps = new Map<string, Promise<BibleVerse[]>>();
    for (const h of hits.slice(0, 12)) {
      const k = `${h.bookId}:${h.chapter}`;
      if (!uniqueChaps.has(k)) {
        uniqueChaps.set(k, fetchBibleChapter('BSB', h.bookId, h.chapter).catch(() => []));
      }
    }
    const resolved = new Map<string, BibleVerse[]>();
    await Promise.all(
      Array.from(uniqueChaps.entries()).map(async ([k, p]) => {
        resolved.set(k, await p);
      }),
    );
    for (const h of hits) {
      const ch = resolved.get(`${h.bookId}:${h.chapter}`);
      const match = ch?.find((v) => v.verse === h.verse);
      if (match) h.text = match.text;
    }
    return {
      total: data.total || hits.length,
      hits,
      note: 'BSB search matches are indexed across WEB and displayed in BSB.',
    };
  }

  return {
    total: data.total || hits.length,
    hits,
  };
}
