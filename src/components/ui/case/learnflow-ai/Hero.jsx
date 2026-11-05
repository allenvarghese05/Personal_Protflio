'use client';

/**
 * LearnFlow AI, the hero figure: one course's semester filling itself in.
 *
 * Top to bottom, the figure is the planner a student sees for one class:
 *   the link field     the Canvas calendar feed, pasted in (its .ics ending lit)
 *   the course line    the tag Canvas puts on every title, split into code,
 *                      section and term (CT-210, section 001, Fall 2026), then
 *                      the action the preview proposes (a new class)
 *   FROM CANVAS        five lanes, one per assignment type (exam, project,
 *                      reading, milestone, homework), across the term's weeks
 *   FROM THE SYLLABUS  the syllabus PDF, and the lecture lane it generates
 *
 * The loop walks the seven FLOW steps, one beat each: the link types in, the
 * course is found and given a class, Canvas items drop into their lanes by
 * type, the syllabus is read, then applied (class details fill in, lectures
 * appear in every week, two items Canvas didn't list are added, and one that
 * Canvas already had finds its twin and is not added twice), and a re-sync
 * sweeps the Canvas lanes and removes nothing. It rests, clears, and starts
 * again, only while the figure is on screen. The caption under it reads each
 * step from the data.
 *
 * Settled colours carry the meaning: grey dots came from Canvas, accent marks
 * came from the syllabus. Week positions are sample values (the figure says
 * "sample term"); every name, type and step is from src/data/studies/
 * learnflow-ai.js and src/data/showcase.js.
 *
 * Two layouts, picked by a container query so text never lands under 11px:
 * 'full' (500 units wide) from a 460px wrapper up, 'compact' (380 units, a
 * narrower gutter and week grid) below. Reduced motion shows the finished
 * semester, still, with the summary caption.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { P, alpha } from '@/components/ui/case/tokens';
import { EASE_OUT } from '@/lib/motion';
import { COPY, FLOW } from '@/data/studies/learnflow-ai';
import { SHOWCASE } from '@/data/showcase';

/* ── facts (from the data; see the comments for where) ─────────────────── */
// FLOW.steps[paste].facts: "…instructure.com/feeds/calendars/user_….ics"
const FEED_HEAD = '…/feeds/calendars/user_…';
const FEED_TAIL = '.ics';
const FEED_PLACEHOLDER = 'Paste your Canvas calendar link';
// DECISIONS[identity].steps: "Code CT-210 · section 001 · term Fall 2026"
const COURSE = { code: 'CT-210', section: 'section 001', term: 'Fall 2026' };
// FLOW.steps[map].facts: link, create or skip; a new course is created
const ACTION = 'NEW CLASS';
// FLOW.steps[import].body: "exam, project, reading, milestone or homework"
const TYPES = ['Exam', 'Project', 'Reading', 'Milestone', 'Homework'];
// FLOW.steps[syllabus].facts: instructor, office hours, grading (and more)
const DETAILS = 'Instructor · office hours · grading';
const SYLLABUS_PILL = 'Syllabus PDF';
const LECTURES = 'Lectures';
// FLOW.steps[apply].body: matched by title similarity "so nothing appears twice"
const DUP_LABEL = 'already listed';

/* ── sample term (illustrative positions, labelled as such) ────────────── */
const N_WEEKS = 14;
const PER_WEEK = 2; // lecture meetings drawn per week
const CANVAS_ITEMS = {
  Exam: [6, 13],
  Project: [7, 12],
  Reading: [0, 1, 3, 5, 8, 10],
  Milestone: [4, 9],
  Homework: [1, 2, 3, 5, 6, 8, 9, 11],
};
const MISSING = [
  { type: 'Reading', week: 12 },
  { type: 'Homework', week: 13 },
]; // syllabus assignments Canvas didn't list
const DUPLICATE = { type: 'Exam', week: 6 }; // a syllabus item Canvas already had

/* ── captions: FLOW labels + the showcase's one-line steps ─────────────── */
const STEP_TEXT = SHOWCASE['learnflow-ai']?.steps ?? [];
const CAPTIONS = [
  ...FLOW.steps.map((s, i) => ({
    key: s.key,
    num: String(i + 1).padStart(2, '0'),
    label: s.label,
    text: STEP_TEXT[i]?.text ?? s.title,
  })),
  { key: 'done', num: null, label: null, text: COPY.headlines.how },
];

