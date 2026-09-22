/**
 * The intro journey — ONE shared clock, started by the hero's "Enter" click.
 *
 * All times are seconds since the click (phase → 'dive'). The DOM timelines
 * (IntroOverlay captions, BigBangTransition) and the 3D side (IntroCamera,
 * Galaxy, SolarSystem) all read these constants, and all measure
 * elapsed time from the same wall-clock stamp (`entryState.startedAt`), so
 * they can never drift apart.
 *
 *   EXIT        hero copy lifts away
 *   GALAXY      Act 1 — the camera dives into Allen's star (5s)
 *   STAR_FLASH  the star swells to white — the cut happens under it
 *   SOLAR       Allen's system: the camera settles on the whole system —
 *               sun centre, every world labelled, orbits drawn
 *   ZOOM        Act 2 — the camera dives into Allen's World: SAME 5s, SAME
 *               curve as the galaxy dive, ending in the atmosphere
 *   APPROACH    last stretch — heat shimmer, vignette, rumble peak
 *   FLASH       contact — white, the universe swaps (mirrors STAR_FLASH)
 *   ...         arrival beats: reveal, designation type-on, letterbox iris,
 *               the drop (world-side), film intertitles, handoff
 *
 * No rocket: the viewer is the traveller the whole way. Two dives, two
 * flashes — the second answers the first.
 */
export const ZOOM_DUR = 5.0; // both dives — into the star and into the world

export const ENTRY = {
  EXIT: 0,
  GALAXY: 0.4, // Act 1 dive begins
  GALAXY_DUR: ZOOM_DUR,
  STAR_FLASH: 5.0, // white-gold swell peaks at +0.4, the cut happens under it
  SOLAR: 5.45, // the system on screen, camera still arriving
  SYSTEM_ARRIVE_DUR: 3.2, // settle onto the full-system view
  ZOOM: 10.9, // Act 2 dive begins (after a ~2.2s hold on the whole system)
  ZOOM_DUR,
  FLASH: 15.9, // = ZOOM + ZOOM_DUR — contact with the atmosphere
  SWAP: 16.02, // under the white: world mounts dark, letterbox on
  REVEAL: 16.15, // white fades over 0.8s, world lights ramp
  TYPE: 17.2, // "ALLEN'S WORLD · SECTOR 01" typewriter
  BARS: 17.7, // letterbox dissolves (top, then bottom +0.15)
  DROP_DELAY: 0.15, // world-side: the drop begins the moment the bang hands over
  FALL_MAIN: 1.05, // gravity acceleration portion (power2.in)
  FALL_BOUNCE: 0.45, // landing bounce portion (bounce.out)
  WELCOME: 19.2, // film intertitles
  WELCOME_OUT: 20.4,
  HANDOFF: 20.8, // journeyPhase → 'world', control unlocked
};
// derived: the last stretch of the dive heats up
ENTRY.APPROACH = ENTRY.FLASH - 1.2;

/**
 * Mutable per-frame state (no re-renders). `startedAt` is the wall-clock
 * stamp of the Enter click; everything else is derived each frame by the
 * intro camera and read by the scene and the distortion pass.
 */
export const entryState = {
  active: false,
  startedAt: 0, // performance.now() at the Enter click
  t: 0, // seconds since the click
  approach: 0, // 0→1 last stretch of the dive into Allen's World
  heat: 0, // 0→1 entry friction (shimmer, edge burn, bloom)
};

/** Seconds since the Enter click (0 before it). */
export const entryElapsed = () =>
  entryState.startedAt ? (performance.now() - entryState.startedAt) / 1000 : 0;

export const resetEntryState = () => {
  entryState.active = false;
  entryState.startedAt = 0;
  entryState.t = 0;
  entryState.approach = 0;
  entryState.heat = 0;
};
