'use client';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { PALETTE } from '@/lib/palette';

/**
 * The viewer's backdrop: the open photograph again, filling the room, as a
 * dim ordered (Bayer 8×8) dither in the site's two inks — texture and mood
 * behind the print, never competing with it. Where the cursor is, the
 * dither warms up and takes on a little of the photo's real colour, with a
 * faint ripple; it settles back when the cursor rests elsewhere.
 *
 * Adapted from Originkit's "Dither Reveal" (originkit.dev): the dither
 * maths, re-inked to Signal Amber's void/ink, cover-fitted, driven by the
 * pointer anywhere in the viewer, and drawn only while something changes.
 * Still under reduced motion.
 */
const VERT = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;
const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;        // css px
uniform float uDpr;
uniform float uImgAspect;
uniform vec2 uMouse;      // 0..1, y up
uniform float uActive;    // 0..1, eased
uniform float uRadius;    // css px
uniform float uTime;
uniform float uWave;
uniform vec3 uDark;
uniform vec3 uLight;
varying vec2 vUv;

float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(a * 0.5) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(a * 0.5) * 0.25 + bayer2(a); }

void main() {
  // cover-fit the photo to the room
  float ca = uRes.x / uRes.y;
  vec2 s = ca > uImgAspect ? vec2(1.0, uImgAspect / ca) : vec2(ca / uImgAspect, 1.0);
  vec2 uv = (vUv - 0.5) * s + 0.5;

  float dPx = distance(vUv * uRes, uMouse * uRes);
  float near = (1.0 - smoothstep(uRadius * 0.2, uRadius, dPx)) * uActive;
  uv += sin(dPx * 0.03 - uTime * 2.4) * 0.0035 * near * uWave;
  vec3 col = texture2D(uTex, uv).rgb;

  // three-level ordered dither, in cells of 3 css px
  float g = dot(col, vec3(0.299, 0.587, 0.114));
  float thr = bayer8(gl_FragCoord.xy / (3.0 * uDpr));
  float adj = g + (thr - 0.5) * 0.5;
  float tone = adj < 0.33 ? 0.0 : (adj < 0.66 ? 0.5 : 1.0);

  // dim everywhere; brighter and a little of the real colour near the cursor
  float level = mix(0.32, 0.7, near);
  vec3 ink = mix(uLight, col * 1.4, 0.35 * near);
  gl_FragColor = vec4(mix(uDark, ink, tone * level), 1.0);
}
`;

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export default function DitherBackdrop({ src, radius = 320, className = '' }) {
  const host = useRef(null);
  const canvas = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const cv = canvas.current;
    const el = host.current;
    if (!cv || !el) return;
    const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    const sh = (type, code) => {
      const x = gl.createShader(type);
      gl.shaderSource(x, code);
      gl.compileShader(x);
      return x;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const u = { res: U('uRes'), dpr: U('uDpr'), img: U('uImgAspect'), mouse: U('uMouse'), active: U('uActive'), radius: U('uRadius'), time: U('uTime'), wave: U('uWave'), dark: U('uDark'), light: U('uLight') };
    gl.uniform3fv(u.dark, hex(PALETTE.void));
    gl.uniform3fv(u.light, hex(PALETTE.ink));

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([7, 8, 12, 255]));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let live = true;
    let raf = 0;
    let aspect = 1.5;
    const pt = { x: 0.5, y: 0.5, a: 0, target: 0, still: 0 };
    const t0 = performance.now();
    const draw = () => {
      raf = 0;
      if (!live) return;
      pt.a += (pt.target - pt.a) * (reduced ? 1 : 0.08);
      if (Math.abs(pt.target - pt.a) < 0.002) pt.a = pt.target;
      gl.uniform2f(u.res, el.clientWidth || 1, el.clientHeight || 1);
      gl.uniform1f(u.dpr, Math.min(window.devicePixelRatio || 1, 2));
      gl.uniform1f(u.img, aspect);
      gl.uniform2f(u.mouse, pt.x, pt.y);
      gl.uniform1f(u.active, pt.a);
      gl.uniform1f(u.radius, radius);
      gl.uniform1f(u.time, (performance.now() - t0) / 1000);
      gl.uniform1f(u.wave, reduced ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      el.style.setProperty('opacity', '1'); // fade in on the first frame
      // the pool fades if the cursor rests; draw only while something changes
      if (pt.target > 0 && performance.now() - pt.still > 1800) pt.target = 0;
      if (pt.a > 0 || pt.target > 0) raf = requestAnimationFrame(draw);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const img = new Image();
    img.onload = () => {
      if (!live) return;
      aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      kick();
    };
    img.src = src;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.floor(el.clientWidth * dpr));
      cv.height = Math.max(1, Math.floor(el.clientHeight * dpr));
      gl.viewport(0, 0, cv.width, cv.height);
      kick();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // the pointer anywhere in the viewer (the backdrop itself takes no events)
    const move = (e) => {
      const r = el.getBoundingClientRect();
      pt.x = (e.clientX - r.left) / r.width;
      pt.y = 1 - (e.clientY - r.top) / r.height;
      pt.target = 1;
      pt.still = performance.now();
      kick();
    };
    const leave = () => {
      pt.target = 0;
      kick();
    };
    window.addEventListener('pointermove', move);
    document.documentElement.addEventListener('pointerleave', leave);

    return () => {
      live = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      img.onload = null;
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
      gl.deleteTexture(tex);
      // (no loseContext here: in dev, React re-runs effects on the same canvas,
      // and a lost context would come straight back dead)
    };
  }, [src, radius, reduced]);

  return (
    <div ref={host} aria-hidden className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${className}`} style={{ opacity: 0 }}>
      <canvas ref={canvas} className="block h-full w-full" />
    </div>
  );
}
