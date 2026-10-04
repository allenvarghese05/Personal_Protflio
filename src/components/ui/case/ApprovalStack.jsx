'use client';

/**
 * ApprovalStack — the five-person approval chain as an isometric stack of
 * slabs: 01 Pastor (widest, the grassroots) at the bottom, narrowing up to
 * 05 Finance at the top. An application enters at the bottom pill; funds
 * release at the apex. Each tier is labelled with its number + role, what it
 * does, and how many people sit on it (all from ROLES).
 *
 * Props
 *   active    tier indexes (0–4) to light — their front edge, connector and
 *             label turn amber; every other tier dims while anything is lit.
 *             Changes cross-fade (CSS transitions).
 *   climbing  hero mode — an amber token appears on the applicant level
 *             (Pastor and Division Leader answer together: either one applies,
 *             neither reviews), then climbs straight to HQ, the President and
 *             Finance, each slab's edge answering as it arrives, and the apex
 *             tick confirms. Loops gently while the stack is on screen; absent
 *             entirely under reduced motion.
 *   className extra classes on the wrapper (width 100%, capped at 560px).
 *
 * Two fitted layouts, picked by a container query so text never drops under
 * 11px: 'split' (labels alternate left / right — the signature look) from a
 * 440px-wide container up, and 'column' (stack left, labels in one column on
 * the right) below that. Geometry is fitted, not hand-placed: each label's
 * width is estimated from ROLES, the slabs take whatever room the labels
 * leave, and the viewBox grows rather than ever clipping. On first view the
 * slabs settle into place bottom-up; with reduced motion the finished stack
 * is simply there.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { ACTORS, ROLES } from '@/data/studies/iet';

/* ── geometry (viewBox units) ──────────────────────────────────────────── */
const VR = 0.32; // iso vertical:horizontal ratio — flat, so slabs read as platforms
const DEPTH = 12; // slab thickness
const STEP_W = 15; // each tier's half-width is this much narrower than the one below
const MAX_BASE_W = 130; // cap on the bottom slab's half-width
const MIN_BASE_W = 60; // floor — below this the viewBox grows instead
const MIN_TOP_W = 26; // the apex slab never shrinks past this
const LEADER = 16; // slab corner → label text (split); stack → label column (column)
const PAD_X = 4;
const PAD_Y = 8;
const STEM = 30; // top slab → the funds-released tick
const TICK_R = 9;
const RING_MAX_R = 16; // the tick's confirm ring at full size
const PILL_GAP = 18; // bottom slab → application pill
const PILL_H = 24;
const PILL_PAD_X = 14;
const TOKEN_R = 4.5;
const TOKEN_HALO_R = 9;

// Fitted widths: 12.5u text lands at 11px on a 420px (split) / 300px (column) render
const SPLIT = { key: 'split', viewW: 476, pitch: 56 };
const COLUMN = { key: 'column', viewW: 340, pitch: 62 }; // one label per row → more pitch

/* ── type (viewBox units) ──────────────────────────────────────────────── */
const T = { num: 13, role: 14.5, verb: 12.5, pop: 12.5, tag: 12.5 };
const LINE = 17.5; // label line pitch
const ROLE_DY = 5; // role baseline below the connector, so the line meets its middle
const NUM_GAP = 7; // tier number → role
const TAG_TRACK_EM = 0.14; // tracking on the uppercase pill / apex tags
const MONO_EM = 0.6; // JetBrains Mono advance width
const SEMIBOLD = 1.04; // semibold runs a touch wider than the regular estimate
const FIT = 1.04; // safety on every width estimate (within ~2% of Inter; fallbacks run wider)
const PILL_TEXT = 'APPLICATION';
const APEX_TEXT = 'FUNDS RELEASED';

