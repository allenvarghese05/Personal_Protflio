'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';

/**
 * Meet Me — the helmet, on a suit. Built in code (no model to license) so
 * the visor is a real separate part on a real hinge:
 *
 *   · Shell + liner: full spheres whose face window and neck are cut in the
 *     fragment shader — a mathematically smooth, anti-aliased ellipse, not
 *     stair-stepped triangles.
 *   · Visor: a slightly larger sphere segment cut the same way. It pivots
 *     on the side hinges (x-axis through the centre, like a real EVA visor).
 *   · Face: the finished portrait, untouched except for the interior light
 *     level. It's clipped to the window geometrically — each pixel traces
 *     its view ray back to the shell and is kept only if that ray came in
 *     through the glass — so nothing ever shows outside the opening.
 *   · Suit: shoulders + upper chest the helmet sits on, with a baked contact
 *     shadow under the neck ring. It fades into the page below (CSS mask).
 *
 * `progress` is a ref (0→1) the page writes from scroll; nothing here
 * re-renders per frame. The light level is mirrored to `--meet-light` on
 * the stage so the room's CSS glow powers up with it.
 */

const R = 1; // helmet radius
const MAX_LIFT = 1.3; // radians the visor swings up and back
const STANDBY = 0.1; // interior light at rest — a silhouette through the gold
const WINDOW = { rx: 0.6, ry: 0.5, cy: 0.02 }; // face opening on the unit sphere
const f = (n) => n.toFixed(4);

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
  uniform vec3 uCam;      // camera, in helmet space
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
    gl_FragColor = vec4(texture2D(uMap, vUv).rgb * uLight, 1.0);
    #include <colorspace_fragment>
  }
`;

function Face({ lightRef }) {
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
      uCam: { value: new THREE.Vector3() },
      uToHelmet: { value: new THREE.Matrix4() },
    }),
    [tex]
  );
  useFrame(({ camera }) => {
    const helmet = mesh.current?.parent;
    const u = mat.current?.uniforms;
    if (!helmet || !u) return;
    u.uToHelmet.value.copy(helmet.matrixWorld).invert();
    u.uCam.value.copy(camera.position).applyMatrix4(u.uToHelmet.value);
    u.uLight.value = lightRef.current;
  });
  // the portrait sits deep in the helmet: eyes just above the window's centre,
  // the crown of the hair tucked under the top edge
  return (
    <mesh ref={mesh} position={[0, 0.08, 0.18]}>
      <planeGeometry args={[1.7, 1.7]} />
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={faceVert} fragmentShader={faceFrag} toneMapped={false} />
    </mesh>
  );
}

/* ── materials ────────────────────────────────────────────────────────── */

const shellMat = cutWindow(
  new THREE.MeshPhysicalMaterial({ color: '#ebe6dc', roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.22, alphaToCoverage: true }),
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
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  { keep: 'inside', grow: 0.07 }
);
const rubberMat = new THREE.MeshStandardMaterial({ color: '#1b1c21', roughness: 0.7 });
const metalMat = new THREE.MeshStandardMaterial({ color: '#bdb8ae', roughness: 0.28, metalness: 0.85 });
const darkMetalMat = new THREE.MeshStandardMaterial({ color: '#6f6b65', roughness: 0.35, metalness: 0.8 });

/** Suit fabric, darkened under the neck ring — the helmet's contact shadow
 *  (offset away from the key light, which is up and to the left). */
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
      float rr = length(vec2(vObj.x - 0.14, vObj.z * 1.3));
      diffuseColor.rgb *= mix(0.22, 1.0, smoothstep(0.66, 1.6, rr));
      // the chest falls off into shadow, so the eye stays on the helmet
      diffuseColor.rgb *= mix(0.5, 1.0, smoothstep(-2.3, -1.1, vObj.y));`
    );
};

/* ── the suit ─────────────────────────────────────────────────────────── */

function Suit({ lightRef }) {
  const seal = useRef();
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

  useFrame(() => {
    const l = lightRef.current;
    if (seal.current) seal.current.emissiveIntensity = 0.4 + l * 2.4;
  });

  return (
    <group>
      <mesh geometry={geo} material={suitMat} />
      {/* the suit's neck bearing, under the helmet's ring */}
      <mesh position-y={-0.8} rotation-x={Math.PI / 2} material={darkMetalMat}>
        <torusGeometry args={[0.72, 0.07, 20, 96]} />
      </mesh>
      {/* seal indicator — lights up with the power-on */}
      <mesh position-y={-0.765} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.735, 0.009, 8, 128]} />
        <meshStandardMaterial ref={seal} color={PALETTE.accent} emissive={PALETTE.accent} emissiveIntensity={0.4} toneMapped={false} />
      </mesh>
      <group position={patch.pos} quaternion={patch.q}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 0.014, 40]} />
          <meshStandardMaterial color="#23252c" roughness={0.8} />
        </mesh>
        <mesh position-y={0.008} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.075, 40]} />
          <meshStandardMaterial color={PALETTE.accent} roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

/* ── the helmet ───────────────────────────────────────────────────────── */

function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
}

