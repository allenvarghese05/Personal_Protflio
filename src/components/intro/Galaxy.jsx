'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ASSETS, GALAXY, cosmos } from './cosmos';
import { PALETTE, PALETTE_LIGHT } from '@/lib/palette';
import { useThemeValue } from '@/lib/useTheme';

/**
 * The Milky Way — a ~100k-point galaxy model (ported from human-constellations)
 * slowly turning, with "Allen's star" embedded in the disc. The star grows as
 * the camera closes in, so the dive reads as flying INTO one sun.
 */
export default function Galaxy() {
  const group = useRef();
  const star = useRef();
  const pointsMat = useRef();
  const starMat = useRef();
  const starTex = useLoader(THREE.TextureLoader, ASSETS.disc);
  const { nodes } = useGLTF(ASSETS.galaxy);
  const light = useThemeValue() === 'light';

  // Both colourings are built once; the theme only swaps which one is bound.
  const { geometry, darkColors, lightColors } = useMemo(() => {
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
    // Light: the same grading in ink on paper — a deep amber core, violet
    // through to ice-blue arms, each star eased toward the paper by a random
    // amount so the disc reads as density, not a solid blot.
    const lightColors = new Float32Array(positions.length);
    const lCore = new THREE.Color(PALETTE_LIGHT.accentLo);
    const lWarm = new THREE.Color(PALETTE_LIGHT.accent);
    const lMid = new THREE.Color(PALETTE_LIGHT.lilac);
    const lArm = new THREE.Color(PALETTE_LIGHT.ice);
    const paper = new THREE.Color(PALETTE_LIGHT.void);
    const lc = new THREE.Color();
    for (let i = 0; i < positions.length; i += 3) {
      const d = Math.hypot(positions[i], positions[i + 1], positions[i + 2]) / maxD;
      const warmStar = d > 0.4 && Math.random() < 0.08;
      if (d < 0.12) c.copy(core).lerp(warm, d / 0.12);
      else if (d < 0.4) c.copy(warm).lerp(mid, (d - 0.12) / 0.28);
      else c.copy(mid).lerp(arm, Math.min(1, (d - 0.4) / 0.4));
      // occasional warm stars out in the arms keep it from reading two-tone
      if (warmStar) c.copy(core);
      const jitter = Math.random();
      c.multiplyScalar(0.55 + jitter * 0.45);
      c.toArray(colors, i);

      if (d < 0.12) lc.copy(lCore).lerp(lWarm, d / 0.12);
      else if (d < 0.4) lc.copy(lWarm).lerp(lMid, (d - 0.12) / 0.28);
      else lc.copy(lMid).lerp(lArm, Math.min(1, (d - 0.4) / 0.4));
      if (warmStar) lc.copy(lWarm);
      lc.lerp(paper, (1 - jitter) * 0.18);
      lc.toArray(lightColors, i);
    }
    const g = new THREE.BufferGeometry();
    const darkAttr = new THREE.Float32BufferAttribute(colors, 3);
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', darkAttr);
    return { geometry: g, darkColors: darkAttr, lightColors: new THREE.Float32BufferAttribute(lightColors, 3) };
  }, [nodes]);

  useEffect(() => {
    geometry.setAttribute('color', light ? lightColors : darkColors);
  }, [geometry, darkColors, lightColors, light]);
  // disc.png is a white core with a black fringe: invisible on the void, a
  // dark ring on paper. In light the texture is shape only (alphaMap reads its
  // green channel), tinted purely by colour. Swapping maps changes shader
  // defines, so recompile.
  useEffect(() => {
    [pointsMat.current, starMat.current].forEach((m) => {
      if (m) m.needsUpdate = true;
    });
  }, [light]);

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
          ref={pointsMat}
          map={light ? null : starTex}
          alphaMap={light ? starTex : null}
          vertexColors
          transparent
          // light: normal blending on paper, eased back so overlaps build up
          // as soft density rather than a solid core
          opacity={light ? 0.9 : 1}
          depthWrite={false}
          size={light ? 0.016 : 0.01}
          sizeAttenuation
        />
      </points>
      <mesh ref={star} position={GALAXY.STAR_POSITION}>
        <sphereGeometry args={[0.01, 32, 32]} />
        <meshBasicMaterial
          ref={starMat}
          map={light ? null : starTex}
          alphaMap={light ? starTex : null}
          color={light ? PALETTE_LIGHT.accentHi : GALAXY.STAR_COLOR}
          transparent
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

useGLTF.preload(ASSETS.galaxy);
