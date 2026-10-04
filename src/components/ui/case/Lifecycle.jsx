'use client';

/**
 * Lifecycle — "17 statuses, one path — and every step leaves a record."
 *
 * The ApplicationStatus enum as a vertical metro line: the main statuses are
 * stops on a 1px rail, grouped by stage; the branch statuses hang off the stop
 * they leave from on a short elbow (a loop back, the rejections, a delay
 * flag). Beside it the approval stack lights whoever must act next; below,
 * the ApplicationStatusHistory log gains one row per transition.
 *
 * Plays the happy path once when the block scrolls into view, one transition
 * per beat: the stop turns current (amber, one ring pulse), earlier stops turn
 * reached (jade), the stack lights the next actor, the log appends a row.
 * Selecting any stop (click, tap or keyboard focus) pauses and shows its
 * details; Play resumes, Replay starts over. Reduced motion: no autoplay —
 * the finished path and the full log are simply there.
 *
 * Layout: ≥1024px the stack and the detail card sit left, the map right (two
 * stage columns), the log full width below. Under 1024px it all stacks; the
 * map drops to one column under 768px, and the stack hides under 640px (its
 * labels would fall below 11px) — the detail card says who acts next instead.
 *
 * Renders only from src/data/studies/iet.js (STATUSES, STAGES, ACTORS, ROLES,
 * AUDIT); every count is derived.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { ACTORS, AUDIT, ROLES, STAGES, STATUSES } from '@/data/studies/iet';
import ApprovalStack from '@/components/ui/case/ApprovalStack';

/* ── timing ─────────────────────────────────────────────────────────────── */
const STEP_MS = 900; // one transition per beat
const LEAD_IN_MS = 350; // in view (or Replay) → the first row
const PULSE_S = 0.9; // the current stop's one-shot ring
const ENTER_S = 0.35; // a log row / the detail card fading in
// "35% in", as a viewport line: plays once the block's top passes 65% of the
// viewport height. An `amount` threshold could never fire on a tall mobile block.
const IN_VIEW = { once: true, margin: '0px 0px -35% 0px' };

/* ── copy that isn't study data ─────────────────────────────────────────── */
const HISTORY_TABLE = 'ApplicationStatusHistory';
const APPLICATION_REF = 'A-2041'; // the illustrative application the log follows
const HINT = 'Select any status to pause and inspect it.';

/* ── map geometry (px) — rails, dots and elbows are absolutely placed ───── */
const RAIL_X = 8; // the 1px rail's left edge
const RAIL_CX = RAIL_X + 0.5;
const ROW_PT = 8;
const ROW_PB = 7;
const LABEL_LH = 19;
const DOT_CY = ROW_PT + LABEL_LH / 2; // centre of the label line
const DOT = 9; // a main stop
const BRANCH_DOT = 7;
const BRANCH_CX = 28.5;
const MAIN_PL = 28; // label inset, main stops
const BRANCH_PL = 42; // label inset, branch stops — indented beside their stop
const ELBOW_RISE = 13; // the elbow leaves the rail this far above the dot
const PULSE_SCALE = 2.8;

const RAIL_IDLE = P.lineHi;
const RAIL_DONE = alpha(P.jade, 0.55);
const DONE_FILL = alpha(P.jade, 0.85);

// stages per map column: the road to the money | building it, and after
const MAP_COLUMNS = [
  ['apply', 'review', 'approve', 'fund'],
  ['build', 'after'],
];

/* ── derived once from the study data ───────────────────────────────────── */
const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s]));
const STAGE_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s]));
const MAIN = STATUSES.filter((s) => s.main);
const MAIN_INDEX = Object.fromEntries(MAIN.map((s, i) => [s.id, i]));
const BRANCH_COUNT = STATUSES.length - MAIN.length;
const LAST_STEP = AUDIT.length - 1;
const NO_TIERS = [];

// status id → its row in the happy-path log (first occurrence)
const AUDIT_INDEX = {};
AUDIT.forEach((entry, i) => {
  if (!(entry.to in AUDIT_INDEX)) AUDIT_INDEX[entry.to] = i;
});

