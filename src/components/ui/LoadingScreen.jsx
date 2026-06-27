'use client';
import { useState, useEffect } from 'react';
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

const CHAR_MS = 26;
const LINE_PAUSE_MS = 280;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
          {/* Top-right telemetry HUD */}
          <div className="absolute right-6 top-6 text-right sm:right-8 sm:top-8">
            <AsciiGlitchRipple
              as="div"
              autoStart
              spread={1.3}
              className="font-mono text-[10px] tracking-[0.4em] text-[var(--gold)]"
              style={{ textShadow: '0 0 12px rgba(245,181,68,0.55)' }}
            >
              MISSION ALLEN
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
                className="absolute bottom-12 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
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
