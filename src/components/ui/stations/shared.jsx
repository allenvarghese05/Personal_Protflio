'use client';
import { motion } from 'framer-motion';
import { EASE_STD } from '@/lib/motion';

/** Shared building blocks for the station rooms, matching the case-study
 *  pages: a big editorial header and label-rail sections. */

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
export const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_STD } },
};

export function StationHeader({ kicker, title, children }) {
  return (
    <header className="mx-auto max-w-6xl px-6 pb-10 pt-14 sm:px-12">
      <motion.div variants={rise} className="mc-label">
        {kicker}
      </motion.div>
      <motion.h2
        variants={rise}
        className="font-display mt-4 max-w-4xl text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-6xl"
      >
        {title}
      </motion.h2>
      {children && (
        <motion.div variants={rise} className="mt-6">
          {children}
        </motion.div>
      )}
    </header>
  );
}

export function StationSection({ label, children }) {
  return (
    <section className="grid grid-cols-1 gap-3 border-t border-line py-10 lg:grid-cols-[200px_1fr] lg:gap-10">
      <div className="mc-label pt-1">{label}</div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
