'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ASSETS, GALAXY, cosmos } from './cosmos';
import { PALETTE } from '@/lib/palette';

/**
 * The Milky Way — a ~100k-point galaxy model (ported from human-constellations)
 * slowly turning, with "Allen's star" embedded in the disc. The star grows as
 * the camera closes in, so the dive reads as flying INTO one sun.
 */
export default function Galaxy() {
  const group = useRef();
  const star = useRef();
  const starTex = useLoader(THREE.TextureLoader, ASSETS.disc);
  const { nodes } = useGLTF(ASSETS.galaxy);

  const geometry = useMemo(() => {
    const src = nodes.Object_2.geometry.clone();
    src.center();
    const positions = src.attributes.position.array;
    const colors = new Float32Array(positions.length);
    // Graded from the one palette: a warm core (accent-hi → accent) cooling
    // through lilac into ice-blue arms, with per-star brightness jitter.
    let maxD = 0;
    for (let i = 0; i < positions.length; i += 3) {
      maxD = Math.max(maxD, Math.hypot(positions[i], positions[i + 1], positions[i + 2]));
    }
    const core = new THREE.Color(PALETTE.accentHi);
    const warm = new THREE.Color(PALETTE.accent);
    const mid = new THREE.Color(PALETTE.lilac);
    const arm = new THREE.Color(PALETTE.ice);
    const c = new THREE.Color();
    for (let i = 0; i < positions.length; i += 3) {
      const d = Math.hypot(positions[i], positions[i + 1], positions[i + 2]) / maxD;
      if (d < 0.12) c.copy(core).lerp(warm, d / 0.12);
      else if (d < 0.4) c.copy(warm).lerp(mid, (d - 0.12) / 0.28);
      else c.copy(mid).lerp(arm, Math.min(1, (d - 0.4) / 0.4));
      // occasional warm stars out in the arms keep it from reading two-tone
      if (d > 0.4 && Math.random() < 0.08) c.copy(core);
      c.multiplyScalar(0.55 + Math.random() * 0.45);
      c.toArray(colors, i);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, [nodes]);

  useEffect(() => {
    cosmos.galaxyGroup = group.current;
    cosmos.star = star.current;
    return () => {
      cosmos.galaxyGroup = null;
      cosmos.star = null;
    };
  }, []);

  useFrame((state) => {
    const g = group.current;
    if (!g || !g.visible) return;
    g.rotation.z = state.clock.elapsedTime / 15;

    // Allen's star swells as the camera approaches (inverse distance)
    const s = star.current;
    s.getWorldPosition(cosmos.starWorld);
    const dist = cosmos.starWorld.distanceTo(state.camera.position);
    const k = THREE.MathUtils.clamp(1 / (dist * 0.5), GALAXY.STAR_SIZE_MIN, GALAXY.STAR_SIZE_MAX);
    s.scale.setScalar(k);
  });

  return (
    <group ref={group}>
      <points geometry={geometry} scale={0.05}>
        <pointsMaterial
          map={starTex}
          vertexColors
          transparent
          depthWrite={false}
          size={0.01}
          sizeAttenuation
        />
      </points>
      <mesh ref={star} position={GALAXY.STAR_POSITION}>
        <sphereGeometry args={[0.01, 32, 32]} />
        <meshBasicMaterial map={starTex} color={GALAXY.STAR_COLOR} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

useGLTF.preload(ASSETS.galaxy);
