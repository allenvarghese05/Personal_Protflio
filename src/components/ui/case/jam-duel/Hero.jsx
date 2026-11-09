'use client';

/**
 * JamDuel hero: one listener's day of votes, spent across three sample
 * battles. Two songs face each other as records; under them, the split bar
 * of the battle's votes; under that, today's budget as ten chips.
 *
 * The loop is the budget's day. In each battle both records play (the videos
 * are embedded so you listen first), you back one side and it lights in the
 * accent, a stack of chips lights in the budget row, and on the commit they
 * fly up into your side of the bar: the vote, the tally and the budget move
 * together, because the server writes all three in one transaction. Six on
 * the first battle flips its lead, three on the second backs the underdog,
 * and on the third a stack of two is refused with the API's real 400 (one
 * vote left) before the last vote ties it. Then the first login of a new day
 * refills the ten chips and the day starts again.
 *
 * Facts (src/data/studies/jam-duel.js): the budget of 10 (FEATURES budget),
 * stacks of 1 to 10 (FLOW vote), one transaction for vote, tally and budget
 * (DECISIONS tx), the 400 "Not enough votes remaining" and the reset on the
 * first login of a new day (DECISIONS budget), song share = round(votes /
 * total × 100) (FLOW result), YouTube videos to listen first (FLOW battle).
 * The songs are placeholders and the tallies are illustrative, labelled
 * "sample battle" in the figure; they are not measured results.
 *
 * Motion: on first view the records slide in, the bar opens from even and
 * the chips settle in; the day then loops only while the figure is on
 * screen (setState only inside the timer). Reduced motion: the first battle,
 * finished, with 6 stacked on Song A and 4 left. Layout: two fitted SVGs
 * picked by a container query, a wide one from a 440px wrapper up and a
 * compact one below, so no text lands under 11px (11.1px at a 280px phone).
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { P, alpha } from '@/components/ui/case/tokens';
import { EASE_OUT } from '@/lib/motion';
import { FEATURES } from '@/data/studies/jam-duel';

/* ── facts ─────────────────────────────────────────────────────────────── */
const BUDGET = Number(FEATURES.find((f) => f.key === 'budget')?.stat?.value) || 10; // votes_remaining_today
const REFUSAL = { code: '400', text: 'Not enough votes remaining' }; // DECISIONS budget, battles.js
const STACK_RULE = '1 to 10 per vote'; // FLOW vote: 1 ≤ voteCount ≤ 10
const RESET_RULE = `Back to ${BUDGET} at the first login of a new day`; // DECISIONS budget
const share = (votes, total) => (total ? Math.round((votes / total) * 100) : 50); // FLOW result

/* ── the sample day (placeholder songs, illustrative tallies) ──────────── */
// The stacks spend the whole budget: 6 + 3 + 1. The third battle first asks
// for 2 with 1 left, which the API refuses.
const BATTLES = [
  { songs: ['Song A', 'Song B'], tally: [12, 14], pick: 0, stack: 6 }, // flips the lead
  { songs: ['Song C', 'Song D'], tally: [21, 15], pick: 1, stack: 3 }, // backs the underdog
  { songs: ['Song E', 'Song F'], tally: [8, 9], pick: 0, stack: 1, tries: 2 }, // ties it
];

