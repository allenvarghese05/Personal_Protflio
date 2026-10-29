'use client';

/**
 * Lifecycle — "21 statuses, one engine — and every move leaves a record."
 *
 * The ApplicationStatus enum as one long metro line: the main statuses are
 * stops on a 1px rail with each stage's heading set inline between them; the
 * branch statuses hang off the stop they leave from on a short elbow — the
 * loop back, the rejections, the President's hold, the delay flag and the
 * reserved values (off the last stop, a short spur carries the line down to
 * them). A legend under the map counts each kind from the data. A status the
 * server never writes (server: false) is drawn
 * hollow and dashed, with a small mono tag saying why (on device, a flag,
 * legacy, reserved). Beside the line the approval stack lights whoever acts
 * next and a detail card reads the status out — who acts, the note, and for a
 * happy-path step the engine action and its log line. Below, the
 * ApplicationStatusHistory log holds one row per transition up to the step.
 *
 * Nothing plays on its own. A scrubber — a native range input with one tick
 * per AUDIT step (taller where a new stage opens) — drives the replay: drag
 * it, or press Play to advance one step per beat from where it stands (from
 * the start if it's at the end). Dragging, Reset or picking a stop pauses.
 * Picking a happy-path stop moves the scrubber there; picking a branch keeps
 * the step and shows the branch. The current stop is amber with a one-shot
 * ring pulse, reached stops jade. Once the panel is in view the thumb pulses
 * twice to invite a drag. Reduced motion: starts on the finished path, no
 * pulses; Play still steps through.
 *
 * Layout: ≥1024px the map is the wider left column and the right column is
 * sticky — the approval stack over the scrubber + detail panel. On a short
 * screen the column pins by its bottom instead (only the top of the stack
 * slides out of view), so the panel is always on screen. The detail card
 * holds the height of its longest status, so nothing moves while scrubbing.
 * The log runs full width below and scrolls sideways on narrow screens rather
 * than wrapping. Under 1024px it all stacks with the scrubber and detail
 * first; the stack hides under 640px (its labels would fall below 11px) — the
 * detail card says who acts next instead (the map's hover chip goes too), and
 * a picked stop's note opens under it in the map.
 *
 * Renders only from src/data/studies/iet.js (STATUSES, STAGES, ACTORS, ROLES,
 * AUDIT); every count, tag and legend entry is derived.
 */
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { ACTORS, AUDIT, ROLES, STAGES, STATUSES } from '@/data/studies/iet';
import ApprovalStack from '@/components/ui/case/ApprovalStack';

/* ── timing ─────────────────────────────────────────────────────────────── */
const STEP_MS = 900; // one transition per beat while playing
const PULSE_S = 0.9; // the current stop's one-shot ring
const INVITE_S = 1.1; // the thumb's in-view nudge (played twice)
const INVITE_GAP_S = 0.5;
const ENTER_S = 0.35; // a log row / the detail card fading in
const IN_VIEW = { once: true, amount: 0.5 }; // the scrubber panel, half on screen

/* ── the sticky column (lg) ─────────────────────────────────────────────── */
const STICKY_TOP = 96; // lg:top-24
const STICKY_GAP = 24; // room left under it when it pins by its bottom

/* ── copy that isn't study data ─────────────────────────────────────────── */
const HISTORY_TABLE = 'ApplicationStatusHistory';
const HINT_START = 'Drag through the path, or press play.';
const HINT_END = 'Drag back through the path, or replay it.';
const LOG_COLUMNS = ['date', 'from', 'to', 'by', 'action', 'extra'];

/* ── map geometry (px) — rails, dots and elbows are absolutely placed ───── */
const RAIL_X = 8; // the 1px rail's left edge
const RAIL_CX = RAIL_X + 0.5;
const ROW_PT = 8;
const ROW_PB = 7;
const LABEL_LH = 19;
const DOT_CY = ROW_PT + LABEL_LH / 2; // centre of the label line
const DOT = 9; // a main stop
const BRANCH_DOT = 7;
const HOLLOW_GROW = 2; // a never-written stop's dashed ring runs a touch larger
const DASHES = 12; // dashes + gaps around that ring
const BRANCH_CX = 28.5;
const MAIN_PL = 28; // label inset, main stops
const BRANCH_PL = 42; // label inset, branch stops — indented beside their stop
const ELBOW_RISE = 13; // the elbow leaves the rail this far above the dot
const PULSE_SCALE = 2.8;

/* ── scrubber geometry (px) ─────────────────────────────────────────────── */
const HIT = 28; // the native thumb: invisible, sized so a finger lands on it
const KNOB = 16; // the drawn thumb, centred on the native one
const KNOB_MT = 0.5 - KNOB / 2; // centres it on the 1px track (which sits just under 50%)
const TICK_H = 6;
const TICK_STAGE_H = 12; // the first step of a stage

