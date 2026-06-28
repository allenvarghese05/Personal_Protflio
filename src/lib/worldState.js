import * as THREE from 'three';

/**
 * Mutable surface-exploration state, read every frame inside the world's
 * render loop (no React re-renders). ExploreController writes the astronaut's
 * position + target here; District landmarks read it to glow on proximity.
 * UI-level state that React needs (which zone is in range, which panel is open)
 * still lives in the Zustand store.
 */
export const worldState = {
  pos: new THREE.Vector3(0, 0, 6), // astronaut world position
  target: new THREE.Vector3(0, 0, 6), // walk-to destination
  hasTarget: false,
  moving: false,
  heading: 0, // facing angle (radians)
  azimuth: 0, // smoothed camera orbit angle around the astronaut
  azimuthTarget: 0, // drag updates this; azimuth damps toward it
};
