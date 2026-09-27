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
 *   · Visor: a slightly larger sphere segment cut the same way, pivoting on
 *     the side hinges (x-axis through the centre, like a real EVA visor).
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
 * same scroll slice. When it lands, the frame is still.
 */

const R = 1; // helmet radius
const MAX_LIFT = 1.3; // radians the visor swings up and back
const STANDBY = 0.1; // interior level at rest — a silhouette through the gold
const WINDOW = { rx: 0.6, ry: 0.5, cy: 0.02 }; // face opening on the unit sphere
const f = (n) => n.toFixed(4);

/* ── the one clock ────────────────────────────────────────────────────── */

/** 0 → REVEAL_FROM is a held beat: nothing moves until the scroll commits. */
const REVEAL_FROM = 0.03;
const REVEAL_TO = 0.8;
/** The one ease every moving thing uses (power2.out). */
const revealEase = (x) => 1 - (1 - x) * (1 - x);

/** Camera: dolly + look height, rest → revealed. */
const CAM = { z: [6.4, 5.3], lookY: [-0.42, -0.2], lift: 0.18 };

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
const HEAD = { cx: 0.473, cy: 0.537, w: 0.596, h: 0.686 };
/** The head fills this much of the aperture — the rest is even margin. */
const HEAD_FILL = 0.74; // the gasket takes a little of the visible window

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
      uHead: { value: new THREE.Vector2(HEAD.cx, HEAD.cy) },
      uCam: { value: new THREE.Vector3() },
      uMoon: { value: new THREE.Vector3(0, 0, 1) },
      uToHelmet: { value: new THREE.Matrix4() },
    }),
    [tex]
  );
  const tmp = useMemo(() => ({ w: new THREE.Vector3(), ray: new THREE.Vector3(), p: new THREE.Vector3(), fwd: new THREE.Vector3(), q: new THREE.Quaternion() }), []);

  useFrame(({ camera, size }) => {
    const plate = mesh.current;
    const helmet = plate?.parent;
    const u = mat.current?.uniforms;
    if (!helmet || !u) return;
    helmet.updateWorldMatrix(true, false);

    // aperture centre, world; the view ray through it
    const W = helmet.localToWorld(tmp.w.copy(APERTURE));
    const ray = tmp.ray.subVectors(W, camera.position);
    const dW = ray.length();
    ray.divideScalar(dW);

    // sit on that ray, PLATE_DEPTH behind the glass, square to the lens
    const P = tmp.p.copy(W).addScaledVector(ray, PLATE_DEPTH);
    plate.position.copy(helmet.worldToLocal(P.clone()));
    plate.lookAt(camera.position);

    // fit the head: the aperture's half-extents as seen at the plate depth
    // (edges sit a little deeper than the centre; the width is foreshortened
    // by the head's turn relative to the ray)
    const fwd = tmp.fwd.set(0, 0, 1).applyQuaternion(helmet.getWorldQuaternion(tmp.q));
    const cosA = Math.max(0.5, -ray.dot(fwd));
    const ay = WINDOW.ry * R * ((dW + PLATE_DEPTH) / (dW + 0.13));
    const ax = WINDOW.rx * R * cosA * ((dW + PLATE_DEPTH) / (dW + 0.2));
    const s = HEAD_FILL * Math.min(ay / (HEAD.h / 2), ax / (HEAD.w / 2));
    u.uUvScale.value = PLATE / s;

    u.uToHelmet.value.copy(helmet.matrixWorld).invert();
    u.uCam.value.copy(camera.position).applyMatrix4(u.uToHelmet.value);
    u.uMoon.value.copy(moonDirRef.current).transformDirection(u.uToHelmet.value);
    u.uLight.value = lightRef.current;

    // for the leading lines + the focus rack
    const a = apertureRef.current;
    const v = tmp.p.copy(W).project(camera);
    a.x = (v.x * 0.5 + 0.5) * size.width;
    a.y = (-v.y * 0.5 + 0.5) * size.height;
    a.rad = ((WINDOW.ry * R) / (dW * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * (size.height / 2);
    a.dShell = dW - 0.05;
    a.dFace = dW + PLATE_DEPTH;
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
  }),
  { keep: 'inside', grow: 0.07 }
);
const rubberMat = new THREE.MeshStandardMaterial({ color: '#1b1c21', roughness: 0.7 });
const lensMat = new THREE.MeshPhysicalMaterial({ color: '#2b2d33', roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04 });
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
    const x = 0.82;
    const y = -1.36;
    const z = Math.sqrt(1.72 ** 2 - x * x) * 0.6 + 0.01;
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
  const visor = useRef();
  const s = useRef({ on: false, onAt: 0 });

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

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const st = s.current;
    const r = revealRef.current;

    // the hinge follows the shared reveal exactly — no spring, no overshoot
    if (visor.current) visor.current.rotation.x = -r * MAX_LIFT;

    // The face's exposure: a dim silhouette → it catches as the visor
    // clears (two quick flickers), then holds at full.
    if (r > 0.85 && !st.on) {
      st.on = true;
      st.onAt = t;
    } else if (r < 0.6 && st.on) {
      st.on = false;
    }
    let lt = STANDBY;
    if (st.on) {
      const k = t - st.onAt;
      if (k < 0.05) lt = 0.9;
      else if (k < 0.11) lt = 0.2;
      else if (k < 0.17) lt = 1;
      else if (k < 0.23) lt = 0.35;
      else lt = THREE.MathUtils.lerp(0.55, 1, THREE.MathUtils.smoothstep(k, 0.23, 0.8));
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
      {/* helmet lamps — unlit glass: they only reflect the moon */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.66, 0.6, 0.46]} rotation={[-0.3, sd * 0.55, 0]}>
          <mesh material={rubberMat} castShadow>
            <boxGeometry args={[0.2, 0.12, 0.14]} />
          </mesh>
          <mesh position-z={0.072} material={lensMat}>
            <planeGeometry args={[0.15, 0.08]} />
          </mesh>
        </group>
      ))}

      <Face lightRef={lightRef} moonDirRef={moonDirRef} apertureRef={apertureRef} />

      {/* the visor, on its hinge (x-axis through the centre) */}
      <group ref={visor}>
        <mesh geometry={sphere} material={visorMat} scale={1.018} renderOrder={2} />
      </group>
    </group>
  );
}

