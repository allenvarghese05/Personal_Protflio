/**
 * The BIS Report Card case study — every fact the page shows, in one place.
 * Components only render this; change copy here.
 *
 * Checked against the repository itself (github.com/allenvarghese05/bis-report-card,
 * private; main = 09976a0, the merge of PR #15, 2026-10-21): backend/prisma/schema.prisma
 * and its migrations, backend/src/{approval,marks,import-export,devices,print,
 * templates,year-setup}, shared/src/{constants.ts,template/*}, frontend/src/lib/grid,
 * frontend/src/components/marks, ops/*, .github/workflows/ci.yml, the README, the
 * specs in docs/specs and the git history. Test counts are the ones GitHub
 * Actions recorded for main (run 39699269179, 2026-10-22). PR #16 (ops,
 * performance, ESLint) is open and unmerged, so nothing from it is shown as
 * built. Values marked "illustrative" (names, ids, reasons typed into the
 * demos) are examples; the rules they run through are the code's.
 */

/* ── who touches a card — README "What it does" ──────────────────────────── */
// Roles follow per-year assignments, so one person can hold several. Account
// rank is a separate, 3-tier thing: administrator > office > teacher.
export const ROLES = [
  { key: 'subject', role: 'Subject teacher', verb: 'enters marks and remarks per subject, then submits the subject' },
  { key: 'class', role: 'Class teacher', verb: 'adds co-scholastic grades, attendance, health and the overall remark; submits the class for review' },
  { key: 'division', role: 'Division head', verb: 'reviews every class in the division: approve and lock, or return with a note' },
  { key: 'admin', role: 'Principal / admin', verb: 'everything, every division; may approve directly and reopen approved cards' },
  { key: 'office', role: 'Office staff', verb: 'school setup: years, classes, sections, the student roster, staff accounts, devices and backups' },
];

/* ── the hero figure: one card, four hands ───────────────────────────────── */
// Each stage lights the part of the card it fills in (`part`).
export const CARD_STAGES = [
  { key: 'marks', who: 'Subject teachers', does: 'type or paste marks', part: 'marks' },
  { key: 'class', who: 'Class teacher', does: 'co-scholastic · attendance · remark → submit', part: 'class' },
  { key: 'review', who: 'Division head', does: 'approve & lock — the watermark goes', part: 'stamp' },
  { key: 'print', who: 'Class teacher · HOD · principal', does: 'print the section as PDF, one card per student', part: 'print' },
];
// What the figure's sample card shows. Subjects and maxima are the
// marks-based Pre-Primary reference template's; the marks, grades and
// attendance are illustrative.
export const CARD_SAMPLE = {
  school: 'Beersheba International School',
  title: 'Report card · PT1',
  subjects: [
    { label: 'English', score: 45, max: 50 },
    { label: 'Hindi', score: 41, max: 50 },
    { label: 'Mathematics', score: 38, max: 50 },
    { label: 'EVS', score: 44, max: 50 },
    { label: 'GK', score: 36, max: 50 },
  ],
  coScholastic: ['A', 'A+', 'B', 'A'],
  attendance: '38 / 40',
  watermark: 'DRAFT — NOT YET APPROVED',
};

