'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ASSETS, SUN, PLANETS, ALLENS_WORLD, STARS, NEBULA, cosmos } from './cosmos';
import { ENTRY, entryState } from '@/lib/entrySequence';
import { PALETTE } from '@/lib/palette';
import {
  sunVertexShaderSurface,
  sunFragmentShaderSurface,
  sunVertexShaderCorona,
  sunFragmentShaderCorona,
  planetGlowVertexShader,
  planetGlowFragmentShader,
  planetNightTextureVertexShader,
  planetNightTextureFragmentShader,
} from './shaders';

/**
 * Allen's system — the real solar-system textures from human-constellations,
 * as-is, in a display layout (see cosmos.js). The Earth-textured world is
 * Allen's World: parked in place so the final dive can be planned exactly.
 * Hidden until the cut (IntroCamera flips `visible`).
 */

function Sun() {
  const tex = useLoader(THREE.TextureLoader, ASSETS.sun);
  const group = useRef();
  const surface = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { sunTexture: { value: tex }, time: { value: 0 } },
        vertexShader: sunVertexShaderSurface,
        fragmentShader: sunFragmentShaderSurface,
        depthWrite: false,
      }),
    [tex]
  );
  const corona = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          coronaColor1: { value: SUN.CORONA.INNER },
          coronaColor2: { value: SUN.CORONA.OUTER },
        },
        vertexShader: sunVertexShaderCorona,
        fragmentShader: sunFragmentShaderCorona,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    []
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    surface.uniforms.time.value = t;
    corona.uniforms.time.value = t;
    if (group.current) group.current.rotation.y = -t * 0.05;
  });
  return (
    <group ref={group}>
      <mesh material={surface}>
        <icosahedronGeometry args={[SUN.RADIUS, SUN.DETAIL]} />
      </mesh>
      <mesh material={corona} scale={SUN.CORONA.SCALE}>
        <sphereGeometry args={[SUN.CORONA.RADIUS, SUN.CORONA.DETAIL, SUN.CORONA.DETAIL]} />
      </mesh>
      <pointLight
        color={SUN.LIGHT.COLOR}
        intensity={SUN.LIGHT.INTENSITY}
        distance={SUN.LIGHT.DISTANCE}
        decay={SUN.LIGHT.DECAY}
      />
    </group>
  );
}

/**
 * Label visibility on the shared clock: in once the camera has settled on the
 * whole system, out as the dive begins (Allen's World holds on a little longer).
 */
function useLabelFade(ref, outFrom) {
  useFrame(() => {
    if (!ref.current) return;
    const t = entryState.t;
    const vis =
      THREE.MathUtils.smoothstep(t, ENTRY.SOLAR + 1.4, ENTRY.SOLAR + 2.4) *
      (1 - THREE.MathUtils.smoothstep(t, outFrom, outFrom + 0.7));
    ref.current.style.opacity = String(vis);
  });
}

/** Faint orbit path — the system reads as a diagram from the wide view. */
function OrbitRing({ radius, highlight = false }) {
  const ref = useRef();
  const geo = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);
  useFrame(() => {
    if (!ref.current) return;
    const t = entryState.t;
    const vis =
      THREE.MathUtils.smoothstep(t, ENTRY.SOLAR + 1.0, ENTRY.SOLAR + 2.4) *
      (1 - THREE.MathUtils.smoothstep(t, ENTRY.ZOOM + 1.5, ENTRY.ZOOM + 3.5));
    ref.current.material.opacity = vis * (highlight ? 0.45 : 0.12);
  });
  return (
    <line ref={ref} geometry={geo}>
      <lineBasicMaterial
        color={highlight ? PALETTE.accent : PALETTE.ink}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </line>
  );
}

function glowMaterial(rim) {
  return new THREE.ShaderMaterial({
    uniforms: {
      color1: { value: new THREE.Color(rim) },
      color2: { value: new THREE.Color(0x000000) },
      fresnelBias: { value: 0.2 },
      fresnelScale: { value: 0.1 },
      fresnelPower: { value: 1.0 },
    },
    vertexShader: planetGlowVertexShader,
    fragmentShader: planetGlowFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
  });
}

