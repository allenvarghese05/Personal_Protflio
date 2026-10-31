/**
 * jam-duel — the project's wall card, brief data and case-study copy.
 * Facts from the repository (allenvarghese05/JamDuel); the page's own copy
 * lives in src/data/studies/jam-duel.js.
 */

export const project = {
  id: 'jam-duel',
  kind: 'project',
  cardBadge: 'CLASS PROJECT',
  badge: 'CLASS PROJECT · DREXEL INFO310',
  label: 'JamDuel',
  subtitle:
    'Head-to-head song battles with a daily vote budget, live results, and GPT-4 recommendations from your ten favourite songs',
  role: 'Full-stack developer (3-person team)',
  company: 'Drexel University · INFO310',
  dateRange: 'Aug 2025',
  location: 'React · Express · Postgres',
  repo: 'https://github.com/allenvarghese05/JamDuel',
  live: null,
  flowEnd: 'BATTLES',
  tags: ['React', 'TypeScript', 'Express', 'PostgreSQL', 'GPT-4'],
  metrics: [
    { value: '10', label: 'Votes per day, stacked 1–10 at a time' },
    { value: '30', label: 'API routes behind the app' },
    { value: '8', label: 'Postgres tables' },
    { value: '4 × 3', label: 'AI recommendation lanes × songs' },
  ],
  primaryStack: ['React 18', 'TypeScript', 'Express', 'PostgreSQL', 'Tailwind CSS'],
  secondaryStack: ['OpenAI GPT-4', 'Spotify Web API', 'YouTube Data API', 'JWT + bcrypt', 'helmet', 'express-rate-limit', 'GitHub Pages'],
  keyDecisions: [
    { title: 'A vote is three writes — so it’s one transaction', body: 'The vote, the battle tally and the user’s budget are written between BEGIN and COMMIT, with a UNIQUE constraint as the last guard against double votes.' },
    { title: 'Scarcity makes a vote mean something', body: 'Ten votes a day, spent 1–10 at a time, reset on the first login of a new day.' },
    { title: 'A model that answers in a renderable shape', body: 'GPT-4 is asked for JSON only: four named categories of three songs, each with a reason.' },
  ],
  timeline: [
    { week: 'Aug 17', start: '2025-08-17', end: '2025-08-17', title: 'The app + YouTube', desc: 'Allen: the full-stack initial commit, then the YouTube player, thumbnails and video lookups in place of Spotify previews.', done: true },
    { week: 'Aug 18', start: '2025-08-18', end: '2025-08-18', title: 'Pages + server deps', desc: 'Allen: the GitHub Pages build. Teammates: server dependencies, env example and a regex fix.', done: true },
  ],
  architectureGraph: {
    nodes: [
      { id: 'votes', label: 'Battles & votes', description: 'Battle listing, voting in one transaction, results and history.', category: 'core', importance: 'center', x: 50, y: 40 },
      { id: 'listener', label: 'Listener', description: 'Votes on battles and gets recommendations.', category: 'ui', importance: 'leaf', x: 6, y: 45 },
      { id: 'battles-ui', label: 'Battle screens', description: 'Battle feed, voting interface with embedded YouTube videos, results.', category: 'ui', importance: 'primary', x: 26, y: 24 },
      { id: 'picker', label: 'Song picker', description: 'Spotify search to save favourite songs.', category: 'ui', importance: 'secondary', x: 26, y: 50 },
      { id: 'profile', label: 'Profile & friends', description: 'Stats, voting history, friends and recommendations.', category: 'ui', importance: 'secondary', x: 26, y: 76 },
      { id: 'auth', label: 'Auth', description: 'bcrypt passwords, 7-day JWTs, daily vote reset on login.', category: 'auth', importance: 'primary', x: 50, y: 14 },
      { id: 'recs', label: 'Recommendations', description: 'GPT-4 with a JSON-only prompt from the user’s ten favourites; album art from Spotify.', category: 'ai', importance: 'primary', x: 50, y: 66 },
      { id: 'yt', label: 'YouTube routes', description: 'Video search with a 24-hour Postgres cache.', category: 'core', importance: 'secondary', x: 50, y: 90 },
      { id: 'db', label: 'PostgreSQL', description: 'users, songs, battles, votes, user_songs, user_friends, user_recommendations.', category: 'data', importance: 'primary', x: 74, y: 40 },
      { id: 'cache', label: 'youtube_cache', description: 'Video id and thumbnail per song, reused for 24 hours.', category: 'storage', importance: 'secondary', x: 74, y: 80 },
      { id: 'spotify', label: 'Spotify', description: 'Track search, metadata and album art.', category: 'infrastructure', importance: 'leaf', x: 94, y: 30 },
      { id: 'youtube', label: 'YouTube', description: 'Video search and embeds.', category: 'infrastructure', importance: 'leaf', x: 94, y: 80 },
      { id: 'openai', label: 'OpenAI', description: 'GPT-4 for recommendations.', category: 'ai', importance: 'leaf', x: 94, y: 56 },
    ],
    edges: [
      { source: 'listener', target: 'battles-ui', label: '', direction: 'two-way' },
      { source: 'listener', target: 'picker', label: '', direction: 'two-way' },
      { source: 'listener', target: 'profile', label: '', direction: 'two-way' },
      { source: 'battles-ui', target: 'votes', label: 'POST /battles/:id/vote', direction: 'two-way' },
      { source: 'battles-ui', target: 'yt', label: '', direction: 'two-way' },
      { source: 'picker', target: 'spotify', label: 'search', direction: 'two-way' },
      { source: 'profile', target: 'recs', label: '', direction: 'two-way' },
      { source: 'votes', target: 'auth', label: 'JWT', direction: 'one-way' },
      { source: 'votes', target: 'db', label: 'one transaction', direction: 'two-way' },
      { source: 'recs', target: 'openai', label: 'gpt-4', direction: 'one-way' },
      { source: 'recs', target: 'spotify', label: 'album art', direction: 'one-way' },
      { source: 'recs', target: 'db', label: '', direction: 'two-way' },
      { source: 'yt', target: 'cache', label: '24 h', direction: 'two-way' },
      { source: 'yt', target: 'youtube', label: 'on a miss', direction: 'one-way' },
      { source: 'auth', target: 'db', label: '', direction: 'two-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'browser', url: 'allenvarghese05.github.io/JamDuel', shots: [] },
  live: null,
  problem:
    'Music discovery is a feed you scroll past; a like button can’t say how much you prefer one song over another, and recommendations rarely say why.',
  built:
    'A React + TypeScript app on an Express + Postgres API: head-to-head song battles with a daily vote budget, live results, embedded YouTube videos, and GPT-4 recommendations from your ten favourite songs.',
  how: [
    'A vote is validated, then written with the battle tally and the user’s budget in one transaction.',
    'Ten votes a day, stacked 1–10 at a time.',
    'GPT-4 returns four categories of three songs as JSON, each with a reason.',
  ],
  next: [],
};
