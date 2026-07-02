'use client';
import { useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import StarField from '@/components/scene/StarField';
import Rocket from '@/components/scene/Rocket';
import { useStore } from '@/lib/store';
import { scrollState } from '@/lib/scrollState';
import { introState } from '@/lib/introState';
import { worldState } from '@/lib/worldState';
import { HERO_END } from '@/lib/journey';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
  // Keep the Act 3 timeline on wall-clock time: with default lag smoothing a
  // heavy frame (world canvas mounting mid-flash) rewinds the playhead and
  // the timed beats drift. The cinematic must hit its marks.
  gsap.ticker.lagSmoothing(0);
}

/* ── shared math ──────────────────────────────────────────────────────────
   The rocket component (unchanged) flies PAD → ROCKET_END during 'flight'
   using scrollState.progress. We replicate its position formula here so the
   intro camera can chase it without touching the rocket's code. */
const PAD = new THREE.Vector3(0, -1.9, 1.5);
const ROCKET_END = new THREE.Vector3(1.7, 3.3, -9);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const smooth = (a, b, t) => {
  const x = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
const rocketPosAt = (progress, out) => {
  const p = Math.min(1, progress / HERO_END);
  const k = easeOutCubic(Math.min(1, p / 0.7));
  out.lerpVectors(PAD, ROCKET_END, k);
  return out;
};

/* Planet placement — dead ahead of the rocket's parked position. */
const PLANET_POS = new THREE.Vector3(1.7, 3.4, -34);
const PLANET_R = 8;

/* ── Allen's World seen from space ──────────────────────────────────────── */
function IntroPlanet() {
  const matRef = useRef();
  const meshRef = useRef();
  useFrame(() => {
    // Emerges from the dark across Phase B (20–40% scroll), keeps brightening
    // into the Big Bang. Slow rotation for life.
    if (meshRef.current) meshRef.current.rotation.y += 0.001;
    if (matRef.current) {
      const k = smooth(0.18, 0.55, introState.p) * 0.55 + introState.act3Mix * 0.35;
      matRef.current.emissiveIntensity = k;
    }
  });
  return (
    <group position={PLANET_POS.toArray()}>
      {/* low-poly surface — viewed from distance */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[PLANET_R, 32, 32]} />
        <meshStandardMaterial
          ref={matRef}
          color="#8b5a2b"
          emissive="#c87030"
          emissiveIntensity={0}
          roughness={0.9}
          metalness={0}
        />
      </mesh>
      {/* warm atmosphere halo */}
      <mesh scale={1.15}>
        <sphereGeometry args={[PLANET_R, 32, 32]} />
        <meshBasicMaterial color="#c87030" transparent opacity={0.15} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* Dashed orbital arc the rocket appears to ride during Phase C. */
function OrbitPath() {
  const lineRef = useRef();
  const geo = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, PLANET_R * 1.7, PLANET_R * 1.45, Math.PI * 0.1, Math.PI * 1.05, false, 0);
    const pts2 = curve.getPoints(80);
    const pts = pts2.map((v) => new THREE.Vector3(v.x, v.y * 0.35, 0));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return g;
  }, []);
  useEffect(() => {
    if (lineRef.current) lineRef.current.computeLineDistances();
  }, []);
  useFrame(() => {
    if (!lineRef.current) return;
    // Only visible during the orbital approach (40–60%), gone in Act 3.
    const k = smooth(0.4, 0.48, introState.p) * (1 - smooth(0.58, 0.62, introState.p)) * (1 - introState.act3Mix);
    lineRef.current.material.opacity = k * 0.5;
  });
  return (
    <line ref={lineRef} geometry={geo} position={PLANET_POS.toArray()} rotation={[0.35, 0.5, 0.15]}>
      <lineDashedMaterial color="#1a2535" transparent opacity={0} dashSize={0.7} gapSize={0.5} />
    </line>
  );
}

function IntroLights() {
  return (
    <>
      <ambientLight intensity={0.16} />
      {/* warm key from the planet's lit side */}
      <directionalLight position={[14, 8, -18]} intensity={1.4} color="#ffd9a0" />
      {/* cool fill so the rocket's dark side still reads */}
      <pointLight position={[-6, 2, 2]} intensity={0.5} color="#4a90d9" />
    </>
  );
}

