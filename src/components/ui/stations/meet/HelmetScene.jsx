'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { Lightformer, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { usePalette, useThemeValue } from '@/lib/useTheme';

/**
 * Meet Me: the helmet, on a suit, lit like a studio product shot. Built in
 * code (no model to license) so the visor is a real part on a real hinge:
 *
 *   · Shell + liner: full spheres whose face window and neck are cut in the
 *     fragment shader, a smooth anti-aliased ellipse.
 *   · Visor: a slightly larger sphere segment cut the same way, gold over a
 *     clear lacquer, pivoting on the side hinges.
 *   · Face: the finished portrait, recessed behind the opening, clipped to it
 *     exactly (each pixel traces its view ray back to the shell) and shaded
 *     where the rim and brow would block the light. Its colours are untouched.
 *   · Suit: shoulders and upper chest, with the India and US flags on the arms.
 *
 * One motion: the visor. `progress` (0 → 1, a ref the page writes from
 * scroll, on every screen) lifts it, the face takes the light as the gold
 * clears it, and the visor seats with one small jolt. Nothing plays by
 * itself; with reduced motion (`still`) the visor is simply open.
 *
 * While the visor is down, a quick pass of the mouse clears the gold where
 * it went and the face shows through for a moment (the peek, see PEEK): a
 * glimpse of what the scroll will open.
 *
 * The helmet and the face look straight down the lens: the portrait is
 * frontal, and only a frontal head lines up with it exactly. The shoulders
 * keep a slight turn toward the name (`pose`). The camera never moves. A
 * shift lens (camera.setViewOffset) seats the helmet in its slot on the
 * page, so the figure is seen the same way wherever the slot is.
 *
 * Frames are drawn on demand, only while something is moving.
 *
 * Light mode: the canvas is transparent, so the figure already stands on the
 * page's white; the studio it reflects gets a pale floor instead of a dark
 * one (the gold picks up a bright room), and the painted details take the
 * light theme's amber. The portrait itself is never touched.
 */

const R = 1; // helmet radius
const MAX_LIFT = 1.45; // radians the visor swings up and back on its hinges
const STANDBY = 0.1; // the face behind the closed gold: a silhouette
const WINDOW = { rx: 0.6, ry: 0.5, cy: 0.02 }; // face opening on the unit sphere
const FOV = 30;
/** The key light: a softbox up and to the left. It casts the shadow, and the
 *  rim and brow shade the face from it. */
const KEY = new THREE.Vector3(-3, 3.5, 4).normalize();
const f = (n) => n.toFixed(4);
const { clamp, lerp, smoothstep } = THREE.MathUtils;

/** < 0 inside the face window, for a unit direction n. */
const WIN_GLSL = /* glsl */ `
  float winField(vec3 n, float grow) {
    vec2 q = vec2(n.x / (${f(WINDOW.rx)} + grow), (n.y - ${f(WINDOW.cy)}) / (${f(WINDOW.ry)} + grow));
    return n.z > 0.2 ? dot(q, q) - 1.0 : 1.0;
  }
`;

/**
 * Cut the window (and optionally the neck) out of a sphere material, with
 * an anti-aliased edge. keep = 'outside' for the shell/liner, 'inside' for
 * the visor and the glass.
 */
function cutWindow(mat, { keep, grow = 0, neck = false }) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vObj;\n${WIN_GLSL}`)
      .replace(
        '#include <alphatest_fragment>',
        /* glsl */ `{
          vec3 n = normalize(vObj);
          float w = winField(n, ${f(grow)});
          float cov = clamp(w / max(fwidth(w), 1e-4) + 0.5, 0.0, 1.0);
          ${keep === 'inside' ? 'cov = 1.0 - cov;' : ''}
          ${neck ? 'cov *= step(-0.72, n.y);' : ''}
          if (cov < 0.02) discard;
          diffuseColor.a *= cov;
        }
        #include <alphatest_fragment>`
      );
  };
  mat.customProgramCacheKey = () => `win-${keep}-${grow}-${neck}`;
  return mat;
}

/* ── the face ─────────────────────────────────────────────────────────── */

/** Aperture centre on the shell, helmet space. */
const APERTURE = new THREE.Vector3(0, WINDOW.cy, Math.sqrt(1 - WINDOW.cy * WINDOW.cy)).multiplyScalar(R);
/** How far behind the aperture (along the view ray) the portrait sits. */
const PLATE_DEPTH = 0.8;
/** Plate geometry size: it only has to cover the aperture; the portrait is
 *  scaled inside it. */
const PLATE = 1.8;
/** How the portrait sits in the opening: the point of the portrait (u, v in
 *  UV, v up) at the opening's centre, and how much of it (a half-height, in
 *  UV) the opening shows. Measured from public/meet/allen-face.webp (curls to
 *  v 0.90, hairline 0.585, eyes 0.50, mouth 0.33, chin 0.21, ears 0.514
 *  apart): 0.45 ± 0.29 shows the whole face set back in the helmet, from a
 *  little neck under the chin to the curls at the rim, ears inside it.
 *  Re-measure if the image changes. */
