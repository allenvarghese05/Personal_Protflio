'use client';

/**
 * PracticeDay — "Ten practice days, four blocks each, the order rotating
 * daily — and the session API only ever says Block 1 to Block 4."
 *
 * services/session_planner.py as a calendar. The left of the panel is the
 * whole practice schedule: a row per day, a column per block, each cell the
 * method's initial — a cyclic Latin square (day n shifts the method order
 * left by n − 1, so every method takes every position). The picked day's
 * row is in the accent; days before it are done (jade rule). The right is
 * that day's session two ways — toggle between them:
 *
 *   stored   what the database keeps: the block order string (e.g. "HMLC"),
 *            and for each block its method and its two 300-character drills
 *            (600 characters a block).
 *   sent     what the planner returns to the browser: "Block 1"…"Block 4" and
 *            the text. No method, no block order — the participant types
 *            blind to which block is which.
 * Under it, the drill pool for the day: six ready drills per method (three
 * days' worth); the day uses two of each, and completing the session tops
 * every method back up to six by queueing generation jobs.
 *
 * Renders only from PLANNER and ARMS in src/data/studies/typist-ml.js; the
 * square, the block order strings and the pool counts are computed with the
 * planner's own rules. Reduced motion: no fades. The schedule scrolls inside
 * itself on a narrow screen rather than shrinking its labels.
 */
import { useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { ARMS, PLANNER } from '@/data/studies/typist-ml';
import { Choices, IN_VIEW, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';

/* ── derived ───────────────────────────────────────────────────────────── */
const N = ARMS.length;
const DAYS = Array.from({ length: PLANNER.practiceDays }, (_, d) => d + 1);
// latin_square_arms(arms, rotation_index): arms shifted left by index % n;
// the index is the number of completed practice sessions (day − 1)
const orderOf = (day) => Array.from({ length: N }, (_, i) => ARMS[(i + (day - 1)) % N]);
const PER_BLOCK = Math.max(1, Math.floor(PLANNER.blockChars / PLANNER.drillChars));
const POOL = PLANNER.poolDays * PER_BLOCK;
const VIEWS = [
  { key: 'stored', label: 'What the database stores' },
  { key: 'sent', label: 'What the browser gets' },
];

function Schedule({ day, accent }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[15rem] border-separate border-spacing-y-1 font-mono text-micro">
        <caption className="sr-only">Practice schedule: method per block, per day</caption>
        <thead>
          <tr className="text-ink-subtle">
            <th scope="col" className="pb-1 pr-2 text-left font-medium uppercase tracking-[0.14em]">
              Day
            </th>
            {ARMS.map((_, i) => (
              <th key={i} scope="col" className="pb-1 text-center font-medium uppercase tracking-[0.14em]">
                B{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d) => {
            const current = d === day;
            const done = d < day;
            return (
              <tr key={d}>
                <th
                  scope="row"
                  className="border-l-2 py-1 pl-2 pr-2 text-left font-normal tabular-nums"
                  style={{ borderColor: current ? accent : done ? alpha(P.jade, 0.7) : P.line, color: current ? accent : P.inkSubtle }}
                >
                  {d}
                </th>
                {orderOf(d).map((a, i) => (
                  <td
                    key={i}
                    className="rounded-sm py-1 text-center text-label"
                    style={{
                      color: current ? P.ink : done ? P.inkMuted : P.inkSubtle,
                      background: current ? alpha(accent, 0.1) : 'transparent',
                    }}
                  >
                    <span aria-hidden="true">{a.initial}</span>
                    <span className="sr-only">{a.label}</span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Blocks({ day, view, reduce }) {
  const order = orderOf(day);
  const stored = view === 'stored';
  return (
    <div>
      <p className="font-mono text-micro text-ink-subtle">
        {stored ? (
          <>
            sessions.block_order = <span className="text-ink">&quot;{order.map((a) => a.initial).join('')}&quot;</span>
          </>
        ) : (
          <>no method, no block order — labels and text only</>
        )}
      </p>
      <ol className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        {order.map((a, i) => (
          <motion.li
            key={`${view}-${day}-${i}`}
            className="flex min-w-0 flex-col gap-1 rounded-md border border-line bg-surface-2 px-3 py-2.5"
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={at(reduce, i * 0.05, 0.3)}
          >
            <span className="text-body text-ink">Block {i + 1}</span>
            {stored ? (
              <span className="font-mono text-micro text-ink-muted">
                {a.label} · {PER_BLOCK} drills · {PLANNER.blockChars} chars
              </span>
            ) : (
              <span className="font-mono text-micro text-ink-subtle">{PLANNER.blockChars} characters to type</span>
            )}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

function Pool() {
  return (
    <div>
      <span className="mc-label">Drill pool, per method</span>
      <ul className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        {ARMS.map((a) => (
          <li key={a.key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-label text-ink-muted">{a.label}</span>
            <span className="flex gap-1" aria-label={`${POOL - PER_BLOCK} ready after today, ${PER_BLOCK} used`}>
              {Array.from({ length: POOL }, (_, i) => {
                const used = i < PER_BLOCK;
                return (
                  <span
                    key={i}
                    aria-hidden="true"
                    className="h-3 w-3 rounded-[2px]"
                    style={used ? { boxShadow: `inset 0 0 0 1px ${P.inkSubtle}` } : { background: P.inkMuted }}
                  />
                );
              })}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-label text-ink-subtle">
        Hollow = used today. Completing a practice session queues jobs to bring every method back to {POOL} ready drills ({PLANNER.poolDays} days’ worth).
      </p>
    </div>
  );
}

export default function PracticeDay({ accent }) {
  const reduce = Boolean(useReducedMotion());
  const ref = useRef(null);
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, '1');
  const [view, setView] = useState('stored');
  const day = Number(active?.key ?? 1);
  const order = orderOf(day);
  const runKey = active ? `${active.key}-${active.run}` : 'idle';

  const text =
    view === 'stored'
      ? `Day ${day}: ${order.map((a) => a.label).join(' → ')}. Stored as “${order.map((a) => a.initial).join('')}” — never sent to the browser.`
      : `Day ${day}: the browser gets Block 1 to Block ${N} and their text. Which method wrote which block stays in the database (the builder, also a participant, is never blinded).`;

  return (
    <div ref={ref}>
      <PanelFrame
        caption="services/session_planner.py"
        controls={
          <div className="flex flex-col gap-2">
            <Choices label="Practice day" options={DAYS.map((d) => ({ key: String(d), label: `Day ${d}` }))} value={String(day)} onChoose={choose} accent={accent} />
            <Choices label="View" options={VIEWS} value={view} onChoose={setView} accent={accent} />
          </div>
        }
        footer={
          <Readout runKey={`${runKey}-${view}`} delay={0} reduce={reduce} tone={view === 'stored' ? P.inkSubtle : P.jade} status={view === 'stored' ? 'stored' : 'blinded'}>
            <span className="text-body text-ink-muted">{text}</span>
          </Readout>
        }
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <Schedule day={day} accent={accent} />
          <div className="flex min-w-0 flex-col gap-6">
            <Blocks day={day} view={view} reduce={reduce} />
            <Pool />
          </div>
        </div>
      </PanelFrame>
      <p className="mt-3 max-w-[64ch] text-label text-ink-subtle">
        A session left unfinished for more than {PLANNER.staleMinutes} minutes is marked abandoned, and the next one starts fresh. Picked drills are marked
        used in the same transaction that creates the blocks, so no drill is ever typed twice.
      </p>
    </div>
  );
}
