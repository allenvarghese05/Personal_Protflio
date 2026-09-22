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
 *   GALAXY      camera dives through the Milky Way toward Allen's star
 *   STAR_FLASH  the star swells to white — the cut happens under it
 *   SOLAR       Allen's system: the camera sweeps in toward Allen's World
 *   LAUNCH      the voyager (the only rocket) lifts off below the camera
 *   VOYAGE      chase cam rides it in
 *   APPROACH    final run — heat, vignette, rumble peak
 *   FLASH       contact — single-frame white, the universe swaps
 *   ...         arrival beats: reveal, designation type-on, letterbox iris,
 *               the drop (world-side), film intertitles, handoff
 */
export const ENTRY = {
  EXIT: 0,
  GALAXY: 0.4, // galaxy dive begins
  GALAXY_DUR: 3.4,
  STAR_FLASH: 3.4, // white-gold swell peaks at +0.4, the cut happens under it
  SOLAR: 3.85, // solar system on screen
  SOLAR_SWEEP_DUR: 2.9,
  LAUNCH: 6.0, // voyager lifts off (the only rocket in the journey)
  VOYAGE: 6.4, // chase cam engages
  FLASH: 9.6, // the ship enters the planet — contact
  SWAP: 9.72, // under the white: world mounts dark, letterbox on
  REVEAL: 9.85, // white fades over 0.8s, world lights ramp
  TYPE: 10.9, // "ALLEN'S WORLD · SECTOR 01" typewriter
  BARS: 11.4, // letterbox dissolves (top, then bottom +0.15)
  DROP_DELAY: 0.15, // world-side: the drop begins the moment the bang hands over
  FALL_MAIN: 1.05, // gravity acceleration portion (power2.in)
  FALL_BOUNCE: 0.45, // landing bounce portion (bounce.out)
  WELCOME: 12.9, // film intertitles
  WELCOME_OUT: 14.1,
  HANDOFF: 14.5, // journeyPhase → 'world', control unlocked
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