const FRAME = { u: 0.5, v: 0.45, half: 0.29 };

/* ── the peek ─────────────────────────────────────────────────────────── */

/**
 * The visor peek. While the visor is down, a quick pass of the mouse clears
 * the gold where it went and the face shows through, lit, for a moment. A
 * slow or still mouse does nothing; nothing happens on its own.
 *
 * The pointer's path is drawn into a small canvas over the stage (a sixth of
 * its pixels) as a soft stroke, as wide as the pass was fast, and the whole
 * canvas fades on its own clock. The visor and the face both read it at
 * their own pixel through one hard threshold, so a hole has a crisp edge,
 * and as the stroke fades the edge closes in on itself and is gone.
 */
const PEEK = {
  scale: 1 / 6, // trail pixels per CSS pixel
  tau: 1, // fade time constant (s): a full stroke clears in tau·ln2 ≈ 0.7 s
  vMin: 420, // pointer speed (CSS px/s) below which nothing is drawn
  vFull: 2600, // and at which the stroke is widest
  rMin: 12, // stroke radius at vMin (CSS px)
  rMax: 46, // and at its widest
  light: 0.92, // how lit the face is through a hole (1 = fully open)
};
/** Shared by the visor and the face, so a hole is cut in one and lit in the
 *  other at exactly the same pixels. */
const peekUniforms = {
  uTrail: { value: null },
  uRes: { value: new THREE.Vector2(1, 1) },
  uPeek: { value: 0 },
};
const PEEK_GLSL = /* glsl */ `
  uniform sampler2D uTrail;
  uniform vec2 uRes;    // drawing buffer, px
  uniform float uPeek;  // 0 → 1: whether a peek can show (visor down, a mouse)
  float peekHole() {
    if (uPeek <= 0.0) return 0.0;
    float a = texture2D(uTrail, gl_FragCoord.xy / uRes).a;
    float w = max(fwidth(a), 1e-3);
    return uPeek * smoothstep(0.5 - w, 0.5 + w, a);
  }
`;
/** The opening's visible rim (just inside the gasket), helmet space. Its
 *  on-screen outline is what the portrait is centred and fitted to. */
const RIM = Array.from({ length: 24 }, (_, i) => {
  const t = (i / 24) * Math.PI * 2;
  const x = (WINDOW.rx - 0.035) * Math.cos(t);
  const y = WINDOW.cy + (WINDOW.ry - 0.035) * Math.sin(t);
  return new THREE.Vector3(x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))).multiplyScalar(R);
});

