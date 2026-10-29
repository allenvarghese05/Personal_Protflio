'use client';

/**
 * BuildRuler — the git history as a date ruler. The history came in bursts:
 * a prototype (Jan 29 – Feb 14), months with no commits, then seven chapters
 * in three weeks of October (Oct 3 – 23). The ruler draws exactly that.
 *
 * From md: one horizontal axis, one segment per burst. Each segment's width
 * is proportional to the days it covers, with a tick per day and the month
 * names under the axis. Between bursts there is a fixed-width break, a dotted
 * bridge with a "//" in the middle, captioned with how long the quiet stretch
 * lasted ("~7½ months, no commits", worked out from the dates). Each chapter
 * is a numbered tick at its start date. A chapter that runs over several days
 * also gets a band from its first day to its last. When two numbers would
 * crowd each other, the later one moves up a row. Under the axis, the chapters
 * as text cards: number, dates, title, what shipped. Four a row until the
 * block is 64rem wide (a container query), then all eight on one line.
 *
 * Under md: a vertical rail beside the same cards. Between the bursts, the
 * rail turns dotted and carries the same caption.
 *
 * Reads `timeline` (each chapter: week label, start / end as YYYY-MM-DD,
 * title, desc, done) and the stack lists, all from projects.js. A gap of 30
 * days or more with no chapter is what splits the axis. If the dates are
 * missing or out of order, the axis is left out and the cards and rail still
 * render.
 *
 * Motion: once the block is in view, an accent line draws along the axis left
 * to right at an even speed per day. It crosses the break dotted, and each
 * chapter's tick and number light as it passes. On the rail it draws downward,
 * one chapter per step. Either line stops at the end of the last chapter in an
 * unbroken run of done ones, so it never overstates progress. The axis itself
 * never moves; only the card text fades up. Reduced motion: everything is
 * already drawn, nothing plays.
 *
 * Below it all: the stack, with core tools as accent chips and supporting
 * tools as plain ones.
 */
import { Fragment, useEffect, useRef } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';

/* ── constants ─────────────────────────────────────────────────────────── */
const DAY_MS = 86_400_000;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_DAYS = 365.2425 / 12; // an average month, to size a quiet stretch
const SPLIT_DAYS = 30; // this long with no chapter breaks the axis
const MONTH_CROWD_DAYS = 3; // a month this close to a burst's start replaces its label
const QUIET = 'no commits'; // what a break means: the dates are commit dates

/* axis geometry (px) */
const TIER_PX = 18; // one row of chapter numbers (their line height)
const MAJOR_PX = 12; // chapter tick, from the nearest row of numbers to the axis
const MINOR_PX = 4; // day tick, above the axis
const MONTH_UP_PX = 7; // month-start tick: a little taller…
const MONTH_DOWN_PX = 5; // …and dropping below the axis toward its label
const BAND_PX = 6; // a multi-day chapter's span, centred on the axis
const FILL_PX = 2; // the drawn line sits over the 1px axis
const GAP_PX = 112; // the break between bursts, whatever it spans
const GAP_INSET_PX = 4; // the dotted bridge stops short of either segment
const BREAK_PX = 14; // the "//" at the middle of the bridge
const MIN_LABEL_DAYS = 2; // numbers closer than this go up a row

/* vertical rail (px) */
const RAIL_TICK_Y = 9; // centre of the card's 18px label line
const RAIL_TICK_PX = 12;

/* motion */
const DRAW_S = 2; // the whole axis; a partial one draws for its share of this
const DRAW_DELAY_S = 0.2;
const DRAW_EASE = [0.4, 0, 0.2, 1]; // an even sweep, so every chapter registers
const GAP_UNITS = 4; // the break takes as long to cross as this many days
const LIGHT_UNITS = 0.6; // days of travel over which a tick lights once reached
const RAIL_LIGHT = 0.12; // the same, in rail steps
const FADE_S = 0.6;
const STEP_S = 0.05; // stagger between chapters
const RISE_PX = 10;
const IN_VIEW = { once: true, amount: 0.2 };

