'use client';

/**
 * Gate — "Every drill, from every method, passes the same eight checks — the
 * generator never grades itself."
 *
 * generation/validator.py on real drills. Pick a drill — control, the
 * heuristic and the Markov chain on the corpus's four most common pairs, and
 * the Markov chain on four rare ones — and the panel measures it the way the
 * gate does:
 *
 *   text      the 300-character drill, every occurrence of a target pair
 *             underlined (shape, not colour). Density counts pairs inside
 *             words only — a pair across a space is never a pair.
 *   density   target-pair occurrences ÷ all letter pairs, on a 0–0.45 rule
 *             with the window shaded and the first floor (0.15) as a dashed
 *             tick: a filled jade dot inside, a hollow alert ring outside.
 *   coverage  each target pair's count against the minimum of 3.
 *   checks    the eight rules in the order the code checks them: tick (jade)
 *             passed, cross (alert) failed, dashed ring when the rule doesn't
 *             apply — density and coverage skip control (no targets), and the
 *             real-word ratio gates the LLM only.
 * Readout: accepted or rejected, and why, in a sentence.
 *
 * Every number is the validator's own output for that drill (GATE.samples in
 * src/data/studies/typist-ml.js — seed 7, window [0.10, 0.40]); the counts
 * in the readout are derived. There is no LLM sample: its model runs only on
 * Apple Silicon and no recorded run is committed, so the panel says so
 * instead of inventing one. Nothing animates beyond a fade when the drill
 * changes; reduced motion shows it at once.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { GATE } from '@/data/studies/typist-ml';
import { Choices, Glyph, IN_VIEW, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';
import { Meter, armLabel, fixed, pct } from '@/components/ui/case/typist-ml/parts';

const MIN_COVERAGE = 3;
const REASON_WORDS = {
  too_short: 'it is under 270 characters',
  bad_charset: 'it has characters other than a–z and single spaces',
  density_low: `its target density is under ${GATE.window.min.toFixed(2)}`,
  density_high: `its target density is over ${GATE.window.max.toFixed(2)}`,
  coverage: `a target pair appears fewer than ${MIN_COVERAGE} times`,
  word_repeat: 'a word appears more than 3 times',
  bigram_repeat: 'a pair repeats three times back to back',
  real_word_ratio: 'fewer than 80% of its words are real',
};

/** Does a rule apply to this drill, and did it pass? */
function verdict(rule, sample) {
  const targeted = sample.targets.length > 0;
  if (rule.scope === 'targeted' && !targeted) return { state: 'skip', why: 'no targets' };
  if (rule.scope === 'llm' && sample.arm !== 'llm') return { state: 'skip', why: 'LLM only' };
  return { state: sample.reasons.includes(rule.key) ? 'fail' : 'pass' };
}

/** The drill split into runs, marking every letter that is part of a target pair. */
function marked(text, targets) {
  const set = new Set(targets);
  const on = Array(text.length).fill(false);
  for (let i = 0; i < text.length - 1; i += 1) {
    if (text[i] !== ' ' && text[i + 1] !== ' ' && set.has(text.slice(i, i + 2))) {
      on[i] = true;
      on[i + 1] = true;
    }
  }
  const runs = [];
  for (let i = 0; i < text.length; i += 1) {
    const last = runs[runs.length - 1];
    if (last && last.on === on[i]) last.text += text[i];
    else runs.push({ on: on[i], text: text[i], at: i });
  }
  return runs;
}

function Drill({ sample }) {
  const runs = marked(sample.text, sample.targets);
  return (
    <p className="rounded-md border border-line bg-void px-3 py-3 font-mono text-label leading-[1.9] text-ink-muted [overflow-wrap:anywhere] sm:px-4">
      {runs.map((r) =>
        r.on ? (
          <span key={r.at} className="text-ink" style={{ boxShadow: `inset 0 -2px 0 ${alpha(P.ink, 0.55)}` }}>
            {r.text}
          </span>
        ) : (
          <span key={r.at}>{r.text}</span>
        ),
      )}
    </p>
  );
}