/* ── tone ──────────────────────────────────────────────────────────────── */
const DIM_OPACITY = 0.42; // un-lit tiers while something is active
const EDGE_W = 1.25;
const EDGE_W_LIT = 1.75;
const GLOW_W = 6;
const TRANSITION_MS = 320;
const CSS_EASE = `cubic-bezier(${EASE_OUT.join(',')})`;
const TRANSITION = ['opacity', 'stroke', 'stroke-width', 'fill']
  .map((prop) => `${prop} ${TRANSITION_MS}ms ${CSS_EASE}`)
  .join(', ');

/* ── motion (seconds) ──────────────────────────────────────────────────── */
const IN_VIEW = { once: true, amount: 0.3 }; // the entrance: plays once
const ON_SCREEN = { amount: 0.3 }; // the climb loop: runs only while visible
const ENTER = { first: 0.1, step: 0.09, dur: 0.7, drop: 10, spread: 7, labelLag: 0.14, labelSlide: 10 };
const ENTER_END = ENTER.first + (ROLES.length - 1) * ENTER.step + ENTER.dur; // build-in done
const CLIMB = { fadeIn: 0.3, hold: 0.34, move: 0.5, stem: 0.5, merge: 0.2, settle: 1, rest: 1.2 };
const PULSE = { lead: 0.06, peak: 0.1, tail: 0.85 }; // a slab's answer to the token

/* ── text width estimates ──────────────────────────────────────────────── */
// Rough Inter advance widths (em) by character class — enough to fit labels.
const NARROW = new Set("iljI.,:;!|'·");
const SLIM = new Set('frt()-/');
const WIDE = new Set('mwMW');

function sansEm(ch) {
  if (ch === ' ') return 0.28;
  if (NARROW.has(ch)) return 0.27;
  if (SLIM.has(ch)) return 0.36;
  if (WIDE.has(ch)) return 0.84;
  if (ch >= 'A' && ch <= 'Z') return 0.68;
  return 0.57;
}

const sansWidth = (text, size, weight = 1) =>
  [...text].reduce((w, ch) => w + sansEm(ch), 0) * size * weight;

const monoWidth = (text, size, trackEm = 0) => text.length * size * (MONO_EM + trackEm);

const r2 = (n) => Math.round(n * 100) / 100;

const TOP = ROLES.length - 1;

// The applicant level: Pastor and Division Leader (for their division) both
// apply; neither reviews. Every tier up to this one is a single entry level.
const ENTRY_TOP = Math.min(TOP, Math.max(0, ...ACTORS.applicant.tiers));

/** Widest line of each tier's label: number + role, verb, population. */
const LABEL_W = ROLES.map((r) =>
  FIT *
  Math.max(
    monoWidth(r.num, T.num) + NUM_GAP + sansWidth(r.role, T.role, SEMIBOLD),
    sansWidth(r.verb, T.verb),
    monoWidth(r.pop, T.pop),
  ),
);
const MAX_LABEL_W = Math.max(...LABEL_W);
const PILL_W = monoWidth(PILL_TEXT, T.tag, TAG_TRACK_EM) + 2 * PILL_PAD_X;

