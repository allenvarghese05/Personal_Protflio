'use client';

/**
 * The case-study shell — the frame every project page shares, lifted from the
 * Church Building page so every case study reads with one grammar:
 *
 *   CaseArticle   the page wrapper (fades in like the generic brief did)
 *   Hero          badge → title → one-line outcome → meta → status → metrics,
 *                 with a bespoke figure on the right
 *   SectionIndex  a numbered index that jumps the stage to each section
 *   Section       mono eyebrow (number in the accent) → one display-font
 *                 takeaway sentence → the section's visual
 *   BeforeAfter   the problem, row by row (hollow marker → filled marker)
 *   NextSection   what's next, then the "next case study" button
 *
 * A project page composes these with its own section components; the facts
 * live in src/data/studies/<id>.js. Motion: the hero staggers in on mount,
 * section heads fade up once in view, before → after rows reveal in pairs.
 * Reduced motion: everything is simply there.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { ENGINEERING_PROJECTS } from '@/data/projects';
import { PALETTE as P, alpha } from '@/lib/palette';
import { ACCENTS, DUR, EASE_OUT, EASE_STD } from '@/lib/motion';
import NextProject from '@/components/ui/case/NextProject';

/* ── constants ─────────────────────────────────────────────────────────── */
const SCROLLER = '[data-mc-scroll]'; // Mission Control's scrolling stage
export const WRAP = 'mx-auto w-full max-w-[1296px] px-6 sm:px-12'; // 1200px of content
// .mc-label is unlayered CSS, so its colour can't be overridden by a utility —
// this is the same voice for labels that need a different ink
export const LABEL = 'font-mono text-micro font-medium uppercase tracking-[0.18em]';

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

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/* ── small helpers (exported for headlines) ────────────────────────────── */
/** 3 → 'three' (0–12), digits above. */
export const word = (n) => WORDS[n] ?? String(n);
/** 3 → 'Three'. */
export const capWord = (n) => {
  const w = word(n);
  return w.charAt(0).toUpperCase() + w.slice(1);
};
/** The page accent for a project kind (signature → amber, …). */
export const accentFor = (kind) => ACCENTS[kind] || ACCENTS.project;

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

/* ── the page wrapper ──────────────────────────────────────────────────── */

/** The page's outer frame — mirrors the generic brief's motion.article. */
export function CaseArticle({ children }) {
  return (
    <motion.article
      key="brief"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: DUR.briefFade, ease: EASE_STD } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="w-full overflow-x-clip"
    >
      {children}
    </motion.article>
  );
}

/* ── hero ──────────────────────────────────────────────────────────────── */

export function Badge({ accent, children }) {
  return (
    <span className="mc-chip mc-chip--accent w-fit font-medium uppercase tracking-[0.18em]" style={{ '--chip': accent }}>
      {children}
    </span>
  );
}

/**
 * Where the project stands. tone 'live' = a green dot (actually live for real
 * users); 'sand' (default) = anything short of that — pre-launch, beta,
 * prototype, in progress. Never claim live by default.
 */
export function StatusPill({ tone = 'sand', children }) {
  const dot = tone === 'live' ? P.live : P.sand;
  return (
    <span className={`${LABEL} inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-2 text-ink-muted`}>
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot, boxShadow: `0 0 0 3px ${alpha(dot, 0.16)}` }} />
      {children}
    </span>
  );
}

export function Metrics({ metrics, accent }) {
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

/** A small external link chip (repo, live site) for the hero. */
function LinkChip({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 font-mono text-micro font-medium uppercase tracking-[0.18em] text-ink-muted transition-colors hover:border-line-hi hover:text-ink"
    >
      {children}
      <span aria-hidden>↗</span>
    </a>
  );
}

/**
 * The hero. `outcome` is the one-line what-it-is-and-what-changed; `status`
 * the pill text (with `statusTone`); `links` optional [{ href, label }];
 * `figure` the bespoke visual on the right, with `caption` under it.
 */
export function Hero({ project, accent, outcome, status, statusTone, links, figure, caption }) {
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

          {outcome && (
            <motion.p variants={heroItem} className="mt-6 max-w-[36ch] text-lg leading-relaxed text-ink-muted sm:text-xl">
              {outcome}
            </motion.p>
          )}

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

          {(status || links?.length) && (
            <motion.div variants={heroItem} className="mt-5 flex flex-wrap items-center gap-3">
              {status && <StatusPill tone={statusTone}>{status}</StatusPill>}
              {links?.map((l) => (
                <LinkChip key={l.href} href={l.href}>
                  {l.label}
                </LinkChip>
              ))}
            </motion.div>
          )}

          <motion.div variants={heroItem} className="mt-10">
            <Metrics metrics={project.metrics} accent={accent} />
          </motion.div>
        </motion.div>

        {figure && (
          <figure className="mx-auto w-full min-w-0 max-w-[600px]">
            {figure}
            {caption && <figcaption className="mc-label mt-4 text-center">{caption}</figcaption>}
          </figure>
        )}
      </div>
    </header>
  );
}

