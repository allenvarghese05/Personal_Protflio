'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { AsciiGlitchRipple } from '@/components/ui/AsciiGlitchRipple';

/**
 * Boot sequence — typed out line by line. `line` types a terminal line
 * character-by-character; `phase` advances the cinematic; `hot` is the
 * brighter ignition colour.
 */
const SEQUENCE = [
  { line: '> PRE-FLIGHT CHECK' },
  { line: '> flight systems ...... OK' },
  { line: '> guidance · uplink ... OK' },
  { phase: 'ignition' },
  { line: '> IGNITION INITIATED', hot: true },
  { line: '> main engine ........ LIT', hot: true },
  { phase: 'ready' },
  { line: '> UPLINK STABLE' },
];

const CHAR_MS = 22;
const LINE_PAUSE_MS = 230;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Live mission clock — counts up from mount, formatted T+MM:SS. */
function MissionClock() {
  const t0 = useRef(performance.now());
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf;
    const tick = () => {
      setT((performance.now() - t0.current) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(Math.floor(t % 60)).padStart(2, '0');
  const cs = String(Math.floor((t * 100) % 100)).padStart(2, '0');
  return (
    <span className="tabular-nums">
      T+{mm}:{ss}.{cs}
    </span>
  );
}

/** Targeting reticle — four corner brackets that frame the vessel. */
function Reticle({ show }) {
  const corner = (pos) => {
    const base = 'absolute h-7 w-7 border-[var(--gold)]/60';
    const map = {
      tl: 'left-0 top-0 border-l-2 border-t-2',
      tr: 'right-0 top-0 border-r-2 border-t-2',
      bl: 'bottom-0 left-0 border-b-2 border-l-2',
      br: 'bottom-0 right-0 border-b-2 border-r-2',
    };
    return <span className={`${base} ${map[pos]}`} />;
  };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.15 }}
      animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 1.15 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none absolute left-1/2 top-[58%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 sm:h-52 sm:w-52"
      style={{ filter: 'drop-shadow(0 0 8px rgba(245,181,68,0.35))' }}
    >
      {corner('tl')}
      {corner('tr')}
      {corner('bl')}
      {corner('br')}
      {/* center tick marks */}
      <span className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-[var(--gold)]/50" />
      <span className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-[var(--gold)]/50" />
    </motion.div>
  );
}

export default function LoadingScreen() {
  const phase = useStore((s) => s.phase);
  const setPhase = useStore((s) => s.setPhase);
  const setRattle = useStore((s) => s.setRattle);
  const [lines, setLines] = useState([]);

  // Run the typed boot sequence
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLines([]);
      for (const step of SEQUENCE) {
        if (cancelled) return;
        if (step.phase) {
          setPhase(step.phase);
          await wait(140);
          continue;
        }
        const text = step.line;
        setLines((prev) => [...prev, { text: '', hot: step.hot, done: false }]);
        for (let i = 1; i <= text.length; i++) {
          if (cancelled) return;
          setLines((prev) => {
            const n = [...prev];
            n[n.length - 1] = { ...n[n.length - 1], text: text.slice(0, i) };
            return n;
          });
          await wait(CHAR_MS);
        }
        setLines((prev) => {
          const n = [...prev];
          n[n.length - 1] = { ...n[n.length - 1], done: true };
          return n;
        });
        await wait(LINE_PAUSE_MS);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [setPhase]);

  // Rattle the rocket if the user tries to rush the launch during boot/ignition
  useEffect(() => {
    const onEarly = () => {
      if (phase === 'boot' || phase === 'ignition') setRattle(performance.now());
    };
    window.addEventListener('wheel', onEarly, { passive: true });
    window.addEventListener('touchmove', onEarly, { passive: true });
    return () => {
      window.removeEventListener('wheel', onEarly);
      window.removeEventListener('touchmove', onEarly);
    };
  }, [phase, setRattle]);

  const intro = phase === 'boot' || phase === 'ignition' || phase === 'ready';
  const ready = phase === 'ready';
  const armed = phase === 'ignition' || phase === 'ready';

  return (
    <AnimatePresence>
      {intro && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[100]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          {/* Cinematic letterbox bars — retract as the launch fires */}
          <motion.div
            className="absolute inset-x-0 top-0 bg-black"
            initial={{ height: '10vh' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            style={{ height: '8vh' }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 bg-black"
            initial={{ height: '10vh' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            style={{ height: '8vh' }}
          />

          {/* Targeting reticle around the vessel (frames once the engine arms) */}
          <Reticle show={armed} />

          {/* Top-left mission block + live clock */}
          <div className="absolute left-6 top-6 sm:left-8 sm:top-8">
            <div className="font-mono text-[10px] tracking-[0.4em] text-[var(--text-dim)]">
              MISSION ALLEN · ASV-01
            </div>
            <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-[var(--steel-bright)]">
              <span
                className="pulse-soft h-1.5 w-1.5 rounded-full bg-[#5affa0]"
                style={{ boxShadow: '0 0 8px #5affa0' }}
              />
              <MissionClock />
            </div>
          </div>

          {/* Top-right telemetry HUD */}
          <div className="absolute right-6 top-6 text-right sm:right-8 sm:top-8">
            <AsciiGlitchRipple
              as="div"
              autoStart
              spread={1.3}
              className="font-mono text-[10px] tracking-[0.4em] text-[var(--gold)]"
              style={{ textShadow: '0 0 12px rgba(245,181,68,0.55)' }}
            >
              FLIGHT TELEMETRY
            </AsciiGlitchRipple>

            <div className="mt-3 font-mono text-[11px] leading-relaxed sm:text-xs">
              {lines.map((l, i) => (
                <div
                  key={i}
                  style={{
                    color: l.hot ? '#ffb259' : '#e6c483',
                    textShadow: l.hot
                      ? '0 0 10px rgba(255,138,61,0.6)'
                      : '0 0 8px rgba(245,181,68,0.4)',
                  }}
                >
                  {l.text}
                  {i === lines.length - 1 && !l.done && (
                    <span className="cursor-blink">▋</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Center-bottom scroll prompt (Act III) */}
          <AnimatePresence>
            {ready && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute bottom-[12vh] left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
              >
                <span
                  className="pulse-soft font-mono text-xs font-semibold tracking-[0.25em]"
                  style={{ color: '#ffd27a', textShadow: '0 0 14px rgba(255,170,80,0.65)' }}
                >
                  SCROLL TO INITIATE ASCENT
                </span>
                <div className="scroll-bob flex h-9 w-5 justify-center rounded-full border border-[var(--gold)]/45 pt-1.5">
                  <div className="h-1.5 w-1 rounded-full bg-[var(--gold)]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