/* ── beats ─────────────────────────────────────────────────────────────── */
const S = { paste: 0, course: 1, map: 2, import: 3, read: 4, apply: 5, resync: 6, hold: 7, reset: 8 };
const BEAT_MS = [1800, 1700, 1500, 2600, 1800, 4200, 2600, 2400, 600]; // apply holds until its label has read
const START_MS = 1000; // first view: the entrance plays, then the link types in
const RESTART_MS = 600; // after a reset: the empty field, then again

/* ── motion (seconds) ──────────────────────────────────────────────────── */
const ENTER = { dur: 0.6, step: 0.06, rise: 6 };
const TYPE_S = 1.1; // the link typing in
const DROP = { first: 0.1, perWeek: 0.1, perLane: 0.025, dur: 0.45, fall: 10 };
const READ_S = 1.4; // the syllabus being read
const LECTURE = { perWeek: 0.07, dur: 0.35 };
const MISSING_AT = [1.1, 1.4];
const GHOST = { at: 1.8, dur: 1.2 };
const SWEEP_S = 1.9;
const FADE_MS = 500;
const COLOUR_MS = 600;

/* ── geometry (viewBox units) ──────────────────────────────────────────── */
const PAD = 8;
const T = { body: 13.5, lane: 14, code: 16, tag: 13.5 }; // 13.5u lands at 11px or more in both layouts
const TRACK = 0.12; // em, on uppercase mono tags
const PILL = { y: 6, h: 28, padX: 14 };
const COURSE_Y = 62;
const TAG = { h: 22, padX: 10 };
const DETAILS_Y = 86;
const CANVAS_HEAD_Y = 116;
const LANE0 = 138;
const LANE_PITCH = 26;
const SYL_PILL_Y = 260;
const LECTURE_Y = 310;
const AXIS_Y = 328;
const AXIS_LABEL_Y = 346;
const VIEW_H = 354;
const DOT_R = 4.5;
const SLOT_R = 1.1;
const BAR = { w: 3, h: 12 };

const r2 = (n) => Math.round(n * 100) / 100;

const LAYOUTS = [
  { key: 'full', viewW: 500, gutter: 104, hide: '@max-[460px]:hidden' },
  { key: 'compact', viewW: 380, gutter: 84, hide: '@min-[460px]:hidden' },
].map((l) => {
  const x0 = PAD + l.gutter;
  const x1 = l.viewW - PAD;
  const colW = (x1 - x0) / N_WEEKS;
  return { ...l, x0, x1, colW, cx: (w) => r2(x0 + (w + 0.5) * colW) };
});

/* ── text widths (rough Inter / JetBrains Mono advances, em) ───────────── */
const monoW = (text, size, track = 0) => text.length * size * (0.6 + track);
const laneY = (type) => LANE0 + TYPES.indexOf(type) * LANE_PITCH;

const FEED_PILL_W = r2(monoW(FEED_HEAD + FEED_TAIL, T.body) + 2 * PILL.padX);
const TAG_W = r2(monoW(ACTION, T.tag, TRACK) + 2 * TAG.padX);
const SYL_PILL_W = 114; // "Syllabus PDF" at 13.5u, plus padding
const CODE_W = 60; // "CT-210" at 16u semibold
const SECTION_W = 78; // "section 001" at 13.5u
const SEP_W = 16;

