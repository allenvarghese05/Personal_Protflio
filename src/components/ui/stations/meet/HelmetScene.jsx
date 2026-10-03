'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { Lightformer, useTexture } from '@react-three/drei';
import { EffectComposer, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { FilmEffect } from './FilmEffect';

/**
 * Meet Me — the helmet, on a suit. Built in code (no model to license) so
 * the visor is a real separate part on a real hinge:
 *
 *   · Shell + liner: full spheres whose face window and neck are cut in the
 *     fragment shader — a mathematically smooth, anti-aliased ellipse.
 *   · Visor: a slightly larger sphere segment cut the same way, gold over a
 *     clear lacquer, pivoting on the side hinges (x-axis through the centre).
 *   · Face: the finished portrait, recessed behind the aperture. It's clipped
 *     to the window geometrically (each pixel traces its view ray back to the
 *     shell) and darkened where the aperture rim blocks the moon.
 *   · Suit: shoulders + upper chest the helmet sits on and shadows.
 *   · Light: a warm studio (key light + warm reflections, which make the
 *     gold glow) and the moon — a cool accent that rises as the visor opens,
 *     casts the shadow, and drives the rim shadow on the face.
 *
 *   · Glass: the clear pressure bubble in the opening — it mirrors the moon
 *     and the room, and its condensation clears the moment the face lights.
 *
 * The helmet always aims its opening at the lens (the suit follows half-way),
 * so the frontal portrait and the shell agree from every position — plus a
 * few degrees toward the cursor, as if it noticed you.
 *
 * `progress` is a ref (0→1) the page writes from scroll; nothing here
 * re-renders per frame. Everything that moves — hinge, camera, moon, beam,
 * focus rack — reads ONE value, `reveal`: the same ease over the
 * same scroll slice. When it lands, the frame is still. A second value on
 * the same ease, `layout`, then glides the helmet to its resting place.
 */

const R = 1; // helmet radius
const MAX_LIFT = 1.3; // radians the visor swings up and back on its hinges
const STANDBY = 0.1; // interior level at rest — a silhouette through the gold
const WINDOW = { rx: 0.6, ry: 0.5, cy: 0.02 }; // face opening on the unit sphere
const f = (n) => n.toFixed(4);
/** A small seeded PRNG, so generated detail (stars, dust) is identical every
 *  visit and never calls Math.random during render. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── the one clock ────────────────────────────────────────────────────── */

/** 0 → REVEAL_FROM is a held beat: nothing moves until the scroll commits. */
const REVEAL_FROM = 0.03;
const REVEAL_TO = 0.92;
/** The one ease every moving thing uses (power2.out). */
const revealEase = (x) => 1 - (1 - x) * (1 - x);

/** Camera: dolly + look height, rest → revealed. */
// (the final dolly stops a little short so the chest patch stays in frame)
const CAM = { z: [6.4, 5.55], lookY: [-0.42, -0.2], lift: 0.18 };

/** < 0 inside the face window, for a unit direction n. */
const WIN_GLSL = /* glsl */ `
  float winField(vec3 n, float grow) {
    vec2 q = vec2(n.x / (${f(WINDOW.rx)} + grow), (n.y - ${f(WINDOW.cy)}) / (${f(WINDOW.ry)} + grow));
    return n.z > 0.2 ? dot(q, q) - 1.0 : 1.0;
  }
`;

/**
 * Cut the window (and optionally the neck) out of a sphere material, with
 * an anti-aliased edge. keep = 'outside' for the shell/liner, 'inside' for
 * the visor.
 */
function cutWindow(mat, { keep, grow = 0, neck = false }) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vObj;\n${WIN_GLSL}`)
      .replace(
        '#include <alphatest_fragment>',
        /* glsl */ `{
          vec3 n = normalize(vObj);
          float w = winField(n, ${f(grow)});
          float cov = clamp(w / max(fwidth(w), 1e-4) + 0.5, 0.0, 1.0);
          ${keep === 'inside' ? 'cov = 1.0 - cov;' : ''}
          ${neck ? 'cov *= step(-0.72, n.y);' : ''}
          if (cov < 0.02) discard;
          diffuseColor.a *= cov;
        }
        #include <alphatest_fragment>`
      );
  };
  mat.customProgramCacheKey = () => `win-${keep}-${grow}-${neck}`;
  return mat;
}

/* ── the face ─────────────────────────────────────────────────────────── */

/** Aperture centre on the shell, helmet space. */
const APERTURE = new THREE.Vector3(0, WINDOW.cy, Math.sqrt(1 - WINDOW.cy * WINDOW.cy)).multiplyScalar(R);
/** How far behind the aperture (along the view ray) the portrait sits. */
const PLATE_DEPTH = 0.8;
/** Plate geometry size — it only has to cover the aperture from any camera
 *  position on the dolly; the portrait is scaled inside it. */
const PLATE = 1.8;
/** The face in the portrait, in UV (v up): its centre, between the eyes and
 *  the mouth; its ear-to-ear width; and the chin — measured from
 *  public/meet/allen-face.webp. Re-measure if the image changes. */
const FACE = { cx: 0.5, cy: 0.43, w: 0.514, chin: 0.21 };
/** Ear-to-ear runs past the opening's width, so the ears sit under the rim
 *  (as they would in a real helmet) and the face fills the visor; centred
 *  just under the eyes, the chin can tuck a touch under the lower edge. */
const FACE_FILL = 1.16;
/** The opening's visible rim (just inside the gasket), helmet space — its
 *  on-screen outline is what the portrait is centred and fitted to. */
const RIM = Array.from({ length: 24 }, (_, i) => {
  const t = (i / 24) * Math.PI * 2;
  const x = (WINDOW.rx - 0.035) * Math.cos(t);
  const y = WINDOW.cy + (WINDOW.ry - 0.035) * Math.sin(t);
  return new THREE.Vector3(x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))).multiplyScalar(R);
});

