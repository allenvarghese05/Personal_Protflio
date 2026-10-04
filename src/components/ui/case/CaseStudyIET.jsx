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
 *   redacted      why there are no screenshots
 *   01 problem    paper → platform, row by row (before → after)
 *   02 lifecycle  the status path                       <Lifecycle />
 *   03 decisions  the three hard problems               <Decisions />
 *   04 arch       five layers, real requests traced     <Architecture />
 *   05 data       the schema, by domain                 <DataModel />
 *   06 build      the weeks on a ruler, then the stack  <BuildRuler />
 *   next          launch + open ends, then the next case study
 *
 * Facts come from data/studies/iet.js, projects.js and caseStudies.js; the
 * counts inside the headlines are derived from that data, so this file only
 * owns the sentences around them. Motion: the hero staggers in on mount, each
 * section head fades up once on view, the before → after rows reveal in
 * pairs. With reduced motion everything is simply there.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { ENGINEERING_PROJECTS } from '@/data/projects';
import { ACTORS, COPY, DATA_MODEL, DECISIONS, LAYERS, STATUSES } from '@/data/studies/iet';
import { PALETTE as P, alpha } from '@/lib/palette';
import { ACCENTS, DUR, EASE_OUT, EASE_STD } from '@/lib/motion';
import ApprovalStack from '@/components/ui/case/ApprovalStack';
import Redacted from '@/components/ui/case/Redacted';
import Lifecycle from '@/components/ui/case/Lifecycle';
import Decisions from '@/components/ui/case/Decisions';
import Architecture from '@/components/ui/case/Architecture';
import DataModel from '@/components/ui/case/DataModel';
import BuildRuler from '@/components/ui/case/BuildRuler';
import NextProject from '@/components/ui/case/NextProject';

/* ── constants ─────────────────────────────────────────────────────────── */
const SCROLLER = '[data-mc-scroll]'; // Mission Control's scrolling stage
const WRAP = 'mx-auto w-full max-w-[1296px] px-6 sm:px-12'; // 1200px of content
// .mc-label is unlayered CSS, so its colour can't be overridden by a utility —
// this is the same voice for labels that need a different ink
const LABEL = 'font-mono text-micro font-medium uppercase tracking-[0.18em]';

const HERO_STAGGER_S = 0.07;
const HERO_DELAY_S = 0.08;
const HERO_RISE_PX = 14;
const HEAD_RISE_PX = 16;
const FADE_S = 0.7;
const HEAD_VIEW = { once: true, amount: 0.6 };

const PAIR_VIEW = { once: true, amount: 0.3 };
const PAIR_STEP_S = 0.1; // between before → after rows
const PAIR_ARROW_S = 0.18; // the arrow draws after its "before"
const PAIR_AFTER_S = 0.34; // and the "after" lands once it has
const PAIR_SHIFT_PX = 8;
// before | arrow | after, on one grid so row i of each column lines up — no
// gap at md, so the column heads sit on exactly the same tracks as the rows
const PAIR_GRID = 'md:grid md:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] md:items-start md:gap-0';

const PHASE_STATUS = /^PHASE_\d+_IN_PROGRESS$/;
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/* ── derived facts (counts in the headlines come from the data) ──────────── */
const PHASE_COUNT = STATUSES.filter((s) => PHASE_STATUS.test(s.id)).length;
const MODEL_COUNT = DATA_MODEL.domains.reduce((n, d) => n + d.models.length, 0);
// Who acts on one project: an applicant (a Pastor, or a Division Leader for
// their division — alternatives, not two levels) and the sign-offs above them.
const SIGNOFF_COUNT = Object.entries(ACTORS).filter(([key, a]) => key !== 'applicant' && a.tiers.length > 0).length;

/* ── small helpers ─────────────────────────────────────────────────────── */
const word = (n) => WORDS[n] ?? String(n);
const capWord = (n) => {
  const w = word(n);
  return w.charAt(0).toUpperCase() + w.slice(1);
};
const accentFor = (kind) => ACCENTS[kind] || ACCENTS.project;

/** The project after `id` in the wall's order, wrapping; null if it's alone. */
function nextAfter(id) {
  const list = ENGINEERING_PROJECTS;
  const next = list[(list.findIndex((p) => p.id === id) + 1) % list.length];
  return next && next.id !== id ? next : null;
}

