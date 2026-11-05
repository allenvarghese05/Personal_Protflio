'use client';

/**
 * Telltale's hero: one real investigation, replayed on the crash's own clock.
 *
 * A ruler of time runs from 6 s to 8 s. Above it sits Muse Wonder's timeline
 * as the agent submitted it: danger onset, first seen, impact. A playhead then
 * replays the crash at real speed, and plain Python earns each number on the
 * way: at every mark a line drops from the ruler to the checker's row and a
 * tick lands beside the evidence ID it recomputed the number from. Between
 * onset and first seen a bracket grows with the playhead and measures the time
 * the car took to notice, against the 0.30 s window its profile allows (the
 * shaded stretch on the ruler). At impact the summary lights: all 9 claims
 * reproduced. Then it clears and replays.
 *
 * Facts, from src/data/studies/telltale.js: FLOW step 'report' ("danger at
 * 6.13 s, noticed at 7.24 s, 1.10 s against 0.30 s allowed", "Impact at
 * 8.00 s and 8.4 km/h; all 9 claims reproduced", the report written by code
 * from verified facts) and the evidence IDs from the R6 decision's
 * THRESHOLD_INTERVALS (VID:hazard_onset_t, AV:first_seen_t, VID:impact_t).
 * The ruler's 6 s to 8 s span and its 0.1 s ticks are only a scale.
 *
 * Two fitted layouts, picked by a container query so text stays at 11px or
 * more: 'wide' (the horizontal ruler, agent above, checker below) from a
 * 420px-wide wrapper up, and 'compact' (the ruler stood upright, each mark a
 * ledger row: claim on the first line, the checker's evidence on the second)
 * below that. On first view the pieces settle in; the replay then loops only
 * while the figure is on screen. Under reduced motion every claim is simply
 * shown reproduced, with no playhead.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { P, alpha } from '@/components/ui/case/tokens';
import { EASE_OUT } from '@/lib/motion';

/* ── the investigation (FLOW 'report' facts; IDs from THRESHOLD_INTERVALS) ── */
const ONSET = 6.13; // danger onset, s
const SEEN = 7.24; // first seen by the driver-assist, s
const IMPACT = 8.0; // impact, s
const TOOK = '1.10'; // seen minus onset, as the report states it
const ALLOWED = 0.3; // the perception window the profile allows, s
const SPEED = '8.4 km/h'; // impact speed
const CLAIMS = 9; // claims in the submission, all reproduced
const fmt = (t) => `${t.toFixed(2)} s`;

const EVENTS = [
  { key: 'onset', name: 'Danger onset', t: ONSET, id: 'VID:hazard_onset_t', level: 1 },
  { key: 'seen', name: 'First seen', t: SEEN, id: 'AV:first_seen_t', level: 2 },
  { key: 'impact', name: 'Impact', t: IMPACT, id: 'VID:impact_t', extra: SPEED, level: 4 },
];
const INTERVAL_LEVEL = 3;
const ALL_LEVEL = 5;

/* ── the ruler (s): a scale only ───────────────────────────────────────── */
const T_START = 6;
const T_END = 8;
const TICK_S = 0.1;
const MAJOR_EVERY = 5; // a longer tick every 0.5 s
const TICKS = Array.from({ length: Math.round((T_END - T_START) / TICK_S) + 1 }, (_, i) => i);

/* ── the replay loop ───────────────────────────────────────────────────── */
// Each phase holds the playhead at time `t` and the checker at `level`
// (how many of the marks it has reproduced). A phase with no `ms` is a move,
// and lasts exactly as long as the crash did between those two times.
const CHECK_MS = 1300; // a tick lands and the caption reads
const LOOP = [
  { t: T_START, level: 0, ms: 900 }, // playhead appears at the start of the ruler
  { t: ONSET, level: 0 },
  { t: ONSET, level: 1, ms: CHECK_MS },
  { t: SEEN, level: 1 }, // the bracket grows with the playhead
  { t: SEEN, level: 2, ms: CHECK_MS },
  { t: SEEN, level: 3, ms: CHECK_MS + 400 },
  { t: IMPACT, level: 3 },
  { t: IMPACT, level: 4, ms: CHECK_MS },
  { t: IMPACT, level: 5, ms: 3000 }, // the summary holds
  { t: IMPACT, level: 0, ms: 700, clear: true }, // everything clears, then replays
].map((p, i, all) => {
  const move = i > 0 ? Math.max(0, p.t - all[i - 1].t) : 0;
  return { ...p, move, ms: p.ms ?? Math.round(move * 1000) };
});
const BEFORE = { t: T_START, level: 0, move: 0 }; // before the first replay
const FINISHED = { t: IMPACT, level: ALL_LEVEL, move: 0 }; // reduced motion

