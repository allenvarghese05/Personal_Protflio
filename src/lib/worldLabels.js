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

const proj = new THREE.Vector3();

/** Is this point in front of the camera and inside the frame? */
function inView(camera, x, y, z) {
  proj.set(x, y, z).project(camera);
  return proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.1;
}

export function canSee(camera, points) {
  for (const [x, y, z] of points) {
    // behind the camera or off-frame → never show (no mirrored labels)
    if (!inView(camera, x, y, z)) continue;
    if (!worldState.occluders.length) return true;
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
  // the in-view test is cheap — run it every frame; the raycast every few
  const anyInView = points.some(([x, y, z]) => inView(camera, x, y, z));
  if (!anyInView) state.seen = false;
  else if (state.frame % 4 === 1 || state.seen === undefined) state.seen = canSee(camera, points);
  const range = THREE.MathUtils.smoothstep(dist, near, near + 4) * (1 - THREE.MathUtils.smoothstep(dist, far - 12, far));
  const target = state.seen ? range : 0;
  state.v = (state.v || 0) + (target - (state.v || 0)) * 0.12;
  return state.v;
}