/* ── timing ────────────────────────────────────────────────────────────── */
const IN_VIEW = { once: true, amount: 0.3 }; // the entrance: plays once
const ON_SCREEN = { amount: 0.3 }; // the day: runs only while visible
const ENTER_MS = 1400; // the entrance, before the first beat may end
const MS = { listen: 1700, pick: 1000, stack: 800, pip: 140, refused: 2300, commit: 2400, out: 450, reset: 2600 };
const PIP_S = MS.pip / 1000; // chips light one after another while stacking
const REFILL_S = 0.11; // the new day refills them left to right
const FLY = { dur: 0.6, stagger: 0.05 }; // chips into the bar
const LAND_S = 0.38; // the bar and the numbers move as the chips land
const BAR_S = 0.9;
const SPIN_S = 2.6; // one turn of a playing record
const FADE_S = 0.35;
const ENTER = { disc: 0.1, slide: 16, bar: 0.35, pips: 0.55, pipStep: 0.04, dur: 0.7 };
const TRANSITION_MS = 320;
const CSS_EASE = `cubic-bezier(${EASE_OUT.join(',')})`;
const cssT = (delayS = 0) =>
  ['opacity', 'fill', 'stroke', 'stroke-width', 'transform']
    .map((p) => `${p} ${TRANSITION_MS}ms ${CSS_EASE} ${Math.round(delayS * 1000)}ms`)
    .join(', ');

/* ── geometry (viewBox units) ──────────────────────────────────────────── */
const BAR_H = 10;
const SEAM = 3; // the gap between the two sides of the bar
const PIP_H = 18;
const PIP_LIFT = 5; // a staged chip rises a little
const GROOVES = [0.84, 0.7, 0.56];
const LABEL_R = 0.32; // the record's centre label
const HOLE_R = 2.4;
const ARC_R = 0.92; // the playing highlight runs just inside the rim
const ARC_FRAC = 0.16;
const HALO = { gap: 6, w: 6 };
const DIM = 0.5; // the side you didn't back
const TRACK_EM = 0.14;
const MONO_EM = 0.6;
const r2 = (n) => Math.round(n * 100) / 100;
const monoWidth = (text, size) => text.length * size * MONO_EM;

// Wide from a 440px wrapper (12.5u lands at 11.5px); compact below (13.5u
// lands at 11.1px at 280px). Type sizes are viewBox units.
const WIDE = {
  key: 'wide',
  W: 480,
  pad: 20,
  R: 40,
  col: 0.22,
  pipGap: 6,
  inline: true,
  t: { tag: 12.5, vs: 13, name: 16.5, pct: 30, tally: 13, label: 12.5, count: 15, note: 13 },
  hide: '@max-[440px]:hidden',
};
const COMPACT = {
  key: 'compact',
  W: 340,
  pad: 12,
  R: 32,
  col: 0.2,
  pipGap: 5,
  inline: false,
  t: { tag: 13.5, vs: 13.5, name: 17, pct: 30, tally: 14, label: 13.5, count: 16, note: 13.5 },
  hide: '@min-[440px]:hidden',
};

function fit(cfg) {
  const { W, pad, R, t } = cfg;
  const x0 = pad;
  const x1 = W - pad;
  const tagY = t.tag + 6;
  const discCy = tagY + 18 + R;
  const nameY = discCy + R + 26;
  const pctY = nameY + t.pct + 8;
  const barY = pctY + 12;
  const tallyY = barY + BAR_H + t.tally + 10;
  const labelY = tallyY + 44;
  const pipY = labelY + 12;
  const noteY = pipY + PIP_H + t.note + 10;
  const notes = cfg.inline ? [noteY] : [noteY, noteY + t.note + 6];
  const pitch = (x1 - x0) / BUDGET;
  const pipW = r2(pitch - cfg.pipGap);
  return {
    ...cfg,
    x0,
    x1,
    mid: W / 2,
    cols: [r2(W * cfg.col), r2(W * (1 - cfg.col))],
    tagY,
    discCy,
    nameY,
    pctY,
    barY,
    tallyY,
    labelY,
    pipY,
    notes,
    pipW,
    pips: Array.from({ length: BUDGET }, (_, i) => r2(x0 + i * pitch + cfg.pipGap / 2)),
    viewH: r2(notes[notes.length - 1] + 8),
  };
}
const LAYOUTS = [fit(WIDE), fit(COMPACT)];

