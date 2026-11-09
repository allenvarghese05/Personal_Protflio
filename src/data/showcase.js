/**
 * The projects page (/projects): what each project shows there. Every number
 * and line is lifted from that project's verified case-study data
 * (src/data/projects/<id>.js, src/data/studies/<id>.js), so the page never
 * says more than the case study behind it.
 *
 * Per project:
 *   ground     the project's own colour (its product's brand, darkened), the
 *              field its picture sits on and the band in the index. Always
 *              dark, so white type on it reads in both themes.
 *   accent     the case study's one accent, from the same hue: OKLCH L 0.76
 *              on the dark page (8.6 to 9.8:1), L 0.5 on white (5.3 to 6.6:1)
 *   hue        the same colour lifted to middle lightness (OKLCH L 0.6): the
 *              soft glow behind the index on hover, readable as colour on
 *              both the white page and the dark one
 *   year       shown in the index row
 *   status     the index row's state, with its proof where there is one
 *   band       three short phrases that run through the index row on hover
 *   highlight  the status chip: tone 'award' (amber), 'built' (jade),
 *              'progress' (sand), 'side' (slate)
 *   cover      the picture:
 *                'shot'      a product screenshot in a window frame
 *                'badge'     an image shown whole (the AirCast nominee badge)
 *                'phone'     an iPhone screenshot in a phone frame
 *                'spectrum'  AutoMix has no screen: a ring caught and notched
 *              Source photos are in src/pictures; the crops live in public/work.
 *   steps      "How it works": the project's own flow, one sentence a step,
 *              from its case study. `planned` marks a step that isn't built.
 */

import { identity } from './timeline';

export const PROFILE = {
  name: identity.name,
  short: 'Software Engineering · Drexel University ’27',
  links: identity.links,
  // The résumé button: set identity.resume in src/data/timeline.js
  resume: { href: identity.resume, label: 'Résumé' },
  updated: 'November 2026',
};

/** Three tiers, three compositions. Order = the index's order. */
export const LAYOUT = {
  featured: ['aircast', 'telltale', 'iet', 'bis-report-card', 'learnflow-ai', 'typist-ml'],
  progress: ['chronos-ai', 'automix-ai'],
  earlier: ['jam-duel', 'college-matcher', 'streetspot'],
};
export const ALL_IDS = [...LAYOUT.featured, ...LAYOUT.progress, ...LAYOUT.earlier];

/**
 * The sentence under "Projects": the strongest proof, in words, before the
 * list. Each linked phrase jumps to its project. Starts after "Eleven projects, " (the count is computed).
 */
export const OPENING = [
  { text: 'including a ' },
  { text: 'NASA Space Apps 2025 Global Nominee', id: 'aircast' },
  { text: ', a grant system ' },
  { text: 'in production for a client', id: 'iet' },
  { text: ', and a startup I co-founded with ' },
  { text: '150+ beta testers', id: 'learnflow-ai' },
  { text: '.' },
];

