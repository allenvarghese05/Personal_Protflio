'use client';

/**
 * Templates — "One engine, two very different cards — the format is data,
 * not code."
 *
 * Two panels:
 *   morph   the two reference templates (TEMPLATES), one toggle apart. The
 *           same subject — English — renders as numeric parts on the LKG
 *           card (Written 30 + Reading 5 + Writing 5 + Dictation 5 +
 *           Recitation 5, totalled to 45 / 50 → 90% → A+ by the grading
 *           engine's own rules, ported in ./rules.js) or as six "I can …"
 *           lines on the Nursery record, each one of three answers and no
 *           total at all. Beside it the co-scholastic block: graded
 *           activities on one, and on the other three categories where the
 *           same letter A means three different things — which is why each
 *           category carries its own legend. The terms run along the top.
 *   check   five edits to a template, and what happens to each: the zod
 *           schema that runs before every write refuses three; the freeze
 *           that holds while any card on the template is approved refuses a
 *           pass-mark change but lets a label through. Messages are the
 *           code's own.
 *
 * Values entered on the cards are illustrative; structure, maxima, terms,
 * options and legends are the reference templates'.
 *
 * Motion: rows fade in when the template switches. Reduced motion: no fades.
 * Layout: container queries — the subject and co-scholastic blocks sit side
 * by side from 44rem of panel; the check's verdict sits beside its options
 * from 40rem.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { Choices, Glyph, IN_VIEW, PanelFrame, Readout, at, softBreaks, useRun } from '@/components/ui/case/kit';
import { LABEL } from '@/components/ui/case/shell';
import { GRADING, TEMPLATE_PARTS, TEMPLATE_PROBES, TEMPLATES } from '@/data/studies/bis-report-card';
import { subjectResult } from './rules';

const BY_KEY = Object.fromEntries(TEMPLATES.map((t) => [t.key, t]));
const OPTIONS = TEMPLATES.map((t) => ({ key: t.key, label: t.label }));
const PROBE = Object.fromEntries(TEMPLATE_PROBES.map((p) => [p.key, p]));
const PROBE_OPTIONS = TEMPLATE_PROBES.map((p) => ({ key: p.key, label: p.label }));
const CHECK_NAME = { zod: 'zod schema · before every write', freeze: 'freeze · while any card on it is approved' };

/** The numeric template's English, totalled by the engine's rules. */
const MARKS = BY_KEY.marks;
const MARKS_RESULT = subjectResult(
  MARKS.subject.components.map((c) => ({ max: c.max, value: c.value, absent: false })),
  GRADING.scale,
  'exclude_component'
);
const MARKS_MAX = MARKS.subject.components.reduce((n, c) => n + c.max, 0);

/* ── the morph ─────────────────────────────────────────────────────────── */

function Terms({ template }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`${LABEL} mr-1 text-ink-subtle`}>{template.terms.length} terms</span>
      {template.terms.map((t) => (
        <span key={t} className="mc-chip">
          {softBreaks(t)}
        </span>
      ))}
    </div>
  );
}

function NumericSubject({ template, reduce, runKey }) {
  const comps = template.subject.components;
  return (
    <div className="min-w-0">
      <p className={`${LABEL} text-ink-subtle`}>{template.subject.label} · numeric parts</p>
      <ul className="mt-3 border-b border-line">
        {comps.map((c, i) => (
          <motion.li
            key={`${runKey}-${c.key}`}
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={at(reduce, i * 0.05, 0.3)}
            className="grid grid-cols-[minmax(0,1fr)_5rem_3.5rem] items-center gap-3 border-t border-line py-2"
          >
            <span className="min-w-0 text-label text-ink-muted">{c.label}</span>
            <span aria-hidden="true" className="h-[5px] overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full" style={{ width: `${(c.value / c.max) * 100}%`, background: alpha(P.ice, 0.8) }} />
            </span>
            <span className="text-right font-mono text-label tabular-nums text-ink">
              {c.value}
              <span className="text-ink-subtle"> / {c.max}</span>
            </span>
          </motion.li>
        ))}
      </ul>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-2xl font-semibold tabular-nums text-ink">
          {MARKS_RESULT.total} / {MARKS_MAX}
        </span>
        <span className="font-mono text-label tabular-nums text-ink-muted">{MARKS_RESULT.percentage}%</span>
        <span className="mc-chip mc-chip--accent" style={{ '--chip': P.ice }}>
          grade {MARKS_RESULT.grade}
        </span>
      </p>
    </div>
  );
}

function DescriptiveSubject({ template, reduce, runKey }) {
  const { options, components } = template.subject;
  return (
    <div className="min-w-0">
      <p className={`${LABEL} text-ink-subtle`}>{template.subject.label} · “I can …” lines</p>
      <ul className="mt-3 border-b border-line">
        {components.map((c, i) => (
          <motion.li
            key={`${runKey}-${c.key}`}
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={at(reduce, i * 0.05, 0.3)}
            className="flex flex-col gap-1.5 border-t border-line py-2"
          >
            <span className="text-label text-ink-muted">{c.label}</span>
            <span className="flex flex-wrap gap-1">
              {options.map((o, k) => {
                const on = k === c.pick;
                return (
                  <span
                    key={o}
                    className="rounded-chip border px-1.5 py-0.5 font-mono text-micro"
                    style={on ? { color: P.ice, borderColor: alpha(P.ice, 0.55), background: alpha(P.ice, 0.08) } : { color: P.inkSubtle, borderColor: P.line }}
                  >
                    {o}
                    {on && <span className="sr-only"> (chosen)</span>}
                  </span>
                );
              })}
            </span>
          </motion.li>
        ))}
      </ul>
      <p className="mt-3 font-mono text-label text-ink-subtle">no total · no percentage · no grade</p>
    </div>
  );
}