const mix = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, var(--void))`;
const colour = (prop = 'fill') => `${prop} ${COLOUR_MS}ms ease, opacity ${COLOUR_MS}ms ease`;

/* ── a11y ──────────────────────────────────────────────────────────────── */
const DESCRIPTION =
  `One course’s semester filling itself in. A Canvas calendar link is pasted. The course tag is split into ${COURSE.code}, ${COURSE.section}, ${COURSE.term}, and a new class is created. ` +
  `Canvas items land in the term’s weeks by type: ${TYPES.join(', ').toLowerCase()}. ` +
  'Then the syllabus PDF is read and applied: instructor, office hours and grading fill in, lectures appear in every week, and two assignments Canvas didn’t list are added, while one it already had is recognised and not added twice. ' +
  'A re-sync then checks every Canvas item and removes nothing. Week positions are a sample term.';

/* ── pieces ────────────────────────────────────────────────────────────── */

/** The link field: a placeholder, then the feed URL typing in. */
function FeedPill({ s, accent, reduce }) {
  // useId's characters aren't all safe inside url(#…)
  const clip = `feed-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const typed = s >= S.paste;
  const shown = typed && s < S.reset; // fades with the rest on reset
  const w = FEED_PILL_W;
  const baseline = PILL.y + PILL.h / 2 + T.body * 0.35;
  return (
    <g>
      <rect
        x={PAD}
        y={PILL.y}
        width={w}
        height={PILL.h}
        rx={PILL.h / 2}
        fill={mix(P.surface, 70)}
        strokeWidth="1"
        style={{ stroke: s === S.paste ? accent : P.lineHi, transition: colour('stroke') }}
      />
      <text
        x={PAD + PILL.padX}
        y={baseline}
        className="font-sans"
        fontSize={T.body}
        fill={P.inkSubtle}
        style={{ opacity: typed ? 0 : 1, transition: colour() }}
      >
        {FEED_PLACEHOLDER}
      </text>
      <clipPath id={clip}>
        <motion.rect
          x={PAD + PILL.padX - 2}
          y={PILL.y}
          height={PILL.h}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: typed ? w - 2 * PILL.padX + 4 : 0 }}
          transition={typed && !reduce ? { duration: TYPE_S, ease: 'linear' } : { duration: 0 }}
        />
      </clipPath>
      <text
        x={PAD + PILL.padX}
        y={baseline}
        className="font-mono"
        fontSize={T.body}
        clipPath={`url(#${clip})`}
        style={{ opacity: shown ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
      >
        <tspan fill={P.ink}>{FEED_HEAD}</tspan>
        <tspan fill={accent} fontWeight="600">
          {FEED_TAIL}
        </tspan>
      </text>
    </g>
  );
}

/** Fades a piece in (and out on reset) once its beat has come. */
function Reveal({ on, delay = 0, from = { y: 4 }, reduce, children }) {
  const hidden = { opacity: 0, ...from };
  return (
    <motion.g
      initial={reduce ? false : hidden}
      animate={on ? { opacity: 1, x: 0, y: 0 } : hidden}
      transition={{ duration: 0.45, ease: EASE_OUT, delay: on && !reduce ? delay : 0 }}
    >
      {children}
    </motion.g>
  );
}

/** The course line: code, section, term, then the proposed action. */
function CourseLine({ layout, s, accent, reduce }) {
  const xSection = PAD + CODE_W + SEP_W;
  const xTerm = xSection + SECTION_W + SEP_W;
  const tagX = r2(layout.viewW - PAD - TAG_W);
  const tagLit = s === S.map;
  return (
    <g>
      <Reveal on={s >= S.course} reduce={reduce}>
        <text x={PAD} y={COURSE_Y} className="font-sans" fontSize={T.code} fontWeight="600" fill={P.ink}>
          {COURSE.code}
        </text>
      </Reveal>
      <Reveal on={s >= S.course} delay={0.25} reduce={reduce}>
        <text x={xSection - SEP_W / 2} y={COURSE_Y} textAnchor="middle" fontSize={T.body} fill={P.inkSubtle}>
          ·
        </text>
        <text x={xSection} y={COURSE_Y} className="font-sans" fontSize={T.body} fill={P.inkMuted}>
          {COURSE.section}
        </text>
      </Reveal>
      <Reveal on={s >= S.course} delay={0.5} reduce={reduce}>
        <text x={xTerm - SEP_W / 2} y={COURSE_Y} textAnchor="middle" fontSize={T.body} fill={P.inkSubtle}>
          ·
        </text>
        <text x={xTerm} y={COURSE_Y} className="font-sans" fontSize={T.body} fill={P.inkMuted}>
          {COURSE.term}
        </text>
      </Reveal>
      <Reveal on={s >= S.map} from={{ x: 6 }} reduce={reduce}>
        <rect
          x={tagX}
          y={COURSE_Y - 16}
          width={TAG_W}
          height={TAG.h}
          rx={TAG.h / 2}
          fill="none"
          strokeWidth="1"
          style={{ stroke: tagLit ? accent : P.lineHi, transition: colour('stroke') }}
        />
        <text
          x={r2(tagX + TAG_W / 2 + (T.tag * TRACK) / 2)}
          y={COURSE_Y - 16 + TAG.h / 2 + T.tag * 0.35}
          textAnchor="middle"
          className="font-mono"
          fontSize={T.tag}
          letterSpacing={T.tag * TRACK}
          style={{ fill: tagLit ? accent : P.inkMuted, transition: colour() }}
        >
          {ACTION}
        </text>
      </Reveal>
      <Reveal on={s >= S.apply} delay={0.3} reduce={reduce}>
        <text
          x={PAD}
          y={DETAILS_Y}
          className="font-sans"
          fontSize={T.body}
          style={{ fill: s === S.apply ? accent : P.inkMuted, transition: colour() }}
        >
          {DETAILS}
        </text>
      </Reveal>
    </g>
  );
}

