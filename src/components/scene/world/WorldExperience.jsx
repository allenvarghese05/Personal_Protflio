'use client';
import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import AllenWorld from './AllenWorld';
import Astronaut from './Astronaut';

/**
 * Standalone view of Allen's World (Act 4) — reachable at /?world=1 so the
 * surface can be evaluated on its own while the Big Bang landing + click-to-move
 * controller are wired up. A slow orbit camera frames the astronaut + district.
 */
function OrbitCam() {
  const { current: tgt } = useRef(new THREE.Vector3(4, 1.2, -1));
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.12;
    const cam = state.camera;
    cam.position.set(Math.cos(t) * 13, 6.5, Math.sin(t) * 13);
    cam.lookAt(tgt);
  });
  return null;
}

export default function WorldExperience() {
  const moving = useRef(false);
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [13, 6.5, 0], fov: 50, near: 0.1, far: 300 }}
        onCreated={({ gl }) => gl.setClearColor('#2a2150', 1)}
      >
        <fogExp2 attach="fog" args={['#5a3f6e', 0.012]} />
        <Suspense fallback={null}>
          <AllenWorld />
          <Astronaut moving={moving} />
        </Suspense>
        <OrbitCam />
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.6} luminanceThreshold={0.6} luminanceSmoothing={0.3} mipmapBlur />
          <Vignette offset={0.3} darkness={0.55} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
