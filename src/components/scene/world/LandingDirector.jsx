'use client';
import { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { worldState } from '@/lib/worldState';

/**
 * World-side beats of the Act 3 landing (mounted the moment the white flash
 * hands over to the world canvas):
 *   Beat 4 — lights ramp from 0 → normal (worldState.reveal, 600ms)
 *   Beat 6 — Fortnite drop: altitude 50 → 0, bounce.out (starts +500ms)
 *   Beat 7 — touchdown: dust-puff Points + camera shake impulse
 * IntroSequence owns the DOM beats (flash, letterbox, welcome, handoff).
 */
const DUST_COUNT = 8;
const DUST_LIFE = 0.4;

export default function LandingDirector() {
  const dustRef = useRef();
  const dustMatRef = useRef();
  const dustT = useRef(-1); // <0 = inactive; else seconds since impact

  const { positions, dirs } = useMemo(() => {
    const positions = new Float32Array(DUST_COUNT * 3);
    const dirs = [];
    for (let i = 0; i < DUST_COUNT; i++) {
      const a = (i / DUST_COUNT) * Math.PI * 2;
      dirs.push(new THREE.Vector3(Math.cos(a), 0.25 + Math.random() * 0.3, Math.sin(a)));
    }
    return { positions, dirs };
  }, []);

  useEffect(() => {
    // Beat 4 — the world materialises out of the dark
    const reveal = gsap.to(worldState, { reveal: 1, duration: 0.6, ease: 'power2.out' });
    // Beat 6 — the drop (freefall, bounce handled by the ease)
    const drop = gsap.to(worldState, {
      altitude: 0,
      duration: 1.2,
      delay: 0.5,
      ease: 'bounce.out',
      onComplete: () => {
        // Beat 7 — impact
        worldState.shake = 1;
        dustT.current = 0;
      },
    });
    return () => {
      reveal.kill();
      drop.kill();
      worldState.reveal = 1;
      worldState.altitude = 0;
    };
  }, []);

  useFrame((_, delta) => {
    if (dustT.current < 0 || !dustRef.current) return;
    dustT.current += delta;
    const k = Math.min(dustT.current / DUST_LIFE, 1);
    const p = worldState.pos;
    for (let i = 0; i < DUST_COUNT; i++) {
      const d = dirs[i];
      const r = 0.15 + k * 1.1;
      positions[i * 3] = p.x + d.x * r;
      positions[i * 3 + 1] = 0.06 + d.y * k * 0.8;
      positions[i * 3 + 2] = p.z + d.z * r;
    }
    dustRef.current.geometry.attributes.position.needsUpdate = true;
    if (dustMatRef.current) {
      dustMatRef.current.size = 0.05 + k * 0.3;
      dustMatRef.current.opacity = 0.8 * (1 - k);
    }
    if (k >= 1) dustT.current = -1;
  });

  return (
    <points ref={dustRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={dustMatRef}
        color="#caa15e"
        size={0}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
      />
    </points>
  );
}
