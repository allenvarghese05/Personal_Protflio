/**
 * Who Allen is, in one place. The landing hero, the Meet Me headline, the
 * static fallback, Comms and /projects all read from here.
 */

export const identity = {
  name: 'Allen Shaji Varghese',
  // the credential line above the name — landing hero + Meet Me share it
  credential: 'Software Engineer — Drexel University ’27',
  badge: 'NASA Space Apps 2025 — Global Nominee · top 1,219 of 11,500+ teams',
  tagline:
    'I build software people rely on: giving infrastructure at Overflow, a grant platform in production across India, and a NASA Space Apps Global Nominee.',
  links: {
    email: 'allenvarghese05@gmail.com',
    linkedin: 'https://www.linkedin.com/in/allen-shaji-varghese/',
    github: 'https://github.com/allenvarghese05',
  },
  // The résumé, for the whole site (/projects header, Comms). Drop the PDF
  // at public/resume.pdf and set this to '/resume.pdf'. While it is null the
  // résumé buttons stay hidden rather than showing a placeholder.
  resume: null,
};