/* Camera choreography: chase (Phase A/B) → side profile (Phase C) → front-on
   (Act 3), all sampled from introState so scroll + timeline share one rig. */
function IntroCameraRig() {
  const rocketPos = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const lookCur = useMemo(() => new THREE.Vector3(0, -1.5, 0), []);
  const offA = useMemo(() => new THREE.Vector3(0, 0.6, 5.2), []); // pad view
  const offB = useMemo(() => new THREE.Vector3(0, 1.1, 4.0), []); // chase
  const offC = useMemo(() => new THREE.Vector3(5.5, 1.0, 4.5), []); // side profile
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const frontPos = useMemo(
    () => new THREE.Vector3(PLANET_POS.x, PLANET_POS.y + 0.5, PLANET_POS.z + PLANET_R * 2.4),
    []
  );

  useFrame(({ camera }) => {
    const p = introState.p;
    rocketPosAt(scrollState.progress, rocketPos);

    // Offset blend: pad → chase (0–0.25), chase → side (0.4–0.6)
    tmp.copy(offA).lerp(offB, smooth(0.02, 0.25, p));
    tmp.lerp(offC, smooth(0.4, 0.6, p));
    desired.copy(rocketPos).add(tmp);

    // Look target: rocket → planet (0.18–0.4); the side view pulls the target
    // back toward the rocket so both it and the planet stay in frame.
    const blend = smooth(0.18, 0.4, p) * 0.55 - smooth(0.4, 0.6, p) * 0.25;
    look.copy(rocketPos).lerp(PLANET_POS, Math.max(0, blend));

    // Act 3 — front-on toward the planet surface
    if (introState.act3Mix > 0) {
      desired.lerp(frontPos, introState.act3Mix);
      look.lerp(PLANET_POS, introState.act3Mix);
    }

    const L = typeof window !== 'undefined' && window.__fastcam ? 0.5 : 0.08;
    camera.position.lerp(desired, L);
    lookCur.lerp(look, L);
    camera.lookAt(lookCur);
  });
  return null;
}

/* ── DOM pieces ──────────────────────────────────────────────────────────── */

const MONO = { fontFamily: 'var(--font-jetbrains-mono), monospace' };

function LetterboxBars({ topRef, bottomRef }) {
  // Same 8vh black bars as the launch cinematic — dissolve only at Beat 5.
  return (
    <>
      <div ref={topRef} className="absolute inset-x-0 top-0 z-30 bg-black" style={{ height: '8vh' }} />
      <div ref={bottomRef} className="absolute inset-x-0 bottom-0 z-30 bg-black" style={{ height: '8vh' }} />
    </>
  );
}

