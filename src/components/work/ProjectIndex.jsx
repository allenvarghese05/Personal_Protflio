'use client';
/**
 * /projects: every project on one page, for someone who arrived from a résumé
 * link and wants the work without the game.
 *
 *   header     name, theme toggle, a way into the 3D portfolio
 *   hero       who, what, the résumé/contact actions, and the highlights
 *   work       "Things I've built": jump links that follow the scroll, then
 *              one card per project (a feature, pairs, the earlier work)
 *   footer     contact again, and the playful version
 *
 * Cards link to /projects/<id>, the standalone case study. Card content comes
 * from src/data/showcase.js; covers from ./covers.jsx; light/dark from
 * ./theme.jsx (dark is the default, light swaps the same tokens).
 */
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { projectById } from '@/data/projects';
import { HIGHLIGHTS, LAYOUT, PROFILE, SHORT, SHOWCASE } from '@/data/showcase';
import { EASE_OUT } from '@/lib/motion';
import { Cover } from './covers';
import { ThemeToggle, useWorkTheme } from './theme';

const TONE = {
  award: 'var(--accent)',
  built: 'var(--jade)',
  progress: 'var(--sand)',
  side: 'var(--slate)',
};
const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const ALL_IDS = [LAYOUT.feature, ...LAYOUT.pairs, ...LAYOUT.earlier];
const MARK_IMAGE = { aircast: '/work/aircast-nominee.webp', 'bis-report-card': '/work/bis-crest.webp' };

const WRAP = 'mx-auto w-full max-w-[1200px] px-5 sm:px-8';
const PILL =
  'group/btn inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98]';
const PILL_SOLID = `${PILL} bg-ink pl-5 pr-1.5 text-void hover:bg-accent`;
const PILL_LINE = `${PILL} px-5 text-ink ring-1 ring-inset ring-line-hi hover:bg-surface-2 hover:ring-ink-subtle`;

/* ── small parts ───────────────────────────────────────────────────────── */

function Reveal({ children, className = '', delay = 0, as = 'div', ...rest }) {
  const reduce = useReducedMotion();
  const M = motion[as];
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay }}
      {...rest}
    >
      {children}
    </M>
  );
}

/** The arrow in its own circle, flush inside a solid pill. */
function ArrowDot({ diagonal = false }) {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--void)_14%,transparent)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-x-0.5 group-hover/btn:scale-105"
    >
      {diagonal ? '↗' : '→'}
    </span>
  );
}

function Mark({ id, show, size = 40 }) {
  const image = MARK_IMAGE[id];
  return (
    <span
      aria-hidden
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-display text-sm font-semibold text-ink ring-1 ring-inset ring-line"
      style={{ width: size, height: size }}
    >
      {image ? <Image src={image} alt="" fill sizes={`${size}px`} className="object-cover" /> : show?.mark}
    </span>
  );
}

function Highlight({ highlight }) {
  const color = TONE[highlight.tone] || TONE.side;
  return (
    <span
      className="inline-flex h-7 w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-label font-medium"
      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {highlight.text}
    </span>
  );
}

function ResumeButton({ className = '' }) {
  const { href, label } = PROFILE.resume;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={`${PILL_SOLID} ${className}`}>
        {label}
        <ArrowDot diagonal />
      </a>
    );
  }
  // template until the PDF exists (see PROFILE.resume in src/data/showcase.js)
  return (
    <span
      aria-disabled="true"
      title="Résumé coming soon"
      className={`inline-flex h-11 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-full border border-dashed border-line-hi px-5 text-sm font-medium text-ink-muted ${className}`}
    >
      {label}
      <span className="text-label">coming soon</span>
    </span>
  );
}

/* ── the card ──────────────────────────────────────────────────────────── */

