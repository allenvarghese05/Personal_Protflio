'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { Chip, PILL_LINE, Steps } from './parts';

/**
 * The featured role, Overflow, built like a featured project on /projects:
 * a picture on the company's own colour (left) and the story beside it
 * (right), then the people who saw the work: a recommendation and two lines
 * from the team demo.
 *
 * The picture is a sketch of the work (a gift being corrected with its audit
 * trail, and the AI support chat), not a screenshot, the same way the Church
 * Building case study stands sketches in for a private client's screens.
 * Every size inside the sketch is in container units (cqw), so the drawing
 * scales as one piece from a phone to a wide screen; the caption that says it
 * is a sketch sits outside it, in readable type.
 *
 * Shared by /projects and the Observatory. The layout switches on its own
 * width (container queries), not the viewport, so it fits either page; the
 * 60rem switch lands with the `lg` breakpoint the featured projects use.
 * In the Observatory (`variant="about"`) the chapter head above it carries
 * the dates and a full-width band carries the figures, so the story column
 * drops both.
 *
 * Reduced motion: the server can't know the setting, so the first client
 * render always matches what it sent, and the finished frame is set just
 * after mount (with zero-length transitions) instead of during render.
 */

const EASE = [0.16, 1, 0.3, 1];

/* ── the sketch ────────────────────────────────────────────────────────── */

// Gift types are Overflow's public product (card, bank, stock, crypto, DAF);
// every name and amount is a redaction bar, never a made-up value.
const ROWS = [
  { type: 'Stock', name: 15, amount: 6 },
  { type: 'Stock', name: 12, amount: 7, fix: true },
  { type: 'Card', name: 17, amount: 4 },
  { type: 'DAF', name: 11, amount: 6 },
  { type: 'Crypto', name: 14, amount: 5 },
  { type: 'ACH', name: 13, amount: 5 },
];
// what the work did: multi-holding gifts, corrections, and the audit trail
const AUDIT = ['Gift received · 2 holdings', 'Split across holdings · corrected', 'Correction logged · who, what, why'];

/** The sketch's beats, in ms after it comes into view (one pass, then it rests). */
const BEATS = [700, 1300, 1750, 2200, 2800, 3400, 4300];

function Bar({ w, tone = 'bg-black/10', h = '1.05cqw' }) {
  return <span className={`block rounded-full ${tone}`} style={{ width: `${w}cqw`, height: h }} />;
}

function Status({ fixed, needs }) {
  const style = fixed
    ? { background: '#e3f3e9', color: '#1d7243' }
    : needs
      ? { background: '#fff0d4', color: '#8a5800' }
      : { background: '#efece8', color: '#77716a' };
  return (
    <span
      className="inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium"
      style={{ ...style, fontSize: '1.2cqw', padding: '0.35cqw 1cqw' }}
    >
      {fixed ? 'Corrected' : needs ? 'Needs review' : 'Settled'}
    </span>
  );
}

