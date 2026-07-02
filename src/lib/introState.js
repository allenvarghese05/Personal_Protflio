/**
 * Mutable intro-sequence state, read every frame inside the intro canvas's
 * render loop (no React re-renders). GSAP ScrollTrigger writes `p` while the
 * visitor scrolls Acts 1–2; the Act 3 timeline drives `act3Mix` (camera snap
 * toward the planet) once the 60% threshold fires.
 */
export const introState = {
  p: 0, // 0 → 1 across the 400vh intro scroll container
  act3: false, // Big Bang sequence has taken over from scroll
  act3Mix: 0, // 0 → 1 camera blend to the front-on planet shot
};
