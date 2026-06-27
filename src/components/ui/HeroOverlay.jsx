'use client';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

export default function HeroOverlay() {
  const phase = useStore((s) => s.phase);
  if (phase !== 'reveal') return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
      {/* Scrim so the warm text reads cleanly over the orbital scene */}
      <div className="hero-scrim pointer-events-none absolute inset-0" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative flex flex-col items-center"
      >
        {/* NASA badge */}
        <motion.div
          variants={item}
          className="glass glass-glow pointer-events-auto mb-8 flex items-center gap-2.5 rounded-full px-5 py-2"
        >
          <span className="text-sm text-[var(--gold)]">★</span>
          <span className="font-mono text-xs tracking-wide text-[var(--text-secondary)]">
            NASA Space Apps — Global Nominee · Top 9% of 11,350+
          </span>
        </motion.div>

        {/* Name */}
        <motion.h1
          variants={item}
          className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-shadow-soft sm:text-7xl lg:text-8xl"
        >
          <span className="text-gradient">Allen Shaji</span>
          <br />
          <span className="text-[var(--text-primary)]">Varghese</span>
        </motion.h1>

        {/* Intro line */}
        <motion.p
          variants={item}
          className="mt-6 font-mono text-sm tracking-[0.2em] text-[var(--gold)] text-shadow-soft sm:text-base"
        >
          SOFTWARE ENGINEERING · DREXEL · CLASS OF 2027
        </motion.p>

        {/* Tagline */}
        <motion.p
          variants={item}
          className="mt-4 max-w-xl text-base text-[var(--text-secondary)] text-shadow-soft sm:text-lg"
        >
          Building products that solve real problems through{' '}
          <span className="text-[var(--gold)]">AI</span> and{' '}
          <span className="text-[var(--steel-bright)]">technology</span>.
        </motion.p>
      </motion.div>
    </div>
  );
}
