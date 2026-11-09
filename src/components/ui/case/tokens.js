/**
 * Colours for the case studies, as CSS variables, so a case study follows the
 * site's theme, in the game and on /projects/<id> alike. In dark mode the
 * variables hold the Signal Amber values (:root in globals.css); in light mode
 * html[data-theme="light"] swaps the same names for the light palette, and
 * every case-study colour follows without a second code path.
 *
 * Same keys as PALETTE in src/lib/palette.js (which stays hex for the 3D
 * scenes). alpha() mixes a colour with transparent, so it works on variables.
 */
import { PALETTE, PALETTE_LIGHT } from '@/lib/palette';

const ACCENT = 'var(--accent)';

/**
 * One accent per case study. Each case study sets --accent to its project's
 * own colour (the colour it has on /projects; see .case-accent in globals.css
 * and `accent` in src/data/showcase.js), and every highlight uses it: what
 * used to be jade (done, passed, after), ice (data), lilac and live all point
 * at the accent now. Sand (pending, planned, a flag) is a neutral grey. Only
 * alert stays its own colour: red means refused or broken.
 *
 * Where colour IS the data (the category colours of the architecture key and
 * the system map), use HUES, which keeps the real hues.
 */
export const P = {
  void: 'var(--void)',
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  raised: 'var(--raised)',
  line: 'var(--line)',
  lineHi: 'var(--line-hi)',
  ink: 'var(--ink)',
  inkMuted: 'var(--ink-muted)',
  inkSubtle: 'var(--ink-subtle)',
  inkFaint: 'var(--ink-faint)',
  accent: ACCENT,
  accentHi: 'var(--accent-hi)',
  accentLo: 'var(--accent-lo)',
  ice: ACCENT,
  jade: ACCENT,
  sand: 'var(--ink-subtle)',
  lilac: ACCENT,
  slate: 'var(--slate)',
  live: ACCENT,
  alert: 'var(--alert)',
};

/** The real hues, for category colours only (the architecture key, the system map). */
export const HUES = {
  ink: 'var(--ink)',
  inkMuted: 'var(--ink-muted)',
  inkSubtle: 'var(--ink-subtle)',
  slate: 'var(--slate)',
  ice: 'var(--ice)',
  jade: 'var(--jade)',
  sand: 'var(--sand)',
  lilac: 'var(--lilac)',
  live: 'var(--live)',
  alert: 'var(--alert)',
};

/** A colour (hex or variable) at opacity `a` (0 to 1). */
export const alpha = (color, a) => `color-mix(in srgb, ${color} ${Math.round(a * 1000) / 10}%, transparent)`;

/** Project kind → accent: every kind uses the case study's one accent now. */
export const KIND_ACCENT = {
  signature: P.accent,
  award: P.accent,
  current: P.accent,
  project: P.accent,
  classified: P.accent,
};

/* Hex colours for the theme in force, for the generic brief's figures
   (BentoPanels, ArchitectureGraph, DeploymentStatusStrip), which draw with
   hex values because d3 and alpha() from lib/palette need them. A colour
   handed in from the dark palette (a project's accent, a category hue) maps
   to the same key in the light palette; any other colour is left alone. */
const DARK_TO_LIGHT = new Map(Object.keys(PALETTE).map((k) => [PALETTE[k].toLowerCase(), PALETTE_LIGHT[k]]));

/** `color` for `theme`: a dark-palette hex becomes its light twin in light mode. */
export const forTheme = (color, theme) =>
  theme === 'light' && typeof color === 'string' ? DARK_TO_LIGHT.get(color.toLowerCase()) ?? color : color;