/* ── 02 · the review — backend/src/approval/approval.service.ts ─────────── */
export const REVIEW = {
  states: [
    {
      key: 'draft',
      label: 'Draft',
      edit: { code: 200, text: 'Saved — edits are allowed only in draft.' },
      note: 'Editable. Subject teachers enter marks; the class teacher fills the class-level fields.',
    },
    {
      key: 'submitted',
      label: 'Submitted',
      edit: { code: 409, text: '“This section has been submitted for review. Withdraw the submission to make changes.”' },
      note: 'With the division head. Read-only, so the reviewer never sees moving data.',
    },
    {
      key: 'approved',
      label: 'Approved',
      edit: { code: 409, text: '“Report cards for this section are approved and locked. Ask the division head to reopen them.”' },
      note: 'Locked. Prints without the watermark; the approval count is the printed revision.',
    },
  ],
  // every move the service allows — `notify` is the in-app notification it
  // sends (kind + recipient); return and reopen need a reason of 5+ characters
  moves: [
    { key: 'submit', label: 'Submit', from: 'draft', to: 'submitted', by: 'Class teacher', audit: 'section.submit', notify: { kind: 'review_submitted', to: 'the section’s reviewers' } },
    { key: 'withdraw', label: 'Withdraw', from: 'submitted', to: 'draft', by: 'Class teacher', audit: 'section.withdraw', notify: null },
    { key: 'return', label: 'Return with a note', from: 'submitted', to: 'draft', by: 'Division head', audit: 'approval.return', notify: { kind: 'review_returned', to: 'the class teacher, with the note' }, reason: true },
    { key: 'approve', label: 'Approve & lock', from: 'submitted', to: 'approved', by: 'Division head', audit: 'approval.approve', notify: { kind: 'review_approved', to: 'the class teacher' }, count: true },
    { key: 'direct', label: 'Approve from draft', from: 'draft', to: 'approved', by: 'Principal / admin only', audit: 'approval.approve', notify: { kind: 'review_approved', to: 'the class teacher' }, count: true },
    { key: 'reopen', label: 'Reopen', from: 'approved', to: 'draft', by: 'Division head or admin', audit: 'approval.reopen + a ReopenLog row', notify: { kind: 'review_returned', to: 'the class teacher, as “Reopened: <reason>”' }, reason: true },
  ],
  // one section through review — the reasons are illustrative
  run: [
    { move: null, reason: null },
    { move: 'submit' },
    { move: 'return', reason: 'Roll 7’s Hindi oral is missing' },
    { move: 'submit' },
    { move: 'approve' },
    { move: 'reopen', reason: 'A student’s name is misspelt' },
    { move: 'submit' },
    { move: 'approve' },
  ],
  watermark: 'DRAFT — NOT YET APPROVED',
  // report-card-html.renderer.ts:457 — printed only when the count passes 1
  revision: (n) => (n > 1 ? `Revision ${n}` : null),
};

/* ── 03 · templates — shared/src/template/reference-templates.ts ─────────── */
// The two reference templates are the only real templates in the repo. They
// are BIS Pre-Primary templates whose structure follows two paper samples.
export const TEMPLATES = [
  {
    key: 'marks',
    label: 'LKG / UKG · marks',
    source: 'structure after a Guru Nanak paper sample',
    terms: ['PT1', 'HALF_YEARLY', 'PT2', 'YEARLY'],
    subjectCount: 5,
    subject: {
      label: 'English',
      // grading.spec.ts:59 — a hand-calculated test case
      components: [
        { key: 'WRITTEN', label: 'Written', max: 30, value: 27 },
        { key: 'READING', label: 'Reading', max: 5, value: 4 },
        { key: 'WRITING', label: 'Writing', max: 5, value: 5 },
        { key: 'DICTATION', label: 'Dictation', max: 5, value: 4 },
        { key: 'RECITATION', label: 'Recitation', max: 5, value: 5 },
      ],
    },
    coScholastic: {
      label: 'Activities',
      rows: ['Moral Science', 'Computer', 'Art Craft', 'Music Dance'], // the keys, humanised as the engine does
      scale: ['A+', 'A', 'B', 'C', 'D'],
      legend: null,
    },
  },
  {
    key: 'descriptive',
    label: 'Nursery · descriptive',
    source: 'structure after a Montfort paper sample',
    terms: ['QUARTERLY', 'HALF_YEARLY', 'ANNUAL_EXAM'],
    subjectCount: 5,
    subject: {
      label: 'English',
      options: ['Not so well', 'Well', 'Very well'],
      // the six "I can …" lines; the picks are illustrative
      components: [
        { key: 'SAY_RHYMES', label: 'I can say rhymes', pick: 2 },
        { key: 'COMPREHEND', label: 'I can comprehend / narrate a story', pick: 1 },
        { key: 'EXPRESS', label: 'I can express myself in English', pick: 1 },
        { key: 'BEGIN_SOUND', label: 'I can recognise beginning sound', pick: 2 },
        { key: 'PRE_WRITING', label: 'I can make pre-writing strokes', pick: 0 },
        { key: 'WRITE_ENG', label: 'I can write English', pick: 1 },
      ],
    },
    // the same letter, three meanings — legends are scoped per category
    coScholastic: {
      label: 'Co-scholastic',
      categories: [
        { key: 'LONG_MUSCLE_DEV', label: 'Long Muscle Development', a: 'Very well' },
        { key: 'FINE_MUSCLE_DEV', label: 'Fine Muscle Development', a: 'All the time' },
        { key: 'PERSONALITY_DEV', label: 'Personality Development', a: 'Very good' },
      ],
    },
  },
];

