import * as THREE from 'three';

/**
 * Cosmic journey config — galaxy + solar system constants ported from the
 * human-constellations repo (src/components/cosmic/config.ts), plus the
 * portfolio-specific staging (where Allen's World sits, camera marks).
 *
 * `cosmos` is the shared mutable registry: scene components publish refs /
 * world positions here each frame so the camera + voyager can read them
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
  RADIUS: 5,
  DETAIL: 24,
  LIGHT: { COLOR: 0xffff99, INTENSITY: 1000, DISTANCE: 2000, DECAY: 1.5 },
  CORONA: {
    SCALE: 1.1,
    RADIUS: 5,
    DETAIL: 64,
    INNER: new THREE.Color(0xff7700),
    OUTER: new THREE.Color(0xffcc33),
  },
};

// Real textures, as-is. `angle` = fixed starting position on the orbit so the
// staging is deterministic; outer worlds drift slowly (rad/s).
export const PLANETS = [
  { name: 'Mercury', radius: 11, size: 0.7, texture: '/cosmic/planets/mercury.jpg', rim: 0xf9cf9f, angle: 2.2, orbit: 0.03, spin: 0.3 },
  { name: 'Venus', radius: 17, size: 1.6, texture: '/cosmic/planets/venus.jpg', rim: 0xb66f1f, angle: 1.1, orbit: 0.02, spin: 0.03 },
  { name: 'Mars', radius: 32, size: 1.2, texture: '/cosmic/planets/mars.jpg', rim: 0xbc6434, angle: 0.25, orbit: 0.014, spin: 0.6 },
  { name: 'Jupiter', radius: 55, size: 4.0, texture: '/cosmic/planets/jupiter.jpg', rim: 0xf3d6b6, angle: 1.4, orbit: 0.008, spin: 0.5 },
  { name: 'Saturn', radius: 85, size: 3.5, texture: '/cosmic/planets/saturn.jpg', rim: 0xd6b892, angle: 0.95, orbit: 0.006, spin: 0.4, rings: { size: 1.6, texture: '/cosmic/planets/saturnring.jpg' } },
  { name: 'Uranus', radius: 120, size: 2.5, texture: '/cosmic/planets/uranus.jpg', rim: 0x9ab6c2, angle: 0.5, orbit: 0.004, spin: 0.2, rings: { size: 1.0, texture: '/cosmic/planets/uranusring.jpg' } },
  { name: 'Neptune', radius: 165, size: 2.5, texture: '/cosmic/planets/neptune.jpg', rim: 0x5c7ed7, angle: 1.9, orbit: 0.003, spin: 0.2 },
];

// Allen's World (Earth textures). Parked — it holds still so the voyage can
// be pre-planned; it only spins.
export const ALLENS_WORLD = {
  position: new THREE.Vector3(18, 0, 16),
  size: 1.0,
  tilt: (-23.4 * Math.PI) / 180,
  spin: 0.08,
};

export const STARS = { COUNT: 5000, SPREAD: 1000, COLOR: 0x888888, SIZE: 1 };

export const NEBULA = {
  PARTICLE_COUNT: 50,
  PARTICLE_SPREAD: 1000,
  SIZE: 120,
  OPACITY: 0.06,
  COLORS: [0x9966ff, 0xff6699, 0x66ff99, 0x4c72bf, 0xff0000],
  COLOR_MULTIPLIER: 0.08,
  CLUSTER_SPREAD: 900,
};

/* ── Staging: camera marks in the solar system ──────────────────────────── */

const toWorld = ALLENS_WORLD.position.clone().normalize(); // sun → Allen's World
const side = new THREE.Vector3(-toWorld.z, 0, toWorld.x); // perpendicular, in-plane

// Where the camera lands after the cut — high above the system, sun in frame
export const SOLAR_WIDE = new THREE.Vector3(-30, 120, 250);
// Mid-shot of Allen's World: side-lit (terminator in frame), slightly above
export const WORLD_MARK = ALLENS_WORLD.position
  .clone()
  .addScaledVector(side, 6.6)
  .addScaledVector(toWorld, -1.2)
  .add(new THREE.Vector3(0, 1.9, 0));

/* ── Shared registry ────────────────────────────────────────────────────── */

export const cosmos = {
  galaxyGroup: null, // THREE.Group — rotates; hidden after the cut
  star: null, // THREE.Mesh — Allen's star
  solarGroup: null, // THREE.Group — hidden until the cut
  starWorld: new THREE.Vector3(),
};
