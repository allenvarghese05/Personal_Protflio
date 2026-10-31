'use client';

/**
 * WhyArms — "Two questions, four methods." The research question has two
 * halves, and each method is there to answer one of them: the control
 * separates targeting from plain practice; the heuristic and the Markov chain
 * are the simpler generators the on-device language model has to beat.
 *
 * Top: the two questions as rows, the four methods as columns — a filled dot
 * where a method takes part in answering that question. Pick a method to read
 * what it tests and why it's in the experiment (aria-live readout). Below:
 * why every participant runs all four at once (the within-person design).
 *
 * Renders only from ARMS and WHY_ARMS in src/data/studies/typist-ml.js.
 * Reduced motion: no fades.
 */
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { ARMS, WHY_ARMS } from '@/data/studies/typist-ml';
import { Choices, PanelFrame } from '@/components/ui/case/kit';

export default function WhyArms({ accent = P.accent }) {
  const reduce = useReducedMotion();
  const [pick, setPick] = useState(ARMS[0].key);
  const role = WHY_ARMS.roles[pick];
  const arm = ARMS.find((a) => a.key === pick);

  return (
    <div className="flex min-w-0 flex-col gap-12">
      <PanelFrame
        caption="Two questions · four methods"
        controls={<Choices label="Methods" options={ARMS.map((a) => ({ key: a.key, label: a.label }))} value={pick} onChoose={setPick} accent={accent} />}
        footer={
          <motion.div
            key={pick}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT }}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
          >
            <span className="mc-chip mc-chip--accent font-medium" style={{ '--chip': accent }}>
              {arm.label} · {role.tests}
            </span>
            <span className="text-label text-ink-muted">{role.why}</span>
          </motion.div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-3 pr-4 font-mono text-micro font-medium uppercase tracking-[0.14em] text-ink-subtle">
                  The question
                </th>
                {ARMS.map((a) => (
                  <th key={a.key} scope="col" className="w-20 px-2 py-3 text-center font-mono text-micro font-medium uppercase tracking-[0.14em]" style={{ color: a.key === pick ? accent : P.inkSubtle }}>
                    {a.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WHY_ARMS.questions.map((q) => (
                <tr key={q.key} className="border-b border-line align-top">
                  <th scope="row" className="py-4 pr-4 font-normal">
                    <span className="block font-display text-[1.0625rem] font-semibold leading-snug text-ink">{q.label}</span>
                    <span className="mt-1.5 block max-w-[52ch] text-label text-ink-muted">{q.note}</span>
                  </th>
                  {ARMS.map((a) => {
                    const on = q.arms.includes(a.key);
                    const lit = on && a.key === pick;
                    return (
                      <td key={a.key} className="px-2 py-4 text-center">
                        <span
                          aria-label={on ? `${a.label} helps answer this` : `${a.label} is not part of this comparison`}
                          className="inline-block h-3 w-3 rounded-full transition-colors duration-300"
                          style={on ? { background: lit ? accent : alpha(P.jade, 0.75) } : { boxShadow: `inset 0 0 0 1.25px ${P.lineHi}` }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelFrame>

      <div>
        <h3 className="font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink">Why every participant runs all four</h3>
        <ol className="mt-5 flex max-w-[72ch] flex-col gap-4">
          {WHY_ARMS.within.map((t, i) => (
            <li key={t} className="flex gap-4 text-body text-ink-muted">
              <span className="shrink-0 font-mono text-label tabular-nums" style={{ color: accent }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
