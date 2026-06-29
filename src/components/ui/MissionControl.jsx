'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { zoneById } from '@/data/world';
import { ENGINEERING_PROJECTS, projectById } from '@/data/projects';
import { ACCENTS, DUR, EASE_OUT, EASE_STD } from '@/lib/motion';
import ArchitectureGraph from './ArchitectureGraph';

const accentFor = (kind) => ACCENTS[kind] || ACCENTS.project;
const badgeWord = (kind) =>
  ({ signature: 'SIGNATURE', current: 'CURRENT', project: 'PROJECT', classified: 'CLASSIFIED' }[kind] || 'PROJECT');

/* ───────────────────────────── PROJECT WALL ───────────────────────────── */

const wallContainer = {
  hidden: {},
  show: { transition: { staggerChildren: DUR.cardStagger } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.cardFade, ease: EASE_STD } },
};

function ProjectCard({ project, onSelect }) {
  const accent = accentFor(project.kind);
  const locked = project.locked;
  return (
    <motion.button
      variants={cardVariant}
      onClick={() => !locked && onSelect(project.id)}
      className={`group relative flex flex-col gap-3 bg-[#090c12] px-5 py-5 text-left transition-colors ${
        locked ? 'cursor-not-allowed' : 'hover:bg-[#0c1018]'
      }`}
    >
      {/* 2px gradient top border */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
      <span
        className="w-fit rounded-md border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em]"
        style={{ color: accent, borderColor: `${accent}66`, background: `${accent}14` }}
      >
        {badgeWord(project.kind)}
      </span>
      <div
        className={`font-mono text-[14px] font-bold leading-snug text-[#c8d4e0] ${locked ? 'select-none blur-[5px]' : ''}`}
      >
        {project.label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(project.tags || []).map((t) => (
          <span
            key={t}
            className="rounded border border-[#1c2535] px-1.5 py-0.5 font-mono text-[8px] tracking-wider text-[#304050]"
          >
            {t}
          </span>
        ))}
      </div>
      <span
        className={`mt-1 font-mono text-[9px] tracking-[0.22em] ${
          locked ? 'text-[#2a3340]' : 'text-[#46566a] transition-colors group-hover:text-[#e8a040]'
        }`}
      >
        {locked ? 'LOCKED ◍' : 'OPEN BRIEF →'}
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
      className="mx-auto w-full max-w-6xl px-6"
    >
      <motion.div
        variants={wallContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-px bg-[#151c28] sm:grid-cols-2 lg:grid-cols-3"
      >
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onSelect={onSelect} />
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ──────────────────────────── PROJECT BRIEF ───────────────────────────── */

function MetricStrip({ metrics }) {
  if (!metrics?.length) return null;
  return (
    <div className="mx-auto mt-7 flex w-fit items-start">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={`flex w-[120px] flex-col items-center px-3 ${i > 0 ? 'border-l border-white/10' : ''}`}
        >
          <div className="font-mono text-[28px] font-extrabold leading-none text-[#e8a040]">
            {m.value}
          </div>
          <div className="mt-2 text-center font-mono text-[8px] uppercase leading-tight tracking-[0.16em] text-[#5a6b7a]">
            {m.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function TechChips({ stack, accent }) {
  if (!stack?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {stack.map((c) => (
        <span
          key={c.name}
          className="rounded-md border px-2 py-1 font-mono text-[10px] tracking-wider"
          style={
            c.primary
              ? { color: '#ffe7c2', borderColor: `${accent}99`, background: `${accent}1f` }
              : { color: '#5a6b7a', borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }
          }
        >
          {c.name}
        </span>
      ))}
    </div>
  );
}

function DecisionList({ decisions, accent }) {
  if (!decisions?.length) return null;
  return (
    <div>
      {decisions.map((d, i) => (
        <div
          key={d.title}
          className={`py-3 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
        >
          <div className="font-mono text-[12px] font-semibold tracking-wide" style={{ color: accent }}>
            {d.title}
          </div>
          <div className="mt-1 text-[12px] leading-snug text-[#5a6b7a]">{d.detail}</div>
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="mb-3 font-mono text-[7px] uppercase tracking-[0.32em] text-[#46566a]">
      {children}
    </div>
  );
}

function Brief({ project }) {
  const accent = accentFor(project.kind);
  return (
    <motion.div
      key="brief"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: DUR.briefFade, ease: EASE_STD } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="mx-auto flex w-full max-w-6xl flex-col px-6"
    >
      {/* Hero header */}
      <div className="flex flex-col items-center text-center">
        <span
          className="rounded-full border px-3 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em]"
          style={{ color: accent, borderColor: `${accent}66`, background: `${accent}14` }}
        >
          {project.badge}
        </span>
        <h2
          className="mt-4 max-w-3xl font-display text-[36px] font-extrabold leading-[1.05] text-[#dde6f0] sm:text-[40px]"
          style={{ letterSpacing: '-0.02em' }}
        >
          {project.label}
        </h2>
        <div className="mt-3 font-mono text-[10px] tracking-wider text-[#5a6b7a]">
          {[project.role, project.company, project.period, project.location].filter(Boolean).join('  ·  ')}
        </div>
        <MetricStrip metrics={project.metrics} />
      </div>

      {/* Two-column body */}
      <div className="mt-9 grid grid-cols-1 gap-7 lg:grid-cols-[38fr_62fr]">
        {/* LEFT */}
        <div className="flex flex-col">
          <SectionLabel>Context</SectionLabel>
          <p className="text-[12px] leading-[1.75] text-[#4a6070]">{project.context}</p>

          <div className="mt-6">
            <SectionLabel>Stack</SectionLabel>
            <TechChips stack={project.techStack} accent={accent} />
          </div>

          <div className="mt-6">
            <SectionLabel>Key Decisions</SectionLabel>
            <DecisionList decisions={project.keyDecisions} accent={accent} />
          </div>
        </div>

        {/* RIGHT — signature force graph */}
        <div className="flex min-h-[480px] flex-col">
          <SectionLabel>System Architecture</SectionLabel>
          <div className="flex-1 rounded-lg border border-white/[0.07]">
            {project.architectureGraph ? (
              <ArchitectureGraph
                nodes={project.architectureGraph.nodes}
                edges={project.architectureGraph.edges}
              />
            ) : (
              <div className="flex h-full items-center justify-center font-mono text-[11px] text-[#46566a]">
                NO DIAGRAM
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────── MISSION CONTROL ─────────────────────────── */

export default function MissionControl() {
  const enteredZone = useStore((s) => s.enteredZone);
  const setEnteredZone = useStore((s) => s.setEnteredZone);
  const [selected, setSelected] = useState(null);

  const open = !!enteredZone;
  const zone = enteredZone ? zoneById(enteredZone) : null;
  const projects = ENGINEERING_PROJECTS;
  const project = selected ? projectById(selected) : null;

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (selected) setSelected(null);
      else setEnteredZone(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, selected, setEnteredZone]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex flex-col bg-[#06080c]"
          initial={{ y: '100%' }}
          animate={{ y: 0, transition: { duration: DUR.slideIn, ease: EASE_OUT } }}
          exit={{ y: '100%', transition: { duration: DUR.slideOut, ease: EASE_OUT } }}
        >
          {/* Dotted-grid backdrop */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage: 'radial-gradient(rgba(120,150,220,0.10) 1px, transparent 1px)',
              backgroundSize: '26px 26px',
              maskImage: 'radial-gradient(90% 80% at 50% 35%, #000 30%, transparent 85%)',
            }}
          />

          {/* Top bar — breadcrumb + project count + exit */}
          <div className="relative flex items-center justify-between px-7 py-5">
            <div className="flex items-center gap-5">
              {project && (
                <button
                  onClick={() => setSelected(null)}
                  className="font-mono text-[11px] tracking-[0.2em] text-[#46566a] transition-colors hover:text-[#e8a040]"
                >
                  ← BACK
                </button>
              )}
              <div className="font-mono text-[11px] tracking-[0.28em] text-[#7a8a9a]">
                MISSION CONTROL{' '}
                <span className="text-[#46566a]">// {zone?.label || 'ENGINEERING DISTRICT'}</span>
                {project && (
                  <span className="text-[#46566a]">
                    {' // '}
                    <span style={{ color: accentFor(project.kind) }}>{project.label}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-5">
              {!project && (
                <span className="font-mono text-[11px] tracking-[0.2em] text-[#46566a]">
                  {projects.length} PROJECTS
                </span>
              )}
              <button
                onClick={() => setEnteredZone(null)}
                className="font-mono text-[11px] tracking-[0.2em] text-[#46566a] transition-colors hover:text-[#e8a040]"
              >
                EXIT ✕ <span className="opacity-50">ESC</span>
              </button>
            </div>
          </div>

          {/* Stage */}
          <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-2 py-6">
            <AnimatePresence mode="wait" initial={false}>
              {!project ? (
                <Wall key="wall" projects={projects} onSelect={setSelected} />
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
