'use client';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useStore } from '@/lib/store';
import { identity, chapters } from '@/data/timeline';
import { AsciiGlitchRipple } from '@/components/ui/AsciiGlitchRipple';

if (typeof window !== 'undefined') gsap.registerPlugin(SplitText);

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
  const setPhase = useStore((s) => s.setPhase);
  const [label, setLabel] = useState("TRAVEL TO ALLEN'S WORLD");
  const firing = useRef(false);
  const badgeRef = useRef(null);
  const nameRef = useRef(null);
  const kickerRef = useRef(null);
  const taglineRef = useRef(null);
  const btnRef = useRef(null);
  const btnRowRef = useRef(null);

  /** Beat 0 — lock-on, then the name scatters into the void. */
  const initiateWorldEntry = () => {
    if (firing.current) return;
    firing.current = true;

    // Unlock audio on the user gesture — the sequence synthesizes its own
    // rumble/crack/thud through this context.
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      ctx.resume();
      window.__entryAudio = ctx;
    } catch {
      /* sound is optional */
    }

    // Lock-on: border flash + INITIATING...
    btnRef.current?.classList.add('entry-lockon');
    setLabel('INITIATING...');

    const tl = gsap.timeline({ onComplete: () => setPhase('dive') });
    // The name scatters upward, character by character
    try {
      const split = new SplitText(nameRef.current, { type: 'chars' });
      tl.to(
        split.chars,
        {
          x: () => gsap.utils.random(-40, 40),
          y: -80,
          opacity: 0,
          duration: 0.4,
          stagger: 0.02,
          ease: 'power2.in',
        },
        0.15
      );
    } catch {
      tl.to(nameRef.current, { opacity: 0, y: -40, duration: 0.4 }, 0.15);
    }
    tl.to(taglineRef.current, { opacity: 0, y: -20, duration: 0.3 }, 0.15);
    tl.to(badgeRef.current, { opacity: 0, duration: 0.2 }, 0.3);
    tl.to(kickerRef.current, { opacity: 0, duration: 0.2 }, 0.35);
    tl.to(btnRowRef.current, { opacity: 0, duration: 0.2 }, 0.4);
    tl.to({}, { duration: 0.2 }); // beat of stillness before the dive clock starts
  };

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
          ref={badgeRef}
          variants={item}
          className="glass glass-glow mb-8 flex items-center gap-2.5 rounded-full px-5 py-2"
        >
          <span className="text-sm text-[var(--gold)]">★</span>
          <span className="font-mono text-xs tracking-wide text-[var(--text-secondary)]">
            {identity.badge}
          </span>
        </motion.div>

        <motion.h1
          ref={nameRef}
          variants={item}
          className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-shadow-soft sm:text-7xl lg:text-8xl"
        >
          <span className="text-gradient">Allen Shaji</span>
          <br />
          <span className="text-[var(--text-primary)]">Varghese</span>
        </motion.h1>

        <motion.div ref={kickerRef} variants={item} className="mt-6">
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
          ref={taglineRef}
          variants={item}
          className="mt-4 max-w-xl text-base text-[var(--text-secondary)] text-shadow-soft sm:text-lg"
        >
          {identity.tagline}
        </motion.p>

        {/* The portal — a targeting reticle, not a link */}
        <motion.div
          ref={btnRowRef}
          variants={item}
          className="pointer-events-auto mt-10 flex items-center gap-3"
        >
          <button
            ref={btnRef}
            onClick={initiateWorldEntry}
            className="entry-btn group relative flex flex-col items-center justify-center border border-[#e8a040] bg-transparent transition-shadow duration-300 hover:shadow-[0_0_12px_rgba(232,160,64,0.4)]"
            style={{ width: '280px', height: '52px' }}
          >
            <span className="entry-corner tl" />
            <span className="entry-corner tr" />
            <span className="entry-corner bl" />
            <span className="entry-corner br" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-[#e8a040] transition-colors duration-200 group-hover:text-[#f0c060]">
              {label}
            </span>
            <span
              className="pointer-events-none absolute bottom-[5px] font-mono uppercase opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{ fontSize: '7px', letterSpacing: '0.18em', color: '#3a5060' }}
            >
              INITIATE SEQUENCE
            </span>
          </button>
          <span className="entry-chevron font-mono text-lg text-[#e8a040]">›</span>
        </motion.div>
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
  const phase = useStore((s) => s.phase);
  const engineering = chapters.find((c) => c.index === 2);
  const origins = chapters.find((c) => c.index === 3);

  return (
    <AnimatePresence mode="wait">
      {/* The card fades out the moment the dive begins */}
      {active === 1 && phase !== 'dive' && <NameCard key="name" />}
      {active === 2 && engineering && (
        <ChapterCard key="engineering" data={engineering} />
      )}
      {active === 3 && origins && <ChapterCard key="origins" data={origins} />}
    </AnimatePresence>
  );
}
