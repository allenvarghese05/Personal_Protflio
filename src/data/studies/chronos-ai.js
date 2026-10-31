/**
 * The Chronos AI case study — every fact the page shows, in one place.
 * Components only render this; change copy here.
 *
 * Checked against the repository itself (github.com/allenvarghese05/chronos-ai,
 * private, main at c762861 — PR #35, 2026-10-28): services/api/config/
 * wake_rules.yaml, services/api/src/chronos/wake/{scoring,window,rules,
 * service,state}.py, scheduler.py, api/telemetry.py, the golden-morning
 * fixtures in services/api/tests/fixtures/wake/mornings/, docs/11-
 * implementation-plan.md, docs/plans/*.md and the git history.
 *
 * Status, plainly: the wake-detection backend (milestones M0 and M1) is built
 * and tested; the phone side is partly built (Swift sensor module, pairing)
 * and has only run in the iOS Simulator; the "Morning Reel" news-video
 * pipeline (M3–M5) is designed but not built. Test counts are the ones the
 * repo records (docs/plans/T2.2-plan.md); none of this is deployed publicly.
 */

/* ── the rule set, v1 — services/api/config/wake_rules.yaml ─────────────── */
// `pedometer`: the rule reads CoreMotion data (signals.py needs_pedometer) and
// is skipped when that permission is denied. `derived`: the server works the
// value out by comparing this snapshot with the previous one.
export const RULES = {
  version: 1,
  file: 'services/api/config/wake_rules.yaml',
  window: { weekday: ['06:00', '11:00'], weekend: ['08:00', '14:00'] },
  dayBoundary: '03:00',
  tickMin: 5,
  thresholds: { confirm: 70, strong: 85, dedupeMin: 2, maxGapMin: 12 },
  rules: [
    { id: 'steps_10m', label: 'Steps', plain: 'steps in the last 10 minutes', signal: 'steps_10m', rows: [[35, 30], [20, 18], [10, 8]], cap: 30, pedometer: true, unit: 'steps' },
    { id: 'walking_10m', label: 'Walking', plain: 'seconds spent walking in the last 10 minutes, if CoreMotion is at least medium-confident', signal: 'walking_sec_10m', rows: [[60, 20], [30, 12]], requires: { walking_conf: ['medium', 'high'] }, cap: 20, pedometer: true, unit: 's' },
    { id: 'unlocked', label: 'Unlocked', plain: 'the phone is unlocked — +10 more if it was unlocked on the previous tick too, ≤ 12 min earlier', signal: 'is_unlocked', rows: [[true, 15]], bonus: 10, cap: 25 },
    { id: 'charger_disconnect', label: 'Off the charger', plain: 'charging on the last tick, unplugged now — worked out by the server', signal: 'charger_disconnected', rows: [[true, 15]], cap: 15, derived: true },
    { id: 'steps_window', label: 'Steps today', plain: 'at least 100 steps since the morning window opened', signal: 'steps_since_window', rows: [[100, 5]], cap: 5, pedometer: true, unit: 'steps' },
    { id: 'foreground', label: 'Opened the app', plain: 'this snapshot came from opening the app, not from a background tick', signal: 'wake_source', rows: [['foreground', 40]], cap: 40 },
  ],
  penalties: [
    { id: 'stationary_dominant', label: 'Lying still', plain: 'still for ≥ 540 of the last 600 seconds and under 10 steps', points: -20 },
    { id: 'pedometer_denied', label: 'Pedometer denied', plain: 'a marker only — it subtracts nothing', points: 0 },
  ],
  // pedometer permission denied: these become both the cap and the points
  reweight: { unlocked: 35, charger_disconnect: 25, foreground: 40 },
};

/* ── the golden mornings — tests/fixtures/wake/mornings/*.json ──────────── */
// 11 fixture files, 31 scripted ticks. Each tick: local wall-clock time, the
// UTC instant, the signals the phone would send, and the engine's expected
// result (score, decision, streak, reason), copied from the fixture's
// `expect` block. `note` is the fixture's own arithmetic in plain words.
// Signals not shown (battery level, app state…) don't affect the score.
const sig = (wake_source, steps_10m, steps_since_window, walking_sec_10m, walking_conf, stationary_sec_10m, is_unlocked, battery_state, pedometer_auth = 'authorized') => ({
  wake_source,
  steps_10m,
  steps_since_window,
  walking_sec_10m,
  walking_conf,
  stationary_sec_10m,
  is_unlocked,
  battery_state,
  pedometer_auth,
});
const ex = (score, decision, streak = 0, reason = null) => ({ score, decision, streak, reason });

