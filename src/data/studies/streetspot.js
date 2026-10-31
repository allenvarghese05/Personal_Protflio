/**
 * StreetSpot — every fact the case study shows. Checked against the
 * repository (allenvarghese05/streetspot-app, HEAD a49c073): App.js, src/*,
 * server.js and the git history. A one-evening prototype — the page says so.
 */

export const LINKS = [{ href: 'https://github.com/allenvarghese05/streetspot-app', label: 'Repository' }];

export const COPY = {
  outcome:
    'A crowdsourced parking prototype: drivers drop a pin for an open curb spot, others nearby see it on a map and claim it, and reports earn points.',
  status: 'Prototype · never deployed',
  before: [
    'Drivers circle blocks in dense cities like Philadelphia looking for a spot',
    'The driver leaving a spot knows it’s free; the driver looking for one doesn’t',
    'Nobody has a reason to tell anyone',
    'Street signal is unreliable',
  ],
  after: [
    'A map of reported spots, with a count of available ones within 1 km',
    'One tap to report a spot — type, restrictions, how long it’s likely free, notes',
    'Every report earns 10–20 points, levels and achievements',
    'Reports made without a connection are kept on the phone',
  ],
  built:
    'A solo React Native + Expo prototype with seven screens, two React contexts and a small Node/Express + Socket.IO dev server that keeps spots in memory. Both commits are from one evening (28 Jul 2025). It was never deployed: the Firebase and Maps keys are placeholders, the socket points at localhost, and the leaderboard is mock data.',
  next: [
    'Finish the realtime round-trip: the client waits for a Socket.IO acknowledgement, but the server replies with a separate event — so reports and claims never resolve on the connected path.',
    'Persist spots (the in-memory array stands in for a database) and receive the snapshot of existing spots on connect.',
    'Sync reports made offline once the connection returns, and make the 5-minute claim hold real.',
    'Points and the leaderboard on a server instead of on each phone.',
  ],
  headlines: {
    problem: 'The driver leaving a spot knows it’s free — the one circling the block doesn’t.',
    how: 'Report, see, claim — three flows across a phone and a small realtime server.',
    inside: 'Points that reward detail, a radius in real metres, and a first “prediction” that’s honest about being a rule.',
    decisions: 'Three decisions in a one-evening prototype — and the integration bug they left behind.',
    architecture: 'An Expo app with two contexts, talking to an in-memory Socket.IO server.',
    build: 'Scaffolded and built in one evening.',
    next: 'What it would take to put it on the street.',
  },
  buildNote: 'Two commits, both on 28 Jul 2025: the create-expo-app scaffold, then the whole prototype (7 screens, 2 contexts, the server, the README). No later history, tests or CI.',
};

export const FLOW = {
  caption: 'Report → see → claim',
  figureCaption: 'From a free spot to a claimed one',
  steps: [
    { key: 'signin', label: 'Sign in', title: 'An account, and a profile on the phone', body: 'Firebase email sign-up, then a profile with points, reports and level saved to the phone’s AsyncStorage. The Firebase config in the repo is a placeholder, so this needs real keys to run.', facts: ['Password ≥ 6 characters, matching confirmation', 'Profile stored under user_<uid> — points never leave the phone'] },
    { key: 'locate', label: 'Locate', title: 'Where’s the spot?', body: 'Location permission, then a high-accuracy GPS fix seeds the pin; the driver can tap the mini map to move it.', facts: ['expo-location, accuracy: High', 'Philadelphia (39.9526, −75.1652) is the default centre'] },
    { key: 'report', label: 'Report', title: 'Describe it — and see the points first', body: 'Pick one of 4 spot types, any of 5 restrictions, one of 5 expected durations, and add notes. A live line shows “You’ll earn N points!” before submitting.', facts: ['Types: street, metered, residential, commercial', 'Restrictions: no parking, time limit, permit, handicap, loading'] },
    { key: 'sync', label: 'Share', title: 'To the server, or to the phone', body: 'Connected: the spot is emitted over Socket.IO and the server broadcasts it to every phone. Not connected: it’s added locally and cached in AsyncStorage.', facts: ['Server keeps spots in an in-memory array', 'Client upserts each broadcast spot by id'] },
    { key: 'see', label: 'See nearby', title: 'Every pin, and a count within 1 km', body: 'The map draws every reported spot — green available, red claimed — with a 1,000 m circle around the driver and a chip counting available spots inside it (Haversine distance).', facts: ['Radius 1,000 m, Earth radius 6,371 km', 'A toggle shows “predicted” spots in purple'] },
    { key: 'claim', label: 'Claim', title: 'Tap a pin and claim it', body: 'A card shows status and when it was reported; “Claim This Spot” marks it claimed. The alert says “You have 5 minutes to arrive” — but no timer is built yet.', facts: ['Status values: available, claimed', 'SPOT_TIMEOUT is defined but never read'] },
  ],
};

