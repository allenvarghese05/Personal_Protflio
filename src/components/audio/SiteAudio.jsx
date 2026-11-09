'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { MotionConfig } from 'framer-motion';
import { PlayerProvider, usePlayer } from '@/components/ui/stations/studio/player';

// The full-screen player and the mini player only load once a beat has been
// started, so pages that never play music don't carry them.
const NowPlaying = dynamic(() => import('@/components/ui/stations/studio/NowPlaying'), { ssr: false });
const MiniPlayer = dynamic(() => import('@/components/ui/stations/studio/MiniPlayer'), { ssr: false });

/**
 * The Studio's music, for the whole site: one player at the root, so a beat
 * started in the Studio keeps playing through the other rooms and onto
 * /projects. The full-screen Now Playing and the mini player live here too.
 */
export default function SiteAudio({ children }) {
  return (
    <PlayerProvider>
      {children}
      <Players />
    </PlayerProvider>
  );
}

function Players() {
  const { index } = usePlayer();
  if (index === null) return null;
  return (
    <MotionConfig reducedMotion="user">
      <MiniPlayer />
      <NowPlaying />
    </MotionConfig>
  );
}

/** The world stays one step back in history (/?world=1), so the browser's
 *  Back lands on the surface rather than replaying the intro. */
export function keepWorldInHistory() {
  if (window.location.pathname === '/') window.history.replaceState(window.history.state, '', '/?world=1');
}

/**
 * A link to another page that keeps the music going. With no beat loaded
 * it's a full page load (leaving the 3D world that way frees it completely);
 * with one loaded (playing or paused in the mini player) it navigates in
 * place, so the music and the mini player carry on. Always the same element,
 * so focus never jumps when the music starts or stops.
 */
export function PageLink({ href, onClick, children, ...rest }) {
  const { index, dismissed } = usePlayer() || {};
  const keep = index !== null && index !== undefined && !dismissed;
  const go = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!keep) {
      e.preventDefault();
      window.location.assign(href);
      return;
    }
    keepWorldInHistory();
  };
  return (
    <Link href={href} prefetch={keep ? undefined : false} onClick={go} {...rest}>
      {children}
    </Link>
  );
}
