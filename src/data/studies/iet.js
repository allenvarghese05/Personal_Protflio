/**
 * The Church Building Application System case study — every fact the page
 * shows, in one place. Components only render this; change copy here.
 *
 * Checked against the repository itself (github.com/allen355/church-building-system,
 * main at PR #40, 2026-10-23): prisma/schema.prisma, src/lib/workflow/engine.ts,
 * src/lib/config/*, docs/PERFORMANCE.md, docs/SECURITY.md, docs/MISSION_CONTROL.md,
 * docs/CLIENT_DECISIONS.md and the git history. Where a number is a measurement,
 * the conditions it was measured under travel with it (PERF.setup).
 * Items marked TODO(allen) come from outside the repo and are worth a check.
 */

/* ── who acts — the five people in the chain (the approval stack) ─────────── */
// tier index → used by the stack and the lifecycle to light the right slab.
// `pop` is the organisation's size, not something the code knows —
// TODO(allen): confirm the head counts with the client.
export const ROLES = [
  { key: 'pastor', num: '01', role: 'Pastor', verb: 'applies · builds · reports', pop: '3,000+ pastors' },
  { key: 'division', num: '02', role: 'Division Leader', verb: 'applies for the divisions they lead', pop: '~150 leaders' },
  { key: 'hq', num: '03', role: 'HQ Team', verb: 'reviews · checks every phase', pop: 'national HQ' },
  { key: 'president', num: '04', role: 'President', verb: 'approves · sets the amount', pop: '1 president' },
  { key: 'finance', num: '05', role: 'Finance', verb: 'releases each tranche', pop: 'finance board' },
];

/** "Next action by" → the stack tier(s) it lights. The applicant is the
 *  Pastor or a Division Leader acting for a division they lead. */
export const ACTORS = {
  applicant: { label: 'Applicant', tiers: [0, 1] },
  hq: { label: 'HQ', tiers: [2] },
  president: { label: 'President', tiers: [3] },
  finance: { label: 'Finance', tiers: [4] },
  system: { label: 'The daily job', tiers: [] },
  none: { label: 'No one — terminal', tiers: [] },
};

/* ── the lifecycle — the ApplicationStatus enum (21 values) ────────────────── */
/**
 * `main` statuses form the line, in order (14). Branch statuses hang off a
 * main status (`from`) and, where they lead somewhere, say where (`to`).
 * `kind` styles a branch: loop (back into the line), reject (terminal),
 * hold (paused, resumes where it was), flag (a marker, not a move) and
 * reserved (in the enum, but nothing writes it).
 * `server: false` marks the four values the engine never writes — the draft
 * lives on the device, "delayed" is a flag, two are legacy/reserved — so the
 * page can say so instead of pretending all 21 are stops.
 * `stage` groups the line; stages are drawn in this order.
 */
export const STAGES = [
  { key: 'apply', label: 'Apply' },
  { key: 'review', label: 'HQ review' },
  { key: 'approve', label: 'Approval' },
  { key: 'phase1', label: 'Phase 1' },
  { key: 'phase2', label: 'Phase 2' },
  { key: 'phase3', label: 'Phase 3' },
  { key: 'after', label: 'Completion' },
];

export const STATUSES = [
  { id: 'DRAFT', label: 'Draft', stage: 'apply', actor: 'applicant', main: true, server: false, note: 'Never touches the server: the 9-page form autosaves on the device every 30 s (localStorage) until it’s sent; files picked offline, and an application sent offline, wait in IndexedDB.' },
  { id: 'SUBMITTED', label: 'Submitted', stage: 'apply', actor: 'hq', main: true, note: 'Created directly as Submitted (APP-YYYY-NNNNN) — and the rules in force that day are frozen onto it.' },
  { id: 'UNDER_REVIEW', label: 'Under review', stage: 'review', actor: 'hq', main: true, note: 'HQ starts the review: approve, reject, or flag the exact fields that need changing.' },
  { id: 'CHANGES_REQUESTED', label: 'Changes requested', stage: 'review', actor: 'applicant', main: false, from: 'UNDER_REVIEW', to: 'SUBMITTED', kind: 'loop', note: 'HQ picks fields from 67 across nine pages; the applicant fixes them and resubmits — judged by the original rules. No limit on rounds.' },
  { id: 'REJECTED_BY_HQ', label: 'Rejected by HQ', stage: 'review', actor: 'none', main: false, from: 'UNDER_REVIEW', kind: 'reject', note: 'Terminal, with HQ’s reason on the record.' },
  { id: 'HQ_APPROVED', label: 'HQ approved', stage: 'approve', actor: 'president', main: true, note: 'Passed up to the President.' },
  { id: 'REJECTED_BY_PRESIDENT', label: 'Rejected by President', stage: 'approve', actor: 'none', main: false, from: 'HQ_APPROVED', kind: 'reject', note: 'Terminal, with the President’s reason.' },
  { id: 'PRESIDENT_APPROVED', label: 'President approved', stage: 'approve', actor: 'finance', main: true, note: 'The President approves the requested amount, or less with a reason — and that number caps every release that follows.' },
  { id: 'ON_HOLD', label: 'On hold', stage: 'approve', actor: 'president', main: false, from: 'PRESIDENT_APPROVED', kind: 'hold', note: 'The President can pause a project from any of 15 statuses; Resume returns it to exactly where it was (heldFromStatus).' },
  { id: 'PHASE_1_IN_PROGRESS', label: 'Phase 1 · building', stage: 'phase1', actor: 'applicant', main: true, note: 'Finance releases the first tranche and a 4-month Phase 1 deadline starts (configurable). The applicant builds and uploads photos.' },
  { id: 'DELAYED', label: 'Delayed', stage: 'phase1', actor: 'system', main: false, server: false, from: 'PHASE_1_IN_PROGRESS', kind: 'flag', note: 'In the enum, never set. Past the deadline the daily job raises an isDelayed flag instead, so the project keeps its real status; an extension clears it.' },
  { id: 'FUNDS_RELEASED', label: 'Funds released', stage: 'phase1', actor: 'none', main: false, server: false, from: 'PHASE_1_IN_PROGRESS', kind: 'reserved', note: 'Legacy: how Phase 1 was marked before the engine split funding from building. Still read as Phase 1, never written.' },
  { id: 'PHASE_1_REVIEW', label: 'Phase 1 review', stage: 'phase1', actor: 'hq', main: true, note: 'HQ reviews the photos. Approve, and Phase 2’s money is pending; return it, and the rejected set is kept as a PhaseReview.' },
  { id: 'PHASE_2_FUNDS_PENDING', label: 'Phase 2 · funds pending', stage: 'phase2', actor: 'finance', main: true, note: 'Finance releases the next tranche — any amount up to approved minus released.' },
  { id: 'PHASE_2_IN_PROGRESS', label: 'Phase 2 · building', stage: 'phase2', actor: 'applicant', main: true, note: 'Building again, with photo proof before it can be handed in.' },
  { id: 'PHASE_2_REVIEW', label: 'Phase 2 review', stage: 'phase2', actor: 'hq', main: true, note: 'HQ approves the phase or sends it back.' },
  { id: 'PHASE_3_FUNDS_PENDING', label: 'Phase 3 · funds pending', stage: 'phase3', actor: 'finance', main: true, note: 'The last release. The total can never pass the approved amount — not even with two clicks at once.' },
  { id: 'PHASE_3_IN_PROGRESS', label: 'Phase 3 · building', stage: 'phase3', actor: 'applicant', main: true, note: 'The final stretch of building and photos.' },
  { id: 'PHASE_3_REVIEW', label: 'Phase 3 review', stage: 'phase3', actor: 'hq', main: true, note: 'Approving Phase 3 completes the project.' },
  { id: 'COMPLETED', label: 'Completed', stage: 'after', actor: 'applicant', main: true, note: 'In the same transaction a church building becomes a registered church, and six bi-annual reports (three years) are scheduled.' },
  { id: 'CLOSED', label: 'Closed', stage: 'after', actor: 'none', main: false, server: false, from: 'COMPLETED', kind: 'reserved', note: 'Reserved for archiving finished projects; no transition writes it yet.' },
];

