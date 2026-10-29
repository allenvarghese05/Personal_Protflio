'use client';

/**
 * Performance — "The heaviest report went from 146.7 s to 1.28 s — and
 * returned the same bytes."
 *
 * Recruiters read this section hardest, so every number comes with what it
 * was measured against. The headline is never shown on its own:
 *
 *   headline   146.7 s → 1.28 s in display type, each number captioned with
 *              the connection it was measured on, then the endpoint in mono.
 *              The headline crosses connections (transaction pooler before,
 *              session pooler after), so the same-connection split follows
 *              straight away. Each connection gets one row: before → after,
 *              a thin bar pair on one linear scale, and the factor computed
 *              from the two numbers. The measurement conditions close the block.
 *   causes     where the time went: four figures, then the equation, with
 *              "sequential round trips" in the accent.
 *   wave       the centrepiece panel. Before draws every round trip the old
 *              report waited on, end to end and lane by lane (it takes ~2 s on
 *              purpose). After draws the auth lookup, then one Promise.all:
 *              sixteen bars at the same x. One bar is one round trip; the
 *              bars are not to time scale.
 *   endpoints  every endpoint as a before / after bar pair on a log scale
 *              (said under the axis), the factor at the end of each row, the
 *              headline's row in brighter ink. A connection toggle picks the
 *              pooler (default: the session pooler, the headline's "after"),
 *              and the live readout sums it up: how many got faster, and the
 *              smallest to largest factor. An sr-only table carries every number.
 *   fixes      what changed, 01–04.
 *   proof      byte-identical responses and equivalence checks, in jade.
 *   after      since then · kept fast in CI.
 *
 * Renders only from PERF in src/data/studies/iet.js. Computed from it: the
 * seconds, the factors and their spread, which connection each half of the
 * headline was measured on, the depth of each wave, and the log domain with
 * its gridlines.
 *
 * Motion: blocks fade up once in view and bars grow with EASE_OUT. The wave
 * panel draws Before once a third of it is in view. Then it waits: the After
 * chip pulses softly and the reader's click does the rest. Reduced motion:
 * every block, bar and readout is already in its final state, and nothing
 * autoplays.
 *
 * Layout: a single column. Rows that pair a label with bars and numbers switch
 * on container width. Narrow: the label sits above the bars. Wide: everything
 * is on one line. Nothing overflows between 360px and 1440px.
 */
