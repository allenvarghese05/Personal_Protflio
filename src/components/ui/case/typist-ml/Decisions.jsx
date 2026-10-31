'use client';

/**
 * Decisions — the hard problems, one row each (governor · claim · ledger),
 * through the kit's DecisionList: kicker, title, Problem / Decision /
 * Trade-off beside a small interactive diagram, and a "Show the code" drawer.
 *
 * The diagrams:
 *   governor — a real heuristic drill built word by word (seed 7, targets
 *              th he in an). A line traces the drill's density before each
 *              word against the window (shaded) and its midpoint (dashed).
 *              Each word is a dot: filled when it was picked for a target
 *              pair, hollow when it was a filler. Scrub or play; the readout
 *              says which branch the governor took and why. Once in view it
 *              plays through; reduced motion shows the whole drill.
 *   claim    — the job queue and the callers racing for it. Four callers,
 *              one job: one gets the id back (jade tick), three get no row
 *              and poll again. One caller, three jobs: the oldest is taken.
 *              Nothing pending: no row, roll back, heartbeat, sleep 2 s.
 *   ledger   — a real run of the retry loop for one example participant:
 *              each attempt's payload, its SHA-256 prefix and the 31-bit
 *              seed, then the drill it produced measured by the gate. Markov
 *              on three common pairs fails once and passes; on four rare
 *              pairs it fails all five and the job is marked failed; the
 *              heuristic passes first try.
 *
 * Everything renders from DECISIONS in src/data/studies/typist-ml.js — the
 * trace, the scenarios and the attempts are outputs of the repo's own code;
 * the counts in the readouts are derived. Sequences start once a panel is a
 * third in view; with reduced motion nothing plays and each diagram shows its
 * final state.
 */
