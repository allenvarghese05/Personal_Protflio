'use client';

/**
 * ControlPlane — "The organisation changes its own rules — no engineer, no
 * deploy." The body of the Mission Control section: the client system's Super
 * Admin control plane (MC-0 … MC-7). The name is the client's; this file has
 * nothing to do with the portfolio's own MissionControl.jsx. Top to bottom:
 *
 *   principle — the idea as three quiet display lines, beside four stats in
 *               ink display type (amber stays with the linked pair below).
 *   schema → screen — the centrepiece panel. On the left, real zod lines from
 *               the config schema as a numbered listing. On the right, the
 *               control the introspector draws for each one: a number field
 *               with a min…max track, a switch, a table of named switches, a
 *               multi-select. The controls work. A number nudges and clamps to
 *               its limits, a switch flips, and a value that leaves its default
 *               is tagged as an override. Hover, focus or press a line and its
 *               control lights (and the other way round). The accent marks the
 *               linked pair, a thin connector joins them from 768px up, and the
 *               readout spells out the mapping from the data.
 *   history   — the change log, per field, old → new. Undo is live and
 *               deterministic. It writes the old value back as a new
 *               CONFIG_REVERTED row on top, marks the row Undone and
 *               supersedes any older change to the same field. Reset restores
 *               the log.
 *   build     — MC-0 … MC-7 over the span. From 768px it's a ruler (four to a
 *               row until the block is 64rem wide, then all eight on one
 *               line); below that, a vertical rail. Admin features get filled
 *               markers and design-system rebuilds hollow ones, so shape
 *               carries the kind, not colour.
 *   fixes     — two bugs found while building it: before (struck) → after.
 *
 * Renders only from CONTROL in src/data/studies/iet.js. Readouts, counts and
 * legends are derived from it. Motion: each block fades up once in view,
 * staggered; the connectors draw in; a new history row slides in on top
 * (AnimatePresence + layout). With reduced motion everything is simply there
 * and nothing animates. Connector geometry is measured by a ResizeObserver
 * (→ rAF → state), never during render.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { CONTROL } from '@/data/studies/iet';

/* ── constants ─────────────────────────────────────────────────────────── */
// .mc-label is unlayered CSS, so its colour can't be overridden by a utility.
// This is the same voice for labels that need a different ink.
const LABEL = 'font-mono text-micro font-medium uppercase tracking-[0.18em]';

const IN_VIEW = { once: true, amount: 0.2 };
const RISE_PX = 16;
const RISE_S = 0.6;
const STAGGER_S = 0.07;
const ROW_S = 0.35; // a history row sliding in
const LINK_S = 0.3; // the linked connector drawing
const DRAW_S = 0.55; // each idle connector drawing in
const DRAW_DELAY_S = 0.25;
const MIN_GUTTER_PX = 16; // narrower than this, the columns are stacked: no connectors

// copy that isn't study data
const EDITOR_CAPTION = 'src/lib/config/schema.ts → the generated editor';
const IDLE_SCHEMA = 'Add a schema line — the screen follows.';
const HINT_SCHEMA = 'Hover, focus or press a line to link it to its control.';
const IDLE_HISTORY = 'Undo writes the old value back as a new change.';
const REVERT = { tag: 'CONFIG_REVERTED', who: 'superadmin', when: 'just now' };

/* ── derived once from the study data ──────────────────────────────────── */
const SCHEMA = CONTROL.schema;
const STEPS = CONTROL.steps;
const FIXES = CONTROL.fixes;
const HISTORY_INIT = CONTROL.history.map((h, i) => ({ ...h, id: `h${i}` }));

// the principle, one sentence a line
const SENTENCES = CONTROL.principle.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [CONTROL.principle];

// the build steps the two panels demonstrate (eyebrows fall back if renamed)
const stepById = (id) => STEPS.find((s) => s.id === id);
const EDITOR_STEP = stepById('MC-1');
const HISTORY_STEP = stepById('MC-2');

const isList = (e) => e.kind === 'toggles' || e.kind === 'multi';
// a control's value: a number, a boolean, or one boolean per named option
const defaultOf = (e) => (isList(e) ? e.value.map(([, on]) => on) : e.value);
const DEFAULTS = Object.fromEntries(SCHEMA.map((e) => [e.key, defaultOf(e)]));

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const onOff = (b) => (b ? 'on' : 'off');
/** 'minSitePhotos: int(0, 20).default(3)' → 'int(0, 20).default(3)' */
const exprOf = (code) => code.slice(code.indexOf(':') + 1).trim();

function isChanged(e, v) {
  if (isList(e)) return v.some((on, i) => on !== e.value[i][1]);
  return v !== e.value;
}

/** What the introspector draws for a schema entry, in words. */
function widgetOf(e) {
  switch (e.kind) {
    case 'number':
      return `a number field, ${e.min}–${e.max} ${e.unit}, default ${e.value}`;
    case 'boolean':
      return `a switch, ${onOff(e.value)} by default`;
    case 'toggles':
      return 'a table of named switches';
    case 'multi':
      return 'a multi-select';
    default:
      return 'a field';
  }
}

