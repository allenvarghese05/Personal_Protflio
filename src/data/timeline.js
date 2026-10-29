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
  // the credential line under the name — landing hero + Meet Me share it
  credential: 'Software Engineer — Drexel University ’27',
  badge: 'NASA Space Apps 2025 — Global Nominee · top 1,219 of 11,500+ teams',
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
        eyebrow: 'CLIENT SYSTEM · SOLE ENGINEER',
        role: 'Software Solutions Architect · Indian Evangelical Team',
        period: 'Jan 2026 – Present · Remote, India',
        tags: ['Architecture', 'Security', 'Performance', 'Full-stack'],
        tech: ['Next.js 16', 'React 19', 'TypeScript', 'Prisma', 'PostgreSQL'],
        // Hierarchy: primary = the calls that defined the build, the rest support.
        techStack: [
          { name: 'Next.js 16', primary: true },
          { name: 'TypeScript', primary: true },
          { name: 'PostgreSQL', primary: true },
          { name: 'Prisma 6', primary: true },
          { name: 'Supabase' },
          { name: 'Zod 4' },
          { name: 'Service Worker' },
          { name: 'ExcelJS' },
          { name: 'GitHub Actions' },
          { name: 'Semgrep' },
        ],
        keyDecisions: [
          {
            title: 'One transaction per action',
            detail:
              'Every workflow action is a compare-and-set inside one transaction — two clicks can never release money twice.',
          },
          {
            title: 'Rules frozen per application',
            detail:
              'Super Admins change the rules live; each application keeps the ones it was submitted under.',
          },
          {
            title: 'Measure, then batch',
            detail:
              'About a hundred sequential queries became one concurrent wave — the heaviest report went from 146.7 s to 2.85 s on the same connection, and to 1.28 s on the session pooler.',
          },
        ],
        stat: '21',
        statLabel: 'workflow statuses, one engine, every move audited',
        story:
          'Sole engineer on a client platform: a 9-page offline-capable application moving through HQ review, the President’s approval and three Finance-released phases, a schema-driven Super Admin console, and a security and performance pass — 38 pull requests, production-ready.',
        arc: 0.95,
        metrics: [
          { label: 'Workflow statuses', display: '21', v: 1.0 },
          { label: 'Prisma models', display: '18', v: 0.86 },
          { label: 'User roles', display: '6', v: 0.55 },
          { label: 'Merged PRs', display: '38', v: 0.92 },
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
        techStack: [
          { name: 'Next.js', primary: true },
          { name: 'React', primary: true },
          { name: 'TypeScript', primary: true },
          { name: 'Node.js' },
          { name: 'REST APIs' },
          { name: 'Internal tooling' },
        ],
        keyDecisions: [
          {
            title: 'Own the slice end to end',
            detail:
              'Spec → build → ship in one pair of hands — fewer handoffs, tighter feedback loops at startup pace.',
          },
          {
            title: 'Purpose-built over off-the-shelf',
            detail:
              'Internal tools beat generic SaaS for the edge cases a 150-person team actually hits daily.',
          },
          {
            title: 'Ship small, ship often',
            detail:
              'Incremental delivery keeps each change reviewable and reversible instead of big-bang releases.',
          },
        ],
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
        techStack: [
          { name: 'Photography', primary: true },
          { name: 'Video', primary: true },
          { name: 'Web', primary: true },
          { name: 'Lightroom' },
          { name: 'Premiere' },
          { name: 'CMS' },
        ],
        keyDecisions: [
          {
            title: 'One look across two years',
            detail:
              'A consistent grade and framing so a season of shoots reads as a single brand, not a folder of photos.',
          },
          {
            title: 'Web-first delivery',
            detail:
              'Assets shipped to the site where sponsors and recruits actually saw them, not just a drive.',
          },
          {
            title: 'Capture for reuse',
            detail:
              'Shot wide and long so one session feeds stills, reels, and the website at once.',
          },
        ],
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
        techStack: [
          { name: 'Live sound', primary: true },
          { name: 'Lighting', primary: true },
          { name: 'Streaming', primary: true },
          { name: 'Mixing' },
          { name: 'Signal flow' },
        ],
        keyDecisions: [
          {
            title: 'Gain-stage before the show',
            detail:
              'Set clean levels up front so a live mix has headroom instead of fighting feedback mid-event.',
          },
          {
            title: 'Redundant signal paths',
            detail:
              'A backup feed on critical channels — live has no second take, so failure can’t be single-point.',
          },
          {
            title: 'Stream as a first-class output',
            detail:
              'Mixed for the room and the broadcast separately so the online audience wasn’t an afterthought.',
          },
        ],
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
        techStack: [
          { name: 'Live sound', primary: true },
          { name: 'Film', primary: true },
          { name: 'Bug fixing', primary: true },
          { name: 'Church app' },
          { name: 'Production' },
        ],
        keyDecisions: [
          {
            title: 'Fix the app where it hurt',
            detail:
              'Triaged the church app to the bugs users hit most, not the longest backlog ticket.',
          },
          {
            title: 'Shoot on location',
            detail:
              'Filmed the promo in Mexico for real texture a studio set-up couldn’t fake.',
          },
          {
            title: 'Serve the service first',
            detail:
              'Live sound choices favoured reliability for the congregation over engineer-pleasing complexity.',
          },
        ],
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
