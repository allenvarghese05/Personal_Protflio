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
  none: { label: 'No one (final status)', tiers: [] },
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
  { id: 'DRAFT', label: 'Draft', stage: 'apply', actor: 'applicant', main: true, server: false, note: 'Never reaches the server. The 9-page form autosaves on the device every 30 s (localStorage) until it is sent. Files picked offline, and applications sent offline, wait in IndexedDB.' },
  { id: 'SUBMITTED', label: 'Submitted', stage: 'apply', actor: 'hq', main: true, note: 'Created directly as Submitted, with a number like APP-YYYY-NNNNN. The rules in force that day are saved with it.' },
  { id: 'UNDER_REVIEW', label: 'Under review', stage: 'review', actor: 'hq', main: true, note: 'HQ starts the review: approve, reject, or flag the exact fields that need changing.' },
  { id: 'CHANGES_REQUESTED', label: 'Changes requested', stage: 'review', actor: 'applicant', main: false, from: 'UNDER_REVIEW', to: 'SUBMITTED', kind: 'loop', note: 'HQ picks the fields to change, from 67 across nine pages. The applicant fixes them and resubmits, and the application is still judged by its original rules. There is no limit on rounds.' },
  { id: 'REJECTED_BY_HQ', label: 'Rejected by HQ', stage: 'review', actor: 'none', main: false, from: 'UNDER_REVIEW', kind: 'reject', note: 'Final. HQ’s reason is kept on the record.' },
  { id: 'HQ_APPROVED', label: 'HQ approved', stage: 'approve', actor: 'president', main: true, note: 'Passed up to the President.' },
  { id: 'REJECTED_BY_PRESIDENT', label: 'Rejected by President', stage: 'approve', actor: 'none', main: false, from: 'HQ_APPROVED', kind: 'reject', note: 'Final. The President’s reason is kept on the record.' },
  { id: 'PRESIDENT_APPROVED', label: 'President approved', stage: 'approve', actor: 'finance', main: true, note: 'The President approves the requested amount, or a lower one with a reason. That amount caps every release that follows.' },
  { id: 'ON_HOLD', label: 'On hold', stage: 'approve', actor: 'president', main: false, from: 'PRESIDENT_APPROVED', kind: 'hold', note: 'The President can pause a project from any of 15 statuses. Resume returns it to exactly where it was (heldFromStatus).' },
  { id: 'PHASE_1_IN_PROGRESS', label: 'Phase 1 · building', stage: 'phase1', actor: 'applicant', main: true, note: 'Finance releases the first tranche and a 4-month Phase 1 deadline starts (configurable). The applicant builds and uploads photos.' },
  { id: 'DELAYED', label: 'Delayed', stage: 'phase1', actor: 'system', main: false, server: false, from: 'PHASE_1_IN_PROGRESS', kind: 'flag', note: 'In the enum, but never set. When a project passes its deadline, the daily job sets an isDelayed flag instead, so the project keeps its real status. An extension clears the flag.' },
  { id: 'FUNDS_RELEASED', label: 'Funds released', stage: 'phase1', actor: 'none', main: false, server: false, from: 'PHASE_1_IN_PROGRESS', kind: 'reserved', note: 'Legacy. This is how Phase 1 was marked before the engine separated funding from building. It is still read as Phase 1, but never written.' },
  { id: 'PHASE_1_REVIEW', label: 'Phase 1 review', stage: 'phase1', actor: 'hq', main: true, note: 'HQ reviews the photos. If HQ approves, Phase 2’s funds become pending. If HQ returns the phase, the rejected photos are kept as a PhaseReview.' },
  { id: 'PHASE_2_FUNDS_PENDING', label: 'Phase 2 · funds pending', stage: 'phase2', actor: 'finance', main: true, note: 'Finance releases the next tranche: any amount up to the approved total minus what has already been released.' },
  { id: 'PHASE_2_IN_PROGRESS', label: 'Phase 2 · building', stage: 'phase2', actor: 'applicant', main: true, note: 'Building continues. Photos are required before the phase can be submitted.' },
  { id: 'PHASE_2_REVIEW', label: 'Phase 2 review', stage: 'phase2', actor: 'hq', main: true, note: 'HQ approves the phase or sends it back.' },
  { id: 'PHASE_3_FUNDS_PENDING', label: 'Phase 3 · funds pending', stage: 'phase3', actor: 'finance', main: true, note: 'The last release. The total can never go over the approved amount, even with two clicks at the same moment.' },
  { id: 'PHASE_3_IN_PROGRESS', label: 'Phase 3 · building', stage: 'phase3', actor: 'applicant', main: true, note: 'The last round of building and photos.' },
  { id: 'PHASE_3_REVIEW', label: 'Phase 3 review', stage: 'phase3', actor: 'hq', main: true, note: 'Approving Phase 3 completes the project.' },
  { id: 'COMPLETED', label: 'Completed', stage: 'after', actor: 'applicant', main: true, note: 'In the same transaction, the building becomes a registered church and six bi-annual reports (three years) are scheduled.' },
  { id: 'CLOSED', label: 'Closed', stage: 'after', actor: 'none', main: false, server: false, from: 'COMPLETED', kind: 'reserved', note: 'Reserved for archiving finished projects. No transition writes it yet.' },
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
    title: 'Money moves in one transaction, or not at all',
    problem:
      'Releasing a tranche writes five records, and two requests can arrive at once: Finance double-clicks, or the President changes the approved amount during a release. A release that is only half applied, or two releases that together pass the cap, would pay out money that no record matches.',
    decision:
      'Every engine action is one Prisma transaction around a compare-and-set. The row is updated only if its status is still the one this request read and, for a release or an amount change, the approved amount is still the one that was checked. If zero rows match, another request got there first: the response is a 409 and nothing is written. (If the first request had already committed, the status check rejects the second with a 400.) If one row matches, the status, the FundRelease, the next ConstructionPhase, the history row and the audit row commit together.',
    tradeoff:
      'This is optimistic concurrency, so no row lock is taken. The rare request that loses a race is told the application was changed by someone else and to refresh (or gets a 400 once the status has moved on), instead of waiting. Integration tests race a double-click, and a release against a top-up. The released total never exceeds the approved amount.',
    // the writes one release makes, in order — the visual ticks these
    steps: ['Status moved (compare-and-set)', 'FundRelease written', 'ConstructionPhase opened', 'ApplicationStatusHistory row', 'AuditLog row'],
    // what each scenario does to the writes above
    scenarios: [
      { key: 'commit', label: 'Release', outcome: 'commit', readout: 'One row matched, so all five writes commit together.' },
      { key: 'fail', label: 'Fail mid-way', outcome: 'rollback', failAt: 3, readout: 'The history write fails, so every write rolls back. No money moves.' },
      { key: 'race', label: 'Double-click', outcome: 'conflict', readout: 'The second click matches 0 rows because the status has already moved. It gets a 409 and nothing is written.' },
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
    title: 'Rule changes only apply to new applications',
    problem:
      'Super Admins can now change the rules themselves: required fields, documents, the minimum number of site photos. But an application submitted last month, or one sent back for changes, must not start failing rules that did not exist when the pastor filled it in.',
    decision:
      'On submit, the server saves a copy of the application rules, the field policy and the document types on the row (requirementsSnapshot). One function, applicationRequirements(snapshot, config), returns the rules an application is judged by. The edit form, the resubmission and HQ’s review screen all use it.',
    tradeoff:
      'Each application stores a little extra JSON, and old snapshots must stay readable as the schema grows (a snapshot from before the field policy existed falls back to the defaults). In return, tightening a rule only affects new applications.',
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
      body: `// on submit, the rules in force are frozen onto the application
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
    title: 'Permissions are checked at the API, not in the UI',
    problem:
      'Six roles see six different dashboards, but hiding a button is not access control. Anyone can call an API route directly, with any application id or file path.',
    decision:
      'Every route starts the same way. requireUser() reads the session and parseBody() validates the JSON with zod. Then one rule per entity decides whether this user may touch this row: canAccessApplication, the divisions a leader leads, or the uploader’s id at the start of every file path. The engine checks role and status again before anything changes.',
    tradeoff:
      'The cost is the same few lines at the top of every route, kept in place by convention and code review. The UI is a convenience, never the security boundary. A pastor who asks for someone else’s application, or tries to attach their land deed, gets a 403 instead of a signed link.',
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
    { value: '27', label: 'form fields, each required, optional or hidden' },
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
    { id: 'MC-0', pr: '#27', title: 'Flag & guard', body: 'A feature flag and a route group only Super Admins can open. Everyone else gets a 404, not a 403.', kind: 'admin' },
    { id: 'MC-1', pr: '#27', title: 'Generated editor', body: 'One editor for every section, drawn by introspecting the zod schema.', kind: 'admin' },
    { id: 'MC-2', pr: '#28', title: 'History & undo', body: 'Each field’s old and new values are recorded. Undo writes the old value back as a new change.', kind: 'admin' },
    { id: 'MC-3', pr: '#28', title: 'People & places', body: 'Users, churches and divisions rebuilt on the design system.', kind: 'design' },
    { id: 'MC-4', pr: '#30', title: 'Field policy', body: 'Each of 27 form fields can be required, optional or hidden. The form, the server and HQ’s field picker all follow the setting.', kind: 'admin' },
    { id: 'MC-5', pr: '#31 · #33', title: 'Document types', body: 'Admins add document types beside the built-in ones, as an upload, a link or either. Old types are retired, never deleted.', kind: 'admin' },
    { id: 'MC-6', pr: '#29', title: 'Design system', body: '~190 palette classes mapped to design tokens. A guard test blocks raw colours.', kind: 'design' },
    { id: 'MC-7', pr: '#32', title: 'On by default', body: 'Live for the Super Admin, with the flag kept as a kill switch. All requirement checks go through one applicationRequirements().', kind: 'admin' },
  ],
  span: 'Oct 20-22, 2026',
  // two bugs found while building it — the kind of detail worth telling
  fixes: [
    {
      title: 'Two admins saved one section and one save was lost',
      before: '12 of 15',
      after: '0 of 10',
      unit: 'trials lost a save',
      body: 'The app read the settings, merged the change and wrote them back, so when two saves landed together one was lost. The merge moved into Postgres as one UPDATE with jsonb ||, and a test now races ten pairs of saves.',
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
  setup: 'Dev measurements · warm routes, median of 3 runs (the transaction-pooler “before” column is a single run) · from Philadelphia to Supabase in Sydney (ap-southeast-2) · Oct 3, 2026',
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
    { value: '240-400 ms', label: 'one TCP connection, Philadelphia to Sydney' },
    { value: '~1,300 ms', label: 'one query through the transaction pooler (~244 ms on the session pooler)' },
    { value: '~100', label: 'queries the all-time report ran one after another' },
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
      { label: 'three more at the end', count: 3 },
    ],
    after: [
      { label: 'auth lookup', count: 1 },
      { label: 'one Promise.all of 16 queries', count: 1, parallel: 16 },
    ],
  },
  fixes: [
    { title: 'Independent queries run together', body: 'Every independent query for a view goes into one Promise.all. The 16 KPI queries now run at the same time.' },
    { title: 'groupBy instead of loops', body: 'The month-by-month loop became one groupBy(year, month). The per-division and per-church loops became groupBys combined in JavaScript. The query count no longer grows with the number of months, divisions or churches.' },
    { title: 'JOINs and one signing call', body: 'Prisma relationJoins loads related rows in the same query, and ~9 sequential signed-URL calls became one createSignedUrls call. Application detail went from 2.6 s to 0.5 s.' },
    { title: 'The right connection', body: 'The transaction pooler can’t cache prepared statements, so the app uses the session pooler, with connection_limit=5 so a burst of parallel queries can’t use up its 15 clients.' },
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
    { value: '110 / 110', label: 'API responses byte-identical before and after, across 5 roles' },
    { value: '252 / 252', label: 'analytics checks where the old and new math matched, on 144 synthetic reports' },
  ],
  // what came after the rewrite (each measured on its own)
  later: [
    { value: '260 ms to 5 ms', label: 'the session lookup, with a 30 s per-user cache' },
    { value: '1 request', label: 'the dashboard: three browser round trips became one server render (520-870 ms)' },
    { value: '893 ms', label: 'analytics today, all time and uncached: 4 queries in one Promise.all plus the division list (241 ms from the 60 s cache)' },
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
    { key: 'engine', label: 'Engine', where: 'lib/workflow/engine.ts', items: ['Compare-and-set on status and amount', 'One transaction per action', 'An audit row for every action'] },
    { key: 'db', label: 'Database', where: 'Postgres', items: ['Login lockout in one atomic statement', 'The last Super Admin checked under a row lock', 'No grants at all for the anon and authenticated roles'] },
    { key: 'files', label: 'Files', where: 'private bucket', items: ['1-hour signed links only', 'File type read from magic bytes, never from the browser', '200 MB per user per day'] },
  ],
  // send a request down the layers — where each one is stopped (`at` is a layer key)
  probes: [
    { key: 'ok', label: 'Your own application', at: null, result: '200, every layer passed. File links are signed for one hour.' },
    { key: 'csrf', label: 'Cross-site POST', at: 'edge', result: '403 · “Cross-site request refused”. The Origin doesn’t match the Host.' },
    { key: 'idor', label: 'Someone else’s application', at: 'row', result: '403 · “Access denied”. This is checked before any link is signed.' },
    { key: 'race', label: 'Two releases at once', at: 'engine', result: '409, the second update matched 0 rows. Nothing is written.' },
    { key: 'guess', label: 'Password guessing', at: 'db', result: '401, the same as every other failure. After 5 tries the account pauses for 15 minutes.' },
    { key: 'renamed', label: 'A .txt renamed .jpg', at: 'files', result: 'Refused, because its first bytes have no JPEG, PNG or PDF signature.' },
  ],
  // sign-in: every failure looks the same
  login: {
    title: 'Every failed sign-in looks the same',
    cases: [
      { key: 'unknown', label: 'Unknown email', note: 'still runs one statement and a dummy scrypt hash' },
      { key: 'wrong', label: 'Wrong password', note: 'the attempt is reserved before the password check' },
      { key: 'locked', label: 'Paused account', note: 'paused 15 minutes after 5 tries, timed by the database clock' },
    ],
    response: '401 · “Invalid email or password.” · no Retry-After',
    facts: [
      'The attempt is reserved before the password is checked, in one atomic UPDATE … RETURNING, so a burst of parallel attempts can’t get past the limit.',
      'Passwords use scrypt with a per-user salt, compared in constant time.',
      'A limit of 30 attempts per IP per hour, on top of the per-account lock.',
      'A password change bumps sessionVersion, which signs out every other session.',
    ],
  },
  // the audit tickets (CHU-27 … CHU-33, PRs #34–#40, merged Oct 23)
  audit: [
    { id: 'CHU-27', sev: 'C1', pr: '#35', found: 'The production seed created the Super Admin with a password committed to the repo.', fixed: 'The email now comes from the environment. The password is a random 14-character one, shown once and changed at first sign-in.' },
    { id: 'CHU-28', sev: 'C2', pr: '#36', found: 'A Super Admin could demote or deactivate their own account, or the last one standing.', fixed: 'Self-demotion is refused. The last active Super Admin is checked under SELECT … FOR UPDATE, and the check is race-tested.' },
    { id: 'CHU-29', sev: 'H1', pr: '#37', found: 'Demo and CI seeds create known-password accounts in whatever database .env points at.', fixed: 'A seed guard allows writes only in CI or to a named --target. Protected databases, matched by project ref, are always refused.' },
    { id: 'CHU-30', sev: 'H2', pr: '#38', found: 'Emails were matched case-sensitively, so John.Doe@ and john.doe@ could be two accounts.', fixed: 'Emails are stored in lowercase and matched in any case, with the ILIKE wildcards _ % \\ escaped.' },
    { id: 'CHU-31', sev: 'H3', pr: '#39', found: 'Schema changes were applied with prisma db push, with no migration history.', fixed: 'A baseline migration, 0_init (18 tables). CI fails any PR whose schema drifts from its migrations.' },
    { id: 'CHU-32', sev: 'H4', pr: '#34', found: 'The dependency audit failed on @prisma/client and would block every merge.', fixed: 'Allow-listed with a written reason and a review-by date. The real fix is the Prisma 7 upgrade.' },
    { id: 'CHU-33', sev: 'H5', pr: '#40', found: 'Uploads trusted the type the browser claimed, so any bytes labelled image/jpeg were stored.', fixed: 'The type now comes only from the file’s magic bytes. Anything unrecognised is refused.' },
  ],
  // file signatures the upload route accepts (src/app/api/upload/route.ts)
  signatures: [
    { type: 'JPEG', bytes: ['FF', 'D8', 'FF'], note: 'at byte 0' },
    { type: 'PNG', bytes: ['89', '50', '4E', '47'], note: 'at byte 0' },
    { type: 'PDF', bytes: ['25', '50', '44', '46'], note: '“%PDF” within the first 1,024 bytes' },
  ],
  // what used to get through: text, labelled image/jpeg by the browser
  refused: { name: 'notes.txt renamed photo.jpg', claimed: 'image/jpeg', bytes: ['68', '65', '6C', '6C'], note: '“hell…”: no signature, so it is refused' },
  // holes found and closed before the audit — object-level access, the big ones
  earlier: [
    { when: 'Oct 3', text: 'The public sign-up route accepted role=SUPER_ADMIN.' },
    { when: 'Oct 3', text: 'The public anon key could read every table through Supabase’s Data API, including User.passwordHash.' },
    { when: 'Oct 5', text: 'Any pastor could submit any project’s phase.' },
    { when: 'Oct 6', text: 'Any signed-in user could open any church, with its pastor’s phone and email.' },
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
    body: 'Five scopes: organisation, division, church, pastor or project. Each role and scope has one pure, unit-tested access rule. The dashboard runs four queries in one Promise.all, caches the result for 60 seconds, and exports exactly the view on screen to Excel.',
    scopes: ['Organisation', 'Division', 'Church', 'Pastor', 'Project'],
    stat: { value: '4', label: 'queries in one Promise.all, whatever the size of the organisation' },
  },
  {
    key: 'notify',
    label: 'Notifications',
    title: '24 events, five audiences',
    body: 'A pure recipient matrix decides who hears about each event, and never notifies the person who acted. Notifications are written after the response, so nobody waits. They are deduped per user, and the daily job groups its reminders into one per type per day.',
    stat: { value: '24 × 5', label: 'events × audiences, in-app' },
  },
  {
    key: 'offline',
    label: 'Offline',
    title: 'The form works without a signal',
    body: 'A service worker caches the form. IndexedDB keeps the answers and files, tagged with the owner’s id, so a shared phone never uploads as someone else. When the signal returns, the files upload first, then the application is posted once with an offlineId, so a retry can’t create a duplicate.',
    flow: ['Fill in, offline', 'Queue in IndexedDB', 'Signal returns', 'Upload files', 'Post once (offlineId)'],
    stat: { value: '1', label: 'application, however many retries' },
  },
  {
    key: 'daily',
    label: 'Daily job',
    title: '00:30 IST, safe to run twice',
    body: 'Supabase pg_cron calls one route, which checks a bearer secret in constant time. The job runs six idempotent steps, then writes one audit row.',
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
      { name: 'AuditLog', note: 'who did what, old and new values · kept indefinitely' },
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
    'Software that replaced a paper process for a national church network in India. It runs church construction from application and approval to phased funding and three years of reporting.',
  status: 'In production · live since Oct 2026',
  before: [
    'Paper applications, carried from HQ to the President to Finance by hand',
    'Whether a new site was at least 8 km from the nearest church was checked by eye, if at all',
    'Fund releases and site photos in separate ledgers',
    'No single view of where any project stood',
  ],
  after: [
    'One 9-page form that saves as you go, even offline',
    'A site closer than 8 km needs a written justification, flagged on HQ’s review screen',
    'Every release is capped by the approved amount, with its photos and reference on one record',
    'One engine records every status change, with who made it and when',
  ],
  redacted: [
    { key: 'queue', label: 'HQ review queue' },
    { key: 'form', label: 'Application · step 4 of 9' },
    { key: 'phase', label: 'Phase 2 · photo review' },
  ],
  // what's next — the repo's own roadmap (README: Phase 14 and Deferred)
  next: [
    'Running in production, hosted in Mumbai, close to the users and the database.',
    'SMS sign-in and alerts, and push notifications to phones and desktops. The table for one-time sign-in codes is already in the schema.',
    'A “use my location” GPS capture with an automatic nearest-church check. Today the distance is typed in and justified.',
    'PDF export alongside Excel, and the Prisma 7 upgrade.',
  ],
};

/* ── the case study in one screen ─────────────────────────────────────────── */
export const OVERVIEW = [
  { label: 'What it is', text: 'The grant system for building churches across India: a pastor applies, HQ reviews, the President approves an amount, Finance releases it in three construction phases, and the finished church reports for three years.' },
  { label: 'Why it exists', text: 'Everything ran on paper. Applications were carried by hand, fund releases and site photos sat in separate ledgers, and no one had a single view of where each project stood.' },
  { label: 'What Allen did', text: 'Sole engineer: the workflow engine, race-safe money movement, a Super Admin console that changes the rules without a deploy, the analytics rewrite (from 146.7 s to 1.28 s), the security audit, and CI.' },
  { label: 'Where it stands', text: 'Live since October 2026. Staff at headquarters and across the divisions use it for every church-building application, and CI checks every change.' },
];
