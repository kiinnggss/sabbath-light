export type ThemeId =
  | 'daylight'
  | 'nightlight'
  | 'soul-velvet'
  | 'fitzgerald-print'
  | 'paw-pop'
  | 'cedar-grove'
  | 'aegean-linen'
  | 'terracotta-clay'
  | 'olive-vespers'
  | 'vesper-indigo'
  | 'plum-nocturne';

export type ThemeCategory = 'sanctuary' | 'curated' | 'color';

export interface ThemePreview {
  bg: string;
  sidebar: string;
  card: string;
  bar1: string;
  bar2: string;
  bar3: string;
  border: string;
}

export interface AppThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  category: ThemeCategory;
  isDark: boolean;
  metaThemeColor: string;
  preview: ThemePreview;
  tokens: Record<string, string>;
}

export const DEFAULT_THEME_ID: ThemeId = 'daylight';

export const ACCENT_SWATCHES = [
  '#B64F1B',
  '#285E43',
  '#1D568C',
  '#B31312',
  '#9E3B2E',
  '#7C3AED',
  '#D95877',
  '#C88A2E',
] as const;

export function normalizeHex(hex: string): string | null {
  if (typeof hex !== 'string') return null;
  const cleaned = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const expanded = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
    return `#${expanded.toUpperCase()}`;
  }
  return null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const norm = normalizeHex(hex) || '#000000';
  const raw = norm.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

export function hexToRgba(hex: string, alpha = 1): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getContrastTextColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#130603' : '#FFFFFF';
}

