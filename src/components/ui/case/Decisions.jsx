'use client';

/**
 * Decisions — "Three decisions that keep the money and the rules honest."
 *
 * One full-width row per DECISION (gps · tx · rbac), alternating sides at lg,
 * stacked below it, separated by a hairline. Each row reads the same way:
 *   text   — '01 · Location' kicker, display title, then Problem / Decision /
 *            Trade-off (the decision gets the accent rule and brighter ink);
 *   visual — a small interactive diagram in an .mc-panel with a readout
 *            footer, and a 'Show the code' toggle that opens a CodeBlock.
 *
 * The diagrams:
 *   gps  — a dotted schematic map. Pick Site A or B: a pin drops, an 8 km ring
 *          expands, and churches inside it turn red with their distance.
 *   tx   — the four writes of a phase approval. Commit ticks them in order;
 *          a simulated failure ticks two, fails the third, then reverts all.
 *   rbac — the request path as a line of stations. A normal request lights
 *          every check; a forged one arcs around the UI guard and is stopped
 *          at the role check.
 *
 * Everything renders from DECISIONS in src/data/studies/iet.js. Map positions
 * are fixed coordinates (deterministic); the distances, verdicts and labels
 * are computed from them. Sequences start once the panel is in view (gps and
 * tx auto-run their first choice); with reduced motion nothing plays — each
 * diagram simply shows its final state.
 */
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { DECISIONS } from '@/data/studies/iet';
import CodeBlock from '@/components/ui/case/CodeBlock';

/* ── shared constants ──────────────────────────────────────────────────── */
const IN_VIEW = { once: true, amount: 0.35 }; // diagrams start when a third shows
const TEXT_IN_VIEW = { once: true, amount: 0.2 };
const RISE_PX = 16;
const RISE_S = 0.6;
const CODE_S = 0.4; // code drawer open / close

/** A transition that collapses to "instant" under reduced motion. */
function at(reduce, delay = 0, duration = 0.3) {
  return reduce ? { duration: 0 } : { delay, duration, ease: EASE_OUT };
}

/* ── gps: the schematic map ────────────────────────────────────────────── */
const MAP = { w: 480, h: 280, step: 20, cols: 24, rows: 14 };
const KM_PX = 9; // map scale — 1 km in viewBox units
const BYLAW_KM = 8;
const RING_R = BYLAW_KM * KM_PX;
const PIN_R = 6.5;

// Two candidate sites and nine registered churches (viewBox units). Placed so
// Site A has exactly one church inside 8 km (5.2 km) and Site B's nearest is
// 11.4 km — the readout below is computed from these, not typed in.
const SITES = {
  A: { x: 150, y: 140 },
  B: { x: 340, y: 170 },
};
const CHURCHES = [
  { x: 187.4, y: 111.9 },
  { x: 401.6, y: 252.1 },
  { x: 52, y: 58 },
  { x: 64, y: 226 },
  { x: 262, y: 48 },
  { x: 210, y: 236 },
  { x: 440, y: 118 },
  { x: 372, y: 36 },
  { x: 24, y: 150 },
];

// Seconds: pin drops, then the ring sweeps out, then the readout lands
const GPS_T = { drop: 0.45, ringDelay: 0.25, ring: 1.0, sweep: 0.3, link: 0.75, reveal: 0.95 };

// The faint dot grid — brighter in the middle, fading toward the edges
const DOTS = Array.from({ length: MAP.cols * MAP.rows }, (_, k) => {
  const x = MAP.step / 2 + (k % MAP.cols) * MAP.step;
  const y = MAP.step / 2 + Math.floor(k / MAP.cols) * MAP.step;
  const dx = (x - MAP.w / 2) / (MAP.w / 2);
  const dy = (y - MAP.h / 2) / (MAP.h / 2);
  const fade = Math.min(1, Math.hypot(dx, dy) / 1.3);
  return { x, y, o: 0.9 - 0.6 * fade };
});

const kmBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) / KM_PX;
const fmtKm = (km) => `${km.toFixed(1)} km`;

/** Site key → { site, conflicts (inside the bylaw), nearest }. */
const CHECKS = Object.fromEntries(
  Object.entries(SITES).map(([key, site]) => {
    const ranked = CHURCHES.map((c, i) => ({ ...c, i, km: kmBetween(site, c) })).sort(
      (a, b) => a.km - b.km
    );
    return [key, { site, conflicts: ranked.filter((c) => c.km < BYLAW_KM), nearest: ranked[0] }];
  })
);

