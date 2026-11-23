import { ChalkboardTeacher, Sparkle } from '@phosphor-icons/react';
import type { SabbathSchoolEdition } from '../../hooks/usePreferences';
import type { SSDaySummary } from '../../lib/sabbathSchoolApi';

interface DaySwitcherProps {
  edition: SabbathSchoolEdition;
  days: SSDaySummary[];
  activeDayId: string;
  todayDayId: string | null;
  onSelectDay: (dayId: string) => void;
}

const WEEKDAY_SHORT = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function DaySwitcher({
  edition,
  days,
  activeDayId,
  todayDayId,
  onSelectDay,
}: DaySwitcherProps) {
  const regularDays = days.filter((d) => /^\d{2}$/.test(d.id));
  const extraDays = days.filter((d) => !/^\d{2}$/.test(d.id));

  return (
    <div className="space-y-2.5">
      {/* Sabbath - Friday 7-day strip */}
      {regularDays.length > 0 && (
        <div
          role="tablist"
          aria-label="Lesson days Sabbath through Friday"
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1"
        >
          {regularDays.map((day, idx) => {
            const active = day.id === activeDayId;
            const isToday = day.id === todayDayId;
            const label =
              edition === 'inverse'
                ? day.title
                : WEEKDAY_SHORT[idx] || day.title.slice(0, 3);
            const subLabel = edition === 'inverse' ? WEEKDAY_SHORT[idx] || '' : day.date.slice(0, 5);

            return (
              <button
                key={day.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectDay(day.id)}
                className={`tactile-btn flex min-h-[48px] min-w-[60px] flex-1 shrink-0 flex-col items-center justify-center rounded-xl border px-2.5 py-1.5 ${
                  active
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-[var(--shadow-tactile)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <span className="text-xs font-bold leading-tight">
                  {label}
                  {isToday ? ' *' : ''}
                </span>
                {subLabel && (
                  <span
                    className={`mt-0.5 text-[10px] font-medium leading-tight ${
                      active ? 'text-[var(--ink-on-accent)] opacity-85' : 'text-[var(--ink-muted)]'
                    }`}
                  >
                    {subLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Teacher's Notes / Inside Story / Study Outlines (Adult edition) */}
      {extraDays.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {extraDays.map((day) => {
            const active = day.id === activeDayId;
            const isTeacher = day.id === 'teacher-comments';
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => onSelectDay(day.id)}
                className={`tactile-btn inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold ${
                  active
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                {isTeacher ? (
                  <ChalkboardTeacher size={15} weight="duotone" />
                ) : (
                  <Sparkle size={14} weight="duotone" />
                )}
                <span>{isTeacher ? "Teacher's Notes" : day.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
