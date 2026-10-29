/**
 * The story of each project, told as a short case study:
 *   Problem → What I built → How it works → (Key decisions, in projects.js)
 *   → What's next.
 * Written from each project's own README / write-up — the problem statements
 * lead with the idea behind the app. Facts, stack and metrics stay in
 * projects.js; this file is the narrative + how the project is shown.
 *
 * `media` drives the hero image:
 *   frame: 'browser' | 'phone' | 'private'
 *   url:   the address shown in the browser frame
 *   shots: real screenshots ('/projects/<id>/01.jpg' …) — empty = designed
 *          placeholder. Drop images in /public/projects/<id>/ and list them.
 * `live`: a public URL for the "Visit live" button (null = hidden).
 */
export const CASE_STUDIES = {
  iet: {
    media: { frame: 'private', shots: [] },
    live: null,
    problem:
      'A national church organisation in India ran church construction on paper — applications, sign-offs from HQ, the President and Finance, three rounds of fund releases and years of reports — with no single view of where any project stood.',
    built:
      'A platform that carries a church-building project from first application to three years after completion: a 9-page offline-capable form, one workflow engine through HQ review, the President’s approval and three Finance-released construction phases, five-scope analytics, in-app notifications, and a Super Admin console that changes the rules without a deploy.',
    how: [
      'One workflow engine — 14 actions over a 21-value status enum — runs every application from HQ review to completion; each action is a compare-and-set inside a single transaction, with a history row and an audit row.',
      'The President’s approved amount caps every release — race-tested so two clicks can never pay out twice.',
      'Mission Control generates its settings screens from the zod schema; each application freezes the rules it was submitted under.',
      'Analytics went from 31.4 s to 1.28 s on the same connection (147 s → 2.8 s on the transaction pooler) by collapsing ~100 sequential queries into one concurrent wave — with 110/110 responses unchanged.',
    ],
    next: [],
  },

  'learnflow-ai': {
    media: { frame: 'browser', url: 'learnflow-ai.app', shots: [] },
    live: 'https://learnflow-ai.app/',
    liveLabel: 'View demo',
    problem:
      'A student’s day is scattered across Canvas, lecture recordings, slides, notes and a dozen tabs — and every time something doesn’t make sense, getting help means leaving what you’re doing.',
    built:
      'A desktop learning companion that pulls assignments from Canvas, transcribes lectures live, and explains anything on screen — a highlight or a screenshot — without switching apps.',
    how: [
      'Canvas syncs over OAuth2; assignments are broken into actionable steps.',
      'A system-wide highlighter and screenshot tool feed Google Cloud Vision OCR → GPT-4o-mini, returning an explanation in under two seconds.',
      'Lectures are captured twice: the Web Speech API for live captions, and system-audio loopback sent to Whisper.',
      'A thin Express proxy on Railway fronts OpenAI and Supabase (PostgreSQL).',
    ],
    next: ['Public launch — currently pre-launch, distributed through GitHub Releases.'],
  },

  aircast: {
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
  },

  'college-matcher': {
    media: { frame: 'browser', url: 'college-matcher', shots: [] },
    live: null,
    problem:
      'Choosing a college is one of the biggest decisions a student makes, yet most get generic ranked lists and little one-on-one guidance — search tools filter on stats, not on who you are.',
    built:
      'A web platform that gets to know a student — through an assessment they can type or simply talk through with an AI voice counselor — and matches them to colleges and career paths with a percentage fit.',
    how: [
      'The voice counselor transcribes speech live with the Web Speech API and keeps the conversation contextual with OpenAI; sessions pause and resume.',
      'A matching engine weighs five factors — academics, interests, career goals, location and finances — into ranked schools.',
      'Results pair each school with career paths, including salary and growth data.',
      'A filterable school browser and one light/dark design system tie it together (React 18 + Express).',
    ],
    next: [
      'Accounts so students can save and revisit their matches (JWT authentication is planned).',
      'Deployment — the frontend targets Vercel and the API targets Railway.',
    ],
  },

  'jam-duel': {
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
  },

  streetspot: {
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
  },
};

export const caseStudyFor = (id) => CASE_STUDIES[id] || null;
