'use client';

/**
 * DealFigure — the hero: the experiment's core move in one picture. One
 * participant's sixteen weakest letter pairs, ranked 1 (weakest) to 16, are
 * dealt into four sets in snake order — A B C D, then D C B A, and again — so
 * every set ends up with the same rank total. Then a seeded shuffle gives
 * each set one drill method. That is what makes the comparison fair inside
 * one person: no method gets the easy pairs.
 *
 * The queue of ranks sits on top; each rank leaves it and lands in its set,
 * one beat apart, with an amber edge while it is the tile landing (the only
 * accent in the figure). Each row of slots carries its direction (→ / ←).
 * When the deal is done each column shows its rank total (Σ, computed from
 * the deal, never typed in) and the method the shuffle gave it — for the
 * first example participant id in ASSIGN.participants, a real run of the
 * repo's shuffle. Tiles are tinted by rank: weaker = brighter.
 *
 * Plays once on mount (the hero is on screen at once). Reduced motion: the
 * finished deal, nothing moves. Layout: HTML grid, so labels never shrink
 * under 11px — four columns from 360px up.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { ASSIGN } from '@/data/studies/typist-ml';
import { armLabel } from '@/components/ui/case/typist-ml/parts';

/* ── timing ────────────────────────────────────────────────────────────── */
const LEAD_S = 0.7; // after the hero text starts settling
const STEP_S = 0.16; // one rank per beat
const LAND_S = 0.45;
const GLOW_S = 0.9; // the landing tile's amber edge fades to the hairline
const AFTER_S = 0.35; // totals and methods arrive after the last tile

/* ── the deal, from the study data (services/assignment.py snake_deal) ─── */
const SETS = ASSIGN.sets.length;
const COUNT = ASSIGN.perSet * SETS;
const DEALT = Array.from({ length: COUNT }, (_, index) => {
  const cycle = Math.floor(index / SETS);
  const position = index % SETS;
  return { rank: index + 1, set: cycle % 2 === 0 ? position : SETS - 1 - position, row: cycle };
});
const PARTICIPANT = ASSIGN.participants[0];
const COLUMNS = ASSIGN.sets.map((label, s) => {
  const tiles = DEALT.filter((d) => d.set === s);
  return { label, tiles, sum: tiles.reduce((n, t) => n + t.rank, 0), arm: PARTICIPANT.arms[s] };
});
const ROWS = Array.from({ length: ASSIGN.perSet }, (_, r) => r);
const DONE_S = LEAD_S + COUNT * STEP_S + AFTER_S;
const tint = (rank) => alpha(P.ink, 0.03 + ((COUNT - rank) / (COUNT - 1)) * 0.11);
const dealAt = (rank) => LEAD_S + (rank - 1) * STEP_S;

export default function DealFigure({ accent }) {
  const reduce = Boolean(useReducedMotion());
  const sums = [...new Set(COLUMNS.map((c) => c.sum))];

  return (
    <div className="rounded-panel border border-line bg-surface p-4 sm:p-6">
      <p className="sr-only">
        {`Ranks 1 to ${COUNT} are dealt into sets ${ASSIGN.sets.join(', ')} in snake order. `}
        {COLUMNS.map((c) => `Set ${c.label}: ranks ${c.tiles.map((t) => t.rank).join(', ')}, total ${c.sum}, method ${armLabel(c.arm)}.`).join(' ')}
      </p>

      <div aria-hidden="true">
        {/* the queue */}
        <div className="flex items-baseline justify-between gap-3">
          <span className="mc-label">Weakest pairs, ranked</span>
          <span className="font-mono text-micro text-ink-subtle">1 = weakest</span>
        </div>
        <ol className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-16">
          {DEALT.map((d) => (
            <motion.li
              key={d.rank}
              className="flex h-6 items-center justify-center rounded-chip border border-line font-mono text-micro tabular-nums text-ink-muted"
              initial={reduce ? false : { opacity: 1 }}
              animate={{ opacity: 0.28 }}
              transition={reduce ? { duration: 0 } : { delay: dealAt(d.rank), duration: 0.25 }}
            >
              {d.rank}
            </motion.li>
          ))}
        </ol>

        {/* the sets */}
        <div className="mt-6 grid grid-cols-[1.25rem_repeat(4,minmax(0,1fr))] gap-x-2 gap-y-2 sm:gap-x-3">
          <span />
          {COLUMNS.map((c) => (
            <span key={c.label} className="text-center font-mono text-micro font-medium uppercase tracking-[0.16em] text-ink-subtle">
              Set {c.label}
            </span>
          ))}

          {ROWS.map((r) => (
            <Row key={r} row={r} reduce={reduce} accent={accent} />
          ))}

          <span />
          {COLUMNS.map((c) => (
            <motion.span
              key={`sum-${c.label}`}
              className="mt-1 border-t border-line pt-2 text-center font-mono text-label tabular-nums text-ink"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reduce ? { duration: 0 } : { delay: DONE_S, duration: 0.4 }}
            >
              Σ {c.sum}
            </motion.span>
          ))}

          <span />
          {COLUMNS.map((c, i) => (
            <motion.span
              key={`arm-${c.label}`}
              className="flex min-h-8 items-center justify-center rounded-chip border border-line-hi bg-surface-2 px-1 text-center font-mono text-micro leading-tight text-ink"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { delay: DONE_S + 0.25 + i * 0.08, duration: 0.4, ease: EASE_OUT }}
            >
              {armLabel(c.arm)}
            </motion.span>
          ))}
        </div>

        <motion.p
          className="mt-4 text-center font-mono text-micro leading-relaxed text-ink-subtle"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduce ? { duration: 0 } : { delay: DONE_S + 0.6, duration: 0.4 }}
        >
          {sums.length === 1 ? `Every set totals ${sums[0]}` : 'Set totals differ'} · methods by a seeded shuffle
        </motion.p>
      </div>
    </div>
  );
}

/** One row of slots: its direction, then a tile per set. */
function Row({ row, reduce, accent }) {
  const forward = row % 2 === 0;
  return (
    <>
      <span className="flex items-center justify-center font-mono text-micro text-ink-subtle">{forward ? '→' : '←'}</span>
      {COLUMNS.map((c) => {
        const tile = c.tiles.find((t) => t.row === row);
        const at = dealAt(tile.rank);
        return (
          <span key={c.label} className="relative h-9 rounded-md border border-dashed border-line">
            <motion.span
              className="absolute -inset-px flex items-center justify-center rounded-md border font-mono text-label tabular-nums text-ink"
              style={{ background: tint(tile.rank) }}
              initial={reduce ? false : { opacity: 0, y: -14, borderColor: accent }}
              animate={{ opacity: 1, y: 0, borderColor: reduce ? P.lineHi : [accent, accent, P.lineHi] }}
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      opacity: { delay: at, duration: LAND_S * 0.6 },
                      y: { delay: at, duration: LAND_S, ease: EASE_OUT },
                      borderColor: { delay: at, duration: GLOW_S, times: [0, 0.45, 1] },
                    }
              }
            >
              {tile.rank}
            </motion.span>
          </span>
        );
      })}
    </>
  );
}
