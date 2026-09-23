'use client';
import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import AllenWorld, { SKY } from './AllenWorld';
import Astronaut from './Astronaut';
import ExploreController from './ExploreController';
import LandingDirector from './LandingDirector';
import { useStore } from '@/lib/store';

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
  return (
    <div
      className="fixed inset-0 z-0 transition-[filter,transform] duration-[400ms] ease-out"
      style={{
        filter: entered ? 'blur(10px) brightness(0.5)' : 'none',
        transform: entered ? 'scale(1.04)' : 'none',
      }}
    >
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 5.2, 15], fov: 50, near: 0.1, far: 1200 }}
        onCreated={({ gl }) => gl.setClearColor(SKY.top, 1)}
      >
        {/* fog = the horizon colour, so the ground dissolves into the dusk */}
        <fogExp2 attach="fog" args={[SKY.horizon, 0.0085]} />
        <Suspense fallback={null}>
          <AllenWorld />
          <Astronaut ref={astronautRef} moving={moving} />
        </Suspense>
        <ExploreController astronautRef={astronautRef} moving={moving} />
        {landing && <LandingDirector />}
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.55} luminanceThreshold={0.7} luminanceSmoothing={0.3} mipmapBlur />
          <Vignette eskil={false} offset={0.3} darkness={0.62} />
          {/* same film grain as the intro — one continuous piece of footage */}
          <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
