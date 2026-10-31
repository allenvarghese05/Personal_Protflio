'use client';

/**
 * WakeScore — "Six signals, one score out of 100 — two ticks at 70, or one at
 * 85, and you're up."
 *
 * The centrepiece: the golden mornings from the test suite, tick by tick.
 * Pick a morning (the featured MORNINGS in the study data), then step through
 * its ticks. For the tick in view:
 *
 *   bar      the score on a 0–100 track: one block per rule that scored,
 *            in rule order; a penalty eats back from the end in red hatching;
 *            the final score is an accent mark (the current thing), with the
 *            70 and 85 thresholds as ticks above the track.
 *   rules    every rule as a row — what it reads, the value this tick sent,
 *            points against the rule's cap — with skipped rules (no
 *            pedometer), unmet requirements and the unlock bonus said in
 *            words. A dashed tag marks the value the server derives by
 *            comparing this snapshot with the previous one.
 *   readout  the decision (outside window · low · high n of 2 · confirm and
 *            why) in its colour, and the fixture's own arithmetic in plain
 *            words.
 *
 * Every number is computed by the scorer port (./score.js) from RULES; the
 * page's sanity check compares all 31 fixture ticks with the engine's
 * expected results. The tick buttons carry the decision as a glyph (ring =
 * outside the window, flag = high, tick = confirmed, dash = low), so the
 * morning reads at a glance without colour.
 *
 * Motion: once a third of the panel is in view, the first morning plays one
 * tick at a time and stops on its last. Choosing a morning plays it again;
 * choosing a tick stops the play. Reduced motion: the last tick, nothing
 * plays. Layout: container queries — the rule rows put value and points
 * beside the name from 36rem of panel.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { MORNINGS, RULES } from '@/data/studies/chronos-ai';
import { Choices, Glyph, IN_VIEW, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';
import { scoreMorning } from './score';

/* ── data ──────────────────────────────────────────────────────────────── */
const FEATURED = MORNINGS.filter((m) => m.featured);
const BY_ID = Object.fromEntries(FEATURED.map((m) => [m.id, m]));
const SCORED = Object.fromEntries(FEATURED.map((m) => [m.id, scoreMorning(m, RULES)]));
const RULE_BY_ID = Object.fromEntries(RULES.rules.map((r) => [r.id, r]));
const PENALTY_BY_ID = Object.fromEntries(RULES.penalties.map((p) => [p.id, p]));
const { confirm: CONFIRM, strong: STRONG } = RULES.thresholds;
const AUTO = FEATURED[0].id;

const FIRST_MS = 500;
const STEP_MS = 1500;

/** The decision as a chip: text, tone, glyph. */
function verdict(ev) {
  switch (ev.decision) {
    case 'outside_window':
      return { status: 'Outside window · 0', tone: P.inkSubtle, glyph: 'idle' };
    case 'confirm':
      return { status: `Confirmed · ${ev.reason === 'both' ? 'strong + two in a row' : ev.reason === 'strong' ? `strong (≥ ${STRONG})` : 'two in a row'}`, tone: P.jade, glyph: 'tick' };
    case 'high':
      return { status: `High · ${ev.consecutiveHigh} of 2`, tone: P.sand, glyph: 'flag' };
    case 'ignored_dedupe':
      return { status: 'Ignored · duplicate', tone: P.sand, glyph: 'undo' };
    default:
      return { status: `Low · ${ev.score}`, tone: P.inkSubtle, glyph: 'low' };
  }
}

/** The value a rule read this tick, in words. */
function inputText(rule, b, tick) {
  const s = tick.s;
  switch (rule.id) {
    case 'steps_10m':
      return `${s.steps_10m} steps`;
    case 'walking_10m':
      return `${s.walking_sec_10m} s · ${s.walking_conf}`;
    case 'unlocked':
      return s.is_unlocked ? 'unlocked' : 'locked';
    case 'charger_disconnect':
      return b.input ? 'just unplugged' : s.battery_state === 'unplugged' ? 'unplugged before' : s.battery_state;
    case 'steps_window':
      return `${s.steps_since_window} steps`;
    case 'foreground':
      return s.wake_source === 'foreground' ? 'opened the app' : 'background tick';
    default:
      return String(b.input);
  }
}

function noteText(b) {
  if (b.note === 'skipped') return 'skipped — no pedometer permission';
  if (b.note === 'requires') return 'needs medium or high confidence';
  if (b.bonus) return 'includes +10: unlocked last tick too';
  if (b.note === 'reweighted') return 'reweighted — no pedometer';
  return null;
}

/* ── pieces ────────────────────────────────────────────────────────────── */

function LowMark() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" className="block shrink-0">
      <circle cx="10" cy="10" r="8.5" fill="none" stroke={P.lineHi} strokeWidth="1.25" />
      <path d="M6.5 10 H13.5" stroke={P.inkSubtle} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** The ticks of a morning, as buttons — the glyph says the decision. */
