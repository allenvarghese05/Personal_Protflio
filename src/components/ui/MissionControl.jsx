'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { chapters } from '@/data/timeline';
import { zoneById } from '@/data/world';
import {
  FlowPanel,
  ConstraintPanel,
  TechStackPanel,
  KeyDecisionsPanel,
} from './ArchitectureDiagram';

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

/** Stats as a compact 2×2 grid of bold numbers — no gauges, no bars. */
function StatGrid({ project, accent }) {
  const stats = project.metrics
    ? project.metrics.map((m) => ({ value: m.display, label: m.label }))
    : (project.highlights || []).map((h) => ({ value: '', label: h }));
  if (!stats.length) return null;
  return (
    <div className="mt-7 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-white/[0.08] pt-6">
      {stats.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.07, duration: 0.5, ease: EASE }}
        >
          {s.value && (
            <div className="font-display text-3xl font-bold leading-none text-[var(--text-primary)] sm:text-[2.4rem]">
              {s.value}
            </div>
          )}
          <div className="mt-1.5 font-mono text-[10px] uppercase leading-snug tracking-[0.18em] text-[var(--text-dim)]">
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-8 sm:grid-cols-2 lg:grid-cols-3"
    >
      {projects.map((p, i) => {
        const accent = accentFor(p.id);
        const badge = p.signature ? 'SIGNATURE' : p.current ? 'CURRENT' : 'PROJECT';
        return (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + i * 0.06, duration: 0.55, ease: EASE }}
            onClick={() => onSelect(p.id)}
            className="group relative flex h-56 flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] p-5 text-left transition-colors hover:border-white/20"
            style={{ background: 'linear-gradient(180deg, rgba(18,24,38,0.55), rgba(8,11,18,0.96))' }}
          >
            {/* top accent rail */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
              style={{ background: accent, boxShadow: `0 0 14px ${accent}` }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-30 transition-opacity group-hover:opacity-60"
              style={{ background: `radial-gradient(120% 80% at 85% 0%, ${accent}2e, transparent 60%)` }}
            />
            <div className="relative">
              <span
                className="inline-block rounded-md border px-2 py-0.5 font-mono text-[9px] tracking-[0.22em]"
                style={{ color: accent, borderColor: `${accent}55`, background: `${accent}12` }}
              >
                {badge}
              </span>
              <div className="mt-3 font-display text-xl font-bold leading-tight text-[var(--text-primary)]">
                {p.label}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(p.tech || p.tags || []).slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-[var(--text-dim)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <span className="relative font-mono text-[10px] tracking-[0.25em] text-[var(--text-dim)] transition-colors group-hover:text-[var(--gold)]">
              OPEN BRIEF →
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

/* The deep dive — brief column on the left, 2×2 architecture bento on the right. */
function DeepDive({ project, onBack }) {
  const accent = accentFor(project.id);
  return (
    <motion.div
      key="deep"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE } }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.25 } }}
      className="mx-auto flex w-full max-w-6xl flex-col px-8"
    >
      <div className="grid flex-1 grid-cols-1 gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left — the brief */}
        <div className="flex flex-col">
          <span
            className="mb-4 w-fit rounded-md border px-3 py-0.5 font-mono text-[10px] tracking-[0.2em]"
            style={{ color: accent, borderColor: `${accent}55`, background: `${accent}12` }}
          >
            {project.eyebrow ||
              (project.signature ? 'SIGNATURE BUILD' : project.current ? 'CURRENT ROLE' : 'PROJECT')}
          </span>
          <h2 className="font-display text-3xl font-bold leading-[1.05] text-[var(--text-primary)] sm:text-4xl">
            {project.label}
          </h2>
          <div className="mt-3 font-mono text-[11px] leading-relaxed tracking-wider" style={{ color: accent }}>
            {project.role}
          </div>
          {project.period && (
            <div className="mt-1 font-mono text-[10px] tracking-wider text-[var(--text-dim)]">
              {project.period}
            </div>
          )}
          <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-[var(--text-secondary)]">
            {project.story}
          </p>
          {(project.tech || project.tags) && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {(project.tech || project.tags).map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] tracking-wider text-[var(--text-secondary)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <StatGrid project={project} accent={accent} />
        </div>

        {/* Right — the architecture bento */}
        <div className="grid min-h-[440px] grid-cols-1 gap-4 sm:grid-cols-2">
          <FlowPanel project={project} accent={accent} />
          <ConstraintPanel project={project} accent={accent} />
          <TechStackPanel project={project} accent={accent} />
          <KeyDecisionsPanel project={project} accent={accent} />
        </div>
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

          {/* Header — breadcrumb + back/exit */}
          <div className="relative flex items-center justify-between px-8 py-6">
            <div className="flex items-center gap-5">
              {project && (
                <button
                  onClick={() => setSelected(null)}
                  className="font-mono text-[11px] tracking-[0.2em] text-[var(--text-dim)] transition-colors hover:text-[var(--gold)]"
                >
                  ← BACK TO WALL
                </button>
              )}
              <div className="font-mono text-[11px] tracking-[0.32em] text-[var(--steel-bright)]">
                MISSION CONTROL{' '}
                <span className="text-[var(--text-dim)]">// {zone?.label || 'DISTRICT'}</span>
                {project && (
                  <span className="text-[var(--text-dim)]">
                    {' '}
                    // <span style={{ color: accentFor(project.id) }}>{project.label}</span>
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setEnteredZone(null)}
              className="font-mono text-[11px] tracking-[0.25em] text-[var(--text-dim)] transition-colors hover:text-[var(--gold)]"
            >
              EXIT ✕ <span className="opacity-50">ESC</span>
            </button>
          </div>

          {/* Stage — wall ⇄ deep dive */}
          <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto py-6">
            <AnimatePresence mode="wait" initial={false}>
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
