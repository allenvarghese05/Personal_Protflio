'use client';

/**
 * The case-study kit — the pieces every "hard problems" section and every
 * interactive panel share, so each project's visuals read like the Church
 * Building page's:
 *
 *   DecisionList   one row per decision: '01 · kicker', a display title,
 *                  Problem / Decision / Trade-off (the decision on the accent
 *                  rule), sticky beside its visual, alternating sides at lg,
 *                  with a 'Show the code' drawer when the decision has `code`
 *   PanelFrame     the panel a diagram sits in: caption + controls, body, an
 *                  aria-live readout footer
 *   Choices        toggle chips (aria-pressed) for a diagram's scenarios
 *   Readout        a status chip in its colour + one plain sentence
 *   Glyph          20px status glyphs: tick (jade), cross (alert), undo, flag
 *                  (sand), idle ring
 *   LegendItem, Block, CodeToggle
 *   useRun         the active choice: the reader's pick, else `auto` once in view
 *   useWidth       an element's rendered width (ResizeObserver)
 *   at             a transition that collapses to instant under reduced motion
 *   softBreaks     wrap points inside long identifiers
 *
 * A decision: { id, kicker, title, problem, decision, tradeoff, code?:
 * { file, lang, body } } plus whatever its visual reads. `renderVisual(decision,
 * { inView, reduce, accent })` returns the visual for an id (or null).
 */
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import CodeBlock from '@/components/ui/case/CodeBlock';

/* ── shared constants ──────────────────────────────────────────────────── */
export const IN_VIEW = { once: true, amount: 0.35 }; // diagrams start when a third shows
const TEXT_IN_VIEW = { once: true, amount: 0.2 };
const RISE_PX = 16;
const RISE_S = 0.6;
const CODE_S = 0.4; // code drawer open / close

/** A transition that collapses to "instant" under reduced motion. */
export function at(reduce, delay = 0, duration = 0.3) {
  return reduce ? { duration: 0 } : { delay, duration, ease: EASE_OUT };
}

/** Soft wrap points at camelCase seams and after underscores, so identifiers
 *  like "ApplicationStatusHistory" or "PHASE_2_FUNDS_PENDING" wrap between
 *  words in a narrow column instead of mid-word (and copy back whole). */
export function softBreaks(text) {
  const parts = text.replace(/([a-z])(?=[A-Z])|(_)(?=[A-Za-z0-9])/g, '$1$2\n').split('\n');
  if (parts.length < 2) return text;
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
    </Fragment>
  ));
}

/** The active choice for a diagram: the user's pick, else `auto` once the
 *  panel is in view (or straight away with reduced motion — final state).
 *  `run` bumps on every click so the same choice can be replayed. */
export function useRun(inView, reduce, auto) {
  const [choice, setChoice] = useState(null);
  const active = choice ?? (inView || reduce ? { key: auto, run: 0 } : null);
  const choose = (key) => setChoice((c) => ({ key, run: (c ? c.run : 0) + 1 }));
  return [active, choose];
}

/** Rendered width of an element (0 until measured). */
export function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/* ── small pieces ──────────────────────────────────────────────────────── */

