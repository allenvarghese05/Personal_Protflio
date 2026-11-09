'use client';
import { Component, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import * as THREE from 'three';
import HelmetScene from './HelmetScene';
import MeetHeadline from './MeetHeadline';
import { glideTo } from '@/lib/smoothScroll';

/**
 * Meet Me: the top of the About room. My name on the left half of the
 * page's grid, the helmet on the right, then the story's opening chapters
 * (the children) running beside it.
 *
 * Wide screens (`split`): the helmet holds (sticky) beside the text for the
 * whole section, the way pictures hold on /projects, and lets go when the
 * last of those chapters ends. The one thing the scroll drives is the
 * visor, over the first LIFT stage-heights, so by the time the lead is in
 * view, so is my face. The first screen stops a little short, so the lead's
 * first line shows under it: the only cue to scroll.
 *
 * Narrow screens: my name, then the helmet, then the rest. The visor opens
 * as the helmet rises up the screen (NARROW), so it's open, and my face in
 * full view, before the helmet scrolls away. Nothing plays by itself, on
 * any screen. Reduced motion: the visor is simply open.
 *
 * Scroll is read from the Mission Control stage (the room's own scroll
 * container) into refs: no React renders while scrolling.
 */

/** Wide and tall enough for the name and the helmet side by side. Keep in
 *  step with the `split` variant in globals.css. */
const SPLIT = '(min-aspect-ratio: 23/20) and (min-width: 768px) and (min-height: 480px)';
/** Wide: scroll, in stage heights, over which the visor lifts. */
const LIFT = 0.6;
/** Narrow: the visor starts lifting once the helmet's centre has risen past
 *  `from` of the screen's height (at once, if it starts higher), and is open
 *  after `run` more. */
const NARROW = { from: 0.62, run: 0.3 };
/** The figure's pose (radians; negative turns toward the name, on the
 *  left): the head square to the lens, so the frontal portrait lines up with
 *  it exactly; the shoulders a little round toward the name, so it isn't
 *  stiff; the chin a touch up (the portrait was shot from a little below). */
const POSE = { body: -0.12, head: 0, pitch: -0.03 };

/** Whether this browser can draw the helmet at all (checked once; the test
 *  context is released straight away, contexts are scarce on phones). */
let webglOk;
function canWebGL() {
  if (webglOk === undefined) {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      webglOk = !!gl;
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      webglOk = false;
    }
  }
  return webglOk;
}

/** If the helmet fails (the portrait doesn't load, the GPU refuses a
 *  context), the room carries on as text: nothing here takes the page down. */
class HelmetBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const subscribe = (cb) => {
  const m = window.matchMedia(SPLIT);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
const useSplit = () => useSyncExternalStore(subscribe, () => window.matchMedia(SPLIT).matches, () => true);

/** Hands the canvas's invalidate() to the page, so a scroll can ask for a frame. */
function Bridge({ apiRef }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    apiRef.current = invalidate;
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, invalidate]);
  return null;
}

