import * as THREE from 'three';

/**
 * Light mode's intro: space at dawn. Instead of flat paper, the sky is a soft
 * sunrise (pale sky-blue overhead, a clean pearl in the middle, warm cream at
 * the horizon), so the galaxy can glow again: a gold core with arms cooling
 * through lilac to blue. It hands over to the daylight world below.
 */
export const DAWN = {
  top: '#c9daf2',
  upper: '#dfe8f5',
  middle: '#f1f2f5',
  lower: '#faf0e4',
  bottom: '#f8e2c8',
  // the galaxy, luminous on the dawn sky
  core: '#f0b257',
  warm: '#e08a33',
  mid: '#8f7bdc',
  arm: '#4a7bd4',
  glow: '#ffcf86',
  // the sunrise the dive flashes into
  flash: 'radial-gradient(circle at 50% 55%, #fffaf0 0%, #fff1dc 40%, #f9d9ad 100%)',
};

/** The dawn sky as a texture, for scene.background (fills the view). */
export function makeDawnTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, DAWN.top);
  g.addColorStop(0.3, DAWN.upper);
  g.addColorStop(0.55, DAWN.middle);
  g.addColorStop(0.8, DAWN.lower);
  g.addColorStop(1, DAWN.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A soft round glow (white centre fading out), tinted by the material. */
export function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.15)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
