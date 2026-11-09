import { identity } from '@/data/timeline';

/**
 * The Observatory (about): its story, the Experience list that /projects
 * shares, skills, and Comms (contact). Everything here is drawn from facts
 * already on the site: the project write-ups, identity, and what Allen
 * confirmed.
 */

export const ABOUT = {
  headline: 'I build products end to end, from the schema to the last pixel.',
};

/**
 * The About room's story, in chapters whose titles read as one paragraph:
 * Drexel, building, building for home, Overflow, now, next. Chapters 01–03
 * run beside the helmet; 04 onward are full width. Every figure is a string
 * as it should read ("3,000+", "1.28 s"); the counter animates its digits
 * and leaves the rest as written. Facts only from the projects and roles on
 * the site.
 */
export const STORY = {
  // one paragraph, three tones: ink, muted, ink
  lead: [
    { tone: 'ink', text: 'I’m Allen, from Bhopal, India.' },
    { tone: 'muted', text: 'I\u00a0came to Philadelphia in 2023 to study software engineering at Drexel.' },
    { tone: 'ink', text: 'Since then, I’ve shipped production code at Overflow and built a grant system that now runs across India.' },
  ],
  chapters: [
    {
      n: '01',
      meta: ['Drexel', '2023'],
      title: 'At Drexel, I started behind a camera and a soundboard.',
      body: 'I ran photo, video and the website for Drexel Electric Racing, and worked live sound, lighting and streaming for campus events. My photography, film work and sound are in the Studio.',
      ledger: [
        { role: 'Creative Content Manager', org: 'Drexel Electric Racing', dates: 'Oct 2023 – Sep 2025' },
        { role: 'Sound Technician', org: 'Drexel University', dates: 'Jan 2024 – Feb 2026' },
      ],
      links: [{ zone: 'studio', label: 'Open the Studio' }],
    },
    {
      n: '02',
      meta: ['Building', '2025'],
      title: 'Then I began building products.',
      body: 'I co-founded LearnFlow AI with Aahil Afraz. Our first version, an AI study companion, reached 150+ beta testers. In 2026, I rebuilt it as a web planner that sets up a student’s semester from one Canvas link; it’s in beta now. At NASA Space Apps 2025, the two of us built AirCast, an air-quality tool that combines NASA’s TEMPO satellite data with ground stations and weather. It was named a Global Nominee.',
      proofs: [
        { value: '150+', label: 'beta testers on LearnFlow’s first version' },
        { value: '1,219', label: 'Global Nominees out of 11,500+ teams, including AirCast' },
      ],
      ledger: [{ role: 'Co-founder', org: 'LearnFlow AI', dates: 'Jun 2025 – present' }],
      links: [
        { project: 'learnflow-ai', label: 'LearnFlow AI case study' },
        { project: 'aircast', label: 'AirCast case study' },
      ],
    },
    {
      n: '03',
      meta: ['For home', '2026'],
      title: 'And then I built for home.',
      body: 'I’m the sole engineer on the Church Building Application System for the Indian Evangelical Team. It replaced a paper process for funding church construction across India and has been in production since October 2026. For a school in Madhya Pradesh, my home state, I built a self-hosted report card system with 282 automated tests.',
      proofs: [
        { value: '3,000+', label: 'pastors in the network it serves' },
        { value: '1.28 s', label: 'all-time analytics, down from 31.4\u00a0s' },
      ],
      ledger: [
        { role: 'Software Solutions Architect', org: 'Indian Evangelical Team', dates: 'Jan 2026 – present' },
        { role: 'Sole developer', org: 'Beersheba International School', dates: 'Jul – Oct 2026' },
      ],
      links: [
        { project: 'iet', label: 'Church Building case study' },
        { project: 'bis-report-card', label: 'BIS Report Card case study' },
      ],
    },
  ],
  // 04: the head over the Overflow write-up; its meta line is built from
  // EXPERIENCE (org, dates) and its figures are EXPERIENCE's stats
  overflow: {
    n: '04',
    title: 'Meanwhile, I spent my co-op shipping at Overflow. They asked me back.',
    band: 'The platform I worked on',
  },
  now: {
    n: '05',
    meta: ['Now', 'Oct – Nov 2026'],
    title: 'Lately, I’ve been making AI show its work.',
    body: 'Telltale is my solo build for the Meta Global AI Developer Hackathon 2026. Meta’s AI investigates a vehicle crash from dashcam video and logs, and a plain Python checker recomputes every number and the verdict.',
    proofs: [
      { value: '151', label: 'live AI investigations, each checked by code' },
      { value: '0', label: 'wrong verdicts got past the checker (2 caught)' },
    ],
    links: [{ project: 'telltale', label: 'Telltale case study' }],
  },
  // its line is CONTACT's availability and location (see ObservatoryPanel)
  next: {
    n: '06',
    meta: ['Contact'],
    title: 'Next, I want to build with your team.',
  },
};

