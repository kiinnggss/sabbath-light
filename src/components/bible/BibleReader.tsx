import { useEffect, useRef, useState } from 'react';
import {
  BookmarkSimple,
  CaretLeft,
  CaretRight,
  Check,
  Columns,
  Copy,
  Eraser,
  NotePencil,
  X,
} from '@phosphor-icons/react';
import type { BibleBookMeta } from '../../data/bibleBooks';
import type { BibleVersionId, HighlightColor } from '../../hooks/usePreferences';
import type { BibleVerse } from '../../lib/bibleApi';
import { makeBibleNoteRef } from '../../lib/noteReferences';
import type { StudyNote } from '../../lib/offlineDb';

interface BibleReaderProps {
  book: BibleBookMeta;
  chapter: number;
  version: BibleVersionId;
  verses: BibleVerse[];
  highlightVerseNum?: number;
  selectedVerse: BibleVerse | null;
  highlights: Record<string, HighlightColor>;
  bookmarkedIds: Set<string>;
  notesByRefId: Map<string, StudyNote>;
  onSelectVerse: (verse: BibleVerse | null) => void;
  onSetHighlight: (verseKey: string, color: HighlightColor | null) => void;
  onOpenNoteForVerse: (verse: BibleVerse) => void;
  onOpenCompareSheet: (verse: BibleVerse) => void;
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

const SWATCHES: Array<{ id: HighlightColor; label: string; bg: string }> = [
  { id: 'amber', label: 'Amber', bg: '#E6A63F' },
  { id: 'terracotta', label: 'Terracotta', bg: '#B64F1B' },
  { id: 'sand', label: 'Sand', bg: '#C9BC9A' },
  { id: 'olive', label: 'Olive', bg: '#72824A' },
];

export function BibleReader({
  book,
  chapter,
  version,
  verses,
  highlightVerseNum,
  selectedVerse,
  highlights,
  bookmarkedIds,
  notesByRefId,
  onSelectVerse,
  onSetHighlight,
  onOpenNoteForVerse,
  onOpenCompareSheet,
  onPrevChapter,
  onNextChapter,
  canPrev,
  canNext,
}: BibleReaderProps) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [copiedVerseNum, setCopiedVerseNum] = useState<number | null>(null);