/** The audit trail the lifecycle replays — one line per transition on the
 *  happy path. Illustrative entries; the real log is ApplicationStatusHistory
 *  plus an AuditLog row per action. `action` is the engine action that moved it. */
export const AUDIT = [
  { to: 'DRAFT', by: 'pastor.r.kumar', at: '2026-10-12', extra: 'saved on this device' },
  { to: 'SUBMITTED', by: 'pastor.r.kumar', at: '2026-10-14', extra: 'APP-2026-00041 · rules snapshot frozen' },
  { to: 'UNDER_REVIEW', by: 'hq.review', at: '2026-10-15', action: 'START_REVIEW' },
  { to: 'HQ_APPROVED', by: 'hq.review', at: '2026-10-21', action: 'HQ_APPROVE' },
  { to: 'PRESIDENT_APPROVED', by: 'president', at: '2026-10-28', action: 'PRESIDENT_APPROVE', extra: '₹4,50,000 of ₹4,80,000 requested · reason given' },
  { to: 'PHASE_1_IN_PROGRESS', by: 'finance', at: '2026-11-03', action: 'RELEASE_FUNDS', extra: 'phase 1 · ₹1,50,000 · deadline in 4 months' },
  { to: 'PHASE_1_REVIEW', by: 'pastor.r.kumar', at: '2027-02-24', action: 'SUBMIT_FOR_REVIEW', extra: '14 photos' },
  { to: 'PHASE_2_FUNDS_PENDING', by: 'hq.review', at: '2027-03-02', action: 'APPROVE_PHASE' },
  { to: 'PHASE_2_IN_PROGRESS', by: 'finance', at: '2027-03-06', action: 'RELEASE_FUNDS', extra: 'phase 2 · ₹1,50,000' },
  { to: 'PHASE_2_REVIEW', by: 'pastor.r.kumar', at: '2027-06-18', action: 'SUBMIT_FOR_REVIEW', extra: '22 photos' },
  { to: 'PHASE_3_FUNDS_PENDING', by: 'hq.review', at: '2027-06-25', action: 'APPROVE_PHASE' },
  { to: 'PHASE_3_IN_PROGRESS', by: 'finance', at: '2027-07-01', action: 'RELEASE_FUNDS', extra: 'phase 3 · ₹1,50,000 · ₹0 left to release' },
  { to: 'PHASE_3_REVIEW', by: 'pastor.r.kumar', at: '2027-10-09', action: 'SUBMIT_FOR_REVIEW', extra: '18 photos' },
  { to: 'COMPLETED', by: 'hq.review', at: '2027-10-16', action: 'APPROVE_PHASE', extra: 'church registered · 6 bi-annual reports scheduled' },
];

/** The engine in numbers — src/lib/workflow/engine.ts. */
export const ENGINE = {
  actions: [
    'START_REVIEW', 'REQUEST_CHANGES', 'HQ_APPROVE', 'HQ_REJECT', 'PRESIDENT_APPROVE', 'PRESIDENT_REJECT', 'RELEASE_FUNDS',
    'SUBMIT_FOR_REVIEW', 'APPROVE_PHASE', 'REJECT_PHASE', 'HOLD', 'RESUME', 'GRANT_EXTENSION', 'ADJUST_APPROVED_AMOUNT',
  ],
  // the one place a status changes (apart from the applicant's resubmission)
  file: 'src/lib/workflow/engine.ts',
};

