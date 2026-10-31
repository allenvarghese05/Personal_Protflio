'use client';

/**
 * Decisions — the hard problems, one row each.
 *
 * One full-width row per DECISION (tx · snapshot · rbac), alternating sides at
 * lg, stacked below it, separated by a hairline. Each row reads the same way:
 *   text   — '01 · Money' kicker, display title, then Problem / Decision /
 *            Trade-off (the decision gets the accent rule and brighter ink);
 *   visual — a small interactive diagram in an .mc-panel with an aria-live
 *            readout footer, and a 'Show the code' toggle that opens a CodeBlock.
 *
 * The diagrams:
 *   tx       — one tranche release as a transaction lane: the compare-and-set
 *              condition, the rows it matched, then the five writes. Release
 *              ticks them in order to COMMIT; Fail mid-way ticks up to the
 *              failing write, crosses it out, then un-ticks every write before
 *              it (ROLLBACK); Double-click starts two lanes together on the
 *              same condition — one matches a row and commits, and only then
 *              does the other resolve: 0 rows, the 409, nothing written.
 *   snapshot — one setting on a timeline, and the applications judged by it.
 *              Before the change the first application passes by its frozen
 *              snapshot; after it the rule flips (3 → 5), the first one still
 *              passes by its snapshot and only the new one is asked for more.
 *   rbac     — the request path as a line of stations. Your own application
 *              lights every check through to the engine; someone else's — a
 *              forged request — arcs around the UI guard, clears the proxy, the
 *              session and the body check, and is stopped at row access (403).
 *
 * Everything renders from DECISIONS in src/data/studies/iet.js: the steps,
 * scenarios and readouts of each decision, its path and notes; the compare-
 * and-set values come from the lifecycle (STATUSES, AUDIT). Sequences start
 * once a panel is a third in view — tx auto-runs its first scenario, snapshot
 * plays the change from before to after; with reduced motion nothing plays and
 * each diagram simply shows its final state.
 *
 * Layout: rows are 5fr / 6fr at ≥1024px, alternating; one column below.
 * Inside the panels, container queries decide: the double-click's two lanes
 * sit side by side from 544px of panel, the application cards from 480px, and
 * the request path runs left to right from 560px (top to bottom below that).
 */
