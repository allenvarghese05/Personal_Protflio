'use client';

/**
 * AirCast hero: one AQI, five answers. The safety engine Allen wrote judges
 * every forecast step against five groups' thresholds, so the same number is
 * safe for an adult and a reason to keep a care home indoors.
 *
 * Top: a sample six-step AQI forecast as a line. Below it, one lane per group
 * (care facilities, children, seniors, athletes, adults; strictest first),
 * with its "safe below" threshold in the gutter and one cell per step. As the
 * forecast cursor advances, each step's five cells resolve to safe (solid
 * accent), caution (accent outline) or unsafe (alert), so every lane's safe
 * window grows out of the same curve: one step for care facilities, all six
 * for adults. At the end each group's best step (the engine's rule: the
 * lowest AQI among that group's safe steps) is ringed, and the caption sums
 * up the windows.
 *
 * Facts: groups and thresholds are parsed from the "One number, five answers"
 * decision in src/data/studies/aircast.js; the step count from the project's
 * metrics. The AQI values are a clearly labelled sample, never a reading; the
 * statuses and best steps are computed from them with the engine's own rules.
 *
 * Motion: on first view the curve draws in and the lanes slide in; then the
 * sweep loops only while the figure is on screen (timers, setState only in
 * their callbacks). Reduced motion: the finished state (every cell resolved,
 * best steps ringed, summary caption), no cursor. Two fitted layouts picked by
 * a container query (wide from 440px, compact below) keep SVG text at 11px or
 * more on desktop and above 10px on a phone.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { P, alpha } from '@/components/ui/case/tokens';
import { EASE_OUT } from '@/lib/motion';
import { DECISIONS } from '@/data/studies/aircast';
import { project } from '@/data/projects/aircast';

/* ── facts ─────────────────────────────────────────────────────────────── */
// "Care facilities, safe < 45 · caution < 90" and so on, strictest first
const THRESHOLD_RE = /^(.+?), safe < (\d+) · caution < (\d+)$/;
const GROUPS = (DECISIONS.find((d) => d.id === 'groups')?.steps ?? [])
  .map((s) => s.match(THRESHOLD_RE))
  .filter(Boolean)
  .map(([, name, safe, caution]) => ({ key: name.toLowerCase(), name, safe: Number(safe), caution: Number(caution) }));

const STEP_COUNT = Number(project.metrics.find((m) => /forecast steps/i.test(m.label))?.value) || 6;

// Illustrative only: a plausible day, chosen so the five windows differ.
const SAMPLE_AQI = [88, 96, 72, 48, 42, 61, 70, 80].slice(0, STEP_COUNT);
const STEPS = SAMPLE_AQI.length;

// the engine's rules (models/user_groups.py and /api/safety-groups)
const statusOf = (aqi, g) => (aqi < g.safe ? 'safe' : aqi < g.caution ? 'caution' : 'unsafe');
const JUDGED = GROUPS.map((g) => {
  const statuses = SAMPLE_AQI.map((aqi) => statusOf(aqi, g));
  const pool = statuses.some((s) => s === 'safe') ? SAMPLE_AQI.map((_, i) => i).filter((i) => statuses[i] === 'safe') : SAMPLE_AQI.map((_, i) => i);
  const best = pool.reduce((b, i) => (SAMPLE_AQI[i] < SAMPLE_AQI[b] ? i : b), pool[0]);
  return { ...g, statuses, best, safeCount: statuses.filter((s) => s === 'safe').length };
});
const BEST_STEPS = new Set(JUDGED.map((g) => g.best));

/* ── geometry (viewBox units) ──────────────────────────────────────────── */
const PAD_X = 4;
const PAD_Y = 6;
const HEAD_Y = PAD_Y + 12; // header tag baseline
const CHART_TOP = PAD_Y + 30;
const AQI_MAX = 120; // chart ceiling, leaves room for value labels
const GRID_AQI = [50, 100];
const STEP_ROW_GAP = 22; // chart baseline to the step numbers' baseline
const LANE_FIRST_GAP = 28; // step numbers to the first lane's centre
const LANE_PITCH = 30;
const CELL_H = 14;
const CELL_GAP = 5; // between cells in a lane
const BEST_RING = 3; // ring offset around a best cell
const NUM_GAP = 10; // gutter's right edge to the threshold numbers
const NAME_GAP = 14; // longest name to its threshold number
const LEGEND_GAP = 32; // last lane to the legend baseline
const SWATCH_W = 18;
const DOT_R = 3.5;
const DOT_R_ON = 5;
const HALO_R = 11;

