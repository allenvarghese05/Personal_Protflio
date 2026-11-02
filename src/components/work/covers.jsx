'use client';
/**
 * The picture at the top of each project card, and the "How it works" panel
 * it turns over to. Four kinds (cover.type in src/data/showcase.js):
 *
 *   image     a real picture: a screenshot of the product, or the award
 *   phone     an iPhone screenshot, standing in a phone frame
 *   spectrum  AutoMix has no screen, so its cover is what it does: a ring
 *             grows out of the spectrum, gets caught, and is notched out
 *   flow      no picture worth showing: the project's own steps, walked
 *
 * Covers that move only move while on screen, and hold still under reduced
 * motion.
 */
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';

const WALK_MS = 1500;

/** A beat counter that only ticks while the element is on screen. */
function useBeat(ms) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.4 });
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (reduce || !inView) return undefined;
    const id = setInterval(() => setBeat((b) => b + 1), ms);
    return () => clearInterval(id);
  }, [reduce, inView, ms]);
  return [ref, reduce ? null : beat];
}

/* ── image ─────────────────────────────────────────────────────────────── */

function ImageCover({ cover, priority }) {
  const contain = cover.fit === 'contain';
  return (
    <div className="absolute inset-0" style={{ background: cover.tint || 'var(--surface-2)' }}>
      <Image
        src={cover.src}
        alt={cover.alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 640px, 100vw"
        className={`transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${contain ? 'object-contain p-8' : 'object-cover group-hover/card:scale-[1.025]'}`}
        style={contain ? undefined : { objectPosition: cover.position || 'center' }}
      />
    </div>
  );
}

/* ── phone ─────────────────────────────────────────────────────────────── */

function PhoneCover({ cover, color, priority }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'var(--surface-2)' }}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(55% 60% at 50% 70%, color-mix(in srgb, ${color} 16%, transparent), transparent 75%)` }}
      />
      {/* the phone stands in the frame and runs off the bottom edge */}
      <div className="absolute left-1/2 top-[9%] w-[38%] max-w-[230px] -translate-x-1/2 transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/card:-translate-y-2 sm:w-[34%]">
        <div className="rounded-[34px] bg-[#0b0b0d] p-[7px] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.65)] ring-1 ring-white/10">
          <div className="relative aspect-[700/1522] overflow-hidden rounded-[28px] bg-white">
            <Image src={cover.src} alt={cover.alt} fill priority={priority} sizes="240px" className="object-cover object-top" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── spectrum (AutoMix) ────────────────────────────────────────────────── */

const BARS = 44;
const RING = 27; // the bar the ring grows on
// a speech-like spectrum: energy in the low mids, rolling off toward 12 kHz
const BASE = Array.from({ length: BARS }, (_, i) => {
  const t = i / (BARS - 1);
  const body = Math.exp(-((t - 0.22) ** 2) / 0.05) * 0.55 + 0.16;
  const grain = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1; // fixed per bar
  return Math.min(0.58, body * (0.6 + grain * 0.32));
});
const PHASES = [
  { label: 'Listening', ring: 0, notch: false },
  { label: 'Ring growing', ring: 0.55, notch: false },
  { label: 'Ring detected', ring: 0.95, notch: false },
  { label: 'Notched, −6 dB', ring: 0.08, notch: true },
  { label: 'Notched, −6 dB', ring: 0.08, notch: true },
];

function SpectrumCover({ color }) {
  const [ref, beat] = useBeat(1300);
  const phase = beat === null ? PHASES[3] : PHASES[beat % PHASES.length];
  const caught = phase.ring > 0.9;
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" style={{ background: 'var(--surface)' }}>
      <p aria-hidden className="absolute right-5 top-4 text-label tabular-nums text-ink-subtle">150 Hz – 12 kHz</p>
      <div className="absolute left-5 top-4 flex items-center gap-2 text-label text-ink-subtle">
        <span
          aria-hidden
          className="h-2 w-2 rounded-full transition-colors duration-300"
          style={{ background: caught ? 'var(--alert)' : phase.notch ? color : 'var(--ink-faint)' }}
        />
        <span aria-live="off">{phase.label}</span>
      </div>
      <div aria-hidden className="absolute inset-x-5 bottom-5 top-12 flex items-end gap-[3px] sm:gap-1">
        {BASE.map((h, i) => {
          const ring = i === RING ? phase.ring : Math.abs(i - RING) === 1 ? phase.ring * 0.25 : 0;
          const notched = phase.notch && Math.abs(i - RING) <= 1;
          const value = Math.min(1, h * (notched ? 0.45 : 1) + ring);
          const hot = i === RING && phase.ring > 0.4;
          return (
            <span
              key={i}
              className="h-full flex-1 origin-bottom rounded-t-[2px] transition-[transform,background-color] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                transform: `scaleY(${value})`,
                background: hot ? (caught ? 'var(--alert)' : color) : 'color-mix(in srgb, var(--ink) 22%, transparent)',
              }}
            />
          );
        })}
      </div>
      {/* the notch: a narrow cut drawn over the ring's band */}
      <span
        aria-hidden
        className="absolute bottom-5 top-12 rounded-full transition-opacity duration-500"
        style={{
          left: `calc(1.25rem + (100% - 2.5rem) * ${(RING - 0.5) / BARS})`,
          width: `calc((100% - 2.5rem) * ${2 / BARS})`,
          background: `color-mix(in srgb, ${color} 14%, transparent)`,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 45%, transparent)`,
          opacity: phase.notch ? 1 : 0,
        }}
      />
    </div>
  );
}

