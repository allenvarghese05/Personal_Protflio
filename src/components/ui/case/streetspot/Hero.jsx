'use client';

/**
 * StreetSpot hero: a quiet street map around one driver, filling up.
 *
 * A tilted (2:1) city grid fades out from the driver, with the app's 1,000 m
 * "nearby" circle drawn on the ground. Under the map, a report's points add
 * up from their parts, the way the report screen previews them: base 10,
 * +5 metered, +3 a restriction, +2 notes. Each sample report is described
 * first (its parts light one by one, the total counts up), then sent: a pin
 * drops onto its street and, if it lies inside the circle, the "available
 * within 1 km" count in the corner goes up. The third report lands outside
 * the circle, so it is on the map but not in the count. Last, the driver
 * claims the nearest spot: its pin turns grey (the app's red for claimed is
 * kept neutral here, red is reserved for failures), it leaves the count, and
 * the caption quotes the app's 5-minute alert (which no timer enforces yet).
 *
 * Facts (src/data/studies/streetspot.js and src/data/projects/streetspot.js):
 * the 1,000 m radius (FLOW 'see', FEATURES 'radius'), the points rules
 * (DECISIONS 'reward', FEATURES 'points', metric "10-20 points per report"),
 * the spot types and restrictions (FLOW 'report'), the statuses available /
 * claimed (FLOW 'claim'), the server broadcast (FLOW 'sync'), and the quoted
 * app strings. The three reports, their places and the street grid are
 * illustrative, labelled "sample", and consistent with the rules.
 *
 * Motion: on first view the city fades in from the driver outward and the
 * circle opens; the reports then loop one beat at a time on timers, only
 * while the figure is on screen. Reduced motion: the finished state, still
 * (three pins placed, one claimed, the 20-point report added up). Two fitted
 * layouts by container query keep SVG text at 11px or more on desktop and
 * never under 10px on a phone: 'wide' from a 440px container up, 'compact'
 * below.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { P, alpha } from '@/components/ui/case/tokens';
import { EASE_OUT } from '@/lib/motion';

/* ── the rules (src/data/studies/streetspot.js) ────────────────────────── */
const RADIUS_M = 1000; // FLOW 'see': "Radius 1,000 m", Haversine distance
const RADIUS_TEXT = '1,000 m';
// DECISIONS 'reward' / SpotReportScreen.js calculatePoints
const RULES = [
  { key: 'base', label: 'base', pts: 10, applies: () => true },
  { key: 'metered', label: 'metered', pts: 5, applies: (r) => r.type === 'metered' },
  { key: 'restriction', label: 'restriction', pts: 3, applies: (r) => r.restrictions.length > 0 },
  { key: 'notes', label: 'notes', pts: 2, applies: (r) => r.notes },
];
const points = (r, upTo = RULES.length) =>
  RULES.slice(0, upTo).reduce((sum, rule) => sum + (rule.applies(r) ? rule.pts : 0), 0);

/* ── the sample reports (illustrative; types and restrictions from FLOW) ─ */
// u, v: metres east / south of the driver along the street grid. Each sits on
// a street; distance is straight-line, as Haversine is at this scale.
const REPORTS = [
  { key: 'a', u: -500, v: 400, type: 'street', restrictions: [], notes: true, says: 'a street spot, with notes' },
  {
    key: 'b',
    u: 250,
    v: -500,
    type: 'metered',
    restrictions: ['time limit'],
    notes: true,
    says: 'a metered spot with a time limit, and notes',
  },
  {
    key: 'c',
    u: 1250,
    v: 700,
    type: 'residential',
    restrictions: ['permit'],
    notes: false,
    says: 'a residential spot with a permit restriction, no notes',
  },
].map((r) => ({ ...r, inside: Math.hypot(r.u, r.v) <= RADIUS_M, pts: points(r) }));
const CLAIM = 1; // the driver claims the nearest spot, report b

const availableNearby = (placed, claimed) =>
  REPORTS.slice(0, placed).filter((r, i) => r.inside && !(claimed && i === CLAIM)).length;

/* ── the loop, as a script of beats ────────────────────────────────────── */
const EMPTY_MS = 2200; // also covers the entrance on first view
const LEAD_MS = 700; // a report's tag appears before its parts resolve
const TERM_MS = 500; // each part of the points
const TOTAL_MS = 1200; // the finished total holds before sending
const SHARE_MS = 2300; // the pin drops and the count answers
const CLAIM_MS = 3600;

