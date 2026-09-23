'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { STATIONS } from '@/data/world';
import { PALETTE } from '@/lib/palette';
import { worldState } from '@/lib/worldState';
import { useStore } from '@/lib/store';
import { labelVisibility } from '@/lib/worldLabels';

/**
 * The station landmarks — one per district, each facing the landing hub:
 *   Observatory  a stone drum with a brushed dome and a telescope at the stars
 *   Studio       an open concrete gallery pavilion, warm inside, three frames
 *   Comms        a tapered mast with a dish and a blinking amber beacon
 * Walk up (or click) to enter; the name reads from across the causeway.
 */

const concrete = new THREE.MeshStandardMaterial({ color: '#8d857a', roughness: 0.92 });
const darkMetal = new THREE.MeshStandardMaterial({ color: '#2a2d35', roughness: 0.4, metalness: 0.7 });
const brushed = new THREE.MeshStandardMaterial({ color: '#b7b2a8', roughness: 0.32, metalness: 0.65 });

function Observatory() {
  const scope = useRef();
  useFrame((state) => {
    // the telescope slowly tracks across the sky
    if (scope.current) scope.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.5;
  });
  return (
    <group>
      <mesh position-y={1.1} material={concrete} castShadow receiveShadow>
        <cylinderGeometry args={[2.3, 2.5, 2.2, 48]} />
      </mesh>
      <mesh position-y={2.2} material={brushed} castShadow>
        <sphereGeometry args={[2.3, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* observation slit */}
      <mesh position={[0, 3.55, 0.95]} rotation-x={-0.55} material={darkMetal}>
        <boxGeometry args={[0.7, 0.08, 2.2]} />
      </mesh>
      <group ref={scope} position-y={3.1}>
        <mesh position={[0, 0.9, 0.9]} rotation-x={-0.75} material={darkMetal} castShadow>
          <cylinderGeometry args={[0.28, 0.36, 3.2, 20]} />
        </mesh>
      </group>
      {/* door + amber threshold light */}
      <mesh position={[0, 0.9, 2.42]} material={darkMetal}>
        <boxGeometry args={[1.0, 1.8, 0.1]} />
      </mesh>
      <mesh position={[0, 0.03, 2.9]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.2, 0.05]} />
        <meshBasicMaterial color={PALETTE.accent} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Studio() {
  const frames = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    frames.current.forEach((m, i) => m && (m.emissiveIntensity = (0.55 + Math.sin(t * 0.6 + i) * 0.08) * worldState.reveal));
  });
  const W = 6.2;
  const D = 4.6;
  const H = 3.3;
  return (
    <group>
      <mesh position-y={0.1} material={concrete} receiveShadow castShadow>
        <boxGeometry args={[W, 0.2, D]} />
      </mesh>
      {/* back wall + side walls; open to the front (+z) */}
      <mesh position={[0, H / 2 + 0.2, -D / 2 + 0.15]} material={concrete} castShadow receiveShadow>
        <boxGeometry args={[W, H, 0.3]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 - 0.15), H / 2 + 0.2, -0.3]} material={concrete} castShadow receiveShadow>
          <boxGeometry args={[0.3, H, D - 0.6]} />
        </mesh>
      ))}
      <mesh position={[0, H + 0.35, -0.1]} material={concrete} castShadow>
        <boxGeometry args={[W + 0.8, 0.3, D + 0.8]} />
      </mesh>
      {/* three glowing frames on the back wall — the gallery */}
      {[-1.8, 0, 1.8].map((x, i) => (
        <mesh key={x} position={[x, 1.9, -D / 2 + 0.32]}>
          <planeGeometry args={[1.3, i === 1 ? 1.7 : 1.3]} />
          <meshStandardMaterial
            ref={(el) => (frames.current[i] = el)}
            color={i === 1 ? PALETTE.accentHi : PALETTE.sand}
            emissive={i === 1 ? PALETTE.accent : PALETTE.sand}
            emissiveIntensity={0.55}
            roughness={0.6}
          />
        </mesh>
      ))}
      <pointLight position={[0, 2.6, 0]} intensity={4} distance={9} color={PALETTE.accentHi} />
    </group>
  );
}