const RAIL_IDLE = P.lineHi;
const RAIL_DONE = alpha(P.jade, 0.55);
const DONE_FILL = alpha(P.jade, 0.85);

/* ── derived once from the study data ───────────────────────────────────── */
const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s]));
const STAGE_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s]));
const MAIN = STATUSES.filter((s) => s.main);
const BRANCHES = STATUSES.filter((s) => !s.main);
const MAIN_INDEX = Object.fromEntries(MAIN.map((s, i) => [s.id, i]));
const LAST_STEP = AUDIT.length - 1;
const NO_TIERS = [];

// status id → its row in the happy-path log (first occurrence)
const AUDIT_INDEX = {};
AUDIT.forEach((entry, i) => {
  if (!(entry.to in AUDIT_INDEX)) AUDIT_INDEX[entry.to] = i;
});

const labelOf = (id) => STATUS_BY_ID[id]?.label ?? id;
const stageOf = (id) => STATUS_BY_ID[id]?.stage;
const pad2 = (n) => String(n).padStart(2, '0');
const isReached = (id, step) => (AUDIT_INDEX[id] ?? Infinity) <= step;
const railColor = (id, step) => (isReached(id, step) ? RAIL_DONE : RAIL_IDLE);
const actorOf = (status) => ACTORS[status.actor] ?? ACTORS.none;
const frac = (i) => (LAST_STEP > 0 ? i / LAST_STEP : 0);
// centre of step i along the scrubber, matching where the native thumb sits
const along = (f, offset = 0) => `calc(${HIT / 2 + offset}px + ${f} * (100% - ${HIT}px))`;

// a step that opens a new stage gets the taller tick
const STAGE_START = AUDIT.map((e, i) => i === 0 || stageOf(e.to) !== stageOf(AUDIT[i - 1].to));

// the log's "from": the row before, unless the server never saw that status
const LOG_FROM = AUDIT.map((_, i) => {
  const prev = AUDIT[i - 1];
  return prev && STATUS_BY_ID[prev.to]?.server !== false ? prev.to : null;
});

// the application the log follows, as the log itself names it
const APP_REF =
  AUDIT.map((e) => e.extra?.match(/\bAPP-\d{4}-\d+\b/)?.[0]).find(Boolean) ?? null;

/**
 * Branch kinds: `hue` draws the dot, `wire` the elbow, `ink` the annotation
 * text (readable on the void). `one` / `many` name it in the legend.
 */
const KIND = {
  loop: {
    one: 'loop', many: 'loops', glyph: '↺',
    hue: P.inkMuted, wire: alpha(P.inkMuted, 0.5), ink: P.inkMuted,
    note: (s) => (s.to ? `back to ${labelOf(s.to)}` : null),
  },
  reject: {
    one: 'rejection', many: 'rejections', glyph: '✕',
    hue: P.alert, wire: alpha(P.alert, 0.5), ink: alpha(P.alert, 0.85),
    note: () => 'terminal',
  },
  hold: {
    one: 'hold', many: 'holds', glyph: '‖',
    hue: P.lilac, wire: alpha(P.lilac, 0.5), ink: P.lilac,
    note: () => 'resumes where it was',
  },
  flag: {
    one: 'flag', many: 'flags', glyph: '⚑',
    hue: P.sand, wire: alpha(P.sand, 0.5), ink: P.sand,
    note: () => 'past the deadline',
  },
  reserved: {
    one: 'reserved', many: 'reserved', glyph: '',
    hue: P.inkFaint, wire: P.inkFaint, ink: P.inkSubtle,
    note: () => null, // the server tag says it
  },
};
const kindKey = (status) => (KIND[status.kind] ? status.kind : 'loop');
const kindOf = (status) => KIND[kindKey(status)];

/** Why a status is never written by the server, in two words — or null. */
function serverTag(status) {
  if (status.server !== false) return null;
  if (status.main) return 'on device';
  if (status.kind === 'flag') return 'a flag';
  if (status.kind === 'reserved') return /^legacy\b/i.test(status.note) ? 'legacy' : 'reserved';
  return 'not written';
}

// the legend's counts, in KIND order
const KIND_COUNTS = Object.keys(KIND)
  .map((key) => ({ key, n: BRANCHES.filter((b) => kindKey(b) === key).length }))
  .filter((c) => c.n > 0);
const OFF_SERVER = STATUSES.filter((s) => s.server === false).length;

/**
 * The map, laid out once: stage groups → rows, one rail top to bottom. A
 * branch row follows the stop it leaves from; `idx` is the main-line index
 * its rail is measured against (the stop itself, or the stop it hangs off).
 * Past the last stop there is no line to ride, so a short spur (`spur`) runs
 * down from it to its branches, styled like the last branch's elbow; `last`
 * marks the branch where it ends.
 */
