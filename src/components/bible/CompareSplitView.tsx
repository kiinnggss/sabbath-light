import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { BibleBookMeta } from '../../data/bibleBooks';
import type { BibleVersionId, HighlightColor } from '../../hooks/usePreferences';
import { BIBLE_VERSIONS, type BibleVerse } from '../../lib/bibleApi';

interface CompareSplitViewProps {
  book: BibleBookMeta;
  chapter: number;
  leftVersion: BibleVersionId;
  rightVersion: BibleVersionId;
  onLeftVersionChange: (v: BibleVersionId) => void;
  onRightVersionChange: (v: BibleVersionId) => void;
  leftVerses: BibleVerse[];
  rightVerses: BibleVerse[];
  highlights: Record<string, HighlightColor>;
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

export function CompareSplitView({
  book,
  chapter,
  leftVersion,
  rightVersion,
  onLeftVersionChange,
  onRightVersionChange,
  leftVerses,
  rightVerses,
  highlights,
  onSelectVerse,
  onPrevChapter,
  onNextChapter,
  canPrev,
  canNext,
}: CompareSplitViewProps) {
  const rightByVerse = new Map<number, string>(rightVerses.map((v) => [v.verse, v.text]));
  const verseNumbers = Array.from(
    new Set([...leftVerses.map((v) => v.verse), ...rightVerses.map((v) => v.verse)]),
  ).sort((a, b) => a - b);
  const leftByVerse = new Map<number, string>(leftVerses.map((v) => [v.verse, v.text]));

  return (
    <div className="space-y-4">
      {/* Sticky Compare Column Header Selectors */}
      <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
        <div>
          <label
            htmlFor="compare-left-version"
            className="block text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]"
          >
            Primary Column
          </label>
          <select
            id="compare-left-version"
            value={leftVersion}
            onChange={(e) => onLeftVersionChange(e.target.value as BibleVersionId)}
            className="mt-1 h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-2.5 text-xs font-bold text-[var(--ink-primary)]"
          >
            {BIBLE_VERSIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id} - {v.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="compare-right-version"
            className="block text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]"
          >
            Compare With
          </label>
          <select
            id="compare-right-version"
            value={rightVersion}
            onChange={(e) => onRightVersionChange(e.target.value as BibleVersionId)}
            className="mt-1 h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-2.5 text-xs font-bold text-[var(--ink-primary)]"
          >
            {BIBLE_VERSIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id} - {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Synchronized Side-by-Side Verse Rows */}
      <div className="space-y-2.5">
        {verseNumbers.map((num) => {
          const leftText = leftByVerse.get(num) || '';
          const rightText = rightByVerse.get(num) || '';
          const hl = highlights[`${book.id}:${chapter}:${num}`];
          return (
            <button
              key={num}
              type="button"
              onClick={() => onSelectVerse({ verse: num, text: leftText || rightText })}
              className={`block w-full rounded-2xl border border-[var(--border-subtle)] p-4 text-left transition-colors ${
                hl ? HIGHLIGHT_BG[hl] : 'bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                    {leftVersion} · {book.shortName} {chapter}:{num}
                  </p>
                  <p className="reading-prose text-[var(--ink-primary)]">{leftText}</p>
                </div>
                <div className="border-t border-[var(--border-subtle)] pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                    {rightVersion} · {book.shortName} {chapter}:{num}
                  </p>
                  <p className="reading-prose text-[var(--ink-primary)]">{rightText}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!canPrev}
          onClick={onPrevChapter}
          className="tactile-btn inline-flex h-11 items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-xs font-bold text-[var(--ink-primary)] disabled:opacity-35"
        >
          <CaretLeft size={16} weight="bold" />
          <span>Previous Chapter</span>
        </button>

        <button
          type="button"
          disabled={!canNext}
          onClick={onNextChapter}
          className="tactile-btn inline-flex h-11 items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-xs font-bold text-[var(--ink-primary)] disabled:opacity-35"
        >
          <span>Next Chapter</span>
          <CaretRight size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