/* ── the climb, as one keyframe timeline ───────────────────────────────── */
// The token fades in on the applicant level — every slab there answers at
// once, since either applies and none reviews — holds, rises straight to HQ,
// … then up the stem into the tick, where it merges (fades) as the tick's
// ring answers. A short settle lets that ring finish before the loop rests
// and restarts.
function buildClimb(cys, apexY) {
  const start = cys[ENTRY_TOP];
  const frames = [{ t: 0, cy: start, o: 0 }];
  let t = CLIMB.fadeIn;
  const arrivals = cys.slice(0, ENTRY_TOP + 1).map(() => t);
  frames.push({ t, cy: start, o: 1 });
  for (let i = ENTRY_TOP + 1; i < cys.length; i += 1) {
    t += CLIMB.hold;
    frames.push({ t, cy: cys[i - 1], o: 1 });
    t += CLIMB.move;
    frames.push({ t, cy: cys[i], o: 1 });
    arrivals.push(t);
  }
  t += CLIMB.hold;
  frames.push({ t, cy: cys[TOP], o: 1 });
  t += CLIMB.stem;
  frames.push({ t, cy: apexY + TICK_R + TOKEN_R, o: 1 });
  t += CLIMB.merge;
  frames.push({ t, cy: apexY, o: 0 });
  const apexAt = t;
  t += CLIMB.settle;
  frames.push({ t, cy: apexY, o: 0 });
  const total = t;

  // Opacity keyframes for a flash peaking just after `at` seconds; times stay
  // strictly inside (0, 1) so the keyframes remain well-ordered.
  const frac = (s) => Math.min(Math.max(s / total, 0.001), 0.999);
  const pulseAt = (at) => ({
    times: [0, frac(at - PULSE.lead), frac(at + PULSE.peak), frac(at + PULSE.tail), 1],
    opacity: [0, 0, 1, 0, 0],
  });

  return {
    total,
    times: frames.map((f) => f.t / total),
    y: frames.map((f) => r2(f.cy - cys[0])),
    opacity: frames.map((f) => f.o),
    tierPulses: arrivals.map(pulseAt),
    apexPulse: pulseAt(apexAt),
  };
}

/* ── layout, fitted once per mode from ROLES ───────────────────────────── */
function fitLayout({ key, viewW: targetW, pitch }) {
  const split = key === 'split';

  // Largest bottom slab that lets every label fit inside the target width
  const fitted = split
    ? Math.min(...LABEL_W.map((lw, i) => targetW / 2 - PAD_X - LEADER - lw + i * STEP_W))
    : (targetW - 2 * PAD_X - LEADER - MAX_LABEL_W) / 2;
  const base = Math.max(MIN_BASE_W, Math.min(MAX_BASE_W, fitted));
  const step = Math.min(STEP_W, (base - MIN_TOP_W) / TOP);
  const halfW = ROLES.map((_, i) => base - i * step);

  // Width actually needed — never less than the target, never clipping
  const cx = split ? 0 : PAD_X + Math.max(base, PILL_W / 2); // split is re-centred below
  const column = cx + base + LEADER; // label column (column mode)
  const needW = split
    ? 2 * (Math.max(...halfW.map((w, i) => w + LEADER + LABEL_W[i])) + PAD_X)
    : Math.max(column + MAX_LABEL_W, cx + PILL_W / 2) + PAD_X;
  const viewW = r2(Math.max(targetW, needW));
  const CX = r2(split ? viewW / 2 : cx);

  const apexY = PAD_Y + RING_MAX_R;
  const topCy = apexY + STEM + halfW[TOP] * VR;
  const cys = ROLES.map((_, i) => topCy + (TOP - i) * pitch);
  const pillY = cys[0] + halfW[0] * VR + DEPTH + PILL_GAP;
  const labelBottom = cys[0] + ROLE_DY + 2 * LINE + 5; // pop-line descenders
  const viewH = r2(Math.max(pillY + PILL_H, labelBottom) + PAD_Y);

  // Every shape for one tier. Split: even tiers label left, odd right.
  const tiers = ROLES.map((role, i) => {
    const w = halfW[i];
    const cy = r2(cys[i]);
    const vy = w * VR;
    const L = r2(CX - w);
    const R = r2(CX + w);
    const front = r2(cy + vy);
    const left = split && i % 2 === 0;
    const dir = left ? -1 : 1;
    const edgeX = left ? L : R;
    const labelX = r2(split ? edgeX + dir * LEADER : column);
    return {
      ...role,
      i,
      cy,
      top: `${L},${cy} ${CX},${r2(cy - vy)} ${R},${cy} ${CX},${front}`,
      leftFace: `${L},${cy} ${CX},${front} ${CX},${r2(front + DEPTH)} ${L},${r2(cy + DEPTH)}`,
      rightFace: `${CX},${front} ${R},${cy} ${R},${r2(cy + DEPTH)} ${CX},${r2(front + DEPTH)}`,
      edge: `M ${L},${cy} L ${CX},${front} L ${R},${cy}`,
      dir,
      edgeX,
      labelX,
      anchor: left ? 'end' : 'start',
      leadFrom: r2(edgeX + dir * 5),
      leadTo: r2(labelX - dir * 4),
    };
  });

  return {
    key,
    viewW,
    viewH,
    CX,
    apexY,
    pillY: r2(pillY),
    inY: r2(cys[0] + halfW[0] * VR + DEPTH), // bottom slab's lowest point
    outY: r2(cys[TOP] - halfW[TOP] * VR), // top slab's highest point
    baseCy: r2(cys[0]),
    tiers,
    climb: buildClimb(cys, apexY),
  };
}

