'use client';

/**
 * Platform — "Around the engine: analytics, notifications, an offline form
 * and a nightly job." The four systems that hang off the workflow engine, as
 * a 2 × 2 of cards (one column under 1024px). Every card reads the same way:
 * a mono eyebrow with its number on the right, a display title, one
 * paragraph, a small purpose-built diagram, then the number again with what
 * it counts.
 *
 * The diagrams:
 *   analytics — the five scopes as nested rectangles (Organisation ⊃ Division
 *               ⊃ Church / Pastor ⊃ Project, the two middle scopes side by
 *               side and overlapping), fed by a bundle of parallel lines, one
 *               per query. Hover, focus or tap a scope to light it and the
 *               scopes around it; the chain below says the same in words.
 *   notify    — the real recipient matrix: every event × every audience as a
 *               dot grid (filled = notified, ring = not), with a total per
 *               audience. Hover or focus a row — arrow keys move between rows,
 *               a click or tap pins one — and the caption names the event and
 *               who hears about it.
 *   offline   — the sync as five steps on one line: dashed while there is no
 *               signal, solid once it is back, a signal glyph on every step.
 *               A packet rides the line once and each step it reaches turns
 *               jade; the last one is the single post.
 *   daily     — a 24-hour dial with one amber mark at the run time (read from
 *               the card's title), beside the seven steps, numbered.
 *
 * Renders only from src/data/studies/iet.js (PLATFORM, AUDIENCES,
 * NOTIFY_MATRIX). Counts, totals, the event names (humanised from the enum),
 * the query lines and the dial angle are derived, never typed in. Card tones
 * match the hues Architecture gives the same nodes; amber is only ever the
 * thing being pointed at, jade what the packet has reached.
 *
 * Motion: cards fade up once in view; each diagram plays once when half of it
 * is on screen — the queries drop down their lines together, the scopes
 * appear outermost first, the matrix rows fill top down, the packet rides the
 * sync line, the dial mark draws and the steps follow it in. All geometry is
 * fixed or computed (no randomness). Reduced motion: nothing plays — every
 * diagram is simply in its final state.
 *
 * Layout: container queries on each diagram, since a card's width moves
 * independently of the viewport. The matrix stands its column heads upright
 * below 320px and moves the caption beside the grid from 512px; the sync line
 * runs across from 480px and down below it (signal glyphs move to the row's
 * end); the dial sits beside its steps from 352px.
 * On a touch screen the matrix rows sit 24px apart, the minimum tap target,
 * instead of 12px.
 */
