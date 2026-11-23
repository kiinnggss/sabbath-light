import { Check, X } from '@phosphor-icons/react';
import type { SSLessonSummary, SSQuarterlySummary } from '../../lib/sabbathSchoolApi';

interface QuarterlyArchiveModalProps {
  open: boolean;
  onClose: () => void;
  quarterlies: SSQuarterlySummary[];
  activeQuarterlyId: string;
  lessons: SSLessonSummary[];
  activeLessonId: string;
  onSelectQuarterly: (quarterlyId: string) => void;
  onSelectLesson: (lessonId: string) => void;
}

export function QuarterlyArchiveModal({
  open,
  onClose,
  quarterlies,
  activeQuarterlyId,
  lessons,
  activeLessonId,
  onSelectQuarterly,
  onSelectLesson,
}: QuarterlyArchiveModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quarterly and Lesson Archive"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="sheet-enter max-h-[86dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 shadow-[var(--shadow-sheet)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 className="text-base font-bold text-[var(--ink-primary)]">
              Quarterly Archive &amp; Weeks
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              Jump to any week in this quarter or switch to a past quarter
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close archive picker"
            className="tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Weeks in current quarterly */}
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Lessons in Selected Quarter ({activeQuarterlyId})
          </h3>
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {lessons.map((lesson) => {
              const active = lesson.id === activeLessonId;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => {
                    onSelectLesson(lesson.id);
                    onClose();
                  }}
                  className={`tactile-btn flex items-center justify-between gap-2 rounded-xl border p-2.5 text-left ${
                    active
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-soft)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[var(--ink-primary)]">
                      {lesson.id === 'introduction' ? 'Intro' : `Lesson ${lesson.id}`}:{' '}
                      {lesson.title}
                    </p>
                    <p className="text-[11px] text-[var(--ink-muted)]">
                      {lesson.start_date} - {lesson.end_date}
                    </p>
                  </div>
                  {active && (
                    <Check size={16} weight="bold" className="shrink-0 text-[var(--accent-primary)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Archive of all quarters for this edition */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Quarterly Archive ({quarterlies.length} quarters)
          </h3>
          <div className="mt-2 space-y-1.5">
            {quarterlies.slice(0, 24).map((q) => {
              const active = q.id === activeQuarterlyId;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    onSelectQuarterly(q.id);
                    onClose();
                  }}
                  className={`tactile-btn flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left ${
                    active
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-soft)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--ink-primary)]">
                      {q.title}
                    </p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {q.human_date || `${q.start_date} - ${q.end_date}`} · ID: {q.id}
                    </p>
                  </div>
                  {active && (
                    <span className="shrink-0 rounded-full bg-[var(--accent-primary)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--ink-on-accent)]">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