/** Short names for the header's "now viewing" and the index. */
export const SHORT = {
  iet: 'Church Building',
  aircast: 'AirCast',
  telltale: 'Telltale',
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
    ground: '#3d0f2e',
    hue: '#be5399',
    accent: { dark: '#f188ca', light: '#a02e7c' },
    year: '2026',
    status: 'In production · client system',
    context: 'Client system · sole engineer · Jan 2026 to now',
    highlight: { text: 'In production · sole engineer', tone: 'built' },
    pitch: 'The grant system for building churches across India: apply, review, approve, then fund construction in three phases.',
    band: ['Client system, sole engineer', '31.4\xA0s → 1.28\xA0s analytics', '21 statuses, one engine'],
    cover: {
      type: 'shot',
      src: '/work/iet-applications.webp',
      alt: 'The Church Building System: the applications list, filtered by workflow stage',
      width: 1250,
      height: 781,
    },
    stats: [
      { value: '1.28 s', label: 'all-time analytics, down from 31.4\xA0s' },
      { value: '21', label: 'workflow statuses in one engine' },
      { value: '700+', label: 'automated checks in CI' },
    ],
    steps: [
      { label: 'Apply', text: 'A church leader applies on a nine-page form that works offline.' },
      { label: 'HQ review', text: 'Headquarters reviews it, or sends it back with changes requested.' },
      { label: 'Approval', text: 'The President approves, and the rules in force are frozen onto that application.' },
      { label: 'Three phases', text: 'Finance releases the money in three phases; a release can never pass the approved amount, even with two clicks at once.' },
      { label: 'Reports', text: 'Monthly and bi-annual reports follow the building as it goes up.' },
      { label: 'Rules', text: 'A Super Admin console changes the rules without a deploy, and every move is audited.' },
    ],
    links: [],
    privateNote: 'Private client system, shown with test data',
  },

  telltale: {
    mark: 'T',
    ground: '#2a1a55',
    hue: '#826bd7',
    accent: { dark: '#b19eff', light: '#664abb' },
    year: '2026',
    status: 'Meta hackathon · 0 wrong verdicts published',
    prefix: 'Meta Global AI Developer Hackathon 2026',
    context: 'Solo · Oct to Nov 2026',
    highlight: { text: 'Meta hackathon · solo', tone: 'built' },
    pitch: 'Meta AI investigates a car crash from dashcam video and the car’s logs; plain Python checks every word before anyone reads it.',
    band: ['Meta Global AI Developer Hackathon', '151 live investigations, every one checked', '0 wrong verdicts got through'],
    cover: {
      type: 'shot',
      src: '/work/telltale-site.webp',
      alt: 'The Telltale replay site: Meta AI investigates the crash, plain code checks every word',
      width: 1200,
      height: 750,
    },
    stats: [
      { value: '151', label: 'live AI investigations, each checked by code' },
      { value: '0', label: 'wrong verdicts published (2 caught and withheld)' },
      { value: '74%', label: 'danger onsets within 2\xA0s of human labels, 400 real clips' },
    ],
    steps: [
      { label: 'Watch', text: 'SAM 3.1 tracks every vehicle in real dashcam footage; plain code finds when the struck car became a danger.' },
      { label: 'Witness', text: 'Muse Spark 1.3 describes the same clip: lighting, weather, brake lights.' },
      { label: 'Evidence', text: 'The car’s CAN and ADAS logs go on one clock, in a store nobody can edit.' },
      { label: 'Investigate', text: 'A Muse Wonder agent measures every interval with a tool and names which step failed.' },
      { label: 'Check', text: 'Plain Python redoes every claim and the verdict. Anything it cannot prove is blocked; a disagreement is held for a person.' },
      { label: 'Report', text: 'The report is written by code from verified facts, and replayed in the browser.' },
    ],
    links: [
      { href: 'https://huggingface.co/spaces/Allen05254/telltale', label: 'Live replay' },
      { href: 'https://github.com/allenvarghese05/telltale', label: 'Source' },
    ],
  },
  aircast: {
    mark: 'A',
    ground: '#0a2766',
    hue: '#4b7bdf',
    accent: { dark: '#7eafff', light: '#2c5bc2' },
    year: '2025',
    status: 'Global Nominee · Top 1,219 of 11,500+',
    prefix: 'NASA Space Apps 2025',
    context: 'Two-person team · Oct 2025',
    highlight: { text: 'Global Nominee', tone: 'award' },
    standing: 'Top 1,219 of 11,500+ teams worldwide',
    pitch: 'Air quality from space to street: satellite, ground sensors and weather on one map, with safety advice per group.',
    band: ['NASA Space Apps Global Nominee', 'Top 1,219 of 11,500+ teams', 'Satellite, ground and weather on one map'],
    cover: {
      type: 'badge',
      src: '/work/aircast-nominee.webp',
      alt: 'NASA Space Apps Challenge 2025 Global Nominee badge',
    },
    stats: [
      { value: '1,219', label: 'teams named Global Nominees, of 11,500+' },
      { value: '3', label: 'data sources fused: satellite, ground, weather' },
      { value: '27 h', label: 'of commits, start to final push' },
    ],
    steps: [
      { label: 'Locate', text: 'Your location sets the point every request uses.' },
      { label: 'Ground', text: 'OpenAQ stations within 25 km; PM2.5 is converted to an AQI with the EPA’s breakpoints.' },
      { label: 'Satellite', text: 'The nearest pixel of NASA TEMPO’s NO₂ data, read from a NetCDF file on Azure.' },
      { label: 'Weather', text: 'OpenWeather: conditions now and the next eight 3-hour slots.' },
      { label: 'Forecast', text: 'Readable rules move the AQI step by step, and each step says why.' },
      { label: 'Safety', text: 'Five groups, from children to athletes, each with its own thresholds and best window.' },
      { label: 'AI brief', text: 'GPT-4o-mini writes a plain-English brief from those readings and nothing else.' },
    ],
    role: 'My part: the AI brief and chat, the per-group safety engine, the satellite data on Azure, and the deploy (19 of the 27 hackathon commits).',
    links: [{ href: 'https://github.com/aahilafraz123/aircast-nasa-hackathon', label: 'Source' }],
  },

  'bis-report-card': {
    mark: 'B',
    ground: '#4a1420',
    hue: '#cc4f69',
    accent: { dark: '#ff859a', light: '#ad274c' },
    year: '2026',
    status: 'Built · 282 tests',
    context: 'Sole developer · Jul to Oct 2026',
    highlight: { text: 'Built · rollout with the school in talks', tone: 'built' },
    pitch: 'Report cards that run inside the school: one server on its own network, no cloud, CBSE-format PDFs.',
    band: ['Built for a school', '282 automated tests', 'CBSE-format report cards'],
    cover: {
      type: 'shot',
      src: '/work/bis-report-print.webp',
      alt: 'A CBSE-format progress report in the BIS print preview, approved and locked',
      width: 1368,
      height: 797,
    },
    stats: [
      { value: '282', label: 'automated tests, green in CI' },
      { value: '31', label: 'Prisma models, 15 migrations' },
      { value: '118', label: 'API route handlers' },
    ],
    steps: [
      { label: 'Marks', text: 'Subject teachers type or paste marks into a grid, class by class.' },
      { label: 'Consolidate', text: 'The class teacher adds co-scholastic grades, attendance and a remark, then submits.' },
      { label: 'Approve', text: 'The division head approves and locks the section; the draft watermark comes off.' },
      { label: 'Print', text: 'The section prints as one PDF, a CBSE-format card for every student.' },
      { label: 'Templates', text: 'Every card format comes from one template engine the school can edit.' },
      { label: 'On site', text: 'It runs on one server inside the school, on its own network, with encrypted backups.' },
    ],
    links: [],
    privateNote: 'Private repository',
  },

  'learnflow-ai': {
    mark: 'L',
    ground: '#082e24',
    hue: '#009777',
    accent: { dark: '#4bcaa6', light: '#007a59' },
    year: '2025–26',
    status: 'Beta · 150+ testers on v1',
    context: 'Co-founder · Jun 2025 to now',
    highlight: { text: 'Beta · 150+ testers on v1', tone: 'built' },
    pitch: 'A student planner that sets itself up: paste a Canvas calendar link and your classes and deadlines appear.',
    band: ['Co-founder', '150+ beta testers on v1', 'One link sets up the semester'],
    cover: {
      type: 'shot',
      src: '/work/learnflow-site.webp',
      alt: 'The LearnFlow website',
      width: 1200,
      height: 750,
      caption: 'learnflow-ai.app',
    },
    stats: [
      { value: '150+', label: 'beta testers on v1' },
      { value: '5,573', label: 'lines in the rebuild, from 64,066 in v1' },
      { value: '5', label: 'assignment types, sorted on import' },
    ],
    steps: [
      { label: 'Paste', text: 'Paste your Canvas calendar link.' },
      { label: 'Courses', text: 'Each item’s course tag is split into a course code, section and term.' },
      { label: 'Link', text: 'Link each course to a class you already have, or create a new one.' },
      { label: 'Import', text: 'Events and assignments come in, typed as exam, project, reading, milestone or homework.' },
      { label: 'Syllabus', text: 'Upload the syllabus PDF; GPT-4o reads it into structured data you review.' },
      { label: 'Apply', text: 'A whole term of lectures fills in, plus the assignments Canvas didn’t list.' },
      { label: 'Re-sync', text: 'Sync again any time without losing your edits.' },
    ],
    links: [{ href: 'https://learnflow-ai.app/', label: 'Live site' }],
  },

  'chronos-ai': {
    mark: 'C',
    ground: '#33240f',
    hue: '#a5762e',
    accent: { dark: '#dba65c', light: '#895700' },
    year: '2026',
    status: 'In progress',
    context: 'Solo · Oct 2026 to now',
    highlight: { text: 'In progress · engine built', tone: 'progress' },
    pitch: 'A wake detector for one person: the iPhone reports its signals, a server decides whether I’m really up.',
    band: ['iOS + server', '636 API tests', 'Knows if you’re really up'],
    cover: {
      type: 'phone',
      src: '/work/chronos-settings.webp',
      alt: 'Chronos on iPhone: the wake windows and the confirm and strong score thresholds',
    },
    stats: [
      { value: '636', label: 'API tests passing' },
      { value: '11', label: 'golden test mornings' },
    ],
    steps: [
      { label: 'Window', text: 'At the start of the wake window the server starts watching the morning.' },
      { label: 'Wake', text: 'iOS gives apps no unlock event, so every five minutes the server wakes the phone with a silent push.' },
      { label: 'Score', text: 'The phone reports its signals; an explainable, versioned engine scores them.' },
      { label: 'Confirm', text: 'Past the confirm threshold, the morning is marked: you’re up.' },
      { label: 'Fallback', text: 'If the window closes first, the day falls back instead.' },
      { label: 'Reel', text: 'The morning reel it triggers.', planned: true },
    ],
    links: [],
    privateNote: 'Private repository',
  },

  'typist-ml': {
    mark: 'T',
    ground: '#1b222e',
    hue: '#6981ab',
    accent: { dark: '#97b2e1', light: '#4a638f' },
    year: '2026',
    status: 'Complete',
    context: 'Sole researcher and engineer · Sep 2026 to now',
    highlight: { text: 'Complete · 14-session pilot run', tone: 'built' },
    pitch: 'A typing coach built as a fair experiment: four ways to drill your weakest letter pairs, tested against plain practice.',
    band: ['A controlled experiment', 'Errors fell 16.8% to 5.4%', '25,022 keystrokes'],
    cover: {
      type: 'shot',
      src: '/work/typist-session.webp',
      alt: 'The Typist-ML typing surface mid-warm-up: the passage dimming ahead of the caret, errors held until corrected',
      width: 2720,
      height: 1280,
    },
    stats: [
      { value: '652', label: 'automated tests, pytest and Vitest' },
      { value: '25,022', label: 'keystrokes in the pilot' },
      { value: '16.8→5.4%', label: 'error rate across the two sets' },
    ],
    steps: [
      { label: 'Capture', text: 'Every keystroke is recorded with its timing.' },
      { label: 'Rank', text: 'Letter pairs are ranked by errors, with one strict rule for what counts as a mistake.' },
      { label: 'Drill', text: 'Three generators drill the weakest pairs, one of them an on-device language model; plain practice is the control.' },
      { label: 'Gate', text: 'A fairness gate checks every method gets the same exposure.' },
      { label: 'Schedule', text: 'Sessions run blinded: a baseline, ten practice days, then a retest.' },
      { label: 'Analyse', text: 'An analysis plan committed before any results compares the methods.' },
    ],
    links: [{ href: 'https://github.com/allenvarghese05/typist-ml', label: 'Source' }],
  },

  'automix-ai': {
    mark: 'A',
    ground: '#2a1712',
    hue: '#ac6e5d',
    accent: { dark: '#e39d8a', light: '#904f3d' },
    year: '2026',
    status: 'In progress',
    context: 'Solo · Apr 2026 to now',
    highlight: { text: 'In progress · tested in simulation', tone: 'progress' },
    pitch: 'A real-time engine that mixes live microphones and catches acoustic feedback before it howls.',
    band: ['Real-time audio', 'Catches feedback before it howls', '38 tests, closed loop'],
    cover: { type: 'spectrum', title: 'A ring caught and notched' },
    stats: [
      { value: '38', label: 'test cases: DSP, detector, closed loop' },
      { value: '3 Hz', label: 'ring frequency accuracy, tested' },
    ],
    steps: [
      { label: 'Input', text: 'Each mic is trimmed, clipped and high-passed at 80 Hz, in 10.7 ms blocks.' },
      { label: 'Dynamics', text: 'A noise gate and a compressor even out the talker.' },
      { label: 'Detect', text: 'A ring is a lone, inharmonic peak that keeps growing; voices and sung notes are rejected.' },
      { label: 'Notch', text: 'A narrow notch cuts exactly that frequency, deepening each time the ring returns.' },
      { label: 'Guard', text: 'If the notch isn’t enough, the mic is ducked by 6 dB.' },
      { label: 'Automix', text: 'Gain is shared between mics, so more open mics never means more howl.' },
    ],
    links: [{ href: 'https://github.com/allenvarghese05/AutoMixAI', label: 'Source' }],
  },

  'jam-duel': {
    mark: 'J',
    ground: '#13281c',
    hue: '#4c916a',
    accent: { dark: '#7ac499', light: '#23744b' },
    year: '2025',
    status: 'Class project',
    context: 'Team of three · Drexel INFO310 · Aug 2025',
    highlight: { text: 'Class project', tone: 'side' },
    pitch: 'Head-to-head song battles with a daily vote budget and GPT-4 recommendations from your favourites.',
    band: ['Song battles', '10 votes a day', 'GPT-4 recommendations'],
    stats: [],
    steps: [
      { label: 'Sign up', text: 'Every new account starts the day with 10 votes.' },
      { label: 'Favourites', text: 'Save your ten favourite songs from Spotify search.' },
      { label: 'Battle', text: 'Two songs face off, with their videos to listen first.' },
      { label: 'Vote', text: 'Stack 1 to 10 votes on one side; the server checks every rule.' },
      { label: 'Recommend', text: 'GPT-4 turns your favourites into four lanes of recommendations.' },
    ],
    links: [{ href: 'https://github.com/allenvarghese05/JamDuel', label: 'Source' }],
  },

  'college-matcher': {
    mark: 'C',
    ground: '#18213a',
    hue: '#5f7ccc',
    accent: { dark: '#8cadff', light: '#405cb2' },
    year: '2025',
    status: 'Personal project',
    context: 'Solo · Aug 2025',
    highlight: { text: 'Personal project', tone: 'side' },
    pitch: 'Explainable college matching: a 100-point score you can read part by part, and a voice counselor.',
    band: ['Explainable matching', 'A 100-point score', 'Voice counselor'],
    stats: [],
    steps: [
      { label: 'Assess', text: 'A form, or the voice counselor, collects grades, major, budget and preferences.' },
      { label: 'Academics', text: 'Up to 50 points: program strength and the chance of getting in.' },
      { label: 'Money', text: 'Up to 20: points step down as tuition passes the budget.' },
      { label: 'Fit', text: 'Up to 30 for personality, place and activities.' },
      { label: 'Reality', text: 'Caps for schools that aren’t realistic, then a list balanced across safeties, targets and reaches.' },
    ],
    links: [{ href: 'https://github.com/allenvarghese05/college-matcher', label: 'Source' }],
  },

  streetspot: {
    mark: 'S',
    ground: '#1f2a14',
    hue: '#6a8d45',
    accent: { dark: '#99c072', light: '#4b701d' },
    year: '2025',
    status: 'Prototype',
    context: 'Solo · Jul 2025',
    highlight: { text: 'Prototype', tone: 'side' },
    pitch: 'Crowdsourced street parking: report an open spot, see spots within 1 km, claim one, earn points.',
    band: ['Crowdsourced parking', 'Spots within 1 km', 'Live updates between phones'],
    stats: [],
    steps: [
      { label: 'Locate', text: 'A GPS fix drops the pin where you’re standing.' },
      { label: 'Report', text: 'Describe the spot and see the points you’ll earn before you send it.' },
      { label: 'Share', text: 'Socket.IO broadcasts it to every phone, or it’s cached on yours if offline.' },
      { label: 'Nearby', text: 'The map counts open spots within 1 km.' },
      { label: 'Claim', text: 'Tap a pin and claim it.' },
    ],
    links: [{ href: 'https://github.com/allenvarghese05/streetspot-app', label: 'Source' }],
  },
};
