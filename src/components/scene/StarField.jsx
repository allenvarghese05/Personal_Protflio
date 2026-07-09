'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/lib/store';

/**
 * Additive-blended point cloud of stars filling a large sphere shell.
 * Subtle drift gives parallax depth without distracting from the hero.
 */
export default function StarField({ count = 6000 }) {
  const ref = useRef();
  const matRef = useRef();
  const phase = useStore((s) => s.phase);

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // Star tint palette — warm white core, steel-blue + amber accents
    const palette = [
      new THREE.Color('#fff6e6'),
      new THREE.Color('#dfeaff'),
      new THREE.Color('#ff8a3d'),
      new THREE.Color('#6fb0ee'),
    ];

    for (let i = 0; i < count; i++) {
      // Distribute on a spherical shell (radius 20–60)
      const r = 20 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Weight palette toward white
      const pick =
        Math.random() < 0.78
          ? palette[Math.random() < 0.5 ? 0 : 1]
          : palette[2 + Math.floor(Math.random() * 2)];
      colors[i * 3] = pick.r;
      colors[i * 3 + 1] = pick.g;
      colors[i * 3 + 2] = pick.b;

      sizes[i] = Math.random() * 0.12 + 0.03;
    }
    return { positions, colors, sizes };
  }, [count]);

  useFrame((state, delta) => {
    if (ref.current) {
      // Very slow rotation for life
      ref.current.rotation.y += delta * 0.008;
      ref.current.rotation.x += delta * 0.002;
    }
    // Near-dark through the intro, brighter as we fly toward the planet
    if (matRef.current) {
      const target = phase === 'boot' ? 0.16 : phase === 'ignition' ? 0.4 : 0.9;
      matRef.current.opacity += (target - matRef.current.opacity) * 0.04;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        vertexColors
        size={0.1}
        sizeAttenuation
        transparent
        opacity={0.32}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