/* ── the day, as beats ─────────────────────────────────────────────────── */
function buildDay() {
  const beats = [];
  let spent = 0;
  BATTLES.forEach((b, bi) => {
    const name = b.songs[b.pick];
    const left = BUDGET - spent;
    const at = { battle: bi, tally: b.tally, spent, side: b.pick, staged: 0, want: 0, refused: false, flying: null };
    beats.push({ ...at, side: -1, phase: 'listen', ms: MS.listen, caption: `${b.songs[0]} or ${b.songs[1]}? Both YouTube videos are embedded, so you listen before you pick.` });
    beats.push({ ...at, phase: 'pick', ms: MS.pick, caption: `You back ${name}.` });
    if (b.tries) {
      const staged = Math.min(b.tries, left);
      beats.push({ ...at, phase: 'stack', want: b.tries, staged, ms: MS.stack + staged * MS.pip, caption: `You try to stack ${b.tries} on ${name}.` });
      beats.push({
        ...at,
        phase: 'refused',
        want: b.tries,
        staged,
        refused: true,
        ms: MS.refused,
        caption: `Only ${left} left today, so the server answers ${REFUSAL.code}: “${REFUSAL.text}”.`,
      });
    }
    beats.push({
      ...at,
      phase: 'stack',
      want: b.stack,
      staged: b.stack,
      ms: MS.stack + b.stack * MS.pip,
      caption: b.stack === left ? `Stacking your last vote of the day on ${name}.` : `Stacking ${b.stack} of today’s votes on ${name}.`,
    });
    const after = b.tally.map((v, s) => (s === b.pick ? v + b.stack : v));
    const flying = Array.from({ length: b.stack }, (_, k) => left - b.stack + k); // the staged chips
    spent += b.stack;
    const commit = {
      ...at,
      phase: 'commit',
      tally: after,
      spent,
      flying,
      ms: MS.commit,
      caption: `One transaction writes the vote, the tally and your budget. ${BUDGET - spent} left today.`,
    };
    beats.push(commit);
    if (bi < BATTLES.length - 1) beats.push({ ...commit, phase: 'out', flying: null, ms: MS.out });
  });
  const last = beats[beats.length - 1];
  const reset = { ...last, phase: 'reset', spent: 0, flying: null, ms: MS.reset, caption: `First login of a new day: back to ${BUDGET} votes.` };
  beats.push(reset, { ...reset, phase: 'out', ms: MS.out });
  return beats;
}
const DAY = buildDay();
const FIRST_COMMIT = DAY.find((b) => b.battle === 0 && b.phase === 'commit');
const STATIC = {
  ...FIRST_COMMIT,
  flying: null,
  caption: `A sample battle: ${BATTLES[0].stack} of today’s ${BUDGET} votes stacked on ${BATTLES[0].songs[BATTLES[0].pick]}, ${BUDGET - BATTLES[0].stack} left.`,
};

const seamX = (L, tally) => {
  const total = tally[0] + tally[1];
  return r2(L.x0 + (L.x1 - L.x0) * (total ? tally[0] / total : 0.5));
};

const TRIED = BATTLES.find((b) => b.tries);
const SPENT_BEFORE_TRY = BATTLES.slice(0, BATTLES.indexOf(TRIED)).reduce((n, b) => n + b.stack, 0);

/* ── a11y ──────────────────────────────────────────────────────────────── */
const SR_TEXT = [
  `Illustration of a listener’s day on JamDuel, with placeholder songs and sample tallies.`,
  `Each day brings ${BUDGET} votes, stacked ${STACK_RULE} on one side of a battle; the server writes the vote, the battle’s tally and the budget in one transaction.`,
  ...BATTLES.map((b, i) => {
    const after = b.tally.map((v, s) => (s === b.pick ? v + b.stack : v));
    const total = after[0] + after[1];
    return `Sample battle ${i + 1}, ${b.songs[0]} against ${b.songs[1]}: ${b.stack} stacked on ${b.songs[b.pick]} makes it ${share(after[0], total)}% to ${share(after[1], total)}%.`;
  }),
  `Asking for ${TRIED.tries} with ${BUDGET - SPENT_BEFORE_TRY} left is refused with ${REFUSAL.code}, “${REFUSAL.text}”. ${RESET_RULE}.`,
].join(' ');