const EMPTY_CAPTION = 'A crowdsourced map stays empty until drivers report the spots they leave.';

function shareCaption(k) {
  const r = REPORTS[k];
  if (!r.inside) return 'Outside the 1 km circle by Haversine distance: on every map, but not in the nearby count.';
  const n = availableNearby(k + 1, false);
  return `The server broadcasts it to every phone. It is inside 1 km, so the nearby count goes to ${n}.`;
}

function buildScript() {
  const beats = [{ report: -1, terms: 0, placed: 0, claimed: false, ms: EMPTY_MS, caption: EMPTY_CAPTION }];
  REPORTS.forEach((r, k) => {
    const caption = `Sample report: ${r.says}. The app shows “You’ll earn ${r.pts} points!” before it is sent.`;
    for (let t = 0; t <= RULES.length; t += 1) {
      const ms = t === 0 ? LEAD_MS : t === RULES.length ? TOTAL_MS : TERM_MS;
      beats.push({ report: k, terms: t, placed: k, claimed: false, ms, caption });
    }
    beats.push({ report: k, terms: RULES.length, placed: k + 1, claimed: false, ms: SHARE_MS, caption: shareCaption(k) });
  });
  beats.push({
    report: REPORTS.length - 1,
    terms: RULES.length,
    placed: REPORTS.length,
    claimed: true,
    ms: CLAIM_MS,
    caption: '“Claim This Spot” marks it claimed, so it leaves the available count. The alert says “You have 5 minutes to arrive”, but no timer holds it yet.',
  });
  return beats;
}
const SCRIPT = buildScript();

// Reduced motion: everything placed, the nearest spot claimed, the
// 20-point report added up.
const STATIC = {
  report: CLAIM,
  terms: RULES.length,
  placed: REPORTS.length,
  claimed: true,
  caption: `Three sample reports: two inside 1 km, one outside, and the nearest claimed. Each earns ${RULES[0].pts} to ${RULES.reduce((s, r) => s + r.pts, 0)} points, weighted to detail.`,
};

/* ── geometry (viewBox units) ──────────────────────────────────────────── */
const VIEW_M = 1650; // the city fades out by this distance from the driver
const FADE_FROM_M = 950; // full strength inside this
const BLOCK_M = 250; // illustrative block pitch
const STREET_M = 44; // street width between blocks
const BLOCK_ALPHA = 0.085;
const RING_M = 300; // blocks enter in rings of this width, driver outward
const PAD = 8;
const PIN_H = 26; // pin head top above its ground point
const HEAD_Y = -19;
const HEAD_R = 7;
const PIN_PATH = `M0,0 C-2,-6 -${HEAD_R},-11 -${HEAD_R},${HEAD_Y} A${HEAD_R},${HEAD_R} 0 1 1 ${HEAD_R},${HEAD_Y} C${HEAD_R},-11 2,-6 0,0 Z`;
const RIM_GAP = 6;

// groundRx: half-width of the visible city; text sizes keep 11px+ at the
// smallest desktop render (wide from 440px) and 10px+ on a 280px phone.
const LAYOUT_SPECS = [
  { key: 'wide', viewW: 480, groundRx: 200, text: 13, small: 12, big: 30, hide: '@max-[440px]:hidden' },
  { key: 'compact', viewW: 360, groundRx: 160, text: 14, small: 13, big: 30, hide: '@min-[440px]:hidden' },
];

const r2 = (n) => Math.round(n * 100) / 100;

