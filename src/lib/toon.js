import * as THREE from 'three';

/**
 * Cel-shading foundation for "Allen's World".
 *
 * MeshToonMaterial reads a 1-D gradient map to quantise lighting into hard
 * bands (the hand-drawn / Wind Waker look). We build one shared stepped
 * gradient with NearestFilter so the steps stay crisp.
 */
let _grad = null;
export function toonGradient() {
  if (_grad) return _grad;
  // 4 luminance steps from shadow → light
  const data = new Uint8Array([70, 120, 180, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  _grad = tex;
  return _grad;
}
