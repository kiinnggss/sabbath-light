import { useCallback, useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark';
export type ActiveTab = 'hymnal' | 'sabbath-school' | 'bible';
export type SabbathSchoolEdition = 'adult' | 'inverse' | 'cornerstone';
export type BibleVersionId = 'KJV' | 'NKJV' | 'ESV' | 'NLT' | 'WEB' | 'BSB';
export type HighlightColor = 'amber' | 'terracotta' | 'sand' | 'olive';

export interface BibleLocation {
  bookId: number;
  chapter: number;
  verse?: number;
}

export interface BibleBookmark {
  id: string; // e.g. "43:3:16"
  bookId: number;
  chapter: number;
  verse: number;
  version: BibleVersionId;
  reference: string;
  snippet: string;
  createdAt: number;
}

export interface UserPreferences {
  theme: AppTheme;
  readingScale: number;
  activeTab: ActiveTab;
  hymnalFavorites: number[];
  ssEdition: SabbathSchoolEdition;
  bibleVersion: BibleVersionId;
  compareVersion: BibleVersionId;
  bibleLocation: BibleLocation;
  bibleBookmarks: BibleBookmark[];
  bibleHighlights: Record<string, HighlightColor>;
}

export const READING_SCALE_STEPS = [0.88, 0.94, 1.0, 1.12, 1.25, 1.4] as const;

const STORAGE_KEY = 'sabbath-light:prefs:v1';

const DEFAULT_PREFS: UserPreferences = {
  theme: 'light',
  readingScale: 1.0,
  activeTab: 'hymnal',
  hymnalFavorites: [1, 73, 108, 214, 462, 530],
  ssEdition: 'adult',
  bibleVersion: 'NKJV',
  compareVersion: 'BSB',
  bibleLocation: { bookId: 43, chapter: 3 },
  bibleBookmarks: [],
  bibleHighlights: {},
};

function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      hymnalFavorites: Array.isArray(parsed.hymnalFavorites)
        ? parsed.hymnalFavorites
        : DEFAULT_PREFS.hymnalFavorites,
      bibleBookmarks: Array.isArray(parsed.bibleBookmarks)
        ? parsed.bibleBookmarks
        : DEFAULT_PREFS.bibleBookmarks,
      bibleHighlights:
        parsed.bibleHighlights && typeof parsed.bibleHighlights === 'object'
          ? parsed.bibleHighlights
          : DEFAULT_PREFS.bibleHighlights,
      bibleLocation:
        parsed.bibleLocation && typeof parsed.bibleLocation.bookId === 'number'
          ? parsed.bibleLocation
          : DEFAULT_PREFS.bibleLocation,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage quota errors safely
    }
  }, [prefs]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', prefs.theme);
    root.style.setProperty('--reading-scale', String(prefs.readingScale));
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', prefs.theme === 'dark' ? '#15100D' : '#F7F5F0');
    }
  }, [prefs.theme, prefs.readingScale]);

  const toggleTheme = useCallback(() => {
    setPrefs((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  }, []);

  const stepReadingScale = useCallback((direction: -1 | 1) => {
    setPrefs((prev) => {
      const idx = READING_SCALE_STEPS.findIndex((s) => Math.abs(s - prev.readingScale) < 0.01);
      const currentIdx = idx === -1 ? 2 : idx;
      const nextIdx = Math.min(READING_SCALE_STEPS.length - 1, Math.max(0, currentIdx + direction));
      return { ...prev, readingScale: READING_SCALE_STEPS[nextIdx] };
    });
  }, []);

  const setActiveTab = useCallback((activeTab: ActiveTab) => {
    setPrefs((prev) => ({ ...prev, activeTab }));
  }, []);

  const toggleHymnalFavorite = useCallback((hymnNumber: number) => {
    setPrefs((prev) => {
      const exists = prev.hymnalFavorites.includes(hymnNumber);
      const next = exists
        ? prev.hymnalFavorites.filter((n) => n !== hymnNumber)
        : [...prev.hymnalFavorites, hymnNumber].sort((a, b) => a - b);
      return { ...prev, hymnalFavorites: next };
    });
  }, []);

  const setSsEdition = useCallback((ssEdition: SabbathSchoolEdition) => {
    setPrefs((prev) => ({ ...prev, ssEdition }));
  }, []);

  const setBibleVersion = useCallback((bibleVersion: BibleVersionId) => {
    setPrefs((prev) => ({ ...prev, bibleVersion }));
  }, []);

  const setCompareVersion = useCallback((compareVersion: BibleVersionId) => {
    setPrefs((prev) => ({ ...prev, compareVersion }));
  }, []);

  const setBibleLocation = useCallback((bibleLocation: BibleLocation) => {
    setPrefs((prev) => ({ ...prev, bibleLocation }));
  }, []);

  const toggleBibleBookmark = useCallback((bookmark: Omit<BibleBookmark, 'createdAt'>) => {
    setPrefs((prev) => {
      const exists = prev.bibleBookmarks.some((b) => b.id === bookmark.id);
      const next = exists
        ? prev.bibleBookmarks.filter((b) => b.id !== bookmark.id)
        : [{ ...bookmark, createdAt: Date.now() }, ...prev.bibleBookmarks];
      return { ...prev, bibleBookmarks: next };
    });
  }, []);

  const setVerseHighlight = useCallback((verseKey: string, color: HighlightColor | null) => {
    setPrefs((prev) => {
      const next = { ...prev.bibleHighlights };
      if (color === null) {
        delete next[verseKey];
      } else {
        next[verseKey] = color;
      }
      return { ...prev, bibleHighlights: next };
    });
  }, []);

  const canDecreaseFont = prefs.readingScale > READING_SCALE_STEPS[0] + 0.005;
  const canIncreaseFont =
    prefs.readingScale < READING_SCALE_STEPS[READING_SCALE_STEPS.length - 1] - 0.005;

  return {
    prefs,
    toggleTheme,
    stepReadingScale,
    canDecreaseFont,
    canIncreaseFont,
    setActiveTab,
    toggleHymnalFavorite,
    setSsEdition,
    setBibleVersion,
    setCompareVersion,
    setBibleLocation,
    toggleBibleBookmark,
    setVerseHighlight,
  };
}
