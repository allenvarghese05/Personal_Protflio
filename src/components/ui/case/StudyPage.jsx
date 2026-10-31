'use client';

/**
 * StudyPage — a complete case study rendered from one data module, in the
 * Church Building page's grammar (shell + kit). For projects whose story is
 * told best by their flow rather than a bespoke simulation:
 *
 *   hero          badge → title → outcome → meta → status → metrics, with the
 *                 project's core flow as the figure (FlowFigure)
 *   index         jumps to each section
 *   01 problem    before → after, then one paragraph
 *   02 how        the flow, step by step (StepThrough: pick a step or play)
 *   03 inside     what it's made of — feature cards with a stat each
 *   04 decisions  the hard problems (DecisionList), each with its steps
 *   05 arch       layers + traced requests (Architecture)
 *   06 data       the data model, when the project has one (DataModel)
 *   07 build      dated chapters (BuildRuler) + quality (Quality), when real
 *   next          the honest roadmap, then the next case study
 *
 * `data` shape (src/data/studies/<id>.js): { COPY: { outcome, status,
 * statusTone?, before[], after[], built?, next[], headlines: { problem, how,
 * inside, decisions, architecture, data?, build?, next } }, FLOW: { caption,
 * steps: [{ key, label, title, body, facts?: [] }] }, FEATURES: [{ key, label,
 * title, body, stat?: { value, label } }], DECISIONS: [{ id, kicker, title,
 * problem, decision, tradeoff, steps?: [], code? }], LAYERS, TRACES, ROLES?,
 * DATA_MODEL?, BUILD?, LINKS?: [{ href, label }] }. Sections without data are
 * left out and the numbering closes up.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { BeforeAfter, CaseArticle, Hero, NextSection, Section, SectionIndex, WRAP, accentFor } from '@/components/ui/case/shell';
import { Choices, DecisionList, Glyph, PanelFrame, Readout, at } from '@/components/ui/case/kit';
import Architecture from '@/components/ui/case/Architecture';
import DataModel from '@/components/ui/case/DataModel';
import BuildRuler from '@/components/ui/case/BuildRuler';
import Quality from '@/components/ui/case/Quality';

const STEP_MS = 1400; // one step per beat while playing
const FIGURE_MS = 1600; // the hero figure's quiet walk along the flow

/* ── hero figure: the flow as a column of stations ─────────────────────── */