import { Fragment, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { PERF } from '@/data/studies/iet';

/* ── constants ─────────────────────────────────────────────────────────── */
// .mc-label is unlayered CSS, so its colour can't be overridden by a utility.
// This is the same voice for labels that need a different ink.
const LABEL = 'font-mono text-micro font-medium uppercase tracking-[0.18em]';
const BLOCK_VIEW = { once: true, amount: 0.2 };
const PANEL_VIEW = { once: true, amount: 0.35 }; // the wave draws when a third shows
const RISE_PX = 16;
const RISE_S = 0.6;
// the headline numbers, the largest type on the page (weight set per use)
const HEAD_TYPE =
  'block whitespace-nowrap font-display text-[2.75rem] leading-[1.04] tracking-[-0.035em] sm:text-6xl md:text-7xl lg:text-8xl';
const GROW_S = 0.9; // a bar growing to its length
const GROW_STAGGER_S = 0.04; // between endpoint rows
const SPLIT_DELAY_S = 0.35; // the headline lands, then the split's bars grow

/* wave panel */
const DRAW_S = 2.1; // the whole Before draw. Long, on purpose.
const SNAP_S = 0.18; // After: one slot to the next
const BAR_S = 0.18; // one bar growing in
const HEAD_S = 0.4; // a bar's amber "drawing now" fading to its resting tone
const PULSE_GAP_S = 0.5; // the Before draw ends, then the After chip pulses
const BAR_H = 6;
const STACK_GAP = 2;
const BAR_FILL = 0.72; // the share of its slot a bar fills; the rest is gap

/* endpoint chart (px): each bar gets a row, and its value shares the height */
const PAIR_ROW = 14;
const PAIR_BAR = 8;

/* before = hollow slate, after = filled jade. Same encoding in every chart. */
const BAR_TONE = {
  before: { background: P.surface, boxShadow: `inset 0 0 0 1px ${alpha(P.slate, 0.85)}` },
  after: { background: P.jade },
};
const WAVE_TONE = { before: P.slate, after: P.jade };

/* ── formatting ────────────────────────────────────────────────────────── */

/** 146709 → '146.7', 1278 → '1.28': three significant figures, one decimal past 100 s. */
function secondsOf(ms) {
  const v = ms / 1000;
  return v >= 100 ? v.toFixed(1) : v.toPrecision(3);
}
const fmtMs = (ms) => (ms < 1000 ? `${ms} ms` : `${secondsOf(ms)} s`);
/** before ÷ after as a factor: whole numbers from 10× up, one decimal below. */
function factorOf(before, after) {
  const f = before / after;
  return `${f >= 10 ? Math.round(f) : f.toFixed(1)}×`;
}
const plural = (n, one, many) => (n === 1 ? one : many);
const pad2 = (n) => String(n).padStart(2, '0');

/* ── derived once from the study data ──────────────────────────────────── */
const HERO = PERF.hero;
const SAME = HERO.same;
// the connection each half of the headline was measured on
const HERO_FROM = SAME.find((c) => c.before === HERO.before);
const HERO_TO = SAME.find((c) => c.after === HERO.after);
const CROSSES = Boolean(HERO_FROM && HERO_TO && HERO_FROM !== HERO_TO);
const SAME_MAX = Math.max(...SAME.flatMap((c) => [c.before, c.after]));

/**
 * Lay round-trip groups end to end: the lane's first slot, its bars
 * (slot × row) and its track height. A `parallel` group stacks its bars at one
 * x, because a Promise.all is one round trip deep.
 */
function laneUp(groups) {
  let next = 0;
  return groups.map((g, i) => {
    const rows = Math.max(1, g.parallel ?? 1);
    const offset = next;
    next += g.count;
    const bars = [];
    for (let c = 0; c < g.count; c += 1) {
      for (let r = 0; r < rows; r += 1) bars.push({ slot: offset + c, row: r });
    }
    return {
      key: `${i}-${g.label}`,
      label: g.label,
      count: g.count,
      parallel: rows,
      offset,
      bars,
      height: rows * BAR_H + (rows - 1) * STACK_GAP,
    };
  });
}
const MODES = ['before', 'after'];
const MODE_LABEL = { before: 'Before', after: 'After' };
const LANES = { before: laneUp(PERF.waves.before), after: laneUp(PERF.waves.after) };
const DEPTH = Object.fromEntries(MODES.map((m) => [m, LANES[m].reduce((n, l) => n + l.count, 0)]));
const SLOTS = Math.max(DEPTH.before, DEPTH.after, 1); // one axis for both modes
const WAVE_TIMING = Object.fromEntries(
  MODES.map((m) => {
    const step = m === 'before' ? DRAW_S / Math.max(1, DEPTH.before) : SNAP_S;
    return [m, { step, end: Math.max(0, DEPTH[m] - 1) * step + BAR_S }];
  })
);

/* the endpoint chart: one toggle per connection, one log axis for both */
const CONNECTIONS = SAME.map((c) => ({ key: c.pooler, label: `${c.pooler} · ${c.name}` }));
const DEFAULT_CONNECTION = HERO_TO?.pooler ?? CONNECTIONS[0]?.key;
const timesFor = (row, pooler) => ({ before: row[`b${pooler}`], after: row[`a${pooler}`] });
const ALL_MS = PERF.rows
  .flatMap((r) => CONNECTIONS.flatMap((c) => Object.values(timesFor(r, c.key))))
  .filter((v) => v > 0);

/** Round up to 1, 2 or 5 × a power of ten. */
function niceCeil(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].find((k) => k * p >= v) * p;
}
const LOG_LO = 10 ** Math.floor(Math.log10(Math.min(...ALL_MS)));
const LOG_HI = niceCeil(Math.max(...ALL_MS));
const logAt = (ms) => (Math.log10(ms) - Math.log10(LOG_LO)) / (Math.log10(LOG_HI) - Math.log10(LOG_LO));
const DECADES = Array.from({ length: Math.floor(Math.log10(LOG_HI / LOG_LO)) + 1 }, (_, i) => LOG_LO * 10 ** i);
const tickLabel = (ms) => (ms < 1000 ? `${ms} ms` : `${ms / 1000} s`);
// per connection: how many endpoints got faster, and the smallest and largest factor
const SPREAD = Object.fromEntries(
  CONNECTIONS.map((c) => {
    const pairs = PERF.rows.map((r) => timesFor(r, c.key)).filter((t) => t.before > 0 && t.after > 0);
    const ratio = (t) => t.before / t.after;
    const lo = pairs.reduce((a, t) => (ratio(t) < ratio(a) ? t : a), pairs[0]);
    const hi = pairs.reduce((a, t) => (ratio(t) > ratio(a) ? t : a), pairs[0]);
    return [c.key, { total: pairs.length, faster: pairs.filter((t) => t.after < t.before).length, lo, hi }];
  })
);

