'use client';
import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { STUDIO, PLACEHOLDER_COUNT, formatTime } from '@/data/studio';
import { StationHeader, stagger, rise } from './shared';
import PhotoViewer from './studio/PhotoViewer';
import NowPlaying from './studio/NowPlaying';
import Cover from './studio/Cover';
import { PlayerProvider, usePlayer } from './studio/player';

/**
 * The Studio — photography, film and sound. Photos open into an immersive
 * viewer (zoom out of the grid, the shot's full story top right); beats open
 * a full-screen Now Playing with generated covers and audio-reactive visuals.
 * Media + metadata come from data/studio.js (+ the generated manifest).
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

function Photos() {
  const [view, setView] = useState(null); // { index, from }
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
          <motion.button
            key={p.src}
            variants={rise}
            onClick={() => setView({ index: i, from: i })}
            className="studio-photo"
            aria-label={`Open photograph ${i + 1}${p.place ? ` · ${p.place}` : ''}`}
          >
            {/* the tile the viewer zooms out of (and back into) */}
            <motion.div layoutId={`photo-${i}`} className="studio-photo__frame" transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb || p.src} alt={p.title || `Photograph · ${p.camera}`} width={p.w} height={p.h} loading="lazy" decoding="async" />
            </motion.div>
            <span className="studio-photo__cap">
              <span className="text-ink">{p.camera}</span>
              {p.place && <span className="text-ink-muted"> · {p.place}</span>}
            </span>
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {view && (
          <PhotoViewer
            photos={photos}
            index={view.index}
            openedFrom={view.from}
            onClose={() => setView(null)}
            onGo={(i) => setView((v) => ({ ...v, index: i }))}
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

/** The small waveform on a track row — the beat's real envelope. */
function RowWave({ peaks, active }) {
  const bars = peaks.filter((_, i) => i % 2 === 0);
  return (
    <div className="flex h-7 items-center gap-[2px]">
      {bars.map((v, i) => (
        <span key={i} className="flex-1 rounded-full" style={{ height: `${16 + v * 84}%`, background: active ? 'var(--accent)' : 'var(--line-hi)' }} />
      ))}
    </div>
  );
}

function PlayingBars() {
  return (
    <span className="np-eq" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

function Tracks() {
  const { tracks, index, playing, openTrack } = usePlayer();
  if (!tracks.length) {
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        {Array.from({ length: PLACEHOLDER_COUNT.tracks }).map((_, i) => (
          <motion.div key={i} variants={rise} className="studio-track is-disabled">
            <span className="studio-track__play">▶</span>
            <span className="font-display text-base font-semibold text-ink">Track {String(i + 1).padStart(2, '0')}</span>
          </motion.div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex max-w-4xl flex-col gap-2.5">
      {tracks.map((t, i) => {
        const current = i === index;
        return (
          <motion.button key={t.src} variants={rise} onClick={() => openTrack(i)} className={`studio-track text-left ${current ? 'is-current' : ''}`}>
            <motion.div layoutId={`cover-${i}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-md" transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <Cover track={t} index={i} className="block h-full w-full" showText={false} />
            </motion.div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 truncate font-display text-base font-semibold text-ink">
                  {current && playing && <PlayingBars />}
                  {t.title}
                </span>
                <span className="shrink-0 font-mono text-micro uppercase tracking-[0.14em] text-ink-subtle">
                  {t.genre} · {formatTime(t.duration)}
                </span>
              </div>
              <div className="mt-1.5">
                <RowWave peaks={t.peaks} active={current} />
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

export default function StudioPanel() {
  return (
    <PlayerProvider>
      <LayoutGroup>
        <StudioRoom />
        <NowPlaying />
      </LayoutGroup>
    </PlayerProvider>
  );
}

function StudioRoom() {
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
