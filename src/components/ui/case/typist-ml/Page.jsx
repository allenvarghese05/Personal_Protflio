'use client';

/**
 * Typist-ML — the case-study page (project 'typist-ml'). Mission Control
 * renders it where the generic brief would go; it composes the shared shell
 * (case/shell.jsx) and kit (case/kit.jsx) with this project's own sections.
 *
 * Every section speaks one grammar: a mono eyebrow (number in the accent) →
 * one display-font takeaway sentence → a visual → details on demand. Read the
 * headlines alone and you have the story:
 *
 *   hero          what it is, where it stands, the numbers   <DealFigure />
 *   01 problem    the easy way → what the experiment does instead
 *   02 pairs      the golden session, key by key            <Attribution />
 *   03 sets       shrink, deal, shuffle, freeze             <Assignment />
 *   04 gate       one validator for every method            <Gate />
 *   05 measured   who clears the gate, at both windows      <Measured />
 *   06 day        the Latin square, blinded                 <PracticeDay />
 *   07 decisions  the three hard problems                   <Decisions />
 *   08 arch       browser · API · worker · SQLite           <Architecture />
 *   09 data       the eleven tables                         <DataModel />
 *   10 build      the git history, the pipeline, CI         <BuildRuler /> <Pipeline /> <Quality />
 *   next          the honest roadmap, then the next case study
 *
 * Honest status, said in the hero and again at the end: milestones M0–M3
 * are merged, the pilot has not run, there are no results. Facts come from
 * src/data/studies/typist-ml.js and the project file; the counts inside the
 * headlines are derived from that data, so this file only owns the sentences
 * around them. Motion: the hero's deal plays on mount, section heads fade up
 * once in view; with reduced motion everything is simply there.
 */
import { ASSIGN, BUILD, COPY, DATA_MODEL, DECISIONS, GATE, GOLDEN, LAYERS, LIMITS, MEASURED, OVERVIEW, PLANNER, TOUR, TRACES, ARMS } from '@/data/studies/typist-ml';
import { CodeTour, Overview } from '@/components/ui/case/story';
import WhyArms from '@/components/ui/case/typist-ml/WhyArms';
import { BeforeAfter, CaseArticle, Hero, NextSection, Section, SectionIndex, WRAP, accentFor, capWord, word } from '@/components/ui/case/shell';
import Architecture from '@/components/ui/case/Architecture';
import DataModel from '@/components/ui/case/DataModel';
import BuildRuler from '@/components/ui/case/BuildRuler';
import Quality from '@/components/ui/case/Quality';
import DealFigure from '@/components/ui/case/typist-ml/DealFigure';
import Attribution from '@/components/ui/case/typist-ml/Attribution';
import Assignment from '@/components/ui/case/typist-ml/Assignment';
import Gate from '@/components/ui/case/typist-ml/Gate';
import Measured from '@/components/ui/case/typist-ml/Measured';
import PracticeDay from '@/components/ui/case/typist-ml/PracticeDay';
import Decisions from '@/components/ui/case/typist-ml/Decisions';
import Pipeline from '@/components/ui/case/typist-ml/Pipeline';

const SCOPE = 'typist-ml';

/* ── derived facts (counts in the headlines come from the data) ──────────── */
const PAIR_COUNT = ASSIGN.perSet * ASSIGN.sets.length;
const TABLE_COUNT = DATA_MODEL.domains.reduce((n, d) => n + d.models.length, 0);
const TASKS = BUILD.totals.find((t) => /design-doc tasks/i.test(t.label))?.value;
const NOW = MEASURED.windows[MEASURED.windows.length - 1];
const heuristicAlways = MEASURED.rows
  .filter((r) => r.arm === 'heuristic')
  .every((r) => MEASURED.windows.every((w) => r[w.key].ok === MEASURED.seeds));
const markovRare = MEASURED.rows.find((r) => r.arm === 'markov' && r.kind === 'rare');
const markovRareNever = markovRare ? markovRare[NOW.key].ok === 0 : false;

/** The section headlines — the sentences are written here, the numbers aren't. */
function headlines() {
  const measured = [
    heuristicAlways ? 'The heuristic clears the gate on every seed' : 'The heuristic mostly clears the gate',
    markovRareNever ? 'the Markov chain needed the floor lowered — and on rare pairs it still never does.' : 'the Markov chain needed the floor lowered.',
  ].join('; ');
  return {
    problem: `Targeted drills sound obviously better. Testing that fairly means getting ${word(COPY.before.length)} things right that the easy way gets wrong.`,
    why: `Two questions, ${word(ARMS.length)} methods — and every participant runs all ${word(ARMS.length)}, each on their own weak pairs.`,
    code: 'The experiment’s fairness lives in four places in the code — here they are.',
    attribution: `${GOLDEN.keys.length} keystrokes, ${GOLDEN.cases.length} edge cases, one rule for what counts as an error — and both languages must pass it.`,
    assignment: `Rank the weak pairs with a prior, deal the top ${PAIR_COUNT} into ${word(ASSIGN.sets.length)} equally hard sets, shuffle which method gets which — then freeze it.`,
    gate: `Every drill, from every method, passes the same ${word(GATE.rules.length)} checks — the generator never grades itself.`,
    measured,
    day: `${capWord(PLANNER.practiceDays)} practice days, ${word(ARMS.length)} blocks a day, the order rotating daily — and the browser is never told which method wrote which block.`,
    decisions: `${capWord(DECISIONS.length)} hard problems: a picker that overshoots, workers that could collide, and randomness that has to replay exactly.`,
    architecture: `A browser, an API and a separate worker over one SQLite file — ${word(LAYERS.length)} layers, all on one laptop.`,
    data: `${capWord(TABLE_COUNT)} tables — keystrokes append-only, the weak-pair map frozen by a trigger, every generation attempt kept.`,
    build: TASKS
      ? `${TASKS} design-doc tasks in ${BUILD.days} days — briefed, planned, built and reviewed by coding agents, merged by Allen.`
      : 'Design doc first, then one task at a time.',
    next: 'The code is done — the pilot is next, then the numbers, whatever they say.',
  };
}

