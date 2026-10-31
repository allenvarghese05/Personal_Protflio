'use client';

/**
 * DayLoop — "The server runs the morning: a silent tick every 5 minutes, 60
 * on a weekday, until you're up or the window closes."
 *
 * The scheduler's own simulation tests (tests/test_scheduler.py), drawn. A
 * weekday from 05:50 to 11:05, one minute at a time, the way the tests drive
 * Scheduler.run_due with a fake clock and a fake push client:
 *
 *   states    idle → monitoring → confirmed or fallback → delivered, as a row
 *             of pills (LOOP.states). The day's current state is the accent;
 *             states it has passed carry a jade tick; the branch not taken
 *             dims. "delivered" is dashed: the state exists, nothing sets it
 *             yet (T5.2). Each pill says who moves the day there — the
 *             scheduler at the window's edges, a scored snapshot in between.
 *   timeline  the 06:00–11:00 window with its 60 tick instants. A tick that
 *             has gone out is filled, the latest one in the accent; the
 *             confirm (jade), the fallback (sand) and a restart break sit on
 *             the line where they happen. A scrubber moves the clock.
 *   plan()    under it, in mono, what the pure planner returned at that
 *             minute — StartMonitoring, SendTick(n), Fallback, or a Noop and
 *             its reason — and the count of pushes sent.
 *
 * Planner rules (scheduler.plan, first match wins): a terminal day → Noop;
 * window over while monitoring → Fallback; before the window → Noop; idle in
 * the window → StartMonitoring; monitoring → the earliest due tick not yet
 * in push_notifications. One action per pass, so tick 0 goes out on the pass
 * after StartMonitoring. Scenarios (LOOP.scenarios) are three of the tests:
 * never confirmed, confirmed at 07:12, and a restart after tick 5.
 *
 * Motion: once in view the clock runs from 05:50 to 11:05; touching the
 * scrubber stops it. The readout speaks only when the clock is still.
 * Reduced motion: the end of the morning, nothing plays.
 */
import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { LOOP } from '@/data/studies/chronos-ai';
import { Choices, Glyph, IN_VIEW, PanelFrame, Readout, useRun } from '@/components/ui/case/kit';

/* ── time, in minutes since midnight ───────────────────────────────────── */
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

const [SPAN_FROM, SPAN_TO] = LOOP.span.map(toMin);
const [WIN_FROM, WIN_TO] = LOOP.window.map(toMin);
const INTERVAL = 5;
const TICKS = Array.from({ length: (WIN_TO - WIN_FROM) / INTERVAL }, (_, k) => ({ k, at: WIN_FROM + k * INTERVAL }));
// one action per pass: the 06:00 pass starts monitoring, so tick 0 leaves at 06:01
const sentAt = (k) => (k === 0 ? WIN_FROM + 1 : WIN_FROM + k * INTERVAL);
const RESTART_AT = (k) => WIN_FROM + k * INTERVAL + 2; // the new scheduler's first pass

const pct = (t) => `${((t - SPAN_FROM) / (SPAN_TO - SPAN_FROM)) * 100}%`;
const HOURS = [6, 7, 8, 9, 10, 11].map((h) => h * 60);
const STATE_INDEX = Object.fromEntries(LOOP.states.map((s, i) => [s.key, i]));
const BY_SCENARIO = Object.fromEntries(LOOP.scenarios.map((s) => [s.key, s]));
const MOVER = Object.fromEntries(LOOP.transitions.map((tr) => [tr.to, tr.by]));

const AUTO = 'confirm';
const STEP_MIN = 3;
const FRAME_MS = 45;
const LEAD_MS = 400;