function CoScholastic({ template }) {
  const cs = template.coScholastic;
  if (cs.categories) {
    return (
      <div className="min-w-0">
        <p className={`${LABEL} text-ink-subtle`}>{cs.label} · one letter, three meanings</p>
        <ul className="mt-3 border-b border-line">
          {cs.categories.map((c) => (
            <li key={c.key} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3 border-t border-line py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-chip border border-line-hi font-mono text-label text-ink">A</span>
              <span className="min-w-0">
                <span className="block text-label text-ink-subtle">{c.label}</span>
                <span className="mt-0.5 block text-body text-ink">= “{c.a}”</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-label text-ink-subtle">So a legend belongs to its category — never to the template.</p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className={`${LABEL} text-ink-subtle`}>{cs.label} · graded on one scale</p>
      <ul className="mt-3 border-b border-line">
        {cs.rows.map((r) => (
          <li key={r} className="flex items-center justify-between gap-3 border-t border-line py-2.5">
            <span className="text-label text-ink-muted">{r}</span>
            <span className="flex gap-1">
              {cs.scale.map((g) => (
                <span key={g} className="inline-flex h-6 min-w-6 items-center justify-center rounded-chip border border-line px-1 font-mono text-micro text-ink-subtle">
                  {g}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Morph({ accent }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, TEMPLATES[0].key);
  const key = active?.key ?? TEMPLATES[0].key;
  const template = BY_KEY[key];
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const numeric = key === 'marks';

  return (
    <div ref={ref}>
      <PanelFrame
        caption="One engine · two reference templates"
        controls={<Choices label="Pick a template" options={OPTIONS} value={key} onChoose={choose} accent={accent} />}
        footer={
          <Readout runKey={runKey} reduce={reduce} tone={P.ice} status={template.label}>
            <span className="text-body text-ink-muted">
              {numeric
                ? `English: ${MARKS_RESULT.total} of ${MARKS_MAX} → ${MARKS_RESULT.percentage}% → ${MARKS_RESULT.grade}, worked out on the server. The browser never computes a grade.`
                : 'The same subject as six skill lines, each one of three answers. Descriptive parts are recorded, not graded.'}
            </span>
          </Readout>
        }
      >
        <div className="@container min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <Terms template={template} />
            <span className="font-mono text-micro text-ink-subtle">{template.source}</span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-8 @[44rem]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            {numeric ? (
              <NumericSubject template={template} reduce={reduce} runKey={runKey} />
            ) : (
              <DescriptiveSubject template={template} reduce={reduce} runKey={runKey} />
            )}
            <CoScholastic template={template} />
          </div>
        </div>
      </PanelFrame>
    </div>
  );
}

/* ── the check ─────────────────────────────────────────────────────────── */

function Check({ accent }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, TEMPLATE_PROBES[0].key);
  const probe = active ? PROBE[active.key] : null;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const refused = TEMPLATE_PROBES.filter((p) => !p.ok).length;

  return (
    <div ref={ref} className="mt-10">
      <PanelFrame
        caption={`Edit a template · ${refused} of ${TEMPLATE_PROBES.length} edits refused`}
        footer={
          probe ? (
            <Readout runKey={runKey} reduce={reduce} tone={probe.ok ? P.jade : P.alert} status={probe.ok ? 'Saved' : 'Refused'}>
              <span className="text-body text-ink-muted">{probe.ok ? 'Cosmetic changes never re-grade a card.' : `Stopped by the ${probe.by === 'zod' ? 'schema' : 'freeze'} — nothing is written.`}</span>
            </Readout>
          ) : (
            <p className="text-body text-ink-subtle">Pick an edit.</p>
          )
        }
      >
        <div className="@container min-w-0">
          <div className="grid grid-cols-1 gap-6 @[40rem]:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] @[40rem]:gap-8">
            <Choices label="Try an edit" options={PROBE_OPTIONS} value={probe?.key ?? null} onChoose={choose} accent={accent} />
            <div className="min-w-0">
              {probe && (
                <motion.div key={runKey} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={at(reduce, 0, 0.3)}>
                  <p className={`${LABEL} text-ink-subtle`}>Checked by · {CHECK_NAME[probe.by]}</p>
                  <div
                    className="mt-3 flex items-start gap-3 rounded-md border bg-void p-4"
                    style={{ borderColor: probe.ok ? alpha(P.jade, 0.4) : alpha(P.alert, 0.4) }}
                  >
                    <span className="mt-0.5">
                      <Glyph kind={probe.ok ? 'tick' : 'cross'} />
                    </span>
                    <p className="min-w-0 font-mono text-label text-ink [overflow-wrap:anywhere]">{probe.says}</p>
                  </div>
                </motion.div>
              )}
              <p className={`${LABEL} mt-6 text-ink-subtle`}>What a template defines</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {TEMPLATE_PARTS.map((t) => (
                  <li key={t} className="mc-chip">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </PanelFrame>
    </div>
  );
}

export default function Templates({ accent = P.accent }) {
  return (
    <div className="min-w-0">
      <Morph accent={accent} />
      <Check accent={accent} />
    </div>
  );
}