/** A changed value, in words: '6 months', 'off', 'Building plan on'. */
function nowOf(e, v) {
  if (e.kind === 'number') return `${v} ${e.unit}`;
  if (e.kind === 'boolean') return onOff(v);
  return e.value
    .map(([name, on], i) => (v[i] !== on ? `${name} ${onOff(v[i])}` : null))
    .filter(Boolean)
    .join(', ');
}

/* ── the zod listing: one regex pass per line, tinted like CodeBlock ───── */
// Groups: 1 the setting's key · 2 string · 3 boolean literal · 4 number
const ZOD_RE = /^(\w+)(?=:)|('(?:[^'\\]|\\.)*')|\b(true|false)\b|\b(\d+(?:\.\d+)?)\b/g;
const TONE = {
  key: 'text-ink',
  string: 'text-jade',
  keyword: 'text-lilac',
  number: 'text-sand',
  plain: 'text-ink-muted',
};

function tokenize(line) {
  const out = [];
  let last = 0;
  for (const m of line.matchAll(ZOD_RE)) {
    if (m.index > last) out.push({ kind: 'plain', text: line.slice(last, m.index) });
    const kind = m[1] ? 'key' : m[2] ? 'string' : m[3] ? 'keyword' : 'number';
    out.push({ kind, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ kind: 'plain', text: line.slice(last) });
  return out;
}
const LINES = SCHEMA.map((e) => tokenize(e.code));

/* ── the build strip ───────────────────────────────────────────────────── */
const KIND = {
  admin: { label: 'Admin feature', filled: true },
  design: { label: 'Design-system rebuild', filled: false },
};
const kindOf = (s) => KIND[s.kind] ?? KIND.admin;
const KIND_COUNT = Object.fromEntries(Object.keys(KIND).map((k) => [k, STEPS.filter((s) => s.kind === k).length]));

/* ── motion helpers ────────────────────────────────────────────────────── */

/** Fade-up props, once `shown`. Reduced motion means no initial state and no tween. */
function rise(reduce, shown, delay = 0) {
  return {
    initial: reduce ? false : { opacity: 0, y: RISE_PX },
    animate: reduce || shown ? { opacity: 1, y: 0 } : { opacity: 0, y: RISE_PX },
    transition: reduce ? { duration: 0 } : { duration: RISE_S, ease: EASE_OUT, delay },
  };
}

/** A block's ref, and whether it has been seen (always, with reduced motion). */
function useShown(reduce) {
  const ref = useRef(null);
  const inView = useInView(ref, IN_VIEW);
  return [ref, reduce || inView];
}

/* ── shared pieces ─────────────────────────────────────────────────────── */

/** The panel every interactive block sits in: caption + controls, body, readout. */
function PanelFrame({ caption, controls, footer, live = false, children }) {
  return (
    <div className="mc-panel flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {caption}
        {controls}
      </div>
      <div className="mt-5 min-w-0">{children}</div>
      <div
        aria-live={live ? 'polite' : undefined}
        className="mt-5 flex min-h-[3.25rem] items-center border-t border-line pt-4"
      >
        {footer}
      </div>
    </div>
  );
}

/** A sub-block's eyebrow: 'MC-1 · Generated editor', the id in the accent. */
function Eyebrow({ step, fallback, accent }) {
  return (
    <h3 className={`${LABEL} text-ink-subtle`}>
      {step ? (
        <>
          <span style={{ color: accent }}>{step.id}</span>
          <span aria-hidden className="text-ink-faint">
            {' · '}
          </span>
          <span className="sr-only">: </span>
          {step.title}
        </>
      ) : (
        fallback
      )}
    </h3>
  );
}

const GLYPHS = {
  reset: (
    <>
      <path d="M9.6 6.4A3.6 3.6 0 1 1 6 2.4h1.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.9 0.6l2 1.8-2 1.8z" fill="currentColor" />
    </>
  ),
  undo: (
    <path
      d="M3.6 4.4H7.6A2.6 2.6 0 0 1 7.6 9.6H5.2M5.6 2.4L3.6 4.4L5.6 6.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  minus: <path d="M3 6H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />,
  plus: <path d="M3 6H9M6 3V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />,
  check: (
    <path d="M2.6 6.3L5 8.6L9.4 3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  box: <rect x="2.5" y="2.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.1" />,
};

function Glyph({ name, size = 12 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 12 12" className="block shrink-0">
      {GLYPHS[name]}
    </svg>
  );
}

/** Reset, a ghost button. Stays focusable when there's nothing to reset
 *  (aria-disabled, not disabled), so focus never drops out from under it. */
function ResetButton({ pristine, onReset, label }) {
  return (
    <button
      type="button"
      aria-disabled={pristine}
      aria-label={label}
      onClick={pristine ? undefined : onReset}
      className={`mc-ghost-btn inline-flex min-h-8 items-center gap-2 rounded-md border border-line px-3 uppercase ${
        pristine ? 'cursor-default' : 'hover:border-line-hi'
      }`}
      style={pristine ? { color: P.inkFaint } : undefined}
    >
      <Glyph name="reset" size={11} />
      Reset
    </button>
  );
}

/* ── 1 · the principle and the numbers ─────────────────────────────────── */

function Principle({ reduce }) {
  const [ref, shown] = useShown(reduce);
  const lastLine = SENTENCES.length - 1;

  return (
    <div ref={ref} className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
      <p className="max-w-[28ch] font-display text-2xl font-medium leading-[1.3] tracking-[-0.015em] sm:text-[1.75rem]">
        {SENTENCES.map((s, i) => (
          <motion.span
            key={s}
            {...rise(reduce, shown, i * STAGGER_S)}
            className={`block text-balance ${i === lastLine ? 'text-ink' : 'text-ink-muted'}`}
          >
            {s}{' '}
          </motion.span>
        ))}
      </p>

      <div className="@container min-w-0">
        <dl className="grid grid-cols-2 gap-x-6 @xl:grid-cols-4">
          {CONTROL.stats.map((m, i) => (
            // label first in the DOM (dt before dd), value first on screen
            <motion.div
              key={m.label}
              {...rise(reduce, shown, (SENTENCES.length + i) * STAGGER_S)}
              className="flex flex-col-reverse justify-end border-t border-line pb-5 pt-4"
            >
              <dt className="mt-2.5 max-w-[20ch] font-mono text-micro font-medium uppercase leading-snug tracking-[0.14em] text-ink-subtle">
                {m.label}
              </dt>
              <dd className="font-display text-3xl font-semibold leading-none tracking-tight tabular-nums text-ink">
                {m.value}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* ── 2 · schema → screen ───────────────────────────────────────────────── */

/** Where each connector starts (a code line) and ends (its control), in the
 *  body's own coordinates — or null when the columns are stacked. */
function measureConnectors(el) {
  const code = el.querySelector('[data-cp-col="code"]');
  const screen = el.querySelector('[data-cp-col="screen"]');
  if (!code || !screen) return null;
  const box = el.getBoundingClientRect();
  const x0 = code.getBoundingClientRect().right - box.left;
  const x1 = screen.getBoundingClientRect().left - box.left;
  if (x1 - x0 < MIN_GUTTER_PX) return null;
  const centres = (selector) =>
    Array.from(el.querySelectorAll(selector), (n) => {
      const r = n.getBoundingClientRect();
      return r.top + r.height / 2 - box.top;
    });
  const a = centres('[data-cp-from]');
  const b = centres('[data-cp-to]');
  if (a.length !== SCHEMA.length || b.length !== SCHEMA.length) return null;
  return { w: box.width, h: box.height, x0, x1, a, b };
}

/** Connector geometry, re-measured whenever the body or a column resizes. */
function useConnectors(ref) {
  const [geo, setGeo] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let frame = 0;
    let alive = true;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (alive) setGeo(measureConnectors(el));
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.querySelectorAll('[data-cp-col]').forEach((n) => ro.observe(n));
    document.fonts?.ready.then(measure); // the mono face swapping in re-wraps the code
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [ref]);
  return geo;
}

const fx = (n) => n.toFixed(1);
function curve({ x0, x1, a, b }, i) {
  const xm = (x0 + x1) / 2;
  return `M${fx(x0)} ${fx(a[i])} C${fx(xm)} ${fx(a[i])} ${fx(xm)} ${fx(b[i])} ${fx(x1)} ${fx(b[i])}`;
}

/** The thin lines from each schema line to its control (≥768px only). */
function Connectors({ geo, linkedIndex, shown, reduce, accent }) {
  if (!geo) return null;
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width={geo.w}
      height={geo.h}
    >
      {SCHEMA.map((e, i) => (
        <motion.path
          key={e.key}
          d={curve(geo, i)}
          fill="none"
          stroke={P.lineHi}
          strokeWidth="1"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: shown ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { delay: DRAW_DELAY_S + i * STAGGER_S, duration: DRAW_S, ease: EASE_OUT }}
        />
      ))}
      {linkedIndex >= 0 && (
        <motion.path
          key={`linked-${SCHEMA[linkedIndex].key}`}
          d={curve(geo, linkedIndex)}
          fill="none"
          stroke={accent}
          strokeWidth="1.25"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={reduce ? { duration: 0 } : { duration: LINK_S, ease: EASE_OUT }}
        />
      )}
      {SCHEMA.map((e, i) => {
        const on = i === linkedIndex;
        const port = { r: 2.5, fill: on ? accent : P.surface, stroke: on ? accent : P.lineHi, strokeWidth: 1 };
        return (
          <g key={`ports-${e.key}`}>
            <circle cx={geo.x0} cy={geo.a[i]} {...port} />
            <circle cx={geo.x1} cy={geo.b[i]} {...port} />
          </g>
        );
      })}
    </svg>
  );
}

/** One numbered zod line: a button that links (hover / focus) or pins (press). */
function CodeLine({ index, on, pinned, accent, onPin, linkProps }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={pinned}
        onClick={onPin}
        {...linkProps}
        className="relative grid w-full grid-cols-[2.5rem_minmax(0,1fr)] items-start py-1 pr-4 text-left font-mono text-label leading-[1.65] transition-colors duration-200 hover:bg-surface-2 motion-reduce:transition-none"
        style={on ? { background: alpha(accent, 0.08) } : undefined}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[2px] transition-opacity duration-200 motion-reduce:transition-none"
          style={{ background: accent, opacity: on ? 1 : 0 }}
        />
        <span
          aria-hidden
          data-cp-from=""
          className="select-none pr-4 text-right tabular-nums transition-colors duration-200 motion-reduce:transition-none"
          style={{ color: on ? accent : P.inkFaint }}
        >
          {index + 1}
        </span>
        {/* wraps rather than scrolls, with a hanging indent for the run-on */}
        <code className="block min-w-0 whitespace-pre-wrap break-words" style={{ paddingLeft: '2ch', textIndent: '-2ch' }}>
          {LINES[index].map((tok, j) => (
            <span key={j} className={TONE[tok.kind]}>
              {tok.text}
            </span>
          ))}
        </code>
      </button>
    </li>
  );
}

/** A switch: knob position and a filled track say on/off, and so does the word. */
function Switch({ on, onToggle, label, labelledBy }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-labelledby={labelledBy}
      onClick={onToggle}
      className="inline-flex min-h-8 shrink-0 items-center gap-2.5 rounded-md px-1"
    >
      <span
        aria-hidden
        className="relative block h-[18px] w-8 rounded-full border transition-colors duration-200 motion-reduce:transition-none"
        style={{ background: on ? alpha(P.jade, 0.2) : P.void, borderColor: on ? alpha(P.jade, 0.6) : P.lineHi }}
      >
        <span
          className="absolute top-1/2 block h-3 w-3 -translate-y-1/2 rounded-full transition-[left,background-color] duration-200 motion-reduce:transition-none"
          style={{ left: on ? 16 : 2, background: on ? P.jade : P.inkSubtle }}
        />
      </span>
      <span aria-hidden className="w-[3ch] text-left font-mono text-micro uppercase tracking-[0.08em] text-ink-muted">
        {on ? 'On' : 'Off'}
      </span>
    </button>
  );
}

/** − / +. At a limit it's aria-disabled, not disabled: holding a key on it
 *  must not drop focus to the page when the value reaches min or max. */
function StepButton({ glyph, label, disabled, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`inline-flex h-8 w-8 items-center justify-center transition-colors duration-200 motion-reduce:transition-none ${
        disabled ? 'cursor-not-allowed text-ink-faint' : 'text-ink-muted hover:text-ink'
      }`}
    >
      <Glyph name={glyph} />
    </button>
  );
}

/** A number: − value unit +, and the min…max track (draggable, keyboard too).
 *  The visual track is inset 8px a side to match the hidden range's thumb. */
function NumberField({ entry, value, on, accent, labelId, onSet }) {
  const { min, max, unit } = entry;
  const at = (v) => `calc(0.5rem + (100% - 1rem) * ${(v - min) / (max - min)})`;
  const tone = on ? accent : P.inkMuted;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex shrink-0 items-center rounded-md border border-line bg-void">
        <StepButton glyph="minus" label={`Decrease ${entry.label}`} disabled={value <= min} onClick={() => onSet(value - 1)} />
        <span aria-hidden className="min-w-[5.5rem] px-1 text-center font-mono text-label tabular-nums text-ink">
          {value}
          <span className="text-ink-subtle"> {unit}</span>
        </span>
        <StepButton glyph="plus" label={`Increase ${entry.label}`} disabled={value >= max} onClick={() => onSet(value + 1)} />
      </div>

      <div className="relative h-9 min-w-[8rem] flex-1">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(ev) => onSet(Number(ev.target.value))}
          aria-labelledby={labelId}
          aria-valuetext={`${value} ${unit}`}
          className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none"
        />
        <span aria-hidden className="pointer-events-none absolute left-2 right-2 top-3 h-px bg-line-hi" />
        <span
          aria-hidden
          className="pointer-events-none absolute left-2 top-3 h-[2px] -translate-y-1/2 transition-colors duration-200 motion-reduce:transition-none"
          style={{ width: `calc((100% - 1rem) * ${(value - min) / (max - min)})`, background: tone }}
        />
        {/* the coded default, a hairline tick */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-[7px] h-[11px] w-px"
          style={{ left: at(entry.value), background: P.inkSubtle }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-3 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-void transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface motion-reduce:transition-none"
          style={{ left: at(value), background: tone }}
        />
        <span aria-hidden className="pointer-events-none absolute bottom-0 left-0 font-mono text-micro leading-none text-ink-subtle">
          {min}
        </span>
        <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 font-mono text-micro leading-none text-ink-subtle">
          {max}
        </span>
      </div>
    </div>
  );
}

/** One generated control, drawn from its schema entry's `kind`. */
function ControlRow({ entry, value, on, accent, labelId, linkProps, onSet, onFlip }) {
  const changed = isChanged(entry, value);
  const inline = entry.kind === 'boolean';

  return (
    <div
      {...linkProps}
      className="relative rounded-md border px-3.5 py-3 transition-colors duration-200 motion-reduce:transition-none"
      style={{ borderColor: on ? alpha(accent, 0.5) : P.line, background: on ? alpha(accent, 0.05) : P.surface }}
    >
      {/* where the connector lands: the label's first line */}
      <span aria-hidden data-cp-to="" className="pointer-events-none absolute left-0 top-[22px] h-0 w-0" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id={labelId} className="text-sm leading-snug text-ink">
            {entry.label}
          </p>
          <p className="mt-0.5 font-mono text-micro text-ink-subtle [overflow-wrap:anywhere]">{entry.key}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {changed && (
            <span className="mc-chip mc-chip--accent" style={{ '--chip': P.sand }}>
              override
            </span>
          )}
          {inline && <Switch on={value} onToggle={() => onSet(!value)} labelledBy={labelId} />}
        </div>
      </div>

      {entry.kind === 'number' && (
        <NumberField entry={entry} value={value} on={on} accent={accent} labelId={labelId} onSet={onSet} />
      )}

      {entry.kind === 'toggles' && (
        <ul aria-labelledby={labelId} className="mt-3 divide-y divide-line rounded-md border border-line bg-void">
          {entry.value.map(([name], i) => (
            <li key={name} className="flex items-center justify-between gap-3 py-0.5 pl-3 pr-1.5">
              <span className="min-w-0 text-label text-ink-muted">{name}</span>
              <Switch on={value[i]} onToggle={() => onFlip(i)} label={`${entry.label}: ${name}`} />
            </li>
          ))}
        </ul>
      )}

      {entry.kind === 'multi' && (
        <div role="group" aria-labelledby={labelId} className="mt-3 flex flex-wrap gap-2">
          {entry.value.map(([name], i) => {
            const picked = value[i];
            return (
              <button
                key={name}
                type="button"
                aria-pressed={picked}
                onClick={() => onFlip(i)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-chip border px-2.5 font-mono text-micro tracking-[0.04em] transition-colors duration-200 motion-reduce:transition-none"
                style={
                  picked
                    ? { color: P.jade, borderColor: alpha(P.jade, 0.45), background: alpha(P.jade, 0.08) }
                    : { color: P.inkSubtle, borderColor: P.line, background: 'transparent' }
                }
              >
                <Glyph name={picked ? 'check' : 'box'} />
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SchemaReadout({ entry, value, accent }) {
  if (!entry) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-body text-ink-subtle">{IDLE_SCHEMA}</p>
        <p className="font-mono text-micro text-ink-subtle">{HINT_SCHEMA}</p>
      </div>
    );
  }
  const changed = isChanged(entry, value);
  return (
    <p className="min-w-0 text-body text-ink-muted">
      <span className="sr-only">{entry.label}: </span>
      <code className="font-mono text-label [overflow-wrap:anywhere]" style={{ color: accent }}>
        {exprOf(entry.code)}
      </code>
      <span aria-hidden className="text-ink-subtle">
        {' → '}
      </span>
      <span className="sr-only">, drawn as </span>
      <span className="text-ink">{widgetOf(entry)}</span>
      {changed && (
        <span>
          {' '}
          · now {nowOf(entry, value)}: saved as an override, the default stays in code.
        </span>
      )}
    </p>
  );
}

function SchemaScreen({ accent, reduce }) {
  const idBase = useId();
  const [ref, shown] = useShown(reduce);
  const bodyRef = useRef(null);
  const geo = useConnectors(bodyRef);

  const [values, setValues] = useState(DEFAULTS);
  const [hover, setHover] = useState(null);
  const [focused, setFocused] = useState(null);
  const [pinned, setPinned] = useState(null);

  const linked = hover ?? focused ?? pinned;
  const linkedIndex = SCHEMA.findIndex((e) => e.key === linked);
  const linkedEntry = linkedIndex >= 0 ? SCHEMA[linkedIndex] : null;
  const pristine = SCHEMA.every((e) => !isChanged(e, values[e.key]));

  const linkProps = (key) => ({
    onPointerEnter: () => setHover(key),
    onPointerLeave: () => setHover((h) => (h === key ? null : h)),
    onFocus: () => setFocused(key),
    onBlur: () => setFocused((f) => (f === key ? null : f)),
  });
  // a change pins its pair, so the readout follows it on touch screens too
  const set = (e, v) => {
    setValues((prev) => ({ ...prev, [e.key]: e.kind === 'number' ? clamp(v, e.min, e.max) : v }));
    setPinned(e.key);
  };
  const flip = (e, i) => {
    setValues((prev) => ({ ...prev, [e.key]: prev[e.key].map((on, j) => (j === i ? !on : on)) }));
    setPinned(e.key);
  };

  return (
    <motion.div ref={ref} {...rise(reduce, shown)} className="min-w-0">
      <Eyebrow step={EDITOR_STEP} fallback="Schema → screen" accent={accent} />
      <div className="mt-5">
        <PanelFrame
          caption={
            <span className="min-w-0 font-mono text-label text-ink-muted [overflow-wrap:anywhere]">{EDITOR_CAPTION}</span>
          }
          controls={
            <ResetButton pristine={pristine} onReset={() => setValues(DEFAULTS)} label="Reset the settings to their defaults" />
          }
          footer={<SchemaReadout entry={linkedEntry} value={linkedEntry ? values[linkedEntry.key] : null} accent={accent} />}
        >
          <div
            ref={bodyRef}
            className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:gap-0 lg:grid-cols-[minmax(0,0.95fr)_88px_minmax(0,1.05fr)]"
          >
            {/* schema — centred against the taller screen, so the lines fan out */}
            <div
              data-cp-col="code"
              className="min-w-0 rounded-md border border-line bg-void py-2 md:col-start-1 md:row-start-1 md:self-center"
            >
              <ol aria-label="The zod schema, one line per setting">
                {SCHEMA.map((e, i) => (
                  <CodeLine
                    key={e.key}
                    index={i}
                    on={linked === e.key}
                    pinned={pinned === e.key}
                    accent={accent}
                    onPin={() => setPinned((p) => (p === e.key ? null : e.key))}
                    linkProps={linkProps(e.key)}
                  />
                ))}
              </ol>
            </div>

            {/* screen — the controls the introspector generates */}
            <div data-cp-col="screen" className="flex min-w-0 flex-col gap-2 md:col-start-3 md:row-start-1">
              {SCHEMA.map((e) => (
                <ControlRow
                  key={e.key}
                  entry={e}
                  value={values[e.key]}
                  on={linked === e.key}
                  accent={accent}
                  labelId={`${idBase}-${e.key}`}
                  linkProps={linkProps(e.key)}
                  onSet={(v) => set(e, v)}
                  onFlip={(i) => flip(e, i)}
                />
              ))}
            </div>

            <Connectors geo={geo} linkedIndex={linkedIndex} shown={shown} reduce={reduce} accent={accent} />
          </div>
        </PanelFrame>
      </div>
    </motion.div>
  );
}

/* ── 3 · change history ────────────────────────────────────────────────── */

// field | old → new | by · when | action — stacked under a 42rem panel
const ROW_GRID = '@2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_10.5rem]';

/**
 * Undo one change, the way MC-2 does it: the old value goes back as a new
 * CONFIG_REVERTED row on top, the undone row is marked Undone, and any older
 * change to the same field that could still be undone is now superseded (a
 * newer change sits on top of it). Pure: returns the next rows and the new
 * row, or null when the row can't be undone.
 */
function undoRow(rows, id, newId) {
  const at = rows.findIndex((r) => r.id === id);
  const target = rows[at];
  if (!target || target.state !== 'undo') return null;
  const revert = {
    id: newId,
    field: target.field,
    from: target.to,
    to: target.from,
    who: REVERT.who,
    when: REVERT.when,
    state: 'reverted',
    tag: REVERT.tag,
  };
  const next = rows.map((r, i) => {
    if (i === at) return { ...r, state: 'undone' };
    if (i > at && r.field === target.field && r.state === 'undo') return { ...r, state: 'superseded' };
    return r;
  });
  return { rows: [revert, ...next], revert };
}

function RowAction({ row, onUndo }) {
  switch (row.state) {
    case 'undo':
      return (
        <button
          type="button"
          onClick={() => onUndo(row.id)}
          className="mc-ghost-btn inline-flex min-h-8 items-center gap-1.5 rounded-md border border-line px-2.5 uppercase hover:border-line-hi"
        >
          <Glyph name="undo" />
          Undo
          <span className="sr-only">
            {' '}
            {row.field}: {row.to} back to {row.from}
          </span>
        </button>
      );
    case 'superseded':
      return (
        <span className="mc-chip">
          Changed again since
          <span className="sr-only"> — undo is refused (409) until the newer change is undone</span>
        </span>
      );
    case 'undone':
      return (
        <span className="mc-chip" style={{ color: P.inkSubtle, borderStyle: 'dashed' }}>
          Undone
        </span>
      );
    case 'reverted':
      return (
        <span className="mc-chip mc-chip--accent" style={{ '--chip': P.jade }}>
          {row.tag}
        </span>
      );
    default:
      return null;
  }
}

function HistoryReadout({ last }) {
  if (!last) return <p className="text-body text-ink-subtle">{IDLE_HISTORY}</p>;
  return (
    <p className="min-w-0 text-body text-ink-muted">
      <span className="text-ink">{last.field}</span>:{' '}
      <span className="font-mono text-label">
        <span className="sr-only">from </span>
        <s className="text-ink-subtle">{last.from}</s>
        <span aria-hidden className="text-ink-faint">
          {' → '}
        </span>
        <span className="sr-only"> to </span>
        <span className="text-ink">{last.to}</span>
      </span>
      {' '}— the old value, written back as a new change.
    </p>
  );
}

function History({ accent, reduce }) {
  const [ref, shown] = useShown(reduce);
  const listRef = useRef(null);
  const [rows, setRows] = useState(HISTORY_INIT);
  const [seq, setSeq] = useState(0); // never reset, so a re-added row never reuses a key
  const [last, setLast] = useState(null); // the newest revert this session

  const pristine = rows === HISTORY_INIT;
  const anySuperseded = rows.some((r) => r.state === 'superseded');

  // the Undo button is gone once pressed — carry focus to the row it wrote
  useEffect(() => {
    if (!last) return;
    listRef.current?.querySelector(`[data-row="${last.id}"]`)?.focus({ preventScroll: true });
  }, [last]);

  const undo = (id) => {
    const result = undoRow(rows, id, `r${seq}`);
    if (!result) return;
    setRows(result.rows);
    setSeq(seq + 1);
    setLast(result.revert);
  };

  const reset = () => {
    setRows(HISTORY_INIT);
    setLast(null);
  };

  return (
    <motion.div ref={ref} {...rise(reduce, shown)} className="min-w-0">
      <Eyebrow step={HISTORY_STEP} fallback="Change history" accent={accent} />
      <div className="mt-5">
        <PanelFrame
          caption={<span className="mc-label">Per field · old → new</span>}
          controls={<ResetButton pristine={pristine} onReset={reset} label="Reset the change history" />}
          footer={<HistoryReadout last={last} />}
          live
        >
          <div className="@container min-w-0">
            <div aria-hidden className={`hidden gap-x-6 border-b border-line pb-2.5 @2xl:grid ${ROW_GRID}`}>
              <span className="mc-label">Field</span>
              <span className="mc-label">Old → new</span>
              <span className="mc-label">By · when</span>
              <span />
            </div>
            <ol ref={listRef} aria-label="Change history, newest first" className="relative -mx-3">
              <AnimatePresence initial={false} mode="popLayout">
                {rows.map((row) => {
                  const fresh = last?.id === row.id;
                  const undone = row.state === 'undone';
                  return (
                    <motion.li
                      key={row.id}
                      data-row={row.id}
                      tabIndex={row.state === 'reverted' ? -1 : undefined}
                      layout={reduce ? false : 'position'}
                      initial={reduce ? false : { opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: reduce ? { duration: 0 } : { duration: 0.2 } }}
                      transition={reduce ? { duration: 0 } : { duration: ROW_S, ease: EASE_OUT }}
                      className={`relative grid grid-cols-1 gap-y-1.5 rounded-md border-t border-line px-3 py-3.5 first:border-t-0 @2xl:items-center @2xl:gap-x-6 ${ROW_GRID}`}
                      style={fresh ? { background: alpha(accent, 0.06) } : undefined}
                    >
                      {fresh && (
                        <span aria-hidden className="absolute inset-y-2 left-0 w-[2px] rounded-full" style={{ background: accent }} />
                      )}
                      <p className="min-w-0 text-sm font-medium leading-snug text-ink">{row.field}</p>
                      <p className="min-w-0 font-mono text-label leading-normal">
                        <span className="sr-only">from </span>
                        <s className="text-ink-subtle">{row.from}</s>
                        <span aria-hidden className="text-ink-faint">
                          {' → '}
                        </span>
                        <span className="sr-only"> to </span>
                        <span className={undone ? 'text-ink-subtle' : 'text-ink'}>{row.to}</span>
                      </p>
                      <p className="min-w-0 font-mono text-micro leading-normal text-ink-subtle">
                        <span className="sr-only">by </span>
                        {row.who} · {row.when}
                      </p>
                      <div className="mt-1 @2xl:mt-0 @2xl:justify-self-end">
                        <RowAction row={row} onUndo={undo} />
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
            {anySuperseded && (
              <p className="mt-4 max-w-[70ch] text-label text-ink-subtle">
                <span className="text-ink-muted">Changed again since</span> — a newer change touched the same field, so
                undo is refused (409) until that change is undone.
              </p>
            )}
          </div>
        </PanelFrame>
      </div>
    </motion.div>
  );
}

/* ── 4 · the build strip ───────────────────────────────────────────────── */

/** Filled: an admin feature. Hollow: a design-system rebuild. */
function Marker({ kind, className = '' }) {
  const filled = (KIND[kind] ?? KIND.admin).filled;
  return (
    <span
      aria-hidden
      className={`block h-[9px] w-[9px] rounded-full ${className}`}
      style={{ background: filled ? P.inkMuted : P.void, border: `1.5px solid ${P.inkMuted}` }}
    />
  );
}

function BuildStrip({ reduce }) {
  const [ref, shown] = useShown(reduce);
  const first = STEPS[0];
  const final = STEPS[STEPS.length - 1];
  if (!first) return null;

  return (
    <div ref={ref} className="@container min-w-0">
      <motion.div
        {...rise(reduce, shown)}
        className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3"
      >
        <h3 className={`${LABEL} text-ink-subtle`}>
          {first.id}
          <span aria-hidden className="text-ink-faint">
            {' → '}
          </span>
          <span className="sr-only"> to </span>
          {final.id}
          <span aria-hidden className="text-ink-faint">
            {' · '}
          </span>
          <span className="sr-only">, </span>
          {CONTROL.span}
        </h3>
        <ul aria-label="Key" className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-label text-ink-subtle">
          {Object.entries(KIND).map(([key, k]) => (
            <li key={key} className="inline-flex items-center gap-2">
              <Marker kind={key} />
              {k.label}
              <span className="font-mono text-micro tabular-nums">· {KIND_COUNT[key]}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      <ol
        aria-label={`Build steps, ${first.id} to ${final.id}`}
        className="mt-8 md:grid md:grid-cols-4 md:gap-y-10 @5xl:grid-cols-8"
      >
        {STEPS.map((s, i) => (
          <motion.li
            key={s.id}
            {...rise(reduce, shown, STAGGER_S + i * 0.05)}
            className="relative min-w-0 pb-7 pl-7 last:pb-0 md:pb-0 md:pl-0"
          >
            {/* under 768px: a vertical rail, marker to marker */}
            {i < STEPS.length - 1 && (
              <span aria-hidden className="absolute bottom-[-9px] left-[4px] top-[9px] w-px bg-line-hi md:hidden" />
            )}
            <Marker kind={s.kind} className="absolute left-0 top-[4.5px] md:hidden" />

            <p className="font-mono text-label leading-[18px] text-ink md:pr-5">
              {s.id}
              <span className="text-ink-subtle"> · PR {s.pr}</span>
            </p>

            {/* from 768px: this step's stretch of the ruler */}
            <div aria-hidden className="relative mt-2.5 hidden h-[9px] md:block">
              <motion.span
                className="absolute inset-x-0 top-1/2 block h-px bg-line-hi"
                style={{ originX: 0 }}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: reduce || shown ? 1 : 0 }}
                transition={reduce ? { duration: 0 } : { delay: 0.15 + i * 0.08, duration: 0.45, ease: 'easeOut' }}
              />
              <Marker kind={s.kind} className="absolute left-0 top-0" />
            </div>

            <p className="mt-1 text-sm font-medium leading-snug text-ink md:mt-3 md:pr-5">
              {s.title}
              <span className="sr-only"> ({kindOf(s).label})</span>
            </p>
            <p className="mt-1.5 text-label leading-relaxed text-ink-muted md:pr-5">{s.body}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/* ── 5 · found while building it ───────────────────────────────────────── */

function FixCard({ fix, delay, shown, reduce }) {
  const after = (d, duration = 0.4) => (reduce ? { duration: 0 } : { delay: delay + d, duration, ease: EASE_OUT });
  return (
    <motion.li
      {...rise(reduce, shown, delay)}
      className="@container relative flex min-w-0 flex-col overflow-hidden rounded-panel border border-line bg-surface p-5 sm:p-6"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}
    >
      <span aria-hidden className="absolute inset-x-0 top-0" style={{ height: 2, background: alpha(P.jade, 0.6) }} />
      <h4 className="font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink">{fix.title}</h4>

      <div className="mt-6 flex flex-wrap items-end gap-x-3 gap-y-3">
        <p>
          <span className={`${LABEL} block text-ink-subtle`}>Before</span>
          <span className="mt-2 block font-display text-[1.625rem] font-semibold leading-none tracking-tight text-ink-subtle line-through decoration-2 @xs:text-3xl @md:text-4xl">
            {fix.before}
          </span>
        </p>
        <svg aria-hidden="true" width="28" height="12" viewBox="0 0 28 12" className="mb-2 shrink-0">
          <motion.path
            d="M1 6H25M20.5 1.5L25.5 6L20.5 10.5"
            fill="none"
            stroke={P.inkSubtle}
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: reduce || shown ? 1 : 0 }}
            transition={after(0.2)}
          />
        </svg>
        <motion.p
          initial={reduce ? false : { opacity: 0, x: -6 }}
          animate={reduce || shown ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
          transition={after(0.45)}
        >
          <span className={`${LABEL} block`} style={{ color: P.jade }}>
            After
          </span>
          <span className="mt-2 block font-display text-[1.625rem] font-semibold leading-none tracking-tight @xs:text-3xl @md:text-4xl" style={{ color: P.jade }}>
            {fix.after}
          </span>
        </motion.p>
      </div>
      <p className="mt-3 font-mono text-micro uppercase leading-snug tracking-[0.14em] text-ink-subtle">{fix.unit}</p>
      <p className="mt-5 max-w-[60ch] text-body text-ink-muted">{fix.body}</p>
    </motion.li>
  );
}

function Fixes({ reduce }) {
  const [ref, shown] = useShown(reduce);
  if (!FIXES.length) return null;
  return (
    <div ref={ref} className="min-w-0">
      <motion.h3 {...rise(reduce, shown)} className={`${LABEL} text-ink-subtle`}>
        Found while building it
      </motion.h3>
      <ul className="mt-6 grid gap-5 md:grid-cols-2">
        {FIXES.map((f, i) => (
          <FixCard key={f.title} fix={f} delay={STAGGER_S + i * 0.1} shown={shown} reduce={reduce} />
        ))}
      </ul>
    </div>
  );
}

/* ── the section ───────────────────────────────────────────────────────── */

export default function ControlPlane({ accent = P.accent }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <div className="flex min-w-0 flex-col gap-16 sm:gap-20">
      <Principle reduce={reduce} />
      <SchemaScreen accent={accent} reduce={reduce} />
      <History accent={accent} reduce={reduce} />
      <BuildStrip reduce={reduce} />
      <Fixes reduce={reduce} />
    </div>
  );
}