// Fitted widths: 13u text lands at 11.4px on a 420px render (wide) and at
// 10.6px on a 300px render (compact)
const WIDE = { key: 'wide', viewW: 480, chartH: 104, hide: '@max-[440px]:hidden' };
const COMPACT = { key: 'compact', viewW: 368, chartH: 92, hide: '@min-[440px]:hidden' };

/* ── type (viewBox units) ──────────────────────────────────────────────── */
const T = { name: 14.5, num: 13, value: 13, tag: 13, legend: 13.5 };
const TAG_TRACK_EM = 0.08;
const MONO_EM = 0.6;
const FIT = 1.05;
const HEAD_LEFT = 'SAMPLE FORECAST · AQI';
const HEAD_RIGHT = '3-HOUR STEPS';
const SAFE_HEAD = 'SAFE BELOW';
const BEST_TAG = 'BEST';

/* ── tone ──────────────────────────────────────────────────────────────── */
const TRANSITION_MS = 360;
const CSS_EASE = `cubic-bezier(${EASE_OUT.join(',')})`;
const TRANSITION = ['opacity', 'fill', 'stroke']
  .map((prop) => `${prop} ${TRANSITION_MS}ms ${CSS_EASE}`)
  .join(', ');

/* ── motion ────────────────────────────────────────────────────────────── */
const IN_VIEW = { once: true, amount: 0.3 }; // the entrance: plays once
const ON_SCREEN = { amount: 0.3 }; // the sweep: runs only while visible
const ENTER = { curve: 0.15, curveDur: 1.0, dotStep: 0.12, lanes: 0.35, laneStep: 0.08, dur: 0.6, slide: 8, legend: 0.9 };
const CURSOR_S = 0.45;
// one cycle: empty (also covers the entrance), one phase per step, the summary
const PHASE = { empty: 0, summary: STEPS + 1 };
const CYCLE = STEPS + 2;
const PHASE_MS = { empty: 1500, step: 1500, summary: 4200 };

/* ── helpers ───────────────────────────────────────────────────────────── */
const NARROW = new Set("iljI.,:;!|'·");
const SLIM = new Set('frt()-/');
const BROAD = new Set('mwMW');
const sansEm = (ch) =>
  ch === ' ' ? 0.28 : NARROW.has(ch) ? 0.27 : SLIM.has(ch) ? 0.36 : BROAD.has(ch) ? 0.84 : ch >= 'A' && ch <= 'Z' ? 0.68 : 0.57;
const sansWidth = (text, size) => FIT * [...text].reduce((w, ch) => w + sansEm(ch), 0) * size;
const monoWidth = (text, size, track = 0) => FIT * text.length * size * (MONO_EM + track);
const r2 = (n) => Math.round(n * 100) / 100;
const pad2 = (n) => String(n).padStart(2, '0');

const NAME_W = Math.max(...GROUPS.map((g) => sansWidth(g.name, T.name)));
const NUM_W = Math.max(...GROUPS.map((g) => monoWidth(String(g.safe), T.num)), ...GRID_AQI.map((v) => monoWidth(String(v), T.num)));
const GUTTER_END = r2(PAD_X + NAME_W + NAME_GAP + NUM_W + NUM_GAP);

/* ── layout, fitted once per mode ──────────────────────────────────────── */
function fitLayout({ key, viewW, chartH, hide }) {
  const pitch = (viewW - PAD_X - GUTTER_END) / STEPS;
  const colX = (i) => r2(GUTTER_END + pitch * (i + 0.5));
  const base = CHART_TOP + chartH;
  const yOf = (aqi) => r2(base - (aqi / AQI_MAX) * chartH);
  const pts = SAMPLE_AQI.map((aqi, i) => ({ x: colX(i), y: yOf(aqi), aqi }));

  // smooth, never overshooting: horizontal control points between samples
  const line = pts.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const q = pts[i - 1];
    const mx = r2((q.x + p.x) / 2);
    return `${d} C ${mx},${q.y} ${mx},${p.y} ${p.x},${p.y}`;
  }, '');
  const left = r2(GUTTER_END);
  const right = r2(viewW - PAD_X);
  const area = `${line} L ${pts[STEPS - 1].x},${base} L ${pts[0].x},${base} Z`;

  const stepY = r2(base + STEP_ROW_GAP);
  const laneYs = JUDGED.map((_, li) => r2(stepY + LANE_FIRST_GAP + li * LANE_PITCH));
  const lastLane = laneYs[laneYs.length - 1];
  const legendY = r2(lastLane + LEGEND_GAP);
  const viewH = r2(legendY + 5 + PAD_Y);

  return {
    key,
    hide,
    viewW,
    viewH,
    pitch: r2(pitch),
    cellW: r2(pitch - CELL_GAP),
    colX,
    base: r2(base),
    left,
    right,
    grid: GRID_AQI.map((v) => ({ v, y: yOf(v) })),
    pts,
    line,
    area,
    stepY,
    laneYs,
    legendY,
    cursorTop: CHART_TOP - 4,
    cursorBottom: r2(lastLane + CELL_H / 2 + 6),
  };
}