/** A tracked uppercase mono group heading. */
function Heading({ y, fill, children }) {
  return (
    <text
      x={PAD}
      y={y}
      className="font-mono"
      fontSize={T.tag}
      letterSpacing={T.tag * TRACK}
      style={{ fill, transition: colour() }}
    >
      {children}
    </text>
  );
}

/** The empty term: lane labels, hairlines and a faint slot per week. */
function Lane({ layout, y, label }) {
  return (
    <g>
      <text x={PAD} y={y + T.lane * 0.35} className="font-sans" fontSize={T.lane} fill={P.inkMuted}>
        {label}
      </text>
      <line x1={layout.x0} y1={y} x2={layout.x1} y2={y} stroke={P.line} strokeWidth="1" />
      {Array.from({ length: N_WEEKS }, (_, w) => (
        <circle key={w} cx={layout.cx(w)} cy={y} r={SLOT_R} fill={P.lineHi} />
      ))}
    </g>
  );
}

/** The syllabus source: a pill on its heading row, with a read bar. */
function SyllabusPill({ layout, s, accent, reduce }) {
  const x = r2(layout.x1 - SYL_PILL_W);
  const reading = s === S.read;
  return (
    <g>
      <rect
        x={x}
        y={SYL_PILL_Y}
        width={SYL_PILL_W}
        height={PILL.h}
        rx={PILL.h / 2}
        fill={mix(P.surface, 70)}
        strokeWidth="1"
        style={{ stroke: reading ? accent : P.lineHi, transition: colour('stroke') }}
      />
      <text
        x={r2(x + SYL_PILL_W / 2)}
        y={SYL_PILL_Y + PILL.h / 2 + T.body * 0.35}
        textAnchor="middle"
        className="font-sans"
        fontSize={T.body}
        style={{ fill: s >= S.read ? P.ink : P.inkMuted, transition: colour() }}
      >
        {SYLLABUS_PILL}
      </text>
      {reading && !reduce && (
        <motion.rect
          x={x + PILL.padX}
          y={SYL_PILL_Y + PILL.h - 6}
          height="1.5"
          rx="0.75"
          fill={accent}
          initial={{ width: 0 }}
          animate={{ width: SYL_PILL_W - 2 * PILL.padX }}
          transition={{ duration: READ_S, ease: 'easeInOut' }}
        />
      )}
    </g>
  );
}

/** One assignment dot, dropping into its lane. */
function Dot({ cx, cy, on, delay, fill, reduce }) {
  return (
    <Reveal on={on} delay={delay} from={{ y: -DROP.fall }} reduce={reduce}>
      <circle cx={cx} cy={cy} r={DOT_R + 3} fill={mix(P.void, 100)} />
      <circle cx={cx} cy={cy} r={DOT_R} style={{ fill, transition: colour() }} />
    </Reveal>
  );
}

/** A ring that answers once, at `delay` seconds into its beat. */
function Ping({ cx, cy, delay, accent, grow = 6 }) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      fill="none"
      stroke={accent}
      strokeWidth="1.25"
      initial={{ opacity: 0, r: DOT_R }}
      animate={{ opacity: [0, 0.9, 0], r: [DOT_R, DOT_R + grow * 0.6, DOT_R + grow] }}
      transition={{ duration: 0.7, ease: 'easeOut', delay }}
    />
  );
}

