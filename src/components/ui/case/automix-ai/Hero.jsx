'use client';

/**
 * Hero: AutoMix AI's hero figure, one ring, caught and notched, shallow
 * first and deeper only if it comes back.
 *
 * Two bands share one frequency axis (log, 150 Hz to 12 kHz, the detector's
 * band). Below, an illustrative spectrum of one mic: a voice, drawn as a row
 * of harmonic partners under a soft envelope. Above, the notch bank's
 * response: a flat line at 0 dB with gridlines every 3 dB down to the deepest
 * a notch may go. A ring is a lone needle that grows out of the voice; once
 * the detector calls it, a dashed marker drops through both bands at its
 * frequency, and a Q 30 notch, a needle of its own, cuts down into the
 * response band exactly there.
 *
 * The loop, one beat per phase, only while on screen: listen, a ring grows
 * (neutral, nobody has caught it yet), the detector calls it (it lights in
 * the accent), the notch engages at −6 dB and the ring falls, the ring comes
 * back, the notch deepens one 3 dB step and the ring stays down, then the
 * notch expires and the loop rests. A caption under the figure says what is
 * happening (aria-live). The ring frequency, the voice and the timing are
 * illustrative (the figure says so); every number drawn or written comes
 * from FLOW and FEATURES in src/data/studies/automix-ai.js.
 *
 * On first view the response band fades in and the spectrum sweeps in left
 * to right, like an analyser waking up. Reduced motion: the finished story,
 * still: the ring's peak as a dashed ghost, the first −6 dB notch as a dashed
 * ghost, the −9 dB notch that held drawn solid.
 *
 * Two fitted layouts, picked by a container query so text never lands under
 * 11px: 'wide' (560 units) from a 440px-wide container up, 'narrow' (380
 * units, the same figure with a tighter axis) below that.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { P, alpha } from '@/components/ui/case/tokens';
import { EASE_OUT } from '@/lib/motion';
import { FEATURES, FLOW } from '@/data/studies/automix-ai';

/* ── facts, read from the study data ───────────────────────────────────── */
const DETECT = FLOW.steps.find((s) => s.key === 'detect');
const NOTCH = FLOW.steps.find((s) => s.key === 'notch');
const DETECTOR = FEATURES.find((f) => f.key === 'detector');
const NOTCHES = FEATURES.find((f) => f.key === 'notches');

const find = (text, re) => text.match(re)?.slice(1) ?? [];
const num = (text, re) => Number(String(find(text, re)[0]).replace('−', '-'));
const fmt = (n) => `${n < 0 ? '−' : ''}${Math.abs(n)}`; // a true minus, as in the data

const BAND_TEXT = DETECT.facts.find((f) => /Hz to/.test(f));
const LO_HZ = num(BAND_TEXT, /(\d+) Hz to/); // 150
const HI_KHZ = num(BAND_TEXT, /to (\d+) kHz/); // 12
const HI_HZ = HI_KHZ * 1000;
const GROW_TEXT = DETECT.facts.find((f) => /per frame/.test(f));
const [GROW_MIN, GROW_MAX] = find(GROW_TEXT, /([\d.]+) to ([\d.]+) dB per frame/); // '0.2', '4.0'
const GROW_FRAMES = num(GROW_TEXT, /over (\d+) frames/); // 12
const Q = num(NOTCH.body, /Q=(\d+)/); // 30
const FIRST_DB = num(NOTCH.body, /engages at (−?\d+) dB/); // −6
const STEP_DB = num(NOTCH.body, /deepens by (−?\d+) dB/); // −3
const MAX_DB = num(NOTCH.body, /down to (−?\d+) dB/); // −18
const SECOND_DB = FIRST_DB + STEP_DB; // −9, the depth that holds in the loop
const EXPIRE_S = num(NOTCH.facts.find((f) => /expire/.test(f)), /after (\d+) s/); // 180
const ACCURACY_HZ = num(DETECTOR.stat.value, /(\d+) Hz/); // 3
const TEST_DBFS = num(DETECTOR.body, /reaches (−?\d+) dBFS/); // −20
const SHALLOW_FIRST = NOTCHES.title; // 'Shallow first, deeper only if needed'