/* ── clock, camera ────────────────────────────────────────────────────── */

/**
 * The one clock: scroll → revealEase over [REVEAL_FROM, REVEAL_TO], followed
 * with a critically-damped (never overshooting) smoothing so wheel notches
 * don't step. Snaps when it arrives, so nothing creeps afterwards.
 */
function RevealDriver({ progressRef, revealRef }) {
  const first = useRef(true);
  useFrame((_, delta) => {
    const x = THREE.MathUtils.clamp((progressRef.current - REVEAL_FROM) / (REVEAL_TO - REVEAL_FROM), 0, 1);
    const target = revealEase(x);
    if (first.current) {
      first.current = false;
      revealRef.current = target; // arrive where the page already is
      return;
    }
    const r = revealRef.current;
    if (r === target) return;
    const next = r + (target - r) * (1 - Math.exp(-Math.min(delta, 1 / 20) * 9));
    revealRef.current = Math.abs(target - next) < 1e-4 ? target : next;
  });
  return null;
}

/** The camera dollies in on the reveal. No pointer parallax: once the reveal
 *  lands the camera is fixed. Narrow screens pull back to keep the helmet whole. */
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

const MOON_R = 1.25;
const MOON_Z = -14;
const MOON_LIGHT = '#dce6ff';
/** Moon path on the reveal: from below the right edge (off-frame), rising in
 *  a shallow arc to sit up behind the helmet's right shoulder. */
