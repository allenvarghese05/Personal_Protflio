'use client';
import { useMemo, useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { Outlines, Html, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { toonGradient } from '@/lib/toon';

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

  return (
    <group>
      {/* Flat base disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[80, 64]} />
        <meshToonMaterial gradientMap={grad} color="#d4a463" />
      </mesh>
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
   Scenery — scattered low-poly rocks and glowing crystals for texture.
---------------------------------------------------------------------------- */
function Scenery() {
  const grad = useMemo(toonGradient, []);
  const items = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 34;
      const crystal = Math.random() < 0.3;
      arr.push({
        pos: [Math.cos(a) * r, crystal ? 0.3 : 0.1, Math.sin(a) * r],
        s: 0.4 + Math.random() * (crystal ? 0.9 : 1.3),
        rot: Math.random() * Math.PI,
        crystal,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {items.map((it, i) =>
        it.crystal ? (
          <mesh key={i} position={it.pos} rotation={[0, it.rot, 0.2]} scale={it.s}>
            <octahedronGeometry args={[1, 0]} />
            <meshToonMaterial
              gradientMap={grad}
              color="#7fd4ff"
              emissive="#3a8fd4"
              emissiveIntensity={0.6}
            />
            <Outlines thickness={0.05} color="#0a0a12" />
          </mesh>
        ) : (
          <mesh key={i} position={it.pos} rotation={[it.rot, it.rot, 0]} scale={it.s}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshToonMaterial gradientMap={grad} color="#8a7350" flatShading />
            <Outlines thickness={0.04} color="#0a0a12" />
          </mesh>
        )
      )}
    </group>
  );
}

/* ----------------------------------------------------------------------------
   District landmark — a cluster of low-poly buildings + antenna the visitor
   walks up to. Glows + shows a label. (Engineering District for the slice.)
---------------------------------------------------------------------------- */
export function District({ position = [10, 0, 0], color = '#ff8a3d', label = 'ENGINEERING DISTRICT', accent = '#ffd27a' }) {
  const grad = useMemo(toonGradient, []);
  const beacon = useRef();
  const glow = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (beacon.current)
      beacon.current.material.emissiveIntensity = 0.6 + Math.abs(Math.sin(t * 2)) * 0.8;
    if (glow.current) glow.current.material.opacity = 0.18 + Math.sin(t * 1.5) * 0.06;
  });

  const buildings = [
    { p: [0, 0, 0], s: [2.2, 3.4, 2.2] },
    { p: [2.4, 0, -0.6], s: [1.6, 2.2, 1.6] },
    { p: [-2.2, 0, 0.8], s: [1.8, 2.8, 1.8] },
    { p: [0.6, 0, 2.4], s: [1.4, 1.8, 1.4] },
  ];

  return (
    <group position={position}>
      {/* Ground glow ring */}
      <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[4.2, 6.2, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {buildings.map((b, i) => (
        <group key={i} position={[b.p[0], b.s[1] / 2, b.p[2]]}>
          <mesh>
            <boxGeometry args={b.s} />
            <meshToonMaterial gradientMap={grad} color="#39506e" />
            <Outlines thickness={0.05} color="#0a0a12" />
          </mesh>
          {/* Emissive window strip */}
          <mesh position={[0, 0, b.s[2] / 2 + 0.01]}>
            <planeGeometry args={[b.s[0] * 0.7, b.s[1] * 0.5]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Antenna tower */}
      <group position={[-0.4, 0, -2.2]}>
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

      {/* Floating label */}
      <Html center position={[0, 5.8, 0]} distanceFactor={18} style={{ pointerEvents: 'none' }}>
        <div
          className="whitespace-nowrap rounded-full border px-3 py-1 font-mono text-[11px] tracking-[0.25em]"
          style={{
            background: 'rgba(6,9,19,0.7)',
            borderColor: 'rgba(245,181,68,0.45)',
            color: accent,
            textShadow: '0 0 10px rgba(255,170,80,0.6)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {label}
        </div>
      </Html>
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
      <hemisphereLight args={['#6a5aa0', '#c98a4a', 0.9]} />
      <directionalLight position={[12, 18, 6]} intensity={1.5} color="#ffe6c2" castShadow />
      <ambientLight intensity={0.25} color="#b89a7a" />
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
      <District position={[10, 0, -2]} />
    </group>
  );
}
