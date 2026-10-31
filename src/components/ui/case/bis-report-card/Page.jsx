'use client';

/**
 * Page — the BIS Report Card case study (project 'bis-report-card'), composed
 * like the Church Building page: the shared shell (case/shell.jsx), the kit
 * (case/kit.jsx), the shared sections, and this project's own sections in
 * this folder.
 *
 * Every section speaks one grammar: a mono eyebrow (number in the accent) →
 * one display-font takeaway sentence → a visual → details on demand. Read the
 * headlines alone and you have the story:
 *
 *   hero          what it is, where it stands, the numbers   <CardFigure />
 *   index
 *   01 problem    the requirement → what was built, row by row
 *   02 review     three states, six moves, scrubbed           <Review />
 *   03 templates  two very different cards, one engine        <Templates />
 *   04 marks      three ways in, one validator                <MarksEntry />
 *   05 grading    absent ≠ zero, one overall figure, bands    <Grading />
 *   06 ops        one door, a backup that catches up          <Operations />
 *   07 decisions  the three hard problems                     <Decisions />
 *   08 arch       six layers, real requests traced            <Architecture />
 *   09 data       the schema, by domain                       <DataModel />
 *   10 build      a spec in July, then October                <BuildRuler /> <Quality />
 *   next          the pilot, then the rest of the school
 *
 * Facts come from src/data/studies/bis-report-card.js and the project file;
 * the counts in the headlines are derived from that data, so this file only
 * owns the sentences around them. The repository is private and nothing is
 * deployed yet, so the hero has no links and a sand "pre-pilot" status.
 */
import { BUILD, COPY, DATA_MODEL, DECISIONS, LAYERS, MARK_PATHS, OPS, OVERVIEW, REVIEW, ROLES, TEMPLATES, TRACES } from '@/data/studies/bis-report-card';
import { Overview } from '@/components/ui/case/story';
import TemplateConsole from './TemplateConsole';
import { BeforeAfter, CaseArticle, Hero, NextSection, Section, SectionIndex, WRAP, accentFor, capWord, word } from '@/components/ui/case/shell';
import Architecture from '@/components/ui/case/Architecture';
import DataModel from '@/components/ui/case/DataModel';
import BuildRuler from '@/components/ui/case/BuildRuler';
import Quality from '@/components/ui/case/Quality';
import CardFigure from './CardFigure';
import Review from './Review';
import Templates from './Templates';
import MarksEntry from './MarksEntry';
import Grading from './Grading';
import Operations from './Operations';
import Decisions from './Decisions';

const SCOPE = 'bis-report-card';

/* ── derived facts (counts in the headlines come from the data) ──────────── */
const MODEL_COUNT = DATA_MODEL.domains.reduce((n, d) => n + d.models.length, 0);
const DOORS = OPS.services.filter((s) => s.ports).length;
const MERGED = BUILD.totals.find((t) => /merged pull requests/i.test(t.label))?.value;
const TESTS = BUILD.suites.find((t) => /in all/i.test(t.label))?.value;

/** The section headlines — the sentences are written here, the numbers aren't. */
function headlines() {
  return {
    problem: `Every student needs a card each exam — ${word(ROLES.length)} staff roles share the work, and the format changes from Nursery to Class 12.`,
    review: `${capWord(REVIEW.states.length)} states, ${word(REVIEW.moves.length)} moves — and a mark can change only while the card is a draft.`,
    templates: `One engine, ${word(TEMPLATES.length)} very different cards — and the school redesigns a format in its own console, not in code.`,
    marks: `${capWord(MARK_PATHS.length)} ways to enter a mark, and one server function that judges every one.`,
    grading: 'Absent isn’t zero, and a card never shows two different overall figures.',
    ops: `No cloud: it runs on one server inside the school, on its own network — ${word(DOORS)} open door, and a backup that catches up after downtime and is restored in CI.`,
    decisions: `${capWord(DECISIONS.length)} hard problems: a save racing an approval, a lab PC shared by every teacher, and roll numbers that must be unique — except when they mustn’t.`,
    architecture: `A NestJS API behind one HTTPS door, in ${word(LAYERS.length)} layers — follow a request through it.`,
    data: `${MODEL_COUNT} models in ${word(DATA_MODEL.domains.length)} domains — plus two constraints Prisma can’t express, written by hand in SQL.`,
    build:
      MERGED && TESTS
        ? `A spec in July; then, in October, the system and ${MERGED} merged pull requests — ${TESTS} tests green in CI.`
        : 'Sole developer, spec first.',
    next: 'The pilot is next — on the school’s own server, starting with the two Pre-Primary cards.',
  };
}

