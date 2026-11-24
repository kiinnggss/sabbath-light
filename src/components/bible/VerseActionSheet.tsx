import { useEffect, useState } from 'react';
import { BookmarkSimple, Check, Columns, Copy, Eraser, NotePencil, X } from '@phosphor-icons/react';
import type { BibleBookMeta } from '../../data/bibleBooks';
import type { BibleVersionId, HighlightColor } from '../../hooks/usePreferences';
import { BIBLE_VERSIONS, fetchBibleChapter, type BibleVerse } from '../../lib/bibleApi';
import type { StudyNote } from '../../lib/offlineDb';

interface VerseActionSheetProps {
  verse: BibleVerse | null;
  book: BibleBookMeta;
  chapter: number;
  primaryVersion: BibleVersionId;
  compareVersion: BibleVersionId;
  onCompareVersionChange: (v: BibleVersionId) => void;
  currentHighlight?: HighlightColor;
  isBookmarked: boolean;
  existingNote?: StudyNote;
  onToggleBookmark: () => void;
  onSetHighlight: (color: HighlightColor | null) => void;
  onOpenNoteEditor: () => void;
  onClose: () => void;
}

const SWATCHES: Array<{ id: HighlightColor; label: string; bg: string }> = [
  { id: 'amber', label: 'Amber', bg: '#E6A63F' },
  { id: 'terracotta', label: 'Terracotta', bg: '#B64F1B' },
  { id: 'sand', label: 'Sand', bg: '#C9BC9A' },
  { id: 'olive', label: 'Olive', bg: '#72824A' },
];

export function VerseActionSheet({
  verse,
  book,
  chapter,
  primaryVersion,
  compareVersion,
  onCompareVersionChange,
  currentHighlight,
  isBookmarked,
  existingNote,
  onToggleBookmark,
  onSetHighlight,
  onOpenNoteEditor,
  onClose,
}: VerseActionSheetProps) {
  const [compareText, setCompareText] = useState<string>('');
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!verse) return;
    let cancelled = false;
    async function loadCompare() {
      if (!verse) return;
      try {
        setLoadingCompare(true);
        const ch = await fetchBibleChapter(compareVersion, book.id, chapter);
        const found = ch.find((item) => item.verse === verse.verse);
        if (!cancelled) {
          setCompareText(found?.text || 'Verse unavailable in selected translation.');
        }
      } catch {
        if (!cancelled) {
          setCompareText('Unable to load comparison translation right now.');
        }
      } finally {
        if (!cancelled) setLoadingCompare(false);
      }
    }
    loadCompare();
    return () => {
      cancelled = true;
    };
  }, [verse, compareVersion, book.id, chapter]);

  if (!verse) return null;

  const refLabel = `${book.name} ${chapter}:${verse.verse}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${refLabel} (${primaryVersion}) - ${verse.text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Verse actions for ${refLabel}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="sheet-enter max-h-[86dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 shadow-[var(--shadow-sheet)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 className="text-base font-bold text-[var(--ink-primary)]">{refLabel}</h2>
            <p className="text-xs text-[var(--ink-muted)]">
              Highlight, bookmark, or compare translations
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close verse options"
            className="tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Highlight & Quick Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--ink-secondary)]">Highlight:</span>
            {SWATCHES.map((s) => {
              const selected = currentHighlight === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSetHighlight(selected ? null : s.id)}
                  aria-label={`Highlight ${s.label}`}
                  aria-pressed={selected}
                  style={{ backgroundColor: s.bg }}
                  className={`tactile-btn flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    selected ? 'border-[var(--ink-primary)] scale-105' : 'border-transparent'
                  }`}
                >
                  {selected && <Check size={14} weight="bold" className="text-[#130603]" />}
                </button>
              );
            })}
            {currentHighlight && (
              <button
                type="button"
                onClick={() => onSetHighlight(null)}
                aria-label="Clear highlight"
                className="tactile-btn flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)]"
              >
                <Eraser size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenNoteEditor}
              className={`tactile-btn inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${
                existingNote
                  ? 'border-[var(--accent-amber)] bg-[var(--accent-amber-soft)] text-[var(--ink-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)]'
              }`}
            >
              <NotePencil size={15} weight="duotone" className="text-[var(--accent-primary)]" />
              <span>{existingNote ? 'Edit Note' : 'Add Note'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleBookmark}
              className={`tactile-btn inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${
                isBookmarked
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--ink-on-accent)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)]'
              }`}
            >
              <BookmarkSimple size={15} weight={isBookmarked ? 'fill' : 'regular'} />
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="tactile-btn inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-xs font-bold text-[var(--ink-primary)]"
            >
              {copied ? <Check size={15} weight="bold" /> : <Copy size={15} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Parallel Quick Comparison */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-secondary)]">
              <Columns size={15} weight="duotone" className="text-[var(--accent-primary)]" />
              <span>Side-by-Side Comparison</span>
            </div>

            <select
              aria-label="Compare translation"
              value={compareVersion}
              onChange={(e) => onCompareVersionChange(e.target.value as BibleVersionId)}
              className="h-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-bold text-[var(--ink-primary)]"
            >
              {BIBLE_VERSIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  Compare: {v.id}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                {primaryVersion}
              </p>
              <p className="reading-prose text-[var(--ink-primary)]">{verse.text}</p>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] p-3.5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
                {compareVersion}
              </p>
              {loadingCompare ? (
                <div className="h-16 animate-pulse rounded-lg bg-[var(--bg-surface)]" />
              ) : (
                <p className="reading-prose text-[var(--ink-primary)]">{compareText}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
