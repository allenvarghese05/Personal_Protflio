'use client';

/**
 * Grading — "Absent isn't zero, and a card never shows two different
 * overall figures."
 *
 * The grading engine (backend/src/marks/grading/grading.ts) is a set of pure
 * functions, ported in ./rules.js, and every number here is computed by
 * them from the hand-calculated cases in grading.spec.ts (GRADING):
 *   absent    Maths, Written 24 of 30 and the Oral absent. Toggle the
 *             template's absent policy: exclude_component takes the Oral's
 *             20 out of the denominator (24 / 30 → 80% → A); count_as_zero
 *             keeps it in (24 / 50 → 48% → C). The track is drawn to the
 *             marks that count, so the denominator visibly shrinks or holds.
 *   overall   English 40 of 45 and Maths 10 of 50. Before PR #14 one printed
 *             card showed a marks-weighted Grand Total (52.6%) and a Result
 *             line that averaged the subject percentages (54.5%). After, both
 *             come from one shared grandTotalPercentage(). Toggle before /
 *             after; the mismatch is flagged in sand, the agreement ticks.
 *   bands     the reference template's bands as a ruler from 0 to 100. Pick
 *             a percentage: it is rounded half-up to a whole number first,
 *             so 89.5 is an A+ and 89.4 an A, and anything under the lowest
 *             band lands in it. The band it resolves to is amber.
 *
 * Motion: bars and the marker glide between states. Reduced motion: they
 * jump. Layout: the first two panels sit side by side from 1024px; the ruler
 * runs full width below. Range labels move to a key under the ruler, so
 * narrow bands never squeeze text under 11px.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { Choices, Glyph, IN_VIEW, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';
import { LABEL } from '@/components/ui/case/shell';
import { GRADING } from '@/data/studies/bis-report-card';
import { grandTotalPercentage, resolveGrade, roundToOneDecimal, subjectResult } from './rules';

const SCALE = GRADING.scale;
const GLIDE_S = 0.45;

/* ── computed once ─────────────────────────────────────────────────────── */
const ABSENT = GRADING.absent;
const FULL_MAX = ABSENT.components.reduce((n, c) => n + c.max, 0);
const BY_POLICY = Object.fromEntries(
  ABSENT.policies.map((p) => [p.key, subjectResult(ABSENT.components, SCALE, p.key)])
);

const OVERALL = GRADING.overall.map((s) => ({ ...s, pct: roundToOneDecimal((s.total / s.max) * 100) }));
const GRAND = grandTotalPercentage(OVERALL.map((s) => ({ total: s.total, maxApplicable: s.max })));
const MEAN = roundToOneDecimal(OVERALL.reduce((n, s) => n + s.pct, 0) / OVERALL.length);
const SUM_T = OVERALL.reduce((n, s) => n + s.total, 0);
const SUM_M = OVERALL.reduce((n, s) => n + s.max, 0);
const ERAS = [
  { key: 'before', label: 'Before PR #14' },
  { key: 'after', label: 'After' },
];

const PROBES = GRADING.rounding.map((v) => ({ v, rounded: Math.round(v), grade: resolveGrade(v, SCALE) }));
const PROBE_OPTIONS = PROBES.map((p) => ({ key: String(p.v), label: `${p.v}%` }));

/* ── absent ────────────────────────────────────────────────────────────── */

