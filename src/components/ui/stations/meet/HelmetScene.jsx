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
 *   · Visor: the gold sun visor rides a track on the shell, like an EMU
 *     helmet's EVVA — its straight leading edge slides up the face and the
 *     visor tucks into a housing over the crown.
 *   · Face: the finished portrait, recessed behind the aperture. It's clipped
 *     to the window geometrically (each pixel traces its view ray back to the
 *     shell) and darkened where the aperture rim blocks the moon.
 *   · Suit: shoulders + upper chest the helmet sits on and shadows.
 *   · Moon: the scene's ONE light. It rises behind the helmet as the visor
 *     opens; the direct light, the shadows, the reflections and the rim
 *     shadow on the face all follow its position.
 *
 *   · Glass: the clear pressure bubble in the opening — it mirrors the moon
 *     and the room, and its condensation clears the moment the face lights.
 *
 * The helmet always aims its opening at the lens (the suit follows half-way),
 * so the frontal portrait and the shell agree from every position.
 *
 * `progress` is a ref (0→1) the page writes from scroll; nothing here
 * re-renders per frame. Everything that moves — hinge, camera, moon, focus
 * rack, leading lines — reads ONE value, `reveal`: the same ease over the
 * same scroll slice. When it lands, the frame is still. A second value on
 * the same ease, `layout`, then glides the helmet to its resting place.
 */

const R = 1; // helmet radius
/** Visor travel, as the height (unit-sphere y) of its leading edge: closed
 *  just under the face opening → tucked under the crown housing's lip. */
const VISOR_CLOSED = -0.56;
const HOUSING_Y = 0.62; // the housing's lip, where the visor disappears
const VISOR_OPEN = HOUSING_Y + 0.03;
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
const FACE = { cx: 0.5, cy: 0.4, w: 0.514, chin: 0.21 };
/** Ear-to-ear spans the opening's full width — the ears run under the rim,
 *  so no gap shows between face and helmet. The crown of the hair runs up
 *  under the top edge; the frame is centred low enough that the chin stays. */
const FACE_FILL = 1.0;
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
    const byChin = (0.98 * ay) / (FACE.cy - FACE.chin);
    // portrait size, in the plate's own (helmet-local) units
    const s = Math.min(byWidth, byChin) / sc;
    u.uUvScale.value = PLATE / s;

    u.uToHelmet.value.copy(helmet.matrixWorld).invert();
    u.uCam.value.copy(camera.position).applyMatrix4(u.uToHelmet.value);
    u.uMoon.value.copy(moonDirRef.current).transformDirection(u.uToHelmet.value);
    u.uLight.value = lightRef.current;

    // for the leading lines + the focus rack
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
/** Height (unit-sphere y) of the visor's leading edge — the one value the
 *  slide animates. */
const VISOR_EDGE = { value: VISOR_CLOSED };
/**
 * The sun visor: a sphere segment on the same centre as the shell, so moving
 * its edge is a true slide along the shell's curve. Its outline is a
 * rounded-corner "box" on the sphere — straight sides, one straight leading
 * edge (a line of latitude: level across the face, gently curved like the
 * shell) — with a dark trim lip along the edges.
 */
const visorMat = new THREE.MeshPhysicalMaterial({
  color: '#dcae68',
  metalness: 1,
  roughness: 0.14,
  transparent: true,
  opacity: 0.5, // a light gold wash: the face's silhouette reads through it
  envMapIntensity: 1.6,
  // a thin clear lacquer over the gold: reflects the moon un-tinted
  clearcoat: 0.35,
  clearcoatRoughness: 0.06,
  side: THREE.DoubleSide,
  depthWrite: false,
});
visorMat.onBeforeCompile = (sh) => {
  sh.uniforms.uEdge = VISOR_EDGE;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nuniform float uEdge;')
    .replace(
      '#include <alphatest_fragment>',
      /* glsl */ `{
        vec3 n = normalize(vObj);
        // signed distance to the visor outline (< 0 inside): |x| < 0.72,
        // y > edge, corners rounded
        const float HALF = 0.72;
        const float RC = 0.09;
        vec2 q = vec2(abs(n.x) - (HALF - RC), (uEdge + RC) - n.y);
        float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - RC;
        if (n.z < 0.05) sd = 1.0;
        float cov = clamp(-sd / max(fwidth(sd), 1e-4) + 0.5, 0.0, 1.0);
        if (cov < 0.02) discard;
        // trim lip: a dark, nearly opaque band just inside the outline
        float trim = 1.0 - smoothstep(0.014, 0.026, -sd);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.07, 0.08), trim);
        diffuseColor.a = mix(diffuseColor.a, 0.96, trim) * cov;
      }
      #include <alphatest_fragment>`
    );
};
visorMat.customProgramCacheKey = () => 'visor-slide';

