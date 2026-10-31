'use client';

/**
 * Small pieces the Typist-ML sections share, so their panels read alike:
 *
 *   Scrubber      a stepped native range input under a drawn rail, with a
 *                 Play / Pause button — the replay control for the golden
 *                 session and the density governor. The real input sits on
 *                 top, invisible, so keyboard, touch and screen readers get a
 *                 native slider; the rail, ticks and knob underneath are
 *                 decoration. `marks` ([{ from, to }]) shade a stretch of the
 *                 rail — the edge case being replayed.
 *   usePlayer     the step a replay is on: the reader's scrub, else a run
 *                 that advances one step per beat inside a timer (never a
 *                 synchronous setState in an effect body). Reduced motion
 *                 starts on the last step and nothing plays by itself.
 *   ARM_BY_KEY    the four methods by key, from the study data.
 *   Meter         a 0–max scale with a shaded window and a marker — density.
 *   pct, fixed    number formatting.
 */
import { useEffect, useId, useState } from 'react';
import { PALETTE as P, alpha } from '@/lib/palette';
import { ARMS } from '@/data/studies/typist-ml';

/* ── data helpers ──────────────────────────────────────────────────────── */
export const ARM_BY_KEY = Object.fromEntries(ARMS.map((a) => [a.key, a]));
export const armLabel = (key) => ARM_BY_KEY[key]?.label ?? key;

/** 0.859375 → '85.9%'. */
export const pct = (v, digits = 1) => `${(v * 100).toFixed(digits)}%`;
/** 0.1244 → '0.124'. */
export const fixed = (v, digits = 3) => v.toFixed(digits);
export const pad2 = (n) => String(n).padStart(2, '0');

/* ── the replay ────────────────────────────────────────────────────────── */

/**
 * The step of a replay over 0…last. `step` is the reader's position (or the
 * default: the end under reduced motion, else 0); `playTo` the step a run
 * is heading for. `play(from, to)` starts a run; `scrub(i)` stops it.
 */
export function usePlayer(last, reduce, beatMs) {
  const [raw, setRaw] = useState(null);
  const [playTo, setPlayTo] = useState(null);
  const step = raw ?? (reduce ? last : 0);
  const playing = playTo != null && step < playTo;

  useEffect(() => {
    if (!playing) return undefined;
    const t = setTimeout(() => setRaw((s) => Math.min(last, (s ?? 0) + 1)), beatMs);
    return () => clearTimeout(t);
  }, [playing, step, last, beatMs]);

  const scrub = (i) => {
    setPlayTo(null);
    setRaw(Math.max(0, Math.min(last, i)));
  };
  const play = (from, to = last) => {
    setRaw(from);
    setPlayTo(to);
  };
  const pause = () => setPlayTo(null);
  return { step, playing, started: raw !== null, scrub, play, pause };
}

/* ── controls ──────────────────────────────────────────────────────────── */
const ICONS = {
  play: <path d="M3.5 2.2v7.6L9.6 6z" fill="currentColor" />,
  pause: <path d="M3.2 2.4h2v7.2h-2zM6.8 2.4h2v7.2h-2z" fill="currentColor" />,
  replay: (
    <>
      <path d="M9.6 6.4A3.6 3.6 0 1 1 6 2.4h1.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.9 0.6l2 1.8-2 1.8z" fill="currentColor" />
    </>
  ),
};

export function IconButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="mc-ghost-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line hover:border-line-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12">
        {ICONS[icon]}
      </svg>
    </button>
  );
}

const HIT = 28; // the native thumb's hit area (px)
const KNOB = 14;
const along = (f, offset = 0) => `calc(${HIT / 2 + offset}px + ${f} * (100% - ${HIT}px))`;

/**
 * The replay control. `value` 0…`max`; `onChange(i)`; `playing`, `onPlay`,
 * `onPause`; `label` names the slider, `valueText` reads the step aloud.
 */