const faceVert = /* glsl */ `
  uniform mat4 uToHelmet;
  varying vec2 vUv;
  varying vec3 vH;
  void main() {
    vUv = uv;
    vH = (uToHelmet * modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const faceFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uLight;
  uniform float uUvScale;  // plate size / portrait size
  uniform vec2 uHead;      // head centre in the portrait's UV
  uniform vec3 uCam;       // camera, helmet space
  uniform vec3 uMoon;      // direction to the moon light, helmet space
  varying vec2 vUv;
  varying vec3 vH;
  ${WIN_GLSL}
  void main() {
    // trace the view ray back to the shell: keep the pixel only if the
    // ray entered through the glass (exact from every camera angle)
    vec3 d = vH - uCam;
    float len = length(d);
    d /= len;
    float b = dot(uCam, d);
    float h = b * b - (dot(uCam, uCam) - ${f(R * R)});
    if (h < 0.0) discard;
    float t = -b - sqrt(h);
    if (t > len) discard;
    if (winField(normalize(uCam + d * t), 0.0) > 0.0) discard;

    // the portrait, head centred on the plate
    vec2 uv = (vUv - 0.5) * uUvScale + uHead;
    vec3 col = (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? vec3(0.0) : texture2D(uMap, uv).rgb;

    // rim shadow: follow the moon's direction out of the helmet — if that
    // ray leaves through the shell instead of the aperture, the rim is in
    // the way. A wide falloff across the edge keeps it a soft gradient.
    float bb = dot(vH, uMoon);
    float hh = bb * bb - (dot(vH, vH) - ${f(R * R)});
    float tt = -bb + sqrt(max(hh, 0.0));
    float w = winField(normalize(vH + uMoon * tt), 0.0);
    float lit = 1.0 - smoothstep(-0.5, 0.35, w);

    gl_FragColor = vec4(col * uLight * mix(0.5, 1.0, lit), 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * The portrait plate. Every frame it sits on the camera's ray through the
 * aperture centre (so it's centred at every point of the dolly, not just
 * one), squares up to the camera, and scales the head to fit the aperture.
 * It also reports the aperture's screen position and the focus distances.
 */
function Face({ lightRef, moonDirRef, apertureRef }) {
  const mesh = useRef();
  const mat = useRef();
  const tex = useTexture('/meet/allen-face.webp', (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });
  const uniforms = useMemo(
    () => ({
      uMap: { value: tex },
      uLight: { value: STANDBY },
      uUvScale: { value: 1 },
      uHead: { value: new THREE.Vector2(FACE.cx, FACE.cy) },
      uCam: { value: new THREE.Vector3() },
      uMoon: { value: new THREE.Vector3(0, 0, 1) },
      uToHelmet: { value: new THREE.Matrix4() },
    }),
    [tex]
  );
  const tmp = useMemo(
    () => ({ w: new THREE.Vector3(), ray: new THREE.Vector3(), p: new THREE.Vector3(), e: new THREE.Vector3() }),
    []
  );

  useFrame(({ camera, size }) => {
    const plate = mesh.current;
    const helmet = plate?.parent;
    const u = mat.current?.uniforms;
    if (!helmet || !u) return;
    helmet.updateWorldMatrix(true, false);
    const sc = helmet.getWorldScale(tmp.e).x; // < 1 once the layout glides it aside
    const depth = PLATE_DEPTH * sc;

    // the opening as the camera actually sees it: project its rim and take
    // the outline's centre and extents on screen (exact from any angle — a
    // turned or off-axis helmet shows an off-centre outline)
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const pt of RIM) {
      const v = helmet.localToWorld(tmp.p.copy(pt)).project(camera);
      x0 = Math.min(x0, v.x);
      x1 = Math.max(x1, v.x);
      y0 = Math.min(y0, v.y);
      y1 = Math.max(y1, v.y);
    }
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const W = helmet.localToWorld(tmp.w.copy(APERTURE));
    const dW = W.distanceTo(camera.position);
    const D = dW + depth; // plate distance from the lens

    // sit on the ray through the outline's centre, behind the glass, and
    // face the lens on both axes: lookAt aims the plate's normal at the
    // camera's true 3D position (yaw and pitch), every frame
    const ray = tmp.ray.set(cx, cy, 0.5).unproject(camera).sub(camera.position).normalize();
    const P = tmp.p.copy(camera.position).addScaledVector(ray, D);
    plate.position.copy(helmet.worldToLocal(P));
    plate.lookAt(camera.position);

    // fit the face to the outline's half-extents, taken at the plate's
    // distance: ear-to-ear across the opening, but never so big the chin
    // drops under the rim
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const ay = ((y1 - y0) / 2) * D * tanH;
    const ax = ((x1 - x0) / 2) * D * tanH * (size.width / size.height);
    const byWidth = (FACE_FILL * 2 * ax) / FACE.w;
    const byChin = (1.2 * ay) / (FACE.cy - FACE.chin);
    // portrait size, in the plate's own (helmet-local) units
    const s = Math.min(byWidth, byChin) / sc;
    u.uUvScale.value = PLATE / s;

    u.uToHelmet.value.copy(helmet.matrixWorld).invert();
    u.uCam.value.copy(camera.position).applyMatrix4(u.uToHelmet.value);
    u.uMoon.value.copy(moonDirRef.current).transformDirection(u.uToHelmet.value);
    u.uLight.value = lightRef.current;

    // for the focus rack (and the beam's landing point)
    const a = apertureRef.current;
    a.x = (cx * 0.5 + 0.5) * size.width;
    a.y = (-cy * 0.5 + 0.5) * size.height;
    a.rad = ((y1 - y0) / 2) * (size.height / 2);
    helmet.localToWorld(a.crown.set(0, 1.04 * R, 0.12));
    a.dShell = dW - 0.05 * sc;
    a.dFace = dW + depth;
  });

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[PLATE, PLATE]} />
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={faceVert} fragmentShader={faceFrag} toneMapped={false} />
    </mesh>
  );
}

/* ── materials ────────────────────────────────────────────────────────── */

const shellMat = cutWindow(
  // glossy: the moon's highlight reads as a crisp, travelling glint
  new THREE.MeshPhysicalMaterial({ color: '#ebe6dc', roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.08, alphaToCoverage: true }),
  { keep: 'outside', neck: true }
);
const linerMat = cutWindow(
  new THREE.MeshStandardMaterial({ color: '#141519', roughness: 0.9, side: THREE.BackSide, alphaToCoverage: true }),
  { keep: 'outside', neck: true }
);
const visorMat = cutWindow(
  new THREE.MeshPhysicalMaterial({
    color: '#e3ab55',
    metalness: 1,
    roughness: 0.14,
    transparent: true,
    opacity: 0.74, // gold, but not fully opaque — a silhouette reads through it
    envMapIntensity: 1.9,
    // a thin clear lacquer over the gold: the only layer that reflects the
    // moon un-tinted — a faint cool pass, well under the gold
    clearcoat: 0.35,
    clearcoatRoughness: 0.06,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  { keep: 'inside', grow: 0.07 }
);

/**
 * The pressure bubble — clear glass across the opening, just inside the
 * shell. No diffuse colour at all: it only shows what it reflects (moon,
 * stars, the headline), with alpha carried by that reflection, plus a mottled
 * condensation that clears from the centre outward once the face lights.
 */
const GLASS = { fog: { value: 1 }, clear: { value: 0 }, glow: { value: STANDBY } };
const glassMat = cutWindow(
  // a softened direct highlight — a pinpoint moon glint read as a sparkle on the face
  new THREE.MeshPhysicalMaterial({ color: '#000000', roughness: 0.18, metalness: 0, specularIntensity: 0.2, transparent: true, depthWrite: false, envMapIntensity: 0.9 }),
  { keep: 'inside' }
);
{
  const cut = glassMat.onBeforeCompile;
  glassMat.onBeforeCompile = (sh) => {
    cut(sh);
    sh.uniforms.uFog = GLASS.fog;
    sh.uniforms.uClear = GLASS.clear;
    sh.uniforms.uGlow = GLASS.glow;
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uFog;
        uniform float uClear;
        uniform float uGlow;
        float gh(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float gnoise(vec3 x) {
          vec3 i = floor(x); vec3 k = fract(x); k = k * k * (3.0 - 2.0 * k);
          return mix(mix(mix(gh(i), gh(i + vec3(1, 0, 0)), k.x), mix(gh(i + vec3(0, 1, 0)), gh(i + vec3(1, 1, 0)), k.x), k.y),
                     mix(mix(gh(i + vec3(0, 0, 1)), gh(i + vec3(1, 0, 1)), k.x), mix(gh(i + vec3(0, 1, 1)), gh(i + vec3(1, 1, 1)), k.x), k.y), k.z);
        }`
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `{
          vec3 n = normalize(vObj);
          // the glass is only as visible as what it mirrors
          float refl = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
          // cap how bright a reflection can get: a mirrored moon on the glass
          // reads as a sparkle on the face, so it's held to a soft sheen
          outgoingLight *= min(1.0, 0.16 / max(refl, 1e-4));
          refl = min(refl, 0.16);
          float a = clamp(refl * 1.8, 0.0, 0.6);
          // condensation: mottled, heavier toward the rim, clearing centre-out
          float rr = sqrt(clamp(winField(n, 0.0) + 1.0, 0.0, 1.0)); // 0 centre → 1 rim
          float mottle = 0.75 * gnoise(n * 6.0) + 0.25 * gnoise(n * 13.0);
          float fog = uFog * smoothstep(uClear - 0.2, uClear + 0.04, rr) * mix(0.72, 1.0, mottle) * mix(0.75, 1.0, rr);
          vec3 fogCol = vec3(0.22, 0.235, 0.26) * (0.55 + 0.9 * uGlow); // lit from inside by the face
          vec3 col = mix(outgoingLight, fogCol, clamp(fog, 0.0, 1.0) * 0.9);
          gl_FragColor = vec4(col, max(a, fog * 0.42) * diffuseColor.a);
        }`
      );
  };
  glassMat.customProgramCacheKey = () => 'glass-bubble';
}

const rubberMat = new THREE.MeshStandardMaterial({ color: '#1b1c21', roughness: 0.7 });
const metalMat = new THREE.MeshStandardMaterial({ color: '#bdb8ae', roughness: 0.28, metalness: 0.85 });
const darkMetalMat = new THREE.MeshStandardMaterial({ color: '#6f6b65', roughness: 0.35, metalness: 0.8 });
const accentPaintMat = new THREE.MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.6 });

/** Suit fabric. The directional shadow is real (cast by the helmet from the
 *  moon); this only adds the soft, non-directional occlusion where the neck
 *  ring meets the fabric, and lets the chest fall away. */