function Planet({ def }) {
  const orbit = useRef();
  const body = useRef();
  const label = useRef();
  useLabelFade(label, ENTRY.ZOOM);
  const tex = useLoader(THREE.TextureLoader, def.texture);
  const ringTex = useLoader(THREE.TextureLoader, def.rings?.texture ?? ASSETS.disc);
  const mat = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshPhongMaterial({ map: tex });
  }, [tex]);
  const glow = useMemo(() => glowMaterial(def.rim), [def.rim]);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(def.size, 12), [def.size]);

  useFrame((_, delta) => {
    // orbit on the journey clock, so the layout is identical every visit no
    // matter how long the hero sat idle
    if (orbit.current) orbit.current.rotation.y = def.angle + entryState.t * def.orbit;
    if (body.current) body.current.rotation.y += delta * def.spin;
  });

  return (
    <group ref={orbit}>
      <group ref={body} position={[def.radius, 0, 0]}>
        <mesh geometry={geo} material={mat} />
        <mesh geometry={geo} material={glow} scale={1.05} />
        {def.rings && (
          <mesh rotation-x={Math.PI / 2}>
            <ringGeometry args={[def.size + 0.1, def.size + 0.1 + def.rings.size, 48]} />
            <meshBasicMaterial map={ringTex} side={THREE.DoubleSide} transparent />
          </mesh>
        )}
        <Html center position={[0, def.size * 1.6 + 1.2, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div ref={label} className="planet-label" style={{ opacity: 0 }}>
            {def.name}
          </div>
        </Html>
      </group>
    </group>
  );
}

function AllensWorld() {
  const spin = useRef();
  const label = useRef();
  const [day, night, clouds] = useLoader(THREE.TextureLoader, [ASSETS.earth, ASSETS.earthNight, ASSETS.earthClouds]);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(ALLENS_WORLD.size, 16), []);
  const surface = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayTexture: { value: day },
          nightTexture: { value: night },
          // light comes from the sun at the origin
          sunDirection: { value: ALLENS_WORLD.position.clone().negate().normalize() },
        },
        vertexShader: planetNightTextureVertexShader,
        fragmentShader: planetNightTextureFragmentShader,
      }),
    [day, night]
  );
  const cloudMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: clouds,
        alphaMap: clouds,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [clouds]
  );
  const glow = useMemo(() => glowMaterial(0x6fa8ff), []);

  // The designation stays up through the first half of the dive, bowing out
  // as the planet fills the frame.
  useLabelFade(label, ENTRY.ZOOM + 2.2);
  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += delta * ALLENS_WORLD.spin;
  });

  return (
    <group position={ALLENS_WORLD.position}>
      <group rotation-z={ALLENS_WORLD.tilt}>
        <group ref={spin}>
          <mesh geometry={geo} material={surface} />
          <mesh geometry={geo} material={cloudMat} scale={1.005} />
        </group>
      </group>
      <mesh geometry={geo} material={glow} scale={1.05} />
      <Html center position={[0, ALLENS_WORLD.size * 2.1, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={label} className="world-label" style={{ opacity: 0 }}>
          <span className="world-label__name">Allen&rsquo;s World</span>
          <span className="world-label__meta">Destination</span>
          <span className="world-label__tick" />
        </div>
      </Html>
    </group>
  );
}

function Stars() {
  const tex = useLoader(THREE.TextureLoader, ASSETS.disc);
  const geo = useMemo(() => {
    const p = new Float32Array(STARS.COUNT * 3);
    for (let i = 0; i < p.length; i++) p[i] = THREE.MathUtils.randFloatSpread(STARS.SPREAD);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial
        color={STARS.COLOR}
        size={STARS.SIZE}
        map={tex}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Nebula() {
  const tex = useLoader(THREE.TextureLoader, ASSETS.smoke);
  const clouds = useMemo(() => {
    const p = new Float32Array(NEBULA.PARTICLE_COUNT * 3);
    for (let i = 0; i < p.length; i++) p[i] = THREE.MathUtils.randFloatSpread(NEBULA.PARTICLE_SPREAD);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return NEBULA.COLORS.map((c) => {
      const pts = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          size: NEBULA.SIZE,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: NEBULA.OPACITY,
          map: tex,
          color: new THREE.Color(c).multiplyScalar(NEBULA.COLOR_MULTIPLIER),
        })
      );
      const s = NEBULA.CLUSTER_SPREAD;
      pts.position.set(
        THREE.MathUtils.randFloatSpread(s),
        THREE.MathUtils.randFloatSpread(s),
        THREE.MathUtils.randFloatSpread(s)
      );
      return pts;
    });
  }, [tex]);
  return (
    <group>
      {clouds.map((c, i) => (
        <primitive key={i} object={c} />
      ))}
    </group>
  );
}

export default function SolarSystem() {
  const group = useRef();
  useEffect(() => {
    cosmos.solarGroup = group.current;
    return () => {
      cosmos.solarGroup = null;
    };
  }, []);
  return (
    <group ref={group} visible={false}>
      <ambientLight intensity={0.05} />
      <Stars />
      <Nebula />
      <Sun />
      {PLANETS.map((p) => (
        <OrbitRing key={`o-${p.name}`} radius={p.radius} />
      ))}
      <OrbitRing radius={ALLENS_WORLD.position.length()} highlight />
      {PLANETS.map((p) => (
        <Planet key={p.name} def={p} />
      ))}
      <AllensWorld />
    </group>
  );
}

useLoader.preload(THREE.TextureLoader, [
  ASSETS.disc,
  ASSETS.smoke,
  ASSETS.sun,
  ASSETS.earth,
  ASSETS.earthNight,
  ASSETS.earthClouds,
  ...PLANETS.map((p) => p.texture),
  ...PLANETS.filter((p) => p.rings).map((p) => p.rings.texture),
]);
