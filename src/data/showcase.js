/**
 * The projects page (/projects) and the Mission Control wall: one card per
 * project. Every number and line here is lifted from that project's verified
 * case-study data (src/data/projects/<id>.js, src/data/studies/<id>.js), so
 * the card never says more than the case study behind it.
 *
 * cover.type
 *   'image'     a real picture: product screenshots (Church Building, BIS,
 *               LearnFlow, Typist), and the AirCast Global Nominee badge.
 *               Sources are in src/pictures; the crops live in public/work.
 *   'phone'     an iPhone screenshot in a phone frame (Chronos).
 *   'spectrum'  AutoMix has no screen: a ring growing out of the spectrum,
 *               caught and notched, drawn from its detector's real behaviour.
 *   'flow'      no picture worth showing yet: the project's own pipeline,
 *               drawn from its case-study flow.
 *
 * highlight.tone: 'award' (amber, the one standout), 'built' (jade: built,
 * live or production-ready), 'progress' (sand), 'side' (slate: class
 * projects and prototypes).
 */

import { identity } from './timeline';

export const PROFILE = {
  name: identity.name,
  line: 'Software Engineering · Drexel University · Class of 2027',
  lede: 'Software engineer. I build whole systems, from the database to the interface, and write up how each one works.',
  links: identity.links,
  // The résumé button. A template until the PDF is ready: drop the file in
  // public/ (e.g. public/resume.pdf) and set href to '/resume.pdf'.
  resume: { href: null, label: 'Résumé' },
};

/** The highlights card beside the hero: the four things to know first. */
export const HIGHLIGHTS = [
  { id: 'aircast', title: 'NASA Space Apps 2025', meta: 'Global Nominee · AirCast', note: 'Top 1,219 of 11,500+', award: true, image: '/work/aircast-nominee.webp' },
  { id: 'iet', title: 'Church Building System', meta: 'Client system · sole engineer', note: '146.7 s → 1.28 s' },
  { id: 'bis-report-card', title: 'BIS Report Card', meta: 'Built for a school, self-hosted', note: '282 tests', image: '/work/bis-crest.webp' },
  { id: 'learnflow-ai', title: 'LearnFlow AI', meta: 'Co-founder · in beta', note: '150+ beta testers' },
];

/** Card layout: the first is full width, then pairs, then the earlier work. */
export const LAYOUT = {
  feature: 'iet',
  pairs: ['aircast', 'bis-report-card', 'learnflow-ai', 'chronos-ai', 'typist-ml', 'automix-ai'],
  earlier: ['jam-duel', 'college-matcher', 'streetspot'],
};

/** Short names for the jump links. */
export const SHORT = {
  iet: 'Church Building',
  aircast: 'AirCast',
  'bis-report-card': 'BIS Report Card',
  'learnflow-ai': 'LearnFlow',
  'chronos-ai': 'Chronos',
  'typist-ml': 'Typist',
  'automix-ai': 'AutoMix',
  'jam-duel': 'JamDuel',
  'college-matcher': 'College Matcher',
  streetspot: 'StreetSpot',
};

