'use client';

/**
 * Attribution — "89 keystrokes, 18 edge cases, one rule for what counts as an
 * error."
 *
 * The golden session replayed key by key. The fixture is one baseline block
 * the owner derived and signed off line by line: the target sentence, every
 * keystroke row (including Backspaces, a blur, a missing key-up, a 2,000 ms
 * gap), and the verdict for every letter pair. The TypeScript cursor and the
 * Python attribution both have to pass it.
 *
 * The panel, top to bottom:
 *   text     the sentence as cells — what is on screen after this keystroke.
 *            A cell typed right is ink; typed wrong is alert and underlined
 *            (shape and colour); not typed yet is faint. The cursor is the
 *            accent box. A small dot under a cell means its first try was
 *            wrong, even if it has since been fixed — the first try is what
 *            counts.
 *   key      this keystroke: key, position, outcome, gap since the last press.
 *   pairs    every letter pair the block reaches, in order, each settled at
 *            the keystroke that decides it: counted (jade tick), error (alert
 *            cross), counted without timing after a pause (sand flag), or
 *            skipped (dashed ring). The pair just decided is outlined in the
 *            accent.
 *   tally    the fixture's expected rows filling in: attempts, errors, median
 *            gap. At the last keystroke they equal expected_bigram_stats.
 * Readout: the pair this keystroke decided, in a sentence — or, if none, what
 * the keystroke did.
 *
 * Controls: shortcuts to six of the edge cases (each replays its keystroke
 * range), and a scrubber over all 89 rows with Play. Attribution itself runs
 * in Python when a session completes; the replay shows each pair at the
 * keystroke that settles it. Beside the panel: what one row carries, why
 * medians pool, and the block's totals.
 *
 * Renders only from GOLDEN, ROW_FIELDS and POOLING in
 * src/data/studies/typist-ml.js; every count is derived. Once a third of the
 * panel is in view the first shortcut plays; reduced motion starts on the
 * finished block and nothing plays by itself.
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { GOLDEN, POOLING, ROW_FIELDS } from '@/data/studies/typist-ml';
import { Choices, Glyph, IN_VIEW, PanelFrame, Readout } from '@/components/ui/case/kit';
import { LABEL } from '@/components/ui/case/shell';
import { Scrubber, pct, usePlayer } from '@/components/ui/case/typist-ml/parts';

/* ── timing ────────────────────────────────────────────────────────────── */
const BEAT_MS = 520; // one keystroke per beat
const AUTOPLAY_MS = 500;

/* ── derived once from the fixture ─────────────────────────────────────── */
const TEXT = GOLDEN.text;
const KEYS = GOLDEN.keys.map(([seq, key, pos, outcome, first, t, pause]) => ({ seq, key, pos, outcome, first, t, pause }));
const LAST = KEYS.length - 1;
const PAIRS = GOLDEN.pairs.map(([j, pair, a, b, result, sample]) => ({
  j,
  pair,
  a,
  b,
  result,
  sample,
  // a pair is settled by its later keystroke — or at the block's end if its
  // second letter never came
  at: b == null ? LAST : Math.max(a, b),
}));
const ROWS = GOLDEN.rows.map(([pair, attempts, errors, median]) => ({ pair, attempts, errors, median }));
const CASE_BY_KEY = Object.fromEntries(GOLDEN.cases.map((c) => [c.key, c]));
const FEATURED = GOLDEN.featured.map((f) => ({ ...CASE_BY_KEY[f.key], short: f.label })).filter((c) => c.key);
const caseStart = (c) => Math.min(...c.seqs.map((r) => r[0]));
const caseEnd = (c) => Math.max(...c.seqs.map((r) => r[1]));
// the narrowest labelled case that covers a keystroke
const CASE_AT = KEYS.map(({ seq }) => {
  const covering = GOLDEN.cases.filter((c) => c.seqs.some(([from, to]) => seq >= from && seq <= to));
  covering.sort((x, y) => caseEnd(x) - caseStart(x) - (caseEnd(y) - caseStart(y)));
  return covering[0] ?? null;
});
// words of the sentence with their start positions, so cells wrap at spaces
const WORDS = (() => {
  const out = [];
  let start = 0;
  TEXT.split(' ').forEach((w) => {
    out.push({ start, word: w });
    start += w.length + 1;
  });
  return out;
})();

