'use client';

/**
 * Case-study storytelling pieces, shared by every project page:
 *
 *   Overview   "the case study in one screen" — what it is, why it exists,
 *              what Allen did, where it stands — so a reader who stops here
 *              still understands the project; everything below goes deeper
 *   Story      a dated rail of chapters: what happened, why, and what changed
 *              (kept / cut lists when a chapter reshaped the product)
 *   CodeTour   a few real files, one at a time: why the code is written that
 *              way, the excerpt, and numbered "what to notice" notes
 *
 * Data shapes:
 *   overview: [{ label, text }]                       (4 cards read best)
 *   story:    [{ when, title, body, kept?: [], cut?: [], tone?: 'turn' }]
 *   tour:     [{ key, label, why, code: { file, lang, body }, notes: [] }]
 *
 * Motion: a soft rise once in view. Reduced motion: everything is simply there.
 */
import { useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import CodeBlock from '@/components/ui/case/CodeBlock';
import { Choices } from '@/components/ui/case/kit';

const rise = (reduce, shown, i = 0) => ({
  initial: reduce ? false : { opacity: 0, y: 14 },
  animate: reduce || shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
  transition: reduce ? { duration: 0 } : { duration: 0.6, ease: EASE_OUT, delay: i * 0.08 },
});

/* ── Overview ──────────────────────────────────────────────────────────── */

export function Overview({ items, accent, note = 'Everything below goes deeper — pick a section from the index, or scroll.' }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.2 });
  if (!items?.length) return null;
  return (
    <section ref={ref} aria-label="The case study in one screen" className="border-t border-line pt-8">
      <p className="mc-label">The case study in one screen</p>
      <ol className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((it, i) => (
          <motion.li
            key={it.label}
            {...rise(reduce, inView, i)}
            className="relative flex min-w-0 flex-col overflow-hidden rounded-panel border border-line bg-surface p-5 sm:p-6"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}
          >
            <p className="font-mono text-micro font-medium uppercase tracking-[0.18em] text-ink-subtle">
              <span style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
              <span aria-hidden className="text-ink-faint">
                {' — '}
              </span>
              {it.label}
            </p>
            <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink">{it.text}</p>
          </motion.li>
        ))}
      </ol>
      {note && <p className="mt-5 text-label text-ink-subtle">{note}</p>}
    </section>
  );
}

/* ── Story ─────────────────────────────────────────────────────────────── */

function Chips({ label, items, kind }) {
  if (!items?.length) return null;
  const kept = kind === 'kept';
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="mc-label shrink-0 sm:w-14">{label}</span>
      <ul className="flex flex-wrap gap-2">
        {items.map((t) => (
          <li
            key={t}
            className={`inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-1 font-mono text-micro ${kept ? 'border-line-hi text-ink-muted' : 'border-dashed border-line text-ink-subtle line-through decoration-ink-faint'}`}
          >
            <span aria-hidden>{kept ? '✓' : '−'}</span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Story({ chapters, accent }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.1 });
  return (
    <ol ref={ref} className="relative flex flex-col">
      <span aria-hidden className="absolute bottom-3 left-[7px] top-3 w-px bg-line-hi" />
      {chapters.map((c, i) => {
        const turn = c.tone === 'turn';
        return (
          <motion.li key={c.title} {...rise(reduce, inView, i)} className="relative grid grid-cols-[16px_minmax(0,1fr)] gap-x-5 pb-12 last:pb-0">
            <span
              aria-hidden
              className="relative z-10 mt-[5px] h-[15px] w-[15px] rounded-full border"
              style={turn ? { borderColor: P.sand, background: alpha(P.sand, 0.18) } : { borderColor: accent, background: alpha(accent, 0.14) }}
            />
            <div className="min-w-0">
              <p className="font-mono text-label tabular-nums text-ink-subtle">
                {c.when}
                {turn && <span className="ml-3 rounded-chip border border-line px-1.5 py-0.5 text-micro uppercase tracking-[0.14em] text-sand">the turn</span>}
              </p>
              <h3 className="mt-2 font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink">{c.title}</h3>
              <p className="mt-3 max-w-[68ch] text-body text-ink-muted">{c.body}</p>
              {(c.kept?.length || c.cut?.length) && (
                <div className="mt-5 flex flex-col gap-3">
                  <Chips label="Kept" items={c.kept} kind="kept" />
                  <Chips label="Cut" items={c.cut} kind="cut" />
                </div>
              )}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

/* ── CodeTour ──────────────────────────────────────────────────────────── */

export function CodeTour({ files, accent, caption = 'Inside the code' }) {
  const reduce = useReducedMotion();
  const [key, setKey] = useState(files?.[0]?.key);
  if (!files?.length) return null;
  const f = files.find((x) => x.key === key) ?? files[0];
  return (
    <div className="mc-panel flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <span className="mc-label">{caption}</span>
        <Choices label="Files" options={files.map((x) => ({ key: x.key, label: x.label }))} value={f.key} onChoose={setKey} accent={accent} />
      </div>
      <motion.div
        key={f.key}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.35, ease: EASE_OUT }}
        className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        <div className="min-w-0">
          <p className="mb-4 max-w-[70ch] text-body text-ink-muted">{f.why}</p>
          <CodeBlock code={f.code} />
        </div>
        {f.notes?.length > 0 && (
          <div className="min-w-0">
            <p className="mc-label">What to notice</p>
            <ol className="mt-4 flex flex-col divide-y divide-line border-y border-line">
              {f.notes.map((n, i) => (
                <li key={n} className="flex gap-3 py-3 text-label text-ink-muted">
                  <span className="shrink-0 font-mono tabular-nums" style={{ color: accent }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 break-words">{n}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </motion.div>
    </div>
  );
}
