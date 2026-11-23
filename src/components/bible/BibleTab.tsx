import { useEffect, useMemo, useState } from 'react';
import {
  BookmarkSimple,
  CaretDown,
  Columns,
  MagnifyingGlass,
  WarningCircle,
} from '@phosphor-icons/react';
import { BIBLE_BOOK_BY_ID, BIBLE_BOOKS } from '../../data/bibleBooks';
import type {
  BibleBookmark,
  BibleLocation,
  BibleVersionId,
  HighlightColor,
} from '../../hooks/usePreferences';
import {
  BIBLE_VERSIONS,
  fetchBibleChapter,
  fetchCompareChapters,
  type BibleVerse,
} from '../../lib/bibleApi';
import { BibleBookmarksModal } from './BibleBookmarksModal';
import { BibleReader } from './BibleReader';
import { BibleSearchModal } from './BibleSearchModal';
import { BookChapterPicker } from './BookChapterPicker';
import { CompareSplitView } from './CompareSplitView';
import { VerseActionSheet } from './VerseActionSheet';

interface BibleTabProps {
  location: BibleLocation;
  onLocationChange: (loc: BibleLocation) => void;
  version: BibleVersionId;
  onVersionChange: (v: BibleVersionId) => void;
  compareVersion: BibleVersionId;
  onCompareVersionChange: (v: BibleVersionId) => void;
  bookmarks: BibleBookmark[];
  highlights: Record<string, HighlightColor>;
  onToggleBookmark: (bm: Omit<BibleBookmark, 'createdAt'>) => void;
  onSetHighlight: (key: string, color: HighlightColor | null) => void;
}

