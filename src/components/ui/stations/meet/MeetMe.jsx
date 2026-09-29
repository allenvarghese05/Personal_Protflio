'use client';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import HelmetScene from './HelmetScene';
import MeetHeadline from './MeetHeadline';
import MeetStory from './MeetStory';
import { MEET } from '@/data/about';

/**
 * Meet Me — the opening of the About room. One stage stays pinned for the
 * whole section while a column of content scrolls past it:
 *
 *   1. the reveal runway — the visor slides up, the camera dollies in, the
 *      moon rises (scene clock: `progress`)
 *   2. one stage-height more — the helmet glides to the left third while the
 *      headline rises into place on the right (scene clock: `layoutProgress`)
 *   3. a short hold — helmet and headline both pinned
 *   4. the story (MEET.story): the headline scrolls away as the story panel
 *      rises in and pins beside the helmet, one chapter per step
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
const PLAY = { forward: 3400, back: 2400, toStory: 1500, chapter: 950, cooldown: 800 };
const CHAPTER_VH = 70; // scroll length per story chapter
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
  const holdWrap = useRef(null);
  // how far the story has arrived (0 → 1): the globe leaves as it comes in
  const storyIn = useRef(0);
  const [chapter, setChapter] = useState(0);
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

    // the section's landmarks, in scroll px from its top
    const sectionTop = () => el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const marks = () => {
      const run = runway.current?.offsetHeight || 1;
      const h = stage.current?.offsetHeight || 1;
      const hold = Math.max(0, (holdWrap.current?.offsetHeight || h) - h);
      const band = (CHAPTER_VH / 100) * scroller.clientHeight;
      const storyStart = run + 2 * h + hold; // the story panel pins here
      return { run, h, hold, band, storyStart };
    };
    const N = MEET.story.length;

    let isShown = false;
    let chapterNow = 0;
    const update = () => {
      const s = scroller.scrollTop - sectionTop();
      const m = marks();
      progress.current = reduced ? 1 : Math.min(1, Math.max(0, s / m.run));
      const p2 = Math.min(1, Math.max(0, (s - m.run) / m.h));
      layoutProgress.current = reduced ? 1 : p2;
      // the story arriving: 0 as the headline starts to leave → 1 as the story pins
      storyIn.current = Math.min(1, Math.max(0, (s - (m.run + m.h + m.hold)) / m.h));
      measure();
      if (hint.current) hint.current.style.opacity = reduced ? '0' : String(Math.max(0, 1 - progress.current * 6));
      if (label.current) label.current.style.opacity = String(Math.max(0, 1 - p2 * 3));
      // the headline resolves as the helmet settles (with hysteresis)
      const next = reduced || (isShown ? p2 > 0.3 : p2 > 0.6);
      if (next !== isShown) setShown((isShown = next));
      // which chapter is live
      const c = N ? Math.min(N - 1, Math.max(0, Math.floor((s - m.storyStart) / m.band))) : 0;
      if (c !== chapterNow) setChapter((chapterNow = c));
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    if (reduced) {
      return () => {
        scroller.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
      };
    }

    // ── one gesture = one step ──────────────────────────────────────────
    // The section has stops: rest → the headline → each chapter. At a stop,
    // a single scroll (wheel notch, swipe, or key) carries the page to the
    // next stop (or the previous one) at the sequence's own pace; input is
    // absorbed while it plays, and for a beat after, to swallow trackpad
    // momentum. Between stops, and past the last chapter, the page scrolls
    // freely.
    const stops = () => {
      const m = marks();
      return [0, m.run + m.h, ...MEET.story.map((_, i) => m.storyStart + (i + 0.5) * m.band)];
    };
    const duration = (from, to) => (from === 0 && to === 1 ? PLAY.forward : from === 1 && to === 0 ? PLAY.back : Math.min(from, to) === 1 ? PLAY.toStory : PLAY.chapter);
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
    const busy = () => play || performance.now() < quietUntil;
    const trigger = (dir) => {
      const top = sectionTop();
      const s = scroller.scrollTop - top;
      const list = stops();
      const at = list.findIndex((v) => Math.abs(s - v) < 40);
      if (at < 0) return false;
      const to = at + dir;
      if (to < 0 || to >= list.length) return false; // past the ends: free scroll
      play = { from: scroller.scrollTop, to: top + list[to], t0: performance.now(), ms: duration(at, to) };
      requestAnimationFrame(step);
      return true;
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
    scroller.addEventListener('wheel', onWheel, { passive: false });
    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      play = null;
      scroller.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      scroller.removeEventListener('wheel', onWheel);
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
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
            <HelmetScene progress={progress} layoutProgress={layoutProgress} frame={frame} lines={lines} headline={headline} storyIn={storyIn} still={!!reduced} onReady={onReady} />
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
        <div ref={holdWrap} style={{ height: `calc(${STAGE_H} + ${HOLD_VH}vh)` }}>
          <div
            className="pointer-events-auto sticky top-0 flex items-end bg-[linear-gradient(to_top,var(--void)_38%,transparent_75%)] px-6 pb-[9vh] sm:px-12 wide:bg-none wide:ml-auto wide:w-1/2 wide:items-center wide:pb-[6vh] wide:pl-0 wide:pr-[7vw]"
            style={{ height: STAGE_H }}
          >
            <div ref={headline} className="will-change-transform">
              <MeetHeadline shown={shown || !!reduced} />
            </div>
          </div>
        </div>

        {/* 3 · the story: it rises in as the headline scrolls away, then pins
            beside the helmet — one chapter per step */}
        <div style={{ height: `calc(${MEET.story.length * CHAPTER_VH}vh + ${STAGE_H})` }}>
          <div
            className="pointer-events-none sticky top-0 flex items-end bg-[linear-gradient(to_top,var(--void)_42%,transparent_78%)] px-6 pb-[12vh] sm:px-12 wide:bg-none wide:ml-auto wide:w-1/2 wide:items-center wide:pb-[6vh] wide:pl-0 wide:pr-[7vw]"
            style={{ height: STAGE_H }}
          >
            <MeetStory active={chapter} />
          </div>
        </div>
      </div>
    </section>
  );
}
