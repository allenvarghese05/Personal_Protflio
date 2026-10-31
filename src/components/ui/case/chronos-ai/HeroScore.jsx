'use client';

/**
 * HeroScore — the hero figure: one real test morning, scored rule by rule.
 *
 * The worked_example fixture's three ticks as three columns on a 0–100
 * scale. Each column is a stack of the points each rule gave — steps,
 * walking, unlocked, off the charger, steps today, opened the app — computed
 * by the scorer port (./score.js) from the rule set in the study data, and
 * the same numbers the fixture expects. Two hairlines mark the thresholds:
 * 85 confirms on one tick, 70 confirms on two in a row. The 05:50 tick sits
 * before the window, so it is a hollow ring on the floor: the gate is
 * closed and nothing scores.
 *
 * Under each column: the time and the decision — a sand flag for "high, one
 * of two", a jade tick for "confirmed". A server-derived points block (the
 * charger just unplugged) has a dashed edge: the phone never says "I was
 * unplugged"; the server compares two snapshots.
 *
 * Motion: on mount the columns build left to right, one rule at a time, with
 * an accent "now" bar under the column being scored; it rests on the last.
 * Reduced motion: the finished morning, the bar on the last column.
 *
 * Layout: plain HTML on a fixed-height plot, so every label stays ≥ 11px at
 * 360px; segment labels show where a block is tall enough, and the full
 * breakdown is in sr-only text.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { MORNINGS, RULES } from '@/data/studies/chronos-ai';
import { Glyph, at } from '@/components/ui/case/kit';
import { scoreMorning } from './score';

/* ── data (module scope, deterministic) ────────────────────────────────── */
const MORNING = MORNINGS.find((m) => m.id === 'worked_example');
const EVALS = scoreMorning(MORNING, RULES);
const RULE_BY_ID = Object.fromEntries(RULES.rules.map((r) => [r.id, r]));
const { confirm: CONFIRM, strong: STRONG } = RULES.thresholds;

// short labels for the blocks (the column is narrow on a phone)
const SHORT = { steps_10m: 'steps', walking_10m: 'walk', unlocked: 'unlock', charger_disconnect: 'charger', steps_window: 'today', foreground: 'app' };

const COLUMNS = MORNING.ticks.map((t, i) => {
  const ev = EVALS[i];
  const blocks = ev.breakdown.filter((b) => b.points > 0).map((b) => ({ ...b, label: SHORT[b.id], derived: Boolean(RULE_BY_ID[b.id]?.derived) }));
  return { tick: t, ev, blocks };
});

const PLOT_H = 248; // px
const MIN_LABEL_PTS = 12; // a block this tall carries its label
const LEAD_S = 0.5;
const BLOCK_S = 0.16;
const COL_GAP_S = 0.55;

/** When column i starts and ends building. */
const SCHEDULE = COLUMNS.reduce((acc, c, i) => {
  const start = i === 0 ? LEAD_S : acc[i - 1].end + COL_GAP_S;
  const end = start + Math.max(1, c.blocks.length) * BLOCK_S + 0.25;
  acc.push({ start, end });
  return acc;
}, []);

function decisionOf(ev) {
  if (ev.decision === 'outside_window') return { glyph: 'idle', text: 'outside window', tone: P.inkSubtle };
  if (ev.decision === 'confirm') return { glyph: 'tick', text: `confirm · ${ev.reason}`, tone: P.jade };
  if (ev.decision === 'high') return { glyph: 'flag', text: `high · ${ev.consecutiveHigh} of 2`, tone: P.sand };
  return { glyph: 'idle', text: ev.decision, tone: P.inkSubtle };
}

const SUMMARY = COLUMNS.map(({ tick, ev, blocks }) => {
  const parts = blocks.map((b) => `${RULE_BY_ID[b.id].label.toLowerCase()} ${b.points}`).join(', ');
  return `${tick.local}: ${ev.gate === 'closed' ? 'outside the window, 0' : `${parts} — ${ev.score}, ${decisionOf(ev).text}`}`;
}).join('. ');

/* ── pieces ────────────────────────────────────────────────────────────── */

function Block({ block, delay, reduce }) {
  const showLabel = block.points >= MIN_LABEL_PTS;
  return (
    <motion.div
      className="relative flex w-full items-center justify-center overflow-hidden rounded-[3px]"
      style={{
        height: `${block.points}%`,
        background: alpha(P.inkMuted, 0.13),
        border: `1px ${block.derived ? 'dashed' : 'solid'} ${alpha(P.inkMuted, block.derived ? 0.6 : 0.32)}`,
      }}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={at(reduce, delay, 0.3)}
    >
      {showLabel && (
        <span className="truncate px-1 font-mono text-micro leading-none text-ink-muted">
          <span className="tabular-nums text-ink">{block.points}</span> {block.label}
        </span>
      )}
    </motion.div>
  );
}