/* ── pieces ────────────────────────────────────────────────────────────── */

/** Mono uppercase tag with tracking. */
function Tag({ x, y, size, anchor = 'start', fill = P.inkSubtle, children }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className="font-mono" fontSize={size} fontWeight="500" letterSpacing={r2(size * TRACK_EM)} fill={fill}>
      {children}
    </text>
  );
}

/** A song as a record: rim, grooves, label; a highlight runs round it while it plays. */
function Disc({ cx, cy, R, state, spin, accent }) {
  const lit = state === 'lit';
  const playing = spin || lit;
  const arcR = R * ARC_R;
  const C = 2 * Math.PI * arcR;
  const dash = `${r2(C * ARC_FRAC)} ${r2(C)}`;
  const arcStroke = lit ? accent : alpha(P.inkMuted, 0.7);
  return (
    <g style={{ opacity: state === 'dim' ? DIM : 1, transition: cssT() }}>
      <circle cx={cx} cy={cy} r={R + HALO.gap} fill="none" stroke={alpha(accent, 0.16)} strokeWidth={HALO.w} style={{ opacity: lit ? 1 : 0, transition: cssT() }} />
      <circle cx={cx} cy={cy} r={R} fill={P.surface2} style={{ stroke: lit ? accent : P.lineHi, strokeWidth: lit ? 1.5 : 1, transition: cssT() }} />
      {GROOVES.map((g) => (
        <circle key={g} cx={cx} cy={cy} r={r2(R * g)} fill="none" stroke={P.line} strokeWidth="0.75" />
      ))}
      <circle cx={cx} cy={cy} r={r2(R * LABEL_R)} style={{ fill: lit ? alpha(accent, 0.55) : alpha(P.inkMuted, 0.22), transition: cssT() }} />
      <circle cx={cx} cy={cy} r={HOLE_R} fill={P.void} />
      {playing &&
        (spin ? (
          <motion.circle
            cx={cx}
            cy={cy}
            r={r2(arcR)}
            fill="none"
            stroke={arcStroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={dash}
            initial={{ strokeDashoffset: 0, opacity: 0 }}
            animate={{ strokeDashoffset: -C, opacity: 1 }}
            transition={{ strokeDashoffset: { duration: SPIN_S, ease: 'linear', repeat: Infinity }, opacity: { duration: FADE_S } }}
          />
        ) : (
          <circle cx={cx} cy={cy} r={r2(arcR)} fill="none" stroke={arcStroke} strokeWidth="2" strokeLinecap="round" strokeDasharray={dash} />
        ))}
    </g>
  );
}

/** The battle: tag, names, shares, the split bar and the tallies. Keyed per battle. */
function Battle({ L, s, shown, reduce, accent }) {
  const b = BATTLES[s.battle];
  const total = s.tally[0] + s.tally[1];
  const seam = seamX(L, s.tally);
  const even = L.mid;
  const landing = s.phase === 'commit';
  const delay = landing ? LAND_S : 0;
  const tone = (side) => (s.side === side ? accent : alpha(P.inkMuted, 0.42));
  const textTone = (side) => (s.side < 0 ? P.ink : s.side === side ? accent : P.inkMuted);
  const clip = `jd-bar-${L.key}-${s.battle}`;
  const stacking = s.phase === 'stack' || s.phase === 'refused';

  return (
    <motion.g
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: shown && s.phase !== 'out' ? 1 : 0 }}
      transition={{ duration: FADE_S, ease: EASE_OUT }}
    >
      <Tag x={L.mid} y={L.tagY} size={L.t.tag} anchor="middle">
        {`SAMPLE BATTLE ${s.battle + 1}`}
      </Tag>

      {b.songs.map((song, side) => {
        const cx = L.cols[side];
        const pct = share(s.tally[side], total);
        const tally = `${s.tally[side]} votes`;
        const inner = side === 0 ? 1 : -1; // the stack label sits on the side facing the middle
        return (
          <g key={song}>
            <text
              x={cx}
              y={L.nameY}
              textAnchor="middle"
              className="font-sans"
              fontSize={L.t.name}
              fontWeight="600"
              style={{ fill: s.side >= 0 && s.side !== side ? P.inkMuted : P.ink, transition: cssT() }}
            >
              {song}
            </text>
            <motion.text
              key={`pct-${pct}`}
              x={cx}
              y={L.pctY}
              textAnchor="middle"
              className="font-display"
              fontSize={L.t.pct}
              fontWeight="700"
              style={{ fill: textTone(side), fontVariantNumeric: 'tabular-nums', transition: cssT() }}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: FADE_S, delay }}
            >
              {`${pct}%`}
            </motion.text>
            <motion.text
              key={`tally-${tally}`}
              x={cx}
              y={L.tallyY}
              textAnchor="middle"
              className="font-mono"
              fontSize={L.t.tally}
              fill={P.inkMuted}
              style={{ fontVariantNumeric: 'tabular-nums' }}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: FADE_S, delay }}
            >
              {tally}
            </motion.text>
            {/* the stack you are about to spend, beside your side's tally */}
            <AnimatePresence mode="wait">
              {stacking && s.side === side && (
                <motion.text
                  key={`want-${s.want}`}
                  x={r2(cx + inner * (monoWidth(tally, L.t.tally) / 2 + 8))}
                  y={L.tallyY}
                  textAnchor={inner > 0 ? 'start' : 'end'}
                  className="font-mono"
                  fontSize={L.t.tally}
                  fontWeight="600"
                  style={{ fill: s.refused ? P.alert : accent, transition: cssT() }}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.25 }}
                >
                  {`+${s.want}`}
                </motion.text>
              )}
            </AnimatePresence>
          </g>
        );
      })}

      {/* the split: one rounded bar, the backed side in the accent */}
      <clipPath id={clip}>
        <rect x={L.x0} y={L.barY} width={L.x1 - L.x0} height={BAR_H} rx={BAR_H / 2} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x={L.x0} y={L.barY} width={L.x1 - L.x0} height={BAR_H} style={{ fill: tone(1), transition: cssT() }} />
        <motion.rect
          x={L.x0}
          y={L.barY}
          height={BAR_H}
          style={{ fill: tone(0), transition: cssT() }}
          initial={reduce ? false : { width: even - L.x0 }}
          animate={{ width: (shown ? seam : even) - L.x0 }}
          transition={{ duration: BAR_S, ease: EASE_OUT, delay: shown ? delay || ENTER.bar : 0 }}
        />
        <motion.g
          initial={reduce ? false : { x: even - L.x0 }}
          animate={{ x: (shown ? seam : even) - L.x0 }}
          transition={{ duration: BAR_S, ease: EASE_OUT, delay: shown ? delay || ENTER.bar : 0 }}
        >
          <rect x={L.x0 - SEAM / 2} y={L.barY - 1} width={SEAM} height={BAR_H + 2} fill={P.void} />
        </motion.g>
      </g>
      {/* even: the middle of the bar */}
      <line x1={L.mid} x2={L.mid} y1={L.barY - 5} y2={L.barY + BAR_H + 5} stroke={P.lineHi} strokeWidth="1" />
    </motion.g>
  );
}