const GROUPS = STAGES.map((stage) => {
  const mains = MAIN.filter((s) => s.stage === stage.key);
  const orphans = BRANCHES.filter((b) => b.stage === stage.key && !(b.from in MAIN_INDEX));
  const rows = [
    ...mains.flatMap((s) => {
      const idx = MAIN_INDEX[s.id];
      const off = BRANCHES.filter((b) => b.from === s.id);
      const end = off[off.length - 1];
      const spur =
        idx === MAIN.length - 1 && end ? { color: kindOf(end).wire, dashed: end.server === false } : null;
      return [
        { status: s, idx, spur },
        ...off.map((b) => ({ status: b, idx, spur, last: b === end })),
      ];
    }),
    ...orphans.map((b) => ({ status: b, idx: null, spur: null })),
  ];
  return { stage, rows, firstIdx: mains.length ? MAIN_INDEX[mains[0].id] : null };
}).filter((g) => g.rows.length > 0);

/* ── hooks ──────────────────────────────────────────────────────────────── */

/**
 * The sticky column's top: lg:top-24 while it fits under the scroller's
 * height. When it doesn't, the top eases up — past the scroller's edge if it
 * must — so the column pins by its bottom instead: the scrubber and the
 * detail card stay on screen and only the top of the stack (the apex tick
 * first) slides out of view. Its height is held constant (see DetailCard), so
 * this never moves while scrubbing. Measured, never guessed; null until the
 * first measure.
 */
function usePinnedTop(ref) {
  const [top, setTop] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const scroller = el.closest('[data-mc-scroll]');
    const measure = () => {
      const viewH = scroller ? scroller.clientHeight : window.innerHeight;
      setTop(Math.round(Math.min(STICKY_TOP, viewH - el.offsetHeight - STICKY_GAP)));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (scroller) ro.observe(scroller);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref]);
  return top;
}

/* ── small pieces ───────────────────────────────────────────────────────── */

function Rail({ color, top = 0, bottom, height, dashed = false }) {
  // dashed: 2px on, 2px off — the same rhythm as a never-written elbow
  const paint = dashed
    ? { backgroundImage: `linear-gradient(${color} 50%, transparent 50%)`, backgroundSize: '1px 4px' }
    : { background: color };
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute w-px transition-colors duration-300"
      style={{ left: RAIL_X, top, bottom, height, ...paint }}
    />
  );
}

/** The curve a branch takes off the rail, out to its dot (dashed if it never happens). */
function Elbow({ color, dashed }) {
  const w = BRANCH_CX - BRANCH_DOT / 2;
  const h = DOT_CY + 1;
  const d = `M${RAIL_CX} ${DOT_CY - ELBOW_RISE} Q${RAIL_CX} ${DOT_CY} ${RAIL_CX + ELBOW_RISE} ${DOT_CY} L${w} ${DOT_CY}`;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
    >
      <path d={d} fill="none" stroke={color} strokeWidth="1" strokeDasharray={dashed ? '2 2' : undefined} />
    </svg>
  );
}

/** A stop's circle — solid, or a dashed ring for a status the server never writes. */
function Ring({ size, fill, stroke, dashed, className = '', style }) {
  const r = (size - 1) / 2;
  const dash = dashed ? (2 * Math.PI * r) / DASHES : 0;
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`shrink-0 overflow-visible ${className}`}
      style={style}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth="1"
        strokeDasharray={dashed ? `${dash} ${dash}` : undefined}
        className="transition-[fill,stroke] duration-300"
        style={{ fill, stroke }}
      />
    </svg>
  );
}

/** "on device" · "a flag" · "legacy" · "reserved" — dashed, like the ring. */
function ServerTag({ tag, className = 'px-1' }) {
  return (
    <span className={`inline-flex items-center rounded-chip border border-dashed border-line-hi text-ink-subtle ${className}`}>
      <span className="sr-only">never written by the server: </span>
      {tag}
    </span>
  );
}

