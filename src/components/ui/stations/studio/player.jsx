'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ARTIST, BEATS } from '@/data/beats';

/**
 * The site's audio engine — ONE <audio> element for every beat, routed
 * through a Web Audio AnalyserNode so the visuals react to the real sound.
 * It sits at the root of the site (see components/audio/SiteAudio), so a
 * beat keeps playing from room to room and onto /projects, with the mini
 * player in the corner. Also wires the Media Session API (OS media keys /
 * lock screen), shuffle, and auto-advances to the next beat.
 */
const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }) {
  const tracks = BEATS;
  const audio = useRef(null);
  const graph = useRef(null); // { ctx, analyser, data }
  const [index, setIndex] = useState(null); // current beat
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false); // the full-screen Now Playing view
  const [shuffle, setShuffle] = useState(false);
  const order = useRef(null); // the shuffled play order, while shuffle is on
  const [dismissed, setDismissed] = useState(false); // the mini player was closed

  // Build the analyser lazily, on the first user-initiated play (browsers
  // only allow an AudioContext to start from a gesture).
  const ensureGraph = useCallback(() => {
    if (graph.current || !audio.current) return graph.current;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaElementSource(audio.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      graph.current = { ctx, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
    } catch {
      graph.current = null; // visuals fall back to still — audio still plays
    }
    return graph.current;
  }, []);

  const play = useCallback(
    (i) => {
      const a = audio.current;
      if (!a) return;
      const g = ensureGraph();
      g?.ctx.resume?.();
      const to = i ?? index ?? 0;
      if (to !== index || !a.src) {
        a.src = tracks[to].src;
        setIndex(to);
      }
      setDismissed(false);
      a.play().catch(() => {});
    },
    [ensureGraph, index, tracks]
  );
  const pause = useCallback(() => audio.current?.pause(), []);
  const toggle = useCallback(() => (audio.current?.paused ? play() : pause()), [play, pause]);
  // next / previous: through the shuffled order while shuffle is on
  const step = useCallback(
    (d) => {
      if (index === null) return;
      const n = tracks.length;
      const seq = shuffle && order.current;
      if (seq) play(seq[(seq.indexOf(index) + d + n) % n]);
      else play((index + d + n) % n);
    },
    [index, play, shuffle, tracks.length]
  );
  const seek = useCallback((t) => {
    const a = audio.current;
    if (a && Number.isFinite(a.duration)) a.currentTime = Math.max(0, Math.min(a.duration, t));
  }, []);

  /** Open the full-screen view on a beat (and start it). */
  const openTrack = useCallback(
    (i) => {
      setOpen(true);
      if (i !== index || audio.current?.paused) play(i);
    },
    [index, play]
  );

  /** Play the whole tape from the top, or shuffled, in the full-screen view. */
  const playAll = useCallback(
    ({ shuffled = false } = {}) => {
      setShuffle(shuffled);
      let first = 0;
      if (shuffled) {
        const seq = tracks.map((_, i) => i);
        for (let i = seq.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [seq[i], seq[j]] = [seq[j], seq[i]];
        }
        order.current = seq;
        first = seq[0];
      } else order.current = null;
      setOpen(true);
      play(first);
    },
    [play, tracks]
  );

  /** Shuffle on or off without stopping the beat: on builds a random order
   *  that starts from the beat that's playing; off goes back to tape order. */
  const toggleShuffle = useCallback(() => {
    if (shuffle) {
      order.current = null;
      setShuffle(false);
      return;
    }
    const rest = tracks.map((_, i) => i).filter((i) => i !== index);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    order.current = index === null ? rest : [index, ...rest];
    setShuffle(true);
  }, [shuffle, tracks, index]);

  /** The mini player's close: stop, and put it away until the next play. */
  const dismiss = useCallback(() => {
    audio.current?.pause();
    setDismissed(true);
  }, []);

  // Media Session — OS media keys + lock-screen card
  useEffect(() => {
    if (index === null || !('mediaSession' in navigator)) return;
    const t = tracks[index];
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({ title: t.title, artist: ARTIST, album: 'Studio' });
      navigator.mediaSession.setActionHandler('play', () => play());
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
      navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
    } catch {
      /* optional API */
    }
  }, [index, tracks, play, pause, step]);

  // The provider lives for the whole visit; this only runs if it's torn down
  useEffect(
    () => () => {
      audio.current?.pause();
      graph.current?.ctx.close?.();
    },
    []
  );

  const value = useMemo(
    () => ({ tracks, index, playing, open, setOpen, shuffle, dismissed, play, pause, toggle, step, seek, openTrack, playAll, toggleShuffle, dismiss, audio, graph }),
    [tracks, index, playing, open, shuffle, dismissed, play, pause, toggle, step, seek, openTrack, playAll, toggleShuffle, dismiss]
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audio}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => step(1)}
      />
    </PlayerContext.Provider>
  );
}

/** Bass + overall energy (0..1) from the analyser, for the reactive visuals. */
export function readEnergy(graph) {
  const g = graph.current;
  if (!g) return { bass: 0, level: 0, data: null };
  g.analyser.getByteFrequencyData(g.data);
  let bass = 0;
  for (let i = 1; i < 10; i++) bass += g.data[i];
  let level = 0;
  for (let i = 0; i < 160; i++) level += g.data[i];
  return { bass: bass / (9 * 255), level: level / (160 * 255), data: g.data };
}