const RESULT = {
  counted: { glyph: 'tick', tone: P.jade, status: 'counted', words: (p) => `“${p.pair}” counts as an attempt, and its ${p.sample} ms gap is a timing sample.` },
  error: { glyph: 'cross', tone: P.alert, status: 'error', words: (p) => `“${p.pair}” counts as an attempt and an error — its second letter was wrong on the first try.` },
  paused: { glyph: 'flag', tone: P.sand, status: 'no timing', words: (p) => `“${p.pair}” counts as an attempt, but its gap followed a pause, so it gives no timing sample.` },
  skipFirst: { glyph: 'undo', tone: P.inkSubtle, status: 'skipped', words: (p) => `“${p.pair}” is skipped: its first letter was wrong on the first try.` },
  skipBackspace: { glyph: 'undo', tone: P.inkSubtle, status: 'skipped', words: (p) => `“${p.pair}” is skipped: a Backspace came between its two letters.` },
  skipMissing: { glyph: 'undo', tone: P.inkSubtle, status: 'skipped', words: (p) => `“${p.pair}” is skipped: the block ended before its second letter.` },
};
const COUNTS_ATTEMPT = new Set(['counted', 'error', 'paused']);

/* ── the state after a keystroke ───────────────────────────────────────── */
function screenAt(step) {
  const typed = Array(TEXT.length).fill(null);
  const firstWrong = Array(TEXT.length).fill(false);
  let cursor = 0;
  for (let i = 0; i <= step; i += 1) {
    const k = KEYS[i];
    if (k.outcome === 'bs') {
      typed[k.pos] = null;
      cursor = k.pos;
    } else {
      typed[k.pos] = { key: k.key, ok: k.outcome === 'ok' };
      if (k.first && k.outcome === 'err') firstWrong[k.pos] = true;
      cursor = k.pos + 1;
    }
  }
  return { typed, firstWrong, cursor };
}

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function tallyAt(step) {
  const by = Object.fromEntries(ROWS.map((r) => [r.pair, { attempts: 0, errors: 0, samples: [] }]));
  PAIRS.forEach((p) => {
    if (p.at > step || !COUNTS_ATTEMPT.has(p.result)) return;
    const row = by[p.pair];
    if (!row) return;
    row.attempts += 1;
    if (p.result === 'error') row.errors += 1;
    if (p.result === 'counted' && p.sample != null) row.samples.push(p.sample);
  });
  return ROWS.map((r) => ({ ...r, now: by[r.pair], median: median(by[r.pair].samples) }));
}

const show = (key) => (key === ' ' ? '␣' : key);
const msOf = (n) => (Number.isInteger(n) ? `${n.toLocaleString('en-US')}` : `${n}`);

function keyWords(k, prev) {
  if (k.outcome === 'bs') {
    return k.seq === 0 ? 'Backspace before anything is typed — nothing to erase.' : `Backspace — position ${k.pos} is erased and the cursor steps back.`;
  }
  const where = `at position ${k.pos}`;
  const expected = TEXT[k.pos];
  const gap = prev ? ` ${msOf(k.t - prev.t)} ms after the last press` : '';
  const pause = k.pause ? ', the first key after the window lost focus' : '';
  if (k.outcome === 'err') {
    return `“${show(k.key)}” ${where}, where “${show(expected)}” belongs — ${k.first ? 'wrong on the first try' : 'wrong again'}${pause}.`;
  }
  return `“${show(k.key)}” ${where}${gap}${pause} — ${k.first ? 'right on the first try' : 'a retype, not a first attempt'}.`;
}

/* ── pieces ────────────────────────────────────────────────────────────── */

function Cell({ index, screen, accent }) {
  const t = screen.typed[index];
  const isCursor = screen.cursor === index;
  const char = TEXT[index];
  let text = char === ' ' ? ' ' : char;
  let cls = 'text-ink-faint';
  let style;
  if (t) {
    text = t.key === ' ' ? (char === ' ' ? ' ' : '␣') : t.key;
    cls = t.ok ? 'text-ink' : 'text-alert underline decoration-2 underline-offset-4';
  }
  if (isCursor) style = { boxShadow: `inset 0 -2px 0 ${accent}`, background: alpha(accent, 0.12) };
  return (
    <span className={`relative inline-flex w-[0.62em] justify-center ${cls}`} style={style}>
      {text}
      {screen.firstWrong[index] && t?.ok && (
        <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" style={{ background: P.alert }} />
      )}
    </span>
  );
}

function Sentence({ screen, accent }) {
  return (
    <p aria-hidden="true" className="flex flex-wrap gap-y-3 font-mono text-[1.0625rem] leading-7 sm:text-lg">
      {WORDS.map((w, wi) => (
        <span key={w.start} className="inline-flex whitespace-nowrap">
          {Array.from(w.word, (_, i) => (
            <Cell key={w.start + i} index={w.start + i} screen={screen} accent={accent} />
          ))}
          {wi < WORDS.length - 1 && <Cell index={w.start + w.word.length} screen={screen} accent={accent} />}
        </span>
      ))}
    </p>
  );
}

