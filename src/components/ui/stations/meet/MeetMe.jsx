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
    if (!el || !scroller) return;
    if (reduced) {
      progress.current = 1;
      if (hint.current) hint.current.style.opacity = '0';
      if (title.current) title.current.style.opacity = '1';
      return;
    }
    const update = () => {
      // section top within the scroller, independent of positioned ancestors
      const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const span = el.offsetHeight - scroller.clientHeight;
      const p = span > 0 ? (scroller.scrollTop - top) / span : 0;
      progress.current = Math.min(1, Math.max(0, p));
      stage.current?.style.setProperty('--meet-p', progress.current.toFixed(3));
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
        {/* the room behind — out-of-focus console light, warming with the power-on */}
        <div aria-hidden className="meet-room" />
        <div aria-hidden className="meet-halo" />
        <Canvas
          className="meet-canvas !absolute inset-0"
          dpr={[1, 2]}
          frameloop={visible ? 'always' : 'never'}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, -0.24, 6.4], fov: 30, near: 0.1, far: 50 }}
        >
          <Suspense fallback={null}>
            <HelmetScene progress={progress} stage={stage} />
          </Suspense>
        </Canvas>

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
