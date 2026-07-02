'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useStore } from '@/lib/store';
import { worldState } from '@/lib/worldState';

// Timed beats must hit their marks even through heavy frames (the world
// canvas mounts mid-flash) — default lag smoothing would rewind the playhead.
if (typeof window !== 'undefined') gsap.ticker.lagSmoothing(0);

const MONO = { fontFamily: 'var(--font-jetbrains-mono), monospace' };

/**
 * The Big Bang — DOM side of the dive → flash → landing handoff, triggered
 * when the TRAVEL button sets phase='dive'. The 3D dive itself plays in the
 * space canvas (Rocket + CameraRig 'dive' branches); this overlay times the
 * vignette, white flash, shockwave, canvas swap, welcome text, and the final
 * control handoff. World-side beats (light reveal, astronaut drop, dust,
 * shake) run in LandingDirector once journeyPhase flips to 'landing'.
 *
 *   0.0s  rocket burns toward the planet, card fades, scroll locks
 *   0.9s  amber atmosphere-entry vignette
 *   1.5s  WHITE FLASH + shockwave ring (rocket vanishes into the core)
 *   1.65s under the white: world mounts (lights out, astronaut at altitude 50)
 *   1.8s  white fades — the world materialises, the drop begins
 *   3.6s  WELCOME TO ALLEN'S WORLD
 *   6.1s  handoff — journeyPhase 'world', control unlocked
 */
export default function BigBangTransition() {
  const phase = useStore((s) => s.phase);
  const setJourneyPhase = useStore((s) => s.setJourneyPhase);

  const vignetteRef = useRef(null);
  const flashRef = useRef(null);
  const shockRef = useRef(null);
  const welcomeRef = useRef(null);
  const fired = useRef(false);

  useEffect(() => {
    if (phase !== 'dive' || fired.current) return;
    fired.current = true;
    document.body.style.overflow = 'hidden';

    const tl = gsap.timeline();
    // Beat — atmosphere entry glow
    tl.to(vignetteRef.current, { opacity: 1, duration: 0.3 }, 0.9);
    // Beat — THE FLASH + shockwave
    tl.to(flashRef.current, { opacity: 1, duration: 0.15 }, 1.5);
    tl.call(() => shockRef.current?.classList.add('intro-shockwave'), null, 1.5);
    // Under full white: swap to the world, primed dark with the astronaut high
    tl.call(
      () => {
        worldState.reveal = 0;
        worldState.altitude = 50;
        worldState.shake = 0;
        setJourneyPhase('landing');
        if (vignetteRef.current) vignetteRef.current.style.opacity = 0;
      },
      null,
      1.65
    );
    // Beat — white fades, world materialises (LandingDirector ramps lights)
    tl.to(flashRef.current, { opacity: 0, duration: 0.4 }, 1.8);
    // Beat — welcome
    tl.fromTo(
      welcomeRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
      3.6
    );
    tl.to(welcomeRef.current, { opacity: 0, duration: 0.5 }, 5.6);
    // Beat — control handoff
    tl.call(
      () => {
        document.body.style.overflow = '';
        window.scrollTo(0, 0);
        setJourneyPhase('world');
      },
      null,
      6.1
    );

    return () => {
      tl.kill();
      document.body.style.overflow = '';
    };
  }, [phase, setJourneyPhase]);

  return (
    <>
      {/* Atmosphere-entry vignette */}
      <div
        ref={vignetteRef}
        className="pointer-events-none fixed inset-0 z-[200]"
        style={{ opacity: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(200,100,20,0.3) 100%)' }}
      />
      {/* THE FLASH */}
      <div ref={flashRef} className="pointer-events-none fixed inset-0 z-[210] bg-white" style={{ opacity: 0 }} />
      {/* Shockwave ring */}
      <div
        ref={shockRef}
        className="pointer-events-none fixed left-1/2 top-1/2 z-[210] rounded-full"
        style={{ width: '24px', height: '24px', border: '2px solid #ffffff', opacity: 0, transform: 'translate(-50%, -50%) scale(0)' }}
      />
      {/* Welcome text */}
      <div
        ref={welcomeRef}
        className="pointer-events-none fixed left-1/2 top-1/2 z-[205] -translate-x-1/2 -translate-y-1/2 text-center"
        style={{ opacity: 0, ...MONO }}
      >
        <div className="uppercase" style={{ fontSize: '9px', letterSpacing: '0.2em', color: '#3a5060' }}>
          Welcome to
        </div>
        <div
          className="uppercase"
          style={{ marginTop: '10px', fontSize: '18px', fontWeight: 700, letterSpacing: '0.1em', color: '#e8a040', textShadow: '0 0 18px rgba(232,160,64,0.5)' }}
        >
          Allen&apos;s World
        </div>
      </div>
    </>
  );
}

/** One-time controls hint after the landing hands over. */
export function ControlHint() {
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
