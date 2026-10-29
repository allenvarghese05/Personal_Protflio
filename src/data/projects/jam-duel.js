/**
 * jam-duel — the project's wall card, brief data and case-study copy.
 * Facts only from the project's own repository.
 */
export const project = {
  id: 'jam-duel',
  kind: 'project',
  cardBadge: 'CLASS PROJECT',
  badge: 'CLASS PROJECT · INFO 310',
  label: 'Jam Duel',
  subtitle:
    'Head-to-head song battles — daily voting with streaks, friends, and GPT-4 music recommendations',
  role: 'Full-stack · Class project',
  company: 'INFO 310',
  repo: 'https://github.com/allenvarghese05/JamDuel',
  flowEnd: 'BATTLES',
  description:
    'A social music app where users create battles between any two songs and vote on head-to-head matchups. Each user gets 10 votes a day with a midnight reset and streak tracking, can add friends, compare taste and see voting history, and receives personalised recommendations from GPT-4 based on their favourite songs and voting history, grouped by mood. Spotify powers search, album artwork and 30-second previews; YouTube adds thumbnails and in-app playback. Built with a React + TypeScript client and an Express + PostgreSQL server, and it runs in a demo mode when API keys are missing.',
  tags: ['React', 'TypeScript', 'Express', 'PostgreSQL', 'Spotify API'],
  metrics: [
    { value: '10', label: 'Votes per day · streaks tracked' },
    { value: '3', label: 'APIs · Spotify, YouTube, OpenAI' },
    { value: '4', label: 'Core data models' },
  ],
  primaryStack: ['React + TypeScript', 'Express.js', 'PostgreSQL', 'Spotify Web API', 'OpenAI GPT-4'],
  secondaryStack: ['YouTube Data API v3', 'Tailwind CSS', 'React Context (Auth)', 'nodemon'],
  keyDecisions: [
    {
      title: 'A daily vote budget',
      body: 'Ten votes a day with a midnight reset and streaks makes every vote count and turns the app into a daily habit instead of an endless swipe.',
    },
    {
      title: 'Recommendations from behaviour, not just likes',
      body: 'GPT-4 reads a user’s favourite songs and their voting history to generate suggestions grouped by mood and theme, refreshed daily.',
    },
    {
      title: 'Degrade to a demo mode',
      body: 'Without API keys the app still runs with placeholders and basic recommendations, so it can be demoed and developed without every credential in place.',
    },
  ],
  architectureGraph: {
    nodes: [
      { id: 'client', label: 'React Client', description: 'React + TypeScript frontend with Tailwind CSS and an Auth context.', category: 'ui', importance: 'center', x: 50, y: 40 },
      { id: 'server', label: 'Express Server', description: 'Express.js API: battles, voting, friends and recommendations.', category: 'core', importance: 'primary', x: 50, y: 72 },
      { id: 'db', label: 'PostgreSQL', description: 'Users (stats, streaks), Songs, Battles and Recommendations.', category: 'storage', importance: 'primary', x: 22, y: 88 },
      { id: 'spotify', label: 'Spotify API', description: 'Song search, album artwork, metadata and 30-second previews.', category: 'data', importance: 'primary', x: 14, y: 50 },
      { id: 'youtube', label: 'YouTube API', description: 'Video thumbnails and in-app playback.', category: 'data', importance: 'secondary', x: 86, y: 50 },
      { id: 'gpt4', label: 'GPT-4', description: 'Personalised recommendations from favourites and voting history, grouped by mood.', category: 'ai', importance: 'primary', x: 80, y: 88 },
      { id: 'battles', label: 'Battles & Votes', description: '10 votes a day, midnight reset, streaks and live results.', category: 'core', importance: 'secondary', x: 30, y: 14 },
      { id: 'social', label: 'Friends', description: 'Add friends, view profiles and voting history, compare taste.', category: 'core', importance: 'secondary', x: 70, y: 14 },
    ],
    edges: [
      { source: 'client', target: 'server', label: 'REST', direction: 'two-way' },
      { source: 'server', target: 'db', label: 'persists', direction: 'two-way' },
      { source: 'server', target: 'spotify', label: 'searches', direction: 'one-way' },
      { source: 'server', target: 'youtube', label: 'fetches video', direction: 'one-way' },
      { source: 'server', target: 'gpt4', label: 'recommends via', direction: 'one-way' },
      { source: 'client', target: 'battles', label: 'renders', direction: 'one-way' },
      { source: 'client', target: 'social', label: 'renders', direction: 'one-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'browser', url: 'jam-duel', shots: [] },
  live: null,
  problem:
    'Music discovery has become passive — algorithms feed you more of the same, and there’s no fun, social way to settle which song is actually better.',
  built:
    'A social music app that pits two songs head-to-head. You discover music by voting in battles, following friends, and getting AI recommendations shaped by how you vote. Built for INFO 310.',
  how: [
    'Spotify powers search, album art and 30-second previews; YouTube adds thumbnails and in-app playback.',
    'Everyone gets 10 votes a day, reset at midnight, with streaks tracked.',
    'GPT-4 recommends songs from your favourites and voting history, grouped by mood and theme.',
    'React + TypeScript client, Express + PostgreSQL server — and a demo mode that runs without API keys.',
  ],
  next: [],
};
