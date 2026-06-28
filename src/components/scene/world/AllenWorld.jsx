'use client';
import { useMemo, useRef, useState } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { Outlines, Html, shaderMaterial } from '@react-three/drei';
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
function Ground() {
  const grad = useMemo(toonGradient, []);
  const hills = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 14 + Math.random() * 40;
      arr.push({
        pos: [Math.cos(a) * r, -1.4 - Math.random() * 1.5, Math.sin(a) * r],
        s: 4 + Math.random() * 9,
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
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 7 + Math.random() * 38;
      const spire = Math.random() < 0.22;
      const tone = ['#8a7350', '#9c7e4e', '#76603f', '#a98a55'][
        Math.floor(Math.random() * 4)
      ];
      arr.push({
        pos: [Math.cos(a) * r, 0, Math.sin(a) * r],
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

export function District({ id, position = [10, 0, 0], color = '#ff8a3d', label = 'ENGINEERING DISTRICT', accent = '#ffd27a', enterRadius = 6 }) {
  const grad = useMemo(toonGradient, []);
  const beacon = useRef();
  const glow = useRef();
  const near = useRef(0); // 0→1 proximity factor
  const windows = useRef([]);
  const [inRange, setInRange] = useState(false);
  const setEnteredZone = useStore((s) => s.setEnteredZone);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const d = Math.hypot(
      worldState.pos.x - position[0],
      worldState.pos.z - position[2]
    );
    const target = THREE.MathUtils.clamp(1 - (d - enterRadius) / 8, 0, 1);
    near.current += (target - near.current) * 0.1;
    const n = near.current;

    if (beacon.current)
      beacon.current.material.emissiveIntensity =
        0.6 + Math.abs(Math.sin(t * 2)) * 0.8 + n * 0.8;
    if (glow.current)
      glow.current.material.opacity = 0.12 + Math.sin(t * 1.5) * 0.04 + n * 0.5;
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

      {/* District name — recedes as the ENTER prompt takes over */}
      <Html center position={[0, 6.4, 0]} distanceFactor={18} style={{ pointerEvents: 'none' }}>
        <div
          className="whitespace-nowrap font-mono text-[11px] tracking-[0.4em] transition-opacity duration-500"
          style={{ color: accent, opacity: inRange ? 0.35 : 0.9, textShadow: '0 0 12px rgba(255,170,80,0.5)' }}
        >
          {label}
        </div>
      </Html>

      {/* In-world holographic ENTER prompt (no bottom bar) */}
      {inRange && (
        <Html center position={[0, 5.2, 0]} distanceFactor={14} zIndexRange={[20, 0]}>
          <button
            onClick={() => id && setEnteredZone(id)}
            className="enter-holo group flex select-none flex-col items-center gap-1"
            style={{ pointerEvents: 'auto' }}
          >
            <span
              className="rounded-md border px-5 py-2 font-mono text-sm font-semibold tracking-[0.35em] transition-transform group-hover:scale-105"
              style={{
                color: '#ffe7c2',
                borderColor: 'rgba(255,210,122,0.8)',
                background: 'rgba(20,12,6,0.35)',
                boxShadow: '0 0 18px rgba(255,180,90,0.55), inset 0 0 14px rgba(255,180,90,0.25)',
                backdropFilter: 'blur(2px)',
                textShadow: '0 0 12px rgba(255,200,120,0.9)',
              }}
            >
              [ ENTER ]
            </span>
            <span className="font-mono text-[9px] tracking-[0.3em] text-[#ffd27a]/70">
              CLICK · OR PRESS E
            </span>
          </button>
        </Html>
      )}
    </group>
  );
}

/* ----------------------------------------------------------------------------
   Warm surface lighting — hemisphere (indigo sky / warm ground) + a warm key,
   the "you've arrived somewhere with life" payoff after cold deep space.
---------------------------------------------------------------------------- */
function WorldLighting() {
  return (
    <>
      <hemisphereLight args={['#7a64b0', '#d59a55', 1.05]} />
      <directionalLight position={[14, 20, 8]} intensity={2.1} color="#ffe6c2" castShadow />
      {/* Cool rim from the opposite side to model the cel forms */}
      <directionalLight position={[-12, 8, -10]} intensity={0.5} color="#6a78c8" />
      <ambientLight intensity={0.28} color="#b89a7a" />
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
        />
      ))}
    </group>
  );
}
