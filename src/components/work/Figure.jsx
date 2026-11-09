'use client';
import { useEffect, useMemo, useRef } from 'react';

/**
 * A figure that settles into place, once, the first time it's on screen.
 * Each digit is a column that rolls up the last few numbers before its own
 * and comes to rest; lower places travel further (units six steps, tens
 * five, hundreds four, the rest three), so the figure lands the way a
 * counter does rather than spinning like a slot machine. Everything else in
 * the string stays put: commas, "$", "M", and a quieter "+" or unit.
 *
 * It rolls as soon as its top has come a little way up the screen (ROLL_AT),
 * and lands in under a second: you watch it settle as it arrives, not
 * after you've stopped to look at it. Once; scrolling back doesn't replay it.
 *
 * The finished value is the markup: it's what the server sends, and what
 * shows without JS or with reduced motion. Only figures still below the
 * fold when the page mounts are rewound, so nothing already in view ever
 * jumps back to roll. Measured against the room's own scroller, so the
 * room's slide-in doesn't count as "in view".
 *
 * Styles: .fig* in globals.css.
 */

const DIGIT = /\d/;
/** How far up the screen a figure's top must come before it rolls. */
const ROLL_AT = 0.88;
// what reads quieter than the number: "+", units ("s"), the thin space
const QUIET = /[+a-z\u2009]/;

function parse(value) {
  const chars = [...value.replace(/ /g, '\u2009')];
  const total = chars.filter((c) => DIGIT.test(c)).length;
  let seen = 0;
  return chars.map((c) => {
    if (!DIGIT.test(c)) return { c, quiet: QUIET.test(c) };
    const place = total - 1 - seen; // counted from the right
    const steps = 6 - Math.min(3, place);
    const d = Number(c);
    return {
      d,
      col: seen++,
      steps,
      // the numbers the column rolls through, ending on its own digit
      strip: Array.from({ length: steps + 1 }, (_, j) => (d - steps + j + 20) % 10),
    };
  });
}

export default function Figure({ value, delay = 0, className = '' }) {
  const ref = useRef(null);
  const parts = useMemo(() => parse(value), [value]);

  useEffect(() => {
    const el = ref.current;
    // a zero never rolls (it would show other numbers first)
    if (!el || !/[1-9]/.test(value) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const scroller = el.closest('[data-mc-scroll]');
    const fold = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;
    if (el.getBoundingClientRect().top < fold) return undefined; // in view at mount: stays finished
    el.dataset.state = 'armed';
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1]; // the latest, if several were batched
        if (!e.isIntersecting) return;
        io.disconnect();
        void el.offsetWidth; // commit the rewound frame, so the roll transitions from it
        el.dataset.state = 'run';
      },
      // the screen, less its bottom part: in once its top passes ROLL_AT
      { rootMargin: `0px 0px -${Math.round((1 - ROLL_AT) * 100)}% 0px` }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      delete el.dataset.state;
    };
  }, [value]);

  return (
    <span ref={ref} className={`fig ${className}`} style={{ '--delay': `${delay}ms` }}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="fig-row">
        {parts.map((p, i) =>
          p.strip ? (
            <span key={i} className="fig-d" style={{ '--k': p.steps, '--i': p.col }}>
              <span className="fig-ghost">{p.d}</span>
              <span className="fig-strip">
                {p.strip.map((n, j) => (
                  <span key={j}>{n}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={i} className={p.quiet ? 'text-ink-muted' : undefined}>
              {p.c}
            </span>
          )
        )}
      </span>
    </span>
  );
}
