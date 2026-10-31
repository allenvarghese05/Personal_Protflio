/**
 * LearnFlow AI — every fact the case study shows. Checked against the
 * repository (private; local clone, branch v2/canvas-sync-rebuild):
 * backend/services/canvas/*, backend/services/syllabus/*,
 * backend/services/assignments/guide.js, backend/routes/*, web/src/* and the
 * git history. Co-founded with Aahil Afraz; Allen's parts come from git.
 */

export const LINKS = [{ href: 'https://learnflow-ai.app/', label: 'learnflow-ai.app' }];

export const COPY = {
  outcome:
    'A student planner that builds itself: paste your Canvas calendar link and your classes and deadlines appear; upload a syllabus and the rest of the semester fills in.',
  status: 'Beta · not launched yet',
  before: [
    'Classes, deadlines and syllabi live in Canvas, PDFs and your head',
    'Setting up a planner means typing in every class and every due date',
    'Re-importing a calendar overwrites what you changed by hand',
    'A syllabus PDF holds the whole term — meeting times, exams, weights — but nobody reads it twice',
  ],
  after: [
    'One Canvas calendar link → classes created and every deadline on the calendar',
    'Courses are recognised from Canvas’s own tags, reviewed, then linked or created',
    'Re-syncs update only the fields you haven’t touched; past history is never deleted',
    'Upload the syllabus → professor, office hours, a term of lecture times and the assignments Canvas didn’t list',
  ],
  built:
    'Co-founded with Aahil Afraz. Version 1 (2025) was an AI study companion on the desktop that Aahil led and Allen helped ship; it went to beta testers in November 2025. After browsers started building the same help in, Allen rebuilt LearnFlow in October 2026 as a fast web app centred on the planner.',
  next: [
    'Launch — from beta users to an open release.',
    'Keep the planner the centre: every new feature has to save a student setup time, not duplicate what the browser now does.',
    'Scanned syllabi: today a PDF needs real text; image-only PDFs are rejected with a clear message.',
  ],
  headlines: {
    problem: 'Every semester starts with an hour of typing classes and deadlines into a planner.',
    story: 'We built every study feature we could think of — then the browser shipped the same ones. So we cut them and kept what only a planner can do.',
    how: 'From a calendar link and a PDF to a planned semester — and a re-sync that respects your edits.',
    inside: 'A sync that knows what it owns, a syllabus reader that won’t invent, and help for each assignment.',
    decisions: 'Three decisions that make importing safe to repeat.',
    architecture: 'A React web app on an Express API, with Supabase and OpenAI behind it.',
    build: 'A desktop study app in 2025, rebuilt around the planner in 2026.',
    next: 'From beta to launch.',
  },
};

export const FLOW = {
  caption: 'Setting up a semester, step by step',
  figureCaption: 'From a calendar link to a planned semester',
  steps: [
    { key: 'paste', label: 'Paste the link', title: 'Your Canvas calendar feed', body: 'Paste the .ics calendar feed URL from Canvas. The server checks it’s https and ends in .ics, then fetches it (15 s timeout, 10 MB cap).', facts: ['Canvas feeds look like …instructure.com/feeds/calendars/user_….ics', 'Self-hosted Canvas works too — only https + .ics is required'] },
    { key: 'recognise', label: 'Find the courses', title: 'Courses from Canvas’s own tags', body: 'Canvas appends a course tag to every item — “Homework 1 [CT-210-001 - FA 26-27]”. The parser splits it into a course code, section and term, so each course gets a consistent identity.', facts: ['Code, section and term parsed from the last [ … ] group', 'Cross-listed sections handled'] },
    { key: 'map', label: 'Link or create', title: 'Your classes, your call', body: 'A preview proposes what to do with each course: link it to a class you already have (matched by a stored Canvas key, or by course code in the class name) or create a new one. You confirm before anything is written.', facts: ['Actions: link (confident or suggested), create, skip', 'Nothing is written until you confirm'] },
    { key: 'import', label: 'Import', title: 'Events and assignments, typed', body: 'Each item becomes a calendar event and, if Canvas marks it as an assignment, a planner assignment — typed exam, project, reading, milestone or homework by keyword rules.', facts: ['Canvas decides whether something IS an assignment; keywords only refine its type', 'Events of 30+ minutes on a course calendar are treated as class time'] },
    { key: 'syllabus', label: 'Read the syllabus', title: 'A PDF into structured course data', body: 'Upload the syllabus PDF; its text goes to GPT-4o at temperature 0.1 with a strict JSON schema and a rule to use null rather than invent anything. You review and edit the result.', facts: ['Course, instructor, term dates, meeting times, office hours, grading, assignments', 'Rejects files with under 200 characters of text'] },
    { key: 'apply', label: 'Apply it', title: 'A term of lectures, plus what Canvas missed', body: 'Applying fills in the class details, generates lecture events for the whole term from the meeting times, and adds syllabus assignments Canvas didn’t already provide — matched by title similarity so nothing appears twice.', facts: ['Duplicate if title similarity ≥ 0.75, or ≥ 0.4 on the same day', 'Applying merges into the class’s data, keeping the Canvas link'] },
    { key: 'resync', label: 'Re-sync', title: 'Sync again without losing your edits', body: 'Running the sync again updates what changed in Canvas — but only fields you haven’t edited since, and only removes items that vanished from the feed if they’re in the future.', facts: ['Status, grades, notes and AI fields are never touched by sync', 'Past history is never deleted'] },
  ],
};

