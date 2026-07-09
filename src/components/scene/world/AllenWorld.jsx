'use client';
import { useMemo, useRef, useState } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { Outlines, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { toonGradient } from '@/lib/toon';
import { worldState } from '@/lib/worldState';
import { zones } from '@/data/world';
import { useStore } from '@/lib/store';

/* ----------------------------------------------------------------------------
   Sky dome — vertical gradient: deep indigo overhead → warm amber at horizon.
   This is the "Allen's World" signature palette (cool above, warm at the rim).
---------------------------------------------------------------------------- */
const SkyMaterial = shaderMaterial(
  {
    uTop: new THREE.Color('#1a1640'),
    uMid: new THREE.Color('#3b2a6b'),
    uHorizon: new THREE.Color('#c8763f'),
  },
  /* vertex */ `
    varying vec3 vWorld;
    void main() {
      vWorld = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* fragment */ `
    uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon;
    varying vec3 vWorld;
    void main() {
      float h = clamp(normalize(vWorld).y * 0.5 + 0.5, 0.0, 1.0);
      vec3 col = mix(uHorizon, uMid, smoothstep(0.42, 0.62, h));
      col = mix(col, uTop, smoothstep(0.6, 0.95, h));
      gl_FragColor = vec4(col, 1.0);
    }
  `
);
extend({ SkyMaterial });

function SkyDome() {
  return (
    <mesh scale={[1, 1, 1]}>
      <sphereGeometry args={[120, 32, 32]} />
      <skyMaterial side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

/* ----------------------------------------------------------------------------
   Ground — large warm toon disc with a few rolling hills poking through.
---------------------------------------------------------------------------- */
// Keep scenery clear of every district so a hill/boulder never buries the
// buildings. `margin` should cover the prop's own radius plus the zone glow.
function clearOfZones(x, z, margin) {
  for (const zo of zones) {
    if (Math.hypot(x - zo.position[0], z - zo.position[2]) < (zo.enterRadius || 6) + margin) {
      return false;
    }
  }
  return true;
}

function Ground() {
  const grad = useMemo(toonGradient, []);
  const hills = useMemo(() => {
    const arr = [];
    let guard = 0;
    while (arr.length < 14 && guard++ < 400) {
      const a = Math.random() * Math.PI * 2;
      const r = 14 + Math.random() * 40;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = 4 + Math.random() * 9;
      if (!clearOfZones(x, z, s)) continue;
      arr.push({
        pos: [x, -1.4 - Math.random() * 1.5, z],
        s,
        c: Math.random() < 0.5 ? '#caa15e' : '#b98a4a',
      });
    }
    return arr;
  }, []);

  // Flat tonal patches that break up the bare ground
  const patches = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 46;
      arr.push({
        pos: [Math.cos(a) * r, 0.015 + i * 0.001, Math.sin(a) * r],
        s: 3 + Math.random() * 7,
        c: Math.random() < 0.5 ? '#c2945a' : '#e0b878',
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Flat base disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[80, 64]} />
        <meshToonMaterial gradientMap={grad} color="#cf9f5d" />
      </mesh>
      {/* Tonal ground patches */}
      {patches.map((p, i) => (
        <mesh key={`p${i}`} rotation={[-Math.PI / 2, 0, 0]} position={p.pos}>
          <circleGeometry args={[p.s, 24]} />
          <meshToonMaterial gradientMap={grad} color={p.c} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
      {/* Rolling hills (low domes) */}
      {hills.map((h, i) => (
        <mesh key={i} position={h.pos}>
          <sphereGeometry args={[h.s, 16, 12]} />
          <meshToonMaterial gradientMap={grad} color={h.c} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ----------------------------------------------------------------------------
   Scenery — scattered low-poly rock formations (warm, in-palette). A few tall
   spires for silhouette interest; the rest are boulders that ground the scale.
---------------------------------------------------------------------------- */
function Scenery() {
  const grad = useMemo(toonGradient, []);
  const items = useMemo(() => {
    const arr = [];
    let guard = 0;
    while (arr.length < 30 && guard++ < 600) {
      const a = Math.random() * Math.PI * 2;
      const r = 7 + Math.random() * 38;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!clearOfZones(x, z, 4)) continue;
      const spire = Math.random() < 0.22;
      const tone = ['#8a7350', '#9c7e4e', '#76603f', '#a98a55'][
        Math.floor(Math.random() * 4)
      ];
      arr.push({
        pos: [x, 0, z],
        s: spire
          ? [0.5 + Math.random() * 0.5, 1.6 + Math.random() * 2.4, 0.5 + Math.random() * 0.5]
          : (() => {
              const u = 0.5 + Math.random() * 1.5;
              return [u, u * (0.6 + Math.random() * 0.5), u];
            })(),
        rot: Math.random() * Math.PI,
        spire,
        tone,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {items.map((it, i) => (
        <mesh
          key={i}
          position={[it.pos[0], it.s[1] * 0.45, it.pos[2]]}
          rotation={[it.spire ? 0 : it.rot * 0.3, it.rot, it.spire ? 0 : it.rot * 0.2]}
          scale={it.s}
        >
          {it.spire ? (
            <coneGeometry args={[1, 2, 6]} />
          ) : (
            <dodecahedronGeometry args={[1, 0]} />
          )}
          <meshToonMaterial gradientMap={grad} color={it.tone} flatShading />
          <Outlines thickness={0.04} color="#0a0a12" />
        </mesh>
      ))}
    </group>
  );
}

/* ----------------------------------------------------------------------------
   District landmark — a cluster of low-poly buildings + antenna the visitor
   walks up to. Glows + shows a label. (Engineering District for the slice.)
---------------------------------------------------------------------------- */
const BUILDINGS = [
  { p: [0, 0, 0], s: [2.2, 3.6, 2.2], c: '#33485f' },
  { p: [2.5, 0, -0.6], s: [1.6, 2.3, 1.6], c: '#3c5878' },
  { p: [-2.3, 0, 0.8], s: [1.8, 2.9, 1.8], c: '#2c4056' },
  { p: [0.7, 0, 2.5], s: [1.5, 1.9, 1.5], c: '#3a526e' },
];

/* Build a glowing canvas texture for the floating district name. Rendered on a
   Sprite so it always faces the camera (a real 3D billboard, not a CSS overlay). */
function makeLabelTexture(text, accent) {
  const spaced = text.split('').join(' '); // letter-spacing emulation
  const font = '600 72px "JetBrains Mono", ui-monospace, monospace';
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = font;
  const pad = 80;
  const w = Math.ceil(meas.measureText(spaced).width) + pad * 2;
  const h = 200;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // soft outer glow
  ctx.shadowColor = accent;
  ctx.shadowBlur = 26;
  ctx.fillStyle = accent;
  ctx.fillText(spaced, w / 2, h / 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff4e2';
  ctx.fillText(spaced, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  tex.userData = { aspect: w / h };
  return tex;
}

/* Glowing world-space "[ E ] ENTER" prompt, drawn on a canvas for a Sprite. */
function makeEnterTexture(accent) {
  const text = '[ E ]  ENTER';
  const font = '700 64px "JetBrains Mono", ui-monospace, monospace';
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = font;
  const pad = 48;
  const w = Math.ceil(meas.measureText(text).width) + pad * 2;
  const h = 150;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  // rounded glow plate
  const r = 26;
  ctx.beginPath();
  ctx.moveTo(pad / 2 + r, 30);
  ctx.arcTo(w - pad / 2, 30, w - pad / 2, h - 30, r);
  ctx.arcTo(w - pad / 2, h - 30, pad / 2, h - 30, r);
  ctx.arcTo(pad / 2, h - 30, pad / 2, 30, r);
  ctx.arcTo(pad / 2, 30, w - pad / 2, 30, r);
  ctx.closePath();
  ctx.fillStyle = 'rgba(20,12,6,0.45)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 22;
  ctx.stroke();
  // text
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffe7c2';
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  tex.userData = { aspect: w / h };
  return tex;
}

export function District({ id, position = [10, 0, 0], color = '#ff8a3d', label = 'ENGINEERING DISTRICT', accent = '#ffd27a', enterRadius = 5, labelRadius = 30 }) {
  const grad = useMemo(toonGradient, []);
  const beacon = useRef();
  const glow = useRef();
  const labelRef = useRef();
  const enterRef = useRef();
  const near = useRef(0); // 0→1 proximity factor
  const windows = useRef([]);
  const [inRange, setInRange] = useState(false);
  const setEnteredZone = useStore((s) => s.setEnteredZone);

  // Label uses the spec amber; ENTER plate uses the zone accent.
  const labelTex = useMemo(() => makeLabelTexture(label, '#e8a040'), [label]);
  const enterTex = useMemo(() => makeEnterTexture(accent), [accent]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const d = Math.hypot(
      worldState.pos.x - position[0],
      worldState.pos.z - position[2]
    );
    // proximity factor ramps over the 8 units approaching the trigger sphere
    const target = THREE.MathUtils.clamp(1 - (d - enterRadius) / 8, 0, 1);
    const nearK = typeof window !== 'undefined' && window.__fastcam ? 0.5 : 0.1;
    near.current += (target - near.current) * nearK;
    const n = near.current;

    if (beacon.current)
      beacon.current.material.emissiveIntensity =
        0.6 + Math.abs(Math.sin(t * 2)) * 0.8 + n * 0.8;
    if (glow.current)
      glow.current.material.opacity = 0.12 + Math.sin(t * 1.5) * 0.04 + n * 0.5;
    // Floating name: visible within labelRadius, pulses 0.6 → 1.0 → 0.6 over 2s.
    if (labelRef.current) {
      const vis = THREE.MathUtils.clamp((labelRadius - d) / 4, 0, 1);
      labelRef.current.material.opacity = (0.8 + Math.sin(t * Math.PI) * 0.2) * vis;
    }
    // ENTER prompt: rises in as the astronaut crosses into the trigger sphere.
    if (enterRef.current) {
      const show = THREE.MathUtils.clamp((n - 0.5) / 0.4, 0, 1);
      enterRef.current.material.opacity = show * (0.78 + Math.sin(t * 3) * 0.22);
    }
    // Windows pulse + brighten on approach
    windows.current.forEach((w, idx) => {
      if (w) w.emissiveIntensity = 0.9 + n * 1.4 + Math.sin(t * 3 + idx) * 0.15 * n;
    });
    const want = n > 0.55;
    if (want !== inRange) setInRange(want);
  });

  return (
    <group position={position}>
      {/* Warm fill light so the cluster doesn't read flat */}
      <pointLight position={[0, 4, 3]} intensity={6} distance={16} color="#ffb878" />

      {/* Ground glow ring */}
      <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[4.2, 6.4, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {BUILDINGS.map((b, i) => (
        <group key={i} position={[b.p[0], b.s[1] / 2, b.p[2]]}>
          <mesh>
            <boxGeometry args={b.s} />
            <meshToonMaterial gradientMap={grad} color={b.c} />
            <Outlines thickness={0.05} color="#0a0a12" />
          </mesh>
          {/* Emissive roofline accent */}
          <mesh position={[0, b.s[1] / 2 - 0.06, 0]}>
            <boxGeometry args={[b.s[0] + 0.04, 0.1, b.s[2] + 0.04]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
          {/* Backlit window panels on each visible face */}
          {[
            [0, 0, b.s[2] / 2 + 0.02, 0],
            [b.s[0] / 2 + 0.02, 0, 0, Math.PI / 2],
          ].map(([x, y, z, ry], k) => (
            <mesh key={k} position={[x, y, z]} rotation={[0, ry, 0]}>
              <planeGeometry args={[b.s[0] * 0.62, b.s[1] * 0.55]} />
              <meshStandardMaterial
                ref={(el) => el && (windows.current[i * 2 + k] = el)}
                color={color}
                emissive={color}
                emissiveIntensity={0.9}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Antenna tower */}
      <group position={[-0.4, 0, -2.3]}>
        <mesh position={[0, 2.4, 0]}>
          <cylinderGeometry args={[0.12, 0.18, 4.8, 8]} />
          <meshToonMaterial gradientMap={grad} color="#aab4c6" />
          <Outlines thickness={0.04} color="#0a0a12" />
        </mesh>
        <mesh ref={beacon} position={[0, 5.0, 0]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1} toneMapped={false} />
        </mesh>
      </group>

      {/* District name — a 3D billboard Sprite 8 units above the cluster,
          always facing the camera, pulsing, visible within labelRadius. */}
      <sprite ref={labelRef} position={[0, 8, 0]} scale={[1.7 * (labelTex.userData?.aspect || 4), 1.7, 1]}>
        <spriteMaterial map={labelTex} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>

      {/* World-space "[ E ] ENTER" prompt — a glowing billboard above the
          buildings. Click it or press E to open Mission Control. */}
      <sprite
        ref={enterRef}
        position={[0, 4.6, 0]}
        scale={[1.4 * (enterTex.userData?.aspect || 3), 1.4, 1]}
        onClick={(e) => {
          if (!inRange) return;
          e.stopPropagation();
          if (id) setEnteredZone(id);
        }}
      >
        <spriteMaterial map={enterTex} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
    </group>
  );
}

/* ----------------------------------------------------------------------------
   Warm surface lighting — hemisphere (indigo sky / warm ground) + a warm key,
   the "you've arrived somewhere with life" payoff after cold deep space.
---------------------------------------------------------------------------- */
function WorldLighting() {
  // Base intensities scaled by worldState.reveal — 1 in normal play, tweened
  // 0 → 1 while the world materialises out of the Act 3 white flash.
  const hemi = useRef();
  const key = useRef();
  const rim = useRef();
  const amb = useRef();
  useFrame(() => {
    const r = worldState.reveal;
    if (hemi.current) hemi.current.intensity = 1.05 * r;
    if (key.current) key.current.intensity = 2.1 * r;
    if (rim.current) rim.current.intensity = 0.5 * r;
    if (amb.current) amb.current.intensity = 0.28 * r;
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={['#7a64b0', '#d59a55', 1.05]} />
      <directionalLight ref={key} position={[14, 20, 8]} intensity={2.1} color="#ffe6c2" castShadow />
      {/* Cool rim from the opposite side to model the cel forms */}
      <directionalLight ref={rim} position={[-12, 8, -10]} intensity={0.5} color="#6a78c8" />
      <ambientLight ref={amb} intensity={0.28} color="#b89a7a" />
    </>
  );
}

export default function AllenWorld() {
  return (
    <group>
      <SkyDome />
      <WorldLighting />
      <Ground />
      <Scenery />
      {zones.map((z) => (
        <District
          key={z.id}
          id={z.id}
          position={z.position}
          color={z.color}
          accent={z.accent}
          label={z.label}
          enterRadius={z.enterRadius}
          labelRadius={z.labelRadius}
        />
      ))}
    </group>
  );
}