/* ── flow ──────────────────────────────────────────────────────────────── */

function FlowCover({ cover, color }) {
  const [ref, beat] = useBeat(WALK_MS);
  const steps = cover.steps;
  const n = steps.length;
  const current = beat === null ? -1 : beat % n;
  const x = (i) => 7 + (i * 86) / (n - 1); // % across the track

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" style={{ background: 'var(--surface)' }}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(color-mix(in srgb, var(--ink) 9%, transparent) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(80% 70% at 50% 50%, #000 30%, transparent 90%)',
        }}
      />
      <p className="absolute left-5 top-4 text-label text-ink-subtle">{cover.title}</p>

      <ol aria-label={cover.title} className="absolute inset-x-0 top-1/2 h-0">
        <span aria-hidden className="absolute top-0 h-px bg-line-hi" style={{ left: `${x(0)}%`, right: `${100 - x(n - 1)}%` }} />
        <span
          aria-hidden
          className="absolute top-0 h-px origin-left transition-transform duration-700 ease-out"
          style={{
            left: `${x(0)}%`,
            width: `${x(n - 1) - x(0)}%`,
            transform: `scaleX(${current < 0 ? 0 : current / (n - 1)})`,
            background: color,
          }}
        />
        {steps.map((s, i) => {
          const on = i === current;
          const passed = i < current;
          const planned = cover.planned?.includes(i);
          const above = i % 2 === 0;
          const shift = i === 0 ? '-14%' : i === n - 1 ? '-86%' : '-50%';
          return (
            <li key={s} className="absolute top-0" style={{ left: `${x(i)}%` }}>
              <span
                aria-hidden
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-[background-color,border-color,box-shadow] duration-500"
                style={{
                  borderColor: on || passed ? color : 'var(--line-hi)',
                  borderStyle: planned ? 'dashed' : 'solid',
                  background: on ? color : passed ? `color-mix(in srgb, ${color} 40%, var(--surface))` : 'var(--surface)',
                  boxShadow: on ? `0 0 0 6px color-mix(in srgb, ${color} 16%, transparent)` : 'none',
                }}
              />
              <span
                className={`absolute w-max max-w-[6.5rem] text-center text-label leading-tight transition-colors duration-500 sm:max-w-[8rem] ${
                  above ? 'bottom-4' : 'top-4'
                } ${on ? 'text-ink' : 'text-ink-subtle'}`}
                style={{ transform: `translateX(${shift})` }}
              >
                {s}
                {planned && <span className="block text-ink-subtle">(planned)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── the cover, which turns over to show how the project works ────────── */

const COVERS = { image: ImageCover, phone: PhoneCover, spectrum: SpectrumCover, flow: FlowCover };

export function Cover({ id, show, color, aspect, priority }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const panelId = `how-${id}`;
  const { cover } = show;
  const Body = COVERS[cover.type] || FlowCover;

  return (
    <div className={`relative overflow-hidden rounded-[16px] ${aspect}`} style={{ background: 'var(--surface-2)' }}>
      <Body cover={cover} color={color} priority={priority} />
      {cover.caption && !open && (
        <span className="absolute bottom-3 left-3 rounded-full bg-[color-mix(in_srgb,var(--void)_78%,transparent)] px-3 py-1.5 text-label text-ink-muted backdrop-blur">
          {cover.caption}
        </span>
      )}
      {/* a hairline inside the edge, so light screenshots hold their shape on a light page */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[16px] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ink)_8%,transparent)]" />

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-label={`How ${show.name || 'it'} works`}
            className="absolute inset-0 overflow-y-auto bg-[color-mix(in_srgb,var(--surface)_97%,transparent)] px-5 pb-16 pt-5 backdrop-blur-md sm:px-6"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-sm font-semibold text-ink">How it works</p>
            <ol className="mt-3 flex flex-col gap-3">
              {show.points.map((pt, i) => (
                <li key={pt} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
                  <span
                    aria-hidden
                    className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums"
                    style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
                  >
                    {i + 1}
                  </span>
                  <span>{pt}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="absolute bottom-3 right-3 inline-flex h-9 items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--void)_80%,transparent)] px-4 text-label font-medium text-ink ring-1 ring-[color-mix(in_srgb,var(--ink)_14%,transparent)] backdrop-blur transition-[background-color,transform] duration-200 hover:bg-[color-mix(in_srgb,var(--void)_92%,transparent)] active:scale-[0.97]"
      >
        <span
          aria-hidden
          className={`inline-block text-sm leading-none transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
        >
          +
        </span>
        {open ? 'Close' : 'How it works'}
      </button>
    </div>
  );
}