// equation tokens: symbols are operators; the round-trip count is the lever
const IS_OPERATOR = /^[^\p{L}\p{N}]+$/u;
const IS_LEVER = /sequential/i;

/* ── motion helpers ────────────────────────────────────────────────────── */

/** Fade + rise once `shown`. With reduced motion: the final state, instantly. */
const rise = (shown, reduce, delay = 0) => ({
  initial: reduce ? false : { opacity: 0, y: RISE_PX },
  animate: shown ? { opacity: 1, y: 0 } : { opacity: 0, y: RISE_PX },
  transition: reduce ? { duration: 0 } : { duration: RISE_S, ease: EASE_OUT, delay },
});

/** The active choice: the user's pick, or `auto` once the panel is in view
 *  (straight away with reduced motion, as a final state). `run` goes up on
 *  every click, so the same choice can be replayed. */
function useRun(inView, reduce, auto) {
  const [choice, setChoice] = useState(null);
  const active = choice ?? (inView || reduce ? { key: auto, run: 0 } : null);
  const choose = (key) => setChoice((c) => ({ key, run: (c ? c.run : 0) + 1 }));
  return [active, choose];
}

/* ── small pieces ──────────────────────────────────────────────────────── */

/** A mono eyebrow heading, with an optional note on the right. */
function Eyebrow({ note, children }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
      <h3 className={`${LABEL} text-ink-subtle`}>{children}</h3>
      {note && <p className="font-mono text-micro text-ink-subtle [overflow-wrap:anywhere]">{note}</p>}
    </div>
  );
}

/** A block of the section that fades up once in view. */
function Block({ label, note, className = '', children }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, BLOCK_VIEW);
  return (
    <motion.div ref={ref} className={`min-w-0 ${className}`} {...rise(reduce || inView, reduce)}>
      {label && <Eyebrow note={note}>{label}</Eyebrow>}
      {children}
    </motion.div>
  );
}

/** Toggle buttons (aria-pressed on the active one). An optional `hint`
 *  pulses one chip a few times after `hint.delay`, then stops. */
function Choices({ label, options, value, onChoose, accent, hint }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChoose(o.key)}
            className={`relative rounded-chip border px-3 py-2 font-mono text-micro tracking-[0.04em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              on ? '' : 'border-line text-ink-muted hover:border-line-hi hover:text-ink'
            }`}
            style={on ? { color: accent, borderColor: alpha(accent, 0.5), background: alpha(accent, 0.08) } : undefined}
          >
            {o.label}
            {hint?.key === o.key && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-px rounded-chip"
                style={{ boxShadow: `0 0 0 1px ${alpha(accent, 0.75)}` }}
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: [0, 1, 0], scale: [1, 1, 1.16] }}
                transition={{ delay: hint.delay, duration: 1.4, times: [0, 0.25, 1], repeat: 2, repeatDelay: 0.8, ease: 'easeOut' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The panel an interactive figure sits in: caption + controls, body, footer. */
function PanelFrame({ caption, sub, controls, footer, live = false, children }) {
  return (
    <div className="mc-panel flex min-w-0 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="mc-label">{caption}</h3>
          {sub && <p className="font-mono text-micro text-ink-subtle [overflow-wrap:anywhere]">{sub}</p>}
        </div>
        {controls}
      </div>
      <div className="mt-6 min-w-0">{children}</div>
      <div
        aria-live={live ? 'polite' : undefined}
        className="mt-5 flex min-h-[3.25rem] items-center border-t border-line pt-4"
      >
        {footer}
      </div>
    </div>
  );
}

/** A readout line that lands once the figure has finished drawing. */
function Readout({ runKey, delay, reduce, children }) {
  return (
    <motion.div
      key={runKey}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { delay, duration: 0.35, ease: EASE_OUT }}
      className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5"
    >
      {children}
    </motion.div>
  );
}

/** A bar that grows from the left to `frac` of its track once `shown`. */
function GrowBar({ kind, frac, shown, reduce, delay = 0, row, bar }) {
  return (
    <span className="relative block" style={{ height: row }}>
      <motion.span
        className="absolute left-0 rounded-[2px]"
        style={{ ...BAR_TONE[kind], top: (row - bar) / 2, height: bar, minWidth: 2 }}
        initial={reduce ? false : { width: '0%' }}
        animate={{ width: shown ? `${frac * 100}%` : '0%' }}
        transition={reduce ? { duration: 0 } : { duration: GROW_S, ease: EASE_OUT, delay }}
      />
    </span>
  );
}

function Swatch({ kind }) {
  return <span aria-hidden="true" className="inline-block h-2 w-4 rounded-[2px]" style={BAR_TONE[kind]} />;
}

/** "146.7 s": the number, then a small unit (spoken as "seconds"). */
function Seconds({ ms }) {
  return (
    <>
      {secondsOf(ms)}
      <span aria-hidden="true" className="ml-[0.1em] text-[0.42em] font-medium tracking-normal text-ink-subtle">
        s
      </span>
      <span className="sr-only"> seconds</span>
    </>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true" className="block">
      <circle cx="14" cy="14" r="12.5" fill={alpha(P.jade, 0.12)} stroke={P.jade} strokeWidth="1.25" />
      <path
        d="M8.8 14.4 L12.4 18 L19.4 10.6"
        fill="none"
        stroke={P.jade}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── 1 · the headline, and the honest split under it ───────────────────── */

function SplitRow({ conn, shown, reduce, delay }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3 border-t border-line py-4 @2xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,9rem)]">
      <div className="order-1 min-w-0">
        <p className="text-label leading-snug">
          <span className="font-mono text-ink">{conn.pooler}</span> <span className="text-ink-muted">{conn.name}</span>
        </p>
        <p className="mt-1 font-mono text-label tabular-nums">
          <span className="text-ink-subtle">{fmtMs(conn.before)}</span>
          <span aria-hidden="true" className="text-ink-faint">
            {' → '}
          </span>
          <span className="sr-only"> to </span>
          <span className="text-ink">{fmtMs(conn.after)}</span>
        </p>
      </div>
      <div aria-hidden="true" className="order-3 col-span-2 flex min-w-0 flex-col gap-1 @2xl:order-2 @2xl:col-span-1">
        <GrowBar kind="before" frac={conn.before / SAME_MAX} shown={shown} reduce={reduce} delay={delay} row={8} bar={6} />
        <GrowBar kind="after" frac={conn.after / SAME_MAX} shown={shown} reduce={reduce} delay={delay + 0.1} row={8} bar={6} />
      </div>
      <p className="order-2 whitespace-nowrap text-right @2xl:order-3">
        <span className="font-display text-2xl font-semibold tabular-nums tracking-tight text-ink">
          {factorOf(conn.before, conn.after)}
        </span>
        <span className="ml-1.5 text-label text-ink-subtle">faster</span>
      </p>
    </li>
  );
}

