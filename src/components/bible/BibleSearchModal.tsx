import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, MagnifyingGlass, X } from '@phosphor-icons/react';
import type { BibleLocation, BibleVersionId } from '../../hooks/usePreferences';
import { searchBibleText, type BibleSearchHit } from '../../lib/bibleApi';

interface BibleSearchModalProps {
  open: boolean;
  version: BibleVersionId;
  onClose: () => void;
  onJumpToLocation: (loc: BibleLocation) => void;
}

export function BibleSearchModal({
  open,
  version,
  onClose,
  onJumpToLocation,
}: BibleSearchModalProps) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<BibleSearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [note, setNote] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  if (!open) return null;

  const runSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      const res = await searchBibleText(version, query);
      setHits(res.hits);
      setTotal(res.total);
      setNote(res.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bible search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search Bible Text"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="sheet-enter flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 shadow-[var(--shadow-sheet)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 className="text-base font-bold text-[var(--ink-primary)]">
              Keyword Search ({version})
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              Search words or phrases across all 66 books
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Bible search"
            className="tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={runSearch} className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={17}
              weight="bold"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search e.g. Sabbath, grace, shepherd..."
              className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-9 pr-3 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="tactile-btn h-11 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-bold text-[var(--ink-on-accent)] shadow-[var(--shadow-tactile)] disabled:opacity-45"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {note && (
          <p className="mt-2 text-[11px] font-medium text-[var(--ink-muted)]">{note}</p>
        )}

        <div className="mt-3 flex-1 overflow-y-auto space-y-2">
          {error && (
            <div className="rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--bg-surface)] p-4 text-xs text-[var(--ink-primary)]">
              {error}
            </div>
          )}

          {!loading && hasSearched && hits.length === 0 && !error && (
            <p className="py-8 text-center text-sm text-[var(--ink-muted)]">
              No verses matched &ldquo;{query}&rdquo;.
            </p>
          )}

          {hasSearched && hits.length > 0 && (
            <p className="text-xs font-semibold text-[var(--ink-muted)]">
              Showing {hits.length} of {total} matches
            </p>
          )}

          {hits.map((hit, idx) => (
            <button
              key={`${hit.bookId}-${hit.chapter}-${hit.verse}-${idx}`}
              type="button"
              onClick={() => {
                onJumpToLocation({
                  bookId: hit.bookId,
                  chapter: hit.chapter,
                  verse: hit.verse,
                });
                onClose();
              }}
              className="tactile-btn flex w-full items-start justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-left hover:border-[var(--border-strong)]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--accent-primary)]">
                  {hit.bookName} {hit.chapter}:{hit.verse}
                </p>
                <p className="mt-1 text-sm text-[var(--ink-primary)]">{hit.text}</p>
              </div>
              <ArrowRight size={16} weight="bold" className="mt-1 shrink-0 text-[var(--ink-muted)]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