function fitLayout(spec) {
  const S = spec.groundRx / (Math.SQRT2 * VIEW_M); // metres to units
  const groundRy = spec.groundRx / 2;
  const cx = spec.viewW / 2;
  const cy = PAD + PIN_H + groundRy;
  const viewH = r2(cy + groundRy + PAD);
  const at = (u, v) => ({ x: r2(cx + (u - v) * S), y: r2(cy + ((u + v) * S) / 2) });

  // blocks, grouped in rings so the city can fade in from the driver outward
  const n = Math.ceil(VIEW_M / BLOCK_M);
  const rings = [];
  for (let i = -n; i < n; i += 1) {
    for (let j = -n; j < n; j += 1) {
      const d = Math.hypot((i + 0.5) * BLOCK_M, (j + 0.5) * BLOCK_M);
      const strength = Math.min(1, Math.max(0, (VIEW_M - d) / (VIEW_M - FADE_FROM_M)));
      if (strength < 0.04) continue;
      const u0 = i * BLOCK_M + STREET_M / 2;
      const u1 = (i + 1) * BLOCK_M - STREET_M / 2;
      const v0 = j * BLOCK_M + STREET_M / 2;
      const v1 = (j + 1) * BLOCK_M - STREET_M / 2;
      const pts = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)].map((p) => `${p.x},${p.y}`).join(' ');
      const ring = Math.floor(d / RING_M);
      (rings[ring] ||= []).push({ key: `${i}:${j}`, pts, a: r2(BLOCK_ALPHA * strength) });
    }
  }

  const rx = r2(Math.SQRT2 * S * RADIUS_M);
  return {
    ...spec,
    viewH,
    cx,
    cy,
    rx,
    ry: r2(rx / 2),
    rings: rings.filter(Boolean),
    pins: REPORTS.map((r) => ({ ...r, ...at(r.u, r.v) })),
  };
}
const LAYOUTS = LAYOUT_SPECS.map(fitLayout);

/* ── tone and motion ───────────────────────────────────────────────────── */
const mix = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, var(--void))`;
const CLAIMED_FILL = mix(P.inkSubtle, 45);
const FADE = 'fill .35s, stroke .35s, opacity .35s, color .35s';
const ENTER = { ringStep: 0.08, dur: 0.7, circleAt: 0.35, labelsAt: 0.7 };
const IN_VIEW = { once: true, amount: 0.3 };
const ON_SCREEN = { amount: 0.3 };

const A11Y_TEXT = `An illustration with sample reports. A street map around a driver, with the ${RADIUS_TEXT} nearby circle. Drivers report spots: a street spot with notes earns ${REPORTS[0].pts} points, a metered spot with a time limit and notes earns ${REPORTS[1].pts}, and a residential spot with a permit restriction earns ${REPORTS[2].pts}. Points are a base ${RULES[0].pts}, plus ${RULES[1].pts} for a metered spot, ${RULES[2].pts} for a restriction and ${RULES[3].pts} for notes. Two spots fall inside the circle and count as available nearby; the third is outside. The driver claims the nearest one, which leaves the count.`;

/* ── pieces ────────────────────────────────────────────────────────────── */

/** One reported spot. Drops in with a ripple and its points on mount. */
function Pin({ pin, claimed, reduce, accent, L }) {
  return (
    <motion.g initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
      <g transform={`translate(${pin.x} ${pin.y})`}>
        {!reduce && (
          <motion.ellipse
            cx="0"
            cy="0"
            fill="none"
            stroke={accent}
            strokeWidth="1"
            initial={{ rx: 3, ry: 1.5, opacity: 0.8 }}
            animate={{ rx: 26, ry: 13, opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        )}
        <ellipse cx="0" cy="0" rx="5" ry="2" fill={alpha(P.ink, 0.22)} />
        <motion.g
          initial={reduce ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          <path
            d={PIN_PATH}
            strokeWidth="1"
            strokeLinejoin="round"
            style={{ fill: claimed ? CLAIMED_FILL : accent, stroke: claimed ? P.inkSubtle : 'transparent', transition: FADE }}
          />
          <circle cx="0" cy={HEAD_Y} r="2.6" fill={P.void} style={{ opacity: claimed ? 0 : 1, transition: FADE }} />
          <path
            d={`M -3,${HEAD_Y} L -0.8,${HEAD_Y + 2.3} L 3.2,${HEAD_Y - 2.2}`}
            fill="none"
            stroke={P.ink}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: claimed ? 1 : 0, transition: FADE }}
          />
        </motion.g>
        {!reduce && (
          <motion.text
            x="0"
            y={HEAD_Y - HEAD_R - 6}
            textAnchor="middle"
            className="font-mono"
            fontSize={L.text}
            fontWeight="600"
            fill={accent}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: [0, -6, -10, -14] }}
            transition={{ duration: 1.9, times: [0, 0.15, 0.7, 1], delay: 0.35 }}
          >
            +{pin.pts}
          </motion.text>
        )}
        <AnimatePresence>
          {claimed && (
            <motion.g
              key="claimed"
              initial={reduce ? false : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <text
                x={HEAD_R + 5}
                y={HEAD_Y + 4}
                className="font-mono"
                fontSize={L.small}
                letterSpacing={L.small * 0.1}
                fill={P.inkMuted}
              >
                CLAIMED
              </text>
              {!reduce && (
                <motion.circle
                  cx="0"
                  cy={HEAD_Y}
                  fill="none"
                  stroke={P.inkSubtle}
                  strokeWidth="1"
                  initial={{ r: HEAD_R, opacity: 0.7 }}
                  animate={{ r: HEAD_R + 9, opacity: 0 }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              )}
            </motion.g>
          )}
        </AnimatePresence>
      </g>
    </motion.g>
  );
}

/** A small pin glyph for the legend. */
function LegendPin({ x, y, claimed, accent }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.62)`}>
      <path
        d={PIN_PATH}
        strokeWidth="1.4"
        style={{ fill: claimed ? CLAIMED_FILL : accent, stroke: claimed ? P.inkSubtle : 'transparent' }}
      />
    </g>
  );
}