/* ── the illustrative signal ───────────────────────────────────────────── */
const RING_HZ = 2630; // illustrative: inharmonic to every voice variant below
const RING_BW_HZ = 26; // the ring's line width, about one FFT bin
const VOICE_F0 = [200, 192, 208]; // the voice drifts a little between beats
const RING_DETECT_DB = -29; // where the detector calls it, under the test limit
const RING_RETURN_DB = -37; // the second, smaller growth
const RING_FLOOR_DB = -96; // below the plot: the ring is gone

/* ── geometry (viewBox units) ──────────────────────────────────────────── */
const PAD_X = 4;
const COL_W = 56; // right column: the response band's dB labels
const BAND_TAG_Y = 16;
const BAND_T = 36; // the 0 dB line
const BAND_DB = 3.6; // units per dB in the response band
const BAND_B = BAND_T - MAX_DB * BAND_DB; // the deepest notch
const PLOT_TAG_Y = BAND_B + 36;
const PLOT_T = PLOT_TAG_Y + 14; // −10 dBFS
const PLOT_H = 172;
const PLOT_B = PLOT_T + PLOT_H; // −90 dBFS
const TOP_DB = -10;
const BOT_DB = -90;
const AXIS_Y = PLOT_B + 21;
const VIEW_H = AXIS_Y + 8;
const NEEDLE_SPAN = 14; // half-width of the sampled window around the ring
const NEEDLE_STEP = 0.5;
const LABEL_GAP = 9; // needle to its label

const LAYOUTS = [
  { key: 'wide', viewW: 560, points: 240, hide: '@max-[440px]:hidden' },
  { key: 'narrow', viewW: 380, points: 170, hide: '@min-[440px]:hidden' },
].map((l) => {
  const left = PAD_X;
  const right = l.viewW - PAD_X - COL_W;
  const span = Math.log(HI_HZ / LO_HZ);
  const xOf = (f) => left + (Math.log(f / LO_HZ) / span) * (right - left);
  const fOf = (x) => LO_HZ * Math.exp(((x - left) / (right - left)) * span);
  return { ...l, left, right, xOf, fOf, ringX: xOf(RING_HZ) };
});

/* ── type (viewBox units; 14 lands at 11px in the smallest render) ─────── */
const T = { tag: 14, label: 15, small: 14 };
const TAG_TRACK = 0.12; // em, on the uppercase mono tags

/* ── motion ────────────────────────────────────────────────────────────── */
const IN_VIEW = { once: true, amount: 0.35 }; // the entrance
const ON_SCREEN = { amount: 0.35 }; // the loop runs only while visible
const SWEEP = { delay: 0.15, dur: 1.3 }; // the spectrum's entrance, left to right
const VOICE_T = { duration: 1.8, ease: 'easeInOut' };
const NOTCH_T = { duration: 0.6, ease: EASE_OUT };
const FADE_T = { duration: 0.4, ease: EASE_OUT };
const RISE = (s) => ({ duration: s, ease: 'linear' }); // a ring grows linearly in dB
const FALL = { duration: 1.1, ease: EASE_OUT };

/**
 * One beat each. `ring` is the ring's peak (dBFS), `lit` whether the detector
 * has it, `notch` the notch depth (dB, 0 is off), `tag` the depth its label
 * shows (kept while a notch fades out), `v` the voice variant.
 */
