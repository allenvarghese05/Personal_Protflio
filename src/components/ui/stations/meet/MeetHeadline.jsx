'use client';
import { motion } from 'framer-motion';
import { identity } from '@/data/timeline';
import { ABOUT, CONTACT, EXPERIENCE } from '@/data/about';
import { EASE_OUT } from '@/lib/motion';

/**
 * The type beside the helmet: credential, name, one line, then the two
 * things a recruiter asks first, each a jump further down the room: the job
 * I most recently held, and what I'm looking for next. The landing hero's
 * treatment, so the room opens the way the site does: the name rises out of
 * clipped masks, the rest fades up, after the room has slid into place.
 *
 * `part`: everything (wide screens, beside the helmet), or on narrow screens
 * the credential and name over the helmet ('name') and the rest under it
 * ('intro').
 */
const container = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.45 } } };
const rise = { hidden: { y: '110%' }, show: { y: '0%', transition: { duration: 1.1, ease: EASE_OUT } } };
const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_OUT } } };

const RECENT = EXPERIENCE.find((j) => j.featured);

function Line({ children }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span variants={rise} className="block whitespace-nowrap">
        {children}
      </motion.span>
    </span>
  );
}

/** A labelled jump: the amber label on its own row, the line under it. */
function Jump({ href, label, onJump, children }) {
  return (
    <motion.a
      variants={fade}
      href={href}
      onClick={onJump}
      className="group flex w-fit flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-ink-muted transition-colors hover:text-ink"
    >
      <span className="basis-full font-mono text-micro uppercase tracking-[0.16em] text-accent">{label}</span>
      <span>
        {children}
        {/* held to the last word, so a wrapped line never leaves it alone */}
        <span aria-hidden className="whitespace-nowrap">
          {'\u00a0\u00a0'}
          <span className="inline-block transition-transform duration-200 group-hover:translate-y-0.5">↓</span>
        </span>
      </span>
    </motion.a>
  );
}

export default function MeetHeadline({ part = 'all', onJump, still }) {
  // "Allen Shaji" / "Varghese": the same break as the landing hero
  const words = identity.name.split(' ');
  const lines = [words.slice(0, -1).join(' '), words.at(-1)];
  const name = part !== 'intro';
  const intro = part !== 'name';

  return (
    <motion.div variants={container} initial={still ? false : 'hidden'} animate="show">
      {name && (
        <>
          <motion.p variants={fade} className="text-balance font-mono text-micro uppercase tracking-[0.22em] text-ink-muted">
            {identity.credential}
          </motion.p>
          <h2 className="font-display mt-6 text-[clamp(2.75rem,12vw,4.25rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-ink split:text-[clamp(2.75rem,5.2vw,5rem)]">
            {lines.map((l) => (
              <Line key={l}>{l}</Line>
            ))}
          </h2>
        </>
      )}
      {intro && (
        <>
          <motion.p variants={fade} className={`${name ? 'mt-7' : ''} max-w-[30ch] text-[clamp(1.125rem,1.45vw,1.375rem)] leading-snug tracking-[-0.01em] text-ink`}>
            {ABOUT.headline}
          </motion.p>
          <div className="mt-8 flex flex-col gap-5">
            {RECENT && (
              <Jump href="#experience" label="Most recently" onJump={onJump}>
                {RECENT.role}, <span className="font-medium text-ink">{RECENT.org}</span>
                {RECENT.returnOffer && <span className="text-ink-subtle"> · return offer received</span>}
              </Jump>
            )}
            <Jump href="#next" label="Next" onJump={onJump}>
              {CONTACT.availability.replace(/\.$/, '')}
            </Jump>
          </div>
        </>
      )}
    </motion.div>
  );
}