/**
 * The pressure bubble — clear glass across the opening, just inside the
 * shell. No diffuse colour at all: it only shows what it reflects (moon,
 * stars, the headline), with alpha carried by that reflection, plus a mottled
 * condensation that clears from the centre outward once the face lights.
 */
const GLASS = { fog: { value: 1 }, clear: { value: 0 }, glow: { value: STANDBY } };
const glassMat = cutWindow(
  new THREE.MeshPhysicalMaterial({ color: '#000000', roughness: 0.03, metalness: 0, transparent: true, depthWrite: false, envMapIntensity: 1.2 }),
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

/** The visor housing over the crown: a cap of shell with a trimmed lip the
 *  visor slides in under. */
const housingMat = new THREE.MeshPhysicalMaterial({ color: '#e6e1d7', roughness: 0.34, clearcoat: 0.8, clearcoatRoughness: 0.12, side: THREE.DoubleSide });
const trimMat = new THREE.MeshStandardMaterial({ color: '#26272c', roughness: 0.55, metalness: 0.2 });
const HOUSING = { r: 1.042, phi: 1.2 }; // radius; half-width around the front (rad)
const rubberMat = new THREE.MeshStandardMaterial({ color: '#1b1c21', roughness: 0.7 });
// lamp lenses: satin, low reflection — a lens must never out-shine the face
const lensMat = new THREE.MeshPhysicalMaterial({ color: '#1d1f24', roughness: 0.35, clearcoat: 0.3, clearcoatRoughness: 0.3, envMapIntensity: 0.35 });
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

function Suit() {
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

/**
 * The condensation leaving: as the glass clears, soft puffs of vapour vent
 * out from around the opening and drift off into the room — expanding,
 * thinning, gone — about three seconds, once per power-on. Then nothing
 * moves. Lives in helmet space, so the puffs leave from wherever it is.
 */
const VENT_N = 22;
const VENT_LIFE = 3.2;
const VENT = (() => {
  const rand = rng(23);
  return Array.from({ length: VENT_N }, () => {
    // start on the opening's rim (a little outside the glass)…
    const t = rand() * Math.PI * 2;
    const x = WINDOW.rx * Math.cos(t);
    const y = WINDOW.cy + WINDOW.ry * Math.sin(t);
    const n = new THREE.Vector3(x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y)));
    // …and drift out along the shell's normal, rising a little, spreading
    const vel = n.clone().multiplyScalar(0.22 + rand() * 0.2).add(new THREE.Vector3((rand() - 0.5) * 0.12, 0.08 + rand() * 0.1, 0.1 + rand() * 0.12));
    return { start: n.multiplyScalar(R * 1.03), vel, delay: rand() * 0.55, size: 0.22 + rand() * 0.24, grow: 1.6 + rand() * 1.6, spin: (rand() - 0.5) * 0.6, peak: 0.1 + rand() * 0.1 };
  });
})();
function useSmokeTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const rand = rng(5);
    // a soft, lumpy puff: overlapping soft blobs inside a round falloff
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 34;
      const x = 64 + Math.cos(a) * d;
      const y = 64 + Math.sin(a) * d;
      const r = 18 + rand() * 26;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,0.22)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  }, []);
}
function VentPuffs({ ventRef }) {
  const refs = useRef([]);
  const done = useRef(true);
  const tex = useSmokeTexture();
  useFrame(({ clock }) => {
    const t0 = ventRef.current;
    const age = clock.elapsedTime - t0;
    const live = t0 >= 0 && age < VENT_LIFE + 0.6;
    if (!live) {
      if (!done.current) refs.current.forEach((sp) => sp && (sp.visible = false));
      done.current = true;
      return; // idle: nothing to move
    }
    done.current = false;
    VENT.forEach((v, i) => {
      const sp = refs.current[i];
      if (!sp) return;
      const k = THREE.MathUtils.clamp((age - v.delay) / VENT_LIFE, 0, 1);
      const slow = 1 - (1 - k) * (1 - k); // decelerating, like vapour
      sp.position.copy(v.start).addScaledVector(v.vel, slow * 2.2);
      sp.scale.setScalar(v.size * (1 + v.grow * slow));
      sp.material.rotation = v.spin * slow * 3;
      sp.material.opacity = v.peak * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (k > 0 ? 1 : 0);
      sp.visible = k > 0 && k < 1;
    });
  });
  return VENT.map((v, i) => (
    <sprite key={i} ref={(el) => (refs.current[i] = el)} visible={false} renderOrder={3}>
      <spriteMaterial map={tex} color="#c9d3e2" transparent opacity={0} depthWrite={false} />
    </sprite>
  ));
}

