'use client';

/**
 * College Matcher hero: a match score being read part by part.
 *
 * Five rows, one per part of the score, each a track as long as its weight
 * (academics 50, money 20, personality 15, location & size 10, activities 5),
 * so the weights are visible before a single point is scored. An example
 * school fills the tracks; the filled pieces then drop, one by one, into the
 * 100-point bar below and lay end to end to make the total. When a realism
 * cap applies, a clamp drops onto the bar at 30 (GPA well below the school's
 * average) or 20 (tuition far over budget) and the points past it go dark.
 * Last, the school lands on one of three shelves, safety, target or reach,
 * by its admission odds. Three example schools play in turn (one clean, one
 * capped for GPA, one capped for cost), so a cycle ends with one school on
 * every shelf: the balanced list.
 *
 * Facts: weights, caps, odds thresholds and match levels are the study's own
 * (src/data/studies/college-matcher.js: FEATURES, FLOW, DECISIONS). The three
 * schools and their per-part points are illustrative, labelled as such, and
 * kept consistent with the rules (academics = 30 × program strength + 20 ×
 * admission odds; the caps and thresholds as written).
 *
 * Motion: on first view the tracks and shelves fade up; the walk through the
 * three schools then loops only while the figure is on screen, one beat at a
 * time on timers. Reduced motion: the finished last beat, still (school C
 * capped at 20, all three schools on their shelves). Two fitted layouts by
 * container query keep every label at 11px or more: 'wide' from a 440px
 * container up, 'compact' below.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { P, alpha } from '@/components/ui/case/tokens';
import { EASE_OUT } from '@/lib/motion';
import { FLOW } from '@/data/studies/college-matcher';

/* ── the rules (src/data/studies/college-matcher.js) ───────────────────── */
// FEATURES 'score' / DECISIONS 'weights': scoringWeights
const PARTS = [
  { key: 'academic', label: 'Academics', weight: 50 },
  { key: 'financial', label: 'Money', weight: 20 },
  { key: 'personality', label: 'Personality', weight: 15 },
  { key: 'locationSize', label: 'Location & size', weight: 10 },
  { key: 'extracurricular', label: 'Activities', weight: 5 },
];
// FLOW 'caps' / DECISIONS 'caps'
const CAPS = {
  gpa: { at: 30, rule: 'GPA below 0.8 × the school’s average' },
  budget: { at: 20, rule: 'Tuition above 1.5 × the budget' },
};
// FLOW 'balance' / DECISIONS 'balance': labelled by admission probability
const SHELVES = [
  { key: 'safety', label: 'SAFETY', rule: 'odds ≥ 0.8', says: 'at least 0.8', noun: 'safety', min: 0.8 },
  { key: 'target', label: 'TARGET', rule: 'odds ≥ 0.4', says: 'at least 0.4', noun: 'target', min: 0.4 },
  { key: 'reach', label: 'REACH', rule: 'odds under 0.4', says: 'under 0.4', noun: 'reach', min: -Infinity },
];
// "Match levels: Perfect ≥ 85, Excellent ≥ 70, Good ≥ 55, Fair ≥ 40", read from FLOW
const LEVELS = [
  ...(FLOW.steps.find((s) => s.key === 'balance')?.facts.join(' ') ?? '').matchAll(/([A-Z][a-z]+) ≥ (\d+)/g),
]
  .map((m) => ({ name: m[1], min: Number(m[2]) }))
  .sort((a, b) => b.min - a.min);

/* ── the example schools (illustrative values, consistent with the rules) ─ */
// A: odds 0.9, strength 0.8: academics 24 + 18 = 42. Within budget. No cap.
// B: a strong program (30) but odds 0.2 (+4): GPA under 0.8 × average, cap 30.
// C: odds 0.6, strength 0.9: 27 + 12 = 39; far over budget (money 2), cap 20.
const SCHOOLS = [
  { id: 'A', parts: [42, 16, 11, 7, 4], odds: 0.9, cap: null },
  { id: 'B', parts: [34, 18, 13, 8, 4], odds: 0.2, cap: CAPS.gpa },
  { id: 'C', parts: [39, 2, 12, 7, 3], odds: 0.6, cap: CAPS.budget },
].map((s) => {
  const raw = s.parts.reduce((a, b) => a + b, 0);
  return {
    ...s,
    raw,
    // where each part's piece starts in the 100-point bar, in points
    starts: s.parts.map((_, i) => s.parts.slice(0, i).reduce((a, b) => a + b, 0)),
    score: s.cap ? Math.min(raw, s.cap.at) : raw,
    // the level belongs to the final score: a capped school (30, 20) is under Fair
    level: LEVELS.find((l) => (s.cap ? Math.min(raw, s.cap.at) : raw) >= l.min)?.name ?? null,
    shelf: SHELVES.findIndex((sh) => s.odds >= sh.min),
  };
});

