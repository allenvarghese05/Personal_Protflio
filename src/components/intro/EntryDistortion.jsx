'use client';
import { useMemo, forwardRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Effect } from 'postprocessing';
import * as THREE from 'three';
import { entryState } from '@/lib/entrySequence';

/* ----------------------------------------------------------------------------
   EntryDistortion — heat-shimmer for the voyager's final run into Allen's
   World: a high-frequency UV wobble that ramps with entryState.heat. The
   uniform rests at 0, so the pass is an identity outside the sequence.
---------------------------------------------------------------------------- */
const distortionFrag = /* glsl */ `
  uniform float uWobble;
  uniform float uTime;

  void mainUv(inout vec2 uv) {
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
    effect.uniforms.get('uWobble').value = entryState.heat * 0.0035;
    effect.uniforms.get('uTime').value = state.clock.elapsedTime;
  });
  return <primitive ref={ref} object={effect} />;
});
