'use client';
import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Instances, Instance, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { chapters } from '@/data/timeline';

const CENTER = new THREE.Vector3(0, 5.5, -32);

const origins = chapters.find((c) => c.index === 2);

/**
 * Chapter 2 — Origins. A drifting field of ambient asteroids plus a handful
 * of glowing, interactive "memory" fragments the visitor can hover and open.
 */
export default function AsteroidBelt({ count = 46 }) {
  const rocks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        key: i,
        pos: [
          CENTER.x + (Math.random() - 0.5) * 28,
          CENTER.y + (Math.random() - 0.5) * 16,
          CENTER.z + (Math.random() - 0.5) * 30,
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
          <Rock key={r.key} {...r} />
        ))}
      </Instances>

      {/* Interactive memory fragments */}
      {origins?.memories.map((m) => (
        <MemoryNode key={m.id} memory={m} />
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

function MemoryNode({ memory }) {
  const meshRef = useRef();
  const matRef = useRef();
  const [hovered, setHovered] = useState(false);
  const setSelectedMemory = useStore((s) => s.setSelectedMemory);
  const selected = useStore((s) => s.selectedMemory);
  const isOpen = selected === memory.id;
  const scaleRef = useRef(1);
  const { camera, size } = useThree();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.004;
      meshRef.current.rotation.x += 0.0015;
      const target = hovered ? 1.35 : 1;
      scaleRef.current += (target - scaleRef.current) * 0.15;
      meshRef.current.scale.setScalar(scaleRef.current);
    }
    if (matRef.current) {
      const base = 0.35 + Math.sin(t * 1.5 + memory.size) * 0.12;
      const target = hovered || isOpen ? 1.4 : base;
      matRef.current.emissiveIntensity +=
        (target - matRef.current.emissiveIntensity) * 0.12;
    }
  });

  const enter = (e) => {
    e.stopPropagation();
    setHovered(true);
    if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
  };
  const leave = () => {
    setHovered(false);
    if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
  };
  const click = (e) => {
    e.stopPropagation();
    // Project the fragment to screen space so the card can grow out of it
    const v = new THREE.Vector3(...memory.pos).project(camera);
    const origin = {
      x: (v.x * 0.5 + 0.5) * size.width,
      y: (-v.y * 0.5 + 0.5) * size.height,
    };
    setSelectedMemory(memory.id, origin);
  };

  return (
    <group position={memory.pos}>
      <mesh
        ref={meshRef}
        onPointerOver={enter}
        onPointerOut={leave}
        onClick={click}
      >
        <icosahedronGeometry args={[memory.size, 0]} />
        <meshStandardMaterial
          ref={matRef}
          color="#caa46a"
          emissive="#ff8a3d"
          emissiveIntensity={0.35}
          roughness={0.6}
          metalness={0.1}
          flatShading
        />
      </mesh>

      {/* Floating label on hover */}
      {hovered && !isOpen && (
        <Html center distanceFactor={16} style={{ pointerEvents: 'none' }} position={[0, memory.size + 0.9, 0]}>
          <div
            className="whitespace-nowrap rounded-full border px-3 py-1 font-mono text-[11px] tracking-widest"
            style={{
              background: 'rgba(6,9,19,0.7)',
              borderColor: 'rgba(245,181,68,0.4)',
              color: '#ffd27a',
              textShadow: '0 0 10px rgba(255,170,80,0.6)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {memory.label.toUpperCase()}
          </div>
        </Html>
      )}
    </group>
  );
}
