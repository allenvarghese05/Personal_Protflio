/**
 * The intro journey — ONE shared clock, started by the hero's "Enter" click.
 *
 * All times are seconds since the click (phase → 'dive'). The DOM timelines
 * (IntroOverlay captions, BigBangTransition) and the 3D side (IntroCamera,
 * Galaxy, SolarSystem, Voyager) all read these constants, and all measure
 * elapsed time from the same wall-clock stamp (`entryState.startedAt`), so
 * they can never drift apart.
 *
 *   EXIT        hero copy lifts away
 *   GALAXY      camera dives through the Milky Way into Allen's star (5s)
 *   STAR_FLASH  the star swells to white — the cut happens under it
 *   SOLAR       Allen's system: the camera settles on the whole system —
 *               every world labelled, orbits drawn (as human-constellations)
 *   HOLD        a breath on the full system
 *   ZOOM        the approach to Allen's World — same 5s / same curve as the
 *               galaxy dive, so the two zooms rhyme
 *   LAUNCH      the voyager (the only rocket) lifts off below the camera
 *   VOYAGE      chase cam rides it in
 *   APPROACH    final run — heat, vignette, rumble peak
 *   FLASH       contact — single-frame white, the universe swaps
 *   ...         arrival beats: reveal, designation type-on, letterbox iris,
 *               the drop (world-side), film intertitles, handoff
 */
export const ZOOM_DUR = 5.0; // both zooms — galaxy dive and world approach

export const ENTRY = {
  EXIT: 0,
  GALAXY: 0.4, // galaxy dive begins
  GALAXY_DUR: ZOOM_DUR,
  STAR_FLASH: 5.0, // white-gold swell peaks at +0.4, the cut happens under it
  SOLAR: 5.45, // the system on screen, camera still arriving
  SYSTEM_ARRIVE_DUR: 3.2, // settle onto the full-system view
  ZOOM: 10.9, // approach to Allen's World begins (after a ~2.2s hold)
  ZOOM_DUR,
  LAUNCH: 15.3, // voyager lifts off as the camera settles
  VOYAGE: 15.7, // chase cam engages
  FLASH: 19.3, // the ship enters the planet — contact
  SWAP: 19.42, // under the white: world mounts dark, letterbox on
  REVEAL: 19.55, // white fades over 0.8s, world lights ramp
  TYPE: 20.6, // "ALLEN'S WORLD · SECTOR 01" typewriter
  BARS: 21.1, // letterbox dissolves (top, then bottom +0.15)
  DROP_DELAY: 0.15, // world-side: the drop begins the moment the bang hands over
  FALL_MAIN: 1.05, // gravity acceleration portion (power2.in)
  FALL_BOUNCE: 0.45, // landing bounce portion (bounce.out)
  WELCOME: 22.6, // film intertitles
  WELCOME_OUT: 23.8,
  HANDOFF: 24.2, // journeyPhase → 'world', control unlocked
};
// derived: the approach push-in begins as the voyage ends
ENTRY.APPROACH = ENTRY.FLASH - 0.9;

/**
 * Mutable per-frame state (no re-renders). `startedAt` is the wall-clock
 * stamp of the Enter click; everything else is derived each frame by the
 * intro camera and read by the scene, the voyager and the distortion pass.
 */
export const entryState = {
  active: false,
  startedAt: 0, // performance.now() at the Enter click
  t: 0, // seconds since the click
  voyage: 0, // 0→1 rocket crossing progress
  approach: 0, // 0→1 final push-in toward Allen's World
  heat: 0, // 0→1 entry friction (shimmer, edge burn, bloom)
};

/** Seconds since the Enter click (0 before it). */
export const entryElapsed = () =>
  entryState.startedAt ? (performance.now() - entryState.startedAt) / 1000 : 0;

export const resetEntryState = () => {
  entryState.active = false;
  entryState.startedAt = 0;
  entryState.t = 0;
  entryState.voyage = 0;
  entryState.approach = 0;
  entryState.heat = 0;
};