function Stats({ stats, compact }) {
  return (
    <dl className={`grid gap-x-5 gap-y-4 ${compact ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col">
          <dt className="order-last mt-2 text-label leading-snug text-ink-subtle">{s.label}</dt>
          <dd className="font-display text-[1.75rem] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums sm:text-[2rem]">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Card({ id, size, priority }) {
  const project = projectById(id);
  const show = SHOWCASE[id];
  if (!project || !show) return null;
  const color = TONE[show.highlight.tone] || TONE.side;
  const feature = size === 'feature';
  const compact = size === 'compact';
  const href = `/projects/${id}`;

  const head = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Mark id={id} show={show} />
          <span className="truncate text-label text-ink-subtle">{show.context}</span>
        </div>
        <Highlight highlight={show.highlight} />
      </div>
      <div>
        <h3
          className={`font-display font-semibold leading-[1.08] tracking-[-0.03em] text-ink ${
            feature ? 'text-3xl sm:text-[2.6rem]' : compact ? 'text-xl sm:text-[1.4rem]' : 'text-2xl sm:text-[1.85rem]'
          }`}
        >
          <Link href={href} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
            {show.prefix && <span className="block text-ink-subtle">{show.prefix}</span>}
            {project.label}
          </Link>
        </h3>
        {show.standing && <p className="mt-2 text-sm font-medium text-accent">{show.standing}</p>}
        <p className={`mt-3 max-w-[60ch] leading-relaxed text-ink-muted ${compact ? 'text-sm' : 'text-[1rem]'}`}>{show.pitch}</p>
      </div>
    </div>
  );

  // links sit above the card-wide link (relative z-10) so each stays its own target
  const actions = (
    <div className="relative z-10 flex flex-wrap items-center gap-x-5 gap-y-3">
      <Link href={href} className={PILL_SOLID} aria-label={`Read the case study: ${project.label}`}>
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

  const cover = (
    <div className="relative z-10">
      <Cover
        id={id}
        show={{ ...show, name: project.label }}
        color={color}
        priority={priority}
        aspect={feature ? 'aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[400px]' : 'aspect-[16/10]'}
      />
    </div>
  );

  return (
    <Reveal
      as="article"
      id={id}
      data-project={id}
      className={`group/card relative flex h-full scroll-mt-36 flex-col rounded-[24px] bg-surface p-5 ring-1 ring-inset ring-line transition-[box-shadow,background-color] duration-300 hover:ring-line-hi sm:p-7 ${
        feature ? 'lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-10' : ''
      }`}
    >
      {feature ? (
        <>
          {head}
          <div className="mt-6 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-0">{cover}</div>
          <div className="mt-7 lg:col-start-1 lg:mt-8">
            <Stats stats={show.stats} />
          </div>
          <div className="mt-auto pt-8 lg:col-start-1 lg:mt-0 lg:self-end">{actions}</div>
        </>
      ) : (
        <>
          {head}
          <div className="mt-6">{cover}</div>
          <div className="mt-7">
            <Stats stats={compact ? show.stats.slice(0, 2) : show.stats} compact={compact} />
          </div>
          <div className="mt-auto pt-8">{actions}</div>
        </>
      )}
    </Reveal>
  );
}

/* ── jump links that follow the scroll ─────────────────────────────────── */

function JumpLinks() {
  const [active, setActive] = useState(null);
  const rowRef = useRef(null);

  useEffect(() => {
    const cards = ALL_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    if (!cards.length) return undefined;
    // a card is "current" while it crosses a band a little above the middle
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
        // above the first card (back up in the hero): nothing is current
        else if (cards[0].getBoundingClientRect().top > window.innerHeight * 0.45) setActive(null);
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  // keep the current chip in view inside the row (never scrolls the page)
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const chip = active && row.querySelector(`[data-chip="${active}"]`);
    const left = chip ? chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2 : 0;
    row.scrollTo({ left, behavior: 'smooth' });
  }, [active]);

  return (
    <nav aria-label="Jump to a project" className="sticky top-16 z-20 -mx-5 bg-[color-mix(in_srgb,var(--void)_88%,transparent)] px-5 backdrop-blur-xl sm:mx-0 sm:px-0">
      <div
        ref={rowRef}
        className="relative flex gap-1.5 overflow-x-auto py-3 [mask-image:linear-gradient(90deg,transparent,#000_16px,#000_calc(100%-16px),transparent)] [scrollbar-width:none] xl:[mask-image:none]"
      >
        {ALL_IDS.map((id) => {
          const on = id === active;
          return (
            <a
              key={id}
              href={`#${id}`}
              data-chip={id}
              aria-current={on ? 'true' : undefined}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-3 text-[13px] transition-[background-color,color,box-shadow] duration-200 ${
                on ? 'bg-ink text-void' : 'text-ink-muted ring-1 ring-inset ring-line hover:text-ink hover:ring-line-hi'
              }`}
            >
              <Mark id={id} show={SHOWCASE[id]} size={22} />
              {SHORT[id]}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

/* ── the grid ──────────────────────────────────────────────────────────── */

function Cards() {
  return (
    <div className="flex flex-col gap-6">
      <Card id={LAYOUT.feature} size="feature" priority />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {LAYOUT.pairs.map((id, i) => (
          <Card key={id} id={id} size="pair" priority={i < 2} />
        ))}
      </div>
      <Reveal className="mt-16 sm:mt-20">
        <h3 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-[1.75rem]">Earlier projects</h3>
        <p className="mt-2 max-w-[60ch] text-[1rem] text-ink-muted">Class work and quick prototypes from 2025, written up just as carefully.</p>
      </Reveal>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {LAYOUT.earlier.map((id) => (
          <Card key={id} id={id} size="compact" />
        ))}
      </div>
    </div>
  );
}

/* ── hero ──────────────────────────────────────────────────────────────── */

function HighlightsCard() {
  return (
    <div className="rounded-[28px] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] p-1.5 ring-1 ring-inset ring-line">
      <div className="overflow-hidden rounded-[22px] bg-surface shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ink)_5%,transparent)]">
        <p className="px-6 pb-2 pt-5 text-sm font-semibold text-ink">Highlights</p>
        <ul>
          {HIGHLIGHTS.map((h) => (
            <li key={h.id} className="border-t border-line first:border-t-0">
              <a href={`#${h.id}`} className="group/hl flex items-center gap-4 px-6 py-4 transition-colors duration-200 hover:bg-surface-2">
                <Mark id={h.id} show={SHOWCASE[h.id]} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-semibold text-ink">{h.title}</span>
                  <span className="block truncate text-label text-ink-subtle">{h.meta}</span>
                  <span className={`mt-0.5 block text-label font-medium tabular-nums sm:hidden ${h.award ? 'text-accent' : 'text-ink-muted'}`}>{h.note}</span>
                </span>
                <span className={`hidden shrink-0 text-right text-label font-medium tabular-nums sm:block ${h.award ? 'text-accent' : 'text-ink-muted'}`}>{h.note}</span>
                <span aria-hidden className="hidden text-ink-subtle transition-transform duration-200 group-hover/hl:translate-y-0.5 sm:inline">
                  ↓
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  const rise = (i) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE_OUT, delay: 0.05 + i * 0.07 },
  });
  const [lead, rest] = PROFILE.lede.split('. ');
  return (
    <section aria-labelledby="hero-title" className="grid grid-cols-1 items-center gap-12 pb-24 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:pb-32">
      <div>
        <motion.h1
          id="hero-title"
          {...rise(0)}
          className="font-display text-[3.1rem] font-semibold leading-[0.98] tracking-[-0.045em] text-ink sm:text-7xl lg:text-[5.25rem]"
        >
          {PROFILE.name}
        </motion.h1>
        <motion.p {...rise(1)} className="mt-6 max-w-[30ch] text-xl leading-snug text-ink-subtle sm:text-2xl">
          {lead}. <span className="text-ink">{rest}</span>
        </motion.p>
        <motion.p {...rise(2)} className="mt-4 text-sm text-ink-subtle">
          {PROFILE.line}
        </motion.p>
        <motion.div {...rise(3)} className="mt-9 flex flex-wrap gap-3">
          <ResumeButton />
          <a href={`mailto:${PROFILE.links.email}`} className={PILL_LINE}>
            Email me
          </a>
          <a href={PROFILE.links.linkedin} target="_blank" rel="noreferrer" className={PILL_LINE}>
            LinkedIn <span aria-hidden className="text-ink-subtle">↗</span>
          </a>
          <a href={PROFILE.links.github} target="_blank" rel="noreferrer" className={PILL_LINE}>
            GitHub <span aria-hidden className="text-ink-subtle">↗</span>
          </a>
        </motion.div>
      </div>
      <motion.div {...rise(4)}>
        <HighlightsCard />
      </motion.div>
    </section>
  );
}

