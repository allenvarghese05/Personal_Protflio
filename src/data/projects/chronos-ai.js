/**
 * chronos-ai — the project's wall card, brief data and case-study copy.
 * Facts only from the project's own repository (private; main at c762861,
 * 2026-10-28). In progress: the wake-detection backend is built and tested,
 * the phone side is partly built (Simulator only), the news-reel pipeline is
 * planned. The case study's detail lives in src/data/studies/chronos-ai.js.
 */
export const project = {
  id: 'chronos-ai',
  kind: 'current',
  cardBadge: 'IN PROGRESS',
  badge: 'PERSONAL SYSTEM · IN PROGRESS',
  label: 'Chronos AI',
  subtitle:
    'A wake detector for one person. An iPhone reports motion and phone state, and a server on a MacBook scores whether I’m really up. The engine is built; the news reel is planned.',
  role: 'Solo engineer',
  company: 'Personal project',
  dateRange: 'Oct 2026 to now',
  // the repository is private (docs/01-decisions.md D20), so no public link
  repo: null,
  live: null,
  description:
    'A single-user morning system. During a morning window, a FastAPI server on a MacBook sends the iPhone a silent push every five minutes. The phone is meant to answer with steps, motion and phone state, and the server scores them with an explainable, versioned rule set to decide whether its owner is really up. The scoring engine, scheduler, ingestion API, pairing and data model are built and covered by 636 tests. The phone side is partly built and has only run in the iOS Simulator. The planned “Morning Reel”, a one-minute news video made with local models, is not built yet.',
  tags: ['Python 3.12', 'FastAPI', 'SQLite', 'Expo + Swift', 'iOS'],
  metrics: [
    { value: '636', label: 'API tests passing' },
    { value: '11', label: 'Golden test mornings, 31 scripted ticks' },
    { value: '20 / 46', label: 'Planned tasks merged, reel not built' },
    { value: '≥ 90%', label: 'Wake-engine coverage, gated in CI' },
  ],
  primaryStack: ['Python 3.12', 'FastAPI', 'SQLModel + SQLite', 'Expo (React Native)', 'Swift · CoreMotion', 'Expo Push'],
  secondaryStack: ['Pydantic 2', 'Alembic', 'Typer', 'httpx', 'pytest + Hypothesis', 'pyright (strict)', 'ruff', 'openapi-typescript', 'expo-secure-store', 'Remotion 4 (scaffold)', 'launchd', 'GitHub Actions'],
  keyDecisions: [
    {
      title: 'Motion permission denied: a wake can still confirm, but not too easily',
      body: 'With the pedometer denied, the three motion rules are skipped, and unlocked, charger and app-opened are reweighted to 35, 25 and 40. The maximum is still 100, and the validator rejects any reweight total over 100. Without opening the app the ceiling is 60, under the 70 line, so a denied day only confirms when the app is opened.',
    },
    {
      title: 'A rule change can’t rewrite yesterday’s score',
      body: 'Rules are content-addressed by the SHA-256 of their canonical JSON and activated in a savepoint. The same hash changes nothing, a new one becomes version n + 1, and only one row can be active. Every score stores its rule version and full breakdown, so stored mornings can be replayed under candidate rules.',
    },
    {
      title: 'A morning is a local day, even when the clocks change',
      body: 'A day starts at 03:00 in the phone’s own time zone, so a 01:30 tick belongs to the night before. Window times that do not exist on spring-forward days are binary-searched to the transition second. Ambiguous fall-back times take their first occurrence.',
    },
  ],
  // the git history, chapter by chapter (start / end are the merge dates on main)
  timeline: [
    { week: 'Oct 6', start: '2026-10-06', end: '2026-10-06', title: 'The plan', desc: '14 design docs and 30 decision records, the repo skeleton and the CI baseline.', done: true },
    { week: 'Oct 7–13', start: '2026-10-07', end: '2026-10-13', title: 'Three scaffolds', desc: 'FastAPI with SQLite and a CLI; the Expo dev-client with a Swift module stub; Remotion with one cover scene and a smoke render.', done: true },
    { week: 'Oct 18', start: '2026-10-18', end: '2026-10-18', title: 'Simulator & schema', desc: 'The dev-client running in the iOS Simulator; security-only Dependabot; eight tables and migration 0001.', done: true },
    { week: 'Oct 18–19', start: '2026-10-18', end: '2026-10-19', title: 'The wake engine', desc: 'Pairing and auth; the window and DST; versioned rules; the scorer with 11 golden mornings and property tests.', done: true },
    { week: 'Oct 20–21', start: '2026-10-20', end: '2026-10-21', title: 'Ingest & scheduler', desc: 'Telemetry and the day state machine; the scheduler and Expo push; mobile types generated from OpenAPI; laptop ops; replay and the nightly report.', done: true },
    { week: 'Oct 26–28', start: '2026-10-26', end: '2026-10-28', title: 'The phone side', desc: 'The Swift sensor module with 40 XCTests; the pairing screen, Keychain storage and the generated API client.', done: true },
  ],
  architectureGraph: {
    nodes: [
      { id: 'scoring', label: 'Wake scorer', description: 'evaluate(signals, rules, now, ctx) is a pure function: window gate, server-derived facts, six rules, two penalties, clamp to 0–100, the two-in-a-row streak, the decision. 11 golden mornings and 7 property tests pin it.', category: 'workflow', importance: 'center', x: 55, y: 52 },
      { id: 'api', label: 'FastAPI service', description: '11 paths and 13 operations under /v1, errors as RFC 9457 problem+json. Runs on the MacBook on the home network only, never in the cloud.', category: 'core', importance: 'primary', x: 30, y: 22 },
      { id: 'auth', label: 'Pairing & auth', description: 'An 8-character pairing code from a 32-symbol alphabet, stored as a SHA-256, valid 10 minutes, burned after 5 wrong tries, compared in constant time. Then a 256-bit bearer token, stored only as a hash. Rate limits: pairing 5 a minute, telemetry 30.', category: 'auth', importance: 'primary', x: 30, y: 42 },
      { id: 'ingest', label: 'Telemetry ingest', description: 'POST /v1/telemetry: a 64 KiB cap, a strict schema, a 300-second clock-skew check before any write, idempotent on (device, seq), then score, store and move the day in one commit. The phone doesn’t send yet (T2.3).', category: 'workflow', importance: 'primary', x: 30, y: 62 },
      { id: 'scheduler', label: 'Scheduler', description: 'A pure planner: plan(now, day) returns exactly one action (start monitoring, send tick n, fall back, or nothing). A 60-second loop with an injectable clock runs it. It checks push receipts every 15 minutes and writes the nightly report.', category: 'infrastructure', importance: 'primary', x: 30, y: 84 },
      { id: 'window', label: 'Window & local day', description: 'Weekday 06:00–11:00, weekend 08:00–14:00, with a 03:00 day boundary. Spring-forward gaps are found to the second; fall-back folds take the first occurrence. Pure.', category: 'workflow', importance: 'secondary', x: 55, y: 14 },
      { id: 'rules', label: 'Rules & versions', description: 'Six rules and two penalties in YAML, validated on load (caps, unique ids, reweights adding up to 100 or less); content-addressed by SHA-256, one active version in the database. GET / PUT /v1/config/wake.', category: 'workflow', importance: 'secondary', x: 55, y: 33 },
      { id: 'state', label: 'Day state machine', description: 'Idle, then monitoring, then confirmed or fallback. Every move is an audit row with its cause. A delivered state exists, but nothing sets it yet (T5.2).', category: 'workflow', importance: 'secondary', x: 55, y: 71 },
      { id: 'replay', label: 'Replay & report', description: 'chronos wake replay re-scores stored mornings under candidate rules and reports confirm time against the annotated real wake time; a nightly Markdown report draws the score as a sparkline.', category: 'data', importance: 'secondary', x: 55, y: 89 },
      { id: 'sqlite', label: 'SQLite', description: '9 tables and 2 Alembic migrations, WAL mode, foreign keys on. Every snapshot, every score with its breakdown and rule version, every day transition, every push.', category: 'data', importance: 'primary', x: 78, y: 50 },
      { id: 'iphone', label: 'iPhone app', description: 'An Expo dev-client. Built: the pairing screen (code or QR), the session in the iOS Keychain, a generated API client and a debug home screen. Since T2.3 and T2.4 it also samples telemetry into a durable outbox and handles background wakes. Simulator only so far.', category: 'ui', importance: 'primary', x: 8, y: 22 },
      { id: 'sensors', label: 'chronos-sensors (Swift)', description: 'An Expo module in Swift: step and motion-activity history from CoreMotion, device state (unlocked, battery, low power) and background-refresh hooks. A pure Swift core turns motion change-points into seconds per activity; 40 XCTests.', category: 'infrastructure', importance: 'secondary', x: 8, y: 46 },
      { id: 'owner-cli', label: 'Owner · chronos CLI', description: 'A Typer CLI on the laptop with 12 commands: pair-code (prints a code and a terminal QR), device revoke, config validate / apply-yaml, wake replay, wake annotate, report build, doctor, openapi export.', category: 'core', importance: 'secondary', x: 8, y: 74 },
      { id: 'expo-push', label: 'Expo Push Service', description: 'The only outside service in the code. Silent ticks go out content-available at high priority, in chunks of up to 100, retried with backoff on 5xx and 429; the push token is never logged.', category: 'realtime', importance: 'secondary', x: 93, y: 30 },
      { id: 'launchd', label: 'launchd (macOS)', description: 'Keeps the API running and runs a deploy agent every 10 minutes that refuses to deploy from 45 minutes before the window until it closes. The scripts are merged; no live deployment is recorded.', category: 'infrastructure', importance: 'leaf', x: 93, y: 74 },
    ],
    edges: [
      { source: 'iphone', target: 'sensors', label: 'CoreMotion · device state', direction: 'two-way' },
      { source: 'iphone', target: 'api', label: 'pair · device/me', direction: 'two-way' },
      { source: 'owner-cli', target: 'sqlite', label: 'pairing code hash', direction: 'one-way' },
      { source: 'owner-cli', target: 'replay', label: 'wake replay · annotate', direction: 'one-way' },
      { source: 'api', target: 'auth', label: 'bearer · rate limit', direction: 'one-way' },
      { source: 'api', target: 'ingest', label: 'POST /v1/telemetry', direction: 'one-way' },
      { source: 'api', target: 'rules', label: '/v1/config/wake', direction: 'two-way' },
      { source: 'auth', target: 'sqlite', label: 'token hashes', direction: 'two-way' },
      { source: 'ingest', target: 'window', label: 'local date · gate', direction: 'one-way' },
      { source: 'ingest', target: 'scoring', label: 'evaluate()', direction: 'two-way' },
      { source: 'scoring', target: 'rules', label: 'the active rule set', direction: 'one-way' },
      { source: 'ingest', target: 'state', label: 'apply()', direction: 'one-way' },
      { source: 'ingest', target: 'sqlite', label: 'event + evaluation, one commit', direction: 'one-way' },
      { source: 'state', target: 'sqlite', label: 'day + transition rows', direction: 'one-way' },
      { source: 'rules', target: 'sqlite', label: 'versions by SHA-256', direction: 'two-way' },
      { source: 'scheduler', target: 'window', label: 'tick instants', direction: 'one-way' },
      { source: 'scheduler', target: 'state', label: 'start · fallback', direction: 'one-way' },
      { source: 'scheduler', target: 'expo-push', label: 'silent tick', direction: 'one-way' },
      { source: 'scheduler', target: 'sqlite', label: 'push_notifications', direction: 'one-way' },
      { source: 'expo-push', target: 'iphone', label: 'silent push (handler: T2.4)', direction: 'one-way' },
      { source: 'replay', target: 'scoring', label: 're-score', direction: 'one-way' },
      { source: 'replay', target: 'sqlite', label: 'stored mornings', direction: 'one-way' },
      { source: 'launchd', target: 'api', label: 'keep alive · deploy', direction: 'one-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'private', shots: [] },
  live: null,
  problem:
    'An alarm goes off at a fixed time whether or not you are up, and a phone check at 3 a.m. looks the same as getting up. Chronos is a personal morning system that uses the phone’s own signals to decide when its one user is really awake, which is when a morning briefing should arrive.',
  built:
    'Built so far: a FastAPI service for a MacBook that scores phone snapshots with an explainable, versioned rule set. It runs the morning on a pure scheduler with silent pushes, stores every score with its breakdown, and replays past mornings under new rules. The phone side is also in place (Swift sensor module, pairing, a telemetry outbox and background wake handling), but so far it has only run in the iOS Simulator. The “Morning Reel” news video the engine is meant to trigger is designed, not built.',
  how: [
    'Six signals add up to a score out of 100. Two high ticks in a row (70 or more, at most 12 minutes apart) or one strong tick (85 or more) confirms. Outside the morning window everything scores 0.',
    'The scorer is a pure function, checked against 11 golden mornings (31 scripted ticks) and 7 property tests.',
    'Rules are content-addressed by SHA-256. Every score keeps its rule version, so past mornings can be replayed under new rules.',
    'A pure scheduler plans one action at a time (start, tick, fall back). Tests simulated it through a full 60-tick weekday.',
  ],
  next: [],
};
