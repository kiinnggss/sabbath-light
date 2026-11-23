import { useState } from 'react';
import { Palette, TextAa } from '@phosphor-icons/react';
import type { FontPresetId } from '../../data/fonts';
import { getThemeById, normalizeHex, type ThemeId } from '../../data/themes';
import { ThemeSwitcherModal } from './ThemeSwitcherModal';
import { TypographyMenu } from './TypographyMenu';

interface TopBarProps {
  themeId: ThemeId;
  customAccent: string;
  onSelectTheme: (themeId: ThemeId) => void;
  onSelectCustomAccent: (hex: string) => void;
  readingScale: number;
  fontPreset: FontPresetId;
  onStepFont: (direction: -1 | 1) => void;
  onSetScale: (scale: number) => void;
  onResetScale: () => void;
  onSelectFontPreset: (preset: FontPresetId) => void;
  canDecreaseFont: boolean;
  canIncreaseFont: boolean;
}

export function TopBar({
  themeId,
  customAccent,
  onSelectTheme,
  onSelectCustomAccent,
  readingScale,
  fontPreset,
  onStepFont,
  onSetScale,
  onResetScale,
  onSelectFontPreset,
  canDecreaseFont,
  canIncreaseFont,
}: TopBarProps) {
  const [openPanel, setOpenPanel] = useState<'none' | 'typography' | 'theme'>('none');
  const activeTheme = getThemeById(themeId);
  const accentHex = normalizeHex(customAccent) || activeTheme.tokens['--accent-primary'];
  const scalePct = Math.round(readingScale * 100);
  const isDefaultScale = scalePct === 100;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4">
          {/* Brand mark inspired by Sing the Story + Yoto warm accent */}
          <div className="flex min-w-0 items-center gap-2.5">
            <svg
              viewBox="0 0 40 40"
              className="h-9 w-9 shrink-0"
              aria-hidden="true"
              fill="none"
            >
              <rect width="40" height="40" rx="10" fill="var(--bezel-bg)" />
              <path
                d="M11 19C11 14.03 15.03 10 20 10C24.97 10 29 14.03 29 19"
                stroke="var(--accent-amber)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M14.5 19C14.5 15.96 16.96 13.5 20 13.5C23.04 13.5 25.5 15.96 25.5 19"
                stroke="var(--accent-primary)"
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
              <h1 className="font-display truncate text-base font-bold leading-tight tracking-tight text-[var(--ink-primary)]">
                Sabbath Light
              </h1>
              <p className="truncate text-[11px] font-medium leading-tight text-[var(--ink-muted)]">
                SDA Worship &amp; Study
              </p>
            </div>
          </div>

          {/* Separate Typography (size + font hidden together) and Theme Switcher */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setOpenPanel((curr) => (curr === 'typography' ? 'none' : 'typography'))
              }
              aria-label="Open reading size and font menu"
              aria-expanded={openPanel === 'typography'}
              title="Text size and fonts"
              className={`tactile-btn inline-flex h-10 min-w-[44px] items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold shadow-[var(--shadow-tactile)] ${
                openPanel === 'typography'
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--ink-on-accent)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-recessed)]'
              }`}
            >
              <TextAa size={18} weight="bold" />
              {!isDefaultScale && (
                <span className="font-[family-name:var(--font-mono)] text-[10px] tabular-nums">
                  {scalePct}%
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setOpenPanel((curr) => (curr === 'theme' ? 'none' : 'theme'))}
              aria-label={`Open theme switcher (active theme: ${activeTheme.name})`}
              aria-expanded={openPanel === 'theme'}
              title="Themes and colors"
              className={`tactile-btn inline-flex h-10 items-center gap-2 rounded-xl border px-2.5 sm:px-3 text-xs font-bold shadow-[var(--shadow-tactile)] ${
                openPanel === 'theme'
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--ink-on-accent)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-recessed)]'
              }`}
            >
              <span className="relative flex items-center" aria-hidden="true">
                <span
                  className="h-3.5 w-3.5 rounded-full border border-[var(--border-strong)]"
                  style={{ backgroundColor: activeTheme.preview.bg }}
                />
                <span
                  className="-ml-1.5 h-3.5 w-3.5 rounded-full border border-[var(--bg-surface)] ring-1 ring-[var(--border-strong)]"
                  style={{ backgroundColor: accentHex }}
                />
              </span>
              <span className="hidden max-w-[104px] truncate sm:inline">
                {activeTheme.name}
              </span>
              <Palette size={16} weight="duotone" className="sm:hidden" />
            </button>
          </div>
        </div>
      </header>

      <TypographyMenu
        isOpen={openPanel === 'typography'}
        onClose={() => setOpenPanel('none')}
        readingScale={readingScale}
        onStepFont={onStepFont}
        onSetScale={onSetScale}
        onResetScale={onResetScale}
        canDecreaseFont={canDecreaseFont}
        canIncreaseFont={canIncreaseFont}
        fontPreset={fontPreset}
        onSelectFontPreset={onSelectFontPreset}
      />

      <ThemeSwitcherModal
        isOpen={openPanel === 'theme'}
        onClose={() => setOpenPanel('none')}
        themeId={themeId}
        customAccent={customAccent}
        onSelectTheme={onSelectTheme}
        onSelectCustomAccent={onSelectCustomAccent}
      />
    </>
  );
}