/* ── three hard problems (the key decisions) ──────────────────────────────── */
export const DECISIONS = [
  {
    id: 'tx',
    kicker: 'Money',
    title: 'Money moves in one transaction — or not at all',
    problem:
      'Releasing a tranche touches five records, and two people can press at once: Finance double-clicks, or the President changes the approved amount mid-release. A half-applied release — or two releases racing past the cap — puts money out with no record that matches it.',
    decision:
      'Every engine action is one Prisma transaction around a compare-and-set: update the row only WHERE its status is still the one this request read — and, for a release or an amount change, the approved amount is still the one that was checked. Zero rows means a concurrent request got there first — a 409, nothing written (if the first had already committed, the status check turns the second away with a 400). One row means the status, the FundRelease, the next ConstructionPhase, the history row and the audit row commit together.',
    tradeoff:
      'Optimistic, not locking: no row lock is taken, and the rare loser of a race gets “changed by someone else — refresh” (or a 400 once the status has moved on) instead of waiting. Integration tests race a double-click and a release against a top-up; released never exceeds approved.',
    // the writes one release makes, in order — the visual ticks these
    steps: ['Status moved (compare-and-set)', 'FundRelease written', 'ConstructionPhase opened', 'ApplicationStatusHistory row', 'AuditLog row'],
    // what each scenario does to the writes above
    scenarios: [
      { key: 'commit', label: 'Release', outcome: 'commit', readout: 'One row matched — all five writes commit together.' },
      { key: 'fail', label: 'Fail mid-way', outcome: 'rollback', failAt: 3, readout: 'The history write throws — every write rolls back. No money moved.' },
      { key: 'race', label: 'Double-click', outcome: 'conflict', readout: 'The second click matches 0 rows — status already moved. 409, nothing written.' },
    ],
    code: {
      file: 'src/lib/workflow/engine.ts',
      lang: 'ts',
      body: `await prisma.$transaction(async (tx) => {
  // optimistic concurrency: only succeeds if nobody changed it meanwhile
  const updated = await tx.application.updateMany({
    where: { ...guard, id: app.id, status: fromStatus }, // guard: { approvedAmount }
    data: { ...data, status: toStatus },
  });
  if (updated.count === 0) {
    throw new WorkflowError(409, 'This application was just changed by someone else.');
  }
  await effects(tx); // FundRelease + the next ConstructionPhase
  await tx.applicationStatusHistory.create({ data: { applicationId, fromStatus, toStatus, changedById } });
  await tx.auditLog.create({ data: { action: \`APPLICATION_\${action}\`, oldValues, newValues } });
}, { timeout: 10_000 });
// notifications go out after the response — they never block or undo the action`,
    },
  },
  {
    id: 'snapshot',
    kicker: 'Rules',
    title: 'A rule change never rewrites the past',
    problem:
      'Super Admins can now change the rules themselves — required fields, documents, site-photo minimums. But an application submitted last month, or one sent back for changes, must not start failing rules that didn’t exist when the pastor filled it in.',
    decision:
      'On submit, the server freezes the application rules, the field policy and the document types onto the row (requirementsSnapshot). One function — applicationRequirements(snapshot, config) — answers “what is this judged by?” for the edit form, the resubmission and HQ’s review screen alike.',
    tradeoff:
      'A little JSON per application, and old snapshots must stay readable as the schema grows (a snapshot from before the field policy existed falls back to the defaults). In exchange, tightening an application rule only ever affects new applications.',
    // the visual: one setting changes; an old application and a new one are judged
    scenario: {
      setting: 'Minimum construction site photos',
      key: 'application.minSitePhotos',
      before: 3,
      after: 5,
      changedOn: 'Oct 22',
      apps: [
        { id: 'APP-2026-00041', submitted: 'Oct 14', photos: 3, when: 'before' },
        { id: 'APP-2026-00057', submitted: 'Oct 23', photos: 3, when: 'after' },
      ],
    },
    code: {
      file: 'src/lib/application-requirements.ts',
      lang: 'ts',
      body: `// on submit — the rules in force are frozen onto the application
requirementsSnapshot: { ...rules, fieldPolicy, documentTypes },

// everywhere it is judged: edit form, resubmission, HQ review
export function applicationRequirements(snapshot, config) {
  if (!snapshot) return today(config);        // created before snapshots existed
  const rules = mergeSection('application', snapshot);
  return {
    rules: rules.ok ? rules.value : config.application,
    fieldPolicy: snapshot.fieldPolicy ?? {},  // pre-MC-4: the defaults
    documentTypes: ordered(snapshot.documentTypes ?? {}),
  };
}`,
    },
  },
  {
    id: 'rbac',
    kicker: 'Access',
    title: 'Permissions live at the API, not the UI',
    problem:
      'Six roles see six different dashboards — but hiding a button is not access control, and an id in a URL is an invitation. Anyone can call an API route directly, with any application id or file path.',
    decision:
      'Every route opens the same way: requireUser() reads the session, parseBody() validates the JSON with zod, then one rule per entity — canAccessApplication, the divisions a leader leads, the uploader’s id at the front of every file path — decides whether this user may touch this row. The engine re-checks role and status before anything moves.',
    tradeoff:
      'The same few lines at the top of every route, held by convention and review — so the UI is a convenience, never the boundary. A pastor asking for someone else’s application, or attaching their land deed, gets a 403, not a signed link.',
    path: [
      { key: 'ui', label: 'UI guard', note: 'hides what you can’t do' },
      { key: 'route', label: 'Edge proxy', note: 'Origin check · CSP nonce' },
      { key: 'jwt', label: 'requireUser()', note: 'HS256 session · httpOnly cookie' },
      { key: 'role', label: 'parseBody()', note: 'zod at the boundary' },
      { key: 'own', label: 'Row access', note: 'own · led division · file owner' },
      { key: 'handler', label: 'Engine', note: 'role + status re-checked' },
    ],
    code: {
      file: 'src/app/api/applications/[id]/route.ts',
      lang: 'ts',
      body: `export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await requireUser();              // session cookie → user + role
  if (auth.error) return auth.error;             // 401
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) return notFound();
  // one rule, shared by detail, phases and file signing
  if (!canAccessApplication(auth.user, application)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  return ok(await withSignedLinks(application)); // signed only after the check
}`,
    },
  },
];

