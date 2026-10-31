'use client';

/**
 * MarksEntry — "Three ways to enter a mark, and one server function that
 * judges every one."
 *
 * One panel, three paths (MARK_PATHS), one toggle apart. Across the top, the
 * path a value travels: where it comes from → what the browser does with the
 * text (or, for an upload, which student the row is for) → normaliseMark, the
 * one validator every path shares → the section lock → the stored entry.
 * Stations a path doesn't use are drawn dashed. Below, real inputs run
 * through it one at a time:
 *   type    six things a teacher might type into a Written (30) or Oral (20)
 *           cell, each with its verdict and where it was decided — "twelve"
 *           never leaves the browser; "31" is refused by the server.
 *   paste   a block copied from Excel, laid over a five-student grid from
 *           roll 3: applied cells tick, the refused one is crossed with its
 *           reason, the gap leaves the mark already there alone, and what
 *           runs off the bottom is counted. The readout is the grid's own
 *           toast, word for word.
 *   upload  rows of the downloaded sheet: matched on the Student ID alone,
 *           an edited roll refused, an "A" read as Absent, and a 35 in a
 *           30-mark column refused by the same validator as the grid.
 *
 * Every verdict is computed by ./rules.js — ports of mark-validation.ts, the
 * grid's text parser, planPaste and the import's row matcher — so the page
 * cannot say something the code wouldn't. Inputs are illustrative.
 *
 * Motion: rows land one after another once the panel is a third in view; the
 * first path autoplays. Reduced motion: everything is there at once.
 * Layout: container queries — the path strip wraps; tables become stacked
 * rows under 36rem of panel.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { Choices, Glyph, IN_VIEW, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';
import { LABEL } from '@/components/ui/case/shell';
import { MARK_COLUMNS, MARK_PATHS } from '@/data/studies/bis-report-card';
import { describeMarkProblem, matchUploadRow, parseTypedCellValue, planPaste, textToMarkRequest } from './rules';

const ROW_S = 0.14; // between rows
const LEAD_S = 0.15;
const COL = Object.fromEntries(MARK_COLUMNS.map((c) => [c.key, c]));
const PATH = Object.fromEntries(MARK_PATHS.map((p) => [p.key, p]));
const OPTIONS = MARK_PATHS.map((p) => ({ key: p.key, label: p.label }));
const PASTE_ROW = 'grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5';

/* ── verdicts, computed once ───────────────────────────────────────────── */

/** A value that reached the server → saved, or the validator's message. */
function judge(max, request) {
  const problem = describeMarkProblem(max, request);
  if (problem) return { ok: false, where: 'server', says: problem };
  return { ok: true, where: 'server', says: request.isAbsent ? 'Saved · Absent' : `Saved · ${request.valueNumeric} / ${max}` };
}

const TYPED = PATH.type.rows.map((r) => {
  const col = COL[r.col];
  const request = textToMarkRequest(r.input);
  if (request.error) return { ...r, col, ok: false, where: 'browser', says: `${request.error} — never sent` };
  return { ...r, col, ...judge(col.max, request) };
});

const PASTE = (() => {
  const p = PATH.paste;
  const plan = planPaste(p.matrix, p.origin, p.gridRows, MARK_COLUMNS.length);
  const cells = plan.cells.map((c) => {
    if (c.kind !== 'cell') return c;
    const col = MARK_COLUMNS[c.col];
    const request = textToMarkRequest(c.value);
    if (request.error) return { ...c, ok: false, says: request.error };
    const v = judge(col.max, request);
    return { ...c, ok: v.ok, says: v.ok ? (request.isAbsent ? 'Absent' : String(request.valueNumeric)) : v.says };
  });
  const applied = cells.filter((c) => c.kind === 'cell' && c.ok).length;
  const rejected = cells.filter((c) => c.kind === 'cell' && !c.ok).length;
  // the grid's toast, as use-marks-entry.ts writes it
  const toast =
    rejected > 0 || plan.overflow > 0
      ? `Pasted ${applied} value${applied === 1 ? '' : 's'}; ${rejected} rejected${plan.overflow ? `, ${plan.overflow} beyond the grid` : ''}`
      : `Pasted ${applied} value${applied === 1 ? '' : 's'}`;
  const at2 = (row, col) => cells.find((c) => c.row === row && c.col === col) ?? null;
  return { cells, applied, rejected, overflow: plan.overflow, toast, at: at2 };
})();