function Helmet({ revealRef, lightRef, moonDirRef, apertureRef, still }) {
  const s = useRef({ on: false, onAt: 0, clear: 0 });
  const vent = useRef(-1); // clock time the vapour started venting (-1: never)

  const sphere = useMemo(() => new THREE.SphereGeometry(R, 128, 96), []);
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

  // the crown housing: a cap over the top-front, and a trim loop round its
  // edge (the lip the visor tucks under, and up over the crown each side)
  const housing = useMemo(() => {
    const T = Math.acos(HOUSING_Y);
    const a = Math.PI / 2 - HOUSING.phi;
    const b = Math.PI / 2 + HOUSING.phi;
    const cap = new THREE.SphereGeometry(HOUSING.r, 96, 40, a, b - a, 0, T);
    const at = (phi, th) => new THREE.Vector3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th)).multiplyScalar(HOUSING.r + 0.004);
    const pts = [];
    for (let i = 0; i <= 48; i++) pts.push(at(a + ((b - a) * i) / 48, T));
    for (let i = 1; i < 16; i++) pts.push(at(b, T * (1 - i / 16)));
    for (let i = 1; i < 16; i++) pts.push(at(a, (T * i) / 16));
    const lip = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), 256, 0.022, 10, true);
    return { cap, lip };
  }, []);

  // lamps ride the housing's flanks, angled out like an EMU's helmet lights
  const lamps = useMemo(
    () =>
      [-1, 1].map((sd) => {
        const dir = new THREE.Vector3(sd * 0.72, 0.5, 0.48).normalize();
        return { sd, pos: dir.clone().multiplyScalar(HOUSING.r + 0.05), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir) };
      }),
    []
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const st = s.current;
    const r = revealRef.current;

    // the visor slides on the shared reveal exactly — no spring, no overshoot
    const edge = THREE.MathUtils.lerp(VISOR_CLOSED, VISOR_OPEN, r);
    VISOR_EDGE.value = edge;

    // The face's exposure: a dim silhouette → it catches the moment the
    // moonbeam lands on the crown (two quick flickers), then holds at full.
    const reach = beamReach(r);
    if (reach >= 1 && !st.on) {
      st.on = true;
      st.onAt = t;
      if (!still) vent.current = t + 0.12; // the vapour leaves as the glass starts to clear
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
    lightRef.current = Math.abs(next - lt) < 5e-4 ? lt : next; // settle, then stop

    // the glass clears from the centre out as the face warms up, then stays
    // clear; it mists back over if the visor closes again
    const clearTo = st.on ? THREE.MathUtils.smoothstep(t - st.onAt, 0.12, 1.9) * 1.3 : 0;
    st.clear = st.on ? clearTo : Math.max(0, st.clear - Math.min(delta, 1 / 20) * 1.5);
    GLASS.clear.value = st.clear;
    GLASS.glow.value = lightRef.current;
  });

  return (
    <group>
      <mesh geometry={sphere} material={shellMat} castShadow />
      <mesh geometry={sphere} material={linerMat} scale={0.97} />
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
          <mesh position-y={sd * 0.035} material={accentPaintMat}>
            <cylinderGeometry args={[0.05, 0.05, 0.02, 24]} />
          </mesh>
        </group>
      ))}
      {/* visor housing over the crown, with its trimmed lip */}
      <mesh geometry={housing.cap} material={housingMat} castShadow />
      <mesh geometry={housing.lip} material={trimMat} />
      {/* helmet lamps — unlit: satin lenses that only faintly catch the moon */}
      {lamps.map(({ sd, pos, q }) => (
        <group key={sd} position={pos} quaternion={q}>
          <mesh material={rubberMat} castShadow>
            <boxGeometry args={[0.19, 0.11, 0.12]} />
          </mesh>
          <mesh position-z={0.062} material={lensMat}>
            <planeGeometry args={[0.14, 0.07]} />
          </mesh>
        </group>
      ))}

      <Face lightRef={lightRef} moonDirRef={moonDirRef} apertureRef={apertureRef} />
      {/* the pressure bubble across the opening */}
      <mesh geometry={sphere} material={glassMat} scale={0.996} renderOrder={1} />
      <VentPuffs ventRef={vent} />

      {/* the visor, on its track between shell and housing */}
      <mesh geometry={sphere} material={visorMat} scale={1.02} renderOrder={2} />
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

