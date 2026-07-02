'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useStore } from '@/lib/store';
import IntroSequence from '@/components/intro/IntroSequence';
import WorldExperience from '@/components/scene/world/WorldExperience';
import MissionControl from '@/components/ui/MissionControl';

/**
 * The full journey on the world route:
 *   'intro'   → IntroSequence only (Acts 1–2 scroll + Act 3 Big Bang)
 *   'landing' → world mounts beneath the intro overlays (flash / letterbox /
 *               welcome text still on top while the astronaut drops in)
 *   'world'   → intro unmounts; full player control (+ one-time control hint)
 * `?world=1&skip=1` jumps straight to 'world' for fast dev iteration.
 */

function ControlHint() {
  const ref = useRef(null);
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    tl.to(ref.current, { opacity: 0, duration: 0.6 }, 5.5);
    return () => tl.kill();
  }, []);
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-md font-mono uppercase"
      style={{
        opacity: 0,
        fontSize: '8px',
        letterSpacing: '0.2em',
        color: '#1a2535',
        background: 'rgba(255,240,214,0.55)',
        padding: '6px 12px',
      }}
    >
      WASD · Click to move · Explore
    </div>
  );
}

export default function JourneyExperience({ skipIntro = false }) {
  const journeyPhase = useStore((s) => s.journeyPhase);
  const setJourneyPhase = useStore((s) => s.setJourneyPhase);
  const [booted, setBooted] = useState(false);
  const ranIntro = useRef(!skipIntro);

  useLayoutEffect(() => {
    setJourneyPhase(skipIntro ? 'world' : 'intro');
    setBooted(true);
  }, [skipIntro, setJourneyPhase]);

  // Test/debug hook — lets tooling observe the phase without store access.
  useEffect(() => {
    if (typeof window !== 'undefined') window.__jp = journeyPhase;
  }, [journeyPhase]);

  if (!booted) return null;

  return (
    <>
      {journeyPhase !== 'intro' && (
        <>
          <WorldExperience />
          <MissionControl />
        </>
      )}
      {journeyPhase !== 'world' && <IntroSequence />}
      {journeyPhase === 'world' && ranIntro.current && <ControlHint />}
    </>
  );
}