/* ── Mission Control — the Super Admin control plane (MC-0 … MC-7) ────────── */
export const CONTROL = {
  // the idea in one line
  principle: 'Defaults live in code. Overrides live in the database. The screen is generated from the schema.',
  stats: [
    { value: '13', label: 'config sections' },
    { value: '27', label: 'form fields: required · optional · hidden' },
    { value: '7', label: 'PRs · MC-0 to MC-7' },
    { value: '0', label: 'deploys to change a rule' },
  ],
  // schema → screen: real lines from src/lib/config/schema.ts and the widget
  // the introspector (src/lib/settings/introspect.ts) draws for each
  schema: [
    { key: 'phase1DeadlineMonths', code: 'phase1DeadlineMonths: int(1, 36).default(4)', kind: 'number', label: 'Phase 1 deadline', unit: 'months', value: 4, min: 1, max: 36 },
    { key: 'minSitePhotos', code: 'minSitePhotos: int(0, 20).default(3)', kind: 'number', label: 'Minimum site photos', unit: 'photos', value: 3, min: 0, max: 20 },
    { key: 'allowExternalLinks', code: 'allowExternalLinks: z.boolean().default(true)', kind: 'boolean', label: 'Accept a web link instead of an upload', value: true },
    { key: 'nearestChurchMinKm', code: 'nearestChurchMinKm: z.number().min(0).max(100).default(8)', kind: 'number', label: 'Nearest church closer than this needs a justification', unit: 'km', value: 8, min: 0, max: 100 },
    { key: 'requiredDocuments', code: 'requiredDocuments: z.object({ landDeedDoc: z.boolean(), … })', kind: 'toggles', label: 'Required documents', value: [['Land deed', true], ['Building permit', true], ['Building plan', false]] },
    { key: 'allowedTypes', code: "allowedTypes: z.array(z.enum(['image/jpeg', 'image/png', 'application/pdf']))", kind: 'multi', label: 'Allowed upload types', value: [['JPEG', true], ['PNG', true], ['PDF', true]] },
  ],
  // the change history — per field, old → new, undo down to one toggle
  history: [
    { field: 'Phase 1 deadline', from: '4 months', to: '6 months', who: 'superadmin', when: 'Oct 22 · 14:02', state: 'undo' },
    { field: 'Minimum site photos', from: '3', to: '5', who: 'superadmin', when: 'Oct 22 · 11:40', state: 'undo' },
    { field: 'Accept a web link instead of an upload', from: 'On', to: 'Off', who: 'superadmin', when: 'Oct 21 · 17:15', state: 'undo' },
    { field: 'Accept a web link instead of an upload', from: 'Off', to: 'On', who: 'superadmin', when: 'Oct 21 · 16:58', state: 'superseded' },
  ],
  steps: [
    { id: 'MC-0', pr: '#27', title: 'Flag & guard', body: 'Feature flag, Super-Admin-only route group — a 404, not a 403, for everyone else.', kind: 'admin' },
    { id: 'MC-1', pr: '#27', title: 'Generated editor', body: 'One editor for every section, drawn by introspecting the zod schema.', kind: 'admin' },
    { id: 'MC-2', pr: '#28', title: 'History & undo', body: 'Per-field old → new; undo writes the old value back as a new change.', kind: 'admin' },
    { id: 'MC-3', pr: '#28', title: 'People & places', body: 'Users, churches and divisions rebuilt on the design system.', kind: 'design' },
    { id: 'MC-4', pr: '#30', title: 'Field policy', body: '27 form fields: required, optional or hidden — on the form, the server and HQ’s picker.', kind: 'admin' },
    { id: 'MC-5', pr: '#31 · #33', title: 'Document types', body: 'Extra documents beside the built-in ones: upload, link or either; retired, never deleted.', kind: 'admin' },
    { id: 'MC-6', pr: '#29', title: 'Design system', body: '~190 palette classes mapped to tokens; a guard test forbids raw colours.', kind: 'design' },
    { id: 'MC-7', pr: '#32', title: 'On by default', body: 'Live for the Super Admin; the flag stays as a kill switch. One applicationRequirements().', kind: 'admin' },
  ],
  span: 'Oct 20 – 22, 2026',
  // two bugs found while building it — the kind of detail worth telling
  fixes: [
    {
      title: 'Two admins, one section, one lost save',
      before: '12 of 15',
      after: '0 of 10',
      unit: 'trials lost a save',
      body: 'Read-merge-write in app code dropped one of two concurrent saves. The merge moved into Postgres — one UPDATE with jsonb || — and a test now races ten pairs.',
    },
    {
      title: 'A save that took exactly 30 seconds to show',
      before: '30 s',
      after: 'instant',
      unit: 'until a saved setting shows',
      body: 'Next.js bundles each route separately, so the API route cleared its own copy of the cache while the page kept another for the full TTL. All four in-process caches moved to globalThis.',
    },
  ],
};