export const MORNINGS = [
  {
    id: 'worked_example', label: 'Worked example', kind: 'weekday', tz: 'America/Los_Angeles', date: '2026-10-06', featured: true,
    blurb: 'Built around the design doc’s example snapshot (48 steps, 95 s walking → 85): a tick before the window, the app opened at 06:07, then a walk off the charger.',
    ticks: [
      { local: '05:50', ts: '2026-10-06T12:50:00Z', s: sig('silent_push', 0, 0, 0, 'low', 300, false, 'charging'), expect: ex(0, 'outside_window'), note: 'Ten minutes before the 06:00 window opens — the gate is closed, so nothing is scored.' },
      { local: '06:07', ts: '2026-10-06T13:07:00Z', s: sig('foreground', 20, 0, 30, 'medium', 120, false, 'charging'), expect: ex(70, 'high', 1), note: 'Opened the app (40), 20 steps (18), 30 s of walking (12): exactly 70 — high, but one high tick isn’t enough.' },
      { local: '06:12', ts: '2026-10-06T13:12:00Z', s: sig('silent_push', 48, 112, 95, 'high', 30, true, 'unplugged'), expect: ex(85, 'confirm', 2, 'both'), note: '48 steps, 95 s walking, unlocked, just unplugged, 112 steps today: 85 — strong on its own, and the second high in a row.' },
    ],
  },
  {
    id: 'typical_weekday', label: 'Typical weekday', kind: 'weekday', tz: 'America/Los_Angeles', date: '2026-10-06', featured: true,
    blurb: 'Up and walking at 06:48, phone in hand — two background ticks five minutes apart.',
    ticks: [
      { local: '06:48', ts: '2026-10-06T13:48:00Z', s: sig('silent_push', 35, 120, 95, 'high', 30, true, 'unplugged'), expect: ex(70, 'high', 1), note: '35 steps (30), walking (20), unlocked (15), 120 steps today (5): 70 — the first high tick.' },
      { local: '06:53', ts: '2026-10-06T13:53:00Z', s: sig('silent_push', 40, 200, 80, 'high', 20, true, 'unplugged'), expect: ex(80, 'confirm', 2, 'consecutive'), note: 'Still unlocked five minutes later, so the unlock bonus adds 10: 80, the second high in a row — confirmed.' },
    ],
  },
  {
    id: 'snooze', label: 'Snooze', kind: 'weekday', tz: 'America/Los_Angeles', date: '2026-10-06', featured: true,
    blurb: 'A glance at the phone at 06:30, back to sleep, and really up an hour later.',
    ticks: [
      { local: '06:30', ts: '2026-10-06T13:30:00Z', s: sig('foreground', 5, 5, 0, 'low', 550, true, 'unplugged'), expect: ex(35, 'low'), note: 'Opened the app (40) and unlocked (15) — but still for 550 of 600 seconds with 5 steps: −20. A glance scores 35.' },
      { local: '06:35', ts: '2026-10-06T13:35:00Z', s: sig('silent_push', 3, 5, 0, 'low', 570, false, 'unplugged'), expect: ex(0, 'low'), note: 'Locked again and lying still: 0 points, −20, clamped to 0.' },
      { local: '07:40', ts: '2026-10-06T14:40:00Z', s: sig('silent_push', 35, 400, 60, 'high', 30, true, 'unplugged'), expect: ex(70, 'high', 1), note: 'An hour later: 35 steps, a minute of walking, unlocked, 400 steps today — 70. The streak starts again at one.' },
      { local: '07:45', ts: '2026-10-06T14:45:00Z', s: sig('silent_push', 50, 500, 80, 'high', 10, true, 'unplugged'), expect: ex(80, 'confirm', 2, 'consecutive'), note: 'Unlocked on both ticks, five minutes apart: +10 bonus, 80 — two highs in a row, confirmed.' },
    ],
  },
  {
    id: 'early_walk', label: 'Early walk', kind: 'weekday', tz: 'America/Los_Angeles', date: '2026-10-06', featured: true,
    blurb: 'Out walking before the window opens, back to bed at 06:10, properly up after 08:00.',
    ticks: [
      { local: '05:55', ts: '2026-10-06T12:55:00Z', s: sig('silent_push', 100, 0, 200, 'high', 0, false, 'unplugged'), expect: ex(0, 'outside_window'), note: '100 steps — but at 05:55, before the window. Outside the window everything scores 0.' },
      { local: '06:05', ts: '2026-10-06T13:05:00Z', s: sig('silent_push', 100, 120, 80, 'high', 20, true, 'unplugged'), expect: ex(70, 'high', 1), note: 'Inside the window: steps (30), walking (20), unlocked (15), steps today (5) — 70, the first high.' },
      { local: '06:10', ts: '2026-10-06T13:10:00Z', s: sig('silent_push', 5, 150, 0, 'low', 550, false, 'unplugged'), expect: ex(0, 'low'), note: 'Back to bed: only the 5 for steps today, then −20 for lying still — clamped to 0. The streak resets.' },
      { local: '08:15', ts: '2026-10-06T15:15:00Z', s: sig('silent_push', 35, 300, 60, 'high', 30, true, 'unplugged'), expect: ex(70, 'high', 1), note: 'Two hours later: 70 again, the streak back at one.' },
      { local: '08:20', ts: '2026-10-06T15:20:00Z', s: sig('silent_push', 40, 400, 80, 'high', 10, true, 'unplugged'), expect: ex(80, 'confirm', 2, 'consecutive'), note: 'Unlocked twice running: 80, the second high in a row — confirmed at 08:20, not at 06:05.' },
    ],
  },
  {
    id: 'foreground_only', label: 'Opened the app', kind: 'weekday', tz: 'America/Los_Angeles', date: '2026-10-06', featured: true,
    blurb: 'The app is opened right at 06:00, before any steps — then a walk.',
    ticks: [
      { local: '05:52', ts: '2026-10-06T12:52:00Z', s: sig('foreground', 0, 0, 0, 'low', 300, true, 'charging'), expect: ex(0, 'outside_window'), note: 'Before the window: 0. But it is remembered as the previous tick — unlocked and on the charger.' },
      { local: '06:00', ts: '2026-10-06T13:00:00Z', s: sig('foreground', 0, 0, 0, 'low', 100, true, 'unplugged'), expect: ex(80, 'high', 1), note: 'Opened the app (40), unlocked twice running (25), just unplugged (15): 80 — high, not strong. One tick is not enough.' },
      { local: '06:05', ts: '2026-10-06T13:05:00Z', s: sig('silent_push', 35, 100, 60, 'high', 20, true, 'unplugged'), expect: ex(80, 'confirm', 2, 'consecutive'), note: 'Now walking: steps (30), walking (20), unlocked (25), 100 steps (5) — 80 again, two in a row.' },
    ],
  },
  {
    id: 'pedometer_denied_no_app', label: 'No pedometer, no app', kind: 'weekday', tz: 'America/Los_Angeles', date: '2026-10-06', featured: true,
    blurb: 'Motion permission denied, and the app never opened: unlocked and unplugged is all the server can see.',
    ticks: [
      { local: '05:50', ts: '2026-10-06T12:50:00Z', s: sig('silent_push', 0, 0, 0, 'low', 300, false, 'charging', 'denied'), expect: ex(0, 'outside_window'), note: 'Before the window: 0.' },
      { local: '06:05', ts: '2026-10-06T13:05:00Z', s: sig('silent_push', 0, 0, 0, 'low', 200, true, 'charging', 'denied'), expect: ex(25, 'low'), note: 'Pedometer rules skipped; unlocked is reweighted to 25 (35 with the bonus). Still on the charger: 25.' },
      { local: '06:10', ts: '2026-10-06T13:10:00Z', s: sig('silent_push', 0, 0, 0, 'low', 180, true, 'unplugged', 'denied'), expect: ex(60, 'low'), note: 'Unlocked twice (35) and just unplugged (25): 60 — the ceiling without the app. It can never reach 70 this way.' },
    ],
  },
  {
    id: 'night_check', label: '3 a.m. check', kind: 'weekday', tz: 'America/Los_Angeles', date: '2026-10-07', featured: true,
    blurb: 'A background tick at 03:10, phone on the charger.',
    ticks: [
      { local: '03:10', ts: '2026-10-07T10:10:00Z', s: sig('silent_push', 2, 0, 0, 'low', 590, false, 'charging'), expect: ex(0, 'outside_window'), note: 'Past the 03:00 day boundary, so it belongs to Wednesday — but hours before the 06:00 window. Gate closed: 0.' },
    ],
  },
  {
    id: 'missed_ticks', label: 'Missed ticks', kind: 'weekday', tz: 'America/Los_Angeles', date: '2026-10-06',
    blurb: 'Two high ticks exactly 12 minutes apart — the longest gap that still counts.',
    ticks: [
      { local: '07:00', ts: '2026-10-06T14:00:00Z', s: sig('silent_push', 35, 200, 60, 'high', 30, true, 'unplugged'), expect: ex(70, 'high', 1), note: '70 — the first high.' },
      { local: '07:12', ts: '2026-10-06T14:12:00Z', s: sig('silent_push', 40, 300, 80, 'high', 15, true, 'unplugged'), expect: ex(80, 'confirm', 2, 'consecutive'), note: 'Gap of exactly 12 minutes: still consecutive, bonus applies — 80, confirmed.' },
    ],
  },
  {
    id: 'pedometer_denied', label: 'Pedometer denied', kind: 'weekday', tz: 'America/Los_Angeles', date: '2026-10-06',
    blurb: 'Motion permission denied, but the app is opened after unplugging.',
    ticks: [
      { local: '05:50', ts: '2026-10-06T12:50:00Z', s: sig('silent_push', 0, 0, 0, 'low', 300, false, 'charging', 'denied'), expect: ex(0, 'outside_window'), note: 'Before the window: 0.' },
      { local: '06:10', ts: '2026-10-06T13:10:00Z', s: sig('foreground', 0, 0, 0, 'low', 200, true, 'unplugged', 'denied'), expect: ex(90, 'confirm', 1, 'strong'), note: 'Unlocked (25), just unplugged (25), opened the app (40): 90 — strong, confirmed on one tick.' },
    ],
  },
  {
    id: 'weekend', label: 'Weekend', kind: 'weekend', tz: 'America/Los_Angeles', date: '2026-10-10',
    blurb: 'Saturday: the window is 08:00–14:00.',
    ticks: [
      { local: '09:30', ts: '2026-10-10T16:30:00Z', s: sig('silent_push', 35, 150, 60, 'high', 30, true, 'unplugged'), expect: ex(70, 'high', 1), note: '70 — the first high.' },
      { local: '09:35', ts: '2026-10-10T16:35:00Z', s: sig('silent_push', 40, 250, 80, 'high', 15, true, 'unplugged'), expect: ex(80, 'confirm', 2, 'consecutive'), note: '80 — two in a row, confirmed.' },
    ],
  },
  {
    id: 'dst_fall_back', label: 'Clocks go back', kind: 'weekend', tz: 'America/New_York',
    blurb: 'New York, 2026-11-01: 01:30 happens twice, and both belong to Saturday.',
    ticks: [
      { local: '01:30', date: '2026-10-31', ts: '2026-11-01T05:30:00Z', s: sig('silent_push', 0, 0, 0, 'low', 590, false, 'charging'), expect: ex(0, 'outside_window'), note: '01:30 EDT — before the 03:00 boundary, so Saturday Oct 31. Gate closed.' },
      { local: '01:30', date: '2026-10-31', ts: '2026-11-01T06:30:00Z', s: sig('silent_push', 0, 0, 0, 'low', 590, false, 'charging'), expect: ex(0, 'outside_window'), note: '01:30 EST, an hour later in real time — still before 03:00, still Saturday.' },
      { local: '08:00', date: '2026-11-01', ts: '2026-11-01T13:00:00Z', s: sig('silent_push', 35, 120, 60, 'high', 30, true, 'unplugged'), expect: ex(70, 'high', 1), note: '08:00 EST — Sunday’s window opens at 13:00 UTC, an hour later than Saturday’s. 70; no previous tick today.' },
      { local: '08:05', date: '2026-11-01', ts: '2026-11-01T13:05:00Z', s: sig('silent_push', 40, 200, 80, 'high', 15, true, 'unplugged'), expect: ex(80, 'confirm', 2, 'consecutive'), note: '80 — two in a row, confirmed.' },
    ],
  },
];

