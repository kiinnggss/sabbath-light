import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowSquareOut,
  BookBookmark,
  DownloadSimple,
  FilePdf,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import type { SSPdfResource } from '../../lib/sabbathSchoolApi';
import { parseScriptureReference } from '../../lib/scriptureParser';

interface CornerstonePdfReaderProps {
  pdfs: SSPdfResource[];
  onOpenScripture: (reference: string) => void;
}

const SUGGESTED_VERSES = ['Psalm 119:105', 'Daniel 7:9-10', '2 Timothy 3:16-17', 'Rev 14:6-7'];

export function CornerstonePdfReader({
  pdfs,
  onOpenScripture,
}: CornerstonePdfReaderProps) {
  const [selectedPdfIdx, setSelectedPdfIdx] = useState(0);
  const [quickRef, setQuickRef] = useState('');
  const [refNotice, setRefNotice] = useState<string | null>(null);

  const activePdf = pdfs[selectedPdfIdx] || pdfs[0];

  const handleQuickLookup = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = quickRef.trim();
    if (!cleaned) return;
    const parsed = parseScriptureReference(cleaned);
    if (parsed.length === 0) {
      setRefNotice('Enter a reference like "John 3:16" or "Daniel 7:9-10".');
      return;
    }
    setRefNotice(null);
    onOpenScripture(cleaned);
  };

  if (!activePdf) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center text-sm text-[var(--ink-secondary)]">
        No PDF lesson files are attached to this Cornerstone Connections week yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Student / Teacher PDF Switcher + External Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {pdfs.map((pdf, idx) => {
            const active = idx === selectedPdfIdx;
            const label = /teacher/i.test(pdf.title) ? "Teacher's Guide" : 'Student Lesson';
            return (
              <button
                key={pdf.id}
                type="button"
                onClick={() => setSelectedPdfIdx(idx)}
                className={`tactile-btn inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${
                  active
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--ink-secondary)]'
                }`}
              >
                <FilePdf size={15} weight="duotone" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <a
            href={activePdf.src}
            download
            className="tactile-btn inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-3 text-xs font-semibold text-[var(--ink-primary)] hover:border-[var(--border-strong)]"
          >
            <DownloadSimple size={14} weight="bold" />
            <span>Download</span>
          </a>
          <a
            href={activePdf.src}
            target="_blank"
            rel="noopener noreferrer"
            className="tactile-btn inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-3 text-xs font-semibold text-[var(--ink-primary)] hover:border-[var(--border-strong)]"
          >
            <span>Open PDF</span>
            <ArrowSquareOut size={14} weight="bold" />
          </a>
        </div>
      </div>

      {/* Quick Scripture Lookup Bar for Youth PDF Study */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-secondary)]">
            Quick Scripture Lookup
          </p>
          <p className="text-[11px] text-[var(--ink-muted)]">
            Look up any verse from this Cornerstone Connections lesson
          </p>
        </div>

        <form onSubmit={handleQuickLookup} className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={15}
              weight="bold"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
            />
            <input
              type="text"
              value={quickRef}
              onChange={(e) => setQuickRef(e.target.value)}
              placeholder="Type a reference (e.g. Daniel 7:9-10)..."
              aria-label="Scripture reference lookup"
              className="h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-8 pr-3 text-xs font-medium text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="tactile-btn h-10 shrink-0 rounded-xl bg-[var(--accent-primary)] px-3.5 text-xs font-bold text-white shadow-[var(--shadow-tactile)]"
          >
            Look up
          </button>
        </form>

        {refNotice && (
          <p className="mt-1.5 text-xs font-medium text-[var(--accent-primary)]">{refNotice}</p>
        )}

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {SUGGESTED_VERSES.map((ref) => (
            <button
              key={ref}
              type="button"
              onClick={() => onOpenScripture(ref)}
              className="tactile-btn inline-flex h-8 items-center gap-1 rounded-full border border-[var(--accent-primary)]/40 bg-[var(--bg-surface)] px-2.5 text-xs font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white"
            >
              <BookBookmark size={12} weight="duotone" />
              <span>{ref}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Direct Streaming Inline PDF Viewer */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 sm:p-3">
        <iframe
          key={activePdf.id}
          src={`${activePdf.src}#view=FitH`}
          title={activePdf.title || 'Cornerstone Connections Lesson PDF'}
          className="h-[68vh] min-h-[460px] w-full rounded-xl border border-[var(--border-subtle)] bg-white"
        />
      </div>
    </div>
  );
}
