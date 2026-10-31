'use client';

/**
 * Operations — "It runs on one server at the school: one open door, and a
 * backup that catches up after downtime and is restored in CI."
 *
 * Three blocks:
 *   door      the six Docker Compose services (OPS.services) on the school's
 *             server, with Caddy alone on its edge holding the only published
 *             ports. CI's docker job fails if any other
 *             service publishes one. Static — a map, not a demo.
 *   schedule  the backup container's scheduler (ops/backup-cron.sh) run for
 *             three days by ./rules.js on its own 5-minute clock. Pick a
 *             scenario — normal nights, the server switched off over 02:00,
 *             an upload that fails once — and the timeline draws when the
 *             server was up, when each run happened (a jade tick for a
 *             success, a red cross for a failure) and why it was due: the
 *             02:00 run, a catch-up because the last success was over 24 h
 *             old, or the hourly retry. The list under it says the same in
 *             words, and the readout sums it up. Nothing here is a log; the
 *             runs are what the script's rule produces.
 *   chain     what one run does, then the restore drill CI runs on every
 *             pull request and push to main.
 *
 * Motion: the run markers drop in, one after another, when a scenario plays;
 * the first scenario autoplays in view. Reduced motion: all there at once.
 * Layout: the timeline stretches to the panel; hour labels thin out under
 * 36rem of panel, and the run list carries the detail at every width.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { Choices, Glyph, IN_VIEW, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';
import { LABEL } from '@/components/ui/case/shell';
import { OPS } from '@/data/studies/bis-report-card';
import { backupRuns, clockOf } from './rules';

const HOURS = 72;
const RULE = OPS.rule;
const MARK_S = 0.22; // between run markers
const LEAD_S = 0.2;
const pct = (minutes) => `${(minutes / (HOURS * 60)) * 100}%`;
const hrs = (minutes) => {
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`;
};
const pad2 = (n) => String(n).padStart(2, '0');

/* ── the scenarios, simulated once ─────────────────────────────────────── */
const SIMS = OPS.scenarios.map((s) => {
  const runs = backupRuns({ rule: RULE, off: s.off, fail: s.fail, hours: HOURS });
  const withWhy = runs.map((r, i) => {
    const prev = runs[i - 1];
    let why;
    if (prev && !prev.ok) why = `retry, an hour after the failure · last success ${hrs(r.age)} old`;
    else if (r.catchUp) why = `catch-up · last success ${hrs(r.age)} old (over ${RULE.dueAfterH} h)`;
    else why = `${pad2(RULE.hour)}:00 run · last success ${hrs(r.age)} old (over ${RULE.atHourAfterH} h)`;
    return { ...r, why };
  });
  const ok = runs.filter((r) => r.ok).length;
  const failed = runs.length - ok;
  let summary;
  if (s.off.length) {
    const boot = withWhy.find((r) => r.catchUp);
    const after = withWhy[withWhy.indexOf(boot) + 1];
    summary = `The ${pad2(RULE.hour)}:00 run was missed while the server was off. At boot the last success was ${hrs(boot.age)} old, so it ran at once${after ? `; the next followed ${hrs(after.at - boot.at)} later — a fresh backup every day, not a fixed hour` : ''}.`;
  } else if (failed) {
    const f = withWhy.find((r) => !r.ok);
    const retry = withWhy[withWhy.indexOf(f) + 1];
    summary = `The upload at ${clockOf(f.at).split(' · ')[1]} failed — one alert email — and the retry ${retry ? `at ${clockOf(retry.at).split(' · ')[1]}` : 'an hour later'} succeeded. Success stays silent.`;
  } else {
    summary = `${ok} backups, one a night at ${pad2(RULE.hour)}:00. Success sends nothing.`;
  }
  return { ...s, runs: withWhy, ok, failed, summary };
});
const SIM = Object.fromEntries(SIMS.map((s) => [s.key, s]));
const OPTIONS = SIMS.map((s) => ({ key: s.key, label: s.label }));
const DAY_TICKS = [0, 1, 2].map((d) => d * 24 * 60);
const HOUR_MARKS = [0, 1, 2].map((d) => (d * 24 + RULE.hour) * 60);

/* ── the door ──────────────────────────────────────────────────────────── */

