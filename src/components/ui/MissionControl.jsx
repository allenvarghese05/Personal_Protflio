'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { zoneById } from '@/data/world';
import { ENGINEERING_PROJECTS, projectById } from '@/data/projects';
import { ACCENTS, DUR, EASE_OUT, EASE_STD } from '@/lib/motion';
import ArchitectureGraph from './ArchitectureGraph';
import BentoPanels from './BentoPanels';
import DeploymentStatusStrip from './DeploymentStatusStrip';

const accentFor = (kind) => ACCENTS[kind] || ACCENTS.project;
const badgeWord = (kind) =>
  ({ signature: 'SIGNATURE', current: 'CURRENT', project: 'PROJECT', classified: 'CLASSIFIED' }[kind] || 'PROJECT');
const railGradient = (kind) => `linear-gradient(90deg, ${accentFor(kind)} 0%, transparent 70%)`;

/* ───────────────────────────── TOP NAV BAR ────────────────────────────── */

function NavBar({ zone, project, onBack, onExit }) {
  const segSep = <span style={{ color: '#1c2535' }}> · </span>;
  return (
    <div
      className="relative flex shrink-0 items-center"
      style={{ height: '48px', background: '#040609', borderBottom: '0.5px solid #151c28' }}
    >
      {/* LEFT — back */}
      <button
        onClick={onBack}
        className="absolute left-6 font-mono transition-colors"
        style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#304050' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#6080a0')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#304050')}
      >
        ← BACK
      </button>

      {/* CENTER — absolutely-centered breadcrumb */}
      <div
        className="absolute font-mono whitespace-nowrap"
        style={{ left: '50%', transform: 'translateX(-50%)', fontSize: '11px', letterSpacing: '0.14em' }}
      >
        <span style={{ color: '#304050' }}>MISSION CONTROL</span>
        {segSep}
        <span style={{ color: '#304050' }}>{(zone?.label || 'ENGINEERING DISTRICT').toUpperCase()}</span>
        {project && (
          <>
            {segSep}
            <span style={{ color: '#e8a040' }}>{project.label}</span>
          </>
        )}
      </div>

      {/* RIGHT — exit */}
      <button
        onClick={onExit}
        className="absolute right-6 font-mono transition-colors"
        style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#304050' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#6080a0')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#304050')}
      >
        EXIT × ESC
      </button>
    </div>
  );
}

/* ───────────────────────────── PROJECT WALL ───────────────────────────── */

