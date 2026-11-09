'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { ARTIST } from '@/data/beats';
import { usePlayer } from './player';
import Cover, { COVER_THEMES } from './Cover';

const EASE = [0.16, 1, 0.3, 1];

/**
 * The mini player: once a beat has started, it waits in the corner while the
 * visitor moves through the site (other rooms, the world, /projects). The
 * cover and title open the full-screen player again; × stops the music and
 * puts it away. It hides while the full-screen player (or the photo viewer)
 * is open and during the intro, and rises above the world's dock when that's
 * on screen. While a room is open it's rendered inside the room's dialog, so
 * it stays reachable to keyboards and screen readers.
 */
export default function MiniPlayer() {
  const { tracks, index, playing, open, setOpen, toggle, step, audio, dismissed, dismiss } = usePlayer();
  const pathname = usePathname();
  const onHome = pathname === '/';
  const dock = useStore((s) => s.journeyPhase === 'world' && !s.enteredZone && s.tier !== 'base') && onHome;
  const intro = useStore((s) => s.journeyPhase !== 'world') && onHome;
  const viewer = useStore((s) => s.viewerOpen);
  const room = useStore((s) => s.enteredZone);
  // the open room's dialog, once it's in the page
  const [found, setFound] = useState(null);
  useEffect(() => {
    if (!room) return undefined;
    const find = () => setFound(document.querySelector('.mc-root'));
    const raf = requestAnimationFrame(find);
    const t = setTimeout(find, 60);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [room]);
  const host = room && found?.isConnected ? found : null;
  const reduced = useReducedMotion();
  const fill = useRef(null);
  const track = index !== null ? tracks[index] : null;
  const show = !!track && !open && !dismissed && !intro && !viewer;
  const theme = track ? COVER_THEMES[track.mood] || COVER_THEMES.warm : COVER_THEMES.warm;

  // the progress line, straight from the audio element (no React renders)
  useEffect(() => {
    if (!show) return undefined;
    let raf;
    const tick = () => {
      const a = audio.current;
      const d = a?.duration || track?.duration || 0;
      if (fill.current) fill.current.style.transform = `scaleX(${d ? Math.min(1, (a?.currentTime || 0) / d) : 0})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show, audio, track]);

  const ui = (
    <AnimatePresence>
      {show && (
        <motion.div
          key="mini-player"
          role="region"
          aria-label="Music player"
          className={`mini-player ${dock ? 'is-raised' : ''}`}
          initial={{ opacity: 0, y: reduced ? 0 : 24 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } }}
          exit={{ opacity: 0, y: reduced ? 0 : 16, transition: { duration: 0.25 } }}
        >
          <button onClick={() => setOpen(true)} className="mini-player__open" aria-label={`Open the player: ${track.title}`}>
            <span className="mini-player__art">
              <Cover track={track} index={index} className="block h-full w-full" showText={false} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate font-display text-[0.95rem] font-semibold leading-tight text-ink">{track.title}</span>
              <span className="mt-0.5 block truncate text-xs text-ink-subtle">
                {playing ? (
                  <span className="mr-1.5 inline-flex align-middle np-eq" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                ) : null}
                {ARTIST}
              </span>
            </span>
          </button>

          <div className="flex shrink-0 items-center">
            <button onClick={() => step(-1)} className="mini-player__btn mini-player__btn--prev" aria-label="Previous beat">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M6 5h2v14H6zM20 5v14L9 12z" />
              </svg>
            </button>
            <button onClick={toggle} className="mini-player__btn mini-player__btn--main" aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button onClick={() => step(1)} className="mini-player__btn" aria-label="Next beat">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
              </svg>
            </button>
            <button onClick={dismiss} className="mini-player__btn mini-player__btn--close" aria-label="Stop and close the player">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <span className="mini-player__bar" aria-hidden>
            <span ref={fill} style={{ background: theme.ring }} />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
  return host ? createPortal(ui, host) : ui;
}
