import { BookBookmark, BookOpenText, MusicNotes } from '@phosphor-icons/react';
import type { ActiveTab } from '../../hooks/usePreferences';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  sublabel: string;
  Icon: typeof MusicNotes;
}> = [
  { id: 'hymnal', label: 'Hymnal', sublabel: '1-920', Icon: MusicNotes },
  { id: 'sabbath-school', label: 'Sabbath School', sublabel: 'Quarterly', Icon: BookOpenText },
  { id: 'bible', label: 'Bible', sublabel: 'Multi-Version', Icon: BookBookmark },
];

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid h-16 max-w-3xl grid-cols-3 gap-1 px-2 py-1.5">
        {NAV_ITEMS.map(({ id, label, sublabel, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`tactile-btn flex min-h-[48px] flex-col items-center justify-center rounded-xl px-2 transition-colors ${
                isActive
                  ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]'
                  : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-recessed)]'
              }`}
            >
              <Icon size={21} weight={isActive ? 'fill' : 'regular'} />
              <span className="mt-0.5 text-[11px] font-bold leading-none tracking-tight">
                {label}
              </span>
              <span className="mt-0.5 hidden text-[9px] font-medium text-[var(--ink-muted)] sm:block">
                {sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