const suitMat = new THREE.MeshStandardMaterial({ color: '#d6d0c4', roughness: 0.9 });
suitMat.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
    .replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
      float rr = length(vec2(vObj.x, vObj.z * 1.3));
      diffuseColor.rgb *= mix(0.45, 1.0, smoothstep(0.66, 1.3, rr));
      diffuseColor.rgb *= mix(0.5, 1.0, smoothstep(-2.3, -1.1, vObj.y));`
    );
};

/* ── the suit ─────────────────────────────────────────────────────────── */

/**
 * Flag patches for the upper arms, drawn as woven patches: true colours,
 * then knocked back (a fabric-dark wash + weave) so they read as cloth under
 * moonlight, not stickers, and sit quietly beside the amber accent.
 */
function useFlagTexture(kind) {
  return useMemo(() => {
    const W = 256;
    const H = 160;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    if (kind === 'india') {
      [['#ff9933', 0], ['#f4f1ea', 1], ['#138808', 2]].forEach(([col, i]) => {
        g.fillStyle = col;
        g.fillRect(0, (H / 3) * i, W, H / 3 + 1);
      });
      // the Ashoka Chakra: a navy wheel of 24 spokes
      g.strokeStyle = '#1b2a78';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(W / 2, H / 2, H / 7, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 1.4;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        g.beginPath();
        g.moveTo(W / 2, H / 2);
        g.lineTo(W / 2 + Math.cos(a) * (H / 7), H / 2 + Math.sin(a) * (H / 7));
        g.stroke();
      }
    } else {
      for (let i = 0; i < 13; i++) {
        g.fillStyle = i % 2 ? '#f4f1ea' : '#b22234';
        g.fillRect(0, (H / 13) * i, W, H / 13 + 1);
      }
      const cw = W * 0.4;
      const ch = (H / 13) * 7;
      g.fillStyle = '#3c3b6e';
      g.fillRect(0, 0, cw, ch);
      g.fillStyle = '#f4f1ea';
      for (let r = 0; r < 9; r++) {
        const n = r % 2 ? 5 : 6;
        for (let k = 0; k < n; k++) {
          g.beginPath();
          g.arc(((k + (r % 2 ? 1 : 0.5)) * cw) / 6, ((r + 0.7) * ch) / 9.6, 2.1, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    // knock it back: a fabric-dark wash, a fine weave, an embroidered edge
    g.fillStyle = 'rgba(28, 28, 34, 0.3)';
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.08;
    g.fillStyle = '#000';
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    g.globalAlpha = 1;
    g.strokeStyle = '#26272d';
    g.lineWidth = 10;
    g.strokeRect(0, 0, W, H);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [kind]);
}

function Suit() {
  const india = useFlagTexture('india');
  const usa = useFlagTexture('usa');
  const geo = useMemo(() => {
    // collar → shoulder slope → rounded shoulder → chest, revolved; then
    // flattened front-to-back away from the (round) collar
    const profile = new THREE.SplineCurve(
      [
        [0.62, -0.66],
        [0.72, -0.8],
        [0.95, -0.9],
        [1.28, -1.0],
        [1.56, -1.13],
        [1.74, -1.38],
        [1.8, -1.8],
        [1.76, -2.9],
      ].map(([x, y]) => new THREE.Vector2(x, y))
    );
    const g = new THREE.LatheGeometry(profile.getPoints(72), 112);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getZ(i));
      p.setZ(i, p.getZ(i) * (1 - 0.4 * THREE.MathUtils.smoothstep(r, 0.75, 1.5)));
    }
    g.computeVertexNormals();
    return g;
  }, []);

  // flags on the upper arms (a real EVA suit's placement): India on his
  // right, the US on his left — each sat on the actual surface, facing out
  const flags = useMemo(() => {
    const p = geo.attributes.position;
    const n = geo.attributes.normal;
    return [
      [-1.24, india],
      [1.24, usa],
    ].map(([x0, map]) => {
      // the front-facing vertex nearest (x0, y0) on the fabric
      const y0 = -1.46;
      let best = -1;
      let bd = Infinity;
      for (let i = 0; i < p.count; i++) {
        if (p.getZ(i) <= 0) continue;
        const dd = Math.abs(p.getX(i) - x0) + Math.abs(p.getY(i) - y0);
        if (dd < bd) {
          bd = dd;
          best = i;
        }
      }
      const nrm = new THREE.Vector3(n.getX(best), n.getY(best), n.getZ(best)).normalize();
      const pos = new THREE.Vector3(p.getX(best), p.getY(best), p.getZ(best)).addScaledVector(nrm, 0.012);
      // face out along the surface normal, kept upright
      const m = new THREE.Matrix4().lookAt(pos.clone().add(nrm), pos, new THREE.Vector3(0, 1, 0));
      return { pos, q: new THREE.Quaternion().setFromRotationMatrix(m), map };
    });
  }, [geo, india, usa]);

  // a mission patch on the left chest, sat flush on the curved fabric
  const patch = useMemo(() => {
    // high on the chest, so it stays in frame at the closest zoom
    const x = 0.82;
    const y = -1.2;
    const z = Math.sqrt(1.62 ** 2 - x * x) * 0.6 + 0.01;
    const pos = new THREE.Vector3(x, y, z);
    const n = new THREE.Vector3(x, 0.55, z / 0.36).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    return { pos, q };
  }, []);

  return (
    <group>
      <mesh geometry={geo} material={suitMat} receiveShadow />
      {/* the suit's neck bearing, under the helmet's ring */}
      <mesh position-y={-0.8} rotation-x={Math.PI / 2} material={darkMetalMat} receiveShadow>
        <torusGeometry args={[0.72, 0.07, 20, 96]} />
      </mesh>
      {/* seal indicator — a painted line, not a light */}
      <mesh position-y={-0.765} rotation-x={Math.PI / 2} material={accentPaintMat}>
        <torusGeometry args={[0.735, 0.009, 8, 128]} />
      </mesh>
      {flags.map((fl, i) => (
        <mesh key={i} position={fl.pos} quaternion={fl.q} receiveShadow>
          <planeGeometry args={[0.25, 0.156]} />
          <meshStandardMaterial map={fl.map} roughness={0.88} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ))}
      <group position={patch.pos} quaternion={patch.q}>
        <mesh receiveShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.014, 40]} />
          <meshStandardMaterial color="#23252c" roughness={0.8} />
        </mesh>
        <mesh position-y={0.008} rotation-x={-Math.PI / 2} material={accentPaintMat}>
          <circleGeometry args={[0.075, 40]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── the helmet ───────────────────────────────────────────────────────── */

/** A soft radial glow — a cubic falloff, so it never reads as a disc. */
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      grd.addColorStop(t, `rgba(255,255,255,${((1 - t) ** 3).toFixed(4)})`);
    }
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
}

function Helmet({ revealRef, lightRef, moonDirRef, apertureRef }) {
  const visor = useRef();
  const glow = useRef();
  const lamps = useRef([]);
  const flares = useRef([]);
  const s = useRef({ on: false, onAt: 0, clear: 0 });
  const glowTex = useGlowTexture();

  const sphere = useMemo(() => new THREE.SphereGeometry(R, 128, 96), []);
  // the liner and the glass never show their silhouette — half the detail
  const sphereLo = useMemo(() => new THREE.SphereGeometry(R, 64, 48), []);
  const gasket = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 128; i++) {
      const t = (i / 128) * Math.PI * 2;
      const x = WINDOW.rx * Math.cos(t);
      const y = WINDOW.cy + WINDOW.ry * Math.sin(t);
      pts.push(new THREE.Vector3(x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))).multiplyScalar(R * 1.004));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 256, 0.032, 12, true);
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const st = s.current;
    const r = revealRef.current;

    // the visor swings up on its hinges on the shared reveal — no spring
    if (visor.current) visor.current.rotation.x = -r * MAX_LIFT;

    // The face's exposure: a dim silhouette → it catches the moment the
    // moonbeam lands on the crown (two quick flickers), then holds at full.
    const reach = beamReach(r);
    if (reach >= 1 && !st.on) {
      st.on = true;
      st.onAt = t;
    } else if (reach < 0.85 && st.on) {
      st.on = false;
    }
    let lt = STANDBY;
    if (st.on) {
      const k = t - st.onAt;
      if (k < 0.05) lt = 0.9;
      else if (k < 0.11) lt = 0.2;
      else if (k < 0.17) lt = 1;
      else if (k < 0.23) lt = 0.35;
      else lt = THREE.MathUtils.lerp(0.6, 1, THREE.MathUtils.smoothstep(k, 0.23, 0.6));
    }
    const snap = st.on && t - st.onAt < 0.25; // flicker = instant, ramp = eased
    const next = snap ? lt : lightRef.current + (lt - lightRef.current) * 0.08;
    const l = (lightRef.current = Math.abs(next - lt) < 5e-4 ? lt : next); // settle, then stop

    // the helmet's own lamps and interior light wake with the face
    if (glow.current) glow.current.intensity = 0.3 + l * 2.8;
    lamps.current.forEach((m) => m && (m.emissiveIntensity = 0.1 + l * 2.2));
    flares.current.forEach((sp) => {
      if (!sp) return;
      sp.material.opacity = l * 0.85;
      sp.scale.setScalar(0.16 + l * 0.26);
    });

    // the glass clears from the centre out as the face warms up, then stays
    // clear; it mists back over if the visor closes again
    const clearTo = st.on ? THREE.MathUtils.smoothstep(t - st.onAt, 0.12, 1.9) * 1.3 : 0;
    st.clear = st.on ? clearTo : Math.max(0, st.clear - Math.min(delta, 1 / 20) * 1.5);
    GLASS.clear.value = st.clear;
    GLASS.glow.value = l;
  });

  return (
    <group>
      <mesh geometry={sphere} material={shellMat} castShadow />
      <mesh geometry={sphereLo} material={linerMat} scale={0.97} />
      <mesh geometry={gasket} material={rubberMat} />
      {/* neck ring */}
      <mesh position-y={-0.73} rotation-x={Math.PI / 2} material={metalMat} castShadow>
        <torusGeometry args={[0.69, 0.06, 20, 96]} />
      </mesh>
      {/* side hinges the visor pivots on */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.985, 0.04, 0]} rotation-z={Math.PI / 2}>
          <mesh material={metalMat}>
            <cylinderGeometry args={[0.13, 0.13, 0.06, 32]} />
          </mesh>
          <mesh position-y={sd * 0.035}>
            <cylinderGeometry args={[0.05, 0.05, 0.02, 24]} />
            <meshStandardMaterial color={PALETTE.accent} emissive={PALETTE.accent} emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
      {/* helmet lamps — they wake with the interior light */}
      {[-1, 1].map((sd, i) => (
        <group key={sd} position={[sd * 0.66, 0.6, 0.46]} rotation={[-0.3, sd * 0.55, 0]}>
          <mesh material={rubberMat} castShadow>
            <boxGeometry args={[0.2, 0.12, 0.14]} />
          </mesh>
          <mesh position-z={0.072}>
            <planeGeometry args={[0.15, 0.08]} />
            <meshStandardMaterial ref={(el) => (lamps.current[i] = el)} color="#fff4e2" emissive="#ffd9a8" emissiveIntensity={0.1} toneMapped={false} />
          </mesh>
          <sprite ref={(el) => (flares.current[i] = el)} position-z={0.1}>
            <spriteMaterial map={glowTex} color="#ffd6a0" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        </group>
      ))}

      <Face lightRef={lightRef} moonDirRef={moonDirRef} apertureRef={apertureRef} />
      {/* the interior light — standby glow, then the power-up */}
      <pointLight ref={glow} position={[0.25, 0.25, 0.5]} color="#ffd6a0" intensity={0.3} distance={2.6} decay={2} />
      {/* the pressure bubble across the opening */}
      <mesh geometry={sphereLo} material={glassMat} scale={0.996} renderOrder={1} />

      {/* the visor, on its hinge (x-axis through the centre) */}
      <group ref={visor}>
        <mesh geometry={sphere} material={visorMat} scale={1.018} renderOrder={2} />
      </group>
    </group>
  );
}

/* ── clock, camera, layout ────────────────────────────────────────────── */

/**
 * Scroll → displayed progress, so a fast flick can never skip the sequence:
 *
 *   · the displayed value chases the raw scroll value with a damped step
 *     (deliberate scrolling reads ~1:1), but can't move faster than one
 *     full run per MIN_RUN seconds — a hard flick plays the whole sequence
 *     at that top speed instead of jumping to its end
 *   · snap-to-completion: once the scroll has settled (IDLE seconds), a
 *     raw value above SNAP_HI glides the rest of the way to 1, and one
 *     below SNAP_LO glides back to 0, over SNAP seconds — it holds there
 *     until the scroll moves clearly away
 *
 * Only the picture is paced; the page scroll itself is never touched.
 */
const MIN_RUN = 1.1;
const DAMP = 12;
const SNAP = { hi: 0.85, lo: 0.1, dur: 0.42, idle: 0.16 };
const newChannel = () => ({ cur: 0, raw: -1, still: 0, latch: null, from: 0, t: 0 });
function pace(ch, raw, delta, first) {
  const dt = Math.min(delta, 1 / 20);
  if (first) {
    ch.cur = ch.raw = raw; // arrive where the page already is
    return raw;
  }
  // how long the scroll has been still
  if (raw !== ch.raw) {
    ch.raw = raw;
    ch.still = 0;
  } else ch.still += dt;

  // release a snap once the scroll moves clearly away from it
  if ((ch.latch === 1 && raw < SNAP.hi - 0.05) || (ch.latch === 0 && raw > SNAP.lo + 0.05)) ch.latch = null;
  // engage one when the scroll settles near an end
  if (ch.latch === null && ch.still > SNAP.idle) {
    const to = raw >= SNAP.hi && ch.cur < 1 ? 1 : raw <= SNAP.lo && ch.cur > 0 ? 0 : null;
    if (to !== null) Object.assign(ch, { latch: to, from: ch.cur, t: 0 });
  }

  if (ch.latch !== null) {
    ch.t = Math.min(ch.t + dt, SNAP.dur);
    const k = ch.t / SNAP.dur;
    ch.cur = THREE.MathUtils.lerp(ch.from, ch.latch, 1 - (1 - k) * (1 - k));
    return ch.cur;
  }
  const d = raw - ch.cur;
  if (Math.abs(d) < 1e-4) return (ch.cur = raw);
  const cap = dt / MIN_RUN;
  ch.cur += THREE.MathUtils.clamp(d * (1 - Math.exp(-dt * DAMP)), -cap, cap);
  return ch.cur;
}

/**
 * The clock. `reveal` (visor, dolly, moon, beam, focus, lines) runs over the
 * first runway; `layout` (the glide to the resting layout) over the second —
 * the same pacing, then the same ease.
 */
/** The helmet has weight: when the glide lands, it runs a hair past its mark
 *  and eases back once — a single hump, then still. */
const SETTLE = { amp: 0.028, dur: 0.6 };
const settleHump = (k) => Math.sin(Math.PI * k) * (1 - k);

function RevealDriver({ progressRef, layoutProgressRef, revealRef, layoutRef, settleRef }) {
  const first = useRef(true);
  const ch = useRef({ reveal: newChannel(), layout: newChannel(), settle: -1 });
  useFrame((_, delta) => {
    const c = ch.current;
    const p = pace(c.reveal, progressRef.current, delta, first.current);
    const l = revealEase(pace(c.layout, layoutProgressRef.current, delta, first.current));
    revealRef.current = revealEase(THREE.MathUtils.clamp((p - REVEAL_FROM) / (REVEAL_TO - REVEAL_FROM), 0, 1));

    // arrival settle (not on the first frame, and re-armed once it leaves)
    if (l >= 1 && c.settle < 0 && !first.current && layoutRef.current < 1) c.settle = 0;
    if (l < 0.98) c.settle = -1;
    let bump = 0;
    if (c.settle >= 0 && c.settle < SETTLE.dur) {
      c.settle = Math.min(SETTLE.dur, c.settle + Math.min(delta, 1 / 20));
      bump = SETTLE.amp * settleHump(c.settle / SETTLE.dur);
    }
    layoutRef.current = l + bump;
    settleRef.current = bump; // the headline lands on the same beat
    first.current = false;
  });
  return null;
}

/** The camera dollies in on the reveal, then holds — the layout moves the
 *  helmet, not the camera (so the moon, a far background, stays put). No
 *  pointer parallax. Narrow screens pull back to keep the helmet whole. */
/** Held moments (at rest, and once everything has settled) get a barely-there
 *  handheld drift — about 0.15°, on slow, never-repeating sines — so the frame
 *  reads as filmed. It fades out whenever anything is moving, and is off for
 *  reduced motion. */
const DRIFT = { amp: 0.014 };
function Rig({ revealRef, layoutRef, camBaseRef, still, headlineRef, settleRef }) {
  const w = useRef(0);
  const txt = useRef('');
  useFrame(({ camera, size, clock }, delta) => {
    const r = revealRef.current;
    const L = layoutRef.current;
    const aspect = size.width / size.height;
    const z = Math.max(THREE.MathUtils.lerp(CAM.z[0], CAM.z[1], r), 1.25 / (0.268 * aspect));
    const lookY = THREE.MathUtils.lerp(CAM.lookY[0], CAM.lookY[1], r);
    camBaseRef.current.set(0, lookY + CAM.lift, z);

    const S = THREE.MathUtils.smoothstep;
    const moving = S(L, 0, 0.04) * (1 - S(L, 0.96, 1));
    const held = still ? 0 : Math.max(1 - S(r, 0, 0.06), S(r, 0.94, 1) * (1 - moving));
    w.current += (held - w.current) * (1 - Math.exp(-Math.min(delta, 1 / 20) * 1.2));
    const t = clock.elapsedTime;
    const a = DRIFT.amp * w.current;
    const ox = a * (0.7 * Math.sin(t * 0.31) + 0.3 * Math.sin(t * 0.73 + 1.3));
    const oy = a * 0.7 * (0.7 * Math.sin(t * 0.23 + 0.6) + 0.3 * Math.sin(t * 0.61 + 2.1));
    camera.position.set(ox, lookY + CAM.lift + oy, z);
    camera.lookAt(ox * 0.4, lookY + oy * 0.4, 0);

    // the headline sits in the same space: it takes the drift as parallax
    // (a nearer layer, so a touch more than the helmet does), and the
    // landing settle — the exact same overshoot, on the same frame, as the
    // helmet's glide — so the whole frame lands as one
    const el = headlineRef?.current;
    if (el) {
      const px = size.height / 2 / (z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      const rest = restingLayout(aspect);
      const b = settleRef?.current ?? 0;
      const sx = b * rest.x * (size.width / 2);
      const sy = -b * rest.y * (size.height / 2);
      const v = `translate3d(${(sx - ox * px * 0.9).toFixed(2)}px, ${(sy + oy * px * 0.9).toFixed(2)}px, 0)`;
      if (v !== txt.current) {
        txt.current = v;
        el.style.setProperty('transform', v);
      }
    }
  });
  return null;
}

/** Where the helmet rests once the headline is in: in frame units (NDC) plus
 *  a scale. Wide screens: the left third. Narrow: up top, the text below. */
function restingLayout(aspect) {
  return aspect >= 1.15 ? { x: -0.5, y: 0.06, s: 0.8 } : { x: 0, y: 0.5, s: 0.5 };
}

/**
 * The glide: helmet + suit translate and scale from the centred reveal to
 * the resting layout on `layout`, then pin. The moonlight's shadow frame
 * follows the helmet so its shadow on the suit stays exact.
 */
/** An extra turn of the head relative to the lens, in radians (+ = toward the
 *  viewer's right). Zero while the portrait is a frontal photo — the hook for
 *  a later head-turn sequence. */
const LOOK = { yaw: 0, pitch: 0 };

/** The helmet notices you: it turns a few degrees toward the cursor (mouse
 *  only), easing after it like a slow head turn. ~6° across the frame. */
const TRACK = { yaw: 0.11, pitch: 0.07, ease: 2.6 };

function Layout({ layoutRef, moonDirRef, lightRef, camBaseRef, bodyRef, headRef, still, children }) {
  const group = useRef();
  const look = useRef({ x: 0, y: 0, tx: 0, ty: 0, sig: '' });
  useEffect(() => {
    if (still) return;
    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      look.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      look.current.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onLeave = () => {
      look.current.tx = 0;
      look.current.ty = 0;
    };
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [still]);
  useFrame(({ camera, size, gl }, delta) => {
    const g = group.current;
    if (!g) return;
    const L = layoutRef.current;
    const rest = restingLayout(size.width / size.height);
    const half = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const x = rest.x * half * (size.width / size.height);
    const y = CAM.lookY[1] + rest.y * half; // helmet centre, world
    g.position.set(x * L, y * L, 0);
    g.scale.setScalar(THREE.MathUtils.lerp(1, rest.s, L));

    // aim: the helmet's opening points straight at the lens from wherever it
    // sits in frame (the camera's base pose, not its drift), so the frontal
    // portrait and the shell always agree. The body follows half-way, like a
    // head turning over the shoulders.
    const c = camBaseRef.current;
    const dx = c.x - g.position.x;
    const dy = c.y - g.position.y;
    const dz = c.z - g.position.z;
    const lk = look.current;
    const kk = 1 - Math.exp(-Math.min(delta, 1 / 20) * TRACK.ease);
    lk.x += (lk.tx - lk.x) * kk;
    lk.y += (lk.ty - lk.y) * kk;
    if (Math.abs(lk.tx - lk.x) < 1e-4) lk.x = lk.tx;
    if (Math.abs(lk.ty - lk.y) < 1e-4) lk.y = lk.ty;
    const yaw = Math.atan2(dx, dz) + LOOK.yaw + lk.x * TRACK.yaw;
    const pitch = -Math.atan2(dy, Math.hypot(dx, dz)) + LOOK.pitch - lk.y * TRACK.pitch;
    bodyRef.current?.rotation.set(pitch * 0.5, yaw * 0.5, 0, 'YXZ');
    headRef.current?.rotation.set(pitch * 0.5, yaw * 0.5, 0, 'YXZ');

    const light = lightRef.current;
    if (light) {
      light.target.position.copy(g.position);
      light.target.updateMatrixWorld();
      light.position.copy(g.position).addScaledVector(moonDirRef.current, 9);
    }

    // the shadow map only redraws when something that casts it has moved
    gl.shadowMap.autoUpdate = false;
    const sig = `${g.position.x.toFixed(4)}|${g.position.y.toFixed(4)}|${g.scale.x.toFixed(4)}|${yaw.toFixed(4)}|${pitch.toFixed(4)}|${moonDirRef.current.x.toFixed(4)}|${moonDirRef.current.y.toFixed(4)}`;
    if (sig !== lk.sig) {
      lk.sig = sig;
      gl.shadowMap.needsUpdate = true;
    }
  });
  return <group ref={group}>{children}</group>;
}

/**
 * The reflection map — built from the moon alone (its disc and the sky it
 * lights), rendered into a cube map only when the moon moves.
 */
function ReflectionRoom({ dirtyRef, children }) {
  const get = useThree((st) => st.get);
  const [room] = useState(() => new THREE.Scene());
  const fbo = useMemo(() => {
    const t = new THREE.WebGLCubeRenderTarget(256);
    t.texture.type = THREE.HalfFloatType;
    return t;
  }, []);
  const cube = useMemo(() => new THREE.CubeCamera(0.1, 100, fbo), [fbo]);
  useEffect(() => {
    const { scene } = get();
    const prev = scene.environment;
    scene.environment = fbo.texture;
    return () => {
      scene.environment = prev;
      fbo.dispose();
    };
  }, [get, fbo]);
  useFrame(({ gl }) => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    const ac = gl.autoClear;
    gl.autoClear = true;
    cube.update(gl, room);
    gl.autoClear = ac;
  });
  return createPortal(children, room);
}

/** A sparse starfield for the reflection map: pinpricks the clearcoat and the
 *  glass pick up. Static, generated once from a fixed seed. */
const starGeo = (() => {
  const rand = rng(7);
  const n = 480;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const q = Math.sqrt(1 - u * u);
    pos.set([q * Math.cos(th) * 40, u * 40, q * Math.sin(th) * 40], i * 3);
    const b = 0.06 + Math.pow(rand(), 8) * 0.55; // mostly faint pinpricks, a rare brighter one
    col.set([b * 0.92, b * 0.96, b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
})();

function Stars() {
  return (
    <points geometry={starGeo}>
      <pointsMaterial vertexColors size={1.6} sizeAttenuation={false} toneMapped={false} />
    </points>
  );
}

/* ── the moon ─────────────────────────────────────────────────────────── */

const MOON_R = 1.1;
const MOON_Z = -14;
const MOON_LIGHT = '#dce6ff';
/**
 * The moon's path: a true circular arc, laid out in frame units (half the
 * frame's height = 1, so it holds its shape on any screen). It rises from
 * off-frame lower right and curves over to rest in the upper right.
 */
const ARC = { end: [-0.8, 0.6], toCentre: [-1.0, -2.2], from: 25 };
const ARC_R = Math.hypot(...ARC.toCentre);
const ARC_TO = THREE.MathUtils.radToDeg(Math.atan2(-ARC.toCentre[1], -ARC.toCentre[0]));
function moonAt(r, camera, aspect, out) {
  const half = (camera.position.z - MOON_Z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const ex = Math.max(aspect * 0.55, aspect + ARC.end[0]);
  const cx = ex + ARC.toCentre[0];
  const cy = ARC.end[1] + ARC.toCentre[1];
  const th = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(ARC.from, ARC_TO, r));
  return out.set((cx + ARC_R * Math.cos(th)) * half, CAM.lookY[1] + (cy + ARC_R * Math.sin(th)) * half, MOON_Z);
}
/** Direction the moonlight arrives from: its bearing on screen, brought
 *  round toward the viewer so it lights the side of the helmet we see (a
 *  light truly behind would leave the front black). Low side-light as it
 *  rises → a high key from the upper right, rimming the right side. */
function moonLightDir(pos, out) {
  return out.set(pos.x, pos.y, 5).normalize();
}
/** The moon only comes up to its (modest) full brightness late — the face,
 *  lit the moment it's uncovered, always leads. */
const moonGain = (r) => THREE.MathUtils.lerp(0.35, 1, THREE.MathUtils.smoothstep(r, 0.45, 1));

const moonVert = /* glsl */ `
  varying vec3 vObj;
  varying float vMu;
  void main() {
    vObj = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vMu = dot(normalize(normalMatrix * normal), normalize(-mv.xyz));
    gl_Position = projectionMatrix * mv;
  }
