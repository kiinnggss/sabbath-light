export type AppTabId = 'hymnal' | 'sabbath-school' | 'bible';

export type HymnViewMode = 'lyrics' | 'sheet' | 'story';

export type AppRoute =
  | { tab: 'hymnal'; hymnNumber?: number; viewMode?: HymnViewMode }
  | { tab: 'sabbath-school' }
  | { tab: 'bible'; bookId?: number; chapter?: number; verse?: number };

const VALID_HYMN_VIEWS = new Set<HymnViewMode>(['lyrics', 'sheet', 'story']);

function parsePositiveInt(raw: string | undefined): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const num = Number(raw);
  return Number.isSafeInteger(num) && num > 0 ? num : undefined;
}

/**
 * Parses a URL hash such as "#/hymnal/100/sheet" or "#/bible/43/3/16" into a typed route.
 * Returns null when the hash is empty or unrecognized so saved preferences can take over.
 */
export function parseHashRoute(rawHash: string): AppRoute | null {
  const cleaned = rawHash.replace(/^#\/?/, '').replace(/\/+$/, '').trim();
  if (!cleaned) return null;

  const segments = cleaned.split('/').map((s) => decodeURIComponent(s).toLowerCase());
  const head = segments[0];

  if (head === 'hymnal') {
    const num = parsePositiveInt(segments[1]);
    if (num !== undefined && num >= 1 && num <= 920) {
      const maybeView = segments[2] as HymnViewMode | undefined;
      const viewMode = maybeView && VALID_HYMN_VIEWS.has(maybeView) ? maybeView : 'lyrics';
      return { tab: 'hymnal', hymnNumber: num, viewMode };
    }
    return { tab: 'hymnal' };
  }

  if (head === 'sabbath-school' || head === 'lesson') {
    return { tab: 'sabbath-school' };
  }

  if (head === 'bible') {
    const bookId = parsePositiveInt(segments[1]);
    const chapter = parsePositiveInt(segments[2]);
    const verse = parsePositiveInt(segments[3]);
    if (bookId !== undefined && bookId <= 66 && chapter !== undefined) {
      return { tab: 'bible', bookId, chapter, verse };
    }
    return { tab: 'bible' };
  }

  return null;
}

/** Formats an AppRoute into a canonical hash string starting with "#/". */
export function formatHashRoute(route: AppRoute): string {
  if (route.tab === 'hymnal') {
    if (route.hymnNumber !== undefined) {
      const mode = route.viewMode && route.viewMode !== 'lyrics' ? `/${route.viewMode}` : '';
      return `#/hymnal/${route.hymnNumber}${mode}`;
    }
    return '#/hymnal';
  }

  if (route.tab === 'sabbath-school') {
    return '#/sabbath-school';
  }

  if (route.bookId !== undefined && route.chapter !== undefined) {
    const versePart = route.verse !== undefined ? `/${route.verse}` : '';
    return `#/bible/${route.bookId}/${route.chapter}${versePart}`;
  }

  return '#/bible';
}

export function buildRouteFromState(
  activeTab: AppTabId,
  hymnNumber: number | null,
  hymnViewMode: HymnViewMode,
  bibleLocation: { bookId: number; chapter: number; verse?: number },
): AppRoute {
  if (activeTab === 'hymnal') {
    return hymnNumber !== null
      ? { tab: 'hymnal', hymnNumber, viewMode: hymnViewMode }
      : { tab: 'hymnal' };
  }
  if (activeTab === 'bible') {
    return {
      tab: 'bible',
      bookId: bibleLocation.bookId,
      chapter: bibleLocation.chapter,
      verse: bibleLocation.verse,
    };
  }
  return { tab: 'sabbath-school' };
}
