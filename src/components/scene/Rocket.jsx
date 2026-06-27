'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { scrollState } from '@/lib/scrollState';
import { HERO_END } from '@/lib/journey';

const PAD = new THREE.Vector3(0, -1.9, 1.5); // low on the launch pad (bottom of frame)
const ROCKET_END = new THREE.Vector3(0, 0.5, -7); // leads ahead, in front of the planet

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Ember trail — sparks from the thruster, recycled as they age. Visual
 * intensity follows `thrustRef`, so it's dead during boot and roars on launch.
 */
function ThrusterTrail({ thrustRef, count = 70 }) {
  const geoRef = useRef();
  const matRef = useRef();

  const { positions, velocities, ages, lifetimes, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    const ages = new Float32Array(count);
    const lifetimes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      ages[i] = Math.random();
      lifetimes[i] = 0.6 + Math.random() * 0.8;
      velocities[i] = 2.5 + Math.random() * 2.5;
    }
    return { positions, velocities, ages, lifetimes, colors };
  }, [count]);

  const hot = useMemo(() => new THREE.Color('#fff1c9'), []);
  const mid = useMemo(() => new THREE.Color('#ff8a3d'), []);
  const cool = useMemo(() => new THREE.Color('#f5b544'), []);

  useFrame((state, delta) => {
    const geo = geoRef.current;
    if (!geo) return;
    const thrust = thrustRef.current;
    const tmp = new THREE.Color();
    for (let i = 0; i < count; i++) {
      ages[i] += delta;
      if (ages[i] >= lifetimes[i]) {
        ages[i] = 0;
        positions[i * 3] = (Math.random() - 0.5) * 0.12;
        positions[i * 3 + 1] = -0.95;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
      } else {
        positions[i * 3 + 1] -= velocities[i] * delta * (0.5 + thrust);
        positions[i * 3] += (Math.random() - 0.5) * delta * 0.3;
        positions[i * 3 + 2] += (Math.random() - 0.5) * delta * 0.3;
      }
      const life = ages[i] / lifetimes[i];
      if (life < 0.4) tmp.copy(hot).lerp(mid, life / 0.4);
      else tmp.copy(mid).lerp(cool, (life - 0.4) / 0.6);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    if (matRef.current) {
      matRef.current.opacity = Math.max(0, thrust - 0.1) * 0.95;
      matRef.current.size = 0.08 + thrust * 0.14;
    }
  });

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        vertexColors
        size={0.14}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function Rocket() {
  const groupRef = useRef();
  const flameRef = useRef();
  const lightRef = useRef();
  const windowRef = useRef();
  const thrustRef = useRef(0);

  const phase = useStore((s) => s.phase);
  const rattleAt = useStore((s) => s.rattleAt);

  const prevPhase = useRef(phase);
  const phaseEntry = useRef(0);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    // Track when we entered the current phase (for time-based ramps)
    if (prevPhase.current !== phase) {
      prevPhase.current = phase;
      phaseEntry.current = t;
    }
    const since = t - phaseEntry.current;

    // Early-scroll rattle (decays over ~350ms)
    const rattle =
      rattleAt && typeof performance !== 'undefined'
        ? Math.max(0, 1 - (performance.now() - rattleAt) / 350)
        : 0;

    let thrust = 0;

    if (phase === 'boot') {
      // Dark, cold engine — only smoke. Faint idle tremble + rattle on nudge.
      thrust = 0;
      const shake = 0.01 + rattle * 0.07;
      g.position.set(
        PAD.x + (Math.random() - 0.5) * shake,
        PAD.y + (Math.random() - 0.5) * shake,
        PAD.z
      );
      g.rotation.z = (Math.random() - 0.5) * shake;
    } else if (phase === 'ignition') {
      // Fire erupts, then settles toward an active idle
      const erupt = Math.min(1, since / 0.25);
      const fall = THREE.MathUtils.clamp((since - 0.4) / 1.2, 0, 1);
      thrust = erupt - fall * 0.45;
      const shake = 0.06 + rattle * 0.06;
      g.position.set(
        PAD.x + (Math.random() - 0.5) * shake,
        PAD.y + (Math.random() - 0.5) * shake,
        PAD.z
      );
      g.rotation.z = (Math.random() - 0.5) * shake * 0.6;
    } else if (phase === 'ready') {
      // Active idle — held down, flame breathing, ready to commit
      thrust = 0.5 + Math.sin(t * 6) * 0.06;
      const shake = 0.018;
      g.position.set(
        PAD.x + (Math.random() - 0.5) * shake,
        PAD.y,
        PAD.z
      );
      g.rotation.z = Math.sin(t * 2) * 0.01;
    } else {
      // flight — rocket leads toward the planet within the hero portion,
      // then parks (the camera flies on through the chapters)
      const p = Math.min(1, scrollState.progress / HERO_END);
      const k = easeOutCubic(Math.min(1, p / 0.7));
      const hover = p > 0.7 ? Math.sin(t * 0.8) * 0.08 : 0;
      g.position.set(
        THREE.MathUtils.lerp(PAD.x, ROCKET_END.x, k),
        THREE.MathUtils.lerp(PAD.y, ROCKET_END.y, k) + hover,
        THREE.MathUtils.lerp(PAD.z, ROCKET_END.z, k)
      );
      g.rotation.z = Math.sin(t * 0.4) * 0.03;
      // Full burn on the way, engine eases as it arrives
      thrust = p < 0.7 ? 1.0 : THREE.MathUtils.lerp(1.0, 0.4, (p - 0.7) / 0.3);
    }

    thrustRef.current = thrust;

    // Flame + reveal light track thrust
    if (flameRef.current) {
      const flicker = 1 + Math.sin(t * 30) * 0.15 + Math.random() * 0.08;
      flameRef.current.scale.set(
        0.6 + thrust * 0.5,
        (0.25 + thrust * 1.25) * flicker,
        0.6 + thrust * 0.5
      );
      flameRef.current.visible = thrust > 0.04;
    }
    if (lightRef.current) {
      lightRef.current.intensity = thrust * 6.5 + (thrust > 0.04 ? Math.sin(t * 25) * 0.6 : 0);
    }
    // Cockpit running light only once the engine is lit (dark in boot)
    if (windowRef.current) {
      const target = thrust > 0.04 ? 1.2 : 0;
      windowRef.current.emissiveIntensity +=
        (target - windowRef.current.emissiveIntensity) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={PAD.toArray()}>
      {/* Body */}
      <mesh>
        <cylinderGeometry args={[0.32, 0.38, 1.4, 24]} />
        <meshStandardMaterial color="#e9e4d6" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Nose cone */}
      <mesh position={[0, 0.95, 0]}>
        <coneGeometry args={[0.32, 0.55, 24]} />
        <meshStandardMaterial color="#ff8a3d" metalness={0.5} roughness={0.35} />
      </mesh>

      {/* Window — lights up with the engine (dark during boot) */}
      <mesh position={[0, 0.25, 0.34]}>
        <circleGeometry args={[0.12, 24]} />
        <meshStandardMaterial
          ref={windowRef}
          color="#6fb0ee"
          emissive="#6fb0ee"
          emissiveIntensity={0}
        />
      </mesh>

      {/* Fins */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, -0.6, 0]} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
          <mesh position={[0.34, 0, 0]} rotation={[0, 0, -0.3]}>
            <boxGeometry args={[0.05, 0.5, 0.3]} />
            <meshStandardMaterial color="#4a90d9" metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Thruster nozzle */}
      <mesh position={[0, -0.78, 0]}>
        <cylinderGeometry args={[0.34, 0.26, 0.22, 24]} />
        <meshStandardMaterial color="#3a3a42" metalness={0.8} roughness={0.4} />
      </mesh>

      {/* Flame core */}
      <mesh ref={flameRef} position={[0, -1.1, 0]} visible={false}>
        <coneGeometry args={[0.26, 0.7, 20]} />
        <meshBasicMaterial
          color="#ffcf6b"
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Thruster glow — the key light that reveals the rocket on ignition */}
      <pointLight
        ref={lightRef}
        position={[0, -1.2, 0]}
        color="#ff8a3d"
        intensity={0}
        distance={7}
        decay={2}
      />

      {/* Ember trail */}
      <ThrusterTrail thrustRef={thrustRef} />
    </group>
  );
}
