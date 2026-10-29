'use client';

/**
 * CaseStudyIET — the page shell for the Church Building Application System
 * case study (project 'iet'). Mission Control renders it where the generic
 * Brief would go, so its outer wrapper mirrors the Brief's motion.article.
 *
 * Every section speaks one grammar: a mono eyebrow (number in the accent) →
 * one display-font takeaway sentence → a visual → details on demand. Read the
 * headlines alone and you have the story:
 *
 *   hero          what it is, the outcome, the numbers, who touches it
 *   redacted      why there are no screenshots — then an index of the page
 *   01 problem    paper → platform, row by row (before → after)
 *   02 lifecycle  the 21 statuses, scrubbed step by step   <Lifecycle />
 *   03 decisions  the three hard problems                  <Decisions />
 *   04 control    The admin console ("Mission Control")    <ControlPlane />
 *   05 perf       146.7 s → 1.28 s, and the proof          <Performance />
 *   06 security   the layers, then the audit               <Security />
 *   07 platform   analytics, notifications, offline, cron  <Platform />
 *   08 arch       five layers, real requests traced        <Architecture />
 *   09 data       the schema, by domain                    <DataModel />
 *   10 build      the two bursts, then how it ships        <BuildRuler /> <Quality />
 *   next          the roadmap, then the next case study
 *
 * Facts come from data/studies/iet.js, projects.js and caseStudies.js; the
 * counts inside the headlines are derived from that data, so this file only
 * owns the sentences around them. Motion: the hero staggers in on mount, each
 * section head fades up once on view, the before → after rows reveal in
 * pairs. With reduced motion everything is simply there.
 */
import { ACTORS, BUILD, COPY, DATA_MODEL, DECISIONS, LAYERS, PERF, ROLES, SECURITY, STATUSES, TRACES } from '@/data/studies/iet';
import { BeforeAfter, CaseArticle, Hero, NextSection, Section, SectionIndex, WRAP, accentFor, capWord, word } from '@/components/ui/case/shell';
import ApprovalStack from '@/components/ui/case/ApprovalStack';
import Redacted from '@/components/ui/case/Redacted';
import Lifecycle from '@/components/ui/case/Lifecycle';
import Decisions from '@/components/ui/case/Decisions';
import Architecture from '@/components/ui/case/Architecture';
import DataModel from '@/components/ui/case/DataModel';
import BuildRuler from '@/components/ui/case/BuildRuler';
import Quality from '@/components/ui/case/Quality';
import ControlPlane from '@/components/ui/case/ControlPlane';
import Performance from '@/components/ui/case/Performance';
import Security from '@/components/ui/case/Security';
import Platform from '@/components/ui/case/Platform';

const SCOPE = 'iet';
const PHASE_STATUS = /^PHASE_\d+_IN_PROGRESS$/;

/* ── derived facts (counts in the headlines come from the data) ──────────── */
const PHASE_COUNT = STATUSES.filter((s) => PHASE_STATUS.test(s.id)).length;
const MODEL_COUNT = DATA_MODEL.domains.reduce((n, d) => n + d.models.length, 0);
// Who acts on one project: an applicant (a Pastor, or a Division Leader for
// their division — alternatives, not two levels) and the sign-offs above them.
const SIGNOFF_COUNT = Object.entries(ACTORS).filter(([key, a]) => key !== 'applicant' && a.tiers.length > 0).length;

/** 146709 → '146.7 s', 1278 → '1.28 s' — three significant figures, one decimal past 100 s. */
const seconds = (ms) => {
  const v = ms / 1000;
  return `${v >= 100 ? v.toFixed(1) : v.toPrecision(3)} s`;
};
const PR_COUNT = BUILD.totals.find((t) => /pull request/i.test(t.label))?.value;

