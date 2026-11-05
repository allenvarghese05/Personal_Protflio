'use client';
/**
 * /projects — every project, for someone who came from the résumé (or from
 * "Skip to projects" in the game) and wants the work without the journey.
 *
 *   header     name, contact, résumé, theme, the way into the 3D portfolio;
 *              a progress line and the project you're on
 *   opening    "Projects" as Tech Text (./TechText), one sentence carrying the strongest proof (its
 *              phrases link to their projects), and the index: all ten in a list
 *              whose rows flow open on hover (./FlowIndex)
 *   featured   four large sections: the picture holds (sticky) on the
 *              project's colour while the story, numbers and steps scroll
 *              past it; sides alternate
 *   progress   three cards: picture, numbers, steps behind a disclosure
 *   earlier    three rows
 *   footer     contact again (with copy-email), the playful version
 *
 * J / K move between projects. Content: src/data/showcase.js. Light / dark:
 * ./theme.jsx. Pictures: ./Stage.jsx.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { projectById } from '@/data/projects';
import { ALL_IDS, LAYOUT, OPENING, PROFILE, SHORT, SHOWCASE } from '@/data/showcase';
import FlowIndex from './FlowIndex';
import TechText from './TechText';
import { GITHUB_MARK, LINKEDIN_MARK } from '@/lib/brandMarks';
import dynamic from 'next/dynamic';

// WebGL, client only: loads after the page, never blocks the first paint
const ASCIIText = dynamic(() => import('./ASCIIText'), { ssr: false, loading: () => null });

/* The name behind the opening, in 3D ASCII: very faint grey, swaying slowly,
   decoded once on arrival. In light mode the component inverts its colours,
   so the tints there are 1 − the grey we want (#d9d9dd centre, #e8e8eb edge). */
const NAME_TINT = {
  light: ['#262622', '#1f1f1b', '#171714'],
  dark: ['#2b2e37', '#24262e', '#1c1e25'],
};

function NameField({ theme }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[min(500px,75vh)] w-screen -translate-x-1/2"
      style={{
        maskImage: 'linear-gradient(to bottom, black 35%, transparent 92%), radial-gradient(75% 90% at 50% 40%, black 45%, transparent 100%)',
        maskComposite: 'intersect',
        WebkitMaskImage: 'linear-gradient(to bottom, black 35%, transparent 92%)',
      }}
    >
      <ASCIIText
        text="Allen"
        theme={theme === 'light' ? 'light' : 'dark'}
        colors={NAME_TINT[theme === 'light' ? 'light' : 'dark']}
        textColor="#ffffff"
        asciiFontSize={9}
        textScale={1.35}
        blocks={0}
        chroma={0.4}
        waves={0.5}
        waveSpeed={0.5}
        tilt={1}
        hueShift={0}
        scramble={0}
        interactive={false}
        clickRipple={false}
      />
    </div>
  );
}
import Stage from './Stage';
import { Chip, HowItWorks, Mark, Stats, Steps, TONE } from './parts';
import { ThemeToggle, useWorkTheme } from './theme';

const EASE_OUT = [0.16, 1, 0.3, 1];
const WRAP = 'mx-auto w-full max-w-[1240px] px-5 sm:px-8';
// projects whose mark is a real emblem rather than a letter
const MARK_IMAGE = { aircast: '/work/aircast-nominee.webp', 'bis-report-card': '/work/bis-crest.webp' };
const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

const PILL =
  'group/btn inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[background-color,box-shadow,color,transform] duration-200 active:scale-[0.98]';
const PILL_SOLID = `${PILL} bg-ink pl-5 pr-1.5 text-void hover:bg-accent`;
const PILL_LINE = `${PILL} px-5 text-ink ring-1 ring-inset ring-line-hi hover:bg-surface-2 hover:ring-ink-subtle`;
const LINK_QUIET = 'inline-flex h-9 items-center rounded-full px-3 text-sm text-ink-muted transition-colors duration-200 hover:text-ink';