const LAYOUTS = [fitLayout(WIDE), fitLayout(COMPACT)];

/* ── words (caption + screen readers) ──────────────────────────────────── */
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const word = (n) => NUMBER_WORDS[n] ?? String(n);
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const lower = (g) => g.name.toLowerCase();

function stepSentence(i) {
  const parts = ['safe', 'caution', 'unsafe']
    .map((s) => ({ s, groups: JUDGED.filter((g) => g.statuses[i] === s).map(lower) }))
    .filter((p) => p.groups.length)
    .map((p) => `${p.s} for ${list(p.groups)}`);
  return `Step ${i + 1}, AQI ${SAMPLE_AQI[i]}: ${parts.join('; ')}.`;
}

const WINDOWS = [...JUDGED].sort((a, b) => b.safeCount - a.safeCount).map((g) => `${lower(g)} ${g.safeCount}`);
const BEST_TEXT =
  BEST_STEPS.size === 1
    ? `Best step for every group: step ${JUDGED[0].best + 1}, AQI ${SAMPLE_AQI[JUDGED[0].best]}.`
    : `Best steps: ${list(JUDGED.map((g) => `${lower(g)} step ${g.best + 1}`))}.`;
const SUMMARY = `Safe steps out of ${STEPS}: ${list(WINDOWS)}. ${BEST_TEXT}`;
const INTRO = `One sample AQI per step, judged for ${word(GROUPS.length)} groups.`;

const SR_TEXT = [
  `A sample ${word(STEPS)}-step AQI forecast (${SAMPLE_AQI.join(', ')}, illustrative values) judged by AirCast's safety engine for ${word(GROUPS.length)} groups.`,
  ...JUDGED.map(
    (g) =>
      `${g.name}, safe below ${g.safe}, caution below ${g.caution}: safe at ${g.safeCount} of ${STEPS} steps${
        g.statuses.includes('unsafe') ? `, unsafe at step ${list(g.statuses.flatMap((s, i) => (s === 'unsafe' ? [i + 1] : [])).map(String))}` : ''
      }.`,
  ),
  BEST_TEXT,
].join(' ');

/* ── pieces ────────────────────────────────────────────────────────────── */

/** Tracked uppercase mono tag. */
function Tag({ x, y, anchor = 'start', fill, children }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className="font-mono" fontSize={T.tag} fontWeight="500" letterSpacing={r2(T.tag * TAG_TRACK_EM)} fill={fill}>
      {children}
    </text>
  );
}

/** One cell of a lane: an empty track, with its status laid over once resolved. */
function Cell({ x, y, w, status, resolved, best, accent }) {
  const left = r2(x - w / 2);
  const top = r2(y - CELL_H / 2);
  const look = {
    safe: { fill: accent, stroke: accent },
    caution: { fill: alpha(accent, 0.14), stroke: alpha(accent, 0.55) },
    unsafe: { fill: alpha(P.alert, 0.16), stroke: alpha(P.alert, 0.7) },
  }[status];
  return (
    <>
      <rect x={left} y={top} width={w} height={CELL_H} rx={CELL_H / 2} fill="none" stroke={P.line} strokeWidth="1" />
      <rect
        x={left}
        y={top}
        width={w}
        height={CELL_H}
        rx={CELL_H / 2}
        fill={look.fill}
        stroke={look.stroke}
        strokeWidth="1"
        style={{ opacity: resolved ? 1 : 0, transition: TRANSITION }}
      />
      <rect
        x={r2(left - BEST_RING)}
        y={r2(top - BEST_RING)}
        width={r2(w + 2 * BEST_RING)}
        height={CELL_H + 2 * BEST_RING}
        rx={CELL_H / 2 + BEST_RING}
        fill="none"
        stroke={accent}
        strokeWidth="1.25"
        style={{ opacity: best ? 1 : 0, transition: TRANSITION }}
      />
    </>
  );
}

