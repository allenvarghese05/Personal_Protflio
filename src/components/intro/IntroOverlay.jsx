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

// Status copy keyed to real progress — it narrates what's actually loading.
const STAGES = [
  { at: 0, text: 'Mapping 100,000 stars' },
  { at: 45, text: 'Igniting the sun' },
  { at: 75, text: 'Plotting a course' },
  { at: 100, text: 'Ready' },
];
const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;

/**
 * The loader is the first frame of the journey: a single star on black,
 * charging as the universe loads. On handoff the ring blows outward and the
 * star flares — and the galaxy fades up behind it.
 */
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

  // Ease toward real progress; hand off once loaded + a beat
  useEffect(() => {
    if (!t0.current) t0.current = performance.now();
    let raf;
    let v = 0;
    const tick = () => {
      v += (target.current - v) * 0.07;
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

  const k = shown / 100;
  const stage = [...STAGES].reverse().find((st) => shown >= st.at) || STAGES[0];

  return (
    <AnimatePresence>
      {phase === 'loading' && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-void"
          exit={{ opacity: 0, transition: { duration: 1.2, delay: 0.35, ease: 'easeInOut' } }}
        >
          <motion.div
            className="flex flex-col items-center"
            exit={{ scale: 1.08, transition: { duration: 1.4, ease: EASE } }}
          >
            {/* the star + its charge ring */}
            <div className="relative h-28 w-28">
              <motion.svg
                viewBox="0 0 100 100"
                className="absolute inset-0 -rotate-90"
                exit={{ scale: 9, opacity: 0, transition: { duration: 1.1, ease: EASE } }}
              >
                <circle cx="50" cy="50" r={RING_R} fill="none" stroke="var(--line)" strokeWidth="0.6" />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - k)}
                />
              </motion.svg>
              <motion.span
                className="loader-star absolute left-1/2 top-1/2 rounded-full"
                style={{
                  x: '-50%',
                  y: '-50%',
                  width: 6 + k * 6,
                  height: 6 + k * 6,
                  opacity: 0.35 + k * 0.65,
                  boxShadow: `0 0 ${10 + k * 30}px ${2 + k * 8}px color-mix(in srgb, var(--accent-hi) ${30 + k * 40}%, transparent)`,
                }}
                exit={{ scale: 6, opacity: 0, transition: { duration: 1.0, ease: EASE } }}
              />
            </div>

            <div className="mt-10 text-center">
              <div className="font-display text-lg font-medium tracking-[-0.01em] text-ink">{identity.name}</div>
              <div className="mt-3 flex items-center justify-center gap-3 font-mono text-micro uppercase tracking-[0.22em] text-ink-subtle">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={stage.text}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
                    exit={{ opacity: 0, y: -4, transition: { duration: 0.25 } }}
                  >
                    {stage.text}
                  </motion.span>
                </AnimatePresence>
                <span className="text-ink-faint">·</span>
                <span className="tabular-nums text-ink-muted">{String(Math.round(shown)).padStart(3, '0')}</span>
              </div>
            </div>
          </motion.div>

          <div className="absolute inset-x-6 bottom-6 flex justify-between font-mono text-micro uppercase tracking-[0.2em] text-ink-faint sm:inset-x-10 sm:bottom-8">
            <span>Portfolio · 2026</span>
            <span>Sound on recommended</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────────────────── HERO ──────────────────────────────── */

const heroContainer = {
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.5 } },
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
          className="pointer-events-none fixed inset-0 z-20 flex flex-col px-6 py-6 sm:px-12 sm:py-9 lg:px-16"
          variants={heroContainer}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          {/* legibility wash — darkens the left third where the type sits */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(90% 85% at 0% 55%, color-mix(in srgb, var(--void) 85%, transparent) 0%, color-mix(in srgb, var(--void) 40%, transparent) 45%, transparent 72%)',
            }}
          />

          {/* top bar */}
          <motion.header variants={fade} className="pointer-events-auto flex items-center justify-between">
            <span className="text-sm font-medium tracking-tight text-ink">Allen Varghese</span>
            <nav className="flex items-center gap-5 text-sm text-ink-muted sm:gap-8">
              <a className="hero-link" href={links.github} target="_blank" rel="noreferrer">GitHub</a>
              <a className="hero-link" href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
              <a className="hero-link" href={`mailto:${links.email}`}>Email</a>
            </nav>
          </motion.header>

          {/* the title block — sits just below centre, clear of both edges */}
          <div className="flex flex-1 items-center pt-[4vh]">
            <div className="max-w-4xl">
              <motion.p variants={fade} className="mb-6 font-mono text-micro uppercase tracking-[0.22em] text-ink-muted">
                Software Engineer — Drexel University ’27
              </motion.p>
              <h1 className="font-display text-[clamp(3.25rem,8.2vw,8rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-ink">
                <Line>Allen Shaji</Line>
                <Line>Varghese</Line>
              </h1>
              <motion.p variants={fade} className="mt-7 max-w-md text-body text-ink-muted">
                {identity.tagline}
              </motion.p>
              <motion.div variants={fade} className="pointer-events-auto mt-10 flex flex-wrap items-center gap-7">
                <button onClick={enter} className="hero-cta group">
                  Enter Allen&rsquo;s World
                  <span aria-hidden className="hero-cta__arrow">→</span>
                </button>
                <button onClick={() => skipToWorld({ openWork: true })} className="hero-link text-sm text-ink-muted">
                  Skip to projects
                </button>
              </motion.div>
            </div>
          </div>

          {/* footer rail */}
          <motion.div
            variants={fade}
            className="flex flex-col gap-2 border-t border-line/60 pt-4 font-mono text-micro uppercase tracking-[0.2em] text-ink-subtle sm:flex-row sm:items-center sm:justify-between"
          >
            <span>Philadelphia, PA · 39.9566° N, 75.1899° W</span>
            <a
              className="hero-link pointer-events-auto w-fit normal-case tracking-normal"
              href="https://sketchfab.com/3d-models/need-some-space-d6521362b37b48e3a82bce4911409303"
              target="_blank"
              rel="noreferrer"
            >
              Galaxy model by Loïc Norgeot · CC BY 4.0
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────── DIVE: CAPTIONS + FLASH ───────────────────── */

const CAPTIONS = [
  { from: ENTRY.GALAXY + 0.4, to: ENTRY.GALAXY + 2.5, title: 'The Milky Way', sub: 'Two hundred billion stars' },
  { from: ENTRY.GALAXY + 2.8, to: ENTRY.STAR_FLASH + 0.2, title: 'One of them is Allen’s', sub: 'Closing in' },
  { from: ENTRY.SOLAR + 2.4, to: ENTRY.ZOOM + 0.3, title: 'Allen’s system', sub: 'Eight worlds · one star' },
  { from: ENTRY.ZOOM + 1.0, to: ENTRY.ZOOM + 3.6, title: 'Setting a course', sub: 'Destination · Allen’s World' },
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
