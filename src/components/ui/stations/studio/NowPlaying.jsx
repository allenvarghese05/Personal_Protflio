'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePlayer, readEnergy } from './player';
import Cover, { COVER_THEMES } from './Cover';
import { STUDIO, formatTime } from '@/data/studio';

const EASE = [0.16, 1, 0.3, 1];

/**
 * Full-screen Now Playing. The cover grows out of its row (shared layout),
 * a colour glow breathes with the bass, one frequency line moves with the
 * music, and the scrub bar is the beat's real waveform. Calm by design —
 * one accent, slow easing, nothing flashing.
 */

/** The live frequency line — a single smoothed curve across the spectrum. */
function FrequencyLine({ color, still }) {
  const { graph } = usePlayer();
  const canvas = useRef(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = c.clientWidth * dpr;
    const H = c.clientHeight * dpr;
    c.width = W;
    c.height = H;
    const N = 72;
    const smooth = new Float32Array(N);
    let raf;
    const draw = () => {
      const { data } = still ? { data: null } : readEnergy(graph);
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        // log-ish mapping: more resolution in the lows where the beat lives
        const bin = Math.floor(Math.pow(i / N, 1.8) * 180) + 1;
        const v = data ? data[bin] / 255 : 0;
        smooth[i] += (v - smooth[i]) * 0.25;
      }
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.18, color);
      grad.addColorStop(0.82, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2 * dpr;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14 * dpr;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = (i / (N - 1)) * W;
        const y = H * 0.62 - smooth[i] * H * 0.55 * Math.sin((i / (N - 1)) * Math.PI);
        if (i === 0) ctx.moveTo(x, y);
        else {
          const px = ((i - 1) / (N - 1)) * W;
          const py = H * 0.62 - smooth[i - 1] * H * 0.55 * Math.sin(((i - 1) / (N - 1)) * Math.PI);
          ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
        }
      }
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [graph, color, still]);
  return <canvas ref={canvas} className="h-20 w-full" aria-hidden />;
}

function WaveBars({ peaks, color }) {
  return (
    <div className="flex h-full items-center gap-[2px]">
      {peaks.map((v, i) => (
        <span key={i} className="flex-1 rounded-full" style={{ height: `${14 + v * 86}%`, background: color }} />
      ))}
    </div>
  );
}