import { Fragment, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { DECISIONS, GATE } from '@/data/studies/typist-ml';
import { Choices, DecisionList, Glyph, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';
import { Scrubber, armLabel, fixed, usePlayer } from '@/components/ui/case/typist-ml/parts';

const range = (n) => Array.from({ length: n }, (_, i) => i);

/* ── governor ──────────────────────────────────────────────────────────── */
const G_BEAT_MS = 170;
const G_SCALE = 0.45; // density axis top; the first two words run off it
const G_TICKS = [0.1, 0.25, 0.4];

function GovernorVisual({ decision, inView, reduce, accent }) {
  const words = decision.trace.map(([word, before, target], i) => ({ i, word, before, target: target === 1 }));
  const last = words.length - 1;
  const player = usePlayer(last, reduce, G_BEAT_MS);
  const { step, playing, started } = player;

  useEffect(() => {
    if (!inView || reduce || started) return undefined;
    const t = setTimeout(() => player.play(0), 400);
    return () => clearTimeout(t);
  }, [inView, reduce, started, player]);

  const w = GATE.window;
  const y = (v) => `${(1 - Math.min(v, G_SCALE) / G_SCALE) * 100}%`;
  const xOf = (i) => `${(i / last) * 100}%`;
  const cur = words[step];
  const over = cur.before > decision.midpoint;
  const targets = words.filter((x) => x.target).length;
  // the polyline in a 0–100 box (stretched; strokes don't scale)
  const pts = words
    .slice(0, step + 1)
    .map((x) => `${((x.i / last) * 100).toFixed(2)},${((1 - Math.min(x.before, G_SCALE) / G_SCALE) * 100).toFixed(2)}`)
    .join(' ');

  const branch = over
    ? `over the ${decision.midpoint.toFixed(2)} midpoint → a filler with no target pair: “${cur.word}”.`
    : `at or under the ${decision.midpoint.toFixed(2)} midpoint → a word for the least-covered target pair: “${cur.word}”.`;

  return (
    <PanelFrame
      caption={`Heuristic drill · ${decision.targets.join(' ')}`}
      controls={null}
      footer={
        <Readout runKey={`g-${step}`} delay={0} reduce={reduce} tone={over ? P.inkSubtle : P.jade} status={over ? 'filler' : 'target word'}>
          <span className="text-body text-ink-muted">
            Word {step + 1}: density so far {fixed(cur.before)} — {branch}
            {step === last && ` The finished drill: ${fixed(decision.finalDensity)}, ${targets} of ${words.length} words picked for a target pair.`}
          </span>
        </Readout>
      }
    >
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2">
        {/* y labels */}
        <div aria-hidden="true" className="relative h-44">
          {G_TICKS.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 font-mono text-micro tabular-nums text-ink-subtle" style={{ top: y(t) }}>
              {t.toFixed(2)}
            </span>
          ))}
        </div>
        <div aria-hidden="true" className="relative h-44">
          <span
            className="absolute inset-x-0 rounded-sm"
            style={{ top: y(w.max), height: `calc(${y(w.min)} - ${y(w.max)})`, background: alpha(P.inkMuted, 0.1), boxShadow: `inset 0 0 0 1px ${alpha(P.inkMuted, 0.2)}` }}
          />
          <span className="absolute inset-x-0 border-t border-dashed" style={{ top: y(decision.midpoint), borderColor: P.inkSubtle }} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <polyline points={pts} fill="none" stroke={alpha(P.inkMuted, 0.7)} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
          </svg>
          {words.slice(0, step + 1).map((x) => (
            <span
              key={x.i}
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: xOf(x.i),
                top: y(x.before),
                ...(x.target ? { background: P.inkMuted } : { background: P.surface, boxShadow: `inset 0 0 0 1.25px ${P.inkMuted}` }),
                ...(x.i === step ? { boxShadow: `0 0 0 2px ${accent}`, background: x.target ? accent : P.surface } : null),
              }}
            />
          ))}
          <span className="absolute inset-y-0 w-px" style={{ left: xOf(step), background: alpha(accent, 0.35) }} />
        </div>
      </div>

      <div className="mt-4">
        <Scrubber
          value={step}
          max={last}
          onChange={player.scrub}
          playing={playing}
          onPlay={() => player.play(step >= last ? 0 : step + 1)}
          onPause={player.pause}
          label="Step through the drill, word by word"
          valueText={`Word ${step + 1} of ${words.length}: ${cur.word}`}
          accent={accent}
        />
      </div>

      <p className="mt-4 font-mono text-label leading-[1.9] [overflow-wrap:anywhere]">
        {words.map((x) => (
          <Fragment key={x.i}>
            <span
              className={x.i > step ? 'text-ink-faint' : x.target ? 'text-ink' : 'text-ink-subtle'}
              style={x.i === step ? { color: accent, boxShadow: `inset 0 -2px 0 ${accent}` } : undefined}
            >
              {x.word}
            </span>{' '}
          </Fragment>
        ))}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-micro text-ink-subtle">
        <span>● picked for a target pair</span>
        <span>○ filler</span>
        <span>dashed = midpoint · shaded = window</span>
      </p>
    </PanelFrame>
  );
}

/* ── claim ─────────────────────────────────────────────────────────────── */
const C_LEAD = 0.25; // the statement goes out
const C_RESOLVE = 0.9; // the winner's row comes back
const C_REST = 1.3; // the others resolve after it
const WINNER = 1; // which caller SQLite happens to serialise first (index)

