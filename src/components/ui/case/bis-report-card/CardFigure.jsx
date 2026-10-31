'use client';

/**
 * CardFigure — the hero: one report card, four hands. The analogue of the
 * Church Building page's approval stack, for a school.
 *
 * Left, the four stages (CARD_STAGES) as a numbered list; right, the card
 * itself, drawn in HTML so no label ever drops under 11px. The figure plays
 * the cycle the system enforces: the subject rows fill one by one (subject
 * teachers), the class block fills and the card is submitted (class teacher),
 * the DRAFT watermark lifts and the lock stamp lands (division head), then
 * two more cards rise behind it (printing the section, a card a student).
 * The stage that's acting is amber; finished stages carry a jade tick; the
 * rest wait on an idle ring. It loops while on screen, holding the finished
 * card a beat. The stage list is decorative for screen readers, which get one
 * sentence describing the cycle instead.
 *
 * Layout: a container query puts the stages beside the card from 30rem, and
 * below it under that (the card leads).
 *
 * The marks are the sample in CARD_SAMPLE (subjects and maxima from the
 * marks-based reference template, marks illustrative); the bar lengths and
 * the 45 / 50 figures are derived from it.
 *
 * Motion: a timer advances one step per beat only while the figure is in
 * view. Reduced motion: the finished, approved card, still.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { Glyph, at } from '@/components/ui/case/kit';
import { LABEL } from '@/components/ui/case/shell';
import { CARD_SAMPLE, CARD_STAGES } from '@/data/studies/bis-report-card';

/* ── the cycle ─────────────────────────────────────────────────────────── */
const SUBJECTS = CARD_SAMPLE.subjects;
// steps: 0 blank · 1…n subject rows · class block · submitted · approved · printed
const S_CLASS = SUBJECTS.length + 1;
const S_SUBMIT = S_CLASS + 1;
const S_APPROVE = S_SUBMIT + 1;
const S_PRINT = S_APPROVE + 1;
const LAST = S_PRINT;
const STEP_MS = 650;
const HOLD_MS = 2600; // the finished card, before it starts over
const VIEW = { amount: 0.4 };

/** The stage acting at `step` (−1: none yet). */
function stageAt(step) {
  if (step === 0) return -1;
  if (step < S_CLASS) return 0;
  if (step < S_APPROVE) return 1;
  if (step < S_PRINT) return 2;
  return 3;
}

const pad2 = (n) => String(n).padStart(2, '0');

/* ── pieces ────────────────────────────────────────────────────────────── */