/** One half of the headline: the number, and the connection it was measured on. */
function HeadFigure({ ms, when, conn, tone }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className={`${HEAD_TYPE} font-semibold ${tone}`}>
        <Seconds ms={ms} />
      </span>
      {conn && (
        <span className="mt-3 font-mono text-micro text-ink-subtle">
          {when}
          <span aria-hidden="true" className="text-ink-faint">
            {' · '}
          </span>
          <span className="sr-only">, on the </span>
          <span className="text-ink-muted">{conn.name}</span>
        </span>
      )}
    </span>
  );
}

function Headline() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, BLOCK_VIEW);
  const shown = reduce || inView;

  return (
    <div ref={ref} className="min-w-0">
      {/* each number says which connection it came from, right under it */}
      <motion.p {...rise(shown, reduce)} className="flex flex-wrap items-start gap-x-4 gap-y-6 sm:gap-x-6 lg:gap-x-8">
        <HeadFigure ms={HERO.before} when="before" conn={HERO_FROM} tone="text-ink-subtle" />
        <span className="flex min-w-0 items-start gap-x-4 sm:gap-x-6 lg:gap-x-8">
          <span aria-hidden="true" className={`${HEAD_TYPE} font-normal text-ink-faint`}>
            →
          </span>
          <span className="sr-only">, to </span>
          <HeadFigure ms={HERO.after} when="after" conn={HERO_TO} tone="text-ink" />
        </span>
      </motion.p>
      <motion.p
        {...rise(shown, reduce, 0.08)}
        className="mt-5 font-mono text-label text-ink-muted [overflow-wrap:anywhere]"
      >
        {HERO.label}
      </motion.p>

      <motion.div {...rise(shown, reduce, 0.16)} className="@container mt-12 max-w-[64rem]">
        <Eyebrow note="bars on one linear scale">Same connection, before → after</Eyebrow>
        {CROSSES && (
          <p className="mt-3 max-w-[68ch] text-body text-ink-muted">
            Part of that gain is the database connection: before was measured on Supabase’s {HERO_FROM.name}, after on
            its {HERO_TO.name}. On the same connection, the rewrite alone made it{' '}
            {SAME.map((c) => factorOf(c.before, c.after)).join(' and ')} faster:
          </p>
        )}
        <ul className="mt-5 border-b border-line">
          {SAME.map((c, i) => (
            <SplitRow key={c.pooler} conn={c} shown={shown} reduce={reduce} delay={SPLIT_DELAY_S + i * 0.12} />
          ))}
        </ul>
      </motion.div>

      <motion.p
        {...rise(shown, reduce, 0.24)}
        className="mt-5 max-w-[64rem] font-mono text-micro text-ink-subtle [overflow-wrap:anywhere]"
      >
        {PERF.setup}
      </motion.p>
    </div>
  );
}

