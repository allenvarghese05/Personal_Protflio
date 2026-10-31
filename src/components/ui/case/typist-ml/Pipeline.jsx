'use client';

/**
 * Pipeline — who does what, said plainly. Every task in the design doc runs
 * through the same phases (CLAUDE.md, "How work gets done"): an analyst agent
 * writes the brief, an architect agent the plan, a builder agent the code and
 * tests, a reviewer agent the verdict, the orchestrating session opens the
 * pull request — and Allen merges it (the agents are told never to merge).
 * Above the agents sit the parts that are his: the design doc, the decisions
 * and the owner answers recorded in each brief.
 *
 * A row of numbered phases joined by hairlines; the last phase — the human
 * one — carries the accent rule, because it is where every change stops.
 * Static: it states how the work is done, so nothing animates beyond a fade
 * in view (none under reduced motion). Wraps to two or three a row on narrow
 * screens.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { BUILD } from '@/data/studies/typist-ml';
import { at } from '@/components/ui/case/kit';
import { pad2 } from '@/components/ui/case/typist-ml/parts';

export default function Pipeline({ accent }) {
  const reduce = Boolean(useReducedMotion());
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const shown = reduce || inView;
  const last = BUILD.pipeline.length - 1;

  return (
    <div ref={ref}>
      <h3 className="font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink">How every task was built</h3>
      <p className="mt-3 max-w-[68ch] text-body text-ink-muted">
        Allen wrote the design doc and owns every decision; each task then goes through coding agents he set up, with fixed roles and models. The code is
        agent-written to his specs — he reviews and merges every pull request.
      </p>
      <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {BUILD.pipeline.map((p, i) => {
          const human = i === last;
          return (
            <motion.li
              key={p.key}
              className="flex min-w-0 flex-col gap-1 rounded-md border bg-surface px-3 py-3"
              style={{ borderColor: human ? alpha(accent, 0.55) : P.line }}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={at(reduce, i * 0.06, 0.4)}
            >
              <span className="font-mono text-micro tabular-nums" style={{ color: human ? accent : P.inkSubtle }}>
                {pad2(i + 1)}
              </span>
              <span className="text-body text-ink">{p.label}</span>
              <span className="font-mono text-micro text-ink-muted">{p.who}</span>
              <span className="font-mono text-micro text-ink-subtle">→ {p.out}</span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