function Layout({ layoutRef, moonDirRef, lightRef, camBaseRef, bodyRef, headRef, children }) {
  const group = useRef();
  useFrame(({ camera, size }) => {
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
    const yaw = Math.atan2(dx, dz) + LOOK.yaw;
    const pitch = -Math.atan2(dy, Math.hypot(dx, dz)) + LOOK.pitch;
    bodyRef.current?.rotation.set(pitch * 0.5, yaw * 0.5, 0, 'YXZ');
    headRef.current?.rotation.set(pitch * 0.5, yaw * 0.5, 0, 'YXZ');

    const light = lightRef.current;
    if (light) {
      light.target.position.copy(g.position);
      light.target.updateMatrixWorld();
      light.position.copy(g.position).addScaledVector(moonDirRef.current, 9);
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

/**
 * The headline, as the helmet sees it: the name on a panel off to the right
 * and toward the viewer — where the text sits in frame — so once the helmet
 * glides beside it, the shell and glass carry a faint, mirrored, curved
 * reflection of it. Fades in with the layout; the map re-renders only while
 * that changes.
 */
function HeadlineReflection({ layoutRef, dirtyRef }) {
  const mesh = useRef();
  const last = useRef(-1);
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    return c;
  }, []);
  const tex = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  useEffect(() => {
    // draw in the site's display face once it has loaded
    const probe = document.createElement('span');
    probe.className = 'font-display';
    document.body.appendChild(probe);
    const family = getComputedStyle(probe).fontFamily || 'sans-serif';
    probe.remove();
    let live = true;
    const draw = () => {
      if (!live) return;
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, 1024, 512);
      g.fillStyle = '#fff';
      g.font = `600 170px ${family}`;
      g.fillText('Allen Shaji', 30, 210);
      g.fillText('Varghese', 30, 390);
      const m = mesh.current;
      if (m) m.material.map.needsUpdate = true;
      dirtyRef.current = true;
    };
    draw();
    document.fonts?.ready.then(draw);
    return () => {
      live = false;
    };
  }, [canvas, dirtyRef]);

  useFrame(() => {
    const m = mesh.current;
    const l = layoutRef.current;
    if (!m || l === last.current) return;
    last.current = l;
    const k = THREE.MathUtils.smoothstep(l, 0.45, 1);
    m.material.color.setScalar(1.1 * k);
    m.visible = k > 1e-3;
    dirtyRef.current = true;
  });

  return (
    <mesh ref={mesh} position={[4.2, 0.35, 3.3]} visible={false} onUpdate={(self) => self.lookAt(0, 0, 0)}>
      <planeGeometry args={[3.6, 1.8]} />
      {/* additive: only the letters add light — the panel itself is nothing */}
      <meshBasicMaterial map={tex} color="#000000" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
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

/* ── the moonbeam ─────────────────────────────────────────────────────── */

/** The beam's leading edge travels moon → crown over this slice of the
 *  reveal; landing (reach = 1) is what powers the face on. Timed to land
 *  just after the visor's edge clears the eyes. */
const BEAM = { fadeIn: [0.2, 0.34], travel: [0.28, 0.52], peak: 0.13, rest: 0.12 };
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

/** Dust drifting through the beam: seeds for position along the shaft, angle,
 *  radius and phase. Lit only inside the beam. */
const DUST_N = 420;
const dustGeo = (() => {
  const rand = rng(11);
  const seed = new Float32Array(DUST_N * 4);
  for (let i = 0; i < DUST_N * 4; i++) seed[i] = rand();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_N * 3), 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4); // positions come from the shader
  return g;
})();
const dustVert = /* glsl */ `
  attribute vec4 seed;
  uniform float uLen;
  uniform float uTime;
  uniform float uPx;
  varying float vS;
  varying float vTw;
  varying float vEnds;
  void main() {
    // drift slowly down the shaft (moon → crown), with a lazy sideways sway
    float u = fract(seed.x - uTime * 0.0045 * (0.5 + seed.w));
    float rad = mix(0.62, 0.95, u) * sqrt(seed.z) * 0.92;
    float ang = seed.y * 6.2832 + uTime * 0.04 * (seed.w - 0.5);
    vec3 p = vec3(cos(ang) * rad, (u - 0.5) * uLen, sin(ang) * rad);
    p.x += sin(uTime * 0.13 + seed.w * 6.2832) * 0.035;
    vS = 1.0 - u;
    vEnds = smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.94, 1.0, u));
    vTw = 0.55 + 0.45 * sin(uTime * 0.6 + seed.w * 40.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = clamp((0.7 + 1.6 * fract(seed.w * 13.1)) * uPx / max(-mv.z, 0.5), 1.0, 7.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const dustFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uReach;
  varying float vS;
  varying float vTw;
  varying float vEnds;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = 1.0 - smoothstep(0.1, 0.5, d);
    float inBeam = 1.0 - smoothstep(uReach - 0.12, uReach, vS);
    gl_FragColor = vec4(uColor, disc * inBeam * vEnds * vTw * uOpacity);
  }
`;

/**
 * A soft shaft of moonlight from the moon down onto the helmet's crown. It
 * fades in as the moon nears the top of its arc, its edge travels down to
 * the crown, and then it thins to a faint trace once the layout settles.
 * Updates only when something it depends on moves.
 */
function Moonbeam({ revealRef, layoutRef, moonPosRef, apertureRef, still }) {
  const mesh = useRef();
  const dust = useRef();
  const dustUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(MOON_LIGHT) }, uOpacity: { value: 0 }, uReach: { value: 0 }, uLen: { value: 1 }, uTime: { value: 0 }, uPx: { value: 11 } }),
    []
  );
  const last = useRef({ r: -1, l: -1 });
  const tmp = useMemo(() => ({ d: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), c: new THREE.Vector3(), m: new THREE.Vector3() }), []);
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(MOON_LIGHT) }, uOpacity: { value: 0 }, uReach: { value: 0 } }), []);

  useFrame(({ clock, viewport }) => {
    const m = mesh.current;
    const crown = apertureRef.current.crown;
    if (!m) return;
    // the dust keeps drifting (slowly) while the beam is there
    const du = dust.current?.material.uniforms;
    if (du) {
      if (!still) du.uTime.value = clock.elapsedTime;
      du.uPx.value = 11 * viewport.dpr;
    }
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

    const dp = dust.current;
    if (dp && du) {
      dp.position.copy(m.position);
      dp.quaternion.copy(m.quaternion);
      du.uLen.value = len;
      du.uReach.value = u.uReach.value;
      du.uOpacity.value = Math.min(0.9, u.uOpacity.value * 5.5);
      dp.visible = m.visible;
    }
  });

  return (
    <>
      <mesh ref={mesh} renderOrder={1} visible={false}>
        {/* open-ended: moon end (top) ~ the moon's size, crown end a little narrower */}
        <cylinderGeometry args={[0.95, 0.62, 1, 48, 1, true]} />
        <shaderMaterial uniforms={uniforms} vertexShader={beamVert} fragmentShader={beamFrag} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <points ref={dust} geometry={dustGeo} renderOrder={1} visible={false} frustumCulled={false}>
        <shaderMaterial uniforms={dustUniforms} vertexShader={dustVert} fragmentShader={dustFrag} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </>
  );
}

