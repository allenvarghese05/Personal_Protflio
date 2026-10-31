'use client';

/**
 * Quality — how it's tested and shipped, rendered from the `build` prop ({ totals, ci, suites }) — e.g. BUILD in
 * src/data/studies/iet.js. Three blocks, top to bottom:
 *
 *   totals   the history in numbers (pull requests, commits, lines, client
 *            decisions). Four cells on hairlines, the value in ink display
 *            type (amber stays with the lane that's running) and the label in mono.
 *   ci       the workflows as lanes in one panel. Each lane has the workflow's
 *            name in mono, when it runs as a quiet tag, then its steps as a
 *            left-to-right chain of chips joined by hairline arrows, ending in
 *            a check. Once the panel is a third in view the lanes run: they
 *            start one beat apart, and in each one the steps light one at a
 *            time (amber while it's the current step, settled once passed).
 *            The jade check lands when a lane's last step passes. The readout
 *            counts the lanes through, and announces the total once (steps
 *            and workflows, counted from the data). Replay runs it again.
 *   suites   the test suites, as a compact row of four.
 *
 * Every number and label is BUILD's; the counts in the caption and readout
 * are computed from it. The chips are real list items, so the chain reads as
 * text; arrows, checks and lane state are decorative.
 *
 * Motion: blocks fade up once in view. Lanes advance on a beat timer that
 * only runs while the sequence is playing. Reduced motion: every lane is
 * already through, every check is shown, there is no Replay and nothing
 * plays.
 *
 * Layout: container queries. Totals and suites are two a row, then four from
 * 42rem. Inside the panel, a lane stacks (name and tag above the chain) until
 * the panel is 42rem wide, then the name sits in a fixed column beside the
 * chain. The chain wraps at any width, and long step names wrap inside their
 * chip, so nothing overflows at 360px.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';

/* ── constants ─────────────────────────────────────────────────────────── */
const BLOCK_VIEW = { once: true, amount: 0.2 };
const PANEL_VIEW = { once: true, amount: 0.35 }; // lanes run when a third shows
const RISE_PX = 16;
const RISE_S = 0.6;
const DISPLAY_H3 = 'font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink';

const BEAT_MS = 320; // one step is the current step for one beat
const LANE_LAG = 1; // beats between one lane starting and the next
const CHECK_S = 0.35;

/** Each lane's first beat, the beat at which every lane is through, and the step count. */
function lanesOf(ci = []) {
  const lanes = ci.map((lane, i) => ({ ...lane, from: i * LANE_LAG }));
  return {
    lanes,
    endBeat: Math.max(0, ...lanes.map((l) => l.from + l.steps.length)),
    stepCount: lanes.reduce((sum, l) => sum + l.steps.length, 0),
  };
}

/** A step's state at a beat: before its turn, its turn, or passed. */
function stepState(beat, lane, j) {
  const at = lane.from + j;
  if (beat < at) return 'idle';
  return beat === at ? 'run' : 'pass';
}

const laneDone = (beat, lane) => beat >= lane.from + lane.steps.length;

/** Chip colours per state. Amber marks only the step running now. */
function chipStyle(state, accent) {
  if (state === 'run') {
    return { color: accent, borderColor: alpha(accent, 0.55), background: alpha(accent, 0.08) };
  }
  if (state === 'pass') {
    return { color: P.inkMuted, borderColor: alpha(P.jade, 0.32), background: alpha(P.jade, 0.05) };
  }
  return { color: P.inkSubtle, borderColor: P.line, background: 'transparent' };
}

/* ── small pieces ──────────────────────────────────────────────────────── */