// What a template defines (template-definition.schema.ts)
export const TEMPLATE_PARTS = ['terms', 'subjects → components', 'numeric max or descriptive options', 'grading bands', 'pass mark', 'absent policy', 'co-scholastic + legends', 'extra fields', 'print layout'];

// Template edits, checked: the zod schema runs before every write; the freeze
// (templates.service.ts, PR #14 H6) runs while any section on it is approved.
// The section named in the freeze message is the seed data's LKG section A.
export const TEMPLATE_PROBES = [
  { key: 'total', label: 'totalMax 45, parts sum to 50', by: 'zod', ok: false, says: 'Subject "ENGLISH" totalMax 45 ≠ sum of component maxMarks 50' },
  { key: 'overlap', label: 'B band 56–76 (A starts at 75)', by: 'zod', ok: false, says: 'Grade bands B and A overlap' },
  { key: 'legend', label: 'Legend mentions grade E', by: 'zod', ok: false, says: 'Category "LONG_MUSCLE_DEV" legend mentions grade "E" not in its gradeScale' },
  { key: 'frozen', label: 'Change the pass mark (cards approved)', by: 'freeze', ok: false, says: 'Cannot change the pass mark: report cards are approved on this template — LKG - A (PT1). Reopen them first, or make the change in next year’s template.' },
  { key: 'label', label: 'Rename a label (cards approved)', by: 'freeze', ok: true, says: 'Saved — labels, notes and order are cosmetic and always pass.' },
];

/* ── 04 · marks entry — three ways in, one validator ─────────────────────── */
// mark-validation.ts: normaliseMark() is called by the cell PATCH, the paste
// batch and the Excel import alike. Messages are the code's own.
export const MARK_COLUMNS = [
  { key: 'WRITTEN', label: 'Written', max: 30 },
  { key: 'ORAL', label: 'Oral', max: 20 },
];
export const MARK_PATHS = [
  {
    key: 'type',
    label: 'Type in the grid',
    route: 'PATCH …/marks/:studentId/:componentKey',
    note: 'One cell per request. The browser turns text into a request (AB, abs or absent = Absent); the server judges the value.',
    // what a teacher types; the verdicts are computed by the code's own rules
    rows: [
      { input: '24', col: 'WRITTEN' },
      { input: '31', col: 'WRITTEN' },
      { input: 'ab', col: 'ORAL' },
      { input: '12.345', col: 'WRITTEN' },
      { input: '-2', col: 'ORAL' },
      { input: 'twelve', col: 'WRITTEN' },
    ],
  },
  {
    key: 'paste',
    label: 'Paste from Excel',
    route: 'PUT …/marks (batch)',
    note: 'A block copied from Excel or Sheets, pasted at roll 3 of a five-student grid. Gaps are skipped, so a paste never erases a mark; what falls off the grid is counted, not guessed.',
    origin: 2, // pasted at row index 2 (roll 3)
    gridRows: 5,
    // marks already in the grid before the paste (illustrative): roll 4's Written
    existing: { '3-0': '20' },
    matrix: [
      ['24', '18'],
      ['', '17'],
      ['31', 'AB'],
      ['22', '19'],
    ],
  },
  {
    key: 'upload',
    label: 'Upload the Excel sheet',
    route: 'POST …/excel/upload',
    note: 'The downloaded sheet carries each student’s id in its first column. Rows match on that id alone — an edited roll number is refused, never guessed. Ids and values are illustrative; the reasons are the code’s.',
    // this section's students (id → roll), then the uploaded rows, all in
    // the Written column; the verdicts are computed by the code's own rules
    roster: { 41: '1', 42: '2', 43: '3', 44: '4', 45: '5' },
    rows: [
      { row: 3, id: '41', roll: '1', value: '26' },
      { row: 4, id: '42', roll: '2', value: 'A' },
      { row: 5, id: '', roll: '1', value: '7' },
      { row: 6, id: '88', roll: '1', value: '8' },
      { row: 7, id: '45', roll: '99', value: '9' },
      { row: 8, id: '44', roll: '4', value: '35' },
    ],
  },
];