/* ── small helpers ─────────────────────────────────────────────────────── */

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const pad2 = (n) => String(n).padStart(2, '0');
const pct = (f) => `${(f * 100).toFixed(3)}%`;

/** 'YYYY-MM-DD' → { y, m (0-based), n: whole days since the epoch }. */
function dayOf(iso) {
  const match = ISO_DAY.exec(iso ?? '');
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  return { y, m, n: Date.UTC(y, m, d) / DAY_MS };
}

/** A quiet stretch in words, to the nearest half month: "~7½ months" on
 *  screen, "About 7½ months" for screen readers. Under a month, in days. */
function stretchWords(days) {
  const halves = Math.round((days / MONTH_DAYS) * 2);
  if (halves < 2) return { lead: `${days} days`, long: `${days} days, ${QUIET}` };
  const whole = Math.floor(halves / 2);
  const half = halves % 2 === 1;
  const amount = `${whole}${half ? '½' : ''} ${whole === 1 && !half ? 'month' : 'months'}`;
  return { lead: `~${amount}`, long: `About ${amount}, ${QUIET}` };
}

/** "~7½ months, no commits", breaking only after the comma. */
function StretchText({ words }) {
  return (
    <>
      <span className="whitespace-nowrap">{words.lead},</span>{' '}
      <span className="whitespace-nowrap">{QUIET}</span>
    </>
  );
}

/** Chapters done in a row from the start: where the line stops. */
function doneRun(timeline) {
  const firstOpen = timeline.findIndex((t) => !t.done);
  return firstOpen === -1 ? timeline.length : firstOpen;
}

/** The first day of each month inside a burst, plus the burst's own month at
 *  its start (unless a new month begins within a few days of it). */
function monthsOf(seg) {
  const at = (n) => (n - seg.start.n + 0.5) / seg.len;
  const months = [{ n: seg.start.n, x: at(seg.start.n), label: MONTHS[seg.start.m] }];
  let y = seg.start.y;
  let m = seg.start.m;
  for (;;) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    const n = Date.UTC(y, m, 1) / DAY_MS;
    if (n > seg.end.n) break;
    months.push({ n, x: at(n), label: MONTHS[m] });
  }
  if (months.length > 1 && months[1].n - seg.start.n < MONTH_CROWD_DAYS) months.shift();
  return months;
}

/**
 * Everything the ruler draws, worked out from the dates:
 *   axis    — bursts as segments (days, months, chapter marks with their
 *             number row), the breaks between them, and how many rows of
 *             numbers there are. null when the dates can't make an axis.
 *   parts   — the rail, top to bottom: a stretch per chapter, plus one per
 *             break, and which part each chapter starts.
 *   targets — where each line stops, and its full length, in its own units:
 *             days of travel along the axis (a break counts GAP_UNITS), rail
 *             steps down the rail.
 * Positions sit mid-day: a burst of `len` days puts day d at (d + 0.5) / len.
 */
