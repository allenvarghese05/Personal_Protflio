/**
 * "Signal Amber" — the ONE palette for Mission Allen.
 *
 * Mirrors the CSS custom properties in globals.css (:root). CSS/Tailwind reads
 * the vars; anything that can't (inline SVG attributes, d3, canvas textures,
 * three.js materials) imports these values instead. Change a colour in BOTH
 * places — nothing else in the codebase should hardcode a hex.
 *
 * Contrast (WCAG) on every surface: ink ≥14:1, inkMuted ≥7.7:1,
 * inkSubtle ≥4.5:1. inkFaint is decorative only (rules, placeholders) —
 * never use it for text someone has to read.
 */
export const PALETTE = {
  // Surfaces — near-black with a cool cast, stepped for elevation
  void: '#07080c',
  surface: '#0d0f15',
  surface2: '#141821',
  raised: '#1b202b',
  line: '#232834',
  lineHi: '#313848',

  // Ink — warm off-white ramp
  ink: '#f3eee4',
  inkMuted: '#b8b2a6',
  inkSubtle: '#8c877f',
  inkFaint: '#5e5a55',

  // The single brand accent + its tints
  accent: '#ff9a3c',
  accentHi: '#ffc27a',
  accentLo: '#c9702a',

  // Supporting hues — data, categories, links. Used sparingly.
  ice: '#9cc3ff',
  jade: '#5fd0b0',
  sand: '#e6c9a0',
  lilac: '#b9a6f5',
  slate: '#8c95a8',

  // Status
  live: '#3ddc97',
  alert: '#ff6b5c',
};

/**
 * The light theme's values for the same keys — what html[data-theme="light"]
 * sets in globals.css. Read it through usePalette() (src/lib/useTheme.js) so
 * canvases and 3D scenes follow the toggle. Contrast on white: ink 16.8:1,
 * muted 10:1, subtle 5.5:1, accent 5.3:1.
 */
export const PALETTE_LIGHT = {
  void: '#ffffff',
  surface: '#f5f5f7',
  surface2: '#f0f0f3',
  raised: '#e8e8ed',
  line: '#e5e5ea',
  lineHi: '#d2d2d7',

  ink: '#1d1d1f',
  inkMuted: '#424245',
  inkSubtle: '#68686d',
  inkFaint: '#a1a1a6',

  accent: '#a85410',
  accentHi: '#c2620f',
  accentLo: '#8a440c',

  ice: '#2f62b8',
  jade: '#12705a',
  sand: '#7d5d33',
  lilac: '#6a55c2',
  slate: '#56607a',

  live: '#16804f',
  alert: '#c0392b',
};

/** Hex + alpha → rgba() string, for glows and translucent fills. */
export function alpha(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Project `kind` → accent. The amber cards are the signature build and the award. */
export const KIND_ACCENT = {
  signature: PALETTE.accent,
  award: PALETTE.accent,
  current: PALETTE.ice,
  project: PALETTE.sand,
  classified: PALETTE.slate,
};

/** Architecture-graph categories → a hue from the palette. */
export const CATEGORY_COLOR = {
  core: PALETTE.accent,
  auth: PALETTE.jade,
  data: PALETTE.ice,
  realtime: PALETTE.lilac,
  storage: PALETTE.slate,
  location: PALETTE.sand,
  workflow: PALETTE.accentLo,
  ai: PALETTE.lilac,
  ui: PALETTE.ice,
  audio: PALETTE.accent,
  infrastructure: PALETTE.slate,
};