import { Fragment, useId, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { AUDIENCES, NOTIFY_MATRIX, PLATFORM } from '@/data/studies/iet';

/* ── shared ────────────────────────────────────────────────────────────── */
const CARD_IN_VIEW = { once: true, amount: 0.15 };
const VISUAL_IN_VIEW = { once: true, amount: 0.5 }; // a diagram plays once half of it shows
const RISE_PX = 14;
const FADE_S = 0.6;
const PAIR_S = 0.07; // the right-hand card trails the left by one beat
const RULE_PX = 2;
const RULE_ALPHA = 0.6; // top rule — present, not loud
const INSET = 'inset 0 1px 0 rgba(255, 255, 255, 0.04)';
const H3 = 'font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink';

// Top-rule tone per card — the hues Architecture gives these nodes (analytics:
// data and offline: storage → ice; notify: notifications → muted ink; daily:
// workflow → sand), so amber stays free for whatever is being pointed at.
const TONE = { analytics: P.ice, notify: P.inkMuted, offline: P.ice, daily: P.sand };

const pad2 = (n) => String(n).padStart(2, '0');
const round2 = (n) => Math.round(n * 100) / 100; // stable SVG attributes

/** A transition that collapses to "instant" under reduced motion. */
function at(reduce, delay = 0, duration = 0.3) {
  return reduce ? { duration: 0 } : { delay, duration, ease: EASE_OUT };
}

/** Separators drawn for the eye; screen readers hear `spoken` instead. */
function Sep({ glyph, spoken = '' }) {
  return (
    <>
      <span aria-hidden="true" className="text-ink-subtle">
        {glyph}
      </span>
      {spoken && <span className="sr-only">{spoken}</span>}
    </>
  );
}

/* ── analytics: the scope ladder ───────────────────────────────────────── */
// The nesting, as indexes into entry.scopes, outermost first: Organisation ⊃
// Division ⊃ Church / Pastor (side by side, overlapping) ⊃ Project.
const LADDER = [[0], [1], [2, 3], [4]];
const SCOPE_COUNT = LADDER.flat().length;
const LEVEL_OF = Object.fromEntries(LADDER.flatMap((level, l) => level.map((i) => [i, l])));
// query lines: spacing (% of the width), drop (px), one trip (s), pause between the two trips
const QUERY = { gapPct: 7, h: 26, trip: 0.9, rest: 0.35 };
const BOX_LEAD_S = 0.45; // the scopes appear as the first queries land…
const BOX_STEP_S = 0.1; // …outermost first

/** How scope `i` reads while `active` is lit: itself, a scope around it, or neither. */
function relation(i, active) {
  if (active == null) return 'none';
  if (i === active) return 'active';
  return LEVEL_OF[i] < LEVEL_OF[active] ? 'outer' : 'idle';
}

function boxLook(rel, accent) {
  if (rel === 'active') return { border: alpha(accent, 0.75), fill: alpha(accent, 0.06), ink: accent };
  if (rel === 'outer') return { border: alpha(P.inkMuted, 0.45), fill: 'transparent', ink: P.inkMuted };
  return { border: P.lineHi, fill: 'transparent', ink: P.inkSubtle };
}

const CHAIN_INK = { outer: P.ink, idle: P.inkSubtle, none: P.inkMuted };

/** "4 queries · one Promise.all": parallel lines dropping into the outer scope. */
function QueryBundle({ count, run }) {
  const xs = Array.from({ length: count }, (_, i) => round2(50 + (i - (count - 1) / 2) * QUERY.gapPct));
  const trip = { duration: QUERY.trip, repeat: 1, repeatDelay: QUERY.rest };
  return (
    <div className="flex flex-col items-center">
      <p className="font-mono text-micro text-ink-subtle">
        {count} queries <Sep glyph="·" /> one Promise.all
      </p>
      <svg aria-hidden="true" className="mt-1.5 block w-full overflow-visible" height={QUERY.h}>
        {/* the bundle's head — one Promise.all holding them together */}
        <line
          x1={`${xs[0]}%`}
          x2={`${xs[xs.length - 1]}%`}
          y1="0.75"
          y2="0.75"
          stroke={alpha(P.ice, 0.55)}
          strokeWidth="1.5"
        />
        {xs.map((x) => (
          <line key={x} x1={`${x}%`} x2={`${x}%`} y1="0" y2={QUERY.h} stroke={alpha(P.ice, 0.45)} strokeWidth="1.25" />
        ))}
        {/* all of them at once — that is the point */}
        {run &&
          xs.map((x) => (
            <motion.circle
              key={`packet-${x}`}
              cx={`${x}%`}
              r="2.5"
              fill={P.ice}
              initial={{ cy: 0, opacity: 0 }}
              animate={{ cy: QUERY.h, opacity: [0, 1, 1, 0] }}
              transition={{
                cy: { ...trip, ease: 'easeIn' },
                opacity: { ...trip, times: [0, 0.15, 0.8, 1] },
              }}
            />
          ))}
      </svg>
    </div>
  );
}

// where a scope's name sits in its box
const LABEL_ALIGN = { start: 'self-start', end: 'self-end', center: 'self-center' };

/** One scope: a bordered box with its name as a button (tap to pin). */
function ScopeBox({ i, ctx, align = 'start', className = '', children }) {
  const { scopes, active, picked, accent, shown, reduce, onHover, onFocusScope, onPick } = ctx;
  const look = boxLook(relation(i, active), accent);
  return (
    <motion.div
      className={`relative flex flex-col rounded-md border transition-colors duration-200 motion-reduce:transition-none ${className}`}
      style={{ borderColor: look.border, background: look.fill }}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: shown ? 1 : 0 }}
      transition={at(reduce, BOX_LEAD_S + LEVEL_OF[i] * BOX_STEP_S, 0.45)}
      onPointerOver={(e) => {
        e.stopPropagation(); // the innermost scope under the pointer wins
        if (e.pointerType !== 'touch') onHover(i); // a tap pins instead (below)
      }}
    >
      <button
        type="button"
        aria-pressed={picked === i}
        onClick={() => onPick(i)}
        // keyboard focus lights the scope; a click or tap already pins it, so
        // its focus must not keep it lit after a second tap un-pins it
        onFocus={(e) => {
          if (e.currentTarget.matches(':focus-visible')) onFocusScope(i);
        }}
        onBlur={() => onFocusScope(null)}
        className={`rounded-sm px-1.5 py-1.5 font-mono text-micro uppercase leading-none tracking-[0.1em] transition-colors duration-200 motion-reduce:transition-none ${LABEL_ALIGN[align]}`}
        style={{ color: look.ink }}
      >
        {scopes[i]}
      </button>
      {children}
    </motion.div>
  );
}