/* ── the loop, one beat at a time ──────────────────────────────────────── */
const MS = { fill: 2100, sum: 2000, cap: 2200, land: 2000, list: 3200 };
const RANK = { fill: 0, sum: 1, cap: 2, land: 3, list: 4 };
const article = (word) => (/^[AEIOU]/i.test(word) ? 'an' : 'a');

const SCRIPT = [
  ...SCHOOLS.flatMap((s, i) => {
    const shelf = SHELVES[s.shelf];
    return [
      { school: i, phase: 'fill', caption: `School ${s.id}: each of the five parts is scored against its own weight` },
      {
        school: i,
        phase: 'sum',
        caption: `The parts add up to ${s.raw} of 100${s.cap || !s.level ? '' : `, ${article(s.level)} ${s.level} match`}`,
      },
      ...(s.cap ? [{ school: i, phase: 'cap', caption: `${s.cap.rule}, so the score is capped at ${s.cap.at}` }] : []),
      {
        school: i,
        phase: 'land',
        caption: `Admission odds ${s.odds.toFixed(1)}, ${shelf.says}, so school ${s.id} is ${article(shelf.noun)} ${shelf.noun}`,
      },
    ];
  }),
  {
    school: SCHOOLS.length - 1,
    phase: 'list',
    caption: 'Balanced by GPA across safety, target and reach, then filled with the best matches, up to ten',
  },
].map((b) => ({ ...b, ms: MS[b.phase] }));
const LAST = SCRIPT.length - 1;

/* ── geometry (viewBox units) ──────────────────────────────────────────── */
// 13u text lands at 11.4px on a 440px (wide) / 11.6px on a 320px (compact) render
const T = { label: 13.5, mono: 13, total: 22, tag: 13 };
const TAG_TRACK_EM = 0.12;
const MONO_EM = 0.6;
const PAD = 6;
const LABEL_COL = 104; // widest part label, "Location & size"
const TRACK_GAP = 16; // track end to the points column
const DEN_GAP = 5; // points to their "/ 50"
const HEADER_Y = 16;
const ROW0_Y = 52;
const ROW_PITCH = 30;
const ROW_H = 10;
const TOTAL_Y = 224; // centre of the 100-point bar
const TOTAL_H = 22;
const SEP_W = 1.5; // the void-coloured seam between pieces in the bar
const CLAMP_OVER = 7; // the clamp line runs this far past the bar
const SHELF_Y = 306;
const CHIP = { w: 74, h: 24, gap: 4 };
const SHELF_HALF = 46;
const VIEW_H = 354;

const monoWidth = (text, size, trackEm = 0) => text.length * size * (MONO_EM + trackEm);

function fit(key, viewW) {
  const denX = viewW - PAD - monoWidth('/ 100', T.mono);
  const ptsX = denX - DEN_GAP; // right edge of the points column
  const trackX = PAD + LABEL_COL + 10;
  const span = ptsX - monoWidth('00', T.mono) - TRACK_GAP - trackX;
  const u = span / 100; // viewBox units per point
  return {
    key,
    viewW,
    denX,
    ptsX,
    trackX,
    u,
    rows: PARTS.map((p, i) => ({ ...p, y: ROW0_Y + i * ROW_PITCH })),
    shelves: SHELVES.map((s, i) => ({ ...s, cx: (viewW * (2 * i + 1)) / 6 })),
    illustrative: key === 'wide' ? 'illustrative values' : 'illustrative',
    hide: key === 'wide' ? '@max-[440px]:hidden' : '@min-[440px]:hidden',
  };
}
const LAYOUTS = [fit('wide', 500), fit('compact', 360)];

/* ── motion (seconds) ──────────────────────────────────────────────────── */
const IN_VIEW = { once: true, amount: 0.3 };
const ON_SCREEN = { amount: 0.3 };
const ENTER = { first: 0.05, step: 0.07, dur: 0.6, rise: 6 };
const FILL = { first: 0.35, step: 0.16, dur: 0.55 };
const DROP = { step: 0.17, dur: 0.6 };
const CLAMP = { dur: 0.45, veilLag: 0.3 };