/** One layout of the figure, as one SVG. */
function SemesterSvg({ layout, s, loop, entered, accent, reduce }) {
  const { x0, x1, cx } = layout;
  const span = x1 - x0;
  const enter = (i) => ({
    initial: reduce ? false : { opacity: 0, y: ENTER.rise },
    animate: entered ? { opacity: 1, y: 0 } : { opacity: 0, y: ENTER.rise },
    transition: { duration: ENTER.dur, ease: EASE_OUT, delay: reduce ? 0 : i * ENTER.step },
  });
  const sweepTop = LANE0 - 14;
  // re-sync only touches what came from Canvas, so the sweep spans the Canvas lanes
  const sweepBottom = laneY(TYPES[TYPES.length - 1]) + 14;
  const dupX = cx(DUPLICATE.week);
  const dupY = laneY(DUPLICATE.type);

  return (
    <svg
      viewBox={`0 0 ${layout.viewW} ${VIEW_H}`}
      className={`block h-auto w-full overflow-visible ${layout.hide}`}
      aria-hidden="true"
    >
      {/* the planner, empty: it builds in on first view */}
      <motion.g {...enter(0)}>
        <FeedPill s={s} accent={accent} reduce={reduce} />
      </motion.g>
      <motion.g {...enter(1)}>
        <Heading y={CANVAS_HEAD_Y} fill={P.inkSubtle}>
          FROM CANVAS
        </Heading>
      </motion.g>
      {TYPES.map((type, i) => (
        <motion.g key={type} {...enter(2 + i)}>
          <Lane layout={layout} y={laneY(type)} label={type} />
        </motion.g>
      ))}
      <motion.g {...enter(2 + TYPES.length)}>
        <Heading y={SYL_PILL_Y + PILL.h / 2 + T.tag * 0.35} fill={s >= S.apply ? accent : P.inkSubtle}>
          FROM THE SYLLABUS
        </Heading>
        <SyllabusPill layout={layout} s={s} accent={accent} reduce={reduce} />
      </motion.g>
      <motion.g {...enter(3 + TYPES.length)}>
        <Lane layout={layout} y={LECTURE_Y} label={LECTURES} />
      </motion.g>
      <motion.g {...enter(4 + TYPES.length)}>
        {Array.from({ length: N_WEEKS + 1 }, (_, w) => {
          const x = r2(x0 + w * layout.colW);
          return <line key={w} x1={x} y1={AXIS_Y} x2={x} y2={AXIS_Y + 4} stroke={P.lineHi} strokeWidth="1" />;
        })}
        <text x={PAD} y={AXIS_LABEL_Y} className="font-sans" fontSize={T.body} fill={P.inkMuted}>
          {COURSE.term}
        </text>
        <text x={x1} y={AXIS_LABEL_Y} textAnchor="end" className="font-sans" fontSize={T.body} fill={P.inkSubtle}>
          sample term
        </text>
      </motion.g>

      {/* what fills in: remounted each loop so every beat starts fresh */}
      <motion.g
        key={loop}
        initial={false}
        animate={{ opacity: s === S.reset ? 0 : 1 }}
        transition={{ duration: FADE_MS / 1000 }}
      >
        <CourseLine layout={layout} s={s} accent={accent} reduce={reduce} />

        {/* Canvas items, by type; accent while they land, grey once settled */}
        {TYPES.map((type, lane) =>
          CANVAS_ITEMS[type].map((week) => (
            <Dot
              key={`${type}-${week}`}
              cx={cx(week)}
              cy={laneY(type)}
              on={s >= S.import}
              delay={DROP.first + week * DROP.perWeek + lane * DROP.perLane}
              fill={s === S.import ? accent : P.inkMuted}
              reduce={reduce}
            />
          )),
        )}

        {/* lectures for the whole term, from the syllabus meeting times */}
        {Array.from({ length: N_WEEKS }, (_, w) => (
          <Reveal key={w} on={s >= S.apply} delay={w * LECTURE.perWeek} from={{ y: 4 }} reduce={reduce}>
            {Array.from({ length: PER_WEEK }, (_, k) => {
              const off = (k - (PER_WEEK - 1) / 2) * layout.colW * 0.36;
              return (
                <rect
                  key={k}
                  x={r2(cx(w) + off - BAR.w / 2)}
                  y={LECTURE_Y - BAR.h / 2}
                  width={BAR.w}
                  height={BAR.h}
                  rx={BAR.w / 2}
                  fill={alpha(accent, 0.75)}
                />
              );
            })}
          </Reveal>
        ))}

        {/* assignments Canvas didn't list, added from the syllabus */}
        {MISSING.map((m, i) => (
          <g key={`${m.type}-${m.week}`}>
            <Dot cx={cx(m.week)} cy={laneY(m.type)} on={s >= S.apply} delay={MISSING_AT[i]} fill={accent} reduce={reduce} />
            {s === S.apply && !reduce && <Ping cx={cx(m.week)} cy={laneY(m.type)} delay={MISSING_AT[i] + 0.3} accent={accent} />}
          </g>
        ))}

        {/* one syllabus item Canvas already had: it finds its twin and is not added */}
        {s === S.apply && !reduce && (
          <>
            <motion.circle
              cx={dupX}
              cy={dupY}
              r={DOT_R}
              fill="none"
              stroke={accent}
              strokeWidth="1.5"
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: [0, 1, 1, 0], y: [-18, -18, 0, 0] }}
              transition={{ duration: GHOST.dur, delay: GHOST.at, times: [0, 0.25, 0.75, 1], ease: 'easeInOut' }}
            />
            <Ping cx={dupX} cy={dupY} delay={GHOST.at + GHOST.dur * 0.75} accent={accent} />
            <motion.text
              x={dupX + DOT_R + 8}
              y={dupY + T.tag * 0.35}
              className="font-mono"
              fontSize={T.tag}
              fill={accent}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.3, delay: GHOST.at + GHOST.dur * 0.7, times: [0, 0.2, 0.8, 1] }}
            >
              {DUP_LABEL}
            </motion.text>
          </>
        )}

        {/* re-sync: a sweep checks every item; nothing is removed */}
        {s === S.resync && !reduce && (
          <>
            <motion.g
              initial={{ x: 0, opacity: 0 }}
              animate={{ x: span, opacity: [0, 1, 1, 0] }}
              transition={{ duration: SWEEP_S, ease: 'linear', opacity: { duration: SWEEP_S, times: [0, 0.08, 0.9, 1] } }}
            >
              <line x1={x0} y1={sweepTop} x2={x0} y2={sweepBottom} stroke={alpha(accent, 0.18)} strokeWidth="7" strokeLinecap="round" />
              <line x1={x0} y1={sweepTop} x2={x0} y2={sweepBottom} stroke={accent} strokeWidth="1.25" />
            </motion.g>
            {TYPES.flatMap((type) => CANVAS_ITEMS[type].map((week) => ({ type, week }))).map(({ type, week }) => (
              <Ping
                key={`ping-${type}-${week}`}
                cx={cx(week)}
                cy={laneY(type)}
                delay={((cx(week) - x0) / span) * SWEEP_S}
                accent={accent}
                grow={4}
              />
            ))}
          </>
        )}
      </motion.g>
    </svg>
  );
}