/** The section headlines — the sentences are written here, the numbers aren't. */
function headlines() {
  const layers = SECURITY.layers.length;
  const findings = SECURITY.audit.length;
  return {
    problem: `Every project lived on paper — an applicant, ${word(SIGNOFF_COUNT)} sign-offs, ${word(PHASE_COUNT)} funded phases, no single view.`,
    lifecycle: `${STATUSES.length} statuses, one engine — and every move leaves a record.`,
    decisions: `${capWord(DECISIONS.length)} hard problems: money that can’t be paid out twice, rule changes that can’t rewrite old applications, and data no one can reach by editing a URL.`,
    control: 'The organisation changes its own rules — no engineer, no deploy.',
    perf: `The heaviest report went from ${seconds(PERF.hero.before)} to ${seconds(PERF.hero.after)} — and returned the same bytes.`,
    security: `${capWord(layers)} layers between a request and the data — then an audit: ${word(findings)} findings, ${word(findings)} fixes.`,
    platform: 'Around the engine: analytics, notifications, an offline form and a nightly job.',
    architecture: `One Next.js app, ${word(LAYERS.length)} layers — follow a request through it.`,
    data: `${MODEL_COUNT} models in ${word(DATA_MODEL.domains.length)} domains — and every release of money is a row the app never edits.`,
    build: PR_COUNT ? `A prototype in February — then ${PR_COUNT} pull requests in three weeks of October.` : 'Sole engineer, schema first.',
    next: 'Production next — then what the roadmap deferred.',
  };
}

/** The page's sections, in order — the index and the page both read this. */
const SECTIONS = [
  { id: 'problem', num: '01', label: 'The problem' },
  { id: 'lifecycle', num: '02', label: 'The lifecycle' },
  { id: 'decisions', num: '03', label: 'Hard problems' },
  { id: 'control', num: '04', label: 'The admin console' },
  { id: 'perf', num: '05', label: 'Performance' },
  { id: 'security', num: '06', label: 'Security' },
  { id: 'platform', num: '07', label: 'Around the workflow' },
  { id: 'architecture', num: '08', label: 'Architecture' },
  { id: 'data', num: '09', label: 'Data model' },
  { id: 'build', num: '10', label: 'How it was built' },
];
const SECTION = Object.fromEntries(SECTIONS.map((x) => [x.id, x]));

/* ── the page ──────────────────────────────────────────────────────────── */

export default function CaseStudyIET({ project, study }) {
  const accent = accentFor(project.kind);
  const title = headlines();
  const sec = (id) => ({ scope: SCOPE, ...SECTION[id], title: title[id], accent });

  return (
    <CaseArticle>
      {/* the stack runs its own entrance (slabs settle bottom-up), then the
          token climbs: Pastor and Division Leader light together as the one
          applicant level, then HQ → President → Finance */}
      <Hero
        project={project}
        accent={accent}
        outcome={COPY.outcome}
        status={COPY.status}
        figure={<ApprovalStack climbing />}
        caption="Who touches an application"
      />

      <div className={WRAP}>
        <div className="pb-20 sm:pb-24">
          <Redacted />
          <div className="mt-16">
            <SectionIndex scope={SCOPE} sections={SECTIONS} accent={accent} />
          </div>
        </div>

        <Section {...sec('problem')}>
          <BeforeAfter before={COPY.before} after={COPY.after} accent={accent} />
          {study?.built && <p className="mt-10 max-w-[68ch] text-body text-ink-muted">{study.built}</p>}
        </Section>

        <Section {...sec('lifecycle')}>
          <Lifecycle accent={accent} />
        </Section>

        <Section {...sec('decisions')}>
          <Decisions accent={accent} />
        </Section>

        <Section {...sec('control')}>
          <ControlPlane accent={accent} />
        </Section>

        <Section {...sec('perf')}>
          <Performance accent={accent} />
        </Section>

        <Section {...sec('security')}>
          <Security accent={accent} />
        </Section>

        <Section {...sec('platform')}>
          <Platform accent={accent} />
        </Section>

        <Section {...sec('architecture')}>
          <Architecture project={project} layers={LAYERS} traces={TRACES} roles={ROLES} accent={accent} />
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