/** The page's sections, in order — the index and the page both read this. */
const SECTIONS = [
  { id: 'problem', num: '01', label: 'The problem' },
  { id: 'why', num: '02', label: 'Why four methods' },
  { id: 'attribution', num: '03', label: 'What counts as an error' },
  { id: 'assignment', num: '04', label: 'Four fair sets' },
  { id: 'gate', num: '05', label: 'The fairness gate' },
  { id: 'measured', num: '06', label: 'Measured' },
  { id: 'day', num: '07', label: 'A practice day' },
  { id: 'decisions', num: '08', label: 'Hard problems' },
  { id: 'code', num: '09', label: 'Inside the code' },
  { id: 'architecture', num: '10', label: 'Architecture' },
  { id: 'data', num: '11', label: 'Data model' },
  { id: 'build', num: '12', label: 'How it was built' },
];
const SECTION = Object.fromEntries(SECTIONS.map((x) => [x.id, x]));

/** The words the page leans on, in plain English. */
function Glossary() {
  return (
    <dl className="mt-10 grid grid-cols-1 gap-x-8 gap-y-5 border-t border-line pt-8 sm:grid-cols-2 xl:grid-cols-4">
      {COPY.glossary.map((g) => (
        <div key={g.term} className="min-w-0">
          <dt className="mc-label">{g.term}</dt>
          <dd className="mt-2 text-label text-ink-muted">{g.def}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── the page ──────────────────────────────────────────────────────────── */

export default function Page({ project, study }) {
  const accent = accentFor(project.kind);
  const title = headlines();
  const sec = (id) => ({ scope: SCOPE, ...SECTION[id], title: title[id], accent });
  const links = project.repo ? [{ href: project.repo, label: 'Source · GitHub' }] : undefined;

  return (
    <CaseArticle>
      <Hero
        project={project}
        accent={accent}
        outcome={COPY.outcome}
        status={COPY.status}
        links={links}
        figure={<DealFigure accent={accent} />}
        caption="Sixteen weak pairs, four equally hard sets, one method each"
      />

      <div className={WRAP}>
        <div className="pb-20 sm:pb-24">
          <Overview items={OVERVIEW} accent={accent} />
          <div className="mt-16">
            <SectionIndex scope={SCOPE} sections={SECTIONS} accent={accent} />
          </div>
        </div>

        <Section {...sec('problem')}>
          <BeforeAfter before={COPY.before} after={COPY.after} accent={accent} beforeLabel={COPY.beforeLabel} afterLabel={COPY.afterLabel} />
          {study?.built && <p className="mt-10 max-w-[68ch] text-body text-ink-muted">{study.built}</p>}
          <Glossary />
        </Section>

        <Section {...sec('why')}>
          <WhyArms accent={accent} />
          <div className="mt-12 border-t border-line pt-8">
            <h3 className="mc-label">Known limits, stated up front</h3>
            <ul className="mt-5 flex max-w-[72ch] flex-col gap-4">
              {LIMITS.map((t) => (
                <li key={t} className="flex gap-4 text-body text-ink-muted">
                  <span aria-hidden className="mt-[12px] h-[2px] w-3 shrink-0 rounded-full bg-sand" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section {...sec('attribution')}>
          <Attribution accent={accent} />
        </Section>

        <Section {...sec('assignment')}>
          <Assignment accent={accent} />
        </Section>

        <Section {...sec('gate')}>
          <Gate accent={accent} />
        </Section>

        <Section {...sec('measured')}>
          <Measured accent={accent} />
        </Section>

        <Section {...sec('day')}>
          <PracticeDay accent={accent} />
        </Section>

        <Section {...sec('decisions')}>
          <Decisions accent={accent} />
        </Section>

        <Section {...sec('code')}>
          <CodeTour files={TOUR} accent={accent} />
        </Section>

        <Section {...sec('architecture')}>
          <Architecture project={project} layers={LAYERS} traces={TRACES} accent={accent} />
        </Section>

        <Section {...sec('data')}>
          <DataModel model={DATA_MODEL} accent={accent} />
        </Section>

        <Section {...sec('build')}>
          <BuildRuler timeline={project.timeline} primary={project.primaryStack} secondary={project.secondaryStack} accent={accent} />
          <div className="mt-20">
            <Pipeline accent={accent} />
          </div>
          <div className="mt-20">
            <Quality build={BUILD} accent={accent} />
          </div>
        </Section>

        <NextSection scope={SCOPE} project={project} title={title.next} items={COPY.next} accent={accent} />
      </div>
    </CaseArticle>
  );
}
