'use client';
import { motion } from 'framer-motion';

/**
 * Per-project system diagrams for the Mission Control deep-dive. These replace
 * decorative gauges/progress bars — the architecture IS the visual interest.
 * A senior engineer should read the diagram and immediately get what was built.
 *
 * `iet` (Church Building Application System) is the rich, bespoke one; every
 * other project gets a clean layered system diagram derived from its stack.
 */

const draw = (delay = 0) => ({
  hidden: { pathLength: 0, opacity: 0 },
  show: { pathLength: 1, opacity: 1, transition: { duration: 0.9, delay, ease: 'easeInOut' } },
});
const pop = (delay = 0) => ({
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, delay } },
});

function Frame({ children, label }) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-3 font-mono text-[10px] tracking-[0.35em] text-[var(--text-dim)]">
        {label}
      </div>
      <div className="relative flex-1 overflow-hidden rounded-xl border border-white/[0.07] bg-[#0a0d16]/70">
        {children}
      </div>
    </div>
  );
}

/* The signature build — Church Building Application System. */
function IETDiagram({ accent }) {
  const roles = ['PASTOR', 'DIVISION', 'HQ', 'PRESIDENT', 'FINANCE'];
  const phases = ['FOUNDATION', 'STRUCTURE', 'HANDOVER'];
  return (
    <Frame label="SYSTEM ARCHITECTURE">
      <motion.svg
        viewBox="0 0 520 480"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full p-3"
        initial="hidden"
        animate="show"
      >
        {/* 5-tier approval chain (vertical flow, fills the height) */}
        <text x="24" y="34" className="fill-[#8a8475] font-mono" fontSize="11" letterSpacing="3">
          5-TIER APPROVAL CHAIN
        </text>
        {roles.map((r, i) => {
          const y = 56 + i * 64;
          return (
            <g key={r}>
              {i < roles.length - 1 && (
                <motion.line
                  x1={120} y1={y + 38} x2={120} y2={y + 64}
                  stroke={accent} strokeWidth="2"
                  variants={draw(0.3 + i * 0.1)}
                  markerEnd="url(#arrow)"
                />
              )}
              <motion.rect
                x={40} y={y} width="160" height="38" rx="7"
                fill="#121826" stroke={accent} strokeWidth="1.4"
                variants={pop(0.2 + i * 0.1)}
              />
              <motion.text
                x={120} y={y + 24} textAnchor="middle"
                className="fill-[#e6c483] font-mono" fontSize="12" letterSpacing="2"
                variants={pop(0.25 + i * 0.1)}
              >
                {r}
              </motion.text>
              <motion.text x={214} y={y + 24} className="fill-[#5b6472] font-mono" fontSize="10" variants={pop(0.3 + i * 0.1)}>
                tier {i + 1}
              </motion.text>
            </g>
          );
        })}

        {/* GPS radius enforcement (right column, top) */}
        <text x="300" y="34" className="fill-[#8a8475] font-mono" fontSize="11" letterSpacing="3">
          GPS · 8KM BYLAW
        </text>
        <motion.circle cx="400" cy="130" r="74" fill="none" stroke={accent} strokeWidth="1.4" strokeDasharray="5 5" variants={draw(0.6)} />
        <motion.circle cx="400" cy="130" r="34" fill={`${accent}1f`} stroke={accent} strokeWidth="1" variants={pop(0.8)} />
        <motion.circle cx="400" cy="124" r="9" fill="none" stroke={accent} strokeWidth="2.4" variants={draw(1.0)} />
        <motion.line x1="400" y1="133" x2="400" y2="150" stroke={accent} strokeWidth="2.4" variants={draw(1.0)} />
        <motion.text x="400" y="226" textAnchor="middle" className="fill-[#5b6472] font-mono" fontSize="10" variants={pop(1.1)}>
          Haversine enforcement
        </motion.text>

        {/* 3-phase construction timeline (right column, bottom) */}
        <text x="300" y="290" className="fill-[#8a8475] font-mono" fontSize="11" letterSpacing="3">
          3-PHASE CONSTRUCTION
        </text>
        {phases.map((p, i) => {
          const y = 320 + i * 52;
          return (
            <g key={p}>
              {i < phases.length - 1 && (
                <motion.line x1="320" y1={y} x2="320" y2={y + 52} stroke={`${accent}66`} strokeWidth="2" variants={draw(0.7 + i * 0.12)} />
              )}
              <motion.circle cx="320" cy={y} r="7" fill={accent} variants={pop(0.8 + i * 0.12)} />
              <motion.text x="342" y={y + 5} className="fill-[#c9c2b2] font-mono" fontSize="12" letterSpacing="1.5" variants={pop(0.85 + i * 0.12)}>
                {p}
              </motion.text>
            </g>
          );
        })}

        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 z" fill={accent} />
          </marker>
        </defs>
      </motion.svg>
    </Frame>
  );
}

/* Generic layered system diagram for everything else, built from the stack. */
function StackDiagram({ project, accent }) {
  const tech = project.tech || project.tags || [];
  const layers = [
    { name: 'CLIENT', detail: tech.slice(0, 2).join(' · ') || 'Frontend' },
    { name: 'SERVICE', detail: tech.slice(2, 4).join(' · ') || 'Logic & APIs' },
    { name: 'DATA', detail: tech.slice(4).join(' · ') || 'Storage' },
  ];
  return (
    <Frame label="SYSTEM ARCHITECTURE">
      <motion.svg viewBox="0 0 560 360" className="h-full w-full" initial="hidden" animate="show">
        {layers.map((l, i) => {
          const y = 50 + i * 95;
          return (
            <g key={l.name}>
              {i < layers.length - 1 && (
                <motion.line x1="280" y1={y + 60} x2="280" y2={y + 95} stroke={accent} strokeWidth="2" markerEnd="url(#arrow2)" variants={draw(0.4 + i * 0.2)} />
              )}
              <motion.rect x="120" y={y} width="320" height="60" rx="8" fill="#121826" stroke={accent} strokeWidth="1.4" variants={pop(0.2 + i * 0.18)} />
              <motion.text x="280" y={y + 26} textAnchor="middle" className="fill-[#e6c483] font-mono" fontSize="13" letterSpacing="3" variants={pop(0.25 + i * 0.18)}>
                {l.name}
              </motion.text>
              <motion.text x="280" y={y + 46} textAnchor="middle" className="fill-[#8a8475] font-mono" fontSize="10" variants={pop(0.3 + i * 0.18)}>
                {l.detail}
              </motion.text>
            </g>
          );
        })}
        <defs>
          <marker id="arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 z" fill={accent} />
          </marker>
        </defs>
      </motion.svg>
    </Frame>
  );
}

export default function ArchitectureDiagram({ project, accent = '#ff8a3d' }) {
  if (project.id === 'iet') return <IETDiagram accent={accent} />;
  return <StackDiagram project={project} accent={accent} />;
}