export const FEATURES = [
  { key: 'sync', label: 'Canvas sync', title: 'A sync that’s safe to run twice', body: 'Ownership rules decide what a re-sync may touch: Canvas owns its calendar rows, but assignments are shared, so a title or due date only updates if you haven’t changed it. Every run is logged.', stat: { value: '3', label: 'rules: owned, shared, never touched' } },
  { key: 'syllabus', label: 'Syllabus', title: 'A reader that won’t invent', body: 'GPT-4o in JSON mode at temperature 0.1, told to return null for anything not in the syllabus and to keep specifics like word counts and late penalties. A review screen sits between the model and your planner.', stat: { value: '0.1', label: 'temperature, JSON-only' } },
  { key: 'guide', label: 'Assignments', title: 'A starter kit for each assignment', body: 'From the Canvas description, pasted instructions or an uploaded PDF, LearnFlow generates a structured plan for the assignment — and only does it automatically when there’s enough real instruction text to work from.', stat: { value: '300', label: 'characters of instructions before auto-generating' } },
  { key: 'assistant', label: 'Class assistant', title: 'A chat that knows the class', body: 'Each class has its own threads with an assistant that answers with the class’s context, streamed to the browser as it’s written.', stat: { value: '7', label: 'chat routes, streamed' } },
];

export const DECISIONS = [
  {
    id: 'ownership',
    kicker: 'Sync',
    title: 'A re-sync must never undo what the student changed',
    problem: 'Calendar imports usually overwrite everything. If a student renamed an assignment or moved a due date, the next sync would silently put it back.',
    decision: 'Explicit ownership: Canvas-sourced calendar rows belong to Canvas and are overwritten freely — which also makes them the record of the last Canvas state. Shared assignment fields only update when their current value still equals that last Canvas value; status, grades, notes and AI fields are never touched.',
    tradeoff: 'More state to keep (the last Canvas value for every field) and more comparisons per sync — in exchange for a sync students can run as often as they like.',
    caption: 'One field, three cases',
    steps: ['Canvas changed it, the student didn’t → update', 'The student changed it → keep the student’s value', 'Neither changed → nothing to do', 'Vanished from the feed and in the future → remove; in the past → keep'],
    readout: 'backend/services/canvas/sync.js — syncAssignments() and pruneRemoved().',
    code: {
      file: 'backend/services/canvas/sync.js',
      lang: 'js',
      body: `// project_assignments are SHARED. Canvas may update a field ONLY if the
// user hasn't changed it (current value still equals the last Canvas value).
if (item.title !== current.title && current.title === previous.title) patch.title = item.title;
if (event.project_id !== current.project_id && current.project_id === previous.project_id)
  patch.project_id = event.project_id;
// status, grade, notes and AI fields are never touched by sync`,
    },
  },
  {
    id: 'identity',
    kicker: 'Courses',
    title: 'Recognise the course from what Canvas already says',
    problem: 'A calendar feed is a flat list of events. To create classes, LearnFlow has to know which events belong to which course — and match them to classes the student may already have.',
    decision: 'Parse the course tag Canvas appends to every title into a code, section and term; propose a mapping per course (link by a stored Canvas key, link by code in the class name, or create) and let the student confirm before writing.',
    tradeoff: 'Schools without course codes get a weaker match (by name), so the preview step is required rather than optional.',
    caption: 'From a title to a class',
    steps: ['“Homework 1 [CT-210-001 - FA 26-27]”', 'Context = the last [ … ] group', 'Code CT-210 · section 001 · term Fall 2026', 'Stored Canvas key matches? → link', 'Code in a class name? → suggest link · otherwise → create'],
    readout: 'courseIdentity.js and projectMatcher.js.',
    code: {
      file: 'backend/services/canvas/courseIdentity.js',
      lang: 'js',
      body: `// "Homework 1 [CT-210-001 - FA 26-27]" → title + course context
const match = raw.match(/^(.*?)\\s*\\[([^\\]]+)\\]\\s*$/s);
const CODE_RE = /\\b([A-Z]{2,5})[\\s-]?(\\d{3,4}[A-Z]?)(?:[\\s-](\\d{3}(?:\\/\\d{3})*|[A-Z]\\d{1,2}))?/;
const TERM_RE = /\\b(FA|SP|SU|WI|FALL|SPRING|SUMMER|WINTER)[\\s-]*(\\d{4}|\\d{2})(?:[\\s-](\\d{2}))?\\b/i;`,
    },
  },
  {
    id: 'noinvent',
    kicker: 'AI',
    title: 'A syllabus reader that says “null” instead of guessing',
    problem: 'A model asked to fill a schema will happily invent a room, a date or a professor’s name — and a wrong exam date in a planner is worse than none.',
    decision: 'JSON mode, temperature 0.1, an explicit schema and rules (“use null for anything not in the syllabus — never invent dates, names, or rooms”), a check that the result looks like a syllabus at all, and a human review screen before anything is applied.',
    tradeoff: 'Some fields come back empty and need filling in by hand; scanned PDFs without text are rejected rather than guessed at.',
    caption: 'The guardrails',
    steps: ['Under 200 characters of text → rejected (likely a scan)', 'GPT-4o, JSON mode, temperature 0.1', 'Rule: null for anything not in the syllabus', 'No course name, code, meetings or assignments → “not a syllabus”', 'The student reviews and edits before applying'],
    readout: 'backend/services/syllabus/parser.js',
    code: {
      file: 'backend/services/syllabus/parser.js',
      lang: 'js',
      body: `const response = await openai.chat.completions.create({
  model: env.openai.syllabusModel,          // gpt-4o
  temperature: 0.1,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: 'You extract structured course information from university syllabi ' +
      'for a student planning app. You are precise and never fabricate.' },
    { role: 'user', content: \`SYLLABUS TEXT: … Return JSON with this shape: \${SCHEMA} \${RULES}\` },
  ],
});`,
    },
  },
];