const PHASES = [
  {
    key: 'listen',
    label: 'Listen',
    ms: 2600,
    ring: RING_FLOOR_DB,
    ringT: FALL,
    lit: false,
    notch: 0,
    tag: FIRST_DB,
    marker: false,
    v: 0,
    text: `Listening from ${LO_HZ} Hz to ${HI_KHZ} kHz. A voice arrives as a row of harmonic partners.`,
  },
  {
    key: 'grow',
    label: 'Grow',
    ms: 2600,
    ring: RING_DETECT_DB - 2,
    ringT: RISE(2.4),
    lit: false,
    notch: 0,
    tag: FIRST_DB,
    marker: false,
    v: 1,
    text: `A lone, inharmonic line keeps growing. The detector looks for ${GROW_MIN} to ${GROW_MAX} dB per frame over ${GROW_FRAMES} frames.`,
  },
  {
    key: 'detect',
    label: 'Detect',
    ms: 2000,
    ring: RING_DETECT_DB,
    ringT: RISE(0.5),
    lit: true,
    notch: 0,
    tag: FIRST_DB,
    marker: true,
    v: 1,
    text: `That is a ring. In the tests it is caught before ${fmt(TEST_DBFS)} dBFS and placed within ${ACCURACY_HZ} Hz.`,
  },
  {
    key: 'notch',
    label: 'Notch',
    ms: 2500,
    ring: RING_FLOOR_DB,
    ringT: FALL,
    lit: true,
    notch: FIRST_DB,
    tag: FIRST_DB,
    marker: true,
    v: 2,
    text: `A Q ${Q} notch engages at ${fmt(FIRST_DB)} dB on exactly that frequency, and the ring falls away.`,
  },
  {
    key: 'return',
    label: 'Return',
    ms: 2400,
    ring: RING_RETURN_DB,
    ringT: RISE(2.1),
    lit: true,
    notch: FIRST_DB,
    tag: FIRST_DB,
    marker: true,
    v: 0,
    text: `The ring comes back, so the notch deepens by ${Math.abs(STEP_DB)} dB.`,
  },
  {
    key: 'deepen',
    label: 'Deepen',
    ms: 2800,
    ring: RING_FLOOR_DB,
    ringT: FALL,
    lit: true,
    notch: SECOND_DB,
    tag: SECOND_DB,
    marker: true,
    v: 1,
    text: `At ${fmt(SECOND_DB)} dB it holds. ${SHALLOW_FIRST}, down to ${fmt(MAX_DB)} dB.`,
  },
  {
    key: 'expire',
    label: 'Expire',
    ms: 2400,
    ring: RING_FLOOR_DB,
    ringT: FALL,
    lit: false,
    notch: 0,
    tag: SECOND_DB,
    marker: false,
    v: 2,
    text: `Once the ring stops coming back, a live notch expires after ${EXPIRE_S} s.`,
  },
];

/** Reduced motion: the finished story, with ghosts of where it has been. */
const STILL = {
  key: 'still',
  label: 'Caught',
  ring: RING_FLOOR_DB,
  ringT: FALL,
  lit: true,
  notch: SECOND_DB,
  tag: SECOND_DB,
  marker: true,
  v: 0,
  text: `A ring caught and notched: ${fmt(FIRST_DB)} dB first, ${fmt(SECOND_DB)} dB when it came back, never deeper than ${fmt(MAX_DB)} dB. Illustrative spectrum.`,
};

const DESCRIPTION = `Illustrative spectrum of one microphone, ${LO_HZ} Hz to ${HI_KHZ} kHz, with the notch filter's response above it. A voice shows as a row of harmonic partners. A ring, a lone inharmonic line, grows out of it; the detector calls it, and a Q ${Q} notch engages at ${fmt(FIRST_DB)} dB at that frequency. When the ring comes back the notch deepens by ${Math.abs(STEP_DB)} dB to ${fmt(SECOND_DB)} dB and holds; notches go no deeper than ${fmt(MAX_DB)} dB, and a live notch expires after ${EXPIRE_S} s.`;

/* ── curves ────────────────────────────────────────────────────────────── */
const r1 = (n) => Math.round(n * 10) / 10;
const yOf = (db) => PLOT_T + ((TOP_DB - db) / (TOP_DB - BOT_DB)) * PLOT_H;
const clampY = (y) => Math.min(PLOT_B - 3, Math.max(PLOT_T, y));

/** A speech-like spectrum (dB): a soft envelope, harmonic partners of f0. */
function voiceDb(f, f0, i) {
  const lf = Math.log10(f);
  const bump = (hz, w, a) => a * Math.exp(-(((lf - Math.log10(hz)) / w) ** 2));
  const envelope =
    -47 +
    bump(500, 0.2, 7) +
    bump(1400, 0.16, 4) -
    18 * Math.max(0, lf - Math.log10(500)) -
    9 * Math.max(0, Math.log10(240) - lf) / 0.2;
  const k = f / f0;
  const d = Math.abs(k - Math.round(k));
  const partner = k < 0.6 ? 0 : Math.exp(-((d / 0.17) ** 2));
  const valley = 15 * Math.exp(-f / 1800) + 2;
  const grain = 0.9 * Math.sin(i * 2.17 + f0) * Math.sin(i * 0.53);
  return envelope - valley * (1 - partner) + grain;
}

