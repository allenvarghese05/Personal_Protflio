'use client';

/**
 * Assignment — "Rank the weakest pairs with a prior, deal the top sixteen into
 * four equal sets, shuffle which method gets which — then the database
 * refuses edits."
 *
 * services/assignment.py, one stage at a time. Four toggles, one panel:
 *
 *   shrink   why a raw error rate can't rank pairs: the two hand-computed
 *            cases from the unit tests. Each shows the raw rate (a hollow
 *            bar) against the smoothed one (filled), with the participant's
 *            average as a dashed tick and the arithmetic in mono.
 *   deal     the top sixteen dealt in snake order into sets A–D, a row per
 *            pass with its direction; each set's rank total, computed.
 *   shuffle  which method each set gets — random.Random("seed:participant"),
 *            run on three example ids. Pick one; the map changes, and the
 *            same id always gives the same map.
 *   freeze   the trigger from migration 0005, and a button that tries an
 *            UPDATE — it aborts (alert cross). Since T3.5 the 33 experiment
 *            config keys are frozen the same way.
 *
 * Renders only from ASSIGN and ARMS in src/data/studies/typist-ml.js; the
 * smoothed rates, the deal and the totals are computed here with the same
 * formulas as the code. Bars grow once a stage is shown (instantly under
 * reduced motion); nothing else moves on its own.
 */
import { useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { ASSIGN } from '@/data/studies/typist-ml';
import { Choices, Glyph, IN_VIEW, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';
import { armLabel, pct } from '@/components/ui/case/typist-ml/parts';

/* ── derived from the study data ───────────────────────────────────────── */
const SETS = ASSIGN.sets.length;
const COUNT = ASSIGN.perSet * SETS;
const DEALT = Array.from({ length: COUNT }, (_, index) => {
  const cycle = Math.floor(index / SETS);
  const position = index % SETS;
  return { rank: index + 1, set: cycle % 2 === 0 ? position : SETS - 1 - position, row: cycle };
});
const COLUMNS = ASSIGN.sets.map((label, s) => {
  const tiles = DEALT.filter((d) => d.set === s);
  return { label, tiles, sum: tiles.reduce((n, t) => n + t.rank, 0) };
});
const smoothed = ({ errors, attempts, p0 }) => (errors + ASSIGN.strength * p0) / (attempts + ASSIGN.strength);
const EXAMPLES = ASSIGN.examples.map((e) => ({ ...e, raw: e.errors / e.attempts, smooth: smoothed(e) }));
const SCALE = Math.max(...EXAMPLES.map((e) => e.raw)) * 1.1;

const STAGES = [
  { key: 'shrink', label: '1 · Shrink' },
  { key: 'deal', label: '2 · Deal' },
  { key: 'shuffle', label: '3 · Shuffle' },
  { key: 'freeze', label: '4 · Freeze' },
];
const fmt3 = (v) => v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');

/* ── stage: shrink ─────────────────────────────────────────────────────── */
function Bar({ value, hollow, reduce, delay }) {
  return (
    <div className="relative h-2.5 min-w-0 flex-1 rounded-sm" style={{ background: alpha(P.lineHi, 0.35) }}>
      <motion.span
        className="absolute inset-y-0 left-0 rounded-sm"
        style={hollow ? { background: P.surface, boxShadow: `inset 0 0 0 1px ${alpha(P.slate, 0.9)}` } : { background: P.inkMuted }}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${(value / SCALE) * 100}%` }}
        transition={at(reduce, delay, 0.7)}
      />
    </div>
  );
}

function Shrink({ reduce }) {
  return (
    <div className="flex flex-col gap-6">
      {EXAMPLES.map((e, i) => (
        <div key={e.key} className="min-w-0">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-body text-ink">{e.label}</span>
            <span className="font-mono text-micro text-ink-subtle">
              their average p0 = {pct(e.p0, 0)} · {e.source}
            </span>
          </p>
          <div className="relative mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="w-24 shrink-0 font-mono text-micro text-ink-subtle">raw</span>
              <Bar value={e.raw} hollow reduce={reduce} delay={0.1 + i * 0.15} />
              <span className="w-14 shrink-0 text-right font-mono text-label tabular-nums text-ink-muted">{pct(e.raw)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 shrink-0 font-mono text-micro text-ink-subtle">with prior</span>
              <Bar value={e.smooth} reduce={reduce} delay={0.3 + i * 0.15} />
              <span className="w-14 shrink-0 text-right font-mono text-label tabular-nums text-ink">{pct(e.smooth)}</span>
            </div>
          </div>
          <p className="mt-2 font-mono text-micro text-ink-subtle [overflow-wrap:anywhere]">
            ({e.errors} + {ASSIGN.strength} × {e.p0}) ÷ ({e.attempts} + {ASSIGN.strength}) = {fmt3(e.smooth)}
          </p>
        </div>
      ))}
      <p className="text-label text-ink-muted">
        Only pairs with at least {ASSIGN.minObservations} attempts across the two baseline sessions are candidates (the design said{' '}
        {ASSIGN.designMinObservations}; decision D28 lowered it so enough pairs qualify). Ties break on how slow the pair is, then alphabetically — no
        randomness in the ranking.
      </p>
    </div>
  );
}

/* ── stage: deal ───────────────────────────────────────────────────────── */
function Deal({ reduce }) {
  const rows = Array.from({ length: ASSIGN.perSet }, (_, r) => r);
  return (
    <div>
      <div className="grid grid-cols-[1.5rem_repeat(4,minmax(0,1fr))] gap-2">
        <span />
        {COLUMNS.map((c) => (
          <span key={c.label} className="text-center font-mono text-micro font-medium uppercase tracking-[0.16em] text-ink-subtle">
            Set {c.label}
          </span>
        ))}
        {rows.map((r) => (
          <DealRow key={r} row={r} reduce={reduce} />
        ))}
        <span />
        {COLUMNS.map((c) => (
          <span key={`s-${c.label}`} className="border-t border-line pt-2 text-center font-mono text-label tabular-nums text-ink">
            Σ {c.sum}
          </span>
        ))}
      </div>
      <p className="mt-4 text-label text-ink-muted">
        If fewer than {COUNT} pairs qualify it deals {ASSIGN.fallbackPerSet * SETS} ({ASSIGN.fallbackPerSet} per set); fewer than that, it refuses
        rather than build a lopsided map.
      </p>
    </div>
  );
}

function DealRow({ row, reduce }) {
  return (
    <>
      <span className="flex items-center justify-center font-mono text-micro text-ink-subtle">{row % 2 === 0 ? '→' : '←'}</span>
      {COLUMNS.map((c) => {
        const t = c.tiles.find((x) => x.row === row);
        // within a row, the deal goes left → right on even passes, right → left on odd
        const order = row * SETS + (row % 2 === 0 ? COLUMNS.indexOf(c) : SETS - 1 - COLUMNS.indexOf(c));
        return (
          <motion.span
            key={c.label}
            className="flex h-9 items-center justify-center rounded-md border border-line-hi font-mono text-label tabular-nums text-ink"
            style={{ background: alpha(P.ink, 0.03 + ((COUNT - t.rank) / (COUNT - 1)) * 0.11) }}
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={at(reduce, order * 0.06, 0.35)}
          >
            {t.rank}
          </motion.span>
        );
      })}
    </>
  );
}

/* ── stage: shuffle ────────────────────────────────────────────────────── */
function Shuffle({ who, onWho, reduce, accent }) {
  const p = ASSIGN.participants.find((x) => x.id === who) ?? ASSIGN.participants[0];
  return (
    <div>
      <Choices
        label="Example participant"
        options={ASSIGN.participants.map((x) => ({ key: x.id, label: x.label }))}
        value={p.id}
        onChoose={onWho}
        accent={accent}
      />
      <p className="mt-4 rounded-md border border-line bg-void px-3 py-2 font-mono text-micro leading-relaxed text-ink-muted [overflow-wrap:anywhere]">
        <span className="text-lilac">random.Random</span>(&quot;{ASSIGN.seed}:{p.id}&quot;).shuffle(arms)
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {COLUMNS.map((c, i) => (
          <motion.li
            key={`${p.id}-${c.label}`}
            className="flex min-w-0 flex-col gap-1 rounded-md border border-line bg-surface-2 px-3 py-2.5"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={at(reduce, i * 0.07, 0.35)}
          >
            <span className="font-mono text-micro uppercase tracking-[0.16em] text-ink-subtle">
              Set {c.label} <span className="normal-case tracking-normal">· Σ {c.sum}</span>
            </span>
            <span className="text-body text-ink">{armLabel(p.arms[i])}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/* ── stage: freeze ─────────────────────────────────────────────────────── */
function Freeze({ tried, onTry, reduce }) {
  return (
    <div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-line bg-void px-3 py-3 font-mono text-micro leading-[1.7] text-ink-muted [overflow-wrap:anywhere]">
        {ASSIGN.trigger.sql}
      </pre>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onTry}
          className="mc-ghost-btn rounded-chip border border-line px-3 py-2 uppercase hover:border-line-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          UPDATE bigram_assignment SET arm = …
        </button>
        {tried && (
          <motion.span
            className="flex min-w-0 items-center gap-2 font-mono text-micro"
            style={{ color: P.alert }}
            initial={reduce ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: EASE_OUT }}
          >
            <Glyph kind="cross" />
            <span className="[overflow-wrap:anywhere]">ABORT: {ASSIGN.trigger.message}</span>
          </motion.span>
        )}
      </div>
      <p className="mt-4 text-label text-ink-muted">
        Every row is inserted once, with its freeze time, in one transaction. Since T3.5 the experiment’s {ASSIGN.configKeys} config keys — density
        window, model, sampler settings, practice days — are frozen the same way: an UPDATE or DELETE aborts.
      </p>
    </div>
  );
}

/* ── the section ───────────────────────────────────────────────────────── */

export default function Assignment({ accent }) {
  const reduce = Boolean(useReducedMotion());
  const ref = useRef(null);
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, 'shrink');
  const [who, setWho] = useState(ASSIGN.participants[0].id);
  const [tried, setTried] = useState(false);
  const stage = active?.key ?? 'shrink';
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const person = ASSIGN.participants.find((x) => x.id === who) ?? ASSIGN.participants[0];
  const sums = [...new Set(COLUMNS.map((c) => c.sum))];
  const [sparse] = EXAMPLES;

  let readout = { tone: P.inkSubtle, status: null, text: '' };
  if (stage === 'shrink') {
    readout = {
      tone: P.jade,
      status: 'ranked',
      text: `${sparse.label} reads as ${pct(sparse.raw, 0)}. Shrunk toward a ${pct(sparse.p0, 0)} average with strength ${ASSIGN.strength}, it is ${pct(sparse.smooth)} — three tries can’t put a pair at the top.`,
    };
  } else if (stage === 'deal') {
    readout = {
      tone: sums.length === 1 ? P.jade : P.sand,
      status: sums.length === 1 ? `Σ ${sums[0]} each` : 'uneven',
      text: `${COLUMNS.map((c) => `${c.label} gets ${c.tiles.map((t) => t.rank).join(', ')}`).join('; ')} — every set is equally hard.`,
    };
  } else if (stage === 'shuffle') {
    readout = {
      tone: P.jade,
      status: 'seeded',
      text: `${person.label}: ${COLUMNS.map((c, i) => `${c.label} → ${armLabel(person.arms[i])}`).join(', ')}. The same id always gets this map; another id, another map.`,
    };
  } else if (stage === 'freeze') {
    readout = tried
      ? { tone: P.alert, status: 'blocked', text: 'The trigger aborts the update. After assignment, no code path can move a pair to another set or method.' }
      : { tone: P.inkSubtle, status: null, text: 'Try to change a frozen row.' };
  }

  return (
    <div ref={ref}>
      <PanelFrame
        caption="services/assignment.py"
        controls={
          <Choices
            label="Assignment stage"
            options={STAGES}
            value={stage}
            onChoose={(key) => {
              choose(key);
              if (key !== 'freeze') setTried(false);
            }}
            accent={accent}
          />
        }
        footer={
          <Readout runKey={`${runKey}-${who}-${tried}`} delay={0} reduce={reduce} tone={readout.tone} status={readout.status}>
            <span className="text-body text-ink-muted">{readout.text}</span>
          </Readout>
        }
      >
        <div key={runKey} className="min-h-[19rem]">
          {stage === 'shrink' && <Shrink reduce={reduce} />}
          {stage === 'deal' && <Deal reduce={reduce} />}
          {stage === 'shuffle' && <Shuffle who={who} onWho={setWho} reduce={reduce} accent={accent} />}
          {stage === 'freeze' && <Freeze tried={tried} onTry={() => setTried(true)} reduce={reduce} />}
        </div>
      </PanelFrame>
    </div>
  );
}
