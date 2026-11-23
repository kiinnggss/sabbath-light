export type FontPresetId =
  | 'sanctuary'
  | 'fast-and-loose'
  | 'big-n-juicy'
  | 'lsdx-studio'
  | 'archival-print'
  | 'mono-study';

export interface FontPresetDefinition {
  id: FontPresetId;
  name: string;
  tag: string;
  display: string;
  ui: string;
  reading: string;
  previewLine: string;
}

export const DEFAULT_FONT_PRESET: FontPresetId = 'sanctuary';

export const FONT_PRESETS: readonly FontPresetDefinition[] = [
  {
    id: 'sanctuary',
    name: 'Sanctuary',
    tag: 'Editorial serif',
    display: "'Literata', Georgia, Cambria, serif",
    ui: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    reading: "'Literata', Georgia, Cambria, 'Times New Roman', serif",
    previewLine: 'Praise to the Lord',
  },
  {
    id: 'fast-and-loose',
    name: 'Fast & Loose',
    tag: 'Hand-painted',
    display: "'Caveat Brush', 'Shantell Sans', cursive",
    ui: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    reading: "'Lora', Georgia, Cambria, serif",
    previewLine: 'Praise to the Lord',
  },
  {
    id: 'big-n-juicy',
    name: 'Big & Playful',
    tag: 'Hand-drawn',
    display: "'DynaPuff', 'Shantell Sans', cursive",
    ui: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    reading: "'Shantell Sans', 'DM Sans', sans-serif",
    previewLine: 'Praise to the Lord',
  },
  {
    id: 'lsdx-studio',
    name: 'LSDx Studio',
    tag: 'Studio display',
    display: "'Syne', 'Space Grotesk', sans-serif",
    ui: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
    reading: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    previewLine: 'Praise to the Lord',
  },
  {
    id: 'archival-print',
    name: 'Archival Print',
    tag: 'Classic print',
    display: "'Playfair Display', Georgia, serif",
    ui: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    reading: "'Lora', Georgia, Cambria, serif",
    previewLine: 'Praise to the Lord',
  },
  {
    id: 'mono-study',
    name: 'Mono Study',
    tag: 'Study notes',
    display: "'Space Grotesk', sans-serif",
    ui: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    reading: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    previewLine: 'Praise to the Lord',
  },
];

export function resolveFontPresetId(raw: unknown): FontPresetId {
  if (typeof raw === 'string' && FONT_PRESETS.some((p) => p.id === raw)) {
    return raw as FontPresetId;
  }
  return DEFAULT_FONT_PRESET;
}

export function getFontPresetById(id: string): FontPresetDefinition {
  const resolved = resolveFontPresetId(id);
  return FONT_PRESETS.find((p) => p.id === resolved) || FONT_PRESETS[0];
}

export function applyFontPresetToDocument(fontPreset: FontPresetId): void {
  if (typeof document === 'undefined') return;
  const preset = getFontPresetById(fontPreset);
  const root = document.documentElement;
  root.setAttribute('data-font', preset.id);
  root.style.setProperty('--font-display', preset.display);
  root.style.setProperty('--font-ui', preset.ui);
  root.style.setProperty('--font-reading', preset.reading);
}
