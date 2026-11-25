import { useState } from 'react';
import {
  ArrowLeft,
  BookOpenText,
  CaretLeft,
  CaretRight,
  MusicNotes,
  NotePencil,
  PianoKeys,
  Star,
} from '@phosphor-icons/react';
import type { HymnEntry } from '../../data/hymnalTypes';
import type { StudyNote } from '../../lib/offlineDb';
import { TunePlayerBar } from '../audio/TunePlayerBar';
import { DotMatrixBadge } from './DotMatrixBadge';
import { HymnStoryView } from './HymnStoryView';
import { SheetMusicView } from './SheetMusicView';

interface HymnReaderProps {
  hymn: HymnEntry;
  isFavorite: boolean;
  note?: StudyNote;
  onToggleFavorite: (number: number) => void;
  onOpenNoteEditor: () => void;
  onBack: () => void;
  onNavigateNumber: (number: number) => void;
}

export function HymnReader({
  hymn,
  isFavorite,
  note,
  onToggleFavorite,
  onOpenNoteEditor,
  onBack,
  onNavigateNumber,
}: HymnReaderProps) {
  const [viewMode, setViewMode] = useState<'lyrics' | 'sheet' | 'story'>('lyrics');

  return (
    <div className="pb-56">
      {/* Top Reader Controls */}
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
            disabled={hymn.number <= 1}
            onClick={() => onNavigateNumber(hymn.number - 1)}
            aria-label="Previous hymn"
            className="tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-recessed)] disabled:opacity-35"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <button
            type="button"
            disabled={hymn.number >= 920}
            onClick={() => onNavigateNumber(hymn.number + 1)}
            aria-label="Next selection"
            className="tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-recessed)] disabled:opacity-35"
          >
            <CaretRight size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onOpenNoteEditor}
            aria-label={note ? `Edit note on Hymn #${hymn.number}` : `Add note on Hymn #${hymn.number}`}
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
            onClick={() => onToggleFavorite(hymn.number)}
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

      {/* Header Card with Yoto Dot-Matrix Hymn Number */}
      <header className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
        <div className="flex flex-wrap items-start gap-4">
          <DotMatrixBadge number={hymn.number} size="lg" padDigits />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--bg-recessed)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ink-secondary)]">
                {hymn.category}
              </span>
              {hymn.key && (
                <span className="rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ink-muted)]">
                  {hymn.key}
                </span>
              )}
            </div>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-[var(--ink-primary)] leading-tight">
              {hymn.title}
            </h2>
            <p className="mt-1.5 text-sm font-medium text-[var(--ink-secondary)]">
              {hymn.author}
              {hymn.authorDates ? ` (${hymn.authorDates})` : ''} · Tune: {hymn.tuneName}
            </p>
          </div>
        </div>

        {/* 3-Pill Switcher: Lyrics | Sheet Music | Story */}
        <div
          role="tablist"
          aria-label="Hymn view"
          className="mt-5 grid grid-cols-3 gap-1.5 rounded-xl bg-[var(--bg-recessed)] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'lyrics'}
            onClick={() => setViewMode('lyrics')}
            className={`tactile-btn flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-bold ${
              viewMode === 'lyrics'
                ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-sm'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <MusicNotes size={16} weight={viewMode === 'lyrics' ? 'fill' : 'regular'} />
            <span>Lyrics</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'sheet'}
            onClick={() => setViewMode('sheet')}
            className={`tactile-btn flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-bold ${
              viewMode === 'sheet'
                ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-sm'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <PianoKeys size={16} weight={viewMode === 'sheet' ? 'fill' : 'regular'} />
            <span>Sheet</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'story'}
            onClick={() => setViewMode('story')}
            className={`tactile-btn flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-bold ${
              viewMode === 'story'
                ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-sm'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <BookOpenText size={16} weight={viewMode === 'story' ? 'fill' : 'regular'} />
            <span>Story</span>
          </button>
        </div>
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
              Personal Hymn Note
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm text-[var(--ink-primary)]">{note.noteText}</p>
          </div>
        </button>
      )}

      {/* Main Content */}
      <div className="mt-4">
        {viewMode === 'lyrics' ? (
          <div className="space-y-4">
            {hymn.verses.map((verse, idx) => (
              <section
                key={`${verse.label}-${idx}`}
                className={`rounded-2xl border p-5 ${
                  verse.isRefrain
                    ? 'border-[var(--border-strong)] bg-[var(--bg-recessed)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                }`}
              >
                <div className="mb-2.5 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      verse.isRefrain
                        ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)]'
                        : 'bg-[var(--bg-recessed)] text-[var(--ink-secondary)]'
                    }`}
                  >
                    {verse.label}
                  </span>
                </div>
                <div
                  className={`reading-prose space-y-1 text-[var(--ink-primary)] ${
                    verse.isRefrain ? 'italic font-medium' : ''
                  }`}
                >
                  {verse.lines.map((line, lIdx) => (
                    <p key={lIdx}>{line}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : viewMode === 'sheet' ? (
          <SheetMusicView hymn={hymn} />
        ) : (
          <HymnStoryView hymn={hymn} />
        )}
      </div>

      {/* Tone.js Audio Bar ONLY for Hymns #1-#695 */}
      <TunePlayerBar hymn={hymn} />
    </div>
  );
}
