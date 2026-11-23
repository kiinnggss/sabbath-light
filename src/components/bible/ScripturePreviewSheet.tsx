import { useEffect, useMemo, useState } from 'react';
import { ArrowSquareRight, BookBookmark, X } from '@phosphor-icons/react';
import type { BibleLocation, BibleVersionId } from '../../hooks/usePreferences';
import { BIBLE_VERSIONS, fetchBibleChapter, type BibleVerse } from '../../lib/bibleApi';
import { parseAdventechVerseAttr, type ParsedPassage } from '../../lib/scriptureParser';

interface ScripturePreviewSheetProps {
  request: { reference: string; verseAttr?: string } | null;
  version: BibleVersionId;
  onVersionChange: (v: BibleVersionId) => void;
  onClose: () => void;
  onOpenInBible: (loc: BibleLocation) => void;
}

export function ScripturePreviewSheet({
  request,
  version,
  onVersionChange,
  onClose,
  onOpenInBible,
}: ScripturePreviewSheetProps) {
  const passages: ParsedPassage[] = useMemo(() => {
    if (!request) return [];
    return parseAdventechVerseAttr(request.verseAttr || '', request.reference);
  }, [request]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIdx(0);
  }, [request]);

  const activePassage = passages[selectedIdx] || passages[0] || null;

  useEffect(() => {
    if (!activePassage) return;
    let cancelled = false;
    async function load() {
      if (!activePassage) return;
      try {
        setLoading(true);
        setError(null);
        const chapterVerses = await fetchBibleChapter(
          version,
          activePassage.bookId,
          activePassage.chapter,
        );
        if (cancelled) return;
        const filtered = activePassage.startVerse
          ? chapterVerses.filter(
              (v) =>
                v.verse >= activePassage.startVerse! &&
                v.verse <= (activePassage.endVerse || activePassage.startVerse!),
            )
          : chapterVerses.slice(0, 12);
        setVerses(filtered.length > 0 ? filtered : chapterVerses.slice(0, 8));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to fetch Scripture passage');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [activePassage, version]);

  if (!request) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Scripture Preview: ${request.reference}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="sheet-enter flex max-h-[84dvh] w-full max-w-xl flex-col rounded-t-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 shadow-[var(--shadow-sheet)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)]">
              <BookBookmark size={14} weight="duotone" />
              <span>Scripture Quick View</span>
            </div>
            <h2 className="mt-0.5 truncate text-base font-bold text-[var(--ink-primary)]">
              {activePassage
                ? `${activePassage.bookName} ${activePassage.chapter}${
                    activePassage.startVerse
                      ? `:${activePassage.startVerse}${
                          activePassage.endVerse && activePassage.endVerse > activePassage.startVerse
                            ? `-${activePassage.endVerse}`
                            : ''
                        }`
                      : ''
                  }`
                : request.reference}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <select
              aria-label="Preview Bible translation"
              value={version}
              onChange={(e) => onVersionChange(e.target.value as BibleVersionId)}
              className="h-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-bold text-[var(--ink-primary)]"
            >
              {BIBLE_VERSIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close scripture preview"
              className="tactile-btn flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)]"
            >
              <X size={17} weight="bold" />
            </button>
          </div>
        </div>

        {/* Multi-passage selector pills when reference lists several verses */}
        {passages.length > 1 && (
          <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {passages.map((p, idx) => (
              <button
                key={`${p.label}-${idx}`}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`tactile-btn h-8 shrink-0 rounded-full border px-3 text-xs font-bold ${
                  idx === selectedIdx
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Passage Body */}
        <div className="mt-3 flex-1 overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          {!activePassage ? (
            <p className="text-sm text-[var(--ink-secondary)]">
              Could not parse reference &ldquo;{request.reference}&rdquo;.
            </p>
          ) : loading ? (
            <div className="space-y-2 py-4">
              <div className="h-4 w-full animate-pulse rounded bg-[var(--bg-recessed)]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--bg-recessed)]" />
              <div className="h-4 w-4/6 animate-pulse rounded bg-[var(--bg-recessed)]" />
            </div>
          ) : error ? (
            <p className="text-sm text-[var(--accent-primary)]">{error}</p>
          ) : (
            <div className="reading-prose space-y-2 text-[var(--ink-primary)]">
              {verses.map((v) => (
                <p key={v.verse}>
                  <sup className="mr-1.5 font-[family-name:var(--font-mono)] text-[0.72em] font-bold text-[var(--accent-primary)]">
                    {v.verse}
                  </sup>
                  <span>{v.text}</span>
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer Action */}
        {activePassage && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                onOpenInBible({
                  bookId: activePassage.bookId,
                  chapter: activePassage.chapter,
                  verse: activePassage.startVerse,
                });
                onClose();
              }}
              className="tactile-btn inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-bold text-white shadow-[var(--shadow-tactile)] hover:bg-[var(--accent-primary-hover)]"
            >
              <span>Read {activePassage.bookName} {activePassage.chapter} in Bible</span>
              <ArrowSquareRight size={16} weight="bold" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