export const FIXTURE_TICKS = MORNINGS.reduce((n, m) => n + m.ticks.length, 0); // 31

/* ── one snapshot, end to end — POST /v1/telemetry (api/telemetry.py, wake/service.py) ── */
// The stages in the order the server runs them. `code`: what it answers when
// it rejects. The phone doesn't send these yet (T2.3); the server side is
// built and covered by tests/test_telemetry.py.
export const INGEST = {
  route: 'POST /v1/telemetry',
  stages: [
    { key: 'auth', label: 'Bearer token', where: 'auth.require_device', items: ['looked up by its SHA-256, never in plaintext', 'missing or unknown → 401', 'revoked phone → 403'] },
    { key: 'rate', label: 'Rate limit', where: 'ratelimit.py', items: ['token bucket per route + IP', '30 requests a minute'] },
    { key: 'size', label: 'Body size', where: 'api/telemetry.py', items: ['raw bytes read before parsing', 'over 64 KiB → 422'] },
    { key: 'schema', label: 'Schema', where: 'wake/signals.py · Signals', items: ['typed fields, enums checked', 'extra="forbid": unknown fields rejected'] },
    { key: 'skew', label: 'Clock skew', where: 'wake/service.py', items: ['phone time vs server time', 'over 300 s apart → 422, with server_time', 'checked before any write'] },
    { key: 'dupe', label: 'Same snapshot again?', where: 'UNIQUE (device_id, seq)', items: ['already stored → return the stored score', 'with the rule version that made it'] },
    { key: 'score', label: 'Score', where: 'wake/scoring.py · evaluate()', items: ['local date, day row, previous tick', 'pure function — no I/O'] },
    { key: 'commit', label: 'One commit', where: 'wake/service.py · wake/state.py', items: ['telemetry row + evaluation row', 'day counter + state transition', 'all in one transaction'] },
  ],
  probes: [
    { key: 'ok', label: 'A good snapshot', at: null, code: '200', result: 'Scored and stored: the response carries the score, the per-rule breakdown, the decision and the day’s state.' },
    { key: 'notoken', label: 'No token', at: 'auth', code: '401', result: 'unauthorized — nothing read, nothing stored.' },
    { key: 'revoked', label: 'Revoked phone', at: 'auth', code: '403', result: 'revoked — the token’s hash is on file, but the phone was revoked (DELETE /v1/device/me or chronos device revoke).' },
    { key: 'flood', label: '31st in a minute', at: 'rate', code: '429', result: 'rate_limited — the bucket refills at 30 a minute.' },
    { key: 'big', label: 'A 70 KB body', at: 'size', code: '422', result: 'validation — the body is over 64 KiB, refused before it is parsed.' },
    { key: 'extra', label: 'An unknown field', at: 'schema', code: '422', result: 'validation — the schema forbids fields it doesn’t know.' },
    { key: 'skew', label: 'Phone clock 6 min off', at: 'skew', code: '422', result: 'clock_skew — 360 s apart is over the 300 s limit; the answer includes server_time so the phone can see the gap.' },
    { key: 'dupe', label: 'Same seq again', at: 'dupe', code: '200', pass: true, result: 'The stored evaluation comes back — under the rule version that first scored it, even if the rules have changed since.' },
  ],
};

