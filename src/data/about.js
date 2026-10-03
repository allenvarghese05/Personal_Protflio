import { identity } from '@/data/timeline';

/**
 * The Observatory (about) + Comms (contact) content. Everything here is drawn
 * from facts already on the site — the project write-ups and identity. Items
 * marked TODO(allen) are yours to confirm or fill in.
 */

export const ABOUT = {
  headline: 'I build products end to end — from the schema to the last pixel.',
  bio: [
    'I’m Allen — a software engineering student at Drexel University, class of 2027. I like problems where data, AI and a genuinely good interface meet.',
    'I’m a co-founder and the founding engineer of LearnFlow AI, a desktop learning companion. I designed and built a church-construction approval platform as the sole engineer for a multi-division organisation in India. And with Aahil Afraz, I built AirCast — a 2025 NASA Space Apps Global Nominee.',
  ],
};

/**
 * Meet Me — the headline beside the helmet once the visor is open, and the
 * story blocks that scroll past it on the right.
 *
 * PLACEHOLDER COPY — TODO(allen): `mission` and `proof` are stand-ins until
 * the wording is final. Edit them here; nothing else needs to change.
 */
export const MEET = {
  // one sentence: the "why", not the "what"
  mission: 'I build things people actually use — from AI tools with real users to fintech systems that move real money.',
  // quiet proof: short labels, not a résumé list
  proof: ['Overflow', 'LearnFlowAI', 'NASA Space Apps Nominee'],
  // The story, scrolled past on the right while the helmet stays pinned
  // left — in order. Each chapter: a year (drives the counter), one
  // first-person line (the story), one quiet proof line, and an optional
  // link to a project's case study.
  // PLACEHOLDER COPY — TODO(allen): the lines are drafts in your voice; the
  // flight year and the Overflow dates are guesses to confirm.
  story: [
    { id: 'bhopal', year: 'Bhopal', line: 'It started in Bhopal.', proof: 'Bhopal, Madhya Pradesh · India' },
    { id: 'flight', year: '2023', line: 'Then I flew 12,300 km to learn how software is really built.', proof: 'Bhopal → Philadelphia' }, // TODO(allen): the year you flew
    { id: 'drexel', year: '2023', line: 'At Drexel I started building — Jam Duel began as a class project.', proof: 'Software Engineering · Drexel University · Class of 2027', project: 'jam-duel', linkLabel: 'Jam Duel' },
    { id: 'learnflow', year: '2024', line: 'I co-founded LearnFlow AI and became its first engineer.', proof: 'Co-Founder & Founding Engineer · 2024 – present · pre-launch', project: 'learnflow-ai', linkLabel: 'LearnFlow AI' },
    { id: 'nasa', year: '2025', line: 'With Team Relentless, AirCast went global.', proof: 'NASA Space Apps Global Nominee · top 1,219 of 11,500+ teams', project: 'aircast', linkLabel: 'AirCast' },
    { id: 'iet', year: '2025', line: 'Then I built something for home.', proof: 'Software Solutions Architect · Indian Evangelical Team · Dec 2025 – Mar 2026', project: 'iet', linkLabel: 'Church Building Application System' },
    { id: 'overflow', year: '2026', line: 'And I spent six months shipping at Overflow.', proof: 'Software Engineer Co-op · Overflow · Mar – Sep 2026' }, // TODO(allen): confirm the dates
  ],
};

// Newest first. `dates` stays blank where it isn't on record yet.
export const JOURNEY = [
  {
    dates: 'Dec 2025 – Mar 2026',
    title: 'Software Solutions Architect',
    org: 'Indian Evangelical Team',
    note: 'Sole engineer on the Church Building Application System.',
    project: 'iet',
  },
  {
    dates: '2025',
    title: 'Global Nominee — NASA Space Apps Challenge',
    org: 'Team Relentless',
    note: 'AirCast · top 1,219 of 11,500+ teams worldwide.',
    project: 'aircast',
  },
  {
    dates: '2024 – Present',
    title: 'Co-Founder & Founding Engineer',
    org: 'LearnFlow AI',
    note: 'Desktop learning companion — pre-launch.',
    project: 'learnflow-ai',
  },
  {
    dates: 'Class of 2027',
    title: 'Software Engineering',
    org: 'Drexel University',
    note: 'Where Jam Duel started, as an INFO 310 project.',
    project: 'jam-duel',
  },
];

// Skills, each backed by the projects that use them.
export const SKILLS = [
  { group: 'Languages', items: ['TypeScript', 'JavaScript', 'Python', 'SQL'], projects: ['iet', 'learnflow-ai', 'aircast', 'jam-duel'] },
  { group: 'Frontend', items: ['React', 'Next.js', 'React Native · Expo', 'Electron', 'Tailwind CSS'], projects: ['iet', 'learnflow-ai', 'streetspot', 'college-matcher', 'jam-duel'] },
  { group: 'Backend & data', items: ['Node.js · Express', 'Flask', 'PostgreSQL', 'Prisma', 'Supabase', 'Firebase'], projects: ['iet', 'learnflow-ai', 'aircast', 'jam-duel', 'streetspot'] },
  { group: 'AI & APIs', items: ['OpenAI (GPT-4o, Whisper)', 'Google Cloud Vision', 'Web Speech API', 'Spotify · YouTube APIs', 'NASA TEMPO (NetCDF)'], projects: ['learnflow-ai', 'aircast', 'college-matcher', 'jam-duel'] },
  { group: 'Cloud & delivery', items: ['Azure App Service', 'Railway', 'GitHub Actions', 'Supabase Storage'], projects: ['aircast', 'learnflow-ai', 'iet'] },
];

export const AWARDS = [
  { title: 'NASA Space Apps Challenge 2025 — Global Nominee', detail: 'AirCast · top 1,219 of 11,500+ teams', project: 'aircast' },
];

export const CONTACT = {
  email: identity.links.email,
  linkedin: identity.links.linkedin,
  github: identity.links.github,
  // TODO(allen): drop your resume at /public/resume.pdf and set this to '/resume.pdf'
  resume: null,
  // TODO(allen): confirm the roles + dates you're looking for
  availability: 'Open to software engineering co-op and internship roles.',
  location: 'Philadelphia, PA',
};
