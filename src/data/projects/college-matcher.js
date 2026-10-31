/**
 * college-matcher — the project's wall card, brief data and case-study copy.
 * Facts from the repository (allenvarghese05/college-matcher); the page's own
 * copy lives in src/data/studies/college-matcher.js.
 */

export const project = {
  id: 'college-matcher',
  kind: 'project',
  cardBadge: 'PERSONAL PROJECT',
  badge: 'PERSONAL PROJECT · SOLO',
  label: 'College Matcher',
  subtitle:
    'Explainable college matching — a 100-point score you can read part by part, a balanced safety/target/reach list, and a GPT-4 voice counselor for careers',
  role: 'Solo full-stack developer',
  company: 'Personal project',
  dateRange: 'Aug 2025',
  location: 'React · Express · GPT-4',
  repo: 'https://github.com/allenvarghese05/college-matcher',
  live: null,
  flowEnd: 'MATCHES',
  tags: ['React', 'Express', 'GPT-4', 'Web Speech API', 'Node.js'],
  metrics: [
    { value: '100', label: 'Point score, split into 5 parts' },
    { value: '3', label: 'Categories: safety, target, reach' },
    { value: '14', label: 'API routes' },
    { value: '21', label: 'Detailed career profiles' },
  ],
  primaryStack: ['React 18', 'Express', 'Node.js', 'OpenAI GPT-4', 'Web Speech API'],
  secondaryStack: ['React Router', 'Axios', 'Multer'],
  keyDecisions: [
    { title: 'Weights you can defend', body: 'Academic 50, financial 20, personality 15, location & size 10, activities 5 — returned as a breakdown with the top reasons.' },
    { title: 'Realism caps', body: 'A GPA under 80% of a school’s average caps it at 30; tuition over 1.5× the budget caps it at 20.' },
    { title: 'A list with safeties in it', body: 'Schools are labelled safety, target or reach and balanced by the student’s GPA into a top ten.' },
  ],
  timeline: [
    { week: 'Aug 6', start: '2025-08-06', end: '2025-08-06', title: 'The prototype', desc: 'Matching engine, career matcher, the Alex voice counselor, the React client — one commit.', done: true },
  ],
  architectureGraph: {
    nodes: [
      { id: 'match', label: 'Matching engine', description: 'Five weighted parts, realism caps, admission odds and a balanced top ten with reasons.', category: 'core', importance: 'center', x: 50, y: 30 },
      { id: 'student', label: 'Student', description: 'Takes the assessment, talks to Alex, browses schools.', category: 'ui', importance: 'leaf', x: 6, y: 50 },
      { id: 'assess-ui', label: 'Assessment', description: 'A multi-step form with progress tracking.', category: 'ui', importance: 'primary', x: 26, y: 24 },
      { id: 'voice-ui', label: 'Voice counselor UI', description: 'Speech recognition and synthesis in the browser, with pause and resume.', category: 'ui', importance: 'primary', x: 26, y: 52 },
      { id: 'browse', label: 'Browse schools', description: 'Search and filter the school list; school profiles and reviews.', category: 'ui', importance: 'secondary', x: 26, y: 80 },
      { id: 'career', label: 'Career matcher', description: 'Matches assessment answers to career profiles with salaries and skill gaps.', category: 'core', importance: 'primary', x: 50, y: 62 },
      { id: 'counselor', label: 'AI counselor (Alex)', description: 'GPT-4 sessions with phases, follow-up questions and pause/resume.', category: 'ai', importance: 'primary', x: 50, y: 88 },
      { id: 'schools', label: 'Schools dataset', description: 'A starter set of 10 schools: tuition, acceptance rate, average GPA, programs, personality match.', category: 'data', importance: 'secondary', x: 74, y: 34 },
      { id: 'careers', label: 'Career profiles', description: '21 detailed profiles with skills, majors, salary range and outlook.', category: 'data', importance: 'secondary', x: 74, y: 66 },
      { id: 'openai', label: 'OpenAI', description: 'GPT-4, temperature 0.7.', category: 'ai', importance: 'leaf', x: 94, y: 80 },
      { id: 'speech', label: 'Web Speech API', description: 'The browser’s speech recognition and synthesis.', category: 'infrastructure', importance: 'leaf', x: 94, y: 40 },
    ],
    edges: [
      { source: 'student', target: 'assess-ui', label: '', direction: 'two-way' },
      { source: 'student', target: 'voice-ui', label: '', direction: 'two-way' },
      { source: 'student', target: 'browse', label: '', direction: 'two-way' },
      { source: 'assess-ui', target: 'match', label: 'POST /api/assessment', direction: 'two-way' },
      { source: 'voice-ui', target: 'counselor', label: 'voice/chat', direction: 'two-way' },
      { source: 'voice-ui', target: 'speech', label: '', direction: 'two-way' },
      { source: 'browse', target: 'schools', label: 'GET /api/schools', direction: 'one-way' },
      { source: 'match', target: 'schools', label: 'score each', direction: 'one-way' },
      { source: 'counselor', target: 'openai', label: 'gpt-4', direction: 'two-way' },
      { source: 'counselor', target: 'career', label: 'on complete', direction: 'one-way' },
      { source: 'career', target: 'careers', label: '', direction: 'one-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'browser', shots: [] },
  live: null,
  problem:
    'College rankings give one opaque number; students need to know why a school fits, whether they can get in and afford it, and a balanced list — not ten reaches.',
  built:
    'A React + Express prototype with an explainable 100-point matching engine, a safety/target/reach balance, and Alex — a GPT-4 voice career counselor in the browser.',
  how: [
    'Five weighted parts — academic 50, financial 20, personality 15, location & size 10, activities 5 — with a readable breakdown.',
    'Realism caps for schools out of reach or out of budget.',
    'A spoken counselor session with pause and resume, mapped to career profiles.',
  ],
  next: [],
};
