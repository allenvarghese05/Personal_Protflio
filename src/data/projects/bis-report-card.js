/**
 * bis-report-card — the project's wall card, brief data and case-study copy.
 * Facts only from the project's own repository (private; main at the merge
 * of PR #15, 2026-10-21). Built and tested, not yet deployed at the school.
 */
export const project = {
  id: 'bis-report-card',
  kind: 'signature',
  cardBadge: 'PRE-PILOT',
  badge: 'SCHOOL SYSTEM · SOLE DEVELOPER',
  label: 'BIS Report Card',
  subtitle:
    'Self-hosted report cards for a school in India — marks entry, a locking review, CBSE-format PDFs, and every card format as data in one template engine',
  role: 'Sole developer',
  company: 'Beersheba International School',
  dateRange: 'Jul – Oct 2026',
  location: 'Pipariya, India',
  repo: null, // private repository
  live: null, // runs only on the school's own network; not deployed yet
  description:
    'A self-hosted, LAN-first report card system for Beersheba International School in Pipariya, Madhya Pradesh. Subject teachers enter marks in a keyboard-first grid, by paste or through a pre-filled Excel sheet; class teachers consolidate and submit; division heads approve and lock, or return with a note; cards print as CBSE-format PDFs from one HTML renderer. Card formats are templates stored as JSONB, so a marks-based LKG card and a descriptive Nursery record run on one engine. Sole developer — specs, NestJS API, Next.js app, ops and CI (AI-assisted). Built and tested; the on-prem deployment and a Pre-Primary pilot come next.',
  tags: ['NestJS', 'Next.js', 'TypeScript', 'PostgreSQL + Prisma', 'Docker'],
  metrics: [
    { value: '282', label: 'Automated tests, green in CI' },
    { value: '31', label: 'Prisma models, 15 migrations' },
    { value: '118', label: 'API route handlers in 20 controllers' },
    { value: '2', label: 'Card formats, one template engine' },
  ],
  primaryStack: ['NestJS 10', 'Next.js 15', 'React 19', 'TypeScript', 'PostgreSQL 15', 'Prisma 5'],
  secondaryStack: ['zod', 'TanStack Query', 'Tailwind CSS', 'ExcelJS', 'Puppeteer (headless Chromium)', 'argon2id', 'Caddy', 'Docker Compose', 'age + rclone', 'Jest + Supertest', 'Vitest', 'Playwright', 'GitHub Actions'],
  keyDecisions: [
    {
      title: 'A mark saved at the moment of approval must never land in a locked card',
      body: 'Every status move and every write takes a Postgres advisory lock on section:<session>:<section> inside its transaction, then reads the status. Tested: approve plus 8 simultaneous saves, five rounds — every save 200 or 409, no mark updated after lockedAt; two simultaneous approves, exactly one wins.',
    },
    {
      title: 'One lab PC, many teachers — and a stolen password still isn’t enough',
      body: 'Each new browser waits for office approval. The device cookie holds one token per person plus a school token (hashes only in the database); a PC registered by MAC is trusted for teachers only on the registered OS, never for approvers or temporary passwords, and the token is re-checked on every request.',
    },
    {
      title: 'Roll numbers: unique among active students — yet reusable, and renumberable',
      body: 'A partial, deferrable EXCLUDE constraint in hand-written SQL: leavers keep their roll and newcomers may reuse it, promotion can renumber a section mid-transaction, and a true duplicate is refused at commit (23P01).',
    },
  ],
  // the git history, chapter by chapter (start / end are commit dates)
  timeline: [
    { week: 'Jul 18', start: '2026-07-18', end: '2026-07-18', title: 'The spec', desc: 'The first commit: the Phase 1 scaffold design spec. (The seven spec documents arrive with the code in October.)', done: true },
    { week: 'Oct 6', start: '2026-10-06', end: '2026-10-06', title: 'The core system', desc: 'API, shared schemas, template engine, grading, print, Excel and tests; the web app, Docker, ops scripts and CI — the README’s Phases 1–20.', done: true },
    { week: 'Oct 9', start: '2026-10-09', end: '2026-10-09', title: 'Division-head review', desc: 'A review stage between class teacher and lock, and a full UI redesign.', done: true },
    { week: 'Oct 14 – 18', start: '2026-10-14', end: '2026-10-18', title: 'School setup', desc: 'Roster upload, the staffing board, the new-year wizard with undoable promotion, electives, streams and the pass mark (PRs #1–#5).', done: true },
    { week: 'Oct 18 – 19', start: '2026-10-18', end: '2026-10-19', title: 'Browser tests & access', desc: 'The Playwright suite, section-view scope, and the forced password change enforced by the API (PRs #6–#8).', done: true },
    { week: 'Oct 19', start: '2026-10-19', end: '2026-10-19', title: 'Ops & integrity', desc: 'One HTTPS door, backups drilled in CI, advisory locks and the roll constraint, trusted devices (PRs #9–#12).', done: true },
    { week: 'Oct 19 – 21', start: '2026-10-19', end: '2026-10-21', title: 'Review hardening', desc: 'Authorisation boundaries, data correctness and shared lab computers, each over several review rounds (PRs #13–#15).', done: true },
    { week: 'Oct 21 →', start: '2026-10-21', end: '2026-10-21', title: 'Before the pilot', desc: 'PR #16 — ops, query counts and ESLint. Open; CI green, not merged.', done: false },
  ],
  architectureGraph: {
    nodes: [
      { id: 'role-subject', label: 'Subject teacher', description: 'Enters marks and remarks for the subjects they are assigned, in the grid, by paste or through the Excel sheet, then submits the subject.', category: 'workflow', importance: 'leaf', x: 6, y: 14 },
      { id: 'role-class', label: 'Class teacher', description: 'Sees every subject’s progress and can nudge, fills co-scholastic grades, attendance, health and the overall remark, submits the section for review, and can print it.', category: 'workflow', importance: 'leaf', x: 6, y: 32 },
      { id: 'role-division', label: 'Division head', description: 'Reviews every section of a class group: approve and lock, return with a note, or reopen with a reason.', category: 'workflow', importance: 'leaf', x: 6, y: 50 },
      { id: 'role-admin', label: 'Principal / admin', description: 'Everything, in every division: setup, templates, approving straight from draft, reopening approved cards.', category: 'auth', importance: 'leaf', x: 6, y: 68 },
      { id: 'role-office', label: 'Office staff', description: 'School setup — years, classes, sections, the student roster, staff accounts and passwords — plus device approvals and backups.', category: 'auth', importance: 'leaf', x: 6, y: 86 },
      { id: 'web', label: 'Next.js web app', description: 'Next.js 15 App Router, 22 pages, installable as a PWA (no offline sync). The keyboard-first marks grid, the review queue and the print preview. It never computes a grade.', category: 'ui', importance: 'primary', x: 22, y: 40 },
      { id: 'caddy', label: 'Caddy · the one door', description: 'The only service that publishes a port (80 → 443, HTTPS from its own internal CA). The API is same-origin at /api; CI fails if anything else publishes a port.', category: 'infrastructure', importance: 'secondary', x: 22, y: 62 },
      { id: 'guards', label: 'Session & device guard', description: 'Global guards on every request: the throttler, then the session → an active user → the device token and its status → pending-device and temporary-password holds → admin- and office-only routes.', category: 'auth', importance: 'primary', x: 40, y: 18 },
      { id: 'devices', label: 'Trusted devices', description: 'A random 32-byte token per person per browser in an httpOnly cookie, hashed in the database. New browsers wait for the office; registered school PCs are trusted for teachers on the matching OS.', category: 'auth', importance: 'secondary', x: 40, y: 34 },
      { id: 'access', label: 'Assignment checks', description: 'AccessService re-resolves teaching assignments on every request — subject teacher, class teacher, division head. Hiding a button in the UI is a convenience, never the boundary.', category: 'auth', importance: 'primary', x: 40, y: 50 },
      { id: 'marks', label: 'Marks & Excel', description: 'Cell PATCH, paste batch and Excel upload all call one normaliseMark(); Excel rows match on the locked Student ID only. Each save returns the cell, the subject result and the subject status.', category: 'core', importance: 'primary', x: 40, y: 66 },
      { id: 'approval', label: 'Review & lock', description: 'draft → submitted → approved, with withdraw, return and reopen. Every move audited; the approval count prints as the revision.', category: 'workflow', importance: 'center', x: 40, y: 82 },
      { id: 'print', label: 'Print · HTML → PDF', description: 'One pure HTML renderer feeds both the on-screen preview and the PDF. Drafts carry a DRAFT — NOT YET APPROVED watermark.', category: 'core', importance: 'secondary', x: 40, y: 96 },
      { id: 'templates', label: 'Template engine', description: 'Card formats as JSONB — terms, subjects, numeric or descriptive components, bands, pass mark, absent policy, co-scholastic legends — validated by zod before every write, and frozen while any card on it is approved.', category: 'core', importance: 'primary', x: 60, y: 28 },
      { id: 'grading', label: 'Grading engine', description: 'Pure functions: totals, percentages, grades (rounded half-up), the absent policy, the Grand Total. The single source of truth — the browser never computes a band.', category: 'core', importance: 'primary', x: 60, y: 50 },
      { id: 'lock', label: 'Section lock', description: 'LockService: a Postgres advisory lock on section:<session>:<section>, taken inside the write’s transaction before the status is read.', category: 'workflow', importance: 'secondary', x: 60, y: 72 },
      { id: 'postgres', label: 'PostgreSQL 15', description: '31 Prisma models over 15 migrations, plus two constraints in hand-written SQL. Sessions live here too (connect-pg-simple).', category: 'data', importance: 'primary', x: 78, y: 40 },
      { id: 'audit', label: 'Audit log', description: 'Append-only, old → new, written in the same transaction as the change it records.', category: 'data', importance: 'secondary', x: 78, y: 62 },
      { id: 'chromium', label: 'Headless Chromium', description: 'puppeteer-core with one shared, memoised browser: at most 2 renders at a time with a first-in-first-out wait list, 30 s timeouts, a relaunch after a disconnect.', category: 'infrastructure', importance: 'leaf', x: 94, y: 20 },
      { id: 'arp', label: 'arp-sync sidecar', description: 'Copies the host’s ARP table into a shared file every second, so the API can read the MAC behind a sign-in. Opens no port.', category: 'infrastructure', importance: 'leaf', x: 94, y: 42 },
      { id: 'backup', label: 'Backup job', description: 'pg_dump → age encryption → rclone, plus a Sunday copy to a local drive; catches up after downtime; emails only on failure; drilled in CI.', category: 'storage', importance: 'leaf', x: 94, y: 64 },
      { id: 'storage', label: 'Object storage', description: 'S3-compatible storage for the encrypted nightly dumps — the only outbound internet dependency of day-to-day running.', category: 'storage', importance: 'leaf', x: 94, y: 86 },
    ],
    edges: [
      { source: 'role-subject', target: 'web', label: 'marks grid', direction: 'two-way' },
      { source: 'role-class', target: 'web', label: '', direction: 'two-way' },
      { source: 'role-division', target: 'web', label: 'review queue', direction: 'two-way' },
      { source: 'role-admin', target: 'web', label: '', direction: 'two-way' },
      { source: 'role-office', target: 'web', label: 'setup · devices', direction: 'two-way' },
      { source: 'web', target: 'caddy', label: 'same-origin /api', direction: 'one-way' },
      { source: 'caddy', target: 'guards', label: 'HTTPS, internal CA', direction: 'one-way' },
      { source: 'guards', target: 'devices', label: 'token re-checked', direction: 'one-way' },
      { source: 'guards', target: 'access', label: '', direction: 'one-way' },
      { source: 'access', target: 'marks', label: 'assigned?', direction: 'one-way' },
      { source: 'access', target: 'approval', label: 'may review?', direction: 'one-way' },
      { source: 'access', target: 'print', label: 'may oversee?', direction: 'one-way' },
      { source: 'marks', target: 'templates', label: 'component rules', direction: 'one-way' },
      { source: 'marks', target: 'lock', label: 'editable?', direction: 'one-way' },
      { source: 'marks', target: 'grading', label: 'result per save', direction: 'one-way' },
      { source: 'approval', target: 'lock', label: 'transition()', direction: 'one-way' },
      { source: 'print', target: 'grading', label: 'card figures', direction: 'one-way' },
      { source: 'print', target: 'chromium', label: 'HTML → PDF', direction: 'one-way' },
      { source: 'lock', target: 'postgres', label: 'pg_advisory_xact_lock', direction: 'two-way' },
      { source: 'templates', target: 'postgres', label: 'JSONB definition', direction: 'two-way' },
      { source: 'marks', target: 'postgres', label: 'MarksEntry', direction: 'two-way' },
      { source: 'approval', target: 'audit', label: 'same transaction', direction: 'one-way' },
      { source: 'marks', target: 'audit', label: 'same transaction', direction: 'one-way' },
      { source: 'devices', target: 'arp', label: 'MAC lookup', direction: 'one-way' },
      { source: 'devices', target: 'postgres', label: 'token hashes', direction: 'two-way' },
      { source: 'audit', target: 'postgres', label: '', direction: 'one-way' },
      { source: 'backup', target: 'postgres', label: 'pg_dump', direction: 'one-way' },
      { source: 'backup', target: 'storage', label: 'age-encrypted', direction: 'one-way' },
      { source: 'backup', target: 'guards', label: 'reports each run', direction: 'one-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'private', shots: [] },
  live: null,
  problem:
    'A school in India prepared its report cards by hand and in Excel. Marks come from handwritten papers, five staff roles share the work, the formats differ from Nursery to Class 12, and the data has to stay on the school’s own server.',
  built:
    'A self-hosted system for the whole report-card cycle: subject teachers enter marks in a keyboard-first grid, by pasting from Excel, or through a pre-filled sheet uploaded with the same validation; class teachers add co-scholastic grades, attendance and remarks and submit; division heads approve and lock, or return with a note; and the cards print as CBSE-format PDFs from the same HTML the preview shows. Every card format is a template stored as data, and the grading engine on the server is the only thing that computes a grade. It is built and tested — 282 automated tests on main — and waits for its on-prem deployment and a Pre-Primary pilot.',
  how: [
    'A review state machine — draft, submitted, approved — where edits are allowed only in draft, approval locks the section, reopening needs a reason, and every move is audited.',
    'A Postgres advisory lock per section serialises status moves and writes, so a save racing an approval either commits first or gets a 409 — tested under concurrent load.',
    'Card formats are JSONB templates validated by zod; the marks-based LKG card and the descriptive Nursery record run side by side on one engine.',
    'One server at the school: Caddy is the only open port, devices need office approval, and a nightly encrypted backup is restored in CI on every pull request.',
  ],
  next: [],
};
