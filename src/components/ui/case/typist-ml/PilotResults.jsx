'use client';
/**
 * PilotResults — the pilot, what actually happened. A quiet table for the two
 * sets, then the verdict. Numbers come from the README's audited pilot table
 * (every figure is checked against the database by `just check-readme`).
 */
import { motion } from 'framer-motion';
import { RESULTS } from '@/data/studies/typist-ml';
import { EASE_STD } from '@/lib/motion';

export default function PilotResults({ accent }) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* the headline number, large */}
        <div className="sm:col-span-3">
          <div className="font-display text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-ink">
            16.8% → 5.4%
          </div>
          <p className="mt-2 max-w-[52ch] text-body text-ink-muted">
            Error rate across the two sets, over 10 practice days. {RESULTS.sessions} sessions, {RESULTS.keystrokes} keystrokes.
          </p>
        </div>

        {RESULTS.sets.map((set, i) => (
          <motion.div
            key={set.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: EASE_STD, delay: 0.1 + i * 0.08 }}
            className="rounded-panel border border-line bg-surface p-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="mc-label" style={{ color: 'var(--ink)' }}>{set.name}</span>
              <span className="text-label" style={{ color: accent }}>{set.armLabel}</span>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink tabular-nums">{set.change}</span>
              <span className="pb-1 text-label text-ink-subtle">error rate</span>
            </div>
            <dl className="mt-3 space-y-1.5 text-label text-ink-muted">
              <div className="flex justify-between gap-3">
                <dt>Baseline</dt>
                <dd className="tabular-nums">{set.baseline}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Retest</dt>
                <dd className="tabular-nums">{set.retest}</dd>
              </div>
            </dl>
          </motion.div>
        ))}

        {/* the verdict, plain */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: EASE_STD, delay: 0.28 }}
          className="rounded-panel border border-line bg-surface-2 p-5"
        >
          <span className="mc-label" style={{ color: 'var(--ink)' }}>The verdict</span>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">{RESULTS.verdict}</p>
          <p className="mt-2 text-label leading-relaxed text-ink-muted">{RESULTS.targetingLine}</p>
        </motion.div>
      </div>

      <p className="mt-6 max-w-[68ch] text-label leading-relaxed text-ink-subtle">{RESULTS.note}</p>
    </div>
  );
}
