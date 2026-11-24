import { useState } from 'react';
import {
  ArrowLeft,
  BookBookmark,
  CaretLeft,
  CaretRight,
  NotePencil,
  Star,
  UsersThree,
} from '@phosphor-icons/react';
import type { WorshipAidEntry } from '../../data/hymnalTypes';
import type { StudyNote } from '../../lib/offlineDb';
import { DotMatrixBadge } from './DotMatrixBadge';

interface WorshipAidReaderProps {
  reading: WorshipAidEntry;
  isFavorite: boolean;
  note?: StudyNote;
  onToggleFavorite: (number: number) => void;
  onOpenNoteEditor: () => void;
  onBack: () => void;
  onNavigateNumber: (number: number) => void;
  onOpenScripture: (reference: string) => void;
}

export function WorshipAidReader({
  reading,
  isFavorite,
  note,
  onToggleFavorite,
  onOpenNoteEditor,
  onBack,
  onNavigateNumber,
  onOpenScripture,
}: WorshipAidReaderProps) {
  const [layoutMode, setLayoutMode] = useState<'responsive' | 'unison'>(
    reading.readingStyle === 'responsive' ? 'responsive' : 'unison',
  );

  const hasResponsiveParts = reading.parts.length >= 2;

  return (
    <div className="pb-12">
      {/* Top Reader Controls - Note: Audio Player is intentionally hidden for #696-#920 */}
      <div className="flex items-center justify-between gap-2 py-3">
        <button
          type="button"
          onClick={onBack}
          className="tactile-btn inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-xs font-bold text-[var(--ink-primary)] shadow-[var(--shadow-tactile)] hover:bg-[var(--bg-recessed)]"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Hymnal Index</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={reading.number <= 1}
            onClick={() => onNavigateNumber(reading.number - 1)}
            aria-label="Previous selection"
            className="tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-recessed)] disabled:opacity-35"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <button
            type="button"
            disabled={reading.number >= 920}
            onClick={() => onNavigateNumber(reading.number + 1)}
            aria-label="Next selection"
            className="tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-recessed)] disabled:opacity-35"
          >
            <CaretRight size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onOpenNoteEditor}
            aria-label={note ? `Edit note on Reading #${reading.number}` : `Add note on Reading #${reading.number}`}
            aria-pressed={Boolean(note)}
            className={`tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border shadow-[var(--shadow-tactile)] ${
              note
                ? 'border-[var(--accent-amber)] bg-[var(--accent-amber-soft)] text-[var(--accent-amber)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <NotePencil size={19} weight={note ? 'fill' : 'regular'} />
          </button>
          <button
            type="button"
            onClick={() => onToggleFavorite(reading.number)}
            aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            aria-pressed={isFavorite}
            className={`tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border shadow-[var(--shadow-tactile)] ${
              isFavorite
                ? 'border-[var(--accent-amber)] bg-[var(--accent-amber-soft)] text-[var(--accent-amber)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <Star size={19} weight={isFavorite ? 'fill' : 'regular'} />
          </button>
        </div>
      </div>

      {/* Header Card */}
      <header className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
        <div className="flex flex-wrap items-start gap-4">
          <DotMatrixBadge number={reading.number} size="lg" padDigits />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--accent-amber-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--ink-primary)]">
                Worship Aid · {reading.category}
              </span>
              {reading.scriptureRef && (
                <button
                  type="button"
                  onClick={() => onOpenScripture(reading.scriptureRef!)}
                  className="tactile-btn inline-flex items-center gap-1 rounded-full border border-[var(--accent-primary)]/40 bg-[var(--accent-primary-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--ink-on-accent)]"
                >
                  <BookBookmark size={12} weight="duotone" />
                  <span>{reading.scriptureRef}</span>
                </button>
              )}
            </div>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-[var(--ink-primary)] leading-tight">
              {reading.title}
            </h2>
            <p className="mt-1 text-xs font-medium text-[var(--ink-muted)]">
              Responsive Sanctuary Reading · Audio player hidden for spoken worship aids
            </p>
          </div>
        </div>

        {hasResponsiveParts && (
          <div
            role="tablist"
            aria-label="Reading format"
            className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-[var(--bg-recessed)] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={layoutMode === 'responsive'}
              onClick={() => setLayoutMode('responsive')}
              className={`tactile-btn flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold ${
                layoutMode === 'responsive'
                  ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-sm'
                  : 'text-[var(--ink-secondary)]'
              }`}
            >
              <UsersThree size={15} weight="duotone" />
              <span>Leader &amp; Congregation</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={layoutMode === 'unison'}
              onClick={() => setLayoutMode('unison')}
              className={`tactile-btn flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold ${
                layoutMode === 'unison'
                  ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-sm'
                  : 'text-[var(--ink-secondary)]'
              }`}
            >
              <span>Unison Reading</span>
            </button>
          </div>
        )}
      </header>

      {note && (
        <button
          type="button"
          onClick={onOpenNoteEditor}
          className="tactile-btn mt-4 flex w-full items-start gap-2.5 rounded-2xl border border-[var(--accent-amber)]/50 bg-[var(--accent-amber-soft)]/55 p-3.5 text-left"
        >
          <NotePencil size={17} weight="fill" className="mt-0.5 shrink-0 text-[var(--accent-amber)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
              Personal Worship Note
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm text-[var(--ink-primary)]">{note.noteText}</p>
          </div>
        </button>
      )}

      {/* Formatted Responsive / Unison Lines */}
      <div className="mt-4 space-y-3.5">
        {reading.parts.map((part, idx) => {
          const isCongregation =
            layoutMode === 'responsive' &&
            (part.speaker === 'congregation' || (hasResponsiveParts && idx % 2 === 1));

          return (
            <section
              key={idx}
              className={`rounded-2xl border p-5 ${
                isCongregation
                  ? 'border-[var(--border-strong)] bg-[var(--bg-recessed)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                    isCongregation
                      ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)]'
                      : 'border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-secondary)]'
                  }`}
                >
                  {layoutMode === 'unison'
                    ? 'All Together'
                    : isCongregation
                      ? 'Congregation'
                      : 'Leader'}
                </span>
              </div>

              <div
                className={`reading-prose space-y-1 text-[var(--ink-primary)] ${
                  isCongregation ? 'font-bold' : 'font-normal'
                }`}
              >
                {part.lines.map((line, lIdx) => (
                  <p key={lIdx}>{line}</p>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