/* ── 05 · grading — backend/src/marks/grading/grading.ts ─────────────────── */
// The marks-based reference template's scale; cases from grading.spec.ts.
export const GRADING = {
  scale: [
    { grade: 'A+', min: 90, max: 100 },
    { grade: 'A', min: 75, max: 89 },
    { grade: 'B', min: 56, max: 74 },
    { grade: 'C', min: 35, max: 55 },
    { grade: 'D', min: 1, max: 34 },
  ],
  absent: {
    subject: 'Mathematics',
    components: [
      { key: 'WRITTEN', label: 'Written', max: 30, value: 24, absent: false },
      { key: 'ORAL', label: 'Oral', max: 20, value: null, absent: true },
    ],
    policies: [
      { key: 'exclude_component', label: 'exclude_component', note: 'The absent part leaves the denominator: graded on what was sat.' },
      { key: 'count_as_zero', label: 'count_as_zero', note: 'The absent part scores 0 and stays in the denominator.' },
    ],
  },
  // grading.spec.ts:203-226 — the H8 fix (PR #14)
  overall: [
    { label: 'English', total: 40, max: 45, note: 'one component absent' },
    { label: 'Mathematics', total: 10, max: 50 },
  ],
  rounding: [89.4, 89.5, 34.5, 0],
};

/* ── 06 · operations — docker-compose.yml, ops/*, ci.yml ──────────────────── */
export const OPS = {
  // the six Compose services; only Caddy publishes ports (CI asserts it)
  services: [
    { key: 'caddy', label: 'caddy', note: 'the one door · 80 → 443, its own internal CA', ports: '80 · 443' },
    { key: 'frontend', label: 'frontend', note: 'Next.js web app' },
    { key: 'api', label: 'api', note: 'NestJS, same-origin at /api' },
    { key: 'postgres', label: 'postgres', note: 'PostgreSQL 15' },
    { key: 'arp-sync', label: 'arp-sync', note: 'host-network sidecar: copies the ARP table every 1 s · opens no port' },
    { key: 'backup', label: 'backup', note: 'the nightly job below' },
  ],
  steps: ['pg_dump', 'age-encrypt to the school’s public key', 'rclone to S3-compatible storage', 'Sundays: copy to a local drive', 'report to Administration → Backups', 'email only on failure'],
  // ops/backup-cron.sh
  rule: {
    hour: 2, // BACKUP_HOUR default 02
    dueAfterH: 24, // always due once the last success is this old
    atHourAfterH: 20, // due at BACKUP_HOUR once it is this old
    checkMin: 5, // CHECK_EVERY=300
    retryMin: 60, // after a failure
  },
  // three days of the scheduler, simulated with that rule (hours from Day 1
  // 00:00; the last success before the window was Day 0 at 02:00). Runs are
  // assumed to finish inside one 5-minute check.
  scenarios: [
    { key: 'normal', label: 'Normal nights', off: [], fail: [] },
    { key: 'off', label: 'Server off at 02:00', off: [[23, 33]], fail: [] },
    { key: 'fail', label: 'Upload fails once', off: [], fail: [26] },
  ],
  retentionDays: 14, // local copies (backup.sh RETENTION_DAYS)
  // ci.yml — backup-restore-drill, on every push to main and every PR
  drill: ['Migrate + seed a database', 'Build the backup image', 'age key', 'backup.sh', 'restore.sh → a fresh database', 'students / marks / users counts match, not empty'],
};

