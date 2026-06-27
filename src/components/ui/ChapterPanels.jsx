'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { identity, chapters } from '@/data/timeline';
import { AsciiGlitchRipple } from '@/components/ui/AsciiGlitchRipple';

const EASE = [0.22, 1, 0.36, 1];
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};
const clip = {
  hidden: { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
  show: {
    clipPath: 'inset(0 0% 0 0)',
    opacity: 1,
    transition: { duration: 0.85, ease: EASE },
  },
};
const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, transition: { duration: 0.4 } },
};

/** Chapter 1 — the orbit / name card (centered hero climax). */
function NameCard() {
  return (
    <motion.div
      {...fade}
      className="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
    >
      <div className="hero-scrim pointer-events-none absolute inset-0" />
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative flex flex-col items-center"
      >
        <motion.div
          variants={item}
          className="glass glass-glow mb-8 flex items-center gap-2.5 rounded-full px-5 py-2"
        >
          <span className="text-sm text-[var(--gold)]">★</span>
          <span className="font-mono text-xs tracking-wide text-[var(--text-secondary)]">
            {identity.badge}
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-shadow-soft sm:text-7xl lg:text-8xl"
        >
          <span className="text-gradient">Allen Shaji</span>
          <br />
          <span className="text-[var(--text-primary)]">Varghese</span>
        </motion.h1>

        <motion.div variants={item} className="mt-6">
          <AsciiGlitchRipple
            as="div"
            autoStart
            spread={1.5}
            className="font-mono text-sm tracking-[0.2em] text-[var(--gold)] text-shadow-soft sm:text-base"
          >
            {identity.kicker}
          </AsciiGlitchRipple>
        </motion.div>

        <motion.p
          variants={item}
          className="mt-4 max-w-xl text-base text-[var(--text-secondary)] text-shadow-soft sm:text-lg"
        >
          {identity.tagline}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

/** Editorial chapter card — ghost number, glitch kicker, clip-reveal headline. */
function ChapterCard({ data }) {
  return (
    <motion.div
      {...fade}
      className="pointer-events-none fixed inset-0 z-10 flex items-center px-6 sm:px-12 lg:px-20"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-xl"
      >
        {/* Oversized ghosted chapter number behind the card */}
        <div
          aria-hidden
          className="font-display pointer-events-none absolute -left-4 -top-28 select-none text-[14rem] font-bold leading-none text-white/[0.04]"
        >
          {String(data.index).padStart(2, '0')}
        </div>

        <div className="glass glass-glow relative rounded-3xl p-9 sm:p-11">
          <motion.div variants={item} className="mb-5 h-px w-12 bg-[var(--gold)]" />

          <motion.div variants={item}>
            <AsciiGlitchRipple
              as="div"
              autoStart
              spread={1.5}
              className="font-mono text-[11px] tracking-[0.35em] text-[var(--gold)]"
            >
              {data.kicker}
            </AsciiGlitchRipple>
          </motion.div>

          <motion.h2
            variants={clip}
            className="font-display mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl"
          >
            {data.title}
          </motion.h2>

          <motion.div
            variants={item}
            className="mt-1 text-sm text-[var(--steel-bright)]"
          >
            {data.subtitle}
          </motion.div>

          {data.hint && (
            <motion.div
              variants={item}
              className="mt-7 flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-[var(--text-dim)]"
            >
              <span className="pulse-soft text-[var(--gold)]">✦</span>
              {data.hint.toUpperCase()}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ChapterPanels() {
  const active = useStore((s) => s.activeChapter);
  const origins = chapters.find((c) => c.index === 2);

  return (
    <AnimatePresence mode="wait">
      {active === 1 && <NameCard key="name" />}
      {active === 2 && origins && <ChapterCard key="origins" data={origins} />}
    </AnimatePresence>
  );
}