function TickRail({ morning, evals, index, onPick, accent }) {
  return (
    <div role="group" aria-label={`Ticks of ${morning.label}`} className="flex flex-wrap gap-2">
      {morning.ticks.map((t, i) => {
        const on = i === index;
        const v = verdict(evals[i]);
        return (
          <button
            key={`${t.ts}`}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(i)}
            className={`inline-flex items-center gap-2 rounded-chip border py-1.5 pl-1.5 pr-3 font-mono text-label tabular-nums transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              on ? '' : 'border-line text-ink-muted hover:border-line-hi hover:text-ink'
            }`}
            style={on ? { color: accent, borderColor: alpha(accent, 0.5), background: alpha(accent, 0.08) } : undefined}
          >
            {v.glyph === 'low' ? <LowMark /> : <Glyph kind={v.glyph} />}
            {t.local}
            <span className="sr-only"> — {v.status}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The score on a 0–100 track. */
function ScoreBar({ ev, runKey, reduce, accent }) {
  const scored = ev.breakdown.filter((b) => b.points > 0);
  // each block starts where the ones before it end
  const blocks = scored.map((b, i) => ({ ...b, x: scored.slice(0, i).reduce((n, p) => n + p.points, 0) }));
  const positive = blocks.reduce((n, b) => n + b.points, 0);
  const shown = Math.min(positive, 100);
  const penalty = ev.penalties.reduce((n, p) => n + p.points, 0);
  const eaten = Math.min(shown, -penalty); // how much of the bar the penalty takes back
  return (
    <div className="pt-6">
      <div className="relative">
        {/* thresholds above the track */}
        {[CONFIRM, STRONG].map((v) => (
          <span key={v} aria-hidden className="absolute -top-6 flex -translate-x-1/2 flex-col items-center" style={{ left: `${v}%` }}>
            <span className="font-mono text-micro leading-4 tabular-nums text-ink-subtle">{v}</span>
            <span className="h-2 w-px bg-line-hi" />
          </span>
        ))}

        <div key={runKey} className="relative h-11 overflow-hidden rounded-[4px] border border-line bg-surface-2">
          {ev.gate === 'closed' && (
            <span className="absolute inset-0 flex items-center justify-center font-mono text-micro uppercase tracking-[0.14em] text-ink-subtle">
              gate closed — outside the window
            </span>
          )}
          {blocks.map((b, i) => {
            const x = b.x;
            const rule = RULE_BY_ID[b.id];
            return (
              <motion.span
                key={b.id}
                aria-hidden
                className="absolute inset-y-0 flex items-center justify-center overflow-hidden border-r border-surface"
                style={{
                  left: `${x}%`,
                  width: `${b.points}%`,
                  background: alpha(P.inkMuted, 0.16),
                  boxShadow: rule.derived || b.bonus ? `inset 0 0 0 1px ${alpha(P.inkMuted, 0.55)}` : undefined,
                }}
                initial={reduce ? false : { opacity: 0, scaleX: 0.4 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={at(reduce, 0.05 + i * 0.07, 0.3)}
              >
                {b.points >= 10 && <span className="truncate px-1 font-mono text-micro tabular-nums text-ink-muted">{b.points}</span>}
              </motion.span>
            );
          })}
          {eaten > 0 && (
            <motion.span
              aria-hidden
              className="absolute inset-y-0 flex items-center justify-center"
              style={{
                left: `${shown - eaten}%`,
                width: `${eaten}%`,
                background: `repeating-linear-gradient(135deg, ${alpha(P.alert, 0.32)} 0 3px, ${alpha(P.alert, 0.08)} 3px 7px)`,
                boxShadow: `inset 0 0 0 1px ${alpha(P.alert, 0.6)}`,
              }}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={at(reduce, 0.1 + blocks.length * 0.07, 0.3)}
            >
              <span className="font-mono text-micro tabular-nums text-alert">{penalty}</span>
            </motion.span>
          )}
        </div>

        {/* the score: the live mark */}
        {ev.gate === 'open' && (
          <motion.span
            key={`mark-${runKey}`}
            aria-hidden
            className="absolute -bottom-1.5 top-0 w-[2px] -translate-x-1/2 rounded-full"
            style={{ background: accent, left: `${ev.score}%` }}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={at(reduce, 0.2 + blocks.length * 0.07, 0.25)}
          />
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between font-mono text-micro text-ink-subtle">
        <span>0</span>
        <span>
          score <span className="font-display text-xl font-semibold tabular-nums text-ink">{ev.score}</span>
          {ev.raw !== ev.score && ev.gate === 'open' && <span className="ml-2">({ev.raw} → clamped)</span>}
        </span>
        <span>100</span>
      </div>
    </div>
  );
}

function RuleRow({ rule, b, tick }) {
  const note = b ? noteText(b) : null;
  const dim = !b || b.note === 'skipped' || b.note === 'requires';
  const pts = b?.points ?? 0;
  const cap = b?.cap ?? rule.cap;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-t border-line py-3 @min-[36rem]:grid-cols-[minmax(0,1fr)_9rem_8rem]">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className={`text-label font-medium ${dim ? 'text-ink-subtle' : 'text-ink'}`}>{rule.label}</span>
          {rule.derived && (
            <span className="rounded-chip px-1.5 py-0.5 font-mono text-micro text-ink-subtle" style={{ border: `1px dashed ${P.lineHi}` }}>
              server-derived
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-subtle">{note ?? rule.plain}</p>
      </div>
      <p className="row-start-2 font-mono text-micro text-ink-muted @min-[36rem]:row-start-auto @min-[36rem]:pt-0.5 @min-[36rem]:text-right">
        {b ? inputText(rule, b, tick) : '—'}
      </p>
      <div className="row-span-2 flex flex-col items-end gap-1.5 @min-[36rem]:row-span-1">
        <span className="font-mono text-label tabular-nums">
          <span className={pts > 0 ? 'text-ink' : 'text-ink-subtle'}>{pts}</span>
          <span className="text-ink-subtle"> / {cap}</span>
        </span>
        <span aria-hidden className="relative h-1 w-20 overflow-hidden rounded-full bg-line">
          <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(pts / cap) * 100}%`, background: P.inkMuted }} />
        </span>
      </div>
    </li>
  );
}

function PenaltyRow({ penalty, fired }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-t border-line py-3">
      <div className="min-w-0">
        <p className={`text-label font-medium ${fired ? 'text-alert' : 'text-ink-subtle'}`}>
          Penalty · {penalty.label}
          {fired && <span className="sr-only"> — applied</span>}
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-subtle">{penalty.plain}</p>
      </div>
      <span className={`font-mono text-label tabular-nums ${fired ? 'text-alert' : 'text-ink-subtle'}`}>{fired ? penalty.points : '—'}</span>
    </li>
  );
}

/** Two dots: filled sand while one high waits for a second, both jade once two in a row confirm. */
function StreakDots({ n }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-micro text-ink-subtle">
      streak
      {[0, 1].map((i) => (
        <span
          key={i}
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={i < n ? { background: n >= 2 ? P.jade : P.sand } : { boxShadow: `inset 0 0 0 1.25px ${P.inkSubtle}` }}
        />
      ))}
      <span className="sr-only">{n} high in a row</span>
    </span>
  );
}

/* ── the panel ─────────────────────────────────────────────────────────── */

export default function WakeScore({ accent = P.ice }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, AUTO);
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const morning = BY_ID[active?.key ?? AUTO];
  const evals = SCORED[morning.id];
  const last = morning.ticks.length - 1;

  // the tick in view: the reader's pick for this run, else the play's progress
  const [cursor, setCursor] = useState({ key: null, i: 0, manual: false });
  const own = cursor.key === runKey;
  const manual = own && cursor.manual;
  let index = own ? cursor.i : 0;
  if (reduce && !manual) index = last;
  const playing = Boolean(active) && !reduce && !manual && index < last;

  useEffect(() => {
    if (!playing) return undefined;
    const id = setTimeout(() => setCursor({ key: runKey, i: index + 1, manual: false }), index === 0 ? FIRST_MS + STEP_MS : STEP_MS);
    return () => clearTimeout(id);
  }, [playing, index, runKey]);

  const tick = morning.ticks[index];
  const ev = evals[index];
  const v = verdict(ev);
  const byRule = Object.fromEntries(ev.breakdown.map((b) => [b.id, b]));
  const fired = new Set(ev.penalties.map((p) => p.id));
  const tickKey = `${runKey}-${index}`;

  return (
    <div ref={ref}>
      <PanelFrame
        caption="Golden mornings · test fixtures"
        controls={
          <Choices
            label="Choose a test morning"
            options={FEATURED.map((m) => ({ key: m.id, label: m.label }))}
            value={active?.key ?? null}
            onChoose={choose}
            accent={accent}
          />
        }
        footer={
          <Readout runKey={tickKey} delay={0.35} reduce={reduce} tone={v.tone} status={v.status}>
            <span className="text-body text-ink-muted">
              <span className="font-mono text-label text-ink">{tick.local}</span> — {tick.note}
            </span>
          </Readout>
        }
      >
        <div className="@container">
          <p className="max-w-[60ch] text-body text-ink-muted">{morning.blurb}</p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <TickRail
              morning={morning}
              evals={evals}
              index={index}
              onPick={(i) => setCursor({ key: runKey, i, manual: true })}
              accent={accent}
            />
            <StreakDots n={Math.min(ev.consecutiveHigh, 2)} />
          </div>

          <ScoreBar ev={ev} runKey={tickKey} reduce={reduce} accent={accent} />

          <ul aria-label={`How ${tick.local} scored`} className="mt-6 border-b border-line">
            {RULES.rules.map((rule) => (
              <RuleRow key={rule.id} rule={rule} b={ev.gate === 'open' ? byRule[rule.id] : null} tick={tick} />
            ))}
            {RULES.penalties.map((p) => (
              <PenaltyRow key={p.id} penalty={PENALTY_BY_ID[p.id]} fired={fired.has(p.id)} />
            ))}
          </ul>
          <p className="mt-3 font-mono text-micro text-ink-subtle">
            {morning.id}.json · {morning.tz} · the engine’s expected result for this tick: {tick.expect.score} · {tick.expect.decision.replace('_', ' ')}
          </p>
        </div>
      </PanelFrame>
    </div>
  );
}
