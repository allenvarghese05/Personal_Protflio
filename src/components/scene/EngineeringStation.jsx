'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { chapters } from '@/data/timeline';
import MemoryNode from './MemoryNode';

const STATION = new THREE.Vector3(4, 4, -26);
const engineering = chapters.find((c) => c.index === 2);

/**
 * Chapter 2 — Engineering Station. A modular orbital station (the place where
 * Allen "ships real things") surrounded by interactive work modules. The IET
 * Church Building System is the signature module — brighter, ringed, central.
 *
 * The structure itself slowly rotates; the interactive modules live at fixed
 * world positions (from timeline.js) so they stay stable to click.
 */
export default function EngineeringStation() {
  return (
    <group>
      <StationStructure />
      {engineering?.memories.map((m) => (
        <MemoryNode key={m.id} memory={m} variant="module" />
      ))}
    </group>
  );
}

function StationStructure() {
  const spin = useRef();
  const dish = useRef();
  const navA = useRef();
  const navB = useRef();

  // Solar-panel grid material (emissive cells)
  const panelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#16263d',
        emissive: '#1d4a7a',
        emissiveIntensity: 0.5,
        metalness: 0.7,
        roughness: 0.35,
      }),
    []
  );
  const hullMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#9aa3b2',
        metalness: 0.85,
        roughness: 0.35,
      }),
    []
  );
  // Warm glowing window/accent strip
  const accentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffb259',
        emissive: '#ff8a3d',
        emissiveIntensity: 1.6,
        toneMapped: false,
      }),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (spin.current) spin.current.rotation.y = t * 0.08;
    if (dish.current) dish.current.rotation.z = Math.sin(t * 0.3) * 0.3;
    // Blinking nav beacons
    if (navA.current)
      navA.current.material.opacity = 0.4 + Math.abs(Math.sin(t * 2)) * 0.6;
    if (navB.current)
      navB.current.material.opacity =
        0.4 + Math.abs(Math.sin(t * 2 + Math.PI)) * 0.6;
  });

  return (
    <group position={STATION.toArray()} scale={1.0}>
      {/* Key + fill light so the station reads as a lit object against the void.
          Kept short-range so they don't tint the distant asteroid field. */}
      <pointLight position={[2, 1, 4]} intensity={9} distance={13} color="#cfe0ff" />
      <pointLight position={[-3, -1, 1]} intensity={2.5} distance={8} color="#ff9a5a" />

      <group ref={spin}>
        {/* Central spine */}
        <mesh material={hullMat}>
          <cylinderGeometry args={[0.5, 0.5, 3.2, 16]} />
        </mesh>
        {/* Habitat modules stacked on the spine, each banded with a glow strip */}
        {[-0.9, 0, 0.9].map((y, i) => (
          <group key={i} position={[0, y, 0]}>
            <mesh material={hullMat}>
              <cylinderGeometry args={[0.72, 0.72, 0.5, 20]} />
            </mesh>
            <mesh material={accentMat}>
              <cylinderGeometry args={[0.74, 0.74, 0.12, 20]} />
            </mesh>
          </group>
        ))}

        {/* Docking ring around the core — softly lit */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.4, 0.08, 12, 48]} />
          <meshStandardMaterial
            color="#aab4c6"
            emissive="#3a6ea5"
            emissiveIntensity={0.5}
            metalness={0.85}
            roughness={0.3}
          />
        </mesh>
        {/* Ring strut spokes */}
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            rotation={[0, 0, (i * Math.PI) / 2]}
            position={[0, 0, 0]}
            material={hullMat}
          >
            <boxGeometry args={[2.8, 0.07, 0.07]} />
          </mesh>
        ))}

        {/* Solar panel arrays on extending arms */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 2.6, 0, 0]}>
            <mesh material={hullMat} position={[-side * 0.7, 0, 0]}>
              <boxGeometry args={[1.4, 0.08, 0.08]} />
            </mesh>
            <mesh material={panelMat}>
              <boxGeometry args={[1.6, 0.04, 2.4]} />
            </mesh>
            {/* Panel cell grid lines */}
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[1.6, 0.01, 0.04]} />
              <meshBasicMaterial color="#3a6ea5" />
            </mesh>
          </group>
        ))}

        {/* Communications dish */}
        <group ref={dish} position={[0, 1.7, 0.6]} rotation={[0.5, 0, 0]}>
          <mesh>
            <sphereGeometry
              args={[0.55, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.5]}
            />
            <meshStandardMaterial
              color="#cdd6e6"
              metalness={0.5}
              roughness={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
            <meshBasicMaterial color="#ff8a3d" />
          </mesh>
        </group>

        {/* Blinking nav beacons */}
        <mesh ref={navA} position={[2.9, 0, 1.2]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial color="#ff5a4d" transparent opacity={1} />
        </mesh>
        <mesh ref={navB} position={[-2.9, 0, 1.2]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial color="#5affa0" transparent opacity={1} />
        </mesh>
      </group>
    </group>
  );
}
