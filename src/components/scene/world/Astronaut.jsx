'use client';
import { forwardRef, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { toonGradient } from '@/lib/toon';

/**
 * Low-poly, cel-shaded astronaut — Allen's avatar on the surface. Built from
 * primitives (no model to load), toon-shaded with black inverted-hull outlines
 * for the hand-drawn look. Idle-bobs when still; swings arms/legs when `moving`.
 *
 * The outer group is forwarded so the controller can drive position/heading.
 */
const OUTLINE = { thickness: 0.04, color: '#0a0a12' };

const Astronaut = forwardRef(function Astronaut({ moving = { current: false } }, ref) {
  const grad = useMemo(toonGradient, []);
  const bob = useRef();
  const armL = useRef();
  const armR = useRef();
  const legL = useRef();
  const legR = useRef();
  const visor = useRef();

  const suit = useMemo(
    () => ({ gradientMap: grad, color: '#eef1f6' }),
    [grad]
  );
  const accent = useMemo(
    () => ({ gradientMap: grad, color: '#ff8a3d' }),
    [grad]
  );
  const pack = useMemo(() => ({ gradientMap: grad, color: '#b8c0cc' }), [grad]);

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
      visor.current.material.emissiveIntensity =
        0.7 + Math.sin(t * 2) * 0.15;
    }
  });

  return (
    <group ref={ref}>
      <group ref={bob}>
        {/* Torso */}
        <mesh position={[0, 0.95, 0]}>
          <capsuleGeometry args={[0.26, 0.5, 6, 16]} />
          <meshToonMaterial {...suit} />
          <Outlines {...OUTLINE} />
        </mesh>
        {/* Chest control panel */}
        <mesh position={[0, 0.98, 0.24]}>
          <boxGeometry args={[0.2, 0.16, 0.06]} />
          <meshToonMaterial {...accent} />
        </mesh>

        {/* Backpack */}
        <mesh position={[0, 1.0, -0.26]}>
          <boxGeometry args={[0.34, 0.42, 0.2]} />
          <meshToonMaterial {...pack} />
          <Outlines {...OUTLINE} />
        </mesh>

        {/* Helmet */}
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.27, 24, 24]} />
          <meshToonMaterial {...suit} />
          <Outlines {...OUTLINE} />
        </mesh>
        {/* Visor */}
        <mesh ref={visor} position={[0, 1.5, 0.16]} rotation={[0.1, 0, 0]}>
          <sphereGeometry args={[0.2, 20, 20, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
          <meshStandardMaterial
            color="#13202e"
            emissive="#7fd4ff"
            emissiveIntensity={0.8}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>

        {/* Arms */}
        <group ref={armL} position={[0.32, 1.18, 0]}>
          <mesh position={[0, -0.26, 0]}>
            <capsuleGeometry args={[0.09, 0.4, 4, 10]} />
            <meshToonMaterial {...suit} />
            <Outlines {...OUTLINE} />
          </mesh>
        </group>
        <group ref={armR} position={[-0.32, 1.18, 0]}>
          <mesh position={[0, -0.26, 0]}>
            <capsuleGeometry args={[0.09, 0.4, 4, 10]} />
            <meshToonMaterial {...suit} />
            <Outlines {...OUTLINE} />
          </mesh>
        </group>

        {/* Legs */}
        <group ref={legL} position={[0.13, 0.6, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.11, 0.42, 4, 10]} />
            <meshToonMaterial {...suit} />
            <Outlines {...OUTLINE} />
          </mesh>
        </group>
        <group ref={legR} position={[-0.13, 0.6, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.11, 0.42, 4, 10]} />
            <meshToonMaterial {...suit} />
            <Outlines {...OUTLINE} />
          </mesh>
        </group>
      </group>
    </group>
  );
});

export default Astronaut;
