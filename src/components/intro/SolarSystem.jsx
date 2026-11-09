'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ASSETS, SUN, PLANETS, ALLENS_WORLD, STARS, NEBULA, cosmos } from './cosmos';
import { ENTRY, entryState } from '@/lib/entrySequence';
import { PALETTE_LIGHT } from '@/lib/palette';
import { usePalette, useThemeValue } from '@/lib/useTheme';
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
 *
 * Light theme: the same system on paper. Additive glows vanish on white, so
 * the sun's corona and the planets' rims become soft darker halos (normal
 * blending, deeper tints), the starfield turns to faint graphite dots and the
 * nebula to the faintest tinted washes. The planet textures are untouched.
 */

// the corona's colours per theme (dark: the original fire; light: deep amber)
const CORONA_LIGHT = {
  INNER: new THREE.Color(PALETTE_LIGHT.accentLo),
  OUTER: new THREE.Color(PALETTE_LIGHT.accentHi),
};

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
          uAlpha: { value: 1 },
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
  const light = useThemeValue() === 'light';
  useEffect(() => {
    corona.uniforms.coronaColor1.value = light ? CORONA_LIGHT.INNER : SUN.CORONA.INNER;
    corona.uniforms.coronaColor2.value = light ? CORONA_LIGHT.OUTER : SUN.CORONA.OUTER;
    corona.uniforms.uAlpha.value = light ? 0.45 : 1;
    corona.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
  }, [corona, light]);
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
  const palette = usePalette();
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
        color={highlight ? palette.accent : palette.ink}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </line>
  );
}

/**
 * The rim glow, per theme. Dark: the original additive fresnel shell. Light:
 * a soft, darker halo — normal blending, a deeper tint of the rim colour,
 * clear over the face and gathering only toward the limb.
 */
function themeGlow(mat, rim, light) {
  const u = mat.uniforms;
  if (light) {
    u.color1.value.set(rim).multiplyScalar(0.55);
    u.color2.value.set(rim).multiplyScalar(0.7);
    u.fresnelBias.value = 0;
    u.fresnelScale.value = 0.4;
    u.fresnelPower.value = 3;
    mat.blending = THREE.NormalBlending;
  } else {
    u.color1.value.set(rim);
    u.color2.value.set(0x000000);
    u.fresnelBias.value = 0.2;
    u.fresnelScale.value = 0.1;
    u.fresnelPower.value = 1;
    mat.blending = THREE.AdditiveBlending;
  }
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
  const ringMat = useRef();
  const light = useThemeValue() === 'light';
  useEffect(() => themeGlow(glow, def.rim, light), [glow, def.rim, light]);
  // the ring textures are opaque JPEGs whose gaps are black — invisible on
  // the void, solid bands on paper — so in light their brightness is their alpha
  useEffect(() => {
    const m = ringMat.current;
    const next = light ? ringTex : null;
    if (!m || m.alphaMap === next) return;
    m.alphaMap = next; // adds/removes a shader define, so recompile
    m.needsUpdate = true;
  }, [light, ringTex]);

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
            <meshBasicMaterial ref={ringMat} map={ringTex} side={THREE.DoubleSide} transparent />
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
          uNightFloor: { value: 0 },
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
  const light = useThemeValue() === 'light';
  useEffect(() => themeGlow(glow, 0x6fa8ff, light), [glow, light]);
  // light: the night side keeps its city lights over a shaded day map
  useEffect(() => {
    surface.uniforms.uNightFloor.value = light ? 1 : 0;
  }, [surface, light]);

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
  const light = useThemeValue() === 'light';
  const mat = useRef();
  // disc.png's black fringe would turn each dot into a dark speck on paper, so
  // in light the texture is shape only (alphaMap); the swap needs a recompile
  useEffect(() => {
    if (mat.current) mat.current.needsUpdate = true;
  }, [light]);
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
        color={light ? PALETTE_LIGHT.slate : STARS.COLOR}
        ref={mat}
        size={STARS.SIZE}
        map={light ? null : tex}
        alphaMap={light ? tex : null}
        transparent
        opacity={light ? 0.5 : 1}
        depthWrite={false}
        blending={light ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </points>
  );
}

// light: the nebula as the faintest tinted washes, same hues, darker inks
const NEBULA_LIGHT = [PALETTE_LIGHT.accent, PALETTE_LIGHT.lilac, PALETTE_LIGHT.ice, PALETTE_LIGHT.sand, PALETTE_LIGHT.accentLo];

function Nebula() {
  const tex = useLoader(THREE.TextureLoader, ASSETS.smoke);
  const light = useThemeValue() === 'light';
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
  useEffect(() => {
    clouds.forEach((pts, i) => {
      const m = pts.material;
      if (light) m.color.set(NEBULA_LIGHT[i]);
      else m.color.set(NEBULA.COLORS[i]).multiplyScalar(NEBULA.COLOR_MULTIPLIER);
      m.opacity = light ? 0.035 : NEBULA.OPACITY;
      m.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    });
  }, [clouds, light]);
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
  const light = useThemeValue() === 'light';
  useEffect(() => {
    cosmos.solarGroup = group.current;
    return () => {
      cosmos.solarGroup = null;
    };
  }, []);
  return (
    <group ref={group} visible={false}>
      {/* light: a touch more fill, so night sides read as shade, not holes in the paper */}
      <ambientLight intensity={light ? 0.2 : 0.05} />
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
