'use client';

/**
 * Chronos AI — the case-study page (project 'chronos-ai'). Mission Control
 * renders it where the generic brief would go.
 *
 * Every section speaks the shared grammar: a mono eyebrow (number in the
 * accent) → one display-font takeaway sentence → a visual → details on
 * demand. Read the headlines alone and you have the story:
 *
 *   hero          what it is, where it stands, the numbers   <HeroScore />
 *   scope         what is built, what is planned — then the index
 *   01 problem    alarm → wake score, row by row (before → after)
 *   02 status     46 planned tasks, one chip each             <Milestones />
 *   03 score      the golden mornings, tick by tick           <WakeScore />
 *   04 gap        two highs, really in a row                  <ConfirmGap />
 *   05 ingest     one snapshot through eight stages           <IngestProbe />
 *   06 loop       the scheduler runs a simulated weekday      <DayLoop />
 *   07 decisions  the three hard problems                     <Decisions />
 *   08 arch       five layers, real paths traced              <Architecture />
 *   09 data       nine tables, by domain                      <DataModel />
 *   10 build      the git history, the agent pipeline, CI     <BuildRuler /> <AgentPipeline /> <Quality />
 *   next          the honest roadmap, then the next case study
 *
 * Facts come from data/studies/chronos-ai.js and data/projects/chronos-ai.js;
 * the counts inside the headlines are derived from that data, so this file
 * only owns the sentences around them. The scores in every diagram are
 * computed by ./score.js from the real rule set and match the test fixtures.
 * This is an in-progress project, and the page says so: the status pill, the
 * scope note and section 02 all draw the line between built and planned.
 */
import { BUILD, COPY, DATA_MODEL, DECISIONS, INGEST, LAYERS, MILESTONES, RULES, TRACES } from '@/data/studies/chronos-ai';
import { BeforeAfter, CaseArticle, Hero, NextSection, Section, SectionIndex, WRAP, accentFor, capWord, word } from '@/components/ui/case/shell';
import { PALETTE as P } from '@/lib/palette';
import Architecture from '@/components/ui/case/Architecture';
import DataModel from '@/components/ui/case/DataModel';
import BuildRuler from '@/components/ui/case/BuildRuler';
import Quality from '@/components/ui/case/Quality';
import HeroScore from './HeroScore';
import Milestones from './Milestones';
import WakeScore from './WakeScore';
import ConfirmGap from './ConfirmGap';
import IngestProbe from './IngestProbe';
import DayLoop from './DayLoop';
import Decisions from './Decisions';
import AgentPipeline from './AgentPipeline';

const SCOPE = 'chronos-ai';
const DAY_MS = 86_400_000;

/* ── derived facts (counts in the headlines come from the data) ──────────── */
const SIGNALS = RULES.rules.length;
const { confirm: CONFIRM, strong: STRONG, dedupeMin: DEDUPE, maxGapMin: MAX_GAP } = RULES.thresholds;
const toMin = (hhmm) => hhmm.split(':').map(Number).reduce((h, m) => h * 60 + m);
const WEEKDAY_TICKS = (toMin(RULES.window.weekday[1]) - toMin(RULES.window.weekday[0])) / RULES.tickMin;
const TASKS = MILESTONES.flatMap((m) => m.tasks);
const MERGED = TASKS.filter((t) => t.state === 'built' || t.state === 'caveat').length;
const TABLES = DATA_MODEL.domains.reduce((n, d) => n + d.models.length, 0);

/** Calendar days covered by the timeline, first start to last end, inclusive. */
function daysSpanned(timeline) {
  const starts = timeline.map((c) => Date.parse(`${c.start}T00:00:00Z`));
  const ends = timeline.map((c) => Date.parse(`${c.end}T00:00:00Z`));
  return Math.round((Math.max(...ends) - Math.min(...starts)) / DAY_MS) + 1;
}

/** The section headlines — the sentences are written here, the numbers aren't. */
function headlines(project) {
  const days = project.timeline?.length ? daysSpanned(project.timeline) : null;
  return {
    problem: `An alarm knows the time, not whether you’re up — so Chronos adds up ${word(SIGNALS)} signals from the phone instead.`,
    status: `${MERGED} of ${TASKS.length} planned tasks are merged: the wake engine is built, the phone is partly built, and the Morning Reel is still a plan.`,
    score: `${capWord(SIGNALS)} signals, one score out of 100 — two ticks at ${CONFIRM}, or one at ${STRONG}, and you’re up.`,
    gap: `Two highs only count if they’re really in a row: under ${word(DEDUPE)} minutes apart is a duplicate, over ${MAX_GAP} is a fresh start.`,
    ingest: `${capWord(INGEST.stages.length)} stages between a snapshot and its score — every refusal answers with a code, and nothing is written until the last.`,
    loop: `The server runs the morning: a silent tick every ${word(RULES.tickMin)} minutes — ${WEEKDAY_TICKS} on a weekday — until you’re up or the window closes.`,
    decisions: `${capWord(DECISIONS.length)} hard problems: a permission the user can deny, rules that will change, and the two Sundays a year the clock lies.`,
    architecture: `One FastAPI service on a MacBook, ${word(LAYERS.length)} layers — follow a snapshot through it.`,
    data: `${capWord(TABLES)} tables in ${word(DATA_MODEL.migrations)} migrations — and every score is stored with the rules that made it.`,
    build: days
      ? `${BUILD.prs.allen} pull requests in ${days} days — written by an AI-agent pipeline, gated and merged by its one owner.`
      : 'Written by an AI-agent pipeline, gated and merged by its one owner.',
    next: 'The phone next — then the reel the engine was built to trigger.',
  };
}

