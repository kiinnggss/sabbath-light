import { useEffect, useRef } from 'react';
import { BookmarkSimple, CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { BibleBookMeta } from '../../data/bibleBooks';
import type { HighlightColor } from '../../hooks/usePreferences';
import type { BibleVerse } from '../../lib/bibleApi';

interface BibleReaderProps {
  book: BibleBookMeta;
  chapter: number;
  verses: BibleVerse[];
  highlightVerseNum?: number;
  highlights: Record<string, HighlightColor>;
  bookmarkedIds: Set<string>;
  onSelectVerse: (verse: BibleVerse) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  canPrev: boolean;
  canNext: boolean;
}

const HIGHLIGHT_BG: Record<HighlightColor, string> = {
  amber: 'bg-[var(--hl-amber)]',
  terracotta: 'bg-[var(--hl-terracotta)]',
  sand: 'bg-[var(--hl-sand)]',
  olive: 'bg-[var(--hl-olive)]',
};

export function BibleReader({
  book,
  chapter,
  verses,
  highlightVerseNum,
  highlights,
  bookmarkedIds,
  onSelectVerse,
  onPrevChapter,
  onNextChapter,
  canPrev,
  canNext,
}: BibleReaderProps) {
  const targetRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (highlightVerseNum && targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightVerseNum, book.id, chapter]);

  return (
    <div className="space-y-4">
      <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-6 sm:px-8 sm:py-7">
        <header className="mb-5 border-b border-[var(--border-subtle)] pb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)]">
            {book.testament === 'OT' ? 'Old Testament' : 'New Testament'}
          </p>
          <h2 className="font-display mt-1 text-2xl font-bold tracking-tight text-[var(--ink-primary)] sm:text-3xl">
            {book.name} {chapter}
          </h2>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Tap any verse to highlight, bookmark, copy, or compare translations
          </p>
        </header>

        <div className="reading-prose space-y-1.5 text-[var(--ink-primary)]">
          {verses.map((v) => {
            const key = `${book.id}:${chapter}:${v.verse}`;
            const hlColor = highlights[key];
            const isBookmarked = bookmarkedIds.has(key);
            const isFocused = highlightVerseNum === v.verse;

            return (
              <button
                key={v.verse}
                ref={isFocused ? targetRef : undefined}
                type="button"
                onClick={() => onSelectVerse(v)}
                className={`group block w-full rounded-xl px-2.5 py-1.5 text-left transition-colors ${
                  hlColor
                    ? HIGHLIGHT_BG[hlColor]
                    : isFocused
                      ? 'bg-[var(--accent-primary-soft)] ring-1 ring-[var(--accent-primary)]'
                      : 'hover:bg-[var(--bg-recessed)]'
                }`}
              >
                <sup className="mr-1.5 font-[family-name:var(--font-mono)] text-[0.72em] font-bold text-[var(--accent-primary)] select-none">
                  {v.verse}
                </sup>
                <span>{v.text}</span>
                {isBookmarked && (
                  <BookmarkSimple
                    size={14}
                    weight="fill"
                    className="ml-1.5 inline align-baseline text-[var(--accent-primary)]"
                    aria-label="Bookmarked"
                  />
                )}
              </button>
            );
          })}
        </div>
      </article>

      {/* Prev / Next Chapter Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!canPrev}
          onClick={onPrevChapter}
          className="tactile-btn inline-flex h-11 items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-xs font-bold text-[var(--ink-primary)] shadow-[var(--shadow-tactile)] hover:bg-[var(--bg-recessed)] disabled:opacity-35"
        >
          <CaretLeft size={16} weight="bold" />
          <span>Previous Chapter</span>
        </button>

        <button
          type="button"
          disabled={!canNext}
          onClick={onNextChapter}
          className="tactile-btn inline-flex h-11 items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-xs font-bold text-[var(--ink-primary)] shadow-[var(--shadow-tactile)] hover:bg-[var(--bg-recessed)] disabled:opacity-35"
        >
          <span>Next Chapter</span>
          <CaretRight size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