/**
 * Foreground: a couple of motes of dust very close to the lens. The focus
 * blur turns them into soft discs, and the dolly carries them out through
 * the frame edge — a layer in front of the subject, for depth.
 */
const MOTES = [
  { p: [0.52, -0.63, 5.0], s: 0.05, o: 0.26 },
  { p: [-0.6, -0.18, 4.85], s: 0.035, o: 0.18 },
];
function ForegroundMotes({ revealRef }) {
  const refs = useRef([]);
  const last = useRef(-1);
  const glowTex = useGlowTexture();
  useFrame(() => {
    const r = revealRef.current;
    if (r === last.current) return;
    last.current = r;
    const k = THREE.MathUtils.smoothstep(r, 0.0, 0.12) * (1 - THREE.MathUtils.smoothstep(r, 0.55, 0.8));
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      sp.material.opacity = MOTES[i].o * k;
      sp.visible = k > 1e-3;
    });
  });
  return MOTES.map((m, i) => (
    <sprite key={i} ref={(el) => (refs.current[i] = el)} position={m.p} scale={m.s} renderOrder={3}>
      <spriteMaterial map={glowTex} color={MOON_LIGHT} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
  ));
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
 * Leading lines: four amber hairlines from dot-grid points near the stage
 * corners toward the aperture, drawn on (stroke-dashoffset) with the reveal
 * and gone just as the visor lands. They stop at the aperture rim rather
 * than crossing the face.
 */