/* ── 2 · where the time went ───────────────────────────────────────────── */

function Equation({ accent }) {
  return (
    <p className="mt-8 text-balance font-display text-[1.75rem] font-semibold leading-[1.18] tracking-[-0.02em] text-ink sm:mt-10 sm:text-4xl lg:text-[2.75rem]">
      {PERF.equation.map((token, i) => {
        const op = IS_OPERATOR.test(token);
        const lever = !op && IS_LEVER.test(token);
        // an operator holds on to the term after it, so a line never ends on one
        const gap = i === 0 ? '' : IS_OPERATOR.test(PERF.equation[i - 1]) ? '\u00A0' : ' ';
        return (
          <Fragment key={`${i}-${token}`}>
            {gap}
            <span
              className={op ? 'font-normal text-ink-subtle' : 'sm:whitespace-nowrap'}
              style={lever ? { color: accent } : undefined}
            >
              {token}
            </span>
          </Fragment>
        );
      })}
    </p>
  );
}

function Causes({ accent }) {
  return (
    <Block label="Where the time went" className="mt-20 sm:mt-24">
      <dl className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
        {PERF.causes.map((c) => (
          // label first in the DOM (dt before dd), value first on screen
          <div key={c.label} className="flex min-w-0 flex-col-reverse justify-end border-t border-line pb-6 pt-4">
            <dt className="mt-2.5 max-w-[32ch] text-label text-ink-muted">{c.label}</dt>
            <dd className="font-display text-3xl font-semibold leading-none tracking-tight text-ink tabular-nums sm:text-[2.125rem]">
              {c.value}
            </dd>
          </div>
        ))}
      </dl>
      <Equation accent={accent} />
    </Block>
  );
}

/* ── 3 · waterfall → wave ──────────────────────────────────────────────── */

/** One mode's lanes. Both modes share a grid cell, so the panel is as tall as
 *  the taller one. Only the mode on show is visible, and its bars draw only
 *  while it is the active run. */
