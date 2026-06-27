'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { chapters } from '@/data/timeline';

const EASE = [0.22, 1, 0.36, 1];
// Carry each fragment's chapter index so the card can show the right ghost number.
const allMemories = chapters.flatMap((c) =>
  (c.memories || []).map((m) => ({ ...m, chapterIndex: c.index }))
);

/** Concentric arcs that draw themselves in — the "graph" moment. */
function ArcGauge({ value = 0.7 }) {
  const radii = [58, 44, 30];
  const colors = ['#ff8a3d', '#f5b544', '#6fb0ee'];
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36 sm:h-40 sm:w-40">
      {radii.map((r, i) => {
        const c = 2 * Math.PI * r;
        const frac = Math.max(0.08, value * (1 - i * 0.18));
        return (
          <g key={i} transform="rotate(-90 70 70)">
            <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <motion.circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={colors[i]}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: c * (1 - frac) }}
              transition={{ duration: 1.1, delay: 0.35 + i * 0.12, ease: EASE }}
              style={{ filter: 'drop-shadow(0 0 6px rgba(255,138,61,0.5))' }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function MetricBars({ metrics }) {
  // Many metrics (e.g. the IET build) lay out 2-up so the card never scrolls.
  const grid = metrics.length > 3;
  return (
    <div className={grid ? 'grid grid-cols-2 gap-x-6 gap-y-4' : 'space-y-4'}>
      {metrics.map((m, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between font-mono text-[11px] tracking-wider">
            <span className="text-[var(--text-dim)]">{m.label.toUpperCase()}</span>
            <span className="text-sm font-semibold text-[var(--gold)]">{m.display}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg,#4a90d9,#f5b544,#ff8a3d)' }}
              initial={{ width: 0 }}
              animate={{ width: `${m.v * 100}%` }}
              transition={{ duration: 0.95, delay: 0.4 + i * 0.12, ease: EASE }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Tech-stack chips — monospace, distinct from the soft topic tags. */
function TechStack({ tech }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.42 }}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--text-dim)]">
        STACK
      </span>
      {tech.map((t) => (
        <span
          key={t}
          className="rounded-md border border-[var(--steel)]/30 bg-[var(--steel)]/10 px-2.5 py-1 font-mono text-[11px] tracking-wider text-[var(--steel-bright)]"
        >
          {t}
        </span>
      ))}
    </motion.div>
  );
}

function Highlights({ items }) {
  return (
    <div className="space-y-3.5">
      {items.map((h, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 + i * 0.1, duration: 0.5, ease: EASE }}
          className="flex items-center gap-3 text-[15px] text-[var(--text-secondary)]"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]"
            style={{ boxShadow: '0 0 8px rgba(245,181,68,0.7)' }}
          />
          {h}
        </motion.div>
      ))}
    </div>
  );
}

function Tags({ tags }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.34 }}
      className="flex flex-wrap gap-2"
    >
      {tags.map((t) => (
        <span
          key={t}
          className="rounded-full border border-white/[0.12] bg-white/[0.05] px-3 py-1 font-mono text-[11px] tracking-wider text-[var(--text-secondary)]"
        >
          {t}
        </span>
      ))}
    </motion.div>
  );
}

