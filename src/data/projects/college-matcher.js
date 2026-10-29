/**
 * college-matcher — the project's wall card, brief data and case-study copy.
 * Facts only from the project's own repository.
 */
export const project = {
  id: 'college-matcher',
  kind: 'project',
  cardBadge: 'PERSONAL PROJECT',
  badge: 'PERSONAL PROJECT',
  label: 'College Matcher',
  subtitle:
    'AI college & career discovery — an assessment, a real-time AI voice counselor and a multi-factor matching engine',
  role: 'Full-stack · Personal project',
  repo: 'https://github.com/allenvarghese05/college-matcher',
  flowEnd: 'MATCHES',
  description:
    'A web platform that helps students find their ideal colleges and career paths. Students take a multi-step assessment or talk it through with an AI voice counselor — real-time speech recognition through the Web Speech API, context-aware responses, audio visualisation and pause/resume sessions. A matching engine weighs academics, interests, career goals, geography and finances to produce ranked schools with match percentages, alongside career paths with salary and growth data. Includes a filterable school browser and a consistent light/dark design system built mobile-first.',
  tags: ['React 18', 'Node.js', 'Express', 'OpenAI', 'Web Speech API'],
  metrics: [
    { value: '5', label: 'Matching factors weighed' },
    { value: '2', label: 'Assessment modes · form & voice' },
  ],
  primaryStack: ['React 18', 'Node.js', 'Express.js', 'OpenAI API', 'Web Speech API'],
  secondaryStack: ['React Router', 'Axios', 'MongoDB', 'Multer', 'CSS-in-JS'],
  keyDecisions: [
    {
      title: 'A voice counselor, not just a form',
      body: 'College choice is a conversation, so the assessment can be spoken: live transcription, context-aware follow-ups, visual audio feedback and pause/resume — with a fallback for browsers that lack the Speech API.',
    },
    {
      title: 'Multi-factor matching',
      body: 'Recommendations weigh the academic profile, interests and activities, career goals, geographic preferences and financial constraints together, and surface a match percentage instead of a flat list.',
    },
    {
      title: 'One design system across every page',
      body: 'CSS variables drive theming with automatic light/dark detection; layouts are mobile-first with Flexbox and Grid so the assessment, browser and results feel like one product.',
    },
  ],
  architectureGraph: {
    nodes: [
      { id: 'app', label: 'College Matcher', description: 'React 18 single-page app with client-side routing.', category: 'core', importance: 'center', x: 50, y: 45 },
      { id: 'assessment', label: 'Assessment', description: 'Multi-step form with progress tracking and a smart question flow.', category: 'ui', importance: 'primary', x: 20, y: 22 },
      { id: 'voice', label: 'AI Voice Counselor', description: 'Web Speech API recognition + synthesis, conversation history, pause/resume.', category: 'ai', importance: 'primary', x: 78, y: 20 },
      { id: 'matching', label: 'Matching Engine', description: 'Weighs academics, interests, career goals, geography and finances into ranked matches.', category: 'core', importance: 'primary', x: 50, y: 80 },
      { id: 'browse', label: 'School Browser', description: 'Filterable, searchable school database with key statistics.', category: 'ui', importance: 'secondary', x: 14, y: 62 },
      { id: 'results', label: 'Results & Careers', description: 'Match percentages, school profiles and career paths with salary and growth data.', category: 'ui', importance: 'secondary', x: 86, y: 62 },
      { id: 'api', label: 'Express API', description: 'Node.js + Express backend serving routes and models.', category: 'infrastructure', importance: 'primary', x: 50, y: 12 },
      { id: 'openai', label: 'OpenAI', description: 'Natural-language processing for the counselor conversation.', category: 'ai', importance: 'secondary', x: 90, y: 38 },
    ],
    edges: [
      { source: 'app', target: 'assessment', label: 'hosts', direction: 'one-way' },
      { source: 'app', target: 'voice', label: 'hosts', direction: 'one-way' },
      { source: 'assessment', target: 'matching', label: 'answers', direction: 'one-way' },
      { source: 'voice', target: 'matching', label: 'answers', direction: 'one-way' },
      { source: 'matching', target: 'results', label: 'ranks', direction: 'one-way' },
      { source: 'app', target: 'browse', label: 'hosts', direction: 'one-way' },
      { source: 'app', target: 'api', label: 'calls', direction: 'two-way' },
      { source: 'voice', target: 'openai', label: 'converses via', direction: 'one-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'browser', url: 'college-matcher', shots: [] },
  live: null,
  problem:
    'Choosing a college is one of the biggest decisions a student makes, yet most get generic ranked lists and little one-on-one guidance — search tools filter on stats, not on who you are.',
  built:
    'A web platform that gets to know a student — through an assessment they can type or simply talk through with an AI voice counselor — and matches them to colleges and career paths with a percentage fit.',
  how: [
    'The voice counselor transcribes speech live with the Web Speech API and keeps the conversation contextual with OpenAI; sessions pause and resume.',
    'A matching engine weighs five factors — academics, interests, career goals, location and finances — into ranked schools.',
    'Results pair each school with career paths, including salary and growth data.',
    'A filterable school browser and one light/dark design system tie it together (React 18 + Express).',
  ],
  next: [
    'Accounts so students can save and revisit their matches (JWT authentication is planned).',
    'Deployment — the frontend targets Vercel and the API targets Railway.',
  ],
};
