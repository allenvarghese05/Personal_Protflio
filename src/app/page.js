'use client';
import { useState, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { useStore } from '@/lib/store';
import StaticHero from '@/components/fallback/StaticHero';
import IntroExperience from '@/components/intro/IntroExperience';
import IntroOverlay, { SkipIntro } from '@/components/intro/IntroOverlay';
import WorldExperience from '@/components/scene/world/WorldExperience';
import MissionControl from '@/components/ui/MissionControl';
import WorldDock from '@/components/ui/WorldDock';
import BigBangTransition, { ControlHint } from '@/components/journey/BigBangTransition';

// NOTE: the intro scene is imported statically (not next/dynamic) so it
// shares the SAME store + entry-clock module instances as the overlays. The
// `mounted` gate below keeps the WebGL canvas from rendering during SSR.

// Rooms a link can open directly (see the ?room= handling below)
const ROOMS = new Set(['engineering', 'observatory', 'studio', 'comms']);
/** The About room's code (and, with it, the portrait): fetched early for a
 *  link straight to it. */
const prefetchAbout = () => import('@/components/ui/stations/ObservatoryPanel').catch(() => {});

/**
 * Capability detection — chooses base / enhanced / full.
 * Runs once on mount (window only available client-side).
 */
function detectTier() {
  if (typeof window === 'undefined') return 'full';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'base';
  }
  let hasWebGL = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    hasWebGL = !!gl;
    // only a test: give the context back (phones allow few at once)
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    hasWebGL = false;
  }
  const isLowEnd = (navigator.hardwareConcurrency || 4) <= 2;
  if (hasWebGL && !isLowEnd) return 'full';
  if (hasWebGL) return 'enhanced';
  return 'base';
}

/**
 * THE journey: loader → name over the galaxy → Enter → dive into Allen's
 * star → Allen's system → dive into Allen's World → Big Bang → astronaut drop →
 * walkable world (Mission Control). One-way; Skip / Esc jumps to the world.
 * /?world=1 skips straight to the surface; /?room=observatory (studio, comms,
 * engineering) opens that room on it.
 */
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isWorldRoute, setIsWorldRoute] = useState(false);
  const tier = useStore((s) => s.tier);
  const setTier = useStore((s) => s.setTier);
  const journeyPhase = useStore((s) => s.journeyPhase);
  const setJourneyPhase = useStore((s) => s.setJourneyPhase);
  const enteredZone = useStore((s) => s.enteredZone);

  // Client-only facts (WebGL, the query string) decide the first render, so
  // they are read once after mount — setting state here is the point.
  useEffect(() => {
    setTier(detectTier());
    const params = new URLSearchParams(window.location.search);
    // /?room=observatory (or studio, comms, engineering) opens that room on
    // the surface directly: a shareable link to the About page, for example
    const room = params.get('room');
    const isWorld = params.has('world') || ROOMS.has(room);
    /* eslint-disable react-hooks/set-state-in-effect -- one-time mount detection */
    setIsWorldRoute(isWorld);
    setJourneyPhase(isWorld ? 'world' : 'intro');
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // (and coming Back to the surface from /projects, nothing is left open)
    useStore.getState().setEnteredZone(ROOMS.has(room) ? room : null);
  }, [setTier, setJourneyPhase]);

  // a link straight to the About room: its code and portrait start loading
  // now, alongside the world, not when the room opens
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('room') === 'observatory') prefetchAbout();
  }, []);

  // Avoid hydration flash — render nothing until tier is known
  if (!mounted) {
    return <div className="min-h-screen bg-[var(--void)]" />;
  }

  // Base tier: static HTML hero, no canvas, no animation. A room asked for
  // by link (/?room=observatory) or from the hero still opens, as a plain
  // page over the void, with motion reduced for those who asked for that.
  if (tier === 'base') {
    if (!enteredZone) return <StaticHero />;
    return (
      <MotionConfig reducedMotion="user">
        <main className="relative h-screen overflow-hidden bg-[var(--void)]">
          <MissionControl />
        </main>
      </MotionConfig>
    );
  }

  const world = (
    <>
      <WorldExperience />
      <WorldDock />
      <MissionControl />
    </>
  );

  // Direct surface access — no space intro
  if (isWorldRoute) {
    return <main className="relative h-screen overflow-hidden bg-[var(--void)]">{world}</main>;
  }

  return (
    <main className="relative h-screen overflow-hidden bg-[var(--void)]">
      {journeyPhase === 'intro' ? (
        <>
          <IntroExperience tier={tier} />
          <IntroOverlay />
        </>
      ) : (
        world
      )}

      {/* Big Bang overlays persist across the intro → landing swap */}
      {journeyPhase !== 'world' && <BigBangTransition />}
      <SkipIntro />
      {journeyPhase === 'world' && <ControlHint />}
    </main>
  );
}
