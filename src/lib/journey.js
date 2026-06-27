/**
 * Journey timing — all in terms of global scroll progress (0 → 1).
 *
 * The hero (launch → orbit) plays over the first HERO_END of the scroll; the
 * camera then banks away from the planet, docks at the Engineering Station,
 * and finally drifts out to the asteroid field. Content panels appear within
 * their bands. Adding a chapter = extend the camera path in SpaceExperience,
 * add a band here, and bump the runway length in page.js.
 */
export const HERO_END = 0.4;

// activeChapter index → [start, end] progress band the panel is visible.
// Recruiter-first order: Engineering (work) before Origins (high school).
export const CHAPTER_BANDS = [
  { ch: 1, start: 0.3, end: 0.43 }, // orbit / name card
  { ch: 2, start: 0.48, end: 0.74 }, // Engineering Station (work)
  { ch: 3, start: 0.8, end: 0.99 }, // Origins (asteroid belt)
];

export function chapterFor(progress) {
  for (const b of CHAPTER_BANDS) {
    if (progress >= b.start && progress <= b.end) return b.ch;
  }
  return 0;
}

/** Normalized 0→1 position within a chapter's band (for local fades). */
export function bandT(progress, ch) {
  const b = CHAPTER_BANDS.find((x) => x.ch === ch);
  if (!b) return 0;
  return Math.min(1, Math.max(0, (progress - b.start) / (b.end - b.start)));
}
