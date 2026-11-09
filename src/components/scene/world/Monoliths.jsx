'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { MONOLITHS, MONOLITH_NEAR_R } from '@/data/world';
import { projectById } from '@/data/projects';
import { alpha } from '@/lib/palette';
import { usePalette, useThemeValue } from '@/lib/useTheme';
import { worldState } from '@/lib/worldState';
import { useStore } from '@/lib/store';

/**
 * The Engineering district: one standing stone per project, in an arc facing
 * the causeway. Each carries its name in the site's own type, its kind accent
 * as a light line, and a glow pool that wakes as you approach. Walk up to one
 * for a preview; click it (or press E) to open its brief in Mission Control.
 */

const SLAB = { w: 1.55, h: 4.3, d: 0.42 };
const PLINTH_H = 0.28;

// next/font exposes the real (hashed) family names through CSS variables, so
// the stones use the same faces as the DOM.
function cssFont(varName, fallback) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Project kind → accent, from the palette in force (the same mapping as
 *  KIND_ACCENT in lib/palette, which is the dark palette's). */
function kindAccent(palette, kind) {
  const map = {
    signature: palette.accent,
    award: palette.accent,
    current: palette.ice,
    project: palette.sand,
    classified: palette.slate,
  };
  return map[kind] || map.project;
}

/** Deeper shades of the kind accents for the face kicker on pale limestone
 *  (the plain light accents sit under 4.5:1 on #d8d1c5; these clear ~4.8–5.6). */
const FACE_KICKER_LIGHT = {
  signature: '#8a440c',
  award: '#8a440c',
  current: '#244f96',
  project: '#634725',
  classified: '#444c61',
};

/** The inscription on a stone's face: index + kind kicker, then the name. */
function faceTexture(project, index, accent, palette) {
  const display = cssFont('--font-display-face', 'sans-serif');
  const mono = cssFont('--font-jetbrains-mono', 'monospace');
  const W = 512;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const pad = 56;
  // kicker
  ctx.font = `500 26px ${mono}`;
  ctx.fillStyle = accent;
  ctx.textBaseline = 'top';
  const kicker = `${String(index).padStart(2, '0')}  ·  ${(project.cardBadge || project.kind).toUpperCase()}`;
  ctx.fillText(kicker.split('').join(String.fromCharCode(8202)), pad, 96);
  // name
  ctx.font = `600 64px ${display}`;
  ctx.fillStyle = palette.ink;
  const lines = wrap(ctx, project.label, W - pad * 2).slice(0, 4);
  lines.forEach((l, i) => ctx.fillText(l, pad, 150 + i * 72));
  // rule + tags, low on the stone
  ctx.fillStyle = alpha(palette.ink, 0.22);
  ctx.fillRect(pad, H - 250, W - pad * 2, 2);
  ctx.font = `400 24px ${mono}`;
  ctx.fillStyle = palette.inkMuted;
  (project.tags || project.primaryStack || []).slice(0, 3).forEach((t, i) => ctx.fillText(t, pad, H - 220 + i * 38));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Soft radial pool of light for the ground in front of a stone. */
let _pool = null;
function poolTexture() {
  if (_pool) return _pool;
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  _pool = new THREE.CanvasTexture(c);
  return _pool;
}

const basalt = new THREE.MeshStandardMaterial({ color: '#23262e', roughness: 0.48, metalness: 0.12 });
const plinthMat = new THREE.MeshStandardMaterial({ color: '#5a5045', roughness: 0.95 });

// dark basalt at dusk; pale limestone with dark lettering in daylight
const STONE = {
  dark: { slab: '#23262e', plinth: '#5a5045', line: 1 },
  light: { slab: '#d8d1c5', plinth: '#a99c88', line: 0.25 },
};

function Monolith({ def }) {
  const project = projectById(def.id);
  const palette = usePalette();
  const light = useThemeValue() === 'light';
  const accent = kindAccent(palette, project.kind);
  const openProject = useStore((s) => s.openProject);
  const kicker = light ? FACE_KICKER_LIGHT[project.kind] || FACE_KICKER_LIGHT.project : accent;
  const face = useMemo(() => faceTexture(project, def.index, kicker, palette), [project, def.index, kicker, palette]);
  // a theme switch draws a new inscription; free the old one
  useEffect(() => () => face.dispose(), [face]);
  const slab = useRef();
  const line = useRef();
  const pool = useRef();
  const tag = useRef();
  const near = useRef(0);

  // register for the controller's click test (so clicking a stone opens it
  // instead of walking to the ground behind it)
  useEffect(() => {
    const m = slab.current;
    worldState.interactives.push(m);
    return () => {
      worldState.interactives = worldState.interactives.filter((x) => x !== m);
    };
  }, []);

  useFrame(() => {
    const d = Math.hypot(worldState.pos.x - def.position[0], worldState.pos.z - def.position[1]);
    const target = THREE.MathUtils.clamp(1 - (d - 1.2) / (MONOLITH_NEAR_R + 3), 0, 1);
    near.current += (target - near.current) * 0.08;
    const n = near.current * worldState.reveal;
    if (line.current) line.current.emissiveIntensity = (0.6 + n * 2.4) * STONE[light ? 'light' : 'dark'].line;
    if (pool.current) pool.current.opacity = 0.05 + n * 0.35;
    if (tag.current) {
      const show = d < MONOLITH_NEAR_R ? 1 : 0;
      tag.current.style.opacity = String(show);
      tag.current.style.transform = `translateY(${show ? 0 : 6}px)`;
    }
  });

  const open = (e) => {
    e.stopPropagation();
    if (useStore.getState().journeyPhase !== 'world') return;
    openProject(def.id);
  };

  return (
    <group position={[def.position[0], 0, def.position[1]]} rotation-y={def.rotationY}>
      {/* plinth */}
      <mesh position-y={PLINTH_H / 2} material={plinthMat} castShadow receiveShadow>
        <boxGeometry args={[SLAB.w + 0.5, PLINTH_H, SLAB.d + 0.6]} />
      </mesh>
      {/* the stone */}
      <mesh
        ref={slab}
        position-y={PLINTH_H + SLAB.h / 2}
        material={basalt}
        castShadow
        receiveShadow
        onClick={open}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <boxGeometry args={[SLAB.w, SLAB.h, SLAB.d]} />
      </mesh>
      {/* inscription — unlit so it stays legible against the dusk */}
      <mesh position={[0, PLINTH_H + SLAB.h / 2, SLAB.d / 2 + 0.004]}>
        <planeGeometry args={[SLAB.w * 0.9, SLAB.w * 0.9 * 2]} />
        <meshBasicMaterial map={face} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      {/* accent light line at the foot of the face */}
      <mesh position={[0, PLINTH_H + 0.32, SLAB.d / 2 + 0.01]}>
        <boxGeometry args={[SLAB.w * 0.78, 0.035, 0.02]} />
        <meshStandardMaterial ref={line} color={accent} emissive={accent} emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
      {/* glow pool on the ground in front (additive light disappears on pale
          stone, so daylight lays a tint instead) */}
      <mesh position={[0, 0.02, 1.1]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.4, 3.4]} />
        <meshBasicMaterial
          ref={pool}
          map={poolTexture()}
          color={accent}
          transparent
          opacity={0.05}
          depthWrite={false}
          blending={light ? THREE.NormalBlending : THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {/* preview tag — appears when you walk up */}
      <Html center position={[0, PLINTH_H + SLAB.h + 1.1, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={tag} className="stone-tag" style={{ opacity: 0 }}>
          <span className="stone-tag__kicker" style={{ color: accent }}>
            {project.cardBadge || project.kind}
          </span>
          <span className="stone-tag__name">{project.label}</span>
          <span className="stone-tag__sub">{project.subtitle}</span>
          <span className="stone-tag__cta">
            Click or press <kbd>E</kbd> to open
          </span>
        </div>
      </Html>
    </group>
  );
}

export default function Monoliths() {
  const theme = useThemeValue();
  useEffect(() => {
    basalt.color.set(STONE[theme].slab);
    plinthMat.color.set(STONE[theme].plinth);
  }, [theme]);
  return (
    <group>
      {MONOLITHS.map((m) => (
        <Monolith key={m.id} def={m} />
      ))}
    </group>
  );
}