function Legend({ layout, accent }) {
  const items = [
    { label: 'Safe', fill: accent, stroke: accent },
    { label: 'Caution', fill: alpha(accent, 0.14), stroke: alpha(accent, 0.55) },
    { label: 'Unsafe', fill: alpha(P.alert, 0.16), stroke: alpha(P.alert, 0.7) },
  ];
  let x = PAD_X;
  return items.map((it) => {
    const at = x;
    x += SWATCH_W + 7 + sansWidth(it.label, T.legend) + 16;
    return (
      <g key={it.label}>
        <rect x={r2(at)} y={layout.legendY - 9} width={SWATCH_W} height="10" rx="5" fill={it.fill} stroke={it.stroke} strokeWidth="1" />
        <text x={r2(at + SWATCH_W + 7)} y={layout.legendY} className="font-sans" fontSize={T.legend} fill={P.inkMuted}>
          {it.label}
        </text>
      </g>
    );
  });
}

/** One layout of the figure, as one SVG. */
function SafetySvg({ layout, phase, shown, reduce, accent }) {
  const cursor = phase > PHASE.empty && phase < PHASE.summary ? phase - 1 : -1;
  const resolvedUpTo = phase === PHASE.summary ? STEPS : cursor + 1; // cells with index below this are resolved
  const summary = phase === PHASE.summary;
  // hidden, the cursor stays put: it fades out on the last step, then resets to step 1 unseen
  const cursorX = layout.colX(cursor >= 0 ? cursor : summary ? STEPS - 1 : 0);

  const enter = (delay, from = {}) => ({
    initial: reduce ? false : { opacity: 0, ...from },
    animate: shown ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...from },
    transition: { duration: ENTER.dur, ease: EASE_OUT, delay },
  });

  return (
    <svg
      viewBox={`0 0 ${layout.viewW} ${layout.viewH}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={`block h-auto w-full ${layout.hide}`}
    >
      {/* header + the chart's grid, in the same units as the thresholds below */}
      <motion.g {...enter(0)}>
        <Tag x={PAD_X} y={HEAD_Y} fill={P.inkSubtle}>
          {HEAD_LEFT}
        </Tag>
        <Tag x={layout.right} y={HEAD_Y} anchor="end" fill={P.inkSubtle}>
          {HEAD_RIGHT}
        </Tag>
        <line x1={layout.left} y1={layout.base} x2={layout.right} y2={layout.base} stroke={P.lineHi} strokeWidth="1" />
        {layout.grid.map((g) => (
          <g key={g.v}>
            <line x1={layout.left} y1={g.y} x2={layout.right} y2={g.y} stroke={P.line} strokeWidth="1" strokeDasharray="2 4" />
            <text x={GUTTER_END - NUM_GAP} y={g.y + 4.5} textAnchor="end" className="font-mono" fontSize={T.num} fill={P.inkSubtle}>
              {g.v}
            </text>
          </g>
        ))}
      </motion.g>

      {/* the forecast cursor: one step, through the curve and all five lanes */}
      <motion.g
        initial={false}
        animate={{ x: cursorX, opacity: cursor >= 0 ? 1 : 0 }}
        transition={{ x: { duration: cursor <= 0 ? 0 : CURSOR_S, ease: EASE_OUT }, opacity: { duration: 0.3 } }}
      >
        <rect x={-layout.pitch / 2} y={layout.cursorTop} width={layout.pitch} height={layout.cursorBottom - layout.cursorTop} fill={alpha(accent, 0.05)} />
        <line x1="0" y1={layout.cursorTop} x2="0" y2={layout.cursorBottom} stroke={alpha(accent, 0.4)} strokeWidth="1" />
      </motion.g>

      {/* the sample curve */}
      <motion.path d={layout.area} fill={alpha(accent, 0.07)} {...enter(ENTER.curve + ENTER.curveDur * 0.6)} />
      <motion.path
        d={layout.line}
        fill="none"
        stroke={accent}
        strokeWidth="1.75"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: shown ? 1 : 0 }}
        transition={{ duration: ENTER.curveDur, ease: EASE_OUT, delay: ENTER.curve }}
      />
      {layout.pts.map((p, i) => {
        const on = i === cursor;
        const isBest = summary && BEST_STEPS.has(i);
        const lit = on || isBest;
        return (
          <motion.g key={i} {...enter(ENTER.curve + i * ENTER.dotStep, { y: 4 })}>
            <circle cx={p.x} cy={p.y} r={HALO_R} fill={alpha(accent, 0.18)} style={{ opacity: lit ? 1 : 0, transition: TRANSITION }} />
            <circle
              cx={p.x}
              cy={p.y}
              r={lit ? DOT_R_ON : DOT_R}
              fill={i < resolvedUpTo || lit ? accent : P.surface}
              stroke={accent}
              strokeWidth="1.25"
              style={{ transition: TRANSITION }}
            />
            <text
              x={p.x}
              y={r2(p.y - 11)}
              textAnchor="middle"
              className="font-mono"
              fontSize={T.value}
              fontWeight={lit ? 600 : 400}
              style={{ fill: lit ? P.ink : P.inkSubtle, transition: TRANSITION }}
            >
              {p.aqi}
            </text>
            {BEST_STEPS.has(i) && (
              <g style={{ opacity: summary ? 1 : 0, transition: TRANSITION }}>
                <Tag x={r2(p.x + (T.tag * TAG_TRACK_EM) / 2)} y={r2(p.y - 28)} anchor="middle" fill={accent}>
                  {BEST_TAG}
                </Tag>
              </g>
            )}
          </motion.g>
        );
      })}

      {/* step numbers, and the thresholds' column head */}
      <motion.g {...enter(ENTER.lanes)}>
        <Tag x={GUTTER_END - NUM_GAP} y={layout.stepY} anchor="end" fill={P.inkSubtle}>
          {SAFE_HEAD}
        </Tag>
        {layout.pts.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={layout.stepY}
            textAnchor="middle"
            className="font-mono"
            fontSize={T.num}
            style={{ fill: i === cursor || (summary && BEST_STEPS.has(i)) ? accent : P.inkSubtle, transition: TRANSITION }}
          >
            {pad2(i + 1)}
          </text>
        ))}
      </motion.g>

      {/* one lane per group: name, safe-below threshold, one cell per step */}
      {JUDGED.map((g, li) => {
        const y = layout.laneYs[li];
        return (
          <motion.g key={g.key} {...enter(ENTER.lanes + (li + 1) * ENTER.laneStep, { x: -ENTER.slide })}>
            <text x={PAD_X} y={y + 5} className="font-sans" fontSize={T.name} fontWeight="500" fill={P.ink}>
              {g.name}
            </text>
            <text x={GUTTER_END - NUM_GAP} y={y + 4.5} textAnchor="end" className="font-mono" fontSize={T.num} fill={P.inkSubtle}>
              {g.safe}
            </text>
            {g.statuses.map((s, i) => (
              <Cell
                key={i}
                x={layout.colX(i)}
                y={y}
                w={layout.cellW}
                status={s}
                resolved={i < resolvedUpTo}
                best={summary && g.best === i}
                accent={accent}
              />
            ))}
          </motion.g>
        );
      })}

      <motion.g {...enter(ENTER.legend)}>
        <Legend layout={layout} accent={accent} />
      </motion.g>
    </svg>
  );
}

/* ── the figure ────────────────────────────────────────────────────────── */

export default function Hero({ accent = P.accent }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const entered = useInView(ref, IN_VIEW);
  // not latched: scrolled away, the sweep pauses where it is
  const onScreen = useInView(ref, ON_SCREEN);
  const [tick, setTick] = useState(0);

  const loopPhase = tick % CYCLE;
  const phase = reduce ? PHASE.summary : loopPhase;

  // the sweep: one phase per timer, setState only inside the callback
  useEffect(() => {
    if (reduce || !entered || !onScreen) return undefined;
    const ms = loopPhase === PHASE.empty ? PHASE_MS.empty : loopPhase === PHASE.summary ? PHASE_MS.summary : PHASE_MS.step;
    const id = setTimeout(() => setTick((t) => t + 1), ms);
    return () => clearTimeout(id);
  }, [reduce, entered, onScreen, loopPhase, tick]);

  const caption = phase === PHASE.summary ? SUMMARY : phase === PHASE.empty ? INTRO : stepSentence(phase - 1);

  return (
    // @container: each layout shows or hides itself by the wrapper's width
    <div ref={ref} className="@container mx-auto w-full max-w-[560px]">
      <p className="sr-only">{SR_TEXT}</p>
      {LAYOUTS.map((layout) => (
        <SafetySvg key={layout.key} layout={layout} phase={phase} shown={reduce || entered} reduce={reduce} accent={accent} />
      ))}
      <p aria-live="polite" className="mx-auto mt-4 min-h-[3.25rem] max-w-[46ch] text-center text-sm leading-snug text-ink-muted">
        {caption}
      </p>
    </div>
  );
}
