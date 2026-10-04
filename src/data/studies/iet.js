/**
 * The Church Building Application System case study (layout v2) — every fact
 * the page shows, in one place. Components only render this; change copy
 * here. Sourced from the ApplicationStatus enum, schema v2.0 and the
 * technical doc. Items marked TODO(allen) are inferred and worth a check.
 */

/* ── who acts — the five people in the chain (the approval stack) ─────────── */
// tier index → used by the stack and the lifecycle to light the right slab
export const ROLES = [
  { key: 'pastor', num: '01', role: 'Pastor', verb: 'applies', pop: '3,000+ pastors' },
  { key: 'division', num: '02', role: 'Division Leader', verb: 'applies for the division', pop: '~150 leaders' },
  { key: 'hq', num: '03', role: 'HQ Team', verb: 'reviews · checks phases', pop: 'national HQ' },
  { key: 'president', num: '04', role: 'President', verb: 'final approval', pop: '1 president' },
  { key: 'finance', num: '05', role: 'Finance', verb: 'releases funds', pop: 'finance board' },
];

/** "Next action by" → the stack tier(s) it lights. The applicant is the
 *  Pastor or a Division Leader acting for their division. */
export const ACTORS = {
  applicant: { label: 'Applicant', tiers: [0, 1] },
  hq: { label: 'HQ', tiers: [2] },
  president: { label: 'President', tiers: [3] },
  finance: { label: 'Finance', tiers: [4] },
  none: { label: 'No one — archived', tiers: [] },
};

/* ── the lifecycle — the ApplicationStatus enum (17 values) ────────────────── */
/**
 * `main` statuses form the line in order (13). Branch statuses hang off a
 * main status (`from`) and say where they lead (`to`). `stage` groups the line.
 */
export const STAGES = [
  { key: 'apply', label: 'Apply' },
  { key: 'review', label: 'HQ review' },
  { key: 'approve', label: 'Approval' },
  { key: 'fund', label: 'Funding' },
  { key: 'build', label: 'Construction' },
  { key: 'after', label: 'After dedication' },
];

export const STATUSES = [
  { id: 'DRAFT', label: 'Draft', stage: 'apply', actor: 'applicant', main: true, note: 'The 10-page application, saved as it’s filled in — offline too.' },
  { id: 'SUBMITTED', label: 'Submitted', stage: 'apply', actor: 'hq', main: true, note: 'The 8 km bylaw is checked server-side before this status is allowed.' },
  { id: 'UNDER_REVIEW', label: 'Under review', stage: 'review', actor: 'hq', main: true, note: 'HQ works the review queue.' },
  { id: 'CHANGES_REQUESTED', label: 'Changes requested', stage: 'review', actor: 'applicant', main: false, from: 'UNDER_REVIEW', to: 'SUBMITTED', kind: 'loop', note: 'Back to the applicant with HQ’s notes; resubmitting re-enters the queue.' },
  { id: 'REJECTED_BY_HQ', label: 'Rejected by HQ', stage: 'review', actor: 'applicant', main: false, from: 'UNDER_REVIEW', kind: 'reject', note: 'The applicant can resubmit.' },
  { id: 'HQ_APPROVED', label: 'HQ approved', stage: 'approve', actor: 'president', main: true, note: 'Passed up to the President.' },
  { id: 'REJECTED_BY_PRESIDENT', label: 'Rejected by President', stage: 'approve', actor: 'applicant', main: false, from: 'HQ_APPROVED', kind: 'reject', note: 'The applicant can resubmit.' },
  { id: 'PRESIDENT_APPROVED', label: 'President approved', stage: 'approve', actor: 'finance', main: true, note: 'The single final approval — Finance takes it from here.' },
  { id: 'FUNDS_RELEASED', label: 'Funds released', stage: 'fund', actor: 'applicant', main: true, note: 'The first tranche — the release also opens the Phase 1 record.' },
  { id: 'PHASE_1_IN_PROGRESS', label: 'Phase 1 · Foundation', stage: 'build', actor: 'applicant', main: true, note: 'A 4-month window from the release; photos uploaded as proof.' },
  { id: 'PHASE_1_REVIEW', label: 'Phase 1 review', stage: 'build', actor: 'hq', main: true, note: 'HQ approves the photos — and the next tranche releases in the same transaction.' },
  { id: 'PHASE_2_IN_PROGRESS', label: 'Phase 2 · Roof level', stage: 'build', actor: 'applicant', main: true, note: 'Second tranche in hand; photos again.' },
  { id: 'PHASE_2_REVIEW', label: 'Phase 2 review', stage: 'build', actor: 'hq', main: true, note: 'Approval releases the final tranche.' },
  { id: 'PHASE_3_IN_PROGRESS', label: 'Phase 3 · Completion', stage: 'build', actor: 'applicant', main: true, note: 'The phase record itself moves to review; approval sets the dedication date.' },
  { id: 'DELAYED', label: 'Delayed', stage: 'build', actor: 'hq', main: false, from: 'PHASE_1_IN_PROGRESS', kind: 'flag', note: 'For projects that miss a phase deadline — HQ decides what happens next.' },
  { id: 'COMPLETED', label: 'Completed', stage: 'after', actor: 'applicant', main: true, note: 'Dedicated. Six bi-annual activity reports over three years follow.' },
  { id: 'CLOSED', label: 'Closed', stage: 'after', actor: 'none', main: true, note: 'Archived once the reporting obligation is met.' },
];