function verdictFor(check) {
  const n = check.conflicts.length;
  if (n > 0) {
    const where = check.conflicts.map((c) => fmtKm(c.km)).join(', ');
    return {
      ok: false,
      text: `Blocked — ${n} ${n === 1 ? 'church' : 'churches'} at ${where}`,
      meta: 'status change refused',
    };
  }
  return { ok: true, text: `Clear — nearest ${fmtKm(check.nearest.km)}`, meta: 'DRAFT → SUBMITTED' };
}

/* ── tx: the transaction ───────────────────────────────────────────────── */
// Seconds. A step ticks every `step`; on failure the revert starts `revertGap`
// after the failing step and ripples down the rows by `stagger`.
const TX = { lead: 0.3, step: 0.5, failAt: 2, revertGap: 0.6, stagger: 0.07, badgeGap: 0.3 };
const TX_DIM = { reverted: 0.45, failed: 0.8 };

/** mode → per-row cue times and when the outcome lands. */
function txTimeline(mode, count) {
  const tickAt = (i) => TX.lead + i * TX.step;
  if (mode === 'commit') {
    return {
      rows: Array.from({ length: count }, (_, i) => ({ tick: tickAt(i) })),
      end: tickAt(count - 1) + TX.step,
      failIdx: null,
    };
  }
  if (mode === 'fail') {
    const failIdx = Math.min(TX.failAt, count - 1);
    const revert0 = tickAt(failIdx) + TX.revertGap;
    return {
      rows: Array.from({ length: count }, (_, i) => ({
        tick: i < failIdx ? tickAt(i) : null,
        fail: i === failIdx ? tickAt(i) : null,
        revert: revert0 + i * TX.stagger,
      })),
      end: revert0 + count * TX.stagger + TX.badgeGap,
      failIdx,
    };
  }
  return { rows: Array.from({ length: count }, () => ({})), end: 0, failIdx: null };
}

/* ── rbac: the request path ────────────────────────────────────────────── */
// Below `wideMin` px of panel width the line runs top-to-bottom.
// h: horizontal — `room` above the line for the bypass arc, station radius,
//    gap to the labels. v: vertical — top inset, row height, line x.
const PIPE = {
  wideMin: 520,
  pad: 6,
  h: { room: 46, r: 7, gap: 16 },
  v: { top: 30, row: 60, x: 48, r: 7 },
  lead: 0.3, // token waits at the client
  seg: 0.42, // station to station
  arc: 0.9, // the whole bypass arc
  arcSamples: 12,
  settle: 0.25, // readout after the token stops
};

/** Station state → colours (circle fill/stroke + the label under it). */
const STATION = {
  idle: { fill: P.surface2, stroke: P.lineHi, label: P.inkMuted },
  pass: { fill: alpha(P.jade, 0.22), stroke: P.jade, label: P.ink },
  block: { fill: alpha(P.alert, 0.22), stroke: P.alert, label: P.alert },
  skip: { fill: P.void, stroke: P.inkFaint, label: P.inkSubtle },
};