/** One stop on the map — a main status or a branch. */
function StopRow({ row, ctx }) {
  const { status: s, idx, spur, last } = row;
  const { step, stepId, focusId, pickedId, pulseKey, accent, onSelect } = ctx;
  const branch = !s.main;
  const kind = branch ? kindOf(s) : null;
  const note = kind ? kind.note(s) : null;
  const tag = serverTag(s);
  const isStep = s.id === stepId; // where the scrubber stands
  const focused = s.id === focusId; // what the detail card shows
  const ring = isStep && !focused; // the step, while a branch is inspected
  const reached = !isStep && isReached(s.id, step);
  const actor = actorOf(s);

  // rail: into this stop and on to the next (main), or straight past (branch)
  const hasNext = idx != null && idx < MAIN.length - 1;
  const railOut = hasNext ? railColor(MAIN[idx + 1].id, step) : null;
  const railIn = !branch && idx > 0 ? railColor(s.id, step) : null;

  const cx = branch ? BRANCH_CX : RAIL_CX;
  const size = (branch ? BRANCH_DOT : DOT) + (tag ? HOLLOW_GROW : 0);
  let fill = P.void;
  let stroke = branch ? kind.hue : P.inkFaint;
  if (focused) {
    fill = tag ? alpha(accent, 0.3) : accent;
    stroke = accent;
  } else if (ring) {
    stroke = accent;
  } else if (reached) {
    fill = tag ? alpha(P.jade, 0.25) : DONE_FILL;
    stroke = DONE_FILL;
  }

  let labelTone = 'text-ink-subtle';
  if (focused) labelTone = 'font-medium text-ink';
  else if (ring) labelTone = 'text-ink';
  else if (reached) labelTone = 'text-ink-muted';

  let current;
  if (isStep) current = 'step';
  else if (focused) current = 'true';

  const chipStyle = focused
    ? { color: accent, borderColor: alpha(accent, 0.35), background: alpha(accent, 0.1) }
    : { color: P.inkMuted, borderColor: P.line, background: P.surface };
  const inset = branch ? BRANCH_PL : MAIN_PL;

  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => onSelect(s.id)}
        // single-select, not a toggle: the scrubber's stop is the step, a picked branch is "true"
        aria-current={current}
        className="group flex w-full items-start gap-3 rounded-md pr-2 text-left transition-colors duration-200 hover:bg-surface-2"
        style={{
          paddingTop: ROW_PT,
          paddingBottom: ROW_PB,
          paddingLeft: inset,
          background: focused ? alpha(accent, 0.07) : undefined,
        }}
      >
        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm transition-colors duration-300 ${labelTone}`}
            style={{ lineHeight: `${LABEL_LH}px` }}
          >
            {s.label}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-micro leading-4">
            <span className={`min-w-0 break-all ${focused ? 'text-ink-muted' : 'text-ink-subtle'}`}>{s.id}</span>
            {note && (
              <span style={{ color: kind.ink }}>
                {kind.glyph && <span aria-hidden>{kind.glyph} </span>}
                {note}
              </span>
            )}
            {tag && <ServerTag tag={tag} />}
          </span>
        </span>
        <span
          // under 640px it would squeeze the label to a sliver — the detail card says it instead
          className={`mt-px shrink-0 rounded-chip border px-1.5 py-[3px] font-mono text-micro leading-none transition-opacity duration-200 max-sm:hidden ${
            focused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}
          style={chipStyle}
        >
          next: {actor.label}
        </span>
      </button>

      {/* under lg the detail card is out of sight above — a picked stop opens its note here
          (spoken by the live region, so hidden from assistive tech) */}
      {s.id === pickedId && (
        <p aria-hidden className="pb-3 pr-2 text-label text-ink-muted lg:hidden" style={{ paddingLeft: inset }}>
          {s.note}
        </p>
      )}

      {/* decorations paint over the row (hover fill included) and never take a click */}
      {branch && <Elbow color={kind.wire} dashed={Boolean(tag)} />}
      {railIn && <Rail color={railIn} height={DOT_CY} />}
      {railOut && <Rail color={railOut} top={branch ? 0 : DOT_CY} bottom={0} />}
      {/* off the last stop: the spur, from the dot down to where the last elbow leaves */}
      {spur && !branch && <Rail color={spur.color} dashed={spur.dashed} top={DOT_CY} bottom={0} />}
      {spur && branch && !last && <Rail color={spur.color} dashed={spur.dashed} bottom={0} />}
      {spur && last && <Rail color={spur.color} dashed={spur.dashed} height={DOT_CY - ELBOW_RISE} />}
      <Ring
        size={size}
        fill={fill}
        stroke={stroke}
        dashed={Boolean(tag)}
        className="pointer-events-none absolute"
        style={{ left: cx - size / 2, top: DOT_CY - size / 2 }}
      />
      {focused && pulseKey && (
        <motion.span
          key={pulseKey}
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{ left: cx - size / 2, top: DOT_CY - size / 2, width: size, height: size, border: `1px solid ${accent}` }}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: PULSE_SCALE, opacity: 0 }}
          transition={{ duration: PULSE_S, ease: EASE_OUT }}
        />
      )}
    </li>
  );
}

function StageHeader({ group, step, id, className }) {
  const rail = group.firstIdx > 0 ? railColor(MAIN[group.firstIdx].id, step) : null;
  return (
    <div className={`relative flex items-center gap-3 pb-1.5 ${className}`} style={{ paddingLeft: MAIN_PL }}>
      <p id={id} className="mc-label shrink-0">
        {group.stage.label}
      </p>
      <span aria-hidden className="h-px flex-1 bg-line" />
      {rail && <Rail color={rail} bottom={0} />}
    </div>
  );
}

