import { ArrowRight, BookmarkSimple, Highlighter, Trash, X } from '@phosphor-icons/react';
import { BIBLE_BOOK_BY_ID } from '../../data/bibleBooks';
import type { BibleBookmark, BibleLocation, HighlightColor } from '../../hooks/usePreferences';

interface BibleBookmarksModalProps {
  open: boolean;
  onClose: () => void;
  bookmarks: BibleBookmark[];
  highlights: Record<string, HighlightColor>;
  onRemoveBookmark: (bookmark: BibleBookmark) => void;
  onRemoveHighlight: (key: string) => void;
  onJumpToLocation: (loc: BibleLocation) => void;
}

export function BibleBookmarksModal({
  open,
  onClose,
  bookmarks,
  highlights,
  onRemoveBookmark,
  onRemoveHighlight,
  onJumpToLocation,
}: BibleBookmarksModalProps) {
  if (!open) return null;

  const highlightEntries = Object.entries(highlights);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bible Bookmarks and Highlights"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="sheet-enter max-h-[86dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 shadow-[var(--shadow-sheet)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 className="text-base font-bold text-[var(--ink-primary)]">
              Bookmarks &amp; Highlights
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              Saved locally in your browser for offline study
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bookmarks"
            className="tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Bookmarks */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            <BookmarkSimple size={14} weight="fill" className="text-[var(--accent-primary)]" />
            <span>Bookmarked Verses ({bookmarks.length})</span>
          </div>

          {bookmarks.length === 0 ? (
            <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-xs text-[var(--ink-muted)]">
              No bookmarks yet. Tap any verse while reading to save it here.
            </p>
          ) : (
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    onJumpToLocation({
                      bookId: bm.bookId,
                      chapter: bm.chapter,
                      verse: bm.verse,
                    });
                    onClose();
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-xs font-bold text-[var(--accent-primary)]">
                    {bm.reference} ({bm.version})
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-primary)]">
                    {bm.snippet}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveBookmark(bm)}
                  aria-label={`Remove bookmark ${bm.reference}`}
                  className="tactile-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--bg-recessed)] hover:text-[var(--ink-primary)]"
                >
                  <Trash size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Highlights */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            <Highlighter size={14} weight="duotone" className="text-[var(--accent-primary)]" />
            <span>Highlighted Verses ({highlightEntries.length})</span>
          </div>

          {highlightEntries.length === 0 ? (
            <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-xs text-[var(--ink-muted)]">
              No highlighted verses yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {highlightEntries.map(([key, color]) => {
                const [bStr, cStr, vStr] = key.split(':');
                const bookId = Number(bStr);
                const chapter = Number(cStr);
                const verse = Number(vStr);
                const book = BIBLE_BOOK_BY_ID.get(bookId);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onJumpToLocation({ bookId, chapter, verse });
                        onClose();
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-bold text-[var(--ink-primary)]"
                    >
                      <span className="truncate">
                        {book?.name || `Book ${bookId}`} {chapter}:{verse}
                      </span>
                      <span className="rounded-full bg-[var(--bg-recessed)] px-2 py-0.5 text-[10px] capitalize text-[var(--ink-secondary)]">
                        {color}
                      </span>
                      <ArrowRight size={13} className="shrink-0 text-[var(--ink-muted)]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveHighlight(key)}
                      aria-label={`Remove highlight ${key}`}
                      className="tactile-btn flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--bg-recessed)]"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
