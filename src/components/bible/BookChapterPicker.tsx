import { useMemo, useState } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { BIBLE_BOOKS, type BibleBookMeta } from '../../data/bibleBooks';
import type { BibleLocation } from '../../hooks/usePreferences';

interface BookChapterPickerProps {
  open: boolean;
  onClose: () => void;
  currentLocation: BibleLocation;
  onSelectLocation: (loc: BibleLocation) => void;
}

export function BookChapterPicker({
  open,
  onClose,
  currentLocation,
  onSelectLocation,
}: BookChapterPickerProps) {
  const [testament, setTestament] = useState<'OT' | 'NT'>(
    currentLocation.bookId >= 40 ? 'NT' : 'OT',
  );
  const [filterText, setFilterText] = useState('');
  const [pickedBook, setPickedBook] = useState<BibleBookMeta | null>(null);

  const books = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (q) {
      return BIBLE_BOOKS.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.shortName.toLowerCase().includes(q) ||
          b.aliases.some((a) => a.includes(q)),
      );
    }
    return BIBLE_BOOKS.filter((b) => b.testament === testament);
  }, [testament, filterText]);

  if (!open) return null;

  const activeBook =
    pickedBook || BIBLE_BOOKS.find((b) => b.id === currentLocation.bookId) || BIBLE_BOOKS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose Bible Book and Chapter"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="sheet-enter max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 shadow-[var(--shadow-sheet)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 className="text-base font-bold text-[var(--ink-primary)]">
              {pickedBook ? `${pickedBook.name} - Choose Chapter` : 'Select Book & Chapter'}
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              {pickedBook
                ? `${pickedBook.chapters} ${pickedBook.chapters === 1 ? 'chapter' : 'chapters'}`
                : '66 Canonical Books'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pickedBook && (
              <button
                type="button"
                onClick={() => setPickedBook(null)}
                className="tactile-btn h-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-xs font-bold text-[var(--ink-secondary)]"
              >
                All Books
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close book picker"
              className="tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)]"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {!pickedBook ? (
          <div className="mt-4 space-y-3">
            {/* Quick book filter */}
            <div className="relative">
              <MagnifyingGlass
                size={16}
                weight="bold"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
              />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter books (e.g. Psalms, Daniel, Romans)..."
                className="h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-9 pr-3 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
            </div>

            {/* OT / NT Switcher */}
            {!filterText.trim() && (
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[var(--bg-recessed)] p-1">
                {(['OT', 'NT'] as const).map((t) => {
                  const active = testament === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTestament(t)}
                      className={`tactile-btn h-9 rounded-lg text-xs font-bold ${
                        active
                          ? 'bg-[var(--bg-surface)] text-[var(--accent-primary)] shadow-sm'
                          : 'text-[var(--ink-secondary)]'
                      }`}
                    >
                      {t === 'OT' ? 'Old Testament (39)' : 'New Testament (27)'}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {books.map((book) => {
                const isCurrent = book.id === currentLocation.bookId;
                return (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => {
                      if (book.chapters === 1) {
                        onSelectLocation({ bookId: book.id, chapter: 1 });
                        onClose();
                      } else {
                        setPickedBook(book);
                      }
                    }}
                    className={`tactile-btn flex items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                      isCurrent
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <span className="truncate text-sm font-semibold">{book.name}</span>
                    <span className="ml-2 shrink-0 font-[family-name:var(--font-mono)] text-[11px] text-[var(--ink-muted)]">
                      {book.chapters}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
              {Array.from({ length: activeBook.chapters }, (_, i) => i + 1).map((ch) => {
                const isCurrent =
                  activeBook.id === currentLocation.bookId && ch === currentLocation.chapter;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      onSelectLocation({ bookId: activeBook.id, chapter: ch });
                      setPickedBook(null);
                      onClose();
                    }}
                    className={`tactile-btn flex h-11 items-center justify-center rounded-xl border font-[family-name:var(--font-mono)] text-sm font-bold ${
                      isCurrent
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
