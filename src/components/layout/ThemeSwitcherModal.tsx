import { useEffect, useState } from 'react';
import {
  ArrowCounterClockwise,
  Check,
  MoonStars,
  Palette,
  Sun,
  X,
} from '@phosphor-icons/react';
import {
  ACCENT_SWATCHES,
  getContrastTextColor,
  getThemeById,
  normalizeHex,
  THEMES,
  type AppThemeDefinition,
  type ThemeCategory,
  type ThemeId,
} from '../../data/themes';

interface ThemeSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeId: ThemeId;
  customAccent: string;
  onSelectTheme: (themeId: ThemeId) => void;
  onSelectCustomAccent: (hex: string) => void;
}

type ThemeModeFilter = 'all' | 'light' | 'dark';

const CATEGORY_SECTIONS: Array<{ category: ThemeCategory; label: string }> = [
  { category: 'sanctuary', label: 'Sanctuary' },
  { category: 'curated', label: 'Curated Studio' },
  { category: 'color', label: 'Color Palettes' },
];

export function ThemeSwitcherModal({
  isOpen,
  onClose,
  themeId,
  customAccent,
  onSelectTheme,
  onSelectCustomAccent,
}: ThemeSwitcherModalProps) {
  const [filter, setFilter] = useState<ThemeModeFilter>('all');
  const activeTheme = getThemeById(themeId);
  const resolvedAccent = normalizeHex(customAccent) || activeTheme.tokens['--accent-primary'];
  const [hexInput, setHexInput] = useState(resolvedAccent);

  useEffect(() => {
    setHexInput(resolvedAccent);
  }, [resolvedAccent]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleHexChange = (raw: string) => {
    setHexInput(raw);
    const valid = normalizeHex(raw);
    if (valid) {
      onSelectCustomAccent(valid);
    }
  };

  const lightCount = THEMES.filter((t) => !t.isDark).length;
  const darkCount = THEMES.filter((t) => t.isDark).length;

  const filteredThemes = THEMES.filter((t) => {
    if (filter === 'light') return !t.isDark;
    if (filter === 'dark') return t.isDark;
    return true;
  });

  const renderThemeCard = (t: AppThemeDefinition) => {
    const selected = t.id === themeId;
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => onSelectTheme(t.id)}
        aria-pressed={selected}
        className={`tactile-btn group flex flex-col overflow-hidden rounded-2xl border text-left transition-all ${
          selected
            ? 'border-2 border-[var(--accent-primary)] bg-[var(--bg-recessed)] shadow-[var(--shadow-tactile)]'
            : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
        }`}
      >
        {/* Miniature schematic UI window */}
        <div
          className="relative flex h-16 w-full flex-col gap-1 p-1.5"
          style={{ backgroundColor: t.preview.bg }}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-0.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: t.preview.bar1 }}
              />
              <span
                className="h-1.5 w-1.5 rounded-full opacity-75"
                style={{ backgroundColor: t.preview.bar2 }}
              />
              <span
                className="h-1.5 w-1.5 rounded-full opacity-45"
                style={{ backgroundColor: t.preview.bar3 }}
              />
            </div>
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full text-[9px]"
              style={{
                backgroundColor: t.preview.card,
                color: t.preview.bar3,
                border: `1px solid ${t.preview.border}`,
              }}
              aria-hidden="true"
            >
              {t.isDark ? <MoonStars size={9} weight="fill" /> : <Sun size={9} weight="fill" />}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 gap-1">
            <div
              className="flex w-4 flex-col gap-0.5 rounded p-0.5"
              style={{
                backgroundColor: t.preview.sidebar,
                border: `1px solid ${t.preview.border}`,
              }}
            >
              <div
                className="h-1 w-full rounded-full"
                style={{ backgroundColor: t.preview.bar1 }}
              />
              <div
                className="h-0.5 w-3/4 rounded-full opacity-55"
                style={{ backgroundColor: t.preview.bar3 }}
              />
            </div>

            <div
              className="flex flex-1 flex-col justify-between rounded p-1"
              style={{
                backgroundColor: t.preview.card,
                border: `1px solid ${t.preview.border}`,
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <div
                  className="h-1.5 w-7 rounded-full"
                  style={{ backgroundColor: t.preview.bar3 }}
                />
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: t.preview.bar1 }}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <div
                  className="h-1 w-full rounded-full opacity-80"
                  style={{ backgroundColor: t.preview.bar2 }}
                />
                <div
                  className="h-1 w-2/3 rounded-full opacity-40"
                  style={{ backgroundColor: t.preview.bar3 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer metadata */}
        <div className="flex items-center justify-between gap-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold leading-tight text-[var(--ink-primary)]">
              {t.name}
            </p>
            <p className="mt-0.5 truncate text-[10px] leading-tight text-[var(--ink-muted)]">
              {t.isDark ? 'Dark palette' : 'Light palette'}
            </p>
          </div>
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
              selected
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--ink-on-accent)]'
                : 'border-[var(--border-strong)] bg-transparent'
            }`}
          >
            {selected && <Check size={11} weight="bold" />}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-switcher-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sheet-enter flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-sheet)] sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]">
              <Palette size={20} weight="duotone" />
            </span>
            <div className="min-w-0">
              <h2
                id="theme-switcher-title"
                className="font-display truncate text-base font-bold text-[var(--ink-primary)]"
              >
                Themes &amp; colors
              </h2>
              <p className="truncate text-xs text-[var(--ink-muted)]">
                Active: {activeTheme.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close theme switcher"
            className="tactile-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Mode Filter Strip */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-5 py-2.5">
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'all', label: `All (${THEMES.length})`, Icon: Palette },
                { id: 'light', label: `Light (${lightCount})`, Icon: Sun },
                { id: 'dark', label: `Dark (${darkCount})`, Icon: MoonStars },
              ] as const
            ).map(({ id, label, Icon }) => {
              const active = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`tactile-btn inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${
                    active
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--ink-on-accent)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <Icon size={14} weight={active ? 'fill' : 'regular'} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Theme Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {filter === 'all' ? (
            CATEGORY_SECTIONS.map(({ category, label }) => {
              const items = filteredThemes.filter((t) => t.category === category);
              if (items.length === 0) return null;
              return (
                <section key={category}>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                      {label}
                    </h3>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] font-semibold text-[var(--ink-muted)]">
                      {items.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {items.map(renderThemeCard)}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {filteredThemes.map(renderThemeCard)}
            </div>
          )}

          {/* Custom Primary Accent Section */}
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-[var(--ink-primary)]">
                  Accent color override
                </h3>
                <p className="text-[11px] text-[var(--ink-muted)]">
                  Fine-tune buttons and active controls
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5">
                  <input
                    type="color"
                    value={resolvedAccent}
                    onChange={(e) => handleHexChange(e.target.value)}
                    aria-label="Pick custom accent color"
                    className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => handleHexChange(e.target.value)}
                    maxLength={7}
                    aria-label="Custom accent hex color"
                    className="w-16 bg-transparent font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase text-[var(--ink-primary)] focus:outline-none"
                  />
                </label>

                {customAccent && (
                  <button
                    type="button"
                    onClick={() => onSelectCustomAccent('')}
                    aria-label="Reset custom accent color"
                    title="Reset accent to theme default"
                    className="tactile-btn flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                  >
                    <ArrowCounterClockwise size={14} weight="bold" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {ACCENT_SWATCHES.map((hex) => {
                const isSelected = resolvedAccent === hex;
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => handleHexChange(hex)}
                    aria-label={`Use accent swatch ${hex}`}
                    aria-pressed={isSelected}
                    className={`tactile-btn flex h-7 w-7 items-center justify-center rounded-full border transition-transform hover:scale-110 ${
                      isSelected
                        ? 'scale-110 border-2 border-[var(--ink-primary)] ring-2 ring-[var(--bg-surface)]'
                        : 'border-black/20'
                    }`}
                    style={{ backgroundColor: hex }}
                  >
                    {isSelected && (
                      <span
                        className="h-2 w-2 rounded-full shadow-sm"
                        style={{ backgroundColor: getContrastTextColor(hex) }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-3">
          <p className="truncate text-xs text-[var(--ink-muted)]">
            {activeTheme.tagline}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="tactile-btn shrink-0 rounded-xl bg-[var(--accent-primary)] px-5 py-2.5 text-xs font-bold text-[var(--ink-on-accent)] shadow-[var(--shadow-tactile)] hover:bg-[var(--accent-primary-hover)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