`;
const moonFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGain;
  varying vec3 vObj;
  varying float vMu;
  float spot(vec3 n, vec3 c, float r) {
    return 1.0 - smoothstep(r * 0.3, r, distance(n, normalize(c)));
  }
  void main() {
    vec3 n = normalize(vObj);
    // maria: broad, soft, muted
    float m = spot(n, vec3(-0.35, 0.35, 0.87), 0.44) * 0.9;
    m = max(m, spot(n, vec3(0.28, 0.42, 0.86), 0.3));
    m = max(m, spot(n, vec3(0.08, -0.12, 0.99), 0.26) * 0.75);
    m = max(m, spot(n, vec3(-0.5, -0.32, 0.8), 0.22) * 0.7);
    // a few small craters
    float c = spot(n, vec3(0.34, -0.55, 0.76), 0.08) + spot(n, vec3(-0.12, 0.72, 0.68), 0.07)
            + spot(n, vec3(0.62, 0.12, 0.77), 0.06) + spot(n, vec3(-0.66, 0.1, 0.74), 0.05);
    // a real sphere: sunlit from the left (a waxing gibbous), a soft terminator, and a
    // faint earthshine on the night side
    float sun = dot(n, normalize(vec3(-0.82, 0.3, 0.48)));
    float lit = mix(0.05, 1.0, smoothstep(-0.12, 0.42, sun));
    float mu = clamp(vMu, 0.0, 1.0);
    vec3 col = uColor * (1.0 - 0.17 * m - 0.07 * min(c, 1.0)) * lit * uGain;
    col *= mix(0.8, 1.0, sqrt(mu));            // gentle limb darkening
    float a = smoothstep(0.0, 0.55, mu);        // feathered limb
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

function Moon({ revealRef, moonDirRef, moonPosRef, discRef, skyRef, envDirtyRef }) {
  const moon = useRef();
  const halo = useRef();
  const last = useRef({ r: -1, w: 0, h: 0 });
  const glowTex = useGlowTexture();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const disc = useMemo(() => new THREE.Color(MOON_LIGHT), []);
  // pale blue-white, and dimmer than the lit face
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#b8c7de').multiplyScalar(0.42) }, uGain: { value: 0.35 } }), []);

  useFrame(({ camera, size }) => {
    const r = revealRef.current;
    const l = last.current;
    if (r === l.r && size.width === l.w && size.height === l.h) return; // settled: nothing moves
    Object.assign(l, { r, w: size.width, h: size.height });
    const gain = moonGain(r);
    const p = moonAt(r, camera, size.width / size.height, tmp);
    moon.current?.position.copy(p);
    moonPosRef.current.copy(p);
    if (moon.current) moon.current.material.uniforms.uGain.value = gain;
    if (halo.current) {
      halo.current.position.set(p.x, p.y, p.z - 0.5);
      halo.current.material.opacity = 0.16 * gain;
    }
    const d = moonLightDir(p, moonDirRef.current);
    // the same bearing in the reflection map
    const lf = discRef.current;
    if (lf) {
      lf.position.copy(d).multiplyScalar(8);
      lf.lookAt(0, 0, 0);
      lf.material.color.copy(disc).multiplyScalar(3 * gain);
    }
    if (skyRef.current) {
      skyRef.current.position.copy(d).multiplyScalar(9);
      skyRef.current.lookAt(0, 0, 0);
    }
    envDirtyRef.current = true;
  });

  return (
    <>
      <sprite ref={halo} scale={MOON_R * 7} renderOrder={-2}>
        <spriteMaterial map={glowTex} color="#c8d6ee" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <mesh ref={moon} renderOrder={-1}>
        <sphereGeometry args={[MOON_R, 64, 48]} />
        <shaderMaterial uniforms={uniforms} vertexShader={moonVert} fragmentShader={moonFrag} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

/* ── the Earth ────────────────────────────────────────────────────────── */

/**
 * A calm, dotted Earth high in the frame — whole, never cropped — behind the
 * helmet's crown at first and behind the name once the layout resolves,
 * paired with the moon beside it: depth and a place in the world, not a
 * storyteller. Bhopal and Philadelphia are marked, and once, as the headline
 * glides into place, a small amber point travels the great circle between
 * them (no trail), landing on the same beat as the settle, with a soft ring
 * at each end. Lit by the moon like everything else.
 * It fades away as the story arrives.
 *
 * Land dots come from public/meet/earth-dots.bin (scripts/bake-earth-dots.mjs);
 * until that file exists the globe stays hidden (a bare rim reads as a ring).
 */
const EARTH = { z: -8, ndc: [0.12, 0.62], r: 0.5 }; // centre (frame units) + radius (half-heights)
const PLACES = {
  bhopal: { lat: 23.2599, lng: 77.4126 },
  philadelphia: { lat: 39.9526, lng: -75.1652 },
};
/** The flight rides the glide itself: the point leaves Bhopal once the glide
 *  is `from` of the way in and lands in Philadelphia exactly when the glide
 *  lands — on the same beat as the helmet's and the headline's settle. It
 *  shares the glide's ease, so it slows into Philadelphia as the helmet slows
 *  into place. Scroll back and it flies back. Rings: `ring` seconds. */
const FLIGHT = { from: 0.15, ring: 1.3 };
const latLng = ({ lat, lng }) => {
  const a = THREE.MathUtils.degToRad(lat);
  const o = THREE.MathUtils.degToRad(lng);
  return new THREE.Vector3(Math.cos(a) * Math.sin(o), Math.sin(a), Math.cos(a) * Math.cos(o));
};

/** Turn the globe so the route's midpoint faces the viewer and the route
 *  runs level — India on the right, America on the left, as on a map. */
const EARTH_TURN = (() => {
  const b = latLng(PLACES.bhopal);
  const p = latLng(PLACES.philadelphia);
  const m = b.clone().add(p).normalize();
  const c = b.clone().sub(p).addScaledVector(m, -b.clone().sub(p).dot(m)).normalize(); // Philly → Bhopal, across m
  const nL = new THREE.Vector3().crossVectors(m, c);
  const Z = new THREE.Vector3(0, 0.08, 1).normalize();
  const X = new THREE.Vector3(1, 0, 0).addScaledVector(Z, -Z.x).normalize();
  const Y = new THREE.Vector3().crossVectors(Z, X);
  const local = new THREE.Matrix4().makeBasis(c, nL, m);
  const world = new THREE.Matrix4().makeBasis(X, Y, Z);
  return new THREE.Quaternion().setFromRotationMatrix(world.multiply(local.transpose()));
})();

/** The route: the great circle, lifted into a shallow arc above the surface. */
const ROUTE = (() => {
  const b = latLng(PLACES.bhopal);
  const p = latLng(PLACES.philadelphia);
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const t = i / 96;
    const v = new THREE.Vector3().copy(b).lerp(p, t).normalize(); // nlerp ≈ slerp at this scale
    pts.push(v.multiplyScalar(1.004 + Math.sin(Math.PI * t) * 0.07));
  }
  return new THREE.CatmullRomCurve3(pts);
})();

const earthDotVert = /* glsl */ `
  uniform vec3 uMoon;
  uniform float uPx;
  uniform float uIntro;  // 0 → 1: dots switch on one by one, scattered
  varying float vLit;
  varying float vFace;
  varying float vOn;
  void main() {
    float seed = fract(sin(dot(position, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    vOn = smoothstep(seed * 0.8, seed * 0.8 + 0.2, uIntro);
    vec3 n = normalize(mat3(modelMatrix) * position);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vLit = smoothstep(-0.25, 0.6, dot(n, uMoon));
    vFace = smoothstep(0.0, 0.4, dot(n, normalize(cameraPosition - wp.xyz)));
    gl_PointSize = uPx;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const earthDotFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vLit;
  varying float vFace;
  varying float vOn;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.25, 0.5, d)) * uOpacity * (0.16 + 0.84 * vLit) * vFace * vOn;
    gl_FragColor = vec4(uColor, a);
  }
`;
function useRingTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(64, 64, 56, 0, Math.PI * 2);
    g.stroke();
    return new THREE.CanvasTexture(c);
  }, []);
}

function Earth({ layoutRef, moonDirRef, storyInRef }) {
  const group = useRef();
  const dots = useRef();
  const head = useRef();
  const markers = useRef([]);
  const pulses = useRef([]);
  const [dotGeo, setDotGeo] = useState(null);
  const glowTex = useGlowTexture();
  const ringTex = useRingTexture();
  const st = useRef({ key: '', prevF: -1, departT: -1e9, landT: -1e9 });
  const tip = useMemo(() => new THREE.Vector3(), []);
  const dotUniforms = useMemo(() => ({ uColor: { value: new THREE.Color(PALETTE.ink) }, uOpacity: { value: 0 }, uMoon: { value: new THREE.Vector3(1, 0, 0) }, uPx: { value: 2 }, uIntro: { value: 0 } }), []);
  const intro = useRef({ t0: -1, k: 0 });
  const places = useMemo(() => [latLng(PLACES.bhopal).multiplyScalar(1.006), latLng(PLACES.philadelphia).multiplyScalar(1.006)], []);

  useEffect(() => {
    let live = true;
    fetch('/meet/earth-dots.bin')
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((buf) => {
        if (!live || !buf) return;
        const ll = new Int16Array(buf);
        const pos = new Float32Array((ll.length / 2) * 3);
        for (let i = 0; i < ll.length / 2; i++) latLng({ lat: ll[i * 2] / 100, lng: ll[i * 2 + 1] / 100 }).toArray(pos, i * 3);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        setDotGeo(g);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  useFrame(({ camera, size, clock, viewport }) => {
    const g = group.current;
    if (!g) return;
    const L = layoutRef.current;
    const s = st.current;
    const away = storyInRef?.current ?? 0;
    // the entry sparkle: from the first frame the dots are drawn, ~0.5s in,
    // over ~1.8s
    const it = intro.current;
    if (dotGeo && it.t0 < 0) it.t0 = clock.elapsedTime;
    const introK = it.t0 < 0 ? 0 : THREE.MathUtils.clamp((clock.elapsedTime - it.t0 - 0.5) / 1.8, 0, 1);
    const introChanged = introK !== it.k;
    it.k = introK;
    // present from the first frame; leaves as the story comes in
    const k = dotGeo ? 1 - THREE.MathUtils.smoothstep(away, 0, 0.7) : 0;

    // the flight: its progress IS the glide's (settle overshoot clamped off)
    const now = clock.elapsedTime;
    const f = THREE.MathUtils.clamp((Math.min(L, 1) - FLIGHT.from) / (1 - FLIGHT.from), 0, 1);
    if (s.prevF < 0) s.prevF = f; // first frame: arrive where the page is, no rings
    if (f > 0 && s.prevF === 0) s.departT = now; // leaves Bhopal
    if (f >= 1 && s.prevF < 1) s.landT = now; // lands in Philadelphia — the settle's beat
    s.prevF = f;
    const departQ = THREE.MathUtils.clamp((now - s.departT) / FLIGHT.ring, 0, 1);
    const landQ = THREE.MathUtils.clamp((now - s.landT) / FLIGHT.ring, 0, 1);
    const ringing = departQ < 1 || landQ < 1;

    const key = `${L}|${away}|${!!dotGeo}|${size.width}|${size.height}|${camera.position.z.toFixed(3)}|${moonDirRef.current.x.toFixed(4)}`;
    if (!ringing && !introChanged && key === s.key) return; // settled: nothing moves
    s.key = key;

    // place: high in the frame, sized to it; it drifts up a touch as it leaves
    const d = camera.position.z - EARTH.z;
    const half = d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const aspect = size.width / size.height;
    g.position.set(EARTH.ndc[0] * half * aspect, CAM.lookY[1] + (EARTH.ndc[1] + (1 - k) * 0.1) * half, EARTH.z);
    g.scale.setScalar(EARTH.r * half);
    g.visible = k > 1e-3;

    const du = dots.current?.material.uniforms;
    if (du) {
      du.uOpacity.value = 0.72 * k;
      du.uIntro.value = introK;
      du.uMoon.value.copy(moonDirRef.current);
      du.uPx.value = 1.8 * viewport.dpr;
    }
    markers.current.forEach((m) => m && (m.material.opacity = 0.85 * k));

    // the traveller: a small point along the great circle, no trail; once
    // it lands it glows on Philadelphia and fades with the landing ring
    const h = head.current;
    if (h) {
      const op = f < 1 ? THREE.MathUtils.smoothstep(f, 0, 0.06) : 1 - landQ;
      h.visible = f > 0 && op > 1e-3;
      if (h.visible) h.position.copy(ROUTE.getPointAt(f, tip));
      h.material.opacity = k * 0.9 * op;
    }
    // one soft ring as it leaves Bhopal, one as it lands in Philadelphia
    [departQ, landQ].forEach((q, i) => {
      const ring = pulses.current[i];
      if (!ring) return;
      ring.visible = q > 0 && q < 1;
      ring.scale.setScalar(0.04 + q * 0.26);
      ring.material.opacity = k * (1 - q) * 0.7;
    });
  });

  return (
    <group ref={group} quaternion={EARTH_TURN} visible={false}>
      {/* the solid body: hides the far side's dots (and the moon behind it) */}
      <mesh renderOrder={-3}>
        <sphereGeometry args={[0.995, 64, 48]} />
        <meshBasicMaterial colorWrite={false} />
      </mesh>
      {dotGeo && (
        <points ref={dots} geometry={dotGeo} renderOrder={-2}>
          <shaderMaterial uniforms={dotUniforms} vertexShader={earthDotVert} fragmentShader={earthDotFrag} transparent depthWrite={false} />
        </points>
      )}
      <sprite ref={head} scale={0.11} visible={false} renderOrder={-1}>
        <spriteMaterial map={glowTex} color={PALETTE.accentHi} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      {places.map((p, i) => (
        <group key={i} position={p}>
          <sprite ref={(el) => (markers.current[i] = el)} scale={0.075}>
            <spriteMaterial map={glowTex} color={PALETTE.accent} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
          <sprite ref={(el) => (pulses.current[i] = el)} visible={false}>
            <spriteMaterial map={ringTex} color={PALETTE.accent} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        </group>
      ))}
    </group>
  );
}

/* ── the moonbeam ─────────────────────────────────────────────────────── */

/** The beam's leading edge travels moon → crown over this slice of the
 *  reveal; landing (reach = 1) is what powers the face on. Timed to land
 *  as the hinged visor has mostly lifted clear of the face. */
const BEAM = { fadeIn: [0.45, 0.6], travel: [0.55, 0.85], peak: 0.13, rest: 0.12 };
const beamReach = (r) => THREE.MathUtils.smoothstep(r, BEAM.travel[0], BEAM.travel[1]);

const beamVert = /* glsl */ `
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFacing = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`;
const beamFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uReach;
  varying vec2 vUv;
  varying float vFacing;
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  void main() {
    float s = 1.0 - vUv.y;                                  // 0 at the moon → 1 at the crown
    float front = 1.0 - smoothstep(uReach - 0.12, uReach, s); // soft leading edge
    float along = mix(1.0, 0.5, s) * smoothstep(0.0, 0.1, s); // brightest by the moon
    float sides = pow(clamp(vFacing, 0.0, 1.0), 1.6);       // feathered sides: a shaft, not a cone
    float grain = 0.88 + 0.24 * (hash(floor(gl_FragCoord.xy)) - 0.5); // static dither: air, not plastic
    gl_FragColor = vec4(uColor, uOpacity * front * along * sides * grain);
  }
`;

/**
 * A soft shaft of moonlight from the moon down onto the helmet's crown. It
 * fades in as the moon nears the top of its arc, its edge travels down to
 * the crown, and then it thins to a faint trace once the layout settles.
 * Updates only when something it depends on moves.
 */
function Moonbeam({ revealRef, layoutRef, moonPosRef, apertureRef }) {
  const mesh = useRef();
  const last = useRef({ r: -1, l: -1 });
  const tmp = useMemo(() => ({ d: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), c: new THREE.Vector3(), m: new THREE.Vector3() }), []);
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(MOON_LIGHT) }, uOpacity: { value: 0 }, uReach: { value: 0 } }), []);

  useFrame(() => {
    const m = mesh.current;
    const crown = apertureRef.current.crown;
    if (!m) return;
    const r = revealRef.current;
    const l = layoutRef.current;
    const k = last.current;
    if (k.r === r && k.l === l && tmp.c.equals(crown) && tmp.m.equals(moonPosRef.current)) return; // settled
    Object.assign(k, { r, l });
    tmp.c.copy(crown);
    tmp.m.copy(moonPosRef.current);

    const top = moonPosRef.current;
    const d = tmp.d.subVectors(top, crown);
    const len = d.length();
    m.position.copy(crown).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(tmp.up, d.divideScalar(len));
    m.scale.set(1, len, 1);

    const u = m.material.uniforms;
    u.uReach.value = beamReach(r);
    u.uOpacity.value = BEAM.peak * THREE.MathUtils.smoothstep(r, BEAM.fadeIn[0], BEAM.fadeIn[1]) * THREE.MathUtils.lerp(1, BEAM.rest, l);
    m.visible = u.uOpacity.value > 1e-4;
  });

  return (
    <mesh ref={mesh} renderOrder={1} visible={false}>
        {/* open-ended: moon end (top) ~ the moon's size, crown end a little narrower */}
        <cylinderGeometry args={[0.95, 0.62, 1, 48, 1, true]} />
        <shaderMaterial uniforms={uniforms} vertexShader={beamVert} fragmentShader={beamFrag} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
  );
}

