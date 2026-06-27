/**
 * Journey timing — all in terms of global scroll progress (0 → 1).
 *
 * The hero (launch → orbit) plays over the first HERO_END of the scroll; the
 * camera then flies on through the chapters. Content panels appear within
 * their bands. Adding a chapter = extend the camera path + add a band here
 * and bump the runway length in page.js.
 */
export const HERO_END = 0.5;

// activeChapter index → [start, end] progress band the panel is visible
export const CHAPTER_BANDS = [
  { ch: 1, start: 0.4, end: 0.56 }, // orbit / name card
  { ch: 2, start: 0.6, end: 0.96 }, // Origins
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
