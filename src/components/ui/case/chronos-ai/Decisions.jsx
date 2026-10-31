'use client';

/**
 * Decisions — the hard problems, one row each (DecisionList from the kit:
 * kicker, title, Problem / Decision / Trade-off, the visual, the code).
 *
 * The visuals:
 *   reweight — the six rules as cap bars on one scale. "Pedometer denied"
 *              greys out the three motion rules (dashed, skipped) and grows
 *              unlocked, charger and app-opened to 35 / 25 / 40. Under the
 *              bars, the best score reachable without opening the app on a
 *              0–100 track with the 70 line: 95 with the pedometer, 60
 *              without — computed from RULES by ceilingWithoutApp(). Then
 *              the validator's catch: the design doc's 35 + 30 + 40 = 105,
 *              refused; the YAML's 35 + 25 + 40 = 100, accepted.
 *   versions — the rule_versions ledger and the four steps of
 *              activate_new_version(). Same rules: hashed, matched, stop —
 *              200, nothing written. Edited rules: version 1 deactivated,
 *              version 2 inserted — 201. Insert fails: the savepoint undoes
 *              the deactivation too — version 1 stays active.
 *   dst      — the night the clocks go back in New York, on a UTC axis with
 *              the wall clock under it: 01:00 happens twice. The 03:00 day
 *              boundary splits the night between Saturday and Sunday, and
 *              Sunday's window opens at 13:00 UTC, an hour later than
 *              Saturday's. Pick one of the dst_fall_back fixture's ticks to
 *              see which day it lands in and whether the gate is open.
 *
 * Everything renders from DECISIONS, RULES and MORNINGS in the study data.
 * Panels start once a third is in view; with reduced motion each shows its
 * final state and nothing plays.
 */