export default function IntroSequence() {
  const setPhase = useStore((s) => s.setPhase);
  const setJourneyPhase = useStore((s) => s.setJourneyPhase);

  const containerRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const act1Ref = useRef(null);
  const act2Ref = useRef(null);
  const hintRef = useRef(null);
  const vignetteRef = useRef(null);
  const flashRef = useRef(null);
  const shockRef = useRef(null);
  const welcomeRef = useRef(null);
  const letterTopRef = useRef(null);
  const letterBottomRef = useRef(null);
  const firedRef = useRef(false);
  const flightRef = useRef(false);

  useEffect(() => {
    // reset shared state for a clean run
    introState.p = 0;
    introState.act3 = false;
    introState.act3Mix = 0;
    scrollState.progress = 0;
    scrollState.velocity = 0;
    window.scrollTo(0, 0);

    /* Act 1 — auto choreography on load */
    setPhase('boot');
    const t1 = setTimeout(() => setPhase('ignition'), 600);
    const t2 = setTimeout(() => setPhase('ready'), 1400);

    const act1Lines = act1Ref.current ? [...act1Ref.current.children] : [];
    gsap.fromTo(
      act1Lines,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.3, delay: 1 }
    );
    gsap.fromTo(hintRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 2.5 });

    /* Act 3 — the Big Bang (auto-timed once scroll crosses 60%) */
    let act3tl = null;
    const runAct3 = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      document.body.style.overflow = 'hidden'; // scroll has done its job

      introState.act3 = true;
      scrollState.velocity = 1.2; // engine flare (rocket reads velocity)

      act3tl = gsap.timeline();
      // Beat 1 — camera snaps front-on
      act3tl.to(introState, { act3Mix: 1, duration: 0.8, ease: 'power2.in' }, 0);
      // Beat 2 — atmosphere entry: edge glow + heat shimmer
      act3tl.to(vignetteRef.current, { opacity: 1, duration: 0.3 }, 0.4);
      act3tl.to(canvasWrapRef.current, { filter: 'blur(1.5px)', duration: 0.4 }, 0.4);
      // Beat 3 — THE FLASH + shockwave
      act3tl.to(flashRef.current, { opacity: 1, duration: 0.15 }, 0.8);
      act3tl.call(() => shockRef.current?.classList.add('intro-shockwave'), null, 0.8);
      // Under full white: swap canvases — the world mounts beneath
      act3tl.call(
        () => {
          worldState.reveal = 0;
          worldState.altitude = 50;
          worldState.shake = 0;
          setJourneyPhase('landing');
          if (canvasWrapRef.current) canvasWrapRef.current.style.display = 'none';
          if (vignetteRef.current) vignetteRef.current.style.opacity = 0;
          scrollState.velocity = 0;
        },
        null,
        0.9
      );
      // Beat 4 — white fades, world materialises (lights ramp world-side)
      act3tl.to(flashRef.current, { opacity: 0, duration: 0.4 }, 1.0);
      // Beat 5 — letterbox bars dissolve
      act3tl.to(letterTopRef.current, { yPercent: -100, duration: 0.5, ease: 'expo.out' }, 1.2);
      act3tl.to(letterBottomRef.current, { yPercent: 100, duration: 0.5, ease: 'expo.out' }, 1.35);
      // Beats 6–7 happen world-side (LandingDirector: drop, dust, shake)
      // Beat 8 — welcome text
      act3tl.fromTo(
        welcomeRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
        3.0
      );
      act3tl.to(welcomeRef.current, { opacity: 0, duration: 0.5 }, 5.0);
      // Beat 9 — control handoff
      act3tl.call(
        () => {
          document.body.style.overflow = '';
          window.scrollTo(0, 0);
          setJourneyPhase('world');
        },
        null,
        5.5
      );
    };

    /* Acts 1–2 — scroll scrub */
    const st = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => {
        const p = self.progress;
        introState.p = p;

        // Drive the rocket's existing flight arc (parks by ~35% of the intro)
        if (!firedRef.current) {
          scrollState.progress = Math.min(p * 2, 1) * HERO_END;
          scrollState.velocity +=
            (Math.min(Math.abs(self.getVelocity()) / 3000, 0.8) - scrollState.velocity) * 0.1;
        }

        // First scroll → lift off
        if (p > 0.01 && !flightRef.current) {
          flightRef.current = true;
          setPhase('flight');
          gsap.to(hintRef.current, { opacity: 0, duration: 0.3 });
        }

        // Text windows
        if (act1Ref.current) {
          act1Ref.current.style.opacity = String(1 - smooth(0.08, 0.15, p));
        }
        if (act2Ref.current) {
          act2Ref.current.style.opacity = String(smooth(0.2, 0.26, p) * (1 - smooth(0.44, 0.5, p)));
        }

        // The threshold — Act 3 takes over
        if (p >= 0.6) runAct3();
      },
    });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      st.kill();
      if (act3tl) act3tl.kill();
      gsap.killTweensOf([introState, vignetteRef.current, flashRef.current, welcomeRef.current]);
      document.body.style.overflow = '';
    };
  }, [setPhase, setJourneyPhase]);

  return (
    <div ref={containerRef} id="intro-scroll-container" className="relative" style={{ height: '400vh' }}>
      {/* Fixed viewport (the site sets overflow-x:hidden on the body, which
          breaks position:sticky — fixed matches the SpaceExperience pattern). */}
      <div className="fixed inset-0 z-20 h-screen overflow-hidden">
        {/* Intro canvas — hidden at the flash while the world takes over */}
        <div ref={canvasWrapRef} className="absolute inset-0">
          <Canvas
            dpr={[1, 2]}
            gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
            camera={{ position: [0, -1.3, 6.7], fov: 50, near: 0.1, far: 200 }}
            onCreated={({ gl }) => gl.setClearColor('#060913', 1)}
          >
            <fogExp2 attach="fog" args={['#060913', 0.005]} />
            <IntroLights />
            <StarField count={3000} />
            <Rocket />
            <IntroPlanet />
            <OrbitPath />
            <IntroCameraRig />
          </Canvas>
        </div>

        {/* Letterbox bars — preserved through Acts 1–2, dissolve at Beat 5 */}
        <LetterboxBars topRef={letterTopRef} bottomRef={letterBottomRef} />

        {/* Act 1 — destination card (bottom-left) */}
        <div ref={act1Ref} className="pointer-events-none absolute z-20" style={{ bottom: '15%', left: '4%', ...MONO }}>
          <div className="uppercase" style={{ fontSize: '8px', letterSpacing: '0.2em', color: '#3a5060', opacity: 0 }}>
            Destination
          </div>
          <div style={{ marginTop: '8px', fontSize: '24px', fontWeight: 700, color: '#c8d4e0', letterSpacing: '0.04em', lineHeight: 1.2, opacity: 0 }}>
            Allen&apos;s World
          </div>
          <div style={{ marginTop: '8px', fontSize: '10px', letterSpacing: '0.1em', color: '#3a5060', opacity: 0 }}>
            Est. 2001 · Full Stack Engineer
          </div>
        </div>

        {/* Act 2 — entering orbit (left-center) */}
        <div
          ref={act2Ref}
          className="pointer-events-none absolute z-20"
          style={{ top: '50%', left: '4%', transform: 'translateY(-50%)', opacity: 0, ...MONO }}
        >
          <div className="uppercase" style={{ fontSize: '8px', letterSpacing: '0.2em', color: '#3a5060' }}>
            Entering Orbit
          </div>
          <div style={{ marginTop: '8px', fontSize: '20px', fontWeight: 700, color: '#c8d4e0', letterSpacing: '0.04em' }}>
            Allen&apos;s World
          </div>
          <div style={{ marginTop: '8px', fontSize: '9px', letterSpacing: '0.1em', color: '#2a3a48' }}>
            Signal acquired · Approach vector locked
          </div>
        </div>

        {/* Scroll hint */}
        <div
          ref={hintRef}
          className="pointer-events-none absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1"
          style={{ opacity: 0, ...MONO }}
        >
          <span className="uppercase" style={{ fontSize: '8px', letterSpacing: '0.2em', color: '#1a2535' }}>
            Scroll to travel
          </span>
          <span className="intro-arrow-bob" style={{ fontSize: '10px', color: '#1a2535' }}>↓</span>
        </div>

        {/* Atmosphere-entry vignette */}
        <div
          ref={vignetteRef}
          className="pointer-events-none absolute inset-0 z-40"
          style={{ opacity: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(200,100,20,0.3) 100%)' }}
        />

        {/* THE FLASH */}
        <div ref={flashRef} className="pointer-events-none absolute inset-0 z-50 bg-white" style={{ opacity: 0 }} />

        {/* Shockwave ring (rides on top of the flash) */}
        <div
          ref={shockRef}
          className="pointer-events-none absolute left-1/2 top-1/2 z-50 rounded-full"
          style={{ width: '24px', height: '24px', border: '2px solid #ffffff', opacity: 0, transform: 'translate(-50%, -50%) scale(0)' }}
        />

        {/* Beat 8 — welcome text */}
        <div
          ref={welcomeRef}
          className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ opacity: 0, ...MONO }}
        >
          <div className="uppercase" style={{ fontSize: '9px', letterSpacing: '0.2em', color: '#3a5060' }}>
            Welcome to
          </div>
          <div className="uppercase" style={{ marginTop: '10px', fontSize: '18px', fontWeight: 700, letterSpacing: '0.1em', color: '#e8a040', textShadow: '0 0 18px rgba(232,160,64,0.5)' }}>
            Allen&apos;s World
          </div>
        </div>
      </div>
    </div>
  );
}
