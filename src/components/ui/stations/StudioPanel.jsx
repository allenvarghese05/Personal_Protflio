'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STUDIO, PLACEHOLDER_COUNT } from '@/data/studio';
import { StationHeader, stagger, rise } from './shared';

/**
 * The Studio — photography, film and sound. Real media comes from
 * data/studio.js; until it's added each tab shows designed placeholder
 * frames so the room reads as intentional, not empty.
 */

const TABS = [
  { id: 'photos', label: 'Photography' },
  { id: 'films', label: 'Film' },
  { id: 'tracks', label: 'Sound' },
];

// Varied frame proportions so the placeholder wall reads like a real edit
const RATIOS = ['4 / 5', '3 / 2', '1 / 1', '2 / 3', '16 / 10', '4 / 5', '3 / 2', '5 / 4', '2 / 3'];

function Placeholder({ ratio, label, i }) {
  return (
    <div className="studio-ph" style={{ aspectRatio: ratio, '--ph-hue': i }}>
      <span className="font-mono text-micro uppercase tracking-[0.2em] text-ink-subtle">{label}</span>
    </div>
  );
}

/* ── Photography ──────────────────────────────────────────────────────── */

function Lightbox({ photos, index, onClose, onStep }) {
  // capture phase: Esc/arrows here must not also close the whole room
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onStep(1);
      else if (e.key === 'ArrowLeft') onStep(-1);
      else return;
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, onStep]);
  const p = photos[index];
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void/95 p-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.src} alt={p.title || 'Photograph'} className="max-h-[80vh] max-w-full rounded-md object-contain" onClick={(e) => e.stopPropagation()} />
      <div className="mt-4 text-center">
        {p.title && <div className="font-display text-lg text-ink">{p.title}</div>}
        {p.meta && <div className="font-mono text-micro uppercase tracking-[0.16em] text-ink-subtle">{p.meta}</div>}
      </div>
      <div className="mt-4 flex gap-3">
        <button className="skip-btn" style={{ paddingRight: '1rem' }} onClick={(e) => (e.stopPropagation(), onStep(-1))}>← Prev</button>
        <button className="skip-btn" style={{ paddingRight: '1rem' }} onClick={(e) => (e.stopPropagation(), onStep(1))}>Next →</button>
      </div>
    </motion.div>
  );
}

function Photos() {
  const [open, setOpen] = useState(null);
  const photos = STUDIO.photos;
  if (!photos.length) {
    return (
      <div className="studio-masonry">
        {Array.from({ length: PLACEHOLDER_COUNT.photos }).map((_, i) => (
          <motion.div key={i} variants={rise}>
            <Placeholder ratio={RATIOS[i % RATIOS.length]} label={`Photograph ${String(i + 1).padStart(2, '0')}`} i={i} />
          </motion.div>
        ))}
      </div>
    );
  }
  return (
    <>
      <div className="studio-masonry">
        {photos.map((p, i) => (
          <motion.button key={p.src} variants={rise} onClick={() => setOpen(i)} className="studio-photo" aria-label={`Open photograph ${i + 1}`}>
            {/* grid shows the light thumbnail; the lightbox loads the full size */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb || p.src} alt={p.title || 'Photograph'} width={p.w} height={p.h} loading="lazy" decoding="async" />
            {(p.title || p.meta) && <span className="studio-photo__cap">{p.title || p.meta}</span>}
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {open !== null && (
          <Lightbox
            photos={photos}
            index={open}
            onClose={() => setOpen(null)}
            onStep={(d) => setOpen((i) => (i + d + photos.length) % photos.length)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Film ─────────────────────────────────────────────────────────────── */

function Films() {
  const films = STUDIO.films;
  const items = films.length ? films : Array.from({ length: PLACEHOLDER_COUNT.films }).map(() => null);
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {items.map((f, i) => (
        <motion.div key={f?.embed || i} variants={rise}>
          <div className="overflow-hidden rounded-panel border border-line">
            {f ? (
              <iframe
                src={f.embed}
                title={f.title}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <Placeholder ratio="16 / 9" label={`Film ${String(i + 1).padStart(2, '0')}`} i={i + 3} />
            )}
          </div>
          <div className="mt-3 font-display text-base font-semibold text-ink">{f?.title || 'Coming soon'}</div>
          {f?.meta && <div className="font-mono text-micro uppercase tracking-[0.16em] text-ink-subtle">{f.meta}</div>}
        </motion.div>
      ))}
    </div>
  );
}

/* ── Sound ────────────────────────────────────────────────────────────── */

function waveform(seed, n = 64) {
  const out = [];
  let x = seed * 9301 + 49297;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    out.push(0.25 + 0.75 * Math.abs(Math.sin(i * 0.35 + seed)) * (0.5 + r * 0.5));
  }
  return out;
}

function Track({ track, index }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const bars = useMemo(() => waveform(index + 1), [index]);
  const disabled = !track;

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      document.querySelectorAll('audio[data-studio]').forEach((o) => o !== a && o.pause());
      a.play();
    } else a.pause();
  };

  return (
    <motion.div variants={rise} className={`studio-track ${disabled ? 'is-disabled' : ''}`}>
      <button onClick={toggle} disabled={disabled} className="studio-track__play" aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate font-display text-base font-semibold text-ink">{track?.title || `Track ${String(index + 1).padStart(2, '0')}`}</span>
          <span className="shrink-0 font-mono text-micro uppercase tracking-[0.14em] text-ink-subtle">{track?.meta || 'Coming soon'}</span>
        </div>
        <div className="mt-2 flex h-8 items-center gap-[2px]">
          {bars.map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-full"
              style={{
                height: `${h * 100}%`,
                background: i / bars.length < progress ? 'var(--accent)' : 'var(--line-hi)',
              }}
            />
          ))}
        </div>
      </div>
      {track && (
        <audio
          ref={audio}
          data-studio
          src={track.src}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => (setPlaying(false), setProgress(0))}
          onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
        />
      )}
    </motion.div>
  );
}

function Tracks() {
  const tracks = STUDIO.tracks;
  const items = tracks.length ? tracks : Array.from({ length: PLACEHOLDER_COUNT.tracks }).map(() => null);
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      {items.map((t, i) => (
        <Track key={t?.src || i} track={t} index={i} />
      ))}
    </div>
  );
}

export default function StudioPanel() {
  const [tab, setTab] = useState('photos');
  return (
    <motion.article variants={stagger} initial="hidden" animate="show" className="w-full">
      <StationHeader kicker="Studio" title={STUDIO.intro}>
        <div role="tablist" aria-label="Studio sections" className="world-dock w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`world-dock__item ${tab === t.id ? 'is-here' : ''}`}
            >
              <span className="world-dock__dot" aria-hidden />
              {t.label}
            </button>
          ))}
        </div>
      </StationHeader>

      <div className="mx-auto max-w-6xl border-t border-line px-6 pb-16 pt-10 sm:px-12">
        <AnimatePresence mode="wait">
          <motion.div key={tab} variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            {tab === 'photos' && <Photos />}
            {tab === 'films' && <Films />}
            {tab === 'tracks' && <Tracks />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
