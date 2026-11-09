'use client';
import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import AllenWorld, { SKY, useWorldLook } from './AllenWorld';
import Astronaut from './Astronaut';
import ExploreController from './ExploreController';
import LandingDirector from './LandingDirector';
import { useStore } from '@/lib/store';

/** Keeps the clear colour on the sky's zenith when the theme changes. */
function ClearColor({ color }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.setClearColor(color, 1);
  }, [gl, color]);
  return null;
}

/** While a room is open the canvas is paused (frameloop 'never'), so a theme
 *  toggle there would leave the blurred world in the old theme. Render one
 *  frame on a theme change; the rAF lets the material and uniform effects run
 *  first. */
function RepaintOnTheme({ theme, entered }) {
  const advance = useThree((s) => s.advance);
  const painted = useRef(theme);
  useEffect(() => {
    if (painted.current === theme) return undefined;
    painted.current = theme;
    if (!entered) return undefined;
    const id = requestAnimationFrame(() => advance(performance.now()));
    return () => cancelAnimationFrame(id);
  }, [theme, entered, advance]);
  return null;
}

/**
 * Allen's World — the walkable surface: mesas above a cloud sea at dusk.
 * Click the stone to walk (routed across causeways), drag to look, walk up to
 * a project monolith to open it. Reachable directly at /?world=1.
 */
export default function WorldExperience() {
  const astronautRef = useRef();
  const moving = useRef(false);
  const entered = useStore((s) => s.enteredZone);
  const landing = useStore((s) => s.journeyPhase) === 'landing';
  const look = useWorldLook();
  return (
    <div
      className="world-surface fixed inset-0 z-0 transition-[filter,transform] duration-[400ms] ease-out"
      style={{
        filter: entered ? `blur(10px) brightness(${look.light ? 0.85 : 0.5})` : 'none',
        transform: entered ? 'scale(1.04)' : 'none',
      }}
    >
      <Canvas
        // paused while a room is open — the world is blurred behind it anyway,
        // and the room (e.g. the Meet Me helmet) gets the GPU to itself
        frameloop={entered ? 'never' : 'always'}
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 5.2, 15], fov: 50, near: 0.1, far: 1200 }}
        onCreated={({ gl }) => gl.setClearColor(SKY.top, 1)}
      >
        <ClearColor color={look.sky.top} />
        <RepaintOnTheme theme={look.light ? 'light' : 'dark'} entered={entered} />
        {/* fog = the horizon colour, so the ground dissolves into the dusk
            (or, in the light theme, into a pale daylight haze) */}
        <fogExp2 attach="fog" args={[SKY.horizon, 0.0085]} color={look.fog} density={look.fogDensity} />
        <Suspense fallback={null}>
          <AllenWorld />
          <Astronaut ref={astronautRef} moving={moving} />
        </Suspense>
        <ExploreController astronautRef={astronautRef} moving={moving} />
        {landing && <LandingDirector />}
        {/* keyed by theme so the passes rebuild cleanly on a toggle. Daylight
            only blooms what is truly hot (a white sky would otherwise glow)
            and keeps the vignette light. */}
        {look.light ? (
          <EffectComposer key="light" multisampling={4}>
            <Bloom intensity={0.3} luminanceThreshold={1} luminanceSmoothing={0.2} mipmapBlur />
            <Vignette eskil={false} offset={0.35} darkness={0.22} />
            <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
          </EffectComposer>
        ) : (
          <EffectComposer key="dark" multisampling={4}>
            <Bloom intensity={0.55} luminanceThreshold={0.7} luminanceSmoothing={0.3} mipmapBlur />
            <Vignette eskil={false} offset={0.3} darkness={0.62} />
            {/* same film grain as the intro — one continuous piece of footage */}
            <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