/** Toggle buttons for a diagram (aria-pressed on the active one). */
export function Choices({ label, options, value, onChoose, accent }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChoose(o.key)}
            className={`rounded-chip border px-3 py-2 font-mono text-micro tracking-[0.04em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              on ? '' : 'border-line text-ink-muted hover:border-line-hi hover:text-ink'
            }`}
            style={
              on
                ? { color: accent, borderColor: alpha(accent, 0.5), background: alpha(accent, 0.08) }
                : undefined
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** The panel every diagram sits in: caption + controls, body, readout. */
export function PanelFrame({ caption, controls, footer, children }) {
  return (
    <div className="mc-panel flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <span className="mc-label">{caption}</span>
        {controls}
      </div>
      <div className="mt-5 min-w-0">{children}</div>
      <div
        aria-live="polite"
        className="mt-5 flex min-h-[3.25rem] items-center border-t border-line pt-4"
      >
        {footer}
      </div>
    </div>
  );
}

/** 20px status glyphs: tick, cross, undo, flag, idle ring. */
export function Glyph({ kind, tone: toneOverride }) {
  const tone = toneOverride ?? { tick: P.jade, cross: P.alert, undo: P.inkSubtle, flag: P.sand, idle: P.lineHi }[kind];
  const filled = kind === 'tick' || kind === 'cross' || kind === 'flag';
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" className="block shrink-0">
      <circle
        cx="10"
        cy="10"
        r="8.5"
        fill={filled ? alpha(tone, 0.14) : 'none'}
        stroke={tone}
        strokeWidth="1.25"
        strokeDasharray={kind === 'undo' ? '2.5 2.5' : undefined}
      />
      {kind === 'tick' && (
        <path d="M6.2 10.3 L8.8 12.9 L13.9 7.6" fill="none" stroke={tone} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {kind === 'cross' && (
        <path d="M7.2 7.2 L12.8 12.8 M12.8 7.2 L7.2 12.8" fill="none" stroke={tone} strokeWidth="1.6" strokeLinecap="round" />
      )}
      {kind === 'undo' && (
        <path
          d="M7.4 8.2 H11.3 A2.6 2.6 0 0 1 11.3 13.4 H8.6 M9.2 6.2 L7.2 8.2 L9.2 10.2"
          fill="none"
          stroke={tone}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {kind === 'flag' && (
        <path
          d="M7.6 14.2 V5.8 M7.6 6.2 H13 L11.6 8.3 L13 10.4 H7.6"
          fill="none"
          stroke={tone}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/** A readout line: a status in its colour, then a plain sentence. */
export function Readout({ runKey, delay, reduce, tone, status, children }) {
  return (
    <motion.div
      key={runKey}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={at(reduce, delay, 0.35)}
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
    >
      {status && (
        <span className="mc-chip mc-chip--accent font-medium" style={{ '--chip': tone }}>
          {status}
        </span>
      )}
      {children}
    </motion.div>
  );
}

export function LegendItem({ children, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
        {children}
      </svg>
      {label}
    </span>
  );
}

/* ── row ───────────────────────────────────────────────────────────────── */

export function Block({ label, text, primary, accent }) {
  return (
    <div className="border-l-2 pl-4" style={{ borderColor: primary ? alpha(accent, 0.7) : P.line }}>
      <dt className="mc-label" style={primary ? { color: accent } : undefined}>
        {label}
      </dt>
      <dd className={`mt-2 text-body ${primary ? 'text-ink' : 'text-ink-muted'}`}>{text}</dd>
    </div>
  );
}

export function CodeToggle({ code, reduce }) {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((o) => !o)}
        className="mc-ghost-btn inline-flex items-center gap-2 rounded-chip py-2 pr-2 uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg
          viewBox="0 0 12 12"
          width="12"
          height="12"
          aria-hidden="true"
          className={`transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
        >
          <path d="M4.5 2.5 L8 6 L4.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {open ? 'Hide the code' : 'Show the code'}
      </button>
      <div id={regionId}>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="code"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={reduce ? { duration: 0 } : { duration: CODE_S, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="pt-2">
                <CodeBlock code={code} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DecisionRow({ decision, index, accent, reduce, renderVisual }) {
  const textRef = useRef(null);
  const visualRef = useRef(null);
  const textIn = useInView(textRef, TEXT_IN_VIEW);
  const inView = useInView(visualRef, IN_VIEW);
  const titleId = useId();
  const flip = index % 2 === 1;
  const num = String(index + 1).padStart(2, '0');
  const shown = reduce || textIn;

  return (
    <article
      aria-labelledby={titleId}
      className={`grid grid-cols-1 items-start gap-10 border-t border-line py-16 first:border-t-0 first:pt-0 last:pb-0 lg:gap-16 lg:py-24 xl:gap-20 ${
        flip
          ? 'lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]'
          : 'lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'
      }`}
    >
      <motion.div
        ref={textRef}
        className={`min-w-0 max-w-[34rem] lg:sticky lg:top-24 ${flip ? 'lg:order-2' : ''}`}
        initial={reduce ? false : { opacity: 0, y: RISE_PX }}
        animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: RISE_PX }}
        transition={at(reduce, 0, RISE_S)}
      >
        <p className="mc-label">
          <span style={{ color: accent }}>{num}</span> · {decision.kicker}
        </p>
        <h3
          id={titleId}
          className="mt-4 text-balance font-display text-2xl font-semibold leading-[1.2] tracking-[-0.015em] text-ink sm:text-[1.75rem]"
        >
          {decision.title}
        </h3>
        <dl className="mt-8 flex flex-col gap-6">
          <Block label="Problem" text={decision.problem} accent={accent} />
          <Block label="Decision" text={decision.decision} accent={accent} primary />
          <Block label="Trade-off" text={decision.tradeoff} accent={accent} />
        </dl>
      </motion.div>

      <div ref={visualRef} className={`min-w-0 ${flip ? 'lg:order-1' : ''}`}>
        {renderVisual(decision, { inView, reduce, accent })}
        {decision.code && <CodeToggle code={decision.code} reduce={reduce} />}
      </div>
    </article>
  );
}

/** The decisions, one row each. */
export function DecisionList({ decisions, renderVisual, accent = P.accent }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <div className="flex min-w-0 flex-col">
      {decisions.map((d, i) => (
        <DecisionRow key={d.id} decision={d} index={i} accent={accent} reduce={reduce} renderVisual={renderVisual} />
      ))}
    </div>
  );
}