function layoutOf(timeline) {
  const count = timeline.length;
  const done = doneRun(timeline);
  const spans = timeline.map((t) => {
    const start = dayOf(t.start);
    const end = dayOf(t.end) ?? start;
    return start && end.n >= start.n ? { start, end } : null;
  });
  const dated =
    count > 0 && spans.every((s, i) => s && (i === 0 || s.start.n >= spans[i - 1].start.n));

  // bursts: a new one wherever SPLIT_DAYS or more pass with no chapter
  const bursts = [];
  if (dated) {
    spans.forEach((s, i) => {
      const prev = bursts[bursts.length - 1];
      if (prev && s.start.n - prev.end.n < SPLIT_DAYS) {
        if (s.end.n > prev.end.n) prev.end = s.end;
        prev.chapters.push(i);
      } else {
        bursts.push({ start: s.start, end: s.end, chapters: [i] });
      }
    });
  }

  let travel = 0;
  const segOf = [];
  const segments = bursts.map((b, k) => {
    const len = b.end.n - b.start.n + 1;
    const u0 = travel;
    travel += len + (k < bursts.length - 1 ? GAP_UNITS : 0);
    const x = (n) => (n - b.start.n + 0.5) / len;
    const u = (n) => u0 + n - b.start.n + 0.5;

    // numbers that would crowd go up a row (rows hold the last day labelled)
    const rows = [];
    const marks = b.chapters.map((i) => {
      segOf[i] = k;
      const { start, end } = spans[i];
      let tier = rows.findIndex((last) => start.n - last >= MIN_LABEL_DAYS);
      if (tier === -1) tier = rows.length;
      rows[tier] = start.n;
      return { i, x0: x(start.n), x1: x(end.n), u0: u(start.n), u1: u(end.n), span: end.n > start.n, tier };
    });

    const seg = { key: String(b.start.n), start: b.start, end: b.end, len, u0, marks, chapters: b.chapters };
    const next = bursts[k + 1];
    const gapDays = next ? next.start.n - b.end.n : 0;
    return {
      ...seg,
      days: Array.from({ length: len }, (_, d) => ({ n: b.start.n + d, x: (d + 0.5) / len })),
      months: monthsOf(seg),
      tiers: rows.length,
      gap: next ? { key: `${b.end.n}-${next.start.n}`, u0: u0 + len, words: stretchWords(gapDays) } : null,
    };
  });

  // the break after a chapter, if a burst ends with it
  const gapAfter = Array.from({ length: count }, () => null);
  segments.forEach((seg) => {
    if (seg.gap) gapAfter[seg.chapters[seg.chapters.length - 1]] = seg.gap;
  });

  // the rail: one stretch per chapter, one more after any chapter a break follows
  const partOf = [];
  let parts = 0;
  for (let i = 0; i < count; i += 1) {
    partOf[i] = parts;
    parts += gapAfter[i] ? 2 : 1;
  }

  // where the lines stop: the end of the last chapter in the done run
  let tTarget = 0;
  for (let i = 0; i < done && segments.length; i += 1) {
    const mark = segments[segOf[i]].marks.find((mk) => mk.i === i);
    tTarget = Math.max(tTarget, mark.u1);
  }

  return {
    axis: segments.length ? { segments, tiers: Math.max(1, ...segments.map((s) => s.tiers)) } : null,
    gapAfter,
    partOf,
    tTarget,
    tTotal: travel,
    rTarget: done ? partOf[done - 1] + 1 : 0,
    rTotal: parts,
  };
}

/** Fade-up variants for the text; `custom` is the chapter's order. */
function makeRise(reduced) {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : RISE_PX },
    show: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: reduced
        ? { duration: 0 }
        : { duration: FADE_S, ease: EASE_OUT, delay: i * STEP_S },
    }),
  };
}

/* ── the axis (md and up) ──────────────────────────────────────────────── */

/** A chapter on the axis: its number (in its row), its tick down to the
 *  axis, and — if it runs over several days — its band. All light together
 *  as the line reaches the chapter's first day. */
function Mark({ mark, tiers, axisY, progress, accent }) {
  const lit = useTransform(progress, [mark.u0, mark.u0 + LIGHT_UNITS], [0, 1]);
  const tick = useTransform(lit, [0, 1], [P.lineHi, accent]);
  const ink = useTransform(lit, [0, 1], [P.inkSubtle, P.ink]);
  const band = useTransform(lit, [0, 1], [alpha(P.inkSubtle, 0.18), alpha(accent, 0.3)]);
  const row = tiers - 1 - mark.tier; // tier 0 sits nearest the axis
  const tickTop = (row + 1) * TIER_PX + 2;

  return (
    <>
      {mark.span && (
        <motion.span
          className="absolute z-[1] rounded-full"
          style={{
            left: pct(mark.x0),
            width: pct(mark.x1 - mark.x0),
            top: axisY + 0.5 - BAND_PX / 2,
            height: BAND_PX,
            background: band,
          }}
        />
      )}
      <motion.span
        className="absolute z-[3] -translate-x-1/2 font-mono text-micro tabular-nums"
        style={{ left: pct(mark.x0), top: row * TIER_PX, lineHeight: `${TIER_PX}px`, color: ink }}
      >
        {pad2(mark.i + 1)}
      </motion.span>
      <motion.span
        className="absolute z-[3] w-px"
        style={{ left: pct(mark.x0), top: tickTop, height: axisY + 1 - tickTop, background: tick }}
      />
    </>
  );
}