/** The ladder in words — also the diagram's text equivalent. */
function ScopeChain({ scopes, active, accent }) {
  const inkOf = (i) => {
    const rel = relation(i, active);
    return rel === 'active' ? accent : CHAIN_INK[rel];
  };
  return (
    <p className="mt-4 break-words font-mono text-label leading-relaxed">
      {LADDER.map((level, l) => (
        <Fragment key={level.join('-')}>
          {l > 0 && <Sep glyph=" ⊃ " spoken=", containing " />}
          {level.map((i, k) => (
            <Fragment key={i}>
              {k > 0 && <Sep glyph=" / " spoken=" or " />}
              <span className="transition-colors duration-200 motion-reduce:transition-none" style={{ color: inkOf(i) }}>
                {scopes[i]}
              </span>
            </Fragment>
          ))}
        </Fragment>
      ))}
    </p>
  );
}

function AnalyticsVisual({ entry, accent, reduce, live }) {
  const [hover, setHover] = useState(null); // pointer
  const [focused, setFocused] = useState(null); // keyboard
  const [picked, setPicked] = useState(null); // tapped / clicked — stays lit
  const scopes = entry.scopes ?? [];
  if (scopes.length !== SCOPE_COUNT) return null; // the ladder is drawn for these five

  const active = hover ?? focused ?? picked;
  const queries = Number.parseInt(entry.stat?.value, 10) || 0;
  const ctx = {
    scopes,
    active,
    picked,
    accent,
    reduce,
    shown: reduce || live,
    onHover: setHover,
    onFocusScope: setFocused,
    onPick: (i) => setPicked((p) => (p === i ? null : i)),
  };

  return (
    <div className="flex flex-1 flex-col">
      {queries > 0 && <QueryBundle count={queries} run={live && !reduce} />}
      <div role="group" aria-label="Scopes" className="flex flex-1 flex-col" onPointerLeave={() => setHover(null)}>
        <ScopeBox i={0} ctx={ctx} className="flex-1 p-1.5 sm:p-2">
          <ScopeBox i={1} ctx={ctx} className="mt-1 flex-1 p-1.5 sm:p-2">
            {/* Church and Pastor overlap; Project sits where they meet */}
            <div className="mt-1 grid min-h-[4.75rem] flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <ScopeBox i={2} ctx={ctx} className="col-start-1 col-end-3 row-start-1" />
              <ScopeBox i={3} ctx={ctx} align="end" className="col-start-2 col-end-4 row-start-1" />
              <ScopeBox
                i={4}
                ctx={ctx}
                align="center"
                className="z-10 col-start-2 col-end-3 row-start-1 mx-1.5 my-2.5 self-center"
              />
            </div>
          </ScopeBox>
        </ScopeBox>
      </div>
      <ScopeChain scopes={scopes} active={active} accent={accent} />
    </div>
  );
}

/* ── notify: the recipient matrix ──────────────────────────────────────── */
// Column heads (short) and caption names (long), by audience enum
const AUDIENCE_NAME = {
  OWNER: { short: 'Owner', long: 'Owner' },
  DIVISION_LEADER: { short: 'Leader', long: 'Division Leader' },
  HQ: { short: 'HQ', long: 'HQ' },
  PRESIDENT: { short: 'President', long: 'President' },
  FINANCE: { short: 'Finance', long: 'Finance' },
};
const ACRONYMS = new Set(['HQ']);