export function adjustHexBrightness(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const nr = clamp(factor < 1 ? r * factor : r + (255 - r) * (factor - 1));
  const ng = clamp(factor < 1 ? g * factor : g + (255 - g) * (factor - 1));
  const nb = clamp(factor < 1 ? b * factor : b + (255 - b) * (factor - 1));
  return `#${[nr, ng, nb].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function getReadableAccentText(hex: string, isDark: boolean): string {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  if (isDark) {
    return yiq < 130 ? adjustHexBrightness(hex, 1.45) : normalizeHex(hex) || hex;
  }
  return yiq > 145 ? adjustHexBrightness(hex, 0.58) : normalizeHex(hex) || hex;
}

export const THEMES: readonly AppThemeDefinition[] = [
  {
    id: 'daylight',
    name: 'Sabbath Daylight',
    tagline: 'Warm matte paper with burnt orange accents',
    category: 'sanctuary',
    isDark: false,
    metaThemeColor: '#F7F5F0',
    preview: {
      bg: '#F7F5F0',
      sidebar: '#EDE8DD',
      card: '#FFFFFF',
      bar1: '#B64F1B',
      bar2: '#E6A63F',
      bar3: '#130603',
      border: '#C9BC9A',
    },
    tokens: {
      '--bg-canvas': '#F7F5F0',
      '--bg-surface': '#FFFFFF',
      '--bg-recessed': '#EDE8DD',
      '--bg-sand': '#C9BC9A',
      '--bg-sand-soft': '#E8E0CC',
      '--border-subtle': '#DDD4C3',
      '--border-strong': '#C9BC9A',
      '--ink-primary': '#130603',
      '--ink-secondary': '#594539',
      '--ink-muted': '#725D50',
      '--ink-on-accent': '#FFFFFF',
      '--accent-primary': '#B64F1B',
      '--accent-primary-hover': '#9A4013',
      '--accent-primary-soft': 'rgba(182, 79, 27, 0.12)',
      '--accent-amber': '#E6A63F',
      '--accent-amber-soft': 'rgba(230, 166, 63, 0.18)',
      '--bezel-bg': '#1A110C',
      '--bezel-border': '#2F2119',
      '--bezel-dot-off': '#35261D',
      '--bezel-dot-on': '#F2AC3E',
      '--hl-amber': 'rgba(230, 166, 63, 0.28)',
      '--hl-terracotta': 'rgba(182, 79, 27, 0.20)',
      '--hl-sand': 'rgba(201, 188, 154, 0.42)',
      '--hl-olive': 'rgba(114, 130, 74, 0.22)',
      '--shadow-tactile': '0 2px 0 0 rgba(19, 6, 3, 0.10)',
      '--shadow-sheet': '0 -8px 28px rgba(19, 6, 3, 0.14)',
      '--nightlight-glow': 'none',
      '--dock-bg': 'rgba(255, 255, 255, 0.94)',
      '--dock-border': '#DDD4C3',
      '--dock-shadow': '0 10px 28px -8px rgba(19, 6, 3, 0.16), 0 2px 6px rgba(19, 6, 3, 0.06)',
      '--nav-pill-1-bg': 'rgba(182, 79, 27, 0.14)',
      '--nav-pill-1-ink': '#9A4013',
      '--nav-pill-2-bg': 'rgba(230, 166, 63, 0.24)',
      '--nav-pill-2-ink': '#7C4B05',
      '--nav-pill-3-bg': 'rgba(88, 122, 68, 0.16)',
      '--nav-pill-3-ink': '#38542E',
    },
  },
  {
    id: 'nightlight',
    name: 'Warm Nightlight',
    tagline: 'Deep espresso charcoal with soft amber glow',
    category: 'sanctuary',
    isDark: true,
    metaThemeColor: '#15100D',
    preview: {
      bg: '#15100D',
      sidebar: '#29201A',
      card: '#1F1814',
      bar1: '#D9652B',
      bar2: '#E6A63F',
      bar3: '#F5EFE6',
      border: '#4D3D30',
    },
    tokens: {
      '--bg-canvas': '#15100D',
      '--bg-surface': '#1F1814',
      '--bg-recessed': '#29201A',
      '--bg-sand': '#4A3B2E',
      '--bg-sand-soft': '#31261E',
      '--border-subtle': '#332820',
      '--border-strong': '#4D3D30',
      '--ink-primary': '#F5EFE6',
      '--ink-secondary': '#C4B3A2',
      '--ink-muted': '#9D8B7B',
      '--ink-on-accent': '#FFFFFF',
      '--accent-primary': '#D9652B',
      '--accent-primary-hover': '#E5753C',
      '--accent-primary-soft': 'rgba(217, 101, 43, 0.20)',
      '--accent-amber': '#E6A63F',
      '--accent-amber-soft': 'rgba(230, 166, 63, 0.18)',
      '--bezel-bg': '#110B08',
      '--bezel-border': '#3B2B21',
      '--bezel-dot-off': '#2C1F18',
      '--bezel-dot-on': '#F5B84E',
      '--hl-amber': 'rgba(230, 166, 63, 0.24)',
      '--hl-terracotta': 'rgba(217, 101, 43, 0.24)',
      '--hl-sand': 'rgba(157, 139, 123, 0.24)',
      '--hl-olive': 'rgba(132, 152, 88, 0.24)',
      '--shadow-tactile': '0 2px 0 0 rgba(0, 0, 0, 0.35)',
      '--shadow-sheet': '0 -10px 32px rgba(0, 0, 0, 0.55)',
      '--nightlight-glow': 'radial-gradient(ellipse 85% 45% at 50% 0%, rgba(230, 166, 63, 0.11), transparent 72%)',
      '--dock-bg': 'rgba(31, 24, 20, 0.94)',
      '--dock-border': '#4D3D30',
      '--dock-shadow': '0 14px 32px -6px rgba(0, 0, 0, 0.65)',
      '--nav-pill-1-bg': 'rgba(217, 101, 43, 0.24)',
      '--nav-pill-1-ink': '#F5A072',
      '--nav-pill-2-bg': 'rgba(230, 166, 63, 0.22)',
      '--nav-pill-2-ink': '#F5CA78',
      '--nav-pill-3-bg': 'rgba(132, 168, 104, 0.22)',
      '--nav-pill-3-ink': '#B4D696',
    },
  },
  {
    id: 'soul-velvet',
    name: 'Soul Velvet',
    tagline: 'Dusty blush-taupe editorial with ink contrast',
    category: 'curated',
    isDark: false,
    metaThemeColor: '#C8B1AF',
    preview: {
      bg: '#C8B1AF',
      sidebar: '#E6D5D3',
      card: '#F0E6E5',
      bar1: '#23252A',
      bar2: '#A63D33',
      bar3: '#6E6060',
      border: '#5E4F4E',
    },
    tokens: {
      '--bg-canvas': '#C8B1AF',
      '--bg-surface': '#F0E6E5',
      '--bg-recessed': '#DFCECC',
      '--bg-sand': '#D4BEBC',
      '--bg-sand-soft': '#E6D5D3',
      '--border-subtle': 'rgba(35, 37, 42, 0.18)',
      '--border-strong': 'rgba(35, 37, 42, 0.34)',
      '--ink-primary': '#23252A',
      '--ink-secondary': '#4B4344',
      '--ink-muted': '#6E6060',
      '--ink-on-accent': '#F7F0EF',
      '--accent-primary': '#23252A',
      '--accent-primary-hover': '#16181C',
      '--accent-primary-soft': 'rgba(35, 37, 42, 0.10)',
      '--accent-amber': '#D99E6A',
      '--accent-amber-soft': 'rgba(166, 61, 51, 0.14)',
      '--bezel-bg': '#23252A',
      '--bezel-border': '#463C3C',
      '--bezel-dot-off': '#3C3638',
      '--bezel-dot-on': '#F2B8A8',
      '--hl-amber': 'rgba(217, 158, 106, 0.34)',
      '--hl-terracotta': 'rgba(166, 61, 51, 0.22)',
      '--hl-sand': 'rgba(212, 190, 188, 0.55)',
      '--hl-olive': 'rgba(104, 120, 88, 0.22)',
      '--shadow-tactile': '0 4px 12px -4px rgba(35, 24, 24, 0.14)',
      '--shadow-sheet': '0 -10px 30px rgba(35, 24, 24, 0.20)',
      '--nightlight-glow': 'none',
      '--dock-bg': 'rgba(240, 230, 229, 0.94)',
      '--dock-border': 'rgba(35, 37, 42, 0.20)',
      '--dock-shadow': '0 14px 32px -8px rgba(35, 24, 24, 0.22), 0 0 0 3px rgba(247, 240, 239, 0.45)',
      '--nav-pill-1-bg': 'rgba(35, 37, 42, 0.12)',
      '--nav-pill-1-ink': '#181A1E',
      '--nav-pill-2-bg': 'rgba(166, 61, 51, 0.16)',
      '--nav-pill-2-ink': '#852D24',
      '--nav-pill-3-bg': 'rgba(92, 69, 86, 0.16)',
      '--nav-pill-3-ink': '#4A3142',
    },
  },
  {
    id: 'fitzgerald-print',
    name: 'Fitzgerald Print',
    tagline: 'Archival cream paper with crimson print borders',
    category: 'curated',
    isDark: false,
    metaThemeColor: '#EAE6DC',
    preview: {
      bg: '#EAE6DC',
      sidebar: '#F5F2EB',
      card: '#F5F2EB',
      bar1: '#B31312',
      bar2: '#141311',
      bar3: '#68645B',
      border: '#1C1B18',
    },
    tokens: {
      '--bg-canvas': '#EAE6DC',
      '--bg-surface': '#F5F2EB',
      '--bg-recessed': '#E2DDD0',
      '--bg-sand': '#CFC8B8',
      '--bg-sand-soft': '#EDE9DF',
      '--border-subtle': '#1C1B18',
      '--border-strong': '#141311',
      '--ink-primary': '#141311',
      '--ink-secondary': '#43403A',
      '--ink-muted': '#68645B',
      '--ink-on-accent': '#FAF8F3',
      '--accent-primary': '#B31312',
      '--accent-primary-hover': '#950E0D',
      '--accent-primary-soft': 'rgba(179, 19, 18, 0.11)',
      '--accent-amber': '#D99B38',
      '--accent-amber-soft': 'rgba(217, 155, 56, 0.22)',
      '--bezel-bg': '#141311',
      '--bezel-border': '#43403A',
      '--bezel-dot-off': '#2E2C27',
      '--bezel-dot-on': '#F2C063',
      '--hl-amber': 'rgba(217, 155, 56, 0.30)',
      '--hl-terracotta': 'rgba(179, 19, 18, 0.16)',
      '--hl-sand': 'rgba(207, 200, 184, 0.50)',
      '--hl-olive': 'rgba(98, 114, 72, 0.22)',
      '--shadow-tactile': '0 2px 0 0 #1C1B18',
      '--shadow-sheet': '0 -6px 0 #1C1B18, 0 -16px 32px rgba(20, 19, 17, 0.16)',
      '--nightlight-glow': 'none',
      '--dock-bg': '#EAE6DC',
      '--dock-border': '#1C1B18',
      '--dock-shadow': '0 4px 0 #1C1B18, 0 14px 28px rgba(20, 19, 17, 0.16)',
      '--nav-pill-1-bg': 'rgba(179, 19, 18, 0.13)',
      '--nav-pill-1-ink': '#950E0D',
      '--nav-pill-2-bg': 'rgba(20, 19, 17, 0.11)',
      '--nav-pill-2-ink': '#141311',
      '--nav-pill-3-bg': 'rgba(72, 92, 54, 0.15)',
      '--nav-pill-3-ink': '#2E3D20',
    },
  },
  {
    id: 'paw-pop',
    name: 'Paw Pop',
    tagline: 'Playful buttercream cards with bold ink strokes',
    category: 'curated',
    isDark: false,
    metaThemeColor: '#FDF1C9',
    preview: {
      bg: '#FDF1C9',
      sidebar: '#FFF9E8',
      card: '#E48E58',
      bar1: '#D95877',
      bar2: '#1B140E',
      bar3: '#FFF9E8',
      border: '#1B140E',
    },
    tokens: {
      '--bg-canvas': '#FDF1C9',
      '--bg-surface': '#FFF9E8',
      '--bg-recessed': '#F8E2A6',
      '--bg-sand': '#EFCF84',
      '--bg-sand-soft': '#FCEBB6',
      '--border-subtle': '#1B140E',
      '--border-strong': '#1B140E',
      '--ink-primary': '#1B140E',
      '--ink-secondary': '#4A3828',
      '--ink-muted': '#6E5641',
      '--ink-on-accent': '#1B140E',
      '--accent-primary': '#E48E58',
      '--accent-primary-hover': '#D87D45',
      '--accent-primary-soft': 'rgba(228, 142, 88, 0.26)',
      '--accent-amber': '#F0AC3E',
      '--accent-amber-soft': 'rgba(217, 88, 119, 0.18)',
      '--bezel-bg': '#1B140E',
      '--bezel-border': '#4A3828',
      '--bezel-dot-off': '#382A1E',
      '--bezel-dot-on': '#F8A96B',
      '--hl-amber': 'rgba(240, 172, 62, 0.36)',
      '--hl-terracotta': 'rgba(217, 88, 119, 0.24)',
      '--hl-sand': 'rgba(239, 207, 132, 0.55)',
      '--hl-olive': 'rgba(116, 140, 72, 0.24)',
      '--shadow-tactile': '3px 3px 0 0 #1B140E',
      '--shadow-sheet': '0 -4px 0 #1B140E, 0 -14px 32px rgba(27, 20, 14, 0.18)',
      '--nightlight-glow': 'none',
      '--dock-bg': '#FFF9E8',
      '--dock-border': '#1B140E',
      '--dock-shadow': '0 4px 0 #1B140E, 0 14px 28px rgba(27, 20, 14, 0.16)',
      '--nav-pill-1-bg': 'rgba(228, 142, 88, 0.34)',
      '--nav-pill-1-ink': '#7A320C',
      '--nav-pill-2-bg': 'rgba(217, 88, 119, 0.20)',
      '--nav-pill-2-ink': '#942240',
      '--nav-pill-3-bg': 'rgba(27, 20, 14, 0.12)',
      '--nav-pill-3-ink': '#1B140E',
    },
  },
  {
    id: 'cedar-grove',
    name: 'Cedar Grove',
    tagline: 'Soft sage parchment paired with deep cedar green',
    category: 'color',
    isDark: false,
    metaThemeColor: '#EEF1EA',
    preview: {
      bg: '#EEF1EA',
      sidebar: '#E1E7DC',
      card: '#F9FAF7',
      bar1: '#285E43',
      bar2: '#C88A2E',
      bar3: '#16231B',
      border: '#C2CEBE',
    },
    tokens: {
      '--bg-canvas': '#EEF1EA',
      '--bg-surface': '#F9FAF7',
      '--bg-recessed': '#E1E7DC',
      '--bg-sand': '#C6D2BF',
      '--bg-sand-soft': '#DCE4D6',
      '--border-subtle': '#CDD8C6',
      '--border-strong': '#AEBEA6',
      '--ink-primary': '#16231B',
      '--ink-secondary': '#3B4E42',
      '--ink-muted': '#576D5F',
      '--ink-on-accent': '#FFFFFF',
      '--accent-primary': '#285E43',
      '--accent-primary-hover': '#1F4B35',
      '--accent-primary-soft': 'rgba(40, 94, 67, 0.13)',
      '--accent-amber': '#D99C3B',
      '--accent-amber-soft': 'rgba(217, 156, 59, 0.20)',
      '--bezel-bg': '#122018',
      '--bezel-border': '#284132',
      '--bezel-dot-off': '#22362A',
      '--bezel-dot-on': '#A4DF9C',
      '--hl-amber': 'rgba(217, 156, 59, 0.28)',
      '--hl-terracotta': 'rgba(182, 92, 56, 0.20)',
      '--hl-sand': 'rgba(198, 210, 191, 0.45)',
      '--hl-olive': 'rgba(40, 94, 67, 0.20)',
      '--shadow-tactile': '0 2px 0 0 rgba(22, 35, 27, 0.10)',
      '--shadow-sheet': '0 -8px 28px rgba(22, 35, 27, 0.14)',
      '--nightlight-glow': 'none',
      '--dock-bg': 'rgba(249, 250, 247, 0.94)',
      '--dock-border': '#C8D4C2',
      '--dock-shadow': '0 10px 28px -8px rgba(22, 35, 27, 0.16)',
      '--nav-pill-1-bg': 'rgba(40, 94, 67, 0.14)',
      '--nav-pill-1-ink': '#1F4B35',
      '--nav-pill-2-bg': 'rgba(200, 138, 46, 0.20)',
      '--nav-pill-2-ink': '#7B4F0E',
      '--nav-pill-3-bg': 'rgba(36, 85, 102, 0.14)',
      '--nav-pill-3-ink': '#1F4A59',
    },
  },
  {
    id: 'aegean-linen',
    name: 'Aegean Linen',
    tagline: 'Breezy coastal linen with deep cobalt blue accents',
    category: 'color',
    isDark: false,
    metaThemeColor: '#EDF1F5',
    preview: {
      bg: '#EDF1F5',
      sidebar: '#DFE7F0',
      card: '#FAFCFE',
      bar1: '#1D568C',
      bar2: '#D48A2D',
      bar3: '#111E2D',
      border: '#C4D1E0',
    },
    tokens: {
      '--bg-canvas': '#EDF1F5',
      '--bg-surface': '#FAFCFE',
      '--bg-recessed': '#DFE7F0',
      '--bg-sand': '#C0CEE0',
      '--bg-sand-soft': '#D8E2EE',
      '--border-subtle': '#CAD6E4',
      '--border-strong': '#A8BAD0',
      '--ink-primary': '#111E2D',
      '--ink-secondary': '#384B61',
      '--ink-muted': '#54687E',
      '--ink-on-accent': '#FFFFFF',
      '--accent-primary': '#1D568C',
      '--accent-primary-hover': '#164470',
      '--accent-primary-soft': 'rgba(29, 86, 140, 0.13)',
      '--accent-amber': '#DF9A38',
      '--accent-amber-soft': 'rgba(223, 154, 56, 0.20)',
      '--bezel-bg': '#0E1A29',
      '--bezel-border': '#253952',
      '--bezel-dot-off': '#1F3047',
      '--bezel-dot-on': '#7DC4FF',
      '--hl-amber': 'rgba(223, 154, 56, 0.28)',
      '--hl-terracotta': 'rgba(182, 86, 62, 0.18)',
      '--hl-sand': 'rgba(192, 206, 224, 0.45)',
      '--hl-olive': 'rgba(42, 118, 108, 0.20)',
      '--shadow-tactile': '0 2px 0 0 rgba(17, 30, 45, 0.10)',
      '--shadow-sheet': '0 -8px 28px rgba(17, 30, 45, 0.14)',
      '--nightlight-glow': 'none',
      '--dock-bg': 'rgba(250, 252, 254, 0.94)',
      '--dock-border': '#C6D3E2',
      '--dock-shadow': '0 10px 28px -8px rgba(17, 30, 45, 0.16)',
      '--nav-pill-1-bg': 'rgba(29, 86, 140, 0.14)',
      '--nav-pill-1-ink': '#164470',
      '--nav-pill-2-bg': 'rgba(212, 138, 45, 0.20)',
      '--nav-pill-2-ink': '#7F4D0B',
      '--nav-pill-3-bg': 'rgba(28, 92, 86, 0.15)',
      '--nav-pill-3-ink': '#164C47',
    },
  },
  {
    id: 'terracotta-clay',
    name: 'Terracotta Clay',
    tagline: 'Warm sandstone surfaces with kiln terracotta ink',
    category: 'color',
    isDark: false,
    metaThemeColor: '#F2E7DF',
    preview: {
      bg: '#F2E7DF',
      sidebar: '#E7D5C8',
      card: '#FBF6F2',
      bar1: '#9E3B2E',
      bar2: '#C88A32',
      bar3: '#2B1615',
      border: '#D5BEB0',
    },
    tokens: {
      '--bg-canvas': '#F2E7DF',
      '--bg-surface': '#FBF6F2',
      '--bg-recessed': '#E7D5C8',
      '--bg-sand': '#D5BCAC',
      '--bg-sand-soft': '#ECDDD2',
      '--border-subtle': '#DCC7B8',
      '--border-strong': '#C5A996',
      '--ink-primary': '#2B1615',
      '--ink-secondary': '#5B3D3A',
      '--ink-muted': '#765754',
      '--ink-on-accent': '#FFFFFF',
      '--accent-primary': '#9E3B2E',
      '--accent-primary-hover': '#832F24',
      '--accent-primary-soft': 'rgba(158, 59, 46, 0.13)',
      '--accent-amber': '#D99938',
      '--accent-amber-soft': 'rgba(217, 153, 56, 0.20)',
      '--bezel-bg': '#241312',
      '--bezel-border': '#462926',
      '--bezel-dot-off': '#381F1D',
      '--bezel-dot-on': '#F5AD6B',
      '--hl-amber': 'rgba(217, 153, 56, 0.28)',
      '--hl-terracotta': 'rgba(158, 59, 46, 0.22)',
      '--hl-sand': 'rgba(213, 188, 172, 0.45)',
      '--hl-olive': 'rgba(98, 114, 72, 0.20)',
      '--shadow-tactile': '0 2px 0 0 rgba(43, 22, 21, 0.10)',
      '--shadow-sheet': '0 -8px 28px rgba(43, 22, 21, 0.15)',
      '--nightlight-glow': 'none',
      '--dock-bg': 'rgba(251, 246, 242, 0.94)',
      '--dock-border': '#D9C3B4',
      '--dock-shadow': '0 10px 28px -8px rgba(43, 22, 21, 0.16)',
      '--nav-pill-1-bg': 'rgba(158, 59, 46, 0.14)',
      '--nav-pill-1-ink': '#832F24',
      '--nav-pill-2-bg': 'rgba(200, 138, 50, 0.22)',
      '--nav-pill-2-ink': '#7A4D0D',
      '--nav-pill-3-bg': 'rgba(78, 102, 62, 0.16)',
      '--nav-pill-3-ink': '#364A2B',
    },
  },
  {
    id: 'olive-vespers',
    name: 'Olive Vespers',
    tagline: 'Quiet pine forest dark mode with emerald highlights',
    category: 'color',
    isDark: true,
    metaThemeColor: '#111915',
    preview: {
      bg: '#111915',
      sidebar: '#223129',
      card: '#1A251F',
      bar1: '#58B37C',
      bar2: '#DFAA4B',
      bar3: '#EEF4EE',
      border: '#354D3F',
    },
    tokens: {
      '--bg-canvas': '#111915',
      '--bg-surface': '#1A251F',
      '--bg-recessed': '#223129',
      '--bg-sand': '#32483C',
      '--bg-sand-soft': '#26372E',
      '--border-subtle': '#2B3E33',
      '--border-strong': '#3D5748',
      '--ink-primary': '#EEF4EE',
      '--ink-secondary': '#B6C9BC',
      '--ink-muted': '#8CA394',
      '--ink-on-accent': '#0E1A13',
      '--accent-primary': '#58B37C',
      '--accent-primary-hover': '#6BC38D',
      '--accent-primary-soft': 'rgba(88, 179, 124, 0.20)',
      '--accent-amber': '#DFAA4B',
      '--accent-amber-soft': 'rgba(223, 170, 75, 0.18)',
      '--bezel-bg': '#0C120F',
      '--bezel-border': '#283B30',
      '--bezel-dot-off': '#1E2D24',
      '--bezel-dot-on': '#7FE0A5',
      '--hl-amber': 'rgba(223, 170, 75, 0.24)',
      '--hl-terracotta': 'rgba(217, 118, 86, 0.22)',
      '--hl-sand': 'rgba(140, 163, 148, 0.24)',
      '--hl-olive': 'rgba(88, 179, 124, 0.22)',
      '--shadow-tactile': '0 2px 0 0 rgba(0, 0, 0, 0.35)',
      '--shadow-sheet': '0 -10px 32px rgba(0, 0, 0, 0.55)',
      '--nightlight-glow': 'radial-gradient(ellipse 85% 45% at 50% 0%, rgba(88, 179, 124, 0.11), transparent 72%)',
      '--dock-bg': 'rgba(26, 37, 31, 0.94)',
      '--dock-border': '#3D5748',
      '--dock-shadow': '0 14px 32px -6px rgba(0, 0, 0, 0.65)',
      '--nav-pill-1-bg': 'rgba(88, 179, 124, 0.22)',
      '--nav-pill-1-ink': '#7DE0A3',
      '--nav-pill-2-bg': 'rgba(223, 170, 75, 0.22)',
      '--nav-pill-2-ink': '#F0C56E',
      '--nav-pill-3-bg': 'rgba(116, 194, 201, 0.20)',
      '--nav-pill-3-ink': '#97DDE2',
    },
  },
  {
    id: 'vesper-indigo',
    name: 'Vesper Indigo',
    tagline: 'Evening twilight navy paired with warm candle gold',
    category: 'color',
    isDark: true,
    metaThemeColor: '#0F1422',
    preview: {
      bg: '#0F1422',
      sidebar: '#212B45',
      card: '#182035',
      bar1: '#E6A94A',
      bar2: '#7BA8F8',
      bar3: '#F1F4FA',
      border: '#34446B',
    },
    tokens: {
      '--bg-canvas': '#0F1422',
      '--bg-surface': '#182035',
      '--bg-recessed': '#212B45',
      '--bg-sand': '#324063',
      '--bg-sand-soft': '#242F4C',
      '--border-subtle': '#2B3859',
      '--border-strong': '#3D4F7A',
      '--ink-primary': '#F1F4FA',
      '--ink-secondary': '#BAC5DE',
      '--ink-muted': '#8E9CBE',
      '--ink-on-accent': '#141008',
      '--accent-primary': '#E6A94A',
      '--accent-primary-hover': '#F0B960',
      '--accent-primary-soft': 'rgba(230, 169, 74, 0.20)',
      '--accent-amber': '#E6A94A',
      '--accent-amber-soft': 'rgba(123, 168, 248, 0.18)',
      '--bezel-bg': '#0A0E19',
      '--bezel-border': '#293759',
      '--bezel-dot-off': '#1D2742',
      '--bezel-dot-on': '#F6C46A',
      '--hl-amber': 'rgba(230, 169, 74, 0.25)',
      '--hl-terracotta': 'rgba(224, 118, 96, 0.22)',
      '--hl-sand': 'rgba(142, 156, 190, 0.24)',
      '--hl-olive': 'rgba(116, 184, 146, 0.22)',
      '--shadow-tactile': '0 2px 0 0 rgba(0, 0, 0, 0.35)',
      '--shadow-sheet': '0 -10px 32px rgba(0, 0, 0, 0.58)',
      '--nightlight-glow': 'radial-gradient(ellipse 85% 45% at 50% 0%, rgba(230, 169, 74, 0.10), transparent 72%)',
      '--dock-bg': 'rgba(24, 32, 53, 0.94)',
      '--dock-border': '#3D4F7A',
      '--dock-shadow': '0 14px 32px -6px rgba(0, 0, 0, 0.65)',
      '--nav-pill-1-bg': 'rgba(230, 169, 74, 0.22)',
      '--nav-pill-1-ink': '#F5C670',
      '--nav-pill-2-bg': 'rgba(123, 168, 248, 0.22)',
      '--nav-pill-2-ink': '#A4C5FD',
      '--nav-pill-3-bg': 'rgba(182, 152, 245, 0.20)',
      '--nav-pill-3-ink': '#CFC0FA',
    },
  },
  {
    id: 'plum-nocturne',
    name: 'Plum Nocturne',
    tagline: 'Deep aubergine velvet with dusty rose and brass',
    category: 'color',
    isDark: true,
    metaThemeColor: '#181116',
    preview: {
      bg: '#181116',
      sidebar: '#30232C',
      card: '#241A21',
      bar1: '#D9788F',
      bar2: '#E2B05E',
      bar3: '#F6EEF2',
      border: '#4D3746',
    },
    tokens: {
      '--bg-canvas': '#181116',
      '--bg-surface': '#241A21',
      '--bg-recessed': '#30232C',
      '--bg-sand': '#4A3644',
      '--bg-sand-soft': '#372832',
      '--border-subtle': '#3B2B36',
      '--border-strong': '#543D4D',
      '--ink-primary': '#F6EEF2',
      '--ink-secondary': '#CEBCC6',
      '--ink-muted': '#A68E9C',
      '--ink-on-accent': '#1A0E12',
      '--accent-primary': '#D9788F',
      '--accent-primary-hover': '#E58CA1',
      '--accent-primary-soft': 'rgba(217, 120, 143, 0.22)',
      '--accent-amber': '#E2B05E',
      '--accent-amber-soft': 'rgba(226, 176, 94, 0.18)',
      '--bezel-bg': '#120C10',
      '--bezel-border': '#402D3A',
      '--bezel-dot-off': '#2E1F29',
      '--bezel-dot-on': '#F29AB0',
      '--hl-amber': 'rgba(226, 176, 94, 0.24)',
      '--hl-terracotta': 'rgba(217, 120, 143, 0.24)',
      '--hl-sand': 'rgba(166, 142, 156, 0.24)',
      '--hl-olive': 'rgba(132, 176, 142, 0.22)',
      '--shadow-tactile': '0 2px 0 0 rgba(0, 0, 0, 0.35)',
      '--shadow-sheet': '0 -10px 32px rgba(0, 0, 0, 0.58)',
      '--nightlight-glow': 'radial-gradient(ellipse 85% 45% at 50% 0%, rgba(217, 120, 143, 0.11), transparent 72%)',
      '--dock-bg': 'rgba(36, 26, 33, 0.94)',
      '--dock-border': '#543D4D',
      '--dock-shadow': '0 14px 32px -6px rgba(0, 0, 0, 0.65)',
      '--nav-pill-1-bg': 'rgba(217, 120, 143, 0.22)',
      '--nav-pill-1-ink': '#F09CB0',
      '--nav-pill-2-bg': 'rgba(226, 176, 94, 0.22)',
      '--nav-pill-2-ink': '#F0CA82',
      '--nav-pill-3-bg': 'rgba(136, 186, 152, 0.20)',
      '--nav-pill-3-ink': '#A7D8B6',
    },
  },
];

export function resolveThemeId(raw: unknown): ThemeId {
  if (raw === 'light') return 'daylight';
  if (raw === 'dark') return 'nightlight';
  if (typeof raw === 'string' && THEMES.some((t) => t.id === raw)) {
    return raw as ThemeId;
  }
  return DEFAULT_THEME_ID;
}

export function getThemeById(id: string): AppThemeDefinition {
  const resolved = resolveThemeId(id);
  return THEMES.find((t) => t.id === resolved) || THEMES[0];
}

export function applyThemeToDocument(themeId: ThemeId, customAccent = ''): void {
  if (typeof document === 'undefined') return;
  const theme = getThemeById(themeId);
  const root = document.documentElement;
  const tokens = { ...theme.tokens };

  const validAccent = normalizeHex(customAccent);
  if (validAccent) {
    const hoverHex = adjustHexBrightness(validAccent, theme.isDark ? 1.12 : 0.86);
    const readableInk = getReadableAccentText(validAccent, theme.isDark);
    tokens['--accent-primary'] = validAccent;
    tokens['--accent-primary-hover'] = hoverHex;
    tokens['--accent-primary-soft'] = hexToRgba(validAccent, theme.isDark ? 0.22 : 0.12);
    tokens['--ink-on-accent'] = getContrastTextColor(validAccent);
    tokens['--nav-pill-1-bg'] = hexToRgba(validAccent, theme.isDark ? 0.24 : 0.14);
    tokens['--nav-pill-1-ink'] = readableInk;
  }

  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }

  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-dark', theme.isDark ? 'true' : 'false');

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme.metaThemeColor);
  }
}
