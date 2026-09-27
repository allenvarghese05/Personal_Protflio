'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import HelmetScene from './HelmetScene';
import { identity } from '@/data/timeline';

/**
 * Meet Me — the opening of the About room. The helmet is pinned while the
 * visitor scrolls through a tall runway; scroll progress drives the visor
 * lift (the scene adds the weight + settle), and the interior light powers
 * up as it clears the face. The rest of the room continues below.
 *
 * Scroll is read from the Mission Control stage (the room's own scroll
 * container), written to a ref — no React renders per scroll.
 */
const RUNWAY_VH = 260; // how long the helmet stays pinned

export default function MeetMe() {
  const section = useRef(null);
  const progress = useRef(0);
  const hint = useRef(null);
  const title = useRef(null);
  const stage = useRef(null);
  // the stage's place in the Mission Control root (for the dot grid) and the
  // leading-line elements — both read by the scene's frame loop
  const frame = useRef({ left: 0, top: 0, w: 1, h: 1, rootW: 1, rootH: 1 });
  const lines = useRef({ group: null, els: [] });
  const reduced = useReducedMotion();
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
      window.addEventListener('resize', measure);
      if (hint.current) hint.current.style.opacity = '0';
      if (title.current) title.current.style.opacity = '1';
      return () => window.removeEventListener('resize', measure);
    }
    const update = () => {
      // section top within the scroller, independent of positioned ancestors
      const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const span = el.offsetHeight - scroller.clientHeight;
      const p = span > 0 ? (scroller.scrollTop - top) / span : 0;
      progress.current = Math.min(1, Math.max(0, p));
      measure();
      if (hint.current) hint.current.style.opacity = String(Math.max(0, 1 - progress.current * 6));
      if (title.current) {
        const k = Math.min(1, Math.max(0, (progress.current - 0.72) / 0.18));
        title.current.style.opacity = String(k);
        title.current.style.transform = `translateY(${(1 - k) * 14}px)`;
      }
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
    <section ref={section} className="relative" style={{ height: `${RUNWAY_VH}vh` }} aria-label="Meet Allen">
      <div ref={stage} className="meet-stage sticky top-0 h-[calc(100dvh-3.5rem)] w-full overflow-hidden">
        <Canvas
          className="meet-canvas !absolute inset-0"
          dpr={[1, 2]}
          shadows
          frameloop={visible ? 'always' : 'never'}
          gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
          camera={{ position: [0, -0.24, 6.4], fov: 30, near: 0.1, far: 50 }}
        >
          <Suspense fallback={null}>
            <HelmetScene progress={progress} frame={frame} lines={lines} />
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

        <div className="pointer-events-none absolute inset-x-0 top-8 text-center">
          <div className="mc-label">Meet me</div>
        </div>

        <div ref={hint} className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-3">
          <span className="font-mono text-micro uppercase tracking-[0.22em] text-ink-muted">Scroll to open the visor</span>
          <span className="meet-cue" aria-hidden />
        </div>

        <div ref={title} className="pointer-events-none absolute inset-x-0 bottom-10 text-center" style={{ opacity: 0 }}>
          <div className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">{identity.name}</div>
          <div className="mt-2 px-6 font-mono text-micro uppercase tracking-[0.16em] text-ink-subtle sm:tracking-[0.22em]">Software engineer · Drexel University ’27</div>
        </div>
      </div>
    </section>
  );
}
