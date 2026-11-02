'use client';
/**
 * Small pieces the /projects page shares:
 *
 *   CountUp     a stat that counts up once, the first time it's on screen.
 *               The real value is in the markup (and stays for reduced
 *               motion); only figures still below the fold are rewound to 0.
 *   Steps       "How it works": the project's own flow, one sentence a step,
 *               on a rail. Steps rise in turn as the list arrives.
 *   HowItWorks  the same steps behind a disclosure, for the smaller tiers.
 *   Chip        the status chip, in its tone.
 *   Mark        the round project mark (its thumbnail, or its letter).
 */
import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';

export const TONE = {
  award: 'var(--accent)',
  built: 'var(--jade)',
  progress: 'var(--sand)',
  side: 'var(--slate)',
};
const EASE_OUT = [0.16, 1, 0.3, 1];

/* ── CountUp ───────────────────────────────────────────────────────────── */

const NUM = /\d[\d,]*(?:\.\d+)?/;

export function CountUp({ value, className = '' }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const armed = useRef(false);

  // below the fold on load: rewind to 0 so there's something to count
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || !NUM.test(value)) return;
    if (el.getBoundingClientRect().top > window.innerHeight) {
      armed.current = true;
      el.textContent = value.replace(NUM, '0');
    }
  }, [reduce, value]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || !armed.current) return undefined;
    armed.current = false;
    const raw = value.match(NUM)[0];
    const target = parseFloat(raw.replace(/,/g, ''));
    const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
    const commas = raw.includes(',');
    const fmt = (n) =>
      commas ? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : n.toFixed(decimals);
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1100);
      el.textContent = value.replace(NUM, fmt(target * (1 - Math.pow(1 - t, 4))));
      if (t < 1) raf = requestAnimationFrame(tick);
      else el.textContent = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = value;
    };
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

export function Stats({ stats, size = 'lg' }) {
  if (!stats?.length) return null;
  const big = size === 'lg';
  return (
    <dl className={`grid gap-x-6 gap-y-5 ${stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col">
          <dt className="order-last mt-2 text-label leading-snug text-ink-subtle">{s.label}</dt>
          <dd
            className={`font-display font-semibold leading-none tracking-[-0.035em] text-ink tabular-nums ${
              big ? 'text-[1.9rem] sm:text-[2.6rem]' : 'text-[1.6rem] sm:text-[1.9rem]'
            }`}
          >
            <CountUp value={s.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Steps ─────────────────────────────────────────────────────────────── */

export function Steps({ steps, color, dense = false }) {
  const reduce = useReducedMotion();
  return (
    <ol className="relative">
      {/* the rail the steps hang on */}
      <span aria-hidden className="absolute bottom-3 left-[7px] top-3 w-px bg-line-hi" />
      {steps.map((s, i) => (
        <motion.li
          key={s.label}
          className={`relative grid grid-cols-[16px_minmax(0,1fr)] gap-x-4 ${dense ? 'py-1.5' : 'py-2.5'}`}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: i * 0.06 }}
        >
          <span
            aria-hidden
            className="relative mt-[5px] h-[15px] w-[15px] rounded-full border-2"
            style={{
              borderColor: color,
              borderStyle: s.planned ? 'dashed' : 'solid',
              background: s.planned ? 'var(--void)' : `color-mix(in srgb, ${color} 30%, var(--void))`,
            }}
          />
          <p className={`${dense ? 'text-sm' : 'text-[0.975rem]'} leading-relaxed text-ink-muted`}>
            <span className="font-semibold text-ink">{s.label}.</span> {s.text}
            {s.planned && <span className="text-ink-subtle"> Planned, not built yet.</span>}
          </p>
        </motion.li>
      ))}
    </ol>
  );
}

export function HowItWorks({ steps, color }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const id = useId();
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="group/how inline-flex h-9 items-center gap-2 rounded-full pl-1 pr-3.5 text-sm font-medium text-ink-muted transition-colors duration-200 hover:text-ink"
      >
        <span
          aria-hidden
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-base leading-none text-ink transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
        >
          +
        </span>
        How it works
        <span className="text-ink-subtle">· {steps.length} steps</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            key="steps"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <Steps steps={steps} color={color} dense />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Chip, Mark ────────────────────────────────────────────────────────── */

export function Chip({ highlight }) {
  const color = TONE[highlight.tone] || TONE.side;
  return (
    <span
      className="inline-flex h-7 w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-label font-medium"
      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {highlight.text}
    </span>
  );
}

export function Mark({ show, size = 36, image }) {
  return (
    <span
      aria-hidden
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-sm font-semibold text-white ring-1 ring-inset ring-white/10"
      style={{ width: size, height: size, background: show.ground }}
    >
      {image ? <Image src={image} alt="" fill sizes={`${size}px`} className="object-cover" /> : show.mark}
    </span>
  );
}
