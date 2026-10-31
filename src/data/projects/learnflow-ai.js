/**
 * learnflow-ai — the project's wall card, brief data and case-study copy.
 * Facts from the (private) repository and learnflow-ai.app; the page's own
 * copy lives in src/data/studies/learnflow-ai.js.
 */

export const project = {
  id: 'learnflow-ai',
  kind: 'current',
  cardBadge: 'BETA · CO-FOUNDER',
  badge: 'BETA · CO-FOUNDED',
  label: 'LearnFlow AI',
  subtitle:
    'A student planner that builds itself — paste a Canvas calendar link and your classes and deadlines appear; upload a syllabus and the semester fills in',
  role: 'Co-founder · rebuilt the planner',
  company: 'LearnFlow, with Aahil Afraz',
  dateRange: 'Jun 2025 – Present',
  location: 'learnflow-ai.app',
  repo: null,
  live: 'https://learnflow-ai.app/',
  tags: ['React', 'Vite', 'Express', 'Supabase', 'GPT-4o'],
  metrics: [
    { value: '1 link', label: 'Canvas feed → classes and deadlines' },
    { value: '5', label: 'Assignment types, classified on import' },
    { value: '0.1', label: 'Syllabus model temperature, JSON-only' },
    { value: 'Beta', label: 'Real users, not launched yet' },
  ],
  primaryStack: ['React', 'Vite', 'Tailwind CSS', 'Node.js · Express', 'Supabase (Postgres + Auth)'],
  secondaryStack: ['OpenAI GPT-4o', 'pdf-parse', 'Canvas iCalendar feeds', 'Server-sent events', 'Electron (v1)'],
  keyDecisions: [
    { title: 'A re-sync never undoes the student’s edits', body: 'Canvas owns its calendar rows; shared assignment fields only update when the student hasn’t changed them; past history is never deleted.' },
    { title: 'Recognise the course from what Canvas already says', body: 'The course tag on every Canvas title is parsed into code, section and term, mapped to existing classes, and confirmed before anything is written.' },
    { title: 'A syllabus reader that says null instead of guessing', body: 'GPT-4o in JSON mode at temperature 0.1 with a never-invent rule, a not-a-syllabus check and a review screen.' },
  ],
  timeline: [
    { week: 'Jun – Aug 2025', start: '2025-06-05', end: '2025-08-01', title: 'Version 1', desc: 'The first version — an AI study companion — led by Aahil.', done: true },
    { week: 'Oct – Nov 2025', start: '2025-10-01', end: '2025-11-17', title: 'Toward release', desc: 'Dashboard and onboarding work (Allen), cross-platform builds and release workflow (Aahil, Allen).', done: true },
    { week: 'Oct 7, 2026', start: '2026-10-07', end: '2026-10-07', title: 'v2 — the planner', desc: 'Allen: the Canvas sync pipeline, syllabus parse and apply, assignment guides, the class assistant and a new Vite + React web app.', done: true },
  ],
  architectureGraph: {
    nodes: [
      { id: 'sync', label: 'Canvas sync', description: 'Preview, connect and re-sync a Canvas calendar feed: courses → classes, items → events and assignments, with ownership rules.', category: 'core', importance: 'center', x: 50, y: 22 },
      { id: 'student', label: 'Student', description: 'Connects Canvas, uploads syllabi, plans assignments.', category: 'ui', importance: 'leaf', x: 6, y: 50 },
      { id: 'canvas-ui', label: 'Canvas page', description: 'Paste the feed URL, review the proposed course mapping, run the sync.', category: 'ui', importance: 'primary', x: 26, y: 24 },
      { id: 'calendar-ui', label: 'Calendar & today', description: 'Month/week/day calendar, today view and assignment pages.', category: 'ui', importance: 'primary', x: 26, y: 52 },
      { id: 'class-ui', label: 'Class pages', description: 'Class details, syllabus upload and review, the class assistant.', category: 'ui', importance: 'secondary', x: 26, y: 80 },
      { id: 'syllabus', label: 'Syllabus parse + apply', description: 'PDF text → GPT-4o JSON → review → class details, a term of lecture events and de-duplicated assignments.', category: 'ai', importance: 'primary', x: 50, y: 48 },
      { id: 'guide', label: 'Assignment guides', description: 'A structured plan for an assignment from its description, pasted instructions or a PDF.', category: 'ai', importance: 'secondary', x: 50, y: 70 },
      { id: 'assistant', label: 'Class assistant', description: 'Per-class chat threads with class context, streamed over server-sent events.', category: 'ai', importance: 'secondary', x: 50, y: 90 },
      { id: 'db', label: 'Supabase Postgres', description: 'Classes (projects), calendar events, assignments, sync settings and history, chat threads.', category: 'data', importance: 'primary', x: 74, y: 40 },
      { id: 'auth', label: 'Supabase Auth', description: 'Sign-in; the API checks the user on every route.', category: 'auth', importance: 'secondary', x: 74, y: 76 },
      { id: 'canvas', label: 'Canvas', description: 'The student’s iCalendar feed (.ics).', category: 'infrastructure', importance: 'leaf', x: 94, y: 22 },
      { id: 'openai', label: 'OpenAI', description: 'GPT-4o for syllabi and assignment guides.', category: 'ai', importance: 'leaf', x: 94, y: 60 },
    ],
    edges: [
      { source: 'student', target: 'canvas-ui', label: '', direction: 'two-way' },
      { source: 'student', target: 'calendar-ui', label: '', direction: 'two-way' },
      { source: 'student', target: 'class-ui', label: '', direction: 'two-way' },
      { source: 'canvas-ui', target: 'sync', label: 'preview · connect · sync', direction: 'two-way' },
      { source: 'class-ui', target: 'syllabus', label: 'parse · apply', direction: 'two-way' },
      { source: 'class-ui', target: 'assistant', label: 'SSE', direction: 'two-way' },
      { source: 'calendar-ui', target: 'guide', label: '', direction: 'two-way' },
      { source: 'sync', target: 'canvas', label: 'fetch .ics', direction: 'one-way' },
      { source: 'sync', target: 'db', label: 'upsert · prune · log', direction: 'two-way' },
      { source: 'syllabus', target: 'openai', label: 'gpt-4o, JSON', direction: 'two-way' },
      { source: 'syllabus', target: 'db', label: 'lectures + assignments', direction: 'one-way' },
      { source: 'guide', target: 'openai', label: '', direction: 'two-way' },
      { source: 'guide', target: 'db', label: 'ai_* fields', direction: 'one-way' },
      { source: 'assistant', target: 'db', label: 'threads', direction: 'two-way' },
      { source: 'calendar-ui', target: 'auth', label: '', direction: 'one-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'browser', url: 'learnflow-ai.app', shots: [] },
  live: 'https://learnflow-ai.app/',
  liveLabel: 'Visit LearnFlow',
  problem:
    'Every semester starts with typing classes and deadlines into a planner, and re-importing a calendar overwrites whatever you changed by hand.',
  built:
    'A planner that builds itself: a Canvas calendar link creates the classes and the deadlines, a syllabus PDF fills in the term, and re-syncs respect the student’s edits.',
  how: [
    'Courses are recognised from Canvas’s own tags and confirmed before anything is written.',
    'Shared assignment fields only update if the student hasn’t changed them.',
    'Syllabi are read by GPT-4o at temperature 0.1 with a never-invent rule and a review screen.',
  ],
  next: [],
};
