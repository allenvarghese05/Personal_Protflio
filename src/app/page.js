'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import StaticHero from '@/components/fallback/StaticHero';
import IntroExperience from '@/components/intro/IntroExperience';
import IntroOverlay, { SkipIntro } from '@/components/intro/IntroOverlay';
import WorldExperience from '@/components/scene/world/WorldExperience';
import MissionControl from '@/components/ui/MissionControl';
import BigBangTransition, { ControlHint } from '@/components/journey/BigBangTransition';

// NOTE: the intro scene is imported statically (not next/dynamic) so it
// shares the SAME store + entry-clock module instances as the overlays. The
// `mounted` gate below keeps the WebGL canvas from rendering during SSR.

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
 * THE journey: loader → name over the galaxy → Enter → dive into Allen's
 * star → Allen's system → the voyager's run → Big Bang → astronaut drop →
 * walkable world (Mission Control). One-way; Skip / Esc jumps to the world.
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
