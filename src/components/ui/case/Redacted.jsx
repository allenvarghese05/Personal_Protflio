'use client';
import { useId, useRef, useSyncExternalStore } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { COPY } from '@/data/studies/iet';

/**
 * Redacted — the "no screenshots" strip that sits right under the IET hero.
 *
 * The client system is private, so instead of screenshots we show three calm
 * wireframe silhouettes of it (COPY.redacted: the HQ review queue, a step of
 * the 10-page form, a phase photo review). No real text: every line of copy
 * is a bar, every surface is an ordered-dither texture — 4×4 Bayer dots at
 * three densities, all locked to one grid so overlapping shapes read cleanly.
 *
 * Motion: on first view the tiles rise in and their dither "prints" in a few
 * hard steps. On hover the dither moves one Bayer step denser (an extra layer
 * of exactly the next threshold's dots fades in). Reduced motion: final state,
 * no transitions. Under 768px the row becomes a snap-scrolling carousel.
 */

const NOTE_LEAD = 'Private client system';
const NOTE_REST = ' — the interface is redacted; everything below shows how it works.';
const REGION_LABEL = 'Redacted interface previews';
const STAMP = 'Redacted';

/* At md and up the row is a static grid with nothing to scroll, so it should
   leave the tab order. Read the breakpoint as an external store (false on the
   server and during hydration) instead of measuring layout in render. */