/** The day at minute t of a scenario: its state, what plan() returned, ticks sent. */
function dayAt(t, sc) {
  const confirmT = sc.confirmAt ? toMin(sc.confirmAt) : null;
  const allowed = TICKS.filter(({ k }) => confirmT == null || sentAt(k) <= confirmT);
  const sent = allowed.filter(({ k }) => sentAt(k) <= t);
  const lastSent = sent.length ? sent[sent.length - 1].k : null;
  const base = { sent: sent.length, lastSent, path: ['idle'] };

  if (t < WIN_FROM) return { ...base, state: 'idle', action: 'Noop("before_window")' };
  if (t === WIN_FROM) return { ...base, state: 'monitoring', path: ['idle'], action: 'StartMonitoring()' };
  if (confirmT != null && t >= confirmT) {
    return { ...base, state: 'confirmed', path: ['idle', 'monitoring'], action: t === confirmT ? 'a snapshot scores confirm → confirmed' : 'Noop("already_terminal")' };
  }
  if (t >= WIN_TO) return { ...base, state: 'fallback', path: ['idle', 'monitoring'], action: t === WIN_TO ? 'Fallback()' : 'Noop("already_terminal")' };
  if (sc.restartAfter != null && t === RESTART_AT(sc.restartAfter)) {
    return { ...base, state: 'monitoring', action: `new Scheduler: ticks 0–${sc.restartAfter} read back from push_notifications` };
  }
  const now = allowed.find(({ k }) => sentAt(k) === t);
  return { ...base, state: 'monitoring', action: now ? `SendTick(tick_seq=${now.k})` : 'Noop("all_due_ticks_sent")' };
}

/* ── pieces ────────────────────────────────────────────────────────────── */

function StatePill({ s, day, accent }) {
  const current = day.state === s.key;
  const passed = day.path.includes(s.key) && !current;
  const otherBranch = (s.key === 'confirmed' && day.state === 'fallback') || (s.key === 'fallback' && day.state === 'confirmed');
  const mover = MOVER[s.key];
  let style = { borderColor: P.line, color: P.inkMuted };
  if (s.planned) style = { borderColor: P.lineHi, borderStyle: 'dashed', color: P.inkSubtle };
  if (passed) style = { borderColor: alpha(P.jade, 0.35), color: P.inkMuted };
  if (current) style = { borderColor: alpha(accent, 0.55), color: accent, background: alpha(accent, 0.08) };

  return (
    <li className={`min-w-0 rounded-[6px] border px-3 py-2 transition-opacity duration-300 ${otherBranch ? 'opacity-40' : ''}`} style={style}>
      <p className="flex items-center gap-2 font-mono text-label">
        {passed && <Glyph kind="tick" />}
        {s.label}
        {current && <span className="sr-only"> (current state)</span>}
      </p>
      <p className="mt-0.5 font-mono text-micro text-ink-subtle">{s.plain}</p>
      {mover && mover !== 'planned' && <p className="mt-1 font-mono text-micro text-ink-subtle">by the {mover === 'telemetry' ? 'score' : 'scheduler'}</p>}
    </li>
  );
}

