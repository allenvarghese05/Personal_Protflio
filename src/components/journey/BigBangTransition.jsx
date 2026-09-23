'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useStore } from '@/lib/store';
import { worldState } from '@/lib/worldState';
import { ENTRY, resetEntryState } from '@/lib/entrySequence';
import { getAudio } from '@/lib/audio';

const MONO = { fontFamily: 'var(--font-jetbrains-mono), monospace' };

/* Synthesized sound design (no audio files) — all through the AudioContext
   unlocked by the button click. Every call is defensive: sound is a bonus. */
function rumble(dur = 3) {
  try {
    const ctx = getAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(28, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(52, ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + dur * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.35);
  } catch {}
}
function crack() {
  try {
    const ctx = getAudio();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * 0.18);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch {}
}

/** Typewriter — writes `text` into `el` character by character via gsap. */
function typeInto(tl, el, text, at, perChar = 0.04) {
  const state = { n: 0 };
  tl.to(
    state,
    {
      n: text.length,
      duration: text.length * perChar,
      ease: 'none',
      onUpdate: () => {
        if (el) el.textContent = text.slice(0, Math.round(state.n));
      },
    },
    at
  );
}

/**
 * The world-entry cinematic, DOM side. Triggered when the hero's Enter click
 * sets phase='dive'. The 3D side (components/intro — IntroCamera,
 * EntryDistortion) runs off the same ENTRY clock, so both stay in lockstep.
 *
 * Act A — the galaxy dive + Allen's system (3D + IntroOverlay captions)
 * Act B — the dive into Allen's World: vignette + heat burn on the last
 *         stretch, then THE FLASH on contact with the atmosphere
 * Act C — arrival: world materialises under letterbox, typewriter designation,
 *         bars iris out, the drop plays world-side, film intertitles, handoff.
 */
export default function BigBangTransition() {
  const phase = useStore((s) => s.phase);
  const setJourneyPhase = useStore((s) => s.setJourneyPhase);

  const vignetteRef = useRef(null);
  const heatRef = useRef(null);
  const flashRef = useRef(null);
  const shockRef = useRef(null);
  const shockAmberRef = useRef(null);
  const rgbRedRef = useRef(null);
  const rgbBlueRef = useRef(null);
  const barTopRef = useRef(null);
  const barBottomRef = useRef(null);
  const designationRef = useRef(null);
  const typeLine1 = useRef(null);
  const typeLine2 = useRef(null);
  const welcomeRef = useRef(null);
  const welcome1 = useRef(null);
  const welcome2 = useRef(null);
  const masterTl = useRef(null);
  const fired = useRef(false);

  useEffect(() => {
    if (phase !== 'dive' || fired.current) return;
    fired.current = true;
    document.body.style.overflow = 'hidden';
    // Timed beats must hit their marks even through heavy frames (the world
    // canvas mounts mid-flash) — default lag smoothing would rewind the
    // playhead. Scoped to the sequence; GSAP's default is restored after.
    gsap.ticker.lagSmoothing(0);

    const tl = gsap.timeline();
    masterTl.current = tl;

    /* ── ACT B — the crossing ────────────────────────────────────────── */
    tl.addLabel('dive2', ENTRY.ZOOM);
    tl.call(() => rumble(ENTRY.FLASH - ENTRY.ZOOM), null, 'dive2');

    // the last stretch — edges darken and burn as we hit the atmosphere
    tl.addLabel('approach', ENTRY.APPROACH);
    tl.to(vignetteRef.current, { opacity: 0.6, duration: ENTRY.FLASH - ENTRY.APPROACH }, 'approach');
    tl.to(heatRef.current, { opacity: 0.7, duration: ENTRY.FLASH - ENTRY.APPROACH }, 'approach');

    /* ── THE FLASH — one frame, no warning ───────────────────────────── */
    tl.addLabel('flash', ENTRY.FLASH);
    tl.set(flashRef.current, { opacity: 1 }, 'flash');
    tl.set([vignetteRef.current, heatRef.current], { opacity: 0 }, 'flash');
    tl.call(
      () => {
        crack();
        shockRef.current?.classList.add('intro-shockwave');
        shockAmberRef.current?.classList.add('intro-shockwave-amber');
      },
      null,
      'flash'
    );

    // Under the white: the universe swaps. World mounts dark, astronaut high.
    tl.addLabel('swap', ENTRY.SWAP);
    tl.call(
      () => {
        worldState.reveal = 0;
        worldState.altitude = 60;
        worldState.shake = 0;
        setJourneyPhase('landing');
      },
      null,
      'swap'
    );
    tl.set([barTopRef.current, barBottomRef.current], { opacity: 1 }, 'swap');

    /* ── ACT C — arrival ─────────────────────────────────────────────── */
    // chromatic split as the white lets go (2–3 frames of physicality)
    tl.set([rgbRedRef.current, rgbBlueRef.current], { opacity: 0.35 }, ENTRY.REVEAL);
    tl.set([rgbRedRef.current, rgbBlueRef.current], { opacity: 0 }, ENTRY.REVEAL + 0.09);
    tl.to(flashRef.current, { opacity: 0, duration: 0.8, ease: 'power1.in' }, ENTRY.REVEAL);

    // planet designation, typed inside the letterbox
    tl.set(designationRef.current, { opacity: 1 }, ENTRY.TYPE);
    typeInto(tl, typeLine1.current, "ALLEN'S WORLD", ENTRY.TYPE);
    typeInto(tl, typeLine2.current, 'SECTOR 01 · CLASS M · EST. 2001', ENTRY.TYPE + 0.6);

    // letterbox irises out — earned, not instant
    tl.addLabel('bars', ENTRY.BARS);
    tl.to(barTopRef.current, { yPercent: -100, duration: 0.6, ease: 'expo.out' }, 'bars');
    tl.to(barBottomRef.current, { yPercent: 100, duration: 0.6, ease: 'expo.out' }, 'bars+=0.15');

    // (the drop, dust, shake, ripple and thud play world-side — LandingDirector)

    // film intertitles
    tl.addLabel('welcome', ENTRY.WELCOME);
    tl.fromTo(welcome1.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 'welcome');
    tl.fromTo(welcome2.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 'welcome+=0.2');
    tl.to(welcomeRef.current, { opacity: 0, duration: 0.6 }, ENTRY.WELCOME_OUT);
    tl.to(designationRef.current, { opacity: 0, duration: 0.4 }, ENTRY.WELCOME_OUT);

    // handoff — the world is yours
    tl.call(
      () => {
        document.body.style.overflow = '';
        window.scrollTo(0, 0);
        setJourneyPhase('world');
      },
      null,
      ENTRY.HANDOFF
    );

    return () => {
      tl.kill();
      masterTl.current = null;
      resetEntryState();
      gsap.ticker.lagSmoothing(500, 33);
      document.body.style.overflow = '';
    };
  }, [phase, setJourneyPhase]);

  return (
    <>
      {/* Act B — gravity vignette */}
      <div
        ref={vignetteRef}
        className="pointer-events-none fixed inset-0 z-[200]"
        style={{ opacity: 0, background: 'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.9) 100%)' }}
      />
      {/* Act B — atmosphere friction burn */}
      <div
        ref={heatRef}
        className="pointer-events-none fixed inset-0 z-[201]"
        style={{ opacity: 0, background: 'radial-gradient(ellipse at center, transparent 46%, rgba(200,80,20,0.55) 86%, rgba(255,120,30,0.85) 100%)' }}
      />
      {/* THE FLASH */}
      <div ref={flashRef} className="pointer-events-none fixed inset-0 z-[210] bg-white" style={{ opacity: 0 }} />
      {/* shockwaves */}
      <div
        ref={shockRef}
        className="pointer-events-none fixed left-1/2 top-1/2 z-[211] rounded-full"
        style={{ width: '24px', height: '24px', border: '3px solid var(--ink)', opacity: 0, transform: 'translate(-50%, -50%) scale(0)' }}
      />
      <div
        ref={shockAmberRef}
        className="pointer-events-none fixed left-1/2 top-1/2 z-[211] rounded-full"
        style={{ width: '24px', height: '24px', border: '3px solid color-mix(in srgb, var(--accent) 40%, transparent)', opacity: 0, transform: 'translate(-50%, -50%) scale(0)' }}
      />
      {/* chromatic split frames */}
      <div ref={rgbRedRef} className="pointer-events-none fixed inset-0 z-[209]" style={{ opacity: 0, background: 'rgba(255,0,60,0.5)', transform: 'translateX(-6px)', mixBlendMode: 'screen' }} />
      <div ref={rgbBlueRef} className="pointer-events-none fixed inset-0 z-[209]" style={{ opacity: 0, background: 'rgba(0,120,255,0.5)', transform: 'translateX(6px)', mixBlendMode: 'screen' }} />

      {/* Act C — letterbox (appears under the white, irises out later) */}
      <div ref={barTopRef} className="pointer-events-none fixed inset-x-0 top-0 z-[205] bg-black" style={{ height: '9vh', opacity: 0 }} />
      <div ref={barBottomRef} className="pointer-events-none fixed inset-x-0 bottom-0 z-[205] bg-black" style={{ height: '9vh', opacity: 0 }} />

      {/* Act C — planet designation (typed, sits in the bottom letterbox) */}
      <div
        ref={designationRef}
        className="pointer-events-none fixed inset-x-0 z-[206] text-center"
        style={{ bottom: '2.6vh', opacity: 0, ...MONO }}
      >
        <div ref={typeLine1} className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.28em', color: 'var(--accent)' }} />
        <div ref={typeLine2} className="uppercase" style={{ marginTop: '6px', fontSize: '11px', letterSpacing: '0.22em', color: 'var(--ink-subtle)' }} />
      </div>

      {/* Act C — film intertitles (same type as the hero + captions) */}
      <div
        ref={welcomeRef}
        className="pointer-events-none fixed left-1/2 top-1/2 z-[206] -translate-x-1/2 -translate-y-1/2 text-center"
      >
        <div
          ref={welcome1}
          className="font-mono uppercase"
          style={{ opacity: 0, fontSize: '11px', letterSpacing: '0.28em', color: 'var(--ink-muted)' }}
        >
          Welcome to
        </div>
        <div
          ref={welcome2}
          className="font-display"
          style={{
            opacity: 0,
            marginTop: '14px',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 600,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: 'var(--ink)',
            textShadow: '0 2px 30px rgba(0,0,0,0.55)',
          }}
        >
          Allen&rsquo;s World
        </div>
      </div>
    </>
  );
}

/** Persistent controls hint after the landing hands over. */
export function ControlHint() {
  const ref = useRef(null);
  useEffect(() => {
    const tween = gsap.fromTo(ref.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' });
    return () => tween.kill();
  }, []);
  return (
    <div
      ref={ref}
      className="skip-btn pointer-events-none fixed bottom-6 left-6 z-30 hidden whitespace-nowrap md:inline-flex"
      style={{ opacity: 0, paddingRight: '1rem' }}
    >
      Click to walk <span className="skip-btn__key">W S</span> move <span className="skip-btn__key">A D</span> turn <span className="skip-btn__key">Drag</span> look <span className="skip-btn__key">Scroll</span> zoom
    </div>
  );
}
