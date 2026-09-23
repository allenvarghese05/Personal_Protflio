'use client';
import { useMemo, useRef } from 'react';
import { useFrame, useLoader, extend } from '@react-three/fiber';
import { Html, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { worldState } from '@/lib/worldState';
import { MESAS, CAUSEWAYS, mesaById } from '@/data/world';
import { causewaySegments } from '@/lib/worldNav';
import { PALETTE } from '@/lib/palette';
import Monoliths from './Monoliths';
import Landmarks from './Landmarks';

/* ----------------------------------------------------------------------------
   Allen's World — stone mesas rising out of a sea of clouds at dusk, under the
   same starfield we dove through. Realistic, not cel-shaded: standard (PBR)
   materials, a low amber sun with soft shadows, an ice-blue rim, and haze that
   dissolves everything into the horizon. Colours come from lib/palette.js.
---------------------------------------------------------------------------- */

export const SKY = {
  top: PALETTE.void,
  mid: '#161c30',
  horizon: '#6b3c1f', // accent-lo in dusk shadow — also the fog colour
};

// The low sun — its direction drives the key light AND the glow in the sky.
export const SUN_DIR = new THREE.Vector3(0.62, 0.2, 0.52).normalize();

/* ── Sky dome ─────────────────────────────────────────────────────────────── */

const SkyMaterial = shaderMaterial(
  {
    uTop: new THREE.Color(SKY.top),
    uMid: new THREE.Color(SKY.mid),
    uHorizon: new THREE.Color(SKY.horizon),
    uSunDir: SUN_DIR,
  },
  /* vertex */ `
    varying vec3 vWorld;
    void main() {
      vWorld = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* fragment */ `
    uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uSunDir;
    varying vec3 vWorld;
    float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
    void main() {
      vec3 dir = normalize(vWorld);
      float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 col = mix(uHorizon, uMid, smoothstep(0.48, 0.64, h));
      col = mix(col, uTop, smoothstep(0.62, 0.92, h));
      // amber band on the horizon line
      col += vec3(1.0, 0.6, 0.24) * 0.22 * exp(-pow((h - 0.5) * 22.0, 2.0));
      // the low sun: a tight core + a wide warm bloom
      float s = max(dot(dir, uSunDir), 0.0);
      col += vec3(1.0, 0.72, 0.42) * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.28);
      // stars overhead — the same sky we flew through
      vec3 cell = floor(dir * 380.0);
      float star = step(0.9975, hash(cell)) * smoothstep(0.62, 0.86, h);
      col += vec3(0.95, 0.93, 0.88) * star * (0.5 + 0.5 * hash(cell + 7.0));
      gl_FragColor = vec4(col, 1.0);
    }
  `
);
extend({ SkyMaterial });

function SkyDome() {
  return (
    <mesh>
      <sphereGeometry args={[480, 48, 24]} />
      <skyMaterial side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

/* ── Cloud sea ────────────────────────────────────────────────────────────── */

const CloudSeaMaterial = shaderMaterial(
  {
    uTime: 0,
    uLit: new THREE.Color('#b08d74'),
    uShade: new THREE.Color('#232838'),
    uHorizon: new THREE.Color(SKY.horizon),
    uSunDir: SUN_DIR,
    uOpacity: 1,
    uScale: 0.018,
    uSpeed: 1,
  },
  `
    varying vec3 vWorld;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `,
  `
    uniform float uTime; uniform float uOpacity; uniform float uScale; uniform float uSpeed;
    uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uHorizon; uniform vec3 uSunDir;
    varying vec3 vWorld;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
      return v;
    }
    void main() {
      vec2 p = vWorld.xz * uScale + vec2(uTime * 0.006, uTime * 0.004) * uSpeed;
      float d = fbm(p + fbm(p * 0.7) * 0.9);          // billowing, domain-warped
      float lit = fbm(p + uSunDir.xz * 0.35) ;        // offset sample → sun-side highlight
      float shade = clamp(d - lit + 0.55, 0.0, 1.0);
      vec3 col = mix(uShade, uLit, smoothstep(0.25, 0.85, shade) * smoothstep(0.2, 0.7, d));
      // distance haze into the horizon colour
      float dist = length(vWorld.xz - cameraPosition.xz);
      col = mix(col, uHorizon, smoothstep(40.0, 360.0, dist));
      float a = uOpacity * smoothstep(0.28, 0.55, d);
      gl_FragColor = vec4(col, max(a, uOpacity >= 1.0 ? 1.0 : 0.0));
    }
  `
);
extend({ CloudSeaMaterial });

function CloudSea() {
  const floor = useRef();
  const wisps = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (floor.current) floor.current.uTime = t;
    if (wisps.current) wisps.current.uTime = t;
  });
  return (
    <group>
      {/* the solid sea — everything below dissolves into it */}
      <mesh rotation-x={-Math.PI / 2} position-y={-11}>
        <planeGeometry args={[1400, 1400]} />
        <cloudSeaMaterial ref={floor} depthWrite fog={false} />
      </mesh>
      {/* a drifting layer of wisps above it for depth + motion */}
      <mesh rotation-x={-Math.PI / 2} position-y={-6.5}>
        <planeGeometry args={[1400, 1400]} />
        <cloudSeaMaterial ref={wisps} transparent depthWrite={false} uOpacity={0.55} uScale={0.03} uSpeed={2.2} fog={false} />
      </mesh>
    </group>
  );
}

/** Soft cloud banks hugging the mesas' flanks (the smoke sprite from the
 *  cosmic journey — the same clouds we fell through). */
function CloudBanks() {
  const tex = useLoader(THREE.TextureLoader, '/cosmic/smoke.png');
  const group = useRef();
  const puffs = useMemo(() => {
    const arr = [];
    const warm = new THREE.Color('#b8957c');
    const cool = new THREE.Color('#3a4058');
    for (let i = 0; i < 80; i++) {
      const m = MESAS[i % MESAS.length];
      const a = Math.random() * Math.PI * 2;
      const r = m.r + 2 + Math.random() * 14;
      arr.push({
        pos: [m.center[0] + Math.cos(a) * r, -7 + Math.random() * 4.5, m.center[1] + Math.sin(a) * r],
        s: 14 + Math.random() * 22,
        color: cool.clone().lerp(warm, Math.random() * 0.7),
        drift: (Math.random() - 0.5) * 0.25,
        op: 0.22 + Math.random() * 0.2,
      });
    }
    return arr;
  }, []);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      c.position.x += puffs[i].drift * dt;
    });
  });
  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <sprite key={i} position={p.pos} scale={[p.s, p.s * 0.55, 1]}>
          <spriteMaterial map={tex} color={p.color} transparent opacity={p.op} depthWrite={false} fog />
        </sprite>
      ))}
    </group>
  );
}

/* ── Stone ────────────────────────────────────────────────────────────────── */

// Procedural sandstone ground texture (no image to load).
let _groundTex = null;
function groundTexture() {
  if (_groundTex) return _groundTex;
  const s = 512;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7d6e5d';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 900; i++) {
    const r = 6 + Math.random() * 40;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    const tone = Math.random() < 0.5 ? '96,84,70' : '140,124,104';
    g.addColorStop(0, `rgba(${tone},0.18)`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.save();
    ctx.translate(Math.random() * s, Math.random() * s);
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
  const img = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  _groundTex = tex;
  return tex;
}

const hashN = (x) => {
  const s = Math.sin(x * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

/** A rock pillar: flat walkable top at y=0, weathered flanks with strata,
 *  flaring as it drops into the clouds. */
function rockGeometry(rTop, height, seed) {
  const g = new THREE.CylinderGeometry(rTop, rTop * 1.3 + 2, height, 72, 28, true);
  g.translate(0, -height / 2, 0);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const light = new THREE.Color('#8a7a66');
  const band = new THREE.Color('#5f5446');
  const deep = new THREE.Color('#2c2a31');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    // the top rim stays exact so it meets the walkable disc seamlessly
    const rim = THREE.MathUtils.smoothstep(-y, 0.0, 2.2);
    const n =
      Math.sin(a * 7 + seed) * 0.45 +
      Math.sin(a * 17 + y * 0.6 + seed * 2) * 0.25 +
      Math.sin(y * 1.1 + a * 3 + seed) * 0.35 +
      (hashN(i + seed) - 0.5) * 0.18;
    const out = (0.6 + n) * 1.1 * rim;
    const r = Math.hypot(x, z);
    pos.setXYZ(i, x + (x / r) * out, y, z + (z / r) * out);
    // strata bands, darkening toward the clouds
    const strata = 0.5 + 0.5 * Math.sin(y * 2.4 + Math.sin(a * 5 + seed) * 0.8);
    c.copy(light).lerp(band, strata * 0.7);
    c.lerp(deep, THREE.MathUtils.clamp(-y / height, 0, 1) * 0.85);
    c.toArray(colors, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

const rockMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });

function Mesa({ center, r, top = 0, height = 34, seed = 1, walkable = true }) {
  const geo = useMemo(() => rockGeometry(r + 0.8, height, seed), [r, height, seed]);
  const ground = useMemo(() => {
    const t = groundTexture().clone();
    t.needsUpdate = true;
    t.repeat.set((r + 0.8) / 6, (r + 0.8) / 6);
    return t;
  }, [r]);
  return (
    <group position={[center[0], top, center[1]]}>
      <mesh geometry={geo} material={rockMaterial} castShadow receiveShadow />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[r + 0.8, 72]} />
        <meshStandardMaterial map={ground} color={walkable ? '#b9aa94' : '#8f826f'} roughness={0.95} />
      </mesh>
    </group>
  );
}

/** Boulders along the lip — outside the walkable margin, never in the way. */
function RimBoulders({ mesa, count, avoid = [] }) {
  const items = useMemo(() => {
    const arr = [];
    let guard = 0;
    while (arr.length < count && guard++ < 200) {
      const a = Math.random() * Math.PI * 2;
      if (avoid.some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.35)) continue;
      const rr = mesa.r + 0.1 + Math.random() * 0.6;
      const s = 0.35 + Math.random() * 0.9;
      arr.push({
        pos: [mesa.center[0] + Math.cos(a) * rr, s * 0.35, mesa.center[1] + Math.sin(a) * rr],
        s: [s, s * (0.6 + Math.random() * 0.4), s * (0.8 + Math.random() * 0.4)],
        rot: [Math.random(), Math.random() * 3, Math.random()],
      });
    }
    return arr;
  }, [mesa, count, avoid]);
  const geo = useMemo(() => {
    const g = new THREE.DodecahedronGeometry(1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 0.85 + hashN(i * 3.1) * 0.3;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} geometry={geo} position={it.pos} scale={it.s} rotation={it.rot} castShadow receiveShadow>
          <meshStandardMaterial color="#6d6152" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** Stone causeway with amber light strips along both edges. */
function Causeway({ seg }) {
  const [ax, az] = seg.start;
  const [bx, bz] = seg.end;
  const len = Math.hypot(bx - ax, bz - az);
  const rotY = Math.atan2(bx - ax, bz - az);
  const w = seg.w + 0.5;
  const mid = [(ax + bx) / 2, (az + bz) / 2];
  const tex = useMemo(() => {
    const t = groundTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(w / 6, len / 6);
    return t;
  }, [w, len]);
  const strips = useRef([]);
  useFrame((state) => {
    const k = 0.8 + Math.sin(state.clock.elapsedTime * 1.2) * 0.12;
    strips.current.forEach((m) => m && (m.emissiveIntensity = 1.4 * k * worldState.reveal));
  });
  return (
    <group position={[mid[0], 0, mid[1]]} rotation-y={rotY}>
      <mesh position-y={-0.45} castShadow receiveShadow>
        <boxGeometry args={[w, 0.9, len]} />
        <meshStandardMaterial map={tex} color="#a89985" roughness={0.95} />
      </mesh>
      {[-1, 1].map((side, i) => (
        <mesh key={side} position={[side * (w / 2 - 0.12), 0.02, 0]}>
          <boxGeometry args={[0.06, 0.04, len]} />
          <meshStandardMaterial
            ref={(el) => (strips.current[i] = el)}
            color={PALETTE.accent}
            emissive={PALETTE.accent}
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* piers down into the cloud sea */}
      {[-0.28, 0.28].map((t) => (
        <mesh key={t} position={[0, -9, t * len]} castShadow>
          <boxGeometry args={[w * 0.55, 16, 1.4]} />
          <meshStandardMaterial color="#4f463d" roughness={0.97} />
        </mesh>
      ))}
    </group>
  );
}

/** Distant pillars rising from the clouds — scale and depth, not walkable. */
function DistantPillars() {
  const items = useMemo(() => {
    const arr = [];
    let guard = 0;
    while (arr.length < 16 && guard++ < 300) {
      const a = Math.random() * Math.PI * 2;
      const d = 60 + Math.random() * 150;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d - 4;
      // keep clear of every walkable mesa
      if (MESAS.some((m) => Math.hypot(x - m.center[0], z - m.center[1]) < m.r + 22)) continue;
      arr.push({ center: [x, z], r: 2 + Math.random() * 6, top: -5 + Math.random() * 16, seed: arr.length * 3.7 + 1 });
    }
    return arr;
  }, []);
  return (
    <group>
      {items.map((p, i) => (
        <Mesa key={i} center={p.center} r={p.r} top={p.top} height={40 + p.top} seed={p.seed} walkable={false} />
      ))}
    </group>
  );
}

/** Where you touched down — a faint inset ring in the stone. */
function LandingMark() {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) ref.current.opacity = 0.45 * worldState.reveal;
  });
  return (
    <group position={[0, 0.015, 6]} rotation-x={-Math.PI / 2}>
      <mesh>
        <ringGeometry args={[2.1, 2.16, 96]} />
        <meshBasicMaterial ref={ref} color={PALETTE.accent} transparent opacity={0.45} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ── Light ────────────────────────────────────────────────────────────────── */

function WorldLighting() {
  // Base intensities scaled by worldState.reveal — 1 in normal play, tweened
  // 0 → 1 while the world materialises out of the arrival flash.
  const hemi = useRef();
  const sun = useRef();
  const rim = useRef();
  const amb = useRef();
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0, -4);
    return o;
  }, []);
  useFrame(() => {
    const r = worldState.reveal;
    if (hemi.current) hemi.current.intensity = 0.85 * r;
    if (sun.current) sun.current.intensity = 2.6 * r;
    if (rim.current) rim.current.intensity = 0.55 * r;
    if (amb.current) amb.current.intensity = 0.12 * r;
  });
  const sunPos = SUN_DIR.clone().multiplyScalar(80).add(target.position);
  return (
    <>
      <primitive object={target} />
      {/* cool sky above, warm stone bounce below */}
      <hemisphereLight ref={hemi} args={['#5a6a9a', '#6b5a48', 0.85]} />
      {/* the low amber sun — long, soft shadows across the mesas */}
      <directionalLight
        ref={sun}
        position={sunPos.toArray()}
        target={target}
        intensity={2.6}
        color={PALETTE.accentHi}
        castShadow
        shadow-mapSize={[3072, 3072]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-56}
        shadow-camera-right={56}
        shadow-camera-top={56}
        shadow-camera-bottom={-56}
        shadow-camera-near={1}
        shadow-camera-far={220}
      />
      {/* ice rim from the opposite side — separates forms from the dusk */}
      <directionalLight ref={rim} position={[-50, 18, -70]} intensity={0.55} color={PALETTE.ice} />
      <ambientLight ref={amb} intensity={0.12} color="#8a8070" />
    </>
  );
}

export default function AllenWorld() {
  // keep rim boulders clear of each causeway's mouth
  const mouth = (m) =>
    CAUSEWAYS.filter((c) => c.a === m.id || c.b === m.id).map((c) => {
      const o = mesaById(c.a === m.id ? c.b : c.a);
      return Math.atan2(o.center[1] - m.center[1], o.center[0] - m.center[0]);
    });
  return (
    <group>
      <SkyDome />
      <WorldLighting />
      <CloudSea />
      <CloudBanks />
      <DistantPillars />
      {MESAS.map((m, i) => (
        <Mesa key={m.id} center={m.center} r={m.r} seed={i * 5.3 + 2} />
      ))}
      {causewaySegments.map((s) => (
        <Causeway key={s.id} seg={s} />
      ))}
      {MESAS.map((m) => (
        <RimBoulders key={`b-${m.id}`} mesa={m} count={Math.round(m.r * 0.9)} avoid={mouth(m)} />
      ))}
      <LandingMark />
      <Monoliths />
      <Landmarks />
      <EngineeringSign />
    </group>
  );
}

/** "Engineering" — the district's name, readable from across the causeway,
 *  bowing out once you're among the monoliths (their own tags take over). */
function EngineeringSign() {
  const ref = useRef();
  const eng = mesaById('engineering');
  useFrame(() => {
    if (!ref.current) return;
    const d = Math.hypot(worldState.pos.x - eng.center[0], worldState.pos.z - eng.center[1]);
    const vis = THREE.MathUtils.smoothstep(d, 11, 15) * (1 - THREE.MathUtils.smoothstep(d, 60, 75));
    ref.current.style.opacity = String(vis * worldState.reveal);
  });
  return (
    <Html center position={[eng.center[0], 7.2, eng.center[1] + 2]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={ref} className="world-label" style={{ opacity: 0 }}>
        <span className="world-label__name">Engineering</span>
        <span className="world-label__meta">Six projects</span>
        <span className="world-label__tick" />
      </div>
    </Html>
  );
}