const faceVert = /* glsl */ `
  uniform mat4 uToHelmet;
  varying vec2 vUv;
  varying vec3 vH;
  void main() {
    vUv = uv;
    vH = (uToHelmet * modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const faceFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uLight;
  uniform float uUvScale;  // plate size / portrait size
  uniform vec2 uHead;      // head centre in the portrait's UV
  uniform vec3 uCam;       // camera, helmet space
  uniform vec3 uKey;       // direction to the key light, helmet space
  varying vec2 vUv;
  varying vec3 vH;
  ${WIN_GLSL}
  ${PEEK_GLSL}
  void main() {
    // trace the view ray back to the shell: keep the pixel only if the
    // ray entered through the opening (exact from every camera angle)
    vec3 d = vH - uCam;
    float len = length(d);
    d /= len;
    float b = dot(uCam, d);
    float h = b * b - (dot(uCam, uCam) - ${f(R * R)});
    if (h < 0.0) discard;
    float t = -b - sqrt(h);
    if (t > len) discard;
    vec3 nE = normalize(uCam + d * t); // where the view ray crossed the shell
    float wE = winField(nE, 0.0);
    if (wE > 0.0) discard;

    // the portrait, as it is, head centred on the plate
    vec2 uv = (vUv - 0.5) * uUvScale + uHead;
    vec3 col = (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? vec3(0.0) : texture2D(uMap, uv).rgb;

    // rim shadow: follow the key light's direction out of the helmet; if
    // that ray leaves through the shell instead of the opening, the rim is
    // in the way. A wide falloff keeps it a soft gradient.
    float bb = dot(vH, uKey);
    float hh = bb * bb - (dot(vH, vH) - ${f(R * R)});
    float tt = -bb + sqrt(max(hh, 0.0));
    float w = winField(normalize(vH + uKey * tt), 0.0);
    float lit = 1.0 - smoothstep(-0.5, 0.35, w);

    // occlusion: the helmet hides light from the edges of the opening, most
    // under the brow, so the face sits back inside it, not on the glass.
    // Shading only: the portrait's own colours are left as they are.
    float rr = sqrt(clamp(wE + 1.0, 0.0, 1.0));              // 0 centre → 1 rim
    float occl = smoothstep(0.6, 1.0, rr);
    float brow = smoothstep(0.0, 1.0, (nE.y - ${f(WINDOW.cy)}) / ${f(WINDOW.ry)});
    float ao = mix(1.0, 0.3, occl * occl) * mix(1.0, 0.78, brow * brow);

    // where the peek has cleared the gold, the light gets in
    float light = max(uLight, ${f(PEEK.light)} * peekHole());

    gl_FragColor = vec4(col * light * mix(0.5, 1.0, lit) * ao, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * The portrait plate. Each drawn frame it sits on the camera's ray through
 * the opening's on-screen centre, squares up to the camera (the portrait is
 * frontal, and so is the head), and scales the head to fit the opening.
 */
function Face({ lightRef }) {
  const mesh = useRef();
  const mat = useRef();
  const tex = useTexture('/meet/allen-face.webp', (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });
  const uniforms = useMemo(
    () => ({
      uMap: { value: tex },
      uLight: { value: STANDBY },
      uUvScale: { value: 1 },
      uHead: { value: new THREE.Vector2(FRAME.u, FRAME.v) },
      uCam: { value: new THREE.Vector3() },
      uKey: { value: KEY.clone() },
      uToHelmet: { value: new THREE.Matrix4() },
      // the peek's, copied in each frame (see below)
      uTrail: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPeek: { value: 0 },
    }),
    [tex]
  );
  const tmp = useMemo(() => ({ w: new THREE.Vector3(), ray: new THREE.Vector3(), p: new THREE.Vector3() }), []);

  useFrame(({ camera }) => {
    const plate = mesh.current;
    const helmet = plate?.parent;
    const u = mat.current?.uniforms;
    if (!helmet || !u) return;
    helmet.updateWorldMatrix(true, false);

    // the opening as the camera sees it: project its rim and take the
    // outline's centre and extents on screen (exact from any angle)
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const pt of RIM) {
      const v = helmet.localToWorld(tmp.p.copy(pt)).project(camera);
      x0 = Math.min(x0, v.x);
      x1 = Math.max(x1, v.x);
      y0 = Math.min(y0, v.y);
      y1 = Math.max(y1, v.y);
    }
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const D = helmet.localToWorld(tmp.w.copy(APERTURE)).distanceTo(camera.position) + PLATE_DEPTH;

    // sit on the ray through the outline's centre, behind the glass, facing
    // the lens
    const ray = tmp.ray.set(cx, cy, 0.5).unproject(camera).sub(camera.position).normalize();
    plate.position.copy(helmet.worldToLocal(tmp.p.copy(camera.position).addScaledVector(ray, D)));
    plate.lookAt(camera.position);

    // fit the portrait to the outline's height at the plate's distance: the
    // opening shows FRAME.half of it above and below FRAME.v
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const ay = ((y1 - y0) / 2) * D * tanH;
    u.uUvScale.value = PLATE / (ay / FRAME.half);

    u.uToHelmet.value.copy(helmet.matrixWorld).invert();
    u.uCam.value.copy(camera.position).applyMatrix4(u.uToHelmet.value);
    u.uKey.value.copy(KEY).transformDirection(u.uToHelmet.value);
    u.uLight.value = lightRef.current;
    // the peek: copied by value, so the face lights exactly where the visor
    // clears (a material's uniforms can't be relied on to stay shared objects)
    u.uTrail.value = peekUniforms.uTrail.value;
    u.uRes.value.copy(peekUniforms.uRes.value);
    u.uPeek.value = peekUniforms.uPeek.value;
  });

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[PLATE, PLATE]} />
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={faceVert} fragmentShader={faceFrag} toneMapped={false} />
    </mesh>
  );
}

/* ── materials ────────────────────────────────────────────────────────── */

const shellMat = cutWindow(
  new THREE.MeshPhysicalMaterial({ color: '#ebe6dc', roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.08, alphaToCoverage: true }),
  { keep: 'outside', neck: true }
);
const linerMat = cutWindow(
  new THREE.MeshStandardMaterial({ color: '#141519', roughness: 0.9, side: THREE.BackSide, alphaToCoverage: true }),
  { keep: 'outside', neck: true }
);
const visorMat = cutWindow(
  new THREE.MeshPhysicalMaterial({
    color: '#e3ab55',
    metalness: 1,
    roughness: 0.14,
    transparent: true,
    opacity: 0.74, // gold, but not fully opaque: a silhouette reads through it
    envMapIntensity: 1.9,
    // a thin clear lacquer over the gold
    clearcoat: 0.35,
    clearcoatRoughness: 0.06,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  { keep: 'inside', grow: 0.07 }
);
// the peek clears the gold where it has been: the visor goes clear there
{
  const cut = visorMat.onBeforeCompile;
  visorMat.onBeforeCompile = (sh) => {
    cut(sh);
    Object.assign(sh.uniforms, peekUniforms);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${PEEK_GLSL}`)
      .replace('#include <alphatest_fragment>', 'diffuseColor.a *= 1.0 - peekHole();\n#include <alphatest_fragment>');
  };
  visorMat.customProgramCacheKey = () => 'visor-peek';
}

