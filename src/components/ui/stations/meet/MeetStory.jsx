'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MEET } from '@/data/about';
import { useStore } from '@/lib/store';
import { EASE_OUT } from '@/lib/motion';

/**
 * The story beside the pinned helmet: one chapter per step of the way, in
 * order — a first-person line (the story), a quiet proof line, and a link
 * to the case study where there is one. A year counter holds its place at
 * the top of the column and rolls to each chapter's year as it comes in.
 * Copy lives in MEET.story (src/data/about.js).
 */
const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_OUT } },
};

function YearCounter({ year }) {
  // the year rolls like the name's lines: out of a clipped mask
  return (
    <div className="font-mono text-micro uppercase tracking-[0.22em] text-ink-subtle">
      <span className="mr-3 inline-block h-px w-6 translate-y-[-0.3em] bg-accent/70 align-middle" aria-hidden />
      <span className="relative inline-block overflow-hidden align-bottom" style={{ minWidth: '7ch' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={year}
            className="block text-accent"
            initial={{ y: '100%' }}
            animate={{ y: '0%', transition: { duration: 0.55, ease: EASE_OUT } }}
            exit={{ y: '-100%', transition: { duration: 0.35, ease: [0.7, 0, 0.84, 0] } }}
          >
            {year}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}

function Chapter({ c, index, onActive }) {
  const ref = useRef(null);
  const openProject = useStore((s) => s.openProject);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // "active" = the chapter crossing the middle band of the screen
    const io = new IntersectionObserver(([e]) => e.isIntersecting && onActive(index), { rootMargin: '-45% 0px -45% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [index, onActive]);

  return (
    <motion.article
      ref={ref}
      variants={rise}
      initial="hidden"
      whileInView="show"
      viewport={{ amount: 0.6 }}
      className="pointer-events-auto flex min-h-[64vh] items-center"
    >
      <div className="max-w-[34rem] rounded-xl bg-void/80 p-6 backdrop-blur-sm wide:rounded-none wide:bg-transparent wide:p-0 wide:backdrop-blur-none">
        <p className="text-[clamp(1.35rem,2.1vw,2rem)] font-medium leading-[1.2] tracking-[-0.02em] text-ink">{c.line}</p>
        <p className="mt-4 font-mono text-micro uppercase tracking-[0.18em] text-ink-subtle">{c.proof}</p>
        {c.project && (
          <button onClick={() => openProject(c.project)} className="mc-chip mt-5 transition-colors hover:text-ink">
            {c.linkLabel ?? 'Case study'} →
          </button>
        )}
      </div>
    </motion.article>
  );
}

export default function MeetStory() {
  const [active, setActive] = useState(0);
  if (!MEET.story.length) return null;
  const year = MEET.story[Math.min(active, MEET.story.length - 1)].year;

  return (
    <div className="relative px-6 pb-[30vh] sm:px-12 wide:ml-auto wide:w-1/2 wide:pl-0 wide:pr-[7vw]">
      <div className="pointer-events-none sticky top-[12vh] z-10 py-2">
        <YearCounter year={year} />
      </div>
      {MEET.story.map((c, i) => (
        <Chapter key={c.id} c={c} index={i} onActive={setActive} />
      ))}
    </div>
  );
}