/** APPROVED_AMOUNT_CHANGED → "Approved amount changed" (acronyms kept). */
function humanise(id) {
  return id
    .split('_')
    .map((w, i) => {
      if (ACRONYMS.has(w)) return w;
      const lower = w.toLowerCase();
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(' ');
}
const audienceName = (a) => AUDIENCE_NAME[a] ?? { short: humanise(a), long: humanise(a) };

// every event, its readable name, and who receives it — in column order
const EVENTS = NOTIFY_MATRIX.map(([id, to]) => ({
  id,
  name: humanise(id),
  to: AUDIENCES.filter((a) => to.includes(a)),
}));
const TOTALS = AUDIENCES.map((a) => EVENTS.filter((e) => e.to.includes(a)).length);
const MATRIX_COLS = { gridTemplateColumns: `0.75rem repeat(${AUDIENCES.length}, minmax(0, 1fr))` };
const MATRIX_DOT = 7; // px
const ROWS_LEAD_S = 0.1;
const ROW_STEP_S = 0.022; // the rows fill top down in about half a second

function MatrixDot({ filled, tone }) {
  return (
    <span
      aria-hidden="true"
      className="block shrink-0 rounded-full border"
      style={{
        width: MATRIX_DOT,
        height: MATRIX_DOT,
        background: filled ? tone : 'transparent',
        borderColor: filled ? tone : P.inkFaint,
      }}
    />
  );
}

/** One event: a row of dots. Its name lives in a stretched button, so the
 *  whole row is one hover / focus target and the table keeps its semantics. */
function MatrixRow({ event, index, on, pinned, accent, tabbable, shown, reduce, handlers }) {
  const toId = useId();
  return (
    <motion.div
      role="row"
      className="relative grid h-3 items-center rounded-sm pointer-coarse:h-6"
      style={{ ...MATRIX_COLS, background: on ? alpha(accent, 0.09) : undefined }}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: shown ? 1 : 0 }}
      transition={at(reduce, ROWS_LEAD_S + index * ROW_STEP_S, 0.3)}
    >
      <span role="rowheader" className="flex h-full items-center">
        <span
          aria-hidden="true"
          className="h-[7px] w-0.5 rounded-full"
          style={{ background: on ? accent : 'transparent' }}
        />
        <button
          type="button"
          data-event-row=""
          tabIndex={tabbable ? 0 : -1}
          aria-pressed={pinned}
          // who hears about it, read once on focus (the caption is not a live region)
          aria-describedby={toId}
          onClick={() => handlers.pick(index)}
          // a touch "hover" ends the moment the finger lifts, so a tap pins instead
          onPointerEnter={(e) => {
            if (e.pointerType !== 'touch') handlers.hover(index);
          }}
          // only keyboard focus lights a row; a click already pins it, so its
          // focus must not keep it lit after a second click un-pins it
          onFocus={(e) => handlers.focus(index, e.currentTarget.matches(':focus-visible'))}
          onBlur={handlers.blur}
          onKeyDown={(e) => handlers.key(e, index)}
          // the ring goes on the stretched ::after, not on this zero-size button
          // (an inline style is the one thing that outranks .mc-root :focus-visible)
          style={{ outline: 'none' }}
          className="cursor-pointer after:absolute after:inset-0 after:rounded-sm focus-visible:after:outline-2 focus-visible:after:outline-offset-1 focus-visible:after:outline-accent"
        >
          <span className="sr-only">{event.name}</span>
        </button>
        {/* hidden still counts toward the description, but stays out of the rowheader's name */}
        <span id={toId} hidden>
          {`to ${event.to.map((a) => audienceName(a).long).join(', ')}`}
        </span>
      </span>
      {AUDIENCES.map((a) => {
        const yes = event.to.includes(a);
        return (
          <span key={a} role="cell" className="flex justify-center">
            <MatrixDot filled={yes} tone={on ? accent : P.inkMuted} />
            <span className="sr-only">{yes ? 'yes' : 'no'}</span>
          </span>
        );
      })}
    </motion.div>
  );
}