// `hide` is the container query that takes each layout out of the page: the
// split layout needs a 440px-wide wrapper to keep its text at 11px or more.
const LAYOUTS = [
  { ...fitLayout(SPLIT), hide: '@max-[440px]:hidden' },
  { ...fitLayout(COLUMN), hide: '@min-[440px]:hidden' },
];

const loopTransition = (climb, times, ease = 'easeInOut') => ({
  duration: climb.total,
  times,
  ease,
  repeat: Infinity,
  repeatDelay: CLIMB.rest,
  delay: ENTER_END,
});

/* ── a11y ──────────────────────────────────────────────────────────────── */
const roleLine = (r) => `${r.num} ${r.role}, ${r.verb} (${r.pop})`;
// the applicant level is one step, not a hand-off: either role applies
const ENTRY_TEXT = ROLES.slice(0, ENTRY_TOP + 1).map(roleLine).join(', or ');
const UP_TEXT = ROLES.slice(ENTRY_TOP + 1).map(roleLine).join('; ');
const CHAIN_TEXT = `Approval chain, bottom to top. An application comes from the bottom level — ${ENTRY_TEXT} — and goes straight up: ${UP_TEXT}. Funds are released at the top.`;

function describe(lit) {
  const on = ROLES.filter((_, i) => lit.has(i)).map((r) => r.role);
  const focus = on.length ? ` Highlighted: ${on.join(' and ')}.` : '';
  return `${CHAIN_TEXT}${focus}`;
}

/* ── pieces ────────────────────────────────────────────────────────────── */

function Slab({ tier, lit, pulse }) {
  return (
    <>
      <polygon points={tier.leftFace} fill={P.surface2} />
      <polygon points={tier.rightFace} fill={P.surface} />
      <polygon points={tier.top} fill={P.raised} stroke={P.lineHi} strokeWidth="0.75" strokeLinejoin="round" />
      {/* faint amber wash on a lit slab's top face */}
      <polygon
        points={tier.top}
        fill={alpha(P.accent, 0.07)}
        style={{ opacity: lit ? 1 : 0, transition: TRANSITION }}
      />
      {/* soft halo under the front edge — a lit slab only, very quiet */}
      <path
        d={tier.edge}
        fill="none"
        stroke={alpha(P.accent, 0.2)}
        strokeWidth={GLOW_W}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: lit ? 1 : 0, transition: TRANSITION }}
      />
      <path
        d={tier.edge}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          stroke: lit ? P.accent : P.accentLo,
          strokeWidth: lit ? EDGE_W_LIT : EDGE_W,
          transition: TRANSITION,
        }}
      />
      {/* climbing: the edge answers as the token arrives */}
      {pulse && (
        <motion.path
          d={tier.edge}
          fill="none"
          stroke={P.accentHi}
          strokeWidth={EDGE_W_LIT}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: pulse.opacity }}
          transition={pulse.transition}
        />
      )}
    </>
  );
}

