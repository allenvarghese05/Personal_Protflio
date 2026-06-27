'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/lib/store';

/** Soft radial haze texture for the nebula clouds. */
function makeHazeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

// Drifting colored clouds along the journey corridor — depth + atmosphere.
const CLOUDS = [
  { pos: [-9, 4, -20], scale: 28, color: '#3a5a8a', op: 0.11 },
  { pos: [11, 8, -34], scale: 36, color: '#6b4a8a', op: 0.09 },
  { pos: [0, 3, -48], scale: 42, color: '#8a5a3a', op: 0.08 },
  { pos: [-7, 11, -60], scale: 32, color: '#3a5a8a', op: 0.07 },
  { pos: [7, -1, -14], scale: 20, color: '#5a4a7a', op: 0.07 },
];

export default function Nebula() {
  const tex = useMemo(makeHazeTexture, []);
  const refs = useRef([]);
  const phase = useStore((s) => s.phase);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Hidden through the dark intro; eases in for the flight
    const lit = phase === 'boot' || phase === 'ignition' ? 0 : 1;
    refs.current.forEach((s, i) => {
      if (!s) return;
      s.material.rotation = t * 0.01 * (i % 2 ? 1 : -1);
      const target = CLOUDS[i].op * lit;
      s.material.opacity += (target - s.material.opacity) * 0.04;
    });
  });

  return (
    <group>
      {CLOUDS.map((c, i) => (
        <sprite
          key={i}
          ref={(el) => (refs.current[i] = el)}
          position={c.pos}
          scale={c.scale}
        >
          <spriteMaterial
            map={tex}
            color={c.color}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}