const UPLOAD = (() => {
  const p = PATH.upload;
  const written = COL.WRITTEN;
  const rows = p.rows.map((r) => {
    const m = matchUploadRow(r, p.roster);
    if (m.reason) return { ...r, ok: false, stage: 'match', says: m.reason };
    const v = judge(written.max, parseTypedCellValue(r.value));
    return { ...r, ok: v.ok, stage: 'validate', says: v.ok ? v.says.replace('Saved', 'Applied') : v.says };
  });
  return { rows, applied: rows.filter((r) => r.ok).length, rejected: rows.filter((r) => !r.ok).length };
})();

/* ── the path strip ────────────────────────────────────────────────────── */
const STATIONS = [
  { key: 'source', label: 'source' },
  { key: 'browser', label: 'browser · text → request' },
  { key: 'match', label: 'match the Student ID' },
  { key: 'validate', label: 'normaliseMark()' },
  { key: 'lock', label: 'section lock · draft?' },
  { key: 'store', label: 'MarksEntry' },
];
const USES = {
  type: ['source', 'browser', 'validate', 'lock', 'store'],
  paste: ['source', 'browser', 'validate', 'lock', 'store'],
  upload: ['source', 'match', 'validate', 'lock', 'store'],
};
const SOURCE_LABEL = { type: 'a cell', paste: 'the clipboard', upload: 'an .xlsx' };