function AbsentPanel({ accent }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, ABSENT.policies[0].key);
  const key = active?.key ?? ABSENT.policies[0].key;
  const r = BY_POLICY[key];
  const policy = ABSENT.policies.find((p) => p.key === key);
  const runKey = active ? `${active.key}-${active.run}` : 'idle';

  return (
    <div ref={ref} className="min-w-0">
      <PanelFrame
        caption={`${ABSENT.subject} · one part absent`}
        controls={<Choices label="Absent policy" options={ABSENT.policies.map((p) => ({ key: p.key, label: p.label }))} value={key} onChoose={choose} accent={accent} />}
        footer={
          <Readout runKey={runKey} reduce={reduce} tone={P.ice} status={`${r.total} / ${r.maxApplicable} → ${r.percentage}% → ${r.grade}`}>
            <span className="text-body text-ink-muted">{policy.note}</span>
          </Readout>
        }
      >
        <ul className="border-b border-line">
          {ABSENT.components.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-3 border-t border-line py-2.5">
              <span className="text-label text-ink-muted">
                {c.label} <span className="font-mono text-micro text-ink-subtle">of {c.max}</span>
              </span>
              {c.absent ? (
                <span className="rounded-chip border border-dashed px-2 py-1 font-mono text-micro" style={{ color: P.sand, borderColor: alpha(P.sand, 0.5) }}>
                  AB · absent
                </span>
              ) : (
                <span className="font-mono text-label tabular-nums text-ink">{c.value}</span>
              )}
            </li>
          ))}
        </ul>

        <p className={`${LABEL} mt-5 text-ink-subtle`}>Marks that count</p>
        <div aria-hidden="true" className="relative mt-3 h-3 rounded-full" style={{ boxShadow: `inset 0 0 0 1px ${P.line}` }}>
          {/* the denominator: the marks that count, of the subject's full 50 */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: alpha(P.ink, 0.06), boxShadow: `inset 0 0 0 1px ${P.lineHi}` }}
            initial={false}
            animate={{ width: `${(r.maxApplicable / FULL_MAX) * 100}%` }}
            transition={at(reduce, 0, GLIDE_S)}
          />
          {/* the numerator */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: alpha(P.ice, 0.85) }}
            initial={false}
            animate={{ width: `${(r.total / FULL_MAX) * 100}%` }}
            transition={at(reduce, 0, GLIDE_S)}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-micro tabular-nums text-ink-subtle">
          <span>0</span>
          <span>{FULL_MAX}</span>
        </div>
        <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
          <span className="font-display text-3xl font-semibold tabular-nums text-ink">{r.percentage}%</span>
          <span className="font-mono text-label text-ink-muted">
            {r.total} / {r.maxApplicable} · grade {r.grade}
          </span>
        </p>
      </PanelFrame>
    </div>
  );
}

/* ── one overall figure ────────────────────────────────────────────────── */

function OverallPanel({ accent }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, 'before');
  const key = active?.key ?? 'before';
  const before = key === 'before';
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const lines = [
    { label: 'Grand Total row', value: GRAND, how: `Σ marks ÷ Σ applicable = ${SUM_T} / ${SUM_M}` },
    { label: 'Result line', value: before ? MEAN : GRAND, how: before ? `mean of subject percentages` : 'the same grandTotalPercentage()' },
  ];

  return (
    <div ref={ref} className="min-w-0">
      <PanelFrame
        caption="One printed card · two lines that must agree"
        controls={<Choices label="Before or after the fix" options={ERAS} value={key} onChoose={choose} accent={accent} />}
        footer={
          <Readout runKey={runKey} reduce={reduce} tone={before ? P.sand : P.jade} status={before ? `${GRAND}% ≠ ${MEAN}%` : `${GRAND}% = ${GRAND}%`}>
            <span className="text-body text-ink-muted">
              {before
                ? 'Two overall figures on one card — the mean ignores that the subjects are out of different maxima.'
                : 'One shared helper for the standing and the renderer: the card can’t disagree with itself.'}
            </span>
          </Readout>
        }
      >
        <ul className="border-b border-line">
          {OVERALL.map((s) => (
            <li key={s.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t border-line py-2.5">
              <span className="text-label text-ink-muted">
                {s.label}
                {s.note && <span className="text-ink-subtle"> · {s.note}</span>}
              </span>
              <span className="font-mono text-label tabular-nums text-ink">
                {s.total} / {s.max} <span className="text-ink-subtle">· {s.pct}%</span>
              </span>
            </li>
          ))}
        </ul>

        <ul className="mt-5 flex flex-col gap-2.5">
          {lines.map((l, i) => {
            const off = before && i === 1;
            return (
              <li
                key={l.label}
                className="flex items-center gap-3 rounded-md border p-3"
                style={off ? { borderColor: alpha(P.sand, 0.55), borderStyle: 'dashed' } : { borderColor: P.line }}
              >
                <Glyph kind={off ? 'flag' : 'tick'} />
                <span className="min-w-0 flex-1">
                  <span className="block text-label text-ink-muted">{l.label}</span>
                  <span className="block font-mono text-micro text-ink-subtle">{l.how}</span>
                </span>
                <motion.span
                  key={`${l.label}-${l.value}`}
                  className="font-display text-2xl font-semibold tabular-nums"
                  style={{ color: off ? P.sand : P.ink }}
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={at(reduce, 0.05, 0.3)}
                >
                  {l.value}%
                </motion.span>
              </li>
            );
          })}
        </ul>
      </PanelFrame>
    </div>
  );
}