function LeadingLines({ revealRef, apertureRef, frameRef, linesRef }) {
  const last = useRef({ r: -1, x: 0, y: 0, w: 0, h: 0 });
  useFrame(() => {
    const lines = linesRef?.current;
    const fr = frameRef?.current;
    if (!lines?.group || !fr) return;
    const r = revealRef.current;
    const a = apertureRef.current;
    const l = last.current;
    if (l.r === r && Math.abs(l.x - a.x) < 0.25 && Math.abs(l.y - a.y) < 0.25 && l.w === fr.w && l.h === fr.h) return;
    Object.assign(l, { r, x: a.x, y: a.y, w: fr.w, h: fr.h });

    const draw = THREE.MathUtils.clamp(r / 0.7, 0, 1);
    const fade = 1 - THREE.MathUtils.smoothstep(r, 0.72, 0.97);
    lines.group.style.setProperty('opacity', String(0.22 * fade * Math.min(1, r * 12)));

    // grid dots sit at 13 + 26n in root CSS px; pick the one ~2 cells in
    // from each stage corner, in stage coordinates
    const snap = (v, off) => Math.round((v + off - 13) / 26) * 26 + 13 - off;
    const inset = 52;
    const corners = [
      [snap(inset, fr.left), snap(inset, fr.top)],
      [snap(fr.w - inset, fr.left), snap(inset, fr.top)],
      [snap(inset, fr.left), snap(fr.h - inset, fr.top)],
      [snap(fr.w - inset, fr.left), snap(fr.h - inset, fr.top)],
    ];
    const gap = a.rad * 1.08;
    corners.forEach(([x0, y0], i) => {
      const el = lines.els[i];
      if (!el) return;
      const dx = a.x - x0;
      const dy = a.y - y0;
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.max(0, (len - gap) / len);
      el.setAttribute('x1', x0.toFixed(1));
      el.setAttribute('y1', y0.toFixed(1));
      el.setAttribute('x2', (x0 + dx * k).toFixed(1));
      el.setAttribute('y2', (y0 + dy * k).toFixed(1));
      el.setAttribute('stroke-dashoffset', String(1 - draw));
    });
  });
  return null;
}