export const FEATURES = [
  { key: 'points', label: 'Gamification', title: 'Points that reward detail', body: 'A base 10 points per report, +5 for a metered spot, +3 for noting a restriction, +2 for notes. Every 100 points is a level, from Parking Rookie upward, plus four achievements.', stat: { value: '10–20', label: 'points per report' } },
  { key: 'radius', label: 'Distance', title: 'Metres, not degrees', body: 'Latitude and longitude differences aren’t distances, so “nearby” uses the great-circle Haversine formula — on the phone and in the server’s /nearby endpoint.', stat: { value: '1 km', label: 'nearby radius' } },
  { key: 'predict', label: 'Prediction', title: 'A first guess, labelled honestly', body: 'A time-of-day rule, not a model: commercial spots are flagged likely during 9–17, residential ones during 18–22, within 2 km. Street and metered spots are never predicted.', stat: { value: '2', label: 'of 4 spot types predicted' } },
  { key: 'server', label: 'Server', title: 'A small realtime dev server', body: 'Express 5 + Socket.IO 4.8 with three socket events (report, claim, remove), three REST endpoints and a graceful shutdown. Spots live in memory; MongoDB is the planned store.', stat: { value: '168', label: 'lines, in-memory' } },
];

export const DECISIONS = [
  {
    id: 'offline',
    kicker: 'Offline',
    title: 'Reporting shouldn’t fail without a server',
    problem: 'A phone on the street may not reach the realtime server, and a report that fails is a report that’s lost.',
    decision: 'Every mutation in the parking context checks whether the socket is connected. If not, the spot is built locally, added to state and cached in AsyncStorage, and the report succeeds.',
    tradeoff: 'Offline reports are never synced when the connection returns, offline claims aren’t cached, and the cache write can use a stale list. It keeps the app usable, not consistent.',
    caption: 'The two paths of one report',
    steps: ['Connected? emit("reportParkingSpot") → server stores and broadcasts', 'Not connected? Build the spot locally (id = Date.now())', 'Add it to state', 'Cache the list in AsyncStorage', 'Return success → award points'],
    readout: 'src/context/ParkingContext.js:92-117',
    code: {
      file: 'src/context/ParkingContext.js',
      lang: 'js',
      body: `const reportParkingSpot = async (spotData) => {
  if (!socket || !isConnected) {
    // Fallback to local storage if no connection
    const newSpot = { id: Date.now().toString(), ...spotData,
      timestamp: new Date().toISOString(), reportedBy: spotData.userId, status: 'available' };
    setParkingSpots(prev => [...prev, newSpot]);
    await cacheSpots([...parkingSpots, newSpot]);
    return { success: true, spot: newSpot };
  }`,
    },
  },
  {
    id: 'broadcast',
    kicker: 'Realtime',
    title: 'One spot list across every phone',
    problem: 'Every driver should see a spot the moment someone reports or claims it.',
    decision: 'The server holds the list and broadcasts each change with io.emit; each phone upserts by id — replace if it exists, append if not.',
    tradeoff: 'Simple, but nothing persists and a newly connected phone ignores the snapshot of existing spots. Reading the code also shows an open bug: the client waits for an acknowledgement the server never sends, so the connected report never resolves.',
    caption: 'What happens on the connected path',
    steps: ['Phone emits reportParkingSpot with an acknowledgement callback', 'Server pushes the spot and io.emits parkingSpotUpdate', 'Every phone upserts the spot by id', 'Server replies with a reportResponse event — not the acknowledgement', 'So the reporting phone’s promise never resolves (open integration bug)'],
    readout: 'server.js:30-45 and ParkingContext.js:34-43, 109.',
    code: {
      file: 'src/context/ParkingContext.js',
      lang: 'js',
      body: `newSocket.on('parkingSpotUpdate', (spot) => {
  setParkingSpots(prev => {
    const existing = prev.find(s => s.id === spot.id);
    if (existing) {
      return prev.map(s => s.id === spot.id ? spot : s);
    } else {
      return [...prev, spot];
    }
  });
});`,
    },
  },
  {
    id: 'reward',
    kicker: 'Incentives',
    title: 'Give people a reason to report — and weight it toward detail',
    problem: 'A crowdsourced map is empty until people report, and a pin with no detail is barely useful.',
    decision: 'A fixed base reward plus bonuses for the details other drivers need — metered or not, restrictions, notes — shown live before submitting, with levels every 100 points.',
    tradeoff: 'Nothing checks that a report is accurate, points live only on the phone, and the leaderboard is mock data — so there’s no real competition yet.',
    caption: 'Points for one report',
    steps: ['Base: 10 points', '+5 if the spot is metered', '+3 if any restriction is noted', '+2 if the notes aren’t empty', 'Level = floor(points / 100) + 1'],
    readout: 'SpotReportScreen.js:109-115 and AuthContext.js:115-124.',
    code: {
      file: 'src/screens/SpotReportScreen.js',
      lang: 'js',
      body: `const calculatePoints = () => {
  let points = 10; // Base points
  if (spotDetails.type === 'metered') points += 5;
  if (spotDetails.restrictions.length > 0) points += 3;
  if (spotDetails.notes.trim()) points += 2;
  return points;
};`,
    },
  },
];

