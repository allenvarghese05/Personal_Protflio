'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import HelmetScene from './HelmetScene';
import MeetHeadline from './MeetHeadline';
import { MEET } from '@/data/about';

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
 *   4. story blocks (MEET.story) scroll past on the right; the helmet stays
 *      pinned left until the last one has gone by
 *
 * The scene paces the picture (a fast flick plays the sequence at its top
 * speed rather than skipping it), so these runways are sized to give that
 * top speed room to finish.
 *
 * Scroll is read from the Mission Control stage (the room's own scroll
 * container), written to refs — no React renders per scroll.
 */
const REVEAL_VH = 210; // scroll length of the reveal runway
const HOLD_VH = 45; // the resting frame holds this long before the story scrolls on
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
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);
  // only render the helmet while its stage is on screen
  const [visible, setVisible] = useState(true);

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
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      scroller.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [reduced]);

  return (
    <section ref={section} className="relative" aria-label="Meet Allen">
      {/* the pinned stage — stays put for the whole section */}
      <div ref={stage} className="meet-stage sticky top-0 w-full overflow-hidden" style={{ height: STAGE_H }}>
        <Canvas
          className="meet-canvas !absolute inset-0"
          dpr={[1, 2]}
          shadows
          frameloop={visible ? 'always' : 'never'}
          gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
          camera={{ position: [0, -0.24, 6.4], fov: 30, near: 0.1, far: 50 }}
        >
          <Suspense fallback={null}>
            <HelmetScene progress={progress} layoutProgress={layoutProgress} frame={frame} lines={lines} />
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
            <MeetHeadline shown={shown || !!reduced} />
          </div>
        </div>

        {/* 4 · the story continues on the right while the helmet stays pinned */}
        {MEET.story.map((b) => (
          <article
            key={b.id}
            className="pointer-events-auto mx-6 mb-[30vh] rounded-xl bg-void/80 p-6 backdrop-blur-sm sm:mx-12 wide:mx-0 wide:ml-auto wide:w-1/2 wide:rounded-none wide:bg-transparent wide:p-0 wide:pr-[7vw] wide:backdrop-blur-none"
          >
            <div className="max-w-[34rem]">
              {b.kicker && <div className="mc-label">{b.kicker}</div>}
              {b.title && <h3 className="font-display mt-3 text-2xl font-semibold tracking-[-0.02em] text-ink">{b.title}</h3>}
              {[].concat(b.body ?? []).map((para) => (
                <p key={para} className="mt-4 text-body leading-relaxed text-ink-muted">
                  {para}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