function ClaimVisual({ decision, inView, reduce, accent }) {
  const [active, choose] = useRun(inView, reduce, decision.scenarios[0].key);
  const sc = decision.scenarios.find((s) => s.key === active?.key) ?? decision.scenarios[0];
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const winner = sc.jobs > 0 ? Math.min(WINNER, sc.callers - 1) : -1;

  let readout;
  if (sc.jobs === 0) readout = { tone: P.inkSubtle, status: 'no row', text: `Nothing pending: no row comes back, the transaction rolls back, the worker rewrites its heartbeat and sleeps ${decision.pollSeconds} s.` };
  else if (sc.callers > 1) readout = { tone: P.jade, status: '1 claimed', text: `${sc.callers} callers, one statement each: exactly one gets the id back and the other ${sc.callers - 1} get no row — the repo’s concurrency test asserts exactly that. A worker that gets no row polls again in ${decision.pollSeconds} s.` };
  else readout = { tone: P.jade, status: 'oldest first', text: `The oldest pending job — by created_at, then id — is the one claimed; the other ${sc.jobs - 1} wait for the next poll.` };

  return (
    <PanelFrame
      caption="claim_next_job()"
      controls={<Choices label="Run the claim" options={decision.scenarios.map(({ key, label }) => ({ key, label }))} value={sc.key} onChoose={choose} accent={accent} />}
      footer={
        active ? (
          <Readout runKey={runKey} delay={reduce ? 0 : C_REST} reduce={reduce} tone={readout.tone} status={readout.status}>
            <span className="text-body text-ink-muted">{readout.text}</span>
          </Readout>
        ) : (
          <p className="text-body text-ink-subtle">Run the claim.</p>
        )
      }
    >
      <div key={runKey} className="@container">
        <div className="grid grid-cols-1 gap-4 @min-[30rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* callers */}
          <div className="min-w-0">
            <span className="mc-label">Callers</span>
            <ol className="mt-3 flex flex-col gap-2">
              {range(sc.callers).map((c) => {
                const won = c === winner;
                const resolveAt = won ? C_RESOLVE : C_REST;
                return (
                  <li key={c} className="flex items-center gap-2.5 rounded-md border border-line bg-surface-2 px-2.5 py-2">
                    <span className="font-mono text-micro text-ink-subtle">worker {c + 1}</span>
                    <motion.span
                      className="min-w-0 flex-1 font-mono text-micro [overflow-wrap:anywhere]"
                      style={{ color: won ? P.jade : P.inkSubtle }}
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: active ? 1 : 0 }}
                      transition={at(reduce, resolveAt, 0.3)}
                    >
                      {won ? '→ job 1 · running' : '→ no row'}
                    </motion.span>
                    <motion.span initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: active ? 1 : 0, scale: 1 }} transition={at(reduce, resolveAt, 0.3)}>
                      <Glyph kind={won ? 'tick' : 'undo'} />
                    </motion.span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* the queue */}
          <div className="min-w-0">
            <span className="mc-label">generation_jobs</span>
            <ol className="mt-3 flex flex-col gap-2">
              {sc.jobs === 0 && <li className="rounded-md border border-dashed border-line px-2.5 py-2 font-mono text-micro text-ink-subtle">no pending rows</li>}
              {range(sc.jobs).map((j) => {
                const claimed = j === 0;
                return (
                  <li key={j} className="flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-2 font-mono text-micro">
                    <span className="text-ink-muted">
                      job {j + 1} <span className="text-ink-subtle">· created {j === 0 ? 'first' : j === 1 ? 'second' : 'third'}</span>
                    </span>
                    <motion.span
                      initial={reduce ? false : { color: P.inkSubtle }}
                      animate={{ color: claimed && active ? accent : P.inkSubtle }}
                      transition={at(reduce, C_RESOLVE, 0.3)}
                    >
                      {claimed && active ? 'running' : 'pending'}
                    </motion.span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
        <motion.p
          className="mt-4 rounded-md border border-line bg-void px-3 py-2 font-mono text-micro leading-relaxed text-ink-muted [overflow-wrap:anywhere]"
          initial={reduce ? false : { opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={at(reduce, C_LEAD, 0.3)}
        >
          <span className="text-lilac">UPDATE</span> … <span className="text-lilac">WHERE</span> id = (oldest pending) <span className="text-lilac">AND</span> status = &apos;pending&apos;{' '}
          <span className="text-lilac">RETURNING</span> id
        </motion.p>
      </div>
    </PanelFrame>
  );
}

/* ── ledger ────────────────────────────────────────────────────────────── */
const L_STEP = 0.45;
const REASON_SHORT = { density_low: 'density low', density_high: 'density high', coverage: 'coverage', bigram_repeat: 'pair run', word_repeat: 'word repeat', too_short: 'too short', bad_charset: 'charset', real_word_ratio: 'real words' };

function LedgerVisual({ decision, inView, reduce, accent }) {
  const [active, choose] = useRun(inView, reduce, decision.runs[0].key);
  const run = decision.runs.find((r) => r.key === active?.key) ?? decision.runs[0];
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const accepted = run.attempts.some((a) => a.reasons.length === 0);
  const n = run.attempts.length;
  const endAt = reduce ? 0 : n * L_STEP + 0.2;
  const short = decision.participant.replace(/^(.{8}).*(.{4})$/, '$1…$2');

  const text = accepted
    ? n === 1
      ? `Passed on the first attempt — one row in generation_attempts, and the drill is saved as ready.`
      : `Rejected ${n - 1}×, then passed on attempt ${n}. All ${n} attempts are rows in generation_attempts; the drill is saved as ready.`
    : `Rejected all ${n} times — the job is marked failed, with the last reasons. Every attempt is kept, so the failure is visible, not hidden.`;

  return (
    <PanelFrame
      caption="generate_with_retries()"
      controls={<Choices label="Run a drill" options={decision.runs.map((r) => ({ key: r.key, label: r.label }))} value={run.key} onChoose={choose} accent={accent} />}
      footer={
        active ? (
          <Readout runKey={runKey} delay={endAt} reduce={reduce} tone={accepted ? P.jade : P.alert} status={accepted ? 'drill ready' : 'job failed'}>
            <span className="text-body text-ink-muted">{text}</span>
          </Readout>
        ) : (
          <p className="text-body text-ink-subtle">Run a drill.</p>
        )
      }
    >
      <p className="font-mono text-micro leading-relaxed text-ink-subtle [overflow-wrap:anywhere]">
        sha256(&quot;{decision.seed}:<span title={decision.participant}>{short}</span>:{run.arm}:0:0:<span style={{ color: accent }}>attempt</span>&quot;)
      </p>
      <ol key={runKey} className="mt-3 flex flex-col gap-2">
        {run.attempts.map((a, i) => {
          const ok = a.reasons.length === 0;
          return (
            <motion.li
              key={a.seed}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-md border bg-surface-2 px-2.5 py-2"
              style={{ borderColor: ok ? alpha(P.jade, 0.45) : P.line }}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: active ? 1 : 0, y: 0 }}
              transition={at(reduce, i * L_STEP, 0.35)}
            >
              <span className="font-mono text-micro tabular-nums text-ink-subtle">{i + 1}</span>
              <span className="min-w-0 font-mono text-micro text-ink-muted">
                <span className="text-ink-subtle">{a.digest}…</span> → seed <span className="tabular-nums text-ink">{a.seed}</span>
                <span className="block text-ink-subtle">
                  density <span style={{ color: a.density < GATE.window.min ? P.alert : P.ink }}>{fixed(a.density)}</span>
                  {!ok && ` · ${a.reasons.map((r) => REASON_SHORT[r] ?? r).join(' · ')}`}
                </span>
              </span>
              <Glyph kind={ok ? 'tick' : 'cross'} />
            </motion.li>
          );
        })}
        {!accepted && (
          <motion.li
            className="rounded-md border px-2.5 py-2 font-mono text-micro"
            style={{ borderColor: alpha(P.alert, 0.45), color: P.alert }}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: active ? 1 : 0 }}
            transition={at(reduce, n * L_STEP, 0.35)}
          >
            DrillGenerationExhaustedError → job status failed, retries + 1
          </motion.li>
        )}
      </ol>
      <p className="mt-3 font-mono text-micro text-ink-subtle">
        {armLabel(run.arm)} · targets {run.targets.join(' ')} · window {GATE.window.min.toFixed(2)}–{GATE.window.max.toFixed(2)} · example participant id
      </p>
    </PanelFrame>
  );
}

/* ── the list ──────────────────────────────────────────────────────────── */
function renderVisual(decision, props) {
  switch (decision.id) {
    case 'governor':
      return <GovernorVisual decision={decision} {...props} />;
    case 'claim':
      return <ClaimVisual decision={decision} {...props} />;
    case 'ledger':
      return <LedgerVisual decision={decision} {...props} />;
    default:
      return null;
  }
}

export default function Decisions({ accent = P.accent }) {
  return <DecisionList decisions={DECISIONS} renderVisual={renderVisual} accent={accent} />;
}
