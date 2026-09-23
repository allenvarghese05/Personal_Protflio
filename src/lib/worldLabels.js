import * as THREE from 'three';
import { worldState } from '@/lib/worldState';

/**
 * Line-of-sight for the floating district labels. The labels are HTML drawn
 * over the canvas, so on their own they'd show through rock and fog. Before a
 * label shows, we ask: can the camera actually see this landmark? (a ray from
 * the camera to sample points on it, tested against the terrain only).
 */
const ray = new THREE.Raycaster();
const dir = new THREE.Vector3();
const pt = new THREE.Vector3();

export function canSee(camera, points) {
  if (!worldState.occluders.length) return true;
  for (const [x, y, z] of points) {
    pt.set(x, y, z);
    dir.subVectors(pt, camera.position);
    const dist = dir.length();
    ray.set(camera.position, dir.normalize());
    ray.far = dist - 0.4;
    if (ray.intersectObjects(worldState.occluders, false).length === 0) return true;
  }
  return false;
}

/**
 * Per-frame label visibility: line of sight (re-checked every few frames —
 * raycasts aren't free), a distance window that matches the fog, and a soft
 * fade so labels never pop.
 */
export function labelVisibility(state, camera, { points, dist, near, far }) {
  state.frame = (state.frame || 0) + 1;
  if (state.frame % 4 === 1 || state.seen === undefined) state.seen = canSee(camera, points);
  const range = THREE.MathUtils.smoothstep(dist, near, near + 4) * (1 - THREE.MathUtils.smoothstep(dist, far - 12, far));
  const target = state.seen ? range : 0;
  state.v = (state.v || 0) + (target - (state.v || 0)) * 0.12;
  return state.v;
}