/* ── 07 · three hard problems ────────────────────────────────────────────── */
export const DECISIONS = [
  {
    id: 'lock',
    kicker: 'Concurrency',
    title: 'A mark saved at the moment of approval must never land in a locked card',
    problem:
      '“Check the status, then write” is a race: a teacher’s save can read “draft”, the division head’s approve commits, and the save lands in a card that is already locked. Two reviewers pressing Approve together could also both succeed.',
    decision:
      'Every status move and every write runs in one transaction that first takes a Postgres advisory lock on a named key — section:<session>:<section> — and only then reads the status. The key is hashed with hashtextextended, so different lock concerns can’t collide; several locks are always taken in sorted order, so two transactions can’t deadlock; and no row has to exist, so a section that was never submitted is covered too.',
    tradeoff:
      'Writes to one section are serialised: one extra round trip, and a save can wait behind an approve. The proof is a test: approve plus 8 simultaneous cell saves, five rounds — every save gets 200 or 409, and no mark is ever updated after lockedAt. Two simultaneous approves: exactly one wins, and the revision goes up by one.',
    saves: 8,
    rounds: 5,
    // the position the approve takes in the lock queue each round — an
    // illustrative ordering; the real one is whatever Postgres grants
    approveAt: [3, 6, 1, 8, 4],
    code: {
      file: 'backend/src/approval/lock.service.ts',
      lang: 'ts',
      body: `transition<T>(examSessionId: number, sectionId: number,
  work: (tx: Prisma.TransactionClient, status: ReviewStatus) => Promise<T>): Promise<T> {
  return this.prisma.$transaction(async (tx) => {
    await this.acquire(tx, examSessionId, sectionId);           // lock first …
    return work(tx, await this.getReviewStatus(examSessionId, sectionId, tx)); // … then read
  });
}

lockSection(tx: Prisma.TransactionClient, examSessionId: number, sectionId: number) {
  return this.lockKey(tx, \`section:\${examSessionId}:\${sectionId}\`);
}

private lockKey(tx: Prisma.TransactionClient, name: string) {
  return tx.$executeRaw\`SELECT pg_advisory_xact_lock(hashtextextended(\${name}, 0))\`;
}`,
    },
  },
  {
    id: 'devices',
    kicker: 'Shared computers',
    title: 'One lab PC, many teachers — and a stolen password still isn’t enough',
    problem:
      'Each new browser waits for the office to approve it (PR #12). But one token per browser meant every teacher who sat at a lab PC overwrote the last teacher’s approval — in the commit’s words, the office would have switched to “notify only” in week one.',
    decision:
      'The device cookie became a map: one random token per person (u<id>) plus one school token, the 20 most recent kept, only their SHA-256 hashes stored. The office can register a PC by MAC address, read from the host’s ARP table by a sidecar. A sign-in from it is trusted as a school device only if the browser’s OS matches the registration, the person isn’t an approver and isn’t still on a temporary password. The guard re-checks the device token on every request.',
    tradeoff:
      'MAC matching is best-effort by design: it works only on the server’s own network segment, phones randomise MACs, and MACs can be spoofed. Behind a lab’s own router everything shares one MAC — hence the OS check, and a MAC seen with more than one OS in 30 days can’t be registered at all. So it is never the only lock, and the office is told every time.',
    // illustrative people and machines; `cookie` = the per-person tokens the
    // browser already holds (people who signed in there before)
    people: [
      { key: 'teacher', label: 'Teacher', id: 14, approver: false, tempPassword: false },
      { key: 'temp', label: 'Teacher · temporary password', id: 22, approver: false, tempPassword: true },
      { key: 'office', label: 'Office staff', id: 3, approver: true, tempPassword: false },
    ],
    machines: [
      { key: 'lab', label: 'Lab PC 3 · Windows', mac: 'registered', os: 'Windows', registeredOs: 'Windows', cookie: ['u2'], note: 'the principal signed in here earlier — approvers always get a personal token, so it holds u2' },
      { key: 'phone', label: 'Phone on the lab Wi-Fi', mac: 'registered', os: 'Android', registeredOs: 'Windows', cookie: [], note: 'behind the lab’s own router, so the server sees the registered MAC' },
      { key: 'laptop', label: 'Own laptop', mac: null, os: 'macOS', registeredOs: null, cookie: [] },
    ],
    code: {
      file: 'backend/src/devices/devices.service.ts',
      lang: 'ts',
      body: `// createDevice — a browser this person has never used before
const schoolComputer =
  registered &&
  this.mayUseSchoolComputer(user) &&              // not an approver, no temporary password
  osFamily(meta.userAgent) === registered.osFamily &&
  !(await this.macs.isGateway(mac!))
    ? registered
    : null;
const kind = schoolComputer ? 'school' : 'personal';
const status: DeviceStatus =
  schoolComputer || bootstrap || policy === 'notify' ? 'trusted' : 'pending';

// withDeviceToken — re-add at the end, keep the most recent 20
const { [key]: _old, ...rest } = cookie;
const entries = [...Object.entries(rest), [key, token]].slice(-DEVICE_COOKIE_MAX_TOKENS);`,
    },
  },
  {
    id: 'roll',
    kicker: 'Integrity',
    title: 'Roll numbers: unique among active students — yet reusable, and renumberable',
    problem:
      'A student who leaves keeps their old roll number, and a newcomer may take it. Promotion and its undo renumber a whole section inside one transaction, so for a moment two rows share a roll. A plain unique index forbids all three.',
    decision:
      'A partial, deferrable EXCLUDE constraint: (section, roll) must differ only WHERE the student is active, and the check waits until COMMIT. A unique index can’t be both partial and deferrable; this is the one Postgres primitive that is.',
    tradeoff:
      'Prisma can’t express it, so it lives in hand-written migration SQL (and needs btree_gist), and the app checks first to give a friendlier message. A test proves the database refuses a duplicate active roll (23P01) but lets a newcomer reuse a leaver’s.',
    // illustrative students in one section
    scenarios: [
      {
        key: 'renumber',
        label: 'Renumber A–Z',
        students: [
          { name: 'Aarav', active: true, roll: 2 },
          { name: 'Diya', active: true, roll: 1 },
          { name: 'Kabir', active: true, roll: 3 },
        ],
        steps: [
          { who: 'Aarav', roll: 1, note: 'Aarav and Diya both hold roll 1 — allowed mid-transaction' },
          { who: 'Diya', roll: 2, note: 'resolved' },
        ],
        ok: true,
        says: 'COMMIT — the deferred check runs once, on the final numbers, and passes.',
      },
      {
        key: 'reuse',
        label: 'Reuse a leaver’s roll',
        students: [
          { name: 'Ishaan', active: false, roll: 4 },
          { name: 'Meera', active: true, roll: 6 },
        ],
        steps: [{ who: 'Meera', roll: 4, note: 'Ishaan has left — the constraint only compares active students' }],
        ok: true,
        says: 'COMMIT — passes. A leaver’s roll is free to reuse.',
      },
      {
        key: 'clash',
        label: 'Two active, one roll',
        students: [
          { name: 'Aarav', active: true, roll: 1 },
          { name: 'Diya', active: true, roll: 2 },
        ],
        steps: [{ who: 'Diya', roll: 1, note: 'two active students on roll 1' }],
        ok: false,
        says: 'COMMIT refused — 23P01, students_active_roll_no_unique.',
      },
    ],
    code: {
      file: 'backend/prisma/migrations/20261019200000_roll_uniqueness_and_audit_index/migration.sql',
      lang: 'sql',
      body: `CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "students"
  ADD CONSTRAINT "students_active_roll_no_unique"
  EXCLUDE USING gist ("section_id" WITH =, "roll_no" WITH =)
  WHERE ("enrollment_status" = 'active')
  DEFERRABLE INITIALLY DEFERRED;`,
    },
  },
];

