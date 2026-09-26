'use client';
import { useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';

/**
 * Meet Me — the helmet. Built in code (no model to license) so the visor is
 * a real separate part on a real hinge:
 *
 *   · Shell + inner liner: a sphere with the face window and neck opened up.
 *   · Visor: a slightly larger sphere segment. It pivots about the helmet's
 *     side hinges (the x-axis through the centre, like a real EVA visor), so
 *     lifting slides it up and back over the crown — no clipping.
 *   · Gold, semi-transparent: at rest the dim interior light rim-lights a
 *     faint silhouette through it; as the visor clears, that SAME light
 *     powers up (flicker → steady) and the face is lit into being.
 *   · The face: a cut-out photo with the "transmission" treatment — partly
 *     desaturated, cool grade, fine scan lines + one slow drifting line,
 *     grain, and a warm rim along one side of the silhouette.
 *
 * `progress` is a ref (0→1) the page writes from scroll; nothing here
 * re-renders per frame.
 */

const R = 1; // helmet radius
const MAX_LIFT = 1.3; // radians the visor swings up and back
const WINDOW = { rx: 0.6, ry: 0.5, cy: 0.02 }; // face opening, in the sphere's xy
const inWindow = (v, grow = 0) =>
  v.z > 0.2 && (v.x / (WINDOW.rx + grow)) ** 2 + ((v.y - WINDOW.cy) / (WINDOW.ry + grow)) ** 2 < 1;

/** A sphere with triangles removed by `drop(normalizedVertex)`. */
function carvedSphere(radius, drop, keepOnly = false) {
  const g = new THREE.SphereGeometry(radius, 160, 120);
  const pos = g.attributes.position;
  const idx = g.index.array;
  const kept = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) {
    a.fromBufferAttribute(pos, idx[i]).divideScalar(radius);
    b.fromBufferAttribute(pos, idx[i + 1]).divideScalar(radius);
    c.fromBufferAttribute(pos, idx[i + 2]).divideScalar(radius);
    const inside = drop(a) && drop(b) && drop(c);
    if (keepOnly ? inside : !inside) kept.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  g.setIndex(kept);
  return g;
}

/* ── the face — "seen through a visor" ─────────────────────────────────── */

const faceVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const faceFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uLight;   // 0 = dim standby … 1 = fully lit
  uniform float uTime;
  uniform vec3 uRim;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float a = tex.a;
    if (a < 0.01) discard;
    vec3 col = tex.rgb;
    // partly desaturated, cooler, a touch more contrast — a transmission
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 0.5);
    col *= vec3(0.86, 0.96, 1.1);
    col = (col - 0.5) * 1.08 + 0.5;
    // fine scan lines + one slow line drifting down
    col *= 0.9 + 0.1 * sin(vUv.y * 900.0);
    float d = fract(uTime * 0.07);
    col += vec3(0.55, 0.75, 1.0) * 0.14 * exp(-pow((vUv.y - (1.0 - d)) * 55.0, 2.0));
    col += (hash(vUv * 900.0 + uTime) - 0.5) * 0.05;
    // falls off toward the helmet walls
    col *= smoothstep(0.78, 0.28, length((vUv - vec2(0.5, 0.52)) * vec2(1.0, 0.92)));
    // warm rim along one side of the silhouette — the helmet's inner glow
    float edge = clamp(a - texture2D(uMap, vUv + vec2(0.014, 0.0)).a, 0.0, 1.0)
               + 0.5 * clamp(a - texture2D(uMap, vUv + vec2(0.01, -0.01)).a, 0.0, 1.0);
    vec3 rim = uRim * edge * 2.6;
    vec3 lit = col * uLight * 1.05 + rim * mix(0.6, 1.0, uLight);
    gl_FragColor = vec4(lit, a);
  }
