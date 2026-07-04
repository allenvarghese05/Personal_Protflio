/**
 * The world-entry cinematic ("Travel to Allen's World") — one shared clock.
 *
 * The click plays a short lock-on + text-scatter (~0.8s), then phase='dive'
 * starts this sequence. All times below are seconds RELATIVE TO DIVE START.
 * The DOM master timeline (BigBangTransition) and the 3D side (CameraRig /
 * Rocket / EntryEffects, keyed off elapsed time in useFrame) both read these
 * constants so they can never drift apart.
 *
 * Act A — departure: stillness, then the planet stirs (0 → 1.3)
 * Act B — the journey: gravity pull, warp, heat, THE FLASH (1.3 → 4.35)
 * Act C — arrival: the world materialises, the drop, impact, welcome (4.35 →)
 */
export const ENTRY = {
  STIR: 0.3, // equator ring + atmosphere charge + lens begins
  ACCEL: 1.3, // camera starts falling along the gravity curve
  ACCEL_DUR: 2.8, // curve travel time (power2.in — slow, then violent)
  HEAT: 3.3, // atmosphere friction glow ramps
  HORIZON: 3.85, // the boundary line flashes across the screen
  FLASH: 4.1, // INSTANT white — single frame
  SWAP: 4.22, // under the white: world mounts dark, letterbox on
  REVEAL: 4.35, // white fades over 0.8s, world lights ramp
  TYPE: 5.4, // "ALLEN'S WORLD · SECTOR 01" typewriter
  BARS: 5.9, // letterbox dissolves (top, then bottom +0.15)
  DROP_DELAY: 1.4, // world-side: fall starts this long after SWAP
  FALL_MAIN: 1.05, // gravity acceleration portion (power2.in)
  FALL_BOUNCE: 0.45, // landing bounce portion (bounce.out)
  WELCOME: 7.4, // film intertitles
  WELCOME_OUT: 8.6,
  HANDOFF: 9.0, // journeyPhase → 'world', control unlocked
};

/**
 * Mutable per-frame FX state, written by CameraRig's dive branch and read by
 * the warp tunnel, planet stir FX, and the distortion pass (no re-renders).
 */
export const entryState = {
  active: false,
  t: 0, // seconds since dive start
  stir: 0, // 0→1 planet powering up
  warp: 0, // 0→1 acceleration (star streaks, bloom, rumble shake)
  heat: 0, // 0→1 atmosphere friction (shimmer, edge burn)
  lens: 0, // gravitational lens strength
};

export const resetEntryState = () => {
  entryState.active = false;
  entryState.t = 0;
  entryState.stir = 0;
  entryState.warp = 0;
  entryState.heat = 0;
  entryState.lens = 0;
};