/**
 * Focus rack + finishing pass. Focus moves from the shell's front to the
 * face plate on the reveal while the bokeh opens up, so the background goes
 * softer and the face ends up the sharpest thing in frame.
 */
function Finish({ revealRef, apertureRef, frameRef }) {
  const dof = useRef();
  const film = useMemo(() => new FilmEffect(), []);
  useEffect(() => () => film.dispose(), [film]);
  useFrame(() => {
    const e = dof.current;
    const a = apertureRef.current;
    const r = revealRef.current;
    if (e && a.dFace) {
      e.cocMaterial.focusDistance = THREE.MathUtils.lerp(a.dShell, a.dFace, r);
      e.cocMaterial.focusRange = THREE.MathUtils.lerp(2.4, 1.8, r);
      e.bokehScale = THREE.MathUtils.lerp(3.5, 7, r);
    }
    const fr = frameRef?.current;
    if (fr) {
      film.uniforms.get('uStage').value.set(fr.left, fr.top, fr.w, fr.h);
      film.uniforms.get('uRoot').value.set(fr.rootW, fr.rootH);
    }
  });
  return (
    <EffectComposer multisampling={4}>
      <DepthOfField ref={dof} focusDistance={5} focusRange={1.6} bokehScale={1.6} />
      <primitive object={film} />
    </EffectComposer>
  );
}

// fetch the portrait as soon as this module loads (well before the room opens)
if (typeof window !== 'undefined') useTexture.preload('/meet/allen-face.webp');

export default function HelmetScene({ progress, layoutProgress, frame, lines, headline, still = false, onReady }) {
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

      {/* reflections: the moon's disc and the broad patch of sky it lights
          (which also keeps the shadow side from crushing to black), the
          stars, and — once the layout resolves — the headline */}
      <ReflectionRoom dirtyRef={envDirty}>
        <Stars />
        <HeadlineReflection layoutRef={layoutRef} dirtyRef={envDirty} />
        <Lightformer ref={moonSky} form="circle" intensity={0.45} color={MOON_LIGHT} position={[8, -1, 4]} scale={16} />
        <Lightformer ref={moonDisc} form="circle" intensity={1} color={MOON_LIGHT} position={[8, -1, 4]} scale={1.3} />
      </ReflectionRoom>

      {/* the one light — positioned by <Layout>, on the moon's bearing */}
      <directionalLight
        ref={moonLight}
        position={[9, -1, 4]}
        intensity={2.5}
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

      <Layout layoutRef={layoutRef} moonDirRef={moonDir} lightRef={moonLight} camBaseRef={camBase} bodyRef={body} headRef={head}>
        {/* aimed at the lens by <Layout>: the body half-way, the head the rest */}
        <group ref={body}>
          <Suit />
          <group ref={head}>
            <Helmet revealRef={revealRef} lightRef={lightRef} moonDirRef={moonDir} apertureRef={aperture} still={still} />
          </group>
        </group>
      </Layout>

      <Moonbeam revealRef={revealRef} layoutRef={layoutRef} moonPosRef={moonPos} apertureRef={aperture} still={still} />
      <ForegroundMotes revealRef={revealRef} />
      <LeadingLines revealRef={revealRef} apertureRef={aperture} frameRef={frame} linesRef={lines} />
      <Finish revealRef={revealRef} apertureRef={aperture} frameRef={frame} />
      <Warmup onReady={onReady} />
    </>
  );
}
