import { useEffect } from 'react';
import { ArrowCounterClockwise, Check, TextAa, X } from '@phosphor-icons/react';
import { FONT_PRESETS, type FontPresetId } from '../../data/fonts';
import { READING_SCALE_STEPS } from '../../hooks/usePreferences';

interface TypographyMenuProps {
  isOpen: boolean;
  onClose: () => void;
  readingScale: number;
  onStepFont: (direction: -1 | 1) => void;
  onSetScale: (scale: number) => void;
  onResetScale: () => void;
  canDecreaseFont: boolean;
  canIncreaseFont: boolean;
  fontPreset: FontPresetId;
  onSelectFontPreset: (preset: FontPresetId) => void;
}

export function TypographyMenu({
  isOpen,
  onClose,
  readingScale,
  onStepFont,
  onSetScale,
  onResetScale,
  canDecreaseFont,
  canIncreaseFont,
  fontPreset,
  onSelectFontPreset,
}: TypographyMenuProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const scalePct = Math.round(readingScale * 100);
  const isDefaultScale = Math.abs(readingScale - 1.0) < 0.01;

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      {/* Click-outside backdrop */}
      <button
        type="button"
        aria-label="Close typography settings"
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-black/25 backdrop-blur-[1px]"
      />

      {/* Popover Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="typography-menu-title"
        className="popover-enter fixed right-3 top-[60px] z-50 w-[min(calc(100vw-1.5rem),23.5rem)] max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sheet)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]">
              <TextAa size={19} weight="bold" />
            </span>
            <div className="min-w-0">
              <h2
                id="typography-menu-title"
                className="font-display truncate text-sm font-bold text-[var(--ink-primary)]"
              >
                Reading typography
              </h2>
              <p className="truncate text-[11px] text-[var(--ink-muted)]">
                Text size and font across all tabs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close typography menu"
            className="tactile-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Live specimen preview */}
        <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-3.5 py-2.5">
          <p className="font-display text-sm font-bold text-[var(--ink-primary)]">
            Psalm 46:10
          </p>
          <p className="reading-prose mt-0.5 text-[var(--ink-secondary)]">
            Be still, and know that I am God.
          </p>
        </div>

        {/* Text Size Section */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
              Text size
            </span>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-mono)] text-xs font-bold tabular-nums text-[var(--ink-primary)]">
                {scalePct}%
              </span>
              {!isDefaultScale && (
                <button
                  type="button"
                  onClick={onResetScale}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary-soft)]"
                >
                  <ArrowCounterClockwise size={11} weight="bold" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStepFont(-1)}
              disabled={!canDecreaseFont}
              aria-label="Decrease reading font size"
              className="tactile-btn flex h-11 min-w-[52px] items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-sm font-bold text-[var(--ink-primary)] shadow-[var(--shadow-tactile)] hover:bg-[var(--bg-recessed)] disabled:opacity-35"
            >
              A-
            </button>

            <div className="grid flex-1 grid-cols-6 gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-1">
              {READING_SCALE_STEPS.map((step) => {
                const active = Math.abs(step - readingScale) < 0.01;
                const pct = Math.round(step * 100);
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => onSetScale(step)}
                    aria-label={`Set text size to ${pct}%`}
                    aria-pressed={active}
                    className={`tactile-btn flex h-9 items-center justify-center rounded-lg font-[family-name:var(--font-mono)] text-[10px] font-bold transition-colors ${
                      active
                        ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-sm'
                        : 'text-[var(--ink-muted)] hover:bg-[var(--bg-recessed)] hover:text-[var(--ink-primary)]'
                    }`}
                  >
                    {pct}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onStepFont(1)}
              disabled={!canIncreaseFont}
              aria-label="Increase reading font size"
              className="tactile-btn flex h-11 min-w-[52px] items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-base font-bold text-[var(--ink-primary)] shadow-[var(--shadow-tactile)] hover:bg-[var(--bg-recessed)] disabled:opacity-35"
            >
              A+
            </button>
          </div>
        </div>

        {/* Font Style Presets */}
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
              Typeface style
            </span>
            <span className="text-[11px] font-medium text-[var(--ink-muted)]">
              {FONT_PRESETS.length} fonts
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {FONT_PRESETS.map((preset) => {
              const selected = preset.id === fontPreset;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectFontPreset(preset.id)}
                  aria-pressed={selected}
                  className={`tactile-btn relative flex min-h-[72px] flex-col justify-between rounded-xl border p-2.5 text-left transition-colors ${
                    selected
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-soft)] shadow-[var(--shadow-tactile)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-recessed)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span
                      className="text-base font-bold leading-tight text-[var(--ink-primary)]"
                      style={{ fontFamily: preset.display }}
                    >
                      {preset.name}
                    </span>
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--ink-on-accent)]'
                          : 'border-[var(--border-strong)] bg-transparent'
                      }`}
                    >
                      {selected && <Check size={10} weight="bold" />}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <span
                      className="truncate text-[11px] text-[var(--ink-secondary)]"
                      style={{ fontFamily: preset.reading }}
                    >
                      {preset.previewLine}
                    </span>
                  </div>

                  <span className="mt-1 inline-block text-[10px] font-semibold text-[var(--ink-muted)]">
                    {preset.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
