'use client';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import HelmetScene from './HelmetScene';
import MeetHeadline from './MeetHeadline';
import MeetStory from './MeetStory';

/**
 * Meet Me — the opening of the About room. One stage stays pinned for the
 * whole section while a column of content scrolls past it:
 *
 *   1. the reveal runway — the visor slides up, the camera dollies in, the
 *      moon rises (scene clock: `progress`)
 *   2. one stage-height more — the helmet glides to the left third while the
 *      headline rises into place on the right (scene clock: `layoutProgress`)
 *   3. a short hold — helmet and headline both pinned, so the resting frame
 *      always resolves, even after a fast flick
 *   4. the story chapters (MEET.story) scroll past on the right; the helmet
 *      stays pinned left until the last one has gone by
 *
 * One scroll gesture from rest plays 1–2 through at their own pace and
 * lands on the headline (and one from there plays it back); anywhere else
 * the page scrolls freely, and the scene still paces the picture so a fling
 * can't skip it.
 *
 * Scroll is read from the Mission Control stage (the room's own scroll
 * container), written to refs — no React renders per scroll.
 */
const REVEAL_VH = 210; // scroll length of the reveal runway
const HOLD_VH = 45; // the resting frame holds this long before the story scrolls on
/** One-gesture playback: forward (reveal + glide), back, and the beat after
 *  landing during which input is swallowed (trackpad momentum). ms. */
const PLAY = { forward: 3400, back: 2400, cooldown: 800 };
const STAGE_H = 'calc(100dvh - 3.5rem)'; // the stage: the viewport under the nav

