'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@react-three/drei';
import { useStore } from '@/lib/store';
import { identity } from '@/data/timeline';
import { ENTRY, entryState, entryElapsed } from '@/lib/entrySequence';
import { worldState } from '@/lib/worldState';
import { unlockAudio } from '@/lib/audio';

const EASE = [0.16, 1, 0.3, 1];
const MIN_LOADER_MS = 1400;

/** Jump straight to the surface — used by Skip and the "view work" fast lane. */
export function skipToWorld({ openWork = false } = {}) {
  const s = useStore.getState();
  worldState.reveal = 1;
  worldState.altitude = 0;
  worldState.shake = 0;
  document.body.style.overflow = '';
  s.setJourneyPhase('world');
  if (openWork) s.setEnteredZone('engineering');
}

/* ───────────────────────────────── LOADER ─────────────────────────────── */

function Loader() {
  const phase = useStore((s) => s.phase);
  const setPhase = useStore((s) => s.setPhase);
  const sceneReady = useStore((s) => s.sceneReady);
  const { progress } = useProgress();
  const [shown, setShown] = useState(0);
  const target = useRef(0);
  const t0 = useRef(0);

  useEffect(() => {
    target.current = sceneReady ? 100 : Math.min(progress, 94);
  }, [sceneReady, progress]);

  // Ease the counter toward real progress; hand off once loaded + a beat
  useEffect(() => {
    if (!t0.current) t0.current = performance.now();
    let raf;
    let v = 0;
    const tick = () => {
      v += (target.current - v) * 0.08;
      if (target.current - v < 0.4) v = target.current;
      setShown(v);
      if (v >= 100 && performance.now() - t0.current > MIN_LOADER_MS) {
        setPhase('hero');
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setPhase]);

  return (
    <AnimatePresence>
      {phase === 'loading' && (
        <motion.div
          className="fixed inset-0 z-[120] flex flex-col justify-between bg-void p-6 sm:p-10"
          exit={{ opacity: 0, transition: { duration: 0.9, ease: 'easeInOut' } }}
        >
          <div className="flex items-center justify-between font-mono text-micro uppercase tracking-[0.2em] text-ink-subtle">
            <span>{identity.name}</span>
            <span>Portfolio</span>
          </div>
          <div>
            <div className="font-display text-[clamp(4rem,14vw,11rem)] font-medium leading-none tracking-[-0.04em] text-ink tabular-nums">
              {String(Math.round(shown)).padStart(3, '0')}
            </div>
            <div className="mt-6 h-px w-full bg-line">
              <div className="h-px bg-ink" style={{ width: `${shown}%` }} />
            </div>
            <div className="mt-3 flex justify-between font-mono text-micro uppercase tracking-[0.2em] text-ink-subtle">
              <span>Loading the universe</span>
              <span>Sound on recommended</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────────────────── HERO ──────────────────────────────── */

const heroContainer = {
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.35 } },
  exit: { transition: { staggerChildren: 0.04 } },
};
const rise = {
  hidden: { y: '110%' },
  show: { y: '0%', transition: { duration: 1.1, ease: EASE } },
  exit: { y: '-110%', transition: { duration: 0.55, ease: [0.7, 0, 0.84, 0] } },
};
const fade = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.35 } },
};

function Line({ children, className = '' }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span variants={rise} className={`block ${className}`}>
        {children}
      </motion.span>
    </span>
  );
}