export default function MemoryCard() {
  const selected = useStore((s) => s.selectedMemory);
  const origin = useStore((s) => s.memoryOrigin);
  const setSelected = useStore((s) => s.setSelectedMemory);
  const mem = allMemories.find((m) => m.id === selected);

  const from = (() => {
    if (!origin || typeof window === 'undefined') {
      return { opacity: 0, scale: 0.92, x: 0, y: 0 };
    }
    return {
      opacity: 0,
      scale: 0.12,
      x: origin.x - window.innerWidth / 2,
      y: origin.y - window.innerHeight / 2,
    };
  })();

  return (
    <AnimatePresence>
      {mem && (
        <motion.div
          className="fixed inset-0 z-30 flex items-center justify-center px-5 py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={() => setSelected(null)}
          style={{ background: 'rgba(3,5,12,0.42)', backdropFilter: 'blur(8px)' }}
        >
          {/* Soft luminous gradient border (no hard 1px edge) */}
          <motion.div
            className="relative max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-[2rem] p-[1.5px]"
            style={{
              background:
                'linear-gradient(155deg, rgba(245,181,68,0.6), rgba(111,176,238,0.3) 42%, rgba(255,255,255,0.05) 75%)',
              boxShadow: '0 40px 110px -25px rgba(0,0,0,0.85), 0 0 70px rgba(255,138,61,0.14)',
            }}
            initial={from}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
            transition={{ type: 'spring', stiffness: 210, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glassmorphism body */}
            <div className="relative max-h-[88vh] overflow-y-auto rounded-[1.92rem] bg-[rgba(12,16,28,0.55)] p-9 backdrop-blur-2xl sm:p-14">
              {/* inner glow + ghost number */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(130% 80% at 85% -10%, rgba(255,138,61,0.16), transparent 60%)',
                }}
              />
              <div
                aria-hidden
                className="font-display pointer-events-none absolute -bottom-12 -right-3 select-none text-[15rem] font-bold leading-none text-white/[0.035]"
              >
                {String(mem.chapterIndex ?? 2).padStart(2, '0')}
              </div>

              {/* Row 1: eyebrow (+ status pill) + close */}
              <div className="relative flex items-start justify-between gap-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap items-center gap-3"
                >
                  {mem.signature && (
                    <span className="rounded-full border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.2em] text-[var(--gold)]">
                      ★ SIGNATURE
                    </span>
                  )}
                  {mem.current && (
                    <span className="flex items-center gap-1.5 rounded-full border border-[#5affa0]/40 bg-[#5affa0]/10 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.2em] text-[#7dffb8]">
                      <span className="pulse-soft h-1.5 w-1.5 rounded-full bg-[#5affa0]" />
                      CURRENT
                    </span>
                  )}
                  <span className="font-mono text-[11px] tracking-[0.3em] text-[var(--steel-bright)]">
                    {mem.eyebrow}
                  </span>
                </motion.div>
                <button
                  onClick={() => setSelected(null)}
                  className="font-mono text-[11px] tracking-widest text-[var(--text-dim)] transition-colors hover:text-[var(--gold)]"
                >
                  CLOSE ✕
                </button>
              </div>

              {/* Row 2: hero stat + arc */}
              <div className="relative mt-5 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
                <div className="flex-1">
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.26, duration: 0.6, ease: EASE }}
                    className="text-gradient font-display text-6xl font-bold leading-[0.95] sm:text-8xl"
                  >
                    {mem.stat}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.34 }}
                    className="mt-3 text-base text-[var(--text-secondary)]"
                  >
                    {mem.statLabel}
                  </motion.div>
                </div>
                <div className="shrink-0 self-center sm:self-auto">
                  <ArcGauge value={mem.arc ?? 0.7} />
                </div>
              </div>

              {/* Title + meta */}
              <motion.h3
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.5, ease: EASE }}
                className="font-display relative mt-9 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl"
              >
                {mem.label}
              </motion.h3>
              {(mem.role || mem.period) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.36 }}
                  className="relative mt-2 font-mono text-xs tracking-wider text-[var(--gold)]"
                >
                  {[mem.role, mem.period].filter(Boolean).join('  ·  ')}
                </motion.div>
              )}

              {/* Tags */}
              {mem.tags && (
                <div className="relative mt-5">
                  <Tags tags={mem.tags} />
                </div>
              )}

              {/* Tech stack */}
              {mem.tech && (
                <div className="relative mt-4">
                  <TechStack tech={mem.tech} />
                </div>
              )}

              {/* Visual: bars or highlights */}
              <div className="relative mt-7">
                {mem.metrics ? (
                  <MetricBars metrics={mem.metrics} />
                ) : mem.highlights ? (
                  <Highlights items={mem.highlights} />
                ) : null}
              </div>

              {/* Story */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.5 }}
                className="relative mt-8 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]"
              >
                {mem.story}
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
