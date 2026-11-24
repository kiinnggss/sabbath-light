import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookBookmark,
  BookOpenText,
  MagnifyingGlass,
  Notebook,
  NotePencil,
  MusicNotes,
  Trash,
  X,
} from '@phosphor-icons/react';
import type { NoteSourceType, StudyNote } from '../../lib/offlineDb';

interface MyNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notes: StudyNote[];
  onJumpToNote: (note: StudyNote) => void;
  onEditNote: (note: StudyNote) => void;
  onDeleteNote: (noteId: string) => void;
}

type NotesFilter = 'all' | NoteSourceType;

const FILTER_TABS: Array<{ id: NotesFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'bible', label: 'Bible' },
  { id: 'sabbath-school', label: 'Sabbath School' },
  { id: 'hymnal', label: 'Hymnal' },
];

const SOURCE_ICON: Record<NoteSourceType, typeof BookBookmark> = {
  bible: BookBookmark,
  'sabbath-school': BookOpenText,
  hymnal: MusicNotes,
};

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function MyNotesDrawer({
  isOpen,
  onClose,
  notes,
  onJumpToNote,
  onEditNote,
  onDeleteNote,
}: MyNotesDrawerProps) {
  const [filter, setFilter] = useState<NotesFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const counts = useMemo(() => {
    const byType = { all: notes.length, bible: 0, 'sabbath-school': 0, hymnal: 0 };
    for (const n of notes) {
      byType[n.sourceType] += 1;
    }
    return byType;
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (filter !== 'all' && n.sourceType !== filter) return false;
      if (!q) return true;
      return (
        n.noteText.toLowerCase().includes(q) ||
        n.referenceLabel.toLowerCase().includes(q) ||
        n.quoteSnippet.toLowerCase().includes(q)
      );
    });
  }, [notes, filter, query]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-notes-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col border-l border-[var(--border-strong)] bg-[var(--bg-canvas)] shadow-2xl"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-amber-soft)] text-[var(--accent-primary)]">
              <Notebook size={20} weight="duotone" />
            </span>
            <div className="min-w-0">
              <h2
                id="my-notes-drawer-title"
                className="font-display truncate text-base font-bold text-[var(--ink-primary)]"
              >
                My Notes
              </h2>
              <p className="truncate text-xs text-[var(--ink-muted)]">
                {notes.length} {notes.length === 1 ? 'saved note' : 'saved notes'} · Stored offline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close My Notes drawer"
            className="tactile-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--ink-primary)]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Search & Source Filters */}
        <div className="space-y-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-3">
          <div className="relative">
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, verses, lessons, or hymns..."
              aria-label="Search saved notes"
              className="h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pl-9 pr-3 text-xs font-medium text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>

          <div role="tablist" aria-label="Filter notes by source" className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
            {FILTER_TABS.map(({ id, label }) => {
              const active = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(id)}
                  className={`tactile-btn inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold ${
                    active
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--ink-on-accent)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 font-[family-name:var(--font-mono)] text-[10px] ${
                      active ? 'bg-black/15 text-[var(--ink-on-accent)]' : 'bg-[var(--bg-recessed)] text-[var(--ink-muted)]'
                    }`}
                  >
                    {counts[id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {filteredNotes.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-10 text-center">
              <Notebook size={32} weight="duotone" className="mx-auto text-[var(--ink-muted)]" />
              <p className="mt-3 text-sm font-bold text-[var(--ink-primary)]">
                {notes.length === 0 ? 'No study notes yet' : 'No matching notes'}
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)] leading-relaxed">
                {notes.length === 0
                  ? 'Tap any Bible verse, Sabbath School paragraph, or Hymn header Note button to start recording your thoughts.'
                  : 'Try another search keyword or switch filter pills above.'}
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const Icon = SOURCE_ICON[note.sourceType];
              return (
                <article
                  key={note.id}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onJumpToNote(note);
                        onClose();
                      }}
                      title="Jump back to source"
                      className="tactile-btn inline-flex max-w-[78%] items-center gap-1.5 rounded-full border border-[var(--accent-primary)]/40 bg-[var(--accent-primary-soft)] px-2.5 py-1 text-left text-xs font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--ink-on-accent)]"
                    >
                      <Icon size={13} weight="duotone" className="shrink-0" />
                      <span className="truncate">{note.referenceLabel}</span>
                      <ArrowUpRight size={13} weight="bold" className="shrink-0" />
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditNote(note)}
                        aria-label={`Edit note for ${note.referenceLabel}`}
                        className="tactile-btn flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                      >
                        <NotePencil size={14} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        aria-label={`Delete note for ${note.referenceLabel}`}
                        className="tactile-btn flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--accent-primary)]"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>

                  {note.quoteSnippet && (
                    <div className="mt-2.5 rounded-xl bg-[var(--bg-recessed)] px-3 py-2">
                      <p className="line-clamp-2 text-xs italic leading-relaxed text-[var(--ink-secondary)]">
                        &ldquo;{note.quoteSnippet}&rdquo;
                      </p>
                    </div>
                  )}

                  <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink-primary)]">
                    {note.noteText}
                  </p>

                  <p className="mt-2.5 text-[11px] font-medium text-[var(--ink-muted)]">
                    Updated {formatDate(note.updatedAt)}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