/* ── architecture — layers, and the paths real requests take ──────────────── */
// node ids are architectureGraph node ids in src/data/projects/bis-report-card.js
export const LAYERS = [
  { key: 'who', label: 'Who', nodes: ['role-subject', 'role-class', 'role-division', 'role-admin', 'role-office'] },
  { key: 'door', label: 'The door', nodes: ['web', 'caddy'] },
  { key: 'api', label: 'NestJS API', nodes: ['guards', 'devices', 'access', 'marks', 'approval', 'print'] },
  { key: 'rules', label: 'Rules · shared', nodes: ['templates', 'grading', 'lock'] },
  { key: 'data', label: 'Data', nodes: ['postgres', 'audit'] },
  { key: 'out', label: 'Beside the app', nodes: ['chromium', 'arp', 'backup', 'storage'] },
];

export const TRACES = [
  { id: 'save', label: 'Save a mark', steps: ['role-subject', 'web', 'caddy', 'guards', 'access', 'marks', 'templates', 'lock', 'postgres', 'audit', 'grading'] },
  { id: 'approve', label: 'Approve a section', steps: ['role-division', 'web', 'caddy', 'guards', 'access', 'approval', 'lock', 'postgres', 'audit'] },
  { id: 'print', label: 'Print a section', steps: ['role-class', 'web', 'caddy', 'guards', 'access', 'print', 'postgres', 'grading', 'chromium'] },
  { id: 'signin', label: 'Sign in on a lab PC', steps: ['role-subject', 'web', 'caddy', 'devices', 'arp', 'postgres', 'audit'] },
  { id: 'backup', label: 'Nightly backup', steps: ['backup', 'postgres', 'storage', 'guards'] },
];

