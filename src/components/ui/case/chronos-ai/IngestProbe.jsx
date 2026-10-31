'use client';

/**
 * IngestProbe — "Eight stages between a phone's snapshot and its score —
 * every refusal answers with a code."
 *
 * POST /v1/telemetry as a stack of stages, top to bottom, in the order the
 * server runs them (INGEST.stages in the study data): bearer token → rate
 * limit → body size → schema → clock skew → "seen this snapshot before?" →
 * score → one commit. Pick a request (INGEST.probes) and it runs down the
 * stack one stage a beat: the stages it clears tick jade, the one that
 * refuses it turns red with a cross and the status it answers with, and the
 * stages below stay dim. A repeated snapshot is not an error: it stops at
 * the duplicate check with a return arrow and gets the stored score back. A
 * request nothing stops reaches the 200 at the foot.
 *
 * The phone sends snapshots since T2.3 (run in the Simulator); this is the server half,
 * built and tested (tests/test_telemetry.py). The order is real: the size
 * check reads raw bytes before parsing, and the clock-skew check runs before
 * any write.
 *
 * Motion: the first request runs once the panel is a third in view; each
 * stage resolves on its beat while an accent edge marks the stage being
 * checked. Reduced motion: the result, at once. Layout: container queries —
 * a stage's checks sit beside its name from 36rem of panel.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { INGEST } from '@/data/studies/chronos-ai';
import { Choices, Glyph, IN_VIEW, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';

/* ── data ──────────────────────────────────────────────────────────────── */
const STAGES = INGEST.stages;
const PROBES = INGEST.probes;
const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s.key, i]));
const PROBE_BY_KEY = Object.fromEntries(PROBES.map((p) => [p.key, p]));
const COUNT = STAGES.length;

const LEAD_S = 0.2;
const BEAT_S = 0.2;
const arrive = (i) => LEAD_S + i * BEAT_S;
const pad2 = (n) => String(n).padStart(2, '0');

/** probe → the stage it stops at (COUNT = none) and how. */
function planFor(probe) {
  if (!probe) return null;
  const stop = probe.at == null ? COUNT : STAGE_INDEX[probe.at];
  return { stop, returned: Boolean(probe.pass) && probe.at != null, through: probe.at == null };
}

function stateOf(plan, i) {
  if (!plan) return 'idle';
  if (i < plan.stop) return 'tick';
  if (i === plan.stop) return plan.returned ? 'undo' : 'cross';
  return 'idle';
}
const SR = { tick: 'passed', cross: 'refused here', undo: 'returned the stored result here', idle: 'not reached' };

/* ── pieces ────────────────────────────────────────────────────────────── */

