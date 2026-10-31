'use client';

/**
 * Milestones — "20 of 46 planned tasks are merged: the wake engine works; the
 * Morning Reel is still a plan."
 *
 * The implementation plan (docs/11-implementation-plan.md), task by task, as
 * the honest centrepiece: one row per milestone (M0 Foundation … M6
 * Hardening), one chip per task. The chip's shape says its state, so it
 * reads without colour:
 *
 *   ●  built     merged on main (jade, filled)
 *   ◐  caveat    merged, with a gap said plainly — Simulator only, a manual
 *                check with no recorded run, protection deferred (jade, half)
 *   ◆  next      the task being worked on next (the accent — the current thing)
 *   ○  planned   designed, not built (hollow)
 *
 * Every chip is a toggle: pick one and the readout names the task, its pull
 * request and the caveat, if there is one. Each row ends with its count, and
 * the summary above is counted from MILESTONES — nothing typed in.
 *
 * Motion: rows fade up once in view; the "next" task is picked on arrival.
 * Reduced motion: everything is simply there, the next task picked.
 * Layout: the label column sits beside the chips from 40rem of panel and
 * above them below that; chips wrap at any width.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { MILESTONES } from '@/data/studies/chronos-ai';
import { IN_VIEW, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';

/* ── data ──────────────────────────────────────────────────────────────── */
const ALL = MILESTONES.flatMap((m) => m.tasks.map((t) => ({ ...t, milestone: m })));
const BY_ID = Object.fromEntries(ALL.map((t) => [t.id, t]));
const isMerged = (t) => t.state === 'built' || t.state === 'caveat';
const MERGED = ALL.filter(isMerged).length;
const TOTAL = ALL.length;
const NEXT = ALL.find((t) => t.state === 'next');
const COUNT = (state) => ALL.filter((t) => t.state === state).length;

const STATE_TEXT = { built: 'Merged', caveat: 'Merged · with a gap', next: 'Next', planned: 'Planned · not built' };

/** The shape for a state, 12px. */
function Mark({ state, accent, size = 12 }) {
  const r = size / 2 - 1;
  const c = size / 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" className="block shrink-0">
      {state === 'built' && <circle cx={c} cy={c} r={r} fill={P.jade} />}
      {state === 'caveat' && (
        <>
          <circle cx={c} cy={c} r={r} fill="none" stroke={P.jade} strokeWidth="1.25" />
          <path d={`M${c} ${c - r} A${r} ${r} 0 0 0 ${c} ${c + r} Z`} fill={P.jade} />
        </>
      )}
      {state === 'next' && <rect x={c - r * 0.72} y={c - r * 0.72} width={r * 1.44} height={r * 1.44} fill={accent} transform={`rotate(45 ${c} ${c})`} />}
      {state === 'planned' && <circle cx={c} cy={c} r={r} fill="none" stroke={P.inkSubtle} strokeWidth="1.25" />}
    </svg>
  );
}

function TaskChip({ task, on, onPick, accent }) {
  const planned = task.state === 'planned';
  return (
    <li>
      <button
        type="button"
        aria-pressed={on}
        onClick={() => onPick(task.id)}
        className={`inline-flex items-center gap-1.5 rounded-chip border px-2 py-1.5 font-mono text-micro tabular-nums transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          on ? '' : `border-line hover:border-line-hi hover:text-ink ${planned ? 'text-ink-subtle' : 'text-ink-muted'}`
        }`}
        style={on ? { color: accent, borderColor: alpha(accent, 0.5), background: alpha(accent, 0.08) } : undefined}
      >
        <Mark state={task.state} accent={accent} />
        {task.id}
        <span className="sr-only">
          {' '}
          — {task.title}, {STATE_TEXT[task.state]}
        </span>
      </button>
    </li>
  );
}

/* ── the panel ─────────────────────────────────────────────────────────── */

export default function Milestones({ accent = P.ice }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, NEXT?.id ?? ALL[0].id);
  const task = active ? BY_ID[active.key] : null;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const shown = reduce || inView;
  const tone = task ? { built: P.jade, caveat: P.sand, next: accent, planned: P.inkSubtle }[task.state] : P.inkSubtle;

  const legend = [
    { state: 'built', label: `merged · ${COUNT('built')}` },
    { state: 'caveat', label: `merged with a gap · ${COUNT('caveat')}` },
    { state: 'next', label: `next · ${COUNT('next')}` },
    { state: 'planned', label: `planned · ${COUNT('planned')}` },
  ];

  return (
    <div ref={ref}>
      <PanelFrame
        caption="docs/11-implementation-plan.md · task by task"
        controls={
          <ul className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-micro text-ink-subtle">
            {legend.map((l) => (
              <li key={l.state} className="inline-flex items-center gap-1.5">
                <Mark state={l.state} accent={accent} />
                {l.label}
              </li>
            ))}
          </ul>
        }
        footer={
          task ? (
            <Readout runKey={runKey} delay={0.05} reduce={reduce} tone={tone} status={`${task.id} · ${STATE_TEXT[task.state]}`}>
              <span className="text-body text-ink-muted">
                <span className="text-ink">{task.title}</span>
                {task.pr ? ` — merged in PR ${task.pr}.` : '.'}
                {task.note ? ` ${task.note}` : ''}
              </span>
            </Readout>
          ) : (
            <p className="text-body text-ink-subtle">Pick a task.</p>
          )
        }
      >
        <div className="@container">
          <ol className="border-b border-line">
            {MILESTONES.map((m, i) => {
              const merged = m.tasks.filter(isMerged).length;
              return (
                <motion.li
                  key={m.key}
                  className="grid grid-cols-1 gap-x-6 gap-y-2.5 border-t border-line py-3.5 @min-[40rem]:grid-cols-[11rem_minmax(0,1fr)_4rem] @min-[40rem]:items-center"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={at(reduce, i * 0.06, 0.45)}
                >
                  <p className="flex items-baseline gap-2.5">
                    <span className="font-mono text-micro tabular-nums" style={{ color: merged === m.tasks.length ? P.jade : P.inkSubtle }}>
                      {m.key}
                    </span>
                    <span className="font-display text-base font-semibold text-ink">{m.label}</span>
                    <span className="ml-auto font-mono text-micro tabular-nums text-ink-subtle @min-[40rem]:hidden">
                      {merged} / {m.tasks.length}
                    </span>
                  </p>
                  <ul aria-label={`${m.label} tasks`} className="flex flex-wrap gap-1.5">
                    {m.tasks.map((tk) => (
                      <TaskChip key={tk.id} task={tk} on={active?.key === tk.id} onPick={choose} accent={accent} />
                    ))}
                  </ul>
                  <p className="hidden text-right font-mono text-micro tabular-nums text-ink-subtle @min-[40rem]:block">
                    {merged} / {m.tasks.length}
                  </p>
                </motion.li>
              );
            })}
          </ol>
          <p className="mt-3 font-mono text-micro text-ink-subtle">
            {MERGED} of {TOTAL} merged · the phone has only run in the iOS Simulator · of the reel, only a Remotion cover scene exists (T0.5); M3–M5 are not built
          </p>
        </div>
      </PanelFrame>
    </div>
  );
}