function voicePath(layout, v) {
  const pts = Array.from({ length: layout.points }, (_, i) => {
    const x = layout.left + (i / (layout.points - 1)) * (layout.right - layout.left);
    return [r1(x), r1(clampY(yOf(voiceDb(layout.fOf(x), VOICE_F0[v], i))))];
  });
  const line = `M ${pts.map((p) => p.join(',')).join(' L ')}`;
  return { line, area: `${line} L ${layout.right},${PLOT_B} L ${layout.left},${PLOT_B} Z` };
}

/** Sample a needle around the ring's x: `yAt(f)` gives the curve. */
function needle(layout, yAt) {
  const pts = [];
  for (let dx = -NEEDLE_SPAN; dx <= NEEDLE_SPAN + 1e-6; dx += NEEDLE_STEP) {
    const x = layout.ringX + dx;
    pts.push([r1(x), r1(yAt(layout.fOf(x)))]);
  }
  return pts;
}

/** The ring: a lone line peaking at `peak` dBFS, its skirts well under the voice. */
function ringPath(layout, peak) {
  const pts = needle(layout, (f) => clampY(yOf(peak - 20 * Math.log10(1 + ((f - RING_HZ) / RING_BW_HZ) ** 2))));
  const line = `M ${pts.map((p) => p.join(',')).join(' L ')}`;
  const [x0] = pts[0];
  const [x1] = pts[pts.length - 1];
  return { line, area: `${line} L ${x1},${PLOT_B} L ${x0},${PLOT_B} Z`, tipY: r1(clampY(yOf(peak))) };
}

/** The notch bank's response: 0 dB, with a Q-wide dip of `depth` dB at the ring. */
function notchPath(layout, depth) {
  const gain = (f) => depth / (1 + (Q * (f / RING_HZ - RING_HZ / f)) ** 2);
  const pts = [[layout.left, BAND_T], ...needle(layout, (f) => BAND_T - gain(f) * BAND_DB), [layout.right, BAND_T]];
  const line = `M ${pts.map((p) => p.join(',')).join(' L ')}`;
  return { line, area: `${line} Z`, tipY: r1(BAND_T - depth * BAND_DB) };
}

const VOICES = LAYOUTS.map((l) => VOICE_F0.map((_, v) => voicePath(l, v)));
const GRID_DB = Array.from({ length: Math.round(MAX_DB / STEP_DB) + 1 }, (_, i) => i * STEP_DB); // 0, −3, … −18
const LABELLED_DB = new Set([0, FIRST_DB, 2 * FIRST_DB, MAX_DB]); // 0, −6, −12, −18

const KHZ = 1000;
const AXIS = [
  { f: LO_HZ, text: `${LO_HZ} Hz`, anchor: 'start' },
  { f: KHZ, text: '1 kHz', anchor: 'middle' },
  { f: HI_HZ, text: `${HI_KHZ} kHz`, anchor: 'end' },
];

/* ── pieces ────────────────────────────────────────────────────────────── */

function Tag({ x, y, anchor = 'start', fill = P.inkSubtle, children }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className="font-mono"
      fontSize={T.tag}
      fontWeight="500"
      letterSpacing={T.tag * TAG_TRACK}
      fill={fill}
    >
      {children}
    </text>
  );
}