function NotifyVisual({ accent, reduce, live }) {
  const [hover, setHover] = useState(null); // pointer
  const [focused, setFocused] = useState(null); // keyboard
  const [picked, setPicked] = useState(null); // tapped / clicked — stays lit
  const [rover, setRover] = useState(0); // the one row in the tab order
  const active = hover ?? focused ?? picked;
  const event = active != null ? EVENTS[active] : null;
  const shown = reduce || live;
  const last = EVENTS.length - 1;

  const handlers = {
    hover: setHover,
    pick: (i) => setPicked((p) => (p === i ? null : i)),
    focus: (i, visible) => {
      setRover(i);
      if (visible) setFocused(i);
    },
    blur: () => setFocused(null),
    key: (e, i) => {
      let target;
      if (e.key === 'ArrowDown') target = i + 1;
      else if (e.key === 'ArrowUp') target = i - 1;
      else if (e.key === 'Home') target = 0;
      else if (e.key === 'End') target = last;
      else return;
      e.preventDefault();
      const next = Math.min(last, Math.max(0, target));
      const rows = e.currentTarget.closest('[role="rowgroup"]')?.querySelectorAll('[data-event-row]');
      rows?.[next]?.focus();
    },
  };

  return (
    <div className="my-auto flex flex-col gap-5 @min-[32rem]:flex-row @min-[32rem]:items-start @min-[32rem]:gap-6">
      <div
        role="table"
        aria-label={`Who is notified: ${EVENTS.length} events by ${AUDIENCES.length} audiences`}
        className="w-full max-w-[22rem] shrink-0 @min-[32rem]:w-[20rem]"
      >
        <div role="rowgroup">
          <div role="row" className="grid items-end pb-1.5" style={MATRIX_COLS}>
            <span role="columnheader">
              <span className="sr-only">Event</span>
            </span>
            {AUDIENCES.map((a) => (
              <span key={a} role="columnheader" className="flex justify-center">
                {/* upright in a narrow card, so five heads fit over five columns */}
                <span
                  className={`whitespace-nowrap font-mono text-micro leading-none transition-colors duration-200 [writing-mode:vertical-rl] rotate-180 @min-[20rem]:rotate-0 @min-[20rem]:[writing-mode:horizontal-tb] ${
                    event?.to.includes(a) ? 'text-ink' : 'text-ink-subtle'
                  }`}
                >
                  {audienceName(a).short}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div role="rowgroup" onPointerLeave={() => setHover(null)}>
          {EVENTS.map((ev, i) => (
            <MatrixRow
              key={ev.id}
              event={ev}
              index={i}
              on={i === active}
              pinned={i === picked}
              accent={accent}
              tabbable={i === rover}
              shown={shown}
              reduce={reduce}
              handlers={handlers}
            />
          ))}
        </div>

        <div role="rowgroup">
          <div role="row" className="mt-1.5 grid items-center border-t border-line pt-1.5" style={MATRIX_COLS}>
            <span role="rowheader" className="font-mono text-micro leading-none text-ink-subtle">
              <span aria-hidden="true">Σ</span>
              <span className="sr-only">Events per audience</span>
            </span>
            {TOTALS.map((t, k) => (
              <span
                key={AUDIENCES[k]}
                role="cell"
                className="text-center font-mono text-micro leading-none tabular-nums text-ink-subtle"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {/* tall enough for the longest event, so nothing below it jumps */}
        <div className="relative min-h-[9rem]">
          {!event && <p className="text-label text-ink-subtle">Hover, tap or focus a row to read its event.</p>}
          {/* the visual readout only — each row describes itself on focus */}
          <div>
            {event && (
              <>
                <p aria-hidden="true" className="font-mono text-micro tabular-nums text-ink-subtle">
                  {pad2(active + 1)} / {pad2(EVENTS.length)}
                </p>
                <p className="mt-1.5 text-body font-medium leading-snug text-ink">{event.name}</p>
                <p className="mt-1.5 text-label text-ink-muted">
                  <Sep glyph="→ " spoken="to " />
                  {event.to.map((a, k) => (
                    <Fragment key={a}>
                      {k > 0 && <Sep glyph=" · " spoken=", " />}
                      {audienceName(a).long}
                    </Fragment>
                  ))}
                </p>
                <p aria-hidden="true" className="mt-1.5 break-all font-mono text-micro text-ink-subtle">
                  {event.id}
                </p>
              </>
            )}
          </div>
        </div>
        <ul aria-label="Key" className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-micro text-ink-subtle">
          <li className="inline-flex items-center gap-1.5">
            <MatrixDot filled tone={P.inkMuted} />
            notified
          </li>
          <li className="inline-flex items-center gap-1.5">
            <MatrixDot filled={false} />
            not notified
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">Σ</span>
            events per audience
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ── offline: the sync line ────────────────────────────────────────────── */
const SYNC = { lead: 0.35, seg: 0.6, pulse: 0.9 }; // s: before the packet, per step, the last ring
const SIGNAL_STEP = /signal/i; // the step where the signal comes back
const CODE_IN_PARENS = /\(([A-Za-z][A-Za-z0-9]*)\)/; // "(offlineId)" → set as code
const SIGNAL_BARS = [3, 6, 9, 12]; // px heights, rising

/** Four rising bars: filled when there is signal, outlines and a slash when not. */
function SignalGlyph({ on }) {
  return (
    <svg viewBox="0 0 16 12" width="16" height="12" aria-hidden="true" className="block">
      {SIGNAL_BARS.map((h, i) => (
        <rect
          key={h}
          x={i * 4 + 0.5}
          y={12 - h + 0.5}
          width="2.5"
          height={h - 1}
          rx="0.5"
          fill={on ? P.inkMuted : 'none'}
          stroke={on ? 'none' : P.inkFaint}
          strokeWidth="1"
        />
      ))}
      {!on && <path d="M1.5 11 L14.5 1" stroke={P.inkSubtle} strokeWidth="1.25" strokeLinecap="round" />}
    </svg>
  );
}

function StepLabel({ text }) {
  const m = text.match(CODE_IN_PARENS);
  if (!m) return text;
  return (
    <>
      {text.slice(0, m.index)}(<code className="font-mono text-micro">{m[1]}</code>)
      {text.slice(m.index + m[0].length)}
    </>
  );
}

/**
 * The line from one step to the next. It is a zero-height box across (or a
 * zero-width box down), so the same top + left borders draw it in either
 * direction; the trail grows both width and height, and the packet rides its
 * far corner — whichever way the line runs.
 */
function SyncLine({ dashed, delay, run, reduce, accent }) {
  const pattern = dashed ? 'border-dashed' : 'border-solid';
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-[6.25px] top-1/2 h-full w-0 @min-[30rem]:left-1/2 @min-[30rem]:top-[26.25px] @min-[30rem]:h-0 @min-[30rem]:w-full"
    >
      <span
        className={`absolute left-0 top-0 h-full w-full border-l-[1.5px] border-t-[1.5px] ${pattern}`}
        style={{ borderColor: P.lineHi }}
      />
      <motion.span
        className={`absolute left-0 top-0 border-l-[1.5px] border-t-[1.5px] ${pattern}`}
        style={{ borderColor: alpha(P.jade, 0.7) }}
        initial={reduce ? false : { width: '0%', height: '0%' }}
        animate={reduce || run ? { width: '100%', height: '100%' } : { width: '0%', height: '0%' }}
        transition={reduce ? { duration: 0 } : { delay, duration: SYNC.seg, ease: 'easeInOut' }}
      >
        {run && (
          <motion.span
            className="absolute bottom-0 right-0 h-2 w-2 translate-x-[calc(50%_-_0.75px)] translate-y-[calc(50%_-_0.75px)] rounded-full"
            style={{ background: accent, boxShadow: `0 0 0 2px ${P.surface}` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ delay, duration: SYNC.seg, times: [0, 0.12, 0.88, 1] }}
          />
        )}
      </motion.span>
    </span>
  );
}

function SyncNode({ reachAt, last, run, reduce }) {
  const idle = { backgroundColor: P.void, borderColor: P.lineHi };
  const done = { backgroundColor: alpha(P.jade, last ? 0.9 : 0.22), borderColor: P.jade };
  return (
    <span className="relative block h-3.5 w-3.5">
      <motion.span
        className="absolute inset-0 rounded-full border-[1.5px]"
        initial={reduce ? false : idle}
        animate={reduce || run ? done : idle}
        transition={at(reduce, reachAt, 0.25)}
      />
      {last && run && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: P.jade }}
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 2.6], opacity: [0.8, 0] }}
          transition={{ delay: reachAt + 0.1, duration: SYNC.pulse, ease: EASE_OUT }}
        />
      )}
    </span>
  );
}

function OfflineVisual({ entry, accent, reduce, live }) {
  const flow = entry.flow ?? [];
  const n = flow.length;
  const signalAt = Math.max(0, flow.findIndex((s) => SIGNAL_STEP.test(s)));
  const run = live && !reduce;
  const reachAt = (i) => SYNC.lead + i * SYNC.seg;

  return (
    <div className="my-auto">
      <ol className="grid grid-cols-1 @min-[30rem]:grid-flow-col @min-[30rem]:grid-cols-none @min-[30rem]:auto-cols-fr">
        {flow.map((step, i) => {
          const offline = i < signalAt;
          return (
            <li
              key={step}
              className="relative flex h-11 items-center gap-3 @min-[30rem]:h-auto @min-[30rem]:flex-col @min-[30rem]:gap-2 @min-[30rem]:px-1.5 @min-[30rem]:text-center"
            >
              {i < n - 1 && (
                <SyncLine dashed={i < signalAt} delay={reachAt(i)} run={run} reduce={reduce} accent={accent} />
              )}
              <span className="relative z-10 order-1 @min-[30rem]:order-2">
                <SyncNode reachAt={reachAt(i)} last={i === n - 1} run={run} reduce={reduce} />
              </span>
              <span className="order-2 min-w-0 flex-1 text-label leading-snug text-ink-muted @min-[30rem]:order-3 @min-[30rem]:flex-none">
                <StepLabel text={step} />
                <span className="sr-only">{offline ? ' — no signal' : ' — signal'}</span>
              </span>
              <span className="order-3 flex h-3 shrink-0 items-center @min-[30rem]:order-1">
                <SignalGlyph on={!offline} />
              </span>
            </li>
          );
        })}
      </ol>
      <ul aria-hidden="true" className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-micro text-ink-subtle">
        <li className="inline-flex items-center gap-2">
          <span className="inline-block w-5 border-t-[1.5px] border-dashed" style={{ borderColor: P.inkSubtle }} />
          offline
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block w-5 border-t-[1.5px] border-solid" style={{ borderColor: P.inkSubtle }} />
          online
        </li>
      </ul>
    </div>
  );
}

/* ── daily: the dial ───────────────────────────────────────────────────── */
const DIAL = { size: 136, r: 54, major: 6, minor: 3, labelIn: 17 }; // px
const DIAL_C = DIAL.size / 2;
const RUN_TIME = /(\d{1,2}):(\d{2})\s*([A-Z]{2,4})?/; // "00:30 IST"
const DIAL_T = { mark: 0.3, dot: 0.55, ring: 0.7, list: 0.8, step: 0.06 }; // s

/** Clockwise from the top, as on a clock face. */
function polar(deg, radius) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: round2(DIAL_C + radius * Math.cos(a)), y: round2(DIAL_C + radius * Math.sin(a)) };
}