export default function MeetMe({ children }) {
  const section = useRef(null);
  const stage = useRef(null);
  const box = useRef(null);
  const slotEl = useRef(null);
  const progress = useRef(0);
  const slot = useRef(null);
  const live = useRef(true);
  const invalidate = useRef(null);
  const reduced = !!useReducedMotion();
  const split = useSplit();
  const [webgl] = useState(canWebGL);
  const [compiled, setCompiled] = useState(false);
  const [measured, setMeasured] = useState(false);
  const [settled, setSettled] = useState(false); // the room's slide-in has landed
  const onReady = useCallback(() => setCompiled(true), []);
  const ready = compiled && measured && settled;

  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 350);
    return () => clearTimeout(t);
  }, []);

  // the helmet's slot, in canvas pixels. Both live in the stage, so this
  // only changes on resize, never on scroll.
  useEffect(() => {
    const st = stage.current;
    if (!st) return;
    const measure = () => {
      const b = box.current?.getBoundingClientRect();
      const s = slotEl.current?.getBoundingClientRect();
      if (!b?.width || !s?.width) return;
      slot.current = { x: s.left - b.left, y: s.top - b.top, w: s.width, h: s.height };
      // the falloff around the figure (see .meet-canvas): an oval on the
      // helmet, so the shoulders fade into the room on every side
      const r = Math.min(s.width, s.height) / 2;
      const cy = s.top - b.top + s.height / 2;
      const css = box.current.style;
      css.setProperty('--meet-mx', `${s.left - b.left + s.width / 2}px`);
      css.setProperty('--meet-my', `${cy + r * 0.3}px`);
      css.setProperty('--meet-r', `${r * 2.3}px`);
      // and below the shoulder line the suit dissolves
      css.setProperty('--meet-fade-a', `${cy + r * 1.05}px`);
      css.setProperty('--meet-fade-b', `${cy + r * 1.95}px`);
      // split: the near shoulder dissolves before it reaches the text column,
      // so the chapters never run over the suit
      const near = s.left - b.left + s.width / 2 - r;
      css.setProperty('--meet-side-a', split ? `${near - r * 0.75}px` : '0px');
      css.setProperty('--meet-side-b', split ? `${near - r * 0.12}px` : '0px');
      setMeasured(true);
      invalidate.current?.();
    };
    const ro = new ResizeObserver(measure);
    ro.observe(st);
    measure();
    return () => ro.disconnect();
  }, [split]);

  // frames only while the stage is on screen
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      live.current = e.isIntersecting;
      if (e.isIntersecting) invalidate.current?.();
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // scroll lifts the visor, on every screen. Measured on resize; on
  // scroll, one read. The scroll is already smoothed (see lib/smoothScroll),
  // so the visor follows it as it is.
  useEffect(() => {
    if (reduced) return;
    const el = section.current;
    const scroller = el?.closest('[data-mc-scroll]');
    if (!el || !scroller) return;
    let start = 0;
    let run = 1;
    const onScroll = () => {
      const p = Math.min(1, Math.max(0, (scroller.scrollTop - start) / run));
      if (p === progress.current) return;
      progress.current = p;
      invalidate.current?.();
    };
    const measure = () => {
      const sr = scroller.getBoundingClientRect();
      const top = el.getBoundingClientRect().top - sr.top + scroller.scrollTop;
      if (split) {
        start = top;
        run = Math.max(1, (stage.current?.offsetHeight || 1) * LIFT);
      } else {
        const s = slotEl.current?.getBoundingClientRect();
        const h = scroller.clientHeight;
        const centre = s ? s.top + s.height / 2 - sr.top + scroller.scrollTop : top;
        start = Math.max(top, centre - h * NARROW.from);
        run = Math.max(1, h * NARROW.run);
      }
      onScroll();
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(scroller);
    measure();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      ro.disconnect();
      scroller.removeEventListener('scroll', onScroll);
    };
  }, [split, reduced]);

  // the opener's jumps ("Most recently", "Next") go to their sections
  const jump = useCallback(
    (e) => {
      const el = document.getElementById(e.currentTarget.hash.slice(1));
      if (!el) return;
      e.preventDefault();
      glideTo(el, { reduce: reduced });
      el.focus({ preventScroll: true });
    },
    [reduced]
  );

  return (
    <section ref={section} aria-label="About" className="meet relative">
      {/* narrow: my name first, over the helmet */}
      {!split && (
        <div className="mx-auto max-w-6xl px-6 pt-8 sm:px-12">
          <MeetHeadline part="name" still={reduced} />
        </div>
      )}

      {/* the stage: the helmet. Split, it holds beside the text for the whole
          section; narrow, it's a block between my name and the rest. */}
      <div ref={stage} className={`${webgl ? '' : 'hidden split:block'} relative h-[min(56svh,32rem)] split:sticky split:top-0 split:h-(--meet-stage)`}>
        <div ref={box} aria-hidden className="meet-canvas pointer-events-none absolute inset-0 split:left-[22%]">
          <div
            className="absolute inset-0 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ opacity: ready ? 1 : 0, transform: ready || reduced ? 'none' : 'translateY(16px)' }}
          >
            {webgl && (
              <HelmetBoundary>
                <Canvas
                  dpr={[1, 1.5]}
                  shadows="percentage"
                  frameloop="demand"
                  resize={{ scroll: false }}
                  gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                  camera={{ position: [0, 0, 6.4], fov: 30, near: 0.1, far: 50 }}
                  onCreated={({ gl }) => {
                    gl.toneMapping = THREE.NeutralToneMapping;
                    gl.setClearColor(0x000000, 0);
                  }}
                >
                  <Bridge apiRef={invalidate} />
                  <Suspense fallback={null}>
                    <HelmetScene progress={progress} slot={slot} live={live} still={reduced} pose={POSE} onReady={onReady} />
                  </Suspense>
                </Canvas>
              </HelmetBoundary>
            )}
          </div>
        </div>
        {/* where the helmet sits: the right half of the About grid (split),
            or centred between my name and the text (narrow) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 mx-auto grid max-w-6xl grid-cols-1 grid-rows-1 px-6 sm:px-12 split:grid-cols-12 split:gap-x-12">
          <div className="relative split:col-span-6 split:col-start-7">
            {/* split: a box centred 45% down the stage and right of the
                column's centre (it runs out into the margin, away from the
                text), as tall as it is wide up to 64% of the stage, so on
                tall screens the helmet keeps its size against the text */}
            <div
              ref={slotEl}
              data-meet-slot
              className="absolute inset-x-[10%] bottom-[27%] top-[5%] split:left-0 split:-right-[32%] split:bottom-auto split:top-[45%] split:aspect-square split:h-auto split:max-h-[min(64%,36rem)] split:-translate-y-1/2"
            />
          </div>
        </div>
      </div>

      {/* the text: over the stage's left half (split), or under it (narrow) */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 sm:px-12 split:-mt-(--meet-stage) split:pb-32">
        <div className="split:grid split:grid-cols-12 split:gap-x-12">
          <div className="split:col-span-6">
            {split ? (
              // the first screen, a little short of full: the lead peeks under it
              <div className="flex min-h-[calc(var(--meet-stage)-4.5rem)] flex-col justify-center">
                <MeetHeadline onJump={jump} still={reduced} />
              </div>
            ) : (
              <MeetHeadline part="intro" onJump={jump} still={reduced} />
            )}
            {/* the chapters keep clear of the suit's near shoulder as they
                scroll past the held helmet */}
            <div className="pt-12 split:pr-10 split:pt-0">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
