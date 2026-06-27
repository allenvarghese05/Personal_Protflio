/**
 * Single source of truth for all chapter content. The 3D scenes and the
 * overlays read from here. The story is told in fragments the visitor opens —
 * each is one bold stat + one line, not a paragraph.
 *
 * Chapter order is RECRUITER-FIRST, not chronological:
 *   1 · Launch / name card
 *   2 · Engineering Station — work experience (the IET system is the headline)
 *   3 · Origins — high school (backstory, earned later in the journey)
 */

export const identity = {
  name: 'Allen Shaji Varghese',
  kicker: 'SOFTWARE ENGINEERING · DREXEL · CLASS OF 2027',
  badge: 'NASA Space Apps — Global Nominee · Top 9% of 11,350+',
  tagline:
    'Building products that solve real problems through AI and technology.',
  links: {
    email: 'allenvarghese05@gmail.com',
    linkedin: 'https://www.linkedin.com/in/allen-shaji-varghese/',
    github: 'https://github.com/allenvarghese05',
  },
};

export const chapters = [
  {
    id: 'engineering',
    index: 2,
    kicker: 'CHAPTER 02 · ENGINEERING',
    title: 'Things I’ve shipped',
    subtitle: 'Work experience · 2023 — present',
    hint: 'Hover a module · click to open',
    // Interactive "module" nodes docked around the orbital station.
    memories: [
      {
        id: 'iet',
        signature: true,
        label: 'Church Building Application System',
        eyebrow: 'SIGNATURE BUILD · SOLE ENGINEER',
        role: 'Software Solutions Architect · Indian Evangelical Team',
        period: 'Dec 2025 – Mar 2026 · Hybrid, Delhi',
        tags: ['Architecture', 'Security', 'GIS', 'Full-stack'],
        tech: ['Next.js 14', 'TypeScript', 'Prisma', 'Supabase', 'PostgreSQL'],
        stat: '18',
        statLabel: 'application lifecycle statuses, designed end-to-end',
        story:
          'Sole engineer on an enterprise platform: a 10-page dynamic application moving through a 5-tier approval chain, with GPS-based 8km bylaw enforcement (Haversine), RBAC on every route, OTP auth, and 3-phase construction tracking — system design through production.',
        arc: 0.95,
        metrics: [
          { label: 'Lifecycle statuses', display: '18', v: 1.0 },
          { label: 'Postgres tables', display: '15+', v: 0.8 },
          { label: 'User roles', display: '6', v: 0.55 },
          { label: 'Tasks owned', display: '80+', v: 0.92 },
        ],
        pos: [4, 3.6, -22.5], // front-center, closest to camera
        size: 1.5,
      },
      {
        id: 'overflow',
        current: true,
        label: 'Overflow',
        eyebrow: 'CURRENT ROLE',
        role: 'Software Engineer Intern',
        period: 'Mar 2026 – Present',
        tags: ['Next.js', 'Full-stack', 'Internal tooling'],
        stat: '$30M+',
        statLabel: 'funded startup · 150 people',
        story:
          'Building internal tooling end-to-end in Next.js at a venture-backed startup — owning features from spec to ship.',
        arc: 0.82,
        highlights: [
          'End-to-end feature ownership',
          'Full-stack — Next.js',
          '150-person, $30M+ funded startup',
        ],
        pos: [1.6, 6.0, -26], // upper-left of the ring
        size: 1.15,
      },
      {
        id: 'racing',
        label: 'Drexel Electric Racing',
        eyebrow: 'CREATIVE · ENGINEERING',
        role: 'Creative Content Manager',
        period: 'Oct 2023 – Sep 2025',
        tags: ['Photography', 'Video', 'Web'],
        stat: '2 yrs',
        statLabel: 'capturing a student race team',
        story:
          'Professional photo & video shoots and site upkeep for Drexel’s electric racing team — the creative thread, applied to engineering.',
        arc: 0.6,
        highlights: [
          'Professional video production',
          'Team photography',
          'Website maintenance',
        ],
        pos: [6.6, 5.8, -26.5], // upper-right of the ring
        size: 1.05,
      },
      {
        id: 'soundtech',
        label: 'Sound Technician',
        eyebrow: 'LIVE PRODUCTION',
        role: 'Sound Technician · Drexel University',
        period: 'Jan 2024 – Feb 2026',
        tags: ['Live sound', 'Lighting', 'Streaming'],
        stat: 'Live',
        statLabel: 'sound, lights & streaming for campus events',
        story:
          'Ran sound, lighting, and live streaming for campus events — the hands-on AV craft that later inspired AutoMix AI.',
        arc: 0.62,
        highlights: [
          'Live sound engineering',
          'Lighting & stage',
          'Event live-streaming',
        ],
        pos: [1.4, 2.4, -26], // lower-left of the ring
        size: 1.0,
      },
      {
        id: 'treeoflife',
        label: 'Tree of Life',
        eyebrow: 'PRODUCTION INTERN',
        role: 'Live Sound Engineer / Production Intern',
        period: 'Jun – Jul 2024 · Texas',
        tags: ['Live sound', 'Software', 'Film'],
        stat: 'MX',
        statLabel: 'filmed a promo on location in Mexico',
        story:
          'Creative arts team — live sound, fixed bugs in the church app, and filmed a promotional video on location in Mexico.',
        arc: 0.5,
        highlights: [
          'Live sound for services',
          'Church app bug fixes',
          'Promo film in Mexico',
        ],
        pos: [6.6, 2.3, -26.5], // lower-right of the ring
        size: 1.0,
      },
    ],
  },
  {
    id: 'origins',
    index: 3,
    kicker: 'CHAPTER 03 · ORIGINS',
    title: 'Where it started',
    subtitle: 'Kodaikanal International School · 2023',
    hint: 'Hover a fragment · click to open',
    // Interactive memory nodes floating in the asteroid field
    memories: [
      {
        id: 'wildlife',
        label: 'Wildlife Matters',
        eyebrow: 'NGO · FOUNDER',
        role: 'Founder & Lead',
        period: 'Aug 2020 – Sep 2023 · Bhopal, India',
        tags: ['Conservation', 'Non-profit', 'Brand & Ops', 'Gov. recognition'],
        stat: '$11,000',
        statLabel: 'raised for conservation',
        story:
          'At 16, I founded a wildlife-conservation NGO — recognized by the Chief Minister of Madhya Pradesh.',
        arc: 0.92,
        metrics: [
          { label: 'Raised', display: '$11,000', v: 1.0 },
          { label: 'Forest rangers', display: '500+', v: 0.82 },
          { label: 'Reserves', display: '12', v: 0.5 },
        ],
        pos: [-4.5, 6.8, -48],
        size: 1.4,
      },
      {
        id: 'captain',
        label: 'Captain',
        eyebrow: 'LEADERSHIP',
        role: 'A-Team Captain',
        period: 'Kodaikanal International School',
        tags: ['Basketball', 'Team leadership', 'NHS'],
        stat: 'A-Team',
        statLabel: 'Varsity Basketball captain',
        story:
          'Made varsity as a freshman, then led the team — and carried it off the court too.',
        arc: 0.78,
        highlights: [
          'Made varsity as a freshman',
          'A-Team Captain',
          'National Honor Society',
        ],
        pos: [4.6, 7.2, -50],
        size: 1.2,
      },
      {
        id: 'lens',
        label: 'Behind the lens',
        eyebrow: 'THE CREATIVE SPARK',
        role: 'President & Director',
        period: 'Kodaikanal International School',
        tags: ['Photography', 'AV / Lighting', 'Live production'],
        stat: 'Director',
        statLabel: 'Photography & AV Lighting',
        story:
          'Where the creative thread began — light, image, and the stage. It never left.',
        arc: 0.62,
        highlights: [
          'Photography Club President',
          'AV Lighting Director',
          'The engineer–artist begins',
        ],
        pos: [-3.6, 3.8, -51.5],
        size: 1.15,
      },
      {
        id: 'summit',
        label: 'First venture',
        eyebrow: 'OPERATIONS',
        role: 'Director of Operations',
        period: 'Aug 2022 – Feb 2023',
        tags: ['Entrepreneurship', 'Events', 'Operations'],
        stat: '100+',
        statLabel: 'founders mobilised',
        story:
          'Director of Operations for the KIS Young Entrepreneurs Summit.',
        arc: 0.72,
        metrics: [
          { label: 'Founders', display: '100+', v: 0.9 },
          { label: 'Schools', display: '15+', v: 0.55 },
        ],
        pos: [3.6, 4.4, -53],
        size: 1.25,
      },
    ],
  },
  // 4–7 land here as each chapter is built
];
