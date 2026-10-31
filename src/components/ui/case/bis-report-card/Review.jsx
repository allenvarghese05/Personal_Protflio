'use client';

/**
 * Review — "Three states, six moves — and a mark can change only while the
 * card is a draft."
 *
 * Two blocks:
 *   run    one section through review, step by step (REVIEW.run — the
 *          reasons are illustrative, the rules are approval.service.ts's).
 *          A rail of numbered steps is the scrubber: pick one, or press Play
 *          to advance a step per beat. Above it the three states sit side by
 *          side; the one the section is in now is amber, and each says
 *          whether an edit gets through (a jade tick in draft, a red cross
 *          and a 409 otherwise — shape, not just colour). Beside them, what
 *          the printed card would carry right now: the DRAFT watermark until
 *          approval, and "Revision N" once the approval count passes one.
 *          Below, the log: one row per move so far, with who made it, the
 *          audit action it wrote and the notification it sent. "Try an edit"
 *          asks the server what a mark save would get at this step, and the
 *          readout answers with the real status and message.
 *   moves  every move the service allows, as rows: from → to, who, the audit
 *          action, the notification.
 *
 * Everything is derived by replaying REVIEW.run through REVIEW.moves — the
 * state, the approval count, the log, the counts in the headline.
 *
 * Motion: nothing plays on its own. Play steps once a beat to the end. The
 * log rows and readout fade in. Reduced motion: it opens on the finished run
 * and nothing animates; Play still steps.
 *
 * Layout: container queries — the states and the card sit beside the log
 * from 48rem of panel, stacked below that. The rail's dots wrap if they must.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { Glyph, PanelFrame, Readout, at } from '@/components/ui/case/kit';
import { LABEL } from '@/components/ui/case/shell';
import { REVIEW } from '@/data/studies/bis-report-card';

const STATES = REVIEW.states;
const MOVES = REVIEW.moves;
const MOVE = Object.fromEntries(MOVES.map((m) => [m.key, m]));
const STATE = Object.fromEntries(STATES.map((s) => [s.key, s]));
const RUN = REVIEW.run;
const LAST = RUN.length - 1;
const BEAT_MS = 1100;

/** Replay the run up to `step`: the state, the approval count, the log. */
function replay(step) {
  let state = STATES[0].key;
  let count = 0;
  const log = [];
  for (let i = 1; i <= step; i += 1) {
    const r = RUN[i];
    const m = MOVE[r.move];
    if (m.count) count += 1;
    log.push({ i, move: m, from: state, to: m.to, reason: r.reason ?? null, count });
    state = m.to;
  }
  return { state, count, log };
}
const FRAMES = RUN.map((_, i) => replay(i));

const pad2 = (n) => String(n).padStart(2, '0');

/* ── pieces ────────────────────────────────────────────────────────────── */

