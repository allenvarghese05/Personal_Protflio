'use client';

/**
 * BuildRuler — "Eight weeks, sole engineer, schema first." The build plan as
 * a ruler: one major tick per week with six day marks between, the week
 * above each tick and what shipped that week below it. When the ruler
 * scrolls into view an accent fill draws across it left to right, and each
 * tick lights (and its week label brightens) as the fill passes. The fill
 * stops at the first week not marked done, so the line never overstates
 * progress. Below the ruler: the stack, with core tools as accent chips and
 * supporting tools as plain ones.
 *
 * Layout: under md, a vertical rail beside a list, with the fill drawing
 * downward. From md, a horizontal ruler with four weeks a row until the block
 * itself is 64rem wide (a container query, so it fits whatever column the
 * page gives it), then all eight on one line. Nothing is clamped; every title
 * and description shows in full. The base ruler never moves. Only the text
 * fades up, so the line stays straight while it draws. With reduced motion
 * the ruler is simply there, already drawn.
 */
import { useEffect, useRef } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { PALETTE as P } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';

/* ── constants ─────────────────────────────────────────────────────────── */
const DAYS_PER_WEEK = 7; // minor graduations: the six day marks between ticks
const DAY_MARKS = Array.from({ length: DAYS_PER_WEEK - 1 }, (_, i) => i + 1);

const MAJOR_PX = 12; // week tick height (horizontal) / length (vertical rail)
const MINOR_PX = 5; // day mark height
const FILL_PX = 2; // the drawn line sits over the 1px base
const RAIL_TICK_Y = 9; // vertical rail: centre of the week label's 18px line

const DRAW_S = 1.8; // a full ruler; a partial one draws for its share of this
const DRAW_DELAY_S = 0.2;
const DRAW_EASE = [0.4, 0, 0.2, 1]; // an even sweep, so every week registers
const LIGHT_SPAN = 0.015; // progress over which a tick lights once reached

const FADE_S = 0.6;
const STEP_S = 0.05; // stagger between weeks
const RISE_PX = 10;
const IN_VIEW = { once: true, amount: 0.25 };

const WEEK_NUM = /\d+/;

/* ── small helpers ─────────────────────────────────────────────────────── */

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** 'WEEK 3' → { short: 'W3', long: 'Week 3' }; anything else passes through. */
function weekNames(week) {
  const n = String(week).match(WEEK_NUM)?.[0];
  return n ? { short: `W${n}`, long: `Week ${n}` } : { short: week, long: week };
}

/** Weeks done in a row from the start: where the fill stops. */
function doneRun(timeline) {
  const firstOpen = timeline.findIndex((t) => !t.done);
  return firstOpen === -1 ? timeline.length : firstOpen;
}

/** Fade-up variants for the text; `custom` is the week's order. */
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

/* ── pieces ────────────────────────────────────────────────────────────── */

/** md and up: this week's stretch of the horizontal ruler. */
function Band({ fill, tick, accent }) {
  return (
    <div
      aria-hidden="true"
      className="relative mt-2 hidden md:block"
      style={{ height: MAJOR_PX + FILL_PX }}
    >
      <span className="absolute inset-x-0 bottom-0 h-px bg-line-hi" />
      {DAY_MARKS.map((d) => (
        <span
          key={d}
          className="absolute bottom-0 w-px bg-line-hi"
          style={{ left: `${(d / DAYS_PER_WEEK) * 100}%`, height: MINOR_PX }}
        />
      ))}
      <motion.span
        className="absolute inset-x-0 bottom-0"
        style={{ height: FILL_PX, background: accent, scaleX: fill, originX: 0 }}
      />
      <motion.span
        className="absolute bottom-0 left-0 w-px"
        style={{ height: MAJOR_PX + FILL_PX, background: tick }}
      />
    </div>
  );
}

/** Under md: this week's stretch of the vertical rail, tick to next tick. */
function Rail({ fill, tick, accent, last }) {
  return (
    <div
      aria-hidden="true"
      className="absolute left-0 md:hidden"
      style={{ top: RAIL_TICK_Y, bottom: last ? 0 : -RAIL_TICK_Y, width: MAJOR_PX }}
    >
      <span className="absolute inset-y-0 left-0 w-px bg-line-hi" />
      <motion.span
        className="absolute inset-y-0 left-0"
        style={{ width: FILL_PX, background: accent, scaleY: fill, originY: 0 }}
      />
      <motion.span
        className="absolute left-0 top-0 h-px"
        style={{ width: MAJOR_PX, background: tick }}
      />
    </div>
  );
}

function Week({ item, index, count, progress, accent, variants }) {
  const start = index / count;
  // this week's share of the line, 0 → 1, as the overall fill passes through it
  const fill = useTransform(progress, (v) => clamp01(v * count - index));
  const lit = useTransform(progress, [start, start + LIGHT_SPAN], [0, 1]);
  const tick = useTransform(lit, [0, 1], [P.lineHi, accent]);
  const label = useTransform(lit, [0, 1], [P.inkSubtle, P.ink]);
  const { short, long } = weekNames(item.week);

  return (
    <li className="relative min-w-0 pb-8 pl-7 last:pb-0 md:pb-0 md:pl-0">
      <Rail fill={fill} tick={tick} accent={accent} last={index === count - 1} />

      <motion.p
        variants={variants}
        custom={index}
        className="font-mono text-label leading-normal tabular-nums md:pr-6 @5xl:pr-4"
        style={{ color: label }}
      >
        <span aria-hidden="true">{short}</span>
        <span className="sr-only">{long}</span>
      </motion.p>

      <Band fill={fill} tick={tick} accent={accent} />

      <motion.div
        variants={variants}
        custom={index}
        className="mt-1 md:mt-4 md:pr-6 @5xl:pr-4"
      >
        <p className="text-body font-medium leading-snug text-ink md:text-[13px]">
          {item.title}
          {!item.done && <span className="sr-only"> (not done yet)</span>}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted md:text-label">
          {item.desc}
        </p>
      </motion.div>
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
  const target = count ? doneRun(timeline) / count : 0;
  const progress = useMotionValue(0);

  // Draw the fill once, the first time the ruler is in view. Reduced motion:
  // jump straight to the end state.
  useEffect(() => {
    if (reduced) {
      progress.set(target);
      return undefined;
    }
    if (!inView) return undefined;
    const controls = animate(progress, target, {
      duration: DRAW_S * target,
      delay: DRAW_DELAY_S,
      ease: DRAW_EASE,
    });
    return () => controls.stop();
  }, [reduced, inView, target, progress]);

  if (!count) return null;

  return (
    <motion.div
      initial="hidden"
      animate={reduced || inView ? 'show' : 'hidden'}
      className={`@container w-full min-w-0 ${className}`}
    >
      <ol
        ref={ref}
        aria-label={`Build timeline, ${count} weeks`}
        className="md:grid md:grid-cols-4 md:gap-y-12 @5xl:grid-cols-8"
      >
        {timeline.map((item, i) => (
          <Week
            key={item.week}
            item={item}
            index={i}
            count={count}
            progress={progress}
            accent={accent}
            variants={rise}
          />
        ))}
      </ol>

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
