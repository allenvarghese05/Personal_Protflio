'use client';

/**
 * AgentPipeline — how the code was written, said plainly.
 *
 * Chronos is a solo project, but Allen didn't type most of its code: every
 * task ran through a four-stage AI coding-agent pipeline he designed
 * (AGENTS.md, .pi/agents/*.md) — an understander writes the brief and asks
 * questions, an implementer plans and writes the code and tests, a reviewer
 * returns APPROVE or CHANGES NEEDED, a pusher opens the pull request. The
 * rules say every stage stops at a gate for the owner, and agents never
 * merge. This block draws exactly that: four stage cards (agent, model, what
 * it writes) and, between them, the owner's gate as a sand diamond — the owner's
 * part is the product plan, the decision records, the answers, the
 * approvals and every merge. Stages read left to right from 64rem of
 * container, top to bottom below.
 *
 * Static by design — nothing here is a measurement to animate. The cards
 * fade up once in view; with reduced motion they are simply there.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { PIPELINE } from '@/data/studies/chronos-ai';
import { at } from '@/components/ui/case/kit';

const VIEW = { once: true, amount: 0.3 };

/** The owner's gate: a sand diamond — the work waits here for a person. */
function Gate({ text }) {
  return (
    <div className="flex items-center gap-2.5 py-2 h-full @min-[64rem]:flex-col @min-[64rem]:justify-center @min-[64rem]:px-1 @min-[64rem]:py-0 @min-[64rem]:text-center">
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" className="block shrink-0">
        <rect x="3" y="3" width="8" height="8" transform="rotate(45 7 7)" fill={alpha(P.sand, 0.15)} stroke={P.sand} strokeWidth="1.25" />
      </svg>
      <span className="font-mono text-micro leading-snug text-ink-muted">{text}</span>
    </div>
  );
}

export default function AgentPipeline() {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, VIEW);
  const shown = reduce || inView;

  return (
    <div ref={ref} className="mc-panel @container min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="mc-label">Every task · four agents, one owner</span>
        <span className="font-mono text-micro text-ink-subtle">AGENTS.md · .pi/agents/</span>
      </div>
      <ol className="mt-5 grid grid-cols-1 @min-[64rem]:grid-cols-[minmax(0,1fr)_6.5rem_minmax(0,1fr)_6.5rem_minmax(0,1fr)_6.5rem_minmax(0,1fr)_6.5rem]">
        {PIPELINE.stages.map((s, i) => (
          <li key={s.key} className="contents">
            <motion.div
              className="min-w-0 rounded-[6px] border border-line bg-surface-2 p-3.5"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={at(reduce, i * 0.1, 0.4)}
            >
              <p className="font-mono text-micro tabular-nums text-ink-subtle">0{i + 1}</p>
              <p className="mt-1 font-display text-base font-semibold text-ink">{s.agent}</p>
              <p className="mt-0.5 font-mono text-micro text-ink-subtle">{s.model}</p>
              <p className="mt-2 text-[13px] leading-snug text-ink-muted">Writes {s.writes}.</p>
            </motion.div>
            <motion.div className="h-full" initial={reduce ? false : { opacity: 0 }} animate={shown ? { opacity: 1 } : { opacity: 0 }} transition={at(reduce, i * 0.1 + 0.05, 0.4)}>
              <Gate text={s.gate} />
            </motion.div>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-line pt-4 text-body text-ink-muted">
        The record is in the repo: {PIPELINE.record}. Allen’s part is the product plan, the decision records, every answer, every approval and every merge — so on this page, “built” means built by that pipeline under his direction, not typed by hand.
      </p>
    </div>
  );
}