const WIDE_QUERY = '(min-width: 768px)';
function subscribeWide(onChange) {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const getWide = () => window.matchMedia(WIDE_QUERY).matches;
const getWideServer = () => false;

/* ── the dither ─────────────────────────────────────────────────────────── */
const VIEW_W = 320; // 16:10 tile, in SVG user units
const VIEW_H = 200;
const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const CELL = 2; // grid pitch — a dot every 2 units (~1px dots at desktop size)
const DOT = 1.2;
const DOT_INSET = (CELL - DOT) / 2;
const BAYER_MAX = 16;

// Threshold per tone: a cell gets a dot when its Bayer value is below it.
const TONE_LEVEL = { low: 4, mid: 8, high: 14 };
const HOVER_STEP = 3; // hover adds the next 3 thresholds' dots

const HUES = {
  ink: { color: P.ink, opacity: 0.5 },
  accent: { color: P.accent, opacity: 0.75 },
  jade: { color: P.jade, opacity: 0.42 },
};

const STROKES = {
  rule: alpha(P.ink, 0.08),
  base: alpha(P.ink, 0.16),
  hi: alpha(P.ink, 0.4),
  accent: alpha(P.accent, 0.55),
};
const STROKE_PROPS = { strokeWidth: 1, vectorEffect: 'non-scaling-stroke' };

/* ── motion ─────────────────────────────────────────────────────────────── */
const TILE_STAGGER = 0.08;
const TILE_RISE = 10;
const DEVELOP_DELAY = 0.18;
const DEVELOP_S = 0.56;
const DEVELOP_STEPS = 4;

/** Hard-stepped easing — the dither lands in discrete passes, like a print. */
const stepped = (n) => (t) => Math.ceil(t * n) / n;

const INSTANT = { duration: 0 };

const TILE_VARIANTS = {
  hidden: { opacity: 0, y: TILE_RISE },
  show: ({ reduce, index }) => ({
    opacity: 1,
    y: 0,
    transition: reduce ? INSTANT : { duration: 0.7, ease: EASE_OUT, delay: index * TILE_STAGGER },
  }),
};

const DEVELOP_VARIANTS = {
  hidden: { opacity: 0 },
  show: ({ reduce, index }) => ({
    opacity: 1,
    transition: reduce
      ? INSTANT
      : { duration: DEVELOP_S, ease: stepped(DEVELOP_STEPS), delay: index * TILE_STAGGER + DEVELOP_DELAY },
  }),
};

/* ── wireframe primitives (all y's on the even dither grid) ─────────────── */
/** A line of redacted text. Text bars only use mid/high — low is too sparse. */
const bar = (x, y, w, h = 4, tone = 'high', hue = 'ink') => ({ kind: 'rect', x, y, w, h, r: 1, tone, hue });
const box = (x, y, w, h, { r = 3, tone, hue = 'ink', stroke } = {}) => ({ kind: 'rect', x, y, w, h, r, tone, hue, stroke });
const disc = (cx, cy, r, { tone, hue = 'ink', stroke } = {}) => ({ kind: 'circle', cx, cy, r, tone, hue, stroke });
const rule = (x1, y1, x2, y2) => ({ kind: 'line', x1, y1, x2, y2, stroke: 'rule' });
const poly = (points, tone, hue = 'ink') => ({ kind: 'polygon', points, tone, hue });
const chevron = (points) => ({ kind: 'polyline', points, stroke: 'base' });

const PAD = 14; // tile inner margin
const RIGHT = VIEW_W - PAD;

/** The same thin app header on every screen — it's one product. */
function appBar(activeNav) {
  const nav = [
    [84, 22],
    [112, 26],
    [144, 18],
  ];
  return [
    rule(0, 22, VIEW_W, 22),
    box(PAD, 8, 8, 8, { r: 2, tone: 'high' }),
    bar(28, 10, 38, 4, 'mid'),
    ...nav.map(([x, w], i) => bar(x, 10, w, 4, i === activeNav ? 'high' : 'mid')),
  ];
}

/* HQ review queue — a table of applications, one row selected. */
const QUEUE_COLS = { dot: 21, name: 30, division: 118, status: 186, date: 270 };
const QUEUE_HEAD_Y = 56;
const QUEUE_TOP = 62;
const QUEUE_ROW_H = 20;
const QUEUE_SELECTED = 1;
const QUEUE_ROWS = [
  { name: 62, sub: 40, division: 34, status: 44, filled: true, date: 26, dot: 'high' },
  { name: 48, sub: 32, division: 28, status: 52, filled: false, date: 22, dot: 'high' },
  { name: 70, sub: 44, division: 40, status: 40, filled: true, date: 26, dot: 'mid' },
  { name: 54, sub: 36, division: 30, status: 44, filled: false, date: 24, dot: 'mid' },
  { name: 66, sub: 30, division: 36, status: 56, filled: false, date: 26, dot: 'high' },
  { name: 44, sub: 38, division: 26, status: 40, filled: true, date: 22, dot: 'mid' },
];

function queueScreen() {
  const c = QUEUE_COLS;
  const rows = QUEUE_ROWS.flatMap((row, i) => {
    const y = QUEUE_TOP + i * QUEUE_ROW_H;
    const selected = i === QUEUE_SELECTED;
    return [
      // the open application: a hairline amber outline and an amber status dot
      ...(selected ? [box(PAD - 4, y + 1, RIGHT - PAD + 8, QUEUE_ROW_H - 2, { stroke: 'accent' })] : []),
      disc(c.dot, y + 10, 2.5, selected ? { tone: 'high', hue: 'accent' } : { tone: row.dot }),
      bar(c.name, y + 6, row.name),
      bar(c.name, y + 12, row.sub, 2, 'mid'),
      bar(c.division, y + 8, row.division, 4, 'mid'),
      row.filled
        ? box(c.status, y + 4, row.status, 12, { r: 6, tone: 'mid' })
        : box(c.status, y + 4, row.status, 12, { r: 6, stroke: 'base' }),
      ...(row.filled ? [] : [bar(c.status + 6, y + 8, row.status - 12, 4, 'mid')]),
      bar(c.date, y + 8, row.date, 4, 'mid'),
      ...(i < QUEUE_ROWS.length - 1 ? [rule(PAD, y + QUEUE_ROW_H, RIGHT, y + QUEUE_ROW_H)] : []),
    ];
  });

  return [
    ...appBar(0),
    // page title, count badge, subtitle
    bar(PAD, 30, 84, 6),
    box(104, 29, 20, 8, { r: 4, stroke: 'base' }),
    bar(110, 32, 8, 2),
    bar(PAD, 42, 64, 4, 'mid'),
    // filter pills — the last one active
    box(206, 42, 30, 10, { r: 5, stroke: 'base' }),
    bar(212, 46, 18, 2, 'mid'),
    box(240, 42, 30, 10, { r: 5, stroke: 'base' }),
    bar(246, 46, 18, 2, 'mid'),
    box(274, 42, 32, 10, { r: 5, tone: 'mid', stroke: 'base' }),
    // column headers
    bar(c.name, QUEUE_HEAD_Y, 24, 2),
    bar(c.division, QUEUE_HEAD_Y, 22, 2),
    bar(c.status, QUEUE_HEAD_Y, 24, 2),
    bar(c.date, QUEUE_HEAD_Y, 20, 2),
    rule(PAD, QUEUE_TOP, RIGHT, QUEUE_TOP),
    ...rows,
  ];
}

/** Numbers read off a COPY.redacted caption, so the drawing can't drift from it. */
function captionNumbers(key, pattern, fallback) {
  const match = COPY.redacted.find((item) => item.key === key)?.label.match(pattern);
  return match ? match.slice(1).map(Number) : fallback;
}

/* Application form — "step 4 of 10": a segmented rail, fields, footer. */
const [FORM_STEP, FORM_STEPS] = captionNumbers('form', /step (\d+) of (\d+)/i, [4, 10]);
const FORM_CURRENT = FORM_STEP - 1; // zero-based
const FORM_SEG_GAP = 4;
const FORM_SEG_W = (RIGHT - PAD - (FORM_STEPS - 1) * FORM_SEG_GAP) / FORM_STEPS;

function formScreen() {
  const rail = Array.from({ length: FORM_STEPS }, (_, i) => {
    const x = PAD + i * (FORM_SEG_W + FORM_SEG_GAP);
    if (i < FORM_CURRENT) return bar(x, 40, FORM_SEG_W, 4, 'high');
    if (i === FORM_CURRENT) return bar(x, 40, FORM_SEG_W, 4, 'high', 'accent');
    return bar(x, 40, FORM_SEG_W, 4, 'low');
  });
  const input = (x, y, w) => box(x, y, w, 18, { stroke: 'base' });

  return [
    ...appBar(-1),
    // "step 4 of 10" over the segmented rail
    bar(PAD, 30, 46, 2),
    ...rail,
    // section title + help text
    bar(PAD, 52, 118, 6),
    bar(PAD, 64, 196, 4, 'mid'),
    bar(PAD, 70, 150, 4, 'mid'),
    // two-up fields
    bar(PAD, 82, 40, 2),
    bar(166, 82, 52, 2),
    input(PAD, 88, 140),
    input(166, 88, 140),
    bar(20, 94, 64),
    bar(172, 94, 40, 4, 'mid'),
    bar(PAD, 114, 56, 2),
    bar(166, 114, 34, 2),
    input(PAD, 120, 140),
    input(166, 120, 140),
    bar(20, 126, 52),
    chevron('140,127 144,131 148,127'),
    bar(172, 126, 76),
    // long answer
    bar(PAD, 146, 48, 2),
    box(PAD, 152, RIGHT - PAD, 26, { stroke: 'base' }),
    bar(20, 158, 220),
    bar(20, 166, 132, 4, 'mid'),
    // footer — back · saved-as-you-go · save draft · next
    box(PAD, 184, 44, 12, { stroke: 'base' }),
    bar(24, 188, 24, 4, 'mid'),
    disc(70, 190, 2, { tone: 'high', hue: 'jade' }),
    bar(76, 188, 40, 4, 'mid'),
    box(196, 184, 56, 12, { stroke: 'base' }),
    bar(204, 188, 40, 4, 'mid'),
    box(258, 184, RIGHT - 258, 12, { tone: 'high' }),
  ];
}

/* Phase photo review — a 3×2 grid of site photos, a checklist, approve/reject. */
const PHOTO_W = 62;
const PHOTO_H = 44;
const PHOTO_COLS = [PAD, 83, 152];
const PHOTO_ROWS = [54, 104];
const PHOTO_SELECTED = 4;
const PHOTO_VARIATION = [0, 4, -2, 6, 2, -4]; // deterministic skyline wobble
const PHASE_DOTS = [128, 146, 164]; // inline after the title
const PHASE_Y = 33;
const PHASE_CURRENT = captionNumbers('phase', /phase (\d+)/i, [2])[0] - 1; // zero-based
const CHECKLIST = [44, 36, 50, 30];
const CHECKED = 3;

function photo(x, y, i) {
  const v = PHOTO_VARIATION[i];
  const base = y + PHOTO_H - 1;
  const skyline = [
    [x + 1, base],
    [x + 18, base - 20 - v],
    [x + 28, base - 12],
    [x + 40 + v, base - 26 + v],
    [x + PHOTO_W - 1, base - 6],
    [x + PHOTO_W - 1, base],
  ]
    .map((pt) => pt.join(','))
    .join(' ');
  return [
    box(x, y, PHOTO_W, PHOTO_H, { r: 2, tone: 'low', stroke: i === PHOTO_SELECTED ? 'hi' : 'base' }),
    poly(skyline, 'high'),
    disc(x + 48 - v, y + 12, 4, { tone: 'mid' }),
  ];
}

function phaseScreen() {
  const photos = PHOTO_ROWS.flatMap((y, r) => PHOTO_COLS.flatMap((x, c) => photo(x, y, r * PHOTO_COLS.length + c)));
  const stepper = PHASE_DOTS.flatMap((cx, i) => {
    const marks = [];
    if (i > 0) marks.push(rule(PHASE_DOTS[i - 1] + 5, PHASE_Y, cx - 5, PHASE_Y));
    if (i < PHASE_CURRENT) marks.push(disc(cx, PHASE_Y, 3, { tone: 'high' }));
    if (i === PHASE_CURRENT) {
      marks.push(disc(cx, PHASE_Y, 3, { tone: 'high', hue: 'accent' }));
      marks.push(disc(cx, PHASE_Y, 5, { stroke: 'accent' }));
    }
    if (i > PHASE_CURRENT) marks.push(disc(cx, PHASE_Y, 3, { stroke: 'base' }));
    return marks;
  });
  const checklist = CHECKLIST.flatMap((w, i) => {
    const y = 70 + i * 12;
    return [
      box(232, y - 1, 6, 6, { r: 1, stroke: 'base', ...(i < CHECKED ? { tone: 'high' } : null) }),
      bar(244, y, w, 4, 'mid'),
    ];
  });

  return [
    ...appBar(2),
    bar(PAD, 30, 96, 6),
    bar(PAD, 42, 70, 4, 'mid'),
    ...stepper,
    ...photos,
    // photo count + HQ notes under the grid
    bar(PAD, 156, 52, 2),
    bar(PAD, 166, 180, 4, 'mid'),
    bar(PAD, 174, 128, 4, 'mid'),
    // review panel — checklist, notes, approve / reject
    box(226, 54, 80, 94, { stroke: 'base' }),
    bar(232, 60, 40, 2),
    ...checklist,
    box(232, 118, 68, 24, { r: 2, tone: 'low', stroke: 'base' }),
    box(226, 156, 80, 14, { tone: 'high', hue: 'jade' }),
    box(226, 176, 80, 14, { stroke: 'base' }),
    bar(252, 180, 28, 4, 'mid'),
  ];
}

/** Split a screen into its dithered fills, its outlines, and the patterns it needs. */
function prepare(shapes) {
  const filled = shapes.filter((s) => s.tone);
  const outlined = shapes.filter((s) => s.stroke);
  const combos = [...new Set(filled.map((s) => `${s.hue}:${s.tone}`))].map((k) => k.split(':'));
  return { filled, outlined, combos };
}

const SCREENS = {
  queue: prepare(queueScreen()),
  form: prepare(formScreen()),
  phase: prepare(phaseScreen()),
};

/* ── rendering ──────────────────────────────────────────────────────────── */
const patternId = (uid, hue, tone, up = false) => `${uid}-${hue}-${tone}${up ? '-up' : ''}`;

/** Bayer cells whose threshold falls in [from, to) — one ordered-dither tone. */
function bayerCells(from, to) {
  const cells = [];
  BAYER_4.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v >= from && v < to) cells.push([c, r]);
    }),
  );
  return cells;
}

