import { BookBookmark, Quotes } from '@phosphor-icons/react';
import type { ExtractedMemoryText } from '../../lib/sabbathSchoolApi';

interface MemoryTextCardProps {
  memoryText: ExtractedMemoryText;
  onOpenScripture: (reference: string) => void;
}

export function MemoryTextCard({ memoryText, onOpenScripture }: MemoryTextCardProps) {
  return (
    <section
      aria-label="Weekly Memory Text"
      className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-recessed)] p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-amber)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#130603]">
          <Quotes size={12} weight="fill" />
          <span>Memory Text</span>
        </span>

        {memoryText.reference && (
          <button
            type="button"
            onClick={() => onOpenScripture(memoryText.reference!)}
            className="tactile-btn inline-flex items-center gap-1 rounded-full border border-[var(--accent-primary)]/40 bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--ink-on-accent)]"
          >
            <BookBookmark size={13} weight="duotone" />
            <span>{memoryText.reference}</span>
          </button>
        )}
      </div>

      <p className="reading-prose mt-3 font-medium text-[var(--ink-primary)]">
        {memoryText.text}
      </p>
    </section>
  );
}
