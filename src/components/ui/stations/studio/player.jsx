'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { STUDIO } from '@/data/studio';

/**
 * The Studio's audio engine — ONE <audio> element for every beat, routed
 * through a Web Audio AnalyserNode so the visuals react to the real sound.
 * Also wires the Media Session API (OS media keys / lock screen) and
 * auto-advances to the next beat.
 */
const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }) {
  const tracks = STUDIO.tracks;
  const audio = useRef(null);
  const graph = useRef(null); // { ctx, analyser, data }
  const [index, setIndex] = useState(null); // current beat
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false); // the full-screen Now Playing view

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
      if (i !== undefined && i !== index) {
        a.src = tracks[i].src;
        setIndex(i);
      }
      a.play().catch(() => {});
    },
    [ensureGraph, index, tracks]
  );
  const pause = useCallback(() => audio.current?.pause(), []);
  const toggle = useCallback(() => (audio.current?.paused ? play() : pause()), [play, pause]);
  const step = useCallback(
    (d) => {
      if (index === null) return;
      play((index + d + tracks.length) % tracks.length);
    },
    [index, play, tracks.length]
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

  // Media Session — OS media keys + lock-screen card
  useEffect(() => {
    if (index === null || !('mediaSession' in navigator)) return;
    const t = tracks[index];
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({ title: t.title, artist: STUDIO.artist, album: 'Studio' });
      navigator.mediaSession.setActionHandler('play', () => play());
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
      navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
    } catch {
      /* optional API */
    }
  }, [index, tracks, play, pause, step]);

  // Leaving the Studio stops the music and releases the audio graph
  useEffect(
    () => () => {
      audio.current?.pause();
      graph.current?.ctx.close?.();
    },
    []
  );

  const value = useMemo(
    () => ({ tracks, index, playing, open, setOpen, play, pause, toggle, step, seek, openTrack, audio, graph }),
    [tracks, index, playing, open, play, pause, toggle, step, seek, openTrack]
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
