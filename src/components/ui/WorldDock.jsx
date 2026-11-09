'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { zones } from '@/data/world';
import { travelTo } from '@/lib/worldNav';
import { PageLink } from '@/components/audio/SiteAudio';
import ThemeToggle from '@/components/ui/ThemeToggle';

const EASE = [0.16, 1, 0.3, 1];

/**
 * The dock — click-to-travel, the primary way around Allen's World. Each
 * district glides the astronaut there along the causeways; "All projects"
 * opens the /projects page. Walking stays the bonus.
 *
 * On a phone the districts don't fit in one row, so the dock scrolls
 * sideways and "All projects" moves to its own button in the top-right
 * corner, where it is always in view. The light / dark switch sits beside
 * "All projects" in both places.
 */
export default function WorldDock() {
  const journeyPhase = useStore((s) => s.journeyPhase);
  const enteredZone = useStore((s) => s.enteredZone);
  const here = useStore((s) => s.nearZone);
  const show = journeyPhase === 'world' && !enteredZone;

  return (
    <AnimatePresence>
      {show && (
        <motion.nav
          key="dock"
          aria-label="Travel"
          className="world-dock world-dock--travel fixed bottom-6 left-1/2 z-30 -translate-x-1/2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.3, ease: EASE } }}
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
          {/* the projects page, outside the game (a full load drops the 3D scene,
              unless a beat is playing) */}
          <PageLink href="/projects" className="world-dock__item world-dock__item--cta">
            All projects <span aria-hidden>→</span>
          </PageLink>
          {/* desktop only; phones get it beside the top-right button */}
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
        </motion.nav>
      )}
      {show && (
        // phones: the same link, pinned top-right so it never scrolls out of view
        <motion.div
          key="dock-cta"
          className="world-dock__float fixed right-3 top-3 z-30"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.3, ease: EASE } }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
        >
          <div className="world-dock world-dock--travel">
            <ThemeToggle />
            {/* display set inline: inside a .world-dock, the phone rule that
                hides the dock's own "All projects" would otherwise match it */}
            <PageLink href="/projects" className="world-dock__item world-dock__item--cta" style={{ display: 'inline-flex' }}>
              All projects <span aria-hidden>→</span>
            </PageLink>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