/* ── motion ────────────────────────────────────────────────────────────── */
const IN_VIEW = { once: true, amount: 0.3 }; // the entrance plays once
const ON_SCREEN = { amount: 0.3 }; // the replay runs only while visible
const ENTER = { dur: 0.6, column: 0.1, lift: 8 };
const ENTER_MS = 1400; // entrance done, the first replay starts
const FADE = { duration: 0.35, ease: EASE_OUT };
const TRANSITION_MS = 320;
const CSS_EASE = `cubic-bezier(${EASE_OUT.join(',')})`;
const TRANSITION = ['opacity', 'fill', 'stroke', 'transform']
  .map((prop) => `${prop} ${TRANSITION_MS}ms ${CSS_EASE}`)
  .join(', ');

/* ── type (viewBox units) ──────────────────────────────────────────────── */
const T = { tag: 12.5, name: 14.5, value: 13.5, small: 12.5 };
const TAG_TRACK_EM = 0.14;
const GLYPH_R = 8;
const HEAD_R = 4.25;
const HALO_R = 9;
const DOT_R = 3.75;

/* ── text width estimate (only to sit a tick just before a label) ──────── */
const NARROW = new Set("iljI.,:;!|'");
const SLIM = new Set('frt()-/');
const sansWidth = (text, size) =>
  [...text].reduce((w, ch) => w + (ch === ' ' ? 0.28 : NARROW.has(ch) ? 0.27 : SLIM.has(ch) ? 0.36 : 0.57), 0) * size;
const monoWidth = (text, size) => text.length * size * 0.6;

