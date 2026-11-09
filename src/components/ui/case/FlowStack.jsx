'use client';
/**
 * The hero figure for the generic case studies (StudyPage): the project's flow
 * as an isometric stack of slabs, one per step, after the Church Building
 * hero (ApprovalStack). Step 1 sits at the bottom; a token in the accent
 * climbs the stack, each slab lighting as it arrives, and the caption under
 * the stack says what happens at that step. Labels alternate left and right
 * with a short leader, numbered in the accent.
 *
 * On first view the slabs settle into place bottom-up; the climb then loops
 * while the stack is on screen. Under reduced motion the finished stack is
 * simply there, with no token. The same steps are in a visually hidden list
 * for screen readers. Below 640px StudyPage shows the plain numbered list
 * instead, so the labels never shrink past legibility.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { P, alpha } from '@/components/ui/case/tokens';
import { EASE_OUT } from '@/lib/motion';

/* geometry, in viewBox units */
const VIEW_W = 620;
const VR = 0.32; // isometric vertical : horizontal, flat so slabs read as platforms
const DEPTH = 13; // slab thickness
const PITCH = 56; // vertical distance between slabs
const BASE_W = 122; // half-width of the bottom slab
const STEP_W = 6; // each slab up is this much narrower
const LEADER = 18; // slab corner to label
const PAD = 14;
const STEP_MS = 1500; // the token's stay on each slab
const MOVE_S = 0.55; // its climb between slabs

const mix = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, var(--void))`;

function slab(cx, y, w) {
  const h = w * VR;
  return {
    top: `${cx - w},${y} ${cx},${y - h} ${cx + w},${y} ${cx},${y + h}`,
    left: `${cx - w},${y} ${cx},${y + h} ${cx},${y + h + DEPTH} ${cx - w},${y + DEPTH}`,
    right: `${cx},${y + h} ${cx + w},${y} ${cx + w},${y + DEPTH} ${cx},${y + h + DEPTH}`,
  };
}

export default function FlowStack({ steps, accent = P.accent }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const entered = useInView(ref, { once: true, amount: 0.3 });
  const onScreen = useInView(ref, { amount: 0.3 });
  const [beat, setBeat] = useState(0);
  const n = steps.length;

  // the climb: one slab per beat, only while the stack is on screen
  useEffect(() => {
    if (reduce || !onScreen) return undefined;
    const id = setInterval(() => setBeat((b) => b + 1), STEP_MS);
    return () => clearInterval(id);
  }, [reduce, onScreen]);

  const current = reduce ? -1 : beat % n;
  const cx = VIEW_W / 2;
  const topW = BASE_W - (n - 1) * STEP_W;
  const top = PAD + topW * VR + 4;
  const ys = steps.map((_, i) => top + (n - 1 - i) * PITCH); // i = 0 is the bottom slab
  const viewH = ys[0] + BASE_W * VR + DEPTH + PAD;

  return (
    <div ref={ref} className="mx-auto w-full max-w-[600px]">
      <ol className="sr-only">
        {steps.map((s, i) => (
          <li key={s.key}>
            {i + 1}. {s.label}: {s.title}
          </li>
        ))}
      </ol>
      <svg viewBox={`0 0 ${VIEW_W} ${viewH}`} className="block h-auto w-full overflow-visible" aria-hidden="true">
        {/* the spine the token climbs */}
        <line x1={cx} y1={ys[n - 1]} x2={cx} y2={ys[0]} stroke={P.lineHi} strokeWidth="1" strokeDasharray="2 4" />

        {steps.map((s, i) => {
          const w = BASE_W - i * STEP_W;
          const y = ys[i];
          const f = slab(cx, y, w);
          const on = i === current;
          const passed = current >= 0 && i < current;
          const right = i % 2 === 0;
          const edgeX = right ? cx + w : cx - w;
          const textX = right ? cx + w + LEADER + 6 : cx - w - LEADER - 6;
          const stroke = on ? accent : passed ? alpha(accent, 0.45) : P.lineHi;
          return (
            <motion.g
              key={s.key}
              initial={reduce ? false : { opacity: 0, y: -12 }}
              animate={entered ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: reduce ? 0 : 0.08 + i * 0.08 }}
            >
              <polygon points={f.left} fill={on ? mix(accent, 22) : mix(P.ink, 9)} stroke={stroke} strokeWidth="1" strokeLinejoin="round" style={{ transition: 'fill .3s, stroke .3s' }} />
              <polygon points={f.right} fill={on ? mix(accent, 14) : mix(P.ink, 6)} stroke={stroke} strokeWidth="1" strokeLinejoin="round" style={{ transition: 'fill .3s, stroke .3s' }} />
              <polygon points={f.top} fill={on ? mix(accent, 16) : passed ? mix(accent, 6) : mix(P.ink, 3)} stroke={stroke} strokeWidth={on ? 1.75 : 1} strokeLinejoin="round" style={{ transition: 'fill .3s, stroke .3s' }} />

              {/* the leader and the label */}
              <line x1={edgeX} y1={y} x2={right ? edgeX + LEADER : edgeX - LEADER} y2={y} stroke={on ? accent : P.lineHi} strokeWidth="1" style={{ transition: 'stroke .3s' }} />
              <text x={textX} y={y + 5} textAnchor={right ? 'start' : 'end'} style={{ transition: 'fill .3s' }}>
                <tspan className="font-mono" fontSize="12.5" fill={accent}>
                  {String(i + 1).padStart(2, '0')}
                </tspan>
                <tspan dx="8" fontSize="15" fontWeight={on ? 600 : 500} fill={on ? P.ink : P.inkMuted}>
                  {s.label}
                </tspan>
              </text>
            </motion.g>
          );
        })}

        {/* the token, climbing from the bottom slab to the top */}
        {current >= 0 && (
          <motion.g
            initial={false}
            animate={{ y: ys[current] }}
            transition={current === 0 ? { duration: 0 } : { duration: MOVE_S, ease: EASE_OUT }}
          >
            <circle cx={cx} cy={0} r="12" fill={alpha(accent, 0.18)} />
            <circle cx={cx} cy={0} r="5" fill={accent} />
          </motion.g>
        )}
      </svg>

      {/* what happens at this step */}
      <div className="mt-4 min-h-[3.25rem] text-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {current >= 0 && (
            <motion.p
              key={current}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="mx-auto max-w-[44ch] text-sm leading-snug text-ink-muted"
            >
              <span className="font-mono text-label" style={{ color: accent }}>
                {String(current + 1).padStart(2, '0')}
              </span>{' '}
              {steps[current].title}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