/* ── the bands ─────────────────────────────────────────────────────────── */
const SPAN = 101; // 0 … 100 inclusive
const BANDS = [...SCALE].sort((a, b) => a.min - b.min);
const LOWEST = BANDS[0];

function BandsPanel({ accent }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, PROBE_OPTIONS[1].key);
  const key = active?.key ?? PROBE_OPTIONS[1].key;
  const probe = PROBES.find((p) => String(p.v) === key);
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const below = probe.rounded < LOWEST.min;
  const at100 = ((Math.max(probe.rounded, 0) + 0.5) / SPAN) * 100;
  const markLeft = `${at100}%`;
  // the tag stays inside the panel at either end of the ruler
  const tagLeft = `${Math.min(Math.max(at100, 12), 88)}%`;

  return (
    <div ref={ref} className="mt-10 min-w-0">
      <PanelFrame
        caption="The bands · rounded half-up first"
        controls={<Choices label="Pick a percentage" options={PROBE_OPTIONS} value={key} onChoose={choose} accent={accent} />}
        footer={
          <Readout runKey={runKey} reduce={reduce} tone={accent} status={`${probe.v}% → ${probe.rounded} → ${probe.grade}`}>
            <span className="text-body text-ink-muted">
              {below
                ? `Below every band, so it falls into the lowest (${LOWEST.grade}) rather than getting no grade at all.`
                : probe.v === probe.rounded
                  ? `Already whole: ${probe.grade}.`
                  : `Rounded half-up to ${probe.rounded} before the lookup — ${probe.grade}.`}
            </span>
          </Readout>
        }
      >
        <div className="relative pt-9">
          {/* the probe: raw value (hollow) and where it rounds to (filled) */}
          <motion.span
            aria-hidden="true"
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-chip border px-1.5 py-0.5 font-mono text-micro tabular-nums"
            style={{ borderColor: alpha(accent, 0.6), color: accent, background: P.surface }}
            initial={false}
            animate={{ left: tagLeft }}
            transition={at(reduce, 0, GLIDE_S)}
          >
            {probe.v}% → {probe.rounded}
          </motion.span>
          <div aria-hidden="true" className="relative flex h-9 overflow-hidden rounded-md border border-line">
            <span className="h-full border-r border-line" style={{ width: `${(LOWEST.min / SPAN) * 100}%`, background: alpha(P.ink, 0.03) }} />
            {BANDS.map((b) => {
              const on = b.grade === probe.grade;
              return (
                <span
                  key={b.grade}
                  className="flex h-full items-center justify-center border-r border-line font-mono text-label last:border-r-0"
                  style={{
                    width: `${((b.max - b.min + 1) / SPAN) * 100}%`,
                    background: on ? alpha(accent, 0.14) : 'transparent',
                    color: on ? accent : P.inkMuted,
                  }}
                >
                  {b.grade}
                </span>
              );
            })}
            <motion.span
              className="absolute inset-y-0 w-0.5 -translate-x-1/2"
              style={{ background: accent }}
              initial={false}
              animate={{ left: markLeft }}
              transition={at(reduce, 0, GLIDE_S)}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-micro tabular-nums text-ink-subtle">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
        <ul aria-label="The bands" className="mt-4 flex flex-wrap gap-1.5">
          {[...SCALE].map((b) => (
            <li key={b.grade} className="mc-chip" style={b.grade === probe.grade ? { color: accent, borderColor: alpha(accent, 0.45) } : undefined}>
              {b.grade} · {b.min}–{b.max}
            </li>
          ))}
        </ul>
      </PanelFrame>
    </div>
  );
}

export default function Grading({ accent = P.accent }) {
  return (
    <div className="min-w-0">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AbsentPanel accent={accent} />
        <OverallPanel accent={accent} />
      </div>
      <BandsPanel accent={accent} />
    </div>
  );
}