/**
 * Experience, newest first. Shown on /projects and in the Observatory.
 * `project` links the role to its case study; `kind: 'other'` rows are the
 * non-engineering jobs, shown smaller under the engineering ones.
 */
export const EXPERIENCE = [
  {
    org: 'Overflow',
    featured: true,
    // what Overflow is, in one line, for anyone who hasn't heard of it
    about: 'A giving platform for churches, ministries and nonprofits, taking card, bank, stock, crypto and donor-advised-fund gifts.',
    // public, from Overflow's own announcements: a $10M Series A (2021) and a
    // $20M Series B (Feb 2024, led by Wesleyan Investment Foundation with
    // Uncork, R7 and The GP). No valuation has been disclosed, so none is given.
    funding: 'Venture-backed, with $30M+ raised, including a $20M Series B in 2024.',
    url: 'https://www.overflow.co',
    // Overflow's own logo (from overflow.co), unmodified
    logo: '/work/overflow-logo.svg',
    role: 'Software Engineering Co-op',
    dates: 'Mar – Sep 2026',
    place: 'Philadelphia, PA · Remote',
    returnOffer: true,
    // Overflow's red-orange (#ff4512) at the lightness every project colour
    // uses (see src/data/showcase.js): the ground, and the accent on dark/light
    colors: { ground: '#471105', accent: { dark: '#f89178', light: '#ab3418' } },
    line: 'Fintech for nonprofits: the move to an AI support chatbot, the stock-gift pipeline, and 100+ commits in a React, Node.js and MongoDB monorepo.',
    stats: [
      { value: '1,000+', label: 'nonprofits' },
      { value: '240,000+', label: 'donors' },
      { value: '$100M+', label: 'in donations a year' },
    ],
    highlights: [
      {
        title: 'AI support migration',
        text: 'I was the sole engineer on the move from Zendesk to Pylon’s AI chatbot across 4 surfaces, wiring 25+ knowledge-base documents into each pipeline.',
      },
      {
        title: 'Stock gift pipeline',
        text: 'It handles 9 brokerage data formats. I tracked down a donor-creation bug that was breaking downstream stock transfers and rebuilt that step, added support for stock gifts with more than one holding, wrote data migrations to correct stale legacy records, and designed an audit trail for gift corrections.',
      },
      {
        title: 'Shipping in production',
        text: '100+ commits across 50+ tickets, including 3 gift-correction features announced company-wide, 8 internal admin pages refactored for faster loads and better UX, and 10+ production bugs found proactively.',
      },
    ],
    tags: ['React', 'Node.js', 'MongoDB', 'Monorepo'],
    // Sachin's LinkedIn recommendation, word for word, credited as LinkedIn shows it
    testimonial: {
      quote:
        'Allen’s curiosity, initiative, and hunger are incredibly rare this early in a career. His capacity to self start projects and unblock himself while being a new intern at our team blew me away. He is a great listener and is always asking for feedback which made coaching him a joy. He has a really bright career ahead of him!',
      name: 'Sachin Kanetkar',
      title: 'Engineering @ Overflow',
      source: 'LinkedIn recommendation',
      date: 'September 2026',
      url: 'https://www.linkedin.com/in/allen-shaji-varghese/details/recommendations/',
    },
    // From the team demo of the internal tools I built (an internal, recorded
    // meeting): credited by role only, no names, faces or screenshots.
    room: {
      context: 'From the team demo of the internal tools I built',
      quotes: [
        { text: 'He really does ship like crazy.', by: 'Engineering, Overflow' },
        // TODO(allen): her team, e.g. 'Customer Success, Overflow'
        { text: 'I’m going to use your tool right after this meeting [with a customer]! Looking forward to giving it a try!', by: 'Teammate, Overflow' },
      ],
    },
  },
  {
    org: 'Indian Evangelical Team',
    role: 'Software Solutions Architect',
    dates: 'Jan 2026 – present',
    line: 'Sole engineer on the Church Building Application System, live across India since October 2026 for a network of 3,000+ pastors.',
    tags: ['Next.js', 'PostgreSQL', 'Sole engineer'],
    project: 'iet',
  },
  {
    org: 'LearnFlow AI',
    role: 'Co-founder',
    dates: 'Jun 2025 – present',
    line: 'Helped ship the first version to 150+ beta testers, then rebuilt it as a web planner that sets up a student’s semester from one Canvas link.',
    tags: ['React', 'Supabase', 'GPT-4o'],
    project: 'learnflow-ai',
  },
  {
    org: 'Drexel University',
    role: 'Sound Technician',
    dates: 'Jan 2024 – Feb 2026',
    line: 'Live sound, lighting and streaming for campus events.',
    kind: 'other',
  },
  {
    org: 'Drexel Electric Racing',
    role: 'Creative Content Manager',
    dates: 'Oct 2023 – Sep 2025',
    line: 'Photo, video and the website for the student race team.',
    kind: 'other',
  },
];