function Stack({ col, index, reduce }) {
  const { start } = SCHEDULE[index];
  if (col.ev.gate === 'closed') {
    return (
      <div className="flex h-full flex-col items-center justify-end gap-2">
        <span className="font-mono text-micro text-ink-subtle">gate closed</span>
        <span aria-hidden className="h-3 w-3 rounded-full" style={{ boxShadow: `inset 0 0 0 1.25px ${P.inkSubtle}` }} />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col-reverse gap-[2px] px-1 sm:px-3">
      {col.blocks.map((b, j) => (
        <Block key={b.id} block={b} delay={start + j * BLOCK_S} reduce={reduce} />
      ))}
    </div>
  );
}

function Score({ col, index, reduce }) {
  return (
    <motion.p
      className="font-display text-center text-2xl font-semibold leading-none tabular-nums text-ink sm:text-[1.75rem]"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={at(reduce, SCHEDULE[index].end, 0.3)}
    >
      {col.ev.score}
    </motion.p>
  );
}

/** The time, the accent "now" bar, the decision. */
function Foot({ col, index, reduce, accent }) {
  const { start, end } = SCHEDULE[index];
  const last = index === COLUMNS.length - 1;
  const next = SCHEDULE[index + 1];
  const d = decisionOf(col.ev);
  return (
    <div className="relative border-t border-line pt-3 text-center">
      <motion.span
        aria-hidden
        className="absolute inset-x-3 -top-px h-[2px] rounded-full"
        style={{ background: accent }}
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? { opacity: last ? 1 : 0 } : { opacity: last ? [0, 1] : [0, 1, 1, 0] }}
        transition={
          reduce
            ? { duration: 0 }
            : last
              ? { delay: start, duration: 0.2 }
              : { delay: start, duration: next.start - start, times: [0, 0.06, 0.94, 1] }
        }
      />
      <p className="font-mono text-label tabular-nums text-ink">{col.tick.local}</p>
      <motion.p
        className="mt-2 flex items-start justify-center gap-1.5 font-mono text-micro leading-snug"
        style={{ color: d.tone }}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={at(reduce, end + 0.1, 0.3)}
      >
        <span className="hidden sm:block">
          <Glyph kind={d.glyph} />
        </span>
        <span className="pt-[2px]">{d.text}</span>
      </motion.p>
    </div>
  );
}

/* ── the figure ────────────────────────────────────────────────────────── */

export default function HeroScore({ accent = P.ice }) {
  const reduce = Boolean(useReducedMotion());

  return (
    <div className="mc-panel min-w-0" role="group" aria-label="A test morning scored tick by tick">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="mc-label">{MORNING.id}.json</span>
        <span className="font-mono text-micro text-ink-subtle">weekday · window 06:00–11:00</span>
      </div>

      <div className="mt-5 pl-9">
        {/* the scores */}
        <div aria-hidden className="grid grid-cols-3 gap-1 sm:gap-2">
          {COLUMNS.map((col, i) => (
            <Score key={col.tick.local} col={col} index={i} reduce={reduce} />
          ))}
        </div>

        {/* the plot: threshold hairlines behind the stacks, on one scale */}
        <div aria-hidden className="relative mt-3" style={{ height: PLOT_H }}>
          {[STRONG, CONFIRM].map((v) => (
            <div key={v} className="absolute -left-9 right-0 flex translate-y-1/2 items-center" style={{ bottom: `${v}%` }}>
              <span className="w-9 shrink-0 font-mono text-micro tabular-nums text-ink-subtle">{v}</span>
              <span className="h-px flex-1" style={{ backgroundImage: `linear-gradient(90deg, ${P.lineHi} 50%, transparent 50%)`, backgroundSize: '6px 1px' }} />
            </div>
          ))}
          <div className="relative grid h-full grid-cols-3 gap-1 sm:gap-2">
            {COLUMNS.map((col, i) => (
              <Stack key={col.tick.local} col={col} index={i} reduce={reduce} />
            ))}
          </div>
        </div>

        {/* time + decision */}
        <ol aria-label="Ticks" className="mt-3 grid grid-cols-3 gap-1 sm:gap-2">
          {COLUMNS.map((col, i) => (
            <li key={col.tick.local} className="min-w-0">
              <Foot col={col} index={i} reduce={reduce} accent={accent} />
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 font-mono text-micro text-ink-subtle">
        <span>
          <span className="tabular-nums text-ink">{STRONG}</span> confirms on one tick
        </span>
        <span>
          <span className="tabular-nums text-ink">{CONFIRM}</span> confirms on two in a row
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-3.5 rounded-[2px]" style={{ border: `1px dashed ${alpha(P.inkMuted, 0.6)}` }} />
          worked out by the server
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-[2px] w-3.5 rounded-full" style={{ background: accent }} />
          now
        </span>
      </div>
      <p className="sr-only">{SUMMARY}.</p>
    </div>
  );
}