function Hero() {
  const phase = useStore((s) => s.phase);
  const setPhase = useStore((s) => s.setPhase);
  const { links } = identity;

  const enter = () => {
    if (useStore.getState().phase !== 'hero') return;
    unlockAudio();
    entryState.startedAt = performance.now();
    setPhase('dive');
  };

  return (
    <AnimatePresence>
      {phase === 'hero' && (
        <motion.div
          key="hero"
          className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-10"
          variants={heroContainer}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          {/* legibility wash — darkens the lower-left where the type sits */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(120% 90% at 0% 100%, color-mix(in srgb, var(--void) 88%, transparent) 0%, color-mix(in srgb, var(--void) 40%, transparent) 45%, transparent 70%)',
            }}
          />

          {/* top bar */}
          <motion.header variants={fade} className="pointer-events-auto flex items-center justify-between">
            <span className="text-sm font-medium tracking-tight text-ink">Allen Varghese</span>
            <nav className="flex items-center gap-5 text-sm text-ink-muted sm:gap-7">
              <a className="hero-link" href={links.github} target="_blank" rel="noreferrer">GitHub</a>
              <a className="hero-link" href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
              <a className="hero-link" href={`mailto:${links.email}`}>Email</a>
            </nav>
          </motion.header>

          {/* the title block */}
          <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <motion.p variants={fade} className="mb-6 font-mono text-micro uppercase tracking-[0.22em] text-ink-muted">
                Software Engineer — Drexel University ’27
              </motion.p>
              <h1 className="font-display text-[clamp(3.25rem,9vw,8.5rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-ink">
                <Line>Allen Shaji</Line>
                <Line>Varghese</Line>
              </h1>
              <motion.p variants={fade} className="mt-7 max-w-md text-body text-ink-muted">
                {identity.tagline}
              </motion.p>
              <motion.div variants={fade} className="pointer-events-auto mt-9 flex flex-wrap items-center gap-6">
                <button onClick={enter} className="hero-cta group">
                  Enter Allen&rsquo;s World
                  <span aria-hidden className="hero-cta__arrow">→</span>
                </button>
                <button onClick={() => skipToWorld({ openWork: true })} className="hero-link text-sm text-ink-muted">
                  Skip to projects
                </button>
              </motion.div>
            </div>

            <motion.div variants={fade} className="font-mono text-micro uppercase leading-relaxed tracking-[0.2em] text-ink-subtle sm:text-right">
              <div>Philadelphia, PA</div>
              <div>39.9566° N · 75.1899° W</div>
              <a
                className="hero-link pointer-events-auto mt-4 inline-block normal-case tracking-normal text-ink-subtle"
                href="https://sketchfab.com/3d-models/need-some-space-d6521362b37b48e3a82bce4911409303"
                target="_blank"
                rel="noreferrer"
              >
                Galaxy model by Loïc Norgeot · CC BY 4.0
              </a>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────── DIVE: CAPTIONS + FLASH ───────────────────── */

const CAPTIONS = [
  { from: ENTRY.GALAXY + 0.3, to: ENTRY.GALAXY + 1.9, title: 'The Milky Way', sub: 'Two hundred billion stars' },
  { from: ENTRY.GALAXY + 2.1, to: ENTRY.STAR_FLASH + 0.2, title: 'One of them is Allen’s', sub: 'Closing in' },
  { from: ENTRY.SOLAR + 0.5, to: ENTRY.LAUNCH + 0.3, title: 'Allen’s system', sub: 'Eight worlds · one star' },
];

function DiveLayer() {
  const phase = useStore((s) => s.phase);
  const [caption, setCaption] = useState(-1);
  const flashRef = useRef(null);

  useEffect(() => {
    if (phase !== 'dive') return;
    let raf;
    let last = -2;
    const tick = () => {
      const t = entryElapsed();
      const idx = CAPTIONS.findIndex((c) => t >= c.from && t < c.to);
      if (idx !== last) {
        last = idx;
        setCaption(idx);
      }
      // the star swells to white-gold; the cut to the system happens under it
      if (flashRef.current) {
        const up = Math.min(1, Math.max(0, (t - ENTRY.STAR_FLASH) / 0.4));
        const down = Math.min(1, Math.max(0, (t - (ENTRY.SOLAR + 0.05)) / 0.8));
        flashRef.current.style.opacity = String(up * up * (1 - down));
      }
      if (t < ENTRY.FLASH) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  if (phase !== 'dive') return null;
  const c = CAPTIONS[caption];
  return (
    <>
      <div
        ref={flashRef}
        className="pointer-events-none fixed inset-0 z-[60]"
        style={{
          opacity: 0,
          background: 'radial-gradient(circle at 50% 50%, #fffdf5 0%, #fff3d6 45%, var(--accent-hi) 100%)',
        }}
      />
      <div className="pointer-events-none fixed inset-x-0 bottom-[12vh] z-[61] flex justify-center px-6">
        <AnimatePresence mode="wait">
          {c && (
            <motion.div
              key={caption}
              className="text-center"
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: EASE } }}
              exit={{ opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.4 } }}
            >
              <div className="font-display text-2xl font-medium tracking-[-0.02em] text-ink sm:text-3xl" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}>
                {c.title}
              </div>
              <div className="mt-2 font-mono text-micro uppercase tracking-[0.22em] text-ink-muted">{c.sub}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/** Always-available way out of the cinematic (button + Esc). */
export function SkipIntro() {
  const phase = useStore((s) => s.phase);
  const journeyPhase = useStore((s) => s.journeyPhase);
  const active = phase === 'dive' && journeyPhase !== 'world';
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => e.key === 'Escape' && skipToWorld();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
  return (
    <AnimatePresence>
      {active && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.8, duration: 0.6 } }}
          exit={{ opacity: 0 }}
          onClick={() => skipToWorld()}
          className="skip-btn fixed bottom-6 right-6 z-[230] sm:bottom-8 sm:right-10"
        >
          Skip intro <span className="skip-btn__key">Esc</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default function IntroOverlay() {
  return (
    <>
      <Loader />
      <Hero />
      <DiveLayer />
    </>
  );
}