function FlowFigure({ steps, accent }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.4 });
  const [beat, setBeat] = useState(0);

  // walk the flow while on screen; setState only inside the timer
  useEffect(() => {
    if (reduce || !inView) return undefined;
    const id = setInterval(() => setBeat((b) => b + 1), FIGURE_MS);
    return () => clearInterval(id);
  }, [reduce, inView]);

  const current = reduce ? -1 : beat % steps.length;
  return (
    <div ref={ref} className="mc-panel mx-auto w-full max-w-[460px]">
      <ol className="relative flex flex-col gap-1">
        <span aria-hidden className="absolute bottom-5 left-[15px] top-5 w-px bg-line-hi" />
        {steps.map((s, i) => {
          const on = i === current;
          const done = reduce || i < current;
          return (
            <li key={s.key} className="relative flex items-center gap-4 py-2.5">
              <span
                aria-hidden
                className="relative z-10 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border font-mono text-micro tabular-nums transition-colors duration-500"
                style={{
                  borderColor: on ? accent : done ? alpha(P.jade, 0.6) : P.lineHi,
                  color: on ? accent : done ? P.jade : P.inkSubtle,
                  background: on ? alpha(accent, 0.1) : P.surface,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0">
                <span className={`block font-mono text-label transition-colors duration-500 ${on ? 'text-ink' : 'text-ink-muted'}`}>{s.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── 02: the flow, step by step ────────────────────────────────────────── */

function StepThrough({ flow, accent }) {
  const ref = useRef(null);
  const reduce = useReducedMotion() ?? false;
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const [picked, setPicked] = useState(null);
  const [playing, setPlaying] = useState(false);
  const steps = flow.steps;
  const index = picked ?? 0;
  const step = steps[index];

  // play: advance one step per beat, stop at the end (setState in the timer)
  useEffect(() => {
    if (!playing) return undefined;
    const id = setTimeout(() => {
      if (index >= steps.length - 1) setPlaying(false);
      else setPicked(index + 1);
    }, STEP_MS);
    return () => clearTimeout(id);
  }, [playing, index, steps.length]);

  const choose = (key) => {
    setPlaying(false);
    setPicked(steps.findIndex((s) => s.key === key));
  };
  const play = () => {
    if (index >= steps.length - 1) setPicked(0);
    setPlaying(true);
  };

  return (
    <div ref={ref}>
      <PanelFrame
        caption={flow.caption}
        controls={
          <button type="button" onClick={playing ? () => setPlaying(false) : play} className="mc-ghost-btn rounded-chip border border-line px-3 py-2 uppercase">
            {playing ? 'Pause' : 'Play'}
          </button>
        }
        footer={
          (inView || reduce) && (
            <Readout runKey={`${index}`} reduce={reduce} tone={accent} status={`${String(index + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`}>
              <span className="text-label text-ink-muted">{step.label}</span>
            </Readout>
          )
        }
      >
        <Choices label="Steps" options={steps.map((s, i) => ({ key: s.key, label: `${String(i + 1).padStart(2, '0')} ${s.label}` }))} value={step.key} onChoose={choose} accent={accent} />
        <motion.div
          key={step.key}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={at(reduce, 0, 0.35)}
          className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
        >
          <div className="min-w-0">
            <h3 className="font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink">{step.title}</h3>
            <p className="mt-3 max-w-[60ch] text-body text-ink-muted">{step.body}</p>
          </div>
          {step.facts?.length > 0 && (
            <ul className="min-w-0 divide-y divide-line border-y border-line">
              {step.facts.map((f) => (
                <li key={f} className="flex gap-3 py-3 text-label text-ink-muted">
                  <span aria-hidden className="mt-[7px] h-[2px] w-3 shrink-0 rounded-full" style={{ background: accent }} />
                  <span className="min-w-0 break-words">{f}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </PanelFrame>
    </div>
  );
}

/* ── 03: what it's made of ─────────────────────────────────────────────── */

function Features({ features }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <ul ref={ref} className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {features.map((f, i) => (
        <motion.li
          key={f.key}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE_OUT, delay: i * 0.07 }}
          className="relative flex min-w-0 flex-col overflow-hidden rounded-panel border border-line bg-surface p-5"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}
        >
          <span aria-hidden className="absolute inset-x-0 top-0" style={{ height: 2, background: alpha(P.ice, 0.6) }} />
          <p className="mc-label">{f.label}</p>
          <h3 className="mt-3 font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink">{f.title}</h3>
          <p className="mt-3 flex-1 text-body text-ink-muted">{f.body}</p>
          {f.stat && (
            <p className="mt-5 flex items-baseline gap-3 border-t border-line pt-4">
              <span className="font-display text-3xl font-bold leading-none tracking-tight tabular-nums text-ink">{f.stat.value}</span>
              <span className="font-mono text-micro uppercase tracking-[0.14em] text-ink-subtle">{f.stat.label}</span>
            </p>
          )}
        </motion.li>
      ))}
    </ul>
  );
}

/* ── 04: a decision's steps, ticking in once in view ───────────────────── */

function DecisionSteps({ decision, inView, reduce }) {
  const steps = decision.steps ?? [];
  if (!steps.length) return null;
  const shown = reduce || inView;
  return (
    <PanelFrame caption={decision.caption ?? 'How it works'} footer={shown && decision.readout ? <span className="text-label text-ink-muted">{decision.readout}</span> : null}>
      <ol className="flex flex-col divide-y divide-line">
        {steps.map((s, i) => (
          <motion.li
            key={s}
            initial={reduce ? false : { opacity: 0.35 }}
            animate={{ opacity: shown ? 1 : 0.35 }}
            transition={at(reduce, 0.2 + i * 0.35, 0.3)}
            className="flex items-start gap-3 py-3"
          >
            <motion.span initial={false} animate={{ opacity: shown ? 1 : 0.4 }} transition={at(reduce, 0.2 + i * 0.35, 0.3)}>
              <Glyph kind={shown ? 'tick' : 'idle'} />
            </motion.span>
            <span className="min-w-0 break-words pt-px text-body text-ink-muted">{s}</span>
          </motion.li>
        ))}
      </ol>
    </PanelFrame>
  );
}
const renderVisual = (decision, props) => <DecisionSteps decision={decision} {...props} />;

/* ── the page ──────────────────────────────────────────────────────────── */

export default function StudyPage({ project, data }) {
  const accent = accentFor(project.kind);
  const scope = project.id;
  const { COPY, FLOW, FEATURES, DECISIONS, LAYERS, TRACES, ROLES, DATA_MODEL, BUILD, LINKS } = data;
  const H = COPY.headlines;
  // a ruler needs at least two distinct dates; a one-day history gets the stack + a note
  const hasTimeline = new Set((project.timeline ?? []).map((t) => t.start).filter(Boolean)).size >= 2;

  const plan = [
    { id: 'problem', label: 'The problem', on: true },
    { id: 'how', label: 'How it works', on: FLOW?.steps?.length > 0 },
    { id: 'inside', label: 'What’s inside', on: FEATURES?.length > 0 },
    { id: 'decisions', label: 'Hard problems', on: DECISIONS?.length > 0 },
    { id: 'architecture', label: 'Architecture', on: LAYERS?.length > 0 && TRACES?.length > 0 },
    { id: 'data', label: 'Data model', on: Boolean(DATA_MODEL?.domains?.length) },
    { id: 'build', label: 'How it was built', on: hasTimeline || (project.primaryStack ?? []).length > 0 },
  ].filter((s) => s.on);
  const sections = plan.map((s, i) => ({ ...s, num: String(i + 1).padStart(2, '0') }));
  const sec = (id) => {
    const s = sections.find((x) => x.id === id);
    return { scope, id, num: s.num, label: s.label, title: H[id], accent };
  };
  const has = (id) => sections.some((x) => x.id === id);

  return (
    <CaseArticle>
      <Hero
        project={project}
        accent={accent}
        outcome={COPY.outcome}
        status={COPY.status}
        statusTone={COPY.statusTone}
        links={LINKS}
        figure={FLOW?.steps?.length ? <FlowFigure steps={FLOW.steps} accent={accent} /> : null}
        caption={FLOW?.figureCaption}
      />

      <div className={WRAP}>
        <div className="pb-20 sm:pb-24">
          <SectionIndex scope={scope} sections={sections} accent={accent} />
        </div>

        <Section {...sec('problem')}>
          <BeforeAfter before={COPY.before} after={COPY.after} accent={accent} />
          {COPY.built && <p className="mt-10 max-w-[68ch] text-body text-ink-muted">{COPY.built}</p>}
        </Section>

        {has('how') && (
          <Section {...sec('how')}>
            <StepThrough flow={FLOW} accent={accent} />
          </Section>
        )}

        {has('inside') && (
          <Section {...sec('inside')}>
            <Features features={FEATURES} />
          </Section>
        )}

        {has('decisions') && (
          <Section {...sec('decisions')}>
            <DecisionList decisions={DECISIONS} renderVisual={renderVisual} accent={accent} />
          </Section>
        )}

        {has('architecture') && (
          <Section {...sec('architecture')}>
            <Architecture project={project} layers={LAYERS} traces={TRACES} roles={ROLES} accent={accent} />
          </Section>
        )}

        {has('data') && (
          <Section {...sec('data')}>
            <DataModel model={DATA_MODEL} accent={accent} />
          </Section>
        )}

        {has('build') && (
          <Section {...sec('build')}>
            {hasTimeline ? (
              <BuildRuler timeline={project.timeline} primary={project.primaryStack} secondary={project.secondaryStack} accent={accent} />
            ) : (
              <StackOnly primary={project.primaryStack} secondary={project.secondaryStack} accent={accent} note={COPY.buildNote} />
            )}
            {BUILD && (
              <div className="mt-20">
                <Quality build={BUILD} accent={accent} />
              </div>
            )}
          </Section>
        )}

        <NextSection scope={scope} project={project} title={H.next} items={COPY.next} accent={accent} />
      </div>
    </CaseArticle>
  );
}

/** When the history is too thin for a timeline: an honest note, then the stack. */
function StackOnly({ primary = [], secondary = [], accent, note }) {
  return (
    <div className="flex flex-col gap-6">
      {note && <p className="max-w-[68ch] text-body text-ink-muted">{note}</p>}
      <div className="flex flex-col gap-3 border-t border-line pt-6 md:flex-row md:items-baseline md:gap-6">
        <h3 className="mc-label shrink-0 md:w-32">Stack</h3>
        <ul className="flex flex-wrap gap-2">
          {primary.map((t) => (
            <li key={t} className="mc-chip mc-chip--accent" style={{ '--chip': accent }}>
              {t}
            </li>
          ))}
          {secondary.map((t) => (
            <li key={t} className="mc-chip">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
