/**
 * aircast — the project's wall card, brief data and case-study copy.
 * Facts only from the project's own repository.
 */
import { PALETTE } from '@/lib/palette';

export const project = {
  id: 'aircast',
  kind: 'award',
  cardBadge: 'NASA GLOBAL NOMINEE',
  badge: 'NASA SPACE APPS 2025 · GLOBAL NOMINEE',
  label: 'AirCast',
  subtitle:
    'AI air-quality forecasting from space to street — fuses NASA’s TEMPO satellite, ground sensors and live weather into a 6-hour forecast and a plain-English brief',
  role: 'Full-stack · Backend · Cloud/DevOps',
  company: 'Team Relentless (with Aahil Afraz)',
  dateRange: 'NASA Space Apps 2025',
  location: 'Top 1,219 of 11,500+ teams',
  repo: 'https://github.com/allenvarghese05/aircast-nasa-hackathon',
  description:
    'Air pollution kills an estimated 7 million people a year, yet the data that could warn people is scattered across satellites, sparse ground stations and weather systems. AirCast fuses all three into one answer: “Is it safe to go outside right now — and when will it be better?” It streams NASA TEMPO Level-2 NO₂ granules (NetCDF) from Azure Blob Storage, snaps to the nearest satellite pixel, cross-validates the result against live OpenAQ ground sensors with a satellite-vs-ground correlation score, and projects air quality six hours forward with an explainable, physics-informed model driven by live wind, heat, rain, humidity and traffic cycles. GPT-4o-mini turns the fused dataset into an A–F daily brief and a context-aware chat assistant, and a five-profile safety engine gives children, seniors, athletes, adults and care facilities their own best and worst times. Built during the 2025 U.S. government shutdown — when NASA’s data updates paused, the app pinned the last TEMPO granule, labelled its exact age and kept working.',
  tags: ['Python', 'Flask', 'NASA TEMPO', 'OpenAI', 'Azure'],
  metrics: [
    { value: '1,219', label: 'Global Nominee · of 11,500+ teams' },
    { value: '3', label: 'Data sources fused' },
    { value: '6-hr', label: 'Explainable AQI forecast' },
    { value: '5', label: 'Per-group safety profiles' },
  ],
  primaryStack: ['Python 3.11', 'Flask 3.0', 'NASA TEMPO L2 NO₂', 'OpenAI gpt-4o-mini', 'Azure App Service'],
  secondaryStack: ['netCDF4 + NumPy', 'OpenAQ v3', 'OpenWeather 2.5', 'Google Maps JS API', 'Chart.js', 'Azure Blob Storage', 'GitHub Actions', 'Gunicorn'],
  keyDecisions: [
    {
      title: 'Explainable physics model over a black box',
      body: 'Each forecast hour is adjusted by readable multipliers — strong wind ×0.75, rain ×0.65, heat above 85°F ×1.20, rush hour ×1.15 — compounded with a 0.9 decay. Every prediction returns its reason (“improving as wind disperses pollution”), which is what makes the AI brief and health alerts concrete.',
    },
    {
      title: 'Cross-validate the satellite against the street',
      body: 'For the same coordinates the app compares TEMPO-derived AQI with live ground-sensor AQI and renders a correlation score — accuracy = 100 − |tempo − ground| ÷ max × 100. That reconciliation step is the heart of the NASA challenge.',
    },
    {
      title: 'Graceful degradation on every dependency',
      body: 'Every external call has a realistic fallback, missing keys degrade to cached or synthetic data, and the AI endpoints return friendly HTTP 200s on failure. Proven in production during the government shutdown, when the app cached through the upstream outage and labelled the data’s age instead of breaking.',
    },
  ],
  graphColors: { core: PALETTE.accent, data: PALETTE.ice, ai: PALETTE.lilac, ui: PALETTE.jade, storage: PALETTE.slate, infrastructure: PALETTE.slate, location: PALETTE.sand },
  architectureGraph: {
    nodes: [
      { id: 'flask', label: 'Flask API', description: 'Flask monolith serving the SPA and 8 JSON endpoints from one process; every dependency wrapped in a graceful-degradation layer.', category: 'core', importance: 'center', x: 50, y: 48 },
      { id: 'spa', label: 'Browser SPA', description: 'Vanilla JS single-page app — zero framework, zero build step — with a dark glassmorphism design system.', category: 'ui', importance: 'primary', x: 50, y: 12 },
      { id: 'tempo', label: 'TEMPO Ingestion', description: 'Streams the TEMPO_NO2_L2_V04 NetCDF granule into memory, reads the HDF groups and snaps to the nearest satellite pixel (argmin over a Manhattan-distance field).', category: 'data', importance: 'primary', x: 18, y: 62 },
      { id: 'openaq', label: 'Ground Sensors', description: 'OpenAQ v3 stations within 25 km; PM2.5 → AQI via the EPA piecewise-linear breakpoint formula, with a triple-layered fallback.', category: 'data', importance: 'primary', x: 38, y: 82 },
      { id: 'weather', label: 'Live Meteorology', description: 'OpenWeather current conditions + forecast — the variables that govern how pollution disperses.', category: 'data', importance: 'primary', x: 62, y: 82 },
      { id: 'forecast', label: 'Forecast Engine', description: 'Physics-informed 6-hour projection: meteorology and traffic-cycle multipliers with a 0.9 decay, each hour returning a human-readable reason.', category: 'core', importance: 'primary', x: 82, y: 62 },
      { id: 'safety', label: 'Safety Engine', description: 'Five risk profiles (care facilities, children, seniors, athletes, adults) with their own AQI thresholds and best/worst time windows.', category: 'core', importance: 'secondary', x: 88, y: 38 },
      { id: 'gpt', label: 'GPT-4o-mini', description: 'Writes the A–F daily brief and powers the session-aware chat assistant, fed the full fused context.', category: 'ai', importance: 'primary', x: 78, y: 18 },
      { id: 'fusion', label: 'Satellite ↔ Ground', description: 'Correlation score between TEMPO-derived and ground AQI for the same coordinates.', category: 'core', importance: 'secondary', x: 28, y: 38 },
      { id: 'blob', label: 'Azure Blob Storage', description: 'Caches the TEMPO granule; the app pinned the last available one during the 2025 shutdown.', category: 'storage', importance: 'secondary', x: 8, y: 84 },
      { id: 'nasa', label: 'NASA TEMPO', description: 'Geostationary air-quality instrument ~35,786 km up, measuring hourly at 2–8 km resolution.', category: 'location', importance: 'leaf', x: 6, y: 44 },
      { id: 'maps', label: 'Google Maps', description: 'Dark map with animated AQI markers, heatmap overlay, geocoded search and geolocation.', category: 'ui', importance: 'leaf', x: 26, y: 14 },
      { id: 'charts', label: 'Chart.js', description: 'Forecast and weather graphs colour-coded by EPA AQI category.', category: 'ui', importance: 'leaf', x: 68, y: 6 },
      { id: 'azure', label: 'Azure App Service', description: 'Production slot, deployed by GitHub Actions on every push to main; Gunicorn with a 600s timeout for the NetCDF cold start.', category: 'infrastructure', importance: 'secondary', x: 94, y: 84 },
    ],
    edges: [
      { source: 'spa', target: 'flask', label: 'fetch /api/*', direction: 'two-way' },
      { source: 'flask', target: 'tempo', label: '/api/tempo', direction: 'one-way' },
      { source: 'flask', target: 'openaq', label: '/api/air-quality', direction: 'one-way' },
      { source: 'flask', target: 'weather', label: '/api/weather', direction: 'one-way' },
      { source: 'flask', target: 'forecast', label: '/api/forecast', direction: 'one-way' },
      { source: 'forecast', target: 'safety', label: 'best / worst windows', direction: 'one-way' },
      { source: 'flask', target: 'gpt', label: '/api/ai-summary · /api/ai-chat', direction: 'one-way' },
      { source: 'tempo', target: 'fusion', label: 'satellite AQI', direction: 'one-way' },
      { source: 'openaq', target: 'fusion', label: 'ground AQI', direction: 'one-way' },
      { source: 'weather', target: 'forecast', label: 'drives', direction: 'one-way' },
      { source: 'blob', target: 'tempo', label: 'granule', direction: 'one-way' },
      { source: 'nasa', target: 'blob', label: 'L2 NO₂', direction: 'one-way' },
      { source: 'spa', target: 'maps', label: 'renders', direction: 'one-way' },
      { source: 'spa', target: 'charts', label: 'renders', direction: 'one-way' },
      { source: 'flask', target: 'azure', label: 'deployed on', direction: 'one-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'browser', url: 'aircast', shots: [] },
  // TODO(allen): the AirCast live URL — the "Visit live" button appears once set.
  live: null,
  problem:
    'Air pollution kills an estimated 7 million people a year, but the data that could warn you is scattered across satellites, sparse ground stations and weather systems — and none of it answers the only question that matters: is it safe to go outside right now?',
  built:
    'An air-quality forecast that fuses NASA’s TEMPO satellite, live ground sensors and weather into one six-hour forecast, then explains it in plain English — tailored to children, seniors, athletes, adults and care facilities. Built with Aahil Afraz as Team Relentless for NASA Space Apps 2025.',
  how: [
    'TEMPO NO₂ granules (NetCDF) stream from Azure Blob Storage; the app snaps to the nearest satellite pixel for your location.',
    'The satellite reading is cross-checked against OpenAQ ground sensors and scored for agreement.',
    'An explainable, physics-informed model projects six hours ahead from wind, heat, rain, humidity and traffic cycles.',
    'GPT-4o-mini writes an A–F daily brief and answers questions in a chat, grounded in the live readings.',
  ],
  next: [],
};