function Lanes({ mode, on, drawing, runKey, reduce, accent }) {
  const { step, end } = WAVE_TIMING[mode];
  return (
    <ol
      aria-label={`${MODE_LABEL[mode]}: round trips by group`}
      className={`col-start-1 row-start-1 flex min-w-0 flex-col gap-3 @3xl:gap-2.5 ${on ? '' : 'invisible'}`}
    >
      {LANES[mode].map((lane) => (
        <li
          key={lane.key}
          className="grid min-w-0 gap-x-6 gap-y-1.5 @3xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] @3xl:items-center"
        >
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <span className="min-w-0 text-label text-ink-muted">{lane.label}</span>
            <span className="shrink-0 font-mono text-label tabular-nums text-ink">
              {lane.count}
              <span className="sr-only">
                {` ${plural(lane.count, 'round trip', 'round trips')}${
                  lane.parallel > 1 ? `, ${lane.parallel} queries at once` : ''
                }`}
              </span>
            </span>
          </div>

          <div aria-hidden="true" className="relative min-w-0" style={{ height: lane.height }}>
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
            {drawing &&
              lane.bars.map((b) => {
                const delay = b.slot * step;
                return (
                  <motion.span
                    key={`${runKey}-${b.slot}-${b.row}`}
                    className="absolute rounded-[1px]"
                    style={{
                      left: `${(b.slot / SLOTS) * 100}%`,
                      top: b.row * (BAR_H + STACK_GAP),
                      width: `${(BAR_FILL / SLOTS) * 100}%`,
                      minWidth: 1.5,
                      height: BAR_H,
                      originX: 0,
                    }}
                    initial={reduce ? false : { scaleX: 0, opacity: 0, backgroundColor: accent }}
                    animate={{ scaleX: 1, opacity: 1, backgroundColor: WAVE_TONE[mode] }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : {
                            duration: BAR_S,
                            ease: EASE_OUT,
                            delay,
                            backgroundColor: { duration: HEAD_S, ease: 'linear', delay: delay + BAR_S },
                          }
                    }
                  />
                );
              })}
            {drawing && lane.parallel > 1 && (
              <span
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `calc(${((lane.offset + lane.count) / SLOTS) * 100}% + 4px)` }}
              >
                <motion.span
                  className="flex items-center gap-1.5 whitespace-nowrap bg-surface pr-1 font-mono text-micro text-ink-muted"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.3, delay: end }}
                >
                  <span className="h-px w-3 bg-line-hi" />
                  {lane.parallel} at once
                </motion.span>
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The depth axis under the lanes. The tick travels with the draw. After
 *  keeps a ghost of how deep Before went. */
function WaveAxis({ mode, runKey, reduce }) {
  const depth = mode ? DEPTH[mode] : 0;
  const pct = (depth / SLOTS) * 100;
  const end = mode ? WAVE_TIMING[mode].end : 0;
  return (
    <div aria-hidden="true" className="mt-4 grid gap-x-6 @3xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
      <span className="hidden @3xl:block" />
      <div className="relative h-7 min-w-0">
        <span className="absolute inset-x-0 top-0 h-px bg-line-hi" />
        {mode === 'after' && (
          <>
            <span className="absolute right-0 top-0 h-2 w-px bg-line-hi" />
            <span className="absolute right-0 top-2.5 whitespace-nowrap font-mono text-micro text-ink-subtle">
              {DEPTH.before} before
            </span>
          </>
        )}
        {mode && (
          <>
            <motion.span
              key={`tick-${runKey}`}
              className="absolute top-0 h-2 w-px bg-ink-muted"
              initial={reduce ? false : { left: '0%' }}
              animate={{ left: `${pct}%` }}
              transition={reduce ? { duration: 0 } : { duration: end, ease: 'linear' }}
            />
            <motion.span
              key={`depth-${runKey}`}
              className="absolute top-2.5 whitespace-nowrap font-mono text-micro text-ink-muted"
              style={pct > 50 ? { right: `${100 - pct}%` } : { left: `${pct}%` }}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reduce ? { duration: 0 } : { duration: 0.3, delay: end }}
            >
              {depth} deep
            </motion.span>
          </>
        )}
      </div>
    </div>
  );
}

function WaveReadout({ mode, runKey, reduce }) {
  const depth = DEPTH[mode];
  const lanes = LANES[mode];
  return (
    <Readout runKey={runKey} delay={WAVE_TIMING[mode].end} reduce={reduce}>
      <span className="text-body text-ink">
        <span className="text-ink-muted">{MODE_LABEL[mode]}:</span>{' '}
        <span className="font-semibold tabular-nums">{depth}</span> {plural(depth, 'round trip', 'round trips')} deep
        {mode === 'before' ? ', one after another' : ''}
      </span>
      {lanes.length > 1 && (
        <span className="font-mono text-micro tabular-nums text-ink-subtle">
          {lanes.map((l) => l.count).join(' + ')} = {depth}
        </span>
      )}
    </Readout>
  );
}

function WavePanel({ accent }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, PANEL_VIEW);
  const [active, choose] = useRun(inView, reduce, 'before');
  const mode = active?.key ?? null;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const onShow = mode ?? 'before';
  // Before has drawn and nobody has clicked yet: nudge toward After, once
  const hint = active && active.run === 0 && !reduce ? { key: 'after', delay: WAVE_TIMING.before.end + PULSE_GAP_S } : null;

  return (
    <motion.div ref={ref} className="mt-20 min-w-0 sm:mt-24" {...rise(reduce || inView, reduce)}>
      <PanelFrame
        caption="Waterfall → wave"
        sub={HERO.label}
        controls={
          <Choices
            label="Show the report's round trips"
            options={MODES.map((m) => ({ key: m, label: MODE_LABEL[m] }))}
            value={mode}
            onChoose={choose}
            accent={accent}
            hint={hint}
          />
        }
        live
        footer={mode ? <WaveReadout mode={mode} runKey={runKey} reduce={reduce} /> : null}
      >
        <div className="@container">
          <p aria-hidden="true" className="mb-3 font-mono text-micro text-ink-subtle @3xl:pl-[16.5rem]">
            one round trip after another →
          </p>
          <div className="grid">
            {MODES.map((m) => (
              <Lanes
                key={m}
                mode={m}
                on={m === onShow}
                drawing={m === mode}
                runKey={runKey}
                reduce={reduce}
                accent={accent}
              />
            ))}
          </div>
          <WaveAxis mode={mode} runKey={runKey} reduce={reduce} />
          <p className="mt-3 text-label text-ink-subtle">Each bar is one round trip, drawn in order, not to time scale.</p>
        </div>
      </PanelFrame>
    </motion.div>
  );
}

/* ── 4 · every endpoint, on a log scale ────────────────────────────────── */

// label | bars | values | factor when wide. When narrow: label | factor,
// then bars | values. Fixed side columns keep every track the same width.
const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_3.75rem] gap-x-4 @2xl:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)_4.25rem_3.75rem] @2xl:gap-x-5';

