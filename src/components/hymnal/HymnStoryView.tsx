import { BookBookmark, MusicNotes, User } from '@phosphor-icons/react';
import type { HymnEntry } from '../../data/hymnalTypes';

interface HymnStoryViewProps {
  hymn: HymnEntry;
}

export function HymnStoryView({ hymn }: HymnStoryViewProps) {
  const hasNamedAuthor = hymn.author && hymn.author !== 'Seventh-day Adventist Hymnal (1985)';
  const fallbackBio = hasNamedAuthor
    ? `${hymn.author} contributed this hymn text to Christian congregational worship, included as selection #${hymn.number} in the ${hymn.category} section of the 1985 Seventh-day Adventist Hymnal.`
    : `Selection #${hymn.number} appears in the ${hymn.category} section of the 1985 Seventh-day Adventist Hymnal, compiled by the General Conference Hymnal Committee.`;

  const fallbackStory = `Included under "${hymn.category}" in the 1985 Seventh-day Adventist Hymnal (#${hymn.number}), "${hymn.title}" opens with the line "${hymn.firstLine}" and is sung with the ${hymn.tuneName} setting${
    hymn.meter ? ` (${hymn.meter})` : ''
  }.`;

  return (
    <div className="space-y-4">
      {/* Author Biography Card */}
      <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-amber-soft)] text-[var(--ink-primary)]">
              <User size={18} weight="duotone" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[var(--ink-primary)]">
                {hymn.author}
              </h3>
              {hymn.authorDates && (
                <p className="text-xs font-medium text-[var(--ink-muted)]">
                  {hymn.authorDates}
                </p>
              )}
            </div>
          </div>
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ink-secondary)]">
            Author Bio
          </span>
        </div>

        <p className="reading-prose mt-3.5 text-[var(--ink-primary)]">
          {hymn.authorBio || fallbackBio}
        </p>
      </article>

      {/* Historical Story Behind the Hymn */}
      <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]">
            <BookBookmark size={18} weight="duotone" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[var(--ink-primary)]">
              The Story Behind the Hymn
            </h3>
            <p className="text-xs text-[var(--ink-muted)]">
              Historical context &amp; worship background
            </p>
          </div>
        </div>

        <div className="reading-prose mt-3.5 space-y-3 text-[var(--ink-primary)]">
          {(hymn.story || fallbackStory)
            .split(/\n+/)
            .filter(Boolean)
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>
      </article>

      {/* Tune & Musical Details Card */}
      <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-secondary)]">
          <MusicNotes size={15} weight="duotone" className="text-[var(--accent-primary)]" />
          <span>Musical Setting</span>
        </div>
        <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-[var(--ink-muted)]">Tune</dt>
            <dd className="mt-0.5 font-bold text-[var(--ink-primary)]">{hymn.tuneName}</dd>
          </div>
          {hymn.composer && (
            <div>
              <dt className="text-[var(--ink-muted)]">Composer</dt>
              <dd className="mt-0.5 font-semibold text-[var(--ink-primary)]">{hymn.composer}</dd>
            </div>
          )}
          {hymn.key && (
            <div>
              <dt className="text-[var(--ink-muted)]">Key</dt>
              <dd className="mt-0.5 font-semibold text-[var(--ink-primary)]">{hymn.key}</dd>
            </div>
          )}
          {hymn.meter && (
            <div>
              <dt className="text-[var(--ink-muted)]">Meter</dt>
              <dd className="mt-0.5 font-semibold text-[var(--ink-primary)]">{hymn.meter}</dd>
            </div>
          )}
        </dl>
      </article>
    </div>
  );
}