/* ── performance — docs/PERFORMANCE.md, commit 7005826 ─────────────────────── */
export const PERF = {
  setup: 'Dev measurements · warm routes, median of 3 runs (the transaction-pooler “before” column is a single run) · Philadelphia → Supabase in Sydney (ap-southeast-2) · Oct 3, 2026',
  // the endpoint the headline is about
  hero: {
    label: 'GET /api/analytics · all time · uncached',
    before: 146709, // transaction pooler, before
    after: 1278, // session pooler, after
    // the honest split: the same connection, before → after
    same: [
      { pooler: '6543', name: 'transaction pooler', before: 146709, after: 2849 },
      { pooler: '5432', name: 'session pooler', before: 31444, after: 1278 },
    ],
  },
  // where the time actually went
  causes: [
    { value: '3.6 ms', label: 'Postgres itself, running the login query (EXPLAIN ANALYZE)' },
    { value: '240–400 ms', label: 'one TCP connect, Philadelphia → Sydney' },
    { value: '~1,300 ms', label: 'one query through the transaction pooler — ~244 ms on the session pooler' },
    { value: '~100', label: 'queries the all-time report awaited one after another' },
  ],
  equation: ['sequential round trips', '×', 'round-trip time', '=', 'what users feel'],
  // the old all-time report, as the waves of round trips it waited on
  // (counted from the code at f72c68a: 16 KPI queries in sequence, 3 per
  // division, one aggregate per month since Jan 2020, 3 more)
  waves: {
    before: [
      { label: 'auth lookup', count: 1 },
      { label: 'KPI queries, one after another', count: 16 },
      { label: 'per division, 3 deep', count: 3 },
      { label: 'one aggregate per month since 2020', count: 82 },
      { label: 'the last three', count: 3 },
    ],
    after: [
      { label: 'auth lookup', count: 1 },
      { label: 'one Promise.all of 16 queries', count: 1, parallel: 16 },
    ],
  },
  fixes: [
    { title: 'One wave, not a hundred', body: 'Every independent query for a view goes into one Promise.all — the 16 KPI queries became one concurrent wave.' },
    { title: 'groupBy, not loops', body: 'The month-by-month loop became one groupBy(year, month); per-division and per-church loops became groupBys folded in JS. The query count stopped growing with months, divisions and churches.' },
    { title: 'JOINs and one signing call', body: 'Prisma relationJoins loads relations in the same query; ~9 sequential signed-URL calls became one createSignedUrls — application detail 2.6 s → 0.5 s.' },
    { title: 'The right connection', body: 'The transaction pooler can’t cache prepared statements. The session pooler, with connection_limit=5 so a concurrent wave can’t exhaust its 15 clients.' },
  ],
  // before → after per endpoint, both connections (ms)
  rows: [
    { label: 'Analytics · all time', b6543: 146709, a6543: 2849, b5432: 31444, a5432: 1278, hero: true },
    { label: 'Analytics · last 6 months', b6543: 39466, a6543: 2640, b5432: 7910, a5432: 1278 },
    { label: 'Admin dashboard page', b6543: 18786, a6543: 5776, b5432: 4533, a5432: 1928 },
    { label: 'Monthly reports list', b6543: 7131, a6543: 2614, b5432: 3048, a5432: 608 },
    { label: 'Application detail', b6543: 6816, a6543: 2613, b5432: 2626, a5432: 526 },
    { label: 'Bi-annual reports list', b6543: 5470, a6543: 2687, b5432: 2252, a5432: 528 },
    { label: 'Dashboard stats', b6543: 5119, a6543: 2638, b5432: 1744, a5432: 749 },
    { label: 'Sign in', b6543: 4389, a6543: 2600, b5432: 2036, a5432: 620 },
    { label: 'Applications list', b6543: 3942, a6543: 2761, b5432: 1336, a5432: 519 },
  ],
  // proof the rewrite changed nothing but the time
  proof: [
    { value: '110 / 110', label: 'API responses byte-identical before → after, across 5 roles' },
    { value: '252 / 252', label: 'analytics equivalence checks matched, old math → new, on 144 synthetic reports' },
  ],
  // what came after the rewrite (each measured on its own)
  later: [
    { value: '260 → 5 ms', label: 'the session lookup, with a 30 s per-user cache' },
    { value: '1 request', label: 'the dashboard: three browser hops became one server render (520–870 ms)' },
    { value: '893 ms', label: 'analytics today, all time and uncached — 4 queries in one Promise.all + the division list, 60 s cache (241 ms cached)' },
  ],
  // the guard that keeps it fast: scripts/tests/perf-budget.mjs, nightly in CI
  budget: [
    { value: '≤ 450 KB', label: 'JS · dashboard and applications' },
    { value: '≤ 650 KB', label: 'JS · analytics' },
    { value: '0', label: 'CSP violations or runtime errors' },
    { value: '< 10 s', label: 'to data on screen, no skeleton after first paint' },
  ],
};