/* ── the figure ────────────────────────────────────────────────────────── */

export default function Hero({ accent = P.accent }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const entered = useInView(ref, { once: true, amount: 0.3 });
  // not latched: scrolled away the loop pauses; back on screen it carries on
  const onScreen = useInView(ref, { amount: 0.3 });
  const [tick, setTick] = useState({ loop: 0, s: -1 });

  // one beat at a time, only while on screen; setState only inside the timer
  useEffect(() => {
    if (reduce || !onScreen) return undefined;
    const wait = tick.s < 0 ? (tick.loop === 0 ? START_MS : RESTART_MS) : BEAT_MS[tick.s];
    const id = setTimeout(
      () => setTick(({ loop, s }) => (s >= S.reset ? { loop: loop + 1, s: -1 } : { loop, s: s + 1 })),
      wait,
    );
    return () => clearTimeout(id);
  }, [reduce, onScreen, tick]);

  const s = reduce ? S.hold : tick.s;
  const loop = reduce ? 0 : tick.loop;
  const caption = CAPTIONS[s >= 0 && s < S.hold ? s : CAPTIONS.length - 1];

  return (
    <div ref={ref} className="@container mx-auto w-full max-w-[600px]">
      <p className="sr-only">{DESCRIPTION}</p>
      {LAYOUTS.map((layout) => (
        <SemesterSvg
          key={layout.key}
          layout={layout}
          s={s}
          loop={loop}
          entered={reduce || entered}
          accent={accent}
          reduce={reduce}
        />
      ))}

      {/* what is happening at this beat, in the data's words */}
      <div className="mt-5 min-h-[3.25rem] text-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={caption.key}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="mx-auto max-w-[46ch] text-body text-ink-muted"
          >
            {caption.label && (
              <span className="mr-2 font-mono text-label" style={{ color: accent }}>
                {caption.num} {caption.label}
              </span>
            )}
            {caption.text}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
