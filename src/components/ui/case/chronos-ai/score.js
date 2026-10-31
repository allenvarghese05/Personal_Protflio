/**
 * score — a faithful JavaScript port of Chronos's wake scorer
 * (services/api/src/chronos/wake/scoring.py, evaluate()), so the case
 * study's diagrams compute every bar from the real rule set in
 * data/studies/chronos-ai.js instead of carrying hand-typed numbers.
 *
 * The order of operations is the engine's: window gate → server-derived
 * facts (charger just unplugged, unlocked on the previous tick) → dedupe →
 * rules in order (first satisfied row wins, `requires`, pedometer reweight,
 * consecutive bonus, cap) → penalties (AND-ed) → clamp to 0…100 → the
 * consecutive-high streak → the decision. The golden-morning fixtures carry
 * the engine's own expected score, decision and streak; the page's sanity
 * check runs every fixture tick through this port and compares.
 *
 * Pure and deterministic: times are parsed from fixed ISO strings, never
 * read from the clock.
 */

const CHARGING = new Set(['charging', 'full']);
const PEDOMETER_OFF = new Set(['denied', 'restricted', 'not_determined']);
const MIN_MS = 60_000;

/** 'HH:MM' inside [start, end) — the window gate on local wall-clock time. */
const inWindow = (local, [start, end]) => local >= start && local < end;

/** Minutes between two ISO instants. */
export const gapMin = (a, b) => (Date.parse(b) - Date.parse(a)) / MIN_MS;

/** Does a penalty's AND-ed condition hold? (the two v1 penalties) */
function penaltyFires(p, s) {
  if (p.id === 'stationary_dominant') return s.stationary_sec_10m >= 540 && s.steps_10m < 10;
  if (p.id === 'pedometer_denied') return s.pedometer_auth === 'denied' || s.pedometer_auth === 'restricted';
  return false;
}

/** The value a rule reads: raw signals, plus the server-derived facts. */
function signalValue(rule, s, derived) {
  if (rule.signal === 'charger_disconnected') return derived.chargerDisconnected;
  return s[rule.signal];
}

/**
 * Score one tick. `tick` = { local: 'HH:MM', ts: ISO, kind: 'weekday' |
 * 'weekend', s: { signals } }; `prev` = the previous evaluated tick of the
 * same local date ({ ts, s, consecutiveHigh }) or null; `confirmed` = the day
 * is already confirmed.
 */
export function evaluateTick(tick, prev, rules, { confirmed = false } = {}) {
  const { thresholds: th } = rules;
  const s = tick.s;
  const gate = inWindow(tick.local, rules.window[tick.kind]) ? 'open' : 'closed';
  if (gate === 'closed') {
    return { gate, score: 0, raw: 0, breakdown: [], penalties: [], consecutiveHigh: 0, decision: 'outside_window', reason: null, deduped: false, derived: {} };
  }

  const derived = {
    chargerDisconnected: Boolean(prev && CHARGING.has(prev.s.battery_state) && s.battery_state === 'unplugged'),
    unlockedTwice: Boolean(s.is_unlocked && prev && prev.s.is_unlocked),
  };
  const pedometerOff = PEDOMETER_OFF.has(s.pedometer_auth);
  const gap = prev ? gapMin(prev.ts, tick.ts) : null;
  const deduped = prev != null && gap < th.dedupeMin;

  let raw = 0;
  const breakdown = rules.rules.map((rule) => {
    const input = signalValue(rule, s, derived);
    const base = { id: rule.id, input, cap: rule.cap, points: 0, bonus: false, note: null };
    if (pedometerOff && rule.pedometer) return { ...base, note: 'skipped' };
    if (rule.requires) {
      const ok = Object.entries(rule.requires).every(([sig, allowed]) => allowed.includes(s[sig]));
      if (!ok) return { ...base, note: 'requires' };
    }
    let pts = 0;
    for (const [threshold, award] of rule.rows) {
      const hit = typeof threshold === 'number' ? typeof input === 'number' && input >= threshold : String(input).toLowerCase() === String(threshold).toLowerCase();
      if (hit) {
        pts = award;
        break;
      }
    }
    const reweight = pedometerOff ? rules.reweight[rule.id] : undefined;
    const cap = reweight ?? rule.cap;
    if (reweight != null && pts > 0) pts = rule.bonus ? reweight - rule.bonus : reweight;
    let bonus = false;
    if (rule.bonus && !deduped && pts > 0 && prev && prev.s.is_unlocked && s.is_unlocked && gap <= th.maxGapMin) {
      pts = reweight != null ? reweight : Math.min(pts + rule.bonus, cap);
      bonus = true;
    } else {
      pts = Math.min(pts, cap);
    }
    raw += pts;
    return { ...base, cap, points: pts, bonus, note: reweight != null ? 'reweighted' : null };
  });

  const penalties = rules.penalties.filter((p) => penaltyFires(p, s)).map((p) => ({ id: p.id, points: p.points }));
  raw += penalties.reduce((n, p) => n + p.points, 0);
  const score = Math.max(0, Math.min(100, raw));

  let consecutiveHigh = 0;
  if (deduped) consecutiveHigh = prev ? prev.consecutiveHigh : 0;
  else if (score >= th.confirm) consecutiveHigh = prev && prev.consecutiveHigh >= 1 && gap <= th.maxGapMin ? prev.consecutiveHigh + 1 : 1;

  let decision;
  let reason = null;
  if (confirmed) decision = 'already_confirmed';
  else if (deduped) decision = 'ignored_dedupe';
  else {
    const strong = score >= th.strong;
    const consec = consecutiveHigh >= 2;
    if (strong || consec) {
      decision = 'confirm';
      reason = strong && consec ? 'both' : strong ? 'strong' : 'consecutive';
    } else decision = score >= th.confirm ? 'high' : 'low';
  }
  return { gate, score, raw, breakdown, penalties, consecutiveHigh, decision, reason, deduped, derived };
}

/** Score a whole morning in order; `prev` resets when the local date changes. */
export function scoreMorning(morning, rules) {
  const out = [];
  let prev = null;
  let confirmedOn = null;
  for (const t of morning.ticks) {
    const tick = { ...t, kind: t.kind ?? morning.kind };
    const date = t.date ?? morning.date;
    const p = prev && prev.date === date ? prev : null;
    const ev = evaluateTick(tick, p, rules, { confirmed: confirmedOn === date });
    if (ev.decision === 'confirm') confirmedOn = date;
    out.push(ev);
    prev = { ts: t.ts, s: t.s, consecutiveHigh: ev.consecutiveHigh, date };
  }
  return out;
}

/** The highest score the rules allow without opening the app. */
export function ceilingWithoutApp(rules, pedometerOff) {
  return rules.rules
    .filter((r) => r.id !== 'foreground' && !(pedometerOff && r.pedometer))
    .reduce((n, r) => n + ((pedometerOff ? rules.reweight[r.id] : undefined) ?? r.cap), 0);
}