/* ── security — docs/SECURITY.md and the CHU-27 … 33 audit ─────────────────── */
export const SECURITY = {
  // a request's path, outermost first — each layer and what it enforces
  layers: [
    { key: 'edge', label: 'Edge proxy', where: 'src/proxy.ts', items: ['A fresh CSP nonce per request', 'Origin must match Host on every mutation', 'Request id on every response'] },
    { key: 'headers', label: 'Headers', where: 'next.config.ts', items: ['HSTS, 1 year', 'X-Frame-Options DENY · nosniff', 'no-store on API and dashboard'] },
    { key: 'route', label: 'Route', where: 'requireUser · parseBody', items: ['Session JWT in an httpOnly cookie', 'Sign-in and password routes refuse anything but JSON', 'zod on every body'] },
    { key: 'row', label: 'Row', where: 'lib/auth/application-access.ts', items: ['canAccessApplication before any signed link', 'Leaders see only divisions they lead', 'File paths start with the uploader’s id'] },
    { key: 'engine', label: 'Engine', where: 'lib/workflow/engine.ts', items: ['Status + amount compare-and-set', 'One transaction per action', 'An audit row for every action'] },
    { key: 'db', label: 'Database', where: 'Postgres', items: ['Login lockout in one atomic statement', 'The last Super Admin, under a row lock', 'anon / authenticated roles: no grants at all'] },
    { key: 'files', label: 'Files', where: 'private bucket', items: ['1-hour signed links only', 'Type from magic bytes, never the browser', '200 MB per user per day'] },
  ],
  // send a request down the layers — where each one is stopped (`at` is a layer key)
  probes: [
    { key: 'ok', label: 'Your own application', at: null, result: '200 — every layer passed; the file links are signed for an hour.' },
    { key: 'csrf', label: 'Cross-site POST', at: 'edge', result: '403 · “Cross-site request refused” — the Origin doesn’t match the Host.' },
    { key: 'idor', label: 'Someone else’s application', at: 'row', result: '403 · “Access denied” — checked before any link is signed.' },
    { key: 'race', label: 'Two releases at once', at: 'engine', result: '409 — the second update matched 0 rows. Nothing written.' },
    { key: 'guess', label: 'Password guessing', at: 'db', result: '401, the same as every failure — and after 5 tries, a 15-minute pause.' },
    { key: 'renamed', label: 'A .txt renamed .jpg', at: 'files', result: 'Refused — no JPEG, PNG or PDF signature in its first bytes.' },
  ],
  // sign-in: every failure looks the same
  login: {
    title: 'Every failed sign-in looks the same',
    cases: [
      { key: 'unknown', label: 'Unknown email', note: 'still runs one statement and a dummy scrypt hash' },
      { key: 'wrong', label: 'Wrong password', note: 'the attempt was reserved before the check' },
      { key: 'locked', label: 'Paused account', note: '5 tries → 15 minutes, on the database clock' },
    ],
    response: '401 · “Invalid email or password.” · no Retry-After',
    facts: [
      'Attempt reserved before the password is checked — one atomic UPDATE … RETURNING, so a parallel burst can’t slip past the limit.',
      'scrypt with a per-user salt, compared in constant time.',
      '30 attempts per IP per hour on top of the per-account lock.',
      'A password change bumps sessionVersion — every other session signs out.',
    ],
  },
  // the audit tickets (CHU-27 … CHU-33, PRs #34–#40, merged Oct 23)
  audit: [
    { id: 'CHU-27', sev: 'C1', pr: '#35', found: 'The production seed created the Super Admin with a password committed to the repo.', fixed: 'Email from the environment; a random 14-character password, shown once, changed at first sign-in.' },
    { id: 'CHU-28', sev: 'C2', pr: '#36', found: 'A Super Admin could demote or deactivate their own account — or the last one standing.', fixed: 'Self-demotion refused; the last active Super Admin is checked under SELECT … FOR UPDATE, race-tested.' },
    { id: 'CHU-29', sev: 'H1', pr: '#37', found: 'Demo and CI seeds create known-password accounts in whatever database .env points at.', fixed: 'A seed guard: writes only in CI or to a named --target; protected databases, matched by project ref, are always refused.' },
    { id: 'CHU-30', sev: 'H2', pr: '#38', found: 'Emails matched case-sensitively — John.Doe@ and john.doe@ could be two accounts.', fixed: 'Stored lowercased, matched in any case, with the ILIKE wildcards _ % \\ escaped.' },
    { id: 'CHU-31', sev: 'H3', pr: '#39', found: 'Schema changes applied with prisma db push — no migration history.', fixed: 'Baseline migration 0_init (18 tables); CI fails any PR whose schema drifts from its migrations.' },
    { id: 'CHU-32', sev: 'H4', pr: '#34', found: 'The dependency audit failed on @prisma/client and would block every merge.', fixed: 'Allow-listed with a written reason and a review-by date; the real fix is the Prisma 7 upgrade.' },
    { id: 'CHU-33', sev: 'H5', pr: '#40', found: 'Uploads trusted the type the browser claimed — any bytes labelled image/jpeg were stored.', fixed: 'The type comes from the file’s magic bytes alone; anything unrecognised is refused.' },
  ],
  // file signatures the upload route accepts (src/app/api/upload/route.ts)
  signatures: [
    { type: 'JPEG', bytes: ['FF', 'D8', 'FF'], note: 'at byte 0' },
    { type: 'PNG', bytes: ['89', '50', '4E', '47'], note: 'at byte 0' },
    { type: 'PDF', bytes: ['25', '50', '44', '46'], note: '“%PDF” within the first 1,024 bytes' },
  ],
  // what used to get through: text, labelled image/jpeg by the browser
  refused: { name: 'notes.txt → photo.jpg', claimed: 'image/jpeg', bytes: ['68', '65', '6C', '6C'], note: '“hell…” — no signature, refused' },
  // holes found and closed before the audit — object-level access, the big ones
  earlier: [
    { when: 'Oct 3', text: 'The public sign-up route accepted role=SUPER_ADMIN.' },
    { when: 'Oct 3', text: 'The public anon key could read every table through Supabase’s Data API — User.passwordHash included.' },
    { when: 'Oct 5', text: 'Any pastor could submit any project’s phase.' },
    { when: 'Oct 6', text: 'Any signed-in user could open any church — with its pastor’s phone and email.' },
  ],
};

