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
import EngineeringStation from './EngineeringStation';
import AsteroidBelt from './AsteroidBelt';
import Nebula from './Nebula';
import { EntryDistortion } from './EntryEffects';
import { GalaxyScene, VoyagerRocket, VOYAGE_PATH, ALLENS_WORLD } from './GalaxyVoyage';
import { useStore } from '@/lib/store';
import { scrollState } from '@/lib/scrollState';
import { ENTRY, entryState, resetEntryState } from '@/lib/entrySequence';

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

/**
 * One continuous flight path, sampled by GLOBAL scroll progress (0→1):
 *   0.00–0.40  launch pad → ascent → orbit (planet fills frame, name card)
 *   0.40–0.55  bank away from the planet, the Engineering Station swings in
 *   0.55–0.74  approach & dock at the station (work modules)
 *   0.74–1.00  drift out to the asteroid field (Origins)
 * Corridor anchors: planet (0,0.5,-11) · station (6,3,-20) · belt (0,5.5,-43)
 */
const FLIGHT_CAM = [
  { p: 0.0, pos: [0, 0.8, 5.2], tgt: [0, -0.4, 0] }, // on the pad, looking up
  { p: 0.14, pos: [1.8, 1.0, 1.6], tgt: [0, 0.6, -5] }, // ascent, drifting right
  { p: 0.28, pos: [2.7, 1.5, -3.2], tgt: [0, 0.6, -9] }, // approaching the planet
  { p: 0.4, pos: [1.2, 0.9, -3.8], tgt: [0, 0.5, -11] }, // orbit — planet framed with its edge, name card
  { p: 0.5, pos: [7.5, 3.0, -8.5], tgt: [5, 3, -16] }, // swing right, past the planet's limb
  { p: 0.6, pos: [6, 3.8, -16], tgt: [4, 3.8, -23] }, // planet now behind — station ahead
  { p: 0.7, pos: [5, 4.2, -20], tgt: [4, 3.9, -26] }, // hero shot — modules ring the station
  { p: 0.8, pos: [3.5, 4.6, -25], tgt: [1.5, 5, -36] }, // depart toward the belt
  { p: 0.9, pos: [2, 5.2, -34], tgt: [0, 5.4, -46] }, // transit
  { p: 1.0, pos: [0, 5.5, -41], tgt: [0, 5.5, -52] }, // into the asteroid field
];

/** Hides chapter set-dressing while the galaxy sequence owns the frame. */
function HideDuringDive({ children }) {
  const phase = useStore((s) => s.phase);
  return <group visible={phase !== 'dive'}>{children}</group>;
}

const PLANET_CENTER = new THREE.Vector3(0, 0.5, -11);
// Galaxy-view staging: where the camera retreats to, and what it surveys.
const OVERVIEW_POS = new THREE.Vector3(7, 6.5, 14);
const GALAXY_CENTER = new THREE.Vector3(-5, 1.5, -24);
const APPROACH_POS = new THREE.Vector3(2.2, 1.8, -4.6);

