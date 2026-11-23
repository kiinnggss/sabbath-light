import { MoonStars, Sun } from '@phosphor-icons/react';
import type { AppTheme } from '../../hooks/usePreferences';

interface TopBarProps {
  theme: AppTheme;
  onToggleTheme: () => void;
  readingScale: number;
  onStepFont: (direction: -1 | 1) => void;
  canDecreaseFont: boolean;
  canIncreaseFont: boolean;
}

export function TopBar({
  theme,
  onToggleTheme,
  readingScale,
  onStepFont,
  canDecreaseFont,
  canIncreaseFont,
}: TopBarProps) {
  const scalePct = Math.round(readingScale * 100);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4">
        {/* Brand mark inspired by Sing the Story + Yoto warm accent */}
        <div className="flex items-center gap-2.5 min-w-0">
          <svg
            viewBox="0 0 40 40"
            className="h-9 w-9 shrink-0"
            aria-hidden="true"
            fill="none"
          >
            <rect width="40" height="40" rx="10" fill="#1A110C" />
            <path
              d="M11 19C11 14.03 15.03 10 20 10C24.97 10 29 14.03 29 19"
              stroke="#E6A63F"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M14.5 19C14.5 15.96 16.96 13.5 20 13.5C23.04 13.5 25.5 15.96 25.5 19"
              stroke="#B64F1B"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M8.5 21.5C12 20 16.2 20.4 20 22.8C23.8 20.4 28 20 31.5 21.5V30.5C28 29 23.8 29.4 20 31.8C16.2 29.4 12 29 8.5 30.5V21.5Z"
              fill="#F7F5F0"
            />
            <path d="M20 22.8V31.8" stroke="#C9BC9A" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-[var(--ink-primary)] leading-tight">
              Sabbath Light
            </h1>
            <p className="truncate text-[11px] font-medium text-[var(--ink-muted)] leading-tight">
              SDA Worship &amp; Study
            </p>
          </div>
        </div>

        {/* Global Typography A- / A+ and Nightlight Toggle */}
        <div className="flex shrink-0 items-center gap-2">
          <div
            role="group"
            aria-label={`Reading text size ${scalePct}%`}
            className="inline-flex h-10 items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 shadow-[var(--shadow-tactile)]"
          >
            <button
              type="button"
              onClick={() => onStepFont(-1)}
              disabled={!canDecreaseFont}
              aria-label="Decrease reading font size"
              title="Decrease reading text size"
              className="tactile-btn flex h-9 min-w-[38px] items-center justify-center rounded-lg px-2 text-xs font-bold text-[var(--ink-primary)] hover:bg-[var(--bg-recessed)] disabled:opacity-35"
            >
              A-
            </button>
            <span className="px-1 font-[family-name:var(--font-mono)] text-[10px] font-semibold tabular-nums text-[var(--ink-muted)] hidden sm:inline">
              {scalePct}%
            </span>
            <button
              type="button"
              onClick={() => onStepFont(1)}
              disabled={!canIncreaseFont}
              aria-label="Increase reading font size"
              title="Increase reading text size"
              className="tactile-btn flex h-9 min-w-[38px] items-center justify-center rounded-lg px-2 text-sm font-bold text-[var(--ink-primary)] hover:bg-[var(--bg-recessed)] disabled:opacity-35"
            >
              A+
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light reading mode' : 'Switch to Nightlight dark mode'}
            title={theme === 'dark' ? 'Daylight mode' : 'Warm Nightlight mode'}
            className={`tactile-btn flex h-10 w-10 items-center justify-center rounded-xl border shadow-[var(--shadow-tactile)] ${
              theme === 'dark'
                ? 'border-[var(--accent-amber)]/50 bg-[var(--bezel-bg)] text-[var(--accent-amber)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-recessed)]'
            }`}
          >
            {theme === 'dark' ? (
              <Sun size={20} weight="duotone" />
            ) : (
              <MoonStars size={20} weight="duotone" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
