/**
 * JamDuel — every fact the case study shows. Checked against the repository
 * (allenvarghese05/JamDuel, 24 commits, Aug 2025): server/routes/*,
 * server/scripts/setup-database.js, client/src/* and the git history.
 * A Drexel INFO310 team project; Allen's share comes from git.
 */

export const LINKS = [{ href: 'https://github.com/allenvarghese05/JamDuel', label: 'Repository' }];

export const COPY = {
  outcome:
    'Head-to-head song battles: spend ten votes a day on the matchups you care about, discover music through them, and get GPT-4 recommendations from your ten favourite songs.',
  status: 'Class project · Drexel INFO310',
  before: [
    'Music discovery is a feed you scroll, not something you take part in',
    'A like button says nothing about how much you prefer one song over another',
    'Recommendations are a black box',
    'Every song lookup hits the YouTube API again',
  ],
  after: [
    'Two songs, one battle, live percentages after you vote',
    'Ten votes a day to spread or stack — stacking says how much you mean it',
    'GPT-4 recommendations in four lanes, each with its reason',
    'YouTube lookups cached for 24 hours in Postgres',
  ],
  built:
    'Built for Drexel’s INFO310 with two classmates. Allen wrote the app — the initial full-stack commit, the YouTube player and integration, the GPT recommendations and the GitHub Pages build (15 of 24 commits); teammates added server dependencies and fixes. The React frontend is published on GitHub Pages; the API needs its own server and a Postgres database.',
  next: [
    'Host the API and database so the published frontend works end to end.',
    'Actually maintain the voting streak — the column exists but nothing updates it yet.',
    'Close each battle when it ends (battles store an end time 24 hours out).',
  ],
  headlines: {
    problem: 'Discovery is something you scroll past — JamDuel makes you pick a side.',
    how: 'Pick, vote, see the split, get recommendations — one loop through a React app and an Express API.',
    inside: 'A vote budget, battles that tally in one transaction, recommendations with reasons, and a cache in front of YouTube.',
    decisions: 'Three decisions: votes in a transaction, a daily budget, and a model that has to answer in JSON.',
    architecture: 'A React + TypeScript client, an Express API, Postgres and three outside APIs.',
    data: 'Eight tables — one vote per user per battle, enforced by the database.',
    build: 'A full stack in one commit, then two days of YouTube and fixes.',
    next: 'What it would need to run for real.',
  },
};

export const FLOW = {
  caption: 'One battle, start to finish',
  figureCaption: 'From two songs to a recommendation',
  steps: [
    { key: 'join', label: 'Sign up', title: 'An account with a vote budget', body: 'Register with email and password (bcrypt-hashed); the server issues a 7-day JWT. Every new user starts with 10 votes for the day.', facts: ['votes_remaining_today defaults to 10', 'Reset to 10 on the first login of a new day'] },
    { key: 'pick', label: 'Favourites', title: 'Tell it your ten songs', body: 'Search Spotify for tracks and save up to your favourite ten — the input the recommender works from.', facts: ['Spotify search + track lookup routes', 'Saved to user_songs, unique per user and song'] },
    { key: 'battle', label: 'Battle', title: 'Two songs, one matchup', body: 'Each battle pairs two songs, with their YouTube videos embedded so you can listen before you choose.', facts: ['battles: song1_id, song2_id, vote counts, status, ends_at = now + 24 h', 'YouTube video IDs looked up and cached'] },
    { key: 'vote', label: 'Vote', title: 'Stack your votes', body: 'Spend between 1 and 10 of today’s votes on one side. The server checks the battle is active, you haven’t voted on it, you have enough votes left and the song is really in the battle — then records it in one transaction.', facts: ['1 ≤ voteCount ≤ 10', 'One vote row per user per battle (UNIQUE)'] },
    { key: 'result', label: 'Results', title: 'See the split', body: 'The response returns the battle’s new totals and each song’s percentage of the votes, plus your remaining budget.', facts: ['song share = round(votes / total × 100)', 'History of your votes under /battles/user/history'] },
    { key: 'recs', label: 'Recommend', title: 'Four lanes of recommendations', body: 'Your ten favourites go to GPT-4 with a prompt that asks for JSON only: three popular songs, three underground gems, three from the same artists and three to explore a new genre — each with a reason.', facts: ['model: gpt-4, JSON-only system prompt', 'Album art filled in from Spotify; saved to user_recommendations'] },
  ],
};