// one tick per hour, longer every six hours, where the labels go
const TICKS = Array.from({ length: 24 }, (_, h) => {
  const major = h % 6 === 0;
  const deg = h * 15;
  return { h, major, a: polar(deg, DIAL.r - (major ? DIAL.major : DIAL.minor)), b: polar(deg, DIAL.r) };
});
const HOUR_LABELS = [0, 6, 12, 18].map((h) => ({ h, text: pad2(h), p: polar(h * 15, DIAL.r - DIAL.labelIn) }));

/** The run time in the card's title → label, zone and the angle on a 24-hour dial. */
function runTimeOf(title) {
  const m = RUN_TIME.exec(title ?? '');
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return { label: `${m[1].padStart(2, '0')}:${m[2]}`, zone: m[3] ?? '', deg: (minutes / 1440) * 360 };
}

function Dial({ time, accent, reduce, run, shown }) {
  const inner = polar(time.deg, DIAL.r - 5);
  const outer = polar(time.deg, DIAL.r + 7);
  const dot = polar(time.deg, DIAL.r);
  return (
    <svg
      width={DIAL.size}
      height={DIAL.size}
      viewBox={`0 0 ${DIAL.size} ${DIAL.size}`}
      role="img"
      aria-label={`A 24-hour dial, marked at ${time.label}${time.zone ? ` ${time.zone}` : ''}`}
      className="block shrink-0 overflow-visible"
    >
      <circle cx={DIAL_C} cy={DIAL_C} r={DIAL.r} fill="none" stroke={P.lineHi} strokeWidth="1" />
      {TICKS.map((t) => (
        <line
          key={t.h}
          x1={t.a.x}
          y1={t.a.y}
          x2={t.b.x}
          y2={t.b.y}
          stroke={t.major ? P.inkSubtle : P.inkFaint}
          strokeWidth={t.major ? 1.25 : 1}
        />
      ))}
      {HOUR_LABELS.map((l) => (
        <text
          key={l.h}
          x={l.p.x}
          y={l.p.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="11"
          className="font-mono"
          fill={P.inkSubtle}
        >
          {l.text}
        </text>
      ))}

      {/* the run */}
      <motion.line
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={shown ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={at(reduce, DIAL_T.mark, 0.35)}
      />
      <motion.circle
        cx={dot.x}
        cy={dot.y}
        r="3.5"
        fill={accent}
        stroke={P.surface}
        strokeWidth="2"
        initial={reduce ? false : { scale: 0, opacity: 0 }}
        animate={shown ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={at(reduce, DIAL_T.dot, 0.3)}
      />
      {run && (
        <motion.circle
          cx={dot.x}
          cy={dot.y}
          r="3.5"
          fill="none"
          stroke={accent}
          strokeWidth="1"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 3], opacity: [0.8, 0] }}
          transition={{ delay: DIAL_T.ring, duration: 0.9, ease: EASE_OUT }}
        />
      )}

      <text
        x={DIAL_C}
        y={DIAL_C - (time.zone ? 5 : 0)}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="15"
        className="font-mono"
        fill={P.ink}
      >
        {time.label}
      </text>
      {time.zone && (
        <text
          x={DIAL_C}
          y={DIAL_C + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="11"
          letterSpacing="0.12em"
          className="font-mono"
          fill={P.inkSubtle}
        >
          {time.zone}
        </text>
      )}
    </svg>
  );
}

function DailyVisual({ entry, accent, reduce, live }) {
  const steps = entry.steps ?? [];
  const time = runTimeOf(entry.title);
  const shown = reduce || live;
  return (
    <div className="my-auto flex flex-col gap-5 @min-[22rem]:flex-row @min-[22rem]:items-center @min-[22rem]:gap-7">
      {time && <Dial time={time} accent={accent} reduce={reduce} run={live && !reduce} shown={shown} />}
      <ol className="min-w-0 flex-1">
        {steps.map((step, i) => (
          <motion.li
            key={step}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-baseline gap-x-2 border-t border-line py-[7px] first:border-t-0 first:pt-0 last:pb-0"
            initial={reduce ? false : { opacity: 0, x: -4 }}
            animate={shown ? { opacity: 1, x: 0 } : { opacity: 0, x: -4 }}
            transition={at(reduce, DIAL_T.list + i * DIAL_T.step, 0.35)}
          >
            <span aria-hidden="true" className="font-mono text-micro tabular-nums text-ink-subtle">
              {pad2(i + 1)}
            </span>
            <span className="text-label leading-snug text-ink-muted">{step}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/* ── card ──────────────────────────────────────────────────────────────── */

function renderVisual(entry, props) {
  switch (entry.key) {
    case 'analytics':
      return <AnalyticsVisual entry={entry} {...props} />;
    case 'notify':
      return <NotifyVisual {...props} />;
    case 'offline':
      return <OfflineVisual entry={entry} {...props} />;
    case 'daily':
      return <DailyVisual entry={entry} {...props} />;
    default:
      return null;
  }
}

function PlatformCard({ entry, order, accent, reduce }) {
  const cardRef = useRef(null);
  const visualRef = useRef(null);
  const cardIn = useInView(cardRef, CARD_IN_VIEW);
  const live = useInView(visualRef, VISUAL_IN_VIEW);
  const titleId = useId();
  const shown = reduce || cardIn;
  const tone = TONE[entry.key] ?? P.ice;
  const { stat } = entry;

  return (
    <motion.li
      ref={cardRef}
      className="relative flex min-w-0 flex-col overflow-hidden rounded-panel border border-line bg-surface"
      style={{ boxShadow: INSET }}
      initial={reduce ? false : { opacity: 0, y: RISE_PX }}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: RISE_PX }}
      transition={at(reduce, (order % 2) * PAIR_S, FADE_S)}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0"
        style={{ height: RULE_PX, background: alpha(tone, RULE_ALPHA) }}
      />
      <article aria-labelledby={titleId} className="flex flex-1 flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 pb-3 pt-4 sm:px-6">
          {/* .mc-label sets its own colour; the inline style lifts it a step */}
          <p className="mc-label leading-normal" style={{ color: P.inkMuted }}>
            {entry.label}
          </p>
          {stat && (
            // the footer says it in full; this is the at-a-glance copy
            <span aria-hidden="true" className="shrink-0 font-mono text-label leading-normal tabular-nums text-ink-subtle">
              {stat.value}
            </span>
          )}
        </header>

        <div className="flex flex-1 flex-col px-4 pb-5 pt-5 sm:px-6 sm:pb-6">
          <h3 id={titleId} className={H3}>
            {entry.title}
          </h3>
          <p className="mt-3 max-w-[64ch] text-body text-ink-muted">{entry.body}</p>

          <div ref={visualRef} className="@container mt-7 flex min-w-0 flex-1 flex-col">
            {renderVisual(entry, { accent, reduce, live })}
          </div>

          {stat && (
            <p className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-4">
              <span className="font-display text-3xl font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">
                {stat.value}
              </span>
              <span className="font-mono text-micro uppercase tracking-[0.14em] text-ink-subtle">{stat.label}</span>
            </p>
          )}
        </div>
      </article>
    </motion.li>
  );
}

/* ── the section ───────────────────────────────────────────────────────── */

export default function Platform({ accent = P.accent }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <ul className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
      {PLATFORM.map((entry, i) => (
        <PlatformCard key={entry.key} entry={entry} order={i} accent={accent} reduce={reduce} />
      ))}
    </ul>
  );
}
