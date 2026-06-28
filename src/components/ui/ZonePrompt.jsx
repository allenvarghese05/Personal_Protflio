'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { zoneById } from '@/data/world';

/**
 * Bottom-center call-to-action shown when the astronaut walks into a district's
 * radius. Clicking it opens that zone's featured content (reusing MemoryCard).
 */
export default function ZonePrompt() {
  const nearZone = useStore((s) => s.nearZone);
  const setSelectedMemory = useStore((s) => s.setSelectedMemory);
  const selectedMemory = useStore((s) => s.selectedMemory);
  const zone = nearZone ? zoneById(nearZone) : null;
  const show = !!zone && !selectedMemory;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed bottom-12 left-1/2 z-30 -translate-x-1/2"
        >
          <button
            onClick={() => zone.feature && setSelectedMemory(zone.feature)}
            className="glass glass-glow pointer-events-auto flex items-center gap-3 rounded-full px-6 py-3 transition-transform hover:scale-[1.03]"
          >
            <span
              className="pulse-soft h-2 w-2 rounded-full"
              style={{ background: zone.accent, boxShadow: `0 0 10px ${zone.accent}` }}
            />
            <span className="text-left">
              <span className="block font-mono text-[10px] tracking-[0.3em] text-[var(--text-dim)]">
                {zone.blurb.toUpperCase()}
              </span>
              <span className="font-display text-sm font-semibold tracking-wide text-[var(--text-primary)]">
                {zone.label}
              </span>
            </span>
            <span className="font-mono text-xs tracking-widest text-[var(--gold)]">
              ENTER ▸
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
