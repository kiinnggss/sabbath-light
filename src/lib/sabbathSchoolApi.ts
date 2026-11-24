import type { SabbathSchoolEdition } from '../hooks/usePreferences';
import { getSSCache, putSSCache } from './offlineDb';

const API_BASE = 'https://sabbath-school.adventech.io/api/v2/en';
const CACHE_PREFIX = 'sabbath-light:ss:v1:';

export interface SSQuarterlySummary {
  id: string;
  title: string;
  description?: string;
  human_date?: string;
  start_date: string; // DD/MM/YYYY
  end_date: string;   // DD/MM/YYYY
  cover?: string;
  color_primary?: string;
  splash?: string;
}

export interface SSLessonSummary {
  id: string;
  title: string;
  start_date: string; // DD/MM/YYYY
  end_date: string;   // DD/MM/YYYY
  index: string;
  path: string;
  pdfOnly?: boolean;
  cover?: string;
}

export interface SSQuarterlyDetail {
  quarterly: SSQuarterlySummary;
  lessons: SSLessonSummary[];
}

export interface SSDaySummary {
  id: string;
  title: string;
  date: string; // DD/MM/YYYY
  index: string;
}

export interface SSPdfResource {
  id: string;
  src: string;
  title: string;
  start_date?: string;
  end_date?: string;
}

export interface SSLessonDetail {
  lesson: SSLessonSummary;
  days: SSDaySummary[];
  pdfs: SSPdfResource[];
}

export interface SSDayRead {
  id: string;
  date: string;
  index: string;
  title: string;
  content: string;
}

const memCache = new Map<string, unknown>();

function extractQuarterlyIdFromPath(relativePath: string): string | undefined {
  const m = /^quarterlies\/([^/]+)\//.exec(relativePath);
  return m ? m[1] : undefined;
}