const pipStyle = {
  free: { fill: alpha(P.inkMuted, 0.2), stroke: alpha(P.inkMuted, 0.5), lift: 0 },
  staged: { lift: -PIP_LIFT }, // fill and stroke: the accent prop, set where it's drawn
  refused: { fill: alpha(P.alert, 0.22), stroke: P.alert, lift: -PIP_LIFT },
  spent: { fill: alpha(P.inkMuted, 0), stroke: P.line, lift: 0 },
};

/** Today's budget: ten chips, the stack lifting out of them. */
function Budget({ L, s, shown, reduce, accent }) {
  const free = BUDGET - s.spent;
  const lo = free - s.staged;
  const left = BUDGET - s.spent;
  const refused = s.phase === 'refused';
  return (
    <>
      <Tag x={L.x0} y={L.labelY} size={L.t.label}>
        TODAY’S VOTES
      </Tag>
      <text x={L.x1} y={L.labelY} textAnchor="end" className="font-sans" fontSize={L.t.count} fill={P.inkMuted}>
        <tspan fontWeight="700" style={{ fill: accent, fontVariantNumeric: 'tabular-nums' }}>
          {left}
        </tspan>
        {` of ${BUDGET} left`}
      </text>

      {L.pips.map((x, i) => {
        const state = i >= free ? 'spent' : s.staged && i >= lo ? (s.refused ? 'refused' : 'staged') : 'free';
        const look = { ...pipStyle[state], ...(state === 'staged' ? { fill: accent, stroke: accent } : {}) };
        const wait = s.phase === 'stack' && state === 'staged' ? (free - 1 - i) * PIP_S : s.phase === 'reset' ? i * REFILL_S : 0;
        return (
          <motion.g
            key={x}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: ENTER.dur, ease: EASE_OUT, delay: shown ? ENTER.pips + i * ENTER.pipStep : 0 }}
          >
            <rect
              x={x}
              y={L.pipY}
              width={L.pipW}
              height={PIP_H}
              rx="4"
              strokeWidth="1"
              style={{ fill: look.fill, stroke: look.stroke, transform: `translateY(${look.lift}px)`, transition: cssT(wait) }}
            />
          </motion.g>
        );
      })}

      {/* the rules, or the refusal when you ask for more than is left */}
      <AnimatePresence mode="wait" initial={false}>
        {refused ? (
          <motion.text
            key="refused"
            x={L.inline ? L.mid : L.x0}
            y={L.notes[0]}
            textAnchor={L.inline ? 'middle' : 'start'}
            className="font-sans"
            fontSize={L.t.note}
            fill={P.alert}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <tspan className="font-mono" fontWeight="600">
              {REFUSAL.code}
            </tspan>
            <tspan dx="8">{REFUSAL.text}</tspan>
          </motion.text>
        ) : (
          <motion.g key="rules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <text x={L.x0} y={L.notes[0]} className="font-sans" fontSize={L.t.note} fill={P.inkSubtle}>
              {STACK_RULE}
            </text>
            <text
              x={L.inline ? L.x1 : L.x0}
              y={L.inline ? L.notes[0] : L.notes[1]}
              textAnchor={L.inline ? 'end' : 'start'}
              className="font-sans"
              fontSize={L.t.note}
              fill={P.inkSubtle}
            >
              {RESET_RULE}
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </>
  );
}

