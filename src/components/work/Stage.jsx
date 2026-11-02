'use client';
/**
 * A project's picture, on the project's own colour (show.ground).
 *
 *   shot      a screenshot in a quiet window frame that runs off the right
 *             and bottom edges, so it reads large rather than shrunk to fit
 *   badge     an image shown whole, centred (the AirCast nominee badge)
 *   phone     an iPhone screenshot standing in a phone frame
 *   spectrum  AutoMix has no screen: a ring grows out of the spectrum, gets
 *             caught, and is notched out (the detector's real behaviour)
 *
 * Scroll: the stage opens from an inset (a wipe) as it arrives, and the
 * picture drifts a little slower than its frame. Neither runs under reduced
 * motion; the spectrum only animates while on screen.
 */
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useInView, useMotionTemplate, useReducedMotion, useScroll, useTransform } from 'framer-motion';

const EASE = 'ease-[cubic-bezier(0.16,1,0.3,1)]';

/* ── the four pictures ─────────────────────────────────────────────────── */

function Shot({ cover, priority, drift }) {
  return (
    <motion.div className="absolute left-[7%] top-[11%] w-[112%]" style={{ y: drift }}>
      <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-black/20">
        {/* a quiet window bar: it says "this is a real screen" without a fake browser */}
        <div aria-hidden className="flex h-6 items-center gap-1.5 bg-[#ececec] px-3">
          <span className="h-2 w-2 rounded-full bg-black/15" />
          <span className="h-2 w-2 rounded-full bg-black/15" />
          <span className="h-2 w-2 rounded-full bg-black/15" />
        </div>
        <Image
          src={cover.src}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          priority={priority}
          sizes="(min-width: 1024px) 760px, 100vw"
          className="block h-auto w-full"
        />
      </div>
    </motion.div>
  );
}

function Badge({ cover, priority, drift }) {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" style={{ y: drift }}>
      <div className="relative aspect-square h-[74%] overflow-hidden rounded-[22px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.75)] ring-1 ring-white/10">
        <Image src={cover.src} alt={cover.alt} fill priority={priority} sizes="420px" className="object-cover" />
      </div>
    </motion.div>
  );
}

function Phone({ cover, priority, drift }) {
  return (
    <motion.div className="absolute left-1/2 top-[10%] w-[36%] max-w-[250px] -translate-x-1/2" style={{ y: drift }}>
      <div className="rounded-[36px] bg-[#0b0b0d] p-[7px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/15">
        <div className="relative aspect-[700/1522] overflow-hidden rounded-[30px] bg-white">
          <Image src={cover.src} alt={cover.alt} fill priority={priority} sizes="260px" className="object-cover object-top" />
        </div>
      </div>
    </motion.div>
  );
}

const BARS = 44;
const RING = 27;
// a speech-like spectrum: energy in the low mids, rolling off toward 12 kHz
const BASE = Array.from({ length: BARS }, (_, i) => {
  const t = i / (BARS - 1);
  const body = Math.exp(-((t - 0.22) ** 2) / 0.05) * 0.55 + 0.16;
  const grain = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1; // fixed per bar
  return Math.min(0.56, body * (0.6 + grain * 0.32));
});
const PHASES = [
  { label: 'Listening', ring: 0, notch: false },
  { label: 'Ring growing', ring: 0.5, notch: false },
  { label: 'Ring detected', ring: 0.95, notch: false },
  { label: 'Notched, −6 dB', ring: 0.08, notch: true },
  { label: 'Notched, −6 dB', ring: 0.08, notch: true },
];

function Spectrum() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.4 });
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (reduce || !inView) return undefined;
    const id = setInterval(() => setBeat((b) => b + 1), 1300);
    return () => clearInterval(id);
  }, [reduce, inView]);
  const phase = reduce ? PHASES[3] : PHASES[beat % PHASES.length];
  const caught = phase.ring > 0.9;

  return (
    <div ref={ref} className="absolute inset-0">
      <div className="absolute left-6 right-6 top-5 flex items-center justify-between text-label text-white/70">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full transition-colors duration-300"
            style={{ background: caught ? '#ff6b5c' : phase.notch ? '#ff9a3c' : 'rgba(255,255,255,0.35)' }}
          />
          {phase.label}
        </span>
        <span className="tabular-nums">150 Hz – 12 kHz</span>
      </div>
      <div aria-hidden className="absolute inset-x-6 bottom-6 top-14 flex items-end gap-[3px] sm:gap-1">
        {BASE.map((h, i) => {
          const ring = i === RING ? phase.ring : Math.abs(i - RING) === 1 ? phase.ring * 0.25 : 0;
          const notched = phase.notch && Math.abs(i - RING) <= 1;
          const value = Math.min(1, h * (notched ? 0.45 : 1) + ring);
          const hot = i === RING && phase.ring > 0.4;
          return (
            <span
              key={i}
              className={`h-full flex-1 origin-bottom rounded-t-[2px] transition-[transform,background-color] duration-700 ${EASE}`}
              style={{
                transform: `scaleY(${value})`,
                background: hot ? (caught ? '#ff6b5c' : '#ff9a3c') : 'rgba(255,255,255,0.24)',
              }}
            />
          );
        })}
      </div>
      <span
        aria-hidden
        className="absolute bottom-6 top-14 rounded-full transition-opacity duration-500"
        style={{
          left: `calc(1.5rem + (100% - 3rem) * ${(RING - 0.5) / BARS})`,
          width: `calc((100% - 3rem) * ${2 / BARS})`,
          background: 'rgba(255,154,60,0.14)',
          boxShadow: 'inset 0 0 0 1px rgba(255,154,60,0.5)',
          opacity: phase.notch ? 1 : 0,
        }}
      />
      <p className="sr-only">A feedback ring grows out of the spectrum, is detected, and a narrow notch cuts it.</p>
    </div>
  );
}

const ART = { shot: Shot, badge: Badge, phone: Phone, spectrum: Spectrum };

/* ── the stage ─────────────────────────────────────────────────────────── */

export default function Stage({ show, aspect = 'aspect-[4/3]', priority = false, className = '' }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: arrive } = useScroll({ target: ref, offset: ['start end', 'start 0.45'] });
  const { scrollYProgress: pass } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const inset = useTransform(arrive, [0, 1], [7, 0]);
  const clip = useMotionTemplate`inset(${inset}% ${inset}% ${inset}% ${inset}% round 22px)`;
  const drift = useTransform(pass, [0, 1], ['5%', '-5%']);
  const Art = ART[show.cover?.type];

  return (
    <motion.div
      ref={ref}
      className={`relative w-full overflow-hidden rounded-[22px] ${aspect} ${className}`}
      style={{ background: show.ground, clipPath: reduce ? undefined : clip }}
    >
      {/* light from above, so the ground has depth instead of reading flat */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(90%_70%_at_30%_0%,rgba(255,255,255,0.10),transparent_60%)]" />
      {Art && <Art cover={show.cover} priority={priority} drift={reduce ? 0 : drift} />}
      {show.cover?.caption && (
        <span className="absolute bottom-4 left-4 rounded-full bg-black/55 px-3 py-1.5 text-label text-white/85 backdrop-blur">
          {show.cover.caption}
        </span>
      )}
    </motion.div>
  );
}
