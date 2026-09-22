import * as THREE from 'three';

/**
 * Cosmic journey config — galaxy + solar system constants ported from the
 * human-constellations repo (src/components/cosmic/config.ts), plus the
 * portfolio-specific staging (where Allen's World sits, camera marks).
 *
 * `cosmos` is the shared mutable registry: scene components publish refs /
 * world positions here each frame so the camera can read them
 * without React re-renders.
 */

export const ASSETS = {
  galaxy: '/cosmic/galaxy.glb',
  disc: '/cosmic/disc.png',
  smoke: '/cosmic/smoke.png',
  sun: '/cosmic/planets/sun.jpg',
  earth: '/cosmic/planets/earth.jpg',
  earthNight: '/cosmic/planets/earthnight.jpg',
  earthClouds: '/cosmic/planets/earthclouds.jpg',
};

/* ── Galaxy ─────────────────────────────────────────────────────────────── */

export const GALAXY = {
  // Hero framing: below the disc, looking up through it
  CAMERA_DESKTOP: new THREE.Vector3(0, -10, 4.5),
  CAMERA_MOBILE: new THREE.Vector3(0, -12, 5.5),
  FOV_DESKTOP: 75,
  FOV_MOBILE: 100,
  // "Allen's star" — one point in the disc the camera dives into
  STAR_POSITION: new THREE.Vector3(0.038105392881217164, -2.745814737039023, 0.7172299984047412),
  STAR_COLOR: 0xffffcc,
  STAR_CAMERA_OFFSET: new THREE.Vector3(0, -0.185, 0.0925),
  STAR_SIZE_MIN: 0.01,
  STAR_SIZE_MAX: 15,
  DIVE_FOV: 32,
};

/* ── Solar system ───────────────────────────────────────────────────────── */

export const SUN = {
  RADIUS: 4,
  DETAIL: 24,
  LIGHT: { COLOR: 0xffff99, INTENSITY: 1000, DISTANCE: 2000, DECAY: 1.5 },
  CORONA: {
    SCALE: 1.1,
    RADIUS: 4,
    DETAIL: 64,
    INNER: new THREE.Color(0xff7700),
    OUTER: new THREE.Color(0xffcc33),
  },
};

// Real textures, as-is — but a DISPLAY layout, not real distances. Real
// spacing crushes the inner worlds into a dot beside the sun; like every good
// solar-system visual we compress to even orbital spacing and fan the worlds
// out at different angles so each is visible, clear of the sun and of each
// other's labels. `angle` is in radians (0 = +x, −π/2 = toward the camera).
const deg = (d) => (d * Math.PI) / 180;
export const PLANETS = [
  { name: 'Mercury', radius: 10, size: 0.8, texture: '/cosmic/planets/mercury.jpg', rim: 0xf9cf9f, angle: deg(185), orbit: 0.05, spin: 0.3 },
  { name: 'Venus', radius: 13, size: 1.25, texture: '/cosmic/planets/venus.jpg', rim: 0xb66f1f, angle: deg(250), orbit: 0.04, spin: 0.03 },
  { name: 'Mars', radius: 22, size: 1.0, texture: '/cosmic/planets/mars.jpg', rim: 0xbc6434, angle: deg(62), orbit: 0.03, spin: 0.6 },
  { name: 'Jupiter', radius: 29, size: 3.2, texture: '/cosmic/planets/jupiter.jpg', rim: 0xf3d6b6, angle: deg(172), orbit: 0.02, spin: 0.5 },
  { name: 'Saturn', radius: 37, size: 2.8, texture: '/cosmic/planets/saturn.jpg', rim: 0xd6b892, angle: deg(-118), orbit: 0.016, spin: 0.4, rings: { size: 1.4, texture: '/cosmic/planets/saturnring.jpg' } },
  { name: 'Uranus', radius: 44, size: 2.0, texture: '/cosmic/planets/uranus.jpg', rim: 0x9ab6c2, angle: deg(18), orbit: 0.012, spin: 0.2, rings: { size: 0.9, texture: '/cosmic/planets/uranusring.jpg' } },
  { name: 'Neptune', radius: 50, size: 2.0, texture: '/cosmic/planets/neptune.jpg', rim: 0x5c7ed7, angle: deg(112), orbit: 0.01, spin: 0.2 },
];

// Allen's World (Earth textures) — third from the sun, front-right of frame,
// a touch larger than its neighbours. Parked (it only spins) so the final
// zoom can be planned exactly.
const WORLD_ORBIT = 17.5;
const WORLD_ANGLE = deg(-40);
export const ALLENS_WORLD = {
  orbit: WORLD_ORBIT,
  position: new THREE.Vector3(Math.cos(WORLD_ANGLE) * WORLD_ORBIT, 0, -Math.sin(WORLD_ANGLE) * WORLD_ORBIT),
  size: 1.4,
  tilt: (-23.4 * Math.PI) / 180,
  spin: 0.08,
};

export const STARS = { COUNT: 5000, SPREAD: 1000, COLOR: 0x888888, SIZE: 1 };

export const NEBULA = {
  PARTICLE_COUNT: 50,
  PARTICLE_SPREAD: 1000,
  SIZE: 120,
  OPACITY: 0.06,
  // tinted from the one palette: accent, lilac, ice, sand, accent-lo
  COLORS: [0xff9a3c, 0xb9a6f5, 0x9cc3ff, 0xe6c9a0, 0xc9702a],
  COLOR_MULTIPLIER: 0.08,
  CLUSTER_SPREAD: 900,
};

/* ── Staging: camera marks in the solar system ──────────────────────────── */

// After the cut the camera drifts in from deep space and settles high over
// the system — sun centred, every orbit on screen (the outermost spans ~60%
// of the width, clear of the caption line), ~35° down so the orbits read as
// circles, not slivers. Framing solved numerically for a 16:10 viewport.
export const SYSTEM_START = new THREE.Vector3(30, 190, 240);
export const FRAME_ALL = new THREE.Vector3(0, 64, 92);
// aim slightly in front of the sun: perspective makes the near half of the
// system bigger, so this keeps the whole ellipse optically centred
export const SYSTEM_LOOK = new THREE.Vector3(0, 0, 12);

// Where the final zoom ends: just above Allen's World's atmosphere, on the
// sunlit side, coming in from the camera's direction. The white flash lands
// the instant we arrive — the mirror of the galaxy dive into the star.
const toSun = ALLENS_WORLD.position.clone().negate().normalize();
const toFrame = FRAME_ALL.clone().sub(ALLENS_WORLD.position).normalize();
export const WORLD_ENTRY = ALLENS_WORLD.position
  .clone()
  .addScaledVector(toFrame.multiplyScalar(0.75).add(toSun.multiplyScalar(0.55)).normalize(), ALLENS_WORLD.size * 1.18);

/* ── Shared registry ────────────────────────────────────────────────────── */

export const cosmos = {
  galaxyGroup: null, // THREE.Group — rotates; hidden after the cut
  star: null, // THREE.Mesh — Allen's star
  solarGroup: null, // THREE.Group — hidden until the cut
  starWorld: new THREE.Vector3(),
};
