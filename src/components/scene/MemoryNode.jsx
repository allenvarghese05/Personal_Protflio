'use client';
import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/lib/store';

/** Soft radial glow sprite texture, built once and shared by every node. */
let _glowTex = null;
function glowTexture() {
  if (_glowTex || typeof document === 'undefined') return _glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c);
  _glowTex.needsUpdate = true;
  return _glowTex;
}

/**
 * A hoverable, clickable story fragment floating in space. Shared by every
 * chapter so interaction + open animation feel identical throughout.
 *
 *   variant 'rock'   — Origins: faceted amber asteroid
 *   variant 'module' — Engineering: cyan tech core wrapped in an orbiting ring
 *
 * `signature` nodes (e.g. the IET system) get a brighter halo + a second ring
 * so the eye lands on them first.
 */
export default function MemoryNode({ memory, variant = 'rock' }) {
  const groupRef = useRef();
  const coreRef = useRef();
  const matRef = useRef();
  const ringRef = useRef();
  const ring2Ref = useRef();
  const haloRef = useRef();
  const [hovered, setHovered] = useState(false);

  const setSelectedMemory = useStore((s) => s.setSelectedMemory);
  const selected = useStore((s) => s.selectedMemory);
  const isOpen = selected === memory.id;
  const scaleRef = useRef(1);
  const { camera, size } = useThree();

  const isModule = variant === 'module';
  const sig = !!memory.signature;
  const accent = useMemo(
    () => (isModule ? (sig ? '#7fd4ff' : '#6fb0ee') : '#ff8a3d'),
    [isModule, sig]
  );
  const baseColor = isModule ? (sig ? '#bfe6ff' : '#9cc6ef') : '#caa46a';
  const seed = useMemo(() => Math.random() * 6, []);
  const glow = useMemo(glowTexture, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (coreRef.current) {
      coreRef.current.rotation.y += isModule ? 0.006 : 0.004;
      coreRef.current.rotation.x += 0.0015;
      const target = hovered ? 1.32 : 1;
      scaleRef.current += (target - scaleRef.current) * 0.15;
      coreRef.current.scale.setScalar(scaleRef.current);
    }
    if (matRef.current) {
      const base = (sig ? 0.7 : 0.4) + Math.sin(t * 1.6 + seed) * 0.14;
      const target = hovered || isOpen ? 1.7 : base;
      matRef.current.emissiveIntensity +=
        (target - matRef.current.emissiveIntensity) * 0.12;
    }
    // Gentle bob so the field feels alive
    if (groupRef.current) {
      groupRef.current.position.y =
        memory.pos[1] + Math.sin(t * 0.7 + seed) * 0.12;
    }
    // Counter-rotating rings on the tech modules
    if (ringRef.current) ringRef.current.rotation.z = t * 0.5 + seed;
    if (ring2Ref.current) ring2Ref.current.rotation.x = -t * 0.35 + seed;
    if (haloRef.current) {
      const h = 0.5 + Math.sin(t * 1.4 + seed) * 0.16;
      haloRef.current.material.opacity = (hovered ? 0.9 : h) * (sig ? 1 : 0.7);
      haloRef.current.scale.setScalar(scaleRef.current * (sig ? 1.0 : 0.9));
    }
  });

  const enter = (e) => {
    e.stopPropagation();
    setHovered(true);
    if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
  };
  const leave = () => {
    setHovered(false);
    if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
  };
  const click = (e) => {
    e.stopPropagation();
    const v = new THREE.Vector3(...memory.pos).project(camera);
    const origin = {
      x: (v.x * 0.5 + 0.5) * size.width,
      y: (-v.y * 0.5 + 0.5) * size.height,
    };
    setSelectedMemory(memory.id, origin);
  };

  const r = memory.size;

  return (
    <group ref={groupRef} position={memory.pos}>
      {/* Core */}
      <mesh ref={coreRef} onPointerOver={enter} onPointerOut={leave} onClick={click}>
        {isModule ? (
          <icosahedronGeometry args={[r * 0.78, 1]} />
        ) : (
          <icosahedronGeometry args={[r, 0]} />
        )}
        <meshStandardMaterial
          ref={matRef}
          color={baseColor}
          emissive={accent}
          emissiveIntensity={0.4}
          roughness={isModule ? 0.3 : 0.6}
          metalness={isModule ? 0.6 : 0.1}
          flatShading={!isModule}
        />
      </mesh>

      {/* Soft halo billboard */}
      <sprite ref={haloRef} scale={r * 3.2}>
        <spriteMaterial
          map={glow}
          color={accent}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* Orbiting rings (tech modules only) */}
      {isModule && (
        <>
          <mesh ref={ringRef} rotation={[Math.PI / 2.4, 0, 0]}>
            <torusGeometry args={[r * 1.25, 0.025, 8, 48]} />
            <meshBasicMaterial color={accent} transparent opacity={0.75} />
          </mesh>
          {sig && (
            <mesh ref={ring2Ref} rotation={[0, Math.PI / 3, 0]}>
              <torusGeometry args={[r * 1.5, 0.02, 8, 48]} />
              <meshBasicMaterial color="#ffd27a" transparent opacity={0.6} />
            </mesh>
          )}
        </>
      )}

      {/* Hover label */}
      {hovered && !isOpen && (
        <Html
          center
          distanceFactor={16}
          style={{ pointerEvents: 'none' }}
          position={[0, r + 0.95, 0]}
        >
          <div
            className="flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 font-mono text-[11px] tracking-widest"
            style={{
              background: 'rgba(6,9,19,0.72)',
              borderColor: isModule
                ? 'rgba(111,176,238,0.5)'
                : 'rgba(245,181,68,0.4)',
              color: isModule ? '#bfe6ff' : '#ffd27a',
              textShadow: '0 0 10px rgba(120,170,240,0.6)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {sig && <span style={{ color: '#ffd27a' }}>★</span>}
            {memory.label.toUpperCase()}
          </div>
        </Html>
      )}
    </group>
  );
}
