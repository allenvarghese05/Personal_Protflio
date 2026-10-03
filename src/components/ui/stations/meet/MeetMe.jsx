'use client';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import HelmetScene from './HelmetScene';
import MeetHeadline from './MeetHeadline';

/**
 * Meet Me — the opening of the About room. One stage stays pinned for the
 * whole section while the page scrolls past it:
 *
 *   1. the reveal runway — the visor swings up, the camera dollies in, the
 *      moon rises (scene clock: `progress`)
 *   2. one stage-height more — the helmet glides to the left third while the
 *      headline rises into place on the right (scene clock: `layoutProgress`)
 *   3. the hold — the finished frame stays pinned for a full extra screen of
 *      scroll, so nobody can scroll past without seeing it
 *
 * Everything is scroll-driven (scrubbed): the picture follows the scroll,
 * forwards and back. Wheel scrolling is smoothed (a small inertial follow —
 * the Lenis idea), and the scene paces the picture so a fling can't skip it;
 * stop near either end and it finishes the last few percent itself.
 *
 * Scroll is read from the Mission Control stage (the room's own scroll
 * container), written to refs — no React renders per scroll.
 */
const REVEAL_VH = 210; // scroll length of the reveal runway
const HOLD_VH = 100; // the finished frame holds this long before the page moves on
const STAGE_H = 'calc(100dvh - 3.5rem)'; // the stage: the viewport under the nav
/** Smooth wheel scrolling: how much of the remaining distance each frame covers. */
const SMOOTH = 0.11;

export default function MeetMe() {
  const section = useRef(null);
  const runway = useRef(null);
  const progress = useRef(0);
  const layoutProgress = useRef(0);
  const hint = useRef(null);
  const label = useRef(null);
  const stage = useRef(null);
  // the stage's place in the Mission Control root (for the dot grid)
  const frame = useRef({ left: 0, top: 0, w: 1, h: 1, rootW: 1, rootH: 1 });
  // the headline block — the scene drifts it with the camera (parallax)
  const headline = useRef(null);
  // (reserved for a story section after the hold; nothing sets it yet)
  const storyIn = useRef(0);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);
  // only render the helmet while its stage is on screen
  const [visible, setVisible] = useState(true);
  // shaders compiled: start drawing
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = section.current;
    const scroller = el?.closest('[data-mc-scroll]');
    const root = el?.closest('.mc-root');
    if (!el || !scroller) return;
    const measure = () => {
      const s = stage.current?.getBoundingClientRect();
      const r = root?.getBoundingClientRect() ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      if (s) Object.assign(frame.current, { left: s.left - r.left, top: s.top - r.top, w: s.width, h: s.height, rootW: r.width, rootH: r.height });
    };
    const sectionTop = () => el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;

    let isShown = false;
    const update = () => {
      const s = scroller.scrollTop - sectionTop();
      const run = runway.current?.offsetHeight || 1;
      const h = stage.current?.offsetHeight || 1;
      progress.current = reduced ? 1 : Math.min(1, Math.max(0, s / run));
      const p2 = Math.min(1, Math.max(0, (s - run) / h));
      layoutProgress.current = reduced ? 1 : p2;
      measure();
      if (hint.current) hint.current.style.opacity = reduced ? '0' : String(Math.max(0, 1 - progress.current * 6));
      if (label.current) label.current.style.opacity = String(Math.max(0, 1 - p2 * 3));
      // the headline resolves as the helmet settles (with hysteresis)
      const next = reduced || (isShown ? p2 > 0.3 : p2 > 0.6);
      if (next !== isShown) setShown((isShown = next));
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    // ── smooth wheel scrolling ──────────────────────────────────────────
    // Each wheel tick moves a target; the page glides toward it. Keyboard,
    // scrollbar and touch scroll natively (and re-sync the target).
    let target = scroller.scrollTop;
    let cur = target;
    let raf = 0;
    const max = () => scroller.scrollHeight - scroller.clientHeight;
    const tick = () => {
      cur += (target - cur) * SMOOTH;
      if (Math.abs(target - cur) < 0.5) cur = target;
      scroller.scrollTop = cur;
      raf = cur !== target ? requestAnimationFrame(tick) : 0;
    };
    const onWheel = (e) => {
      if (reduced || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // pinch-zoom, sideways
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * scroller.clientHeight : e.deltaY;
      if (!raf) cur = target = scroller.scrollTop;
      target = Math.min(max(), Math.max(0, target + d));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const resync = () => {
      if (!raf) cur = target = scroller.scrollTop;
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    scroller.addEventListener('scroll', resync, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', update);
      scroller.removeEventListener('scroll', resync);
      scroller.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', update);
    };
  }, [reduced]);

  return (
    <section ref={section} className="relative" aria-label="Meet Allen">
      {/* the pinned stage — stays put for the whole section */}
      <div ref={stage} className="meet-stage sticky top-0 w-full overflow-hidden" style={{ height: STAGE_H }}>
        <Canvas
          className="meet-canvas !absolute inset-0 transition-opacity duration-300"
          style={{ opacity: ready ? 1 : 0 }}
          dpr={[1, 1.5]}
          shadows
          frameloop={visible && ready ? 'always' : 'never'}
          gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
          camera={{ position: [0, -0.24, 6.4], fov: 30, near: 0.1, far: 50 }}
        >
          <Suspense fallback={null}>
            <HelmetScene progress={progress} layoutProgress={layoutProgress} frame={frame} headline={headline} storyIn={storyIn} still={!!reduced} onReady={onReady} />
          </Suspense>
        </Canvas>

        <div ref={label} className="pointer-events-none absolute inset-x-0 top-8 text-center">
          <div className="mc-label">Meet me</div>
        </div>

        <div ref={hint} className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-3">
          <span className="font-mono text-micro uppercase tracking-[0.22em] text-ink-muted">Scroll to open the visor</span>
          <span className="meet-cue" aria-hidden />
        </div>
      </div>

      {/* the scrolling column, laid over the pinned stage */}
      <div className="pointer-events-none relative z-10" style={{ marginTop: `calc(-1 * (${STAGE_H}))` }}>
        {/* 1 · the reveal runway, then 2 · one stage-height for the glide */}
        <div ref={runway} aria-hidden style={{ height: `${REVEAL_VH}vh` }} />
        <div aria-hidden style={{ height: STAGE_H }} />

        {/* the headline: centred on the resting helmet's height (wide), or
            under it (narrow); it rises into place, then 3 · holds (sticky) */}
        <div style={{ height: `calc(${STAGE_H} + ${HOLD_VH}vh)` }}>
          <div
            className="pointer-events-auto sticky top-0 flex items-end bg-[linear-gradient(to_top,var(--void)_38%,transparent_75%)] px-6 pb-[9vh] sm:px-12 wide:bg-none wide:ml-auto wide:w-1/2 wide:items-center wide:pb-[6vh] wide:pl-0 wide:pr-[7vw]"
            style={{ height: STAGE_H }}
          >
            <div ref={headline} className="will-change-transform">
              <MeetHeadline shown={shown || !!reduced} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