/* ── the morning loop — scheduler.py plan() + run_forever ───────────────── */
// The planner is pure: given the time and the day, it returns exactly one
// action. The scenarios are the scheduler's own simulation tests
// (tests/test_scheduler.py), run against a fake push client — not a phone.
export const LOOP = {
  states: [
    { key: 'idle', label: 'idle', plain: 'before the window' },
    { key: 'monitoring', label: 'monitoring', plain: 'ticking every 5 min' },
    { key: 'confirmed', label: 'confirmed', plain: 'a snapshot said you’re up' },
    { key: 'fallback', label: 'fallback', plain: 'the window closed first' },
    { key: 'delivered', label: 'delivered', plain: 'reel sent — not built (T5.2)', planned: true },
  ],
  // who moves the day between states (TransitionCause)
  transitions: [
    { from: 'idle', to: 'monitoring', by: 'scheduler', cause: 'scheduler_window_start' },
    { from: 'monitoring', to: 'confirmed', by: 'telemetry', cause: 'evaluation' },
    { from: 'monitoring', to: 'fallback', by: 'scheduler', cause: 'scheduler_window_end' },
    { from: 'confirmed', to: 'delivered', by: 'planned', cause: 'deliver_ok' },
    { from: 'fallback', to: 'delivered', by: 'planned', cause: 'deliver_ok' },
  ],
  window: ['06:00', '11:00'],
  span: ['05:50', '11:05'], // the simulation runs 05:50 → 11:05 in 1-minute steps
  scenarios: [
    { key: 'fallback', label: 'Never confirmed', test: 'test_full_weekday_60_ticks', confirmAt: null, restartAfter: null, readout: 'Monitoring from 06:00, ticks 0–59 every five minutes, then fallback at 11:00 — 60 silent pushes, one start, one fallback.' },
    { key: 'confirm', label: 'Up at 07:12', test: 'test_stops_on_confirm', confirmAt: '07:12', restartAfter: null, readout: 'A snapshot confirms at 07:12. The day is terminal, so every later plan() is a no-op — no ticks after 07:10.' },
    { key: 'restart', label: 'Server restarts', test: 'test_restart_mid_window_continues_tick_seq', confirmAt: null, restartAfter: 5, readout: 'A fresh scheduler after tick 5 re-reads what was sent from push_notifications and carries on at tick 6 — nothing sent twice.' },
  ],
};

