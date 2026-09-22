'use client';
import { useMemo, useRef, useState } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { Outlines, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { toonGradient } from '@/lib/toon';
import { worldState } from '@/lib/worldState';
import { zones } from '@/data/world';
import { useStore } from '@/lib/store';
import { PALETTE } from '@/lib/palette';

/* ----------------------------------------------------------------------------
   Sky dome — the SAME sky we flew in through: deep space overhead (with its
   stars), cooling to slate, burning to an amber dusk at the horizon. Colours
   come from the one palette (lib/palette.js) so space → world reads as one
   continuous shot.
---------------------------------------------------------------------------- */
export const SKY = {
  top: PALETTE.void,
  mid: '#161c30', // surface → ice, deepened
  horizon: '#6b3c1f', // accent-lo in dusk shadow — also the fog colour
};

const SkyMaterial = shaderMaterial(
  {
    uTop: new THREE.Color(SKY.top),
    uMid: new THREE.Color(SKY.mid),
    uHorizon: new THREE.Color(SKY.horizon),
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
    float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
    void main() {
      vec3 dir = normalize(vWorld);
      float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 col = mix(uHorizon, uMid, smoothstep(0.48, 0.64, h));
      col = mix(col, uTop, smoothstep(0.62, 0.92, h));
      // a thin amber band right on the horizon line — the low sun's glow
      col += vec3(1.0, 0.6, 0.24) * 0.22 * exp(-pow((h - 0.5) * 22.0, 2.0));
      // stars, fading in with altitude — same starfield we flew through
      vec3 cell = floor(dir * 380.0);
      float star = step(0.9975, hash(cell)) * smoothstep(0.6, 0.85, h);
      col += vec3(0.95, 0.93, 0.88) * star * (0.5 + 0.5 * hash(cell + 7.0));
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
        c: Math.random() < 0.5 ? '#8f7a5f' : '#7d6a52',
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
        c: Math.random() < 0.5 ? '#8a765d' : '#a8916f',
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Flat base disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[80, 64]} />
        <meshToonMaterial gradientMap={grad} color="#9a8468" />
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
      const tone = ['#5c5146', '#6a5c4e', '#4f463d', '#736352'][
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
          <Outlines thickness={0.04} color={PALETTE.void} />
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
  { p: [0, 0, 0], s: [2.2, 3.6, 2.2], c: '#343b4d' },
  { p: [2.5, 0, -0.6], s: [1.6, 2.3, 1.6], c: '#3a4254' },
  { p: [-2.3, 0, 0.8], s: [1.8, 2.9, 1.8], c: '#2b3140' },
  { p: [0.7, 0, 2.5], s: [1.5, 1.9, 1.5], c: '#313848' },
];

/* The hero's type, drawn on canvas: next/font exposes the real (hashed)
   family names through the CSS variables, so the 3D labels use the same faces
   as the DOM. */
function cssFont(varName, fallback) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* District name billboard — display-face title over a small mono kicker and
   an accent tick, matching the "Allen's World" tag in space. */
function makeLabelTexture(text, accent) {
  const display = cssFont('--font-display-face', 'sans-serif');
  const mono = cssFont('--font-jetbrains-mono', 'monospace');
  const title = text
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const titleFont = `500 84px ${display}`;
  const kickerFont = `500 26px ${mono}`;
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = titleFont;
  const w = Math.ceil(meas.measureText(title).width) + 120;
  const h = 230;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // kicker
  ctx.font = kickerFont;
  ctx.fillStyle = accent;
  ctx.fillText('D I S T R I C T   0 1', w / 2, 40);
  // title — ink, soft dark halo for legibility over the sky (no neon)
  ctx.font = titleFont;
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(title, w / 2, 118);
  // accent tick
  ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, 170, 0, 226);
  g.addColorStop(0, accent);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(w / 2 - 1.5, 170, 3, 56);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  tex.userData = { aspect: w / h };
  return tex;
}

/* "Enter  [E]" prompt — the same glass pill as the Skip button. */
function makeEnterTexture() {
  const display = cssFont('--font-display-face', 'sans-serif');
  const mono = cssFont('--font-jetbrains-mono', 'monospace');
  const w = 440;
  const h = 150;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  // pill
  roundRect(ctx, 20, 25, w - 40, h - 50, (h - 50) / 2);
  ctx.fillStyle = 'rgba(7,8,12,0.62)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(243,238,228,0.28)';
  ctx.stroke();
  // label
  ctx.font = `500 46px ${display}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('Enter', 78, h / 2 + 1);
  // key cap
  roundRect(ctx, 250, 48, 84, 54, 10);
  ctx.strokeStyle = 'rgba(243,238,228,0.35)';
  ctx.stroke();
  ctx.font = `500 30px ${mono}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.inkMuted;
  ctx.fillText('E', 292, h / 2 + 1);
  // accent dot
  ctx.beginPath();
  ctx.arc(52, h / 2, 7, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.accent;
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  tex.userData = { aspect: w / h };
  return tex;
}

export function District({ id, position = [10, 0, 0], color = PALETTE.accent, label = 'ENGINEERING DISTRICT', accent = PALETTE.accentHi, enterRadius = 5, labelRadius = 30 }) {
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
  const labelTex = useMemo(() => makeLabelTexture(label, PALETTE.accent), [label]);
  const enterTex = useMemo(() => makeEnterTexture(), []);

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
      labelRef.current.material.opacity = vis;
    }
    // ENTER prompt: rises in as the astronaut crosses into the trigger sphere.
    if (enterRef.current) {
      const show = THREE.MathUtils.clamp((n - 0.5) / 0.4, 0, 1);
      enterRef.current.material.opacity = show;
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
      <pointLight position={[0, 4, 3]} intensity={6} distance={16} color={PALETTE.accentHi} />

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
            <Outlines thickness={0.05} color={PALETTE.void} />
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
          <meshToonMaterial gradientMap={grad} color={PALETTE.slate} />
          <Outlines thickness={0.04} color={PALETTE.void} />
        </mesh>
        <mesh ref={beacon} position={[0, 5.0, 0]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1} toneMapped={false} />
        </mesh>
      </group>

      {/* District name — a 3D billboard Sprite 8 units above the cluster,
          always facing the camera, pulsing, visible within labelRadius. */}
      <sprite ref={labelRef} position={[0, 8.4, 0]} scale={[2.2 * (labelTex.userData?.aspect || 4), 2.2, 1]}>
        <spriteMaterial map={labelTex} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>

      {/* World-space "[ E ] ENTER" prompt — a glowing billboard above the
          buildings. Click it or press E to open Mission Control. */}
      <sprite
        ref={enterRef}
        position={[0, 4.6, 0]}
        scale={[1.1 * (enterTex.userData?.aspect || 3), 1.1, 1]}
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
      {/* cool sky above, warm stone below — the palette's ice + accent */}
      <hemisphereLight ref={hemi} args={['#5a6a9a', '#8a6a48', 1.05]} />
      {/* low amber sun from the horizon glow */}
      <directionalLight ref={key} position={[18, 12, 8]} intensity={2.1} color={PALETTE.accentHi} castShadow />
      {/* ice rim from the opposite side to model the cel forms */}
      <directionalLight ref={rim} position={[-12, 8, -10]} intensity={0.6} color={PALETTE.ice} />
      <ambientLight ref={amb} intensity={0.28} color="#8a8070" />
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