/** Fades its children up once a fifth of it is in view. */
function Rise({ reduce, className = '', children }) {
  const ref = useRef(null);
  const inView = useInView(ref, BLOCK_VIEW);
  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: RISE_PX }}
      animate={reduce || inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: RISE_S, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A row of figures on hairlines: label first in the DOM, value first on screen. */
function Figures({ items, compact }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 @2xl:grid-cols-4">
      {items.map((m) => (
        <div
          key={m.label}
          className={`flex min-w-0 flex-col-reverse justify-end border-t border-line ${compact ? 'pb-4 pt-3' : 'pb-6 pt-4'}`}
        >
          <dt
            className={
              compact
                ? 'mt-1.5 text-label leading-snug text-ink-muted'
                : 'mt-2.5 max-w-[20ch] font-mono text-micro font-medium uppercase leading-snug tracking-[0.14em] text-ink-subtle'
            }
          >
            {m.label}
          </dt>
          <dd
            className={
              compact
                ? 'font-display text-2xl font-semibold leading-none tracking-tight tabular-nums text-ink'
                : 'font-display text-3xl font-bold leading-none tracking-tight tabular-nums text-ink'
            }
          >
            {m.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A hairline arrow between chips; jade once the step before it has passed. */
function Arrow({ lit }) {
  return (
    <svg
      viewBox="0 0 20 8"
      width="20"
      height="8"
      aria-hidden="true"
      className="mx-1 block shrink-0"
    >
      <path
        d="M1 4 H17 M14 1.5 L17.5 4 L14 6.5"
        fill="none"
        stroke={lit ? alpha(P.jade, 0.6) : P.lineHi}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-[stroke] duration-300 motion-reduce:transition-none"
      />
    </svg>
  );
}

/** The end of a lane: an idle ring, then a jade check that pops in. */
function Check({ done, reduce }) {
  return (
    <span aria-hidden="true" className="relative block h-[18px] w-[18px] shrink-0">
      <svg viewBox="0 0 18 18" width="18" height="18" className="absolute inset-0 block">
        <circle cx="9" cy="9" r="7.5" fill="none" stroke={P.lineHi} strokeWidth="1" strokeDasharray="2 2.4" />
      </svg>
      <motion.svg
        viewBox="0 0 18 18"
        width="18"
        height="18"
        className="absolute inset-0 block"
        initial={false}
        animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.5 }}
        transition={reduce ? { duration: 0 } : { duration: CHECK_S, ease: EASE_OUT }}
      >
        <circle cx="9" cy="9" r="7.5" fill={alpha(P.jade, 0.14)} stroke={P.jade} strokeWidth="1.25" />
        <path
          d="M5.6 9.2 L7.9 11.5 L12.4 6.8"
          fill="none"
          stroke={P.jade}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    </span>
  );
}

const REPLAY_ICON = (
  <>
    <path d="M9.6 6.4A3.6 3.6 0 1 1 6 2.4h1.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6.9 0.6l2 1.8-2 1.8z" fill="currentColor" />
  </>
);

function ReplayButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mc-ghost-btn inline-flex min-h-8 shrink-0 items-center gap-2 rounded-md border border-line px-2.5 uppercase hover:border-line-hi"
    >
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12">
        {REPLAY_ICON}
      </svg>
      Replay
    </button>
  );
}

/* ── the lanes ─────────────────────────────────────────────────────────── */

function Lane({ lane, beat, accent, reduce }) {
  const done = laneDone(beat, lane);
  const lastIndex = lane.steps.length - 1;

  return (
    <li className="grid min-w-0 gap-3 py-4 first:pt-0 last:pb-0 @2xl:grid-cols-[11rem_minmax(0,1fr)] @2xl:items-center @2xl:gap-6">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 @2xl:flex-col @2xl:items-start">
        <span className="font-mono text-label font-medium leading-none text-ink">{lane.name}</span>
        <span className="rounded-chip border border-line px-2 py-1 font-mono text-micro leading-none text-ink-subtle">
          {lane.when}
        </span>
      </div>

      <ol aria-label={`${lane.name} steps`} className="flex min-w-0 flex-wrap items-center gap-y-2">
        {lane.steps.map((step, j) => {
          const state = stepState(beat, lane, j);
          return (
            <li key={step} className="flex min-w-0 max-w-full items-center">
              {j > 0 && <Arrow lit={stepState(beat, lane, j - 1) === 'pass'} />}
              <span
                className="min-w-0 break-words rounded-chip border px-2.5 py-1.5 font-mono text-micro leading-tight transition-[color,background-color,border-color] duration-300 motion-reduce:transition-none"
                style={chipStyle(state, accent)}
              >
                {step}
              </span>
              {j === lastIndex && (
                <>
                  <Arrow lit={done} />
                  <Check done={done} reduce={reduce} />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </li>
  );
}

function Lanes({ ci, accent, reduce }) {
  const { lanes: LANES, endBeat: END_BEAT, stepCount: STEP_COUNT } = lanesOf(ci);
  const ref = useRef(null);
  const inView = useInView(ref, PANEL_VIEW);
  const [beat, setBeat] = useState(0);
  const [run, setRun] = useState(0); // bumps on Replay, restarting the timer

  // Advance one beat at a time until every lane is through. setBeat only runs
  // inside the timer; Replay resets the beat in its click handler.
  useEffect(() => {
    if (reduce || !inView) return undefined;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setBeat(n);
      if (n >= END_BEAT) clearInterval(id);
    }, BEAT_MS);
    return () => clearInterval(id);
  }, [reduce, inView, run, END_BEAT]);

  // before it's in view nothing has run; reduced motion is the end state
  let at = -1;
  if (reduce) at = END_BEAT;
  else if (inView) at = beat;

  const through = LANES.filter((l) => laneDone(at, l)).length;
  const finished = at >= END_BEAT;
  const replay = () => {
    setBeat(0);
    setRun((r) => r + 1);
  };

  return (
    <div ref={ref} className="mc-panel @container flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <span className="mc-label">CI · {LANES.length} workflows</span>
        {!reduce && <ReplayButton onClick={replay} />}
      </div>

      <ol aria-label="Workflows" className="mt-5 min-w-0 divide-y divide-line">
        {LANES.map((lane) => (
          <Lane key={lane.name} lane={lane} beat={at} accent={accent} reduce={reduce} />
        ))}
      </ol>

      <div
        aria-live="polite"
        className="mt-5 flex min-h-[3.25rem] flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-4"
      >
        {at >= 0 && (
          <>
            <span
              aria-hidden="true"
              className="mc-chip mc-chip--accent font-medium tabular-nums"
              style={{ '--chip': finished ? P.jade : accent }}
            >
              {through} / {LANES.length}
            </span>
            <span aria-hidden="true" className="text-label text-ink-muted">
              {finished ? `workflows · ${STEP_COUNT} steps` : 'workflows through'}
            </span>
            {finished && (
              <span className="sr-only">
                All {LANES.length} workflows through, {STEP_COUNT} steps.
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── the block ─────────────────────────────────────────────────────────── */

export default function Quality({ build = {}, accent = P.accent }) {
  const reduce = useReducedMotion();
  const TOTALS = build.totals ?? [];
  const SUITES = build.suites ?? [];
  const LANES = build.ci ?? [];

  return (
    <div className="@container min-w-0">
      {TOTALS.length > 0 && (
        <Rise reduce={reduce}>
          <h3 className="mc-label">By the numbers</h3>
          <div className="mt-5">
            <Figures items={TOTALS} />
          </div>
        </Rise>
      )}

      {LANES.length > 0 && (
        <Rise reduce={reduce} className="mt-14">
          <h3 className={DISPLAY_H3}>How it’s tested and shipped</h3>
          <div className="mt-6">
            <Lanes ci={LANES} accent={accent} reduce={reduce} />
          </div>
        </Rise>
      )}

      {SUITES.length > 0 && (
        <Rise reduce={reduce} className="mt-12">
          <h3 className="mc-label">Test suites</h3>
          <div className="mt-5">
            <Figures items={SUITES} compact />
          </div>
        </Rise>
      )}
    </div>
  );
}
