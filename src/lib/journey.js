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

// The space journey now ENDS at the orbit / name card — full scroll maps to
// this fraction of the original camera path (the Engineering Station and
// asteroid-belt shots beyond it are unreachable; that content lives on the
// planet in Mission Control). From the name card, the TRAVEL button hands
// over to the Big Bang dive + landing.
export const JOURNEY_END = 0.4;

// activeChapter index → [start, end] progress band the panel is visible.
// Band end sits past JOURNEY_END so the name card holds at full scroll.
export const CHAPTER_BANDS = [
  { ch: 1, start: 0.3, end: 0.41 }, // orbit / name card (journey climax)
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
