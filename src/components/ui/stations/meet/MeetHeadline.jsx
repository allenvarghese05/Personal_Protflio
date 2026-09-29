'use client';
import { motion } from 'framer-motion';
import { identity } from '@/data/timeline';
import { MEET } from '@/data/about';
import { EASE_OUT } from '@/lib/motion';

/**
 * The headline beside the resting helmet: name → credential → mission →
 * quiet proof, staggered in that order.
 *
 * The name is the landing hero's title treatment — each line rises out of a
 * clipped mask. Everything else fades up cleanly. (The site has no
 * decode/scramble effect for micro-labels, so none is invented here.)
 * Copy lives in `MEET` (src/data/about.js) and `identity.credential`.
 */
const container = {
  hidden: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};
const rise = {
  hidden: { y: '110%', transition: { duration: 0.5, ease: [0.7, 0, 0.84, 0] } },
  show: { y: '0%', transition: { duration: 1.1, ease: EASE_OUT } },
};
const fade = {
  hidden: { opacity: 0, y: 10, transition: { duration: 0.3 } },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE_OUT } },
};

function Line({ children }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span variants={rise} className="block">
        {children}
      </motion.span>
    </span>
  );
}

export default function MeetHeadline({ shown }) {
  // "Allen Shaji" / "Varghese" — the same break as the landing hero
  const words = identity.name.split(' ');
  const lines = [words.slice(0, -1).join(' '), words.at(-1)];

  return (
    <motion.div variants={container} initial="hidden" animate={shown ? 'show' : 'hidden'} className="max-w-[34rem]">
      <h2 className="font-display text-[clamp(2.5rem,4.8vw,4.9rem)] font-semibold leading-[0.93] tracking-[-0.045em] text-ink">
        {lines.map((l) => (
          <Line key={l}>{l}</Line>
        ))}
      </h2>
      <motion.p variants={fade} className="mt-5 font-mono text-micro uppercase tracking-[0.22em] text-ink-muted">
        {identity.credential}
      </motion.p>
      <motion.p variants={fade} className="mt-7 max-w-[32ch] text-[clamp(1.1rem,1.45vw,1.4rem)] leading-snug tracking-[-0.01em] text-ink">
        {MEET.mission}
      </motion.p>
      <motion.ul variants={fade} className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-micro uppercase tracking-[0.18em] text-ink-subtle">
        {MEET.proof.map((p, i) => (
          <li key={p} className="flex items-center gap-3">
            {i > 0 && (
              <span aria-hidden className="text-ink-faint">
                ·
              </span>
            )}
            {p}
          </li>
        ))}
      </motion.ul>
    </motion.div>
  );
}