/**
 * Move focus to the first heading in Mission Control's stage — the next brief's
 * title. Going to the next project unmounts this page and the focused button
 * with it; without this, focus drops to <body>, outside the modal dialog.
 */
function focusStageHeading(scroller) {
  const heading = scroller?.querySelector('h1, h2');
  if (!heading) return;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

/** The section headlines — the sentences are written here, the numbers aren't. */
function headlines(project) {
  const weeks = project.timeline?.length || 0;
  return {
    problem: `Every project lived on paper — an applicant, ${word(SIGNOFF_COUNT)} sign-offs, ${word(PHASE_COUNT)} phases, no single view.`,
    lifecycle: `${STATUSES.length} statuses, one path — and every step leaves a record.`,
    decisions: `${capWord(DECISIONS.length)} decisions that keep the money and the rules honest.`,
    architecture: `One Next.js app, ${word(LAYERS.length)} layers — follow a request through it.`,
    data: `${MODEL_COUNT} models across ${word(DATA_MODEL.domains.length)} domains.`,
    build: weeks ? `${capWord(weeks)} weeks, sole engineer, schema first.` : 'Sole engineer, schema first.',
    next: 'Launch first — then the lifecycle’s loose ends.',
  };
}

/** Fade + shift in once `shown`; with reduced motion the final state, instantly. */
const reveal = (shown, reduce, delay, from) => ({
  initial: reduce ? false : { opacity: 0, ...from },
  animate: shown ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...from },
  transition: { duration: FADE_S, ease: EASE_OUT, delay },
});

const heroStagger = {
  hidden: {},
  show: { transition: { staggerChildren: HERO_STAGGER_S, delayChildren: HERO_DELAY_S } },
};
const heroItem = {
  hidden: { opacity: 0, y: HERO_RISE_PX },
  show: { opacity: 1, y: 0, transition: { duration: FADE_S, ease: EASE_OUT } },
};

/* ── hero ──────────────────────────────────────────────────────────────── */

function Badge({ accent, children }) {
  return (
    <span className="mc-chip mc-chip--accent w-fit font-medium uppercase tracking-[0.18em]" style={{ '--chip': accent }}>
      {children}
    </span>
  );
}

/** Pre-launch, not live — a sand dot, never the green "live" signal. */
function StatusPill({ children }) {
  return (
    <span className={`${LABEL} inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-2 text-ink-muted`}>
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: P.sand, boxShadow: `0 0 0 3px ${alpha(P.sand, 0.16)}` }}
      />
      {children}
    </span>
  );
}

