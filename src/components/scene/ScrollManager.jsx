'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
import { useStore } from '@/lib/store';
import { scrollState } from '@/lib/scrollState';
import { chapterFor } from '@/lib/journey';

/**
 * Owns the Lenis smooth-scroll instance and bridges scroll → 3D flight.
 * Scroll is locked during the boot/ignition/ready cinematic, unlocked at
 * 'ready', and from there `scrollState.progress` scrubs the ascent.
 *
 * Everything is polled inside one RAF loop (progress, velocity, phase
 * flips, lock/unlock) so it doesn't depend on Lenis getters or store
 * subscription internals — robust and easy to reason about.
 */
export default function ScrollManager() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.4, smoothWheel: true, syncTouch: true });
    let stopped = true;
    lenis.stop();

    let raf;
    const loop = (time) => {
      lenis.raf(time);

      const { phase, setPhase, activeChapter, setActiveChapter } =
        useStore.getState();

      // Lock during the intro, unlock once the launch is armed
      const shouldRun = phase === 'ready' || phase === 'flight';
      if (shouldRun && stopped) { lenis.start(); stopped = false; }
      else if (!shouldRun && !stopped) { lenis.stop(); stopped = true; }

      // Progress straight from scroll position (bulletproof)
      const docLimit =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      const limit = lenis.limit || docLimit;
      const scroll = lenis.scroll != null ? lenis.scroll : window.scrollY;
      const p = Math.min(1, Math.max(0, scroll / limit));
      scrollState.progress = p;

      const v = Math.min(1, Math.abs(lenis.velocity || 0) / 35);
      scrollState.velocity += (v - scrollState.velocity) * 0.12;

      // Arm flight on first scroll; from there the whole journey is 'flight'
      if (phase === 'ready' && p > 0.004) setPhase('flight');

      // Which content panel is active (drives the overlays)
      const ch = chapterFor(p);
      if (ch !== activeChapter) setActiveChapter(ch);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
