/**
 * Colours for the case studies, as CSS variables, so a case study follows the
 * page's theme. In the game, and on /projects/<id> by default, the variables
 * hold the dark Signal Amber values (:root in globals.css). When /projects is
 * light (the résumé link, or the toggle), html[data-work-theme="light"]
 * .work-root swaps the same names for the light palette, and every case-study
 * colour follows without a second code path.
 *
 * Same keys as PALETTE in src/lib/palette.js (which stays hex for the 3D
 * scenes). alpha() mixes a colour with transparent, so it works on variables.
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
  accent: 'var(--accent)',
  accentHi: 'var(--accent-hi)',
  accentLo: 'var(--accent-lo)',
  ice: 'var(--ice)',
  jade: 'var(--jade)',
  sand: 'var(--sand)',
  lilac: 'var(--lilac)',
  slate: 'var(--slate)',
  live: 'var(--live)',
  alert: 'var(--alert)',
};

/** A colour (hex or variable) at opacity `a` (0 to 1). */
export const alpha = (color, a) => `color-mix(in srgb, ${color} ${Math.round(a * 1000) / 10}%, transparent)`;

/** Project kind → accent, as variables (mirrors KIND_ACCENT in src/lib/palette.js). */
export const KIND_ACCENT = {
  signature: P.accent,
  award: P.accent,
  current: P.ice,
  project: P.sand,
  classified: P.slate,
};