/* ── the page ──────────────────────────────────────────────────────────── */

export default function ProjectIndex() {
  const [theme, toggleTheme] = useWorkTheme();
  const count = NUMBER_WORDS[ALL_IDS.length] || String(ALL_IDS.length);

  return (
    <div className="work-root mc-root min-h-[100dvh]">
      <header className="sticky top-0 z-30 bg-[color-mix(in_srgb,var(--void)_88%,transparent)] backdrop-blur-xl">
        <div className={`${WRAP} flex h-16 items-center justify-between gap-3`}>
          <Link href="/projects" className="flex min-w-0 items-center gap-3 font-display text-base font-semibold tracking-tight text-ink">
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-void">
              AV
            </span>
            <span className="truncate">{PROFILE.name}</span>
          </Link>
          <nav aria-label="Site" className="flex shrink-0 items-center gap-1 sm:gap-2">
            <a href="#work" className="hidden h-9 items-center rounded-full px-3 text-sm text-ink-muted transition-colors hover:text-ink md:inline-flex">
              Projects
            </a>
            <a href={`mailto:${PROFILE.links.email}`} className="hidden h-9 items-center rounded-full px-3 text-sm text-ink-muted transition-colors hover:text-ink md:inline-flex">
              Contact
            </a>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium text-ink ring-1 ring-inset ring-line-hi transition-[background-color,box-shadow] hover:bg-surface-2 hover:ring-ink-subtle"
            >
              <span className="hidden sm:inline">Enter the portfolio</span>
              <span className="sm:hidden">Portfolio</span>
              <span aria-hidden className="text-ink-subtle">→</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className={WRAP}>
        <Hero />

        <section id="work" aria-labelledby="work-title" className="scroll-mt-20 pb-28">
          <Reveal className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="work-title" className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-ink sm:text-[3.5rem]">
              Things I’ve built.
            </h2>
            <p className="max-w-[42ch] text-[1rem] text-ink-muted sm:text-right">
              {count} projects, each written up from its own code. Open one for the full case study.
            </p>
          </Reveal>
          <JumpLinks />
          <div className="mt-6">
            <Cards />
          </div>
        </section>
      </main>

      <footer className="bg-surface">
        <div className={`${WRAP} flex flex-col gap-10 py-16 sm:py-20 lg:flex-row lg:items-end lg:justify-between`}>
          <div>
            <p className="font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-5xl">{PROFILE.name}</p>
            <p className="mt-4 max-w-[48ch] text-[1rem] text-ink-muted">
              There’s a more playful version of this page too: the same work, inside a walkable 3D world.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={`mailto:${PROFILE.links.email}`} className={PILL_SOLID}>
              Email me
              <ArrowDot />
            </a>
            <Link href="/" className={PILL_LINE}>
              Enter the portfolio <span aria-hidden className="text-ink-subtle">→</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