export const FEATURES = [
  { key: 'budget', label: 'Voting', title: 'A daily budget, not unlimited likes', body: 'Ten votes a day, spent 1–10 at a time on any battle, so a stacked vote means something. The budget resets on the first login of a new day.', stat: { value: '10', label: 'votes per day' } },
  { key: 'recs', label: 'AI', title: 'Recommendations with reasons', body: 'GPT-4 returns four categories of three songs, each with a sentence on why — popular picks, underground gems, the same artists, and a genre to explore.', stat: { value: '4 × 3', label: 'categories × songs' } },
  { key: 'cache', label: 'Performance', title: 'A cache in front of YouTube', body: 'Video lookups are stored in a youtube_cache table and reused for 24 hours, so the same song doesn’t spend API quota twice in a day.', stat: { value: '24 h', label: 'cache window' } },
  { key: 'api', label: 'API', title: 'An Express API behind the app', body: 'Routes for auth, battles, songs, users, friends, Spotify, YouTube and recommendations, behind helmet and a rate limiter (100 requests per 15 minutes in production).', stat: { value: '30', label: 'API routes' } },
];

export const DECISIONS = [
  {
    id: 'tx',
    kicker: 'Data',
    title: 'A vote is three writes — so it’s one transaction',
    problem: 'Casting a vote inserts the vote, adds to the battle’s tally and spends the user’s budget. If any one of those landed without the others, totals and budgets would drift.',
    decision: 'Validate first (active battle, no earlier vote, enough budget, a song that’s really in the battle), then BEGIN, write all three, COMMIT — and ROLLBACK on any error. The database also enforces one vote row per user per battle.',
    tradeoff: 'The checks run before the transaction, so two simultaneous votes could both pass them; the UNIQUE constraint is what finally stops a double vote.',
    caption: 'One vote',
    steps: ['Battle exists and is active?', 'No earlier vote on this battle?', 'Enough votes left today?', 'BEGIN → insert vote → add to the battle tally → spend the budget → COMMIT', 'Any error → ROLLBACK'],
    readout: 'server/routes/battles.js — POST /battles/:id/vote',
    code: {
      file: 'server/routes/battles.js',
      lang: 'js',
      body: `await client.query('BEGIN');
await client.query(
  'INSERT INTO votes (user_id, battle_id, chosen_song_id, vote_count) VALUES ($1, $2, $3, $4)',
  [userId, id, chosenSongId, voteCount]);
await client.query(
  'UPDATE battles SET song1_votes = song1_votes + $1, total_votes = total_votes + $1 WHERE id = $2',
  [voteCount, id]);
await client.query(
  'UPDATE users SET votes_remaining_today = votes_remaining_today - $1, total_votes_cast = total_votes_cast + $1 WHERE id = $2',
  [voteCount, userId]);
await client.query('COMMIT');   // any throw → ROLLBACK`,
    },
  },
  {
    id: 'budget',
    kicker: 'Design',
    title: 'Scarcity makes a vote mean something',
    problem: 'Unlimited votes turn a battle into who clicks most. A single vote can’t say how strongly you prefer one song.',
    decision: 'A daily budget of ten votes, spent 1–10 at a time. The budget lives on the user row and is restored on the first login of a new day.',
    tradeoff: 'The reset happens at login, not at midnight, and the streak column the design called for isn’t maintained yet.',
    caption: 'The daily budget',
    steps: ['New user: votes_remaining_today = 10', 'Each vote spends 1–10 of them', 'Not enough left → 400 “Not enough votes remaining”', 'First login of a new day → back to 10'],
    readout: 'server/routes/auth.js (reset) and battles.js (spend).',
    code: {
      file: 'server/routes/auth.js',
      lang: 'js',
      body: `const today = new Date().toDateString();
const lastVoteReset = user.rows[0].last_vote_reset
  ? new Date(user.rows[0].last_vote_reset).toDateString() : null;
if (lastVoteReset !== today) {
  await pool.query(
    'UPDATE users SET votes_remaining_today = 10, last_vote_reset = CURRENT_DATE WHERE id = $1',
    [user.rows[0].id]);
}`,
    },
  },
  {
    id: 'json',
    kicker: 'AI',
    title: 'A model that has to answer in a shape the app can render',
    problem: 'Free-text recommendations can’t be laid out as cards, and a model will happily invent songs.',
    decision: 'The prompt lists the user’s ten favourites and asks for exactly three songs in each of four named categories, as JSON only, each with a genre and a reason — and tells the model to use only real titles and artists. Album art is then filled in from Spotify.',
    tradeoff: 'Nothing verifies the songs exist beyond the instruction; a Spotify lookup that finds nothing simply leaves the cover empty.',
    caption: 'What the model is asked for',
    steps: ['Input: the user’s 10 favourite songs', 'Popular songs × 3', 'Underground gems × 3', 'Same artists × 3', 'Genre exploration × 3 — each with genre and reason'],
    readout: 'server/routes/recommendations.js — model gpt-4, JSON-only system prompt.',
    code: {
      file: 'server/routes/recommendations.js',
      lang: 'js',
      body: `const response = await axios.post('https://api.openai.com/v1/chat/completions', {
  model: 'gpt-4',
  messages: [
    { role: 'system',
      content: 'You are a music recommendation expert. Always respond with valid JSON only.' },
    { role: 'user', content: prompt },   // 10 favourites → 4 categories × 3 songs
  ],
});`,
    },
  },
];