export default function MeetMe() {
  const section = useRef(null);
  const runway = useRef(null);
  const progress = useRef(0);
  const layoutProgress = useRef(0);
  const hint = useRef(null);
  const label = useRef(null);
  const stage = useRef(null);
  // the stage's place in the Mission Control root (for the dot grid) and the
  // leading-line elements — both read by the scene's frame loop
  const frame = useRef({ left: 0, top: 0, w: 1, h: 1, rootW: 1, rootH: 1 });
  const lines = useRef({ group: null, els: [] });
  // the headline block — the scene drifts it with the camera (parallax)
  const headline = useRef(null);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);
  // only render the helmet while its stage is on screen
  const [visible, setVisible] = useState(true);
  // shaders compiled: start drawing, and fade the canvas in
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
      lines.current.group?.setAttribute('viewBox', `0 0 ${frame.current.w} ${frame.current.h}`);
    };
    measure();
    if (reduced) {
      progress.current = 1;
      layoutProgress.current = 1;
      if (hint.current) hint.current.style.opacity = '0';
      if (label.current) label.current.style.opacity = '0';
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    let isShown = false;
    const update = () => {
      // scroll into the section, independent of positioned ancestors
      const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const s = scroller.scrollTop - top;
      const run = runway.current?.offsetHeight || 1;
      const h = stage.current?.offsetHeight || 1;
      const p1 = Math.min(1, Math.max(0, s / run));
      const p2 = Math.min(1, Math.max(0, (s - run) / h));
      progress.current = p1;
      layoutProgress.current = p2;
      measure();
      if (hint.current) hint.current.style.opacity = String(Math.max(0, 1 - p1 * 6));
      if (label.current) label.current.style.opacity = String(Math.max(0, 1 - p2 * 3));
      // the headline resolves as the helmet settles (with hysteresis)
      const next = isShown ? p2 > 0.3 : p2 > 0.6;
      if (next !== isShown) setShown((isShown = next));
    };
    update();

    // ── one gesture plays the whole reveal ──────────────────────────────
    // From rest, a single scroll (wheel notch, swipe, or key) carries the
    // page through the reveal and the glide at the sequence's own pace and
    // lands it on the resting layout; input is absorbed while it plays (and
    // for a beat after, to swallow trackpad momentum). The same in reverse
    // from the resting layout. Anywhere else, the page scrolls normally.
    const sectionTop = () => el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const landing = () => (runway.current?.offsetHeight || 0) + (stage.current?.offsetHeight || 0);
    let play = null;
    let quietUntil = 0;
    const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const step = (now) => {
      if (!play) return;
      const k = Math.min(1, (now - play.t0) / play.ms);
      scroller.scrollTop = play.from + (play.to - play.from) * ease(k);
      if (k < 1) requestAnimationFrame(step);
      else {
        play = null;
        quietUntil = now + PLAY.cooldown;
      }
    };
    const start = (dir) => {
      const top = sectionTop();
      play = { from: scroller.scrollTop, to: dir > 0 ? top + landing() : top, t0: performance.now(), ms: dir > 0 ? PLAY.forward : PLAY.back };
      requestAnimationFrame(step);
    };
    // where the page is relative to the two ends of the sequence
    const where = () => {
      const s = scroller.scrollTop - sectionTop();
      if (Math.abs(s) < 6) return 'rest';
      if (Math.abs(s - landing()) < 30) return 'landed';
      return 'between';
    };
    const busy = () => play || performance.now() < quietUntil;
    const trigger = (dir) => {
      const at = where();
      if (dir > 0 && at === 'rest') return start(1), true;
      if (dir < 0 && at === 'landed') return start(-1), true;
      return false;
    };
    const onWheel = (e) => {
      if (busy()) return e.preventDefault();
      if (Math.abs(e.deltaY) > 2 && trigger(Math.sign(e.deltaY))) e.preventDefault();
    };
    let touchY = null;
    const onTouchStart = (e) => (touchY = e.touches[0]?.clientY ?? null);
    const onTouchMove = (e) => {
      if (busy()) return e.preventDefault();
      if (touchY === null) return;
      const dy = touchY - (e.touches[0]?.clientY ?? touchY);
      if (Math.abs(dy) > 12 && trigger(Math.sign(dy))) {
        touchY = null;
        e.preventDefault();
      }
    };
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, button, a, [contenteditable]')) return;
      const dir = { ArrowDown: 1, PageDown: 1, ' ': e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 }[e.key];
      if (!dir) return;
      if (busy()) return e.preventDefault();
      if (trigger(dir)) e.preventDefault();
    };
    scroller.addEventListener('scroll', update, { passive: true });
    scroller.addEventListener('wheel', onWheel, { passive: false });
    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', update);
    return () => {
      play = null;
      scroller.removeEventListener('scroll', update);
      scroller.removeEventListener('wheel', onWheel);
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', update);
    };
  }, [reduced]);

  return (
    <section ref={section} className="relative" aria-label="Meet Allen">
      {/* the pinned stage — stays put for the whole section */}
      <div ref={stage} className="meet-stage sticky top-0 w-full overflow-hidden" style={{ height: STAGE_H }}>
        <Canvas
          className="meet-canvas !absolute inset-0 transition-opacity delay-100 duration-700"
          style={{ opacity: ready ? 1 : 0 }}
          dpr={[1, 2]}
          shadows
          frameloop={visible && ready ? 'always' : 'never'}
          gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
          camera={{ position: [0, -0.24, 6.4], fov: 30, near: 0.1, far: 50 }}
        >
          <Suspense fallback={null}>
            <HelmetScene progress={progress} layoutProgress={layoutProgress} frame={frame} lines={lines} headline={headline} still={!!reduced} onReady={onReady} />
          </Suspense>
        </Canvas>

        {/* leading lines — drawn on by the scene, on the reveal clock */}
        <svg
          ref={(el) => (lines.current.group = el)}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ opacity: 0 }}
        >
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              ref={(el) => (lines.current.els[i] = el)}
              pathLength="1"
              stroke="var(--accent)"
              strokeWidth="0.75"
              strokeDasharray="1"
              strokeDashoffset="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

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
            under it (narrow); it rises into place, then holds (sticky)
            through the hold */}
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

        {/* 4 · the story continues on the right while the helmet stays pinned */}
        <MeetStory />
      </div>
    </section>
  );
}