function Coverage({ sample }) {
  const max = Math.max(MIN_COVERAGE * 2, ...Object.values(sample.coverage));
  return (
    <ul className="flex flex-col gap-2">
      {sample.targets.map((t) => {
        const n = sample.coverage[t] ?? 0;
        const ok = n >= MIN_COVERAGE;
        return (
          <li key={t} className="flex items-center gap-3">
            <span className="w-6 shrink-0 font-mono text-label text-ink">{t}</span>
            <span className="relative h-2 min-w-0 flex-1 rounded-sm" style={{ background: alpha(P.lineHi, 0.35) }}>
              <span
                className="absolute inset-y-0 left-0 rounded-sm"
                style={ok ? { width: `${(n / max) * 100}%`, background: P.jade } : { width: `${Math.max(n / max, 0.02) * 100}%`, background: P.surface, boxShadow: `inset 0 0 0 1px ${P.alert}` }}
              />
              <span aria-hidden="true" className="absolute -inset-y-1 border-l border-dashed" style={{ left: `${(MIN_COVERAGE / max) * 100}%`, borderColor: P.inkSubtle }} />
            </span>
            <span className="w-8 shrink-0 text-right font-mono text-label tabular-nums" style={{ color: ok ? P.ink : P.alert }}>
              {n}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Checks({ sample }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {GATE.rules.map((rule) => {
        const v = verdict(rule, sample);
        const glyph = { pass: 'tick', fail: 'cross', skip: 'idle' }[v.state];
        return (
          <li key={rule.key} className="flex items-center gap-2.5" style={{ opacity: v.state === 'skip' ? 0.6 : 1 }}>
            <Glyph kind={glyph} />
            <span className={`min-w-0 flex-1 text-label ${v.state === 'fail' ? 'text-ink' : 'text-ink-muted'}`}>
              {rule.label}
              <span className="sr-only"> — {v.state === 'skip' ? `not applied (${v.why})` : v.state === 'pass' ? 'passed' : 'failed'}</span>
            </span>
            {v.state === 'skip' && <span className="shrink-0 font-mono text-micro text-ink-subtle">{v.why}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export default function Gate({ accent }) {
  const reduce = Boolean(useReducedMotion());
  const ref = useRef(null);
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, GATE.samples[1].key);
  const sample = GATE.samples.find((s) => s.key === active?.key) ?? GATE.samples[1];
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const applied = GATE.rules.filter((r) => verdict(r, sample).state !== 'skip');
  const passed = sample.reasons.length === 0;
  const targeted = sample.targets.length > 0;
  const w = GATE.window;

  let text;
  if (!passed) {
    text = `Rejected — ${sample.reasons.map((r) => REASON_WORDS[r]).join(', and ')}. The worker logs the attempt and tries a new seed, up to ${GATE.maxAttempts} times.`;
  } else if (!targeted) {
    text = `Passes all ${applied.length} checks that apply. Control has no target pairs, so density and coverage don’t apply — it is the plain-practice baseline.`;
  } else {
    const near = sample.density - w.min < 0.03 ? `, just above the ${w.min.toFixed(2)} floor` : '';
    text = `Passes all ${applied.length} checks that apply to ${armLabel(sample.arm)}: density ${fixed(sample.density)}${near}, every pair at least ${MIN_COVERAGE} times.`;
  }

  return (
    <div ref={ref}>
      <PanelFrame
        caption="validate(text, spec) · one drill"
        controls={<Choices label="Pick a drill" options={GATE.samples.map((s) => ({ key: s.key, label: s.label }))} value={sample.key} onChoose={choose} accent={accent} />}
        footer={
          <Readout runKey={runKey} delay={0} reduce={reduce} tone={passed ? P.jade : P.alert} status={passed ? 'accepted' : 'rejected'}>
            <span className="text-body text-ink-muted">{text}</span>
          </Readout>
        }
      >
        <motion.div key={runKey} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={at(reduce, 0, 0.3)}>
          <Drill sample={sample} />
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-micro text-ink-subtle">
            <span>
              <span className="tabular-nums text-ink">{sample.length}</span> characters
            </span>
            <span>
              real words <span className="tabular-nums text-ink">{pct(sample.realWord, 0)}</span>
            </span>
            <span>
              most repeated word <span className="tabular-nums text-ink">{sample.maxWord}×</span>
            </span>
            {targeted && <span>underlined = a target pair</span>}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="mc-label">Target density</span>
                <span className="font-mono text-label tabular-nums text-ink">{targeted ? fixed(sample.density) : '—'}</span>
              </div>
              {targeted ? (
                <Meter value={sample.density} min={w.min} max={w.max} ghost={w.firstMin} ghostLabel={`was ${w.firstMin.toFixed(2)}`} />
              ) : (
                <p className="mt-3 text-label text-ink-subtle">No targets — not measured.</p>
              )}
              {targeted && (
                <>
                  <span className="mc-label mt-2 block">Coverage · at least {MIN_COVERAGE} each</span>
                  <div className="mt-3">
                    <Coverage sample={sample} />
                  </div>
                </>
              )}
            </div>
            <div className="min-w-0">
              <span className="mc-label">The {GATE.rules.length} checks</span>
              <div className="mt-3">
                <Checks sample={sample} />
              </div>
            </div>
          </div>
        </motion.div>
      </PanelFrame>
      <p className="mt-3 max-w-[64ch] text-label text-ink-subtle">
        The LLM’s drills go through the same function, plus the real-word check. Its model runs only on Apple Silicon and no recorded run is committed
        yet, so there is no LLM drill here. Markov writes mostly pseudo-words by design: its real-word ratio is recorded and reported as a difference between methods, not gated.
      </p>
    </div>
  );
}