export const LAYERS = [
  { key: 'who', label: 'Who', nodes: ['listener'] },
  { key: 'app', label: 'React client', nodes: ['battles-ui', 'picker', 'profile'] },
  { key: 'domain', label: 'Express API', nodes: ['auth', 'votes', 'recs', 'yt'] },
  { key: 'data', label: 'Postgres', nodes: ['db', 'cache'] },
  { key: 'out', label: 'Outside', nodes: ['spotify', 'youtube', 'openai'] },
];

export const TRACES = [
  { id: 'vote', label: 'Cast a vote', steps: ['listener', 'battles-ui', 'auth', 'votes', 'db'] },
  { id: 'recs', label: 'Get recommendations', steps: ['listener', 'profile', 'recs', 'db', 'openai', 'spotify'] },
  { id: 'video', label: 'Play a battle’s video', steps: ['listener', 'battles-ui', 'yt', 'cache', 'youtube'] },
];

export const DATA_MODEL = {
  engine: 'PostgreSQL · node-postgres',
  noun: 'tables',
  domains: [
    { key: 'org', label: 'People', models: [
      { name: 'users', note: 'email, bcrypt hash, today’s votes, total votes cast' },
      { name: 'user_friends', note: 'who follows whom' },
    ] },
    { key: 'application', label: 'Battles', models: [
      { name: 'battles', note: 'two songs, both tallies, status, ends 24 h after creation' },
      { name: 'votes', note: 'one per user per battle (UNIQUE), with how many votes were stacked' },
      { name: 'songs', note: 'Spotify id, title, artist, album art' },
    ] },
    { key: 'reports', label: 'Discovery', models: [
      { name: 'user_songs', note: 'a user’s saved favourites (UNIQUE per user and song)' },
      { name: 'user_recommendations', note: 'saved GPT recommendations' },
      { name: 'youtube_cache', note: 'video id + thumbnail per song, reused for 24 h' },
    ] },
  ],
};

/* ── the case study in one screen ─────────────────────────────────────────── */
export const OVERVIEW = [
  { label: 'What it is', text: 'Head-to-head song battles: spend ten votes a day on the matchups you care about, watch the split, and get GPT-4 recommendations built from your ten favourite songs.' },
  { label: 'Why it exists', text: 'A class project (Drexel INFO310) about making music discovery something you take part in — a stacked vote says how much you prefer a song, which a like button can’t.' },
  { label: 'What Allen did', text: 'In a team of three, Allen wrote the app — the full stack in the first commit, then the YouTube player and lookups, the recommendations and the published frontend; teammates added server dependencies and fixes.' },
  { label: 'Where it stands', text: 'A finished class project. The frontend is published on GitHub Pages; the API and its Postgres database need their own server to run end to end.' },
];