/** The audit trail the lifecycle "plays" — one line per transition on the
 *  happy path (illustrative entries; the real log is ApplicationStatusHistory). */
export const AUDIT = [
  { to: 'DRAFT', by: 'pastor.r.kumar', at: '09:14' },
  { to: 'SUBMITTED', by: 'pastor.r.kumar', at: '09:52', extra: 'bylaw ok · nearest church 11.4 km' },
  { to: 'UNDER_REVIEW', by: 'hq.review', at: '10:05' },
  { to: 'HQ_APPROVED', by: 'hq.review', at: '15:31' },
  { to: 'PRESIDENT_APPROVED', by: 'president', at: '11:02' },
  { to: 'FUNDS_RELEASED', by: 'finance.board', at: '16:40', extra: 'tranche 1/3 · ref FR-0412' },
  { to: 'PHASE_1_IN_PROGRESS', by: 'system', at: '16:40', extra: 'phase 1 opened · due in 4 months' },
  { to: 'PHASE_1_REVIEW', by: 'pastor.r.kumar', at: '12:18', extra: '14 photos' },
  { to: 'PHASE_2_IN_PROGRESS', by: 'hq.review', at: '09:47', extra: 'tranche 2/3 released' },
  { to: 'PHASE_2_REVIEW', by: 'pastor.r.kumar', at: '17:03', extra: '22 photos' },
  { to: 'PHASE_3_IN_PROGRESS', by: 'hq.review', at: '10:26', extra: 'tranche 3/3 released' },
  { to: 'COMPLETED', by: 'hq.review', at: '14:09', extra: 'dedication set · 6 reports scheduled' },
  { to: 'CLOSED', by: 'hq.review', at: '11:30', extra: 'reporting complete · archived' },
];