/* ── where it stands — docs/11-implementation-plan.md, task by task ─────── */
// state: built (merged) · caveat (merged, with a gap noted) · next · planned.
export const MILESTONES = [
  { key: 'M0', label: 'Foundation', tasks: [
    { id: 'T0.1', title: 'Repo skeleton, tooling, CI baseline', state: 'built', pr: '#1' },
    { id: 'T0.2', title: 'GitHub bootstrap, ruleset drift check', state: 'caveat', pr: '#2', note: 'Server-side branch protection deferred to T6.7 — not available on a free private repo.' },
    { id: 'T0.2b', title: 'Deterministic expo-doctor in CI', state: 'built', pr: '#6' },
    { id: 'T0.2d', title: 'Dependabot: security updates only', state: 'built', pr: '#22' },
    { id: 'T0.3', title: 'API scaffold: FastAPI, SQLite, CLI, health', state: 'built', pr: '#3' },
    { id: 'T0.4', title: 'Expo dev-client + Swift module stub', state: 'built', pr: '#4' },
    { id: 'T0.4b', title: 'Dev-client with the native module', state: 'caveat', pr: '#21', note: 'Runs on the iOS Simulator. The plan asked for the owner’s iPhone; its port is broken, so that moved to T2.4.' },
    { id: 'T0.5', title: 'Remotion scaffold: cover scene, smoke render', state: 'built', pr: '#5', note: 'Only the cover scene renders; CI renders one still frame, not a video.' },
    { id: 'T0.6', title: 'Laptop ops: launchd, certs, models, deploy, doctor', state: 'caveat', pr: '#31', note: 'The scripts are merged; the on-laptop checks are manual and no run is recorded.' },
    { id: 'T0.7', title: 'Deterministic OpenAPI → mobile types, CI check', state: 'built', pr: '#30' },
  ] },
  { key: 'M1', label: 'Wake engine', tasks: [
    { id: 'T1.1', title: 'Tables + migration 0001', state: 'built', pr: '#23' },
    { id: 'T1.2', title: 'Pairing, bearer auth, rate limiting', state: 'built', pr: '#24' },
    { id: 'T1.3', title: 'Morning window, local day, DST', state: 'built', pr: '#25' },
    { id: 'T1.4', title: 'Rules schema, versions, /v1/config/wake', state: 'built', pr: '#26' },
    { id: 'T1.5', title: 'Scoring engine, 11 golden mornings', state: 'built', pr: '#27' },
    { id: 'T1.6', title: 'Telemetry ingest + day state machine', state: 'built', pr: '#28' },
    { id: 'T1.7', title: 'Scheduler, silent ticks, Expo push client', state: 'built', pr: '#29', note: 'A pure planner and a 60-second loop instead of the APScheduler the plan named — no new dependency, an injectable clock.' },
    { id: 'T1.8', title: 'Replay, annotate, nightly report', state: 'built', pr: '#32' },
  ] },
  { key: 'M2', label: 'Phone', tasks: [
    { id: 'T2.1', title: 'Swift sensor module (CoreMotion, device state)', state: 'caveat', pr: '#33', note: '40 XCTests against fake CoreMotion. In the Simulator, step queries return pedometer_unavailable — real motion data has never been read.' },
    { id: 'T2.2', title: 'Pairing screen, secure storage, API client', state: 'built', pr: '#35', note: 'Validated in the iOS Simulator: code entry, Keychain storage, revocation. QR scanning and real push registration are not verified on a device.' },
    { id: 'T2.3', title: 'Telemetry sampler + on-phone outbox', state: 'next', note: 'The phone does not send snapshots yet — this is the next task.' },
    { id: 'T2.4', title: 'Silent-push handling on a real iPhone', state: 'planned', note: 'Acceptance needs a physical iPhone: a server tick answered within 60 seconds while it is locked. So far everything has run in the Simulator — the phone’s port is broken.' },
    { id: 'T2.5', title: 'Debug screen', state: 'planned' },
    { id: 'T2.6', title: 'Settings screen', state: 'planned' },
  ] },
  { key: 'M3', label: 'Content', tasks: [
    { id: 'T3.1', title: 'Job queue + content tables', state: 'planned' },
    { id: 'T3.2', title: 'Guarded fetchers for news and paper feeds', state: 'planned' },
    { id: 'T3.3', title: 'Normalise, dedupe, rank', state: 'planned' },
    { id: 'T3.4', title: 'Reel script from a local LLM, with a fallback', state: 'planned' },
    { id: 'T3.5', title: 'Pipeline orchestration + prewarm', state: 'planned' },
  ] },
  { key: 'M4', label: 'Media', tasks: [
    { id: 'T4.1', title: 'Image assets job', state: 'planned' },
    { id: 'T4.2', title: 'Local text-to-speech (Kokoro)', state: 'planned' },
    { id: 'T4.3', title: 'Word-timed captions (whisper.cpp)', state: 'planned' },
    { id: 'T4.4', title: 'Full Remotion scenes', state: 'planned' },
    { id: 'T4.5', title: 'Render job + verification', state: 'planned' },
  ] },
  { key: 'M5', label: 'Delivery', tasks: [
    { id: 'T5.1', title: 'Signed media links + retention', state: 'planned' },
    { id: 'T5.2', title: 'Reel push on confirm or fallback', state: 'planned' },
    { id: 'T5.3', title: 'Feed + player screens', state: 'planned' },
    { id: 'T5.4', title: 'Notification deep link', state: 'planned' },
    { id: 'T5.5', title: 'First full-morning dry run', state: 'planned' },
  ] },
  { key: 'M6', label: 'Hardening', tasks: [
    { id: 'T6.1', title: 'Observability polish', state: 'planned' },
    { id: 'T6.2', title: 'Tune the rules after 7 real mornings', state: 'planned' },
    { id: 'T6.3', title: 'Security review pass', state: 'planned' },
    { id: 'T6.4', title: 'Optional cloud sync of saved reels', state: 'planned' },
    { id: 'T6.5', title: 'Optional per-story reels', state: 'planned' },
    { id: 'T6.6', title: 'Optional access away from home', state: 'planned' },
    { id: 'T6.7', title: 'Server-side branch protection', state: 'planned' },
  ] },
];