function CameraRig() {
  const { camera, pointer } = useThree();
  const phase = useStore((s) => s.phase);

  const curBase = useRef(new THREE.Vector3(0, 0.8, 5.2));
  const curTarget = useRef(new THREE.Vector3(0, -0.4, 0));
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpTgt = useMemo(() => new THREE.Vector3(), []);
  const prevPhase = useRef(phase);
  const entryT = useRef(0);
  const diveCurve = useRef(null);

  const flightKeys = useMemo(() => toKeys(FLIGHT_CAM), []);

  const sample = (keys, t) => {
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1].p) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const f = smooth(a.p, b.p, t);
    tmpPos.lerpVectors(a.pos, b.pos, f);
    tmpTgt.lerpVectors(a.tgt, b.tgt, f);
  };

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flying = phase === 'flight';
    if (typeof window !== 'undefined') {
      window.__cam = camera;
      window.__phase = phase;
    }

    if (prevPhase.current !== phase) {
      prevPhase.current = phase;
      entryT.current = t;
      if (phase === 'dive') {
        // Retreat path: the hero planet shrinks into a labeled solar system.
        resetEntryState();
        entryState.active = true;
        const s = camera.position.clone();
        diveCurve.current = new THREE.CatmullRomCurve3([
          s,
          s.clone().add(new THREE.Vector3(1.2, 1.6, 4.5)),
          new THREE.Vector3(5, 5, 10),
          OVERVIEW_POS.clone(),
        ]);
      }
    }

    if (phase === 'dive') {
      const since = t - entryT.current;
      entryState.t = since;

      // pull-back: the galaxy reveal (labels/orbits fade in with `pull`)
      const pullK = THREE.MathUtils.clamp((since - ENTRY.PULL) / ENTRY.PULL_DUR, 0, 1);
      entryState.pull = pullK * pullK * (3 - 2 * pullK); // smoothstep
      // the crossing (drives the camera's gentle tracking of the voyager)
      entryState.voyage = THREE.MathUtils.clamp((since - ENTRY.VOYAGE) / (ENTRY.FLASH - ENTRY.VOYAGE), 0, 1);
      // final run: push back in with the ship
      entryState.approach = THREE.MathUtils.clamp((since - ENTRY.APPROACH) / (ENTRY.FLASH - ENTRY.APPROACH), 0, 1);
      entryState.heat = entryState.approach;

      // where the voyager is right now (same curve + ease as the ship)
      const vk = THREE.MathUtils.clamp((since - ENTRY.LAUNCH) / (ENTRY.FLASH - ENTRY.LAUNCH), 0, 1);
      const ve = vk * vk * (3 - 2 * vk);
      VOYAGE_PATH.getPoint(ve, tmpPos);

      if (entryState.approach > 0) {
        // final run — ride in behind the ship toward Allen's World
        const a = entryState.approach * entryState.approach;
        camera.position.lerpVectors(OVERVIEW_POS, APPROACH_POS, a);
        tmpTgt.lerpVectors(tmpPos, ALLENS_WORLD, 0.6);
        curTarget.current.lerp(tmpTgt, 0.16);
      } else if (entryState.pull >= 1) {
        // survey — hold the wide shot, gently tracking the crossing
        camera.position.set(
          OVERVIEW_POS.x + (tmpPos.x - OVERVIEW_POS.x) * 0.05,
          OVERVIEW_POS.y + (tmpPos.y - OVERVIEW_POS.y) * 0.04,
          OVERVIEW_POS.z
        );
        tmpTgt.lerpVectors(GALAXY_CENTER, tmpPos, 0.45);
        curTarget.current.lerp(tmpTgt, 0.06);
      } else {
        // the retreat itself
        diveCurve.current.getPoint(entryState.pull, camera.position);
        tmpTgt.lerpVectors(PLANET_CENTER, GALAXY_CENTER, entryState.pull);
        curTarget.current.lerp(tmpTgt, 0.1);
      }
      camera.lookAt(curTarget.current);

      const fov = 50 + entryState.approach * 12; // slight rush on the final run
      camera.fov += (fov - camera.fov) * 0.15;
      camera.updateProjectionMatrix();

      // ride the existing speed-reactive bloom + chromatic aberration
      scrollState.velocity = entryState.heat * 1.2;
    } else if (flying) {
      sample(flightKeys, scrollState.progress);
      // Production lerp is a soft 0.1 (cinematic trailing). Tooling can set
      // window.__fastcam to snap for deterministic screenshots.
      const L =
        typeof window !== 'undefined' && window.__fastcam ? 0.6 : 0.1;
      camera.position.lerp(tmpPos, L);
      curTarget.current.lerp(tmpTgt, L);
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
        {/* Chapter set-dressing bows out at galaxy scale — it would read as
            clutter floating between the planets */}
        <HideDuringDive>
          <EngineeringStation />
          <AsteroidBelt />
        </HideDuringDive>
        {/* The galaxy + voyager (mounted only during the dive) */}
        <GalaxyScene />
        <VoyagerRocket />
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
            {/* gravitational lens + heat shimmer (identity until the dive) */}
            <EntryDistortion />
          </EffectComposer>
        </>
      )}
    </Canvas>
  );
}