/* ── three hard problems (the key decisions, rebuilt) ─────────────────────── */
export const DECISIONS = [
  {
    id: 'gps',
    kicker: 'Location',
    title: 'An 8 km bylaw, checked on the server',
    problem: 'A new church can’t be built within 8 km of a registered one. Checked by hand, that rule was easy to miss and impossible to audit.',
    decision: 'Every submission computes the great-circle (Haversine) distance to every registered church — in-process, on the server — and refuses the status change if any is inside 8 km.',
    tradeoff: 'Straight-line, not road distance: no external Maps API, no per-request latency or cost, and accurate enough for a radius rule.',
    code: {
      file: 'lib/geo.ts',
      lang: 'ts',
      body: `const EARTH_KM = 6371;
const BYLAW_KM = 8;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

// on submission: any registered church inside the radius blocks it
const conflicts = churches.filter((c) => haversineKm(site, c) < BYLAW_KM);`,
    },
  },
  {
    id: 'tx',
    kicker: 'Money',
    title: 'Approving a phase is all-or-nothing',
    problem: 'Approving a construction phase touches four records — and money moves on the back of it. A half-applied approval could release funds with no audit entry, or approve a phase that never opens the next.',
    decision: 'Every phase approval runs as one Prisma transaction: mark the phase approved, create the fund release, write the status history, open the next phase. If any step throws, none of it happened.',
    tradeoff: 'Slightly longer locks on a rare, human-paced action — in exchange for never reconciling partial state by hand.',
    steps: ['ConstructionPhase → approved', 'FundRelease created', 'ApplicationStatusHistory written', 'Next phase opened'],
    code: {
      file: 'app/api/phases/[id]/approve/route.ts',
      lang: 'ts',
      body: `await prisma.$transaction(async (tx) => {
  await tx.constructionPhase.update({
    where: { id }, data: { status: 'APPROVED' },
  });
  await tx.fundRelease.create({
    data: { phaseId: id, amount, reference, releasedById: user.id },
  });
  await tx.applicationStatusHistory.create({
    data: { applicationId, from, to, actorId: user.id },
  });
  await tx.constructionPhase.create({
    data: { applicationId, number: next },
  });
}); // any throw → every write above rolls back`,
    },
  },
  {
    id: 'rbac',
    kicker: 'Security',
    title: 'Permissions live at the API, not the UI',
    problem: 'Six roles see six different dashboards — but hiding a button is not access control. Anyone can call an API route directly.',
    decision: 'Every API route re-derives the caller’s role and their ownership of the resource from the JWT, on every request, regardless of what the UI allowed.',
    tradeoff: 'A little repetition per route — wrapped in one guard — so the UI is a convenience, never the boundary.',
    path: [
      { key: 'ui', label: 'UI guard', note: 'hides what you can’t do' },
      { key: 'route', label: 'API route', note: 'the real entry point' },
      { key: 'jwt', label: 'Verify JWT', note: '15-min token · HttpOnly cookie' },
      { key: 'role', label: 'Check role', note: 'from the token, not the page' },
      { key: 'own', label: 'Check ownership', note: 'your church · your division' },
      { key: 'handler', label: 'Handler', note: 'only now does work happen' },
    ],
    code: {
      file: 'app/api/applications/[id]/approve/route.ts',
      lang: 'ts',
      body: `export async function POST(req: Request, { params }: Ctx) {
  const user = await requireUser(req);   // verify the JWT (15-min, HttpOnly)
  requireRole(user, ['HQ']);             // role from the token, not the UI
  const app = await prisma.application.findUniqueOrThrow({
    where: { id: params.id },
  });
  assertCanAct(user, app);               // ownership / division scope
  return approve(app, user);
}`,
    },
  },
];

/* ── architecture — layers, and the paths real requests take ──────────────── */
// node ids reuse the existing architectureGraph ids where they exist, so the
// descriptions come from one place (projects.js); `desc` here only for new ones
export const LAYERS = [
  { key: 'who', label: 'Who', nodes: ['tier-pastor', 'tier-division', 'tier-hq', 'tier-president', 'tier-finance'] },
  {
    key: 'app',
    label: 'Next.js 14 app',
    nodes: [
      { id: 'ui', label: 'Dashboards & forms', desc: 'App Router pages — six role dashboards and the 10-page application form (React Hook Form + Zod).' },
      { id: 'api', label: 'API routes', desc: 'Route handlers — the only way anything changes. Every one passes through the auth and RBAC guards.' },
      'auth',
      'rbac',
    ],
  },
  { key: 'domain', label: 'Domain', nodes: ['workflow', 'gps', 'construction', 'compliance', 'offline-sync'] },
  { key: 'data', label: 'Data', nodes: ['database', 'status-history', 'fund-release', 'storage'] },
  { key: 'out', label: 'Outside', nodes: ['sms'] },
];