/* ── around the workflow — the systems that hang off the engine ────────────── */
// the recipient matrix exactly as src/lib/notifications/recipients.ts has it
export const AUDIENCES = ['OWNER', 'DIVISION_LEADER', 'HQ', 'PRESIDENT', 'FINANCE'];
export const NOTIFY_MATRIX = [
  ['APPLICATION_SUBMITTED', ['HQ', 'DIVISION_LEADER']],
  ['APPLICATION_RESUBMITTED', ['HQ', 'DIVISION_LEADER']],
  ['APPLICATION_HQ_APPROVED', ['PRESIDENT', 'DIVISION_LEADER']],
  ['APPLICATION_APPROVED', ['OWNER', 'FINANCE', 'DIVISION_LEADER']],
  ['APPLICATION_REJECTED', ['OWNER', 'HQ', 'PRESIDENT', 'DIVISION_LEADER']],
  ['CHANGES_REQUESTED', ['OWNER', 'DIVISION_LEADER']],
  ['FUNDS_RELEASED', ['OWNER', 'HQ', 'DIVISION_LEADER']],
  ['PHASE_SUBMITTED', ['HQ', 'DIVISION_LEADER']],
  ['PHASE_APPROVED', ['OWNER', 'FINANCE', 'DIVISION_LEADER']],
  ['PHASE_RETURNED', ['OWNER', 'DIVISION_LEADER']],
  ['PROJECT_ON_HOLD', ['OWNER', 'HQ', 'DIVISION_LEADER']],
  ['PROJECT_RESUMED', ['OWNER', 'HQ', 'DIVISION_LEADER']],
  ['PROJECT_COMPLETED', ['OWNER', 'HQ', 'DIVISION_LEADER']],
  ['DEADLINE_EXTENDED', ['OWNER', 'HQ', 'DIVISION_LEADER']],
  ['APPROVED_AMOUNT_CHANGED', ['OWNER', 'FINANCE', 'HQ', 'DIVISION_LEADER']],
  ['PROJECT_DELAYED', ['OWNER', 'HQ', 'DIVISION_LEADER']],
  ['REPORT_SUBMITTED', ['HQ', 'DIVISION_LEADER']],
  ['REPORT_REVISION_REQUESTED', ['OWNER']],
  ['REPORT_APPROVED', ['OWNER']],
  ['REPORT_DUE_SOON', ['OWNER']],
  ['REPORT_OVERDUE', ['OWNER', 'HQ', 'DIVISION_LEADER']],
  ['REVISION_OVERDUE', ['OWNER', 'HQ', 'DIVISION_LEADER']],
  ['REPORTS_CREATED', ['OWNER']],
  ['DIVISION_BAN_LIFTED', ['HQ', 'DIVISION_LEADER']],
];

export const PLATFORM = [
  {
    key: 'analytics',
    label: 'Analytics',
    title: 'One dashboard, five scopes',
    body: 'Organisation, division, church, pastor or project — one pure, unit-tested access rule per role and scope, four queries in one Promise.all, a 60-second cache, and an Excel export of exactly the view on screen.',
    scopes: ['Organisation', 'Division', 'Church', 'Pastor', 'Project'],
    stat: { value: '4', label: 'queries in one Promise.all, however big the org' },
  },
  {
    key: 'notify',
    label: 'Notifications',
    title: '24 events, five audiences',
    body: 'A pure recipient matrix routes every event — never to the person who acted. Written after the response so nobody waits, deduped per user, and the daily job’s reminders grouped into one per type per day.',
    stat: { value: '24 × 5', label: 'events × audiences, in-app' },
  },
  {
    key: 'offline',
    label: 'Offline',
    title: 'The form works without a signal',
    body: 'A service worker caches the form; IndexedDB keeps the answers and the files, stamped with the owner’s id so a shared phone never uploads as someone else. Back online, files upload first, then one post with an offlineId — a retry can’t create a duplicate.',
    flow: ['Fill in, offline', 'Queue in IndexedDB', 'Signal returns', 'Upload files', 'Post once (offlineId)'],
    stat: { value: '1', label: 'application, however many retries' },
  },
  {
    key: 'daily',
    label: 'Daily job',
    title: '00:30 IST, safe to run twice',
    body: 'Supabase pg_cron calls one route, checked with a constant-time bearer comparison. Six idempotent steps, then one audit row.',
    steps: ['Monthly report templates', 'Due · overdue · revision overdue', 'The delayed-project flag', 'Division bans that expire', 'Notification retention (90 / 365 days)', 'Archive purge after 180 days', 'One audit row'],
    stat: { value: '6', label: 'idempotent steps' },
  },
];

/* ── architecture — layers, and the paths real requests take ──────────────── */
// node ids are architectureGraph node ids in projects.js (labels and
// descriptions come from there); `desc` here only for nodes that aren't
export const LAYERS = [
  { key: 'who', label: 'Who', nodes: ['tier-pastor', 'tier-division', 'tier-hq', 'tier-president', 'tier-finance', 'tier-admin'] },
  { key: 'app', label: 'Next.js 16 app', nodes: ['proxy', 'pages', 'api', 'auth', 'offline'] },
  { key: 'domain', label: 'Rules · src/lib', nodes: ['engine', 'funding', 'config', 'notify', 'analytics', 'daily'] },
  { key: 'data', label: 'Data', nodes: ['database', 'history', 'fund-release', 'storage'] },
  { key: 'out', label: 'Outside', nodes: ['pgcron', 'excel'] },
];

export const TRACES = [
  { id: 'release', label: 'Release a tranche', steps: ['tier-finance', 'pages', 'api', 'auth', 'engine', 'funding', 'database', 'fund-release', 'history', 'notify'] },
  { id: 'submit', label: 'Submit an application', steps: ['tier-pastor', 'offline', 'api', 'auth', 'config', 'database', 'history', 'notify'] },
  { id: 'setting', label: 'Change a rule', steps: ['tier-admin', 'pages', 'api', 'auth', 'config', 'database', 'history'] },
  { id: 'daily', label: 'Run the daily job', steps: ['pgcron', 'api', 'daily', 'database', 'notify'] },
  { id: 'report', label: 'Export a report', steps: ['tier-hq', 'pages', 'api', 'auth', 'analytics', 'database', 'excel'] },
];