function Metrics({ metrics, accent }) {
  if (!metrics?.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        // label first in the DOM (dt before dd), value first on screen
        <div key={m.label} className="flex flex-col-reverse justify-end border-t border-line pb-6 pt-4">
          <dt className="mt-2.5 max-w-[18ch] font-mono text-micro font-medium uppercase leading-snug tracking-[0.14em] text-ink-subtle">
            {m.label}
          </dt>
          <dd className="font-display text-4xl font-bold leading-none tracking-tight" style={{ color: accent }}>
            {m.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Hero({ project, accent }) {
  const reduce = useReducedMotion();
  const meta = [project.role, project.company, project.dateRange, project.location].filter(Boolean);

  return (
    <header className={`${WRAP} pb-16 pt-12 sm:pb-20 sm:pt-16`}>
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-16">
        <motion.div variants={heroStagger} initial={reduce ? false : 'hidden'} animate="show" className="min-w-0">
          <motion.div variants={heroItem}>
            <Badge accent={accent}>{project.badge}</Badge>
          </motion.div>

          <motion.h1
            variants={heroItem}
            className="font-display mt-6 text-[2.5rem] font-bold leading-[1.02] tracking-[-0.035em] text-balance text-ink sm:text-6xl xl:text-[4.25rem]"
          >
            {project.label}
          </motion.h1>

          <motion.p variants={heroItem} className="mt-6 max-w-[36ch] text-lg leading-relaxed text-ink-muted sm:text-xl">
            {COPY.outcome}
          </motion.p>

          <motion.p variants={heroItem} className="mt-6 flex flex-wrap gap-x-2 gap-y-1 font-mono text-label text-ink-subtle">
            {meta.map((seg, i) => (
              <span key={seg}>
                {seg}
                {i < meta.length - 1 && (
                  <span aria-hidden className="ml-2 text-ink-faint">
                    ·
                  </span>
                )}
              </span>
            ))}
          </motion.p>

          <motion.div variants={heroItem} className="mt-5">
            <StatusPill>{COPY.status}</StatusPill>
          </motion.div>

          <motion.div variants={heroItem} className="mt-10">
            <Metrics metrics={project.metrics} accent={accent} />
          </motion.div>
        </motion.div>

        {/* the stack runs its own entrance (slabs settle bottom-up), then the
            token climbs: Pastor and Division Leader light together as the one
            applicant level, then HQ → President → Finance */}
        <figure className="mx-auto w-full min-w-0 max-w-[600px]">
          <ApprovalStack climbing />
          <figcaption className="mc-label mt-4 text-center">Who touches an application</figcaption>
        </figure>
      </div>
    </header>
  );
}

/* ── section frame ─────────────────────────────────────────────────────── */

/** Mono eyebrow (number in the accent) + the one-sentence takeaway. */
function SectionHead({ id, num, label, title, accent }) {
  const reduce = useReducedMotion();
  const fade = reduce
    ? {}
    : {
        initial: { opacity: 0, y: HEAD_RISE_PX },
        whileInView: { opacity: 1, y: 0 },
        viewport: HEAD_VIEW,
        transition: { duration: FADE_S, ease: EASE_OUT },
      };
  return (
    <motion.div {...fade}>
      <p className={`${LABEL} text-ink-subtle`}>
        {num && (
          <>
            <span style={{ color: accent }}>{num}</span>
            <span aria-hidden className="text-ink-faint">
              {' — '}
            </span>
          </>
        )}
        {label}
      </p>
      <h2
        id={id}
        className="font-display mt-4 max-w-[26ch] text-balance text-3xl font-semibold leading-[1.12] tracking-[-0.025em] text-ink sm:text-4xl"
      >
        {title}
      </h2>
    </motion.div>
  );
}

function Section({ id, num, label, title, accent, children }) {
  const headId = `iet-${id}`;
  return (
    <section aria-labelledby={headId} className="border-t border-line py-20 sm:py-24">
      <SectionHead id={headId} num={num} label={label} title={title} accent={accent} />
      <div className="mt-10 min-w-0 sm:mt-14">{children}</div>
    </section>
  );
}

/* ── 01 — before → after ───────────────────────────────────────────────── */

/** Hollow = how it was; filled accent = how it is. Shape differs, not just hue. */
function Marker({ filled = false, accent, className = 'mt-[9px]' }) {
  return (
    <span
      aria-hidden
      className={`h-2 w-2 shrink-0 rounded-full ${className}`}
      style={filled ? { background: accent } : { boxShadow: `inset 0 0 0 1.25px ${P.inkSubtle}` }}
    />
  );
}

function PairArrow({ shown, reduce, delay }) {
  const draw = {
    initial: reduce ? false : { pathLength: 0, opacity: 0 },
    animate: shown ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 },
    transition: { duration: FADE_S * 0.6, ease: EASE_STD, delay },
  };
  return (
    <svg width="44" height="10" viewBox="0 0 44 10" fill="none" aria-hidden className="block">
      <motion.path d="M1 5H41" stroke={P.inkSubtle} strokeWidth="1.25" strokeLinecap="round" {...draw} />
      <motion.path
        d="M37 1.5L41 5L37 8.5"
        stroke={P.inkSubtle}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw}
        transition={{ ...draw.transition, delay: delay + FADE_S * 0.4 }}
      />
    </svg>
  );
}

function BeforeAfter({ before, after, accent }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, PAIR_VIEW);
  const shown = reduce || inView;
  const rows = before.map((text, i) => ({ before: text, after: after[i] ?? '' }));

  return (
    <div ref={ref}>
      {/* column heads on desktop; a one-line legend on mobile */}
      <div aria-hidden className={`flex items-center gap-3 pb-4 ${PAIR_GRID}`}>
        <span className={`${LABEL} flex items-center gap-3 text-ink-subtle`}>
          <Marker className="" />
          Before
        </span>
        <span className="text-ink-subtle md:hidden">→</span>
        <span className="hidden md:block" />
        <span className={`${LABEL} flex items-center gap-3 text-ink`}>
          <Marker filled accent={accent} className="" />
          After
        </span>
      </div>

      <ol className="border-b border-line">
        {rows.map((row, i) => {
          const at = i * PAIR_STEP_S;
          return (
            <li key={row.before} className={`flex flex-col gap-2.5 border-t border-line py-5 sm:py-6 ${PAIR_GRID}`}>
              <motion.p
                {...reveal(shown, reduce, at, { x: -PAIR_SHIFT_PX })}
                className="flex min-w-0 gap-3 text-body text-ink-muted"
              >
                <Marker />
                <span>
                  <span className="sr-only">Before: </span>
                  {row.before}
                </span>
              </motion.p>

              <div className="hidden justify-center pt-[8px] md:flex">
                <PairArrow shown={shown} reduce={reduce} delay={at + PAIR_ARROW_S} />
              </div>

              <motion.p
                {...reveal(shown, reduce, at + PAIR_AFTER_S, { x: -PAIR_SHIFT_PX })}
                className="flex min-w-0 gap-3 text-body text-ink"
              >
                <Marker filled accent={accent} />
                <span>
                  <span className="sr-only">After: </span>
                  {row.after}
                </span>
              </motion.p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── what's next ───────────────────────────────────────────────────────── */

function NextList({ items, accent }) {
  return (
    <ul className="flex max-w-[70ch] flex-col gap-4">
      {items.map((it) => (
        <li key={it} className="flex gap-4 text-body text-ink-muted">
          <span aria-hidden className="mt-[12px] h-[2px] w-3 shrink-0 rounded-full" style={{ background: accent }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── the page ──────────────────────────────────────────────────────────── */

export default function CaseStudyIET({ project, study }) {
  const rootRef = useRef(null);
  const setSelected = useStore((s) => s.setSelectedProject);
  const accent = accentFor(project.kind);
  const title = headlines(project);
  const next = nextAfter(project.id);

  const goNext = () => {
    if (!next) return;
    const scroller = rootRef.current?.closest(SCROLLER) || document.querySelector(SCROLLER);
    scroller?.scrollTo({ top: 0 });
    setSelected(next.id);
    // the swap commits before the next frame; land focus in the new brief
    if (scroller) requestAnimationFrame(() => focusStageHeading(scroller));
  };

  return (
    <motion.article
      ref={rootRef}
      key="brief"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: DUR.briefFade, ease: EASE_STD } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="w-full overflow-x-clip"
    >
      <Hero project={project} accent={accent} />

      <div className={WRAP}>
        <div className="pb-20 sm:pb-24">
          <Redacted />
        </div>

        <Section id="problem" num="01" label="The problem" title={title.problem} accent={accent}>
          <BeforeAfter before={COPY.before} after={COPY.after} accent={accent} />
          {study?.problem && <p className="mt-10 max-w-[68ch] text-body text-ink-muted">{study.problem}</p>}
        </Section>

        <Section id="lifecycle" num="02" label="The lifecycle" title={title.lifecycle} accent={accent}>
          <Lifecycle accent={accent} />
        </Section>

        <Section id="decisions" num="03" label="Hard problems" title={title.decisions} accent={accent}>
          <Decisions accent={accent} />
        </Section>

        <Section id="architecture" num="04" label="Architecture" title={title.architecture} accent={accent}>
          <Architecture project={project} accent={accent} />
        </Section>

        <Section id="data" num="05" label="Data model" title={title.data} accent={accent}>
          <DataModel accent={accent} />
        </Section>

        <Section id="build" num="06" label="How it was built" title={title.build} accent={accent}>
          <BuildRuler
            timeline={project.timeline}
            primary={project.primaryStack}
            secondary={project.secondaryStack}
            accent={accent}
          />
        </Section>

        <Section id="next" label="What’s next" title={title.next} accent={accent}>
          <NextList items={COPY.next} accent={accent} />

          {next && (
            <div className="mt-16 flex flex-col items-start gap-6 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
              <div className="min-w-0">
                <p className="mc-label">Up next</p>
                {next.subtitle && <p className="mt-2 max-w-[52ch] text-body text-ink-muted">{next.subtitle}</p>}
              </div>
              <NextProject label={next.label} onClick={goNext} />
            </div>
          )}
        </Section>
      </div>
    </motion.article>
  );
}