function StageList({ active, accent, reduce }) {
  return (
    <ol aria-label="Who touches a card, in order" className="flex flex-col">
      {CARD_STAGES.map((s, i) => {
        const state = i < active ? 'done' : i === active ? 'now' : 'wait';
        return (
          <li key={s.key} className="relative flex gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
            <span className="relative mt-0.5 shrink-0">
              <Glyph kind={state === 'done' ? 'tick' : 'idle'} />
              {state === 'now' && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-[5px] rounded-full"
                  style={{ background: accent }}
                  initial={{ scale: reduce ? 1 : 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={at(reduce, 0, 0.25)}
                />
              )}
            </span>
            <div className="min-w-0">
              <p className={`${LABEL} ${state === 'wait' ? 'text-ink-subtle' : 'text-ink-muted'}`}>
                <span style={state === 'now' ? { color: accent } : undefined}>{pad2(i + 1)}</span> · {s.who}
              </p>
              <p className={`mt-1 text-label ${state === 'wait' ? 'text-ink-subtle' : 'text-ink'}`}>{s.does}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** One subject row: label, a bar, the score — empty until its step. */
function SubjectRow({ subject, filled, reduce }) {
  const share = subject.score / subject.max;
  return (
    <li className="grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_3.25rem] items-center gap-2.5 py-[5px]">
      <span className="truncate text-label text-ink-muted">{subject.label}</span>
      <span aria-hidden="true" className="relative h-[5px] overflow-hidden rounded-full bg-line">
        <motion.span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${share * 100}%`, background: alpha(P.ice, 0.8), transformOrigin: 'left' }}
          initial={false}
          animate={{ scaleX: filled ? 1 : 0 }}
          transition={at(reduce, 0, 0.45)}
        />
      </span>
      <span className="text-right font-mono text-micro tabular-nums text-ink-muted">
        {filled ? `${subject.score} / ${subject.max}` : `— / ${subject.max}`}
      </span>
    </li>
  );
}

function Sheet({ step, reduce, className = '' }) {
  const approved = step >= S_APPROVE;
  const classFilled = step >= S_CLASS;
  return (
    <div
      className={`relative overflow-hidden rounded-md border bg-surface-2 p-4 ${className}`}
      style={{ borderColor: P.lineHi, boxShadow: `0 18px 40px -24px ${alpha(P.void, 0.9)}` }}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <p className={`${LABEL} text-ink-subtle`}>{CARD_SAMPLE.school}</p>
          <p className="mt-1 font-display text-base font-semibold leading-tight text-ink">{CARD_SAMPLE.title}</p>
        </div>
        <span aria-hidden="true" className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-line-hi" />
      </div>

      {/* scholastic */}
      <ul className="mt-3">
        {SUBJECTS.map((s, i) => (
          <SubjectRow key={s.label} subject={s} filled={step >= i + 1} reduce={reduce} />
        ))}
      </ul>

      {/* class teacher's block: co-scholastic, attendance, the remark */}
      <div className="mt-3 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CARD_SAMPLE.coScholastic.map((g, i) => (
            <motion.span
              key={`${g}-${i}`}
              className="inline-flex h-6 min-w-6 items-center justify-center rounded-chip border px-1 font-mono text-micro"
              initial={false}
              animate={{ opacity: classFilled ? 1 : 0.25 }}
              transition={at(reduce, classFilled ? i * 0.06 : 0, 0.3)}
              style={{ borderColor: P.lineHi, color: P.inkMuted }}
            >
              {classFilled ? g : '·'}
            </motion.span>
          ))}
          <span className="ml-auto font-mono text-micro text-ink-subtle">{classFilled ? `attendance ${CARD_SAMPLE.attendance}` : 'attendance —'}</span>
        </div>
        <div aria-hidden="true" className="mt-2.5 flex flex-col gap-1.5">
          {[0.92, 0.64].map((w) => (
            <motion.span
              key={w}
              className="h-[3px] rounded-full bg-ink-faint"
              style={{ width: `${w * 100}%`, transformOrigin: 'left' }}
              initial={false}
              animate={{ scaleX: classFilled ? 1 : 0 }}
              transition={at(reduce, 0.15, 0.45)}
            />
          ))}
        </div>
      </div>

      {/* footer: where it stands */}
      <div className="mt-3 flex min-h-7 items-center justify-between gap-3 border-t border-line pt-3">
        <span className="font-mono text-micro text-ink-subtle">
          {approved ? 'approved · locked' : step >= S_SUBMIT ? 'submitted for review' : 'draft · editable'}
        </span>
        {approved && (
          <motion.span
            className="inline-flex items-center gap-1.5 rounded-chip border px-2 py-1 font-mono text-micro uppercase tracking-[0.12em]"
            style={{ color: P.jade, borderColor: alpha(P.jade, 0.5), background: alpha(P.jade, 0.08) }}
            initial={reduce ? false : { opacity: 0, scale: 1.25, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: -3 }}
            transition={at(reduce, 0, 0.35)}
          >
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
              <rect x="2.5" y="5.5" width="7" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 5.5 V4 a2 2 0 0 1 4 0 V5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Locked
          </motion.span>
        )}
      </div>

      {/* the watermark, until approval */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 whitespace-nowrap font-mono text-sm font-semibold uppercase tracking-[0.2em]"
        style={{ color: alpha(P.sand, 0.32), x: '-50%', y: '-50%', rotate: -24 }}
        initial={false}
        animate={{ opacity: approved ? 0 : 1 }}
        transition={at(reduce, 0, 0.5)}
      >
        {CARD_SAMPLE.watermark}
      </motion.span>
    </div>
  );
}

/* ── the figure ────────────────────────────────────────────────────────── */

export default function CardFigure({ accent = P.accent }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, VIEW);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return undefined;
    const id = setTimeout(() => setStep((s) => (s >= LAST ? 0 : s + 1)), step >= LAST ? HOLD_MS : STEP_MS);
    return () => clearTimeout(id);
  }, [inView, reduce, step]);

  const shown = reduce ? LAST : step;
  const printed = shown >= S_PRINT;

  return (
    <div ref={ref} className="@container w-full min-w-0">
      <p className="sr-only">
        A report card passes through four hands: subject teachers enter marks, the class teacher adds co-scholastic
        grades, attendance and a remark and submits it, the division head approves and locks it — removing the DRAFT
        watermark — and the section is printed, one card per student.
      </p>
      <div aria-hidden="true" className="grid grid-cols-1 items-center gap-6 @[30rem]:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] @[30rem]:gap-7">
        <div className="order-2 min-w-0 @[30rem]:order-1">
          <StageList active={stageAt(shown)} accent={accent} reduce={reduce} />
        </div>
        <div className="relative order-1 min-w-0 @[30rem]:order-2">
          {/* the rest of the section, printing behind it */}
          {[2, 1].map((k) => (
            <motion.div
              key={k}
              className="absolute inset-0"
              initial={false}
              animate={{ y: printed ? k * -9 : 0, scale: printed ? 1 - k * 0.04 : 1, opacity: printed ? 1 - k * 0.3 : 0 }}
              transition={at(reduce, printed ? (2 - k) * 0.12 : 0, 0.45)}
            >
              <div className="h-full rounded-md border border-line bg-surface" />
            </motion.div>
          ))}
          <Sheet step={shown} reduce={reduce} className="relative" />
          {printed && (
            <motion.span
              className="absolute -bottom-3 right-3 rounded-chip border border-line-hi bg-void px-2 py-1 font-mono text-micro text-ink-muted"
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={at(reduce, 0.3, 0.3)}
            >
              PDF · one card per student
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}