function PathStrip({ pathKey }) {
  const uses = USES[pathKey];
  return (
    <ol aria-label="The path a mark travels" className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
      {STATIONS.map((s, i) => {
        const used = uses.includes(s.key);
        const door = s.key === 'validate';
        return (
          <li key={s.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden="true" className="font-mono text-micro text-ink-faint">
                →
              </span>
            )}
            <span
              className="inline-flex items-center rounded-chip border px-2 py-1.5 font-mono text-micro"
              style={
                !used
                  ? { borderStyle: 'dashed', borderColor: P.line, color: P.inkFaint }
                  : door
                    ? { borderColor: P.inkMuted, color: P.ink, background: alpha(P.ink, 0.06) }
                    : { borderColor: P.lineHi, color: P.inkMuted }
              }
            >
              {s.key === 'source' ? SOURCE_LABEL[pathKey] : s.label}
              {!used && <span className="sr-only"> (not on this path)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── the three bodies ──────────────────────────────────────────────────── */

function Verdict({ ok, says }) {
  return (
    <span className="flex min-w-0 items-start gap-2">
      <span className="mt-px">
        <Glyph kind={ok ? 'tick' : 'cross'} />
      </span>
      <span className={`min-w-0 text-label ${ok ? 'text-ink' : 'text-ink-muted'} [overflow-wrap:anywhere]`}>{says}</span>
    </span>
  );
}

const rowIn = (reduce, i) => ({
  initial: reduce ? false : { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  transition: at(reduce, LEAD_S + i * ROW_S, 0.3),
});

function TypeBody({ reduce }) {
  return (
    <ul className="border-b border-line">
      {TYPED.map((r, i) => (
        <motion.li
          key={r.input}
          {...rowIn(reduce, i)}
          className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-line py-3 @[36rem]:grid-cols-[6rem_8rem_minmax(0,1fr)_5rem] @[36rem]:items-center"
        >
          <span className="inline-flex h-8 w-full items-center rounded-chip border border-line-hi bg-void px-2 font-mono text-label text-ink">{r.input}</span>
          <span className="font-mono text-micro text-ink-subtle">
            {r.col.label} · max {r.col.max}
          </span>
          <span className="col-span-2 @[36rem]:col-span-1">
            <Verdict ok={r.ok} says={r.says} />
          </span>
          <span className="col-span-2 font-mono text-micro text-ink-subtle @[36rem]:col-span-1 @[36rem]:text-right">{r.where}</span>
        </motion.li>
      ))}
    </ul>
  );
}

function PasteCell({ cell, existing }) {
  if (!cell) {
    return (
      <span className="flex h-9 items-center rounded-chip border border-line px-2 font-mono text-label text-ink-faint">
        {existing ?? '·'}
      </span>
    );
  }
  if (cell.kind === 'gap') {
    return (
      <span
        className="flex h-9 items-center justify-between gap-1 rounded-chip border border-dotted px-2 font-mono text-label text-ink-muted"
        style={{ borderColor: P.inkSubtle }}
        title="gap in the paste — kept"
      >
        {existing ?? '·'}
        <span className="font-mono text-micro text-ink-subtle">kept</span>
        <span className="sr-only"> — a gap in the paste, the existing mark is kept</span>
      </span>
    );
  }
  const tone = cell.ok ? P.jade : P.alert;
  return (
    <span
      className="flex h-9 items-center justify-between gap-1 rounded-chip border px-2 font-mono text-label"
      style={{ borderColor: alpha(tone, 0.55), background: alpha(tone, 0.07), color: cell.ok ? P.ink : P.alert, borderStyle: cell.ok ? 'solid' : 'dashed' }}
    >
      {cell.value}
      <span aria-hidden="true" className="text-micro">
        {cell.ok ? '✓' : '✕'}
      </span>
      <span className="sr-only">{cell.ok ? ' — applied' : ` — refused: ${cell.says}`}</span>
    </span>
  );
}

function PasteBody({ reduce }) {
  const p = PATH.paste;
  const rows = Array.from({ length: p.gridRows }, (_, i) => i);
  const overflowRows = [...new Set(PASTE.cells.filter((c) => c.kind === 'overflow').map((c) => c.row))];
  const refused = PASTE.cells.filter((c) => c.kind === 'cell' && !c.ok);
  return (
    <div className="grid grid-cols-1 gap-6 @[36rem]:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
      <div className="min-w-0">
        <p className={`${LABEL} text-ink-subtle`}>The clipboard</p>
        <pre className="mt-3 overflow-x-auto rounded-md border border-line bg-void p-3 font-mono text-label leading-6 text-ink">
          {p.matrix.map((line) => line.map((v) => v || '·').join('  ⇥  ')).join('\n')}
        </pre>
        <p className="mt-2 font-mono text-micro text-ink-subtle">pasted at roll {p.origin + 1}</p>
      </div>
      <div className="min-w-0">
        <div className="flex flex-col gap-1.5">
          <div className={PASTE_ROW}>
            <span />
            {MARK_COLUMNS.map((c) => (
              <span key={c.key} className="font-mono text-micro text-ink-subtle">
                {c.label} · {c.max}
              </span>
            ))}
          </div>
          {rows.map((r, i) => (
            <motion.div key={r} {...rowIn(reduce, i)} className={PASTE_ROW}>
              <span className="flex h-9 items-center font-mono text-micro text-ink-subtle">roll {r + 1}</span>
              {MARK_COLUMNS.map((c, ci) => (
                <PasteCell key={c.key} cell={PASTE.at(r, ci)} existing={p.existing?.[`${r}-${ci}`]} />
              ))}
            </motion.div>
          ))}
          {overflowRows.map((r, i) => (
            <motion.div key={`over-${r}`} {...rowIn(reduce, rows.length + i)} className={PASTE_ROW}>
              <span className="flex h-9 items-center font-mono text-micro text-ink-faint">no roll</span>
              {MARK_COLUMNS.map((c, ci) => {
                const cell = PASTE.at(r, ci);
                return (
                  <span
                    key={c.key}
                    className="flex h-9 items-center justify-between rounded-chip border border-dashed px-2 font-mono text-label text-ink-subtle"
                    style={{ borderColor: P.line }}
                  >
                    {cell?.value ?? ''}
                    <span className="text-micro">off grid</span>
                  </span>
                );
              })}
            </motion.div>
          ))}
        </div>
        {refused.map((c) => (
          <p key={`${c.row}-${c.col}`} className="mt-3 text-label text-ink-muted">
            <span className="font-mono text-micro text-alert">
              roll {c.row + 1} · {MARK_COLUMNS[c.col].label}:
            </span>{' '}
            {c.says}
          </p>
        ))}
      </div>
    </div>
  );
}

function UploadBody({ reduce }) {
  return (
    <div className="min-w-0">
      <div className="hidden grid-cols-[2.5rem_4.5rem_3.5rem_4rem_minmax(0,1fr)] gap-3 pb-2 font-mono text-micro text-ink-subtle @[36rem]:grid">
        <span>row</span>
        <span>Student ID</span>
        <span>roll</span>
        <span>Written</span>
        <span>verdict</span>
      </div>
      <ul className="border-b border-line">
        {UPLOAD.rows.map((r, i) => (
          <motion.li
            key={r.row}
            {...rowIn(reduce, i)}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-line py-3 @[36rem]:grid-cols-[2.5rem_4.5rem_3.5rem_4rem_minmax(0,1fr)] @[36rem]:items-start"
          >
            <span className="font-mono text-micro leading-5 text-ink-subtle">{r.row}</span>
            <span className="flex flex-wrap gap-x-3 font-mono text-label text-ink @[36rem]:contents">
              <span>
                <span className="text-ink-subtle @[36rem]:hidden">id </span>
                {r.id || <span className="text-ink-faint">blank</span>}
              </span>
              <span>
                <span className="text-ink-subtle @[36rem]:hidden">roll </span>
                {r.roll}
              </span>
              <span>
                <span className="text-ink-subtle @[36rem]:hidden">written </span>
                {r.value}
              </span>
            </span>
            <span className="col-span-2 @[36rem]:col-span-1">
              <Verdict ok={r.ok} says={r.says} />
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/* ── the panel ─────────────────────────────────────────────────────────── */

export default function MarksEntry({ accent = P.accent }) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, IN_VIEW);
  const [active, choose] = useRun(inView, reduce, MARK_PATHS[0].key);
  const key = active?.key ?? MARK_PATHS[0].key;
  const path = PATH[key];
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const count = key === 'type' ? TYPED.length : key === 'paste' ? PATH.paste.gridRows + 1 : UPLOAD.rows.length;
  const doneAt = LEAD_S + count * ROW_S + 0.2;

  let readout;
  if (key === 'type') {
    const saved = TYPED.filter((r) => r.ok).length;
    const browser = TYPED.filter((r) => r.where === 'browser').length;
    readout = `${saved} saved, ${TYPED.length - saved} refused — ${browser} in the browser, never sent, the rest by the server’s validator.`;
  } else if (key === 'paste') {
    readout = `“${PASTE.toast}” — the grid’s own message. The gap left roll 4’s mark alone.`;
  } else {
    readout = `${UPLOAD.applied} applied, ${UPLOAD.rejected} refused, each with its row and reason. Nothing is guessed from a roll number.`;
  }

  return (
    <div ref={ref}>
      <PanelFrame
        caption="Three ways in · one validator"
        controls={<Choices label="Pick a way in" options={OPTIONS} value={key} onChoose={choose} accent={accent} />}
        footer={
          active ? (
            <Readout runKey={runKey} delay={reduce ? 0 : doneAt} reduce={reduce} tone={accent} status={path.label}>
              <span className="text-body text-ink-muted">{readout}</span>
            </Readout>
          ) : (
            <p className="text-body text-ink-subtle">Pick a way in.</p>
          )
        }
      >
        <div className="@container min-w-0">
          <PathStrip pathKey={key} />
          <p className="mt-3 font-mono text-micro text-ink-subtle [overflow-wrap:anywhere]">{path.route}</p>
          <p className="mt-2 max-w-[70ch] text-label text-ink-muted">{path.note}</p>
          <div key={runKey} className="mt-6 min-w-0">
            {key === 'type' && <TypeBody reduce={reduce} />}
            {key === 'paste' && <PasteBody reduce={reduce} />}
            {key === 'upload' && <UploadBody reduce={reduce} />}
          </div>
        </div>
      </PanelFrame>
    </div>
  );
}
