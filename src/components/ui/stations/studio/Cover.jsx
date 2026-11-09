'use client';
import { useId, useMemo } from 'react';
import { PALETTE, PALETTE_LIGHT } from '@/lib/palette';
import { useThemeValue } from '@/lib/useTheme';

/**
 * Generated cover art — a catalogue series, one per beat. The ring is the
 * beat's REAL loudness envelope (120 points from scripts/process_studio_
 * media.py) wrapped around a dark core, so every cover is unique to its
 * sound. Palettes: 'cold' for drill, 'warm' for guitar beats.
 *
 * In light mode the same covers are printed on paper: a pale ground, the
 * ring in the darker ice / amber, a white core and a dark grain, so they sit
 * on a white page. `field` is the Now Playing colour field's three shapes
 * (in dark, the glow, the ring and the soft accent, as they always were; in
 * light, pale tints that keep the text over them at 4.5:1 or better).
 */
export const COVER_THEMES = {
  cold: { bg: ['#10162a', '#07080c'], ring: PALETTE.ice, glow: '#3a4f8a', accentSoft: PALETTE.lilac, ink: PALETTE.ink, core: PALETTE.void },
  warm: { bg: ['#2a1608', '#07080c'], ring: PALETTE.accent, glow: PALETTE.accentLo, accentSoft: PALETTE.accentHi, ink: PALETTE.ink, core: PALETTE.void },
};
COVER_THEMES.cold.field = [COVER_THEMES.cold.glow, COVER_THEMES.cold.ring, COVER_THEMES.cold.accentSoft];
COVER_THEMES.warm.field = [COVER_THEMES.warm.glow, COVER_THEMES.warm.ring, COVER_THEMES.warm.accentSoft];

export const COVER_THEMES_LIGHT = {
  cold: {
    bg: ['#e6eefc', '#fbfcff'],
    ring: PALETTE_LIGHT.ice,
    glow: '#9cc3ff',
    accentSoft: PALETTE_LIGHT.lilac,
    ink: PALETTE_LIGHT.ink,
    core: PALETTE_LIGHT.void,
    field: ['#d6e4ff', '#e3ebff', '#ebe5fd'],
  },
  warm: {
    bg: ['#fbecdc', '#fffcf8'],
    ring: PALETTE_LIGHT.accent,
    glow: '#ffc27a',
    accentSoft: PALETTE_LIGHT.accentHi,
    ink: PALETTE_LIGHT.ink,
    core: PALETTE_LIGHT.void,
    field: ['#ffe6cc', '#ffeedd', '#fff1d2'],
  },
};

/** The cover palette for a beat's mood, in the theme in force. */
export function useCoverTheme(mood) {
  const set = useThemeValue() === 'light' ? COVER_THEMES_LIGHT : COVER_THEMES;
  return set[mood] || set.warm;
}

export default function Cover({ track, index, className = '', showText = true }) {
  const id = useId().replace(/:/g, '');
  const theme = useCoverTheme(track.mood);
  const light = useThemeValue() === 'light';
  const C = 200;
  const R = 58;

  // the waveform, as bars radiating from the core
  const bars = useMemo(() => {
    const peaks = track.peaks || [];
    return peaks.map((v, i) => {
      const a = (i / peaks.length) * Math.PI * 2 - Math.PI / 2;
      const len = 6 + v * 62;
      return {
        x1: C + Math.cos(a) * R,
        y1: C + Math.sin(a) * R,
        x2: C + Math.cos(a) * (R + len),
        y2: C + Math.sin(a) * (R + len),
        o: 0.35 + v * 0.65,
      };
    });
  }, [track.peaks]);

  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label={`${track.title} — cover`}>
      <defs>
        <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.bg[0]} />
          <stop offset="1" stopColor={theme.bg[1]} />
        </linearGradient>
        <radialGradient id={`gl${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={theme.glow} stopOpacity="0.55" />
          <stop offset="1" stopColor={theme.glow} stopOpacity="0" />
        </radialGradient>
        <filter id={`gr${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          {/* the grain: white specks on the dark covers, dark ones on the pale */}
          <feColorMatrix values={light ? '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0' : '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0'} />
        </filter>
      </defs>
      <rect width="400" height="400" fill={`url(#bg${id})`} />
      <circle cx={C} cy={C} r="170" fill={`url(#gl${id})`} />
      {bars.map((b, i) => (
        <line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke={theme.ring} strokeOpacity={b.o} strokeWidth="2.2" strokeLinecap="round" />
      ))}
      <circle cx={C} cy={C} r={R - 8} fill={theme.core} />
      <circle cx={C} cy={C} r={R - 8} fill="none" stroke={theme.ring} strokeOpacity="0.35" />
      <circle cx={C} cy={C} r="3" fill={theme.ring} />
      {showText && (
        <g fontFamily="var(--font-jetbrains-mono), monospace" fill={theme.ink}>
          <text x="26" y="40" fontSize="12" letterSpacing="3" opacity="0.7">
            AV — {String(index + 1).padStart(2, '0')}
          </text>
          <text x="374" y="40" fontSize="12" letterSpacing="3" opacity="0.5" textAnchor="end">
            BEATS
          </text>
          <text x="26" y="368" fontSize="34" fontWeight="600" letterSpacing="-1" fontFamily="var(--font-display-face), sans-serif">
            {track.title}
          </text>
        </g>
      )}
      <rect width="400" height="400" filter={`url(#gr${id})`} />
    </svg>
  );
}
