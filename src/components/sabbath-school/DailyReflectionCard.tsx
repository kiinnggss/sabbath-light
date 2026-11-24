import { useEffect, useState } from 'react';
import { Check, FloppyDisk, NotePencil, Trash } from '@phosphor-icons/react';
import type { StudyNote } from '../../lib/offlineDb';

interface DailyReflectionCardProps {
  referenceLabel: string;
  quoteSnippet: string;
  existingNote?: StudyNote;
  onSaveReflection: (text: string) => Promise<void> | void;
  onDeleteReflection?: (noteId: string) => Promise<void> | void;
  highlighted?: boolean;
}

export function DailyReflectionCard({
  referenceLabel,
  quoteSnippet,
  existingNote,
  onSaveReflection,
  onDeleteReflection,
  highlighted,
}: DailyReflectionCardProps) {
  const [draft, setDraft] = useState(existingNote?.noteText || '');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setDraft(existingNote?.noteText || '');
    setJustSaved(false);
  }, [existingNote?.noteText, referenceLabel]);

  const isDirty = draft.trim() !== (existingNote?.noteText || '').trim();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveReflection(draft);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      id="ss-daily-reflection"
      aria-label="My Reflection"
      className={`rounded-2xl border p-5 transition-colors ${
        highlighted
          ? 'border-[var(--accent-primary)] bg-[var(--accent-amber-soft)]'
          : 'border-[var(--border-strong)] bg-[var(--bg-recessed)]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--accent-amber)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#130603]">
            <NotePencil size={12} weight="fill" />
            <span>My Reflection</span>
          </span>
          <span className="text-xs font-semibold text-[var(--ink-secondary)]">
            {referenceLabel}
          </span>
        </div>

        {existingNote && (
          <span className="text-[11px] font-medium text-[var(--ink-muted)]">
            Saved {new Date(existingNote.updatedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
        Record your personal takeaway for {quoteSnippet || "today's lesson"}.
      </p>

      <textarea
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Write your reflection or application for today's study..."
        aria-label="Daily Sabbath School reflection"
        className="reading-prose mt-3 w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
      />

      <div className="mt-3 flex items-center justify-between gap-2">
        {existingNote && onDeleteReflection ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => onDeleteReflection(existingNote.id)}
            className="tactile-btn inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-xs font-bold text-[var(--ink-secondary)] hover:text-[var(--accent-primary)]"
          >
            <Trash size={14} />
            <span>Clear</span>
          </button>
        ) : (
          <span className="text-[11px] font-medium text-[var(--ink-muted)]">
            Synced to My Notes offline
          </span>
        )}

        <button
          type="button"
          disabled={saving || (!isDirty && !justSaved) || (!draft.trim() && !existingNote)}
          onClick={handleSave}
          className="tactile-btn inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-bold text-[var(--ink-on-accent)] shadow-[var(--shadow-tactile)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-45"
        >
          {justSaved ? (
            <>
              <Check size={14} weight="bold" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <FloppyDisk size={14} weight="duotone" />
              <span>{saving ? 'Saving...' : 'Save Reflection'}</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
