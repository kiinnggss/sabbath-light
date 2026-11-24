import { useEffect, useMemo, useRef } from 'react';
import type { MouseEvent } from 'react';
import { NotePencil } from '@phosphor-icons/react';
import type { SabbathSchoolEdition } from '../../hooks/usePreferences';
import { makeSSBlockRef } from '../../lib/noteReferences';
import type { StudyNote } from '../../lib/offlineDb';
import { parseAdventechVerseAttr } from '../../lib/scriptureParser';

interface LessonContentProps {
  html: string;
  edition: SabbathSchoolEdition;
  quarterlyId: string;
  lessonId: string;
  dayId: string;
  focusBlockIdx?: number;
  notesByRefId: Map<string, StudyNote>;
  onOpenScripture: (reference: string, verseAttr?: string) => void;
  onSelectBlockNote: (blockIdx: number, snippet: string) => void;
}

interface ParsedLessonBlock {
  idx: number;
  html: string;
  text: string;
  tag: string;
}

/**
 * Sanitizes lesson HTML safely and splits top-level nodes into tappable study blocks
 * while keeping Adventech `<a class="verse">` scripture links interactive.
 */
function parseLessonBlocks(rawHtml: string): ParsedLessonBlock[] {
  if (!rawHtml) return [];
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');

  for (const dangerous of doc.querySelectorAll('script, style, iframe, object, embed, link')) {
    dangerous.remove();
  }

  for (const el of doc.body.querySelectorAll('*')) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name === 'style') {
        el.removeAttribute(attr.name);
      }
      if (name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    }
    if (el.tagName === 'A' && el.classList.contains('verse')) {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.removeAttribute('href');
    }
  }

  const blocks: ParsedLessonBlock[] = [];
  let idx = 0;
  for (const child of Array.from(doc.body.children)) {
    const text = (child.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    blocks.push({
      idx: idx++,
      html: child.outerHTML,
      text,
      tag: child.tagName,
    });
  }

  if (blocks.length === 0) {
    const fallbackText = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    if (fallbackText) {
      blocks.push({
        idx: 0,
        html: doc.body.innerHTML,
        text: fallbackText,
        tag: 'DIV',
      });
    }
  }

  return blocks;
}

export function LessonContent({
  html,
  edition,
  quarterlyId,
  lessonId,
  dayId,
  focusBlockIdx,
  notesByRefId,
  onOpenScripture,
  onSelectBlockNote,
}: LessonContentProps) {
  const blocks = useMemo(() => parseLessonBlocks(html), [html]);
  const focusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (focusBlockIdx !== undefined && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusBlockIdx, quarterlyId, lessonId, dayId]);

  const handleContainerClick = (
    e: MouseEvent<HTMLDivElement>,
    block: ParsedLessonBlock,
  ) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest('a.verse') as HTMLElement | null;
    if (anchor) {
      e.preventDefault();
      e.stopPropagation();
      const text = (anchor.textContent || '').trim();
      const verseAttr = anchor.getAttribute('verse') || undefined;
      const parsed = parseAdventechVerseAttr(verseAttr || '', text);
      if (parsed.length > 0) {
        onOpenScripture(text || parsed[0].label, verseAttr);
      } else if (text) {
        onOpenScripture(text, verseAttr);
      }
      return;
    }

    if (block.tag === 'H1' || block.tag === 'H2') return;
    onSelectBlockNote(block.idx, block.text);
  };

  return (
    <div className="ss-lesson-html reading-prose space-y-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-6 text-[var(--ink-primary)]">
      {blocks.map((block) => {
        const refId = makeSSBlockRef(edition, quarterlyId, lessonId, dayId, block.idx);
        const savedNote = notesByRefId.get(refId);
        const isHeading = block.tag === 'H1' || block.tag === 'H2';
        const isFocused = focusBlockIdx === block.idx;

        return (
          <div
            key={`${dayId}-${block.idx}`}
            ref={isFocused ? focusRef : undefined}
            onClick={(e) => handleContainerClick(e, block)}
            className={`group relative rounded-xl px-2.5 py-1.5 transition-colors ${
              isHeading
                ? ''
                : savedNote
                  ? 'cursor-pointer bg-[var(--accent-amber-soft)]/55 ring-1 ring-[var(--accent-amber)]/50'
                  : isFocused
                    ? 'cursor-pointer bg-[var(--accent-primary-soft)] ring-1 ring-[var(--accent-primary)]'
                    : 'cursor-pointer hover:bg-[var(--bg-recessed)]/70'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className="min-w-0 flex-1 [&>*:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
              {!isHeading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBlockNote(block.idx, block.text);
                  }}
                  aria-label={savedNote ? 'Edit paragraph note' : 'Add paragraph note'}
                  title={savedNote ? 'Edit note on this paragraph' : 'Attach a note'}
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-opacity ${
                    savedNote
                      ? 'bg-[var(--accent-amber)] text-[#130603] opacity-100'
                      : 'bg-[var(--bg-recessed)] text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 focus:opacity-100'
                  }`}
                >
                  <NotePencil size={13} weight={savedNote ? 'fill' : 'regular'} />
                </button>
              )}
            </div>

            {savedNote && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--accent-amber)]/40 bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--ink-primary)]">
                <NotePencil size={14} weight="fill" className="mt-0.5 shrink-0 text-[var(--accent-amber)]" />
                <p className="line-clamp-2 leading-snug">{savedNote.noteText}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