async function fetchSSJson<T>(
  relativePath: string,
  options: { forceNetwork?: boolean } = {},
): Promise<T> {
  if (!options.forceNetwork) {
    const cached = memCache.get(relativePath) as T | undefined;
    if (cached !== undefined) return cached;
  }

  const quarterlyId = extractQuarterlyIdFromPath(relativePath);
  const url = `${API_BASE}/${relativePath}`;
  const storageKey = `${CACHE_PREFIX}${relativePath}`;

  // When offline or when IndexedDB already has a snapshot and forceNetwork is not set
  if (!options.forceNetwork && typeof navigator !== 'undefined' && !navigator.onLine) {
    const idb = await getSSCache<T>(relativePath).catch(() => null);
    if (idb !== null) {
      memCache.set(relativePath, idb);
      return idb;
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sabbath School API HTTP ${res.status}`);
    const data = (await res.json()) as T;
    memCache.set(relativePath, data);
    await putSSCache(relativePath, data, quarterlyId).catch(() => {});
    return data;
  } catch (err) {
    const idb = await getSSCache<T>(relativePath).catch(() => null);
    if (idb !== null) {
      memCache.set(relativePath, idb);
      return idb;
    }

    try {
      const local = localStorage.getItem(storageKey);
      if (local) {
        const parsed = JSON.parse(local) as T;
        memCache.set(relativePath, parsed);
        await putSSCache(relativePath, parsed, quarterlyId).catch(() => {});
        return parsed;
      }
    } catch {
      // Ignore parse error
    }

    throw err instanceof Error ? err : new Error('Failed to load Sabbath School content');
  }
}

export function parseAdventechDate(ddmmyyyy: string): Date | null {
  const m = ddmmyyyy?.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  const year = Number(m[3]);
  return new Date(year, month, day, 12, 0, 0, 0);
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

export function isDateInRange(target: Date, startStr: string, endStr: string): boolean {
  const start = parseAdventechDate(startStr);
  const end = parseAdventechDate(endStr);
  if (!start || !end) return false;
  const t = stripTime(target).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function filterQuarterliesByEdition(
  all: SSQuarterlySummary[],
  edition: SabbathSchoolEdition,
): SSQuarterlySummary[] {
  return all.filter((q) => {
    if (edition === 'adult') return /^\d{4}-\d{2}$/.test(q.id);
    if (edition === 'inverse') return /^\d{4}-\d{2}-cq$/.test(q.id);
    return /^\d{4}-\d{2}-cc$/.test(q.id);
  });
}

export function getQuarterIdPrefixForDate(today: Date): string {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  // Sabbath School Q4 runs late Sep - Dec, Q1 Jan - Mar, Q2 Apr - Jun, Q3 Jul - Sep
  const quarter = month <= 3 ? '01' : month <= 6 ? '02' : month <= 9 ? '03' : '04';
  return `${year}-${quarter}`;
}

export function resolveActiveQuarterly(
  editionQuarterlies: SSQuarterlySummary[],
  today: Date = new Date(),
): SSQuarterlySummary | null {
  if (editionQuarterlies.length === 0) return null;

  // 1. Exact date range match
  const byDate = editionQuarterlies.find((q) => isDateInRange(today, q.start_date, q.end_date));
  if (byDate) return byDate;

  // 2. Fallback to current YYYY-0Q prefix (handles Adventech -cc top-level metadata date typos)
  const expectedPrefix = getQuarterIdPrefixForDate(today);
  const byId = editionQuarterlies.find((q) => q.id.startsWith(expectedPrefix));
  if (byId) return byId;

  // 3. Newest quarterly available
  return editionQuarterlies[0];
}

export function resolveActiveLesson(
  lessons: SSLessonSummary[],
  today: Date = new Date(),
): SSLessonSummary | null {
  if (lessons.length === 0) return null;

  // Prefer numbered weekly lessons matching today's date
  const regular = lessons.filter((l) => l.id !== 'introduction');
  const match = regular.find((l) => isDateInRange(today, l.start_date, l.end_date));
  if (match) return match;

  const anyMatch = lessons.find((l) => isDateInRange(today, l.start_date, l.end_date));
  if (anyMatch) return anyMatch;

  return regular[0] || lessons[0];
}

export function resolveActiveDay(
  days: SSDaySummary[],
  today: Date = new Date(),
): SSDaySummary | null {
  if (days.length === 0) return null;
  const studyDays = days.filter((d) => /^\d{2}$/.test(d.id));
  const pool = studyDays.length > 0 ? studyDays : days;

  const t = stripTime(today).getTime();
  const exact = pool.find((d) => {
    const dt = parseAdventechDate(d.date);
    return dt && dt.getTime() === t;
  });
  if (exact) return exact;

  // Match weekday (Sabbath=0 .. Friday=6) if dates belong to another year/archive
  const weekdayIdx = (today.getDay() + 1) % 7; // Sat=0, Sun=1, Mon=2 ... Fri=6
  return pool[weekdayIdx] || pool[0];
}

export interface ExtractedMemoryText {
  text: string;
  reference: string | null;
}

export function extractMemoryText(day01Html: string): ExtractedMemoryText | null {
  if (!day01Html) return null;
  const blockMatches = day01Html.match(/<blockquote[\s\S]*?<\/blockquote>/gi) || [];
  for (const block of blockMatches) {
    if (!/memory text|key text/i.test(block)) continue;
    const refMatch = block.match(/<a[^>]*class=["'][^"']*verse[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    const reference = refMatch
      ? refMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      : null;

    const stripped = block
      .replace(/<p[^>]*>\s*(?:Memory Text|Key Text)\s*:?\s*<\/p>/gi, '')
      .replace(/(?:Memory Text|Key Text)\s*:?/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/g, '"')
      .replace(/&lsquo;|&rsquo;|&#8216;|&#8217;/g, "'")
      .replace(/&mdash;|&#8212;|—/g, ', ')
      .replace(/&ndash;|&#8211;|–/g, '-')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\s+/g, ' ')
      .trim();

    if (stripped.length > 10) {
      return { text: stripped, reference };
    }
  }
  return null;
}

export async function fetchQuarterlies(options?: {
  forceNetwork?: boolean;
}): Promise<SSQuarterlySummary[]> {
  return fetchSSJson<SSQuarterlySummary[]>('quarterlies/index.json', options);
}

export async function fetchQuarterlyDetail(
  quarterlyId: string,
  options?: { forceNetwork?: boolean },
): Promise<SSQuarterlyDetail> {
  return fetchSSJson<SSQuarterlyDetail>(`quarterlies/${quarterlyId}/index.json`, options);
}

export async function fetchLessonDetail(
  quarterlyId: string,
  lessonId: string,
  options?: { forceNetwork?: boolean },
): Promise<SSLessonDetail> {
  return fetchSSJson<SSLessonDetail>(
    `quarterlies/${quarterlyId}/lessons/${lessonId}/index.json`,
    options,
  );
}

export async function fetchDayRead(
  quarterlyId: string,
  lessonId: string,
  dayId: string,
  options?: { forceNetwork?: boolean },
): Promise<SSDayRead> {
  return fetchSSJson<SSDayRead>(
    `quarterlies/${quarterlyId}/lessons/${lessonId}/days/${dayId}/read/index.json`,
    options,
  );
}