const labelOf = (id) => STATUS_BY_ID[id]?.label ?? id;
const pad2 = (n) => String(n).padStart(2, '0');
const isReached = (id, step) => (AUDIT_INDEX[id] ?? Infinity) <= step;
const railColor = (id, step) => (isReached(id, step) ? RAIL_DONE : RAIL_IDLE);
const actorOf = (status) => ACTORS[status.actor] ?? ACTORS.none;

/** Branch kinds: `hue` draws the dot and elbow, `ink` the annotation text. */
const KIND = {
  loop: { word: 'Loop', hue: P.inkMuted, ink: P.inkMuted, glyph: '↺', note: (s) => `back to ${labelOf(s.to)}` },
  reject: { word: 'Rejection', hue: P.alert, ink: alpha(P.alert, 0.85), glyph: '', note: () => 'can resubmit' },
  flag: { word: 'Flag', hue: P.sand, ink: P.sand, glyph: '⚑', note: () => 'missed deadline' },
};
const kindOf = (status) => KIND[status.kind] ?? KIND.loop;

/**
 * The map, laid out once: columns → stage groups → rows. A branch row follows
 * the stop it leaves from; `idx` is the main-line index its rail is measured
 * against (the stop itself, or the stop the branch hangs off).
 */
const COLUMNS = MAP_COLUMNS.map((keys) =>
  keys
    .filter((key) => STAGE_BY_KEY[key])
    .map((key) => {
      const mains = MAIN.filter((s) => s.stage === key);
      const branchesOf = (id) => STATUSES.filter((b) => !b.main && b.from === id);
      const orphans = STATUSES.filter((b) => !b.main && b.stage === key && !(b.from in MAIN_INDEX));
      const rows = [
        ...mains.flatMap((s) => [
          { status: s, idx: MAIN_INDEX[s.id] },
          ...branchesOf(s.id).map((b) => ({ status: b, idx: MAIN_INDEX[s.id] })),
        ]),
        ...orphans.map((b) => ({ status: b, idx: null })),
      ];
      return { stage: STAGE_BY_KEY[key], rows, firstIdx: mains.length ? MAIN_INDEX[mains[0].id] : null };
    }),
);

/* ── small pieces ───────────────────────────────────────────────────────── */

function Rail({ color, top = 0, bottom, height }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute w-px transition-colors duration-300"
      style={{ left: RAIL_X, top, bottom, height, background: color }}
    />
  );
}

/** The curve a branch takes off the rail, out to its dot. */
function Elbow({ color }) {
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
      <path d={d} fill="none" stroke={color} strokeWidth="1" />
    </svg>
  );
}

function Dot({ cx, size, fill, stroke }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute rounded-full transition-colors duration-300"
      style={{
        left: cx - size / 2,
        top: DOT_CY - size / 2,
        width: size,
        height: size,
        background: fill,
        border: `1px solid ${stroke}`,
      }}
    />
  );
}

