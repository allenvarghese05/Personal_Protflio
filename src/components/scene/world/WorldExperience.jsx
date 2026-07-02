'use client';
import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import AllenWorld from './AllenWorld';
import Astronaut from './Astronaut';
import ExploreController from './ExploreController';
import LandingDirector from './LandingDirector';
import { useStore } from '@/lib/store';

/**
 * Allen's World (Act 4) — the walkable surface. Click the ground to move,
 * drag to orbit the camera; walking into a district triggers the ENTER prompt.
 * Reachable on its own at /?world=1 while the Big Bang landing is wired up.
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
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 5.2, 15], fov: 50, near: 0.1, far: 300 }}
        onCreated={({ gl }) => gl.setClearColor('#2a2150', 1)}
      >
        <fogExp2 attach="fog" args={['#5a3f6e', 0.012]} />
        <Suspense fallback={null}>
          <AllenWorld />
          <Astronaut ref={astronautRef} moving={moving} />
        </Suspense>
        <ExploreController astronautRef={astronautRef} moving={moving} />
        {landing && <LandingDirector />}
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.6} luminanceThreshold={0.6} luminanceSmoothing={0.3} mipmapBlur />
          <Vignette offset={0.3} darkness={0.55} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