export const EDUCATION = {
  school: 'Drexel University',
  degree: 'B.S. Software Engineering',
  dates: 'Class of 2027',
  place: 'Philadelphia, PA',
};

// Skills, each backed by the projects that use them.
export const SKILLS = [
  { group: 'Languages', items: ['TypeScript', 'Python', 'JavaScript', 'SQL', 'Swift'], projects: ['iet', 'bis-report-card', 'telltale', 'typist-ml', 'chronos-ai'] },
  { group: 'Frontend & mobile', items: ['React', 'Next.js', 'React Native', 'Expo', 'Tailwind CSS', 'Vite'], projects: ['iet', 'bis-report-card', 'learnflow-ai', 'typist-ml', 'streetspot'] },
  { group: 'Backend & data', items: ['Node.js', 'Express', 'NestJS', 'FastAPI', 'Flask', 'PostgreSQL', 'Prisma', 'Supabase', 'SQLite'], projects: ['iet', 'bis-report-card', 'chronos-ai', 'learnflow-ai', 'aircast'] },
  { group: 'AI & ML', items: ['OpenAI (GPT-4o)', 'Meta AI (Muse, SAM 3.1)', 'On-device LLMs (Llama 3.2, mlx-lm)', 'NumPy', 'SciPy', 'OpenCV'], projects: ['telltale', 'typist-ml', 'learnflow-ai', 'aircast', 'automix-ai'] },
  { group: 'Testing & delivery', items: ['GitHub Actions', 'Docker', 'pytest', 'Vitest', 'Jest', 'Playwright', 'Azure App Service'], projects: ['iet', 'bis-report-card', 'chronos-ai', 'typist-ml', 'aircast'] },
];

export const CONTACT = {
  email: identity.links.email,
  linkedin: identity.links.linkedin,
  github: identity.links.github,
  // one switch for the whole site: see identity.resume in src/data/timeline.js
  resume: identity.resume,
  availability: 'Open to software engineering co-op and internship roles.',
  location: 'Philadelphia, PA',
};