function OverflowSketch({ ground, accent }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    // reduced motion: straight to the finished picture, after mount
    const timers = reduce ? [setTimeout(() => setBeat(BEATS.length), 0)] : BEATS.map((ms, i) => setTimeout(() => setBeat(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [inView, reduce]);

  const fixed = beat >= 2;
  const audit = Math.max(0, Math.min(AUDIT.length, beat - 2));
  const chat = beat >= 5;
  const typing = beat === 6;
  const answered = beat >= 7;
  const t = (duration, delay = 0) => (reduce ? { duration: 0 } : { duration, ease: EASE, delay });
  const rise = (delay = 0) => ({ initial: { opacity: 0, y: 14 }, animate: inView ? { opacity: 1, y: 0 } : {}, transition: t(0.8, delay) });

  return (
    <div
      ref={ref}
      aria-hidden
      className="@container relative aspect-[4/3] w-full overflow-hidden rounded-[22px] font-sans"
      style={{ background: ground }}
    >
      {/* light from above, so the ground has depth instead of reading flat */}
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_30%_0%,rgba(255,255,255,0.11),transparent_60%)]" />

      {/* the admin window: gift corrections, one gift being fixed */}
      <motion.div
        className="absolute overflow-hidden bg-[#fbfaf8] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.75)] ring-1 ring-black/20"
        style={{ left: '6cqw', top: '6.5cqw', width: '84cqw', borderRadius: '1.6cqw' }}
        {...rise(0)}
      >
        <div className="flex items-center bg-[#eeebe7]" style={{ height: '4.2cqw', gap: '0.9cqw', paddingLeft: '1.8cqw' }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="rounded-full bg-black/15" style={{ width: '1.05cqw', height: '1.05cqw' }} />
          ))}
          <span className="text-black/45" style={{ fontSize: '1.25cqw', marginLeft: '1.6cqw' }}>
            Internal admin · Gift corrections
          </span>
        </div>

        <div className="flex">
          {/* sidebar: redacted navigation, the current page marked */}
          <div className="flex flex-col bg-[#f4f1ed]" style={{ width: '14cqw', padding: '2.4cqw 1.8cqw', gap: '1.9cqw' }}>
            {[8, 9, 7, 10, 8, 6, 9].map((w, i) => (
              <span key={i} className="flex items-center" style={{ gap: '0.8cqw' }}>
                <span className="rounded-[0.3cqw]" style={{ width: '1.2cqw', height: '1.2cqw', background: i === 3 ? accent : 'rgba(0,0,0,0.12)' }} />
                <Bar w={w * 0.75} tone={i === 3 ? 'bg-black/30' : 'bg-black/10'} />
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1" style={{ padding: '2.4cqw 2.6cqw 2.2cqw' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#1c1a17]" style={{ fontSize: '2cqw', letterSpacing: '-0.02em' }}>
                  Gift corrections
                </div>
                <div className="text-black/45" style={{ fontSize: '1.2cqw', marginTop: '0.4cqw' }}>
                  Every change kept in the audit trail
                </div>
              </div>
              <span className="rounded-full bg-black/[0.06]" style={{ width: '13cqw', height: '2.8cqw' }} />
            </div>

            {/* the gifts */}
            <div style={{ marginTop: '2cqw' }}>
              {ROWS.map((r, i) => (
                <motion.div key={i} {...rise(0.15 + i * 0.07)}>
                  <div
                    className="grid items-center border-t border-black/[0.06]"
                    style={{
                      gridTemplateColumns: '3cqw minmax(0,1fr) 7.5cqw 7cqw 11cqw',
                      height: '4.6cqw',
                      background: r.fix ? 'rgba(0,0,0,0.025)' : 'transparent',
                    }}
                  >
                    <span className="rounded-full bg-black/10" style={{ width: '1.9cqw', height: '1.9cqw' }} />
                    <Bar w={r.name} />
                    <span className="text-black/55" style={{ fontSize: '1.25cqw' }}>
                      {r.type}
                    </span>
                    <Bar w={r.amount} tone="bg-black/15" />
                    <span className="flex justify-end">
                      <Status fixed={r.fix && fixed} needs={r.fix && !fixed} />
                    </span>
                  </div>

                  {/* the corrected gift opens onto its audit trail */}
                  {r.fix && (
                    <motion.div className="overflow-hidden" initial={{ height: 0 }} animate={{ height: audit > 0 ? 'auto' : 0 }} transition={t(0.55)}>
                      <ol className="relative" style={{ padding: '1cqw 0 1.6cqw 5.2cqw' }}>
                        <span className="absolute bg-black/10" style={{ left: '3.85cqw', top: '1.8cqw', bottom: '2.4cqw', width: '0.15cqw' }} />
                        {AUDIT.map((label, k) => (
                          <motion.li
                            key={label}
                            className="relative flex items-center text-[#3b3732]"
                            style={{ fontSize: '1.25cqw', height: '3cqw', gap: '1.2cqw' }}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: k < audit ? 1 : 0, x: k < audit ? 0 : -6 }}
                            transition={t(0.45)}
                          >
                            <span
                              className="absolute rounded-full"
                              style={{ left: '-1.85cqw', width: '1cqw', height: '1cqw', background: k === AUDIT.length - 1 ? '#1d7243' : accent }}
                            />
                            {label}
                          </motion.li>
                        ))}
                      </ol>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* the AI support chat, drawing on the help docs */}
      <motion.div
        className="absolute bg-white shadow-[0_30px_60px_-24px_rgba(0,0,0,0.7)] ring-1 ring-black/15"
        style={{ right: '4.5cqw', bottom: '5cqw', width: '38cqw', borderRadius: '1.8cqw', padding: '2cqw' }}
        initial={{ opacity: 0, y: 20 }}
        animate={chat ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={t(0.8)}
      >
        <div className="flex items-center" style={{ gap: '0.9cqw' }}>
          <span className="rounded-full" style={{ width: '1.4cqw', height: '1.4cqw', background: accent }} />
          <span className="font-semibold text-[#1c1a17]" style={{ fontSize: '1.4cqw' }}>
            Support
          </span>
          <span className="rounded-full bg-black/[0.06] text-black/55" style={{ fontSize: '1.05cqw', padding: '0.2cqw 0.8cqw' }}>
            AI
          </span>
        </div>
        <div className="flex justify-end" style={{ marginTop: '1.6cqw' }}>
          <span className="text-[#3a1408]" style={{ fontSize: '1.3cqw', padding: '1cqw 1.4cqw', borderRadius: '1.4cqw', background: '#ffe6dd' }}>
            Can I give stock from my brokerage?
          </span>
        </div>
        <div style={{ marginTop: '1.2cqw', minHeight: '7.4cqw' }}>
          <AnimatePresence mode="wait" initial={false}>
            {typing && (
              <motion.span
                key="typing"
                className="inline-flex items-center bg-[#f2efeb]"
                style={{ gap: '0.6cqw', padding: '1.2cqw 1.4cqw', borderRadius: '1.4cqw' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="rounded-full bg-black/30"
                    style={{ width: '0.8cqw', height: '0.8cqw' }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.span>
            )}
            {answered && (
              <motion.div
                key="answer"
                className="flex flex-col bg-[#f2efeb]"
                style={{ gap: '0.8cqw', padding: '1.3cqw 1.4cqw', borderRadius: '1.4cqw' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={t(0.5)}
              >
                <Bar w={28} tone="bg-black/15" />
                <Bar w={22} tone="bg-black/15" />
                <span className="text-black/45" style={{ fontSize: '1.05cqw' }}>
                  Draws on 25+ knowledge-base docs
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

/* ── the story ─────────────────────────────────────────────────────────── */

/** Keep hyphenated words whole ("Co-op") without a glyph Geist doesn't have. */
function NoBreakHyphens({ text }) {
  return text.split(' ').map((w, i) => (
    <Fragment key={i}>
      {i > 0 && ' '}
      {w.includes('-') ? <span className="whitespace-nowrap">{w}</span> : w}
    </Fragment>
  ));
}

function Quote({ q }) {
  // the first sentence is the headline; the rest reads as the body of the letter
  const [lead, ...rest] = q.quote.split(/(?<=[.!?])\s+/);
  return (
    <figure className="grid grid-cols-1 gap-x-14 gap-y-6 border-t border-line pt-12 @[60rem]:grid-cols-12">
      <figcaption className="flex flex-col gap-1.5 @[60rem]:col-span-4 @[60rem]:pt-2">
        <span className="font-mono text-micro uppercase tracking-[0.16em] text-ink-subtle">Recommendation</span>
        <span className="mt-3 text-[1.05rem] font-semibold text-ink">{q.name}</span>
        <span className="text-sm text-ink-muted">{q.title}</span>
        <a href={q.url} target="_blank" rel="noreferrer" className="mt-1 text-sm text-ink-subtle underline-offset-4 transition-colors hover:text-ink hover:underline">
          {q.source}, {q.date} <span aria-hidden>↗</span>
        </a>
      </figcaption>
      <blockquote className="@[60rem]:col-span-8">
        {/* the opening mark hangs outside the measure, so the text aligns */}
        <p className="relative text-balance font-display text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-[1.2] tracking-[-0.025em] text-ink">
          <span aria-hidden className="ov-accent absolute -left-[0.45em]">
            “
          </span>
          {lead}
          {rest.length === 0 && (
            <span aria-hidden className="ov-accent">
              ”
            </span>
          )}
        </p>
        {rest.length > 0 && (
          <p className="mt-5 max-w-[60ch] text-[1.05rem] leading-relaxed text-ink-muted">
            {rest.join(' ')}
            <span aria-hidden className="ov-accent">
              ”
            </span>
          </p>
        )}
      </blockquote>
    </figure>
  );
}

/** The team's lines: open pull quotes on hairlines, no cards. */
function Room({ room }) {
  return (
    <div className="grid grid-cols-1 gap-x-14 gap-y-6 pt-14 @[60rem]:grid-cols-12">
      <div className="text-balance font-mono text-micro uppercase tracking-[0.16em] text-ink-subtle @[60rem]:col-span-4 @[60rem]:pt-7">{room.context}</div>
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 @[40rem]:grid-cols-2 @[60rem]:col-span-8">
        {room.quotes.map((r) => (
          <figure key={r.text} className="border-t border-line pt-6">
            <blockquote className="relative font-display text-[1.375rem] font-medium leading-[1.3] tracking-[-0.02em] text-ink sm:text-[1.5rem]">
              <span aria-hidden className="ov-accent absolute -left-[0.5em]">
                “
              </span>
              {r.text}
              <span aria-hidden className="ov-accent">
                ”
              </span>
            </blockquote>
            <figcaption className="mt-4 font-mono text-micro uppercase tracking-[0.16em] text-ink-subtle">{r.by}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export default function OverflowShowcase({ job, variant }) {
  const about = variant === 'about';
  // in About the chapter's own title is the h3, so this nests a level down
  const Title = about ? 'h4' : 'h3';
  const Sub = about ? 'h5' : 'h4';
  const reduce = useReducedMotion();
  const steps = job.highlights.map((h) => ({ label: h.title, text: h.text }));
  // the same props on the server and the client, whatever the motion setting;
  // reduced motion only makes the transition instant
  const rise = (delay = 0) => ({
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: reduce ? { duration: 0 } : { duration: 0.85, ease: EASE, delay },
  });

  return (
    // in the About room the text accents take the room's one amber; the logo
    // and the sketch keep Overflow's own colour
    <div className="ov-scope @container" style={{ '--ov-dark': about ? 'var(--accent)' : job.colors.accent.dark, '--ov-light': about ? 'var(--accent)' : job.colors.accent.light }}>
      <article className="grid grid-cols-1 gap-x-14 gap-y-10 @[60rem]:grid-cols-12">
        {/* the picture holds while the story scrolls past it */}
        <div className="@[60rem]:col-span-7">
          <figure className="@[60rem]:sticky @[60rem]:top-28">
            <OverflowSketch ground={job.colors.ground} accent={job.colors.accent.dark} />
            <figcaption className="mt-3 text-label text-ink-subtle">A sketch of my work, not a screenshot</figcaption>
          </figure>
        </div>

        <div className="@container flex flex-col gap-8 @[60rem]:col-span-5 @[60rem]:py-4">
          <motion.div className="flex flex-col gap-5" {...rise()}>
            {!about && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-label text-ink-subtle">
                <span className="font-mono text-micro uppercase tracking-[0.16em] ov-accent">Most recent role</span>
                <span>
                  {job.dates} · {job.place}
                </span>
              </div>
            )}
            <Title>
              {/* eslint-disable-next-line @next/next/no-img-element -- a small SVG logo */}
              <img src={job.logo} alt={job.org} className="h-10 w-auto sm:h-12" />
            </Title>
            <div className="flex flex-col gap-3">
              <p className="font-display text-[1.6rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[1.9rem]">
                <NoBreakHyphens text={job.role} />
              </p>
              {job.returnOffer && !about && <Chip highlight={{ text: 'Return offer received' }} color="var(--ov)" />}
            </div>
            <p className="max-w-[46ch] text-[1.075rem] leading-relaxed text-ink-muted">
              {job.about} {job.funding}
            </p>
          </motion.div>

          {/* the scale it runs at (three across once the column has room);
              in the Observatory the band above carries these */}
          {!about && (
            <motion.dl className="grid grid-cols-1 gap-x-6 gap-y-5 @[26rem]:grid-cols-3" {...rise(0.05)}>
              {job.stats.map((st) => (
                <div key={st.label} className="flex min-w-0 flex-col">
                  <dt className="order-last mt-2 text-label leading-snug text-ink-subtle">{st.label}</dt>
                  <dd className="font-display text-[1.75rem] font-semibold leading-none tracking-[-0.035em] text-ink tabular-nums">{st.value}</dd>
                </div>
              ))}
            </motion.dl>
          )}

          <div>
            <Sub className="mb-2 text-sm font-semibold text-ink">What I did</Sub>
            <Steps steps={steps} color="var(--ov)" />
            <p className="mt-4 text-sm text-ink-subtle">{job.tags.join(' · ')}</p>
          </div>

          <motion.div className="flex flex-wrap gap-3" {...rise(0.05)}>
            <a href={job.url} target="_blank" rel="noreferrer" className={PILL_LINE}>
              {job.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} <span aria-hidden className="text-ink-subtle">↗</span>
            </a>
          </motion.div>
        </div>
      </article>

      {/* the people who saw the work */}
      {(job.testimonial || job.room) && (
        <motion.div className="mt-16 @[60rem]:mt-24" {...rise()}>
          {job.testimonial && <Quote q={job.testimonial} />}
          {job.room && <Room room={job.room} />}
        </motion.div>
      )}
    </div>
  );
}