/** On the commit, the stacked chips fly up into your side of the bar. */
function Flight({ L, s, beat, accent }) {
  if (!s.flying) return null;
  const seam = seamX(L, s.tally);
  const tx = s.side === 0 ? (L.x0 + seam) / 2 : (seam + L.x1) / 2;
  const ty = L.barY + BAR_H / 2;
  return s.flying.map((i, k) => {
    const x = L.pips[i];
    const dx = r2(tx - (x + L.pipW / 2));
    const dy = r2(ty - (L.pipY - PIP_LIFT + PIP_H / 2));
    return (
      <motion.g
        key={`${beat}-${i}`}
        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
        animate={{ x: dx, y: dy, opacity: [1, 1, 0], scale: [1, 0.85, 0.45] }}
        transition={{ duration: FLY.dur, ease: EASE_OUT, delay: k * FLY.stagger, times: [0, 0.75, 1] }}
      >
        <rect x={x} y={L.pipY - PIP_LIFT} width={L.pipW} height={PIP_H} rx="4" fill={accent} />
      </motion.g>
    );
  });
}

/** One fitted layout of the figure, as one SVG. */
function DuelSvg({ L, s, beat, shown, running, reduce, accent }) {
  const discState = (side) => {
    if (s.phase === 'listen' || s.phase === 'out' || s.side < 0) return 'idle';
    return s.side === side ? 'lit' : 'dim';
  };
  return (
    <svg viewBox={`0 0 ${L.W} ${L.viewH}`} width="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true" className={`block h-auto w-full ${L.hide}`}>
      {L.cols.map((cx, side) => (
        <motion.g
          key={cx}
          initial={reduce ? false : { opacity: 0, x: (side === 0 ? -1 : 1) * ENTER.slide }}
          animate={shown ? { opacity: 1, x: 0 } : { opacity: 0, x: (side === 0 ? -1 : 1) * ENTER.slide }}
          transition={{ duration: ENTER.dur, ease: EASE_OUT, delay: ENTER.disc }}
        >
          <Disc
            cx={cx}
            cy={L.discCy}
            R={L.R}
            state={discState(side)}
            spin={running && (s.phase === 'listen' || discState(side) === 'lit')}
            accent={accent}
          />
        </motion.g>
      ))}
      <motion.g initial={reduce ? false : { opacity: 0 }} animate={{ opacity: shown ? 1 : 0 }} transition={{ duration: ENTER.dur, delay: ENTER.disc + 0.2 }}>
        <Tag x={L.mid + (L.t.vs * TRACK_EM) / 2} y={L.discCy + L.t.vs * 0.36} size={L.t.vs} anchor="middle">
          VS
        </Tag>
      </motion.g>

      <Battle key={s.battle} L={L} s={s} shown={shown} reduce={reduce} accent={accent} />
      <Budget L={L} s={s} shown={shown} reduce={reduce} accent={accent} />
      {running && <Flight L={L} s={s} beat={beat} accent={accent} />}
    </svg>
  );
}

