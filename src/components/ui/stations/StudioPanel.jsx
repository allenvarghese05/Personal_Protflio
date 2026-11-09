'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { STUDIO, PLACEHOLDER_COUNT, formatTime } from '@/data/studio';
import { StationHeader, stagger, rise } from './shared';
import PhotoViewer from './studio/PhotoViewer';
import Cover from './studio/Cover';
import { usePlayer } from './studio/player';

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

const PLAY = <path d="M8 5v14l11-7z" />;
const PAUSE = <path d="M7 5h4v14H7zM13 5h4v14h-4z" />;

/**
 * The beat tape, like an album page: the cover of the beat that's playing (or
 * the newest), big, with its colours blurred across the whole width behind
 * it; the tape's title, Play and Shuffle; then every beat as a row. Starting
 * a beat opens the full-screen player; closing it leaves the mini player.
 */
function Tracks() {
  const { tracks, index, playing, shuffle, openTrack, playAll, toggle, toggleShuffle } = usePlayer();
  const reduced = useReducedMotion();
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
  const lead = index ?? 0;
  const t = tracks[lead];
  const total = tracks.reduce((s, x) => s + (x.duration || 0), 0);
  const fade = reduced ? { duration: 0 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] };
  const status = index === null ? 'Beat tape · newest first' : `${playing ? 'Now playing' : 'Paused'} · ${t.title}`;

  return (
    <div>
      <motion.section variants={rise} className="studio-album" aria-label={STUDIO.tape.title}>
        {/* the cover's colours, blurred and bled to the edges */}
        <div className="studio-album__glow" aria-hidden>
          <AnimatePresence initial={false}>
            <motion.div key={lead} initial={{ opacity: 0 }} animate={{ opacity: 0.55, transition: fade }} exit={{ opacity: 0, transition: fade }}>
              <Cover track={t} index={lead} className="block h-full w-full" showText={false} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 items-end gap-8 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-14">
          <button onClick={() => openTrack(lead)} className="studio-album__art mx-auto w-[min(72vw,320px)] md:w-full" aria-label={`Open the player: ${t.title}`}>
            <AnimatePresence initial={false}>
              <motion.span
                key={lead}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: fade }}
                exit={{ opacity: 0, transition: fade }}
              >
                <Cover track={t} index={lead} className="block h-full w-full" />
              </motion.span>
            </AnimatePresence>
          </button>

          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <span className="font-mono text-micro uppercase tracking-[0.2em] text-ink-subtle">{status}</span>
            <h3 className="font-display mt-3 text-5xl font-semibold leading-[0.95] tracking-[-0.045em] text-ink sm:text-6xl lg:text-7xl">
              {STUDIO.tape.title}
            </h3>
            <span className="mt-3 text-lg text-ink-muted">{STUDIO.artist}</span>
            <span className="mt-1 font-mono text-micro uppercase tracking-[0.16em] text-ink-subtle">
              {tracks.length} beats · {Math.round(total / 60)} min
            </span>

            <div className="mt-7 flex items-center gap-3">
              {/* before anything plays it starts the tape shuffled; after, it's an on/off switch */}
              <button
                onClick={() => (index === null ? playAll({ shuffled: true }) : toggleShuffle())}
                className="studio-round"
                aria-pressed={shuffle}
                aria-label="Shuffle"
                title={shuffle ? 'Shuffle is on' : 'Shuffle'}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                </svg>
              </button>
              <button
                onClick={() => (index === null ? playAll() : playing ? toggle() : openTrack(index))}
                className="studio-playall"
                style={{ padding: '12px 30px' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  {playing ? PAUSE : PLAY}
                </svg>
                {playing ? 'Pause' : index === null ? 'Play' : 'Resume'}
              </button>
            </div>

            <p className="mt-7 max-w-md text-[0.95rem] leading-relaxed text-ink-muted">{STUDIO.tape.blurb}</p>
          </div>
        </div>
      </motion.section>

      <ol className="mt-14 border-t border-line pt-3">
        {tracks.map((tr, i) => {
          const current = i === index;
          return (
            <motion.li key={tr.src} variants={rise}>
              <button onClick={() => openTrack(i)} className={`studio-tr group ${current ? 'is-current' : ''}`} aria-label={`Play ${tr.title}`}>
                <span className="studio-tr__num">
                  {current && playing ? (
                    <PlayingBars />
                  ) : (
                    <>
                      <span className="group-hover:hidden">{String(i + 1).padStart(2, '0')}</span>
                      <svg className="hidden text-ink group-hover:block" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        {PLAY}
                      </svg>
                    </>
                  )}
                </span>
                {/* grows into the full-screen player's cover */}
                <motion.span layoutId={`cover-${i}`} className="block h-11 w-11 shrink-0 overflow-hidden rounded-[8px]" transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                  <Cover track={tr} index={i} className="block h-full w-full" showText={false} />
                </motion.span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-display text-[1.02rem] font-semibold ${current ? 'text-accent' : 'text-ink'}`}>{tr.title}</span>
                  <span className="block truncate text-xs text-ink-subtle">{STUDIO.artist}</span>
                </span>
                <span className="shrink-0 font-mono text-micro tabular-nums text-ink-subtle">{formatTime(tr.duration)}</span>
              </button>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

// The player itself (and the full-screen view, and the mini player) lives at
// the root of the site — see components/audio/SiteAudio — so music carries on
// when you leave this room.
export default function StudioPanel() {
  const [tab, setTab] = useState('photos');
  // the full-screen player loads on the first play; fetch it now, so the
  // first beat opens without a gap
  useEffect(() => {
    import('./studio/NowPlaying').catch(() => {});
  }, []);
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
