'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ENTRY, entryState } from '@/lib/entrySequence';
import { PALETTE } from '@/lib/palette';
import { ALLENS_WORLD, WORLD_MARK } from './cosmos';

/**
 * THE VOYAGER — the journey's only rocket. It lifts off just below the
 * camera's mid-shot of Allen's World, arcs out, and makes its run into the
 * planet; the chase cam (IntroCamera) rides it in. Contact lands exactly on
 * ENTRY.FLASH.
 */

const SCALE = 0.22; // ship length ≈ 0.25 — Allen's World radius is 1
const UP = new THREE.Vector3(0, 1, 0);

// Path, planned in world space from the camera's mark to the planet centre
const toPlanet = ALLENS_WORLD.position.clone().sub(WORLD_MARK).normalize();
const right = new THREE.Vector3().crossVectors(toPlanet, UP).normalize();
const dist = ALLENS_WORLD.position.distanceTo(WORLD_MARK);

export const VOYAGE_PATH = new THREE.CatmullRomCurve3([
  WORLD_MARK.clone().addScaledVector(toPlanet, 0.5).addScaledVector(UP, -1.0).addScaledVector(right, 0.35),
  WORLD_MARK.clone().addScaledVector(toPlanet, dist * 0.25).addScaledVector(UP, -0.2).addScaledVector(right, 0.9),
  WORLD_MARK.clone().addScaledVector(toPlanet, dist * 0.6).addScaledVector(UP, 0.5).addScaledVector(right, 0.8),
  ALLENS_WORLD.position.clone(),
]);

// Reparameterize so the nose touches the atmosphere EXACTLY at ENTRY.FLASH —
// the bang fires the instant the ship enters; it is never seen inside.
const SURFACE_R = ALLENS_WORLD.size * 1.03;
const E_SURF = (() => {
  const p = new THREE.Vector3();
  for (let i = 1000; i >= 0; i--) {
    VOYAGE_PATH.getPoint(i / 1000, p);
    if (p.distanceTo(ALLENS_WORLD.position) >= SURFACE_R) return Math.min(1, (i + 1) / 1000);
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

const EXHAUST_COUNT = 240;
const EXHAUST_LIFE = 0.8;

export default function Voyager() {
  const group = useRef();
  const engineLight = useRef();
  const exhaustGeo = useRef();
  const exhaustPts = useRef();
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const nozzle = useMemo(() => new THREE.Vector3(), []);

  const exhaust = useMemo(() => {
    const positions = new Float32Array(EXHAUST_COUNT * 3);
    const colors = new Float32Array(EXHAUST_COUNT * 3);
    const vel = new Float32Array(EXHAUST_COUNT * 3);
    const age = new Float32Array(EXHAUST_COUNT);
    for (let i = 0; i < EXHAUST_COUNT; i++) age[i] = Math.random() * EXHAUST_LIFE;
    return { positions, colors, vel, age };
  }, []);
  const hot = useMemo(() => new THREE.Color(PALETTE.accentHi), []);
  const cold = useMemo(() => new THREE.Color('#200800'), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = entryState.t;
    const flying = entryState.active && t >= ENTRY.LAUNCH;
    if (exhaustPts.current) exhaustPts.current.visible = flying;
    if (!flying) {
      g.visible = false;
      return;
    }

    const k = voyagePose(t, g.position, tangent);
    // past contact the ship belongs to the planet — never render it inside
    if (k >= 1 || g.position.distanceTo(ALLENS_WORLD.position) < SURFACE_R - 0.02) {
      g.visible = false;
      if (engineLight.current) engineLight.current.intensity = 0;
      return;
    }
    g.visible = true;
    quat.setFromUnitVectors(UP, tangent);
    g.quaternion.slerp(quat, 0.25);

    const thrust = 0.7 + Math.sin(state.clock.elapsedTime * 30) * 0.15 + k * 0.5;
    if (engineLight.current) engineLight.current.intensity = thrust * 1.2;

    // exhaust — recycled particles streaming back from the nozzles
    nozzle.copy(g.position).addScaledVector(tangent, -0.55 * SCALE);
    const { positions, colors, vel, age } = exhaust;
    for (let i = 0; i < EXHAUST_COUNT; i++) {
      age[i] += delta;
      if (age[i] >= EXHAUST_LIFE) {
        age[i] = 0;
        positions[i * 3] = nozzle.x + (Math.random() - 0.5) * 0.02;
        positions[i * 3 + 1] = nozzle.y + (Math.random() - 0.5) * 0.02;
        positions[i * 3 + 2] = nozzle.z + (Math.random() - 0.5) * 0.02;
        const sp = (2.2 + Math.random()) * SCALE;
        vel[i * 3] = -tangent.x * sp + (Math.random() - 0.5) * 0.1;
        vel[i * 3 + 1] = -tangent.y * sp + (Math.random() - 0.5) * 0.1;
        vel[i * 3 + 2] = -tangent.z * sp + (Math.random() - 0.5) * 0.1;
      }
      positions[i * 3] += vel[i * 3] * delta;
      positions[i * 3 + 1] += vel[i * 3 + 1] * delta;
      positions[i * 3 + 2] += vel[i * 3 + 2] * delta;
      tmpC.copy(hot).lerp(cold, age[i] / EXHAUST_LIFE);
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
      <group ref={group} visible={false} scale={SCALE}>
        {/* main body — tapered */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.13, 0.22, 0.9, 16]} />
          <meshStandardMaterial color="#d9d4ca" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* nose cone */}
        <mesh position={[0, 0.72, 0]}>
          <coneGeometry args={[0.13, 0.36, 16]} />
          <meshStandardMaterial color={PALETTE.accent} metalness={0.5} roughness={0.35} />
        </mesh>
        {/* engine nozzles — flared */}
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.1, -0.42, Math.sin(a) * 0.1]}>
              <cylinderGeometry args={[0.05, 0.08, 0.14, 10]} />
              <meshStandardMaterial color="#1a1c22" metalness={0.9} roughness={0.35} />
            </mesh>
          );
        })}
        {/* fins */}
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, (i / 3) * Math.PI * 2, 0]}>
            <mesh position={[0.24, -0.22, 0]} rotation={[0, 0, -0.35]}>
              <boxGeometry args={[0.24, 0.3, 0.03]} />
              <meshStandardMaterial color="#2a2d36" metalness={0.7} roughness={0.4} />
            </mesh>
          </group>
        ))}
        <pointLight ref={engineLight} position={[0, -0.6, 0]} color={PALETTE.accent} intensity={0} distance={1.5} decay={2} />
      </group>

      {/* exhaust lives in world space so it trails properly */}
      <points ref={exhaustPts} frustumCulled={false} visible={false}>
        <bufferGeometry ref={exhaustGeo}>
          <bufferAttribute attach="attributes-position" args={[exhaust.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[exhaust.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial vertexColors size={0.035} sizeAttenuation transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </>
  );
}