import { Fragment, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { AUDIT, DECISIONS, STATUSES } from '@/data/studies/iet';
import { Choices, DecisionList, Glyph, LegendItem, PanelFrame, Readout, at, softBreaks, useRun, useWidth } from '@/components/ui/case/kit';

/* ── shared constants ──────────────────────────────────────────────────── */
const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

/** "a", "a and b", "a, b and c". */
function listOf(items) {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/* ── tx: the transaction ───────────────────────────────────────────────── */
// Seconds. The condition matches at `lead`; the writes tick every `step` after
// `gap`. A rollback starts `revertGap` after the failing write and un-ticks the
// earlier writes newest-first, `stagger` apart. In a double-click the second
// lane's compare-and-set can only see the moved status once the first lane has
// committed, so it resolves `lose` after that COMMIT — pending until then.
const TX = { lead: 0.3, gap: 0.45, step: 0.5, revertGap: 0.6, stagger: 0.07, markGap: 0.3, lose: 0.2 };
const TX_DIM = { reverted: 0.6, idle: 0.45 };

// The compare-and-set a release runs, with values read from the lifecycle:
// the status Finance releases Phase 2 from, and the amount the President
// approved (AUDIT). A clause drops out if the data stops saying it.
const CAS_STATUS = STATUSES.find((s) => /_FUNDS_PENDING$/.test(s.id))?.id;
const CAS_AMOUNT = AUDIT.find((e) => e.to === 'PRESIDENT_APPROVED')?.extra?.match(/₹\s?([\d,]+)/)?.[1];
const CAS_WHERE = [
  CAS_STATUS && `status = ${CAS_STATUS}`,
  CAS_AMOUNT && `approvedAmount = ${CAS_AMOUNT}`,
].filter(Boolean);

/** Outcome → the readout chip, and the mark that closes a lane. */
const TX_RESULT = {
  commit: { status: 'COMMIT', tone: P.jade, glyph: 'tick', mark: 'COMMIT' },
  rollback: { status: 'ROLLBACK', tone: P.alert, glyph: 'undo', mark: 'ROLLBACK' },
  conflict: { status: '409', tone: P.alert, glyph: 'cross', mark: '409 · changed by someone else' },
};

/** A scenario → its lanes (one; two for a double-click) — rows matched, a cue
 *  per write, the result and when it lands — and when the whole run ends.
 *  No scenario → one idle lane. */
function txPlan(scenario, count) {
  const tickAt = (i) => TX.lead + TX.gap + i * TX.step;
  const commits = {
    matched: 1,
    matchAt: TX.lead,
    rows: range(count, (i) => ({ tick: tickAt(i) })),
    markAt: tickAt(count - 1) + TX.step,
    result: 'commit',
  };

  switch (scenario?.outcome) {
    case 'commit':
      return { lanes: [{ key: 'tx', label: 'One transaction', ...commits }], end: commits.markAt };

    case 'rollback': {
      const failAt = Math.min(Math.max(scenario.failAt ?? 0, 0), count - 1);
      const revert0 = tickAt(failAt) + TX.revertGap;
      const rows = range(count, (i) => {
        if (i < failAt) return { tick: tickAt(i), revert: revert0 + (failAt - 1 - i) * TX.stagger };
        if (i === failAt) return { fail: tickAt(i) };
        return { dim: revert0 }; // never ran
      });
      const markAt = revert0 + failAt * TX.stagger + TX.markGap;
      return {
        lanes: [{ key: 'tx', label: 'One transaction', matched: 1, matchAt: TX.lead, rows, markAt, result: 'rollback' }],
        end: markAt,
      };
    }

    case 'conflict': {
      // Both begin together; Click 2 sees 0 rows once Click 1 has committed
      const lose = commits.markAt + TX.lose;
      const loser = {
        matched: 0,
        matchAt: lose,
        rows: range(count, () => ({ dim: lose })),
        markAt: lose + TX.markGap,
        result: 'conflict',
      };
      return {
        lanes: [
          { key: 'click-1', label: 'Click 1', ...commits },
          { key: 'click-2', label: 'Click 2', ...loser },
        ],
        end: Math.max(commits.markAt, loser.markAt),
      };
    }

    default:
      return {
        lanes: [
          { key: 'tx', label: 'One transaction', matched: null, matchAt: 0, rows: range(count, () => ({})), markAt: 0, result: null },
        ],
        end: 0,
      };
  }
}

/* ── snapshot: the rule timeline ───────────────────────────────────────── */
// Positions along the timeline (0–1) — schematic, not to scale, so the dates
// never collide. The cursor ("now") stands just after the first application
// before the change, and past the last event after it.
const SNAP = {
  pos: { before: 0.14, change: 0.6, after: 0.86 },
  now: { before: 0.32, after: 0.95 },
  lead: 0.35, // s before the cursor sets off
  travel: 1.7, // s from before to after — linear, it's time passing
  resubmit: 0.25, // s after the cursor passes the new application
  judge: 0.6, // s after it, both applications are judged
  settle: 0.35,
};
// The column the rules freeze into on submit (DECISIONS.snapshot.decision)
const SNAPSHOT_FIELD = 'requirementsSnapshot';

/** When (s) the travelling cursor reaches timeline position `p`. */
const snapPassAt = (p) =>
  SNAP.lead + (SNAP.travel * (p - SNAP.now.before)) / (SNAP.now.after - SNAP.now.before);
const pct = (f) => `${(f * 100).toFixed(2)}%`;

/* ── rbac: the request path ────────────────────────────────────────────── */
// Below `wideMin` px of panel width the line runs top-to-bottom.
// h: horizontal — `room` above the line for the bypass arc, station radius,
//    gap to the labels. v: vertical — top inset, row height, line x.
const PIPE = {
  wideMin: 560,
  pad: 6,
  h: { room: 46, r: 7, gap: 16 },
  v: { top: 30, row: 60, x: 48, r: 7 },
  lead: 0.3, // token waits at the client
  seg: 0.42, // station to station
  arc: 0.9, // the whole bypass arc
  arcSamples: 12,
  settle: 0.25, // readout after the token stops
};

/** Station state → colours (circle fill/stroke + the label under it). */
const STATION = {
  idle: { fill: P.surface2, stroke: P.lineHi, label: P.inkMuted },
  pass: { fill: alpha(P.jade, 0.22), stroke: P.jade, label: P.ink },
  block: { fill: alpha(P.alert, 0.22), stroke: P.alert, label: P.alert },
  skip: { fill: P.void, stroke: P.inkFaint, label: P.inkSubtle },
};

function bezier([p0, p1, p2, p3], u) {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** Station centres, the client origin and the bypass arc (CSS px). */
function pipeGeometry(width, count, wide, entry) {
  if (wide) {
    const cy = PIPE.h.room + PIPE.h.r;
    const col = width / count;
    const stations = Array.from({ length: count }, (_, i) => ({ x: col * (i + 0.5), y: cy }));
    const origin = { x: PIPE.pad, y: cy };
    const lift = ((PIPE.h.room - 8) * 4) / 3; // cubic control → peak 8px under the top
    const end = stations[entry];
    return {
      stations,
      origin,
      arc: [origin, { x: origin.x, y: cy - lift }, { x: end.x, y: cy - lift }, end],
    };
  }
  const x = PIPE.v.x;
  const stations = Array.from({ length: count }, (_, i) => ({ x, y: PIPE.v.top + PIPE.v.row * (i + 0.5) }));
  const origin = { x, y: PIPE.pad };
  const swing = ((x - 10) * 4) / 3; // bulges left to 10px from the edge
  const end = stations[entry];
  return {
    stations,
    origin,
    arc: [origin, { x: x - swing, y: origin.y }, { x: x - swing, y: end.y }, end],
  };
}

/** The token's keyframes, and when it reaches each station. */
function pipePlan(mode, geo, entry, blockAt) {
  const frames = [
    { p: geo.origin, at: 0 },
    { p: geo.origin, at: PIPE.lead },
  ];
  const eases = ['linear'];
  const arrive = [];
  let t = PIPE.lead;
  const hop = (i) => {
    t += PIPE.seg;
    frames.push({ p: geo.stations[i], at: t });
    eases.push('easeInOut');
    arrive[i] = t;
  };
  if (mode === 'app') {
    geo.stations.forEach((_, i) => hop(i));
  } else if (mode === 'forged') {
    for (let k = 1; k <= PIPE.arcSamples; k++) {
      const u = k / PIPE.arcSamples;
      frames.push({ p: bezier(geo.arc, u), at: t + PIPE.arc * u });
      eases.push('linear');
    }
    t += PIPE.arc;
    arrive[entry] = t;
    for (let i = entry + 1; i <= blockAt; i++) hop(i);
  }
  return { frames, eases, arrive, end: t };
}

function stationFor(mode, i, plan, skipAt, blockAt) {
  if (mode === 'app') return { state: 'pass', at: plan.arrive[i] };
  if (mode === 'forged') {
    if (i === skipAt) return { state: 'skip', at: PIPE.lead };
    if (i === blockAt) return { state: 'block', at: plan.arrive[i] };
    if (plan.arrive[i] != null) return { state: 'pass', at: plan.arrive[i] };
  }
  return { state: 'idle', at: 0 };
}

/** A station's final state, in words — the text twin of the diagram. */
const STATION_WORDS = { pass: 'passed', block: 'stopped here — 403', skip: 'skipped', idle: 'not reached' };

/* ── hooks ─────────────────────────────────────────────────────────────── */

/* ── tx visual ─────────────────────────────────────────────────────────── */

function TxRow({ index, label, cue, reduce, compact }) {
  const reverted = cue.revert != null;
  const failed = cue.fail != null;
  const dimmed = cue.dim != null;

  let opacity = 1;
  if (dimmed) opacity = TX_DIM.idle;
  else if (reverted) opacity = TX_DIM.reverted;

  let words = '';
  if (failed) words = 'threw';
  else if (reverted) words = 'rolled back';
  else if (dimmed) words = 'not written';
  else if (cue.tick != null) words = 'written';

  return (
    <motion.li
      initial={{ opacity: 1, borderColor: P.line }}
      animate={{ opacity, borderColor: failed ? alpha(P.alert, 0.45) : P.line }}
      transition={
        reduce
          ? { duration: 0 }
          : {
              opacity: at(reduce, cue.dim ?? cue.revert ?? 0, 0.35),
              borderColor: at(reduce, cue.fail ?? 0, 0.3),
            }
      }
      className={`flex items-center rounded-md border bg-surface-2 ${compact ? 'gap-2.5 px-2.5 py-2' : 'gap-3 px-3 py-2.5'}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-chip border border-line-hi font-mono text-micro text-ink-subtle ${
          compact ? 'h-5 w-5' : 'h-6 w-6'
        }`}
      >
        {index + 1}
      </span>
      <motion.span
        className={`min-w-0 flex-1 font-mono text-ink-muted [overflow-wrap:anywhere] ${compact ? 'text-micro' : 'text-label'}`}
        style={{ textDecorationLine: 'line-through', textDecorationThickness: '1px' }}
        initial={{ textDecorationColor: alpha(P.inkSubtle, 0) }}
        animate={{ textDecorationColor: alpha(P.inkSubtle, reverted ? 1 : 0) }}
        transition={at(reduce, cue.revert ?? 0, 0.3)}
      >
        {softBreaks(label)}
        {words && <span className="sr-only"> — {words}</span>}
      </motion.span>
      <span aria-hidden="true" className="relative h-5 w-5 shrink-0">
        <span className="absolute inset-0">
          <Glyph kind="idle" />
        </span>
        {cue.tick != null && (
          <motion.span
            className="absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: reverted ? 0 : 1 }}
            transition={at(reduce, cue.revert ?? 0, 0.3)}
          >
            <motion.span
              className="absolute inset-0"
              initial={{ opacity: 0, scale: reduce ? 1 : 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={at(reduce, cue.tick, 0.3)}
            >
              <Glyph kind="tick" />
            </motion.span>
          </motion.span>
        )}
        {cue.tick != null && reverted && (
          <motion.span
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={at(reduce, cue.revert + 0.15, 0.3)}
          >
            <Glyph kind="undo" />
          </motion.span>
        )}
        {failed && (
          <motion.span
            className="absolute inset-0"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={at(reduce, cue.fail, 0.3)}
          >
            <Glyph kind="cross" />
          </motion.span>
        )}
      </span>
    </motion.li>
  );
}

/** One request's transaction: BEGIN, the WHERE it ran, the rows it matched,
 *  the writes, and the mark it ends on. */
function TxLane({ lane, steps, reduce, compact }) {
  const result = lane.result ? TX_RESULT[lane.result] : null;
  const matched = lane.matched;
  const waits = !reduce && matched != null && lane.matchAt > TX.lead;
  return (
    <motion.div
      className="min-w-0 rounded-lg border p-3 sm:p-4"
      initial={{ borderColor: P.line }}
      animate={{ borderColor: result ? alpha(result.tone, 0.45) : P.line }}
      transition={at(reduce, lane.markAt, 0.4)}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-ink-muted">{lane.label}</span>
        <span className="font-mono text-micro tracking-[0.12em] text-ink-subtle">BEGIN</span>
      </div>

      {CAS_WHERE.length > 0 && (
        <p className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 rounded-md border border-line bg-void px-2.5 py-2 font-mono text-micro leading-[1.6] text-ink-muted">
          {CAS_WHERE.map((clause, i) => (
            <Fragment key={clause}>
              <span className="text-right text-lilac">{i === 0 ? 'WHERE' : 'AND'}</span>
              <span className="min-w-0 [overflow-wrap:anywhere]">{softBreaks(clause)}</span>
            </Fragment>
          ))}
        </p>
      )}

      <div className="relative mt-2 min-h-5">
        {/* a lane that has to wait for the other shows it's still running */}
        {waits && (
          <motion.p
            aria-hidden="true"
            className="absolute inset-x-0 top-0 font-mono text-micro leading-5 text-ink-subtle"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={at(reduce, lane.matchAt, 0.2)}
          >
            → …
          </motion.p>
        )}
        <motion.p
          className="font-mono text-micro leading-5"
          style={{ color: matched === 1 ? P.jade : P.alert }}
          initial={{ opacity: 0 }}
          animate={{ opacity: matched == null ? 0 : 1 }}
          transition={at(reduce, lane.matchAt, 0.3)}
        >
          {matched != null && (
            <>
              <span aria-hidden="true">→ </span>
              {matched} {matched === 1 ? 'row' : 'rows'} matched
            </>
          )}
        </motion.p>
      </div>

      <ol className="mt-2 flex flex-col gap-2">
        {steps.map((label, i) => (
          <TxRow key={label} index={i} label={label} cue={lane.rows[i]} reduce={reduce} compact={compact} />
        ))}
      </ol>

      <motion.p
        className="mt-3 flex min-h-5 items-center gap-2 font-mono text-micro font-medium tracking-[0.06em]"
        style={result ? { color: result.tone } : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: result ? 1 : 0 }}
        transition={at(reduce, lane.markAt, 0.3)}
      >
        {result && (
          <>
            <Glyph kind={result.glyph} tone={result.tone} />
            <span className="min-w-0">{result.mark}</span>
          </>
        )}
      </motion.p>
    </motion.div>
  );
}

function TxVisual({ decision, inView, reduce, accent }) {
  const scenarios = decision.scenarios ?? [];
  const [active, choose] = useRun(inView, reduce, scenarios[0]?.key ?? null);
  const scenario = scenarios.find((s) => s.key === active?.key) ?? null;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const steps = decision.steps;
  const plan = txPlan(scenario, steps.length);
  const result = scenario ? TX_RESULT[scenario.outcome] : null;
  const pair = plan.lanes.length > 1;

  return (
    <PanelFrame
      caption="Release a tranche"
      controls={
        <Choices
          label="Run the release"
          options={scenarios.map(({ key, label }) => ({ key, label }))}
          value={scenario?.key ?? null}
          onChoose={choose}
          accent={accent}
        />
      }
      footer={
        scenario && result ? (
          <Readout runKey={runKey} delay={plan.end} reduce={reduce} tone={result.tone} status={result.status}>
            <span className="text-body text-ink-muted">{scenario.readout}</span>
          </Readout>
        ) : (
          <p className="text-body text-ink-subtle">Run the release.</p>
        )
      }
    >
      <div className="@container">
        <div key={runKey} className={pair ? 'grid gap-3 @min-[34rem]:grid-cols-2' : undefined}>
          {plan.lanes.map((lane) => (
            <TxLane key={lane.key} lane={lane} steps={steps} reduce={reduce} compact={pair} />
          ))}
        </div>
      </div>
    </PanelFrame>
  );
}

/* ── snapshot visual ───────────────────────────────────────────────────── */

/** The setting's value in force: `before`, struck and followed by `after`
 *  once the rule changes. */
function ValueFlip({ before, after, changed, flipAt, reduce }) {
  return (
    <p className="flex shrink-0 items-baseline gap-2 font-display text-[1.75rem] font-semibold leading-none tabular-nums">
      <span className="sr-only">In force: </span>
      <motion.span
        style={{ textDecorationLine: 'line-through', textDecorationThickness: '2px' }}
        initial={{ color: P.ink, textDecorationColor: alpha(P.inkSubtle, 0) }}
        animate={{
          color: changed ? P.inkSubtle : P.ink,
          textDecorationColor: alpha(P.inkSubtle, changed ? 1 : 0),
        }}
        transition={at(reduce, flipAt, 0.3)}
      >
        {before}
      </motion.span>
      {changed && (
        <motion.span
          className="inline-flex items-baseline gap-2"
          initial={{ opacity: 0, x: reduce ? 0 : -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={at(reduce, flipAt, 0.35)}
        >
          <span aria-hidden="true" className="text-base text-ink-faint">
            →
          </span>
          <span className="sr-only">, changed to </span>
          <span className="text-ink">{after}</span>
        </motion.span>
      )}
    </p>
  );
}

/** One event on the timeline: a hollow marker while it's ahead of "now",
 *  filled once reached (square — an application; diamond — the rule change). */
function EventMark({ event, reached, reachAt, reduce }) {
  const shape = event.kind === 'change' ? 'rotate-45 rounded-[1px]' : 'rounded-[2px]';
  const place = { left: pct(event.pos) };
  return (
    <>
      <span
        className={`absolute top-[22px] -ml-1 h-2 w-2 border ${shape}`}
        style={{ ...place, background: P.void, borderColor: P.lineHi }}
      />
      {reached && (
        <motion.span
          className={`absolute top-[22px] -ml-1 h-2 w-2 border ${shape}`}
          style={{ ...place, background: P.inkMuted, borderColor: P.inkMuted }}
          initial={{ opacity: reachAt > 0 ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={at(reduce, reachAt, 0.2)}
        />
      )}
      <span
        className="absolute top-[34px] -translate-x-1/2 whitespace-nowrap font-mono text-micro leading-[15px] text-ink-subtle"
        style={place}
      >
        {event.date}
      </span>
    </>
  );
}

/** The setting over time: its value above the line (old, then new from the
 *  change), the events on it, and the amber "now" cursor. Decorative — the
 *  visual's sr-only summary says the same. */
function RuleTimeline({ scenario, events, changed, flipAt, nowTo, reduce, accent }) {
  const travel =
    reduce || !changed ? { duration: 0 } : { delay: SNAP.lead, duration: SNAP.travel, ease: 'linear' };
  const reachedBy = (pos) => pos <= nowTo;
  const reachAt = (pos) => (changed && pos > SNAP.now.before ? snapPassAt(pos) : 0);
  return (
    <div aria-hidden="true" className="relative h-[54px]">
      {/* the value in force, either side of the change */}
      <motion.span
        className="absolute left-0 top-0 whitespace-nowrap font-mono text-micro leading-[15px]"
        initial={{ color: P.inkMuted }}
        animate={{ color: changed ? P.inkSubtle : P.inkMuted }}
        transition={at(reduce, flipAt, 0.3)}
      >
        {scenario.before} required
      </motion.span>
      {changed && (
        <motion.span
          className="absolute top-0 whitespace-nowrap pl-2 font-mono text-micro leading-[15px] text-ink"
          style={{ left: pct(SNAP.pos.change) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={at(reduce, flipAt, 0.35)}
        >
          {scenario.after} required
        </motion.span>
      )}
      <span className="absolute top-[2px] h-[20px] w-px bg-line" style={{ left: pct(SNAP.pos.change) }} />

      {/* time: dashed ahead, solid where it has passed */}
      <span className="absolute inset-x-0 top-[26px] border-t border-dashed border-line-hi" />
      <motion.span
        className="absolute left-0 top-[25px] h-[2px] rounded-full"
        style={{ background: P.inkSubtle }}
        initial={{ width: pct(SNAP.now.before) }}
        animate={{ width: pct(nowTo) }}
        transition={travel}
      />

      {events.map((e) => (
        <EventMark key={e.key} event={e} reached={reachedBy(e.pos)} reachAt={reachAt(e.pos)} reduce={reduce} />
      ))}

      {/* now */}
      <motion.span
        className="absolute top-[16px] -ml-px h-[20px] w-[2px] rounded-full"
        style={{ background: accent }}
        initial={{ left: pct(SNAP.now.before) }}
        animate={{ left: pct(nowTo) }}
        transition={travel}
      />
    </div>
  );
}

/** An application, judged by the rules frozen onto it at submit. */
function AppCard({ app, snapshot, field, shown, appearAt, placeholder, resubmitAt, judgeAt, reduce }) {
  const passes = app.photos >= snapshot;
  const tone = passes ? P.jade : P.sand;
  const slots = Math.max(snapshot, app.photos);
  const resubmits = resubmitAt != null;
  return (
    <li className="relative min-w-0 rounded-md border border-line bg-surface-2 p-3.5">
      <motion.div
        aria-hidden={shown ? undefined : true}
        initial={{ opacity: shown && appearAt === 0 ? 1 : 0 }}
        animate={{ opacity: shown ? 1 : 0 }}
        transition={at(reduce, appearAt, 0.35)}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="font-mono text-label text-ink">{app.id}</span>
          <span className="font-mono text-micro text-ink-subtle">submitted {app.submitted}</span>
        </div>

        <p className="mt-2.5">
          <span className="inline-block max-w-full rounded-chip border border-line bg-void px-2 py-1 font-mono text-micro leading-[1.45] text-ink-muted [overflow-wrap:anywhere]">
            {/* nbsp: if the chip wraps, the dot stays with the column name */}
            {SNAPSHOT_FIELD}
            {'\u00a0· '}
            {field}: <span className="text-ink">{snapshot}</span>
          </span>
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <span className="flex items-center gap-2.5">
            <span aria-hidden="true" className="flex gap-1">
              {range(slots, (i) => (
                <span
                  key={i}
                  className="block h-2.5 w-2.5 rounded-[2px]"
                  style={i < app.photos ? { background: P.inkSubtle } : { border: `1px dashed ${P.sand}` }}
                />
              ))}
            </span>
            <span className="font-mono text-micro tabular-nums text-ink-muted">
              {app.photos} {app.photos === 1 ? 'photo' : 'photos'}
            </span>
          </span>
          {resubmits && (
            <motion.span
              className="font-mono text-micro text-ink-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={at(reduce, resubmitAt, 0.3)}
            >
              <span aria-hidden="true">↺ </span>resubmits
            </motion.span>
          )}
        </div>

        <motion.p
          className="mt-3 flex items-start gap-2 text-label leading-5"
          initial={{ opacity: resubmits ? 1 : 0 }}
          animate={{ opacity: resubmits ? [1, 0.25, 1] : 1 }}
          transition={
            reduce
              ? { duration: 0 }
              : resubmits
                ? { delay: resubmitAt, duration: judgeAt - resubmitAt + 0.3, times: [0, 0.4, 1], ease: EASE_OUT }
                : at(reduce, judgeAt, 0.35)
          }
        >
          <Glyph kind={passes ? 'tick' : 'flag'} />
          <span className="min-w-0">
            <span className="font-medium" style={{ color: tone }}>
              {passes ? 'passes' : `needs ${snapshot}`}
            </span>
            <span className="text-ink-subtle"> · judged by its snapshot: {snapshot}</span>
          </span>
        </motion.p>
      </motion.div>

      {placeholder && (
        <motion.div
          aria-hidden={shown ? true : undefined}
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md border border-dashed border-line-hi bg-surface px-3 text-center font-mono text-micro text-ink-subtle"
          initial={{ opacity: shown && appearAt === 0 ? 0 : 1 }}
          animate={{ opacity: shown ? 0 : 1 }}
          transition={at(reduce, appearAt, 0.3)}
        >
          not submitted yet
        </motion.div>
      )}
    </li>
  );
}

function SnapshotVisual({ decision, inView, reduce, accent }) {
  const sc = decision.scenario;
  const [active, choose] = useRun(inView, reduce, 'after');
  const mode = active?.key ?? null;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const changed = mode === 'after';

  const field = sc.key.split('.').pop();
  const early = sc.apps.find((a) => a.when === 'before');
  const late = sc.apps.find((a) => a.when === 'after');

  const flipAt = changed ? snapPassAt(SNAP.pos.change) : 0;
  const laterAt = changed ? snapPassAt(SNAP.pos.after) : 0;
  const judgeAt = changed ? laterAt + SNAP.judge : 0.25;
  const end = judgeAt + SNAP.settle;
  const nowTo = changed ? SNAP.now.after : SNAP.now.before;

  const events = [
    ...sc.apps
      .filter((a) => a.when === 'before')
      .map((a) => ({ key: a.id, kind: 'app', pos: SNAP.pos.before, date: a.submitted })),
    { key: 'change', kind: 'change', pos: SNAP.pos.change, date: sc.changedOn },
    ...sc.apps
      .filter((a) => a.when === 'after')
      .map((a) => ({ key: a.id, kind: 'app', pos: SNAP.pos.after, date: a.submitted })),
  ];

  const summary = `${sc.setting}: ${sc.before} until ${sc.changedOn}, then ${sc.after}. ${sc.apps
    .map((a) => `${a.id} submitted ${a.submitted}`)
    .join('; ')}.`;

  let sentence = '';
  if (changed && early && late) {
    sentence = `From ${sc.changedOn} the rule is ${sc.after} — yet ${early.id} is still judged by its snapshot of ${sc.before}; only ${late.id} is asked for ${sc.after}.`;
  } else if (early) {
    sentence = `${early.id} froze the rule at ${sc.before} when it was submitted on ${early.submitted} — its ${early.photos} photos pass.`;
  }

  return (
    <PanelFrame
      caption="Rule change"
      controls={
        <Choices
          label="Before or after the rule change"
          options={[
            { key: 'before', label: 'Before the change' },
            { key: 'after', label: 'After the change' },
          ]}
          value={mode}
          onChoose={choose}
          accent={accent}
        />
      }
      footer={
        mode ? (
          <Readout
            runKey={runKey}
            delay={end}
            reduce={reduce}
            tone={changed ? P.sand : P.jade}
            status={changed ? `Rule ${sc.before} → ${sc.after}` : `Judged by ${sc.before}`}
          >
            <span className="text-body text-ink-muted">{sentence}</span>
          </Readout>
        ) : (
          <p className="text-body text-ink-subtle">Pick a moment.</p>
        )
      }
    >
      <div key={runKey} className="@container">
        {/* the setting */}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-label font-medium text-ink">{sc.setting}</p>
            <p className="mt-0.5 font-mono text-micro text-ink-subtle [overflow-wrap:anywhere]">{softBreaks(sc.key)}</p>
          </div>
          <ValueFlip before={sc.before} after={sc.after} changed={changed} flipAt={flipAt} reduce={reduce} />
        </div>

        {/* the setting over time */}
        <div className="mt-5">
          <RuleTimeline
            scenario={sc}
            events={events}
            changed={changed}
            flipAt={flipAt}
            nowTo={nowTo}
            reduce={reduce}
            accent={accent}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-micro text-ink-subtle">
          <LegendItem label="application submitted">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill={P.inkMuted} />
          </LegendItem>
          <LegendItem label="rule changed">
            <rect x="3" y="3" width="8" height="8" rx="1" fill={P.inkMuted} transform="rotate(45 7 7)" />
          </LegendItem>
          <LegendItem label="now">
            <rect x="6" y="1" width="2" height="12" rx="1" fill={accent} />
          </LegendItem>
        </div>
        <p className="sr-only">{summary}</p>

        {/* the applications, each judged by its own snapshot */}
        <ul className="mt-5 grid gap-3 @min-[30rem]:grid-cols-2">
          {sc.apps.map((app) => {
            const isEarly = app.when === 'before';
            return (
              <AppCard
                key={app.id}
                app={app}
                snapshot={isEarly ? sc.before : sc.after}
                field={field}
                shown={isEarly || changed}
                appearAt={!isEarly && changed ? laterAt : 0}
                placeholder={!isEarly}
                resubmitAt={isEarly && changed ? laterAt + SNAP.resubmit : null}
                judgeAt={judgeAt}
                reduce={reduce}
              />
            );
          })}
        </ul>
      </div>
    </PanelFrame>
  );
}

/* ── rbac visual ───────────────────────────────────────────────────────── */

function RbacVisual({ decision, inView, reduce, accent }) {
  const [active, choose] = useRun(inView, reduce, 'app');
  const mode = active?.key ?? null;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  // The run whose token has arrived. From then on the token just sits at its
  // stop: the cx keyframes follow the measured width, so a resize would
  // otherwise replay them from the client along the straight wire.
  const [doneRun, setDoneRun] = useState(null);

  const trackRef = useRef(null);
  const width = useWidth(trackRef);
  const wide = width >= PIPE.wideMin;

  const path = decision.path;
  const n = path.length;
  // Which stations the forged request skips, enters at and is stopped at
  const skipAt = Math.max(0, path.findIndex((s) => s.key === 'ui'));
  const entry = Math.max(skipAt + 1, path.findIndex((s) => s.key === 'route'));
  const blockAt = Math.max(entry, path.findIndex((s) => s.key === 'own'));

  const geo = pipeGeometry(width, n, wide, entry);
  const plan = pipePlan(mode, geo, entry, blockAt);
  const states = path.map((_, i) => stationFor(mode, i, plan, skipAt, blockAt));
  const last = plan.frames[plan.frames.length - 1].p;
  const points = [geo.origin, ...geo.stations];
  const arcD = (() => {
    const [p0, p1, p2, p3] = geo.arc;
    return `M${p0.x} ${p0.y} C${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
  })();
  const arcPeak = bezier(geo.arc, 0.5);

  // A straight segment j (points[j] → points[j+1]) is lit if the token rode it
  const segLit = (j) => {
    if (!mode) return null;
    const endsAt = plan.arrive[j];
    if (endsAt == null) return null;
    if (mode === 'forged' && j <= entry) return null; // entry is reached by the arc
    return endsAt - PIPE.seg;
  };

  const tokenTiming = {
    duration: plan.end,
    times: plan.frames.map((f) => f.at / plan.end),
    ease: plan.eases,
  };
  const forged = mode === 'forged';
  const settled = reduce || doneRun === runKey;
  // Once the token has arrived, anything that remounts (a resize across wideMin re-keys it) appears in its final state.
  const play = (delay, duration) => (settled ? { duration: 0 } : at(reduce, delay, duration));

  // Where it ends, and the code it ends with — beside the final station
  const endAt = forged ? blockAt : n - 1;
  const endCode = forged ? '403' : '200';
  const endTone = forged ? P.alert : P.jade;
  const endStation = geo.stations[endAt];

  const lastStation = path[n - 1];
  const passed = path.slice(entry, blockAt).map((s) => s.label);
  const words = (i) => {
    if (!mode) return '';
    if (!forged && i === n - 1) return 'passed — 200';
    return STATION_WORDS[states[i].state];
  };

  return (
    <PanelFrame
      caption="Request path"
      controls={
        <Choices
          label="Send a request"
          options={[
            { key: 'app', label: 'Your application' },
            { key: 'forged', label: 'Someone else’s' },
          ]}
          value={mode}
          onChoose={choose}
          accent={accent}
        />
      }
      footer={
        mode ? (
          <Readout
            runKey={runKey}
            delay={plan.end + PIPE.settle}
            reduce={reduce}
            tone={forged ? P.alert : P.jade}
            status={forged ? '403 · Access denied' : '200 OK'}
          >
            <span className="text-body text-ink-muted">
              {forged
                ? `It skipped the ${path[skipAt].label} and cleared ${listOf(passed)} — then ${path[blockAt].label} stopped it.`
                : `Every station passed — ${lastStation.label} last, ${lastStation.note}.`}
            </span>
          </Readout>
        ) : (
          <p className="text-body text-ink-subtle">Send a request.</p>
        )
      }
    >
      <div ref={trackRef} className="relative min-w-0">
        {width > 0 && (
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {/* the wire */}
            {points.slice(1).map((b, j) => (
              <line
                key={`wire-${j}`}
                x1={points[j].x}
                y1={points[j].y}
                x2={b.x}
                y2={b.y}
                stroke={P.lineHi}
                strokeWidth="1.5"
              />
            ))}
            {/* the token's trail */}
            {points.slice(1).map((b, j) => {
              const from = segLit(j);
              if (from == null) return null;
              return (
                <motion.line
                  key={`trail-${j}-${runKey}-${wide}`}
                  x1={points[j].x}
                  y1={points[j].y}
                  x2={b.x}
                  y2={b.y}
                  stroke={alpha(P.jade, 0.75)}
                  strokeWidth="2"
                  initial={settled ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={settled ? { duration: 0 } : { delay: from, duration: PIPE.seg, ease: 'easeInOut' }}
                />
              );
            })}
            {/* the bypass */}
            {forged && (
              <motion.path
                key={`arc-${runKey}-${wide}`}
                d={arcD}
                fill="none"
                stroke={accent}
                strokeWidth="1.5"
                strokeDasharray="4 4"
                initial={settled ? false : { opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={play(0.05, 0.3)}
              />
            )}
            {forged && wide && (
              <motion.text
                key={`arc-label-${runKey}`}
                x={arcPeak.x}
                y={arcPeak.y - 6}
                textAnchor="middle"
                className="font-mono"
                fontSize="11"
                letterSpacing="0.08em"
                fill={accent}
                initial={settled ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={play(0.2, 0.3)}
              >
                bypass
              </motion.text>
            )}
            {/* stations: dashed where skipped, a tick where passed, a cross where stopped */}
            {geo.stations.map((s, i) => {
              const look = STATION[states[i].state];
              return (
                <motion.circle
                  key={`station-${i}-${runKey}-${wide}`}
                  cx={s.x}
                  cy={s.y}
                  r={wide ? PIPE.h.r : PIPE.v.r}
                  strokeWidth="1.5"
                  strokeDasharray={states[i].state === 'skip' ? '2.5 2' : undefined}
                  initial={settled ? false : { fill: STATION.idle.fill, stroke: STATION.idle.stroke }}
                  animate={{ fill: look.fill, stroke: look.stroke }}
                  transition={play(states[i].at, 0.25)}
                />
              );
            })}
            {geo.stations.map((s, i) => {
              const state = states[i].state;
              if (state !== 'pass' && state !== 'block') return null;
              const d =
                state === 'pass'
                  ? `M${s.x - 3} ${s.y + 0.2} L${s.x - 0.9} ${s.y + 2.4} L${s.x + 3.2} ${s.y - 2}`
                  : `M${s.x - 2.4} ${s.y - 2.4} L${s.x + 2.4} ${s.y + 2.4} M${s.x + 2.4} ${s.y - 2.4} L${s.x - 2.4} ${s.y + 2.4}`;
              return (
                <motion.path
                  key={`mark-${i}-${runKey}-${wide}`}
                  d={d}
                  fill="none"
                  stroke={STATION[state].stroke}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={settled ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={play(states[i].at, 0.25)}
                />
              );
            })}
            {/* the response code, beside the station it ended at */}
            {mode && endStation && (
              <motion.text
                key={`code-${runKey}-${wide}`}
                x={wide ? endStation.x : endStation.x - 16}
                y={wide ? endStation.y - 15 : endStation.y + 4}
                textAnchor={wide ? 'middle' : 'end'}
                className="font-mono"
                fontSize="11"
                fontWeight="500"
                fill={endTone}
                initial={settled ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={play(plan.end, 0.3)}
              >
                {endCode}
              </motion.text>
            )}
            {/* the client, and the request itself */}
            <circle cx={geo.origin.x} cy={geo.origin.y} r="2.5" fill={P.inkSubtle} />
            {mode && (
              <motion.circle
                key={`token-${runKey}-${wide}`}
                r="5"
                stroke={P.void}
                strokeWidth="2"
                initial={{ cx: settled ? last.x : geo.origin.x, cy: settled ? last.y : geo.origin.y, fill: accent }}
                animate={{
                  cx: settled ? last.x : plan.frames.map((f) => f.p.x),
                  cy: settled ? last.y : plan.frames.map((f) => f.p.y),
                  fill: forged ? P.alert : P.jade,
                }}
                transition={
                  settled
                    ? { duration: 0 }
                    : { cx: tokenTiming, cy: tokenTiming, fill: { delay: plan.end, duration: 0.2 } }
                }
                onAnimationComplete={() => setDoneRun(runKey)}
              />
            )}
          </svg>
        )}

        <ol
          aria-label="Request path, from the client to the engine"
          className={wide ? 'relative grid' : 'relative flex flex-col'}
          style={
            wide
              ? {
                  gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
                  paddingTop: PIPE.h.room + PIPE.h.r * 2 + PIPE.h.gap,
                }
              : { paddingTop: PIPE.v.top }
          }
        >
          {path.map((step, i) => (
            <li
              key={step.key}
              className={wide ? 'min-w-0 px-1 text-center' : 'flex min-w-0 flex-col justify-center'}
              style={wide ? undefined : { height: PIPE.v.row, paddingLeft: PIPE.v.x + 22 }}
            >
              <motion.span
                key={`${step.key}-${runKey}`}
                className="block text-label font-medium leading-snug [overflow-wrap:anywhere]"
                initial={{ color: STATION.idle.label }}
                animate={{ color: STATION[states[i].state].label }}
                transition={at(reduce, states[i].at, 0.25)}
              >
                {softBreaks(step.label)}
              </motion.span>
              <span className="mt-1 block text-micro leading-snug text-ink-subtle [overflow-wrap:anywhere]">
                {step.note}
              </span>
              {words(i) && <span className="sr-only"> — {words(i)}</span>}
            </li>
          ))}
        </ol>
      </div>
    </PanelFrame>
  );
}

function renderVisual(decision, props) {
  switch (decision.id) {
    case 'tx':
      return <TxVisual decision={decision} {...props} />;
    case 'snapshot':
      return <SnapshotVisual decision={decision} {...props} />;
    case 'rbac':
      return <RbacVisual decision={decision} {...props} />;
    default:
      return null;
  }
}

/* ── component ─────────────────────────────────────────────────────────── */

export default function Decisions({ accent = P.accent }) {
  return <DecisionList decisions={DECISIONS} renderVisual={renderVisual} accent={accent} />;
}