export const LAYERS = [
  { key: 'who', label: 'Who', nodes: ['driver'] },
  { key: 'app', label: 'Expo app', nodes: ['map', 'report', 'profile'] },
  { key: 'domain', label: 'Contexts', nodes: ['auth', 'parking'] },
  { key: 'data', label: 'Storage', nodes: ['storage', 'server'] },
  { key: 'out', label: 'Outside', nodes: ['firebase', 'maps'] },
];

export const TRACES = [
  { id: 'report', label: 'Report a spot', steps: ['driver', 'report', 'parking', 'server', 'parking', 'map'] },
  { id: 'offline', label: 'Report with no signal', steps: ['driver', 'report', 'parking', 'storage'] },
  { id: 'signin', label: 'Sign in', steps: ['driver', 'profile', 'auth', 'firebase', 'storage'] },
];

/* ── the case study in one screen ─────────────────────────────────────────── */
export const OVERVIEW = [
  { label: 'What it is', text: 'A crowdsourced street-parking app: drop a pin for an open spot, see available spots within 1 km on a map, claim one, and earn points for detailed reports.' },
  { label: 'Why it exists', text: 'In dense cities like Philadelphia drivers circle the block, while the driver leaving a spot is the one person who knows it’s free — and has no reason to say so.' },
  { label: 'What Allen did', text: 'Solo: a React Native + Expo app with seven screens, an offline fallback, Haversine “nearby”, the points system, and a small Socket.IO server that shares spots between phones.' },
  { label: 'Where it stands', text: 'A one-evening prototype, never deployed. The realtime round-trip has an open bug, spots live in memory, and the leaderboard is mock data — all written up on the page.' },
];
