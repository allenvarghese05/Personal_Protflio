'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { zoneById } from '@/data/world';
import { projectById } from '@/data/projects';
import { caseStudyFor } from '@/data/caseStudies';
import { ACCENTS, DUR, EASE_OUT, EASE_STD } from '@/lib/motion';
import { jumpTo, useSmoothScroll } from '@/lib/smoothScroll';
import CommsPanel from './stations/CommsPanel';
import ThemeToggle from './ThemeToggle';
import { keepWorldInHistory } from '@/components/audio/SiteAudio';
import { CASE_PAGES } from './case/pages';

// a CSS variable, so it follows the theme
const P_INK_FAINT = 'var(--ink-subtle)';
/** The stage: Mission Control's one scroll container (every room scrolls in it). */
const SCROLLER = '[data-mc-scroll]';

// The Observatory (the helmet scene) and the Studio (photos, sound) load when
// their room opens, so the world doesn't carry them in its first download.
const ObservatoryPanel = dynamic(() => import('./stations/ObservatoryPanel'), { loading: () => null });
/** The same module, fetched ahead of time (see the prefetch below). */
const prefetchObservatory = () => import('./stations/ObservatoryPanel').catch(() => {});
const StudioPanel = dynamic(() => import('./stations/StudioPanel'), { loading: () => null });
// The generic brief's parts. Every project has its own case-study page today,
// so these load only for a project added without one (d3 stays out otherwise).
const ArchitectureGraph = dynamic(() => import('./ArchitectureGraph'), { loading: () => null });
const BentoPanels = dynamic(() => import('./BentoPanels'), { loading: () => null });
const DeploymentStatusStrip = dynamic(() => import('./DeploymentStatusStrip'), { loading: () => null });

// Station rooms share the Mission Control shell (nav, backdrop, motion).
const STATION_ROOMS = { observatory: ObservatoryPanel, studio: StudioPanel, comms: CommsPanel };

/** A kind's accent as a dark-palette hex: BentoPanels and ArchitectureGraph
 *  map it to its light twin themselves (forTheme), and need a real colour. */
const accentFor = (kind) => ACCENTS[kind] || ACCENTS.project;
/** The same accent as a CSS variable, for this file's own parts, so it
 *  follows the theme (same values as ACCENTS in dark). */
const KIND_VAR = { signature: 'var(--accent)', award: 'var(--accent)', current: 'var(--ice)', project: 'var(--sand)', classified: 'var(--slate)' };
const toneFor = (kind) => KIND_VAR[kind] || KIND_VAR.project;

/* ───────────────────────────── TOP NAV BAR ────────────────────────────── */