/** One burst: base axis, day ticks, the drawn fill, its chapters, months. */
function Segment({ seg, tiers, progress, accent }) {
  const axisY = tiers * TIER_PX + MAJOR_PX;
  const fill = useTransform(progress, (v) => clamp01((v - seg.u0) / seg.len));
  const monthDays = new Set(seg.months.map((m) => m.n));

  return (
    <div className="min-w-0">
      <div className="relative" style={{ height: axisY + MONTH_DOWN_PX + 1 }}>
        <span className="absolute inset-x-0 h-px bg-line-hi" style={{ top: axisY }} />
        {seg.days.map((d) =>
          monthDays.has(d.n) ? (
            <span
              key={d.n}
              className="absolute w-px bg-ink-faint"
              style={{ left: pct(d.x), top: axisY - MONTH_UP_PX, height: MONTH_UP_PX + MONTH_DOWN_PX + 1 }}
            />
          ) : (
            <span
              key={d.n}
              className="absolute w-px bg-line-hi"
              style={{ left: pct(d.x), top: axisY - MINOR_PX, height: MINOR_PX }}
            />
          ),
        )}
        <motion.span
          className="absolute inset-x-0 z-[2]"
          style={{
            top: axisY + 0.5 - FILL_PX / 2,
            height: FILL_PX,
            background: accent,
            scaleX: fill,
            originX: 0,
          }}
        />
        {seg.marks.map((mark) => (
          <Mark key={mark.i} mark={mark} tiers={tiers} axisY={axisY} progress={progress} accent={accent} />
        ))}
      </div>
      <div className="relative mt-1.5 h-4">
        {seg.months.map((m) => (
          <span
            key={m.n}
            className="absolute top-0 whitespace-nowrap font-mono text-micro font-medium uppercase leading-none tracking-[0.14em] text-ink-subtle"
            style={{ left: pct(m.x) }}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Half of the dotted bridge, lit by `share` (0 → 1) as the line crosses. */
function Bridge({ share, side, axisY, accent }) {
  const clip = useTransform(share, (v) => `inset(0 ${pct(1 - v)} 0 0)`);
  const inner = `calc(50% + ${BREAK_PX / 2 + 2}px)`;
  const place = side === 'left' ? { left: GAP_INSET_PX, right: inner } : { left: inner, right: GAP_INSET_PX };
  return (
    <>
      <span className="absolute border-t border-dotted" style={{ ...place, top: axisY, borderColor: P.inkFaint }} />
      <motion.span
        className="absolute border-t border-dotted"
        style={{ ...place, top: axisY, borderColor: alpha(accent, 0.75), clipPath: clip }}
      />
    </>
  );
}

/** The break between bursts: a dotted bridge, "//", and how long it was. */
function Gap({ gap, tiers, progress, accent }) {
  const axisY = tiers * TIER_PX + MAJOR_PX;
  const crossed = useTransform(progress, (v) => clamp01((v - gap.u0) / GAP_UNITS));
  const left = useTransform(crossed, (v) => clamp01(v * 2));
  const right = useTransform(crossed, (v) => clamp01(v * 2 - 1));

  return (
    <div className="min-w-0">
      <div className="relative" style={{ height: axisY + MONTH_DOWN_PX + 1 }}>
        <Bridge share={left} side="left" axisY={axisY} accent={accent} />
        <Bridge share={right} side="right" axisY={axisY} accent={accent} />
        <svg
          width={BREAK_PX}
          height={BREAK_PX}
          viewBox="0 0 14 14"
          className="absolute left-1/2 block -translate-x-1/2"
          style={{ top: axisY + 0.5 - BREAK_PX / 2 }}
        >
          <path
            d="M2.5 12.5 L6.5 1.5 M7.5 12.5 L11.5 1.5"
            fill="none"
            stroke={P.inkSubtle}
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="mt-1.5 px-1 text-center font-mono text-micro leading-snug text-ink-subtle">
        <StretchText words={gap.words} />
      </p>
    </div>
  );
}

/** The whole horizontal ruler. Decorative: the list below carries the text
 *  (including each break, as screen-reader text). */
function Axis({ axis, progress, accent }) {
  const last = axis.segments.length - 1;
  const columns = axis.segments
    .map((s, k) => `minmax(0, ${s.len}fr)${k < last ? ` ${GAP_PX}px` : ''}`)
    .join(' ');

  return (
    <div aria-hidden="true" className="mb-12 hidden md:grid" style={{ gridTemplateColumns: columns }}>
      {axis.segments.map((seg) => (
        <Fragment key={seg.key}>
          <Segment seg={seg} tiers={axis.tiers} progress={progress} accent={accent} />
          {seg.gap && <Gap gap={seg.gap} tiers={axis.tiers} progress={progress} accent={accent} />}
        </Fragment>
      ))}
    </div>
  );
}

/* ── the rail (under md) ───────────────────────────────────────────────── */

/** One stretch of the vertical rail: solid beside a chapter (with its tick),
 *  dotted across a break. Fills top to bottom as `rail` passes `index`. */
function RailStretch({ rail, index, accent, top, bottom, dotted = false }) {
  const fill = useTransform(rail, (v) => clamp01(v - index));
  const clip = useTransform(fill, (v) => `inset(0 0 ${pct(1 - v)} 0)`);
  const lit = useTransform(rail, [index, index + RAIL_LIGHT], [0, 1]);
  const tick = useTransform(lit, [0, 1], [P.lineHi, accent]);

  return (
    <div
      aria-hidden="true"
      className="absolute left-0 md:hidden"
      style={{ top, bottom, width: RAIL_TICK_PX }}
    >
      {dotted ? (
        <>
          <span className="absolute inset-y-0 left-0 border-l border-dotted" style={{ borderColor: P.inkFaint }} />
          <motion.span
            className="absolute inset-y-0 left-0 border-l border-dotted"
            style={{ borderColor: alpha(accent, 0.75), clipPath: clip }}
          />
        </>
      ) : (
        <>
          <span className="absolute inset-y-0 left-0 w-px bg-line-hi" />
          <motion.span
            className="absolute inset-y-0 left-0"
            style={{ width: FILL_PX, background: accent, scaleY: fill, originY: 0 }}
          />
          <motion.span
            className="absolute left-0 top-0 h-px"
            style={{ width: RAIL_TICK_PX, background: tick }}
          />
        </>
      )}
    </div>
  );
}

/* ── a chapter card ────────────────────────────────────────────────────── */

function Chapter({ item, index, count, gap, railIndex, rail, accent, variants }) {
  const last = index === count - 1;
  let pad = 'pb-8';
  if (last) pad = 'pb-0';
  else if (gap) pad = 'pb-5';

  return (
    <li className="min-w-0">
      <div className={`relative pl-7 md:pb-0 md:pl-0 ${pad}`}>
        <RailStretch
          rail={rail}
          index={railIndex}
          accent={accent}
          top={RAIL_TICK_Y}
          bottom={last || gap ? 0 : -RAIL_TICK_Y}
        />

        <motion.p
          variants={variants}
          custom={index}
          className="flex flex-wrap items-baseline gap-x-2 font-mono text-label leading-normal tabular-nums md:pr-6 @5xl:pr-4"
        >
          <span style={{ color: accent }}>{pad2(index + 1)}</span>
          <span className="text-ink-subtle">{item.week}</span>
        </motion.p>

        <motion.div variants={variants} custom={index} className="mt-1 md:mt-2.5 md:pr-6 @5xl:pr-4">
          <p className="text-body font-semibold leading-snug text-ink md:text-[13px]">
            {item.title}
            {!item.done && <span className="sr-only"> (not done yet)</span>}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted md:text-label">
            {item.desc}
          </p>
        </motion.div>
      </div>

      {gap && (
        <div className="relative pb-7 pl-7 pt-1 md:sr-only">
          <RailStretch
            rail={rail}
            index={railIndex + 1}
            accent={accent}
            top={0}
            bottom={-RAIL_TICK_Y}
            dotted
          />
          <motion.p
            variants={variants}
            custom={index + 0.5}
            className="font-mono text-micro leading-normal text-ink-subtle"
          >
            <span aria-hidden="true">
              <StretchText words={gap.words} />
            </span>
            <span className="sr-only">{gap.words.long}</span>
          </motion.p>
        </div>
      )}
    </li>
  );
}

function Stack({ primary, secondary, accent, variants, order }) {
  if (!primary.length && !secondary.length) return null;
  return (
    <motion.div
      variants={variants}
      custom={order}
      className="mt-12 flex flex-col gap-3 border-t border-line pt-6 md:flex-row md:items-baseline md:gap-6"
    >
      <h3 className="mc-label shrink-0">Stack</h3>
      <div className="flex min-w-0 flex-col gap-2">
        {primary.length > 0 && (
          <ul aria-label="Core" className="flex flex-wrap gap-2">
            {primary.map((name) => (
              <li key={name} className="mc-chip mc-chip--accent" style={{ '--chip': accent }}>
                {name}
              </li>
            ))}
          </ul>
        )}
        {secondary.length > 0 && (
          <ul aria-label="Supporting" className="flex flex-wrap gap-2">
            {secondary.map((name) => (
              <li key={name} className="mc-chip">
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

/* ── the block ─────────────────────────────────────────────────────────── */

export default function BuildRuler({
  timeline = [],
  primary = [],
  secondary = [],
  accent = P.accent,
  className = '',
}) {
  const ref = useRef(null);
  const inView = useInView(ref, IN_VIEW);
  const reduced = useReducedMotion();
  const rise = makeRise(reduced);

  const count = timeline.length;
  const layout = layoutOf(timeline);
  const { tTarget, tTotal, rTarget, rTotal } = layout;
  const progress = useMotionValue(0); // days of travel along the axis
  const rail = useMotionValue(0); // steps down the rail

  // Draw both lines once, the first time the block is in view (only one of
  // them is on screen at a time). Reduced motion: jump to the end state.
  useEffect(() => {
    if (reduced) {
      progress.set(tTarget);
      rail.set(rTarget);
      return undefined;
    }
    if (!inView) return undefined;
    const runs = [
      animate(progress, tTarget, {
        duration: tTotal ? DRAW_S * (tTarget / tTotal) : 0,
        delay: DRAW_DELAY_S,
        ease: DRAW_EASE,
      }),
      animate(rail, rTarget, {
        duration: rTotal ? DRAW_S * (rTarget / rTotal) : 0,
        delay: DRAW_DELAY_S,
        ease: DRAW_EASE,
      }),
    ];
    return () => runs.forEach((run) => run.stop());
  }, [reduced, inView, tTarget, tTotal, rTarget, rTotal, progress, rail]);

  if (!count) return null;

  return (
    <motion.div
      initial="hidden"
      animate={reduced || inView ? 'show' : 'hidden'}
      className={`@container w-full min-w-0 ${className}`}
    >
      <div ref={ref}>
        {layout.axis && <Axis axis={layout.axis} progress={progress} accent={accent} />}

        <ol
          aria-label={`Build history, ${count} chapters`}
          className="md:grid md:grid-cols-4 md:gap-y-10 @5xl:grid-cols-8"
        >
          {timeline.map((item, i) => (
            <Chapter
              key={`${item.week}·${item.title}`}
              item={item}
              index={i}
              count={count}
              gap={layout.gapAfter[i]}
              railIndex={layout.partOf[i]}
              rail={rail}
              accent={accent}
              variants={rise}
            />
          ))}
        </ol>
      </div>

      <Stack
        primary={primary}
        secondary={secondary}
        accent={accent}
        variants={rise}
        order={Math.min(count, 4)}
      />
    </motion.div>
  );
}