/** The page's sections, in order — the index and the page both read this. */
const SECTIONS = [
  { id: 'problem', num: '01', label: 'The problem' },
  { id: 'status', num: '02', label: 'Where it stands' },
  { id: 'score', num: '03', label: 'The wake score' },
  { id: 'gap', num: '04', label: 'Two in a row' },
  { id: 'ingest', num: '05', label: 'One snapshot' },
  { id: 'loop', num: '06', label: 'The morning loop' },
  { id: 'decisions', num: '07', label: 'Hard problems' },
  { id: 'architecture', num: '08', label: 'Architecture' },
  { id: 'data', num: '09', label: 'Data model' },
  { id: 'build', num: '10', label: 'How it was built' },
];
const SECTION = Object.fromEntries(SECTIONS.map((x) => [x.id, x]));

/** Built / not built, in three lines, before anything else. */
const SCOPE_NOTE = [
  { key: 'built', mark: 'filled', text: 'Built and tested: the server — scoring, rules, scheduler, ingestion API, pairing, data model, replay.' },
  { key: 'partial', mark: 'half', text: 'Partly built: the phone — the Swift sensor module and pairing, run only in the iOS Simulator. It doesn’t send snapshots yet.' },
  { key: 'planned', mark: 'hollow', text: 'Planned: the Morning Reel — news, script, voice, captions, video, delivery. Only a Remotion cover scene exists.' },
];

/** Filled jade = built, half = partly built, hollow = planned (the shape says it). */
function ScopeMark({ mark }) {
  const style = {
    filled: { background: P.jade },
    half: { background: `linear-gradient(90deg, ${P.jade} 50%, transparent 50%)`, boxShadow: `inset 0 0 0 1.25px ${P.jade}` },
    hollow: { boxShadow: `inset 0 0 0 1.25px ${P.inkSubtle}` },
  }[mark];
  return <span aria-hidden className="mt-[9px] h-2 w-2 shrink-0 rounded-full" style={style} />;
}

/* ── the page ──────────────────────────────────────────────────────────── */

export default function Page({ project, study }) {
  const accent = accentFor(project.kind);
  const title = headlines(project);
  const sec = (id) => ({ scope: SCOPE, ...SECTION[id], title: title[id], accent });
  const links = [
    ...(project.repo ? [{ href: project.repo, label: 'Repository' }] : []),
    ...(study?.live ? [{ href: study.live, label: study.liveLabel || 'Live' }] : []),
  ];

  return (
    <CaseArticle>
      <Hero
        project={project}
        accent={accent}
        outcome={COPY.outcome}
        status={COPY.status}
        links={links}
        figure={<HeroScore accent={accent} />}
        caption={COPY.figureCaption}
      />

      <div className={WRAP}>
        <div className="pb-20 sm:pb-24">
          <div className="border-t border-line pt-6">
            <p className="mc-label">What this page covers</p>
            <ul className="mt-4 flex max-w-[78ch] flex-col gap-3">
              {SCOPE_NOTE.map((n) => (
                <li key={n.key} className="flex gap-3 text-body text-ink-muted">
                  <ScopeMark mark={n.mark} />
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-[78ch] font-mono text-micro leading-relaxed text-ink-subtle">
              Private repository · runs on a laptop on the home network, not deployed · every score below is computed from the real rule set and matches the project’s test fixtures
            </p>
          </div>
          <div className="mt-16">
            <SectionIndex scope={SCOPE} sections={SECTIONS} accent={accent} />
          </div>
        </div>

        <Section {...sec('problem')}>
          <BeforeAfter before={COPY.before} after={COPY.after} accent={accent} />
          {study?.built && <p className="mt-10 max-w-[68ch] text-body text-ink-muted">{study.built}</p>}
        </Section>

        <Section {...sec('status')}>
          <Milestones accent={accent} />
        </Section>

        <Section {...sec('score')}>
          <p className="mb-8 max-w-[68ch] text-body text-ink-muted">
            iOS gives an app no unlock event and no way to run continuously in the background. So during a morning window the server sends a silent push every five minutes; the phone answers with a snapshot of its recent history — steps, walking, whether it is unlocked, whether it is charging — and the server adds up points. Not machine learning: a weighted checklist anyone can read, stored with every score so it can be audited and tuned.
          </p>
          <WakeScore accent={accent} />
        </Section>

        <Section {...sec('gap')}>
          <ConfirmGap accent={accent} />
        </Section>

        <Section {...sec('ingest')}>
          <IngestProbe accent={accent} />
        </Section>

        <Section {...sec('loop')}>
          <DayLoop accent={accent} />
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
            <AgentPipeline />
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