/* ── the figure ────────────────────────────────────────────────────────── */

export default function Hero({ accent = P.accent }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const entered = useInView(ref, IN_VIEW);
  // not latched: scrolled away the day pauses where it is, and picks up on return
  const onScreen = useInView(ref, ON_SCREEN);
  const [beat, setBeat] = useState(0);
  const running = !reduce && onScreen;
  const shown = Boolean(reduce) || entered;
  const s = reduce ? STATIC : DAY[beat % DAY.length];

  // one beat at a time; the first waits for the entrance. setState only in the timer.
  useEffect(() => {
    if (!running) return undefined;
    const ms = DAY[beat % DAY.length].ms + (beat === 0 ? ENTER_MS : 0);
    const id = setTimeout(() => setBeat((b) => b + 1), ms);
    return () => clearTimeout(id);
  }, [running, beat]);

  return (
    // @container: each layout shows or hides itself by the wrapper's width
    <div ref={ref} className="@container mx-auto w-full max-w-[540px]">
      <p className="sr-only">{SR_TEXT}</p>
      {LAYOUTS.map((L) => (
        <DuelSvg key={L.key} L={L} s={s} beat={beat} shown={shown} running={running} reduce={reduce} accent={accent} />
      ))}

      {/* what just happened, in words */}
      <div className="mt-4 min-h-[2.75rem] text-center" aria-live="polite">
        {reduce ? (
          <p className="mx-auto max-w-[46ch] text-sm leading-snug text-ink-muted">{s.caption}</p>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {shown && (
              <motion.p
                key={s.caption}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="mx-auto max-w-[46ch] text-sm leading-snug text-ink-muted"
              >
                {s.caption}
              </motion.p>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
