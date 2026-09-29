'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { MEET } from '@/data/about';
import { useStore } from '@/lib/store';
import { EASE_OUT } from '@/lib/motion';

/**
 * The story beside the pinned helmet, told one chapter at a time. The page
 * decides which chapter is live (one scroll gesture = one chapter); here
 * each change plays as a small scene:
 *
 *   · the outgoing chapter lifts away and dims
 *   · the new line rises out of a clipped mask (the name's treatment), then
 *     its proof line and link fade up
 *   · a large, faint year numeral behind the text rolls to the new year
 *   · a hairline rail marks where you are in the story
 *
 * Copy lives in MEET.story (src/data/about.js).
 */
const OUT = [0.7, 0, 0.84, 0];

const chapter = {
  enter: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
  exit: { opacity: 0, y: -28, filter: 'blur(4px)', transition: { duration: 0.45, ease: OUT } },
};
const lineRise = {
  initial: { y: '105%' },
  enter: { y: '0%', transition: { duration: 0.9, ease: EASE_OUT } },
};
const fadeUp = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

function Chapter({ c }) {
  const openProject = useStore((s) => s.openProject);
  return (
    <motion.article key={c.id} variants={chapter} initial="initial" animate="enter" exit="exit" className="absolute inset-x-0">
      <span className="block overflow-hidden pb-[0.1em]">
        <motion.p variants={lineRise} className="text-[clamp(1.6rem,2.6vw,2.6rem)] font-medium leading-[1.12] tracking-[-0.025em] text-ink">
          {c.line}
        </motion.p>
      </span>
      <motion.p variants={fadeUp} className="mt-5 font-mono text-micro uppercase tracking-[0.18em] text-ink-subtle">
        {c.proof}
      </motion.p>
      {c.project && (
        <motion.div variants={fadeUp} className="mt-6">
          <button onClick={() => openProject(c.project)} className="mc-chip pointer-events-auto transition-colors hover:text-ink">
            {c.linkLabel ?? 'Case study'} →
          </button>
        </motion.div>
      )}
    </motion.article>
  );
}

/** The year, huge and faint behind the text — it rolls like an odometer. */
function YearMark({ year }) {
  return (
    <div aria-hidden className="pointer-events-none absolute -top-[0.62em] left-[-0.04em] overflow-hidden font-display text-[clamp(6rem,14vw,13rem)] font-semibold leading-none tracking-[-0.05em]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={year}
          className="block text-transparent"
          style={{ WebkitTextStroke: '1px color-mix(in srgb, var(--ink) 14%, transparent)' }}
          initial={{ y: '60%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1, transition: { duration: 0.9, ease: EASE_OUT } }}
          exit={{ y: '-60%', opacity: 0, transition: { duration: 0.5, ease: OUT } }}
        >
          {year}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/** Where you are: a hairline with a tick per chapter; the live one in amber. */
function Rail({ active, count }) {
  return (
    <div aria-hidden className="pointer-events-none absolute -left-8 top-1/2 hidden h-[40vh] -translate-y-1/2 wide:block">
      <div className="absolute inset-y-0 left-0 w-px bg-line" />
      <motion.div className="absolute left-0 top-0 w-px bg-accent" animate={{ height: `${((active + 1) / count) * 100}%` }} transition={{ duration: 0.7, ease: EASE_OUT }} />
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`absolute -left-[2px] h-[5px] w-[5px] rounded-full transition-colors duration-500 ${i <= active ? 'bg-accent' : 'bg-line-hi'}`}
          style={{ top: `calc(${(i / Math.max(1, count - 1)) * 100}% - 2px)` }}
        />
      ))}
    </div>
  );
}

export default function MeetStory({ active }) {
  const list = MEET.story;
  if (!list.length) return null;
  const i = Math.max(0, Math.min(active, list.length - 1));
  const c = list[i];
  return (
    <div className="relative w-full max-w-[34rem]">
      <YearMark year={c.year} />
      <Rail active={i} count={list.length} />
      <div className="font-mono text-micro uppercase tracking-[0.22em] text-ink-subtle">
        <span className="text-accent">{String(i + 1).padStart(2, '0')}</span> / {String(list.length).padStart(2, '0')}
      </div>
      {/* chapters share one slot; the old one leaves as the new one arrives */}
      <div className="relative mt-6 min-h-[13rem]">
        <AnimatePresence initial={false}>
          <Chapter key={c.id} c={c} />
        </AnimatePresence>
      </div>
    </div>
  );
}