function Helmet({ progressRef, lightRef, stageRef }) {
  const visor = useRef();
  const glow = useRef();
  const lamps = useRef([]);
  const flares = useRef([]);
  const s = useRef({ angle: 0, vel: 0, on: false, onAt: 0, css: -1 });
  const glowTex = useGlowTexture();

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

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const st = s.current;

    // Heavy lift: a slow, weighted start, then a damped spring settles it
    // (slight overshoot, like real mass on a hinge).
    const p = THREE.MathUtils.clamp((progressRef.current - 0.04) / 0.72, 0, 1);
    const shaped = p * p * (3 - 2 * p) * 0.7 + p * p * 0.3;
    const target = shaped * MAX_LIFT;
    st.vel += ((target - st.angle) * 36 - st.vel * 8.6) * dt;
    st.angle += st.vel * dt;
    if (visor.current) visor.current.rotation.x = -st.angle;

    // The light: dim standby → powers up as the visor clears the face
    if (st.angle > MAX_LIFT * 0.78 && !st.on) {
      st.on = true;
      st.onAt = t;
    } else if (st.angle < MAX_LIFT * 0.55 && st.on) {
      st.on = false;
    }
    let lt = STANDBY;
    if (st.on) {
      const k = t - st.onAt;
      // two quick catches, then it holds and ramps up to full
      if (k < 0.05) lt = 0.9;
      else if (k < 0.11) lt = 0.2;
      else if (k < 0.17) lt = 1;
      else if (k < 0.23) lt = 0.35;
      else lt = THREE.MathUtils.lerp(0.55, 1, THREE.MathUtils.smoothstep(k, 0.23, 0.8));
    }
    const snap = st.on && t - st.onAt < 0.25; // flicker = instant, ramp = eased
    lightRef.current = snap ? lt : lightRef.current + (lt - lightRef.current) * 0.08;
    const l = lightRef.current;

    if (glow.current) glow.current.intensity = 0.3 + l * 2.8;
    lamps.current.forEach((m) => m && (m.emissiveIntensity = 0.1 + l * 2.2));
    flares.current.forEach((sp) => {
      if (!sp) return;
      sp.material.opacity = l * 0.85;
      sp.scale.setScalar(0.16 + l * 0.26);
    });
    // mirror to the page so the room's glow powers up with it
    if (stageRef?.current && Math.abs(l - st.css) > 0.004) {
      st.css = l;
      stageRef.current.style.setProperty('--meet-light', l.toFixed(3));
    }
  });

  return (
    <group>
      <mesh geometry={sphere} material={shellMat} />
      <mesh geometry={sphere} material={linerMat} scale={0.97} />
      <mesh geometry={gasket} material={rubberMat} />
      {/* neck ring */}
      <mesh position-y={-0.73} rotation-x={Math.PI / 2} material={metalMat}>
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
          <mesh material={rubberMat}>
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

      <Face lightRef={lightRef} />
      {/* the interior light — standby glow, then the power-up */}
      <pointLight ref={glow} position={[0.25, 0.25, 0.5]} color="#ffd6a0" intensity={0.3} distance={2.6} decay={2} />

      {/* the visor, on its hinge (x-axis through the centre) */}
      <group ref={visor}>
        <mesh geometry={sphere} material={visorMat} scale={1.018} renderOrder={2} />
      </group>
    </group>
  );
}

/**
 * The camera: starts wide enough to seat the helmet on its shoulders, and
 * eases in toward the face as the visor opens. A few degrees of parallax
 * follow the pointer. Narrow screens pull back to keep the helmet whole.
 */
function Rig({ progressRef }) {
  const cur = useRef({ x: 0, y: 0 });
  useFrame(({ camera, size, pointer }, delta) => {
    const k = Math.min(1, delta * 2.2);
    cur.current.x += (pointer.x - cur.current.x) * k;
    cur.current.y += (pointer.y - cur.current.y) * k;
    const p = THREE.MathUtils.smoothstep(progressRef.current, 0.05, 0.95);
    const aspect = size.width / size.height;
    const z = Math.max(THREE.MathUtils.lerp(6.4, 5.3, p), 1.25 / (0.268 * aspect));
    const lookY = THREE.MathUtils.lerp(-0.42, -0.2, p);
    camera.position.set(cur.current.x * 0.35, lookY + 0.18 + cur.current.y * 0.16, z);
    camera.lookAt(0, lookY, 0);
  });
  return null;
}

export default function HelmetScene({ progress, stage }) {
  const lightRef = useRef(STANDBY);
  return (
    <>
      <Rig progressRef={progress} />
      {/* reflections — the same room the page shows: a warm sheen overhead
          for the gold, an ice panel left and an amber console strip right */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={0.7} color="#ffd9a8" position={[0, 5, 5]} scale={[16, 5, 1]} />
        {/* directly overhead — keeps the lifted visor gold over the crown */}
        <Lightformer form="rect" intensity={0.9} color="#ffc98a" position={[0, 6, -1]} scale={[8, 6, 1]} />
        <Lightformer form="circle" intensity={2.2} color="#ffe2b8" position={[-3, 3, 2]} scale={2.4} />
        <Lightformer form="rect" intensity={1.1} color="#9cc3ff" position={[4, 0.5, -1]} scale={[3, 5, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#9cc3ff" position={[-5, 0.4, 3]} scale={[1.2, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ff9a3c" position={[4.5, -1.2, 3.5]} scale={[4, 0.35, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#2a3150" position={[0, -3, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
      <ambientLight intensity={0.14} />
      <directionalLight position={[-3, 3.5, 4]} intensity={1.8} color="#ffe6c8" />
      <directionalLight position={[3.5, 1, -3]} intensity={1.0} color={PALETTE.ice} />
      {/* the body squares up to the viewer; the head turns a touch more */}
      <group rotation={[0.03, -0.1, 0]}>
        <Suit lightRef={lightRef} />
        <group rotation={[0.01, -0.1, 0]}>
          <Helmet progressRef={progress} lightRef={lightRef} stageRef={stage} />
        </group>
      </group>
    </>
  );
}
