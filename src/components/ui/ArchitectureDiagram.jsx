'use client';
import { motion } from 'framer-motion';

/**
 * The four bento panels that make up every project's deep-dive. Each renders a
 * self-contained card (border + title + visual), so Mission Control just drops
 * them into a 2×2 grid:
 *
 *   ┌── FlowPanel ───────┬── ConstraintPanel ─┐   flow/chain  ·  hard constraint
 *   ├── TechStackPanel ──┴── KeyDecisionsPanel ┘   stack (ranked) · the decisions
 *
 * The architecture IS the visual interest — no decorative gauges. A senior
 * engineer should read these and immediately get what was built and why.
 */

const pop = (delay = 0) => ({
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, delay } },
});
const draw = (delay = 0) => ({
  hidden: { pathLength: 0, opacity: 0 },
  show: { pathLength: 1, opacity: 1, transition: { duration: 0.8, delay, ease: 'easeInOut' } },
});

/* Shared bento card chrome. */
function Card({ title, accent = '#ff8a3d', children, className = '' }) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border border-white/[0.07] bg-[#0a0d16]/70 px-5 py-4 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-x-3 top-0 h-px opacity-50"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="mb-3 truncate font-mono text-[10px] tracking-[0.25em] text-[var(--text-dim)]">
        {title}
      </div>
      <div className="relative flex-1">{children}</div>
    </div>
  );
}

/* ───────────────────────── FLOW / CHAIN (top-left) ───────────────────────── */

