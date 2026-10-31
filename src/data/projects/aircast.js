/**
 * aircast — the project's wall card, brief data and case-study copy.
 * Facts from the repository (aahilafraz123/aircast-nasa-hackathon); the page's
 * own copy lives in src/data/studies/aircast.js.
 */

export const project = {
  id: 'aircast',
  kind: 'award',
  cardBadge: 'NASA GLOBAL NOMINEE',
  badge: 'NASA SPACE APPS 2025 · GLOBAL NOMINEE',
  label: 'AirCast',
  subtitle:
    'Air quality from space to street — NASA TEMPO satellite data, ground stations and weather on one map, with an explainable forecast and safety advice per group',
  role: 'Full-stack · Backend · Cloud (2-person team)',
  company: 'Team Relentless, with Aahil Afraz',
  dateRange: 'Oct 2025 · NASA Space Apps',
  location: 'Hackathon',
  repo: 'https://github.com/aahilafraz123/aircast-nasa-hackathon',
  live: null,
  tags: ['Python', 'Flask', 'NASA TEMPO', 'GPT-4o-mini', 'Azure'],
  metrics: [
    { value: '3', label: 'Data sources fused: satellite, ground, weather' },
    { value: '5', label: 'Groups with their own safe windows' },
    { value: '6', label: 'Forecast steps, each with its reason' },
    { value: '27 h', label: 'Of commits, start to final push' },
  ],
  primaryStack: ['Python 3.11', 'Flask 3', 'netCDF4 + NumPy', 'Vanilla JS', 'Google Maps'],
  secondaryStack: ['OpenAI gpt-4o-mini', 'OpenAQ v3', 'OpenWeather', 'Chart.js', 'Azure App Service', 'Azure Blob', 'GitHub Actions', 'Gunicorn'],
  keyDecisions: [
    { title: 'A satellite file that only worked on one laptop', body: 'Moved the TEMPO granule to Azure Blob and opened it from memory with netCDF4, so the deployed app could read it — at the cost of a download per request.' },
    { title: 'An AI that only speaks from live readings', body: 'Every brief and chat call is grounded in a structured context from all sources, and every AI route degrades to a fallback with HTTP 200 instead of crashing.' },
    { title: 'One number, five answers', body: 'A per-group safety engine judges each forecast step for children, seniors, athletes, adults and care facilities, and finds each group’s best window.' },
  ],
  timeline: [
    { week: 'Oct 4 · afternoon', start: '2025-10-04', end: '2025-10-04', title: 'Ground + weather', desc: 'Aahil: the scaffold, OpenWeather client and OpenAQ stations with a sample fallback.', done: true },
    { week: 'Oct 4 · evening', start: '2025-10-04', end: '2025-10-04', title: 'Satellite + forecast', desc: 'Aahil: the TEMPO NetCDF reader, forecast multipliers and the first map UI. Allen: made the granule portable.', done: true },
    { week: 'Oct 4 · late', start: '2025-10-04', end: '2025-10-04', title: 'Explanations + safety', desc: 'Allen: weather fallbacks, forecast reasons, health alerts and the per-group safety engine.', done: true },
    { week: 'Oct 5 · night', start: '2025-10-05', end: '2025-10-05', title: 'AI brief + chat', desc: 'Allen: /api/ai-summary and /api/ai-chat, Azure config and the Gunicorn start script.', done: true },
    { week: 'Oct 5 · afternoon', start: '2025-10-05', end: '2025-10-05', title: 'Ship to Azure', desc: 'Allen: the granule from Blob, the Actions deploy, optional OpenAI, relative API URLs, the floating chat.', done: true },
    { week: '2026', start: '2026-06-26', end: '2026-10-28', title: 'Write-up + recognition', desc: 'The README, the Global Nominee badge and an MIT license.', done: true },
  ],
  architectureGraph: {
    nodes: [
      { id: 'api', label: 'Flask API', description: 'One Flask process serves the page and 8 JSON routes under /api; every route takes lat and lon.', category: 'core', importance: 'center', x: 50, y: 45 },
      { id: 'user', label: 'Visitor', description: 'A parent, coach or anyone asking whether it’s safe to go outside.', category: 'ui', importance: 'leaf', x: 6, y: 45 },
      { id: 'map', label: 'Map UI', description: 'Vanilla JS: a dark Google map with AQI markers, a forecast chart, health alerts, the safety guide and the satellite-vs-ground card.', category: 'ui', importance: 'primary', x: 26, y: 30 },
      { id: 'chat', label: 'AI chat', description: 'A floating chat that asks follow-up questions about the current readings.', category: 'ui', importance: 'secondary', x: 26, y: 62 },
      { id: 'forecast', label: 'Forecast model', description: 'Nine multiplier rules over wind, temperature, rain, humidity and time of day; six steps, each with a reason string.', category: 'workflow', importance: 'primary', x: 50, y: 18 },
      { id: 'safety', label: 'Safety engine', description: 'Five groups with safe/caution thresholds, judged per forecast step, plus each group’s best window. Written by Allen.', category: 'workflow', importance: 'primary', x: 50, y: 72 },
      { id: 'ai', label: 'AI brief', description: 'Builds a structured context from every source and asks GPT-4o-mini for an A–F brief under 180 words; falls back with HTTP 200.', category: 'ai', importance: 'primary', x: 50, y: 90 },
      { id: 'tempo', label: 'TEMPO reader', description: 'Opens the NO₂ granule in memory, finds the nearest pixel, converts the column to an AQI and labels its freshness.', category: 'data', importance: 'secondary', x: 72, y: 22 },
      { id: 'openaq', label: 'OpenAQ client', description: 'Stations within 25 km; PM2.5 converted to AQI with the EPA breakpoints; sample stations if the API fails.', category: 'data', importance: 'secondary', x: 72, y: 48 },
      { id: 'weather', label: 'Weather client', description: 'Current conditions and eight 3-hour forecast slots, with fallbacks for a missing key.', category: 'data', importance: 'secondary', x: 72, y: 72 },
      { id: 'blob', label: 'Azure Blob', description: 'Hosts the single TEMPO granule (observed 2025-10-04 16:44 UTC).', category: 'storage', importance: 'leaf', x: 93, y: 18 },
      { id: 'openaq-api', label: 'OpenAQ v3', description: 'Ground sensor network API.', category: 'infrastructure', importance: 'leaf', x: 93, y: 42 },
      { id: 'openweather', label: 'OpenWeather', description: 'Weather API (current + 3-hourly forecast).', category: 'infrastructure', importance: 'leaf', x: 93, y: 66 },
      { id: 'openai', label: 'OpenAI', description: 'gpt-4o-mini for the brief and the chat.', category: 'ai', importance: 'leaf', x: 93, y: 88 },
    ],
    edges: [
      { source: 'user', target: 'map', label: '', direction: 'two-way' },
      { source: 'user', target: 'chat', label: '', direction: 'two-way' },
      { source: 'map', target: 'api', label: '8 routes', direction: 'two-way' },
      { source: 'chat', target: 'api', label: 'POST /api/ai-chat', direction: 'two-way' },
      { source: 'api', target: 'forecast', label: '', direction: 'one-way' },
      { source: 'api', target: 'safety', label: '', direction: 'one-way' },
      { source: 'api', target: 'ai', label: '', direction: 'one-way' },
      { source: 'api', target: 'tempo', label: '', direction: 'one-way' },
      { source: 'api', target: 'openaq', label: '', direction: 'one-way' },
      { source: 'api', target: 'weather', label: '', direction: 'one-way' },
      { source: 'forecast', target: 'weather', label: 'drivers', direction: 'one-way' },
      { source: 'safety', target: 'forecast', label: 'per step', direction: 'one-way' },
      { source: 'tempo', target: 'blob', label: 'download', direction: 'one-way' },
      { source: 'openaq', target: 'openaq-api', label: '25 km', direction: 'one-way' },
      { source: 'weather', target: 'openweather', label: '', direction: 'one-way' },
      { source: 'ai', target: 'openai', label: 'gpt-4o-mini', direction: 'one-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'browser', shots: [] },
  live: null,
  problem:
    'Air-quality data is split across satellites, sparse ground stations and the weather, and nobody combines them to answer the simple question: is it safe to go outside right now, and when will it be better?',
  built:
    'A Flask app that fuses NASA’s TEMPO satellite, OpenAQ ground stations and OpenWeather on one map, adds an explainable six-step forecast, safety advice for five groups, and a GPT-4o-mini brief and chat grounded in the live readings.',
  how: [
    'The nearest TEMPO pixel is found in a NetCDF grid opened from Azure Blob and converted to an AQI, labelled with its age.',
    'Readable multiplier rules move the forecast step by step, each with a reason.',
    'Five groups get their own thresholds and best windows.',
    'Every AI call is grounded in a structured context and falls back with HTTP 200.',
  ],
  next: [],
};
