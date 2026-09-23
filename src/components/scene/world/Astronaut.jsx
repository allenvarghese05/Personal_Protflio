'use client';
import { forwardRef, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';

/**
 * Allen's avatar on the surface. Built from primitives (no model to load) with
 * physically based materials — a matte suit, amber panel, brushed pack and a
 * glossy visor — so it sits in the same light as the mesas. Idle-bobs when
 * still; swings arms/legs when `moving`.
 *
 * The outer group is forwarded so the controller can drive position/heading.
 */

const Astronaut = forwardRef(function Astronaut({ moving = { current: false } }, ref) {
  const bob = useRef();
  const armL = useRef();
  const armR = useRef();
  const legL = useRef();
  const legR = useRef();
  const visor = useRef();

  const suit = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9e5dc', roughness: 0.62, metalness: 0.02 }), []);
  const accent = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.accent, emissive: PALETTE.accent, emissiveIntensity: 0.25, roughness: 0.4 }),
    []
  );
  const pack = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.slate, roughness: 0.45, metalness: 0.55 }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const isMoving = moving.current;
    // Idle bob, or a livelier stride bounce while walking
    if (bob.current) {
      bob.current.position.y = isMoving
        ? Math.abs(Math.sin(t * 9)) * 0.09
        : Math.sin(t * 1.6) * 0.04;
    }
    const swing = isMoving ? Math.sin(t * 9) * 0.7 : Math.sin(t * 1.6) * 0.08;
    if (armL.current) armL.current.rotation.x = swing;
    if (armR.current) armR.current.rotation.x = -swing;
    if (legL.current) legL.current.rotation.x = -swing * 0.8;
    if (legR.current) legR.current.rotation.x = swing * 0.8;
    if (visor.current) {
      visor.current.material.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.06;
    }
  });

  return (
    <group ref={ref}>
      <group ref={bob}>
        {/* Torso */}
        <mesh castShadow position={[0, 0.95, 0]}>
          <capsuleGeometry args={[0.26, 0.5, 6, 16]} />
          <primitive object={suit} attach="material" />
        </mesh>
        {/* Chest control panel */}
        <mesh castShadow position={[0, 0.98, 0.24]}>
          <boxGeometry args={[0.2, 0.16, 0.06]} />
          <primitive object={accent} attach="material" />
        </mesh>

        {/* Backpack */}
        <mesh castShadow position={[0, 1.0, -0.26]}>
          <boxGeometry args={[0.34, 0.42, 0.2]} />
          <primitive object={pack} attach="material" />
        </mesh>

        {/* Helmet */}
        <mesh castShadow position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.27, 24, 24]} />
          <primitive object={suit} attach="material" />
        </mesh>
        {/* Visor */}
        <mesh ref={visor} castShadow position={[0, 1.5, 0.16]} rotation={[0.1, 0, 0]}>
          <sphereGeometry args={[0.2, 20, 20, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
          <meshStandardMaterial
            color={PALETTE.void}
            emissive={PALETTE.ice}
            emissiveIntensity={0.35}
            metalness={0.6}
            roughness={0.12}
          />
        </mesh>

        {/* Arms */}
        <group ref={armL} position={[0.32, 1.18, 0]}>
          <mesh castShadow position={[0, -0.26, 0]}>
            <capsuleGeometry args={[0.09, 0.4, 4, 10]} />
            <primitive object={suit} attach="material" />
          </mesh>
        </group>
        <group ref={armR} position={[-0.32, 1.18, 0]}>
          <mesh castShadow position={[0, -0.26, 0]}>
            <capsuleGeometry args={[0.09, 0.4, 4, 10]} />
            <primitive object={suit} attach="material" />
          </mesh>
        </group>

        {/* Legs */}
        <group ref={legL} position={[0.13, 0.6, 0]}>
          <mesh castShadow position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.11, 0.42, 4, 10]} />
            <primitive object={suit} attach="material" />
          </mesh>
        </group>
        <group ref={legR} position={[-0.13, 0.6, 0]}>
          <mesh castShadow position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.11, 0.42, 4, 10]} />
            <primitive object={suit} attach="material" />
          </mesh>
        </group>
      </group>
    </group>
  );
});

export default Astronaut;
