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
/** The head in the portrait (hair-top → chin, ear → ear), in UV, measured
 *  from public/meet/allen-face.webp. Re-measure if the image changes. */
const HEAD = { cx: 0.5, cy: 0.556, w: 0.616, h: 0.691 };
/** Eye line in the portrait's UV (v) — the power-on waits for the visor's
 *  edge to clear it. */
const EYES_V = 0.502;
/** The head fills this much of the visible opening — the rest is even margin. */
const HEAD_FILL = 0.8;
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
function Face({ lightRef, moonDirRef, apertureRef, eyeRef }) {
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
      uHead: { value: new THREE.Vector2(HEAD.cx, HEAD.cy) },
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

    // sit on the ray through the outline's centre, behind the glass, square
    // to the lens
    const ray = tmp.ray.set(cx, cy, 0.5).unproject(camera).sub(camera.position).normalize();
    const P = tmp.p.copy(camera.position).addScaledVector(ray, D);
    plate.position.copy(helmet.worldToLocal(P));
    plate.lookAt(camera.position);

    // fit the head to the outline's half-extents, taken at the plate's distance
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const ay = ((y1 - y0) / 2) * D * tanH;
    const ax = ((x1 - x0) / 2) * D * tanH * (size.width / size.height);
    // portrait size, in the plate's own (helmet-local) units
    const s = (HEAD_FILL * Math.min(ay / (HEAD.h / 2), ax / (HEAD.w / 2))) / sc;
    u.uUvScale.value = PLATE / s;

    // where the eyes cross the shell, seen from the camera (helmet-space y)
    plate.updateMatrixWorld();
    const eye = helmet.worldToLocal(plate.localToWorld(tmp.e.set((0.5 - HEAD.cx) * s, (EYES_V - HEAD.cy) * s, 0)));
    const oc = helmet.worldToLocal(tmp.p.copy(camera.position));
    const ed = eye.sub(oc).normalize();
    const eb = oc.dot(ed);
    const eh = eb * eb - (oc.lengthSq() - R * R);
    if (eh > 0) eyeRef.current = (oc.y + ed.y * (-eb - Math.sqrt(eh))) / R;

    u.uToHelmet.value.copy(helmet.matrixWorld).invert();
    u.uCam.value.copy(camera.position).applyMatrix4(u.uToHelmet.value);
    u.uMoon.value.copy(moonDirRef.current).transformDirection(u.uToHelmet.value);
    u.uLight.value = lightRef.current;

    // for the leading lines + the focus rack
    const a = apertureRef.current;
    a.x = (cx * 0.5 + 0.5) * size.width;
    a.y = (-cy * 0.5 + 0.5) * size.height;
    a.rad = ((y1 - y0) / 2) * (size.height / 2);
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

function Helmet({ revealRef, lightRef, moonDirRef, apertureRef }) {
  const s = useRef({ on: false, onAt: 0 });
  const eyeRef = useRef(-0.04); // eye line on the shell, reported by the face

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

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const st = s.current;
    const r = revealRef.current;

    // the visor slides on the shared reveal exactly — no spring, no overshoot
    const edge = THREE.MathUtils.lerp(VISOR_CLOSED, VISOR_OPEN, r);
    VISOR_EDGE.value = edge;

    // The face's exposure: a dim silhouette → it catches the moment the
    // visor's edge clears the eyes (two quick flickers), then holds at full.
    if (edge > eyeRef.current + 0.035 && !st.on) {
      st.on = true;
      st.onAt = t;
    } else if (edge < eyeRef.current - 0.06 && st.on) {
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

      <Face lightRef={lightRef} moonDirRef={moonDirRef} apertureRef={apertureRef} eyeRef={eyeRef} />

      {/* the visor, on its track between shell and housing */}
      <mesh geometry={sphere} material={visorMat} scale={1.02} renderOrder={2} />
    </group>
  );
}

/* ── clock, camera, layout ────────────────────────────────────────────── */

/** Scroll → revealEase over [from, to], followed with a critically-damped
 *  (never overshooting) smoothing; snaps on arrival so nothing creeps. */
function follow(ref, raw, from, to, delta, first) {
  const target = revealEase(THREE.MathUtils.clamp((raw - from) / (to - from), 0, 1));
  if (first) return (ref.current = target);
  const v = ref.current;
  if (v === target) return v;
  const next = v + (target - v) * (1 - Math.exp(-Math.min(delta, 1 / 20) * 9));
  return (ref.current = Math.abs(target - next) < 1e-4 ? target : next);
}

/**
 * The clock. `reveal` (visor, dolly, moon, focus, lines) runs over the first
 * runway; `layout` (the glide to the resting layout) over the second — same
 * ease, same smoothing.
 */
function RevealDriver({ progressRef, layoutProgressRef, revealRef, layoutRef }) {
  const first = useRef(true);
  useFrame((_, delta) => {
    follow(revealRef, progressRef.current, REVEAL_FROM, REVEAL_TO, delta, first.current);
    follow(layoutRef, layoutProgressRef.current, 0, 1, delta, first.current);
    first.current = false;
  });
  return null;
}

/** The camera dollies in on the reveal, then holds — the layout moves the
 *  helmet, not the camera (so the moon, a far background, stays put). No
 *  pointer parallax. Narrow screens pull back to keep the helmet whole. */
function Rig({ revealRef }) {
  useFrame(({ camera, size }) => {
    const r = revealRef.current;
    const aspect = size.width / size.height;
    const z = Math.max(THREE.MathUtils.lerp(CAM.z[0], CAM.z[1], r), 1.25 / (0.268 * aspect));
    const lookY = THREE.MathUtils.lerp(CAM.lookY[0], CAM.lookY[1], r);
    camera.position.set(0, lookY + CAM.lift, z);
    camera.lookAt(0, lookY, 0);
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
function Layout({ layoutRef, moonDirRef, lightRef, children }) {
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

function Moon({ revealRef, moonDirRef, discRef, skyRef, envDirtyRef }) {
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

export default function HelmetScene({ progress, layoutProgress, frame, lines }) {
  const lightRef = useRef(STANDBY);
  const revealRef = useRef(0);
  const layoutRef = useRef(0);
  const moonDir = useRef(new THREE.Vector3(1, 0, 0.4).normalize());
  const aperture = useRef({ x: 0, y: 0, rad: 0, dShell: 0, dFace: 0 });
  const moonLight = useRef();
  const moonDisc = useRef();
  const moonSky = useRef();
  const envDirty = useRef(true);

  return (
    <>
      <color attach="background" args={[PALETTE.void]} />
      <RevealDriver progressRef={progress} layoutProgressRef={layoutProgress} revealRef={revealRef} layoutRef={layoutRef} />
      <Rig revealRef={revealRef} />

      {/* reflections: only what the moon puts there — its disc, and the broad
          patch of sky it lights (which also keeps the shadow side from
          crushing to black) */}
      <ReflectionRoom dirtyRef={envDirty}>
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
      <Moon revealRef={revealRef} moonDirRef={moonDir} discRef={moonDisc} skyRef={moonSky} envDirtyRef={envDirty} />

      <Layout layoutRef={layoutRef} moonDirRef={moonDir} lightRef={moonLight}>
        {/* the body squares up to the viewer; the head turns a touch more */}
        <group rotation={[0.03, -0.1, 0]}>
          <Suit />
          <group rotation={[0.01, -0.1, 0]}>
            <Helmet revealRef={revealRef} lightRef={lightRef} moonDirRef={moonDir} apertureRef={aperture} />
          </group>
        </group>
      </Layout>

      <LeadingLines revealRef={revealRef} apertureRef={aperture} frameRef={frame} linesRef={lines} />
      <Finish revealRef={revealRef} apertureRef={aperture} frameRef={frame} />
    </>
  );
}