/** The page's sections, in order — the index and the page both read this. */
const SECTIONS = [
  { id: 'problem', num: '01', label: 'The problem' },
  { id: 'ops', num: '02', label: 'Runs inside the school' },
  { id: 'review', num: '03', label: 'The review' },
  { id: 'templates', num: '04', label: 'Template control' },
  { id: 'marks', num: '05', label: 'Marks entry' },
  { id: 'grading', num: '06', label: 'Grading' },
  { id: 'decisions', num: '07', label: 'Hard problems' },
  { id: 'architecture', num: '08', label: 'Architecture' },
  { id: 'data', num: '09', label: 'Data model' },
  { id: 'build', num: '10', label: 'How it was built' },
];
const SECTION = Object.fromEntries(SECTIONS.map((x) => [x.id, x]));

/* ── the page ──────────────────────────────────────────────────────────── */

export default function Page({ project, study }) {
  const accent = accentFor(project.kind);
  const title = headlines();
  const sec = (id) => ({ scope: SCOPE, ...SECTION[id], title: title[id], accent });
  const links = [project.repo && { href: project.repo, label: 'Repository' }, project.live && { href: project.live, label: 'Live site' }].filter(Boolean);

  return (
    <CaseArticle>
      <Hero
        project={project}
        accent={accent}
        outcome={COPY.outcome}
        status={COPY.status}
        links={links}
        figure={<CardFigure accent={accent} />}
        caption="One card, four hands — the watermark lifts only on approval"
      />

      <div className={WRAP}>
        <div className="pb-20 sm:pb-24">
          <div className="mb-12">
            <Overview items={OVERVIEW} accent={accent} />
          </div>
          <p className="max-w-[68ch] text-body text-ink-muted">
            The repository is private and the system isn’t deployed yet, so there are no screenshots or links here. Everything below is drawn from the
            code — and the demos run the code’s own rules.
          </p>
          <div className="mt-12">
            <SectionIndex scope={SCOPE} sections={SECTIONS} accent={accent} />
          </div>
        </div>

        <Section {...sec('problem')}>
          <BeforeAfter before={COPY.before} after={COPY.after} accent={accent} beforeLabel="The requirement" afterLabel="What was built" />
          {study?.built && <p className="mt-10 max-w-[68ch] text-body text-ink-muted">{study.built}</p>}
        </Section>

        <Section {...sec('ops')}>
          <Operations accent={accent} />
        </Section>

        <Section {...sec('review')}>
          <Review accent={accent} />
        </Section>

        <Section {...sec('templates')}>
          <Templates accent={accent} />
          <div className="mt-20">
            <TemplateConsole accent={accent} />
          </div>
        </Section>

        <Section {...sec('marks')}>
          <MarksEntry accent={accent} />
        </Section>

        <Section {...sec('grading')}>
          <Grading accent={accent} />
        </Section>

        <Section {...sec('decisions')}>
          <Decisions accent={accent} />
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
            <Quality build={BUILD} accent={accent} />
          </div>
        </Section>

        <NextSection scope={SCOPE} project={project} title={title.next} items={COPY.next} accent={accent} />
      </div>
    </CaseArticle>
  );
}
