'use client';
import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  Noise,
  BrightnessContrast,
  HueSaturation,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

import StarField from './StarField';
import Planet from './Planet';
import Rocket from './Rocket';
import LaunchSmoke from './LaunchSmoke';
import AsteroidBelt from './AsteroidBelt';
import Nebula from './Nebula';
import { useStore } from '@/lib/store';
import { scrollState } from '@/lib/scrollState';
import { HERO_END } from '@/lib/journey';

const smooth = (a, b, t) => {
  const x = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

const toKeys = (arr) =>
  arr.map((k) => ({
    p: k.p,
    pos: new THREE.Vector3(...k.pos),
    tgt: new THREE.Vector3(...k.tgt),
  }));

/** Hero: launch → arc in → planet fills frame (sampled by hero-local 0→1). */
const HERO_CAM = [
  { p: 0.0, pos: [0, 0.8, 5.2], tgt: [0, -0.4, 0] },
  { p: 0.35, pos: [2.2, 0.9, 1.5], tgt: [0, 0.3, -4] },
  { p: 0.7, pos: [3.2, 1.4, -1.5], tgt: [0, 0.5, -8] },
  { p: 1.0, pos: [1.6, 1.0, -3.5], tgt: [0, 0.5, -9] },
];

/** Chapters: fly on from the planet into the journey (sampled by 0→1 past hero). */
const CHAPTER_CAM = [
  { p: 0.0, pos: [1.6, 1.0, -3.5], tgt: [0, 0.5, -9] }, // continuity with hero end
  { p: 0.5, pos: [-3.0, 4.0, -16], tgt: [0, 4.5, -24] }, // transit toward the belt
  { p: 1.0, pos: [0, 5.5, -24], tgt: [0, 5.5, -33] }, // into the asteroid field
];

function CameraRig() {
  const { camera, pointer } = useThree();
  const phase = useStore((s) => s.phase);

  const curBase = useRef(new THREE.Vector3(0, 0.8, 5.2));
  const curTarget = useRef(new THREE.Vector3(0, -0.4, 0));
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpTgt = useMemo(() => new THREE.Vector3(), []);

  const heroKeys = useMemo(() => toKeys(HERO_CAM), []);
  const chapterKeys = useMemo(() => toKeys(CHAPTER_CAM), []);

  const sample = (keys, t) => {
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1].p) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const f = smooth(a.p, b.p, t);
    tmpPos.lerpVectors(a.pos, b.pos, f);
    tmpTgt.lerpVectors(a.tgt, b.tgt, f);
  };

  useFrame(() => {
    const flying = phase === 'flight';

    if (flying) {
      const p = scrollState.progress;
      if (p <= HERO_END) sample(heroKeys, p / HERO_END);
      else sample(chapterKeys, (p - HERO_END) / (1 - HERO_END));
      camera.position.lerp(tmpPos, 0.1);
      curTarget.current.lerp(tmpTgt, 0.1);
      camera.lookAt(curTarget.current);
      // Speed-reactive FOV widen
      const fov = 50 + scrollState.velocity * 16;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov += (fov - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
      }
    } else {
      // Pad framing with gentle pointer parallax
      const px = pointer.x * 0.5;
      const py = pointer.y * 0.35;
      camera.position.x += (curBase.current.x + px - camera.position.x) * 0.05;
      camera.position.y += (curBase.current.y + py - camera.position.y) * 0.05;
      camera.position.z += (curBase.current.z - camera.position.z) * 0.05;
      curTarget.current.lerp(new THREE.Vector3(0, -0.4, 0), 0.05);
      camera.lookAt(curTarget.current);
      if (Math.abs(camera.fov - 50) > 0.01) {
        camera.fov += (50 - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
      }
    }
  });
  return null;
}