export const LAYERS = [
  { key: 'who', label: 'Who', nodes: ['student'] },
  { key: 'app', label: 'Web app', nodes: ['canvas-ui', 'calendar-ui', 'class-ui'] },
  { key: 'domain', label: 'Express API', nodes: ['sync', 'syllabus', 'guide', 'assistant'] },
  { key: 'data', label: 'Supabase', nodes: ['db', 'auth'] },
  { key: 'out', label: 'Outside', nodes: ['canvas', 'openai'] },
];

export const TRACES = [
  { id: 'connect', label: 'Connect Canvas', steps: ['student', 'canvas-ui', 'sync', 'canvas', 'sync', 'db'] },
  { id: 'syllabus', label: 'Apply a syllabus', steps: ['student', 'class-ui', 'syllabus', 'openai', 'syllabus', 'db'] },
  { id: 'guide', label: 'Plan an assignment', steps: ['student', 'calendar-ui', 'guide', 'openai', 'db'] },
];

/* ── the case study in one screen ─────────────────────────────────────────── */
export const OVERVIEW = [
  { label: 'What it is', text: 'A planner that sets itself up. Paste your Canvas calendar link and your classes and deadlines appear; upload a syllabus and the term fills in — lectures, office hours and the assignments Canvas didn’t list.' },
  { label: 'Why it exists', text: 'Version 1 was a desktop study companion — explain the screen, take lecture notes, quiz you. Beta testers used it, then browsers built the same help in. What nobody did for you was set up the semester, so LearnFlow became that.' },
  { label: 'What Allen did', text: 'Co-founder. Helped ship version 1 (dashboard, onboarding, the desktop builds), then rebuilt the product himself: the Canvas sync and its ownership rules, the syllabus reader, assignment guides, a class assistant and a new web app.' },
  { label: 'Where it stands', text: 'Beta: real users, not officially launched. The rebuild is about a tenth of the old code — a web app instead of a desktop download.' },
];

/* ── the story — why the product was rebuilt ─────────────────────────────── */
// git history (master vs v2/canvas-sync-rebuild) and learnflow-ai.app
export const STORY = [
  {
    when: 'Jun – Nov 2025',
    title: 'Version 1: every study feature at once',
    body: 'An Electron desktop app that sat beside your work: it could read your screen and explain it, capture lecture audio for live notes, recognise speech, OCR images, and turn material into flashcards, quizzes, mock exams and smart practice — plus reminders and Canvas imports. Aahil led it; Allen worked on the dashboard, onboarding and the desktop builds.',
    kept: [],
    cut: [],
  },
  {
    when: 'Nov 2025',
    title: 'Beta with real students',
    body: 'Cross-platform builds and a release workflow got version 1 into beta testers’ hands. It worked — and it showed what students actually came back for: knowing what’s due and when.',
  },
  {
    when: '2025 – 2026',
    tone: 'turn',
    title: 'The browser caught up',
    body: 'Google built the same kind of help straight into the browser — Gemini in Chrome can explain the page you’re on. A separate desktop app that reads your screen stopped being a reason to install anything. Setting up a semester was still nobody’s job.',
  },
  {
    when: 'Oct 2026',
    title: 'Version 2: strip it to the planner',
    body: 'Allen rebuilt LearnFlow as a web app around one job — getting a student’s semester into a planner without typing it in. Canvas sync, syllabus reading, assignment guides and a class assistant stayed; the desktop app and the features browsers now cover went. About 64,000 lines of source became about 5,600.',
    kept: ['Canvas calendar sync', 'Syllabus → term', 'Assignment guides', 'Class assistant'],
    cut: ['Screen capture', 'Live audio notetaker', 'OCR', 'Flashcards & quizzes', 'Mock exams', 'SMS reminders', 'Desktop app'],
  },
];