function bezier([p0, p1, p2, p3], u) {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** Station centres, the client origin and the bypass arc (CSS px). */
function pipeGeometry(width, count, wide, entry) {
  if (wide) {
    const cy = PIPE.h.room + PIPE.h.r;
    const col = width / count;
    const stations = Array.from({ length: count }, (_, i) => ({ x: col * (i + 0.5), y: cy }));
    const origin = { x: PIPE.pad, y: cy };
    const lift = ((PIPE.h.room - 8) * 4) / 3; // cubic control → peak 8px under the top
    const end = stations[entry];
    return {
      stations,
      origin,
      arc: [origin, { x: origin.x, y: cy - lift }, { x: end.x, y: cy - lift }, end],
    };
  }
  const x = PIPE.v.x;
  const stations = Array.from({ length: count }, (_, i) => ({ x, y: PIPE.v.top + PIPE.v.row * (i + 0.5) }));
  const origin = { x, y: PIPE.pad };
  const swing = ((x - 10) * 4) / 3; // bulges left to 10px from the edge
  const end = stations[entry];
  return {
    stations,
    origin,
    arc: [origin, { x: x - swing, y: origin.y }, { x: x - swing, y: end.y }, end],
  };
}

/** The token's keyframes, and when it reaches each station. */
function pipePlan(mode, geo, entry, blockAt) {
  const frames = [
    { p: geo.origin, at: 0 },
    { p: geo.origin, at: PIPE.lead },
  ];
  const eases = ['linear'];
  const arrive = [];
  let t = PIPE.lead;
  const hop = (i) => {
    t += PIPE.seg;
    frames.push({ p: geo.stations[i], at: t });
    eases.push('easeInOut');
    arrive[i] = t;
  };
  if (mode === 'app') {
    geo.stations.forEach((_, i) => hop(i));
  } else if (mode === 'forged') {
    for (let k = 1; k <= PIPE.arcSamples; k++) {
      const u = k / PIPE.arcSamples;
      frames.push({ p: bezier(geo.arc, u), at: t + PIPE.arc * u });
      eases.push('linear');
    }
    t += PIPE.arc;
    arrive[entry] = t;
    for (let i = entry + 1; i <= blockAt; i++) hop(i);
  }
  return { frames, eases, arrive, end: t };
}

function stationFor(mode, i, plan, skipAt, blockAt) {
  if (mode === 'app') return { state: 'pass', at: plan.arrive[i] };
  if (mode === 'forged') {
    if (i === skipAt) return { state: 'skip', at: PIPE.lead };
    if (i === blockAt) return { state: 'block', at: plan.arrive[i] };
    if (plan.arrive[i] != null) return { state: 'pass', at: plan.arrive[i] };
  }
  return { state: 'idle', at: 0 };
}

/* ── hooks ─────────────────────────────────────────────────────────────── */

/** The active choice for a diagram: the user's pick, else `auto` once the
 *  panel is in view (or straight away with reduced motion — final state).
 *  `run` bumps on every click so the same choice can be replayed. */
function useRun(inView, reduce, auto) {
  const [choice, setChoice] = useState(null);
  const active = choice ?? (inView || reduce ? { key: auto, run: 0 } : null);
  const choose = (key) => setChoice((c) => ({ key, run: (c ? c.run : 0) + 1 }));
  return [active, choose];
}

/** Rendered width of an element (0 until measured). */
function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/* ── small pieces ──────────────────────────────────────────────────────── */

/** Toggle buttons for a diagram (aria-pressed on the active one). */
function Choices({ label, options, value, onChoose, accent }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChoose(o.key)}
            className={`rounded-chip border px-3 py-2 font-mono text-micro tracking-[0.04em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              on ? '' : 'border-line text-ink-muted hover:border-line-hi hover:text-ink'
            }`}
            style={
              on
                ? { color: accent, borderColor: alpha(accent, 0.5), background: alpha(accent, 0.08) }
                : undefined
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** The panel every diagram sits in: caption + controls, body, readout. */
function PanelFrame({ caption, controls, footer, children }) {
  return (
    <div className="mc-panel flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <span className="mc-label">{caption}</span>
        {controls}
      </div>
      <div className="mt-5 min-w-0">{children}</div>
      <div
        aria-live="polite"
        className="mt-5 flex min-h-[3.25rem] items-center border-t border-line pt-4"
      >
        {footer}
      </div>
    </div>
  );
}

/** 20px status glyphs: tick, cross, undo, idle ring. */
function Glyph({ kind }) {
  const tone = { tick: P.jade, cross: P.alert, undo: P.inkSubtle, idle: P.lineHi }[kind];
  const filled = kind === 'tick' || kind === 'cross';
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" className="block">
      <circle
        cx="10"
        cy="10"
        r="8.5"
        fill={filled ? alpha(tone, 0.14) : 'none'}
        stroke={tone}
        strokeWidth="1.25"
        strokeDasharray={kind === 'undo' ? '2.5 2.5' : undefined}
      />
      {kind === 'tick' && (
        <path d="M6.2 10.3 L8.8 12.9 L13.9 7.6" fill="none" stroke={tone} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {kind === 'cross' && (
        <path d="M7.2 7.2 L12.8 12.8 M12.8 7.2 L7.2 12.8" fill="none" stroke={tone} strokeWidth="1.6" strokeLinecap="round" />
      )}
      {kind === 'undo' && (
        <path
          d="M7.4 8.2 H11.3 A2.6 2.6 0 0 1 11.3 13.4 H8.6 M9.2 6.2 L7.2 8.2 L9.2 10.2"
          fill="none"
          stroke={tone}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/** A readout line: a status in its colour, then a plain sentence. */
function Readout({ runKey, delay, reduce, tone, status, children }) {
  return (
    <motion.div
      key={runKey}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={at(reduce, delay, 0.35)}
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
    >
      {status && (
        <span className="mc-chip mc-chip--accent font-medium" style={{ '--chip': tone }}>
          {status}
        </span>
      )}
      {children}
    </motion.div>
  );
}

/* ── gps visual ────────────────────────────────────────────────────────── */

const LABEL_PLACE = {
  below: `translate(-50%, ${PIN_R + 3}px)`,
  above: 'translate(-50%, calc(-100% - 4px))',
  right: 'translate(10px, -50%)',
  left: 'translate(calc(-100% - 10px), -50%)',
};

/** An HTML label pinned to a map coordinate — stays 11px at any map size. */
function MapLabel({ x, y, place, color, delay, reduce, children }) {
  return (
    <span
      className="absolute"
      style={{ left: `${(x / MAP.w) * 100}%`, top: `${(y / MAP.h) * 100}%`, transform: LABEL_PLACE[place] }}
    >
      <motion.span
        className="block whitespace-nowrap rounded-sm px-1 font-mono text-micro leading-[1.5]"
        style={{ color, background: alpha(P.void, 0.85) }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={at(reduce, delay, 0.3)}
      >
        {children}
      </motion.span>
    </span>
  );
}

function LegendItem({ children, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
        {children}
      </svg>
      {label}
    </span>
  );
}

function GpsVisual({ inView, reduce, accent }) {
  const [active, choose] = useRun(inView, reduce, 'A');
  const key = active?.key ?? null;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const check = key ? CHECKS[key] : null;
  const verdict = check ? verdictFor(check) : null;
  const marked = check ? (verdict.ok ? [check.nearest] : check.conflicts) : [];
  const site = check?.site;

  const label = `Schematic map: ${CHURCHES.length} registered churches and two candidate sites.${
    verdict ? ` Site ${key}: ${verdict.text}.` : ''
  }`;

  return (
    <PanelFrame
      caption="Proposed site"
      controls={
        <Choices
          label="Choose a proposed site"
          options={Object.keys(SITES).map((k) => ({ key: k, label: `Site ${k}` }))}
          value={key}
          onChoose={choose}
          accent={accent}
        />
      }
      footer={
        verdict ? (
          <Readout runKey={runKey} delay={GPS_T.reveal} reduce={reduce} tone={verdict.ok ? P.jade : P.alert}>
            <span className="text-body font-medium" style={{ color: verdict.ok ? P.jade : P.alert }}>
              {verdict.text}
            </span>
            <span className="font-mono text-micro text-ink-subtle">{verdict.meta}</span>
          </Readout>
        ) : (
          <p className="text-body text-ink-subtle">Pick a site to run the check.</p>
        )
      }
    >
      <div
        className="relative w-full overflow-hidden rounded-md border border-line bg-void"
        style={{ aspectRatio: `${MAP.w} / ${MAP.h}` }}
      >
        <svg viewBox={`0 0 ${MAP.w} ${MAP.h}`} className="absolute inset-0 h-full w-full" role="img" aria-label={label}>
          {DOTS.map((d) => (
            <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r="1.2" fill={P.inkFaint} opacity={d.o} />
          ))}

          {/* the 8 km ring */}
          {site && (
            <motion.circle
              key={`ring-${runKey}`}
              cx={site.x}
              cy={site.y}
              fill={alpha(accent, 0.05)}
              stroke={accent}
              strokeOpacity={0.85}
              strokeWidth="1.25"
              strokeDasharray="5 5"
              initial={{ r: reduce ? RING_R : 0 }}
              animate={{ r: RING_R }}
              transition={at(reduce, GPS_T.ringDelay, GPS_T.ring)}
            />
          )}

          {/* site → the church that decides the verdict */}
          {site &&
            marked.map((c) => (
              <motion.line
                key={`link-${c.i}-${runKey}`}
                x1={site.x}
                y1={site.y}
                x2={c.x}
                y2={c.y}
                stroke={verdict.ok ? P.jade : P.alert}
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.8 }}
                transition={at(reduce, GPS_T.link, 0.45)}
              />
            ))}

          {/* registered churches — a soft disc and a cross */}
          {CHURCHES.map((c, i) => {
            const hit = check ? check.conflicts.some((k) => k.i === i) : false;
            const delay = GPS_T.ringDelay + GPS_T.ring * GPS_T.sweep * (kmBetween(site ?? c, c) / BYLAW_KM);
            return (
              <motion.g
                key={`church-${i}-${runKey}`}
                initial={{ color: P.ice }}
                animate={{ color: hit ? P.alert : P.ice }}
                transition={at(reduce, delay, 0.3)}
              >
                <circle cx={c.x} cy={c.y} r="7.5" fill="currentColor" fillOpacity="0.12" />
                <path
                  d={`M${c.x} ${c.y - 5}V${c.y + 5}M${c.x - 3.5} ${c.y - 1.5}H${c.x + 3.5}`}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </motion.g>
            );
          })}

          {/* candidate sites: hollow until chosen, then an accent pin */}
          {Object.entries(SITES).map(([k, s]) =>
            k === key ? null : (
              <circle
                key={k}
                cx={s.x}
                cy={s.y}
                r="5"
                fill={P.void}
                stroke={P.inkSubtle}
                strokeWidth="1.25"
                strokeDasharray="2 2"
              />
            )
          )}
          {site && (
            <motion.g
              key={`pin-${runKey}`}
              initial={{ opacity: 0, y: reduce ? 0 : -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={at(reduce, 0, GPS_T.drop)}
            >
              <circle cx={site.x} cy={site.y} r={PIN_R} fill={accent} stroke={P.void} strokeWidth="2" />
              <circle cx={site.x} cy={site.y} r="2" fill={P.void} />
            </motion.g>
          )}
        </svg>

        {/* labels — HTML so they stay readable when the map shrinks */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {Object.entries(SITES).map(([k, s]) => (
            <MapLabel
              key={`site-${k}-${runKey}`}
              x={s.x}
              y={s.y}
              place="below"
              color={k === key ? accent : P.inkSubtle}
              delay={0}
              reduce={reduce}
            >
              Site {k}
            </MapLabel>
          ))}
          {site && (
            <MapLabel
              key={`ring-label-${runKey}`}
              x={site.x}
              y={site.y - RING_R}
              place="above"
              color={accent}
              delay={GPS_T.link}
              reduce={reduce}
            >
              {BYLAW_KM} km
            </MapLabel>
          )}
          {marked.map((c) => (
            <MapLabel
              key={`km-${c.i}-${runKey}`}
              x={c.x}
              y={c.y}
              place={c.x > MAP.w * 0.6 ? 'left' : 'right'}
              color={verdict.ok ? P.jade : P.alert}
              delay={GPS_T.reveal}
              reduce={reduce}
            >
              {fmtKm(c.km)}
            </MapLabel>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-micro text-ink-subtle">
        <LegendItem label="registered church">
          <circle cx="7" cy="7" r="6" fill={P.ice} fillOpacity="0.12" />
          <path d="M7 3V11M4.2 5.8H9.8" stroke={P.ice} strokeWidth="1.4" strokeLinecap="round" />
        </LegendItem>
        <LegendItem label="proposed site">
          <circle cx="7" cy="7" r="5" fill={accent} />
        </LegendItem>
        <LegendItem label={`${BYLAW_KM} km bylaw radius`}>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="2.4 2" />
        </LegendItem>
      </div>
    </PanelFrame>
  );
}

/* ── tx visual ─────────────────────────────────────────────────────────── */

/** Soft breaks at camelCase seams, so "ApplicationStatusHistory" wraps between
 *  words in a narrow row instead of mid-identifier (and copies back whole). */
function camelBreaks(text) {
  const parts = text.replace(/([a-z])([A-Z])/g, '$1\n$2').split('\n');
  if (parts.length < 2) return text;
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
    </Fragment>
  ));
}

function TxRow({ index, label, cue, reduce }) {
  const reverted = cue.revert != null;
  const failed = cue.fail != null;
  return (
    <motion.li
      initial={{ opacity: 1, borderColor: P.line }}
      animate={{
        opacity: reverted ? (failed ? TX_DIM.failed : TX_DIM.reverted) : 1,
        borderColor: failed ? alpha(P.alert, 0.4) : P.line,
      }}
      transition={
        reduce
          ? { duration: 0 }
          : {
              opacity: at(reduce, cue.revert ?? 0, 0.35),
              borderColor: at(reduce, cue.fail ?? 0, 0.3),
            }
      }
      className="flex items-center gap-3 rounded-md border bg-surface-2 px-3 py-2.5"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-chip border border-line-hi font-mono text-micro text-ink-subtle">
        {index + 1}
      </span>
      <motion.span
        className="min-w-0 flex-1 font-mono text-label text-ink-muted [overflow-wrap:anywhere]"
        style={{ textDecorationLine: 'line-through', textDecorationThickness: '1px' }}
        initial={{ textDecorationColor: alpha(P.inkSubtle, 0) }}
        animate={{ textDecorationColor: alpha(P.inkSubtle, reverted ? 1 : 0) }}
        transition={at(reduce, cue.revert ?? 0, 0.3)}
      >
        {camelBreaks(label)}
      </motion.span>
      <span aria-hidden="true" className="relative h-5 w-5 shrink-0">
        <span className="absolute inset-0">
          <Glyph kind="idle" />
        </span>
        {cue.tick != null && (
          <motion.span
            className="absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: reverted ? 0 : 1 }}
            transition={at(reduce, cue.revert ?? 0, 0.3)}
          >
            <motion.span
              className="absolute inset-0"
              initial={{ opacity: 0, scale: reduce ? 1 : 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={at(reduce, cue.tick, 0.3)}
            >
              <Glyph kind="tick" />
            </motion.span>
          </motion.span>
        )}
        {cue.tick != null && reverted && (
          <motion.span
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={at(reduce, cue.revert + 0.15, 0.3)}
          >
            <Glyph kind="undo" />
          </motion.span>
        )}
        {failed && (
          <motion.span
            className="absolute inset-0"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={at(reduce, cue.fail, 0.3)}
          >
            <Glyph kind="cross" />
          </motion.span>
        )}
      </span>
    </motion.li>
  );
}

function TxVisual({ decision, inView, reduce, accent }) {
  const [active, choose] = useRun(inView, reduce, 'commit');
  const mode = active?.key ?? null;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const steps = decision.steps;
  const plan = txTimeline(mode, steps.length);
  const committed = mode === 'commit';
  const frameTone = mode ? alpha(committed ? P.jade : P.alert, 0.45) : P.line;

  return (
    <PanelFrame
      caption="Phase approval"
      controls={
        <Choices
          label="Run the phase approval"
          options={[
            { key: 'commit', label: 'Commit' },
            { key: 'fail', label: 'Simulate a failure' },
          ]}
          value={mode}
          onChoose={choose}
          accent={accent}
        />
      }
      footer={
        mode ? (
          <Readout
            runKey={runKey}
            delay={plan.end}
            reduce={reduce}
            tone={committed ? P.jade : P.alert}
            status={committed ? 'COMMIT' : 'ROLLBACK — nothing was written'}
          >
            <span className="text-body text-ink-muted">
              {committed
                ? `All ${steps.length} writes landed together.`
                : `Step ${plan.failIdx + 1} threw, so every write before it was undone.`}
            </span>
          </Readout>
        ) : (
          <p className="text-body text-ink-subtle">Run the approval.</p>
        )
      }
    >
      <motion.div
        key={runKey}
        className="rounded-lg border p-3 sm:p-4"
        initial={{ borderColor: P.line }}
        animate={{ borderColor: frameTone }}
        transition={at(reduce, plan.end, 0.4)}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="font-mono text-micro tracking-[0.12em] text-ink-subtle">BEGIN</span>
          <span className="font-mono text-micro text-ink-subtle">one transaction</span>
        </div>
        <ol className="flex flex-col gap-2">
          {steps.map((label, i) => (
            <TxRow key={label} index={i} label={label} cue={plan.rows[i]} reduce={reduce} />
          ))}
        </ol>
      </motion.div>
    </PanelFrame>
  );
}

/* ── rbac visual ───────────────────────────────────────────────────────── */

function RbacVisual({ decision, inView, reduce, accent }) {
  const [active, choose] = useRun(inView, reduce, 'app');
  const mode = active?.key ?? null;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  // The run whose token has arrived. From then on the token just sits at its
  // stop: the cx keyframes follow the measured width, so a resize would
  // otherwise replay them from the client along the straight wire.
  const [doneRun, setDoneRun] = useState(null);

  const trackRef = useRef(null);
  const width = useWidth(trackRef);
  const wide = width >= PIPE.wideMin;

  const path = decision.path;
  const n = path.length;
  // Which stations the forged request skips, enters at and is stopped at
  const skipAt = Math.max(0, path.findIndex((s) => s.key === 'ui'));
  const entry = Math.max(skipAt + 1, path.findIndex((s) => s.key === 'route'));
  const blockAt = Math.max(entry, path.findIndex((s) => s.key === 'role'));

  const geo = pipeGeometry(width, n, wide, entry);
  const plan = pipePlan(mode, geo, entry, blockAt);
  const states = path.map((_, i) => stationFor(mode, i, plan, skipAt, blockAt));
  const last = plan.frames[plan.frames.length - 1].p;
  const points = [geo.origin, ...geo.stations];
  const arcD = (() => {
    const [p0, p1, p2, p3] = geo.arc;
    return `M${p0.x} ${p0.y} C${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
  })();
  const arcPeak = bezier(geo.arc, 0.5);

  // A straight segment j (points[j] → points[j+1]) is lit if the token rode it
  const segLit = (j) => {
    if (!mode) return null;
    const endsAt = plan.arrive[j];
    if (endsAt == null) return null;
    if (mode === 'forged' && j <= entry) return null; // entry is reached by the arc
    return endsAt - PIPE.seg;
  };

  const tokenTiming = {
    duration: plan.end,
    times: plan.frames.map((f) => f.at / plan.end),
    ease: plan.eases,
  };
  const forged = mode === 'forged';
  const settled = reduce || doneRun === runKey;

  return (
    <PanelFrame
      caption="Request path"
      controls={
        <Choices
          label="Send a request"
          options={[
            { key: 'app', label: 'Through the app' },
            { key: 'forged', label: 'Forged request' },
          ]}
          value={mode}
          onChoose={choose}
          accent={accent}
        />
      }
      footer={
        mode ? (
          <Readout
            runKey={runKey}
            delay={plan.end + PIPE.settle}
            reduce={reduce}
            tone={forged ? P.alert : P.jade}
            status={forged ? '403 — role not allowed' : '200 OK'}
          >
            <span className="text-body text-ink-muted">
              {forged
                ? 'Skipping the UI changes nothing — the API decides.'
                : 'Every check ran again on the server.'}
            </span>
          </Readout>
        ) : (
          <p className="text-body text-ink-subtle">Send a request.</p>
        )
      }
    >
      <div ref={trackRef} className="relative min-w-0">
        {width > 0 && (
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {/* the wire */}
            {points.slice(1).map((b, j) => (
              <line
                key={`wire-${j}`}
                x1={points[j].x}
                y1={points[j].y}
                x2={b.x}
                y2={b.y}
                stroke={P.lineHi}
                strokeWidth="1.5"
              />
            ))}
            {/* the token's trail */}
            {points.slice(1).map((b, j) => {
              const from = segLit(j);
              if (from == null) return null;
              return (
                <motion.line
                  key={`trail-${j}-${runKey}-${wide}`}
                  x1={points[j].x}
                  y1={points[j].y}
                  x2={b.x}
                  y2={b.y}
                  stroke={alpha(accent, 0.75)}
                  strokeWidth="2"
                  initial={{ pathLength: reduce ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={reduce ? { duration: 0 } : { delay: from, duration: PIPE.seg, ease: 'easeInOut' }}
                />
              );
            })}
            {/* the bypass */}
            {forged && (
              <motion.path
                key={`arc-${runKey}-${wide}`}
                d={arcD}
                fill="none"
                stroke={accent}
                strokeWidth="1.5"
                strokeDasharray="4 4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={at(reduce, 0.05, 0.3)}
              />
            )}
            {forged && wide && (
              <motion.text
                key={`arc-label-${runKey}`}
                x={arcPeak.x}
                y={arcPeak.y - 6}
                textAnchor="middle"
                className="font-mono"
                fontSize="11"
                letterSpacing="0.08em"
                fill={accent}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={at(reduce, 0.2, 0.3)}
              >
                bypass
              </motion.text>
            )}
            {/* stations */}
            {geo.stations.map((s, i) => {
              const look = STATION[states[i].state];
              return (
                <motion.circle
                  key={`station-${i}-${runKey}-${wide}`}
                  cx={s.x}
                  cy={s.y}
                  r={wide ? PIPE.h.r : PIPE.v.r}
                  strokeWidth="1.5"
                  initial={{ fill: STATION.idle.fill, stroke: STATION.idle.stroke }}
                  animate={{ fill: look.fill, stroke: look.stroke }}
                  transition={at(reduce, states[i].at, 0.25)}
                />
              );
            })}
            {/* the client, and the request itself */}
            <circle cx={geo.origin.x} cy={geo.origin.y} r="2.5" fill={P.inkSubtle} />
            {mode && (
              <motion.circle
                key={`token-${runKey}-${wide}`}
                r="5"
                stroke={P.void}
                strokeWidth="2"
                initial={{ cx: settled ? last.x : geo.origin.x, cy: settled ? last.y : geo.origin.y, fill: accent }}
                animate={{
                  cx: settled ? last.x : plan.frames.map((f) => f.p.x),
                  cy: settled ? last.y : plan.frames.map((f) => f.p.y),
                  fill: forged ? P.alert : accent,
                }}
                transition={
                  settled
                    ? { duration: 0 }
                    : { cx: tokenTiming, cy: tokenTiming, fill: { delay: plan.end, duration: 0.2 } }
                }
                onAnimationComplete={() => setDoneRun(runKey)}
              />
            )}
          </svg>
        )}

        <ol
          aria-label="Request path, from the client to the handler"
          className={wide ? 'relative grid' : 'relative flex flex-col'}
          style={
            wide
              ? {
                  gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
                  paddingTop: PIPE.h.room + PIPE.h.r * 2 + PIPE.h.gap,
                }
              : { paddingTop: PIPE.v.top }
          }
        >
          {path.map((step, i) => (
            <li
              key={step.key}
              className={wide ? 'min-w-0 px-1 text-center' : 'flex min-w-0 flex-col justify-center'}
              style={wide ? undefined : { height: PIPE.v.row, paddingLeft: PIPE.v.x + 22 }}
            >
              <motion.span
                key={`${step.key}-${runKey}`}
                className="block text-label font-medium leading-snug"
                initial={{ color: STATION.idle.label }}
                animate={{ color: STATION[states[i].state].label }}
                transition={at(reduce, states[i].at, 0.25)}
              >
                {step.label}
              </motion.span>
              <span className="mt-1 block text-micro leading-snug text-ink-subtle">{step.note}</span>
            </li>
          ))}
        </ol>
      </div>
    </PanelFrame>
  );
}

/* ── row ───────────────────────────────────────────────────────────────── */

function Block({ label, text, primary, accent }) {
  return (
    <div className="border-l-2 pl-4" style={{ borderColor: primary ? alpha(accent, 0.7) : P.line }}>
      <dt className="mc-label" style={primary ? { color: accent } : undefined}>
        {label}
      </dt>
      <dd className={`mt-2 text-body ${primary ? 'text-ink' : 'text-ink-muted'}`}>{text}</dd>
    </div>
  );
}

function CodeToggle({ code, reduce }) {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((o) => !o)}
        className="mc-ghost-btn inline-flex items-center gap-2 rounded-chip py-2 pr-2 uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg
          viewBox="0 0 12 12"
          width="12"
          height="12"
          aria-hidden="true"
          className={`transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
        >
          <path d="M4.5 2.5 L8 6 L4.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {open ? 'Hide the code' : 'Show the code'}
      </button>
      <div id={regionId}>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="code"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={reduce ? { duration: 0 } : { duration: CODE_S, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="pt-2">
                <CodeBlock code={code} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function renderVisual(decision, props) {
  switch (decision.id) {
    case 'gps':
      return <GpsVisual {...props} />;
    case 'tx':
      return <TxVisual decision={decision} {...props} />;
    case 'rbac':
      return <RbacVisual decision={decision} {...props} />;
    default:
      return null;
  }
}

function DecisionRow({ decision, index, accent, reduce }) {
  const textRef = useRef(null);
  const visualRef = useRef(null);
  const textIn = useInView(textRef, TEXT_IN_VIEW);
  const inView = useInView(visualRef, IN_VIEW);
  const titleId = useId();
  const flip = index % 2 === 1;
  const num = String(index + 1).padStart(2, '0');
  const shown = reduce || textIn;

  return (
    <article
      aria-labelledby={titleId}
      className={`grid grid-cols-1 items-start gap-10 border-t border-line py-16 first:border-t-0 first:pt-0 last:pb-0 lg:gap-16 lg:py-24 xl:gap-20 ${
        flip
          ? 'lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]'
          : 'lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'
      }`}
    >
      <motion.div
        ref={textRef}
        className={`min-w-0 max-w-[34rem] lg:sticky lg:top-24 ${flip ? 'lg:order-2' : ''}`}
        initial={reduce ? false : { opacity: 0, y: RISE_PX }}
        animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: RISE_PX }}
        transition={at(reduce, 0, RISE_S)}
      >
        <p className="mc-label">
          <span style={{ color: accent }}>{num}</span> · {decision.kicker}
        </p>
        <h3
          id={titleId}
          className="mt-4 text-balance font-display text-[1.75rem] leading-[1.15] text-ink sm:text-[2rem] lg:text-[2.25rem]"
        >
          {decision.title}
        </h3>
        <dl className="mt-8 flex flex-col gap-6">
          <Block label="Problem" text={decision.problem} accent={accent} />
          <Block label="Decision" text={decision.decision} accent={accent} primary />
          <Block label="Trade-off" text={decision.tradeoff} accent={accent} />
        </dl>
      </motion.div>

      <div ref={visualRef} className={`min-w-0 ${flip ? 'lg:order-1' : ''}`}>
        {renderVisual(decision, { inView, reduce, accent })}
        <CodeToggle code={decision.code} reduce={reduce} />
      </div>
    </article>
  );
}

/* ── component ─────────────────────────────────────────────────────────── */

export default function Decisions({ accent = P.accent }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <div className="flex min-w-0 flex-col">
      {DECISIONS.map((d, i) => (
        <DecisionRow key={d.id} decision={d} index={i} accent={accent} reduce={reduce} />
      ))}
    </div>
  );
}