/** Phase-aware lighting: dark boot → ignition reveal → full. */
function LightingRig() {
  const phase = useStore((s) => s.phase);
  const amb = useRef();
  const key = useRef();
  const fill = useRef();

  useFrame(() => {
    // Intro stays dark — the rocket is lit only by its own fire. The scene
    // brightens as we fly toward the planet.
    let ambT, keyT, fillT;
    if (phase === 'boot') {
      ambT = 0.04; keyT = 0.04; fillT = 0.08;
    } else if (phase === 'ignition') {
      ambT = 0.1; keyT = 0.2; fillT = 0.2;
    } else if (phase === 'ready') {
      ambT = 0.12; keyT = 0.24; fillT = 0.2;
    } else {
      // flight / reveal — ramp to full over the first half of the approach
      const k = Math.min(1, scrollState.progress / 0.5);
      ambT = 0.12 + 0.16 * k;
      keyT = 0.24 + 0.86 * k;
      fillT = 0.2 + 0.4 * k;
    }
    if (amb.current) amb.current.intensity += (ambT - amb.current.intensity) * 0.06;
    if (key.current) key.current.intensity += (keyT - key.current.intensity) * 0.06;
    if (fill.current) fill.current.intensity += (fillT - fill.current.intensity) * 0.06;
  });

  return (
    <>
      <ambientLight ref={amb} intensity={0.04} />
      <directionalLight ref={key} position={[5, 6, 5]} intensity={0.04} color="#fff1dd" />
      <pointLight ref={fill} position={[-6, 2, -4]} intensity={0.08} color="#4a90d9" />
    </>
  );
}

/** Drives bloom + chromatic aberration from scroll velocity (the speed feel). */
function FxDriver({ caRef, bloomRef }) {
  useFrame(() => {
    const v = scrollState.velocity;
    const ca = caRef.current;
    if (ca) {
      const val = 0.0005 + v * 0.004;
      // The CA offset isn't a plain settable Vector2 across versions —
      // reach it safely whichever way it's exposed (never throw in the loop).
      const off = ca.offset;
      if (off && typeof off.set === 'function') off.set(val, val);
      else if (off && 'x' in off) {
        off.x = val;
        off.y = val;
      } else if (ca.uniforms?.get?.('offset')?.value?.set) {
        ca.uniforms.get('offset').value.set(val, val);
      }
    }
    if (bloomRef.current) bloomRef.current.intensity = 0.85 + v * 0.9;
  });
  return null;
}

export default function SpaceExperience({ tier = 'full' }) {
  const isFull = tier === 'full';
  const caRef = useRef();
  const bloomRef = useRef();

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
      dpr={isFull ? [1, 2] : [1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      camera={{ position: [0, 0.8, 5.2], fov: 50, near: 0.1, far: 200 }}
      onCreated={({ gl }) => gl.setClearColor('#060913', 1)}
    >
      {/* Atmospheric depth — distant objects haze into the void */}
      <fogExp2 attach="fog" args={['#060913', 0.006]} />

      <LightingRig />

      <Suspense fallback={null}>
        <StarField count={isFull ? 6000 : 2500} />
        <Nebula />
        <Planet />
        <Rocket />
        <LaunchSmoke />
        <AsteroidBelt />
      </Suspense>

      <CameraRig />

      {isFull && (
        <>
          <FxDriver caRef={caRef} bloomRef={bloomRef} />
          <EffectComposer multisampling={0}>
            <Bloom
              ref={bloomRef}
              intensity={0.85}
              luminanceThreshold={0.6}
              luminanceSmoothing={0.3}
              mipmapBlur
            />
            <ChromaticAberration
              ref={caRef}
              blendFunction={BlendFunction.NORMAL}
              offset={[0.0005, 0.0005]}
            />
            {/* Filmic colour grade + grain so it reads cinematic, not "CG" */}
            <HueSaturation saturation={0.08} />
            <BrightnessContrast brightness={0.0} contrast={0.1} />
            <Vignette eskil={false} offset={0.28} darkness={0.82} />
            <Noise opacity={0.04} blendFunction={BlendFunction.OVERLAY} />
          </EffectComposer>
        </>
      )}
    </Canvas>
  );
}