`;

function Face({ light }) {
  const tex = useLoader(THREE.TextureLoader, '/meet/allen-face.webp');
  const mat = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: tex },
        uLight: { value: 0.06 },
        uTime: { value: 0 },
        uRim: { value: new THREE.Color(PALETTE.accentHi) },
      },
      vertexShader: faceVert,
      fragmentShader: faceFrag,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
  }, [tex]);
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uLight.value = light.current;
  });
  return (
    <mesh position={[0, -0.02, 0.36]} material={mat}>
      <planeGeometry args={[1.28, 1.28]} />
    </mesh>
  );
}

/* ── the helmet ───────────────────────────────────────────────────────── */

const shellMat = new THREE.MeshPhysicalMaterial({ color: '#e7e2d8', roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.28 });
const linerMat = new THREE.MeshStandardMaterial({ color: '#15161b', roughness: 0.9, side: THREE.BackSide });
const rubberMat = new THREE.MeshStandardMaterial({ color: '#1b1c21', roughness: 0.7 });
const metalMat = new THREE.MeshStandardMaterial({ color: '#b9b4aa', roughness: 0.3, metalness: 0.8 });
const visorMat = new THREE.MeshPhysicalMaterial({
  color: '#d9a14a',
  metalness: 1,
  roughness: 0.07,
  transparent: true,
  opacity: 0.8, // gold, but not fully opaque — a silhouette reads through it
  envMapIntensity: 1.5,
  side: THREE.DoubleSide,
});

function Helmet({ progress, light }) {
  const visor = useRef();
  const glow = useRef();
  const lamps = useRef([]);
  const s = useRef({ angle: 0, vel: 0, on: false, onAt: 0 });

  const shell = useMemo(() => carvedSphere(R, (v) => inWindow(v) || v.y < -0.72), []);
  const liner = useMemo(() => carvedSphere(R * 0.97, (v) => inWindow(v) || v.y < -0.72), []);
  const visorGeo = useMemo(() => carvedSphere(R * 1.018, (v) => inWindow(v, 0.07), true), []);
  const gasket = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 128; i++) {
      const t = (i / 128) * Math.PI * 2;
      const x = WINDOW.rx * Math.cos(t);
      const y = WINDOW.cy + WINDOW.ry * Math.sin(t);
      pts.push(new THREE.Vector3(x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))).multiplyScalar(R * 1.004));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 256, 0.03, 12, true);
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const st = s.current;

    // Heavy lift: a slow, weighted start, then a damped spring settles it
    // (slight overshoot, like real mass on a hinge).
    const p = THREE.MathUtils.clamp((progress.current - 0.04) / 0.72, 0, 1);
    const shaped = p * p * (3 - 2 * p) * 0.7 + p * p * 0.3;
    const target = shaped * MAX_LIFT;
    st.vel += ((target - st.angle) * 36 - st.vel * 8.6) * dt;
    st.angle += st.vel * dt;
    if (visor.current) visor.current.rotation.x = -st.angle;

    // The light: dim standby → powers up as the visor clears the face
    const cleared = st.angle > MAX_LIFT * 0.78;
    if (cleared && !st.on) {
      st.on = true;
      st.onAt = t;
    } else if (st.angle < MAX_LIFT * 0.55 && st.on) {
      st.on = false;
    }
    let target_l = 0.06;
    if (st.on) {
      const k = t - st.onAt;
      // two quick catches, then it holds and ramps up to full
      if (k < 0.05) target_l = 0.9;
      else if (k < 0.11) target_l = 0.18;
      else if (k < 0.17) target_l = 1;
      else if (k < 0.23) target_l = 0.35;
      else target_l = THREE.MathUtils.lerp(0.55, 1, THREE.MathUtils.smoothstep(k, 0.23, 0.8));
    }
    const snap = st.on && t - st.onAt < 0.25; // flicker = instant, ramp = eased
    light.current = snap ? target_l : light.current + (target_l - light.current) * 0.08;

    if (glow.current) glow.current.intensity = 0.25 + light.current * 2.6;
    lamps.current.forEach((m) => m && (m.emissiveIntensity = 0.1 + light.current * 2.2));
  });

  return (
    <group>
      <mesh geometry={shell} material={shellMat} />
      <mesh geometry={liner} material={linerMat} />
      <mesh geometry={gasket} material={rubberMat} />
      {/* neck ring */}
      <mesh position-y={-0.74} rotation-x={Math.PI / 2} material={metalMat}>
        <torusGeometry args={[0.68, 0.06, 20, 96]} />
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
        </group>
      ))}

      <Face light={light} />
      {/* the interior light — standby glow, then the power-up */}
      <pointLight ref={glow} position={[0.25, 0.25, 0.55]} color="#ffd6a0" intensity={0.25} distance={2.4} decay={2} />

      {/* the visor, on its hinge (x-axis through the centre) */}
      <group ref={visor}>
        <mesh geometry={visorGeo} material={visorMat} />
      </group>
    </group>
  );
}

/** Frame the whole helmet (~¾ of the height); pull back on narrow screens. */
function CameraFit() {
  const { camera, size } = useThree();
  useFrame(() => {
    const aspect = size.width / size.height;
    const z = Math.max(5.1, 5.1 * (0.95 / Math.min(aspect, 0.95)) * 0.95);
    camera.position.set(0, 0.05, z);
    camera.lookAt(0, -0.04, 0);
  });
  return null;
}

export default function HelmetScene({ progress }) {
  const light = useRef(0.06);
  return (
    <>
      <CameraFit />
      {/* reflections: soft studio panels + a cool sky, rendered locally */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.4} color="#ffe2b8" position={[-3, 3, 2]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#9cc3ff" position={[4, 0.5, -1]} scale={[3, 5, 1]} />
        <Lightformer form="ring" intensity={3} color="#ffffff" position={[1.5, 2.2, 4]} scale={0.6} />
        <Lightformer form="rect" intensity={0.5} color="#2a3150" position={[0, -3, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
      <ambientLight intensity={0.12} />
      <directionalLight position={[-3, 3.5, 4]} intensity={1.7} color="#ffe6c8" />
      <directionalLight position={[3.5, 1, -3]} intensity={0.9} color={PALETTE.ice} />
      {/* a subtle three-quarter turn so the hinge and visor curve read in depth */}
      <group rotation={[0.04, -0.2, 0]}>
        <Helmet progress={progress} light={light} />
      </group>
    </>
  );
}
