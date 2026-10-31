'use client';

/**
 * ConfirmGap — "Two highs only count if they're really in a row: under 2
 * minutes apart is a duplicate, over 12 is a fresh start."
 *
 * The typical_weekday fixture's two ticks (70, then 80 → confirmed, five
 * minutes apart), with the gap between them moved. Pick a gap and the
 * second tick slides along a 0–20 minute axis split into its three zones:
 *
 *   < 2 min     a duplicate — ignored; it neither advances nor resets the
 *               streak, and earns no unlock bonus (sand: held, not decided)
 *   2–12 min    really consecutive — the streak reaches two and the unlock
 *               bonus (+10) applies, so it confirms (jade)
 *   > 12 min    too far apart — the streak starts again at one, no bonus
 *
 * Both ticks are scored by the scorer port (./score.js) from RULES; the gap
 * is the only thing that changes. 12 allows one missed five-minute tick plus
 * scheduling slack, and the missed_ticks fixture pins the boundary: exactly
 * 12 minutes still counts. Under the axis, the two ticks as cards — score,
 * decision, the unlock points that change with the gap.
 *
 * Motion: once in view the default gap plays; the second tick's marker (the
 * accent — the thing being moved) slides to each new gap. Reduced motion:
 * the marker jumps, nothing animates.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { MORNINGS, RULES } from '@/data/studies/chronos-ai';
import { Choices, Glyph, IN_VIEW, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';
import { evaluateTick } from './score';

/* ── data ──────────────────────────────────────────────────────────────── */
const BASE = MORNINGS.find((m) => m.id === 'typical_weekday');
const [A_RAW, B_RAW] = BASE.ticks;
const { dedupeMin: DEDUPE, maxGapMin: MAX_GAP, confirm: CONFIRM } = RULES.thresholds;
const AXIS_MAX = 20;
const GAPS = [1, 5, 10, 12, 13, 20];
const AUTO = 5; // the fixture's own gap

const A = { ...A_RAW, kind: BASE.kind };
const EV_A = evaluateTick(A, null, RULES);