function NavBar({ zone, project, onBack, onExit }) {
  const sep = <span className="text-ink-faint"> · </span>;
  return (
    <nav
      aria-label="Mission Control"
      className="relative flex h-14 shrink-0 items-center justify-between border-b border-line bg-void px-4 sm:px-6"
    >
      <button onClick={onBack} className="mc-ghost-btn uppercase">
        ← Back
      </button>

      {/* breadcrumb — hidden on narrow screens, where it can't fit */}
      <div className="absolute left-1/2 hidden -translate-x-1/2 whitespace-nowrap font-mono text-micro uppercase tracking-[0.14em] md:block">
        <span className="text-ink-subtle">Mission Control</span>
        {sep}
        <span className="text-ink-subtle">{zone?.label || 'Engineering District'}</span>
        {project && (
          <>
            {sep}
            <span className="text-accent">{project.label}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <button onClick={onExit} className="mc-ghost-btn h-9 uppercase leading-9">
          Exit <span className="ml-1 rounded-[3px] border border-line px-1.5 py-0.5 text-micro tracking-normal">ESC</span>
        </button>
      </div>
    </nav>
  );
}

/* ───────────────────────────── PROJECT BRIEF ──────────────────────────── */

function Badge({ accent, children, className = '' }) {
  return (
    <span
      className={`mc-chip mc-chip--accent w-fit font-medium uppercase tracking-[0.18em] ${className}`}
      style={{ '--chip': accent }}
    >
      {children}
    </span>
  );
}

function MetricStrip({ metrics, accent }) {
  if (!metrics?.length) return null;
  return (
    <div className="grid grid-cols-2 gap-y-6 sm:flex sm:flex-wrap sm:justify-center">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={`flex flex-col items-center px-6 sm:px-10 ${i > 0 ? 'sm:border-l sm:border-line' : ''}`}
        >
          <span className="font-display text-4xl font-bold leading-none tracking-tight" style={{ color: accent }}>
            {m.value}
          </span>
          <span className="mc-label mt-2 max-w-[16ch] text-center leading-snug tracking-[0.14em]">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

function BuildTimeline({ items, accent }) {
  if (!items?.length) return null;
  return (
    <div className="mt-10">
      <div className="mc-label mb-5">Build timeline</div>
      <ol>
        {items.map((it, i) => (
          <li key={it.week} className="flex gap-4">
            {/* dot + connector rail */}
            <div className="flex flex-col items-center pt-1">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={it.done ? { background: accent } : { background: 'var(--raised)', boxShadow: 'inset 0 0 0 1px var(--line-hi)' }}
              />
              {i < items.length - 1 && <span className="mt-1 min-h-4 w-0 flex-1 border-l border-dashed border-line-hi" />}
            </div>
            <div className={i < items.length - 1 ? 'pb-5' : ''}>
              <div className="font-mono text-micro font-semibold uppercase tracking-[0.12em] text-ink-subtle">{it.week}</div>
              <div className="mt-1 text-sm font-semibold text-ink">{it.title}</div>
              <div className="mt-1 text-sm leading-relaxed text-ink-muted">{it.desc}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StackChips({ primary, secondary, accent }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(primary || []).map((n) => (
        <span key={n} className="mc-chip mc-chip--accent" style={{ '--chip': accent }}>
          {n}
        </span>
      ))}
      {(secondary || []).map((n) => (
        <span key={n} className="mc-chip">
          {n}
        </span>
      ))}
    </div>
  );
}

/* The hero image slot — a device frame holding real screenshots when they
   exist, and a designed placeholder until then. Private client systems get
   an honest note instead of a fake UI. */
function MockShot({ project, study, accent }) {
  const media = study?.media || { frame: 'browser', shots: [] };
  const shot = media.shots?.[0];

  if (media.frame === 'private') {
    return (
      <div className="mock-private">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        <div>
          <div className="text-sm font-semibold text-ink">Private client system</div>
          <div className="text-label text-ink-muted">Screenshots aren’t shareable — the diagrams below show how it works.</div>
        </div>
      </div>
    );
  }

  const screen = shot ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={shot} alt={`${project.label} screenshot`} className="h-full w-full object-cover" />
  ) : (
    <div className="mock-screen" style={{ '--mock': accent }}>
      <div className="mock-screen__grid" />
      <div className="relative text-center">
        <div className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{project.label}</div>
        <div className="mt-2 font-mono text-micro uppercase tracking-[0.2em] text-ink-subtle">Screenshots coming soon</div>
      </div>
    </div>
  );

  if (media.frame === 'phone') {
    return (
      <div className="flex justify-center">
        <div className="mock-phone">
          <div className="mock-phone__notch" />
          <div className="mock-phone__screen">{screen}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="mock-browser">
      <div className="mock-browser__bar">
        <span className="mock-browser__dots"><i /><i /><i /></span>
        <span className="mock-browser__url">{media.url || project.label.toLowerCase()}</span>
      </div>
      <div className="mock-browser__screen">{screen}</div>
    </div>
  );
}

/* One labelled row of the case study: label rail on the left, content right */
function Section({ label, children }) {
  return (
    <section className="grid grid-cols-1 gap-3 border-t border-line py-10 lg:grid-cols-[200px_1fr] lg:gap-10">
      <div className="mc-label pt-1">{label}</div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Bullets({ items, accent }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((it) => (
        <li key={it} className="flex gap-3 text-body text-ink-muted">
          <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Decisions({ items, accent }) {
  return (
    <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {items.map((d, i) => (
        <li key={d.title} className="mc-panel flex flex-col">
          <span className="font-mono text-micro font-semibold" style={{ color: accent }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="font-display mt-2 text-base font-semibold leading-snug text-ink">{d.title}</span>
          <span className="mt-2 text-sm leading-relaxed text-ink-muted">{d.body}</span>
        </li>
      ))}
    </ol>
  );
}

function Brief({ project }) {
  const accentHex = accentFor(project.kind);
  const accent = toneFor(project.kind);
  const study = caseStudyFor(project.id);
  // every project with a case-study page renders it (see case/pages.js)
  const Page = CASE_PAGES[project.id];
  if (Page) return <Page project={project} study={study} />;
  const meta = [project.role, project.company, project.dateRange, project.location].filter(Boolean);
  return (
    <motion.article
      key="brief"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: DUR.briefFade, ease: EASE_STD } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="w-full"
    >
      {/* HEADER */}
      <header
        className="relative overflow-hidden px-6 pb-12 pt-12 text-center sm:px-16"
        style={{ background: `radial-gradient(70% 120% at 50% 0%, color-mix(in srgb, ${accent} 9%, transparent) 0%, transparent 70%)` }}
      >
        <Badge accent={accent} className="mb-5">
          {project.badge}
        </Badge>
        <h2 className="font-display mx-auto max-w-4xl text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-6xl">
          {project.label}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">{project.subtitle}</p>
        <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-x-2 font-mono text-label text-ink-subtle">
          {meta.map((seg, i) => (
            <span key={seg}>
              {seg}
              {i < meta.length - 1 && <span className="ml-2 text-ink-faint">·</span>}
            </span>
          ))}
        </div>
        {(study?.live || project.repo) && (
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {study?.live && (
              <a href={study.live} target="_blank" rel="noreferrer" className="hero-cta" style={{ height: '2.75rem' }}>
                {study.liveLabel || 'Visit live'} <span aria-hidden className="hero-cta__arrow">↗</span>
              </a>
            )}
            {project.repo && (
              <a href={project.repo} target="_blank" rel="noreferrer" className="skip-btn" style={{ paddingRight: '1rem' }}>
                View source <span aria-hidden>↗</span>
              </a>
            )}
          </div>
        )}
        {project.metrics?.length > 0 && (
          <div className="mt-12">
            <MetricStrip metrics={project.metrics} accent={accent} />
          </div>
        )}
      </header>

      {/* HERO IMAGE */}
      <div className="mx-auto max-w-5xl px-6 sm:px-12">
        <MockShot project={project} study={study} accent={accent} />
      </div>

      {/* THE CASE STUDY */}
      <div className="mx-auto mt-14 max-w-6xl px-6 sm:px-12">
        {study && (
          <>
            <Section label="The problem">
              <p className="font-display max-w-3xl text-2xl font-medium leading-snug tracking-[-0.015em] text-ink sm:text-[1.7rem]">
                {study.problem}
              </p>
            </Section>
            <Section label="What I built">
              <p className="max-w-3xl text-lg leading-relaxed text-ink-muted">{study.built}</p>
            </Section>
            <Section label="How it works">
              <div className="max-w-3xl">
                <Bullets items={study.how} accent={accent} />
              </div>
            </Section>
          </>
        )}
        {project.keyDecisions?.length > 0 && (
          <Section label="Key decisions">
            <Decisions items={project.keyDecisions} accent={accent} />
          </Section>
        )}
        {study?.next?.length > 0 && (
          <Section label="What’s next">
            <div className="max-w-3xl">
              <Bullets items={study.next} accent={P_INK_FAINT} />
            </div>
          </Section>
        )}
      </div>

      {/* UNDER THE HOOD */}
      <div className="mx-auto max-w-6xl px-6 pb-16 sm:px-12">
        <Section label="Under the hood">
          <BentoPanels project={project} accent={accentHex} />
          {project.deployment && (
            <div className="mt-6">
              <DeploymentStatusStrip deployment={project.deployment} />
            </div>
          )}
          <div className="mt-6">
            <div className="mc-label mb-3">System architecture · drag, zoom, click a node</div>
            <div className="h-[420px] overflow-hidden rounded-panel border border-line">
              {project.architectureGraph ? (
                <ArchitectureGraph
                  nodes={project.architectureGraph.nodes}
                  edges={project.architectureGraph.edges}
                  categoryColors={project.graphColors}
                  accent={accentHex}
                />
              ) : (
                <div className="mc-label flex h-full items-center justify-center">No diagram</div>
              )}
            </div>
          </div>
        </Section>
        <Section label="Stack">
          <StackChips primary={project.primaryStack} secondary={project.secondaryStack} accent={accent} />
          <BuildTimeline items={project.timeline} accent={accent} />
        </Section>
      </div>
    </motion.article>
  );
}

/* ──────────────────────────── MISSION CONTROL ─────────────────────────── */

/**
 * Each view the stage swaps in (a room, a case study) starts at its top,
 * or, coming Back, where you left it. Done after the new view commits and
 * before it paints, so the old one never flashes at the top.
 *
 * When a link or card replaced the view (the focused control went with it),
 * focus moves too: coming Back, to the control you used (data-return-key),
 * otherwise to the new view's title. A lazily loaded page renders a beat
 * later, so both are re-tried as it arrives, separately: the scroll stops at
 * the reader's first scroll of their own, focus once it has landed or the
 * reader has moved it themselves.
 */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

function Fresh({ children }) {
  // how this view arrives, read once as it mounts (in development React runs
  // effects twice, so the store's one-shot flags are copied here first)
  const [arrival] = useState(() => {
    const { restoreScroll, focusOnEnter, returnFocus } = useStore.getState();
    return { top: restoreScroll ?? 0, focus: focusOnEnter, key: returnFocus };
  });

  useLayoutEffect(() => {
    const el = document.querySelector(SCROLLER);
    if (!el) return undefined;
    useStore.setState({ restoreScroll: null, focusOnEnter: false, returnFocus: null });
    let scrolling = true;
    let focusing = arrival.focus;
    const finish = () => {
      if (scrolling || focusing) return;
      mo.disconnect();
      clearTimeout(timer);
      el.removeEventListener('wheel', stopScroll);
      el.removeEventListener('touchstart', stopScroll);
      el.removeEventListener('pointerdown', stopScroll);
      window.removeEventListener('keydown', onKey);
    };
    const stopScroll = () => {
      scrolling = false;
      finish();
    };
    const onKey = (e) => {
      if (SCROLL_KEYS.has(e.key)) stopScroll();
    };
    const place = () => {
      if (scrolling) {
        jumpTo(el, arrival.top);
        if (el.scrollTop >= arrival.top - 1) stopScroll();
      }
      if (!focusing) return;
      const active = document.activeElement;
      if (active && active !== document.body && el.contains(active)) {
        focusing = false; // the reader got there first
      } else {
        const target = (arrival.key && el.querySelector(`[data-return-key="${CSS.escape(arrival.key)}"]`)) || el.querySelector('h1, h2');
        if (!target) return;
        if (!target.matches('a, button, input, [tabindex]')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        focusing = false;
      }
      finish();
    };
    const mo = new MutationObserver(place);
    mo.observe(el, { childList: true, subtree: true });
    const timer = setTimeout(() => {
      scrolling = false;
      focusing = false;
      finish();
    }, 6000);
    el.addEventListener('wheel', stopScroll, { passive: true });
    el.addEventListener('touchstart', stopScroll, { passive: true });
    el.addEventListener('pointerdown', stopScroll);
    window.addEventListener('keydown', onKey);
    place();
    return () => {
      scrolling = false;
      focusing = false;
      finish();
    };
  }, [arrival]);

  return children;
}

export default function MissionControl() {
  const enteredZone = useStore((s) => s.enteredZone);
  const setEnteredZone = useStore((s) => s.setEnteredZone);
  const selected = useStore((s) => s.selectedProject);

  const open = !!enteredZone && !(enteredZone === 'engineering' && !selected);
  // the stage glides under a wheel (see lib/smoothScroll) while it's open
  const stageRef = useRef(null);
  useSmoothScroll(stageRef, open);
  const zone = enteredZone ? zoneById(enteredZone) : null;
  const Room = STATION_ROOMS[enteredZone];
  const project = selected ? projectById(selected) : null;
  const router = useRouter();

  // Every project lives on /projects; there's no project list in here. The
  // world is kept one step back in history (/?world=1), so the browser's
  // Back from /projects lands on the surface rather than replaying the intro.
  const toProjects = useCallback(() => {
    keepWorldInHistory();
    router.push('/projects');
  }, [router]);

  // Back: to the room a link came from (About), else from a case study to
  // /projects, else out of Mission Control
  const onBack = useCallback(() => {
    const st = useStore.getState();
    if (st.returnTo) {
      const { zone, scrollTop, key } = st.returnTo;
      useStore.setState({ enteredZone: zone, selectedProject: null, restoreScroll: scrollTop, focusOnEnter: true, returnFocus: key, returnTo: null });
    } else if (st.selectedProject) toProjects();
    else st.setEnteredZone(null);
  }, [toProjects]);

  // a link to the old project list (/?room=engineering) opens /projects
  const listOnly = enteredZone === 'engineering' && !selected;
  useEffect(() => {
    if (listOnly) toProjects();
  }, [listOnly, toProjects]);

  // the About room (the helmet and its portrait) is the heaviest room: fetch
  // its code a few seconds after the world is up, so it opens without a gap
  useEffect(() => {
    const t = setTimeout(prefetchObservatory, 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onBack]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Mission Control — ${zone?.label || 'Engineering'}`}
          className="mc-root fixed inset-0 z-40 flex flex-col bg-void"
          initial={{ y: '100%' }}
          animate={{ y: 0, transition: { duration: DUR.slideIn, ease: EASE_OUT } }}
          exit={{ y: '100%', transition: { duration: DUR.slideOut, ease: EASE_OUT } }}
        >
          {/* Dotted-grid backdrop */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: 0.6,
              backgroundImage: 'radial-gradient(color-mix(in srgb, var(--ink) 7%, transparent) 1px, transparent 1px)',
              backgroundSize: '26px 26px',
              maskImage: 'radial-gradient(90% 80% at 50% 35%, #000 30%, transparent 85%)',
            }}
          />

          <NavBar zone={zone} project={project} onBack={onBack} onExit={() => setEnteredZone(null)} />

          {/* Stage */}
          <div ref={stageRef} data-mc-scroll className="relative flex-1 overflow-y-auto overflow-x-clip">
            <AnimatePresence mode="wait">
              {Room ? (
                <Fresh key={enteredZone}>
                  <Room />
                </Fresh>
              ) : !project ? null : (
                <Fresh key="brief">
                  <Brief project={project} />
                </Fresh>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