function StageRow({ stage, index, plan, code, reduce, accent }) {
  const state = stateOf(plan, index);
  const reached = plan ? index <= plan.stop : true;
  const t = arrive(index);
  const tone = state === 'cross' ? P.alert : state === 'undo' ? P.jade : null;
  const last = stage.items.length - 1;

  return (
    <li className="relative flex gap-3 border-t border-line py-3.5">
      {/* the accent edge: this stage is being checked */}
      {plan && !reduce && index <= plan.stop && (
        <motion.span
          aria-hidden
          className="absolute -left-3 inset-y-1 w-[2px] rounded-full"
          style={{ background: accent }}
          initial={{ opacity: 0 }}
          animate={{ opacity: index === plan.stop ? [0, 1] : [0, 1, 0] }}
          transition={{ delay: t - BEAT_S * 0.5, duration: index === plan.stop ? 0.15 : BEAT_S * 1.2 }}
        />
      )}
      <span className="relative mt-0.5 shrink-0">
        <Glyph kind="idle" />
        {state !== 'idle' && (
          <motion.span
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={at(reduce, t, 0.2)}
          >
            <Glyph kind={state} tone={state === 'undo' ? P.jade : undefined} />
          </motion.span>
        )}
      </span>
      <motion.div
        className="min-w-0 flex-1"
        initial={false}
        animate={{ opacity: reached ? 1 : 0.42 }}
        transition={at(reduce, reached ? 0 : arrive(plan?.stop ?? 0), 0.25)}
      >
        <div className="grid grid-cols-1 gap-y-1.5 @min-[36rem]:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] @min-[36rem]:gap-x-6">
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="font-mono text-micro tabular-nums text-ink-subtle">{pad2(index + 1)}</span>
              <span className="font-display text-base font-semibold text-ink">{stage.label}</span>
              {tone && (
                <motion.span
                  className="font-mono text-micro uppercase tracking-[0.14em]"
                  style={{ color: tone }}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={at(reduce, t, 0.25)}
                >
                  {state === 'undo' ? `returns · ${code}` : `refused · ${code}`}
                </motion.span>
              )}
              <span className="sr-only"> — {SR[state]}</span>
            </p>
            <p className="mt-0.5 font-mono text-micro text-ink-subtle [overflow-wrap:anywhere]">{stage.where}</p>
          </div>
          <ul className="text-[13px] leading-[1.55] text-ink-muted">
            {stage.items.map((item, i) => (
              <li key={item} className="inline">
                {item}
                {i < last && (
                  <span aria-hidden className="px-2 text-ink-faint">
                    ·
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </li>
  );
}

/* ── the panel ─────────────────────────────────────────────────────────── */

export default function IngestProbe({ accent = P.ice }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, PROBES[0].key);
  const probe = active ? PROBE_BY_KEY[active.key] : null;
  const plan = planFor(probe);
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const end = plan ? arrive(Math.min(plan.stop, COUNT)) + 0.2 : 0;

  let status = null;
  let tone = P.inkSubtle;
  if (probe && plan.through) {
    status = `${probe.code} · all ${COUNT} stages`;
    tone = P.jade;
  } else if (probe && plan.returned) {
    status = `${probe.code} · stored result`;
    tone = P.jade;
  } else if (probe) {
    status = `${probe.code} · stopped at ${pad2(plan.stop + 1)}`;
    tone = P.alert;
  }

  return (
    <div ref={ref}>
      <PanelFrame
        caption={INGEST.route}
        controls={
          <Choices
            label="Send a request"
            options={PROBES.map((p) => ({ key: p.key, label: p.label }))}
            value={active?.key ?? null}
            onChoose={choose}
            accent={accent}
          />
        }
        footer={
          probe ? (
            <Readout runKey={runKey} delay={end} reduce={reduce} tone={tone} status={status}>
              <span className="text-body text-ink-muted">{probe.result}</span>
            </Readout>
          ) : (
            <p className="text-body text-ink-subtle">Send a request.</p>
          )
        }
      >
        <div className="@container">
          <ol key={runKey} aria-label="Stages, in order" className="border-b border-line">
            {STAGES.map((stage, i) => (
              <StageRow key={stage.key} stage={stage} index={i} plan={plan} code={probe?.code} reduce={reduce} accent={accent} />
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-mono text-micro text-ink-subtle">
              <motion.span
                key={runKey}
                aria-hidden
                className="inline-flex h-6 items-center rounded-chip border px-2 font-medium"
                initial={false}
                animate={plan?.through ? { color: P.jade, borderColor: alpha(P.jade, 0.4), backgroundColor: alpha(P.jade, 0.08) } : { color: P.inkSubtle, borderColor: P.line, backgroundColor: alpha(P.jade, 0) }}
                transition={at(reduce, plan?.through ? end : 0, 0.3)}
              >
                200
              </motion.span>
              score, breakdown, decision, day state
            </p>
            <p className="font-mono text-micro text-ink-subtle">server side built and tested · the phone sends since T2.3 (Simulator)</p>
          </div>
        </div>
      </PanelFrame>
    </div>
  );
}
