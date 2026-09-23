'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatShotDate, formatCoords } from '@/data/studio';

const EASE = [0.16, 1, 0.3, 1];

/**
 * The immersive photo viewer — the photograph is the whole show. It zooms
 * out of the grid (shared layout), thumbnail first, full image crossfading
 * in. The room takes a subtle tint of the photo's own mood colour, and the
 * print is lifted off it: a soft bloom in that colour behind it, a deep
 * shadow, a fine edge highlight. Top right: the story of the shot.
 * Arrows / swipe / the edge buttons to move; I hides the card; Esc closes
 * back into the grid.
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
  const p = photos[index];
  const tint = p.color || '#3a3a44';
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
      {/* a subtle tint of the photo's mood colour — the room, not a feature */}
      <AnimatePresence>
        <motion.div
          key={tint}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(70% 65% at 50% 48%, color-mix(in srgb, ${tint} 34%, transparent) 0%, color-mix(in srgb, ${tint} 10%, transparent) 55%, transparent 85%)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1.1, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 1.1, ease: EASE } }}
        />
      </AnimatePresence>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(100% 90% at 50% 50%, transparent 40%, rgba(7,8,12,0.75) 100%)' }} />

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
      <div className="relative z-0 flex min-h-0 flex-1 items-center justify-center px-6 pb-10 pt-4 sm:px-24">
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
            className="pv-print max-h-full overflow-hidden rounded-lg"
            style={{
              width: `min(100%, calc((100vh - 9.5rem) * ${p.w / p.h}))`,
              cursor: 'grab',
              '--tint': tint,
            }}
          >
            <Progressive p={p} className="w-full" />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>{info && <InfoCard p={p} />}</AnimatePresence>
      </div>

      {/* quiet edge controls — the photo stays the focus */}
      {[-1, 1].map((d) => (
        <motion.button
          key={d}
          className={`pv-edge ${d < 0 ? 'left-4 sm:left-6' : 'right-4 sm:right-6'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.35 } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          onClick={(e) => {
            e.stopPropagation();
            go(d);
          }}
          aria-label={d < 0 ? 'Previous photograph' : 'Next photograph'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {d < 0 ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
          </svg>
        </motion.button>
      ))}
    </motion.div>
  );
}
