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

function PlayingBars() {
  return (
    <span className="np-eq" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

/** One sleeve (the beats are a wall of covers, newest first): the beat's cover (its ring is the beat's own waveform), then
 *  its number, title and length. Opening it grows the cover into Now Playing. */
function Sleeve({ track, i }) {
  const { index, playing, openTrack } = usePlayer();
  const current = i === index;
  return (
    // the newest beat leads, twice the size, on wide screens
    <motion.li variants={rise} className={i === 0 ? 'lg:col-span-2 lg:row-span-2' : ''}>
      <button onClick={() => openTrack(i)} className={`studio-sleeve group ${current ? 'is-current' : ''}`} aria-label={`Play ${track.title}`}>
        <motion.span layoutId={`cover-${i}`} className="studio-sleeve__art" transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
          <Cover track={track} index={i} className="block h-full w-full" showText={false} />
          <span className="studio-sleeve__play" aria-hidden>
            {current && playing ? (
              <PlayingBars />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </span>
        </motion.span>
        <span className="mt-4 flex items-baseline gap-3 text-left">
          <span className="font-mono text-micro tabular-nums text-ink-subtle">{String(i + 1).padStart(2, '0')}</span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-display text-lg font-semibold tracking-[-0.01em] transition-colors duration-200 ${current ? 'text-accent' : 'text-ink'}`}>
              {track.title}
            </span>
            <span className="mt-0.5 block truncate font-mono text-micro uppercase tracking-[0.14em] text-ink-subtle">
              {formatTime(track.duration)}
            </span>
          </span>
        </span>
      </button>
    </motion.li>
  );
}

function Tracks() {
  const { tracks, index, playing, openTrack } = usePlayer();
  if (!tracks.length) {
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        {Array.from({ length: PLACEHOLDER_COUNT.tracks }).map((_, i) => (
          <motion.div key={i} variants={rise} className="studio-ph" style={{ aspectRatio: '6 / 1' }}>
            <span className="font-mono text-micro uppercase tracking-[0.2em] text-ink-subtle">Track {String(i + 1).padStart(2, '0')}</span>
          </motion.div>
        ))}
      </div>
    );
  }
  const total = tracks.reduce((s, x) => s + (x.duration || 0), 0);
  const now = index != null && playing ? tracks[index] : null;
  return (
    <div>
      <motion.div variants={rise} className="flex flex-wrap items-center justify-between gap-4">
        <span className="font-mono text-micro uppercase tracking-[0.16em] text-ink-subtle">
          {now ? (
            <>
              Now playing · <span className="text-accent">{now.title}</span>
            </>
          ) : (
            <>
              {tracks.length} beats · {formatTime(total)} · made by me
            </>
          )}
        </span>
        <button onClick={() => openTrack(index ?? 0)} className="studio-playall group">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          {now ? 'Open player' : 'Play from the top'}
        </button>
      </motion.div>

      <ol className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 border-t border-line pt-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
        {tracks.map((t, i) => (
          <Sleeve key={t.src} track={t} i={i} />
        ))}
      </ol>
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
