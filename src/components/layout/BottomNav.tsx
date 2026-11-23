import { BookBookmark, BookOpenText, MusicNotes } from '@phosphor-icons/react';
import type { ActiveTab } from '../../hooks/usePreferences';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  Icon: typeof MusicNotes;
  pillBgVar: string;
  pillInkVar: string;
}> = [
  {
    id: 'hymnal',
    label: 'Hymnal',
    Icon: MusicNotes,
    pillBgVar: 'var(--nav-pill-1-bg)',
    pillInkVar: 'var(--nav-pill-1-ink)',
  },
  {
    id: 'sabbath-school',
    label: 'Sabbath School',
    Icon: BookOpenText,
    pillBgVar: 'var(--nav-pill-2-bg)',
    pillInkVar: 'var(--nav-pill-2-ink)',
  },
  {
    id: 'bible',
    label: 'Bible',
    Icon: BookBookmark,
    pillBgVar: 'var(--nav-pill-3-bg)',
    pillInkVar: 'var(--nav-pill-3-ink)',
  },
];

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 px-4 pb-[calc(0.65rem+env(safe-area-inset-bottom))]"
    >
      <div className="google-bottom-bar pointer-events-auto mx-auto flex h-[60px] w-full max-w-md items-center justify-between gap-1.5 rounded-full border border-[var(--dock-border)] bg-[var(--dock-bg)] px-2.5 py-2 shadow-[var(--dock-shadow)] backdrop-blur-md">
        {NAV_ITEMS.map(({ id, label, Icon, pillBgVar, pillInkVar }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              style={
                isActive
                  ? { backgroundColor: pillBgVar, color: pillInkVar }
                  : undefined
              }
              className={`google-bottom-bar-item tactile-btn flex h-11 min-w-[48px] items-center justify-center rounded-full transition-all duration-200 ${
                isActive
                  ? 'px-4 shadow-xs'
                  : 'px-3.5 text-[var(--ink-secondary)] hover:bg-[var(--bg-recessed)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <Icon size={22} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
              <span
                className={`nav-pill-label overflow-hidden whitespace-nowrap text-[13px] font-bold tracking-tight ${
                  isActive ? 'ml-2 max-w-[148px] opacity-100' : 'ml-0 max-w-0 opacity-0'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
