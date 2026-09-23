'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatShotDate, formatCoords } from '@/data/studio';

const EASE = [0.16, 1, 0.3, 1];

/**
 * The immersive photo viewer. The photo you clicked zooms out of the grid
 * (shared layout) — thumbnail first, the full image crossfading in when it
 * lands. Its own colours wash the room behind it. Top right: the story of
 * the shot — camera, lens, exposure, date, and where it was taken.
 * Arrows / swipe / filmstrip to move; I hides the card; Esc closes back
 * into the grid.
 */

/** The shot's details, top right — staggered in per photo. */
function InfoCard({ p }) {
  const settings = [p.focal, p.aperture, p.shutter, p.iso].filter(Boolean);
  const date = formatShotDate(p.date);
  const coords = formatCoords(p.gps);
  const rows = [
    <div key="cam">
      <div className="pv-label">Camera</div>
      <div className="font-display text-lg font-semibold text-ink">{p.camera}</div>
      {p.lens && <div className="text-sm text-ink-muted">{p.lens}</div>}
    </div>,
    settings.length > 0 && (
      <div key="set" className="flex flex-wrap gap-1.5">
        {settings.map((s) => (
          <span key={s} className="mc-chip text-ink">{s}</span>
        ))}
      </div>
    ),
    date && (
      <div key="date">
        <div className="pv-label">Captured</div>
        <div className="text-sm text-ink">{date}</div>
      </div>
    ),
    (p.place || coords) && (
      <div key="loc">
        <div className="pv-label">Location</div>
        {p.place && <div className="text-sm text-ink">{p.place}</div>}
        {coords && <div className="font-mono text-micro text-ink-subtle">{coords}</div>}
        {p.gps && (
          <a
            href={`https://www.google.com/maps?q=${p.gps[0]},${p.gps[1]}`}
            target="_blank"
            rel="noreferrer"
            className="hero-link mt-1.5 inline-block font-mono text-micro uppercase tracking-[0.14em] text-accent"
            onClick={(e) => e.stopPropagation()}
          >
            View on map ↗
          </a>
        )}
      </div>
    ),
  ].filter(Boolean);

  return (
    <motion.aside
      key={p.src}
      className="pv-card"
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
      onClick={(e) => e.stopPropagation()}
    >
      {rows.map((r, i) => (
        <motion.div
          key={i}
          variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
        >
          {r}
        </motion.div>
      ))}
    </motion.aside>
  );
}

/** Thumbnail first, the full image fades in over it once decoded. */
function Progressive({ p, className }) {
  // remounts per photo (keyed by src upstream), so this starts false each time
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: `${p.w} / ${p.h}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.thumb} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" style={{ filter: loaded ? 'none' : 'blur(6px)' }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.src}
        alt={p.title || `Photograph · ${p.camera}`}
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}

const slide = {
  enter: (d) => ({ x: d * 80, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.55, ease: EASE } },
  exit: (d) => ({ x: d * -80, opacity: 0, transition: { duration: 0.3, ease: EASE } }),
};

export default function PhotoViewer({ photos, index, openedFrom, onClose, onGo }) {
  const [dir, setDir] = useState(0);
  const [info, setInfo] = useState(true);
  const strip = useRef(null);
  const p = photos[index];
  const go = (d) => {
    setDir(d);
    onGo((index + d + photos.length) % photos.length);
  };

  // keys — capture phase so Esc closes the viewer, not the whole room
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'i' || e.key === 'I') setInfo((v) => !v);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  // keep the current frame centred in the filmstrip
  useEffect(() => {
    strip.current?.querySelector(`[data-i="${index}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  const morph = index === openedFrom; // only the photo you opened flies home

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-void"
      initial={{ backgroundColor: 'rgba(7,8,12,0)' }}
      animate={{ backgroundColor: 'rgba(7,8,12,1)', transition: { duration: 0.4 } }}
      exit={{ backgroundColor: 'rgba(7,8,12,0)', transition: { duration: 0.45, delay: 0.1 } }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photograph viewer"
    >
      {/* the photo's own colours, washed across the room */}
      <AnimatePresence>
        <motion.div
          key={p.thumb}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: `url(${p.thumb})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(70px) saturate(1.3)', transform: 'scale(1.3)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45, transition: { duration: 0.9 } }}
          exit={{ opacity: 0, transition: { duration: 0.9 } }}
        />
      </AnimatePresence>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(80% 80% at 50% 45%, rgba(7,8,12,0.35), rgba(7,8,12,0.9))' }} />

      {/* top bar */}
      <motion.div
        className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.25 } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="skip-btn" style={{ paddingRight: '1rem' }}>
          ← Studio <span className="skip-btn__key">Esc</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-micro tabular-nums uppercase tracking-[0.2em] text-ink-subtle">
            {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
          </span>
          <button onClick={() => setInfo((v) => !v)} className="skip-btn" style={{ paddingRight: '1rem' }} aria-pressed={info}>
            Info <span className="skip-btn__key">I</span>
          </button>
        </div>
      </motion.div>

      {/* the photograph */}
      <div className="relative z-0 flex min-h-0 flex-1 items-center justify-center px-6 py-4 sm:px-16">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={p.src}
            layoutId={morph ? `photo-${index}` : undefined}
            custom={dir}
            variants={morph ? undefined : slide}
            initial={morph ? false : 'enter'}
            animate={morph ? undefined : 'center'}
            exit={morph ? undefined : 'exit'}
            transition={{ duration: 0.65, ease: EASE }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, i) => {
              if (i.offset.x < -80 || i.velocity.x < -500) go(1);
              else if (i.offset.x > 80 || i.velocity.x > 500) go(-1);
            }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full overflow-hidden rounded-lg shadow-[0_40px_140px_-30px_rgba(0,0,0,0.9)]"
            style={{
              width: `min(100%, calc((100vh - 13rem) * ${p.w / p.h}))`,
              cursor: 'grab',
            }}
          >
            <Progressive p={p} className="w-full" />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>{info && <InfoCard p={p} />}</AnimatePresence>
      </div>

      {/* filmstrip */}
      <motion.div
        ref={strip}
        className="pv-strip relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.5, ease: EASE } }}
        exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
        onClick={(e) => e.stopPropagation()}
      >
        {photos.map((ph, i) => (
          <button
            key={ph.thumb}
            data-i={i}
            onClick={() => {
              setDir(i > index ? 1 : -1);
              onGo(i);
            }}
            className={`pv-strip__item ${i === index ? 'is-current' : ''}`}
            aria-label={`Photograph ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ph.thumb} alt="" loading="lazy" />
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
}