/** 'HH:MM' + minutes → 'HH:MM'. */
function addMin(local, m) {
  const [h, mm] = local.split(':').map(Number);
  const t = h * 60 + mm + m;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** The second tick, `gap` minutes after the first, scored against it. */
function secondTick(gap) {
  const ts = new Date(Date.parse(A.ts) + gap * 60_000).toISOString();
  const tick = { ...B_RAW, kind: BASE.kind, ts, local: addMin(A.local, gap) };
  const ev = evaluateTick(tick, { ts: A.ts, s: A.s, consecutiveHigh: EV_A.consecutiveHigh }, RULES);
  return { tick, ev };
}
const RESULTS = Object.fromEntries(GAPS.map((g) => [g, secondTick(g)]));

const ZONES = [
  { key: 'dupe', from: 0, to: DEDUPE, label: 'duplicate', tone: P.sand },
  { key: 'ok', from: DEDUPE, to: MAX_GAP, label: 'in a row', tone: P.jade },
  { key: 'far', from: MAX_GAP, to: AXIS_MAX, label: 'fresh start', tone: P.inkSubtle },
];

const pct = (m) => `${(m / AXIS_MAX) * 100}%`;
const unlockOf = (ev) => ev.breakdown.find((b) => b.id === 'unlocked');

function outcome(gap, ev) {
  if (ev.decision === 'ignored_dedupe') {
    return { tone: P.sand, glyph: 'undo', status: 'Ignored · duplicate', text: `${gap} min after the last tick is under ${DEDUPE} — a duplicate. It scores ${ev.score}, but is ignored: the streak holds at ${ev.consecutiveHigh}, no bonus.` };
  }
  if (ev.decision === 'confirm') {
    return { tone: P.jade, glyph: 'tick', status: 'Confirmed · two in a row', text: `${gap} min apart is within ${MAX_GAP}: unlocked on both ticks earns the +10 bonus, ${ev.score} is the second high in a row — confirmed.` };
  }
  return { tone: P.sand, glyph: 'flag', status: `High · ${ev.consecutiveHigh} of 2 again`, text: `${gap} min is over ${MAX_GAP}: not consecutive. No bonus, ${ev.score} — high, but the streak starts again at ${ev.consecutiveHigh}.` };
}

/* ── pieces ────────────────────────────────────────────────────────────── */

function TickCard({ title, tick, ev, glyph, tone, highlight, accent }) {
  const unlock = unlockOf(ev);
  return (
    <li className="min-w-0 rounded-[6px] border p-4" style={{ borderColor: highlight ? alpha(accent, 0.45) : P.line }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mc-label">{title}</p>
          <p className="mt-1 font-mono text-label tabular-nums text-ink">{tick.local}</p>
        </div>
        <p className="font-display text-[1.75rem] font-semibold leading-none tabular-nums text-ink">{ev.score}</p>
      </div>
      <p className="mt-3 flex items-center gap-2 font-mono text-micro" style={{ color: tone }}>
        <Glyph kind={glyph} />
        {ev.decision.replace('_', ' ')} · streak {ev.consecutiveHigh}
      </p>
      <p className="mt-2 text-[13px] leading-snug text-ink-subtle">
        Unlocked: <span className="font-mono tabular-nums text-ink-muted">{unlock?.points ?? 0}</span>
        {unlock?.bonus ? ' (15 + 10 bonus)' : ' (no bonus)'}
      </p>
    </li>
  );
}

/* ── the panel ─────────────────────────────────────────────────────────── */

export default function ConfirmGap({ accent = P.ice }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, AUTO);
  const gap = active?.key ?? AUTO;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const { tick, ev } = RESULTS[gap];
  const o = outcome(gap, ev);

  return (
    <div ref={ref}>
      <PanelFrame
        caption="The gap between two high ticks"
        controls={
          <Choices
            label="Minutes between the two ticks"
            options={GAPS.map((g) => ({ key: g, label: `${g} min` }))}
            value={active?.key ?? null}
            onChoose={choose}
            accent={accent}
          />
        }
        footer={
          active ? (
            <Readout runKey={runKey} delay={0.45} reduce={reduce} tone={o.tone} status={o.status}>
              <span className="text-body text-ink-muted">{o.text}</span>
            </Readout>
          ) : (
            <p className="text-body text-ink-subtle">Pick a gap.</p>
          )
        }
      >
        <div className="@container">
          {/* the axis, its zones and the two ticks */}
          <div className="relative px-2 pb-2 pt-9">
            <div className="relative h-10">
              {ZONES.map((z) => (
                <div
                  key={z.key}
                  className="absolute inset-y-0 border-y border-l first:rounded-l-[4px] last:rounded-r-[4px] last:border-r"
                  style={{ left: pct(z.from), width: pct(z.to - z.from), borderColor: P.line, background: alpha(z.tone, z.key === 'far' ? 0.03 : 0.07) }}
                />
              ))}

              {/* tick A at 0: settled */}
              <span aria-hidden className="absolute -top-7 flex -translate-x-1/2 flex-col items-center" style={{ left: '0%' }}>
                <span className="font-mono text-micro text-ink-subtle">1st</span>
                <span className="mt-1 h-[3.25rem] w-[2px] rounded-full bg-ink-muted" />
              </span>

              {/* tick B: the moving one */}
              <motion.span
                aria-hidden
                className="absolute -top-7 flex -translate-x-1/2 flex-col items-center"
                initial={false}
                animate={{ left: pct(gap) }}
                transition={at(reduce, 0.05, 0.5)}
              >
                <span className="font-mono text-micro" style={{ color: accent }}>
                  2nd
                </span>
                <span className="mt-1 h-[3.25rem] w-[2px] rounded-full" style={{ background: accent }} />
              </motion.span>
            </div>

            {/* minute scale */}
            <div aria-hidden className="relative mt-2 h-4 font-mono text-micro tabular-nums text-ink-subtle">
              {[0, DEDUPE, 5, 10, MAX_GAP, AXIS_MAX].map((m) => (
                <span key={m} className={`absolute top-0 ${m === 0 ? '' : m === AXIS_MAX ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: pct(m) }}>
                  {m}
                  {m === AXIS_MAX ? ' min' : ''}
                </span>
              ))}
            </div>
          </div>
          <ul aria-hidden className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-micro text-ink-subtle">
            {ZONES.map((z) => (
              <li key={z.key} className="inline-flex items-center gap-2">
                <span className="h-2.5 w-3.5 rounded-[2px] border" style={{ borderColor: P.line, background: alpha(z.tone, z.key === 'far' ? 0.06 : 0.16) }} />
                <span className="tabular-nums text-ink-muted">{{ dupe: `under ${z.to}`, ok: `${z.from}–${z.to}`, far: `over ${z.from}` }[z.key]} min</span> {z.label}
              </li>
            ))}
          </ul>
          <p className="sr-only">
            Zones: under {DEDUPE} minutes is a duplicate; {DEDUPE} to {MAX_GAP} minutes counts as in a row; over {MAX_GAP} starts again. The second tick is {gap} minutes after the first.
          </p>

          <ul className="mt-6 grid gap-3 @min-[30rem]:grid-cols-2">
            <TickCard title="1st tick" tick={A} ev={EV_A} glyph="flag" tone={P.sand} accent={accent} />
            <TickCard title={`2nd tick · +${gap} min`} tick={tick} ev={ev} glyph={o.glyph} tone={o.tone} highlight accent={accent} />
          </ul>

          <p className="mt-4 max-w-[68ch] text-[13px] leading-relaxed text-ink-subtle">
            Both ticks are the typical-weekday fixture’s ({BASE.ticks.map((t) => t.local).join(' and ')}, 5 minutes apart); only the gap moves. A first tick at {EV_A.score} is already ≥ {CONFIRM}, so everything rides on the second. The missed-ticks fixture pins the edge: exactly {MAX_GAP} minutes still confirms.
          </p>
        </div>
      </PanelFrame>
    </div>
  );
}