export function Scrubber({ value, max, onChange, playing, onPlay, onPause, label, valueText, marks = [], accent }) {
  const hintId = useId();
  const f = max > 0 ? value / max : 0;
  const atEnd = value >= max;
  let button = { icon: 'play', label: 'Play', onClick: onPlay };
  if (playing) button = { icon: 'pause', label: 'Pause', onClick: onPause };
  else if (atEnd) button = { icon: 'replay', label: 'Replay from the start', onClick: onPlay };

  return (
    <div className="flex items-center gap-3">
      <IconButton {...button} />
      <div className="relative h-9 min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          aria-valuetext={valueText}
          aria-describedby={hintId}
          className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none"
        />
        <span id={hintId} className="sr-only">
          Use the arrow keys to step one at a time.
        </span>
        {marks.map((m) => (
          <span
            key={`${m.from}-${m.to}`}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full"
            style={{
              left: along(max > 0 ? m.from / max : 0, -3),
              width: `calc(${max > 0 ? (m.to - m.from) / max : 0} * (100% - ${HIT}px) + 6px)`,
              background: alpha(P.sand, 0.22),
            }}
          />
        ))}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 h-px"
          style={{ left: HIT / 2, right: HIT / 2, background: P.lineHi }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 h-px"
          style={{ left: HIT / 2, width: `calc(${f} * (100% - ${HIT}px))`, background: alpha(P.jade, 0.6) }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 rounded-full transition-[left] duration-150 ease-out peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
          style={{
            left: along(f, -KNOB / 2),
            width: KNOB,
            height: KNOB,
            marginTop: 0.5 - KNOB / 2,
            background: accent,
            boxShadow: `0 0 0 3px ${P.surface}`,
          }}
        />
      </div>
    </div>
  );
}

/* ── the density meter ─────────────────────────────────────────────────── */

/**
 * A 0…`scaleMax` rule with the window [`min`, `max`] shaded, an optional
 * dashed `ghost` tick (an earlier floor), and the value's marker — a filled
 * dot inside the window (jade), a hollow one outside it (alert). Labels are
 * HTML under the rule, so they never shrink below 11px.
 */
export function Meter({ value, min, max, scaleMax = 0.45, ghost, ghostLabel, showValue = true }) {
  const x = (v) => `${(Math.min(Math.max(v, 0), scaleMax) / scaleMax) * 100}%`;
  const inside = value >= min && value <= max;
  const tone = inside ? P.jade : P.alert;
  return (
    <div className="relative pb-6 pt-3">
      <div className="relative h-2">
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: P.lineHi }} />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 rounded-sm"
          style={{ left: x(min), width: `calc(${x(max)} - ${x(min)})`, background: alpha(P.inkMuted, 0.16), boxShadow: `inset 0 0 0 1px ${alpha(P.inkMuted, 0.3)}` }}
        />
        {ghost != null && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 h-5 border-l border-dashed"
            style={{ left: x(ghost), borderColor: P.inkSubtle }}
          />
        )}
        {showValue && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={inside ? { left: x(value), background: tone, boxShadow: `0 0 0 3px ${P.surface}` } : { left: x(value), background: P.surface, boxShadow: `inset 0 0 0 2px ${tone}, 0 0 0 3px ${P.surface}` }}
          />
        )}
      </div>
      <span aria-hidden="true" className="absolute top-6 -translate-x-1/2 font-mono text-micro text-ink-subtle" style={{ left: x(min) }}>
        {min.toFixed(2)}
      </span>
      <span aria-hidden="true" className="absolute top-6 -translate-x-1/2 font-mono text-micro text-ink-subtle" style={{ left: x(max) }}>
        {max.toFixed(2)}
      </span>
      {ghost != null && ghostLabel && (
        <span aria-hidden="true" className="absolute -top-2.5 -translate-x-1/2 whitespace-nowrap font-mono text-micro text-ink-subtle" style={{ left: x(ghost) }}>
          {ghostLabel}
        </span>
      )}
    </div>
  );
}
