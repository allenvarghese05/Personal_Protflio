/**
 * Single source of truth for all chapter content. The 3D scenes and the
 * overlays read from here. The story is told in fragments the visitor opens —
 * each is one bold stat + one line, not a paragraph.
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
    id: 'origins',
    index: 2,
    kicker: 'CHAPTER 02 · ORIGINS',
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
        pos: [-4.5, 6.8, -29],
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
        pos: [4.6, 7.2, -31],
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
        pos: [-3.6, 3.8, -32.5],
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
        pos: [3.6, 4.4, -35],
        size: 1.25,
      },
    ],
  },
  // 3–7 land here as each chapter is built
];