/** The status map: one rail, stage headings inline between the stops. */
function StatusMap({ ctx, idBase }) {
  return (
    <div role="group" aria-label={`ApplicationStatus: ${STATUSES.length} statuses`}>
      {GROUPS.map((g, i) => {
        const headId = `${idBase}-${g.stage.key}`;
        return (
          <div key={g.stage.key} role="group" aria-labelledby={headId}>
            <StageHeader group={g} step={ctx.step} id={headId} className={i === 0 ? 'pt-0' : 'pt-4'} />
            <ul>
              {g.rows.map((r) => (
                <StopRow key={r.status.id} row={r} ctx={ctx} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function KeyDot({ fill, stroke, children }) {
  return (
    <li className="inline-flex items-center gap-2">
      <Ring size={DOT} fill={fill} stroke={stroke} />
      {children}
    </li>
  );
}

function Sep() {
  return (
    <>
      <span className="sr-only">, </span>
      <span aria-hidden className="text-ink-faint">
        {' · '}
      </span>
    </>
  );
}

/** Under the map: what's on it, counted from the data, and the dot key. */
function MapLegend({ accent }) {
  return (
    <div className="mt-6 border-t border-line pt-4">
      <p className="font-mono text-micro leading-5 text-ink-subtle">
        <span className="whitespace-nowrap">{MAIN.length} on the line</span>
        {KIND_COUNTS.map(({ key, n }) => {
          const k = KIND[key];
          return (
            <Fragment key={key}>
              <Sep />
              <span className="whitespace-nowrap">
                {k.glyph && (
                  <span aria-hidden style={{ color: k.ink }}>
                    {k.glyph}{' '}
                  </span>
                )}
                {n} {n === 1 ? k.one : k.many}
              </span>
            </Fragment>
          );
        })}
        {OFF_SERVER > 0 && (
          <>
            <span className="sr-only">; </span>
            <span aria-hidden className="text-ink-faint">
              {' — '}
            </span>
            <span className="whitespace-nowrap">
              <Ring
                size={DOT + HOLLOW_GROW}
                fill={P.void}
                stroke={P.inkSubtle}
                dashed
                className="mr-1.5 inline-block align-[-2px]"
              />
              {OFF_SERVER} never written by the server
            </span>
          </>
        )}
      </p>
      <ul aria-label="Key" className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-label text-ink-subtle">
        <KeyDot fill={accent} stroke={accent}>
          current
        </KeyDot>
        <KeyDot fill={DONE_FILL} stroke={DONE_FILL}>
          reached
        </KeyDot>
        <KeyDot fill={P.void} stroke={P.inkFaint}>
          ahead
        </KeyDot>
      </ul>
    </div>
  );
}

const ICON_PATHS = {
  play: <path d="M3.5 2.2v7.6L9.6 6z" fill="currentColor" />,
  pause: <path d="M3.2 2.4h2v7.2h-2zM6.8 2.4h2v7.2h-2z" fill="currentColor" />,
  replay: (
    <>
      <path d="M9.6 6.4A3.6 3.6 0 1 1 6 2.4h1.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.9 0.6l2 1.8-2 1.8z" fill="currentColor" />
    </>
  ),
  reset: <path d="M2.4 2.4h1.6v7.2H2.4zM9.6 2.2v7.6L4.4 6z" fill="currentColor" />,
};

function ControlButton({ icon, label, children, onClick }) {
  // icon-only when there are no children: `label` names it (and titles it)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={children ? undefined : label}
      title={children ? undefined : label}
      className={`mc-ghost-btn inline-flex shrink-0 items-center rounded-md border border-line uppercase hover:border-line-hi ${
        children ? 'min-h-8 gap-2 px-2.5' : 'h-9 w-9 justify-center'
      }`}
    >
      <svg aria-hidden width="11" height="11" viewBox="0 0 12 12">
        {ICON_PATHS[icon]}
      </svg>
      {children}
    </button>
  );
}

/**
 * The replay control, media-player shaped: the step's label and counter, then
 * Play / Pause beside a stepped range input, then the hint and Reset.
 */
function Scrubber({ step, isPlaying, invite, showHint, accent, onScrub, onPlay, onPause, onReset }) {
  const hintId = useId();
  const label = labelOf(AUDIT[step].to);
  const f = frac(step);
  const atEnd = step >= LAST_STEP;
  const knobLeft = along(f, -KNOB / 2);
  let play = { icon: 'play', label: 'Play', onClick: onPlay };
  if (isPlaying) play = { icon: 'pause', label: 'Pause', onClick: onPause };
  else if (atEnd) play = { icon: 'replay', label: 'Replay', onClick: onPlay };
  let hint = '';
  if (showHint) hint = atEnd ? HINT_END : HINT_START;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 truncate text-body font-medium text-ink">{label}</p>
        <p className="shrink-0 font-mono text-label tabular-nums text-ink-subtle">
          <span style={{ color: accent }}>{pad2(step + 1)}</span> / {pad2(AUDIT.length)}
        </p>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <ControlButton icon={play.icon} label={play.label} onClick={play.onClick} />
        <div className="relative h-9 min-w-0 flex-1">
          {/* the real control — invisible, on top; everything after it is drawn */}
          <input
            type="range"
            min={0}
            max={LAST_STEP}
            step={1}
            value={step}
            onChange={(e) => onScrub(Number(e.target.value))}
            aria-label="Step through the happy path"
            aria-valuetext={`Step ${step + 1} of ${AUDIT.length}: ${label}`}
            aria-describedby={hint ? hintId : undefined}
            className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 h-px"
            style={{ left: HIT / 2, right: HIT / 2, background: RAIL_IDLE }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 h-px transition-[width] duration-200 ease-out"
            style={{ left: HIT / 2, width: `calc(${f} * (100% - ${HIT}px))`, background: RAIL_DONE }}
          />
          {AUDIT.map((e, i) => {
            const h = STAGE_START[i] ? TICK_STAGE_H : TICK_H;
            let tone = RAIL_IDLE;
            if (i < step) tone = DONE_FILL;
            else if (i === step) tone = accent;
            return (
              <span
                key={`${e.to}-${i}`}
                aria-hidden
                className="pointer-events-none absolute top-1/2 w-px transition-colors duration-200"
                style={{ left: along(frac(i), -0.5), height: h, marginTop: 0.5 - h / 2, background: tone }}
              />
            );
          })}
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 rounded-full transition-[left,scale] duration-200 ease-out peer-hover:scale-110 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
            style={{
              left: knobLeft,
              width: KNOB,
              height: KNOB,
              marginTop: KNOB_MT,
              background: accent,
              boxShadow: `0 0 0 3px ${P.surface}`,
            }}
          />
          {invite && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute top-1/2 rounded-full"
              style={{ left: knobLeft, width: KNOB, height: KNOB, marginTop: KNOB_MT, border: `1px solid ${accent}` }}
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: PULSE_SCALE, opacity: 0 }}
              transition={{ duration: INVITE_S, ease: EASE_OUT, repeat: 1, repeatDelay: INVITE_GAP_S }}
            />
          )}
        </div>
      </div>

      {/* the row keeps its height once the hint goes — Reset holds it */}
      <div className="mt-2.5 flex items-center justify-between gap-4">
        <p id={hintId} className="min-w-0 text-label text-ink-subtle">
          {hint}
        </p>
        <ControlButton icon="reset" onClick={onReset}>
          Reset
        </ControlButton>
      </div>
    </div>
  );
}

function Fact({ label, value, sub }) {
  return (
    <div className="min-w-0">
      <dt className="mc-label">{label}</dt>
      <dd className="mt-1 text-sm leading-snug text-ink">
        {value}
        {sub && <span className="mt-0.5 block text-label text-ink-subtle">{sub}</span>}
      </dd>
    </div>
  );
}

/** One status, in words. `entry` is its happy-path log row, if it has one. */
function DetailBody({ status, entry, accent }) {
  const actor = actorOf(status);
  const stage = STAGE_BY_KEY[status.stage];
  const kind = status.main ? null : kindOf(status);
  const tag = serverTag(status);
  const roles =
    actor.tiers.length > 1 ? actor.tiers.map((t) => ROLES[t]?.role).filter(Boolean).join(' or ') : null;

  const i = MAIN_INDEX[status.id];
  const second = status.main
    ? { label: 'Next status', value: MAIN[i + 1]?.label ?? 'None — end of the line' }
    : {
        label: 'Branches off',
        value: labelOf(status.from),
        sub: status.to ? `returns to ${labelOf(status.to)}` : null,
      };

  return (
    <>
      <h3 className="font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
        <span className="sr-only">{stage ? `${stage.label}: ` : ''}</span>
        {status.label}
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <code className="mc-chip mc-chip--accent break-all" style={{ '--chip': kind ? kind.ink : accent }}>
          {status.id}
        </code>
        {/* a branch says what kind (the reserved ones let their server tag say it) */}
        {kind && kind.glyph && (
          <span className="font-mono text-micro" style={{ color: kind.ink }}>
            <span aria-hidden>{kind.glyph} </span>
            {kind.one}
          </span>
        )}
        {tag && <ServerTag tag={tag} className="px-2 py-[5px] font-mono text-micro leading-none" />}
      </div>
      <dl className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-3">
        <Fact label="Next action by" value={actor.label} sub={roles} />
        <Fact {...second} />
      </dl>
      <p className="mt-3.5 text-body text-ink-muted">{status.note}</p>
      {entry && (entry.action || entry.extra) && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {entry.action && (
            <code className="mc-chip">
              <span className="sr-only">Engine action: </span>
              {entry.action}
            </code>
          )}
          {entry.extra && (
            <span className="min-w-0 font-mono text-label text-ink-subtle">
              <span aria-hidden className="text-ink-faint">
                #{' '}
              </span>
              {entry.extra}
            </span>
          )}
        </p>
      )}
    </>
  );
}

/**
 * The focused status, in words. Every status is laid into the same grid cell
 * and only the focused one is visible, so the card always holds the height of
 * its longest status — scrubbing never moves the panel (or the sticky column).
 */
function DetailCard({ focusId, accent, reduce }) {
  return (
    <div className="grid">
      {STATUSES.map((s) => {
        const on = s.id === focusId;
        const entry = s.id in AUDIT_INDEX ? AUDIT[AUDIT_INDEX[s.id]] : null;
        const body = <DetailBody status={s} entry={entry} accent={accent} />;
        return (
          <div key={s.id} className={`col-start-1 row-start-1 min-w-0 ${on ? '' : 'invisible'}`}>
            {on ? (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: ENTER_S, ease: EASE_OUT }}
              >
                {body}
              </motion.div>
            ) : (
              body
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The ApplicationStatusHistory rows written so far, newest at the bottom. */
function AuditLog({ step, accent, reduce }) {
  const rows = AUDIT.slice(0, step + 1);
  const count = rows.length;
  const cell = 'whitespace-nowrap py-1 pr-6 align-top first:pl-4 last:pr-4';
  const none = (
    <>
      <span className="sr-only">none</span>
      <span aria-hidden className="text-ink-faint">
        —
      </span>
    </>
  );

  return (
    <figure className="min-w-0">
      <div className="overflow-hidden rounded-panel border border-line bg-void">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-2.5 font-mono text-micro">
          <span className="min-w-0 text-ink-muted">
            {HISTORY_TABLE}
            {APP_REF && <span className="text-ink-subtle"> · {APP_REF}</span>}
          </span>
          <span className="tabular-nums text-ink-subtle">
            ({count} {count === 1 ? 'row' : 'rows'})
          </span>
        </div>
        {/* scrolls sideways under lg; focusable so a keyboard can scroll it too */}
        <div
          role="region"
          aria-label={`${HISTORY_TABLE}, ${count} ${count === 1 ? 'row' : 'rows'}`}
          tabIndex={0}
          className="overflow-x-auto"
        >
          <table className="w-full min-w-max border-collapse text-left font-mono text-label lg:min-w-0">
            <thead>
              <tr className="border-b border-line text-ink-subtle">
                {LOG_COLUMNS.map((c) => (
                  <th key={c} scope="col" className={`${cell} py-2 font-normal`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&>tr:first-child>td]:pt-2.5 [&>tr:last-child>td]:pb-2.5">
              {rows.map((entry, i) => {
                const current = i === step;
                const from = LOG_FROM[i];
                const status = STATUS_BY_ID[entry.to];
                const tag = status ? serverTag(status) : null;
                return (
                  <motion.tr
                    key={`${entry.to}-${i}`}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: ENTER_S, ease: EASE_OUT }}
                    className={`transition-colors duration-300 ${current ? 'text-ink-muted' : 'text-ink-subtle'}`}
                    style={{ background: current ? alpha(accent, 0.08) : undefined }}
                  >
                    <td
                      className={`${cell} tabular-nums`}
                      style={current ? { boxShadow: `inset 2px 0 0 ${accent}` } : undefined}
                    >
                      {current && <span className="sr-only">Current: </span>}
                      {entry.at}
                    </td>
                    <td className={cell}>{from ?? none}</td>
                    <td className={cell}>
                      <span aria-hidden className="text-ink-faint">
                        →{' '}
                      </span>
                      <span style={{ color: current ? accent : P.inkMuted }}>{entry.to}</span>
                      {tag && (
                        <>
                          {' '}
                          <ServerTag tag={tag} />
                        </>
                      )}
                    </td>
                    <td className={cell}>{entry.by}</td>
                    <td className={cell}>{entry.action ?? none}</td>
                    <td className={`${cell} lg:whitespace-normal`}>{entry.extra}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <figcaption className="mt-2.5 text-label text-ink-subtle">
        Illustrative entries — the real log is the {HISTORY_TABLE} table, plus an AuditLog row per action.
      </figcaption>
    </figure>
  );
}

/* ── the section ────────────────────────────────────────────────────────── */

export default function Lifecycle({ accent = P.accent }) {
  const idBase = useId();
  const reduce = useReducedMotion();
  const columnRef = useRef(null);
  const panelRef = useRef(null);
  const inView = useInView(panelRef, IN_VIEW);
  const pinnedTop = usePinnedTop(columnRef);

  const [rawStep, setRawStep] = useState(null); // null → the default for the motion setting
  const [playing, setPlaying] = useState(false);
  const [pickedId, setPickedId] = useState(null); // the stop last picked on the map
  const [source, setSource] = useState(null); // what moved it last: play · scrub · pick · reset

  // reduced motion starts on the finished path; otherwise on the draft
  const step = rawStep ?? (reduce ? LAST_STEP : 0);
  const isPlaying = playing && step < LAST_STEP;

  useEffect(() => {
    if (!isPlaying) return undefined;
    const t = setTimeout(() => {
      const next = step + 1;
      setRawStep(next);
      if (next >= LAST_STEP) setPlaying(false);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [isPlaying, step]);

  const scrub = (i) => {
    setRawStep(i);
    setPlaying(false);
    setPickedId(null);
    setSource('scrub');
  };
  const play = () => {
    setPickedId(null);
    setSource('play');
    if (step >= LAST_STEP) {
      // from the start: the draft holds for one beat, then it runs
      setRawStep(0);
      setPlaying(true);
      return;
    }
    const next = step + 1; // from here: the first step lands at once
    setRawStep(next);
    setPlaying(next < LAST_STEP);
  };
  const reset = () => {
    setRawStep(0);
    setPlaying(false);
    setPickedId(null);
    setSource('reset');
  };
  const select = (id) => {
    setPlaying(false);
    setPickedId(id);
    setSource('pick');
    if (id in AUDIT_INDEX) setRawStep(AUDIT_INDEX[id]);
  };

  const stepId = AUDIT[step].to;
  const picked = pickedId ? STATUS_BY_ID[pickedId] : null;
  const branch = picked && !(picked.id in AUDIT_INDEX) ? picked : null;
  const focus = branch ?? STATUS_BY_ID[stepId] ?? MAIN[0];
  const actor = actorOf(focus);
  const tiers = actor.tiers ?? NO_TIERS;
  const pulseKey = reduce || !inView ? null : `${focus.id}-${step}`;
  const stackCaption = tiers.length ? 'The lit tier acts next.' : `Next: ${actor.label}.`;

  // spoken: a picked stop's note; each step while playing; never while
  // dragging (the slider announces its own value)
  let live = '';
  if (source === 'pick' && picked) live = `${picked.label}. ${picked.note}`;
  else if (source === 'play' || source === 'reset') live = `Step ${step + 1} of ${AUDIT.length}: ${labelOf(stepId)}`;

  const ctx = { step, stepId, focusId: focus.id, pickedId, pulseKey, accent, onSelect: select };

  return (
    <div className="mc-root min-w-0">
      <div className="grid gap-y-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-x-12 xl:gap-x-16">
        {/* the controls and the reading — first in the reading order, right column at lg */}
        <div
          ref={columnRef}
          className="flex min-w-0 flex-col gap-8 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:gap-4 lg:self-start"
          style={pinnedTop == null ? undefined : { top: pinnedTop }}
        >
          <div ref={panelRef} className="mc-panel min-w-0">
            <Scrubber
              step={step}
              isPlaying={isPlaying}
              invite={inView && !reduce && source == null}
              showHint={source == null}
              accent={accent}
              onScrub={scrub}
              onPlay={play}
              onPause={() => setPlaying(false)}
              onReset={reset}
            />
            <div className="mt-4 border-t border-line pt-4">
              <DetailCard focusId={focus.id} accent={accent} reduce={reduce} />
            </div>
          </div>

          {/* who acts next — above the panel at lg. Widths keep its labels at 11px or
              more: the column layout from 312px, the split layout from ~490px. */}
          <figure className="hidden sm:block lg:order-first">
            <ApprovalStack active={tiers} className="lg:max-w-[320px] xl:max-w-[500px]" />
            {/* at lg the panel right under it says who acts next */}
            <figcaption className="mt-2 text-center text-label text-ink-subtle lg:sr-only">{stackCaption}</figcaption>
          </figure>
        </div>

        {/* the line */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <p className="mb-5 font-mono text-label text-ink-muted">
            <span className="text-lilac">enum</span> ApplicationStatus
            <span className="text-ink-subtle"> · {STATUSES.length} values</span>
          </p>
          <StatusMap ctx={ctx} idBase={idBase} />
          <MapLegend accent={accent} />
        </div>
      </div>

      <div className="mt-12 lg:mt-16">
        <AuditLog step={step} accent={accent} reduce={reduce} />
      </div>

      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </div>
  );
}