function IETFlow({ accent }) {
  const roles = ['PASTOR', 'DIVISION', 'HQ', 'PRESIDENT', 'FINANCE'];
  return (
    <Card title="5-TIER APPROVAL CHAIN" accent={accent}>
      <div className="flex h-full flex-col justify-center gap-1.5">
        {roles.map((r, i) => (
          <motion.div
            key={r}
            initial="hidden"
            animate="show"
            variants={pop(0.1 + i * 0.08)}
            className="relative flex items-center justify-between rounded-lg border px-3 py-2"
            style={{ borderColor: `${accent}40`, background: `${accent}0d` }}
          >
            <span
              className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <span className="font-mono text-[12px] tracking-[0.18em] text-[#e6c483]">{r}</span>
            <span className="font-mono text-[9px] tracking-wider text-[var(--text-dim)]">
              tier {i + 1}
            </span>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

function GenericFlow({ project, accent }) {
  const tech = project.tech || project.tags || [];
  const layers = [
    { name: 'CLIENT', detail: tech.slice(0, 2).join(' · ') || 'Frontend' },
    { name: 'SERVICE', detail: tech.slice(2, 4).join(' · ') || 'Logic & APIs' },
    { name: 'DATA', detail: tech.slice(4).join(' · ') || 'Storage' },
  ];
  return (
    <Card title="SYSTEM FLOW" accent={accent}>
      <div className="flex h-full flex-col justify-center gap-2.5">
        {layers.map((l, i) => (
          <motion.div
            key={l.name}
            initial="hidden"
            animate="show"
            variants={pop(0.1 + i * 0.1)}
          >
            <div
              className="rounded-lg border px-3 py-2"
              style={{ borderColor: `${accent}40`, background: `${accent}0d` }}
            >
              <div className="font-mono text-[12px] tracking-[0.2em] text-[#e6c483]">{l.name}</div>
              <div className="mt-0.5 font-mono text-[9px] text-[var(--text-dim)]">{l.detail}</div>
            </div>
            {i < layers.length - 1 && (
              <div className="ml-4 my-0.5 text-[10px]" style={{ color: `${accent}99` }}>↓</div>
            )}
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

export function FlowPanel({ project, accent }) {
  if (project.id === 'iet') return <IETFlow accent={accent} />;
  return <GenericFlow project={project} accent={accent} />;
}

/* ──────────────────── ENFORCEMENT / CONSTRAINT (top-right) ─────────────────── */

function IETConstraint({ accent }) {
  const phases = ['FOUNDATION', 'STRUCTURE', 'HANDOVER'];
  return (
    <Card title="GPS · 8KM BYLAW ENFORCEMENT" accent={accent}>
      <div className="flex h-full flex-col">
        {/* Radius visual */}
        <div className="flex items-center justify-center py-1">
          <motion.svg viewBox="0 0 160 120" className="h-[112px] w-full" initial="hidden" animate="show">
            <motion.circle cx="80" cy="56" r="48" fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="4 5" variants={draw(0.2)} />
            <motion.circle cx="80" cy="56" r="22" fill={`${accent}1f`} stroke={accent} strokeWidth="1" variants={pop(0.5)} />
            <motion.circle cx="80" cy="56" r="4" fill={accent} variants={pop(0.7)} />
            <motion.text x="80" y="112" textAnchor="middle" className="fill-[#5b6472] font-mono" fontSize="9" letterSpacing="2" variants={pop(0.8)}>
              HAVERSINE · 8KM RADIUS
            </motion.text>
          </motion.svg>
        </div>
        {/* 3-phase construction */}
        <div className="mt-1 border-t border-white/[0.06] pt-3">
          <div className="mb-2 font-mono text-[9px] tracking-[0.28em] text-[var(--text-dim)]">
            3-PHASE CONSTRUCTION
          </div>
          <div className="flex flex-col gap-1.5">
            {phases.map((p, i) => (
              <motion.div key={p} initial="hidden" animate="show" variants={pop(0.4 + i * 0.12)} className="flex items-center gap-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
                <span className="font-mono text-[11px] tracking-[0.12em] text-[#c9c2b2]">{p}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function GenericConstraint({ project, accent }) {
  const points = project.highlights || project.tags || [];
  return (
    <Card title="WHAT IT TOOK" accent={accent}>
      <div className="flex h-full flex-col justify-center gap-2.5">
        {points.slice(0, 4).map((h, i) => (
          <motion.div
            key={h}
            initial="hidden"
            animate="show"
            variants={pop(0.1 + i * 0.1)}
            className="flex items-center gap-3 text-[13px] text-[var(--text-secondary)]"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
            {h}
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

export function ConstraintPanel({ project, accent }) {
  if (project.id === 'iet') return <IETConstraint accent={accent} />;
  return <GenericConstraint project={project} accent={accent} />;
}

/* ───────────────────────── TECH STACK (bottom-left) ───────────────────────── */

export function TechStackPanel({ project, accent }) {
  // Hierarchy: amber chips mattered most, grey chips are supporting cast.
  const chips =
    project.techStack ||
    (project.tech || project.tags || []).map((name, i) => ({ name, primary: i < 3 }));
  return (
    <Card title="TECH STACK" accent={accent}>
      <div className="flex h-full flex-wrap content-center gap-2">
        {chips.map((c, i) => (
          <motion.span
            key={c.name}
            initial="hidden"
            animate="show"
            variants={pop(0.06 * i)}
            className="rounded-md border px-2.5 py-1 font-mono text-[11px] tracking-wider"
            style={
              c.primary
                ? { color: '#ffe7c2', borderColor: `${accent}99`, background: `${accent}1f` }
                : { color: 'var(--text-dim)', borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }
            }
          >
            {c.name}
          </motion.span>
        ))}
      </div>
    </Card>
  );
}

/* ───────────────────────── KEY DECISIONS (bottom-right) ─────────────────────── */

export function KeyDecisionsPanel({ project, accent }) {
  const decisions = project.keyDecisions || [];
  return (
    <Card title="KEY DECISIONS" accent={accent}>
      <div className="flex h-full flex-col justify-center gap-3.5">
        {decisions.map((d, i) => (
          <motion.div key={d.title} initial="hidden" animate="show" variants={pop(0.12 + i * 0.12)}>
            <div className="font-mono text-[12px] font-semibold tracking-wide" style={{ color: accent }}>
              {d.title}
            </div>
            <div className="mt-1 text-[12.5px] leading-snug text-[var(--text-secondary)]">
              {d.detail}
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

/* Backwards-compatible default — the full 2×2 architecture grid in one block. */
export default function ArchitectureDiagram({ project, accent = '#ff8a3d' }) {
  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-4">
      <FlowPanel project={project} accent={accent} />
      <ConstraintPanel project={project} accent={accent} />
      <TechStackPanel project={project} accent={accent} />
      <KeyDecisionsPanel project={project} accent={accent} />
    </div>
  );
}