/** The notch bank's response band: gridlines every step, the dip, its label. */
function ResponseBand({ layout, phase, ghost }) {
  const { left, right, ringX } = layout;
  const dip = notchPath(layout, phase.notch);
  const on = phase.notch !== 0;
  const tipY = BAND_T - phase.tag * BAND_DB;
  return (
    <>
      <Tag x={left} y={BAND_TAG_Y}>{`NOTCH DEPTH, Q ${Q}`}</Tag>
      {GRID_DB.map((db) => {
        const y = r1(BAND_T - db * BAND_DB);
        const here = on && db === phase.notch;
        return (
          <g key={db}>
            {/* the 0 dB gridline is the response line itself */}
            {db !== 0 && (
              <line
                x1={left}
                x2={right}
                y1={y}
                y2={y}
                strokeWidth="1"
                strokeDasharray="2 4"
                style={{ stroke: here ? alpha(P.accent, 0.55) : P.line, transition: 'stroke .4s' }}
              />
            )}
            {LABELLED_DB.has(db) && (
              <text
                x={right + 10}
                y={y + 5}
                className="font-mono"
                fontSize={T.small}
                style={{ fill: here ? P.accent : P.inkSubtle, transition: 'fill .4s' }}
              >
                {db === MAX_DB ? `${fmt(db)} dB` : fmt(db)}
              </text>
            )}
          </g>
        );
      })}

      {ghost && (
        <path d={notchPath(layout, FIRST_DB).line} fill="none" stroke={alpha(P.accent, 0.5)} strokeWidth="1.25" strokeDasharray="3 3" />
      )}
      <motion.path
        initial={false}
        animate={{ d: dip.area }}
        transition={NOTCH_T}
        fill={alpha(P.accent, 0.16)}
        stroke="none"
      />
      <motion.path
        initial={false}
        animate={{ d: dip.line }}
        transition={NOTCH_T}
        fill="none"
        strokeWidth="1.75"
        strokeLinejoin="round"
        style={{ stroke: on ? P.accent : P.inkSubtle, transition: 'stroke .4s' }}
      />

      {/* the depth, beside the dip's tip */}
      <motion.g initial={false} animate={{ opacity: on ? 1 : 0, y: r1(tipY) }} transition={NOTCH_T}>
        <text x={ringX + LABEL_GAP} y={5} className="font-mono" fontSize={T.label} fontWeight="600" fill={P.accent}>
          {`${fmt(phase.tag)} dB`}
        </text>
      </motion.g>
    </>
  );
}

/** The spectrum: the voice, the ring growing out of it, the axis. */
function Spectrum({ layout, li, phase, ghost }) {
  const { left, right } = layout;
  const voice = VOICES[li][phase.v];
  const ring = ringPath(layout, phase.ring);
  const testY = r1(yOf(TEST_DBFS));
  const lineColor = phase.lit ? P.accent : P.ink;
  return (
    <>
      <Tag x={left} y={PLOT_TAG_Y}>ILLUSTRATIVE SPECTRUM</Tag>

      {/* the level the tests catch a ring under */}
      <line x1={left} x2={right} y1={testY} y2={testY} stroke={P.lineHi} strokeWidth="1" strokeDasharray="4 4" />
      <text x={left + 2} y={testY - 7} className="font-mono" fontSize={T.small} fill={P.inkSubtle}>
        {`${fmt(TEST_DBFS)} dBFS`}
      </text>

      {/* the ring, under the voice's solid fill so it grows out of it */}
      {ghost && (
        <path d={ringPath(layout, RING_DETECT_DB).line} fill="none" stroke={alpha(P.accent, 0.55)} strokeWidth="1.25" strokeDasharray="3 3" />
      )}
      <motion.path
        initial={false}
        animate={{ d: ring.line }}
        transition={phase.ringT}
        fill="none"
        strokeWidth="6"
        strokeLinejoin="round"
        style={{ stroke: alpha(P.accent, phase.lit ? 0.22 : 0), transition: 'stroke .4s' }}
      />
      <motion.path
        initial={false}
        animate={{ d: ring.area }}
        transition={phase.ringT}
        style={{ fill: alpha(lineColor, phase.lit ? 0.2 : 0.1), transition: 'fill .4s' }}
      />
      <motion.path
        initial={false}
        animate={{ d: ring.line }}
        transition={phase.ringT}
        fill="none"
        strokeWidth="1.75"
        strokeLinejoin="round"
        style={{ stroke: lineColor, transition: 'stroke .4s' }}
      />

      <motion.path
        initial={false}
        animate={{ d: voice.area }}
        transition={VOICE_T}
        fill={`color-mix(in srgb, ${P.ink} 7%, var(--void))`}
      />
      <motion.path
        initial={false}
        animate={{ d: voice.line }}
        transition={VOICE_T}
        fill="none"
        stroke={P.inkMuted}
        strokeWidth="1.25"
        strokeLinejoin="round"
      />

      {/* the detector's mark rides the ring's tip while it has it */}
      <motion.circle
        cx={r1(layout.ringX)}
        r="3.5"
        fill={P.accent}
        initial={false}
        animate={{ cy: ring.tipY, opacity: phase.lit && phase.ring > RING_FLOOR_DB ? 1 : 0 }}
        transition={{ cy: phase.ringT, opacity: FADE_T }}
      />

      <line x1={left} x2={right} y1={PLOT_B} y2={PLOT_B} stroke={P.lineHi} strokeWidth="1" />
      {AXIS.map((a) => (
        <line key={a.f} x1={r1(layout.xOf(a.f))} x2={r1(layout.xOf(a.f))} y1={PLOT_B} y2={PLOT_B + 5} stroke={P.lineHi} strokeWidth="1" />
      ))}
      {AXIS.map((a) => (
        <text key={a.text} x={r1(layout.xOf(a.f))} y={AXIS_Y} textAnchor={a.anchor} className="font-mono" fontSize={T.small} fill={P.inkSubtle}>
          {a.text}
        </text>
      ))}
    </>
  );
}

