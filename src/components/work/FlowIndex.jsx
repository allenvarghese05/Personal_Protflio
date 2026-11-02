'use client';
/**
 * The index at the top of /projects: every project in one list, so the whole
 * archive reads in a glance. After React Bits' Flowing Menu, rebuilt in the
 * site's own tokens with no extra dependency:
 *
 *   hover a row  a band in the project's own colour slides in from the edge
 *                the pointer came through, and a marquee of its picture and
 *                its key facts runs across it; it leaves through the edge the
 *                pointer leaves by
 *   click        smooth-scrolls to the project
 *
 * Touch screens (no hover) and keyboard focus get the plain row; reduced
 * motion keeps the band but stills the marquee. The band is driven through
 * refs, not state, so hovering never re-renders the list.
 */
import { useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { projectById } from '@/data/projects';
import { ALL_IDS, SHOWCASE } from '@/data/showcase';

const EASE = 'cubic-bezier(0.2, 0.9, 0.2, 1)';
const MS = 520;

/** Which edge (top / bottom) the pointer is nearer to. */
const edgeOf = (e, el) => {
  const r = el.getBoundingClientRect();
  return e.clientY - r.top < r.height / 2 ? 'top' : 'bottom';
};

function BandContent({ show, label }) {
  const run = [label, ...show.band];
  return (
    <>
      {run.map((text, i) => (
        <span key={`${text}-${i}`} className="flex shrink-0 items-center gap-6 pr-6 sm:gap-8 sm:pr-8">
          <span className={i === 0 ? 'font-display text-[clamp(1.6rem,3.6vw,3rem)] font-semibold tracking-[-0.035em]' : 'text-lg sm:text-xl'}>
            {text}
          </span>
          {show.thumb ? (
            <span className="relative h-[52%] min-h-9 w-24 shrink-0 overflow-hidden rounded-full ring-1 ring-white/20 sm:w-32">
              <Image src={show.thumb} alt="" fill sizes="128px" className="object-cover" />
            </span>
          ) : (
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-white/60" />
          )}
        </span>
      ))}
    </>
  );
}

function Row({ id, index, onJump }) {
  const project = projectById(id);
  const show = SHOWCASE[id];
  const rowRef = useRef(null);
  const bandRef = useRef(null);
  const innerRef = useRef(null);
  const reduce = useReducedMotion();

  // slide the band (and counter-slide its content) between an edge and rest
  const move = (from, to, animate) => {
    const band = bandRef.current;
    const inner = innerRef.current;
    if (!band || !inner) return;
    const off = (edge) => (edge === 'top' ? -101 : 101);
    band.style.transition = inner.style.transition = 'none';
    if (from) {
      band.style.transform = `translateY(${off(from)}%)`;
      inner.style.transform = `translateY(${-off(from)}%)`;
      void band.offsetHeight; // commit the start position before animating
    }
    const t = animate && !reduce ? `transform ${MS}ms ${EASE}` : 'none';
    band.style.transition = inner.style.transition = t;
    band.style.transform = to ? `translateY(${off(to)}%)` : 'translateY(0)';
    inner.style.transform = to ? `translateY(${-off(to)}%)` : 'translateY(0)';
    inner.dataset.running = to ? 'false' : 'true';
  };

  const onEnter = (e) => {
    if (e.pointerType !== 'mouse') return;
    move(edgeOf(e, rowRef.current), null, true);
  };
  const onLeave = (e) => {
    if (e.pointerType !== 'mouse') return;
    move(null, edgeOf(e, rowRef.current), true);
  };

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 + index * 0.05 }}
      className="relative border-t border-line last:border-b"
    >
      <a
        ref={rowRef}
        href={`#${id}`}
        onClick={(e) => onJump(e, id)}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        className="group/row relative flex min-h-[72px] items-center justify-between gap-4 overflow-hidden py-4 outline-none sm:min-h-[96px]"
      >
        <span className="font-display text-[clamp(1.6rem,3.6vw,3rem)] font-semibold leading-none tracking-[-0.035em] text-ink transition-colors duration-200 group-focus-visible/row:text-accent">
          {project.label === 'Church Building Application System' ? 'Church Building System' : project.label}
        </span>
        <span className="flex shrink-0 items-center gap-3 text-sm text-ink-subtle sm:gap-6">
          <span className={`hidden sm:inline ${show.highlight.tone === 'award' ? 'font-medium text-accent' : ''}`}>{show.status}</span>
          <span className="tabular-nums">{show.year}</span>
          <span aria-hidden className="text-ink-subtle transition-transform duration-300 group-hover/row:translate-y-0.5">
            ↓
          </span>
        </span>

        {/* the band: off-screen at rest, slides in from the edge you came through */}
        <span
          ref={bandRef}
          aria-hidden
          className="work-band pointer-events-none absolute inset-0 overflow-hidden"
          style={{ background: show.ground, transform: 'translateY(101%)' }}
        >
          <span ref={innerRef} data-running="false" className="work-band__inner flex h-full items-center text-white" style={{ transform: 'translateY(-101%)' }}>
            <span className="work-marquee flex h-full items-center">
              <span className="flex h-full items-center">
                <BandContent show={show} label={project.label} />
              </span>
              <span className="flex h-full items-center">
                <BandContent show={show} label={project.label} />
              </span>
            </span>
          </span>
        </span>
      </a>
    </motion.li>
  );
}

export default function FlowIndex({ onJump }) {
  return (
    <nav aria-label="All projects">
      <ol>
        {ALL_IDS.map((id, i) => (
          <Row key={id} id={id} index={i} onJump={onJump} />
        ))}
      </ol>
    </nav>
  );
}