/* ── three hard problems (the key decisions) ──────────────────────────────── */
export const DECISIONS = [
  {
    id: 'reweight',
    kicker: 'Permissions',
    title: 'Motion permission denied: still reachable, never too easy',
    problem:
      'Three of the six rules read CoreMotion. If the pedometer permission is denied, they can never score — and with the normal caps, the remaining rules top out at 80, so a denied day would be scored on a scale it could barely reach.',
    decision:
      'When the pedometer is unavailable, those rules are skipped and the other three are reweighted to 35, 25 and 40, so the maximum is still 100. A reweight value is both the rule’s cap and its points. The rules validator rejects reweights that sum past 100 — which is why the design doc’s 35 + 30 + 40 = 105 became 35 + 25 + 40 in the YAML.',
    tradeoff:
      'Without opening the app, a denied day tops out at 35 + 25 = 60 — under the 70 line — so it can only confirm when the app is opened. Deliberate: unlock and unplug alone are too weak to trust. The no-pedometer-no-app fixture checks it.',
    code: {
      file: 'services/api/src/chronos/wake/scoring.py',
      lang: 'py',
      body: `# 7a. Skip pedometer-requiring rules when unavailable.
if pedometer_unavailable and spec.needs_pedometer:
    breakdown_list.append(RuleBreakdown(rule_id=rule.id, points=0, note="pedometer unavailable"))
    continue
...
# 7d. A reweight value sets both the cap and the points.
reweight_value = rules.reweight_without_pedometer.get(rule.id) if pedometer_unavailable else None
effective_cap = reweight_value if reweight_value is not None else rule.cap
if reweight_value is not None and pts > 0:
    if rule.bonus_consecutive:
        pts = reweight_value - rule.bonus_consecutive.points   # unlocked: 35 - 10 = 25
    else:
        pts = reweight_value`,
    },
  },
  {
    id: 'versions',
    kicker: 'Rules',
    title: 'A rule change can’t rewrite yesterday’s score',
    problem:
      'The rules will be tuned after real mornings. If a stored score couldn’t be traced to the exact rules that produced it, tuning would be guesswork — and two copies of “the active rules” would be worse.',
    decision:
      'Rules are content-addressed: the canonical JSON (sorted keys, no whitespace) gets a SHA-256. Applying rules runs in a savepoint — the same hash is a no-op (200); a new one deactivates the old row and inserts version n + 1 (201). A partial unique index allows only one active row. Every evaluation stores its rule version and full breakdown, so replay can re-score stored mornings under a candidate set.',
    tradeoff:
      'Rules now live in three places — the YAML file, a database row and an in-memory cache — that must agree; GET /v1/config/wake reports a yaml_stale flag when the file has drifted from the active row.',
    // the ledger the visual starts from
    ledger: [
      { version: 1, source: 'yaml', by: 'startup' },
    ],
    scenarios: [
      { key: 'same', label: 'Apply the same rules', outcome: 'noop', status: '200 · no change', readout: 'Same canonical JSON, same SHA-256 — the active row is returned and nothing is written.' },
      { key: 'edit', label: 'Apply edited rules', outcome: 'created', status: '201 · version 2', readout: 'A new hash: version 1 is deactivated and version 2 inserted, in one savepoint. Scores from yesterday still point at version 1.' },
      { key: 'fail', label: 'Insert fails', outcome: 'rollback', status: 'Rolled back', readout: 'The insert raises, the savepoint rolls back the deactivation too — version 1 stays active. A test forces exactly this.' },
    ],
    code: {
      file: 'services/api/src/chronos/wake/rules.py',
      lang: 'py',
      body: `sha = rules_sha256(rules)          # SHA-256 of sorted, compact JSON
with session.no_autoflush, session.begin_nested():
    active_rv = session.exec(select(RuleVersion).where(RuleVersion.active == 1)).first()
    if active_rv is not None and active_rv.sha256 == sha:
        return active_rv, False        # identical rules: no-op (200)
    next_version = max(rv.version for rv in all_rvs) + 1
    if active_rv is not None:
        active_rv.active = 0           # deactivate the old row
        session.flush()
    session.add(RuleVersion(version=next_version, sha256=sha, active=1, ...))
    session.flush()                    # if this raises, the savepoint undoes both
return new_rv, True                    # created (201)`,
    },
  },
  {
    id: 'dst',
    kicker: 'Time',
    title: 'A morning is a local day — even when the clocks change',
    problem:
      'A tick at 01:30 should belong to the night before, not to “today”. And twice a year the wall clock lies: in spring an hour doesn’t exist; in autumn 01:30 happens twice. A window computed naively opens an hour early or late on exactly those days.',
    decision:
      'The phone sends its IANA time zone. A local day starts at 03:00, so anything earlier counts toward the previous date. Window times are resolved per day: a time that doesn’t exist is found by a round trip and binary-searched to the transition second; an ambiguous one takes its first occurrence. A day’s zone and window are frozen when its row is created.',
    tradeoff:
      'Travelling, a new time zone only takes effect from the next 03:00 boundary. The DST fixture and the window tests (spring-forward gap, fall-back fold) pin the behaviour.',
    // the clocks-go-back night in New York, from the dst_fall_back fixture
    scenario: {
      tz: 'America/New_York',
      transitionUtc: '06:00', // 02:00 EDT → 01:00 EST
      boundaryUtc: '08:00', // 03:00 EST on Nov 1
      windows: [
        { date: 'Sat Oct 31', utc: ['12:00', '18:00'], local: '08:00–14:00 EDT' },
        { date: 'Sun Nov 1', utc: ['13:00', '19:00'], local: '08:00–14:00 EST' },
      ],
    },
    code: {
      file: 'services/api/src/chronos/wake/window.py',
      lang: 'py',
      body: `def local_date_for(instant, tz, boundary):
    local_dt = instant.astimezone(tz)
    if local_dt.time().replace(tzinfo=None) < boundary:   # before 03:00
        return local_dt.date() - datetime.timedelta(days=1)
    return local_dt.date()

# _resolve_local_to_utc: build with fold=0 (first occurrence)…
utc0 = local_fold0.astimezone(datetime.UTC)
roundtrip = utc0.astimezone(tz)
if roundtrip.replace(tzinfo=None) != local_fold0.replace(tzinfo=None):
    # …a spring-forward gap: binary-search the exact transition second
    utc1 = local_fold1.astimezone(datetime.UTC)
    utc0 = _find_transition_utc(utc1, utc0, tz)`,
    },
  },
];

