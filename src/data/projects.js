/**
 * Mission Control content — the Engineering District project briefs.
 *
 * This is the single source of truth the Mission Control UI reads from; there
 * is NO hardcoded per-project JSX. Each project carries its own
 * `architectureGraph` (nodes + edges) which <ArchitectureGraph /> renders.
 *
 * `kind` drives the accent colour / badge: signature | current | project |
 * classified. Node colours come from the shared NODE_COLOR palette.
 */

const C = {
  amber: '#e8a040',
  teal: '#30c0a0',
  blue: '#4090e0',
  purple: '#9060e0',
  grey: '#608090',
};

export const ENGINEERING_PROJECTS = [
  {
    id: 'iet',
    kind: 'signature',
    badge: 'SIGNATURE BUILD · SOLE ENGINEER',
    label: 'Church Building Application System',
    role: 'Software Solutions Architect',
    company: 'Indian Evangelical Team',
    period: 'Dec 2025 – Mar 2026',
    location: 'Hybrid · Delhi',
    context:
      'Sole engineer on an enterprise platform: a 10-page dynamic application moving through a 5-tier approval chain, with GPS-based 8km bylaw enforcement (Haversine), RBAC on every route, OTP auth, and 3-phase construction tracking — system design through production.',
    tags: ['Architecture', 'Security', 'GIS', 'Full-stack'],
    techStack: [
      { name: 'Next.js 14', primary: true },
      { name: 'TypeScript', primary: true },
      { name: 'Supabase', primary: true },
      { name: 'Haversine', primary: true },
      { name: 'Prisma ORM' },
      { name: 'PostgreSQL' },
      { name: 'RBAC' },
      { name: 'OTP Auth' },
      { name: 'GIS' },
      { name: 'REST API' },
    ],
    metrics: [
      { value: '18', label: 'Lifecycle statuses' },
      { value: '15+', label: 'Postgres tables' },
      { value: '6', label: 'User roles' },
      { value: '80+', label: 'Tasks owned' },
    ],
    keyDecisions: [
      {
        title: 'RBAC on every route',
        detail:
          'Not just page-level — route middleware enforces role checks server-side before any data is fetched.',
      },
      {
        title: 'Haversine over PostGIS',
        detail:
          'Lightweight formula sufficient for 8km radius enforcement without standing up a full spatial extension.',
      },
      {
        title: 'Supabase Realtime for approvals',
        detail:
          'No polling — status changes push live to every role tier the moment an approval moves.',
      },
    ],
    architectureGraph: {
      nodes: [
        { id: 'app', label: 'Church Building App', color: C.amber, r: 24, desc: 'The enterprise platform — one system owning the full application lifecycle end to end.' },
        { id: 'auth', label: 'Auth / OTP', color: C.teal, r: 14, desc: 'OTP-based authentication — one-time codes verify every user session.' },
        { id: 'rbac', label: 'RBAC Middleware', color: C.teal, r: 16, desc: 'Route-level middleware enforces role checks server-side before any data loads.' },
        { id: 'gps', label: 'GPS Engine', color: C.blue, r: 14, desc: 'Validates building site coordinates against registered church location.' },
        { id: 'approval', label: 'Approval Chain', color: C.amber, r: 18, desc: '10-page application moves through 5 tiers before reaching Finance.' },
        { id: 'realtime', label: 'Supabase Realtime', color: C.purple, r: 12, desc: 'Live push to all role tiers the moment approval status changes — no polling.' },
        { id: 'construction', label: 'Construction Tracker', color: C.blue, r: 14, desc: '3-phase tracking: Foundation → Structure → Handover with document uploads per phase.' },
        { id: 'postgres', label: 'PostgreSQL', color: C.grey, r: 12, desc: '15+ normalized tables with row-level constraints per role.' },
        { id: 'haversine', label: 'Haversine Formula', color: C.grey, r: 10, desc: 'Calculates great-circle distance — enforces the 8km bylaw radius.' },
        { id: 'pastor', label: 'Pastor', color: C.amber, r: 8, desc: 'Tier 1 in the approval chain — receives and acts on the application at this stage.' },
        { id: 'division', label: 'Division', color: C.amber, r: 8, desc: 'Tier 2 in the approval chain — receives and acts on the application at this stage.' },
        { id: 'hq', label: 'HQ', color: C.amber, r: 8, desc: 'Tier 3 in the approval chain — receives and acts on the application at this stage.' },
        { id: 'president', label: 'President', color: C.amber, r: 8, desc: 'Tier 4 in the approval chain — receives and acts on the application at this stage.' },
        { id: 'finance', label: 'Finance', color: C.amber, r: 8, desc: 'Tier 5 in the approval chain — receives and acts on the application at this stage.' },
      ],
      edges: [
        { source: 'app', target: 'auth' },
        { source: 'app', target: 'rbac' },
        { source: 'app', target: 'gps' },
        { source: 'app', target: 'approval' },
        { source: 'app', target: 'construction' },
        { source: 'app', target: 'postgres' },
        { source: 'app', target: 'realtime' },
        { source: 'gps', target: 'haversine' },
        { source: 'approval', target: 'pastor' },
        { source: 'approval', target: 'division' },
        { source: 'approval', target: 'hq' },
        { source: 'approval', target: 'president' },
        { source: 'approval', target: 'finance' },
        { source: 'realtime', target: 'approval' },
        { source: 'rbac', target: 'postgres' },
        { source: 'auth', target: 'postgres' },
      ],
    },
  },

  {
    id: 'overflow',
    kind: 'current',
    badge: 'CURRENT ROLE',
    label: 'Overflow',
    role: 'Software Engineer Intern',
    company: 'Overflow',
    period: 'Mar 2026 – Present',
    location: '150-person · $30M+ funded',
    context:
      'Building internal tooling end-to-end in Next.js at a venture-backed startup — owning features from spec to ship.',
    tags: ['Next.js', 'Full-stack', 'Internal tooling'],
    techStack: [
      { name: 'Next.js', primary: true },
      { name: 'React', primary: true },
      { name: 'TypeScript', primary: true },
      { name: 'Node.js' },
      { name: 'REST APIs' },
      { name: 'Internal tooling' },
    ],
    metrics: [
      { value: '$30M+', label: 'Funding raised' },
      { value: '150', label: 'Person team' },
      { value: 'E2E', label: 'Feature ownership' },
    ],
    keyDecisions: [
      { title: 'Own the slice end to end', detail: 'Spec → build → ship in one pair of hands — fewer handoffs, tighter feedback loops at startup pace.' },
      { title: 'Purpose-built over off-the-shelf', detail: 'Internal tools beat generic SaaS for the edge cases a 150-person team actually hits daily.' },
      { title: 'Ship small, ship often', detail: 'Incremental delivery keeps each change reviewable and reversible instead of big-bang releases.' },
    ],
    architectureGraph: {
      nodes: [
        { id: 'core', label: 'Internal Tooling', color: C.teal, r: 24, desc: 'A suite of purpose-built tools owned end to end.' },
        { id: 'next', label: 'Next.js', color: C.teal, r: 16, desc: 'Full-stack framework — server + client in one codebase.' },
        { id: 'react', label: 'React', color: C.teal, r: 14, desc: 'Component UI for the internal dashboards.' },
        { id: 'ts', label: 'TypeScript', color: C.amber, r: 14, desc: 'Type-safe surface across the stack.' },
        { id: 'api', label: 'REST APIs', color: C.blue, r: 14, desc: 'Service endpoints powering the tools.' },
        { id: 'node', label: 'Node.js', color: C.grey, r: 12, desc: 'Server runtime behind the APIs.' },
      ],
      edges: [
        { source: 'core', target: 'next' },
        { source: 'core', target: 'ts' },
        { source: 'core', target: 'api' },
        { source: 'next', target: 'react' },
        { source: 'api', target: 'node' },
        { source: 'next', target: 'ts' },
      ],
    },
  },

  {
    id: 'racing',
    kind: 'project',
    badge: 'CREATIVE · ENGINEERING',
    label: 'Drexel Electric Racing',
    role: 'Creative Content Manager',
    company: 'Drexel Electric Racing',
    period: 'Oct 2023 – Sep 2025',
    location: 'Philadelphia',
    context:
      'Professional photo & video shoots and site upkeep for Drexel’s electric racing team — the creative thread, applied to engineering.',
    tags: ['Photography', 'Video', 'Web'],
    techStack: [
      { name: 'Photography', primary: true },
      { name: 'Video', primary: true },
      { name: 'Web', primary: true },
      { name: 'Lightroom' },
      { name: 'Premiere' },
      { name: 'CMS' },
    ],
    metrics: [
      { value: '2 yrs', label: 'Content lead' },
      { value: '1', label: 'Visual identity' },
    ],
    keyDecisions: [
      { title: 'One look across two years', detail: 'A consistent grade and framing so a season of shoots reads as a single brand.' },
      { title: 'Web-first delivery', detail: 'Assets shipped to the site where sponsors and recruits actually saw them.' },
      { title: 'Capture for reuse', detail: 'Shot wide and long so one session feeds stills, reels, and the website at once.' },
    ],
    architectureGraph: {
      nodes: [
        { id: 'brand', label: 'Team Brand', color: C.blue, r: 22, desc: 'A consistent visual identity across two seasons.' },
        { id: 'photo', label: 'Photography', color: C.amber, r: 16, desc: 'Stills for sponsors, recruiting, and the site.' },
        { id: 'video', label: 'Video', color: C.amber, r: 16, desc: 'Professional shoots and reels.' },
        { id: 'web', label: 'Website', color: C.blue, r: 14, desc: 'Where the assets were delivered and seen.' },
        { id: 'edit', label: 'Edit Pipeline', color: C.grey, r: 12, desc: 'Lightroom + Premiere grade and cut.' },
      ],
      edges: [
        { source: 'brand', target: 'photo' },
        { source: 'brand', target: 'video' },
        { source: 'brand', target: 'web' },
        { source: 'photo', target: 'edit' },
        { source: 'video', target: 'edit' },
        { source: 'edit', target: 'web' },
      ],
    },
  },

  {
    id: 'soundtech',
    kind: 'project',
    badge: 'LIVE PRODUCTION',
    label: 'Sound Technician',
    role: 'Sound Technician',
    company: 'Drexel University',
    period: 'Jan 2024 – Feb 2026',
    location: 'Philadelphia',
    context:
      'Ran sound, lighting, and live streaming for campus events — the hands-on AV craft that later inspired AutoMix AI.',
    tags: ['Live sound', 'Lighting', 'Streaming'],
    techStack: [
      { name: 'Live sound', primary: true },
      { name: 'Lighting', primary: true },
      { name: 'Streaming', primary: true },
      { name: 'Mixing' },
      { name: 'Signal flow' },
    ],
    metrics: [
      { value: 'Live', label: 'Campus events' },
      { value: '3', label: 'Disciplines' },
    ],
    keyDecisions: [
      { title: 'Gain-stage before the show', detail: 'Set clean levels up front so a live mix has headroom instead of fighting feedback mid-event.' },
      { title: 'Redundant signal paths', detail: 'A backup feed on critical channels — live has no second take.' },
      { title: 'Stream as a first-class output', detail: 'Mixed for the room and the broadcast separately so the online audience wasn’t an afterthought.' },
    ],
    architectureGraph: {
      nodes: [
        { id: 'show', label: 'Live Event', color: C.blue, r: 22, desc: 'Sound, light, and stream for a campus event.' },
        { id: 'sound', label: 'Sound', color: C.teal, r: 16, desc: 'The front-of-house mix.' },
        { id: 'light', label: 'Lighting', color: C.amber, r: 14, desc: 'Stage lighting cues.' },
        { id: 'stream', label: 'Streaming', color: C.blue, r: 14, desc: 'Live broadcast feed.' },
        { id: 'mix', label: 'Mixing', color: C.grey, r: 12, desc: 'Gain-staging and balance.' },
      ],
      edges: [
        { source: 'show', target: 'sound' },
        { source: 'show', target: 'light' },
        { source: 'show', target: 'stream' },
        { source: 'sound', target: 'mix' },
        { source: 'mix', target: 'stream' },
      ],
    },
  },

  {
    id: 'treeoflife',
    kind: 'project',
    badge: 'PRODUCTION INTERN',
    label: 'Tree of Life',
    role: 'Live Sound Engineer / Production Intern',
    company: 'Tree of Life Church',
    period: 'Jun – Jul 2024',
    location: 'Texas',
    context:
      'Creative arts team — live sound, fixed bugs in the church app, and filmed a promotional video on location in Mexico.',
    tags: ['Live sound', 'Software', 'Film'],
    techStack: [
      { name: 'Live sound', primary: true },
      { name: 'Film', primary: true },
      { name: 'Bug fixing', primary: true },
      { name: 'Church app' },
      { name: 'Production' },
    ],
    metrics: [
      { value: 'MX', label: 'On-location shoot' },
      { value: '3', label: 'Hats worn' },
    ],
    keyDecisions: [
      { title: 'Fix the app where it hurt', detail: 'Triaged the church app to the bugs users hit most, not the longest backlog ticket.' },
      { title: 'Shoot on location', detail: 'Filmed the promo in Mexico for real texture a studio set-up couldn’t fake.' },
      { title: 'Serve the service first', detail: 'Live sound choices favoured reliability for the congregation over engineer-pleasing complexity.' },
    ],
    architectureGraph: {
      nodes: [
        { id: 'arts', label: 'Creative Arts', color: C.purple, r: 22, desc: 'The production team’s output.' },
        { id: 'sound', label: 'Live Sound', color: C.teal, r: 16, desc: 'Sound for services.' },
        { id: 'film', label: 'Promo Film', color: C.amber, r: 16, desc: 'Shot on location in Mexico.' },
        { id: 'app', label: 'Church App', color: C.blue, r: 14, desc: 'Triaged and fixed user-facing bugs.' },
      ],
      edges: [
        { source: 'arts', target: 'sound' },
        { source: 'arts', target: 'film' },
        { source: 'arts', target: 'app' },
      ],
    },
  },

  {
    id: 'classified',
    kind: 'classified',
    badge: 'CLASSIFIED',
    label: 'Project Redacted',
    locked: true,
    role: 'Under NDA',
    company: '—',
    period: '—',
    location: '—',
    context: 'Details withheld under NDA.',
    tags: ['NDA'],
  },
];

export const projectById = (id) => ENGINEERING_PROJECTS.find((p) => p.id === id);
