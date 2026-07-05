/**
 * The world-entry cinematic ("Travel to Allen's World") — one shared clock.
 *
 * The click plays a short lock-on + text-scatter (~0.8s), then phase='dive'
 * starts this sequence. All times below are seconds RELATIVE TO DIVE START.
 * The DOM master timeline (BigBangTransition) and the 3D side (CameraRig /
 * GalaxyVoyage, keyed off elapsed time in useFrame) both read these constants
 * so they can never drift apart.
 *
 * The narrative: the camera pulls back until the hero planet becomes ONE
 * planet in a whole labeled galaxy — then a voyager rocket launches and
 * crosses that galaxy to Allen's World on your behalf. Contact = Big Bang.
 *
 *   HOLD      stillness — the inhale
 *   PULL      camera retreats: the hero planet shrinks into a solar system,
 *             the "ALLEN'S WORLD" designation fades in above it
 *   LAUNCH    the voyager lifts off from the bottom of the frame
 *   VOYAGE    it arcs across the system, past the other worlds
 *   APPROACH  camera pushes back in as the ship makes its final run
 *   FLASH     contact — single-frame white, the universe swaps
 *   ...       (arrival beats: reveal, designation type-on, letterbox iris,
 *             the drop world-side, film intertitles, handoff)
 */
export const ENTRY = {
  HOLD: 0.4,
  PULL: 0.4, // camera pull-back starts
  PULL_DUR: 2.0,
  LAUNCH: 1.4, // voyager lifts off (during the pull-back)
  VOYAGE: 2.4, // full crossing begins
  FLASH: 6.7, // the ship enters the planet — contact
  SWAP: 6.82, // under the white: world mounts dark, letterbox on
  REVEAL: 6.95, // white fades over 0.8s, world lights ramp
  TYPE: 8.0, // "ALLEN'S WORLD · SECTOR 01" typewriter
  BARS: 8.5, // letterbox dissolves (top, then bottom +0.15)
  DROP_DELAY: 1.4, // world-side: fall starts this long after SWAP
  FALL_MAIN: 1.05, // gravity acceleration portion (power2.in)
  FALL_BOUNCE: 0.45, // landing bounce portion (bounce.out)
  WELCOME: 10.0, // film intertitles
  WELCOME_OUT: 11.2,
  HANDOFF: 11.6, // journeyPhase → 'world', control unlocked
};
// derived: the approach push-in begins as the voyage ends
ENTRY.APPROACH = ENTRY.FLASH - 0.9;

/**
 * Mutable per-frame FX state, written by CameraRig's dive branch and read by
 * the galaxy scene, the voyager, and the distortion pass (no re-renders).
 */
export const entryState = {
  active: false,
  t: 0, // seconds since dive start
  pull: 0, // 0→1 camera pull-back (labels/orbits fade in with this)
  voyage: 0, // 0→1 rocket crossing progress
  approach: 0, // 0→1 final push-in toward Allen's World
  heat: 0, // 0→1 entry friction (shimmer, edge burn, bloom)
};

export const resetEntryState = () => {
  entryState.active = false;
  entryState.t = 0;
  entryState.pull = 0;
  entryState.voyage = 0;
  entryState.approach = 0;
  entryState.heat = 0;
};