export const TRACES = [
  { id: 'submit', label: 'Submit an application', steps: ['tier-pastor', 'ui', 'api', 'rbac', 'gps', 'workflow', 'database', 'status-history', 'sms'] },
  { id: 'phase', label: 'Approve a phase', steps: ['tier-hq', 'ui', 'api', 'rbac', 'construction', 'database', 'fund-release', 'status-history', 'sms'] },
  { id: 'signin', label: 'Sign in', steps: ['tier-pastor', 'ui', 'api', 'auth', 'sms', 'auth'] },
  { id: 'report', label: 'File a report', steps: ['tier-pastor', 'ui', 'api', 'rbac', 'compliance', 'storage', 'database'] },
];

/* ── data model — schema v2.0: 15 models ─────────────────────────────────── */
export const DATA_MODEL = {
  domains: [
    { key: 'org', label: 'Org & people', models: [
      { name: 'User', note: 'one of six roles' },
      { name: 'PastorInfo', note: 'the pastor’s profile' },
      { name: 'Division', note: 'regional unit · can be banned (isBanned, bannedUntil, banReason)' },
      { name: 'Church', note: 'registered location — the 8 km check runs against these' },
    ] },
    { key: 'application', label: 'Application', models: [
      { name: 'Application', note: 'the 10-page form, flattened into one model' },
      { name: 'ApplicationStatusHistory', note: 'every transition: from, to, who, when' },
      { name: 'ChangeRequest', note: 'HQ’s notes back to the applicant' },
    ] },
    { key: 'money', label: 'Construction & money', models: [
      { name: 'ConstructionPhase', note: 'three per project, photo-verified' },
      { name: 'FundRelease', note: 'one tranche per phase, with a reference' },
    ] },
    { key: 'reports', label: 'Reporting', models: [
      { name: 'MonthlyChurchReport', note: 'every church, monthly' },
      { name: 'BiAnnualActivityReport', note: 'six over three years after dedication' },
      { name: 'ActivityReport', note: 'deprecated — kept with migration flags', deprecated: true },
    ] },
    { key: 'security', label: 'Security & config', models: [
      { name: 'OTPCode', note: '6-digit, 5-minute, 3 attempts' },
      { name: 'AuditLog', note: 'who did what, system-wide' },
      { name: 'SystemConfig', note: 'tunable rules without a deploy' },
    ] },
  ],
  enums: [
    { name: 'ApplicationStatus', count: 17 },
    { name: 'UserRole', count: 6 },
    { name: 'PhaseNumber' },
    { name: 'PhaseStatus' },
    { name: 'ChurchType' },
    { name: 'ReportStatus' },
    { name: 'BuildingCondition' },
    { name: 'BuildingType' },
  ],
};

/* ── the page's own copy ─────────────────────────────────────────────────── */
export const COPY = {
  // one line that says what it is and what changed
  outcome: 'Paper to platform: church construction — application, approval, funding and three years of reporting — for a multi-division organisation in India.',
  status: 'Pre-launch · going live soon',
  before: [
    'Paper applications, carried from HQ to the President to Finance by hand',
    'The 8 km rule checked by eye, if at all',
    'Fund releases and photos in separate ledgers',
    'No single view of where any project stood',
  ],
  after: [
    'One 10-page form, saved as you go — offline too',
    'The bylaw enforced on the server, on every submission',
    'Each phase approval releases its funds atomically',
    'Every status change recorded, by whom and when',
  ],
  redacted: [
    { key: 'queue', label: 'HQ review queue' },
    { key: 'form', label: 'Application · step 4 of 10' },
    { key: 'phase', label: 'Phase 2 · photo review' },
  ],
  // what lands before / after launch — TODO(allen): trim anything you'd rather not show
  next: [
    'Production launch — rolling out to the divisions soon.',
    'Automatic delay detection on the 4-month Phase 1 deadline (the DELAYED status).',
    'Close projects automatically after the sixth bi-annual report.',
    'A guided resubmission flow for rejected applications.',
  ],
};