function Label({ tier, lit }) {
  const { labelX, cy, anchor } = tier;
  return (
    <>
      <line
        x1={tier.leadFrom}
        y1={cy}
        x2={tier.leadTo}
        y2={cy}
        strokeWidth="1"
        style={{ stroke: lit ? alpha(P.accent, 0.7) : P.lineHi, transition: TRANSITION }}
      />
      <rect
        x={tier.edgeX - 3}
        y={cy - 3}
        width="6"
        height="6"
        transform={`rotate(45 ${tier.edgeX} ${cy})`}
        style={{ fill: lit ? P.accent : P.accentLo, transition: TRANSITION }}
      />
      <text x={labelX} y={cy + ROLE_DY} textAnchor={anchor}>
        <tspan className="font-mono" fontSize={T.num} fontWeight="600" fill={P.accent}>
          {tier.num}
        </tspan>
        <tspan
          className="font-sans"
          dx={NUM_GAP}
          fontSize={T.role}
          fontWeight="600"
          style={{ fill: lit ? P.accentHi : P.ink, transition: TRANSITION }}
        >
          {tier.role}
        </tspan>
      </text>
      <text
        x={labelX}
        y={cy + ROLE_DY + LINE}
        textAnchor={anchor}
        className="font-sans"
        fontSize={T.verb}
        style={{ fill: lit ? P.ink : P.inkMuted, transition: TRANSITION }}
      >
        {tier.verb}
      </text>
      <text
        x={labelX}
        y={cy + ROLE_DY + 2 * LINE}
        textAnchor={anchor}
        className="font-mono"
        fontSize={T.pop}
        fill={P.inkSubtle}
      >
        {tier.pop}
      </text>
    </>
  );
}

/** Tracked uppercase mono tag — the pill text and the apex label. */
function Tag({ x, y, anchor = 'start', fill, children }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className="font-mono"
      fontSize={T.tag}
      fontWeight="500"
      letterSpacing={T.tag * TAG_TRACK_EM}
      fill={fill}
    >
      {children}
    </text>
  );
}

/** Jade disc + check at the apex, with the tag to its right. */
function Apex({ layout, ring }) {
  const { CX, apexY } = layout;
  return (
    <>
      {ring && (
        <motion.circle
          cx={CX}
          cy={apexY}
          fill="none"
          stroke={P.jade}
          strokeWidth="1"
          initial={{ opacity: 0, r: TICK_R }}
          animate={{ opacity: ring.opacity, r: [TICK_R, TICK_R, TICK_R, RING_MAX_R, RING_MAX_R] }}
          transition={ring.transition}
        />
      )}
      <circle cx={CX} cy={apexY} r={TICK_R} fill={P.surface2} stroke={P.jade} strokeWidth="1.25" />
      <path
        d={`M ${CX - 3.8},${apexY + 0.2} L ${CX - 1},${apexY + 3} L ${CX + 4},${apexY - 2.8}`}
        fill="none"
        stroke={P.jade}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Tag x={CX + TICK_R + 9} y={apexY + 4.4} fill={P.jade}>
        {APEX_TEXT}
      </Tag>
    </>
  );
}

/** Where an application comes in: an amber pill, dashed into the bottom slab. */
function Entry({ layout }) {
  const { CX, pillY, inY } = layout;
  return (
    <>
      <line
        x1={CX}
        y1={pillY}
        x2={CX}
        y2={inY}
        stroke={alpha(P.accent, 0.5)}
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      <rect
        x={r2(CX - PILL_W / 2)}
        y={pillY}
        width={r2(PILL_W)}
        height={PILL_H}
        rx={PILL_H / 2}
        fill={P.surface2}
        stroke={alpha(P.accent, 0.6)}
        strokeWidth="1"
      />
      {/* tracking adds trailing space after the last glyph — nudge to re-centre */}
      <Tag x={r2(CX + (T.tag * TAG_TRACK_EM) / 2)} y={r2(pillY + PILL_H / 2 + 4.4)} anchor="middle" fill={P.accent}>
        {PILL_TEXT}
      </Tag>
    </>
  );
}

