'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { chapters } from '@/data/timeline';
import { zoneById } from '@/data/world';
import ArchitectureDiagram from './ArchitectureDiagram';

const EASE = [0.22, 1, 0.36, 1];
const engineering = chapters.find((c) => c.index === 2);

// One accent colour per project.
const ACCENT = {
  iet: '#ff8a3d',
  overflow: '#5affa0',
  racing: '#ff9a5a',
  soundtech: '#6fb0ee',
  treeoflife: '#c9a0ff',
};
const accentFor = (id) => ACCENT[id] || '#ff8a3d';

/** Stats as a clean horizontal strip — just numbers, no gauges or bars. */
function StatStrip({ project }) {
  const stats = project.metrics
    ? project.metrics.map((m) => ({ value: m.display, label: m.label }))
    : [{ value: project.stat, label: project.statLabel }];
  return (
    <div className="flex flex-wrap items-end gap-x-10 gap-y-4 border-t border-white/[0.08] pt-6">
      {stats.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: EASE }}
        >
          <div className="font-display text-3xl font-bold leading-none text-[var(--text-primary)] sm:text-4xl">
            {s.value}
          </div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-dim)]">
            {s.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* The wall — every project as a backlit briefing screen. */
function Wall({ projects, onSelect }) {
  return (
    <motion.div
      key="wall"
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.5, transition: { duration: 0.5, ease: EASE } }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-8 sm:grid-cols-2 lg:grid-cols-3"
    >
      {projects.map((p, i) => {
        const accent = accentFor(p.id);
        return (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.6, ease: EASE }}
            onClick={() => onSelect(p.id)}
            className="group relative flex h-52 flex-col justify-end overflow-hidden rounded-xl border border-white/[0.08] p-5 text-left transition-all hover:border-white/20"
            style={{ background: 'linear-gradient(180deg, rgba(18,24,38,0.5), rgba(8,11,18,0.95))' }}
          >
            {/* backlit accent glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-40 transition-opacity group-hover:opacity-70"
              style={{ background: `radial-gradient(120% 80% at 80% 0%, ${accent}33, transparent 60%)` }}
            />
            <div
              className="pointer-events-none absolute left-0 top-0 h-full w-[3px]"
              style={{ background: accent, boxShadow: `0 0 16px ${accent}` }}
            />
            <div className="relative">
              {(p.signature || p.current) && (
                <span
                  className="mb-3 inline-block rounded-full border px-2.5 py-0.5 font-mono text-[9px] tracking-[0.2em]"
                  style={{ color: accent, borderColor: `${accent}66`, background: `${accent}14` }}
                >
                  {p.signature ? '★ SIGNATURE' : '● CURRENT'}
                </span>
              )}
              <div className="font-display text-xl font-bold leading-tight text-[var(--text-primary)]">
                {p.label}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(p.tech || p.tags || []).slice(0, 4).map((t) => (
                  <span key={t} className="font-mono text-[9px] tracking-wider text-[var(--text-dim)]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <span className="relative mt-3 font-mono text-[10px] tracking-[0.25em] text-[var(--text-dim)] transition-colors group-hover:text-[var(--gold)]">
              OPEN BRIEF ▸
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

/* The deep dive — story · architecture · stats, like a mission brief. */
function DeepDive({ project, onBack }) {
  const accent = accentFor(project.id);
  return (
    <motion.div
      key="deep"
      initial={{ opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.35 } }}
      className="mx-auto flex h-full w-full max-w-6xl flex-col px-8"
    >
      <button
        onClick={onBack}
        className="mb-5 w-fit font-mono text-[11px] tracking-[0.25em] text-[var(--text-dim)] transition-colors hover:text-[var(--gold)]"
      >
        ◂ BACK TO WALL
      </button>

      <div className="grid flex-1 grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Left — the brief */}
        <div className="flex flex-col">
          {(project.signature || project.current) && (
            <span
              className="mb-4 w-fit rounded-full border px-3 py-0.5 font-mono text-[10px] tracking-[0.2em]"
              style={{ color: accent, borderColor: `${accent}66`, background: `${accent}14` }}
            >
              {project.signature ? '★ SIGNATURE BUILD' : '● CURRENT ROLE'}
            </span>
          )}
          <h2 className="font-display text-3xl font-bold leading-[1.05] text-[var(--text-primary)] sm:text-4xl">
            {project.label}
          </h2>
          <div className="mt-3 font-mono text-[11px] leading-relaxed tracking-wider" style={{ color: accent }}>
            {[project.role, project.period].filter(Boolean).join('  ·  ')}
          </div>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[var(--text-secondary)]">
            {project.story}
          </p>
          {project.highlights && (
            <div className="mt-6 space-y-2.5">
              {project.highlights.map((h) => (
                <div key={h} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
                  {h}
                </div>
              ))}
            </div>
          )}
          {project.tech && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--text-dim)]">STACK</span>
              {project.tech.map((t) => (
                <span key={t} className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] tracking-wider text-[var(--text-secondary)]">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right — the architecture */}
        <div className="min-h-[320px]">
          <ArchitectureDiagram project={project} accent={accent} />
        </div>
      </div>

      <div className="mt-8">
        <StatStrip project={project} />
      </div>
    </motion.div>
  );
}

export default function MissionControl() {
  const enteredZone = useStore((s) => s.enteredZone);
  const setEnteredZone = useStore((s) => s.setEnteredZone);
  const [selected, setSelected] = useState(null);

  const open = !!enteredZone;
  const zone = enteredZone ? zoneById(enteredZone) : null;
  // Only the engineering district has content wired for now.
  const projects = engineering?.memories || [];
  const project = projects.find((p) => p.id === selected);

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
          className="fixed inset-0 z-40 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          style={{ background: 'radial-gradient(120% 90% at 50% -10%, #11131f 0%, #05060c 70%)' }}
        >
          {/* Faint operations-room screen grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(120,150,220,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(120,150,220,0.25) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
              maskImage: 'radial-gradient(80% 70% at 50% 40%, #000 30%, transparent 80%)',
            }}
          />

          {/* Header */}
          <div className="relative flex items-center justify-between px-8 py-6">
            <div className="font-mono text-[11px] tracking-[0.35em] text-[var(--steel-bright)]">
              MISSION CONTROL <span className="text-[var(--text-dim)]">// {zone?.label || 'DISTRICT'}</span>
            </div>
            <button
              onClick={() => setEnteredZone(null)}
              className="font-mono text-[11px] tracking-[0.25em] text-[var(--text-dim)] transition-colors hover:text-[var(--gold)]"
            >
              EXIT ✕ <span className="opacity-50">ESC</span>
            </button>
          </div>

          {/* Stage — wall ⇄ deep dive (camera push via scale) */}
          <div className="relative flex flex-1 items-center overflow-y-auto py-6" style={{ perspective: '1400px' }}>
            <AnimatePresence mode="wait">
              {!project ? (
                <Wall key="wall" projects={projects} onSelect={setSelected} />
              ) : (
                <DeepDive key="deep" project={project} onBack={() => setSelected(null)} />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