function PairChip({ pair, settled, current, accent }) {
  const r = RESULT[pair.result];
  return (
    <li
      className="inline-flex items-center gap-1.5 rounded-chip border px-1.5 py-1 font-mono text-micro transition-colors duration-200"
      style={{
        borderColor: current ? accent : P.line,
        background: current ? alpha(accent, 0.08) : 'transparent',
        color: settled ? P.ink : P.inkFaint,
      }}
    >
      <span className="scale-90">{settled ? <Glyph kind={r.glyph} tone={r.tone} /> : <Glyph kind="idle" />}</span>
      {pair.pair}
      <span className="sr-only">{settled ? ` ${r.status}` : ' not reached'}</span>
    </li>
  );
}

function Tally({ rows, changed, accent }) {
  return (
    <ul className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3 sm:grid-cols-4 xl:grid-cols-5">
      {rows.map((r) => {
        const seen = r.now.attempts > 0;
        const isChanged = changed.has(r.pair);
        return (
          <li
            key={r.pair}
            className="flex min-w-0 items-baseline justify-between gap-2 rounded-md border px-2 py-1.5 font-mono text-micro transition-colors duration-200"
            style={{ borderColor: isChanged ? accent : P.line, opacity: seen ? 1 : 0.45 }}
          >
            <span className="text-label text-ink">{r.pair}</span>
            <span className="min-w-0 text-right tabular-nums text-ink-muted">
              {r.now.attempts}
              <span className="text-ink-subtle">·</span>
              <span style={{ color: r.now.errors ? P.alert : undefined }}>{r.now.errors}</span>
              <span className="text-ink-subtle"> · </span>
              {r.median == null ? '—' : `${r.median}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ── the section ───────────────────────────────────────────────────────── */

export default function Attribution({ accent }) {
  const reduce = Boolean(useReducedMotion());
  const panelRef = useRef(null);
  const inView = useInView(panelRef, IN_VIEW);
  const player = usePlayer(LAST, reduce, BEAT_MS);
  const [caseKey, setCaseKey] = useState(null);
  const { step, playing, started } = player;

  // the first shortcut plays once the panel is in view (never under reduced motion)
  useEffect(() => {
    if (!inView || reduce || started) return undefined;
    const first = FEATURED[0];
    const t = setTimeout(() => {
      setCaseKey(first.key);
      player.play(caseStart(first), caseEnd(first));
    }, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [inView, reduce, started, player]);

  const pick = (key) => {
    const c = CASE_BY_KEY[key];
    setCaseKey(key);
    if (reduce) player.scrub(caseEnd(c));
    else player.play(caseStart(c), caseEnd(c));
  };
  const scrub = (i) => {
    setCaseKey(null);
    player.scrub(i);
  };
  const playAll = () => {
    setCaseKey(null);
    player.play(step >= LAST ? 0 : step + 1);
  };

  const k = KEYS[step];
  const prev = step > 0 ? KEYS[step - 1] : null;
  const screen = screenAt(step);
  const decided = PAIRS.filter((p) => p.at === step);
  const tally = tallyAt(step);
  const changed = new Set(decided.filter((p) => COUNTS_ATTEMPT.has(p.result)).map((p) => p.pair));
  const settledCount = PAIRS.filter((p) => p.at <= step).length;
  const activeCase = caseKey ? CASE_BY_KEY[caseKey] : CASE_AT[step];
  const marks = activeCase ? activeCase.seqs.map(([from, to]) => ({ from, to })) : [];
  const head = decided[0];
  const res = head ? RESULT[head.result] : null;
  const atEnd = step >= LAST;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12">
      <div ref={panelRef} className="min-w-0">
        <PanelFrame
          caption="The golden session · one baseline block"
          controls={
            <Choices
              label="Replay an edge case"
              options={FEATURED.map((c) => ({ key: c.key, label: c.short }))}
              value={caseKey}
              onChoose={pick}
              accent={accent}
            />
          }
          footer={
            res ? (
              <Readout runKey={`${step}-${head.j}`} delay={0} reduce={reduce} tone={res.tone} status={res.status}>
                <span className="text-body text-ink-muted">
                  {res.words(head)}
                  {decided.length > 1 && ` ${decided.slice(1).map((p) => RESULT[p.result].words(p)).join(' ')}`}
                </span>
              </Readout>
            ) : (
              <Readout runKey={`k-${step}`} delay={0} reduce={reduce}>
                <span className="text-body text-ink-muted">{keyWords(k, prev)}</span>
              </Readout>
            )
          }
        >
          {activeCase && (
            <p className="mb-4 text-label text-ink-muted">
              <span className={`${LABEL} mr-2 text-ink-subtle`}>Case {activeCase.key}</span>
              <span className="text-ink">{activeCase.title}.</span> {activeCase.note}
            </p>
          )}

          <div className="rounded-md border border-line bg-void px-3 py-4 sm:px-4">
            <p className="sr-only">
              {`Target: “${TEXT}”. After keystroke ${step + 1} of ${KEYS.length}, the cursor is at position ${screen.cursor}.`}
            </p>
            <Sentence screen={screen} accent={accent} />
          </div>

          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-micro text-ink-subtle">
            <span>
              row <span className="tabular-nums text-ink">{k.seq}</span>
            </span>
            <span>
              key <span className="text-ink">{k.outcome === 'bs' ? 'Backspace' : show(k.key)}</span>
            </span>
            <span>
              position <span className="tabular-nums text-ink">{k.pos}</span>
            </span>
            <span style={{ color: k.outcome === 'err' ? P.alert : undefined }}>{{ ok: 'correct', err: 'error', bs: 'backspace' }[k.outcome]}</span>
            {k.first && <span>first attempt</span>}
            {prev && <span className="tabular-nums">+{msOf(k.t - prev.t)} ms</span>}
            {k.pause && <span style={{ color: P.sand }}>after a blur</span>}
          </p>

          <div className="mt-4">
            <Scrubber
              value={step}
              max={LAST}
              onChange={scrub}
              playing={playing}
              onPlay={playAll}
              onPause={player.pause}
              label="Step through the keystrokes"
              valueText={`Keystroke ${step + 1} of ${KEYS.length}`}
              marks={marks}
              accent={accent}
            />
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="mc-label">Letter pairs</span>
              <span className="font-mono text-micro text-ink-subtle">
                <span className="tabular-nums text-ink">{settledCount}</span> of {PAIRS.length} settled
              </span>
            </div>
            <ul aria-label="Letter pairs, in order" className="mt-3 flex flex-wrap gap-1.5">
              {PAIRS.map((p) => (
                <PairChip key={p.j} pair={p} settled={p.at <= step} current={p.at === step} accent={accent} />
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="mc-label">Bigram stats</span>
              <span className="font-mono text-micro text-ink-subtle">attempts · errors · median ms</span>
            </div>
            <div className="mt-3">
              <Tally rows={tally} changed={changed} accent={accent} />
            </div>
            <p className="mt-3 text-label text-ink-subtle">
              {atEnd
                ? `The ${ROWS.length} rows the fixture expects — attribution must produce exactly these.`
                : `Filling in toward the ${ROWS.length} rows the fixture expects.`}
            </p>
          </div>
        </PanelFrame>
        <p className="mt-3 max-w-[64ch] text-label text-ink-subtle">
          Attribution runs once, in Python, when a session completes; the replay shows each pair at the keystroke that settles it. The browser only
          ever computes display stats.
        </p>
      </div>

      <Aside />
    </div>
  );
}

/** Beside the panel: one row's fields, pooled medians, the block's totals. */
function Aside() {
  const s = GOLDEN.session;
  const flat = POOLING.blocks.flat();
  return (
    <aside className="flex min-w-0 flex-col gap-8">
      <div>
        <h3 className="mc-label">One row per keydown</h3>
        <dl className="mt-3 flex flex-col gap-2.5">
          {ROW_FIELDS.map((f) => (
            <div key={f.name} className="min-w-0">
              <dt className="font-mono text-label text-ink [overflow-wrap:anywhere]">{f.name}</dt>
              <dd className="text-label text-ink-muted">{f.note}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-label text-ink-subtle">Auto-repeat, modifier chords and keys pressed while the window is blurred are never recorded.</p>
      </div>

      <div>
        <h3 className="mc-label">Pool, then one median</h3>
        <div className="mt-3 flex flex-col gap-2 font-mono text-label text-ink-muted">
          <p>
            {POOLING.blocks.map((b, i) => (
              <Fragment key={b.join('-')}>
                {i > 0 && <span className="text-ink-subtle"> + </span>}[{b.join(', ')}]
              </Fragment>
            ))}
          </p>
          <p className="flex items-center gap-2">
            <Glyph kind="tick" />
            <span>
              median of all {flat.length} = <span className="text-ink">{POOLING.pooled} ms</span>
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Glyph kind="cross" />
            <span>
              median of medians = <span className="line-through decoration-ink-subtle">{POOLING.medianOfMedians} ms</span>
            </span>
          </p>
        </div>
        <p className="mt-2 text-label text-ink-subtle">Two blocks of the same pair, from a unit test. Averaging per-block medians lets a one-sample block weigh as much as a full one.</p>
      </div>

      <div>
        <h3 className="mc-label">This block, in total</h3>
        <p className="mt-3 text-label text-ink-muted">
          <span className="font-mono text-ink">
            {s.correct}/{s.firstAttempts}
          </span>{' '}
          first attempts right — accuracy <span className="font-mono text-ink">{pct(s.accuracy)}</span>,{' '}
          <span className="font-mono text-ink">{s.wpm}</span> WPM (pauses included).
        </p>
      </div>
    </aside>
  );
}
