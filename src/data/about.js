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
