'use client';
import { useRef, useMemo, forwardRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Effect } from 'postprocessing';
import * as THREE from 'three';
import { entryState } from '@/lib/entrySequence';

/* ----------------------------------------------------------------------------
   EntryDistortion — one cheap fullscreen pass, two jobs:
   · gravitational lens: radial UV pull around screen centre while the planet
     stirs (it sits centre-frame), bending the starfield around its mass
   · heat shimmer: high-frequency UV wobble during atmosphere entry
   Both uniforms rest at 0, so the pass is an identity outside the sequence.
---------------------------------------------------------------------------- */
const distortionFrag = /* glsl */ `
  uniform float uLens;
  uniform float uWobble;
  uniform float uTime;

  void mainUv(inout vec2 uv) {
    vec2 d = uv - 0.5;
    float r = length(d) + 1e-5;
    // light bends around the mass — pull samples toward the limb
    uv -= (d / r) * uLens * smoothstep(0.55, 0.12, r);
    // hot-air shimmer
    uv += vec2(
      sin(uv.y * 60.0 + uTime * 50.0),
      cos(uv.x * 55.0 + uTime * 47.0)
    ) * uWobble;
  }
`;

class EntryDistortionImpl extends Effect {
  constructor() {
    super('EntryDistortion', distortionFrag, {
      uniforms: new Map([
        ['uLens', new THREE.Uniform(0)],
        ['uWobble', new THREE.Uniform(0)],
        ['uTime', new THREE.Uniform(0)],
      ]),
    });
  }
}

export const EntryDistortion = forwardRef(function EntryDistortion(_, ref) {
  const effect = useMemo(() => new EntryDistortionImpl(), []);
  useEffect(() => () => effect.dispose(), [effect]);
  useFrame((state) => {
    effect.uniforms.get('uLens').value = entryState.lens;
    effect.uniforms.get('uWobble').value = entryState.heat * 0.0035;
    effect.uniforms.get('uTime').value = state.clock.elapsedTime;
  });
  return <primitive ref={ref} object={effect} />;
});

/* ----------------------------------------------------------------------------
   WarpTunnel — hyperspace star streaks during the gravity fall. A tunnel of
   line segments glued to the camera, flying past and stretching with warp.
---------------------------------------------------------------------------- */
const STREAKS = 260;

export function WarpTunnel() {
  const groupRef = useRef();
  const geoRef = useRef();
  const matRef = useRef();

  const { base, positions, colors } = useMemo(() => {
    const base = [];
    const positions = new Float32Array(STREAKS * 6);
    const colors = new Float32Array(STREAKS * 6);
    const warm = new THREE.Color('#ffd9a0');
    const cool = new THREE.Color('#cfe3ff');
    for (let i = 0; i < STREAKS; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.6 + Math.random() * 5.5;
      base.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        z: -28 + Math.random() * 32,
        s: 0.6 + Math.random() * 0.8, // per-streak speed factor
      });
      const c = Math.random() < 0.3 ? warm : cool;
      for (const k of [0, 3]) {
        colors[i * 6 + k] = c.r;
        colors[i * 6 + k + 1] = c.g;
        colors[i * 6 + k + 2] = c.b;
      }
    }
    return { base, positions, colors };
  }, []);

  useFrame(({ camera }, delta) => {
    const w = entryState.warp;
    const g = groupRef.current;
    if (!g) return;
    if (w <= 0.01) {
      g.visible = false;
      return;
    }
    g.visible = true;
    // ride the camera
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);

    const speed = 6 + w * 60;
    const stretch = 0.2 + w * 7.8; // 1 → ~8 elongation
    for (let i = 0; i < STREAKS; i++) {
      const b = base[i];
      b.z += speed * b.s * delta;
      if (b.z > 4) b.z -= 32;
      positions[i * 6] = b.x;
      positions[i * 6 + 1] = b.y;
      positions[i * 6 + 2] = b.z;
      positions[i * 6 + 3] = b.x;
      positions[i * 6 + 4] = b.y;
      positions[i * 6 + 5] = b.z - stretch * b.s;
    }
    geoRef.current.attributes.position.needsUpdate = true;
    if (matRef.current) matRef.current.opacity = Math.min(0.7, w * 0.9);
  });

  return (
    <group ref={groupRef} visible={false} frustumCulled={false}>
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={geoRef}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          ref={matRef}
          vertexColors
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}

/* ----------------------------------------------------------------------------
   PlanetStir — the planet reacting to the impending arrival: an energy ring
   charging at the equator + the atmosphere powering up. Sits at the planet.
---------------------------------------------------------------------------- */
const PLANET_POS = [0, 0.5, -11];
const PLANET_R = 4;

export function PlanetStir() {
  const ringRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    const s = entryState.stir;
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      const m = ringRef.current.material;
      m.opacity = s * (0.45 + Math.sin(t * 6) * 0.15);
      ringRef.current.visible = s > 0.01;
      ringRef.current.scale.setScalar(1 + s * 0.04 + Math.sin(t * 3) * 0.006);
      ringRef.current.rotation.z = t * 0.1;
    }
    if (glowRef.current) {
      glowRef.current.material.opacity = s * 0.32 + entryState.heat * 0.25;
      glowRef.current.visible = s > 0.01;
    }
  });

  return (
    <group position={PLANET_POS}>
      {/* energy building at the equator */}
      <mesh ref={ringRef} visible={false} rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[PLANET_R * 1.04, 0.035, 8, 96]} />
        <meshBasicMaterial
          color="#e8a040"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* atmosphere charging up */}
      <mesh ref={glowRef} visible={false}>
        <sphereGeometry args={[PLANET_R * 1.12, 48, 48]} />
        <meshBasicMaterial
          color="#e8a040"
          transparent
          opacity={0}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