/** One fitted layout of the map. */
function MapSvg({ L, beat, shown, reduce, accent }) {
  const count = availableNearby(beat.placed, beat.claimed);
  const enter = (delay, from = {}) => ({
    initial: reduce ? false : { opacity: 0, ...from },
    animate: shown ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...from },
    transition: { duration: ENTER.dur, ease: EASE_OUT, delay: reduce ? 0 : delay },
  });
  const legendY = L.viewH - PAD - 4;
  const lineH = L.text + 7;

  return (
    <svg
      viewBox={`0 0 ${L.viewW} ${L.viewH}`}
      width="100%"
      aria-hidden="true"
      className={`block h-auto w-full overflow-visible ${L.hide}`}
    >
      {/* the city, fading out from the driver */}
      {L.rings.map((ring, k) => (
        <motion.g key={k} {...enter(k * ENTER.ringStep)}>
          {ring.map((b) => (
            <polygon key={b.key} points={b.pts} fill={alpha(P.ink, b.a)} />
          ))}
        </motion.g>
      ))}

      {/* the nearby circle, 1,000 m on the ground */}
      <motion.g {...enter(ENTER.circleAt)}>
        <ellipse cx={L.cx} cy={L.cy} rx={L.rx} ry={L.ry} fill={alpha(accent, 0.07)} stroke={alpha(accent, 0.6)} strokeWidth="1.25" />
        <line
          x1={L.cx + 8}
          y1={L.cy}
          x2={L.cx + L.rx}
          y2={L.cy}
          stroke={alpha(accent, 0.5)}
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <circle cx={L.cx + L.rx} cy={L.cy} r="2" fill={accent} />
        <text x={L.cx + L.rx + RIM_GAP} y={L.cy + L.text * 0.35} className="font-mono" fontSize={L.text} fill={P.inkMuted}>
          {RADIUS_TEXT}
        </text>
      </motion.g>

      {/* the driver */}
      <motion.g {...enter(ENTER.circleAt, { y: 4 })}>
        <circle cx={L.cx} cy={L.cy} r="9" fill={alpha(P.ink, 0.12)} />
        <circle cx={L.cx} cy={L.cy} r="4.5" fill={P.ink} stroke={P.void} strokeWidth="1.5" />
        <text x={L.cx} y={L.cy + 9 + L.text + 2} textAnchor="middle" className="font-sans" fontSize={L.text} fill={P.inkMuted}>
          You
        </text>
      </motion.g>

      {/* the reported spots */}
      <AnimatePresence>
        {L.pins.slice(0, beat.placed).map((pin, i) => (
          <Pin key={pin.key} pin={pin} claimed={beat.claimed && i === CLAIM} reduce={reduce} accent={accent} L={L} />
        ))}
      </AnimatePresence>

      {/* the nearby count, top left */}
      <motion.g {...enter(ENTER.labelsAt, { x: -6 })}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.text
            key={count}
            x={PAD}
            y={PAD + L.big * 0.78}
            className="font-mono"
            fontSize={L.big}
            fontWeight="600"
            fill={accent}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {count}
          </motion.text>
        </AnimatePresence>
        <text x={PAD} y={PAD + L.big * 0.78 + lineH} className="font-sans" fontSize={L.text} fill={P.ink}>
          available
        </text>
        <text x={PAD} y={PAD + L.big * 0.78 + 2 * lineH} className="font-sans" fontSize={L.text} fill={P.inkMuted}>
          within 1 km
        </text>
      </motion.g>

      {/* the two statuses, bottom left */}
      <motion.g {...enter(ENTER.labelsAt, { x: -6 })}>
        <LegendPin x={PAD + 5} y={legendY - lineH + 4} accent={accent} />
        <text x={PAD + 15} y={legendY - lineH} className="font-sans" fontSize={L.text} fill={P.inkMuted}>
          available
        </text>
        <LegendPin x={PAD + 5} y={legendY + 4} claimed accent={accent} />
        <text x={PAD + 15} y={legendY} className="font-sans" fontSize={L.text} fill={P.inkMuted}>
          claimed
        </text>
      </motion.g>
    </svg>
  );
}