/* ── data model — prisma/schema.prisma: 18 models, 12 enums ───────────────── */
export const DATA_MODEL = {
  engine: 'Prisma 6 · PostgreSQL (Supabase)',
  domains: [
    { key: 'org', label: 'Org & people', models: [
      { name: 'User', note: 'one of six roles · lockout · session version' },
      { name: 'PastorInfo', note: 'the pastor’s ministry profile, 1:1' },
      { name: 'Division', note: 'a region and its leader · bans · archive' },
      { name: 'Church', note: 'existing, or built through the system' },
    ] },
    { key: 'application', label: 'Application', models: [
      { name: 'Application', note: 'the 9-page form · status · money · requirementsSnapshot' },
      { name: 'ApplicationStatusHistory', note: 'every transition: from, to, who, why' },
      { name: 'ChangeRequest', note: 'the fields HQ flagged' },
      { name: 'ApplicationDocument', note: 'files for admin-defined document types' },
    ] },
    { key: 'money', label: 'Construction & money', models: [
      { name: 'ConstructionPhase', note: 'three per project · unique per phase' },
      { name: 'PhaseReview', note: 'every HQ decision, with the photos it saw' },
      { name: 'FundRelease', note: 'immutable: amount, reference, who released it' },
    ] },
    { key: 'reports', label: 'Reporting', models: [
      { name: 'MonthlyChurchReport', note: 'every church, every month' },
      { name: 'BiAnnualActivityReport', note: 'six over three years after completion' },
    ] },
    { key: 'security', label: 'Platform & audit', models: [
      { name: 'AuditLog', note: 'who did what, old → new · kept indefinitely' },
      { name: 'SystemConfig', note: 'sparse overrides per config section' },
      { name: 'Notification', note: 'in-app · deduped per user' },
      { name: 'UploadLog', note: 'the per-user daily upload quota' },
      { name: 'OTPCode', note: 'kept for SMS sign-in, not used yet', deprecated: true },
    ] },
  ],
  enums: [
    { name: 'ApplicationStatus', count: 21 },
    { name: 'BuildingType', count: 7 },
    { name: 'ReportStatus', count: 7 },
    { name: 'UserRole', count: 6 },
    { name: 'PhaseStatus', count: 5 },
    { name: 'ConstructionMaterial', count: 4 },
    { name: 'LandAcquisitionType', count: 3 },
    { name: 'MaritalStatus', count: 3 },
    { name: 'PhaseNumber', count: 3 },
    { name: 'BuildingCondition', count: 3 },
    { name: 'ChurchType', count: 2 },
    { name: 'PhaseReviewDecision', count: 2 },
  ],
  // how the schema grew (git history)
  growth: [
    { when: 'Jan 30', models: 13 },
    { when: 'Feb 12', models: 15 },
    { when: 'Oct 5', models: 15 },
    { when: 'Oct 13', models: 16 },
    { when: 'Oct 15', models: 17 },
    { when: 'Oct 21', models: 18 },
  ],
};

/* ── how it was built — the git history in numbers ─────────────────────────── */
export const BUILD = {
  totals: [
    { value: '38', label: 'merged pull requests' },
    { value: '159', label: 'commits' },
    { value: '27.8k', label: 'lines of TypeScript' },
    { value: '74', label: 'client decisions, logged by number' },
  ],
  // the four GitHub Actions workflows
  ci: [
    { name: 'ci', when: 'every PR', steps: ['Biome format', 'ESLint · 0 warnings', 'tsc', 'Unit suites', 'next build'] },
    { name: 'security', when: 'every PR · weekly', steps: ['gitleaks', 'npm audit', 'Semgrep'] },
    { name: 'schema', when: 'PRs touching prisma/', steps: ['migrate deploy', 'migrate diff --exit-code'] },
    { name: 'integration', when: 'nightly · on demand', steps: ['Postgres 16', '10 API suites', 'Analytics UI in Chrome', 'Perf budget + CSP'] },
  ],
  suites: [
    { value: '16', label: 'unit suites' },
    { value: '10', label: 'API suites, real Postgres' },
    { value: '4', label: 'browser suites' },
    { value: '700+', label: 'checks across them' },
  ],
};

/* ── the page's own copy ─────────────────────────────────────────────────── */
export const COPY = {
  // one line that says what it is and what changed
  outcome:
    'Paper to platform: church construction — application, approval, phased funding and three years of reporting — for a national church network in India.',
  status: 'Production-ready · deployment planned',
  before: [
    'Paper applications, carried from HQ to the President to Finance by hand',
    'Whether a new site was at least 8 km from the nearest church — checked by eye, if at all',
    'Fund releases and site photos in separate ledgers',
    'No single view of where any project stood',
  ],
  after: [
    'One 9-page form, saved as you go — offline too',
    'A closer site needs a written justification, flagged on HQ’s review screen',
    'Every release capped by the approved amount, its photos and reference on one record',
    'Every status change recorded, by whom and when, by one engine',
  ],
  redacted: [
    { key: 'queue', label: 'HQ review queue' },
    { key: 'form', label: 'Application · step 4 of 9' },
    { key: 'phase', label: 'Phase 2 · photo review' },
  ],
  // what's next — the repo's own roadmap (README: Phase 14 and Deferred)
  next: [
    'Production deployment, hosted in Mumbai — next to the users and the database.',
    'SMS sign-in and alerts, and push notifications to phones and desktops — the table for one-time sign-in codes is already in the schema.',
    'A “use my location” GPS capture with an automatic nearest-church check — today the distance is entered and justified.',
    'PDF export beside Excel, and the Prisma 7 upgrade.',
  ],
};