/* ── how the code was written — AGENTS.md, .pi/agents/*.md ──────────────── */
// A four-stage AI coding-agent pipeline, with the owner at every gate.
export const PIPELINE = {
  stages: [
    { key: 'understand', agent: 'understander', model: 'Claude Haiku 4.5', writes: 'the task brief: facts, open questions, an approach', gate: 'Allen answers the questions' },
    { key: 'implement', agent: 'implementer', model: 'Claude Sonnet 4.6', writes: 'the plan, then the code, tests and commits', gate: 'gate · Allen signs off' },
    { key: 'review', agent: 'reviewer', model: 'Claude Opus 4.6', writes: 'APPROVE or CHANGES NEEDED — fixes loop back', gate: 'gate · Allen signs off' },
    { key: 'push', agent: 'pusher', model: 'Claude Haiku 4.5', writes: 'the branch and the pull request', gate: 'Allen merges — no agent may' },
  ],
  record: 'docs/plans/ — a brief and a plan for each of the 20 merged tasks',
};

/* ── architecture — node ids are project.architectureGraph ids ──────────── */
export const LAYERS = [
  { key: 'who', label: 'Phone · owner', nodes: ['iphone', 'sensors', 'owner-cli'] },
  { key: 'app', label: 'FastAPI on the MacBook', nodes: ['api', 'auth', 'ingest', 'scheduler'] },
  { key: 'domain', label: 'Wake engine · pure', nodes: ['window', 'rules', 'scoring', 'state', 'replay'] },
  { key: 'data', label: 'Data', nodes: ['sqlite'] },
  { key: 'out', label: 'Outside', nodes: ['expo-push', 'launchd'] },
];
export const TRACES = [
  { id: 'score', label: 'Score a snapshot', steps: ['api', 'auth', 'ingest', 'window', 'rules', 'scoring', 'state', 'sqlite'] },
  { id: 'tick', label: 'Send a silent tick', steps: ['scheduler', 'window', 'state', 'expo-push', 'sqlite'] },
  { id: 'pair', label: 'Pair the phone', steps: ['owner-cli', 'sqlite', 'iphone', 'api', 'auth', 'sqlite'] },
  { id: 'replay', label: 'Replay a morning', steps: ['owner-cli', 'replay', 'sqlite', 'rules', 'scoring'] },
];