function moonAt(r, out) {
  const x = THREE.MathUtils.lerp(12.5, 2.7, r);
  const y = THREE.MathUtils.lerp(-1.8, 1.95, r) + Math.sin(Math.PI * r) * 0.6;
  return out.set(x, y, MOON_Z);
}
/** Direction the moonlight arrives from: its bearing on screen, brought
 *  round toward the viewer so it lights the side of the helmet we see (a
 *  light truly behind would leave the front black). Side-light when it
 *  enters → high, three-quarter key once it's up. */
function moonLightDir(pos, out) {
  return out.set(pos.x, pos.y, 5).normalize();
}

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
    float mu = clamp(vMu, 0.0, 1.0);
    vec3 col = uColor * (1.0 - 0.17 * m - 0.07 * min(c, 1.0));
    col *= mix(0.8, 1.0, sqrt(mu));            // gentle limb darkening
    float a = smoothstep(0.0, 0.55, mu);        // feathered limb
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

function Moon({ revealRef, moonDirRef, lightRef, discRef, skyRef, envDirtyRef }) {
  const moon = useRef();
  const halo = useRef();
  const last = useRef(-1);
  const glowTex = useGlowTexture();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#efe7d6') } }), []);

  useFrame(() => {
    const r = revealRef.current;
    if (r === last.current) return; // settled: nothing to move
    last.current = r;
    const p = moonAt(r, tmp);
    moon.current?.position.copy(p);
    halo.current?.position.set(p.x, p.y, p.z - 0.5);
    const d = moonLightDir(p, moonDirRef.current);
    lightRef.current?.position.copy(d).multiplyScalar(9);
    // the same bearing in the reflection map: disc + the sky it lights
    [
      [discRef.current, 8],
      [skyRef.current, 9],
    ].forEach(([lf, dist]) => {
      if (!lf) return;
      lf.position.copy(d).multiplyScalar(dist);
      lf.lookAt(0, 0, 0);
    });
    envDirtyRef.current = true;
  });

  return (
    <>
      <sprite ref={halo} scale={MOON_R * 7} renderOrder={-2}>
        <spriteMaterial map={glowTex} color="#dfe6f5" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
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

export default function HelmetScene({ progress, frame, lines }) {
  const lightRef = useRef(STANDBY);
  const revealRef = useRef(0);
  const moonDir = useRef(new THREE.Vector3(1, 0, 0.4).normalize());
  const aperture = useRef({ x: 0, y: 0, rad: 0, dShell: 0, dFace: 0 });
  const moonLight = useRef();
  const moonDisc = useRef();
  const moonSky = useRef();
  const envDirty = useRef(true);

  return (
    <>
      <color attach="background" args={[PALETTE.void]} />
      <RevealDriver progressRef={progress} revealRef={revealRef} />
      <Rig revealRef={revealRef} />

      {/* reflections: only what the moon puts there */}
      <ReflectionRoom dirtyRef={envDirty}>
        <Lightformer ref={moonSky} form="circle" intensity={0.22} color={MOON_LIGHT} position={[8, -1, 4]} scale={14} />
        <Lightformer ref={moonDisc} form="circle" intensity={3} color={MOON_LIGHT} position={[8, -1, 4]} scale={1.4} />
      </ReflectionRoom>

      {/* the one light */}
      <directionalLight
        ref={moonLight}
        position={[9, -1, 4]}
        intensity={2.6}
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
      <Moon revealRef={revealRef} moonDirRef={moonDir} lightRef={moonLight} discRef={moonDisc} skyRef={moonSky} envDirtyRef={envDirty} />

      {/* the body squares up to the viewer; the head turns a touch more */}
      <group rotation={[0.03, -0.1, 0]}>
        <Suit />
        <group rotation={[0.01, -0.1, 0]}>
          <Helmet revealRef={revealRef} lightRef={lightRef} moonDirRef={moonDir} apertureRef={aperture} />
        </group>
      </group>

      <LeadingLines revealRef={revealRef} apertureRef={aperture} frameRef={frame} linesRef={lines} />
      <Finish revealRef={revealRef} apertureRef={aperture} frameRef={frame} />
    </>
  );
}