/* ── data model — backend/prisma/schema.prisma: 31 models, 0 Postgres enums ── */
export const DATA_MODEL = {
  engine: 'Prisma 5 · PostgreSQL 15',
  domains: [
    { key: 'academic', label: 'School structure', models: [
      { name: 'AcademicYear', note: 'one per year · the wizard clones the next' },
      { name: 'ClassGroup', note: 'Pre-Primary, Primary, Middle, Secondary, Senior Secondary' },
      { name: 'Stream', note: 'Senior Secondary only · Science / Commerce / Humanities' },
      { name: 'SchoolClass', note: 'a class in a group · seeded: Nursery, LKG, UKG' },
      { name: 'Section', note: 'pins its report-card template' },
      { name: 'Student', note: 'admission no. unique · never hard-deleted' },
    ] },
    { key: 'security', label: 'Staff & access', models: [
      { name: 'User', note: 'admin / office flags · temporary password · who set it' },
      { name: 'TrustedDevice', note: 'token hash only · personal or school · pending / trusted / revoked' },
      { name: 'SchoolComputer', note: 'a registered PC: MAC + OS' },
      { name: 'SchoolSetting', note: 'school-wide switches, e.g. the device policy' },
      { name: 'SubjectTeacherAssignment', note: 'who teaches what, per year' },
      { name: 'ClassTeacherAssignment', note: 'one per section per year' },
      { name: 'DivisionHeadAssignment', note: 'reviews a whole class group' },
      { name: 'HttpSession', note: 'server-side sessions · deleting a row logs out' },
    ] },
    { key: 'templates', label: 'Templates', models: [
      { name: 'ReportCardTemplate', note: 'definition + print layout as JSONB · validated before every write' },
      { name: 'Subject', note: 'stable key matched inside templates' },
      { name: 'TemplateSubject', note: 'which subjects a template uses' },
      { name: 'StudentSubjectEnrollment', note: 'rows for electives only' },
    ] },
    { key: 'entries', label: 'Exams & entries', models: [
      { name: 'ExamSession', note: 'a term key from the template · order for carry-forward' },
      { name: 'ExamSessionSubjectStatus', note: 'not started → in progress → submitted, counts' },
      { name: 'MarksEntry', note: 'key-value: session · student · subject · component' },
      { name: 'RemarkEntry', note: 'carried forward from last term until edited' },
      { name: 'CommentBank', note: 'phrases ranked by tags and use' },
      { name: 'ClassTeacherEntry', note: 'co-scholastic, attendance, health by field key' },
    ] },
    { key: 'review', label: 'Review & record', models: [
      { name: 'ReportCardLock', note: 'draft / submitted / approved · approval count = revision' },
      { name: 'ReopenLog', note: 'every reopen, with its reason' },
      { name: 'AuditLog', note: 'append-only, old → new' },
      { name: 'Notification', note: 'in-app only · eight kinds' },
      { name: 'BackupLog', note: 'each nightly run, success or failure' },
    ] },
    { key: 'year', label: 'New year', models: [
      { name: 'PromotionRun', note: 'one transaction · undoable for 24 h' },
      { name: 'StudentPromotion', note: 'promoted, retained, left or renumbered' },
    ] },
  ],
  // how the schema grew (git history of schema.prisma)
  growth: [
    { when: 'Oct 6', models: 25 },
    { when: 'Oct 9', models: 26 },
    { when: 'Oct 15', models: 28 },
    { when: 'Oct 19', models: 30 },
    { when: 'Oct 21', models: 31 },
  ],
};

/* ── how it was built — the git history and CI in numbers ────────────────── */
export const BUILD = {
  totals: [
    { value: '15', label: 'merged pull requests (a 16th open)' },
    { value: '53', label: 'commits across all branches, one author' },
    { value: '~28k', label: 'lines of TypeScript, plus ~8k of tests' },
    { value: '15', label: 'database migrations' },
  ],
  // .github/workflows/ci.yml — one workflow, four jobs, on every push to main
  // and every PR (the shared Quality block calls each lane a "workflow")
  ci: [
    { name: 'test', when: 'ci.yml job · every PR, push to main', steps: ['tsc (no unused)', 'Prettier', 'Unit · shared, API, web', 'API e2e · real Postgres', 'next build'] },
    { name: 'browser-e2e', when: 'ci.yml job · needs test', steps: ['Production web build', 'Fresh database', 'Playwright · Chromium', '11 spec files'] },
    { name: 'backup-restore-drill', when: 'ci.yml job · needs test', steps: ['Seed a database', 'backup.sh', 'restore.sh', 'Row counts match'] },
    { name: 'docker', when: 'ci.yml job · needs test', steps: ['Validate compose', 'Only caddy publishes ports', 'Build API image', 'Build web image'] },
  ],
  // main, CI run 39699269179 (2026-10-22)
  suites: [
    { value: '136', label: 'unit tests · 28 shared, 66 API, 42 web' },
    { value: '90', label: 'API e2e tests, real Postgres' },
    { value: '56', label: 'browser tests, Playwright' },
    { value: '282', label: 'in all, green on main' },
  ],
};