/** Scrub bar drawn from the real waveform; click or drag to seek. */
function Scrubber({ track, color }) {
  const { audio, seek } = usePlayer();
  const fill = useRef(null);
  const cur = useRef(null);
  const bar = useRef(null);
  useEffect(() => {
    let raf;
    const tick = () => {
      const a = audio.current;
      const d = a?.duration || track.duration;
      const p = a && d ? a.currentTime / d : 0;
      if (fill.current) fill.current.style.clipPath = `inset(0 ${100 - p * 100}% 0 0)`;
      if (cur.current) cur.current.textContent = formatTime(a?.currentTime || 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [audio, track.duration]);

  const seekAt = (clientX) => {
    const r = bar.current.getBoundingClientRect();
    const d = audio.current?.duration || track.duration;
    seek(((clientX - r.left) / r.width) * d);
  };
  const onDown = (e) => {
    seekAt(e.clientX);
    const move = (ev) => seekAt(ev.clientX);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div>
      <div ref={bar} onPointerDown={onDown} className="relative h-12 cursor-pointer touch-none" title="Click or drag to seek (← → from the keyboard)">
        <WaveBars peaks={track.peaks} color="var(--line-hi)" />
        <div ref={fill} className="absolute inset-0" style={{ clipPath: 'inset(0 100% 0 0)' }}>
          <WaveBars peaks={track.peaks} color={color} />
        </div>
      </div>
      <div className="mt-2 flex justify-between font-mono text-micro tabular-nums text-ink-subtle">
        <span ref={cur}>0:00</span>
        <span>{formatTime(track.duration)}</span>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children, big = false }) {
  return (
    <button onClick={onClick} aria-label={label} className={big ? 'np-play' : 'np-btn'}>
      {children}
    </button>
  );
}

export default function NowPlaying() {
  const { tracks, index, playing, open, setOpen, toggle, step, seek, audio, graph } = usePlayer();
  const reduced = useReducedMotion();
  const glow = useRef(null);
  const coverWrap = useRef(null);
  const track = index !== null ? tracks[index] : null;
  const theme = track ? COVER_THEMES[track.mood] || COVER_THEMES.warm : COVER_THEMES.warm;

  // The glow breathes with the bass (written straight to the DOM — no renders)
  useEffect(() => {
    if (!open || reduced) return;
    let raf;
    let b = 0;
    const tick = () => {
      const { bass } = readEnergy(graph);
      b += (bass - b) * 0.18;
      if (glow.current) {
        glow.current.style.transform = `translate(-50%, -50%) scale(${1 + b * 0.35})`;
        glow.current.style.opacity = String(0.35 + b * 0.55);
      }
      if (coverWrap.current) coverWrap.current.style.transform = `scale(${1 + b * 0.018})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, reduced, graph]);

  // Keys — capture phase so Esc closes this view, not the whole room
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      const a = audio.current;
      if (e.key === 'Escape') setOpen(false);
      else if (e.key === ' ') toggle();
      else if (e.key === 'ArrowRight' && a) seek(a.currentTime + 5);
      else if (e.key === 'ArrowLeft' && a) seek(a.currentTime - 5);
      else if (e.key === 'n' || e.key === 'N') step(1);
      else if (e.key === 'p' || e.key === 'P') step(-1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, audio, setOpen, toggle, seek, step]);

  return (
    <AnimatePresence>
      {open && track && (
        <motion.div
          className="fixed inset-0 z-[60] overflow-hidden bg-void"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.5, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: EASE, delay: 0.1 } }}
          role="dialog"
          aria-modal="true"
          aria-label={`Now playing: ${track.title}`}
        >
          {/* the breathing colour field */}
          <div
            ref={glow}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[120vmax] w-[120vmax] rounded-full"
            style={{
              transform: 'translate(-50%, -50%)',
              opacity: 0.4,
              background: `radial-gradient(circle, ${theme.glow} 0%, transparent 55%)`,
              transition: 'background 1.2s ease',
            }}
          />
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(90% 70% at 50% 50%, transparent 30%, rgba(7,8,12,0.85) 100%)' }} />

          {/* top bar */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-10">
            <button onClick={() => setOpen(false)} className="skip-btn" style={{ paddingRight: '1rem' }}>
              ↓ Close <span className="skip-btn__key">Esc</span>
            </button>
            <span className="font-mono text-micro uppercase tracking-[0.22em] text-ink-subtle">
              Studio · Now playing · {String(index + 1).padStart(2, '0')}/{String(tracks.length).padStart(2, '0')}
            </span>
          </div>

          {/* stage */}
          <div className="relative z-10 mx-auto grid h-[calc(100%-5rem)] max-w-6xl grid-cols-1 items-center gap-8 px-6 pb-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div className="flex justify-center">
              <div ref={coverWrap} className="w-[min(72vw,42vh,440px)] will-change-transform lg:w-[min(40vw,58vh,520px)]">
                <motion.div layoutId={`cover-${index}`} className="overflow-hidden rounded-2xl shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]" transition={{ duration: 0.7, ease: EASE }}>
                  <Cover track={track} index={index} className="block h-auto w-full" />
                </motion.div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                className="flex min-w-0 flex-col"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE, delay: 0.15 } }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
              >
                <span className="font-mono text-micro uppercase tracking-[0.22em]" style={{ color: theme.ring }}>
                  {track.genre}
                </span>
                <h2 className="font-display mt-3 text-5xl font-semibold leading-[1] tracking-[-0.04em] text-ink sm:text-7xl">{track.title}</h2>
                <span className="mt-3 text-lg text-ink-muted">{STUDIO.artist}</span>

                <div className="mt-8">
                  <FrequencyLine color={theme.ring} still={reduced || !playing} />
                </div>
                <div className="mt-2">
                  <Scrubber track={track} color={theme.ring} />
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <IconBtn label="Previous" onClick={() => step(-1)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
                  </IconBtn>
                  <IconBtn label={playing ? 'Pause' : 'Play'} onClick={toggle} big>
                    {playing ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </IconBtn>
                  <IconBtn label="Next" onClick={() => step(1)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
                  </IconBtn>
                  <span className="ml-2 hidden font-mono text-micro uppercase tracking-[0.16em] text-ink-subtle sm:inline">
                    Space · ← → seek · N / P
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
