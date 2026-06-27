'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { scrollState } from '@/lib/scrollState';

/** Soft radial puff texture, generated once on the client. */
function makeSmokeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Pre-launch smoke billowing at the rocket's base. Stays anchored to the
 * pad in world space (it does NOT ride the rocket up). Thick while the
 * rocket charges, blasts outward on ignition, then clears during cruise.
 */
export default function LaunchSmoke({ position = [0, -1.95, 1.5], count = 22 }) {
  const tex = useMemo(makeSmokeTexture, []);
  const refs = useRef([]);
  const phase = useStore((s) => s.phase);

  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 1.0,
        z: (Math.random() - 0.5) * 0.8,
        speed: 0.25 + Math.random() * 0.35,
        scale: 0.6 + Math.random() * 0.9,
        life: Math.random(),
        rot: Math.random() * Math.PI,
        drift: (Math.random() - 0.5) * 0.6,
      })),
    [count]
  );

  useFrame((state, delta) => {
    const flying = phase === 'flight';
    const tt = state.clock.elapsedTime;
    // Rhythmic pulse while cold (boot); thick on ignition; idle on ready;
    // blasts then clears as the rocket climbs away (flight); gone in orbit (reveal)
    const intensity =
      phase === 'boot'
        ? 0.22 + Math.sin(tt * 3) * 0.12
        : phase === 'ignition'
        ? 1.0
        : phase === 'ready'
        ? 0.55
        : flying
        ? Math.max(0, 0.9 - scrollState.progress * 2.2)
        : 0.0;

    data.forEach((d, i) => {
      const s = refs.current[i];
      if (!s) return;
      d.life += delta * d.speed * (flying ? 2.6 : 1);
      if (d.life > 1) {
        d.life = 0;
        d.x = (Math.random() - 0.5) * 1.0;
        d.z = (Math.random() - 0.5) * 0.8;
      }
      const rise = d.life * (flying ? 4.5 : 1.6);
      const spread = 1 + d.life * (flying ? 2.4 : 1.2);
      s.position.set(
        position[0] + d.x * spread + d.drift * d.life,
        position[1] + rise,
        position[2] + d.z * spread
      );
      const sc = d.scale * (0.6 + d.life * 2.0);
      s.scale.set(sc, sc, sc);
      const fade = Math.sin(d.life * Math.PI); // fade in then out over life
      s.material.opacity = fade * 0.32 * intensity;
      s.material.rotation = d.rot + d.life * 1.5;
    });
  });

  return (
    <group>
      {data.map((d, i) => (
        <sprite
          key={i}
          ref={(el) => (refs.current[i] = el)}
          position={position}
        >
          <spriteMaterial
            map={tex}
            color="#cfc6b6"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </sprite>
      ))}
    </group>
  );
}