/** Scroll to a project (smoothly unless motion is reduced) and note it in the URL. */
function useJump() {
  const reduce = useReducedMotion();
  return useCallback(
    (e, id) => {
      const el = document.getElementById(id);
      if (!el) return;
      e?.preventDefault();
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    },
    [reduce],
  );
}

/** The project whose top has passed 45% of the screen (null above the first). */
function useCurrent() {
  const [current, setCurrent] = useState(null);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const line = window.innerHeight * 0.45;
      let hit = null;
      for (const id of ALL_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) hit = id;
      }
      setCurrent(hit);
    };
    // one measurement per frame at most; passive, so scrolling never waits on it
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return current;
}

/** J / K: next / previous project. */
function useKeys(current, jump) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k !== 'j' && k !== 'k') return;
      const i = current ? ALL_IDS.indexOf(current) : -1;
      const next = k === 'j' ? Math.min(ALL_IDS.length - 1, i + 1) : Math.max(0, i - 1);
      jump(null, ALL_IDS[next]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, jump]);
}

/* ── small parts ───────────────────────────────────────────────────────── */

function Rise({ children, className = '', delay = 0, as = 'div', ...rest }) {
  const reduce = useReducedMotion();
  const M = motion[as];
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.85, ease: EASE_OUT, delay }}
      {...rest}
    >
      {children}
    </M>
  );
}

function ArrowDot() {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--void)_14%,transparent)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-x-0.5 group-hover/btn:scale-105"
    >
      →
    </span>
  );
}

function ResumeButton({ compact = false }) {
  const { href, label } = PROFILE.resume;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={compact ? `${LINK_QUIET} font-medium text-ink` : PILL_LINE}>
        {label} <span aria-hidden className="ml-1 text-ink-subtle">↗</span>
      </a>
    );
  }
  // template until the PDF exists (PROFILE.resume in src/data/showcase.js)
  return (
    <span
      aria-disabled="true"
      title="Résumé coming soon"
      className={`inline-flex h-9 cursor-not-allowed items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-line-hi px-3 text-sm text-ink-subtle ${compact ? '' : 'h-11 px-5'}`}
    >
      {label} <span className="text-label">soon</span>
    </span>
  );
}

/* Calm outlined pills; the only colour is LinkedIn's own blue on its mark. */

const ICON_PILL = `${PILL} gap-2.5 pl-4 pr-5 text-ink ring-1 ring-inset ring-line-hi hover:bg-surface-2 hover:ring-ink-subtle`;

function BrandMark({ path, className = '' }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`h-[18px] w-[18px] shrink-0 ${className}`} fill="currentColor">
      <path d={path} />
    </svg>
  );
}

