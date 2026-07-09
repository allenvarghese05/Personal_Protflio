'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ChapterPanels from '@/components/ui/ChapterPanels';
import MemoryCard from '@/components/ui/MemoryCard';
import StaticHero from '@/components/fallback/StaticHero';
import ScrollManager from '@/components/scene/ScrollManager';
import SpaceExperience from '@/components/scene/SpaceExperience';
import WorldExperience from '@/components/scene/world/WorldExperience';
import MissionControl from '@/components/ui/MissionControl';
import BigBangTransition, { ControlHint } from '@/components/journey/BigBangTransition';

// NOTE: SpaceExperience is imported statically (not next/dynamic) so it
// shares the SAME store + scrollState module instances as ScrollManager
// and the overlays. A separate dynamic chunk duplicated that state, which
// left the 3D scene reading values that never updated. The `mounted` gate
// below keeps the WebGL canvas from rendering during SSR.

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
    hasWebGL = !!(
      canvas.getContext('webgl2') || canvas.getContext('webgl')
    );
  } catch {
    hasWebGL = false;
  }
  const isLowEnd = (navigator.hardwareConcurrency || 4) <= 2;
  if (hasWebGL && !isLowEnd) return 'full';
  if (hasWebGL) return 'enhanced';
  return 'base';
}

/**
 * THE journey: launch cinematic → scroll ascent → orbit / name card →
 * TRAVEL TO ALLEN'S WORLD → Big Bang dive → astronaut drop → walkable world
 * (Mission Control). One-way — landing is the point of no return.
 * /?world=1 skips straight to the surface (dev / direct access).
 */
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isWorldRoute, setIsWorldRoute] = useState(false);
  const tier = useStore((s) => s.tier);
  const setTier = useStore((s) => s.setTier);
  const journeyPhase = useStore((s) => s.journeyPhase);
  const setJourneyPhase = useStore((s) => s.setJourneyPhase);

  useEffect(() => {
    setTier(detectTier());
    const isWorld = new URLSearchParams(window.location.search).has('world');
    setIsWorldRoute(isWorld);
    setJourneyPhase(isWorld ? 'world' : 'intro');
    setMounted(true);
  }, [setTier, setJourneyPhase]);

  // Debug/test hook — lets tooling observe the journey phase.
  useEffect(() => {
    if (mounted) window.__jp = journeyPhase;
  }, [mounted, journeyPhase]);

  // Avoid hydration flash — render nothing until tier is known
  if (!mounted) {
    return <div className="min-h-screen bg-[var(--void)]" />;
  }

  // Base tier: static HTML hero, no canvas, no animation
  if (tier === 'base') {
    return <StaticHero />;
  }

  const world = (
    <>
      <WorldExperience />
      <MissionControl />
    </>
  );

  // Direct surface access — no space intro
  if (isWorldRoute) {
    return <main className="relative bg-[var(--void)]">{world}</main>;
  }

  return (
    <main className="relative bg-[var(--void)]">
      {journeyPhase === 'intro' ? (
        <>
          {/* Fixed 3D layer + overlays */}
          <SpaceExperience tier={tier} />
          <LoadingScreen />
          <ChapterPanels />
          <MemoryCard />
          <ScrollManager />

          {/* Scroll runway — the ascent climaxes at the orbit / name card */}
          <div aria-hidden style={{ height: '320vh' }} />
        </>
      ) : (
        world
      )}

      {/* Big Bang overlays persist across the intro → landing swap */}
      {journeyPhase !== 'world' && <BigBangTransition />}
      {journeyPhase === 'world' && <ControlHint />}
    </main>
  );
}
