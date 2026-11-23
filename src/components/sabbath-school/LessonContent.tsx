import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import { parseAdventechVerseAttr } from '../../lib/scriptureParser';

interface LessonContentProps {
  html: string;
  onOpenScripture: (reference: string, verseAttr?: string) => void;
}

/**
 * Strips scripts/iframes/inline event handlers safely while keeping clean semantic formatting
 * and Adventech `<a class="verse">` scripture links.
 */
function sanitizeLessonHtml(rawHtml: string): string {
  if (!rawHtml) return '';
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

  return doc.body.innerHTML;
}

export function LessonContent({ html, onOpenScripture }: LessonContentProps) {
  const safeHtml = useMemo(() => sanitizeLessonHtml(html), [html]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest('a.verse') as HTMLElement | null;
    if (!anchor) return;
    e.preventDefault();
    const text = (anchor.textContent || '').trim();
    const verseAttr = anchor.getAttribute('verse') || undefined;
    const parsed = parseAdventechVerseAttr(verseAttr || '', text);
    if (parsed.length > 0) {
      onOpenScripture(text || parsed[0].label, verseAttr);
    } else if (text) {
      onOpenScripture(text, verseAttr);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="ss-lesson-html reading-prose rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 text-[var(--ink-primary)]"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