/**
 * The pressure bubble: clear glass across the opening, just inside the
 * shell. It has no colour of its own; it only shows what it reflects, held
 * to a soft sheen so a highlight never reads as a sparkle on the face.
 */
const glassMat = cutWindow(
  new THREE.MeshPhysicalMaterial({ color: '#000000', roughness: 0.42, metalness: 0, specularIntensity: 0.14, transparent: true, depthWrite: false, envMapIntensity: 0.9 }),
  { keep: 'inside' }
);
{
  const cut = glassMat.onBeforeCompile;
  glassMat.onBeforeCompile = (sh) => {
    cut(sh);
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <opaque_fragment>',
      /* glsl */ `{
        float refl = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
        outgoingLight *= min(1.0, 0.1 / max(refl, 1e-4));
        gl_FragColor = vec4(outgoingLight, clamp(min(refl, 0.1) * 1.8, 0.0, 0.6) * diffuseColor.a);
      }`
    );
  };
  glassMat.customProgramCacheKey = () => 'glass-bubble';
}

const rubberMat = new THREE.MeshStandardMaterial({ color: '#1b1c21', roughness: 0.7 });
const metalMat = new THREE.MeshStandardMaterial({ color: '#bdb8ae', roughness: 0.28, metalness: 0.85 });
const darkMetalMat = new THREE.MeshStandardMaterial({ color: '#6f6b65', roughness: 0.35, metalness: 0.8 });
const accentPaintMat = new THREE.MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.6 });
/** The helmet's two lamps: lit, and steady. */
const lampMat = new THREE.MeshStandardMaterial({ color: '#fff4e2', emissive: '#fff0dc', emissiveIntensity: 1.5, toneMapped: false });

/** Suit fabric: soft occlusion where the neck ring meets it, and the chest
 *  falling away. The directional shadow is real (cast by the helmet). */