function DitherPattern({ id, hue, from, to }) {
  const { color, opacity } = HUES[hue];
  return (
    <pattern id={id} width={CELL * 4} height={CELL * 4} patternUnits="userSpaceOnUse">
      <g fill={color} fillOpacity={opacity}>
        {bayerCells(from, to).map(([c, r]) => (
          <rect key={`${c}-${r}`} x={c * CELL + DOT_INSET} y={r * CELL + DOT_INSET} width={DOT} height={DOT} />
        ))}
      </g>
    </pattern>
  );
}

function Shape({ s, fill = 'none', stroke }) {
  const paint = stroke ? { fill, stroke, ...STROKE_PROPS } : { fill };
  switch (s.kind) {
    case 'circle':
      return <circle cx={s.cx} cy={s.cy} r={s.r} {...paint} />;
    case 'line':
      return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...paint} />;
    case 'polygon':
      return <polygon points={s.points} {...paint} />;
    case 'polyline':
      return <polyline points={s.points} {...paint} strokeLinecap="round" strokeLinejoin="round" />;
    default:
      return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} {...paint} />;
  }
}

function Wireframe({ screen, uid, custom }) {
  const { filled, outlined, combos } = screen;
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {combos.map(([hue, tone]) => {
          const level = TONE_LEVEL[tone];
          return [
            <DitherPattern key={patternId(uid, hue, tone)} id={patternId(uid, hue, tone)} hue={hue} from={0} to={level} />,
            <DitherPattern
              key={patternId(uid, hue, tone, true)}
              id={patternId(uid, hue, tone, true)}
              hue={hue}
              from={level}
              to={Math.min(BAYER_MAX, level + HOVER_STEP)}
            />,
          ];
        })}
      </defs>

      {/* the dither "prints" in on first view */}
      <motion.g variants={DEVELOP_VARIANTS} custom={custom}>
        {filled.map((s, i) => (
          <Shape key={i} s={s} fill={`url(#${patternId(uid, s.hue, s.tone)})`} />
        ))}
      </motion.g>

      {/* hover: exactly the next threshold's dots fade in — one step denser */}
      <g className="opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 motion-reduce:transition-none">
        {filled.map((s, i) => (
          <Shape key={i} s={s} fill={`url(#${patternId(uid, s.hue, s.tone, true)})`} />
        ))}
      </g>

      <g>
        {outlined.map((s, i) => (
          <Shape key={i} s={s} stroke={STROKES[s.stroke]} />
        ))}
      </g>
    </svg>
  );
}