export const SHOWCASE = {
  iet: {
    mark: 'C',
    context: 'Client system · Jan 2026 to now',
    highlight: { text: 'Production-ready · sole engineer', tone: 'built' },
    pitch: 'The grant system for building churches across India: apply, review, approve, then fund construction in three phases.',
    cover: {
      type: 'image',
      src: '/work/iet-applications.webp',
      alt: 'The Church Building System: the applications list, filtered by workflow stage',
      position: 'left top',
    },
    stats: [
      { value: '1.28 s', label: 'all-time analytics, down from 146.7 s' },
      { value: '21', label: 'workflow statuses in one engine' },
      { value: '700+', label: 'automated checks in CI' },
    ],
    points: [
      'One workflow engine moves every application through 21 statuses, with the rules in force frozen onto each one.',
      'Money moves race-safe: a release can never pass the approved amount, not even with two clicks at once.',
      'A Super Admin console changes the rules without a deploy.',
      'Analytics rewritten from 146.7 s to 1.28 s. The security audit is done; deployment is next.',
    ],
    links: [],
    privateNote: 'Private client system, shown with test data',
  },

  'bis-report-card': {
    mark: 'B',
    context: 'Sole developer · Jul to Oct 2026',
    highlight: { text: 'Built · rollout with the school in talks', tone: 'built' },
    pitch: 'Report cards that run inside the school: one server on its own network, no cloud, CBSE-format PDFs.',
    cover: {
      type: 'image',
      src: '/work/bis-report-print.webp',
      alt: 'A CBSE-format progress report in the BIS print preview, approved and locked',
      position: 'center top',
    },
    stats: [
      { value: '282', label: 'automated tests, green in CI' },
      { value: '31', label: 'Prisma models, 15 migrations' },
      { value: '118', label: 'API route handlers' },
    ],
    points: [
      'Teachers enter marks, class teachers consolidate, division heads approve and lock, the office prints.',
      'Runs on one server inside the school, on its own network, because the internet there can’t be relied on.',
      'A template console lets the school redesign or upload its own card formats, all from one template engine.',
      'Encrypted backups, Docker ops and controls for shared lab computers.',
    ],
    links: [],
    privateNote: 'Private repository',
  },

  'learnflow-ai': {
    mark: 'L',
    context: 'Co-founder · Jun 2025 to now',
    highlight: { text: 'Beta · 150+ testers', tone: 'built' },
    pitch: 'A student planner that sets itself up: paste a Canvas calendar link and your classes and deadlines appear.',
    cover: {
      type: 'image',
      src: '/work/learnflow-site.webp',
      alt: 'The LearnFlow website',
      position: 'center top',
      caption: 'learnflow-ai.app',
    },
    stats: [
      { value: '150+', label: 'beta testers' },
      { value: '1 link', label: 'Canvas feed to classes and deadlines' },
      { value: '5,573', label: 'lines in the rebuild, from 64,066 in v1' },
    ],
    points: [
      'Version 1 was a desktop study companion. More than 150 beta testers used it, then browsers built the same help in.',
      'So the product was cut back to what nobody else did: setting up the semester for you.',
      'I rebuilt it as a web app: the Canvas sync, the syllabus reader, assignment guides and a class assistant.',
      'The rebuild is about a tenth of the old code.',
    ],
    links: [{ href: 'https://learnflow-ai.app/', label: 'Live site' }],
  },

  aircast: {
    mark: 'A',
    prefix: 'NASA Space Apps 2025',
    context: 'Two-person team · Oct 2025',
    highlight: { text: 'Global Nominee', tone: 'award' },
    standing: 'Top 1,219 of 11,500+ teams worldwide',
    pitch: 'Air quality from space to street: satellite, ground sensors and weather on one map, with safety advice per group.',
    cover: {
      type: 'image',
      src: '/work/aircast-nominee.webp',
      alt: 'NASA Space Apps Challenge 2025 Global Nominee badge',
      fit: 'contain',
      tint: '#0a1a3d',
    },
    stats: [
      { value: '1,219', label: 'teams named Global Nominees, of 11,500+' },
      { value: '3', label: 'data sources fused: satellite, ground, weather' },
      { value: '27 h', label: 'of commits, start to final push' },
    ],
    points: [
      'Fuses NASA’s TEMPO satellite, ground stations and the weather to answer “is it safe to go outside, and when?”',
      'A forecast that explains every step, and advice for children, seniors, athletes, adults and care facilities.',
      'My part: the AI brief and chat, the per-group safety engine, the satellite data on Azure, and the deploy.',
    ],
    links: [{ href: 'https://github.com/aahilafraz123/aircast-nasa-hackathon', label: 'Source' }],
  },

  'chronos-ai': {
    mark: 'C',
    context: 'Solo · Oct 2026 to now',
    highlight: { text: 'In progress · engine built', tone: 'progress' },
    pitch: 'A wake detector for one person: the iPhone reports its signals, a server decides whether I’m really up.',
    cover: {
      type: 'phone',
      src: '/work/chronos-settings.webp',
      alt: 'Chronos on iPhone: the wake windows and the confirm and strong score thresholds',
    },
    stats: [
      { value: '636', label: 'API tests passing' },
      { value: '11', label: 'golden test mornings' },
      { value: '≥ 90%', label: 'wake-engine coverage, gated in CI' },
    ],
    points: [
      'An alarm knows the time, not whether you’re awake. A 3 a.m. glance at the phone looks just like getting up.',
      'iOS gives apps no unlock event, so the server runs the morning and wakes the phone with silent pushes.',
      'An explainable, versioned scoring engine, with replay of past mornings under new rules.',
      'The morning reel it triggers is planned, not built.',
    ],
    links: [],
    privateNote: 'Private repository',
  },

  'typist-ml': {
    mark: 'T',
    context: 'Sole researcher and engineer · Sep 2026 to now',
    highlight: { text: 'Code complete · pilot next', tone: 'progress' },
    pitch: 'A typing coach built as a controlled experiment: four drill methods, one fairness gate, a frozen design.',
    cover: {
      type: 'image',
      src: '/work/typist-session.webp',
      alt: 'Typist-ML Session Studio: all 14 sessions recorded, from baseline through blinded practice to retest',
      position: 'center top',
    },
    stats: [
      { value: '4', label: 'drill methods behind one fairness gate' },
      { value: '569', label: 'automated tests, pytest and Vitest' },
      { value: '39', label: 'pull requests in 37 days' },
    ],
    points: [
      'Finds the letter pairs you’re weakest at and drills them three ways, plus plain practice as a control.',
      'Every method gets the same exposure and the same rule for what counts as a mistake.',
      'Three generators, one of them an on-device language model, and an analysis plan committed before any results.',
    ],
    links: [{ href: 'https://github.com/allenvarghese05/typist-ml', label: 'Source' }],
  },

  'automix-ai': {
    mark: 'A',
    context: 'Solo · Apr 2026 to now',
    highlight: { text: 'In progress · tested in simulation', tone: 'progress' },
    pitch: 'A real-time engine that mixes live microphones and catches acoustic feedback before it howls.',
    cover: {
      type: 'spectrum',
      title: 'A ring caught and notched',
    },
    stats: [
      { value: '38', label: 'test cases: DSP, detector, closed loop' },
      { value: '11', label: 'stages per mic, plus 5 on the master' },
      { value: '3 Hz', label: 'ring frequency accuracy, tested' },
    ],
    points: [
      'A classical ring detector, notch filters that deepen only when needed, and a gain guard.',
      'A simulated room with an independent judge scores every change.',
      'I retired an ML detector after finding it had learned a bug.',
    ],
    links: [{ href: 'https://github.com/allenvarghese05/AutoMixAI', label: 'Source' }],
  },

  'jam-duel': {
    mark: 'J',
    context: 'Team of three · Aug 2025',
    highlight: { text: 'Class project · Drexel INFO310', tone: 'side' },
    pitch: 'Head-to-head song battles with a daily vote budget and GPT-4 recommendations from your favourites.',
    cover: {
      type: 'flow',
      title: 'One battle, start to finish',
      steps: ['Sign up', 'Favourites', 'Battle', 'Vote', 'Results', 'Recommend'],
    },
    stats: [
      { value: '10', label: 'votes a day, stacked 1 to 10 at a time' },
      { value: '30', label: 'API routes behind the app' },
      { value: '8', label: 'Postgres tables' },
    ],
    points: [
      'A stacked vote says how much you prefer a song, which a like button can’t.',
      'I wrote the full stack, the YouTube player, the recommendations and the published frontend.',
    ],
    links: [{ href: 'https://github.com/allenvarghese05/JamDuel', label: 'Source' }],
  },

  'college-matcher': {
    mark: 'C',
    context: 'Solo · Aug 2025',
    highlight: { text: 'Personal project', tone: 'side' },
    pitch: 'Explainable college matching: a 100-point score you can read part by part, and a voice counselor.',
    cover: {
      type: 'flow',
      title: 'How a match score is made',
      steps: ['Assessment', 'Academics', 'Money', 'Fit', 'Reality check', 'Balance'],
    },
    stats: [
      { value: '100', label: 'point score in 5 parts' },
      { value: '3', label: 'categories: safety, target, reach' },
      { value: '21', label: 'career profiles' },
    ],
    points: [
      'Rankings give one opaque number. This score shows exactly where every point came from.',
      'Caps for schools that aren’t realistic, and a list balanced across safeties, targets and reaches.',
    ],
    links: [{ href: 'https://github.com/allenvarghese05/college-matcher', label: 'Source' }],
  },

  streetspot: {
    mark: 'S',
    context: 'Solo · Jul 2025',
    highlight: { text: 'Prototype · one evening', tone: 'side' },
    pitch: 'Crowdsourced street parking: report an open spot, see spots within 1 km, claim one, earn points.',
    cover: {
      type: 'flow',
      title: 'Report, see, claim',
      steps: ['Sign in', 'Locate', 'Report', 'Share', 'See nearby', 'Claim'],
    },
    stats: [
      { value: '7', label: 'screens in the Expo app' },
      { value: '1 km', label: 'nearby radius, Haversine' },
      { value: '3', label: 'realtime socket events' },
    ],
    points: [
      'The driver leaving a spot is the one person who knows it’s free, and has no reason to say so.',
      'Points weighted toward detail, an offline fallback, and a small Socket.IO server shared between phones.',
    ],
    links: [{ href: 'https://github.com/allenvarghese05/streetspot-app', label: 'Source' }],
  },
};
