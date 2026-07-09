'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { ENTRY, entryState } from '@/lib/entrySequence';

/**
 * The galaxy revealed when the camera pulls back from the hero planet, and
 * the voyager that crosses it. The hero planet is NOT duplicated — it stays
 * where it is (0, 0.5, -11) and simply becomes "ALLEN'S WORLD", labeled and
 * haloed, one world among many. Everything here is gated on phase==='dive'
 * and fades in with entryState.pull, so the hero view is untouched.
 */

export const ALLENS_WORLD = new THREE.Vector3(0, 0.5, -11);
const SYSTEM_C = new THREE.Vector3(-10, 0, -34); // implied sun of the system

/* Other worlds of the system — scattered wide, characters of their own. */
const PLANETS = [
  { id: 'ice', pos: [-13, 3.5, -26], r: 2.2, color: '#1a3a6a', emissive: '#0a1a3a', ring: true },
  { id: 'rust', pos: [-3.5, -3.5, -20], r: 1.4, color: '#6a2010', emissive: '#200a04', rough: 0.9 },
  { id: 'giant', pos: [-28, 7, -62], r: 9, color: '#4a3a1a', emissive: '#1a1206', banded: true },
  { id: 'teal', pos: [9, -1.5, -34], r: 2.0, color: '#1a4a3a', emissive: '#0a2a1a', glow: '#2a8a6a' },
];

/* ── canvas textures ─────────────────────────────────────────────────────── */

function makeNebulaTexture(hex) {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, `${hex}cc`);
  g.addColorStop(0.5, `${hex}55`);
  g.addColorStop(1, `${hex}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLabelTexture(text) {
  const font = '700 64px "JetBrains Mono", ui-monospace, monospace';
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = font;
  const spaced = text.split('').join(' ');
  const pad = 60;
  const w = Math.ceil(meas.measureText(spaced).width) + pad * 2;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#e8a040';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#e8a040';
  ctx.fillText(spaced, w / 2, h / 2);
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(spaced, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { aspect: w / h };
  return tex;
}

/* Gas-giant banding — cheap onBeforeCompile stripe modulation. */
function bandedMaterial(color, emissive) {
  const m = new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.85 });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       float band = sin(vBandY * 22.0) * 0.5 + sin(vBandY * 9.0 + 1.7) * 0.5;
       diffuseColor.rgb *= 0.85 + band * 0.15;`
    );
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vBandY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBandY = position.y;');
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nvarying float vBandY;'
    );
  };
  return m;
}

/* ── backdrop: deep star layers + Milky Way band + nebula wisps ──────────── */

function starLayer(count, rMin, rMax, tint, size) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const base = new THREE.Color(tint);
  for (let i = 0; i < count; i++) {
    const r = rMin + Math.random() * (rMax - rMin);
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
    positions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    positions[i * 3 + 2] = r * Math.cos(ph);
    const v = 0.5 + Math.random() * 0.5;
    colors[i * 3] = base.r * v;
    colors[i * 3 + 1] = base.g * v;
    colors[i * 3 + 2] = base.b * v;
  }
  return { positions, colors, size };
}