  useEffect(() => {
    if (highlightVerseNum && targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightVerseNum, book.id, chapter]);

  useEffect(() => {
    setShowPalette(false);
    setCopiedVerseNum(null);
  }, [selectedVerse?.verse, book.id, chapter]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const activeKey = selectedVerse
    ? `${book.id}:${chapter}:${selectedVerse.verse}`
    : '';
  const activeHighlight = activeKey ? highlights[activeKey] : undefined;
  const activeNote = selectedVerse
    ? notesByRefId.get(makeBibleNoteRef(book.id, chapter, selectedVerse.verse))
    : undefined;

  const handleCopyActive = async () => {
    if (!selectedVerse) return;
    try {
      await navigator.clipboard.writeText(
        `${book.name} ${chapter}:${selectedVerse.verse} (${version}) - ${selectedVerse.text}`,
      );
      setCopiedVerseNum(selectedVerse.verse);
      window.setTimeout(() => setCopiedVerseNum(null), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

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
            Tap or long-press any verse to highlight, add a note, copy, or compare translations
          </p>
        </header>

        <div className="reading-prose space-y-1.5 text-[var(--ink-primary)]">
          {verses.map((v) => {
            const key = `${book.id}:${chapter}:${v.verse}`;
            const hlColor = highlights[key];
            const isBookmarked = bookmarkedIds.has(key);
            const savedNote = notesByRefId.get(makeBibleNoteRef(book.id, chapter, v.verse));
            const isSelected = selectedVerse?.verse === v.verse;
            const isFocused = highlightVerseNum === v.verse;

            return (
              <div
                key={v.verse}
                ref={isFocused ? targetRef : undefined}
                role="button"
                tabIndex={0}
                onClick={() => onSelectVerse(isSelected ? null : v)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectVerse(isSelected ? null : v);
                  }
                }}
                onPointerDown={(e) => {
                  if (e.pointerType === 'touch') {
                    clearLongPress();
                    longPressTimerRef.current = window.setTimeout(() => {
                      onSelectVerse(v);
                    }, 420);
                  }
                }}
                onPointerUp={clearLongPress}
                onPointerCancel={clearLongPress}
                className={`group block w-full cursor-pointer rounded-xl px-2.5 py-1.5 text-left transition-colors ${
                  isSelected
                    ? 'bg-[var(--accent-primary-soft)] ring-1 ring-[var(--accent-primary)]'
                    : hlColor
                      ? HIGHLIGHT_BG[hlColor]
                      : isFocused
                        ? 'bg-[var(--accent-amber-soft)] ring-1 ring-[var(--accent-amber)]'
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
                {savedNote && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNoteForVerse(v);
                    }}
                    aria-label={`Open note for ${book.name} ${chapter}:${v.verse}`}
                    title={savedNote.noteText}
                    className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-[var(--accent-amber-soft)] px-1.5 py-0.5 align-middle text-[11px] font-bold text-[var(--accent-amber)] hover:bg-[var(--accent-amber)] hover:text-[#130603]"
                  >
                    <NotePencil size={12} weight="fill" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </article>

      {/* Prev / Next Chapter Navigation */}
      <div className={`flex items-center justify-between gap-3 ${selectedVerse ? 'pb-24' : ''}`}>
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

      {/* Compact Tactile Floating Action Bar when a Verse is Selected */}
      {selectedVerse && (
        <section
          aria-label={`Selected verse ${book.name} ${chapter}:${selectedVerse.verse}`}
          className="sheet-enter fixed bottom-[calc(5.15rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2.5 shadow-[0_-6px_24px_rgba(19,6,3,0.16)]"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--accent-primary)]">
                {book.name} {chapter}:{selectedVerse.verse}
              </span>
              <button
                type="button"
                onClick={() => onSelectVerse(null)}
                aria-label="Dismiss verse selection"
                className="tactile-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              >
                <X size={14} weight="bold" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPalette((p) => !p)}
                aria-expanded={showPalette}
                className={`tactile-btn inline-flex h-9 items-center gap-1 rounded-xl border px-2.5 text-xs font-bold ${
                  activeHighlight || showPalette
                    ? 'border-[var(--accent-amber)] bg-[var(--accent-amber-soft)] text-[var(--ink-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--ink-primary)]'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: activeHighlight
                      ? SWATCHES.find((s) => s.id === activeHighlight)?.bg
                      : '#E6A63F',
                  }}
                />
                <span>Highlight</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenNoteForVerse(selectedVerse)}
                className={`tactile-btn inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-bold shadow-xs ${
                  activeNote
                    ? 'bg-[var(--accent-amber)] text-[#130603]'
                    : 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] hover:bg-[var(--accent-primary-hover)]'
                }`}
              >
                <NotePencil size={14} weight="bold" />
                <span>{activeNote ? 'Edit Note' : 'Add Note'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyActive}
                className="tactile-btn inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-2.5 text-xs font-bold text-[var(--ink-primary)]"
              >
                {copiedVerseNum === selectedVerse.verse ? (
                  <Check size={14} weight="bold" />
                ) : (
                  <Copy size={14} />
                )}
                <span>{copiedVerseNum === selectedVerse.verse ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenCompareSheet(selectedVerse)}
                aria-label="Compare translation and bookmark"
                title="Compare & Bookmark"
                className="tactile-btn inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-2.5 text-xs font-bold text-[var(--ink-primary)]"
              >
                <Columns size={14} weight="duotone" />
                <span>Compare</span>
              </button>
            </div>
          </div>

          {showPalette && (
            <div className="mt-2.5 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-2.5">
              <span className="text-[11px] font-bold text-[var(--ink-muted)]">Color:</span>
              {SWATCHES.map((s) => {
                const isColor = activeHighlight === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSetHighlight(activeKey, isColor ? null : s.id)}
                    aria-label={`Highlight ${s.label}`}
                    aria-pressed={isColor}
                    style={{ backgroundColor: s.bg }}
                    className={`tactile-btn flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                      isColor ? 'border-[var(--ink-primary)] scale-110' : 'border-transparent'
                    }`}
                  >
                    {isColor && <Check size={12} weight="bold" className="text-[#130603]" />}
                  </button>
                );
              })}
              {activeHighlight && (
                <button
                  type="button"
                  onClick={() => onSetHighlight(activeKey, null)}
                  aria-label="Clear highlight"
                  className="tactile-btn flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--ink-muted)]"
                >
                  <Eraser size={13} />
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