export function BibleTab({
  location,
  onLocationChange,
  version,
  onVersionChange,
  compareVersion,
  onCompareVersionChange,
  bookmarks,
  highlights,
  onToggleBookmark,
  onSetHighlight,
}: BibleTabProps) {
  const [compareMode, setCompareMode] = useState(false);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [compareVerses, setCompareVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<BibleVerse | null>(null);

  const book = BIBLE_BOOK_BY_ID.get(location.bookId) || BIBLE_BOOKS[0];
  const bookmarkedIds = useMemo(() => new Set(bookmarks.map((b) => b.id)), [bookmarks]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        if (compareMode) {
          const { left, right } = await fetchCompareChapters(
            version,
            compareVersion,
            book.id,
            location.chapter,
          );
          if (!cancelled) {
            setVerses(left);
            setCompareVerses(right);
          }
        } else {
          const data = await fetchBibleChapter(version, book.id, location.chapter);
          if (!cancelled) {
            setVerses(data);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load chapter');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [version, compareVersion, compareMode, book.id, location.chapter]);

  const canPrev = book.id > 1 || location.chapter > 1;
  const canNext = book.id < 66 || location.chapter < book.chapters;

  const goPrevChapter = () => {
    if (location.chapter > 1) {
      onLocationChange({ bookId: book.id, chapter: location.chapter - 1 });
    } else if (book.id > 1) {
      const prevBook = BIBLE_BOOK_BY_ID.get(book.id - 1)!;
      onLocationChange({ bookId: prevBook.id, chapter: prevBook.chapters });
    }
  };

  const goNextChapter = () => {
    if (location.chapter < book.chapters) {
      onLocationChange({ bookId: book.id, chapter: location.chapter + 1 });
    } else if (book.id < 66) {
      onLocationChange({ bookId: book.id + 1, chapter: 1 });
    }
  };

  const selectedVerseKey = selectedVerse
    ? `${book.id}:${location.chapter}:${selectedVerse.verse}`
    : '';

  return (
    <div className="space-y-4 pb-10">
      {/* Sticky Bible Navigation & Version Bar */}
      <div className="sticky top-14 z-20 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/95 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Book + Chapter Picker + Version Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="tactile-btn inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 text-sm font-bold text-[var(--ink-primary)] shadow-[var(--shadow-tactile)] hover:border-[var(--border-strong)]"
            >
              <span>
                {book.name} {location.chapter}
              </span>
              <CaretDown size={14} weight="bold" className="text-[var(--ink-muted)]" />
            </button>

            <label htmlFor="bible-version-select" className="sr-only">
              Select Bible translation
            </label>
            <select
              id="bible-version-select"
              value={version}
              onChange={(e) => onVersionChange(e.target.value as BibleVersionId)}
              className="h-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-bold text-[var(--accent-primary)] shadow-[var(--shadow-tactile)]"
            >
              {BIBLE_VERSIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id}
                </option>
              ))}
            </select>
          </div>

          {/* Compare Split View, Search, Bookmarks */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCompareMode((m) => !m)}
              aria-pressed={compareMode}
              title="Toggle side-by-side translation comparison"
              className={`tactile-btn inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${
                compareMode
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white shadow-[var(--shadow-tactile)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
              }`}
            >
              <Columns size={16} weight="duotone" />
              <span>Compare</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search Bible text"
              className="tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--border-strong)]"
            >
              <MagnifyingGlass size={18} weight="bold" />
            </button>

            <button
              type="button"
              onClick={() => setBookmarksOpen(true)}
              aria-label="Open Bible bookmarks and highlights"
              className="tactile-btn relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--border-strong)]"
            >
              <BookmarkSimple size={18} weight={bookmarks.length > 0 ? 'fill' : 'regular'} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--accent-primary)]/40 bg-[var(--bg-surface)] p-4 text-sm">
          <WarningCircle size={20} weight="duotone" className="mt-0.5 shrink-0 text-[var(--accent-primary)]" />
          <div>
            <p className="font-bold text-[var(--ink-primary)]">Could not load Scripture chapter</p>
            <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <p className="text-xs font-semibold text-[var(--ink-muted)]">
            {compareMode
              ? `Loading ${book.name} ${location.chapter} (${version} & ${compareVersion})...`
              : `Loading ${book.name} ${location.chapter} (${version})...`}
          </p>
          <div className="h-7 w-40 animate-pulse rounded bg-[var(--bg-recessed)]" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-5 w-full animate-pulse rounded bg-[var(--bg-recessed)]" />
          ))}
        </div>
      ) : compareMode ? (
        <CompareSplitView
          book={book}
          chapter={location.chapter}
          leftVersion={version}
          rightVersion={compareVersion}
          onLeftVersionChange={onVersionChange}
          onRightVersionChange={onCompareVersionChange}
          leftVerses={verses}
          rightVerses={compareVerses}
          highlights={highlights}
          onSelectVerse={(v) => setSelectedVerse(v)}
          onPrevChapter={goPrevChapter}
          onNextChapter={goNextChapter}
          canPrev={canPrev}
          canNext={canNext}
        />
      ) : (
        <BibleReader
          book={book}
          chapter={location.chapter}
          verses={verses}
          highlightVerseNum={location.verse}
          highlights={highlights}
          bookmarkedIds={bookmarkedIds}
          onSelectVerse={(v) => setSelectedVerse(v)}
          onPrevChapter={goPrevChapter}
          onNextChapter={goNextChapter}
          canPrev={canPrev}
          canNext={canNext}
        />
      )}

      <BookChapterPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentLocation={location}
        onSelectLocation={onLocationChange}
      />

      <BibleSearchModal
        open={searchOpen}
        version={version}
        onClose={() => setSearchOpen(false)}
        onJumpToLocation={onLocationChange}
      />

      <BibleBookmarksModal
        open={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
        bookmarks={bookmarks}
        highlights={highlights}
        onRemoveBookmark={(bm) => onToggleBookmark(bm)}
        onRemoveHighlight={(key) => onSetHighlight(key, null)}
        onJumpToLocation={onLocationChange}
      />

      <VerseActionSheet
        verse={selectedVerse}
        book={book}
        chapter={location.chapter}
        primaryVersion={version}
        compareVersion={compareVersion}
        onCompareVersionChange={onCompareVersionChange}
        currentHighlight={selectedVerseKey ? highlights[selectedVerseKey] : undefined}
        isBookmarked={selectedVerseKey ? bookmarkedIds.has(selectedVerseKey) : false}
        onToggleBookmark={() => {
          if (!selectedVerse) return;
          onToggleBookmark({
            id: selectedVerseKey,
            bookId: book.id,
            chapter: location.chapter,
            verse: selectedVerse.verse,
            version,
            reference: `${book.name} ${location.chapter}:${selectedVerse.verse}`,
            snippet: selectedVerse.text,
          });
        }}
        onSetHighlight={(color) => {
          if (!selectedVerseKey) return;
          onSetHighlight(selectedVerseKey, color);
        }}
        onClose={() => setSelectedVerse(null)}
      />
    </div>
  );
}
