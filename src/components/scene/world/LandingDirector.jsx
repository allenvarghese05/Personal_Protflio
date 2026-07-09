'use client';
import { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { worldState } from '@/lib/worldState';
import { ENTRY } from '@/lib/entrySequence';

/**
 * World-side beats of the arrival (mounted the moment the white flash hands
 * over to the world canvas):
 *   · the world materialises — lights ramp 0 → 1 over 1.2s
 *   · the drop — a re-entry streak falls out of the sky and becomes the
 *     astronaut: gravity fall (power2.in) chained into a landing bounce
 *   · impact — hemisphere dust burst, ground shockwave ripple, diminishing
 *     camera shake, synthesized thud
 * BigBangTransition owns the DOM beats (flash, letterbox, titles, handoff).
 */

const DUST = [
  { count: 9, size: 0.32, speed: 2.6 }, // heavy clods, low and wide
  { count: 7, size: 0.14, speed: 3.6 }, // fine spray, higher arcs
];
const DUST_LIFE = 0.8;

/** The arrival bang — a deep sub boom layered under a thunder crack. */
function bang() {
  try {
    const ctx = window.__entryAudio;
    if (!ctx) return;
    const now = ctx.currentTime;
    // sub boom
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
    og.gain.setValueAtTime(0.5, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start();
    osc.stop(now + 1.1);
    // thunder — decaying noise rolled off from bright to rumble
    const dur = 1.0;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3200, now);
    lp.frequency.exponentialRampToValueAtTime(300, now + dur);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.45, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(lp);
    lp.connect(ng);
    ng.connect(ctx.destination);
    src.start();
  } catch {}
}

function thud() {
  try {
    const ctx = window.__entryAudio;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

export default function LandingDirector() {
  const streakRef = useRef();
  const rippleRef = useRef();
  const boltRef = useRef();
  const flashV = useRef({ v: 0 });
  const dustRefs = useRef([]);
  const dustMats = useRef([]);
  const dustT = useRef(-1); // <0 = inactive; else seconds since impact
  const impactAt = useRef(new THREE.Vector3());

  const clusters = useMemo(
    () =>
      DUST.map((c) => {
        const positions = new Float32Array(c.count * 3);
        const dirs = [];
        for (let i = 0; i < c.count; i++) {
          // full hemisphere: some straight up, most outward
          const a = (i / c.count) * Math.PI * 2 + Math.random() * 0.5;
          const up = 0.2 + Math.random() * 0.8;
          const out = Math.sqrt(Math.max(0.05, 1 - up * up));
          dirs.push(new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out));
        }
        return { ...c, positions, dirs };
      }),
    []
  );

  useEffect(() => {
    // The world materialises out of the dark
    const reveal = gsap.to(worldState, { reveal: 1, duration: 1.2, ease: 'power2.out' });

    // The arrival splits the sky — a double lightning strike + thunder bang
    bang();
    const storm = gsap.timeline({ delay: 0.08 });
    storm.to(flashV.current, { v: 1, duration: 0.05 });
    storm.to(flashV.current, { v: 0, duration: 0.22, ease: 'power2.out' });
    storm.to(flashV.current, { v: 0.85, duration: 0.04 }, '+=0.18');
    storm.to(flashV.current, { v: 0, duration: 0.4, ease: 'power2.out' });

    // The drop — gravity, then the bounce. Two eases, chained.
    const drop = gsap.timeline({ delay: ENTRY.DROP_DELAY });
    drop.to(worldState, { altitude: 2.2, duration: ENTRY.FALL_MAIN, ease: 'power2.in' });
    drop.to(worldState, {
      altitude: 0,
      duration: ENTRY.FALL_BOUNCE,
      ease: 'bounce.out',
      onStart: () => {
        // impact happens at the first ground contact of the bounce ease
      },
    });
    drop.call(() => {
      // IMPACT
      impactAt.current.copy(worldState.pos);
      worldState.shake = 1.5; // big jolt; the rig decays it in diminishing steps
      dustT.current = 0;
      thud();
    }, null, ENTRY.FALL_MAIN + 0.06); // as the bounce first kisses the ground

    return () => {
      reveal.kill();
      drop.kill();
      storm.kill();
      worldState.reveal = 1;
      worldState.altitude = 0;
    };
  }, []);

  useFrame((state, delta) => {
    // Lightning — a full-scene strobe from high in the sky
    if (boltRef.current) boltRef.current.intensity = flashV.current.v * 3.5;
    // Re-entry streak — the astronaut materialises out of a falling star
    if (streakRef.current) {
      const alt = worldState.altitude;
      const falling = alt > 1.5;
      streakRef.current.visible = falling;
      if (falling) {
        const p = worldState.pos;
        streakRef.current.position.set(p.x, alt + 4.2, p.z);
        // fades in near the top of the fall, thins as it descends
        const born = THREE.MathUtils.clamp((60 - alt) / 10, 0, 1);
        const dying = THREE.MathUtils.clamp(alt / 18, 0, 1);
        streakRef.current.material.opacity = born * (0.25 + dying * 0.45);
      }
    }

    // Ground shockwave ripple
    if (rippleRef.current && dustT.current >= 0) {
      const k = Math.min(dustT.current / 0.6, 1);
      rippleRef.current.visible = k < 1;
      const r = 0.2 + k * 8;
      rippleRef.current.scale.set(r, r, r);
      rippleRef.current.material.opacity = 0.45 * (1 - k);
      rippleRef.current.position.set(impactAt.current.x, 0.03, impactAt.current.z);
    }

    // Dust burst
    if (dustT.current < 0) return;
    dustT.current += delta;
    const k = Math.min(dustT.current / DUST_LIFE, 1);
    const ease = 1 - Math.pow(1 - k, 2); // ease-out
    clusters.forEach((c, ci) => {
      const geo = dustRefs.current[ci];
      if (!geo) return;
      for (let i = 0; i < c.count; i++) {
        const d = c.dirs[i];
        const r = ease * c.speed;
        c.positions[i * 3] = impactAt.current.x + d.x * r;
        c.positions[i * 3 + 1] = 0.05 + d.y * r * (1 - k * 0.7); // arcs fall back
        c.positions[i * 3 + 2] = impactAt.current.z + d.z * r;
      }
      geo.attributes.position.needsUpdate = true;
      const m = dustMats.current[ci];
      if (m) {
        m.size = c.size * (0.4 + ease * 0.8);
        m.opacity = 0.85 * (1 - k);
      }
    });
    if (k >= 1) dustT.current = -1;
  });

  return (
    <group>
      {/* lightning strikes as the world is born */}
      <directionalLight ref={boltRef} position={[18, 40, -12]} intensity={0} color="#e6ecff" />

      {/* re-entry contrail above the falling astronaut */}
      <mesh ref={streakRef} visible={false}>
        <cylinderGeometry args={[0.02, 0.09, 8, 8, 1, true]} />
        <meshBasicMaterial
          color="#ffd9a0"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* impact shockwave through the ground */}
      <mesh ref={rippleRef} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 1, 48]} />
        <meshBasicMaterial color="#e8c896" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* hemisphere dust burst — two clusters for varied grain */}
      {clusters.map((c, ci) => (
        <points key={ci} frustumCulled={false}>
          <bufferGeometry ref={(el) => el && (dustRefs.current[ci] = el)}>
            <bufferAttribute attach="attributes-position" args={[c.positions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={(el) => el && (dustMats.current[ci] = el)}
            color="#b98a5c"
            size={0}
            sizeAttenuation
            transparent
            opacity={0}
            depthWrite={false}
          />
        </points>
      ))}
    </group>
  );
}