const mix = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, var(--void))`;

/* ── a11y ──────────────────────────────────────────────────────────────── */
const DESCRIPTION = [
  `How a College Matcher score is made. Five parts add up to 100 points: ${PARTS.map((p) => `${p.label.toLowerCase()} ${p.weight}`).join(', ')}.`,
  `Two caps keep it realistic. ${CAPS.gpa.rule}: the score is capped at ${CAPS.gpa.at}. ${CAPS.budget.rule}: it is capped at ${CAPS.budget.at}.`,
  `Each school is then labelled by its admission odds: ${SHELVES.map((s) => `${s.noun} when the odds are ${s.says}`).join(', ')}, and the list is balanced across the three, up to ten.`,
  `Shown with three illustrative schools: ${SCHOOLS.map(
    (s) => `school ${s.id} scores ${s.raw}${s.cap ? `, capped at ${s.cap.at}` : ''}, odds ${s.odds.toFixed(1)}, a ${SHELVES[s.shelf].noun}`,
  ).join('; ')}.`,
].join(' ');

/* ── one layout ────────────────────────────────────────────────────────── */
function Figure({ g, beat, shown, reduce, accent }) {
  const school = SCHOOLS[beat.school];
  const rank = RANK[beat.phase];
  const capped = Boolean(school.cap) && rank >= RANK.cap;
  const totalTop = TOTAL_Y - TOTAL_H / 2;
  const capX = school.cap ? g.trackX + school.cap.at * g.u : 0;
  const rawX = g.trackX + school.raw * g.u;
  const sub = capped ? `was ${school.raw}` : rank >= RANK.sum && !school.cap ? school.level : null;
  const tagW = monoWidth(`SCHOOL ${school.id}`, T.tag, TAG_TRACK_EM);

  const enter = (i) => ({
    initial: reduce ? false : { opacity: 0, y: ENTER.rise },
    animate: shown ? { opacity: 1, y: 0 } : { opacity: 0, y: ENTER.rise },
    transition: { duration: ENTER.dur, ease: EASE_OUT, delay: ENTER.first + i * ENTER.step },
  });
  const appear = (from, transition) => ({
    initial: reduce ? false : { opacity: 0, ...from },
    animate: { opacity: 1, x: 0, y: 0 },
    transition,
  });

  // where each part's piece sits in the 100-point bar
  const pieces = school.parts.map((pts, i) => ({ x: g.trackX + school.starts[i] * g.u, w: pts * g.u }));

  return (
    <svg
      viewBox={`0 0 ${g.viewW} ${VIEW_H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={`block h-auto w-full overflow-visible ${g.hide}`}
    >
      {/* which school, and its odds */}
      <motion.g {...enter(0)}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.g
            key={school.id}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <text
              x={PAD}
              y={HEADER_Y}
              className="font-mono"
              fontSize={T.tag}
              fontWeight="600"
              letterSpacing={T.tag * TAG_TRACK_EM}
              fill={accent}
            >
              {`SCHOOL ${school.id}`}
            </text>
            <text x={PAD + tagW + 8} y={HEADER_Y} className="font-sans" fontSize={T.label} fill={P.inkSubtle}>
              {g.illustrative}
            </text>
            <text x={g.viewW - PAD} y={HEADER_Y} textAnchor="end">
              <tspan className="font-sans" fontSize={T.label} fill={P.inkMuted}>
                admission odds
              </tspan>
              <tspan
                className="font-mono"
                dx="6"
                fontSize={T.mono}
                fontWeight="600"
                style={{ fill: rank >= RANK.land ? accent : P.ink, transition: 'fill .3s' }}
              >
                {school.odds.toFixed(1)}
              </tspan>
            </text>
          </motion.g>
        </AnimatePresence>
      </motion.g>

      {/* the five parts: each track as long as its weight */}
      {g.rows.map((row, i) => (
        <motion.g key={row.key} {...enter(i + 1)}>
          <text x={PAD} y={row.y + 4.6} className="font-sans" fontSize={T.label} fill={P.inkMuted}>
            {row.label}
          </text>
          <rect
            x={g.trackX}
            y={row.y - ROW_H / 2}
            width={row.weight * g.u}
            height={ROW_H}
            rx="2"
            fill="none"
            stroke={P.lineHi}
            strokeWidth="1"
          />
          <text x={g.denX} y={row.y + 4.6} className="font-mono" fontSize={T.mono} fill={P.inkSubtle}>
            {`/ ${row.weight}`}
          </text>
        </motion.g>
      ))}

      {/* the 100-point bar */}
      <motion.g {...enter(PARTS.length + 1)}>
        <text x={PAD} y={TOTAL_Y + 4.8} className="font-sans" fontSize={T.label} fontWeight="600" fill={P.ink}>
          Match score
        </text>
        <rect
          x={g.trackX}
          y={totalTop}
          width={100 * g.u}
          height={TOTAL_H}
          rx="2"
          fill="none"
          stroke={P.lineHi}
          strokeWidth="1"
        />
        <text x={g.denX} y={TOTAL_Y + 4.6} className="font-mono" fontSize={T.mono} fill={P.inkSubtle}>
          / 100
        </text>
      </motion.g>

      {/* this school's points: fills, then the pieces dropping into the bar */}
      {shown && (
        <g key={`school-${beat.school}`}>
          {g.rows.map((row, i) => (
            <g key={row.key}>
              <motion.g
                style={{ originX: 0 }}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: FILL.dur, ease: EASE_OUT, delay: FILL.first + i * FILL.step }}
              >
                <rect x={g.trackX} y={row.y - ROW_H / 2} width={pieces[i].w} height={ROW_H} rx="2" fill={accent} />
              </motion.g>
              <motion.text
                x={g.ptsX}
                y={row.y + 4.6}
                textAnchor="end"
                className="font-mono"
                fontSize={T.mono}
                fontWeight="600"
                fill={P.ink}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: FILL.first + i * FILL.step + FILL.dur * 0.6 }}
              >
                {school.parts[i]}
              </motion.text>
            </g>
          ))}

          {rank >= RANK.sum &&
            g.rows.map((row, i) => (
              <motion.g
                key={row.key}
                style={{ originX: 0, originY: 0 }}
                initial={
                  reduce
                    ? false
                    : { x: g.trackX - pieces[i].x, y: row.y - ROW_H / 2 - totalTop, scaleY: ROW_H / TOTAL_H }
                }
                animate={{ x: 0, y: 0, scaleY: 1 }}
                transition={{ duration: DROP.dur, ease: EASE_OUT, delay: i * DROP.step }}
              >
                <rect
                  x={pieces[i].x}
                  y={totalTop}
                  width={pieces[i].w}
                  height={TOTAL_H}
                  fill={accent}
                  stroke={P.void}
                  strokeWidth={SEP_W}
                />
              </motion.g>
            ))}

          {/* the cap: a clamp on the bar, the points past it go dark */}
          {capped && (
            <>
              <motion.g {...appear({}, { duration: 0.35, delay: CLAMP.veilLag })}>
                <rect
                  x={capX}
                  y={totalTop}
                  width={rawX - capX}
                  height={TOTAL_H}
                  fill={alpha(P.void, 0.74)}
                  stroke={P.inkSubtle}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              </motion.g>
              <motion.g {...appear({ y: -10 }, { duration: CLAMP.dur, ease: EASE_OUT })}>
                <line
                  x1={capX}
                  y1={totalTop - CLAMP_OVER}
                  x2={capX}
                  y2={totalTop + TOTAL_H + CLAMP_OVER}
                  stroke={P.ink}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <text
                  x={capX + (T.tag * TAG_TRACK_EM) / 2}
                  y={totalTop - CLAMP_OVER - 5}
                  textAnchor="middle"
                  className="font-mono"
                  fontSize={T.tag}
                  fontWeight="600"
                  letterSpacing={T.tag * TAG_TRACK_EM}
                  fill={P.ink}
                >
                  {`CAP ${school.cap.at}`}
                </text>
              </motion.g>
            </>
          )}

          {/* the total, and its match level (or what it was before the cap) */}
          {rank >= RANK.sum && (
            <motion.text
              key={capped ? 'capped' : 'raw'}
              x={g.ptsX}
              y={TOTAL_Y + 7.5}
              textAnchor="end"
              className="font-mono"
              fontSize={T.total}
              fontWeight="600"
              fill={capped ? P.ink : accent}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: capped ? CLAMP.veilLag : (PARTS.length - 1) * DROP.step + DROP.dur }}
            >
              {capped ? school.score : school.raw}
            </motion.text>
          )}
          {sub && (
            <motion.text
              key={sub}
              x={g.viewW - PAD}
              y={TOTAL_Y + TOTAL_H / 2 + 19}
              textAnchor="end"
              className={capped ? 'font-mono' : 'font-sans'}
              fontSize={capped ? T.mono : T.label}
              fill={P.inkSubtle}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: capped ? CLAMP.veilLag : (PARTS.length - 1) * DROP.step + DROP.dur }}
            >
              {sub}
            </motion.text>
          )}
        </g>
      )}

      {/* safety, target, reach: where each school lands */}
      {g.shelves.map((shelf, k) => {
        const j = SCHOOLS.findIndex((s) => s.shelf === k);
        const s = SCHOOLS[j];
        const landed = shown && j >= 0 && (j < beat.school || (j === beat.school && rank >= RANK.land));
        const lit = landed && (beat.phase === 'list' || (j === beat.school && beat.phase === 'land'));
        return (
          <motion.g key={shelf.key} {...enter(PARTS.length + 2 + k)}>
            <line
              x1={shelf.cx - SHELF_HALF}
              y1={SHELF_Y}
              x2={shelf.cx + SHELF_HALF}
              y2={SHELF_Y}
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ stroke: lit ? accent : P.lineHi, transition: 'stroke .3s' }}
            />
            <text
              x={shelf.cx + (T.tag * TAG_TRACK_EM) / 2}
              y={SHELF_Y + 20}
              textAnchor="middle"
              className="font-mono"
              fontSize={T.tag}
              fontWeight="600"
              letterSpacing={T.tag * TAG_TRACK_EM}
              style={{ fill: lit ? accent : P.ink, transition: 'fill .3s' }}
            >
              {shelf.label}
            </text>
            <text x={shelf.cx} y={SHELF_Y + 38} textAnchor="middle" className="font-sans" fontSize={T.label} fill={P.inkSubtle}>
              {shelf.rule}
            </text>

            <AnimatePresence initial={false}>
              {landed && (
                <motion.g
                  key={`${s.id}-chip`}
                  initial={reduce ? false : { opacity: 0, y: -18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                >
                  <rect
                    x={shelf.cx - CHIP.w / 2}
                    y={SHELF_Y - CHIP.gap - CHIP.h}
                    width={CHIP.w}
                    height={CHIP.h}
                    rx="5"
                    strokeWidth="1"
                    style={{
                      fill: lit ? mix(accent, 16) : mix(accent, 6),
                      stroke: lit ? accent : alpha(accent, 0.45),
                      transition: 'fill .3s, stroke .3s',
                    }}
                  />
                  <text x={shelf.cx} y={SHELF_Y - CHIP.gap - CHIP.h / 2 + 4.6} textAnchor="middle" className="font-mono" fontSize={T.mono}>
                    <tspan fontWeight="600" fill={accent}>
                      {s.id}
                    </tspan>
                    <tspan dx="8" fill={P.ink}>
                      {s.score}
                    </tspan>
                  </text>
                </motion.g>
              )}
            </AnimatePresence>
          </motion.g>
        );
      })}
    </svg>
  );
}

export default function Hero({ accent = P.accent }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const entered = useInView(ref, IN_VIEW);
  const onScreen = useInView(ref, ON_SCREEN);
  const [step, setStep] = useState(0);

  // one beat at a time, only while the figure is on screen
  useEffect(() => {
    if (reduce || !entered || !onScreen) return undefined;
    const id = setTimeout(() => setStep((s) => (s + 1) % SCRIPT.length), SCRIPT[step].ms);
    return () => clearTimeout(id);
  }, [reduce, entered, onScreen, step]);

  const beat = SCRIPT[reduce ? LAST : step];
  const shown = Boolean(reduce) || entered;

  return (
    <div ref={ref} className="@container mx-auto w-full max-w-[560px]">
      <p className="sr-only">{DESCRIPTION}</p>
      {LAYOUTS.map((g) => (
        <Figure key={g.key} g={g} beat={beat} shown={shown} reduce={Boolean(reduce)} accent={accent} />
      ))}

      {/* what this beat shows */}
      <div className="mt-4 min-h-[3.25rem] text-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {shown && (
            <motion.p
              key={reduce ? 'still' : step}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="mx-auto max-w-[46ch] text-sm leading-snug text-ink-muted"
            >
              {beat.caption}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
