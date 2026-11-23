import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, MusicNote, Star } from '@phosphor-icons/react';
import type { HymnalEntry } from '../../data/hymnalTypes';
import { DotMatrixBadge } from './DotMatrixBadge';

interface HymnListProps {
  entries: HymnalEntry[];
  jumpEntry: HymnalEntry | null;
  favorites: number[];
  onSelectEntry: (number: number) => void;
  onToggleFavorite: (number: number) => void;
}

const PAGE_SIZE = 75;

export function HymnList({
  entries,
  jumpEntry,
  favorites,
  onSelectEntry,
  onToggleFavorite,
}: HymnListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const favSet = new Set(favorites);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [entries]);

  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = visibleCount < entries.length;

  return (
    <div className="space-y-2.5 py-3">
      {/* 1-Tap Number Jump Card when user types a hymn/reading number 1-920 */}
      {jumpEntry && (
        <button
          type="button"
          onClick={() => onSelectEntry(jumpEntry.number)}
          className="tactile-btn flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-[var(--accent-primary)] bg-[var(--bg-surface)] p-3.5 text-left shadow-[var(--shadow-tactile)] hover:bg-[var(--accent-primary-soft)]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <DotMatrixBadge number={jumpEntry.number} size="lg" />
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-[var(--accent-amber-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-primary)]">
                Quick Jump · {jumpEntry.kind === 'hymn' ? 'Hymn' : 'Worship Aid'}
              </span>
              <p className="mt-1 truncate text-base font-bold text-[var(--ink-primary)]">
                {jumpEntry.title}
              </p>
              <p className="truncate text-xs text-[var(--ink-muted)]">
                {jumpEntry.kind === 'hymn'
                  ? `${jumpEntry.tuneName} · ${jumpEntry.author}`
                  : jumpEntry.scriptureRef || jumpEntry.category}
              </p>
            </div>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-white">
            <ArrowRight size={18} weight="bold" />
          </span>
        </button>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-10 text-center">
          <p className="text-sm font-semibold text-[var(--ink-primary)]">
            No matching hymns or readings found.
          </p>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Try typing a number between 1 and 920, a hymn title, tune name, or author.
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {visibleEntries.map((item) => {
              const isFav = favSet.has(item.number);
              const isReading = item.kind === 'reading';
              return (
                <li
                  key={item.number}
                  className="flex items-stretch gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 transition-colors hover:border-[var(--border-strong)]"
                >
                  <button
                    type="button"
                    onClick={() => onSelectEntry(item.number)}
                    className="tactile-btn flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1.5 text-left"
                  >
                    <DotMatrixBadge number={item.number} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[15px] font-bold text-[var(--ink-primary)]">
                          {item.title}
                        </p>
                        {isReading && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--bg-recessed)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ink-secondary)]">
                            <BookOpen size={11} weight="duotone" />
                            Aid
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--ink-muted)]">
                        {item.kind === 'hymn'
                          ? `${item.firstLine.replace(/[,;:\s]+$/, '')} · ${item.author}`
                          : `${item.category}${item.scriptureRef ? ` · ${item.scriptureRef}` : ''}`}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleFavorite(item.number)}
                    aria-label={
                      isFav
                        ? `Remove #${item.number} from favorites`
                        : `Add #${item.number} to favorites`
                    }
                    aria-pressed={isFav}
                    className={`tactile-btn flex w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isFav
                        ? 'text-[var(--accent-amber)] hover:bg-[var(--bg-recessed)]'
                        : 'text-[var(--ink-muted)] hover:bg-[var(--bg-recessed)] hover:text-[var(--ink-primary)]'
                    }`}
                  >
                    <Star size={20} weight={isFav ? 'fill' : 'regular'} />
                  </button>
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="tactile-btn inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 text-sm font-semibold text-[var(--ink-primary)] shadow-[var(--shadow-tactile)] hover:bg-[var(--bg-recessed)]"
              >
                <MusicNote size={16} weight="duotone" />
                <span>
                  Show next {Math.min(PAGE_SIZE, entries.length - visibleCount)} of{' '}
                  {entries.length - visibleCount} remaining
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
