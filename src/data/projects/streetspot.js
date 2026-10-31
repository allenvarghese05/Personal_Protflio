/**
 * streetspot — the project's wall card, brief data and case-study copy.
 * Facts from the repository (allenvarghese05/streetspot-app); the page's own
 * copy lives in src/data/studies/streetspot.js.
 */

export const project = {
  id: 'streetspot',
  kind: 'project',
  cardBadge: 'PROTOTYPE',
  badge: 'MOBILE PROTOTYPE · SOLO',
  label: 'StreetSpot',
  subtitle:
    'A crowdsourced street-parking prototype — report an open spot, see available spots within 1 km on a map, claim one, and earn points for detailed reports',
  role: 'Solo developer',
  company: 'Personal project',
  dateRange: 'Jul 2025',
  location: 'React Native · Expo',
  repo: 'https://github.com/allenvarghese05/streetspot-app',
  live: null,
  tags: ['React Native', 'Expo', 'Socket.IO', 'Google Maps', 'Firebase Auth'],
  metrics: [
    { value: '7', label: 'Screens (6 user-facing + loading)' },
    { value: '10–20', label: 'Points per report, weighted to detail' },
    { value: '1 km', label: 'Nearby radius, Haversine' },
    { value: '3', label: 'Realtime socket events on the server' },
  ],
  primaryStack: ['React Native 0.79', 'Expo SDK 53', 'React 19', 'react-native-maps', 'Socket.IO 4.8'],
  secondaryStack: ['Express 5', 'Firebase Auth', 'AsyncStorage', 'React Navigation 7', 'React Native Paper', 'expo-location'],
  keyDecisions: [
    { title: 'Reporting shouldn’t fail without a server', body: 'When the socket isn’t connected a report is kept locally and cached in AsyncStorage — usable offline, though not synced later.' },
    { title: 'One spot list across every phone', body: 'The server broadcasts each change and every phone upserts by id; the acknowledgement round-trip is an open integration bug.' },
    { title: 'Reward detail', body: 'A base 10 points plus bonuses for metered spots, restrictions and notes, shown before submitting, with levels every 100 points.' },
  ],
  timeline: [
    { week: 'Jul 28 · 19:54', start: '2025-07-28', end: '2025-07-28', title: 'Scaffold', desc: 'The create-expo-app template.', done: true },
    { week: 'Jul 28 · 21:31', start: '2025-07-28', end: '2025-07-28', title: 'The prototype', desc: 'Seven screens, two contexts, the Socket.IO dev server and the README roadmap.', done: true },
  ],
  architectureGraph: {
    nodes: [
      { id: 'parking', label: 'Parking context', description: 'Spots, the socket, the offline fallback, Haversine distance and the time-of-day prediction.', category: 'core', importance: 'center', x: 50, y: 50 },
      { id: 'driver', label: 'Driver', description: 'Either reporting a spot they’re leaving or looking for one.', category: 'ui', importance: 'leaf', x: 6, y: 50 },
      { id: 'map', label: 'Map screen', description: 'Google map with every reported spot, a 1,000 m circle, a nearby count and a claim card.', category: 'ui', importance: 'primary', x: 28, y: 24 },
      { id: 'report', label: 'Report screen', description: 'GPS-seeded pin, type, restrictions, duration, notes and a live points preview.', category: 'ui', importance: 'primary', x: 28, y: 50 },
      { id: 'profile', label: 'Account screens', description: 'Login, register, profile (levels, achievements) and a leaderboard of mock data.', category: 'ui', importance: 'secondary', x: 28, y: 78 },
      { id: 'auth', label: 'Auth context', description: 'Firebase email auth plus a profile with points and level in AsyncStorage.', category: 'auth', importance: 'primary', x: 50, y: 80 },
      { id: 'storage', label: 'AsyncStorage', description: 'The user profile and spots reported while offline, on the phone.', category: 'storage', importance: 'secondary', x: 72, y: 74 },
      { id: 'server', label: 'Socket.IO server', description: 'Express 5 + Socket.IO dev server: report, claim and remove events, spots in memory (MongoDB planned).', category: 'realtime', importance: 'primary', x: 72, y: 30 },
      { id: 'firebase', label: 'Firebase Auth', description: 'Email/password sign-in — configured with placeholder keys in the repo.', category: 'auth', importance: 'leaf', x: 94, y: 70 },
      { id: 'maps', label: 'Google Maps', description: 'Map tiles through react-native-maps.', category: 'location', importance: 'leaf', x: 94, y: 28 },
    ],
    edges: [
      { source: 'driver', target: 'map', label: '', direction: 'two-way' },
      { source: 'driver', target: 'report', label: '', direction: 'two-way' },
      { source: 'driver', target: 'profile', label: '', direction: 'two-way' },
      { source: 'map', target: 'parking', label: 'spots · claim', direction: 'two-way' },
      { source: 'report', target: 'parking', label: 'reportParkingSpot', direction: 'one-way' },
      { source: 'report', target: 'auth', label: 'addPoints', direction: 'one-way' },
      { source: 'profile', target: 'auth', label: '', direction: 'two-way' },
      { source: 'parking', target: 'server', label: 'socket events', direction: 'two-way' },
      { source: 'parking', target: 'storage', label: 'offline cache', direction: 'one-way' },
      { source: 'auth', target: 'firebase', label: '', direction: 'two-way' },
      { source: 'auth', target: 'storage', label: 'profile', direction: 'two-way' },
      { source: 'map', target: 'maps', label: '', direction: 'one-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'phone', shots: [] },
  live: null,
  problem:
    'In dense cities like Philadelphia drivers circle blocks looking for parking, while the driver leaving a spot is the one person who knows it’s free.',
  built:
    'A React Native + Expo prototype: report a spot, see available spots within 1 km on a map, claim one, earn points — with a small Socket.IO dev server sharing spots between phones.',
  how: [
    'Reports go to the server over Socket.IO and are broadcast to every phone, or are kept on the phone when there’s no connection.',
    'Nearby means within 1,000 m by Haversine distance.',
    'Points reward detail: base 10, +5 metered, +3 restrictions, +2 notes.',
  ],
  next: [],
};
