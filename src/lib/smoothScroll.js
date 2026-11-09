'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Smooth scrolling for the reading pages (Mission Control's rooms and case
 * studies, /projects): each wheel notch glides instead of jumping, and every
 * scroll-driven thing on the page (the helmet's visor, the reveals) reads
 * that same glide, so nothing moves out of step. The distance a notch moves
 * is unchanged; only its timing is smoothed.
 *
 * Only for a mouse or trackpad (touch scrolling is already smooth, and stays
 * the phone's own) and never with reduced motion. Not on the 3D world.
 *
 * Code that moves the scroll itself goes through jumpTo / glideTo, so a glide
 * already under way never fights it.
 */

/** wrapper (a scrolling element, or window) → its Lenis */
const live = new Map();

const wanted = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Smooth-scroll `ref.current` (or the window, for 'window') while mounted
 * and `on`. Mission Control swaps rooms inside one scroller, so its scroll
 * length is measured live rather than cached.
 */
export function useSmoothScroll(ref, on = true) {
  useEffect(() => {
    if (!on || !wanted()) return undefined;
    const wrapper = ref === 'window' ? window : ref?.current;
    if (!wrapper) return undefined;
    const lenis = new Lenis({
      wrapper,
      content: wrapper === window ? document.documentElement : wrapper,
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: true,
      // code blocks and wide figures that scroll sideways keep their own scroll
      allowNestedScroll: true,
      naiveDimensions: wrapper !== window,
    });
    live.set(wrapper, lenis);
    return () => {
      if (live.get(wrapper) === lenis) live.delete(wrapper);
      lenis.destroy();
    };
  }, [ref, on]);
}

/** Freeze every smooth scroller while something full-screen sits on top (the
 *  wheel shouldn't scroll the page behind it), and let them go again. */
export function holdSmoothScroll(hold) {
  live.forEach((lenis) => (hold ? lenis.stop() : lenis.start()));
}

const scrollerOf = (el) => el?.closest?.('[data-mc-scroll]') ?? window;
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Put `wrapper` at `top` at once, stopping any glide (a room arriving, a
 *  scroll position restored). */
export function jumpTo(wrapper, top) {
  live.get(wrapper)?.reset();
  if (wrapper === window) window.scrollTo({ top, behavior: 'instant' });
  else wrapper.scrollTop = top;
}

/**
 * Glide to `target` (an element, or a number of pixels in `wrapper`), easing
 * in and out over a time that grows a little with the distance. Without
 * smooth scrolling it's the browser's own smooth scroll (or a jump, with
 * reduced motion).
 */
export function glideTo(target, { wrapper = scrollerOf(target), reduce = false } = {}) {
  const lenis = live.get(wrapper);
  if (lenis) {
    const from = lenis.animatedScroll;
    const base = wrapper === window ? 0 : wrapper.getBoundingClientRect().top;
    const to = typeof target === 'number' ? target : target.getBoundingClientRect().top - base + from;
    const duration = Math.min(1.5, 0.7 + Math.abs(to - from) / 4000);
    lenis.scrollTo(target, { duration, easing: inOut });
    return;
  }
  const behavior = reduce ? 'auto' : 'smooth';
  if (typeof target === 'number') {
    if (wrapper === window) window.scrollTo({ top: target, behavior });
    else wrapper.scrollTo({ top: target, behavior });
  } else target.scrollIntoView({ behavior, block: 'start' });
}
