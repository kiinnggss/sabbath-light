import { MagnifyingGlass, Star, X } from '@phosphor-icons/react';
import type { HymnalFilterMode } from '../../lib/fuzzySearch';

interface HymnSearchHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  filterMode: HymnalFilterMode;
  onFilterModeChange: (mode: HymnalFilterMode) => void;
  favoritesCount: number;
  totalFiltered: number;
}

const FILTER_OPTIONS: Array<{ id: HymnalFilterMode; label: string }> = [
  { id: 'all', label: 'All (1-920)' },
  { id: 'hymns', label: 'Hymns (1-695)' },
  { id: 'readings', label: 'Worship Aids (696-920)' },
  { id: 'favorites', label: 'Favorites' },
];

export function HymnSearchHeader({
  query,
  onQueryChange,
  filterMode,
  onFilterModeChange,
  favoritesCount,
  totalFiltered,
}: HymnSearchHeaderProps) {
  return (
    <div className="sticky top-14 z-20 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/95 pb-3 pt-3 backdrop-blur-sm">
      {/* Search Bar */}
      <div className="relative">
        <label htmlFor="hymnal-search-input" className="sr-only">
          Search hymnal by number, title, first line, tune, or author
        </label>
        <MagnifyingGlass
          size={19}
          weight="bold"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
        />
        <input
          id="hymnal-search-input"
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search #1-920, title, tune, or author..."
          className="h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-10 pr-11 text-sm font-medium text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
            className="tactile-btn absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--bg-recessed)] hover:text-[var(--ink-primary)]"
          >
            <X size={16} weight="bold" />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div
        role="tablist"
        aria-label="Hymnal sections"
        className="no-scrollbar mt-2.5 flex items-center gap-2 overflow-x-auto pb-0.5"
      >
        {FILTER_OPTIONS.map(({ id, label }) => {
          const active = filterMode === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilterModeChange(id)}
              className={`tactile-btn inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold ${
                active
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-[var(--shadow-tactile)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
              }`}
            >
              {id === 'favorites' && (
                <Star size={14} weight={active ? 'fill' : 'regular'} />
              )}
              <span>{label}</span>
              {id === 'favorites' && (
                <span
                  className={`rounded-full px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-bold ${
                    active
                      ? 'bg-black/15 text-[var(--ink-on-accent)]'
                      : 'bg-[var(--bg-recessed)] text-[var(--ink-secondary)]'
                  }`}
                >
                  {favoritesCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] font-medium text-[var(--ink-muted)]">
        Showing {totalFiltered} {totalFiltered === 1 ? 'selection' : 'selections'} in the 1985 SDA Hymnal
      </p>
    </div>
  );
}
