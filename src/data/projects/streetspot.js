/**
 * streetspot — the project's wall card, brief data and case-study copy.
 * Facts only from the project's own repository.
 */
export const project = {
  id: 'streetspot',
  kind: 'project',
  cardBadge: 'PROTOTYPE',
  badge: 'PERSONAL PROJECT · MOBILE PROTOTYPE',
  label: 'StreetSpot',
  subtitle:
    'Crowdsourced street-parking finder for dense cities — a live map, spot reporting and a gamified contributor system',
  role: 'Mobile · Personal project',
  location: 'Built for Philadelphia',
  repo: 'https://github.com/allenvarghese05/streetspot-app',
  flowEnd: 'PROTOTYPE',
  description:
    'A React Native app that tackles circling the block for parking in dense cities like Philadelphia. Drivers leaving or finding a spot report it; others see nearby availability on an interactive map. Accurate reports earn points (10 base plus bonuses) that level users from Rookie to Legend, with badges and leaderboards to keep the crowd-sourced data fresh. Phase 1 — authentication, the map, spot reporting, gamification, profiles and leaderboards — is built with Expo and Firebase Auth. The real-time backend (Node, Socket.io, MongoDB Atlas), push alerts and predictive “spots usually open after 6pm” insights are the planned next phase.',
  tags: ['React Native', 'Expo', 'Google Maps', 'Firebase Auth', 'Gamification'],
  metrics: [
    { value: '6', label: 'App screens built' },
    { value: '10+', label: 'Points per accurate report' },
    { value: '3', label: 'Platforms · iOS, Android, web' },
  ],
  primaryStack: ['React Native', 'Expo', 'React Native Maps', 'Firebase Auth', 'React Navigation'],
  secondaryStack: ['React Native Paper', 'Expo Location', 'Socket.io (planned)', 'Node/Express (planned)', 'MongoDB Atlas (planned)'],
  keyDecisions: [
    {
      title: 'Gamify the crowd-sourcing',
      body: 'Crowd-sourced data dies without contributors, so reporting earns points, levels (Rookie → Legend), badges and leaderboard rank — rewarding accuracy, not just volume.',
    },
    {
      title: 'Expo for one codebase',
      body: 'A single React Native codebase targets iOS, Android and web, keeping a solo prototype shippable across platforms.',
    },
    {
      title: 'Offline-first by design',
      body: 'Street-level signal is unreliable, so reports and spots are cached locally and sync when connectivity returns.',
    },
  ],
  architectureGraph: {
    nodes: [
      { id: 'app', label: 'StreetSpot App', description: 'React Native + Expo app for iOS, Android and web.', category: 'core', importance: 'center', x: 50, y: 42 },
      { id: 'map', label: 'Map Screen', description: 'Google Maps with custom markers, nearby filtering and live availability.', category: 'ui', importance: 'primary', x: 20, y: 18 },
      { id: 'report', label: 'Spot Reporting', description: 'Report a spot with location, type and restrictions.', category: 'ui', importance: 'primary', x: 80, y: 18 },
      { id: 'game', label: 'Gamification', description: 'Points, levels, achievements and leaderboards.', category: 'core', importance: 'primary', x: 84, y: 60 },
      { id: 'auth', label: 'Firebase Auth', description: 'Email/password authentication via an Auth context.', category: 'auth', importance: 'primary', x: 16, y: 62 },
      { id: 'location', label: 'Expo Location', description: 'GPS services for nearby spots.', category: 'location', importance: 'secondary', x: 30, y: 86 },
      { id: 'backend', label: 'Realtime Backend', description: 'Planned: Node/Express, Socket.io and MongoDB Atlas.', category: 'infrastructure', importance: 'secondary', x: 70, y: 86 },
    ],
    edges: [
      { source: 'app', target: 'map', label: 'navigates', direction: 'one-way' },
      { source: 'app', target: 'report', label: 'navigates', direction: 'one-way' },
      { source: 'report', target: 'game', label: 'awards points', direction: 'one-way' },
      { source: 'app', target: 'auth', label: 'signs in', direction: 'one-way' },
      { source: 'map', target: 'location', label: 'locates', direction: 'one-way' },
      { source: 'app', target: 'backend', label: 'planned sync', direction: 'two-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'phone', shots: [] },
  live: null,
  problem:
    'In dense cities like Philadelphia, drivers circle the block looking for parking — burning time and fuel and adding traffic — because nobody knows which spot just opened up.',
  built:
    'A crowdsourced mobile app: drivers leaving or finding a spot report it, everyone nearby sees availability on a live map, and a points system keeps the reports coming.',
  how: [
    'One React Native + Expo codebase for iOS, Android and web, with Google Maps, GPS location and Firebase sign-in.',
    'Reports earn 10 points plus bonuses; contributors level from Rookie to Legend, with badges and leaderboards.',
    'Spots and reports cache offline for streets with weak signal.',
  ],
  next: [
    'Phase 2 — a real-time backend (Node, Express, Socket.io), push alerts, and predictions like “spots usually open here after 6pm”.',
    'Phase 3 — friends and groups, an analytics dashboard, parking-meter integration, more cities.',
  ],
};