/**
 * Hitch-free entrance: compile every material off the main thread (where the
 * driver allows) before the first frame is drawn, then tell the page, which
 * fades the canvas in.
 */
function Warmup({ onReady }) {
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  const camera = useThree((st) => st.camera);
  useEffect(() => {
    let live = true;
    const done = () => {
      if (live) onReady?.();
      live = false;
    };
    const job = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera));
    job.then(done, done);
    const guard = setTimeout(done, 1500); // never leave the stage blank
    return () => {
      live = false;
      clearTimeout(guard);
    };
  }, [gl, scene, camera, onReady]);
  return null;
}

/* ── overlay + finish, on the same clock ──────────────────────────────── */

/**
 * Focus rack + finishing pass. Focus moves from the shell's front to the
 * face plate on the reveal while the bokeh opens up, so the background goes
 * softer and the face ends up the sharpest thing in frame.
 */
/** Entry power-up: from the first drawn frame, the light comes up over ~1.6s
 *  (a soft S-curve, with a slow start like a lamp warming), then holds. */
const POWER = { delay: 0.1, dur: 1.6 };

function Finish({ revealRef, layoutRef, apertureRef, frameRef }) {
  const dof = useRef();
  const t0 = useRef(-1);
  const film = useMemo(() => new FilmEffect(), []);
  useEffect(() => () => film.dispose(), [film]);
  useFrame(({ clock }) => {
    if (t0.current < 0) t0.current = clock.elapsedTime;
    const k = THREE.MathUtils.clamp((clock.elapsedTime - t0.current - POWER.delay) / POWER.dur, 0, 1);
    film.uniforms.get('uPower').value = k * k * (3 - 2 * k);
    const e = dof.current;
    const a = apertureRef.current;
    const r = revealRef.current;
    if (e && a.dFace) {
      e.cocMaterial.focusDistance = THREE.MathUtils.lerp(a.dShell, a.dFace, r);
      e.cocMaterial.focusRange = THREE.MathUtils.lerp(2.4, 1.8, r);
      // the background eases back into softer (not lost) focus once the
      // layout resolves, so the globe reads
      e.bokehScale = THREE.MathUtils.lerp(3.5, 7, r) * THREE.MathUtils.lerp(1, 0.42, layoutRef.current);
    }
    const fr = frameRef?.current;
    if (fr) {
      film.uniforms.get('uStage').value.set(fr.left, fr.top, fr.w, fr.h);
      film.uniforms.get('uRoot').value.set(fr.rootW, fr.rootH);
    }
  });
  return (
    <EffectComposer multisampling={0}>
      <DepthOfField ref={dof} focusDistance={5} focusRange={1.6} bokehScale={1.6} />
      <primitive object={film} />
    </EffectComposer>
  );
}