/* ── section frame ─────────────────────────────────────────────────────── */

/** Mono eyebrow (number in the accent) + the one-sentence takeaway. */
export function SectionHead({ id, num, label, title, accent }) {
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
        className="font-display mt-4 max-w-[26ch] scroll-mt-16 text-balance text-3xl font-semibold leading-[1.12] tracking-[-0.025em] text-ink sm:text-4xl"
      >
        {title}
      </h2>
    </motion.div>
  );
}

/** One numbered section. `scope` (the project id) namespaces the heading id. */
export function Section({ scope, id, num, label, title, accent, children }) {
  const headId = `${scope}-${id}`;
  return (
    <section aria-labelledby={headId} className="border-t border-line py-20 sm:py-24">
      <SectionHead id={headId} num={num} label={label} title={title} accent={accent} />
      <div className="mt-10 min-w-0 sm:mt-14">{children}</div>
    </section>
  );
}

/* ── the problem: before → after ───────────────────────────────────────── */

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

/** `before` and `after` are parallel arrays of short sentences. */
export function BeforeAfter({ before, after, accent, beforeLabel = 'Before', afterLabel = 'After' }) {
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
          {beforeLabel}
        </span>
        <span className="text-ink-subtle md:hidden">→</span>
        <span className="hidden md:block" />
        <span className={`${LABEL} flex items-center gap-3 text-ink`}>
          <Marker filled accent={accent} className="" />
          {afterLabel}
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
                  <span className="sr-only">{beforeLabel}: </span>
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
                  <span className="sr-only">{afterLabel}: </span>
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

/* ── the index ─────────────────────────────────────────────────────────── */

/** A numbered index of `sections` ([{ id, num, label }]) — jumps the stage to each one. */
export function SectionIndex({ scope, sections, accent }) {
  const reduce = useReducedMotion();
  const jump = (id) => {
    const el = document.getElementById(`${scope}-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  };
  return (
    <nav aria-label="In this case study" className="border-t border-line pt-6">
      <p className="mc-label">In this case study</p>
      <ol className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-5">
        {sections.map((x) => (
          <li key={x.id}>
            <button
              type="button"
              onClick={() => jump(x.id)}
              className="group flex w-full items-baseline gap-3 border-b border-line py-2.5 text-left font-mono text-label text-ink-muted transition-colors hover:text-ink"
            >
              <span className="tabular-nums" style={{ color: accent }}>
                {x.num}
              </span>
              <span>{x.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ── what's next ───────────────────────────────────────────────────────── */

export function NextList({ items, accent }) {
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

/** The unnumbered closing section: what's next, then the next case study. */
export function NextSection({ scope, project, title, items, accent }) {
  const rootRef = useRef(null);
  const setSelected = useStore((s) => s.setSelectedProject);
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
    <Section scope={scope} id="next" label="What’s next" title={title} accent={accent}>
      <div ref={rootRef}>
        {items?.length > 0 && <NextList items={items} accent={accent} />}

        {next && (
          <div className="mt-16 flex flex-col items-start gap-6 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
            <div className="min-w-0">
              <p className="mc-label">Up next</p>
              {next.subtitle && <p className="mt-2 max-w-[52ch] text-body text-ink-muted">{next.subtitle}</p>}
            </div>
            <NextProject label={next.label} onClick={goNext} />
          </div>
        )}
      </div>
    </Section>
  );
}