const wallContainer = { hidden: {}, show: { transition: { staggerChildren: DUR.cardStagger } } };
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
      className={`group relative flex flex-col text-left transition-colors duration-200 ${
        locked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-[#0d1218]'
      }`}
      style={{ background: '#090c12', padding: '24px' }}
    >
      {/* 3px gradient top accent */}
      <span className="pointer-events-none absolute inset-x-0 top-0" style={{ height: '3px', background: railGradient(project.kind) }} />

      {/* Badge */}
      <span
        className="w-fit rounded-[3px] uppercase"
        style={{ fontSize: '8px', fontWeight: 500, letterSpacing: '0.2em', color: accent, border: `0.5px solid ${accent}40`, background: `${accent}14`, padding: '4px 8px' }}
      >
        {badgeWord(project.kind)}
      </span>

      {/* Name */}
      <div
        className={locked ? 'select-none blur-[5px]' : ''}
        style={{ marginTop: '16px', fontSize: '18px', fontWeight: 700, color: '#c8d4e0', lineHeight: 1.3 }}
      >
        {project.label}
      </div>

      {/* Subtitle */}
      <div
        className="line-clamp-2"
        style={{ marginTop: '8px', fontSize: '12px', color: '#4a6070', lineHeight: 1.6 }}
      >
        {project.subtitle}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap" style={{ marginTop: '16px', gap: '6px' }}>
        {(project.tags || project.secondaryStack || []).slice(0, 5).map((t) => (
          <span
            key={t}
            className="rounded-[3px]"
            style={{ fontSize: '9px', fontWeight: 500, color: '#304050', background: '#0c1018', border: '0.5px solid #1a2530', padding: '4px 8px' }}
          >
            {t}
          </span>
        ))}
      </div>

      {/* CTA */}
      <span
        className={`font-mono uppercase transition-colors duration-200 ${locked ? '' : 'group-hover:text-[#e8a040]'}`}
        style={{ marginTop: '20px', fontSize: '10px', letterSpacing: '0.14em', color: '#304050' }}
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
      className="w-full"
      style={{ maxWidth: '1200px' }}
    >
      <motion.div
        variants={wallContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        style={{ gap: '1px', background: '#111820', border: '1px solid #111820' }}
      >
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onSelect={onSelect} />
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── PROJECT BRIEF ──────────────────────────── */

function MetricStrip({ metrics }) {
  if (!metrics?.length) return null;
  return (
    <div className="flex flex-wrap justify-center">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className="flex flex-col items-center"
          style={{ padding: '0 40px', borderLeft: i > 0 ? '1px solid #151c28' : 'none' }}
        >
          <span style={{ fontSize: '32px', fontWeight: 800, color: '#e8a040', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {m.value}
          </span>
          <span className="uppercase text-center" style={{ marginTop: '6px', fontSize: '8px', fontWeight: 500, letterSpacing: '0.16em', color: '#304050', lineHeight: 1.4 }}>
            {m.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function BuildTimeline({ items }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginTop: '32px' }}>
      <div className="font-mono uppercase" style={{ fontSize: '9px', letterSpacing: '0.2em', color: '#3a5060', marginBottom: '20px' }}>
        Build Timeline
      </div>
      <div>
        {items.map((it, i) => (
          <div key={it.week} className="flex" style={{ gap: '16px' }}>
            {/* dot + connector rail */}
            <div className="flex flex-col items-center" style={{ paddingTop: '2px' }}>
              <span
                className="shrink-0 rounded-full"
                style={{ width: '8px', height: '8px', background: it.done ? '#e8a040' : '#1a2535' }}
              />
              {i < items.length - 1 && (
                <span style={{ flex: 1, width: 0, borderLeft: '1px dashed #1a2535', marginTop: '3px', minHeight: '16px' }} />
              )}
            </div>
            {/* content */}
            <div style={{ paddingBottom: i < items.length - 1 ? '16px' : '0' }}>
              <div className="font-mono uppercase" style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', color: '#3a5060', marginBottom: '4px' }}>
                {it.week}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#8aa0b8', marginBottom: '4px' }}>{it.title}</div>
              <div style={{ fontSize: '11px', color: '#3a5060', lineHeight: 1.6 }}>{it.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MicroLabel({ children, mb = 12 }) {
  return (
    <div className="uppercase" style={{ marginBottom: `${mb}px`, fontSize: '8px', fontWeight: 500, letterSpacing: '0.2em', color: '#304050' }}>
      {children}
    </div>
  );
}

function StackChips({ primary, secondary, accent = '#e8a040' }) {
  const chip = (name, isPrimary) => (
    <span
      key={name}
      className="rounded-[3px] font-mono"
      style={
        isPrimary
          ? { fontSize: '9px', padding: '5px 10px', color: accent, background: `${accent}14`, border: `0.5px solid ${accent}33` }
          : { fontSize: '9px', padding: '5px 10px', color: '#4a6070', background: '#0a0e14', border: '0.5px solid #1a2530' }
      }
    >
      {name}
    </span>
  );
  return (
    <div className="flex flex-wrap" style={{ gap: '6px' }}>
      {(primary || []).map((n) => chip(n, true))}
      {(secondary || []).map((n) => chip(n, false))}
    </div>
  );
}

function Brief({ project }) {
  const accent = accentFor(project.kind);
  return (
    <motion.div
      key="brief"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: DUR.briefFade, ease: EASE_STD } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="w-full"
    >
      {/* HEADER */}
      <div className="text-center" style={{ padding: '48px 64px 40px 64px', borderBottom: '0.5px solid #151c28', background: '#06080c' }}>
        <span
          className="inline-block uppercase"
          style={{ fontSize: '9px', letterSpacing: '0.2em', color: accent, background: `${accent}14`, border: `0.5px solid ${accent}40`, padding: '5px 14px', borderRadius: '3px', marginBottom: '20px' }}
        >
          {project.badge}
        </span>
        <h2 style={{ fontSize: '44px', fontWeight: 800, color: '#dde6f0', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '16px' }}>
          {project.label}
        </h2>
        <div className="flex flex-wrap justify-center font-mono" style={{ fontSize: '11px', letterSpacing: '0.06em', color: '#4a6070', marginBottom: '32px', gap: '0' }}>
          {[project.role, project.company, project.dateRange, project.location].filter(Boolean).map((seg, i, arr) => (
            <span key={seg}>
              {seg}
              {i < arr.length - 1 && <span style={{ color: '#1c2535' }}> · </span>}
            </span>
          ))}
        </div>
        <MetricStrip metrics={project.metrics} />
      </div>

      {/* BODY — two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[38fr_62fr]">
        {/* LEFT */}
        <div className="min-w-0" style={{ padding: '40px 32px 40px 48px' }}>
          <MicroLabel mb={12}>Context</MicroLabel>
          <p style={{ fontSize: '13px', color: '#4a6070', lineHeight: 1.8, marginBottom: '32px' }}>
            {project.description}
          </p>

          <MicroLabel mb={10}>Stack</MicroLabel>
          <div>
            <StackChips primary={project.primaryStack} secondary={project.secondaryStack} accent={accent} />
          </div>
          {/* Key Decisions now live in the architecture bento (Panel 4). */}
          <BuildTimeline items={project.timeline} />
        </div>

        {/* RIGHT */}
        <div className="min-w-0" style={{ padding: '32px 40px 32px 32px', borderLeft: '0.5px solid #111820' }}>
          <BentoPanels project={project} accent={accent} />

          {project.deployment && (
            <div style={{ marginTop: '32px' }}>
              <DeploymentStatusStrip deployment={project.deployment} />
            </div>
          )}

          <div style={{ marginTop: '32px' }}>
            <MicroLabel mb={12}>System Architecture</MicroLabel>
            <div style={{ height: '360px', borderRadius: '6px', border: '0.5px solid #151c28', overflow: 'hidden' }}>
              {project.architectureGraph ? (
                <ArchitectureGraph nodes={project.architectureGraph.nodes} edges={project.architectureGraph.edges} categoryColors={project.graphColors} accent={accent} />
              ) : (
                <div className="flex h-full items-center justify-center font-mono" style={{ fontSize: '11px', color: '#304050' }}>
                  NO DIAGRAM
                </div>
              )}
            </div>
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

  const onBack = () => (selected ? setSelected(null) : setEnteredZone(null));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="mc-root fixed inset-0 z-40 flex flex-col"
          style={{ background: '#06080c' }}
          initial={{ y: '100%' }}
          animate={{ y: 0, transition: { duration: DUR.slideIn, ease: EASE_OUT } }}
          exit={{ y: '100%', transition: { duration: DUR.slideOut, ease: EASE_OUT } }}
        >
          {/* Dotted-grid backdrop */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: 0.5,
              backgroundImage: 'radial-gradient(rgba(120,150,220,0.10) 1px, transparent 1px)',
              backgroundSize: '26px 26px',
              maskImage: 'radial-gradient(90% 80% at 50% 35%, #000 30%, transparent 85%)',
            }}
          />

          <NavBar zone={zone} project={project} onBack={onBack} onExit={() => setEnteredZone(null)} />

          {/* Stage */}
          <div className="relative flex-1 overflow-y-auto">
            <AnimatePresence mode="wait" initial={false}>
              {!project ? (
                <div key="wall" className="flex min-h-full items-center justify-center" style={{ padding: '48px' }}>
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
