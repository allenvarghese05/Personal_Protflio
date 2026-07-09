'use client';
import { useEffect, useRef, useState } from 'react';
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
  const cardRef = useRef(null);
  const nameRef = useRef(null);
  const kickerRef = useRef(null);
  const taglineRef = useRef(null);
  const btnRef = useRef(null);
  const btnRowRef = useRef(null);
  const statusRef = useRef(null);
  const splitRef = useRef(null);

  // Interactive layer: split the name into hoverable characters, tilt the
  // whole card with the pointer, and give the portal button a magnetic pull.
  useEffect(() => {
    // characters come alive under the cursor (CSS .hero-char)
    const t = setTimeout(() => {
      try {
        splitRef.current = new SplitText(nameRef.current, { type: 'chars', charsClass: 'hero-char' });
        // background-clip gradients don't survive nested char divs — re-apply
        // the gradient to each character so "Allen Shaji" keeps its gold.
        nameRef.current
          ?.querySelectorAll('.text-gradient .hero-char')
          .forEach((c) => c.classList.add('text-gradient'));
      } catch {}
    }, 900); // after the entrance animation settles

    const rx = gsap.quickTo(cardRef.current, 'rotationX', { duration: 0.6, ease: 'power2.out' });
    const ry = gsap.quickTo(cardRef.current, 'rotationY', { duration: 0.6, ease: 'power2.out' });
    const bx = gsap.quickTo(btnRef.current, 'x', { duration: 0.4, ease: 'power2.out' });
    const by = gsap.quickTo(btnRef.current, 'y', { duration: 0.4, ease: 'power2.out' });
    gsap.set(cardRef.current, { transformPerspective: 900 });

    const onMove = (e) => {
      if (firing.current) return;
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      rx(ny * -5);
      ry(nx * 6);
      // magnetic button — pulls toward the cursor when it's close
      const b = btnRef.current?.getBoundingClientRect();
      if (b) {
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const d = Math.hypot(dx, dy);
        const pull = d < 140 ? (1 - d / 140) * 0.35 : 0;
        bx(dx * pull);
        by(dy * pull);
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousemove', onMove);
      try {
        splitRef.current?.revert();
      } catch {}
    };
  }, []);

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
    gsap.to(cardRef.current, { rotationX: 0, rotationY: 0, duration: 0.3 });

    const tl = gsap.timeline({ onComplete: () => setPhase('dive') });
    // The name scatters upward, character by character
    try {
      const chars = splitRef.current?.chars?.length
        ? splitRef.current.chars
        : new SplitText(nameRef.current, { type: 'chars' }).chars;
      tl.to(
        chars,
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
    tl.to(kickerRef.current, { opacity: 0, duration: 0.2 }, 0.35);
    tl.to([btnRowRef.current, statusRef.current], { opacity: 0, duration: 0.2 }, 0.4);
    tl.to({}, { duration: 0.2 }); // beat of stillness before the dive clock starts
  };

  return (
    <motion.div
      {...fade}
      className="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
    >
      <div className="hero-scrim pointer-events-none absolute inset-0" />
      <div ref={cardRef} className="relative">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative flex flex-col items-center"
        >
          <motion.h1
            ref={nameRef}
            variants={item}
            className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-shadow-soft sm:text-7xl lg:text-8xl"
          >
            <span className="text-gradient">Allen Shaji</span>
            <br />
            <span className="text-[var(--text-primary)]">Varghese</span>
          </motion.h1>

          {/* gsap scatter-fade targets are plain inner elements — framer motion
              re-applies its own opacity to motion elements on any re-render,
              which resurrected the kicker + tagline mid-departure */}
          <motion.div variants={item} className="mt-6">
            <div ref={kickerRef}>
              <AsciiGlitchRipple
                as="div"
                autoStart
                spread={1.5}
                className="font-mono text-sm tracking-[0.2em] text-[var(--gold)] text-shadow-soft sm:text-base"
              >
                {identity.kicker}
              </AsciiGlitchRipple>
            </div>
          </motion.div>

          <motion.div variants={item} className="mt-4">
            <p
              ref={taglineRef}
              className="max-w-xl text-base text-[var(--text-secondary)] text-shadow-soft sm:text-lg"
            >
              {identity.tagline}
            </p>
          </motion.div>

          {/* The portal — a targeting reticle, not a link */}
          <motion.div variants={item} className="pointer-events-auto mt-10">
          <div ref={btnRowRef} className="flex items-center gap-3">
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
          </div>
          </motion.div>

          {/* live telemetry — the world is waiting */}
          <motion.div variants={item} className="mt-5">
            <div
              ref={statusRef}
              className="flex items-center gap-2 font-mono uppercase"
              style={{ fontSize: '9px', letterSpacing: '0.25em', color: 'var(--text-dim)' }}
            >
              <span className="pulse-soft h-1.5 w-1.5 rounded-full bg-[#5affa0]" style={{ boxShadow: '0 0 8px #5affa0' }} />
              ORBIT STABLE · AWAITING COMMAND
            </div>
          </motion.div>
        </motion.div>
      </div>
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
