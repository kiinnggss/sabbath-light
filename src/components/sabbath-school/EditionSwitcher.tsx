import type { SabbathSchoolEdition } from '../../hooks/usePreferences';

interface EditionSwitcherProps {
  edition: SabbathSchoolEdition;
  onChange: (edition: SabbathSchoolEdition) => void;
}

const EDITIONS: Array<{ id: SabbathSchoolEdition; label: string; sub: string }> = [
  { id: 'adult', label: 'Adult', sub: 'Standard + Teacher' },
  { id: 'inverse', label: 'Inverse', sub: 'Young Adult' },
  { id: 'cornerstone', label: 'Cornerstone', sub: 'Youth' },
];

export function EditionSwitcher({ edition, onChange }: EditionSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Sabbath School Edition"
      className="grid grid-cols-3 gap-1.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] p-1.5"
    >
      {EDITIONS.map(({ id, label, sub }) => {
        const active = edition === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`tactile-btn flex min-h-[46px] flex-col items-center justify-center rounded-xl px-2 py-1.5 text-center ${
              active
                ? 'bg-[var(--bg-surface)] text-[var(--accent-primary)] shadow-sm'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <span className="text-xs font-bold leading-tight sm:text-sm">{label}</span>
            <span className="mt-0.5 text-[10px] font-medium text-[var(--ink-muted)] leading-tight">
              {sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}