/** The points for the current report, added up from their parts. */
function Ledger({ beat, accent }) {
  const r = beat.report >= 0 ? REPORTS[beat.report] : null;
  const total = r ? points(r, beat.terms) : 0;
  const max = RULES.reduce((s, rule) => s + rule.pts, 0);
  const tag = r
    ? `Sample report ${beat.report + 1} of ${REPORTS.length} · ${r.type}`
    : `Points per report · ${RULES[0].pts} to ${max}`;

  return (
    <div>
      <p className="text-center font-mono text-label uppercase tracking-[0.14em] text-ink-subtle">{tag}</p>
      <div className="mt-3 flex flex-wrap items-start justify-center gap-x-4 gap-y-3 sm:gap-x-5">
        {RULES.map((rule, k) => {
          const resolved = r && k < beat.terms;
          const on = resolved && rule.applies(r);
          const off = resolved && !on;
          return (
            <div key={rule.key} className="min-w-[2.75rem] text-center" style={{ opacity: on ? 1 : off ? 0.32 : 0.55, transition: FADE }}>
              <div
                className="font-mono text-xl tabular-nums"
                style={{
                  color: on ? accent : P.inkSubtle,
                  textDecoration: off ? 'line-through' : 'none',
                  transition: FADE,
                }}
              >
                {k === 0 ? rule.pts : `+${rule.pts}`}
              </div>
              <div className="mt-1 text-xs" style={{ color: on ? P.ink : P.inkSubtle, transition: FADE }}>
                {rule.label}
              </div>
            </div>
          );
        })}
        <div aria-hidden className="font-mono text-xl text-ink-faint">
          =
        </div>
        <div className="min-w-[2.75rem] text-center">
          <div className="font-mono text-xl font-semibold tabular-nums" style={{ color: r ? accent : P.inkSubtle, transition: FADE }}>
            {total}
          </div>
          <div className="mt-1 text-xs text-ink-muted">points</div>
        </div>
      </div>
    </div>
  );
}

/* ── the figure ────────────────────────────────────────────────────────── */

export default function Hero({ accent = P.accent }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const entered = useInView(ref, IN_VIEW);
  const onScreen = useInView(ref, ON_SCREEN);
  const [step, setStep] = useState(0);
  const run = !reduce && entered && onScreen;

  // one beat at a time, only while on screen
  useEffect(() => {
    if (!run) return undefined;
    const id = setTimeout(() => setStep((s) => (s + 1) % SCRIPT.length), SCRIPT[step].ms);
    return () => clearTimeout(id);
  }, [run, step]);

  const beat = reduce ? STATIC : SCRIPT[step];
  const shown = reduce || entered;

  return (
    // @container: each map layout shows or hides itself by the wrapper's width
    <div ref={ref} className="@container mx-auto w-full max-w-[560px]">
      <p className="sr-only">{A11Y_TEXT}</p>
      {LAYOUTS.map((L) => (
        <MapSvg key={L.key} L={L} beat={beat} shown={shown} reduce={reduce} accent={accent} />
      ))}

      <motion.div
        className="mt-6"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.7, ease: EASE_OUT, delay: reduce ? 0 : ENTER.labelsAt }}
      >
        <Ledger beat={beat} accent={accent} />
      </motion.div>

      {/* what is happening now */}
      <div className="mt-5 min-h-[4rem] text-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={beat.caption}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="mx-auto max-w-[46ch] text-sm leading-snug text-ink-muted"
          >
            {beat.caption}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
