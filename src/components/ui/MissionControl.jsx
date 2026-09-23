'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { zoneById } from '@/data/world';
import { ENGINEERING_PROJECTS, projectById } from '@/data/projects';
import { ACCENTS, DUR, EASE_OUT, EASE_STD } from '@/lib/motion';
import ArchitectureGraph from './ArchitectureGraph';
import BentoPanels from './BentoPanels';
import DeploymentStatusStrip from './DeploymentStatusStrip';

const accentFor = (kind) => ACCENTS[kind] || ACCENTS.project;
const badgeWord = (p) =>
  p.cardBadge || { signature: 'SIGNATURE', current: 'CURRENT', award: 'AWARD', project: 'PROJECT' }[p.kind] || 'PROJECT';
const railGradient = (accent) => `linear-gradient(90deg, ${accent} 0%, transparent 70%)`;

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

      <button onClick={onExit} className="mc-ghost-btn uppercase">
        Exit <span className="ml-1 rounded-[3px] border border-line px-1.5 py-0.5 text-[10px] tracking-normal">ESC</span>
      </button>
    </nav>
  );
}

/* ───────────────────────────── PROJECT WALL ───────────────────────────── */

const wallContainer = { hidden: {}, show: { transition: { staggerChildren: DUR.cardStagger } } };
const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.cardFade, ease: EASE_STD } },
};

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

function ProjectCard({ project, onSelect }) {
  const accent = accentFor(project.kind);
  return (
    <motion.button
      variants={cardVariant}
      onClick={() => onSelect(project.id)}
      aria-label={`Open brief: ${project.label}`}
      className="mc-card group relative flex cursor-pointer flex-col p-6 text-left"
      style={{ '--card-accent': accent }}
    >
      {/* accent rail */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: railGradient(accent) }} />

      <Badge accent={accent}>{badgeWord(project)}</Badge>

      <div className="font-display mt-4 text-xl font-semibold leading-snug text-ink">{project.label}</div>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">{project.subtitle}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(project.tags || project.secondaryStack || []).slice(0, 5).map((t) => (
          <span key={t} className="mc-chip">
            {t}
          </span>
        ))}
      </div>

      <span className="mt-auto pt-6 font-mono text-micro uppercase tracking-[0.14em] text-ink-subtle transition-colors duration-200 group-hover:text-[var(--card-accent)]">
        Open brief →
      </span>
    </motion.button>
  );
}

function Wall({ projects, onSelect }) {
  return (
    <motion.div
      key="wall"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="w-full max-w-[1200px]"
    >
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="mc-label">Engineering District</div>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Selected work</h1>
        </div>
        <div className="mc-label hidden sm:block">{String(projects.length).padStart(2, '0')} projects</div>
      </div>

      <motion.div
        variants={wallContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-3"
      >
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onSelect={onSelect} />
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── PROJECT BRIEF ──────────────────────────── */

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

function Brief({ project }) {
  const accent = accentFor(project.kind);
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
        className="relative overflow-hidden border-b border-line px-6 pb-10 pt-12 text-center sm:px-16"
        style={{ background: `radial-gradient(70% 120% at 50% 0%, color-mix(in srgb, ${accent} 9%, transparent) 0%, transparent 70%), var(--void)` }}
      >
        <Badge accent={accent} className="mb-5">
          {project.badge}
        </Badge>
        <h2 className="font-display mx-auto max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl">
          {project.label}
        </h2>
        <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-x-2 font-mono text-label text-ink-muted">
          {meta.map((seg, i) => (
            <span key={seg}>
              {seg}
              {i < meta.length - 1 && <span className="ml-2 text-ink-faint">·</span>}
            </span>
          ))}
        </div>
        {project.repo && (
          <a
            href={project.repo}
            target="_blank"
            rel="noreferrer"
            className="hero-link mt-4 inline-block font-mono text-micro uppercase tracking-[0.16em] text-ink-muted"
          >
            View source on GitHub ↗
          </a>
        )}
        <div className="mb-10" />
        <MetricStrip metrics={project.metrics} accent={accent} />
      </header>

      {/* BODY — two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[38fr_62fr]">
        {/* LEFT */}
        <div className="min-w-0 px-6 py-10 sm:px-12">
          <div className="mc-label mb-3">Context</div>
          <p className="mb-10 text-body text-ink-muted">{project.description}</p>

          <div className="mc-label mb-3">Stack</div>
          <StackChips primary={project.primaryStack} secondary={project.secondaryStack} accent={accent} />

          {/* Key Decisions live in the architecture bento (Panel 4). */}
          <BuildTimeline items={project.timeline} accent={accent} />
        </div>

        {/* RIGHT */}
        <div className="min-w-0 border-line px-6 py-8 sm:px-10 lg:border-l">
          <BentoPanels project={project} accent={accent} />

          {project.deployment && (
            <div className="mt-8">
              <DeploymentStatusStrip deployment={project.deployment} />
            </div>
          )}

          <div className="mt-8">
            <div className="mc-label mb-3">System architecture</div>
            <div className="h-[380px] overflow-hidden rounded-panel border border-line">
              {project.architectureGraph ? (
                <ArchitectureGraph
                  nodes={project.architectureGraph.nodes}
                  edges={project.architectureGraph.edges}
                  categoryColors={project.graphColors}
                  accent={accent}
                />
              ) : (
                <div className="mc-label flex h-full items-center justify-center">No diagram</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/* ──────────────────────────── MISSION CONTROL ─────────────────────────── */

export default function MissionControl() {
  const enteredZone = useStore((s) => s.enteredZone);
  const setEnteredZone = useStore((s) => s.setEnteredZone);
  const selected = useStore((s) => s.selectedProject);
  const setSelected = useStore((s) => s.setSelectedProject);

  const open = !!enteredZone;
  const zone = enteredZone ? zoneById(enteredZone) : null;
  const projects = ENGINEERING_PROJECTS;
  const project = selected ? projectById(selected) : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (selected) setSelected(null);
      else setEnteredZone(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, selected, setSelected, setEnteredZone]);

  const onBack = () => (selected ? setSelected(null) : setEnteredZone(null));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Mission Control — engineering projects"
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
          <div className="relative flex-1 overflow-y-auto">
            <AnimatePresence mode="wait" initial={false}>
              {!project ? (
                <div key="wall" className="flex min-h-full items-center justify-center p-6 sm:p-12">
                  <Wall projects={projects} onSelect={setSelected} />
                </div>
              ) : (
                <Brief key="brief" project={project} />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