// fetch the portrait as soon as this module loads (well before the room opens)
if (typeof window !== 'undefined') useTexture.preload('/meet/allen-face.webp');

export default function HelmetScene({ progress, layoutProgress, frame, headline, storyIn, still = false, onReady }) {
  const lightRef = useRef(STANDBY);
  const revealRef = useRef(0);
  const layoutRef = useRef(0);
  const settleRef = useRef(0);
  const moonDir = useRef(new THREE.Vector3(1, 0, 0.4).normalize());
  const aperture = useRef({ x: 0, y: 0, rad: 0, dShell: 0, dFace: 0, crown: new THREE.Vector3(0, 1, 0) });
  const moonPos = useRef(new THREE.Vector3(12, -2, MOON_Z));
  const moonLight = useRef();
  const moonDisc = useRef();
  const moonSky = useRef();
  const envDirty = useRef(true);
  const camBase = useRef(new THREE.Vector3(0, 0, CAM.z[0]));
  const body = useRef();
  const head = useRef();

  return (
    <>
      <color attach="background" args={[PALETTE.void]} />
      <RevealDriver progressRef={progress} layoutProgressRef={layoutProgress} revealRef={revealRef} layoutRef={layoutRef} settleRef={settleRef} />
      <Rig revealRef={revealRef} layoutRef={layoutRef} camBaseRef={camBase} still={still} headlineRef={headline} settleRef={settleRef} />

      {/* reflections: the warm studio the helmet was lit in — a warm sheen
          overhead for the gold, ice panels left and right, an amber console
          strip — plus the stars, and the moon (its disc and the sky it lights) */}
      <ReflectionRoom dirtyRef={envDirty}>
        <Stars />
        <Lightformer form="rect" intensity={0.7} color="#ffd9a8" position={[0, 5, 5]} scale={[16, 5, 1]} />
        {/* directly overhead — keeps the lifted visor gold over the crown */}
        <Lightformer form="rect" intensity={0.9} color="#ffc98a" position={[0, 6, -1]} scale={[8, 6, 1]} />
        <Lightformer form="circle" intensity={2.2} color="#ffe2b8" position={[-3, 3, 2]} scale={2.4} />
        <Lightformer form="rect" intensity={1.1} color="#9cc3ff" position={[4, 0.5, -1]} scale={[3, 5, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#9cc3ff" position={[-5, 0.4, 3]} scale={[1.2, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ff9a3c" position={[4.5, -1.2, 3.5]} scale={[4, 0.35, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#2a3150" position={[0, -3, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer ref={moonSky} form="circle" intensity={0.3} color={MOON_LIGHT} position={[8, -1, 4]} scale={16} />
        <Lightformer ref={moonDisc} form="circle" intensity={1} color={MOON_LIGHT} position={[8, -1, 4]} scale={1.3} />
      </ReflectionRoom>

      {/* the warm key, up and to the left, and a little fill */}
      <ambientLight intensity={0.14} />
      <directionalLight position={[-3, 3.5, 4]} intensity={1.8} color="#ffe6c8" />
      {/* the moonlight — a cool accent from the moon's bearing, and the one
          that casts the shadow (positioned by <Layout>) */}
      <directionalLight
        ref={moonLight}
        position={[9, -1, 4]}
        intensity={1.1}
        color={MOON_LIGHT}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      <Moon revealRef={revealRef} moonDirRef={moonDir} moonPosRef={moonPos} discRef={moonDisc} skyRef={moonSky} envDirtyRef={envDirty} />
      <Earth layoutRef={layoutRef} moonDirRef={moonDir} storyInRef={storyIn} />

      <Layout layoutRef={layoutRef} moonDirRef={moonDir} lightRef={moonLight} camBaseRef={camBase} bodyRef={body} headRef={head} still={still}>
        {/* aimed at the lens by <Layout>: the body half-way, the head the rest */}
        <group ref={body}>
          <Suit />
          <group ref={head}>
            <Helmet revealRef={revealRef} lightRef={lightRef} moonDirRef={moonDir} apertureRef={aperture} />
          </group>
        </group>
      </Layout>

      <Moonbeam revealRef={revealRef} layoutRef={layoutRef} moonPosRef={moonPos} apertureRef={aperture} />
      <Finish revealRef={revealRef} layoutRef={layoutRef} apertureRef={aperture} frameRef={frame} />
      <Warmup onReady={onReady} />
    </>
  );
}
