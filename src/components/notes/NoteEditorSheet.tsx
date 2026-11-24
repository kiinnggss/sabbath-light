import { useEffect, useState } from 'react';
import {
  BookBookmark,
  BookOpenText,
  FloppyDisk,
  MusicNotes,
  NotePencil,
  Trash,
  X,
} from '@phosphor-icons/react';
import type { NoteSourceType, StudyNote } from '../../lib/offlineDb';

export interface NoteEditorRequest {
  sourceType: NoteSourceType;
  referenceId: string;
  referenceLabel: string;
  quoteSnippet: string;
  existingNote?: StudyNote;
}

interface NoteEditorSheetProps {
  request: NoteEditorRequest | null;
  onSave: (noteText: string) => Promise<void> | void;
  onDelete?: (noteId: string) => Promise<void> | void;
  onClose: () => void;
}

const SOURCE_META: Record<NoteSourceType, { label: string; Icon: typeof BookBookmark }> = {
  bible: { label: 'Bible Note', Icon: BookBookmark },
  'sabbath-school': { label: 'Sabbath School Note', Icon: BookOpenText },
  hymnal: { label: 'Hymnal Note', Icon: MusicNotes },
};

export function NoteEditorSheet({
  request,
  onSave,
  onDelete,
  onClose,
}: NoteEditorSheetProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (request) {
      setText(request.existingNote?.noteText || '');
      setSaveError(null);
    }
  }, [request]);

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [request, onClose]);

  if (!request) return null;

  const { Icon, label } = SOURCE_META[request.sourceType];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(text);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save note.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!request.existingNote || !onDelete) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onDelete(request.existingNote.id);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to delete note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Study note for ${request.referenceLabel}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="sheet-enter flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-[var(--border-strong)] bg-[var(--bg-canvas)] p-5 shadow-[var(--shadow-sheet)] sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-amber-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--ink-primary)]">
              <Icon size={13} weight="duotone" className="text-[var(--accent-primary)]" />
              <span>{label}</span>
            </span>
            <h2 className="font-display mt-1.5 truncate text-base font-bold text-[var(--ink-primary)]">
              {request.referenceLabel}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close note editor"
            className="tactile-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Context Quote Snippet */}
        {request.quoteSnippet && (
          <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-3.5 py-2.5">
            <p className="line-clamp-3 text-xs italic leading-relaxed text-[var(--ink-secondary)]">
              &ldquo;{request.quoteSnippet}&rdquo;
            </p>
          </div>
        )}

        {/* Editor */}
        <div className="mt-3 flex-1">
          <label htmlFor="study-note-textarea" className="sr-only">
            Note text
          </label>
          <textarea
            id="study-note-textarea"
            rows={5}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your reflection, prayer thought, cross-reference, or sermon note..."
            className="reading-prose w-full resize-y rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </div>

        {/* Error notice */}
        {saveError && (
          <p className="mt-2 text-xs font-semibold text-[var(--accent-primary)]">
            {saveError}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between gap-2">
          {request.existingNote && onDelete ? (
            <button
              type="button"
              disabled={saving}
              onClick={handleDelete}
              className="tactile-btn inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 text-xs font-bold text-[var(--ink-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
            >
              <Trash size={15} weight="duotone" />
              <span>Delete</span>
            </button>
          ) : (
            <span className="inline-flex min-w-0 items-center gap-1 truncate text-[11px] font-medium text-[var(--ink-muted)]">
              <NotePencil size={13} className="shrink-0" />
              <span className="truncate">Stored offline</span>
            </span>
          )}

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="tactile-btn h-10 shrink-0 whitespace-nowrap rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-xs font-bold text-[var(--ink-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!text.trim() && !request.existingNote)}
              className="tactile-btn inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-bold text-[var(--ink-on-accent)] shadow-[var(--shadow-tactile)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-45"
            >
              <FloppyDisk size={15} weight="duotone" />
              <span>{saving ? 'Saving...' : 'Save Note'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