const mix = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, var(--void))`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ── words ─────────────────────────────────────────────────────────────── */
const TAG_AGENT = 'MUSE WONDER’S TIMELINE';
const TAG_CHECK = 'PLAIN PYTHON';
const SUMMARY = `All ${CLAIMS} claims reproduced by plain Python`;
const SUMMARY_SUB = 'The report is then written by code from the verified facts';

const CAPTIONS = [
  'Muse Wonder’s timeline, as submitted. Plain Python replays the crash and recomputes every number.',
  `Danger onset at ${fmt(ONSET)}, reproduced from ${EVENTS[0].id}.`,
  `First seen at ${fmt(SEEN)}, reproduced from ${EVENTS[1].id}.`,
  `Noticing took ${TOOK} s against the ${fmt(ALLOWED)} allowed, recomputed from those two times.`,
  `Impact at ${fmt(IMPACT)} and ${SPEED}, reproduced from the evidence.`,
  `All ${CLAIMS} claims reproduced. A verdict that differed from code’s own would hold the report back.`,
];

const DESCRIPTION = `One real Telltale investigation on a time axis. Muse Wonder’s timeline: danger onset at ${fmt(
  ONSET,
)}, first seen at ${fmt(SEEN)}, and impact at ${fmt(IMPACT)} and ${SPEED}. The car took ${TOOK} s to notice, against ${fmt(
  ALLOWED,
)} allowed. Plain Python recomputed each number from the evidence (${EVENTS.map((e) => e.id).join(', ')}) and reproduced all ${CLAIMS} claims.`;

/* ── shared pieces ─────────────────────────────────────────────────────── */

/** The checker's mark: a dashed slot while pending, a tick in the accent once reproduced. */
function Tick({ cx, cy, on, accent }) {
  const pop = { transformBox: 'fill-box', transformOrigin: 'center', transition: TRANSITION };
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={GLYPH_R - 1}
        fill="none"
        stroke={P.lineHi}
        strokeWidth="1"
        strokeDasharray="2 3"
        style={{ opacity: on ? 0 : 1, transition: TRANSITION }}
      />
      <g style={{ ...pop, opacity: on ? 1 : 0, transform: on ? 'scale(1)' : 'scale(0.55)' }}>
        <circle cx={cx} cy={cy} r={GLYPH_R} fill={mix(accent, 16)} stroke={accent} strokeWidth="1.25" />
        <path
          d={`M ${cx - 3.4},${cy + 0.2} L ${cx - 0.9},${cy + 2.7} L ${cx + 3.6},${cy - 2.6}`}
          fill="none"
          stroke={accent}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
}

/** Tracked uppercase mono tag. */
function Tag({ x, y, anchor = 'start', children }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className="font-mono"
      fontSize={T.tag}
      fontWeight="500"
      letterSpacing={T.tag * TAG_TRACK_EM}
      fill={P.inkSubtle}
    >
      {children}
    </text>
  );
}

/** A number the agent claimed: muted until the checker reproduces it. */
function Value({ on, accent, size = T.value, ...rest }) {
  return (
    <text
      className="font-mono"
      fontSize={size}
      fontWeight="500"
      style={{ fill: on ? accent : P.inkMuted, transition: TRANSITION }}
      {...rest}
    />
  );
}

function Dot({ cx, cy, on, accent }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={DOT_R}
      strokeWidth="1"
      style={{ fill: on ? accent : mix(P.ink, 8), stroke: on ? accent : P.lineHi, transition: TRANSITION }}
    />
  );
}

/* ── wide: the horizontal ruler ────────────────────────────────────────── */
// 12.5u text lands at 11.4px on a 420px render
const W = {
  viewW: 460,
  viewH: 300,
  ax0: 32,
  ax1: 432,
  tagY: 16,
  nameY: 46,
  valueY: 65,
  extraY: 84,
  poleTop: 33, // flag poles start at the name's cap height
  allowY: 97,
  trackY: 112,
  window: 6, // half-height of the allowed window on the ruler
  head: 12, // playhead half-length
  bracketY: 136,
  cap: 5,
  bracketLabelY: 158,
  checkTagY: 183, // the checker's tag, right-aligned beside impact's drop line
  glyphY: 200,
  idY: 230,
  finalY: 270,
  finalSubY: 289,
  gap: 8, // pole to text
};
const wx = (t) => W.ax0 + ((t - T_START) / (T_END - T_START)) * (W.ax1 - W.ax0);
// onset flags right, first seen sits centred on its stem, impact flags left
const WIDE_ALIGN = { onset: 'start', seen: 'middle', impact: 'end' };

function WideClaim({ e, on, accent }) {
  const x = wx(e.t);
  const align = WIDE_ALIGN[e.key];
  const tx = align === 'start' ? x + W.gap : align === 'end' ? x - W.gap : x;
  const poleTop = align === 'middle' ? W.valueY + 9 : W.poleTop;
  return (
    <>
      <line x1={x} y1={poleTop} x2={x} y2={W.trackY - DOT_R - 2} stroke={P.lineHi} strokeWidth="1" />
      <text x={tx} y={W.nameY} textAnchor={align} className="font-sans" fontSize={T.name} fontWeight="600" fill={P.ink}>
        {e.name}
      </text>
      <Value x={tx} y={W.valueY} textAnchor={align} on={on} accent={accent}>
        {fmt(e.t)}
      </Value>
      {e.extra && (
        <Value x={tx} y={W.extraY} textAnchor={align} on={on} accent={accent} size={T.small}>
          {e.extra}
        </Value>
      )}
    </>
  );
}

function WideCheck({ e, on, accent, reduce }) {
  const x = wx(e.t);
  const align = WIDE_ALIGN[e.key];
  const idX = align === 'start' ? x - GLYPH_R : align === 'end' ? x + GLYPH_R : x;
  const from = W.trackY + DOT_R + 2;
  const to = W.glyphY - GLYPH_R - 2;
  return (
    <>
      {/* the slot's faint drop line, then the checker's own as it measures */}
      <line x1={x} y1={from} x2={x} y2={to} stroke={P.line} strokeWidth="1" strokeDasharray="1.5 3.5" />
      <motion.path
        d={`M ${x},${from} V ${to}`}
        fill="none"
        stroke={accent}
        strokeWidth="1.25"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.45, ease: EASE_OUT }}
      />
      <Tick cx={x} cy={W.glyphY} on={on} accent={accent} />
      <text
        x={idX}
        y={W.idY}
        textAnchor={align}
        className="font-mono"
        fontSize={T.small}
        style={{ fill: on ? P.inkMuted : P.inkSubtle, transition: TRANSITION }}
      >
        {e.id}
      </text>
    </>
  );
}

function WideFigure({ live, level, playing, bracketOn, accent, reduce, enter }) {
  const move = { duration: live.move, ease: 'linear' };
  const headX = wx(live.t);
  const bracketX = wx(clamp(live.t, ONSET, SEEN));
  const intervalOn = level >= INTERVAL_LEVEL;
  const allOn = level >= ALL_LEVEL;

  // the interval's label ends just before first seen's drop line; its tick sits in front
  const tookText = ' to notice';
  const tookEnd = wx(SEEN) - W.gap;
  const tookStart = tookEnd - monoWidth(`${TOOK} s`, T.value) - sansWidth(tookText, T.value);
  const allowX = wx(ONSET) + W.gap;

  return (
    <svg viewBox={`0 0 ${W.viewW} ${W.viewH}`} className="block h-auto w-full overflow-visible" aria-hidden="true">
      <motion.g {...enter(0, { y: -4 })}>
        <Tag x={W.ax0} y={W.tagY}>
          {TAG_AGENT}
        </Tag>
      </motion.g>

      {/* the ruler: track, 0.1 s ticks, and the window the profile allows */}
      <motion.g {...enter(0.05, {})}>
        <rect
          x={wx(ONSET)}
          y={W.trackY - W.window}
          width={wx(ONSET + ALLOWED) - wx(ONSET)}
          height={W.window * 2}
          rx="2"
          fill={alpha(P.ink, 0.07)}
          stroke={P.lineHi}
          strokeWidth="0.75"
        />
        <line x1={W.ax0} y1={W.trackY} x2={W.ax1} y2={W.trackY} stroke={P.lineHi} strokeWidth="1.25" strokeLinecap="round" />
        {TICKS.map((i) => {
          const x = wx(T_START + i * TICK_S);
          const major = i % MAJOR_EVERY === 0;
          return <line key={i} x1={x} y1={W.trackY + 3} x2={x} y2={W.trackY + (major ? 9 : 5.5)} stroke={major ? P.lineHi : P.line} strokeWidth="1" />;
        })}
        <text x={allowX} y={W.allowY} fontSize={T.small} fill={P.inkSubtle}>
          <tspan className="font-mono">{fmt(ALLOWED)}</tspan>
          <tspan className="font-sans"> allowed</tspan>
        </text>
      </motion.g>

      {/* what has been replayed so far */}
      <motion.line
        x1={W.ax0}
        y1={W.trackY}
        y2={W.trackY}
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ x2: W.ax0, opacity: 0 }}
        animate={{ x2: headX, opacity: playing ? 0.75 : 0 }}
        transition={{ x2: move, opacity: FADE }}
      />

      {/* Muse Wonder's timeline */}
      {EVENTS.map((e, i) => (
        <motion.g key={e.key} {...enter(0.15 + i * ENTER.column, { y: -ENTER.lift })}>
          <WideClaim e={e} on={level >= e.level} accent={accent} />
        </motion.g>
      ))}
      {EVENTS.map((e) => (
        <Dot key={e.key} cx={wx(e.t)} cy={W.trackY} on={level >= e.level} accent={accent} />
      ))}

      {/* the checker measures onset to first seen */}
      <motion.g
        initial={false}
        animate={{ opacity: bracketOn ? 1 : 0 }}
        transition={FADE}
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <line x1={wx(ONSET)} y1={W.bracketY - W.cap} x2={wx(ONSET)} y2={W.bracketY + W.cap} />
        <motion.line
          x1={wx(ONSET)}
          y1={W.bracketY}
          y2={W.bracketY}
          initial={{ x2: reduce ? bracketX : wx(ONSET) }}
          animate={{ x2: bracketX }}
          transition={move}
        />
        <motion.line
          y1={W.bracketY - W.cap}
          y2={W.bracketY + W.cap}
          initial={{ x1: reduce ? bracketX : wx(ONSET), x2: reduce ? bracketX : wx(ONSET) }}
          animate={{ x1: bracketX, x2: bracketX }}
          transition={move}
        />
      </motion.g>
      <motion.g {...enter(0.5, { y: 6 })}>
        <Tick cx={tookStart - GLYPH_R - 6} cy={W.bracketLabelY - 4.5} on={intervalOn} accent={accent} />
        <text x={tookEnd} y={W.bracketLabelY} textAnchor="end" fontSize={T.value}>
          <tspan className="font-mono" fontWeight="500" style={{ fill: intervalOn ? accent : P.inkMuted, transition: TRANSITION }}>
            {TOOK} s
          </tspan>
          <tspan className="font-sans" fill={P.ink}>
            {tookText}
          </tspan>
        </text>
      </motion.g>

      {/* plain Python: one drop line and tick per mark, with the evidence it used */}
      <motion.g {...enter(0.45, { y: ENTER.lift })}>
        <Tag x={W.ax1 - W.gap} y={W.checkTagY} anchor="end">
          {TAG_CHECK}
        </Tag>
      </motion.g>
      {EVENTS.map((e, i) => (
        <motion.g key={e.key} {...enter(0.45 + i * ENTER.column, { y: ENTER.lift })}>
          <WideCheck e={e} on={level >= e.level} accent={accent} reduce={reduce} />
        </motion.g>
      ))}

      {/* the playhead */}
      <motion.g
        initial={{ x: wx(T_START), opacity: 0 }}
        animate={{ x: headX, opacity: playing ? 1 : 0 }}
        transition={{ x: move, opacity: FADE }}
      >
        <line x1="0" y1={W.trackY - W.head} x2="0" y2={W.trackY + W.head} stroke={accent} strokeWidth="1.25" />
        <circle cx="0" cy={W.trackY} r={HALO_R} fill={alpha(accent, 0.18)} />
        <circle cx="0" cy={W.trackY} r={HEAD_R} fill={accent} />
      </motion.g>

      {/* the summary */}
      <motion.g {...enter(0.7, { y: 6 })}>
        <Tick cx={W.ax0 + GLYPH_R} cy={W.finalY - 4.5} on={allOn} accent={accent} />
        <text
          x={W.ax0 + 2 * GLYPH_R + 8}
          y={W.finalY}
          className="font-sans"
          fontSize={T.name}
          fontWeight="600"
          style={{ fill: allOn ? P.ink : P.inkSubtle, transition: TRANSITION }}
        >
          {SUMMARY}
        </text>
        <text x={W.ax0 + 2 * GLYPH_R + 8} y={W.finalSubY} className="font-sans" fontSize={T.small} fill={P.inkSubtle}>
          {SUMMARY_SUB}
        </text>
      </motion.g>
    </svg>
  );
}

/* ── compact: the ruler stood upright, one ledger row per mark ─────────── */
// 12.5u text lands at 10.3px on the narrowest (280px) render, 11px from 300px
const C = {
  viewW: 340,
  viewH: 388,
  tx: 16, // the ruler
  y0: 44, // where 6 s sits
  k: 125, // viewBox units per second
  bx: 32, // the bracket
  cap: 5,
  tc: 50, // text column
  rx: 332, // values, right-aligned
  tagY: 16,
  nameDy: 5, // a row's name baseline below its mark
  subDy: 26, // its evidence line below that mark
  window: 5,
  head: 10,
  intervalY: 134,
  allowY: 153,
  finalY: 356,
  finalSubY: 375,
};
const cy = (t) => C.y0 + (t - T_START) * C.k;

function CompactRow({ e, on, accent }) {
  const y = cy(e.t);
  const subY = y + C.subDy;
  return (
    <>
      <text x={C.tc} y={y + C.nameDy} className="font-sans" fontSize={T.name} fontWeight="600" fill={P.ink}>
        {e.name}
      </text>
      <Value x={C.rx} y={y + C.nameDy} textAnchor="end" on={on} accent={accent}>
        {fmt(e.t)}
      </Value>
      <Tick cx={C.tc + GLYPH_R} cy={subY - 4.5} on={on} accent={accent} />
      <text
        x={C.tc + 2 * GLYPH_R + 6}
        y={subY}
        className="font-mono"
        fontSize={T.small}
        style={{ fill: on ? P.inkMuted : P.inkSubtle, transition: TRANSITION }}
      >
        {e.id}
      </text>
      {e.extra && (
        <Value x={C.rx} y={subY} textAnchor="end" on={on} accent={accent} size={T.small}>
          {e.extra}
        </Value>
      )}
    </>
  );
}

function CompactFigure({ live, level, playing, bracketOn, accent, reduce, enter }) {
  const move = { duration: live.move, ease: 'linear' };
  const headY = cy(live.t);
  const bracketY = cy(clamp(live.t, ONSET, SEEN));
  const intervalOn = level >= INTERVAL_LEVEL;
  const allOn = level >= ALL_LEVEL;
  const indent = C.tc + 2 * GLYPH_R + 6;

  return (
    <svg viewBox={`0 0 ${C.viewW} ${C.viewH}`} className="block h-auto w-full overflow-visible" aria-hidden="true">
      <motion.g {...enter(0, { y: -4 })}>
        <Tag x={C.tc} y={C.tagY}>
          {TAG_AGENT}
        </Tag>
      </motion.g>

      <motion.g {...enter(0.05, {})}>
        <rect
          x={C.tx - C.window}
          y={cy(ONSET)}
          width={C.window * 2}
          height={cy(ONSET + ALLOWED) - cy(ONSET)}
          rx="2"
          fill={alpha(P.ink, 0.07)}
          stroke={P.lineHi}
          strokeWidth="0.75"
        />
        <line x1={C.tx} y1={C.y0} x2={C.tx} y2={cy(T_END)} stroke={P.lineHi} strokeWidth="1.25" strokeLinecap="round" />
        {TICKS.map((i) => {
          const y = cy(T_START + i * TICK_S);
          const major = i % MAJOR_EVERY === 0;
          return <line key={i} x1={C.tx - 3} y1={y} x2={C.tx - (major ? 9 : 5.5)} y2={y} stroke={major ? P.lineHi : P.line} strokeWidth="1" />;
        })}
      </motion.g>

      <motion.line
        x1={C.tx}
        x2={C.tx}
        y1={C.y0}
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ y2: C.y0, opacity: 0 }}
        animate={{ y2: headY, opacity: playing ? 0.75 : 0 }}
        transition={{ y2: move, opacity: FADE }}
      />

      {EVENTS.map((e, i) => (
        <motion.g key={e.key} {...enter(0.15 + i * ENTER.column, { x: ENTER.lift })}>
          <CompactRow e={e} on={level >= e.level} accent={accent} />
        </motion.g>
      ))}
      {EVENTS.map((e) => (
        <Dot key={e.key} cx={C.tx} cy={cy(e.t)} on={level >= e.level} accent={accent} />
      ))}

      {/* the bracket, growing down from onset to first seen */}
      <motion.g
        initial={false}
        animate={{ opacity: bracketOn ? 1 : 0 }}
        transition={FADE}
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <line x1={C.bx - C.cap} y1={cy(ONSET)} x2={C.bx + C.cap} y2={cy(ONSET)} />
        <motion.line
          x1={C.bx}
          x2={C.bx}
          y1={cy(ONSET)}
          initial={{ y2: reduce ? bracketY : cy(ONSET) }}
          animate={{ y2: bracketY }}
          transition={move}
        />
        <motion.line
          x1={C.bx - C.cap}
          x2={C.bx + C.cap}
          initial={{ y1: reduce ? bracketY : cy(ONSET), y2: reduce ? bracketY : cy(ONSET) }}
          animate={{ y1: bracketY, y2: bracketY }}
          transition={move}
        />
      </motion.g>

      <motion.g {...enter(0.4, { x: ENTER.lift })}>
        <Tick cx={C.tc + GLYPH_R} cy={C.intervalY - 4.5} on={intervalOn} accent={accent} />
        <text x={indent} y={C.intervalY} className="font-sans" fontSize={T.name} fontWeight="600" fill={P.ink}>
          Noticing took
        </text>
        <Value x={C.rx} y={C.intervalY} textAnchor="end" on={intervalOn} accent={accent}>
          {TOOK} s
        </Value>
        <text x={indent} y={C.allowY} className="font-sans" fontSize={T.small} fill={P.inkSubtle}>
          Allowed
        </text>
        <text x={C.rx} y={C.allowY} textAnchor="end" className="font-mono" fontSize={T.small} fill={P.inkSubtle}>
          {fmt(ALLOWED)}
        </text>
      </motion.g>

      <motion.g
        initial={{ y: cy(T_START), opacity: 0 }}
        animate={{ y: headY, opacity: playing ? 1 : 0 }}
        transition={{ y: move, opacity: FADE }}
      >
        <line x1={C.tx - C.head} y1="0" x2={C.tx + C.head} y2="0" stroke={accent} strokeWidth="1.25" />
        <circle cx={C.tx} cy="0" r={HALO_R} fill={alpha(accent, 0.18)} />
        <circle cx={C.tx} cy="0" r={HEAD_R} fill={accent} />
      </motion.g>

      <motion.g {...enter(0.6, { y: 6 })}>
        <Tick cx={C.tx} cy={C.finalY - 4.5} on={allOn} accent={accent} />
        <text
          x={C.tc}
          y={C.finalY}
          className="font-sans"
          fontSize={T.name}
          fontWeight="600"
          style={{ fill: allOn ? P.ink : P.inkSubtle, transition: TRANSITION }}
        >
          All {CLAIMS} claims reproduced
        </text>
        <text x={C.tc} y={C.finalSubY} className="font-sans" fontSize={T.small} fill={P.inkSubtle}>
          by plain Python, from the evidence
        </text>
      </motion.g>
    </svg>
  );
}

/* ── the figure ────────────────────────────────────────────────────────── */

export default function Hero({ accent = P.accent }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, IN_VIEW);
  // not latched: scrolled away, the replay pauses where it is
  const onScreen = useInView(ref, ON_SCREEN);
  const [phase, setPhase] = useState(-1);

  // the replay: one phase per timeout, only while on screen; setState only in the timer
  useEffect(() => {
    if (reduce || !onScreen) return undefined;
    const wait = phase < 0 ? ENTER_MS : LOOP[phase].ms;
    const id = setTimeout(() => setPhase((p) => (p + 1) % LOOP.length), wait);
    return () => clearTimeout(id);
  }, [phase, onScreen, reduce]);

  const live = reduce ? FINISHED : phase < 0 ? BEFORE : LOOP[phase];
  const state = {
    live,
    level: live.level,
    playing: !reduce && phase >= 0 && !live.clear,
    bracketOn: reduce || (phase >= 1 && !live.clear),
    accent,
    reduce,
  };
  const shown = reduce || inView;

  // entrance: each piece settles into place once, on first view
  const enter = (delay, from) => ({
    initial: reduce ? false : { opacity: 0, ...from },
    animate: shown ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...from },
    transition: { duration: ENTER.dur, ease: EASE_OUT, delay },
  });

  const caption = CAPTIONS[live.level];

  return (
    // @container: each layout shows or hides itself by the wrapper's width
    <div ref={ref} className="@container mx-auto w-full max-w-[560px]">
      <p className="sr-only">{DESCRIPTION}</p>
      <div className="@max-[420px]:hidden">
        <WideFigure {...state} enter={enter} />
      </div>
      <div className="@min-[420px]:hidden">
        <CompactFigure {...state} enter={enter} />
      </div>

      {/* what the checker just did */}
      <div className="mt-5 min-h-[2.75rem] text-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={live.level}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="mx-auto max-w-[46ch] text-sm leading-snug text-ink-muted"
          >
            {caption}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