function StateCard({ state, now, accent }) {
  const open = state.edit.code === 200;
  return (
    <li
      className="relative flex min-w-0 flex-col gap-2 rounded-md border p-3 transition-colors duration-300"
      style={now ? { borderColor: alpha(accent, 0.6), background: alpha(accent, 0.06) } : { borderColor: P.line }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-base font-semibold leading-tight text-ink">{state.label}</span>
        {now && (
          <span className={`${LABEL}`} style={{ color: accent }}>
            now
          </span>
        )}
      </div>
      <span className="flex items-center gap-1.5 font-mono text-micro text-ink-muted">
        <Glyph kind={open ? 'tick' : 'cross'} />
        {open ? 'edit · 200' : 'edit · 409'}
      </span>
      {now && <span className="sr-only">The section is {state.label.toLowerCase()} now.</span>}
    </li>
  );
}

function PrintedFooter({ frame, reduce }) {
  const approved = frame.state === 'approved';
  const revision = REVIEW.revision(frame.count);
  return (
    <div className="rounded-md border border-line bg-void p-3.5">
      <p className={`${LABEL} text-ink-subtle`}>The printed card, now</p>
      <div className="mt-3 flex min-h-[2.25rem] flex-wrap items-center gap-2">
        {approved ? (
          <motion.span
            key={`ok-${frame.count}`}
            className="mc-chip mc-chip--accent"
            style={{ '--chip': P.jade }}
            initial={reduce ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={at(reduce, 0, 0.3)}
          >
            no watermark
          </motion.span>
        ) : (
          <span
            className="inline-flex items-center rounded-chip border border-dashed px-2.5 py-1.5 font-mono text-micro uppercase tracking-[0.12em]"
            style={{ color: P.sand, borderColor: alpha(P.sand, 0.5) }}
          >
            {REVIEW.watermark}
          </span>
        )}
        {approved && revision && (
          <motion.span
            key={revision}
            className="mc-chip"
            initial={reduce ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={at(reduce, 0.1, 0.3)}
          >
            {revision}
          </motion.span>
        )}
      </div>
      <p className="mt-2.5 font-mono text-micro tabular-nums text-ink-subtle">approvalCount = {frame.count}</p>
    </div>
  );
}

function LogRow({ row, current, reduce }) {
  const forward = STATES.findIndex((s) => s.key === row.to) > STATES.findIndex((s) => s.key === row.from);
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={at(reduce, 0, 0.3)}
      className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 border-t border-line py-3"
    >
      <span className="font-mono text-micro leading-6 tabular-nums" style={{ color: current ? P.ink : P.inkSubtle }}>
        {pad2(row.i)}
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2 leading-6">
          <span className={`text-body font-medium ${current ? 'text-ink' : 'text-ink-muted'}`}>{row.move.label}</span>
          <span className="font-mono text-micro text-ink-subtle">
            {STATE[row.from].label.toLowerCase()} {forward ? '→' : '↩'} {STATE[row.to].label.toLowerCase()}
          </span>
        </p>
        <p className="mt-0.5 text-label text-ink-subtle">
          {row.move.by}
          {row.reason && <span className="text-ink-muted"> · “{row.reason}”</span>}
        </p>
        <p className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="mc-chip [overflow-wrap:anywhere]">{row.move.audit}</span>
          {row.move.notify ? (
            <span className="mc-chip [overflow-wrap:anywhere]">{row.move.notify.kind}</span>
          ) : (
            <span className="mc-chip text-ink-subtle">no notification</span>
          )}
        </p>
      </div>
    </motion.li>
  );
}

/** The scrubber: one numbered dot per step on a rail. */
function StepRail({ step, onPick, accent }) {
  return (
    <div role="group" aria-label="Step through the review" className="relative">
      <span aria-hidden="true" className="absolute left-3.5 right-3.5 top-3.5 h-px bg-line-hi" />
      <ol className="relative flex flex-wrap justify-between gap-y-3">
        {RUN.map((r, i) => {
          const now = i === step;
          const done = i < step;
          const label = i === 0 ? 'Start · draft' : MOVE[r.move].label;
          return (
            <li key={`${i}-${r.move ?? 'start'}`}>
              <button
                type="button"
                aria-pressed={now}
                aria-label={`Step ${i}: ${label}`}
                onClick={() => onPick(i)}
                className="flex h-7 w-7 items-center justify-center rounded-full border bg-surface font-mono text-micro tabular-nums transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                style={
                  now
                    ? { borderColor: accent, color: P.void, background: accent }
                    : done
                      ? { borderColor: alpha(P.jade, 0.6), color: P.jade }
                      : { borderColor: P.lineHi, color: P.inkSubtle }
                }
              >
                {i}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RunPanel({ accent }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [picked, setPicked] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [probeAt, setProbeAt] = useState(null); // the step "Try an edit" was pressed on
  const step = picked ?? (reduce ? LAST : 0);
  const frame = FRAMES[step];
  const last = frame.log[frame.log.length - 1] ?? null;
  const probing = probeAt === step;
  const edit = STATE[frame.state].edit;

  useEffect(() => {
    if (!playing) return undefined;
    const id = setTimeout(() => {
      if (step >= LAST) setPlaying(false);
      else setPicked(step + 1);
    }, BEAT_MS);
    return () => clearTimeout(id);
  }, [playing, step]);

  const pick = (i) => {
    setPlaying(false);
    setPicked(i);
  };
  const play = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (step >= LAST) setPicked(0);
    setPlaying(true);
  };

  let footer;
  if (probing) {
    footer = (
      <Readout runKey={`probe-${step}`} reduce={reduce} tone={edit.code === 200 ? P.jade : P.alert} status={`${edit.code}`}>
        <span className="text-body text-ink-muted">{edit.text}</span>
      </Readout>
    );
  } else if (last) {
    footer = (
      <Readout runKey={`step-${step}`} reduce={reduce} tone={accent} status={`Step ${step} · ${last.move.label}`}>
        <span className="text-body text-ink-muted">
          {last.move.by}: {STATE[last.from].label.toLowerCase()} → {STATE[last.to].label.toLowerCase()}.
          {last.move.count ? ` The approval count is now ${last.count}.` : ''}
          {last.move.notify ? ` In-app notice to ${last.move.notify.to}.` : ' No one is notified.'}
        </span>
      </Readout>
    );
  } else {
    footer = <p className="text-body text-ink-subtle">A new section starts as a draft — editable, and watermarked if printed.</p>;
  }

  return (
    <div ref={ref}>
      <PanelFrame
        caption="One section through review · an illustrative run"
        controls={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={play}
              aria-pressed={playing}
              className="rounded-chip border border-line px-3 py-2 font-mono text-micro tracking-[0.04em] text-ink-muted transition-colors hover:border-line-hi hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {playing ? 'Pause' : step >= LAST ? 'Replay' : 'Play'}
            </button>
            <button
              type="button"
              onClick={() => setProbeAt(step)}
              className="rounded-chip border px-3 py-2 font-mono text-micro tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              style={probing ? { color: accent, borderColor: alpha(accent, 0.5), background: alpha(accent, 0.08) } : { borderColor: P.line, color: P.inkMuted }}
            >
              Try to edit a mark
            </button>
          </div>
        }
        footer={footer}
      >
        <div className="@container min-w-0">
          <StepRail step={step} onPick={pick} accent={accent} />
          <p className="mt-3 font-mono text-micro text-ink-subtle">
            {inView || reduce ? `${step} of ${LAST} moves` : `${LAST} moves`}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @3xl:gap-8">
            <div className="flex min-w-0 flex-col gap-4">
              <ul aria-label="Review states" className="grid grid-cols-1 gap-2 @md:grid-cols-3">
                {STATES.map((s) => (
                  <StateCard key={s.key} state={s} now={s.key === frame.state} accent={accent} />
                ))}
              </ul>
              <p className="text-label text-ink-muted">{STATE[frame.state].note}</p>
              <PrintedFooter frame={frame} reduce={reduce} />
            </div>

            <div className="min-w-0">
              <p className={`${LABEL} text-ink-subtle`}>The log · one audit row per move</p>
              {frame.log.length ? (
                <ol aria-label="Moves so far" className="mt-2 border-b border-line">
                  {frame.log.map((row) => (
                    <LogRow key={row.i} row={row} current={row.i === step} reduce={reduce} />
                  ))}
                </ol>
              ) : (
                <p className="mt-3 border-t border-line pt-3 text-label text-ink-subtle">Nothing yet — step forward.</p>
              )}
            </div>
          </div>
        </div>
      </PanelFrame>
    </div>
  );
}

/** Every move the service allows. */
function MoveTable() {
  return (
    <div className="mt-16">
      <p className={`${LABEL} text-ink-subtle`}>Every move the service allows</p>
      <ul className="mt-4 border-b border-line">
        {MOVES.map((m) => {
          const forward = STATES.findIndex((s) => s.key === m.to) > STATES.findIndex((s) => s.key === m.from);
          return (
            <li
              key={m.key}
              className="grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-line py-4 md:grid-cols-[minmax(0,11rem)_minmax(0,11rem)_minmax(0,1fr)] md:items-baseline"
            >
              <span className="text-body font-medium text-ink">{m.label}</span>
              <span className="font-mono text-label text-ink-muted">
                {STATE[m.from].label} {forward ? '→' : '↩'} {STATE[m.to].label}
              </span>
              <span className="text-label text-ink-subtle">
                {m.by} · <span className="font-mono [overflow-wrap:anywhere]">{m.audit}</span>
                {m.reason ? ' · reason required' : ''} ·{' '}
                {m.notify ? `${m.notify.kind} → ${m.notify.to}` : 'no notification'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Review({ accent = P.accent }) {
  return (
    <div className="min-w-0">
      <RunPanel accent={accent} />
      <MoveTable />
    </div>
  );
}