import { motion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { DECISIONS, MORNINGS, RULES } from '@/data/studies/chronos-ai';
import { Choices, DecisionList, Glyph, LegendItem, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';
import { ceilingWithoutApp } from './score';

const { confirm: CONFIRM } = RULES.thresholds;

/* ── reweight ──────────────────────────────────────────────────────────── */
const MAX_CAP = Math.max(...RULES.rules.map((r) => r.cap), ...Object.values(RULES.reweight));
const CEILING = { on: ceilingWithoutApp(RULES, false), off: ceilingWithoutApp(RULES, true) };
const REWEIGHT_SUM = Object.values(RULES.reweight).reduce((n, v) => n + v, 0);
// the design doc's draft (docs/03 §4), recorded in the YAML comment: charger was 30
const DRAFT = { ...RULES.reweight, charger_disconnect: 30 };
const DRAFT_SUM = Object.values(DRAFT).reduce((n, v) => n + v, 0);
const REWEIGHT_IDS = Object.keys(RULES.reweight);
const NO_APP_MORNING = MORNINGS.find((m) => m.id === 'pedometer_denied_no_app');

function ReweightVisual({ inView, reduce, accent }) {
  const [active, choose] = useRun(inView, reduce, 'off');
  const mode = active?.key ?? 'on';
  const off = mode === 'off';
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const ceiling = CEILING[mode];
  const noAppScores = NO_APP_MORNING.ticks.filter((t) => t.expect.decision !== 'outside_window').map((t) => t.expect.score);

  return (
    <PanelFrame
      caption="Caps, with and without the pedometer"
      controls={
        <Choices
          label="Pedometer permission"
          options={[
            { key: 'on', label: 'Pedometer allowed' },
            { key: 'off', label: 'Pedometer denied' },
          ]}
          value={active?.key ?? null}
          onChoose={choose}
          accent={accent}
        />
      }
      footer={
        active ? (
          <Readout runKey={runKey} delay={0.5} reduce={reduce} tone={off ? P.sand : P.jade} status={off ? `Ceiling ${ceiling} < ${CONFIRM}` : `Ceiling ${ceiling}`}>
            <span className="text-body text-ink-muted">
              {off
                ? `Without the app, unlocked and unplugged top out at ${ceiling}. The no-pedometer, no-app fixture scores ${noAppScores.join(', then ')} — and never confirms. Opening the app (+${RULES.reweight.foreground}) is what gets a denied day over the line.`
                : `With the pedometer, the five background rules can reach ${ceiling} without the app ever opening.`}
            </span>
          </Readout>
        ) : (
          <p className="text-body text-ink-subtle">Allow or deny the pedometer.</p>
        )
      }
    >
      <ul aria-label="Rule caps" className="flex flex-col gap-3">
        {RULES.rules.map((r, i) => {
          const skipped = off && r.pedometer;
          const reweighted = off && RULES.reweight[r.id] != null;
          const cap = skipped ? 0 : reweighted ? RULES.reweight[r.id] : r.cap;
          const changed = reweighted && cap !== r.cap;
          return (
            <li key={r.id} className="grid grid-cols-[7.5rem_minmax(0,1fr)_3.5rem] items-center gap-3">
              <span className={`truncate text-label ${skipped ? 'text-ink-subtle' : 'text-ink'}`}>{r.label}</span>
              <span className="relative h-5">
                <span className="absolute inset-0 rounded-[3px] border border-line" />
                <motion.span
                  key={`${r.id}-bar`}
                  className="absolute inset-y-0 left-0 rounded-[3px]"
                  style={{ background: alpha(P.inkMuted, 0.2), boxShadow: changed ? `inset 0 0 0 1px ${alpha(P.inkMuted, 0.6)}` : undefined }}
                  initial={false}
                  animate={{ width: `${(cap / MAX_CAP) * 100}%` }}
                  transition={at(reduce, 0.1 + i * 0.05, 0.45)}
                />
                {skipped && (
                  <span className="absolute inset-0 flex items-center rounded-[3px] px-2 font-mono text-micro text-ink-subtle" style={{ border: `1px dashed ${P.lineHi}` }}>
                    skipped
                  </span>
                )}
              </span>
              <span className="text-right font-mono text-label tabular-nums">
                {changed && <span className="mr-1.5 text-ink-subtle line-through">{r.cap}</span>}
                <span className={skipped ? 'text-ink-subtle' : 'text-ink'}>{skipped ? '—' : cap}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* the ceiling without the app */}
      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="mc-label">Best without opening the app</p>
          <p className="font-display text-2xl font-semibold tabular-nums text-ink">{ceiling}</p>
        </div>
        <div className="relative mt-3 h-3 rounded-full border border-line">
          <motion.span
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: alpha(P.inkMuted, 0.25) }}
            initial={false}
            animate={{ width: `${ceiling}%` }}
            transition={at(reduce, 0.3, 0.5)}
          />
          <motion.span
            aria-hidden
            className="absolute -inset-y-1 w-[2px] -translate-x-1/2 rounded-full"
            style={{ background: accent }}
            initial={false}
            animate={{ left: `${ceiling}%` }}
            transition={at(reduce, 0.3, 0.5)}
          />
          <span aria-hidden className="absolute -inset-y-2 w-px bg-ink-subtle" style={{ left: `${CONFIRM}%` }} />
        </div>
        <div className="relative mt-2 h-4 font-mono text-micro text-ink-subtle">
          <span className="absolute -translate-x-1/2" style={{ left: `${CONFIRM}%` }}>
            {CONFIRM} · confirm line
          </span>
        </div>
      </div>

      {/* what the validator caught */}
      <div className="mt-5 border-t border-line pt-4">
        <p className="mc-label">The validator · reweights must sum ≤ 100</p>
        <ul className="mt-3 flex flex-col gap-2 font-mono text-micro">
          <li className="flex items-center gap-2.5 text-ink-muted">
            <Glyph kind="cross" />
            <span>
              design doc · {REWEIGHT_IDS.map((id) => DRAFT[id]).join(' + ')} = {DRAFT_SUM} <span className="text-alert">refused</span>
            </span>
          </li>
          <li className="flex items-center gap-2.5 text-ink-muted">
            <Glyph kind="tick" />
            <span>
              wake_rules.yaml · {REWEIGHT_IDS.map((id) => RULES.reweight[id]).join(' + ')} = {REWEIGHT_SUM} <span className="text-jade">accepted</span>
            </span>
          </li>
        </ul>
      </div>
    </PanelFrame>
  );
}

/* ── versions ──────────────────────────────────────────────────────────── */
const V_STEPS = ['Hash the canonical JSON', 'Compare with the active row', 'Deactivate the old row', 'Insert version n + 1'];
// per outcome: each step's glyph, and the ledger it leaves
const V_PLAN = {
  noop: { steps: ['tick', 'tick', 'skip', 'skip'], hash: 'same', rows: [{ v: 1, source: 'yaml', active: true }] },
  created: { steps: ['tick', 'tick', 'tick', 'tick'], hash: 'different', rows: [{ v: 1, source: 'yaml', active: false }, { v: 2, source: 'api', active: true }] },
  rollback: { steps: ['tick', 'tick', 'undo', 'cross'], hash: 'different', rows: [{ v: 1, source: 'yaml', active: true }, { v: 2, source: 'api', active: false, ghost: true }] },
};
const V_TONE = { noop: P.jade, created: P.jade, rollback: P.sand };
const V_STEP_S = 0.32;

function VersionsVisual({ decision, inView, reduce, accent }) {
  const scenarios = decision.scenarios;
  const [active, choose] = useRun(inView, reduce, 'edit');
  const sc = scenarios.find((s) => s.key === active?.key) ?? null;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const plan = sc ? V_PLAN[sc.outcome] : null;
  const end = 0.2 + V_STEPS.length * V_STEP_S;

  return (
    <PanelFrame
      caption="PUT /v1/config/wake → activate_new_version()"
      controls={<Choices label="Apply rules" options={scenarios.map(({ key, label }) => ({ key, label }))} value={sc?.key ?? null} onChoose={choose} accent={accent} />}
      footer={
        sc ? (
          <Readout runKey={runKey} delay={end} reduce={reduce} tone={V_TONE[sc.outcome]} status={sc.status}>
            <span className="text-body text-ink-muted">{sc.readout}</span>
          </Readout>
        ) : (
          <p className="text-body text-ink-subtle">Apply a rule set.</p>
        )
      }
    >
      <div key={runKey} className="@container">
        <div className="grid gap-5 @min-[32rem]:grid-cols-2">
          {/* the steps, in one savepoint */}
          <div className="min-w-0">
            <p className="mc-label">One savepoint</p>
            <ol className="mt-3 flex flex-col">
              {V_STEPS.map((label, i) => {
                const g = plan?.steps[i] ?? 'idle';
                const skip = g === 'skip';
                return (
                  <li key={label} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                    <span className="relative">
                      <Glyph kind="idle" />
                      {plan && !skip && (
                        <motion.span className="absolute inset-0" initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={at(reduce, 0.2 + i * V_STEP_S, 0.2)}>
                          <Glyph kind={g} />
                        </motion.span>
                      )}
                    </span>
                    <span className={`text-label ${skip ? 'text-ink-subtle line-through' : 'text-ink-muted'}`}>
                      {label}
                      {i === 1 && plan && <span className="text-ink-subtle"> · SHA-256 {plan.hash}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* the ledger it leaves */}
          <div className="min-w-0">
            <p className="mc-label">rule_versions</p>
            <table className="mt-3 w-full border-collapse font-mono text-micro">
              <thead>
                <tr className="text-left text-ink-subtle">
                  <th className="pb-2 font-medium">version</th>
                  <th className="pb-2 font-medium">source</th>
                  <th className="pb-2 text-right font-medium">active</th>
                </tr>
              </thead>
              <tbody>
                {(plan?.rows ?? V_PLAN.noop.rows).map((row) => (
                  <motion.tr
                    key={row.v}
                    className="border-t border-line"
                    initial={reduce || row.v === 1 ? false : { opacity: 0 }}
                    animate={{ opacity: row.ghost ? 0.5 : 1 }}
                    transition={at(reduce, row.v === 1 ? 0 : 0.2 + 3 * V_STEP_S, 0.3)}
                  >
                    <td className={`py-2 tabular-nums ${row.ghost ? 'text-alert line-through' : 'text-ink'}`}>v{row.v}</td>
                    <td className="py-2 text-ink-muted">{row.source}</td>
                    <td className="py-2 text-right">
                      <motion.span
                        className="inline-flex items-center justify-end gap-1.5"
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={at(reduce, end - 0.2, 0.3)}
                        style={{ color: row.active ? accent : P.inkSubtle }}
                      >
                        {row.ghost ? 'rolled back' : row.active ? '1 · active' : '0'}
                      </motion.span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[13px] leading-snug text-ink-subtle">A partial unique index (WHERE active = 1) makes a second active row impossible.</p>
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}

/* ── dst ───────────────────────────────────────────────────────────────── */
const DST_MORNING = MORNINGS.find((m) => m.id === 'dst_fall_back');
const utcMin = (iso) => {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};
const hm = (s) => s.split(':').map(Number).reduce((h, m) => h * 60 + m);
const AXIS = [4 * 60, 15 * 60]; // UTC on Nov 1
const xPct = (m) => `${((m - AXIS[0]) / (AXIS[1] - AXIS[0])) * 100}%`;

function DstVisual({ decision, inView, reduce, accent }) {
  const sc = decision.scenario;
  const transition = hm(sc.transitionUtc);
  const boundary = hm(sc.boundaryUtc);
  const sunday = sc.windows[1];
  const sundayOpen = hm(sunday.utc[0]);
  // the fixture's first three ticks: two 01:30s, then 08:00 on Sunday
  const events = DST_MORNING.ticks.slice(0, 3).map((t, i) => {
    const u = utcMin(t.ts);
    const zone = u < transition ? 'EDT' : 'EST';
    return { key: `e${i}`, label: `${t.local} ${zone}`, u, tick: t, day: t.date === '2026-10-31' ? sc.windows[0] : sunday };
  });
  const [active, choose] = useRun(inView, reduce, events[1].key);
  const ev = events.find((e) => e.key === active?.key) ?? null;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const open = ev?.tick.expect.decision !== 'outside_window';
  const wall = [
    { u: 5 * 60, text: '01:00 EDT' },
    { u: transition, text: '01:00 EST' },
    { u: boundary, text: '03:00' },
    { u: sundayOpen, text: '08:00' },
  ];

  return (
    <PanelFrame
      caption={`${sc.tz} · Nov 1, clocks go back`}
      controls={<Choices label="Pick a tick" options={events.map((e) => ({ key: e.key, label: e.label }))} value={ev?.key ?? null} onChoose={choose} accent={accent} />}
      footer={
        ev ? (
          <Readout runKey={runKey} delay={0.35} reduce={reduce} tone={open ? P.jade : P.inkSubtle} status={`${ev.day.date} · gate ${open ? 'open' : 'closed'}`}>
            <span className="text-body text-ink-muted">{ev.tick.note}</span>
          </Readout>
        ) : (
          <p className="text-body text-ink-subtle">Pick a tick.</p>
        )
      }
    >
      <div className="px-1">
        {/* UTC above */}
        <div aria-hidden className="relative h-4 font-mono text-micro tabular-nums text-ink-subtle">
          {[4, 6, 8, 10, 12, 14].map((h) => (
            <span key={h} className={`absolute top-0 ${h === 4 ? '' : '-translate-x-1/2'}`} style={{ left: xPct(h * 60) }}>
              {String(h).padStart(2, '0')}Z
            </span>
          ))}
        </div>

        <div aria-hidden className="relative mt-2 h-16 rounded-[4px] border border-line">
          {/* which local date each instant belongs to */}
          <div className="absolute inset-y-0 left-0 border-r border-dashed" style={{ width: xPct(boundary), borderColor: P.lineHi, background: alpha(P.inkMuted, 0.05) }}>
            <span className="absolute left-2 top-1.5 font-mono text-micro text-ink-subtle">→ Sat Oct 31</span>
          </div>
          <span className="absolute top-1.5 font-mono text-micro text-ink-subtle" style={{ left: `calc(${xPct(boundary)} + 0.5rem)` }}>
            Sun Nov 1
          </span>
          {/* Sunday's window */}
          <div className="absolute inset-y-0 right-0" style={{ left: xPct(sundayOpen), background: alpha(P.jade, 0.08), borderLeft: `1px solid ${alpha(P.jade, 0.45)}` }} />
          {/* the transition */}
          <span className="absolute inset-y-0 w-px" style={{ left: xPct(transition), background: P.sand }} />
          {/* the ticks */}
          {events.map((e) => {
            const on = e.key === ev?.key;
            return (
              <span
                key={e.key}
                className="absolute bottom-2 h-3 w-3 -translate-x-1/2 rounded-full"
                style={on ? { left: xPct(e.u), background: accent, boxShadow: `0 0 0 3px ${alpha(accent, 0.25)}` } : { left: xPct(e.u), boxShadow: `inset 0 0 0 1.5px ${P.inkMuted}` }}
              />
            );
          })}
        </div>

        {/* the wall clock below */}
        <div aria-hidden className="relative mt-2 h-4 font-mono text-micro tabular-nums">
          {wall.map((w, i) => (
            <span key={w.text} className={`absolute top-0 -translate-x-1/2 whitespace-nowrap ${i < 2 ? 'text-sand' : 'text-ink-subtle'} ${i === 1 ? 'translate-y-4' : ''}`} style={{ left: xPct(w.u) }}>
              {w.text}
            </span>
          ))}
        </div>
        <div className="h-4" />

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-micro text-ink-subtle">
          <LegendItem label="clocks go back · 02:00 EDT → 01:00 EST">
            <rect x="6.5" y="1" width="1" height="12" fill={P.sand} />
          </LegendItem>
          <LegendItem label="03:00 · a new local day">
            <rect x="6.5" y="1" width="1" height="12" fill={P.lineHi} />
          </LegendItem>
          <LegendItem label="Sunday’s window">
            <rect x="2" y="3" width="10" height="8" rx="1.5" fill={alpha(P.jade, 0.3)} />
          </LegendItem>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {sc.windows.map((w) => {
            const on = ev?.day === w;
            return (
              <li key={w.date} className="rounded-[6px] border px-3 py-2.5" style={{ borderColor: on ? alpha(accent, 0.45) : P.line }}>
                <p className="text-label font-medium text-ink">{w.date}</p>
                <p className="mt-0.5 font-mono text-micro text-ink-subtle">
                  window {w.local} = {w.utc.join('–')} UTC
                </p>
              </li>
            );
          })}
        </ul>
        <p className="sr-only">
          The 01:30 that happens twice — 05:30 and 06:30 UTC — is before the 03:00 boundary both times, so both belong to Saturday October 31. Sunday’s 08:00 window opens at 13:00 UTC.
        </p>
      </div>
    </PanelFrame>
  );
}

/* ── the list ──────────────────────────────────────────────────────────── */

function renderVisual(decision, props) {
  if (decision.id === 'reweight') return <ReweightVisual decision={decision} {...props} />;
  if (decision.id === 'versions') return <VersionsVisual decision={decision} {...props} />;
  if (decision.id === 'dst') return <DstVisual decision={decision} {...props} />;
  return null;
}

export default function Decisions({ accent = P.ice }) {
  return <DecisionList decisions={DECISIONS} renderVisual={renderVisual} accent={accent} />;
}
