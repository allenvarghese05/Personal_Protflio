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
import ZonePrompt from '@/components/ui/ZonePrompt';

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

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const tier = useStore((s) => s.tier);
  const setTier = useStore((s) => s.setTier);

  useEffect(() => {
    setTier(detectTier());
    setMounted(true);
  }, [setTier]);

  // Avoid hydration flash — render nothing until tier is known
  if (!mounted) {
    return <div className="min-h-screen bg-[var(--void)]" />;
  }

  // Base tier: static HTML hero, no canvas, no animation
  if (tier === 'base') {
    return <StaticHero />;
  }

  // Dev preview of Allen's World (Act 4) in isolation: /?world=1
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('world')
  ) {
    return (
      <main className="relative bg-[var(--void)]">
        <WorldExperience />
        <ZonePrompt />
        <MemoryCard />
      </main>
    );
  }

  // Enhanced / full: scroll-driven launch → orbital reveal
  return (
    <main className="relative bg-[var(--void)]">
      {/* Fixed 3D layer + overlays */}
      <SpaceExperience tier={tier} />
      <LoadingScreen />
      <ChapterPanels />
      <MemoryCard />
      <ScrollManager />

      {/* Scroll runway — distance that scrubs the whole journey (hero + chapters) */}
      <div aria-hidden style={{ height: '700vh' }} />
    </main>
  );
}