function Door() {
  const edge = OPS.services.find((s) => s.ports);
  const inside = OPS.services.filter((s) => !s.ports);
  return (
    <div className="mc-panel min-w-0">
      <p className="mc-label">
        {OPS.services.length} services · only {edge.label} publishes a port
      </p>
      <div className="mt-5 grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,9rem)_2rem_minmax(0,1fr)]">
        <span className="rounded-md border border-line px-3 py-2.5 text-label text-ink-muted">School network · Tailscale from home</span>
        <span aria-hidden="true" className="text-center font-mono text-label text-ink-subtle">
          <span className="md:hidden">↓</span>
          <span className="hidden md:inline">→</span>
        </span>
        <div className="relative rounded-md border border-dashed border-line-hi p-3 pt-4">
          <span className={`${LABEL} absolute -top-2.5 left-3 bg-surface px-1.5 text-ink-subtle`}>the school’s server · Docker Compose</span>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2.5" style={{ borderColor: P.inkMuted }}>
              <span className="font-mono text-label font-medium text-ink">{edge.label}</span>
              <span className="mc-chip">{edge.ports}</span>
              <span className="text-label text-ink-muted">{edge.note}</span>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {inside.map((s) => (
                <li key={s.key} className="rounded-md border border-line px-3 py-2">
                  <span className="font-mono text-label text-ink">{s.label}</span>
                  <span className="mt-0.5 block text-label text-ink-subtle">{s.note}</span>
                  <span className="sr-only"> — publishes no port</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-label text-ink-muted">
        <Glyph kind="tick" />
        CI fails the build if any service but caddy publishes a port.
      </p>
    </div>
  );
}

/* ── the scheduler ─────────────────────────────────────────────────────── */

function Timeline({ sim, reduce, runKey }) {
  return (
    <div aria-hidden="true" className="@container min-w-0">
      {/* day labels */}
      <div className="relative h-5">
        {DAY_TICKS.map((t, d) => (
          <span key={t} className="absolute top-0 font-mono text-micro text-ink-subtle" style={{ left: pct(t) }}>
            <span className="pl-1.5">Day {d + 1}</span>
          </span>
        ))}
      </div>
      {/* the server: up, or off */}
      <div className="relative mt-1 h-6 rounded-sm" style={{ background: alpha(P.ink, 0.05) }}>
        {sim.off.map(([a, b]) => (
          <span
            key={`${a}-${b}`}
            className="absolute inset-y-0 flex items-center justify-center overflow-hidden rounded-sm border border-dashed font-mono text-micro"
            style={{ left: pct(a * 60), width: pct((b - a) * 60), borderColor: alpha(P.sand, 0.6), color: P.sand, background: P.surface }}
          >
            off
          </span>
        ))}
        {DAY_TICKS.slice(1).map((t) => (
          <span key={t} className="absolute inset-y-0 w-px bg-line-hi" style={{ left: pct(t) }} />
        ))}
      </div>
      {/* the runs */}
      <div className="relative mt-2 h-10 border-b border-line">
        {HOUR_MARKS.map((t) => (
          <span key={t} className="absolute bottom-0 top-0 border-l border-dashed" style={{ left: pct(t), borderColor: P.line }} />
        ))}
        {sim.runs.map((r, i) => (
          <motion.span
            key={`${runKey}-${r.at}`}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: pct(r.at) }}
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={at(reduce, LEAD_S + i * MARK_S, 0.3)}
          >
            <Glyph kind={r.ok ? 'tick' : 'cross'} />
          </motion.span>
        ))}
      </div>
      <div className="relative mt-1.5 h-4 font-mono text-micro text-ink-subtle">
        {HOUR_MARKS.map((t, i) => (
          <span key={t} className={`absolute -translate-x-1/2 ${i > 0 ? 'hidden @[36rem]:inline' : ''}`} style={{ left: pct(t) }}>
            {pad2(RULE.hour)}:00
          </span>
        ))}
      </div>
    </div>
  );
}

function Schedule({ accent }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, SIMS[0].key);
  const key = active?.key ?? SIMS[0].key;
  const sim = SIM[key];
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const doneAt = LEAD_S + sim.runs.length * MARK_S;

  return (
    <div ref={ref} className="mt-10 min-w-0">
      <PanelFrame
        caption={`The backup scheduler · ${HOURS / 24} days, by its own rule`}
        controls={<Choices label="Pick a scenario" options={OPTIONS} value={key} onChoose={choose} accent={accent} />}
        footer={
          <Readout runKey={runKey} delay={doneAt} reduce={reduce} tone={sim.failed ? P.sand : P.jade} status={`${sim.ok} ok${sim.failed ? ` · ${sim.failed} failed` : ''}`}>
            <span className="text-body text-ink-muted">{sim.summary}</span>
          </Readout>
        }
      >
        <p className="max-w-[70ch] text-label text-ink-muted">
          Every {RULE.checkMin} minutes it asks: is the last success over {RULE.dueAfterH} h old — or is it {pad2(RULE.hour)}:00 and over{' '}
          {RULE.atHourAfterH} h old? After a failure it waits {RULE.retryMin} minutes.
        </p>
        <div className="mt-5">
          <Timeline sim={sim} reduce={reduce} runKey={runKey} />
        </div>
        <ol aria-label="Backup runs" className="mt-5 border-b border-line">
          {sim.runs.map((r, i) => (
            <motion.li
              key={`${runKey}-${r.at}`}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={at(reduce, LEAD_S + i * MARK_S, 0.3)}
              className="grid grid-cols-[20px_minmax(0,7.5rem)_minmax(0,1fr)] items-start gap-x-3 gap-y-1 border-t border-line py-2.5"
            >
              <Glyph kind={r.ok ? 'tick' : 'cross'} />
              <span className="font-mono text-label tabular-nums text-ink">{clockOf(r.at)}</span>
              <span className="text-label text-ink-muted">
                <span className="sr-only">{r.ok ? 'succeeded' : 'failed'} — </span>
                {r.ok ? '' : 'failed · alert email · '}
                {r.why}
              </span>
            </motion.li>
          ))}
        </ol>
        <p className="mt-3 font-mono text-micro text-ink-subtle">
          The window starts after a success on Day 0 at {pad2(RULE.hour)}:00; each run is taken to finish inside one check.
        </p>
      </PanelFrame>
    </div>
  );
}

/* ── the chain ─────────────────────────────────────────────────────────── */

function Chain({ label, items }) {
  return (
    <div className="min-w-0">
      <p className={`${LABEL} text-ink-subtle`}>{label}</p>
      <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {items.map((it, i) => (
          <li key={it} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden="true" className="font-mono text-micro text-ink-faint">
                →
              </span>
            )}
            <span className="mc-chip">{it}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Operations({ accent = P.accent }) {
  return (
    <div className="min-w-0">
      <Door />
      <Schedule accent={accent} />
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Chain label={`Each run · local copies kept ${OPS.retentionDays} days`} items={OPS.steps} />
        <Chain label="Every pull request · the restore drill in CI" items={OPS.drill} />
      </div>
    </div>
  );
}
