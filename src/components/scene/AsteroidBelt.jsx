'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { chapters } from '@/data/timeline';
import MemoryNode from './MemoryNode';

const CENTER = new THREE.Vector3(0, 5.5, -54);
const origins = chapters.find((c) => c.index === 3);

/**
 * Chapter 3 — Origins. A drifting field of ambient asteroids plus a handful
 * of glowing, interactive "memory" fragments the visitor can hover and open.
 */
export default function AsteroidBelt({ count = 46 }) {
  const rocks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        key: i,
        pos: [
          CENTER.x + (Math.random() - 0.5) * 22,
          CENTER.y + (Math.random() - 0.5) * 16,
          CENTER.z + (Math.random() - 0.5) * 20,
        ],
        scale: [
          0.18 + Math.random() * 0.9,
          0.18 + Math.random() * 0.9,
          0.18 + Math.random() * 0.9,
        ],
        rot: [Math.random() * 6, Math.random() * 6, Math.random() * 6],
        spin: (Math.random() - 0.5) * 0.4,
      });
    }
    return arr;
  }, [count]);

  return (
    <group>
      {/* Ambient field — dim, recedes behind the focal memories */}
      <Instances limit={count} range={count}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#574f44" roughness={0.97} metalness={0.04} flatShading />
        {rocks.map((r) => (
          <Rock key={r.key} pos={r.pos} scale={r.scale} rot={r.rot} spin={r.spin} />
        ))}
      </Instances>

      {/* Interactive memory fragments */}
      {origins?.memories.map((m) => (
        <MemoryNode key={m.id} memory={m} variant="rock" />
      ))}
    </group>
  );
}

function Rock({ pos, scale, rot, spin }) {
  const ref = useRef();
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * spin * 0.3;
      ref.current.rotation.y += delta * spin;
    }
  });
  return <Instance ref={ref} position={pos} scale={scale} rotation={rot} />;
}