function GalaxyBackdrop() {
  const group = useRef();
  const layers = useMemo(
    () => [
      starLayer(3200, 80, 150, '#fff2e0', 0.5),
      starLayer(2600, 50, 90, '#dfeaff', 0.32),
    ],
    []
  );
  // The Milky Way band — a diagonal slab of denser, bluer stars
  const band = useMemo(() => {
    const count = 2400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const blue = new THREE.Color('#b8ccff');
    const warm = new THREE.Color('#ffe8d0');
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 260;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 26 * (1 - Math.abs(Math.random() - 0.5));
      positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
      const c = Math.random() < 0.75 ? blue : warm;
      const v = 0.4 + Math.random() * 0.6;
      colors[i * 3] = c.r * v;
      colors[i * 3 + 1] = c.g * v;
      colors[i * 3 + 2] = c.b * v;
    }
    return { positions, colors };
  }, []);
  const nebulae = useMemo(
    () => [
      { tex: makeNebulaTexture('#2a0a4a'), pos: [-70, 26, -130], scale: 95 },
      { tex: makeNebulaTexture('#0a2a3a'), pos: [48, -14, -150], scale: 80 },
      { tex: makeNebulaTexture('#3a1a00'), pos: [-8, -34, -120], scale: 65 },
    ],
    []
  );

  useFrame(() => {
    if (group.current) group.current.rotation.y += 0.00008;
  });

  return (
    <group ref={group}>
      {layers.map((l, i) => (
        <points key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[l.positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[l.colors, 3]} />
          </bufferGeometry>
          <pointsMaterial vertexColors size={l.size} sizeAttenuation transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </points>
      ))}
      <points position={[-20, 10, -90]} rotation={[0.5, 0.3, 0.55]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[band.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[band.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial vertexColors size={0.34} sizeAttenuation transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </points>
      {nebulae.map((n, i) => (
        <sprite key={i} position={n.pos} scale={[n.scale, n.scale, 1]}>
          <spriteMaterial map={n.tex} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </sprite>
      ))}
    </group>
  );
}

/* ── orbital paths ───────────────────────────────────────────────────────── */

function OrbitRing({ planetPos, amber = false }) {
  const ref = useRef();
  const geo = useMemo(() => {
    const p = new THREE.Vector3(...planetPos);
    const r = Math.hypot(p.x - SYSTEM_C.x, p.z - SYSTEM_C.z);
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(SYSTEM_C.x + Math.cos(a) * r, p.y, SYSTEM_C.z + Math.sin(a) * r));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [planetPos]);
  useFrame(() => {
    if (ref.current) ref.current.material.opacity = (amber ? 0.12 : 0.06) * entryState.pull;
  });
  return (
    <line ref={ref} geometry={geo}>
      <lineBasicMaterial color={amber ? '#e8a040' : '#ffffff'} transparent opacity={0} depthWrite={false} />
    </line>
  );
}

/* ── the other worlds ────────────────────────────────────────────────────── */

function OtherPlanet({ def }) {
  const meshRef = useRef();
  const mat = useMemo(
    () =>
      def.banded
        ? bandedMaterial(def.color, def.emissive)
        : new THREE.MeshStandardMaterial({
            color: def.color,
            emissive: def.emissive,
            emissiveIntensity: 0.5,
            roughness: def.rough ?? 0.7,
          }),
    [def]
  );
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * (def.banded ? 0.02 : 0.06);
  });
  return (
    <group position={def.pos}>
      <mesh ref={meshRef} material={mat}>
        <sphereGeometry args={[def.r, 40, 40]} />
      </mesh>
      {def.ring && (
        <mesh rotation={[Math.PI / 2 - 0.52, 0.2, 0]}>
          <torusGeometry args={[def.r * 1.7, def.r * 0.22, 2, 80]} />
          <meshBasicMaterial color="#8aa4c8" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {def.glow && (
        <mesh>
          <sphereGeometry args={[def.r * 1.25, 32, 32]} />
          <meshBasicMaterial color={def.glow} transparent opacity={0.16} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* ── asteroid belt (instanced) ───────────────────────────────────────────── */

function AsteroidArc() {
  const ref = useRef();
  const COUNT = 60;
  useFrame(() => {
    if (!ref.current) return;
    if (!ref.current.userData.seeded) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      for (let i = 0; i < COUNT; i++) {
        const a = 0.4 + (i / COUNT) * 2.2 + Math.random() * 0.05;
        const r = 15 + Math.random() * 3;
        const s = 0.1 + Math.random() * 0.22;
        e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(SYSTEM_C.x + Math.cos(a) * r, -1 + Math.random() * 3, SYSTEM_C.z + Math.sin(a) * r),
          q,
          new THREE.Vector3(s, s, s)
        );
        ref.current.setMatrixAt(i, m);
      }
      ref.current.instanceMatrix.needsUpdate = true;
      ref.current.userData.seeded = true;
    }
    ref.current.rotation.y += 0.0001;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#4a4038" roughness={0.95} />
    </instancedMesh>
  );
}

/* ── Allen's World designation: label sprite + tether + halo ring ────────── */

function AllensWorldMark() {
  const labelRef = useRef();
  const lineRef = useRef();
  const haloRef = useRef();
  const tex = useMemo(() => makeLabelTexture("ALLEN'S WORLD"), []);
  const lineGeo = useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 4.7, 0),
        new THREE.Vector3(0, 6.6, 0),
      ]),
    []
  );
  useFrame((state) => {
    const p = entryState.pull;
    const t = state.clock.elapsedTime;
    if (labelRef.current) labelRef.current.material.opacity = p * 0.95;
    if (lineRef.current) lineRef.current.material.opacity = p * 0.7;
    if (haloRef.current) {
      haloRef.current.material.opacity = p * (0.3 + Math.sin(t * 2.4) * 0.12);
      haloRef.current.rotation.z = t * 0.25;
    }
  });
  const aspect = tex.userData?.aspect || 5;
  return (
    <group position={ALLENS_WORLD.toArray()}>
      <sprite ref={labelRef} position={[0, 7.6, 0]} scale={[1.5 * aspect, 1.5, 1]}>
        <spriteMaterial map={tex} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </sprite>
      <line ref={lineRef} geometry={lineGeo}>
        <lineBasicMaterial color="#e8a040" transparent opacity={0} depthWrite={false} />
      </line>
      <mesh ref={haloRef} rotation={[Math.PI / 2.4, 0.2, 0]}>
        <torusGeometry args={[5.1, 0.045, 8, 96]} />
        <meshBasicMaterial color="#e8a040" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function GalaxyScene() {
  const phase = useStore((s) => s.phase);
  if (phase !== 'dive') return null;
  return (
    <group>
      <GalaxyBackdrop />
      {PLANETS.map((p) => (
        <OtherPlanet key={p.id} def={p} />
      ))}
      <OrbitRing planetPos={ALLENS_WORLD.toArray()} amber />
      {PLANETS.map((p) => (
        <OrbitRing key={`ring-${p.id}`} planetPos={p.pos} />
      ))}
      <AsteroidArc />
      <AllensWorldMark />
      {/* a faint sun at the system's heart so the new worlds read */}
      <pointLight position={SYSTEM_C.toArray()} intensity={2.2} distance={90} decay={1.2} color="#ffe8c8" />
    </group>
  );
}

/* ── THE VOYAGER — the ship that crosses the galaxy on your behalf ───────── */

// Launch low in the overview frame → arc across the system, past the ice
// world → final run into Allen's World. Contact at ENTRY.FLASH.
export const VOYAGE_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(5.5, -6, 6),
  new THREE.Vector3(4.6, -0.5, 3.4),
  new THREE.Vector3(0.5, 3.4, -4),
  new THREE.Vector3(-8.5, 4.6, -19),
  new THREE.Vector3(-4.5, 2.4, -18),
  new THREE.Vector3(ALLENS_WORLD.x, ALLENS_WORLD.y, ALLENS_WORLD.z),
]);

const EXHAUST_COUNT = 240;
const EXHAUST_LIFE = 0.8;
const UP = new THREE.Vector3(0, 1, 0);

// The hero planet's surface (radius 4 + a touch of atmosphere). The voyage is
// reparameterized so the nose touches this line EXACTLY at ENTRY.FLASH — the
// bang fires the instant the ship enters, and it is never seen inside.
const PLANET_R = 4.05;
const E_SURF = (() => {
  const p = new THREE.Vector3();
  for (let i = 1000; i >= 0; i--) {
    VOYAGE_PATH.getPoint(i / 1000, p);
    if (p.distanceTo(ALLENS_WORLD) >= PLANET_R) return Math.min(1, (i + 1) / 1000);
  }
  return 1;
})();

/**
 * Shared voyage sampler — the rocket and the chase camera both read this so
 * they can never disagree about where the ship is. Returns raw progress k.
 */
export function voyagePose(t, pos, tan) {
  const k = THREE.MathUtils.clamp((t - ENTRY.LAUNCH) / (ENTRY.FLASH - ENTRY.LAUNCH), 0, 1);
  const e = k * k * (3 - 2 * k) * E_SURF;
  pos && VOYAGE_PATH.getPoint(e, pos);
  tan && VOYAGE_PATH.getTangent(e, tan).normalize();
  return k;
}

export function VoyagerRocket() {
  const phase = useStore((s) => s.phase);
  const group = useRef();
  const engineLight = useRef();
  const exhaustGeo = useRef();
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const nozzleWorld = useMemo(() => new THREE.Vector3(), []);

  const exhaust = useMemo(() => {
    const positions = new Float32Array(EXHAUST_COUNT * 3);
    const colors = new Float32Array(EXHAUST_COUNT * 3);
    const vel = new Float32Array(EXHAUST_COUNT * 3);
    const age = new Float32Array(EXHAUST_COUNT);
    for (let i = 0; i < EXHAUST_COUNT; i++) age[i] = Math.random() * EXHAUST_LIFE;
    return { positions, colors, vel, age };
  }, []);
  const hot = useMemo(() => new THREE.Color('#f0a020'), []);
  const cold = useMemo(() => new THREE.Color('#200800'), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    if (phase !== 'dive' || entryState.t < ENTRY.LAUNCH) {
      g.visible = false;
      return;
    }
    g.visible = true;

    // progress along the crossing — ease in/out so the launch feels like a
    // climb; contact with the surface lands exactly on the FLASH beat
    const k = voyagePose(entryState.t, g.position, tangent);
    // safety: past contact the ship belongs to the planet — never render it
    if (k >= 1 || g.position.distanceTo(ALLENS_WORLD) < PLANET_R - 0.1) {
      g.visible = false;
      if (engineLight.current) engineLight.current.intensity = 0;
      return;
    }
    quat.setFromUnitVectors(UP, tangent);
    g.quaternion.slerp(quat, 0.25);

    const thrust = 0.7 + Math.sin(state.clock.elapsedTime * 30) * 0.15 + k * 0.5;
    if (engineLight.current) engineLight.current.intensity = thrust * 4;

    // exhaust — recycled particles streaming back from the nozzles
    nozzleWorld.copy(g.position).addScaledVector(tangent, -0.55);
    const { positions, colors, vel, age } = exhaust;
    for (let i = 0; i < EXHAUST_COUNT; i++) {
      age[i] += delta;
      if (age[i] >= EXHAUST_LIFE) {
        age[i] = 0;
        positions[i * 3] = nozzleWorld.x + (Math.random() - 0.5) * 0.08;
        positions[i * 3 + 1] = nozzleWorld.y + (Math.random() - 0.5) * 0.08;
        positions[i * 3 + 2] = nozzleWorld.z + (Math.random() - 0.5) * 0.08;
        vel[i * 3] = -tangent.x * (2.2 + Math.random()) + (Math.random() - 0.5) * 0.5;
        vel[i * 3 + 1] = -tangent.y * (2.2 + Math.random()) + (Math.random() - 0.5) * 0.5;
        vel[i * 3 + 2] = -tangent.z * (2.2 + Math.random()) + (Math.random() - 0.5) * 0.5;
      }
      positions[i * 3] += vel[i * 3] * delta;
      positions[i * 3 + 1] += vel[i * 3 + 1] * delta;
      positions[i * 3 + 2] += vel[i * 3 + 2] * delta;
      const life = age[i] / EXHAUST_LIFE;
      tmpC.copy(hot).lerp(cold, life);
      colors[i * 3] = tmpC.r;
      colors[i * 3 + 1] = tmpC.g;
      colors[i * 3 + 2] = tmpC.b;
    }
    if (exhaustGeo.current) {
      exhaustGeo.current.attributes.position.needsUpdate = true;
      exhaustGeo.current.attributes.color.needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={group} visible={false} scale={0.9}>
        {/* main body — tapered */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.13, 0.22, 0.9, 16]} />
          <meshStandardMaterial color="#1a1a2a" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* nose cone */}
        <mesh position={[0, 0.72, 0]}>
          <coneGeometry args={[0.13, 0.36, 16]} />
          <meshStandardMaterial color="#242438" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* engine nozzles — flared */}
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.1, -0.42, Math.sin(a) * 0.1]}>
              <cylinderGeometry args={[0.05, 0.08, 0.14, 10]} />
              <meshStandardMaterial color="#0e0e18" metalness={0.9} roughness={0.35} />
            </mesh>
          );
        })}
        {/* fins */}
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, (i / 3) * Math.PI * 2, 0]}>
            <mesh position={[0.24, -0.22, 0]} rotation={[0, 0, -0.35]}>
              <boxGeometry args={[0.24, 0.3, 0.03]} />
              <meshStandardMaterial color="#141426" metalness={0.7} roughness={0.4} />
            </mesh>
          </group>
        ))}
        <pointLight ref={engineLight} position={[0, -0.55, 0]} color="#e8a040" intensity={0} distance={6} decay={2} />
      </group>

      {/* exhaust lives in world space so it trails properly */}
      <points frustumCulled={false} visible={phase === 'dive'}>
        <bufferGeometry ref={exhaustGeo}>
          <bufferAttribute attach="attributes-position" args={[exhaust.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[exhaust.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial vertexColors size={0.14} sizeAttenuation transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </>
  );
}
