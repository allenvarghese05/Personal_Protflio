'use client';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { ENTRY, entryState, entryElapsed } from '@/lib/entrySequence';
import { PALETTE } from '@/lib/palette';
import { GALAXY, ALLENS_WORLD, SOLAR_WIDE, WORLD_MARK, cosmos } from './cosmos';
import Galaxy from './Galaxy';
import SolarSystem from './SolarSystem';
import Voyager, { voyagePose } from './Voyager';
import { EntryDistortion } from './EntryDistortion';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => x * x * (3 - 2 * x);
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const ORIGIN = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * The director. Idle (loading / hero): the galaxy turns with a touch of
 * pointer parallax. Dive: every shot is a pure function of the shared clock —
 *   galaxy dive → cut under the star flash → system sweep → chase the voyager.
 */
function IntroCamera() {
  const { camera, pointer, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const start = useMemo(() => new THREE.Vector3(), []);
  const startFov = useRef(GALAXY.FOV_DESKTOP);
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);
  const ship = useMemo(() => new THREE.Vector3(), []);
  const tan = useMemo(() => new THREE.Vector3(), []);
  const chasePos = useMemo(() => new THREE.Vector3(), []);
  const chaseLook = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const phase = useStore.getState().phase;
    const mobile = size.width < size.height;
    const heroPos = mobile ? GALAXY.CAMERA_MOBILE : GALAXY.CAMERA_DESKTOP;
    const heroFov = mobile ? GALAXY.FOV_MOBILE : GALAXY.FOV_DESKTOP;

    if (phase !== 'dive') {
      if (cosmos.galaxyGroup) cosmos.galaxyGroup.visible = true;
      if (cosmos.solarGroup) cosmos.solarGroup.visible = false;
      tmpPos.set(heroPos.x + pointer.x * 0.35, heroPos.y, heroPos.z + pointer.y * 0.25);
      camera.position.lerp(tmpPos, 0.04);
      camera.lookAt(ORIGIN);
      if (Math.abs(camera.fov - heroFov) > 0.01) {
        camera.fov = heroFov;
        camera.updateProjectionMatrix();
      }
      return;
    }

    // First dive frame: remember where the hero shot left the camera
    if (!entryState.active) {
      entryState.active = true;
      start.copy(camera.position);
      startFov.current = camera.fov;
    }
    const t = entryElapsed();
    entryState.t = t;

    if (t < ENTRY.SOLAR) {
      /* ── the galaxy dive ─────────────────────────────────────────────── */
      if (cosmos.galaxyGroup) cosmos.galaxyGroup.visible = true;
      if (cosmos.solarGroup) cosmos.solarGroup.visible = false;
      const p = clamp01((t - ENTRY.GALAXY) / ENTRY.GALAXY_DUR);
      const e = p * p * p * (p * (6 * p - 15) + 10) * 0.35 + p * p * 0.65; // slow start, committed finish
      tmpPos.copy(cosmos.starWorld).add(GALAXY.STAR_CAMERA_OFFSET);
      camera.position.lerpVectors(start, tmpPos, e);
      look.lerpVectors(ORIGIN, cosmos.starWorld, smooth(p));
      camera.lookAt(look);
      camera.fov = THREE.MathUtils.lerp(startFov.current, GALAXY.DIVE_FOV, e);
      camera.updateProjectionMatrix();
      return;
    }

    /* ── Allen's system: sweep in, then ride the voyager ───────────────── */
    if (cosmos.galaxyGroup) cosmos.galaxyGroup.visible = false;
    if (cosmos.solarGroup) cosmos.solarGroup.visible = true;

    const s = clamp01((t - ENTRY.SOLAR) / ENTRY.SOLAR_SWEEP_DUR);
    const es = easeInOutCubic(s);
    tmpPos.lerpVectors(SOLAR_WIDE, WORLD_MARK, es);
    tmpLook.lerpVectors(ORIGIN, ALLENS_WORLD.position, easeInOutCubic(clamp01(s * 1.25)));

    voyagePose(t, ship, tan);
    const c = smooth(clamp01((t - ENTRY.VOYAGE) / 1.0));
    chasePos.copy(ship).addScaledVector(tan, -0.9).addScaledVector(UP, 0.28);
    chaseLook.copy(ship).addScaledVector(tan, 2);

    const approach = clamp01((t - ENTRY.APPROACH) / (ENTRY.FLASH - ENTRY.APPROACH));
    entryState.approach = approach;
    entryState.heat = approach;
    entryState.voyage = clamp01((t - ENTRY.LAUNCH) / (ENTRY.FLASH - ENTRY.LAUNCH));

    camera.position.lerpVectors(tmpPos, chasePos, c);
    look.lerpVectors(tmpLook, chaseLook, c);
    camera.lookAt(look);
    camera.rotation.z += Math.sin(t * 1.4) * 0.004 * c; // gentle bank while riding
    camera.fov = THREE.MathUtils.lerp(55, 50, es) + approach * 12;
    camera.updateProjectionMatrix();
  });

  return null;
}

/** Bloom tuned per act: the galaxy glows hot, the system reads crisp. */
function FxDriver({ bloomRef }) {
  useFrame(() => {
    const b = bloomRef.current;
    if (!b) return;
    const inGalaxy = useStore.getState().phase !== 'dive' || entryState.t < ENTRY.SOLAR;
    b.intensity = inGalaxy ? 1.15 : 0.75 + entryState.heat * 1.1;
    if (b.luminanceMaterial) b.luminanceMaterial.threshold = inGalaxy ? 0 : 0.55;
  });
  return null;
}

/**
 * Once everything under Suspense has loaded: compile every shader (solar
 * system included, while it's still hidden) so the cut never hitches, then
 * tell the loader we're ready.
 */
function ReadyGate() {
  const { gl, scene, camera } = useThree();
  const setSceneReady = useStore((s) => s.setSceneReady);
  useEffect(() => {
    const solar = cosmos.solarGroup;
    if (solar) solar.visible = true;
    try {
      gl.compile(scene, camera);
    } catch {
      /* compile is an optimisation — never block the intro on it */
    }
    if (solar) solar.visible = false;
    setSceneReady(true);
  }, [gl, scene, camera, setSceneReady]);
  return null;
}

export default function IntroExperience({ tier = 'full' }) {
  const bloomRef = useRef();
  const full = tier === 'full';
  return (
    <Canvas
      flat
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
      dpr={full ? [1, 2] : [1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      camera={{ position: GALAXY.CAMERA_DESKTOP.toArray(), fov: GALAXY.FOV_DESKTOP, near: 0.02, far: 4000 }}
      onCreated={({ gl }) => gl.setClearColor(PALETTE.void, 1)}
    >
      <Suspense fallback={null}>
        <Galaxy />
        <SolarSystem />
        <Voyager />
        <ReadyGate />
      </Suspense>
      <IntroCamera />

      {full && (
        <>
          <FxDriver bloomRef={bloomRef} />
          <EffectComposer multisampling={0}>
            <Bloom ref={bloomRef} intensity={1.15} luminanceThreshold={0} luminanceSmoothing={0.3} mipmapBlur />
            <Vignette eskil={false} offset={0.3} darkness={0.7} />
            <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
            <EntryDistortion />
          </EffectComposer>
        </>
      )}
    </Canvas>
  );
}