/* ── data model — services/api/src/chronos/models: 9 tables, 15 enums ───── */
export const DATA_MODEL = {
  engine: 'SQLModel · SQLite (WAL) · Alembic',
  noun: 'tables',
  domains: [
    { key: 'security', label: 'Phone & pairing', models: [
      { name: 'devices', note: 'one active phone · token stored only as a SHA-256 · push token · time zone' },
      { name: 'pairing_codes', note: 'hash only · 10-minute expiry · attempts (5 burns it)' },
    ] },
    { key: 'scoring', label: 'Snapshots & scores', models: [
      { name: 'telemetry_events', note: 'every snapshot · UNIQUE (device, seq) · the raw JSON kept' },
      { name: 'wake_evaluations', note: 'one per snapshot · score, decision, streak · full breakdown JSON' },
    ] },
    { key: 'days', label: 'Days', models: [
      { name: 'days', note: 'keyed by (local date, device) · zone and window frozen · state' },
      { name: 'day_transitions', note: 'every state change: from, to, cause, the evaluation behind it' },
    ] },
    { key: 'config', label: 'Rules & settings', models: [
      { name: 'rule_versions', note: 'canonical JSON + SHA-256 · one active row (partial unique index)' },
      { name: 'settings', note: 'key / value' },
    ] },
    { key: 'delivery', label: 'Pushes', models: [
      { name: 'push_notifications', note: 'every push sent · ticket and receipt status · never the token' },
    ] },
  ],
  enums: [
    { name: 'EvaluationDecision', count: 6 },
    { name: 'DayState', count: 5 },
    { name: 'TransitionCause', count: 5 },
    { name: 'ReceiptStatus', count: 5 },
    { name: 'WakeSource', count: 4 },
    { name: 'BatteryState', count: 4 },
    { name: 'PedometerAuth', count: 4 },
    { name: 'PushKind', count: 4 },
    { name: 'WalkingConf', count: 3 },
    { name: 'AppState', count: 3 },
    { name: 'DayKind', count: 3 },
    { name: 'DeviceStatus', count: 2 },
    { name: 'RuleSource', count: 2 },
    { name: 'EvaluationGate', count: 2 },
    { name: 'TicketStatus', count: 2 },
  ],
  // Alembic migrations (git history): 0001 in #23, 0002 in #29
  growth: [
    { when: 'Oct 18', models: 8 },
    { when: 'Oct 20', models: 9 },
  ],
  growthLabel: 'Tables, by migration',
  migrations: 2,
};

/* ── how it was built — the git history and CI in numbers ─────────────── */
export const BUILD = {
  prs: { allen: 20, dependabot: 3 },
  totals: [
    { value: '23', label: 'merged pull requests (20 by Allen, 3 Dependabot)' },
    { value: '34', label: 'architecture decision records' },
    { value: '9.7k', label: 'lines of API Python' },
    { value: '12.7k', label: 'lines of API tests' },
  ],
  // .github/workflows/ci.yml (four jobs on every push and PR) + ios-build.yml
  ci: [
    { name: 'api', when: 'every push · PR', steps: ['ruff', 'pyright strict', 'pytest · wake ≥ 90%', 'bandit', 'config validate', 'openapi.json current', 'semgrep'] },
    { name: 'mobile', when: 'every push · PR', steps: ['schema.d.ts current', 'biome', 'tsc', 'jest', 'expo-doctor', 'expo export'] },
    { name: 'renderer', when: 'every push · PR', steps: ['biome', 'tsc', 'vitest', 'still smoke render'] },
    { name: 'secrets', when: 'every push · PR', steps: ['gitleaks'] },
    { name: 'ios-build', when: 'weekly · manual', steps: ['Simulator build', 'swift test'] },
  ],
  // the counts the repo records at T2.2 (docs/plans/T2.2-plan.md)
  suites: [
    { value: '636', label: 'API tests (pytest)' },
    { value: '74', label: 'mobile tests (Jest)' },
    { value: '40', label: 'renderer tests (Vitest)' },
    { value: '40', label: 'Swift XCTests' },
  ],
};

/* ── the page's own copy ─────────────────────────────────────────────────── */
export const COPY = {
  outcome:
    'A wake detector for one person: an iPhone’s steps, unlocks and charger, scored on a MacBook to decide whether he is really up. The engine is built and tested; the morning reel it will trigger is planned.',
  status: 'In progress · engine built, reel planned',
  figureCaption: 'One test morning, scored rule by rule',
  before: [
    'An alarm knows the time, not whether you are up',
    'A 3 a.m. glance at the phone looks just like getting up',
    'iOS gives apps no unlock event and no background loop to watch for one',
    'Tuning a wake rule would be guesswork',
  ],
  after: [
    'Six signals — steps, walking, unlocked, off the charger, steps today, opening the app — add up to one score out of 100',
    'Outside the morning window every snapshot scores 0, and it takes two high ticks in a row, or one strong one',
    'The server compares each snapshot with the last: charger just unplugged, unlocked twice running',
    'Every score is stored with its breakdown and rule version, and past mornings can be re-scored under new rules',
  ],
  // the honest roadmap — docs/11-implementation-plan.md, M2–M6
  next: [
    'Finish the phone: the telemetry sampler and its on-phone outbox (T2.3), then silent-push handling proven on a physical iPhone — a tick answered within 60 seconds while it is locked (T2.4).',
    'The content pipeline (M3): fetch and dedupe overnight AI papers and news, then write a one-minute script with a local language model, with a template fallback.',
    'The media pipeline (M4): local text-to-speech, word-timed captions and the full Remotion scenes — today only the cover scene renders.',
    'Delivery (M5): signed media links, the “reel ready” push on confirm or fallback, and the in-app player.',
    'Then tune the rules on seven real mornings (M6) — the target is a median confirm within 10 minutes of actually waking, with zero early confirms.',
  ],
};