function CommsTower() {
  const beacon = useRef();
  useFrame((state) => {
    if (!beacon.current) return;
    const on = Math.sin(state.clock.elapsedTime * 2.2) > 0.6;
    beacon.current.emissiveIntensity = (on ? 3 : 0.25) * worldState.reveal;
  });
  return (
    <group>
      <mesh position-y={0.2} material={concrete} castShadow receiveShadow>
        <cylinderGeometry args={[1.4, 1.6, 0.4, 32]} />
      </mesh>
      <mesh position-y={5.6} material={brushed} castShadow>
        <cylinderGeometry args={[0.12, 0.34, 10.8, 12]} />
      </mesh>
      {/* cross-arms */}
      {[3.2, 5.4, 7.6].map((y, i) => (
        <mesh key={y} position-y={y} rotation-y={i * 0.9} material={darkMetal} castShadow>
          <boxGeometry args={[1.6 - i * 0.3, 0.07, 0.07]} />
        </mesh>
      ))}
      {/* dish, aimed out over the clouds */}
      <group position={[0, 4.6, 0.5]} rotation={[0.5, 0, 0]}>
        <mesh material={brushed} castShadow>
          <sphereGeometry args={[1.1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 3.2]} />
        </mesh>
        <mesh position-y={0.55} material={darkMetal}>
          <cylinderGeometry args={[0.04, 0.04, 1.1, 8]} />
        </mesh>
      </group>
      <mesh position-y={11.1}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial ref={beacon} color={PALETTE.accent} emissive={PALETTE.accent} emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

const BUILDERS = { observatory: Observatory, studio: Studio, comms: CommsTower };

function Station({ z }) {
  const Build = BUILDERS[z.id];
  const setEnteredZone = useStore((s) => s.setEnteredZone);
  const hit = useRef();
  const farRef = useRef();
  const nearRef = useRef();
  const vis = useRef({});
  const [x, zz] = z.landmark;
  // label height above each landmark
  const top = z.id === 'comms' ? 12.4 : z.id === 'observatory' ? 5.8 : 4.8;
  // face the landing hub at the origin
  const rotY = useMemo(() => Math.atan2(-x, -zz), [x, zz]);

  useEffect(() => {
    const m = hit.current;
    worldState.interactives.push(m);
    return () => {
      worldState.interactives = worldState.interactives.filter((o) => o !== m);
    };
  }, []);

  useFrame(({ camera }) => {
    const d = Math.hypot(worldState.pos.x - x, worldState.pos.z - zz);
    const near = d < z.near;
    if (nearRef.current) {
      nearRef.current.style.opacity = near ? '1' : '0';
      nearRef.current.style.transform = `translateY(${near ? 0 : 6}px)`;
    }
    if (farRef.current) {
      // the name shows only while the landmark itself is in clear view —
      // mid-height or top — and fades with distance like the fog does
      const v = labelVisibility(vis.current, camera, {
        points: [
          [x, 2.2, zz],
          [x, top - 1.2, zz],
        ],
        dist: d,
        near: z.near + 1,
        far: 46,
      });
      farRef.current.style.opacity = String(v * worldState.reveal);
    }
  });

  const enter = (e) => {
    e.stopPropagation();
    if (useStore.getState().journeyPhase !== 'world') return;
    setEnteredZone(z.id);
  };

  return (
    <group position={[x, 0, zz]}>
      <group rotation-y={rotY}>
        <Build />
      </group>
      {/* invisible hit volume — the whole landmark is one click target */}
      <mesh
        ref={hit}
        position-y={2.5}
        onClick={enter}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <cylinderGeometry args={[z.block, z.block, 5, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html center position={[0, top, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="relative flex flex-col items-center">
          <div ref={farRef} className="world-label" style={{ opacity: 0 }}>
            <span className="world-label__name">{z.label}</span>
            <span className="world-label__meta">{z.blurb}</span>
            <span className="world-label__tick" />
          </div>
          <div ref={nearRef} className="stone-tag absolute top-0" style={{ opacity: 0 }}>
            <span className="stone-tag__kicker" style={{ color: PALETTE.accent }}>{z.blurb}</span>
            <span className="stone-tag__name">{z.label}</span>
            <span className="stone-tag__cta">
              Click or press <kbd>E</kbd> to enter
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

export default function Landmarks() {
  return (
    <group>
      {STATIONS.map((z) => (
        <Station key={z.id} z={z} />
      ))}
    </group>
  );
}