/** The detector's call: a marker through both bands at the ring, and its label. */
function Marker({ layout, phase }) {
  const { ringX } = layout;
  const x = r1(ringX);
  const labelY = r1(yOf(RING_DETECT_DB + 3));
  return (
    <motion.g initial={false} animate={{ opacity: phase.marker ? 1 : 0 }} transition={FADE_T}>
      <line x1={x} x2={x} y1={BAND_T - 8} y2={PLOT_B} stroke={alpha(P.accent, 0.55)} strokeWidth="1" strokeDasharray="2 3" />
      <rect x={x - 3.5} y={PLOT_B - 3.5} width="7" height="7" transform={`rotate(45 ${x} ${PLOT_B})`} fill={P.accent} />
      <Tag x={x + LABEL_GAP} y={labelY} fill={P.accent}>
        RING
      </Tag>
      <text x={x + LABEL_GAP} y={labelY + 18} className="font-sans" fontSize={T.small} fill={P.inkMuted}>
        {`within ${ACCURACY_HZ} Hz`}
      </text>
    </motion.g>
  );
}

/** One layout of the figure, as one SVG. */
function Figure({ layout, li, phase, shown, reduce, clipId }) {
  return (
    <svg
      viewBox={`0 0 ${layout.viewW} ${VIEW_H}`}
      width="100%"
      aria-hidden="true"
      className={`block h-auto w-full overflow-visible ${layout.hide}`}
    >
      <defs>
        <clipPath id={clipId}>
          {/* the entrance: the spectrum sweeps in left to right */}
          <motion.rect
            x={layout.left - 4}
            y={PLOT_TAG_Y - 20}
            height={VIEW_H}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: shown ? layout.viewW : 0 }}
            transition={reduce ? { duration: 0 } : { duration: SWEEP.dur, ease: EASE_OUT, delay: SWEEP.delay }}
          />
        </clipPath>
      </defs>

      <motion.g
        initial={reduce ? false : { opacity: 0, y: -6 }}
        animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
        transition={reduce ? { duration: 0 } : { duration: 0.7, ease: EASE_OUT }}
      >
        <ResponseBand layout={layout} phase={phase} ghost={reduce} />
      </motion.g>

      <g clipPath={`url(#${clipId})`}>
        <Spectrum layout={layout} li={li} phase={phase} ghost={reduce} />
      </g>

      <Marker layout={layout} phase={phase} />
    </svg>
  );
}

/* ── the figure ────────────────────────────────────────────────────────── */

export default function Hero({ accent = P.accent }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const entered = useInView(ref, IN_VIEW);
  const onScreen = useInView(ref, ON_SCREEN);
  const [beat, setBeat] = useState(0);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const running = !reduce && entered && onScreen;

  // one phase per beat, only while on screen; setState only in the timer
  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(() => setBeat((b) => (b + 1) % PHASES.length), PHASES[beat].ms);
    return () => clearTimeout(t);
  }, [running, beat]);

  const phase = reduce ? STILL : PHASES[beat];
  const shown = reduce || entered;

  return (
    <div ref={ref} className="@container mx-auto w-full max-w-[560px]" style={accent === P.accent ? undefined : { '--accent': accent }}>
      <p className="sr-only">{DESCRIPTION}</p>
      {LAYOUTS.map((layout, li) => (
        <Figure key={layout.key} layout={layout} li={li} phase={phase} shown={shown} reduce={reduce} clipId={`${id}-${layout.key}`} />
      ))}

      <div className="mt-5 min-h-[3.75rem] text-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {shown && (
            <motion.p
              key={phase.key}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="mx-auto max-w-[46ch] text-sm leading-snug text-ink-muted"
            >
              <span className="font-mono text-label uppercase" style={{ color: P.accent }}>
                {phase.label}
              </span>{' '}
              {phase.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
