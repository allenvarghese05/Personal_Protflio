'use client';
import { useId, useMemo } from 'react';
import { PALETTE } from '@/lib/palette';

/**
 * Generated cover art — a catalogue series, one per beat. The ring is the
 * beat's REAL loudness envelope (120 points from scripts/process_studio_
 * media.py) wrapped around a dark core, so every cover is unique to its
 * sound. Palettes: 'cold' for drill, 'warm' for guitar beats.
 */
export const COVER_THEMES = {
  cold: { bg: ['#10162a', '#07080c'], ring: PALETTE.ice, glow: '#3a4f8a', accentSoft: PALETTE.lilac, ink: PALETTE.ink },
  warm: { bg: ['#2a1608', '#07080c'], ring: PALETTE.accent, glow: PALETTE.accentLo, accentSoft: PALETTE.accentHi, ink: PALETTE.ink },
};

export default function Cover({ track, index, className = '', showText = true }) {
  const id = useId().replace(/:/g, '');
  const theme = COVER_THEMES[track.mood] || COVER_THEMES.warm;
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
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0" />
        </filter>
      </defs>
      <rect width="400" height="400" fill={`url(#bg${id})`} />
      <circle cx={C} cy={C} r="170" fill={`url(#gl${id})`} />
      {bars.map((b, i) => (
        <line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke={theme.ring} strokeOpacity={b.o} strokeWidth="2.2" strokeLinecap="round" />
      ))}
      <circle cx={C} cy={C} r={R - 8} fill={PALETTE.void} />
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