/** The token: a small amber disc with a soft halo, climbing the centre line. */
function Token({ layout }) {
  const { CX, baseCy, climb } = layout;
  return (
    <motion.g
      initial={{ opacity: 0, y: climb.y[0] }}
      animate={{ opacity: climb.opacity, y: climb.y }}
      transition={loopTransition(climb, climb.times)}
    >
      <circle cx={CX} cy={baseCy} r={TOKEN_HALO_R} fill={alpha(P.accent, 0.18)} />
      <circle cx={CX} cy={baseCy} r={TOKEN_R} fill={P.accent} />
    </motion.g>
  );
}

/** One layout of the stack, as one SVG. Animates only once it is on screen. */
function StackSvg({ layout, lit, climbing }) {
  const ref = useRef(null);
  const inView = useInView(ref, IN_VIEW);
  // not latched: scrolled away (or hidden by the container query) the loop
  // unmounts; back on screen it restarts from the bottom
  const onScreen = useInView(ref, ON_SCREEN);
  const reduce = useReducedMotion();
  const shown = reduce || inView;
  const animateClimb = climbing && !reduce && onScreen;
  const anyLit = lit.size > 0;
  const { climb } = layout;

  // entrance: slabs settle into place bottom-up, labels slide in from outside
  const enter = (delay, from) => ({
    initial: reduce ? false : { opacity: 0, ...from },
    animate: shown ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...from },
    transition: { duration: ENTER.dur, ease: EASE_OUT, delay },
  });

  const pulseFor = (keys) =>
    animateClimb && {
      opacity: keys.opacity,
      transition: loopTransition(climb, keys.times, 'easeOut'),
    };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${layout.viewW} ${layout.viewH}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={describe(lit)}
      className={`block h-auto w-full ${layout.hide}`}
    >
      <motion.g {...enter(0, {})}>
        <Entry layout={layout} />
        {/* the way out — top slab up to the tick */}
        <line
          x1={layout.CX}
          y1={layout.outY}
          x2={layout.CX}
          y2={layout.apexY + TICK_R}
          stroke={alpha(P.jade, 0.55)}
          strokeWidth="1"
        />
      </motion.g>

      {layout.tiers.map((tier) => {
        const isLit = lit.has(tier.i);
        const slabDelay = ENTER.first + tier.i * ENTER.step;
        return (
          <g
            key={tier.key}
            style={{ opacity: anyLit && !isLit ? DIM_OPACITY : 1, transition: TRANSITION }}
          >
            <motion.g {...enter(slabDelay, { y: -(ENTER.drop + tier.i * ENTER.spread) })}>
              <Slab tier={tier} lit={isLit} pulse={pulseFor(climb.tierPulses[tier.i])} />
            </motion.g>
            <motion.g {...enter(slabDelay + ENTER.labelLag, { x: tier.dir * ENTER.labelSlide })}>
              <Label tier={tier} lit={isLit} />
            </motion.g>
          </g>
        );
      })}

      <motion.g {...enter(ENTER.first + ROLES.length * ENTER.step, { y: 6 })}>
        <Apex
          layout={layout}
          ring={pulseFor({ ...climb.apexPulse, opacity: climb.apexPulse.opacity.map((o) => o * 0.7) })}
        />
      </motion.g>

      {animateClimb && <Token layout={layout} />}
    </svg>
  );
}

/* ── the stack ─────────────────────────────────────────────────────────── */

export default function ApprovalStack({ active = [], climbing = false, className = '' }) {
  const lit = new Set(active.filter((i) => Number.isInteger(i) && i >= 0 && i <= TOP));
  return (
    // @container: each layout shows or hides itself by the wrapper's width
    <div className={`@container mx-auto w-full max-w-[560px] ${className}`}>
      {LAYOUTS.map((layout) => (
        <StackSvg key={layout.key} layout={layout} lit={lit} climbing={climbing} />
      ))}
    </div>
  );
}