function Tile({ item, index, shown, reduce }) {
  const uid = `rd${useId().replace(/[^\w-]/g, '')}`;
  const screen = SCREENS[item.key];
  const custom = { reduce, index };
  return (
    <motion.li
      variants={TILE_VARIANTS}
      custom={custom}
      initial="hidden"
      animate={shown ? 'show' : 'hidden'}
      className="w-[78%] shrink-0 snap-start md:w-auto"
    >
      <figure className="group m-0">
        <div className="relative aspect-[16/10] overflow-hidden rounded-panel border border-line bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-300 group-hover:border-line-hi motion-reduce:transition-none">
          {screen ? <Wireframe screen={screen} uid={uid} custom={custom} /> : null}
          <span className="absolute right-2 top-2 rounded-chip border border-line-hi bg-surface px-1.5 py-0.5 font-mono text-micro uppercase leading-none tracking-[0.16em] text-ink-subtle">
            {STAMP}
          </span>
        </div>
        <figcaption className="mt-2.5 flex items-baseline gap-2 font-mono text-micro uppercase tracking-[0.14em] text-ink-subtle">
          <span aria-hidden="true" className="text-ink-faint">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span>{item.label}</span>
        </figcaption>
      </figure>
    </motion.li>
  );
}

export default function Redacted() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const shown = Boolean(reduce) || inView;
  const wide = useSyncExternalStore(subscribeWide, getWide, getWideServer);

  return (
    <div ref={ref} className="min-w-0">
      <p className="max-w-[70ch] text-label text-ink-subtle">
        <span className="text-ink-muted">{NOTE_LEAD}</span>
        {NOTE_REST}
      </p>

      {/* a snap carousel under 768px, a quiet row of three above it */}
      <div
        role={wide ? undefined : 'region'}
        aria-label={wide ? undefined : REGION_LABEL}
        tabIndex={wide ? undefined : 0}
        className="mt-4 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-line-hi md:snap-none md:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        <ul className="m-0 flex list-none gap-3 p-0 md:grid md:grid-cols-3 md:gap-5">
          {COPY.redacted.map((item, i) => (
            <Tile key={item.key} item={item} index={i} shown={shown} reduce={Boolean(reduce)} />
          ))}
        </ul>
      </div>
    </div>
  );
}