/* ── the page's own copy ─────────────────────────────────────────────────── */
export const COPY = {
  outcome:
    'A report card system that lives inside the school: one server on the school’s own network, no cloud — teachers enter marks, a review locks them, and the office prints CBSE-format cards from templates the school controls.',
  status: 'Built · rollout with the school in talks',
  // requirement (docs/specs/00) → what was built
  before: [
    'Replace manual and Excel-based report card preparation',
    'Marks come from handwritten papers — no OCR, so entry has to be fast',
    'Nursery to Class 12, in very different card formats',
    'Subject teacher → class teacher → division head, then print',
    'Data stays at the school, and the office can only do basic upkeep',
  ],
  after: [
    'A marks grid per subject; totals, percentages and grades come from the server as you type',
    'Enter and Tab advance, a column pastes straight from Excel, AB means absent — or fill the same sheet offline',
    'Formats are templates stored as data: a marks-based LKG card and a descriptive Nursery record already run side by side',
    'One review state machine: edits only in draft, approval locks, reopening needs a reason, every move is audited',
    'One server at the school behind one HTTPS door, and a nightly encrypted backup that only speaks up when it fails',
  ],
  // what's next — README "Status against the phase plan" (Phases 21–27) and PR #16
  next: [
    'Rollout with the school — the integration is being discussed with them now.',
    'Stand the box up on the school’s own server: Docker on Ubuntu, reached from home over Tailscale. The deployment runbook is written.',
    'A Pre-Primary pilot: one real exam cycle with real teachers, on the two templates that exist today.',
    'Primary through Senior Secondary formats, one class group at a time, from the school’s real cards — added in the template console, not in code.',
  ],
};

/* ── the case study in one screen ─────────────────────────────────────────── */
export const OVERVIEW = [
  { label: 'What it is', text: 'The school’s own report card system. Subject teachers enter marks, class teachers consolidate, division heads approve and lock, and the office prints CBSE-format report cards — every card format coming from one template engine.' },
  { label: 'Why it exists', text: 'Report cards were prepared by hand and in Excel. Student data should stay at the school, the internet there can’t be relied on, and nobody on site should have to run a cloud service — so it runs on one server inside the school, on its own network.' },
  { label: 'What Allen built', text: 'Solo (AI-assisted): the specs, a NestJS API, a Next.js app, the template engine and the template console, PDF printing, Excel import, the locking review, device controls for shared lab computers, encrypted backups, Docker ops and CI.' },
  { label: 'Where it stands', text: 'Built and tested — phases 1–20 are done. The rollout with the school is being discussed now: next is installing it on the school’s server and a first pilot with real teachers.' },
];

/* ── the template console — the school's control panel for card formats ─── */
// frontend/src/components/admin/templates-admin.tsx · shared/src/template/*.ts
export const TEMPLATE_CONSOLE = {
  intro: 'Adding or redesigning a card format is a data change, not a code change. In the admin console the school edits a template’s definition and its print layout, checks it, and saves — and the next print uses it.',
  definition: ['Terms', 'Subjects → components', 'Max marks or descriptive options', 'Grading bands', 'Pass mark', 'Absent policy', 'Co-scholastic areas, each with its own legend', 'Extra fields'],
  page: ['Page size: A4 or Letter', 'Portrait or landscape', 'Margins (5–30 mm)', 'Heading and body fonts', 'Document title', 'Subtitle line'],
  layouts: [
    { key: 'numeric', label: 'Progress Report (marks)', blocks: ['Header', 'Student details', 'Scholastic Areas — marks table', 'Co-Scholastic Areas', 'Attendance', 'Extra fields', 'Remarks', 'Grading legend', 'Signatures'] },
    { key: 'descriptive', label: 'Achievement Record (descriptive)', blocks: ['Header', 'Student details', 'Learning Outcomes — skills table', 'Development Areas (new page)', 'Attendance', 'Remarks', 'Signatures'] },
  ],
  steps: ['Start from a reference template, or paste a new one', 'Edit the definition and the print layout', 'Check it — the server validates it against the schema', 'Save — the next print uses it'],
  guard: 'While any report card on a template is approved, changes that would re-grade it — the grading scale, pass mark, absent policy, components, subjects — are refused, naming the sections; labels and notes can still change.',
};