function EndpointRow({ row, pooler, shown, reduce, delay }) {
  const t = timesFor(row, pooler);
  const hero = Boolean(row.hero);
  return (
    <li className={`${ROW_GRID} items-center gap-y-2 border-t border-line py-3 first:border-t-0`}>
      <div className="order-1 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className={hero ? 'text-label font-medium text-ink' : 'text-label text-ink-muted'}>{row.label}</span>
        {/* emphasis by weight and a plain chip — amber stays for the active control */}
        {hero && <span className="mc-chip">headline</span>}
      </div>
      <span
        className={`order-2 text-right font-mono tabular-nums @2xl:order-4 ${
          hero ? 'text-label font-medium text-ink' : 'text-label text-ink-muted'
        }`}
      >
        {factorOf(t.before, t.after)}
      </span>
      <div className="relative order-3 flex min-w-0 flex-col gap-1 @2xl:order-2">
        {DECADES.map((d) => (
          <span key={d} className="absolute -inset-y-3 w-px bg-line" style={{ left: `${logAt(d) * 100}%` }} />
        ))}
        <GrowBar kind="before" frac={logAt(t.before)} shown={shown} reduce={reduce} delay={delay} row={PAIR_ROW} bar={PAIR_BAR} />
        <GrowBar kind="after" frac={logAt(t.after)} shown={shown} reduce={reduce} delay={delay + 0.08} row={PAIR_ROW} bar={PAIR_BAR} />
      </div>
      <div className="order-4 flex flex-col gap-1 text-right font-mono text-micro tabular-nums @2xl:order-3">
        <span className="whitespace-nowrap text-ink-subtle" style={{ lineHeight: `${PAIR_ROW}px` }}>
          {fmtMs(t.before)}
        </span>
        <span className="whitespace-nowrap text-ink" style={{ lineHeight: `${PAIR_ROW}px` }}>
          {fmtMs(t.after)}
        </span>
      </div>
    </li>
  );
}

