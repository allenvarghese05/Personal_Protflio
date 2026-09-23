'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { zones } from '@/data/world';
import { travelTo } from '@/lib/worldNav';

/**
 * The dock — click-to-travel, the primary way around Allen's World. Each
 * district glides the astronaut there along the causeways; "All projects"
 * jumps straight into Mission Control. Walking stays the bonus.
 */
export default function WorldDock() {
  const journeyPhase = useStore((s) => s.journeyPhase);
  const enteredZone = useStore((s) => s.enteredZone);
  const here = useStore((s) => s.nearZone);
  const setEnteredZone = useStore((s) => s.setEnteredZone);
  const show = journeyPhase === 'world' && !enteredZone;

  return (
    <AnimatePresence>
      {show && (
        <motion.nav
          aria-label="Travel"
          className="world-dock fixed bottom-6 left-1/2 z-30 -translate-x-1/2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ opacity: 0, y: 12, transition: { duration: 0.25 } }}
        >
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => travelTo(z.id)}
              className={`world-dock__item ${here === z.mesa ? 'is-here' : ''}`}
              aria-current={here === z.mesa ? 'location' : undefined}
            >
              <span className="world-dock__dot" aria-hidden />
              {z.label}
            </button>
          ))}
          <span className="world-dock__sep" aria-hidden />
          <button onClick={() => setEnteredZone('engineering')} className="world-dock__item world-dock__item--cta">
            All projects <span aria-hidden>→</span>
          </button>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