const suitMat = new THREE.MeshStandardMaterial({ color: '#a29c91', roughness: 0.9 });
suitMat.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
    .replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
      float rr = length(vec2(vObj.x, vObj.z * 1.3));
      diffuseColor.rgb *= mix(0.45, 1.0, smoothstep(0.66, 1.3, rr));
      diffuseColor.rgb *= mix(0.5, 1.0, smoothstep(-2.3, -1.1, vObj.y));`
    );
};

/* ── the suit ─────────────────────────────────────────────────────────── */

/**
 * Flag patches for the upper arms, drawn as woven patches: true colours,
 * knocked back (a fabric-dark wash and a weave) so they read as cloth, not
 * stickers.
 */
function useFlagTexture(kind) {
  return useMemo(() => {
    const W = 256;
    const H = 160;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    if (kind === 'india') {
      [['#ff9933', 0], ['#f4f1ea', 1], ['#138808', 2]].forEach(([col, i]) => {
        g.fillStyle = col;
        g.fillRect(0, (H / 3) * i, W, H / 3 + 1);
      });
      // the Ashoka Chakra: a navy wheel of 24 spokes
      g.strokeStyle = '#1b2a78';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(W / 2, H / 2, H / 7, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 1.4;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        g.beginPath();
        g.moveTo(W / 2, H / 2);
        g.lineTo(W / 2 + Math.cos(a) * (H / 7), H / 2 + Math.sin(a) * (H / 7));
        g.stroke();
      }
    } else {
      for (let i = 0; i < 13; i++) {
        g.fillStyle = i % 2 ? '#f4f1ea' : '#b22234';
        g.fillRect(0, (H / 13) * i, W, H / 13 + 1);
      }
      const cw = W * 0.4;
      const ch = (H / 13) * 7;
      g.fillStyle = '#3c3b6e';
      g.fillRect(0, 0, cw, ch);
      g.fillStyle = '#f4f1ea';
      for (let r = 0; r < 9; r++) {
        const n = r % 2 ? 5 : 6;
        for (let k = 0; k < n; k++) {
          g.beginPath();
          g.arc(((k + (r % 2 ? 1 : 0.5)) * cw) / 6, ((r + 0.7) * ch) / 9.6, 2.1, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    // knock it back: a fabric-dark wash, a fine weave, an embroidered edge
    g.fillStyle = 'rgba(28, 28, 34, 0.3)';
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.08;
    g.fillStyle = '#000';
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    g.globalAlpha = 1;
    g.strokeStyle = '#26272d';
    g.lineWidth = 10;
    g.strokeRect(0, 0, W, H);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [kind]);
}

function Suit() {
  const india = useFlagTexture('india');
  const usa = useFlagTexture('usa');
  const geo = useMemo(() => {
    // chest → rounded shoulder → shoulder slope → collar, revolved; then
    // flattened front-to-back away from the (round) collar. The profile runs
    // bottom to top: that's the order that winds the lathe's faces outward.
    const profile = new THREE.SplineCurve(
      [
        [1.76, -2.9],
        [1.8, -1.8],
        [1.74, -1.38],
        [1.56, -1.13],
        [1.28, -1.0],
        [0.95, -0.9],
        [0.72, -0.8],
        [0.62, -0.66],
      ].map(([x, y]) => new THREE.Vector2(x, y))
    );
    const g = new THREE.LatheGeometry(profile.getPoints(72), 112);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getZ(i));
      p.setZ(i, p.getZ(i) * (1 - 0.4 * THREE.MathUtils.smoothstep(r, 0.75, 1.5)));
    }
    g.computeVertexNormals();
    return g;
  }, []);

  // flags on the upper arms (a real EVA suit's placement): India on my
  // right, the US on my left, each sat on the actual surface, facing out
  const flags = useMemo(() => {
    const p = geo.attributes.position;
    const n = geo.attributes.normal;
    return [
      [-1.24, india],
      [1.24, usa],
    ].map(([x0, map]) => {
      const y0 = -1.46;
      let best = -1;
      let bd = Infinity;
      for (let i = 0; i < p.count; i++) {
        if (p.getZ(i) <= 0) continue;
        const dd = Math.abs(p.getX(i) - x0) + Math.abs(p.getY(i) - y0);
        if (dd < bd) {
          bd = dd;
          best = i;
        }
      }
      const nrm = new THREE.Vector3(n.getX(best), n.getY(best), n.getZ(best)).normalize();
      const pos = new THREE.Vector3(p.getX(best), p.getY(best), p.getZ(best)).addScaledVector(nrm, 0.012);
      const m = new THREE.Matrix4().lookAt(pos.clone().add(nrm), pos, new THREE.Vector3(0, 1, 0));
      return { pos, q: new THREE.Quaternion().setFromRotationMatrix(m), map };
    });
  }, [geo, india, usa]);

  return (
    <group>
      <mesh geometry={geo} material={suitMat} receiveShadow />
      {/* the suit's neck bearing, under the helmet's ring */}
      <mesh position-y={-0.8} rotation-x={Math.PI / 2} material={darkMetalMat} receiveShadow>
        <torusGeometry args={[0.72, 0.07, 20, 96]} />
      </mesh>
      {/* seal indicator: a painted line, not a light */}
      <mesh position-y={-0.765} rotation-x={Math.PI / 2} material={accentPaintMat}>
        <torusGeometry args={[0.735, 0.009, 8, 128]} />
      </mesh>
      {flags.map((fl, i) => (
        <mesh key={i} position={fl.pos} quaternion={fl.q} receiveShadow>
          <planeGeometry args={[0.25, 0.156]} />
          <meshStandardMaterial map={fl.map} roughness={0.88} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ))}
    </group>
  );
}

/* ── the helmet ───────────────────────────────────────────────────────── */

function Helmet({ visorRef, lightRef }) {
  const sphere = useMemo(() => new THREE.SphereGeometry(R, 128, 96), []);
  // the liner and the glass never show their silhouette: half the detail
  const sphereLo = useMemo(() => new THREE.SphereGeometry(R, 64, 48), []);
  const gasket = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 128; i++) {
      const t = (i / 128) * Math.PI * 2;
      const x = WINDOW.rx * Math.cos(t);
      const y = WINDOW.cy + WINDOW.ry * Math.sin(t);
      pts.push(new THREE.Vector3(x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))).multiplyScalar(R * 1.004));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 256, 0.032, 12, true);
  }, []);

  return (
    <group>
      <mesh geometry={sphere} material={shellMat} castShadow />
      <mesh geometry={sphereLo} material={linerMat} scale={0.97} />
      <mesh geometry={gasket} material={rubberMat} />
      {/* neck ring */}
      <mesh position-y={-0.73} rotation-x={Math.PI / 2} material={metalMat} castShadow>
        <torusGeometry args={[0.69, 0.06, 20, 96]} />
      </mesh>
      {/* side hinges the visor pivots on, each with a painted amber cap */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.985, 0.04, 0]} rotation-z={Math.PI / 2}>
          <mesh material={metalMat}>
            <cylinderGeometry args={[0.13, 0.13, 0.06, 32]} />
          </mesh>
          {/* local +y points to world -x here, so -sd puts the cap outboard */}
          <mesh position-y={-sd * 0.035} material={accentPaintMat}>
            <cylinderGeometry args={[0.05, 0.05, 0.02, 24]} />
          </mesh>
        </group>
      ))}
      {/* helmet lamps */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.66, 0.6, 0.47]} rotation={[-0.3, sd * 0.55, 0]}>
          <mesh material={rubberMat} castShadow>
            <boxGeometry args={[0.17, 0.075, 0.07]} />
          </mesh>
          <mesh position-z={0.037} material={lampMat}>
            <planeGeometry args={[0.135, 0.045]} />
          </mesh>
        </group>
      ))}

      <Face lightRef={lightRef} />
      {/* the pressure bubble across the opening */}
      <mesh geometry={sphereLo} material={glassMat} scale={0.996} renderOrder={1} />

      {/* the visor, on its hinge (x-axis through the centre) */}
      <group ref={visorRef}>
        <mesh geometry={sphere} material={visorMat} scale={1.018} renderOrder={2} />
      </group>
    </group>
  );
}

/* ── framing ──────────────────────────────────────────────────────────── */

/**
 * The shift lens. The helmet sits at the origin and the camera looks
 * straight at it; setViewOffset then slides the picture so the helmet lands
 * on its slot (a box on the page, in canvas pixels) at the slot's size. It
 * only does work when the canvas or the slot changes size.
 */
function Framing({ slotRef }) {
  const sig = useRef('');
  useFrame(({ camera, size }) => {
    const s = slotRef.current;
    if (!s || !s.w || !s.h) return;
    const key = `${size.width}|${size.height}|${s.x}|${s.y}|${s.w}|${s.h}`;
    if (key === sig.current) return;
    sig.current = key;
    // distance at which the helmet's silhouette spans the slot's short side
    const k = (Math.min(s.w, s.h) / size.height) * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    camera.position.set(0, 0, R / Math.sin(Math.atan(k)));
    camera.rotation.set(0, 0, 0);
    camera.updateMatrixWorld();
    camera.setViewOffset(size.width, size.height, size.width / 2 - (s.x + s.w / 2), size.height / 2 - (s.y + s.h / 2), size.width, size.height);
  }, -2);
  return null;
}

/* ── the one motion ───────────────────────────────────────────────────── */

/** Scroll → visor: an ease in and out, so the visor gathers pace off its
 *  seal and slows into its stop like a real hinge. It reads the page's own
 *  (smoothed) scroll position directly: one clock for the page and the
 *  helmet, nothing chasing anything. */
const lift = (x) => x * x * (3 - 2 * x);
/** The visor seats: it runs a hair past its stop and the head gives a small
 *  nod back, one hump, then still. */
const SETTLE = { dur: 0.7, visor: 0.035, nod: 0.016 };
const hump = (k) => Math.sin(Math.PI * k) * (1 - k);

/**
 * Everything the scroll moves, in one place. Writes the visor, the face's
 * light and the pose each drawn frame, and asks for another frame only while
 * the seat is still settling.
 */
function Driver({ progress, still, pose, visorRef, headRef, bodyRef, lightRef, peekRef }) {
  const invalidate = useThree((st) => st.invalidate);
  const s = useRef({ settle: -1, armed: true, first: true, sig: '' });

  useFrame(({ gl }, delta) => {
    const st = s.current;
    const dt = Math.min(delta, 1 / 30);
    let moving = false;

    // the visor: r = 0 closed → 1 open
    const r = still ? 1 : lift(clamp(progress.current, 0, 1));

    // the seat: once per opening (re-armed when the visor comes back down)
    if (st.first) st.armed = r < 0.985;
    if (r < 0.9) st.armed = true;
    if (!still && st.armed && r >= 0.985) {
      st.armed = false;
      st.settle = 0;
    }
    let h = 0;
    if (st.settle >= 0 && st.settle < SETTLE.dur) {
      st.settle = Math.min(SETTLE.dur, st.settle + dt);
      h = hump(st.settle / SETTLE.dur);
      moving = true;
    }

    if (visorRef.current) visorRef.current.rotation.x = -(r * MAX_LIFT + SETTLE.visor * h);
    // once it's up over the crown it reads as tinted glass, not a gold cap
    visorMat.opacity = lerp(0.74, 0.38, smoothstep(r, 0.55, 1));
    // the face takes the light as the gold clears it
    lightRef.current = lerp(STANDBY, 1, smoothstep(r, 0.2, 0.75));
    // the peek is for the closed visor only: it's gone as soon as it lifts
    const peek = still ? 0 : 1 - smoothstep(r, 0.02, 0.12);
    peekRef.current = peek;
    peekUniforms.uPeek.value = peek;
    // the trail maps onto the drawing buffer, whatever its pixel density
    gl.getDrawingBufferSize(peekUniforms.uRes.value);

    // the pose: the head square to the lens, the shoulders a little round
    // toward the name; the seat's nod on top
    const by = pose.body;
    const hy = pose.head;
    const hp = pose.pitch - SETTLE.nod * h;
    bodyRef.current?.rotation.set(0, by, 0, 'YXZ');
    headRef.current?.rotation.set(hp, hy - by, 0, 'YXZ');

    // the shadow map redraws only when something that casts it has moved
    gl.shadowMap.autoUpdate = false;
    const sig = `${f(by)}|${f(hy)}|${f(hp)}`;
    if (sig !== st.sig) {
      st.sig = sig;
      gl.shadowMap.needsUpdate = true;
    }

    st.first = false;
    if (moving) invalidate();
  }, -1);
  return null;
}

/** A trail canvas, its brush (a round soft dab, drawn once and stamped
 *  along the path) and the texture the shaders read it through. */
function makeTrail() {
  const canvas = document.createElement('canvas');
  const brush = document.createElement('canvas');
  brush.width = brush.height = 64;
  const b = brush.getContext('2d');
  const g = b.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  b.fillStyle = g;
  b.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return { canvas, ctx: canvas.getContext('2d'), brush, tex, on: false, inked: 0, last: null, v: 0 };
}

/**
 * One step of the pointer (canvas CSS px, event time ms): updates the pass's
 * speed and, if it's fast and crosses the helmet (`sl`, the slot), stamps
 * the brush along the step. Returns whether it drew. Time steps are clamped
 * rather than skipped: a pause leaves the next step slow (nothing drawn), a
 * stalled frame mid-pass still draws its whole step.
 */
function trace(t, x, y, time, sl) {
  const last = t.last;
  t.last = { x, y, time };
  if (!last) return false;
  const dt = clamp((time - last.time) / 1000, 1 / 240, 0.05);
  // the pass's speed, lightly smoothed (pointer events arrive unevenly)
  t.v = t.v * 0.35 + (Math.hypot(x - last.x, y - last.y) / dt) * 0.65;
  if (t.v < PEEK.vMin) return false;
  // only where it crosses the helmet
  const cx = sl.x + sl.w / 2;
  const cy = sl.y + sl.h / 2;
  const ex = x - last.x;
  const ey = y - last.y;
  const k = clamp(((cx - last.x) * ex + (cy - last.y) * ey) / (ex * ex + ey * ey || 1), 0, 1);
  if (Math.hypot(last.x + ex * k - cx, last.y + ey * k - cy) > Math.min(sl.w, sl.h) * 0.43) return false;
  // stamp the brush along the step, as wide as the pass is fast
  const r = lerp(PEEK.rMin, PEEK.rMax, Math.sqrt(smoothstep(t.v, PEEK.vMin, PEEK.vFull))) * PEEK.scale;
  const ax = last.x * PEEK.scale;
  const ay = last.y * PEEK.scale;
  const bx = x * PEEK.scale;
  const by = y * PEEK.scale;
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / Math.max(0.6, r * 0.3)));
  t.ctx.globalCompositeOperation = 'source-over';
  for (let i = 1; i <= n; i++) t.ctx.drawImage(t.brush, ax + ((bx - ax) * i) / n - r, ay + ((by - ay) * i) / n - r, r * 2, r * 2);
  return true;
}

/** The peek's trail: the pointer's path, drawn into a canvas over the stage
 *  and faded on its own clock, while the visor is down. */
function Peek({ still, liveRef, slotRef, peekRef }) {
  const gl = useThree((st) => st.gl);
  const size = useThree((st) => st.size);
  const invalidate = useThree((st) => st.invalidate);
  const trailRef = useRef(null);

  // the trail lives as long as the scene
  useEffect(() => {
    const t = makeTrail();
    trailRef.current = t;
    return () => {
      trailRef.current = null;
      if (peekUniforms.uTrail.value === t.tex) peekUniforms.uTrail.value = null;
      t.tex.dispose();
    };
  }, []);

  // and covers the canvas, at a sixth of its pixels
  useEffect(() => {
    const t = trailRef.current;
    if (!t) return;
    t.canvas.width = Math.max(2, Math.ceil(size.width * PEEK.scale));
    t.canvas.height = Math.max(2, Math.ceil(size.height * PEEK.scale));
    t.tex.dispose(); // a new size needs a new texture on the GPU
    t.tex.needsUpdate = true;
    t.on = false;
    peekUniforms.uTrail.value = t.tex;
  }, [gl, size]);

  useEffect(() => {
    if (still) return undefined;
    const onMove = (e) => {
      const t = trailRef.current;
      if (!t || (e.pointerType && e.pointerType !== 'mouse')) return;
      if (!liveRef.current || peekRef.current <= 0 || !slotRef.current) {
        t.last = null;
        return;
      }
      const rect = gl.domElement.getBoundingClientRect();
      // every position the pointer passed through since the last event (a
      // busy frame batches them), so a fast pass draws one unbroken stroke
      const steps = e.getCoalescedEvents?.() ?? [];
      let inked = false;
      for (const ev of steps.length ? steps : [e]) inked = trace(t, ev.clientX - rect.left, ev.clientY - rect.top, ev.timeStamp, slotRef.current) || inked;
      if (!inked) return;
      t.tex.needsUpdate = true;
      t.inked = performance.now();
      t.on = true;
      invalidate();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [still, gl, liveRef, slotRef, peekRef, invalidate]);

  // fade the whole trail each drawn frame; when nothing is left, stop
  useFrame((_, delta) => {
    const t = trailRef.current;
    if (!t?.on) return;
    const { canvas, ctx, tex } = t;
    if (performance.now() - t.inked > PEEK.tau * Math.LN2 * 1000 + 60 || peekRef.current <= 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      tex.needsUpdate = true;
      t.on = false;
      return;
    }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${1 - Math.exp(-Math.min(delta, 1 / 20) / PEEK.tau)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    tex.needsUpdate = true;
    invalidate();
  });
  return null;
}

/* ── light ────────────────────────────────────────────────────────────── */

/**
 * The reflection map: the warm studio the helmet is lit in, rendered into a
 * cube map once. It's what makes the gold glow.
 */
function ReflectionRoom({ version, children }) {
  const get = useThree((st) => st.get);
  const invalidate = useThree((st) => st.invalidate);
  const [room] = useState(() => new THREE.Scene());
  const dirty = useRef(true);
  const fbo = useMemo(() => {
    const t = new THREE.WebGLCubeRenderTarget(256);
    t.texture.type = THREE.HalfFloatType;
    return t;
  }, []);
  const cube = useMemo(() => new THREE.CubeCamera(0.1, 100, fbo), [fbo]);
  useEffect(() => {
    const { scene } = get();
    const prev = scene.environment;
    scene.environment = fbo.texture;
    return () => {
      scene.environment = prev;
      fbo.dispose();
    };
  }, [get, fbo]);
  // a new room (the theme changed): render the cube map again, once
  useEffect(() => {
    dirty.current = true;
    invalidate();
  }, [version, invalidate]);
  useFrame(({ gl }) => {
    if (!dirty.current) return;
    dirty.current = false;
    const ac = gl.autoClear;
    gl.autoClear = true;
    cube.update(gl, room);
    gl.autoClear = ac;
  });
  return createPortal(children, room);
}

/**
 * Hitch-free entrance: compile every material (off the main thread where the
 * driver allows) before the page shows the canvas.
 */
function Warmup({ onReady }) {
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  const camera = useThree((st) => st.camera);
  useEffect(() => {
    let live = true;
    const done = () => {
      if (live) onReady?.();
      live = false;
    };
    const job = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera));
    job.then(done, done);
    const guard = setTimeout(done, 1500); // never leave the stage blank
    return () => {
      live = false;
      clearTimeout(guard);
    };
  }, [gl, scene, camera, onReady]);
  return null;
}

// fetch the portrait as soon as this module loads: the room's code is
// prefetched (on a ?room=observatory link, and a few seconds after the world
// mounts), so the face is usually in hand before the room opens
if (typeof window !== 'undefined') useTexture.preload('/meet/allen-face.webp');

const STRAIGHT = { body: 0, head: 0, pitch: 0 };

export default function HelmetScene({ progress, slot, live, still = false, pose = STRAIGHT, onReady }) {
  const light = useRef(STANDBY);
  const peek = useRef(0);
  const visor = useRef();
  const body = useRef();
  const head = useRef();
  const keyPos = useMemo(() => KEY.clone().multiplyScalar(9).toArray(), []);
  const theme = useThemeValue();
  const palette = usePalette();
  const invalidate = useThree((st) => st.invalidate);
  // the painted amber (hinge caps, seal line) follows the theme's accent
  useEffect(() => {
    accentPaintMat.color.set(palette.accent);
    invalidate();
  }, [palette, invalidate]);

  return (
    <>
      <Framing slotRef={slot} />
      <Driver progress={progress} still={still} pose={pose} visorRef={visor} headRef={head} bodyRef={body} lightRef={light} peekRef={peek} />
      <Peek still={still} liveRef={live} slotRef={slot} peekRef={peek} />

      {/* reflections: a warm sheen overhead for the gold, a softbox up left,
          ice panels left and right, an amber console strip, a dark floor
          (a pale one in light mode) */}
      <ReflectionRoom version={theme}>
        <Lightformer form="rect" intensity={0.7} color="#ffd9a8" position={[0, 5, 5]} scale={[16, 5, 1]} />
        {/* directly overhead: keeps the lifted visor gold over the crown */}
        <Lightformer form="rect" intensity={0.9} color="#ffc98a" position={[0, 6, -1]} scale={[8, 6, 1]} />
        <Lightformer form="circle" intensity={2.2} color="#ffe2b8" position={[-3, 3, 2]} scale={2.4} />
        <Lightformer form="rect" intensity={1.1} color="#9cc3ff" position={[4, 0.5, -1]} scale={[3, 5, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#9cc3ff" position={[-5, 0.4, 3]} scale={[1.2, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ff9a3c" position={[4.5, -1.2, 3.5]} scale={[4, 0.35, 1]} />
        <Lightformer form="rect" intensity={0.5} color={theme === 'light' ? '#dfe3ee' : '#2a3150'} position={[0, -3, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
      </ReflectionRoom>

      <ambientLight intensity={0.16} />
      {/* the key, up and to the left: it casts the shadow */}
      <directionalLight
        position={keyPos}
        intensity={1.9}
        color="#fff0de"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      {/* a cool kicker from the right that draws the far edge */}
      <directionalLight position={[5, 2.5, 1.5]} intensity={0.9} color="#dce6ff" />

      <group ref={body}>
        <Suit />
        <group ref={head}>
          <Helmet visorRef={visor} lightRef={light} />
        </group>
      </group>
      <Warmup onReady={onReady} />
    </>
  );
}