function Timeline({ t, day, sc, accent }) {
  const confirmT = sc.confirmAt ? toMin(sc.confirmAt) : null;
  return (
    <div aria-hidden className="relative mt-8 px-1">
      <div className="relative h-14">
        {/* the window */}
        <div className="absolute inset-y-0 rounded-[4px] border border-line" style={{ left: pct(WIN_FROM), width: `calc(${pct(WIN_TO)} - ${pct(WIN_FROM)})`, background: alpha(P.inkMuted, 0.04) }} />
        {/* the tick instants */}
        {TICKS.map(({ k, at: instant }) => {
          const isSent = day.lastSent != null && k <= day.lastSent && (confirmT == null || sentAt(k) <= confirmT);
          const latest = k === day.lastSent;
          return (
            <span
              key={k}
              className="absolute bottom-2 w-px -translate-x-1/2"
              style={{ left: pct(instant), height: isSent ? 22 : 10, background: latest ? accent : isSent ? P.inkMuted : P.lineHi, width: latest ? 2 : 1 }}
            />
          );
        })}
        {/* events on the line */}
        {sc.restartAfter != null && (
          <span className="absolute -top-6 -translate-x-1/2 font-mono text-micro text-ink-subtle" style={{ left: pct(RESTART_AT(sc.restartAfter)) }}>
            restart
          </span>
        )}
        {confirmT != null && t >= confirmT && (
          <span className="absolute -top-1 -translate-x-1/2" style={{ left: pct(confirmT) }}>
            <Glyph kind="tick" />
          </span>
        )}
        {confirmT == null && t >= WIN_TO && (
          <span className="absolute -top-1 -translate-x-1/2" style={{ left: pct(WIN_TO) }}>
            <Glyph kind="flag" />
          </span>
        )}
        {/* now */}
        <span className="absolute -bottom-1 top-0 w-[2px] -translate-x-1/2 rounded-full" style={{ left: pct(t), background: accent, opacity: 0.85 }} />
      </div>
      <div className="relative mt-2 h-4 font-mono text-micro tabular-nums text-ink-subtle">
        {HOURS.map((h) => (
          <span key={h} className="absolute top-0 -translate-x-1/2" style={{ left: pct(h) }}>
            {fmt(h)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── the panel ─────────────────────────────────────────────────────────── */

export default function DayLoop({ accent = P.ice }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, AUTO);
  const sc = BY_SCENARIO[active?.key ?? AUTO];
  const runKey = active ? `${active.key}-${active.run}` : 'idle';

  // the clock: the reader's scrub for this run, else the play's progress
  const [clock, setClock] = useState({ key: null, t: SPAN_FROM, manual: false });
  const own = clock.key === runKey;
  const manual = own && clock.manual;
  let t = own ? clock.t : SPAN_FROM;
  if (reduce && !manual) t = SPAN_TO;
  const playing = Boolean(active) && !reduce && !manual && t < SPAN_TO;

  useEffect(() => {
    if (!playing) return undefined;
    const id = setTimeout(
      () => setClock({ key: runKey, t: Math.min(SPAN_TO, t + STEP_MIN), manual: false }),
      t === SPAN_FROM ? LEAD_MS : FRAME_MS,
    );
    return () => clearTimeout(id);
  }, [playing, t, runKey]);

  const day = dayAt(t, sc);
  const settled = Boolean(active) && !playing;
  const stateTone = { idle: P.inkSubtle, monitoring: accent, confirmed: P.jade, fallback: P.sand }[day.state];
  const atEnd = t >= SPAN_TO;

  return (
    <div ref={ref}>
      <PanelFrame
        caption="A simulated weekday · fake clock, fake push client"
        controls={
          <Choices
            label="Choose a simulation"
            options={LOOP.scenarios.map((s) => ({ key: s.key, label: s.label }))}
            value={active?.key ?? null}
            onChoose={choose}
            accent={accent}
          />
        }
        footer={
          settled ? (
            <Readout runKey={`${runKey}-${t}`} delay={0.05} reduce={reduce} tone={stateTone} status={`${fmt(t)} · ${day.state}`}>
              <span className="text-body text-ink-muted">{atEnd ? sc.readout : `${day.sent} ${day.sent === 1 ? 'tick' : 'ticks'} sent so far; plan() returned ${day.action}.`}</span>
            </Readout>
          ) : (
            <p className="text-body text-ink-subtle">{active ? 'Running the morning…' : 'Choose a simulation.'}</p>
          )
        }
      >
        <div className="@container">
          <ol aria-label="Day states" className="grid grid-cols-2 gap-2 @min-[40rem]:grid-cols-5">
            {LOOP.states.map((s) => (
              <StatePill key={s.key} s={s} day={day} accent={accent} />
            ))}
          </ol>

          <Timeline t={t} day={day} sc={sc} accent={accent} />

          <label className="mt-4 block">
            <span className="sr-only">Simulated time</span>
            <input
              type="range"
              min={SPAN_FROM}
              max={SPAN_TO}
              step={1}
              value={t}
              aria-valuetext={fmt(t)}
              onChange={(e) => setClock({ key: runKey, t: Number(e.target.value), manual: true })}
              className="block w-full cursor-pointer"
              style={{ accentColor: accent }}
            />
          </label>

          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 rounded-[6px] border border-line bg-surface-2 px-4 py-3">
            <p className="min-w-0 font-mono text-label text-ink-muted [overflow-wrap:anywhere]">
              <span className="text-ink-subtle">plan({fmt(t)}) → </span>
              <span className="text-ink">{day.action}</span>
            </p>
            <p className="font-mono text-micro tabular-nums text-ink-subtle">
              pushes sent <span className="text-ink">{day.sent}</span> / {TICKS.length}
            </p>
          </div>
          <p className="mt-3 font-mono text-micro text-ink-subtle">{sc.test} · tests/test_scheduler.py</p>
        </div>
      </PanelFrame>
    </div>
  );
}
