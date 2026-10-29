'use client';

/**
 * NextProject — the "liquid carve" call to action that closes a case study.
 *
 * A large ink pill, 'Next case study · {label} →'. Hover it and an amber blob
 * carves into the fill under the cursor: it scales in where the pointer
 * entered, eases after it with a damped follow, stretches along its velocity
 * (squashing across it, so it keeps its area), and drains out at the edge the
 * pointer leaves by. A smaller droplet trails the blob; a goo filter
 * (feGaussianBlur → an alpha-threshold feColorMatrix) melts the two into one
 * liquid shape, and the pill's own rounded clip does the carving.
 *
 * The animation writes SVG attributes straight to the DOM from one rAF loop
 * that sleeps whenever the blob has settled — no React state per frame.
 * Keyboard focus brings the blob in at the centre. Reduced motion: no blob,
 * just a colour swap to amber on hover / focus.
 *
 * Props
 *   label    the next project's name
 *   onClick  go to it
 */
import { useEffect, useId, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { PALETTE as P } from '@/lib/palette';

/* ── the follow (rates are "share of the gap closed per 60fps frame") ──── */
const FOLLOW = 0.17; // blob → pointer
const TRAIL_FOLLOW = 0.1; // droplet → blob; the lag is what the goo stretches
const GROW = 0.14; // scale in on enter, out on leave
const SQUASH_GAIN = 0.035; // stretch per px/frame of speed
const SQUASH_MAX = 0.5; // never longer than 1.5× its width
const SQUASH_EASE = 0.22;
const TURN_MIN_SPEED = 0.25; // px/frame below which the stretch keeps its heading
const MAX_DT_S = 1 / 20; // a dropped tab frame never jumps the blob
const REST_PX = 0.05; // the loop sleeps once everything is this close
const REST_SCALE = 0.002;

/* ── the shapes (relative to the button's height) ─────────────────────── */
const BLOB_R = 0.85;
const TRAIL_R = 0.55; // × the blob radius

/* ── the goo ──────────────────────────────────────────────────────────── */
const GOO_BLUR = 7; // px
const GOO_MATRIX = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10'; // alpha × 22 − 10

const PILL =
  'group relative isolate inline-flex min-h-14 max-w-full items-center justify-center overflow-hidden rounded-full bg-ink px-7 py-3 text-center text-[15px] font-medium tracking-[-0.01em] text-void sm:min-h-16 sm:px-9 sm:text-lg';
const SWAP = 'transition-colors duration-300 hover:bg-accent focus-visible:bg-accent';

/* ── small helpers ─────────────────────────────────────────────────────── */
const fix = (v) => Math.round(v * 100) / 100;
/** A per-frame rate made frame-rate independent for `frames` 60fps frames. */
const rate = (k, frames) => 1 - Math.pow(1 - k, frames);
/** :focus-visible, without throwing on engines that predate the selector. */
function focusVisible(el) {
  try {
    return el.matches(':focus-visible');
  } catch {
    return false;
  }
}

export default function NextProject({ label, onClick }) {
  const reduce = Boolean(useReducedMotion());
  const gooId = `np-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const btnRef = useRef(null);
  const blobRef = useRef(null);
  const trailRef = useRef(null);

  useEffect(() => {
    if (reduce) return undefined;
    const btn = btnRef.current;
    const blob = blobRef.current;
    const trail = trailRef.current;
    if (!btn || !blob || !trail) return undefined;

    // simulation state lives in this closure; nothing here is React state
    const s = { x: 0, y: 0, tx: 0, ty: 0, dx: 0, dy: 0, scale: 0, goal: 0, squash: 0, angle: 0 };
    let raf = 0;
    let last = 0;
    let hovering = false;

    const draw = () => {
      const k = 1 + s.squash;
      const deg = (s.angle * 180) / Math.PI;
      blob.setAttribute(
        'transform',
        `translate(${fix(s.x)} ${fix(s.y)}) rotate(${fix(deg)}) scale(${fix(s.scale * k)} ${fix(s.scale / k)})`,
      );
      trail.setAttribute('transform', `translate(${fix(s.dx)} ${fix(s.dy)}) scale(${fix(s.scale)})`);
    };

    const settled = () =>
      Math.abs(s.tx - s.x) < REST_PX &&
      Math.abs(s.ty - s.y) < REST_PX &&
      Math.abs(s.x - s.dx) < REST_PX &&
      Math.abs(s.y - s.dy) < REST_PX &&
      Math.abs(s.goal - s.scale) < REST_SCALE &&
      s.squash < REST_SCALE;

    const frame = (now) => {
      const dt = last ? Math.min(MAX_DT_S, (now - last) / 1000) : 1 / 60;
      last = now;
      const frames = Math.max(dt * 60, 1e-3);

      const px = s.x;
      const py = s.y;
      const f = rate(FOLLOW, frames);
      s.x += (s.tx - s.x) * f;
      s.y += (s.ty - s.y) * f;
      const ft = rate(TRAIL_FOLLOW, frames);
      s.dx += (s.x - s.dx) * ft;
      s.dy += (s.y - s.dy) * ft;
      s.scale += (s.goal - s.scale) * rate(GROW, frames);

      // stretch along the velocity, squash across it
      const vx = (s.x - px) / frames;
      const vy = (s.y - py) / frames;
      const speed = Math.hypot(vx, vy);
      if (speed > TURN_MIN_SPEED) s.angle = Math.atan2(vy, vx);
      const want = Math.min(SQUASH_MAX, speed * SQUASH_GAIN);
      s.squash += (want - s.squash) * rate(SQUASH_EASE, frames);

      if (settled()) {
        if (s.goal === 0) s.scale = 0;
        s.squash = 0;
        draw();
        raf = 0;
        last = 0;
        return;
      }
      draw();
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const fit = (rect) => {
      const r = rect.height * BLOB_R;
      blob.setAttribute('r', fix(r));
      trail.setAttribute('r', fix(r * TRAIL_R));
    };

    const aim = (x, y) => {
      s.tx = x;
      s.ty = y;
    };

    const local = (e) => {
      const rect = btn.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, rect };
    };

    const onEnter = (e) => {
      const { x, y, rect } = local(e);
      hovering = true;
      fit(rect);
      // grow from where the pointer came in, unless it's still draining out
      if (s.scale < 0.02) {
        s.x = s.dx = x;
        s.y = s.dy = y;
      }
      aim(x, y);
      s.goal = 1;
      wake();
    };

    const onMove = (e) => {
      const { x, y } = local(e);
      aim(x, y);
      wake();
    };

    const onLeave = (e) => {
      hovering = false;
      if (focusVisible(btn)) {
        const rect = btn.getBoundingClientRect();
        aim(rect.width / 2, rect.height / 2);
      } else {
        const { x, y } = local(e);
        aim(x, y); // drain out where the pointer left
        s.goal = 0;
      }
      wake();
    };

    const onFocus = () => {
      if (hovering || !focusVisible(btn)) return;
      const rect = btn.getBoundingClientRect();
      fit(rect);
      if (s.scale < 0.02) {
        s.x = s.dx = rect.width / 2;
        s.y = s.dy = rect.height / 2;
      }
      aim(rect.width / 2, rect.height / 2);
      s.goal = 1;
      wake();
    };

    const onBlur = () => {
      if (hovering) return;
      s.goal = 0;
      wake();
    };

    btn.addEventListener('pointerenter', onEnter);
    btn.addEventListener('pointermove', onMove);
    btn.addEventListener('pointerleave', onLeave);
    btn.addEventListener('focus', onFocus);
    btn.addEventListener('blur', onBlur);
    return () => {
      btn.removeEventListener('pointerenter', onEnter);
      btn.removeEventListener('pointermove', onMove);
      btn.removeEventListener('pointerleave', onLeave);
      btn.removeEventListener('focus', onFocus);
      btn.removeEventListener('blur', onBlur);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduce]);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      aria-label={`Next case study: ${label}`}
      className={`${PILL} ${reduce ? SWAP : ''}`}
    >
      {!reduce && (
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <defs>
            {/* userSpaceOnUse + a generous region so the blur never clips */}
            <filter
              id={gooId}
              filterUnits="userSpaceOnUse"
              x="-50%"
              y="-150%"
              width="200%"
              height="400%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation={GOO_BLUR} result="blur" />
              <feColorMatrix in="blur" type="matrix" values={GOO_MATRIX} />
            </filter>
          </defs>
          <g filter={`url(#${gooId})`} fill={P.accent}>
            <circle ref={trailRef} cx="0" cy="0" />
            <circle ref={blobRef} cx="0" cy="0" />
          </g>
        </svg>
      )}

      <span className="relative z-10 text-balance">
        Next case study
        <span aria-hidden className="mx-2 opacity-50">
          ·
        </span>
        <span className="font-semibold">{label}</span>
        <span
          aria-hidden
          className={`ml-3 inline-block ${reduce ? '' : 'transition-transform duration-300 ease-out group-hover:translate-x-1'}`}
        >
          →
        </span>
      </span>
    </button>
  );
}