/** Where to find Allen, right under the opening: GitHub, LinkedIn, email. */
function ContactButtons() {
  return (
    <div className="flex flex-wrap gap-2 lg:justify-end">
      <a href={PROFILE.links.github} target="_blank" rel="noreferrer" className={ICON_PILL}>
        <BrandMark path={GITHUB_MARK} /> GitHub
      </a>
      <a href={PROFILE.links.linkedin} target="_blank" rel="noreferrer" className={ICON_PILL}>
        <BrandMark path={LINKEDIN_MARK} className="text-[#0a66c2]" /> LinkedIn
      </a>
      <a href={`mailto:${PROFILE.links.email}`} className={PILL_SOLID}>
        Email me <ArrowDot />
      </a>
      {/* the header carries the résumé on wider screens */}
      <span className="md:hidden">
        <ResumeButton />
      </span>
    </div>
  );
}

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.links.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${PROFILE.links.email}`;
    }
  };
  return (
    <button type="button" onClick={copy} className={PILL_LINE}>
      <span className="tabular-nums">{copied ? 'Copied to clipboard' : PROFILE.links.email}</span>
      <span aria-hidden className="text-ink-subtle">{copied ? '✓' : '⧉'}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email address copied' : ''}
      </span>
    </button>
  );
}

function Actions({ id, project, show }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <Link href={`/projects/${id}`} className={PILL_SOLID} aria-label={`Read the case study: ${project.label}`}>
        Read the case study
        <ArrowDot />
      </Link>
      {show.links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {l.label} <span aria-hidden>↗</span>
        </a>
      ))}
      {show.privateNote && !show.links.length && <span className="text-label text-ink-subtle">{show.privateNote}</span>}
    </div>
  );
}

function Meta({ id, show }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Mark show={show} image={MARK_IMAGE[id]} />
      <span className="text-label text-ink-subtle">{show.context}</span>
    </div>
  );
}

/* ── featured: the picture holds while the story scrolls ───────────────── */

function Featured({ id, flip, first }) {
  const project = projectById(id);
  const show = SHOWCASE[id];
  const color = TONE[show.highlight.tone];
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="grid scroll-mt-24 grid-cols-1 gap-x-14 gap-y-8 py-14 sm:py-20 lg:grid-cols-12 lg:py-24"
    >
      <div className={`lg:col-span-7 ${flip ? 'lg:order-first' : 'lg:order-last'}`}>
        <div className="lg:sticky lg:top-28">
          <Stage show={show} priority={first} aspect="aspect-[4/3]" />
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:col-span-5 lg:py-6">
        <Rise className="flex flex-col gap-5">
          <Meta id={id} show={show} />
          <Chip highlight={show.highlight} />
          <h3 id={`${id}-title`} className="font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[3.25rem]">
            {show.prefix && <span className="block text-[0.55em] leading-tight tracking-[-0.02em] text-ink-subtle">{show.prefix}</span>}
            {project.label}
          </h3>
          {show.standing && <p className="-mt-2 text-base font-medium text-accent">{show.standing}</p>}
          <p className="max-w-[46ch] text-[1.075rem] leading-relaxed text-ink-muted">{show.pitch}</p>
        </Rise>

        <Rise delay={0.05}>
          <Stats stats={show.stats} />
        </Rise>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-ink">How it works</h4>
          <Steps steps={show.steps} color={color} />
          {show.role && <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-ink-subtle">{show.role}</p>}
        </div>

        <Rise delay={0.05}>
          <Actions id={id} project={project} show={show} />
        </Rise>
      </div>
    </section>
  );
}

/* ── in progress: three cards ──────────────────────────────────────────── */

function ProgressCard({ id, i }) {
  const project = projectById(id);
  const show = SHOWCASE[id];
  return (
    <Rise as="article" id={id} delay={i * 0.08} aria-labelledby={`${id}-title`} className="flex scroll-mt-24 flex-col gap-6">
      <Stage show={show} aspect="aspect-[5/4]" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Meta id={id} show={show} />
        </div>
        <Chip highlight={show.highlight} />
        <h3 id={`${id}-title`} className="font-display text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink">
          {project.label}
        </h3>
        <p className="text-[0.975rem] leading-relaxed text-ink-muted">{show.pitch}</p>
      </div>
      <Stats stats={show.stats} size="md" />
      <HowItWorks steps={show.steps} color={TONE[show.highlight.tone]} />
      <div className="mt-auto pt-2">
        <Actions id={id} project={project} show={show} />
      </div>
    </Rise>
  );
}

/* ── earlier: rows ─────────────────────────────────────────────────────── */

function EarlierRow({ id, i }) {
  const project = projectById(id);
  const show = SHOWCASE[id];
  return (
    <Rise
      as="article"
      id={id}
      delay={i * 0.06}
      aria-labelledby={`${id}-title`}
      className="grid scroll-mt-24 grid-cols-1 gap-x-10 gap-y-4 border-t border-line py-8 last:border-b lg:grid-cols-12"
    >
      <div className="flex flex-col gap-3 lg:col-span-4">
        <h3 id={`${id}-title`} className="font-display text-[1.75rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
          {project.label}
        </h3>
        <span className="text-label text-ink-subtle">{show.context}</span>
      </div>
      <div className="flex flex-col gap-3 lg:col-span-5">
        <p className="text-[0.975rem] leading-relaxed text-ink-muted">{show.pitch}</p>
        <HowItWorks steps={show.steps} color={TONE[show.highlight.tone]} />
      </div>
      <div className="lg:col-span-3 lg:flex lg:justify-end">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 lg:flex-col lg:items-end">
          <Link
            href={`/projects/${id}`}
            className="group/btn inline-flex items-center gap-2 text-sm font-medium text-ink"
            aria-label={`Read the case study: ${project.label}`}
          >
            Case study
            <span aria-hidden className="transition-transform duration-200 group-hover/btn:translate-x-1">
              →
            </span>
          </Link>
          {show.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="text-sm text-ink-muted transition-colors hover:text-ink">
              {l.label} <span aria-hidden>↗</span>
            </a>
          ))}
        </div>
      </div>
    </Rise>
  );
}

function TierHead({ id, title, line }) {
  return (
    <Rise className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <h2 id={id} className="font-display text-[2.25rem] font-semibold leading-none tracking-[-0.04em] text-ink sm:text-[3rem]">{title}</h2>
      <p className="max-w-[44ch] text-[0.975rem] text-ink-muted sm:text-right">{line}</p>
    </Rise>
  );
}

/* ── the page ──────────────────────────────────────────────────────────── */

export default function ProjectIndex() {
  const [theme, toggleTheme] = useWorkTheme();
  const reduce = useReducedMotion();
  const jump = useJump();
  const current = useCurrent();
  useKeys(current, jump);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  const count = NUMBER_WORDS[ALL_IDS.length] || String(ALL_IDS.length);

  return (
    <div className="work-root mc-root min-h-[100dvh]">
      <header data-noprint className="sticky top-0 z-30 bg-[color-mix(in_srgb,var(--void)_86%,transparent)] backdrop-blur-xl">
        <div className={`${WRAP} flex h-16 items-center justify-between gap-3`}>
          <Link href="/projects" className="flex min-w-0 items-center gap-3 text-ink" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }}>
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-void">
              AV
            </span>
            <span className="truncate font-display text-base font-semibold tracking-tight">{PROFILE.name}</span>
            {/* the project you're on, once you're past the index */}
            <span className="hidden min-w-0 items-center gap-3 text-sm text-ink-subtle lg:flex">
              <span aria-hidden className="text-line-hi">/</span>
              <motion.span
                key={current || 'none'}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="truncate"
              >
                {current ? SHORT[current] : 'Projects'}
              </motion.span>
            </span>
          </Link>
          <nav aria-label="Contact" className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <span className="hidden items-center md:flex">
              <ResumeButton compact />
              <a href={`mailto:${PROFILE.links.email}`} className={LINK_QUIET}>
                Email
              </a>
              <a href={PROFILE.links.linkedin} target="_blank" rel="noreferrer" className={LINK_QUIET}>
                LinkedIn
              </a>
              <a href={PROFILE.links.github} target="_blank" rel="noreferrer" className={LINK_QUIET}>
                GitHub
              </a>
            </span>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <Link
              href="/"
              className="ml-1 inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium text-ink ring-1 ring-inset ring-line-hi transition-[background-color,box-shadow] hover:bg-surface-2 hover:ring-ink-subtle"
            >
              <span className="hidden sm:inline">Enter the portfolio</span>
              <span className="sm:hidden">Portfolio</span>
              <span aria-hidden className="text-ink-subtle">→</span>
            </Link>
          </nav>
        </div>
        {/* how far down the page you are */}
        <motion.div aria-hidden className="h-[2px] origin-left bg-accent" style={{ scaleX: reduce ? scrollYProgress : progress }} />
      </header>

      <main className={WRAP}>
        {/* ── opening ── */}
        <section aria-labelledby="page-title" className="relative isolate pb-10 pt-14 sm:pt-20 lg:pb-12">
          <NameField theme={theme} />
          <div className="mb-10 flex flex-col gap-6 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
            {/* the word itself is the visual: Tech Text rules the font's lines and
                fills the letters once, then a selection frame drifts across it,
                or follows the pointer; its role="img" label keeps "Projects" */}
            {/* the height lives on the h1: TechText fills its parent (its own CSS) */}
            {/* -ml-6: the canvas keeps 24px for the selection frame left of the word */}
            <h1 id="page-title" className="-ml-6 h-[clamp(6.5rem,19vw,14.5rem)] w-[calc(100%+1.5rem)] min-w-0 lg:flex-1">
              <TechText
                text="Projects"
                align="left"
                fontWeight={600}
                fontSize={176}
                letterSpacing={-0.055}
                accentColor="var(--accent)"
                intro="metrics"
                introDuration={2.2}
                sweep
                speed={0.55}
                specks={12}
                className="font-display text-ink"
              />
            </h1>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.1 }}
              className="max-w-[46ch] lg:pb-3 lg:text-right"
            >
              {/* the proof, in words: each linked phrase jumps to its project */}
              <p className="text-balance text-lg leading-snug text-ink-muted">
                {count} projects,{' '}
                {OPENING.map((part) =>
                  part.id ? (
                    <a
                      key={part.text}
                      href={`#${part.id}`}
                      onClick={(e) => jump(e, part.id)}
                      className="font-medium text-ink underline decoration-line-hi decoration-1 underline-offset-[5px] transition-[text-decoration-color] duration-200 hover:decoration-ink"
                    >
                      {part.text}
                    </a>
                  ) : (
                    <span key={part.text}>{part.text}</span>
                  ),
                )}
              </p>
              <p className="mt-2 text-sm text-ink-subtle">Written up from the code · Updated {PROFILE.updated}</p>
              <div className="mt-6">
                <ContactButtons />
              </div>
            </motion.div>
          </div>

          <FlowIndex onJump={jump} />
        </section>

        {/* ── featured ── */}
        <section aria-labelledby="featured-title">
          <h2 id="featured-title" className="sr-only">
            Featured projects
          </h2>
          {LAYOUT.featured.map((id, i) => (
            <Featured key={id} id={id} flip={i % 2 === 1} first={i === 0} />
          ))}
        </section>

        {/* ── in progress ── */}
        <section aria-labelledby="progress-title" className="py-20 sm:py-28">
          <TierHead id="progress-title" title="In progress" line="Built now, still moving: an iOS wake detector, a typing experiment and a live audio engine." />
          <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
            {LAYOUT.progress.map((id, i) => (
              <ProgressCard key={id} id={id} i={i} />
            ))}
          </div>
        </section>

        {/* ── earlier ── */}
        <section aria-labelledby="earlier-title" className="pb-28 sm:pb-36">
          <TierHead id="earlier-title" title="Earlier" line="Class work and quick prototypes from 2025, written up just as carefully." />
          <div className="mt-10">
            {LAYOUT.earlier.map((id, i) => (
              <EarlierRow key={id} id={id} i={i} />
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-surface">
        <div className={`${WRAP} flex flex-col gap-12 py-20 sm:py-24`}>
          <div className="flex flex-col gap-10">
            <div>
              <p className="font-display text-[clamp(2.75rem,7.4vw,6.75rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-ink">
                {PROFILE.name}
              </p>
              <p className="mt-4 text-[1rem] text-ink-muted">{PROFILE.short}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <CopyEmail />
              <a href={PROFILE.links.linkedin} target="_blank" rel="noreferrer" className={PILL_LINE}>
                LinkedIn <span aria-hidden className="text-ink-subtle">↗</span>
              </a>
              <a href={PROFILE.links.github} target="_blank" rel="noreferrer" className={PILL_LINE}>
                GitHub <span aria-hidden className="text-ink-subtle">↗</span>
              </a>
            </div>
          </div>
          <div data-noprint className="flex flex-col gap-4 border-t border-line pt-8 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
            <p>
              There’s a more playful version of this page: the same work, inside a walkable 3D world.{' '}
              <Link href="/" className="font-medium text-ink underline-offset-4 hover:underline">
                Enter the portfolio →
              </Link>
            </p>
            <p className="hidden lg:block">
              <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-label text-ink-muted">J</kbd>{' '}
              <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-label text-ink-muted">K</kbd> move between projects
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
