'use client';

/**
 * Measured — "The heuristic clears the gate on every seed; the Markov chain
 * needed the window widened — and on rare pairs it still never does."
 *
 * Why the density floor moved from 0.15 to 0.10 (T3.4), as a measurement.
 * Each row is one generator on one target set, fifty seeds, one attempt
 * each: a strip on a shared 0–0.45 density scale with the window shaded,
 * the spread of the fifty drills as a bar (lowest to highest) and the median
 * as a tick, then how many passed the whole gate. Passing is a jade tick
 * when all fifty did, an alert cross when none did, a sand flag in between —
 * shape first, colour second. The window toggle (the active one in the
 * accent) re-reads every row: the Markov rows keep their densities but more
 * of them now land inside; the heuristic's move, because its governor aims
 * at the window's midpoint.
 *
 * Readout: the window's totals per method and the rare-pair row, counted
 * from the data. An sr-only table carries every number.
 *
 * Renders only from MEASURED in src/data/studies/typist-ml.js — runs of
 * the repo's own generators and validator, not a committed record (the
 * caption under the panel says how they were made). Bars grow once in view;
 * reduced motion shows them at once.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { MEASURED } from '@/data/studies/typist-ml';
import { Choices, Glyph, IN_VIEW, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';
import { armLabel } from '@/components/ui/case/typist-ml/parts';

const SCALE = 0.45;
const x = (v) => `${(Math.min(Math.max(v, 0), SCALE) / SCALE) * 100}%`;
const N = MEASURED.seeds;
const glyphFor = (ok) => {
  if (ok === N) return 'tick';
  if (ok === 0) return 'cross';
  return 'flag';
};
const TICKS = [0, 0.1, 0.2, 0.3, 0.4];

function Strip({ row, win, reduce, i }) {
  const m = row[win.key];
  return (
    <div className="relative h-6">
      <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px" style={{ background: P.line }} />
      <span
        aria-hidden="true"
        className="absolute inset-y-0 rounded-sm transition-[left,width] duration-500 ease-out"
        style={{ left: x(win.min), width: `calc(${x(win.max)} - ${x(win.min)})`, background: alpha(P.inkMuted, 0.12), boxShadow: `inset 0 0 0 1px ${alpha(P.inkMuted, 0.25)}` }}
      />
      <motion.span
        aria-hidden="true"
        className="absolute top-1/2 h-1.5 origin-left -translate-y-1/2 rounded-full"
        style={{ left: x(m.min), width: `calc(${x(m.max)} - ${x(m.min)})`, background: P.inkMuted }}
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={at(reduce, 0.1 + i * 0.05, 0.6)}
      />
      <motion.span
        aria-hidden="true"
        className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: x(m.med), background: P.ink }}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={at(reduce, 0.4 + i * 0.05, 0.4)}
      />
    </div>
  );
}

export default function Measured({ accent }) {
  const reduce = Boolean(useReducedMotion());
  const ref = useRef(null);
  const inView = useInView(ref, IN_VIEW);
  const now = MEASURED.windows[MEASURED.windows.length - 1];
  const [active, choose] = useRun(inView, reduce, now.key);
  const win = MEASURED.windows.find((w) => w.key === active?.key) ?? now;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';

  const byArm = (arm) => MEASURED.rows.filter((r) => r.arm === arm);
  const total = (arm) => byArm(arm).reduce((n, r) => n + r[win.key].ok, 0);
  const rare = MEASURED.rows.find((r) => r.arm === 'markov' && r.kind === 'rare');
  const hRows = byArm('heuristic').length;
  const mRows = byArm('markov').length;
  const text = `${armLabel('heuristic')} ${total('heuristic')} of ${hRows * N}; ${armLabel('markov')} ${total('markov')} of ${mRows * N} — and ${rare[win.key].ok} of ${N} on rare pairs, whose drills peak at ${rare[win.key].max.toFixed(3)}.`;

  return (
    <div ref={ref}>
      <PanelFrame
        caption="First-try pass rate · 50 seeds per row"
        controls={
          <Choices
            label="Density window"
            options={MEASURED.windows.map((w) => ({ key: w.key, label: w.label }))}
            value={win.key}
            onChoose={choose}
            accent={accent}
          />
        }
        footer={
          <Readout runKey={runKey} delay={0} reduce={reduce} tone={P.sand} status={win.label}>
            <span className="text-body text-ink-muted">{text}</span>
          </Readout>
        }
      >
        <div className="@container">
          {/* scale */}
          <div aria-hidden="true" className="grid grid-cols-1 gap-x-4 @min-[36rem]:grid-cols-[11rem_minmax(0,1fr)_5.5rem]">
            <span className="hidden @min-[36rem]:block" />
            <div className="relative h-5">
              {TICKS.map((t) => (
                <span key={t} className="absolute top-0 -translate-x-1/2 font-mono text-micro tabular-nums text-ink-subtle" style={{ left: x(t) }}>
                  {t.toFixed(1)}
                </span>
              ))}
            </div>
            <span className="hidden @min-[36rem]:block" />
          </div>

          <ul className="mt-1 flex flex-col">
            {MEASURED.rows.map((row, i) => {
              const m = row[win.key];
              return (
                <li key={row.key} className="grid grid-cols-1 items-center gap-x-4 gap-y-1 border-t border-line py-3 @min-[36rem]:grid-cols-[11rem_minmax(0,1fr)_5.5rem]">
                  <span className="min-w-0">
                    <span className="block text-label text-ink">{armLabel(row.arm)}</span>
                    <span className="block font-mono text-micro text-ink-subtle">
                      {row.targets} · {row.kind}
                    </span>
                  </span>
                  <Strip row={row} win={win} reduce={reduce} i={i} />
                  <span className="flex items-center gap-2 @min-[36rem]:justify-end">
                    <Glyph kind={glyphFor(m.ok)} />
                    <span className="font-mono text-label tabular-nums text-ink">
                      {m.ok}/{N}
                    </span>
                    {m.why && <span className="font-mono text-micro text-ink-subtle @min-[36rem]:hidden">{m.why}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-line pt-3 font-mono text-micro text-ink-subtle">
            Control has no targets, so no density — {MEASURED.control.ok}/{N} passed at both windows. Bar = lowest to highest drill · tick = median ·
            shaded = the window.
          </p>

          <table className="sr-only">
            <caption>{`Density and first-try pass rate per generator, window ${win.label}`}</caption>
            <thead>
              <tr>
                <th scope="col">Generator</th>
                <th scope="col">Targets</th>
                <th scope="col">Lowest</th>
                <th scope="col">Median</th>
                <th scope="col">Highest</th>
                <th scope="col">Passed</th>
              </tr>
            </thead>
            <tbody>
              {MEASURED.rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{armLabel(row.arm)}</th>
                  <td>{row.targets}</td>
                  <td>{row[win.key].min}</td>
                  <td>{row[win.key].med}</td>
                  <td>{row[win.key].max}</td>
                  <td>{`${row[win.key].ok} of ${N}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelFrame>
      <p className="mt-3 max-w-[68ch] text-label text-ink-subtle">
        Measured by running the repo’s generators and gate on seeds 0–49, one attempt each (the worker allows five). “Common” is the corpus’s four most
        frequent tracked pairs, “rare” the four least frequent of the 150, “3 pairs” the fallback set size. The heuristic’s first-window range,
        0.223–0.281, matches the T2.4 plan; the Markov median, 0.175, matches T3.1’s.
      </p>
    </div>
  );
}