function EndpointAxis() {
  return (
    <div className={`${ROW_GRID} border-t border-line`}>
      <span className="hidden @2xl:block" />
      <div className="relative h-7 min-w-0">
        {DECADES.map((d, i) => (
          <span
            key={d}
            className="absolute top-2 whitespace-nowrap font-mono text-micro text-ink-subtle"
            style={{ left: `${logAt(d) * 100}%`, transform: i === 0 ? 'none' : 'translateX(-50%)' }}
          >
            {tickLabel(d)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The same numbers for screen readers: every endpoint, both connections. */
function EndpointTable() {
  return (
    <div className="sr-only">
      <table>
        <caption>Response time per endpoint, before and after, on each connection</caption>
        <thead>
          <tr>
            <th scope="col">Endpoint</th>
            {CONNECTIONS.map((c) => (
              <Fragment key={c.key}>
                <th scope="col">{c.label}, before</th>
                <th scope="col">{c.label}, after</th>
                <th scope="col">{c.label}, times faster</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERF.rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">
                {row.label}
                {row.hero ? ' (the headline)' : ''}
              </th>
              {CONNECTIONS.map((c) => {
                const t = timesFor(row, c.key);
                return (
                  <Fragment key={c.key}>
                    <td>{fmtMs(t.before)}</td>
                    <td>{fmtMs(t.after)}</td>
                    <td>{factorOf(t.before, t.after)}</td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The chart in one sentence, for the connection on show: how many endpoints
 *  got faster, and by how much at the least and at the most. */
function EndpointReadout({ pooler }) {
  const conn = CONNECTIONS.find((c) => c.key === pooler);
  const s = SPREAD[pooler];
  if (!conn || !s?.total) return null;
  const all = s.faster === s.total;
  return (
    <p className="text-body text-ink">
      <span className="text-ink-muted">{conn.label}:</span>{' '}
      {all ? `all ${s.total} endpoints faster` : `${s.faster} of ${s.total} endpoints faster`},{' '}
      <span className="font-semibold tabular-nums">{factorOf(s.lo.before, s.lo.after)}</span> to{' '}
      <span className="font-semibold tabular-nums">{factorOf(s.hi.before, s.hi.after)}</span>
    </p>
  );
}

function EndpointChart({ accent }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, BLOCK_VIEW);
  const shown = reduce || inView;
  const [pooler, setPooler] = useState(DEFAULT_CONNECTION);

  return (
    <motion.div ref={ref} className="mt-16 min-w-0 sm:mt-20" {...rise(shown, reduce)}>
      <PanelFrame
        caption="Every endpoint, before → after"
        controls={
          <Choices label="Database connection" options={CONNECTIONS} value={pooler} onChoose={setPooler} accent={accent} />
        }
        live
        footer={<EndpointReadout pooler={pooler} />}
      >
        <div aria-hidden="true" className="@container">
          {/* the key first, so the bars read on sight */}
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-micro text-ink-subtle">
            <span className="inline-flex items-center gap-2">
              <Swatch kind="before" />
              before
            </span>
            <span className="inline-flex items-center gap-2">
              <Swatch kind="after" />
              after
            </span>
            <span>× = before ÷ after</span>
          </div>
          <ul className="flex flex-col">
            {PERF.rows.map((row, i) => (
              <EndpointRow
                key={row.label}
                row={row}
                pooler={pooler}
                shown={shown}
                reduce={reduce}
                delay={i * GROW_STAGGER_S}
              />
            ))}
          </ul>
          <EndpointAxis />
        </div>
        <p className="mt-1 font-mono text-micro text-ink-subtle">
          Log scale: each gridline is 10× the one before.
        </p>
        <EndpointTable />
      </PanelFrame>
    </motion.div>
  );
}

/* ── 5 · what changed ──────────────────────────────────────────────────── */

function Fixes({ accent }) {
  return (
    <Block label="What changed" note="now the rules for new code · docs/PERFORMANCE.md" className="mt-20 sm:mt-24">
      <ol className="mt-6 grid grid-cols-1 gap-x-12 md:grid-cols-2 lg:gap-x-16">
        {PERF.fixes.map((f, i) => (
          <li key={f.title} className="min-w-0 border-t border-line pb-8 pt-5 md:pb-10">
            <span aria-hidden="true" className={`${LABEL} block`} style={{ color: accent }}>
              {pad2(i + 1)}
            </span>
            <h4 className="mt-3 font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
              {f.title}
            </h4>
            <p className="mt-3 max-w-[60ch] text-body text-ink-muted">{f.body}</p>
          </li>
        ))}
      </ol>
    </Block>
  );
}

/* ── 6 · the proof ─────────────────────────────────────────────────────── */

function Proof() {
  return (
    <Block label="Proof · nothing changed but the time" className="mt-12 sm:mt-14">
      <dl className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {PERF.proof.map((p) => (
          <div
            key={p.label}
            className="relative flex min-w-0 flex-col-reverse justify-end overflow-hidden rounded-panel border border-line bg-surface px-6 pb-7 pt-8 sm:px-8"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px]" style={{ background: alpha(P.jade, 0.6) }} />
            <span className="absolute right-6 top-7 sm:right-8">
              <Tick />
            </span>
            <dt className="mt-4 max-w-[38ch] text-body text-ink-muted">{p.label}</dt>
            <dd className="pr-10 font-display text-[2.5rem] font-semibold leading-none tracking-[-0.02em] text-jade tabular-nums sm:text-6xl">
              {p.value}
            </dd>
          </div>
        ))}
      </dl>
    </Block>
  );
}

/* ── 7 · since then · kept fast ────────────────────────────────────────── */

function FactList({ label, note, items }) {
  return (
    <Block label={label} note={note}>
      <dl className="mt-5 border-b border-line">
        {items.map((it) => (
          <div
            key={it.label}
            className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-baseline gap-x-5 border-t border-line py-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]"
          >
            <dt className="order-2 text-label text-ink-muted">{it.label}</dt>
            <dd className="order-1 font-display text-xl font-semibold leading-tight tracking-tight text-ink tabular-nums sm:text-2xl">
              {it.value}
            </dd>
          </div>
        ))}
      </dl>
    </Block>
  );
}

/* ── the section ───────────────────────────────────────────────────────── */

export default function Performance({ accent = P.accent }) {
  return (
    <div className="min-w-0">
      <Headline />
      <Causes accent={accent} />
      <WavePanel accent={accent} />
      {PERF.rows.length > 0 && <EndpointChart accent={accent} />}
      <Fixes accent={accent} />
      <Proof />
      <div className="mt-20 grid grid-cols-1 gap-14 sm:mt-24 lg:grid-cols-2 lg:gap-16">
        <FactList label="Since then" note="each measured on its own" items={PERF.later} />
        <FactList label="Kept fast in CI" note="scripts/tests/perf-budget.mjs · nightly" items={PERF.budget} />
      </div>
    </div>
  );
}