/** One stop on the map — a main status or a branch. */
function StopRow({ row, ctx }) {
  const { status: s, idx } = row;
  const { step, focusId, pulseKey, accent, onSelect } = ctx;
  const branch = !s.main;
  const kind = branch ? kindOf(s) : null;
  const active = s.id === focusId;
  const reached = isReached(s.id, step);
  const actor = actorOf(s);

  // rail: into this stop and on to the next (main), or straight past (branch)
  const hasNext = idx != null && idx < MAIN.length - 1;
  const railOut = hasNext ? railColor(MAIN[idx + 1].id, step) : null;
  const railIn = !branch && idx > 0 ? railColor(s.id, step) : null;

  const cx = branch ? BRANCH_CX : RAIL_CX;
  const size = branch ? BRANCH_DOT : DOT;
  let fill = P.void;
  let stroke = branch ? kind.ink : P.inkFaint;
  if (active) fill = stroke = accent;
  else if (reached) fill = stroke = DONE_FILL;

  let labelTone = 'text-ink-subtle';
  if (active) labelTone = 'font-medium text-ink';
  else if (reached) labelTone = 'text-ink-muted';

  const chipStyle = active
    ? { color: accent, borderColor: alpha(accent, 0.35), background: alpha(accent, 0.1) }
    : { color: P.inkMuted, borderColor: P.line, background: P.surface };

  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => onSelect(s.id)}
        onFocus={() => onSelect(s.id)}
        // single-select, not a toggle: the selected (or playing) stop is the current one
        aria-current={active ? 'step' : undefined}
        className="group flex w-full items-start gap-3 rounded-md pr-2 text-left transition-colors duration-200 hover:bg-surface-2"
        style={{
          paddingTop: ROW_PT,
          paddingBottom: ROW_PB,
          paddingLeft: branch ? BRANCH_PL : MAIN_PL,
          background: active ? alpha(accent, 0.07) : undefined,
        }}
      >
        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm transition-colors duration-300 ${labelTone}`}
            style={{ lineHeight: `${LABEL_LH}px` }}
          >
            {s.label}
          </span>
          <span className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-micro leading-4">
            <span className={`min-w-0 break-all ${active ? 'text-ink-muted' : 'text-ink-subtle'}`}>{s.id}</span>
            {kind && (
              <span style={{ color: kind.ink }}>
                {kind.glyph && <span aria-hidden>{kind.glyph} </span>}
                {kind.note(s)}
              </span>
            )}
          </span>
        </span>
        <span
          className={`mt-px shrink-0 rounded-chip border px-1.5 py-[3px] font-mono text-micro leading-none transition-opacity duration-200 ${
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}
          style={chipStyle}
        >
          next: {actor.label}
        </span>
      </button>

      {/* decorations paint over the row (hover fill included) and never take a click */}
      {branch && <Elbow color={alpha(kind.hue, 0.5)} />}
      {railIn && <Rail color={railIn} height={DOT_CY} />}
      {railOut && <Rail color={railOut} top={branch ? 0 : DOT_CY} bottom={0} />}
      <Dot cx={cx} size={size} fill={fill} stroke={stroke} />
      {active && pulseKey && (
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

/** The status map: stage groups in two columns (one under 768px). */
function StatusMap({ ctx, idBase }) {
  return (
    <div
      role="group"
      aria-label={`ApplicationStatus: ${STATUSES.length} statuses`}
      className="grid gap-x-8 md:grid-cols-2"
    >
      {COLUMNS.map((groups, c) => (
        <div key={groups[0]?.stage.key ?? c} className="min-w-0">
          {groups.map((g, i) => {
            const headId = `${idBase}-${g.stage.key}`;
            // stage groups breathe apart; both columns' first headers top-align
            let pad = 'pt-3.5';
            if (i === 0) pad = c === 0 ? 'pt-0' : 'pt-3.5 md:pt-0';
            return (
              <div key={g.stage.key} role="group" aria-labelledby={headId}>
                <StageHeader group={g} step={ctx.step} id={headId} className={pad} />
                <ul>
                  {g.rows.map((r) => (
                    <StopRow key={r.status.id} row={r} ctx={ctx} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function KeyDot({ fill, stroke, children }) {
  return (
    <li className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block rounded-full"
        style={{ width: DOT, height: DOT, background: fill, border: `1px solid ${stroke}` }}
      />
      {children}
    </li>
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
};

function ControlButton({ icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mc-ghost-btn inline-flex min-h-9 items-center gap-2 rounded-md border border-line px-3 uppercase hover:border-line-hi"
    >
      <svg aria-hidden width="11" height="11" viewBox="0 0 12 12">
        {ICON_PATHS[icon]}
      </svg>
      {children}
    </button>
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

/** The selected / current status, in words. */
function DetailCard({ status, accent, reduce, className = '' }) {
  const actor = actorOf(status);
  const stage = STAGE_BY_KEY[status.stage];
  const kind = status.main ? null : kindOf(status);
  const roles = actor.tiers.length > 1 ? actor.tiers.map((t) => ROLES[t]?.role).filter(Boolean).join(' or ') : null;
  const tone = kind ? kind.hue : accent;

  const i = MAIN_INDEX[status.id];
  const position = status.main ? `Stop ${pad2(i + 1)} of ${pad2(MAIN.length)}` : `Branch · ${kind.word}`;
  const second = status.main
    ? { label: 'Next status', value: MAIN[i + 1]?.label ?? 'None — end of the line' }
    : {
        label: 'Branches off',
        value: labelOf(status.from),
        sub: status.to ? `returns to ${labelOf(status.to)}` : null,
      };

  return (
    <div className={`mc-panel ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="mc-label">{stage?.label}</p>
        <p className="mc-label tabular-nums">{position}</p>
      </div>
      <motion.div
        key={status.id}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: ENTER_S, ease: EASE_OUT }}
      >
        <h3 className="mt-3 font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
          {status.label}
        </h3>
        <code className="mc-chip mc-chip--accent mt-2 break-all" style={{ '--chip': tone }}>
          {status.id}
        </code>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
          <Fact label="Next action by" value={actor.label} sub={roles} />
          <Fact {...second} />
        </dl>
        <p className="mt-4 max-w-[70ch] text-body text-ink-muted">{status.note}</p>
      </motion.div>
    </div>
  );
}

/** The ApplicationStatusHistory rows written so far, newest at the bottom. */
function AuditLog({ step, activeLine, accent, reduce }) {
  const scrollRef = useRef(null);
  const count = Math.max(step + 1, 0);

  // keep the newest row in sight
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [count, reduce]);

  // at · (to · by · note) — the last three wrap under 768px, align above it
  const line = 'grid grid-cols-[6ch_minmax(0,1fr)] gap-x-3';
  const headLine = 'hidden md:grid md:grid-cols-[6ch_minmax(0,1fr)] md:gap-x-3';
  const rest = 'flex min-w-0 flex-wrap gap-x-3 md:grid md:grid-cols-[21ch_18ch_minmax(0,1fr)] md:gap-x-4';

  return (
    <figure className="min-w-0">
      <div className="overflow-hidden rounded-panel border border-line bg-void font-mono text-[12px]">
        <div className="border-b border-line px-4 py-2.5 text-micro text-ink-muted">
          {HISTORY_TABLE}
          <span className="text-ink-subtle"> · application #{APPLICATION_REF}</span>
        </div>
        <div aria-hidden className={`border-b border-line px-4 py-1.5 text-ink-subtle ${headLine}`}>
          <span>at</span>
          <span className={rest}>
            <span>to</span>
            <span>by</span>
            <span>note</span>
          </span>
        </div>
        <div ref={scrollRef} className="max-h-[17rem] overflow-y-auto px-4 py-3 leading-[1.8] md:max-h-[21rem]">
          <ol>
            {AUDIT.slice(0, count).map((entry, i) => {
              const active = i === activeLine;
              return (
                <motion.li
                  key={`${entry.to}-${i}`}
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: ENTER_S, ease: EASE_OUT }}
                  className={`-mx-2 rounded px-2 transition-colors duration-300 ${line}`}
                  style={{ background: active ? alpha(accent, 0.08) : undefined }}
                >
                  <span className="tabular-nums text-ink-subtle">{entry.at}</span>
                  <span className={rest}>
                    <span className="break-all" style={{ color: active ? accent : P.inkMuted }}>
                      {entry.to}
                    </span>
                    <span className="text-ink-subtle">
                      <span aria-hidden className="text-ink-faint">
                        ←{' '}
                      </span>
                      <span className="sr-only">by </span>
                      {entry.by}
                    </span>
                    {entry.extra && (
                      <span className="text-ink-subtle">
                        <span aria-hidden className="text-ink-faint">
                          #{' '}
                        </span>
                        {entry.extra}
                      </span>
                    )}
                  </span>
                </motion.li>
              );
            })}
          </ol>
          <p className="text-ink-subtle">
            ({count} {count === 1 ? 'row' : 'rows'})
          </p>
        </div>
      </div>
      <figcaption className="mt-2.5 text-label text-ink-subtle">
        Illustrative entries — the real log is the {HISTORY_TABLE} table.
      </figcaption>
    </figure>
  );
}

/* ── the section ────────────────────────────────────────────────────────── */

export default function Lifecycle({ accent = P.accent }) {
  const idBase = useId();
  const reduce = useReducedMotion();
  const stageRef = useRef(null);
  const inView = useInView(stageRef, IN_VIEW);

  const [rawStep, setRawStep] = useState(null); // null → the default for the motion setting
  const [playing, setPlaying] = useState(true); // armed: plays once in view
  const [userDriven, setUserDriven] = useState(false); // Play / Replay pressed
  const [selectedId, setSelectedId] = useState(null);

  // -1 = nothing logged yet; reduced motion starts on the finished path
  const step = rawStep ?? (reduce ? LAST_STEP : -1);
  const isPlaying = playing && step < LAST_STEP && (userDriven || (inView && !reduce));

  useEffect(() => {
    if (!isPlaying) return undefined;
    const t = setTimeout(() => setRawStep(step + 1), step < 0 ? LEAD_IN_MS : STEP_MS);
    return () => clearTimeout(t);
  }, [isPlaying, step]);

  const select = (id) => {
    setSelectedId(id);
    setPlaying(false);
  };
  const play = () => {
    setSelectedId(null);
    setUserDriven(true);
    setPlaying(true);
    if (step >= LAST_STEP) setRawStep(-1);
  };
  const replay = () => {
    setSelectedId(null);
    setUserDriven(true);
    setPlaying(true);
    setRawStep(-1);
  };

  const focusId = selectedId ?? AUDIT[Math.max(step, 0)].to;
  const focus = STATUS_BY_ID[focusId] ?? MAIN[0];
  const tiers = actorOf(focus).tiers ?? NO_TIERS;
  const activeLine = selectedId != null ? (AUDIT_INDEX[selectedId] ?? -1) : step;
  const pulseKey = reduce ? null : `${focusId}-${step}`;

  const ctx = { step, focusId, pulseKey, accent, onSelect: select };

  return (
    <div className="mc-root min-w-0">
      <div
        ref={stageRef}
        className="grid gap-y-10 lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-8"
      >
        {/* who acts next */}
        <div className="hidden sm:block lg:col-start-1 lg:row-start-1">
          <ApprovalStack active={tiers} />
          <p className="mt-3 text-center text-label text-ink-subtle">The lit tier acts next.</p>
        </div>

        {/* the line */}
        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <p className="mc-label">
              {MAIN.length} on the main line · {BRANCH_COUNT} branches
            </p>
            <div className="flex items-center gap-2">
              <span className="mr-1 font-mono text-micro tabular-nums text-ink-subtle">
                {pad2(Math.max(step + 1, 0))} / {pad2(AUDIT.length)}
              </span>
              {isPlaying ? (
                <ControlButton icon="pause" onClick={() => setPlaying(false)}>
                  Pause
                </ControlButton>
              ) : (
                <ControlButton icon="play" onClick={play}>
                  Play
                </ControlButton>
              )}
              <ControlButton icon="replay" onClick={replay}>
                Replay
              </ControlButton>
            </div>
          </div>

          <StatusMap ctx={ctx} idBase={idBase} />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-label text-ink-subtle">
            <ul aria-label="Key" className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
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
            <p>{HINT}</p>
          </div>
        </div>

        {/* the status, in words */}
        <DetailCard
          status={focus}
          accent={accent}
          reduce={reduce}
          className="min-h-[16rem] lg:col-start-1 lg:row-start-2 lg:min-h-[17rem] lg:self-start"
        />
      </div>

      <div className="mt-10 lg:mt-12">
        <AuditLog step={step} activeLine={activeLine} accent={accent} reduce={reduce} />
      </div>

      {/* a picked status's note, spoken after its button's name; silent while it plays */}
      <p className="sr-only" aria-live="polite">
        {selectedId ? focus.note : ''}
      </p>
    </div>
  );
}
