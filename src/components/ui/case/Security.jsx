'use client';

/**
 * Security — "Seven layers between a request and the data — then an audit:
 * seven findings, seven fixes."
 *
 * Five blocks, top to bottom:
 *   stack    the centrepiece panel. SECURITY.layers as a vertical stack on a
 *            rail, outermost first: index, layer, where it lives, what it
 *            enforces. Pick a request (SECURITY.probes) and a marker rides the
 *            rail down, one layer per beat. The layers it clears tick jade.
 *            The layer that stops it turns red with a cross and the code it
 *            answered with, and the marker goes no further. The layers under
 *            it stay dim. A request nothing stops reaches the 200 at the foot
 *            of the stack. The readout is the probe's own result.
 *   sign-in  the three failed sign-ins as three rows. Each has the same
 *            timing bar, and all three are wired into one response box. The
 *            facts sit beside them.
 *   audit    CHU-27 … CHU-33 as cards. Each card: id, severity chip (C
 *            critical, H high; critical a step stronger), PR, then Found
 *            (hollow ring) → Fixed (filled jade dot). That is the page's
 *            before / after marker grammar.
 *   bytes    the signatures the upload route accepts, byte by byte with each
 *            byte's ASCII under it, then the renamed text file it refuses.
 *   footer   the holes closed before the audit.
 *
 * Renders only SECURITY from src/data/studies/iet.js. Derived from it: the
 * layer each probe stops at and the code it gets, the counts, the ticket and
 * PR ranges, the severity tally and the ASCII. One fact has no field yet: the
 * audit's merge date. iet.js gives it in its comment on SECURITY.audit, so it
 * is named once here (AUDIT_MERGED).
 *
 * Motion: restrained, and only once a block is in view. The stack auto-runs
 * its first request when a third of it shows (180ms a layer), then waits for
 * the reader. Blocks fade up, the timing bars fill together, and the wires
 * draw into the response. Reduced motion: nothing plays. Every block, the
 * first request's run included, is simply in its final state.
 *
 * Layout: container queries, so it reads from 360px to 1440px. From 768px of
 * panel, the requests and the readout sit in a column beside the stack
 * (above it below that). A layer's checks move beside its name from 576px of
 * stack. The sign-in rows meet the response sideways from 576px of panel, and
 * run down a bus line below that. Byte rows go three columns from 672px of
 * panel. The audit board runs 1 → 2 → 3 → 4 columns with the viewport.
 */
import { useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { SECURITY } from '@/data/studies/iet';

/* ── shared ────────────────────────────────────────────────────────────── */
// .mc-label is unlayered CSS, so its colour can't be overridden by a utility.
// This is the same voice for labels that need a different ink.
const LABEL = 'font-mono text-micro font-medium uppercase tracking-[0.18em]';
const H3 = 'font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink';
const BLOCK_GAP = 'mt-20 sm:mt-24'; // between the blocks, as in the sibling sections
const PANEL_SHADOW = 'inset 0 1px 0 rgba(255, 255, 255, 0.04)';

const RISE_PX = 16;
const RISE_S = 0.6;
const STAGGER_S = 0.06;

const STACK_VIEW = { once: true, amount: 0.3 }; // the run starts when a third of the stack shows
const BLOCK_VIEW = { once: true, amount: 0.25 };
const BOARD_VIEW = { once: true, amount: 0.1 }; // the board is tall on a phone

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n) => WORDS[n] ?? String(n);
const capWord = (n) => {
  const w = word(n);
  return w.charAt(0).toUpperCase() + w.slice(1);
};
const plural = (n, one) => (n === 1 ? one : `${one}s`);
const pad2 = (n) => String(n).padStart(2, '0');

/** A transition that collapses to "instant" under reduced motion. */
function at(reduce, delay = 0, duration = 0.3) {
  return reduce ? { duration: 0 } : { delay, duration, ease: EASE_OUT };
}

/** Fade-up variants; `custom` is the item's place in the stagger. */
const rise = (reduce) => ({
  hidden: { opacity: 0, y: RISE_PX },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: at(reduce, i * STAGGER_S, RISE_S) }),
});

/** A block's in-view latch (always "shown" under reduced motion). */
function useBlock(view) {
  const ref = useRef(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, view);
  return { ref, reduce, shown: reduce || inView };
}

/** The active choice: the reader's pick, else `auto` once in view (or straight
 *  away with reduced motion, which means the final state). `run` bumps on
 *  every click so the same choice can be replayed. */
function useRun(inView, reduce, auto) {
  const [choice, setChoice] = useState(null);
  const active = choice ?? (auto != null && (inView || reduce) ? { key: auto, run: 0 } : null);
  const choose = (key) => setChoice((c) => ({ key, run: (c ? c.run : 0) + 1 }));
  return [active, choose];
}

/* ── small pieces ──────────────────────────────────────────────────────── */

/** Toggle buttons (aria-pressed on the active one). */
function Choices({ label, options, value, onChoose, accent, className = 'flex flex-wrap gap-2' }) {
  return (
    <div role="group" aria-label={label} className={className}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChoose(o.key)}
            className={`rounded-chip border px-3 py-2 text-left font-mono text-micro tracking-[0.04em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              on ? '' : 'border-line text-ink-muted hover:border-line-hi hover:text-ink'
            }`}
            style={on ? { color: accent, borderColor: alpha(accent, 0.5), background: alpha(accent, 0.08) } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Status glyph: idle ring, jade tick, red cross. Opaque, so the rail and
 *  the marker riding it disappear under a node rather than through it. */
function Glyph({ kind, size = 18 }) {
  const tone = { pass: P.jade, block: P.alert, idle: P.lineHi }[kind];
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} aria-hidden="true" className="block shrink-0">
      <circle cx="9" cy="9" r="7.75" fill={P.surface} />
      <circle cx="9" cy="9" r="7.75" fill={kind === 'idle' ? 'none' : alpha(tone, 0.16)} stroke={tone} strokeWidth="1.25" />
      {kind === 'pass' && (
        <path d="M5.6 9.2 L7.9 11.5 L12.4 6.8" fill="none" stroke={tone} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {kind === 'block' && (
        <path d="M6.5 6.5 L11.5 11.5 M11.5 6.5 L6.5 11.5" fill="none" stroke={tone} strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** Before / after, as on the rest of the page: hollow = found, filled = fixed. */
function Marker({ filled = false, tone = P.jade, className = 'mt-[5px]' }) {
  return (
    <span
      aria-hidden="true"
      className={`h-2 w-2 shrink-0 rounded-full ${className}`}
      style={filled ? { background: tone } : { boxShadow: `inset 0 0 0 1.25px ${P.inkSubtle}` }}
    />
  );
}

/* ── 1 · the stack ─────────────────────────────────────────────────────── */
const LAYERS = SECURITY.layers;
const PROBES = SECURITY.probes;
const LAYER_COUNT = LAYERS.length; // also the index of the 200 at the foot
const LAYER_INDEX = Object.fromEntries(LAYERS.map((l, i) => [l.key, i]));
const PROBE_BY_KEY = Object.fromEntries(PROBES.map((p) => [p.key, p]));
const PROBE_OPTIONS = PROBES.map((p) => ({ key: p.key, label: p.label }));

/** The answer a result opens with: '403 · “…”' → '403', '401, the same…' →
 *  '401', 'Refused — no JPEG…' → 'Refused'. */
const headOf = (result) => String(result ?? '').split(/\s+[·—]\s+|,\s/)[0].trim();
const isCode = (s) => /^\d{3}$/.test(s);
const PASS_HEAD = headOf(PROBES.find((p) => p.at == null)?.result);
const PASS_CODE = isCode(PASS_HEAD) ? PASS_HEAD : '200';

/** probe → where it stops (LAYER_COUNT: nowhere) and what it's told. */
function planFor(probe) {
  const stop = probe.at == null ? LAYER_COUNT : (LAYER_INDEX[probe.at] ?? LAYER_COUNT);
  const head = headOf(probe.result);
  return { stop, passed: stop === LAYER_COUNT, tag: isCode(head) ? `Stopped · ${head}` : head || 'Stopped' };
}

// Seconds. The marker leaves the entry at `lead` and takes `hop` per layer; a
// node resolves over `mark`. Rows the marker hasn't reached sit at `dim`.
const STACK = { lead: 0.25, hop: 0.18, mark: 0.2, dim: 0.4 };
/** When the marker reaches row k (k = LAYER_COUNT is the 200 at the foot). */
const arriveAt = (k) => STACK.lead + (k + 1) * STACK.hop;
const SR_STATE = { pass: 'passed', block: 'stopped here', idle: 'not reached' };

// Rail geometry (px). Nothing is measured: every row draws the rail from its
// own node down to the next row's node, which sits at the same NODE_Y. So a
// segment starts at its node and runs the row's height (+ NODE_Y − start).
const RAIL_W = 28;
const RAIL_X = 13; // the 1px line's left edge
const RAIL_CX = RAIL_X + 0.5;
const NODE = 18;
const TOKEN = 9;
const NODE_Y = 31; // 1px rule + py-4 + half the 28px title line
const ENTRY_Y = 20; // py-2 + half the 24px request line
const ENTRY_DOT = 7;

/** The rail from one node to the next: a hairline, the jade trail once the
 *  marker has ridden it, and the marker itself. It is amber because it is
 *  the live thing, and it slides under the nodes at both ends. */
function RailSegment({ top, lit, delay, reduce, accent }) {
  return (
    <span
      aria-hidden="true"
      className="absolute w-px"
      style={{ left: RAIL_X, top, height: `calc(100% - ${top}px + ${NODE_Y}px)` }}
    >
      <span className="absolute inset-0 bg-line-hi" />
      {lit && (
        <motion.span
          className="absolute inset-0 origin-top"
          style={{ background: alpha(P.jade, 0.75) }}
          initial={{ scaleY: reduce ? 1 : 0 }}
          animate={{ scaleY: 1 }}
          transition={reduce ? { duration: 0 } : { delay, duration: STACK.hop, ease: 'linear' }}
        />
      )}
      {lit && !reduce && (
        <motion.span
          className="absolute z-[2] rounded-full"
          style={{
            left: 0.5 - TOKEN / 2,
            width: TOKEN,
            height: TOKEN,
            marginTop: -TOKEN / 2,
            background: accent,
            boxShadow: `0 0 0 2px ${P.surface}`,
          }}
          initial={{ top: '0%', opacity: 0 }}
          animate={{ top: '100%', opacity: 1 }}
          transition={{
            top: { delay, duration: STACK.hop, ease: 'linear' },
            opacity: { delay, duration: 0 },
          }}
        />
      )}
    </span>
  );
}

/** A node on the rail: the idle ring, with the verdict landing on top. */
function RailNode({ state, delay, reduce }) {
  return (
    <span
      aria-hidden="true"
      className="absolute z-[3]"
      style={{ left: RAIL_CX - NODE / 2, top: NODE_Y - NODE / 2, width: NODE, height: NODE }}
    >
      <Glyph kind="idle" />
      {state !== 'idle' && (
        <motion.span
          className="absolute inset-0"
          initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={at(reduce, delay, STACK.mark)}
        >
          <Glyph kind={state} />
        </motion.span>
      )}
    </span>
  );
}

/** A row's text: dim until the marker reaches it (during a run), with a
 *  red wash on the row that stopped it. */
function RowBody({ plan, reached, stopped, delay, reduce, children }) {
  return (
    <motion.div
      className="relative min-w-0 flex-1 border-t border-line py-4 pl-3 pr-1"
      initial={plan && !reduce ? { opacity: STACK.dim } : false}
      animate={{ opacity: !plan || reached ? 1 : STACK.dim }}
      transition={at(reduce, reached ? delay : 0, 0.25)}
    >
      {stopped && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1 right-0 rounded-sm"
          style={{ background: alpha(P.alert, 0.06) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={at(reduce, delay, 0.3)}
        />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function LayerRow({ layer, index, plan, runKey, reduce, accent }) {
  let state = 'idle';
  if (plan) state = index < plan.stop ? 'pass' : index === plan.stop ? 'block' : 'idle';
  const reached = Boolean(plan) && index <= plan.stop;
  const t = arriveAt(index);
  const last = layer.items.length - 1;

  return (
    <li className="relative flex">
      <span className="relative shrink-0" style={{ width: RAIL_W }}>
        <RailSegment
          key={`seg-${runKey}`}
          top={NODE_Y}
          lit={Boolean(plan) && index < plan.stop}
          delay={t}
          reduce={reduce}
          accent={accent}
        />
        <RailNode key={`node-${runKey}`} state={state} delay={t} reduce={reduce} />
      </span>

      <RowBody key={`body-${runKey}`} plan={plan} reached={reached} stopped={state === 'block'} delay={t} reduce={reduce}>
        <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 @xl:grid-cols-[1.75rem_minmax(0,12rem)_minmax(0,1fr)] @xl:gap-x-6">
          <span className="font-mono text-micro leading-7 tabular-nums text-ink-subtle">{pad2(index + 1)}</span>
          <div className="min-w-0">
            {/* the title line is 28px tall: NODE_Y centres the node on it */}
            <p className="leading-7">
              <span className="font-display text-base font-semibold leading-7 text-ink">{layer.label}</span>
              {state === 'block' && (
                <motion.span
                  aria-hidden="true"
                  className="ml-2.5 whitespace-nowrap font-mono text-micro uppercase tracking-[0.14em] text-alert"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={at(reduce, t, 0.3)}
                >
                  {plan.tag}
                </motion.span>
              )}
              {plan && <span className="sr-only"> — {SR_STATE[state]}</span>}
            </p>
            <p className="font-mono text-micro text-ink-subtle [overflow-wrap:anywhere]">{layer.where}</p>
          </div>
          <ul
            aria-label={`What ${layer.label} enforces`}
            className="col-start-2 mt-2 text-[13px] leading-[1.55] text-ink-muted @xl:col-start-3 @xl:mt-0 @xl:pt-1"
          >
            {layer.items.map((item, i) => (
              <li key={item} className="inline">
                {item}
                {i < last && (
                  <span aria-hidden="true" className="px-2 text-ink-faint">
                    ·
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </RowBody>
    </li>
  );
}

function StackLegend({ accent }) {
  const items = [
    { key: 'token', label: 'the request' },
    { key: 'pass', label: 'passed' },
    { key: 'block', label: 'stopped' },
    { key: 'idle', label: 'not reached' },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-micro text-ink-subtle">
      {items.map((it) => (
        <li key={it.key} className="inline-flex items-center gap-2">
          {it.key === 'token' ? (
            <span aria-hidden="true" className="mx-[2.5px] h-[9px] w-[9px] rounded-full" style={{ background: accent }} />
          ) : (
            <Glyph kind={it.key} size={14} />
          )}
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function RequestStack({ accent }) {
  const reduce = Boolean(useReducedMotion());
  const stackRef = useRef(null);
  const inView = useInView(stackRef, STACK_VIEW);
  const [active, choose] = useRun(inView, reduce, PROBES[0]?.key);
  const probe = active ? PROBE_BY_KEY[active.key] : null;
  const plan = probe ? planFor(probe) : null;
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const end = plan ? arriveAt(plan.stop) + STACK.mark : 0;
  const footAt = arriveAt(LAYER_COUNT);
  const passed = Boolean(plan?.passed);
  const status = plan
    ? passed
      ? `All ${LAYER_COUNT} passed`
      : `Stopped at ${pad2(plan.stop + 1)} · ${LAYERS[plan.stop].label}`
    : null;

  return (
    <div className="mc-panel min-w-0">
      <div className="@container">
        <div className="grid grid-cols-1 gap-7 @3xl:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] @3xl:gap-10">
          {/* the requests, and what each one was told */}
          <div className="flex min-w-0 flex-col gap-5">
            <h3 className="mc-label">Send a request down the stack</h3>
            <Choices
              label="Send a request"
              options={PROBE_OPTIONS}
              value={active?.key ?? null}
              onChoose={choose}
              accent={accent}
              className="flex flex-wrap gap-2 @3xl:flex-col"
            />
            <div aria-live="polite" className="min-h-[8rem] border-t border-line pt-4">
              {probe ? (
                <motion.div
                  key={runKey}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={at(reduce, end, 0.35)}
                >
                  <span className="mc-chip mc-chip--accent font-medium" style={{ '--chip': passed ? P.jade : P.alert }}>
                    {status}
                  </span>
                  <p className="mt-3 text-body text-ink-muted">{probe.result}</p>
                </motion.div>
              ) : (
                <p className="text-body text-ink-subtle">Pick a request to send it down.</p>
              )}
            </div>
            <div className="@3xl:mt-auto">
              <StackLegend accent={accent} />
            </div>
          </div>

          {/* the stack */}
          <div ref={stackRef} className="@container min-w-0">
            {/* where the request comes in */}
            <div className="relative flex">
              <span className="relative shrink-0" style={{ width: RAIL_W }}>
                <RailSegment
                  key={`seg-entry-${runKey}`}
                  top={ENTRY_Y}
                  lit={Boolean(plan)}
                  delay={STACK.lead}
                  reduce={reduce}
                  accent={accent}
                />
                <span
                  aria-hidden="true"
                  className="absolute z-[3] rounded-full"
                  style={{
                    left: RAIL_CX - ENTRY_DOT / 2,
                    top: ENTRY_Y - ENTRY_DOT / 2,
                    width: ENTRY_DOT,
                    height: ENTRY_DOT,
                    background: P.surface,
                    boxShadow: `inset 0 0 0 1.25px ${P.inkSubtle}`,
                  }}
                />
              </span>
              <p className="min-w-0 flex-1 py-2 pl-3 leading-6">
                <span className={`${LABEL} mr-3 text-ink-subtle`}>Request</span>
                <span className="font-mono text-label text-ink">{probe ? probe.label : '—'}</span>
              </p>
            </div>

            <ol aria-label="The layers, outermost first">
              {LAYERS.map((layer, i) => (
                <LayerRow key={layer.key} layer={layer} index={i} plan={plan} runKey={runKey} reduce={reduce} accent={accent} />
              ))}
            </ol>

            {/* the far end: only a request nothing stopped gets here */}
            <div className="relative flex">
              <span className="relative shrink-0" style={{ width: RAIL_W }}>
                <RailNode key={`node-foot-${runKey}`} state={passed ? 'pass' : 'idle'} delay={footAt} reduce={reduce} />
              </span>
              <RowBody key={`body-foot-${runKey}`} plan={plan} reached={passed} delay={footAt} reduce={reduce}>
                <p className="flex h-7 items-center">
                  <motion.span
                    key={`foot-${runKey}`}
                    className="inline-flex h-6 items-center rounded-chip border px-2.5 font-mono text-label tabular-nums"
                    initial={reduce ? false : { color: P.inkMuted, borderColor: P.lineHi, backgroundColor: alpha(P.jade, 0) }}
                    animate={
                      passed
                        ? { color: P.jade, borderColor: alpha(P.jade, 0.5), backgroundColor: alpha(P.jade, 0.08) }
                        : { color: P.inkMuted, borderColor: P.lineHi, backgroundColor: alpha(P.jade, 0) }
                    }
                    transition={at(reduce, passed ? footAt : 0, 0.3)}
                  >
                    {PASS_CODE}
                  </motion.span>
                  {plan && <span className="sr-only"> — {passed ? 'reached' : 'not reached'}</span>}
                </p>
              </RowBody>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 2 · sign-in ───────────────────────────────────────────────────────── */
const LOGIN = SECURITY.login;
const CASES = LOGIN.cases;
// '401 · “Invalid email or password.” · no Retry-After' → code, message, the rest
const [RESPONSE_CODE, RESPONSE_MESSAGE, ...RESPONSE_REST] = LOGIN.response.split(' · ');
// Seconds: the timing bars fill together, then the wires draw, then the box lands
const LOGIN_T = { lead: 0.25, bar: 0.9, wire: 0.45, land: 0.35 };
const WIRE_W = 56; // the wide layout's middle column (px)
const WIRE_H = 300; // its viewBox height, stretched to the rows
const WIRE_PATHS = CASES.map((_, i) => {
  const y = ((i + 0.5) * WIRE_H) / CASES.length;
  const mid = WIRE_W / 2;
  return `M0 ${y} C${mid} ${y} ${mid} ${WIRE_H / 2} ${WIRE_W} ${WIRE_H / 2}`;
});
const BAR_TONE = alpha(P.inkMuted, 0.8);

function Chevron({ tone, className }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 6 10" width="6" height="10" className={`block ${className}`}>
      <path d="M0.75 1 L5 5 L0.75 9" fill="none" stroke={tone} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** One failed sign-in: what was tried, what the server still does, how long it took. */
function Attempt({ item, shown, reduce }) {
  return (
    <li className="relative @xl:flex @xl:py-1.5">
      {/* narrow: a stub into the bus line down the left, and the bus on to the next row */}
      <span aria-hidden="true" className="absolute -left-[17px] top-[25px] h-px w-[17px] bg-line-hi @xl:hidden" />
      <span aria-hidden="true" className="absolute -left-[17px] top-[25px] h-[calc(100%+12px)] w-px bg-line-hi @xl:hidden" />

      <div className="w-full rounded-md border border-line bg-surface-2 px-3.5 py-3">
        <p className="text-body font-medium leading-6 text-ink">{item.label}</p>
        <p className="mt-0.5 text-label text-ink-subtle">{item.note}</p>
        <div aria-hidden="true" className="relative mt-3 h-[3px] rounded-full bg-line">
          <motion.div
            className="h-full origin-left rounded-full"
            style={{ background: BAR_TONE }}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: shown ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : { delay: LOGIN_T.lead, duration: LOGIN_T.bar, ease: 'linear' }}
          />
          <span className="absolute -top-[3px] right-0 h-[9px] w-px bg-ink-subtle" />
        </div>
      </div>
    </li>
  );
}

function Login({ accent }) {
  const { ref, reduce, shown } = useBlock(BLOCK_VIEW);
  const wireAt = LOGIN_T.lead + LOGIN_T.bar;
  const landAt = wireAt + LOGIN_T.wire;
  const variants = rise(reduce);

  return (
    <motion.div ref={ref} className={BLOCK_GAP} initial={reduce ? false : 'hidden'} animate={shown ? 'show' : 'hidden'}>
      <motion.div variants={variants} custom={0}>
        <p className={`${LABEL} text-ink-subtle`}>Sign-in</p>
        <h3 className={`mt-3 ${H3}`}>{LOGIN.title}</h3>
      </motion.div>

      <div className="mt-8 grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
        <motion.div variants={variants} custom={1} className="mc-panel min-w-0">
          <p className="mc-label">
            {capWord(CASES.length)} {plural(CASES.length, 'failure')} · one response
          </p>

          <div className="@container mt-5 min-w-0">
            <div className="grid grid-cols-1 gap-3 @xl:grid-cols-[minmax(0,1fr)_56px_minmax(0,0.85fr)] @xl:items-center @xl:gap-0">
              <ol aria-label="Failed sign-ins" className="grid gap-3 pl-6 @xl:auto-rows-fr @xl:gap-0 @xl:self-stretch @xl:pl-0">
                {CASES.map((c) => (
                  <Attempt key={c.key} item={c} shown={shown} reduce={reduce} />
                ))}
              </ol>

              {/* wide: the rows converge on one point */}
              <div aria-hidden="true" className="relative hidden self-stretch @xl:block">
                <motion.div
                  className="absolute inset-0"
                  initial={reduce ? false : { clipPath: 'inset(0 100% 0 0)' }}
                  animate={{ clipPath: shown ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
                  transition={at(reduce, wireAt, LOGIN_T.wire)}
                >
                  <svg viewBox={`0 0 ${WIRE_W} ${WIRE_H}`} preserveAspectRatio="none" className="block h-full w-full overflow-visible">
                    {WIRE_PATHS.map((d) => (
                      <path key={d} d={d} fill="none" stroke={P.inkSubtle} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
                    ))}
                  </svg>
                  <Chevron tone={P.inkSubtle} className="absolute right-0 top-1/2 -mt-[5px]" />
                </motion.div>
              </div>

              {/* the one response every failure gets */}
              <motion.div
                className="relative pl-6 @xl:pl-0"
                initial={reduce ? false : { opacity: 0, x: -6 }}
                animate={shown ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                transition={at(reduce, landAt, LOGIN_T.land)}
              >
                {/* narrow: the bus line turns into the box */}
                <span aria-hidden="true" className="absolute left-[7px] top-[25px] h-px w-[13px] bg-line-hi @xl:hidden" />
                <Chevron tone={P.lineHi} className="absolute left-[18px] top-[20px] @xl:hidden" />

                <div className="rounded-md border bg-void p-4" style={{ borderColor: alpha(P.alert, 0.4) }}>
                  <p className={`${LABEL} text-ink-subtle`}>Response</p>
                  {RESPONSE_MESSAGE ? (
                    <>
                      <p className="mt-3 font-mono text-[1.75rem] font-medium leading-none tabular-nums text-alert">{RESPONSE_CODE}</p>
                      <p className="mt-3 font-mono text-label text-ink [overflow-wrap:anywhere]">{RESPONSE_MESSAGE}</p>
                      {RESPONSE_REST.length > 0 && (
                        <p className="mt-1 font-mono text-micro text-ink-subtle">{RESPONSE_REST.join(' · ')}</p>
                      )}
                    </>
                  ) : (
                    <p className="mt-3 font-mono text-label text-ink [overflow-wrap:anywhere]">{LOGIN.response}</p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          <p className="mt-5 flex items-center gap-2.5 font-mono text-micro text-ink-subtle">
            <span aria-hidden="true" className="h-[3px] w-6 rounded-full" style={{ background: BAR_TONE }} />
            time to respond · equal for all {word(CASES.length)}
          </p>
        </motion.div>

        <motion.ul variants={variants} custom={2} className="flex max-w-[60ch] flex-col gap-4 lg:pt-2">
          {LOGIN.facts.map((fact) => (
            <li key={fact} className="flex gap-4 text-body text-ink-muted">
              <span aria-hidden="true" className="mt-[12px] h-[2px] w-3 shrink-0 rounded-full" style={{ background: accent }} />
              <span>{fact}</span>
            </li>
          ))}
        </motion.ul>
      </div>
    </motion.div>
  );
}

/* ── 3 · the audit board ───────────────────────────────────────────────── */
const AUDIT = SECURITY.audit;
const PR_NUMBERS = AUDIT.map((a) => parseInt(String(a.pr).replace(/\D/g, ''), 10)).filter((n) => n > 0);
const PR_COUNT = new Set(AUDIT.map((a) => a.pr)).size;
const PR_RANGE =
  PR_NUMBERS.length > 1 ? `#${Math.min(...PR_NUMBERS)}–#${Math.max(...PR_NUMBERS)}` : (AUDIT[0]?.pr ?? '');
const TICKET_RANGE = AUDIT.length > 1 ? `${AUDIT[0].id} – ${AUDIT[AUDIT.length - 1].id}` : (AUDIT[0]?.id ?? '');
// iet.js gives the merge date in its comment on SECURITY.audit ("merged
// Oct 23"); it isn't a field yet, so it's named here, not buried in copy.
const AUDIT_MERGED = 'Oct 23';
const AUDIT_CAPTION = `${capWord(AUDIT.length)} ${plural(AUDIT.length, 'finding')}, ${word(PR_COUNT)} ${plural(
  PR_COUNT,
  'pull request'
)}, merged ${AUDIT_MERGED}`;
const SEV_WORD = { C: 'critical', H: 'high' };
const SEV_TALLY = Object.entries(SEV_WORD)
  .map(([letter, name]) => ({ letter, name, count: AUDIT.filter((a) => String(a.sev).toUpperCase().startsWith(letter)).length }))
  .filter((t) => t.count > 0);

/** A severity in a small bordered chip; the critical ones a step stronger. */
function Severity({ sev, letterOnly = false }) {
  const letter = String(sev).charAt(0).toUpperCase();
  const strong = letter === 'C';
  return (
    <span
      className={`inline-flex items-center rounded-chip border px-1.5 py-[3px] font-mono text-micro leading-none tracking-[0.06em] ${
        strong ? 'font-semibold text-ink' : 'text-ink-muted'
      }`}
      style={strong ? { borderColor: P.inkMuted, background: alpha(P.ink, 0.07) } : { borderColor: P.lineHi }}
    >
      {!letterOnly && SEV_WORD[letter] && <span className="sr-only">{SEV_WORD[letter]}, </span>}
      {letterOnly ? letter : sev}
    </span>
  );
}

function AuditCard({ item, order, variants, shown, reduce }) {
  const fixAt = order * STAGGER_S + RISE_S * 0.6;
  return (
    <motion.li
      variants={variants}
      custom={order}
      className="flex min-w-0 flex-col rounded-panel border border-line bg-surface p-4 sm:p-5"
      style={{ boxShadow: PANEL_SHADOW }}
    >
      <header className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <h4 className="font-mono text-label font-medium text-ink">{item.id}</h4>
        <Severity sev={item.sev} />
        <span className="ml-auto font-mono text-micro text-ink-subtle">PR {item.pr}</span>
      </header>
      <dl className="mt-4 flex flex-1 flex-col gap-4 border-t border-line pt-4">
        <div className="flex gap-3">
          {/* the hollow marker, and the line down to the filled one */}
          <span aria-hidden="true" className="flex flex-col items-center">
            <Marker />
            <span className="-mb-4 mt-1.5 w-px flex-1 bg-line-hi" />
          </span>
          <div className="min-w-0">
            <dt className={`${LABEL} text-ink-subtle`}>Found</dt>
            <dd className="mt-1.5 text-sm leading-[1.6] text-ink-muted">{item.found}</dd>
          </div>
        </div>
        <motion.div
          className="flex gap-3"
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
          transition={at(reduce, fixAt, 0.35)}
        >
          <span aria-hidden="true" className="flex flex-col items-center">
            <Marker filled tone={P.jade} />
          </span>
          <div className="min-w-0">
            <dt className={`${LABEL} text-jade`}>Fixed</dt>
            <dd className="mt-1.5 text-sm leading-[1.6] text-ink">{item.fixed}</dd>
          </div>
        </motion.div>
      </dl>
    </motion.li>
  );
}

function AuditBoard() {
  const { ref, reduce, shown } = useBlock(BOARD_VIEW);
  const variants = rise(reduce);
  return (
    <motion.div ref={ref} className={BLOCK_GAP} initial={reduce ? false : 'hidden'} animate={shown ? 'show' : 'hidden'}>
      <motion.div variants={variants} custom={0}>
        <p className={`${LABEL} text-ink-subtle`}>
          The audit{TICKET_RANGE && <> · {TICKET_RANGE}</>}
          {PR_RANGE && <> · PRs {PR_RANGE}</>}
        </p>
        <h3 className={`mt-3 max-w-[34ch] text-balance ${H3}`}>{AUDIT_CAPTION}</h3>
        {/* the key: severity letters with their tally, then the markers */}
        <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5 font-mono text-micro text-ink-subtle">
          {SEV_TALLY.map((t) => (
            <li key={t.letter} className="inline-flex items-center gap-2">
              <Severity sev={t.letter} letterOnly />
              {t.name} · {t.count}
            </li>
          ))}
          <li className="inline-flex items-center gap-2">
            <Marker className="" />
            found
          </li>
          <li className="inline-flex items-center gap-2">
            <Marker filled tone={P.jade} className="" />
            fixed
          </li>
        </ul>
      </motion.div>
      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {AUDIT.map((item, i) => (
          <AuditCard key={item.id} item={item} order={i + 1} variants={variants} shown={shown} reduce={reduce} />
        ))}
      </ul>
    </motion.div>
  );
}

/* ── 4 · magic bytes ───────────────────────────────────────────────────── */
const SIGNATURES = SECURITY.signatures;
const REFUSED = SECURITY.refused;
// the line in the Files layer this strip illustrates, and the ticket that fixed it
const MAGIC_LINE = LAYERS.find((l) => l.key === 'files')?.items.find((t) => /magic bytes/i.test(t)) ?? null;
const MAGIC_TICKET = AUDIT.find((a) => /magic bytes/i.test(a.fixed))?.id ?? null;
const BYTE_GRID = 'grid grid-cols-1 gap-x-6 gap-y-3 @2xl:grid-cols-[minmax(0,11rem)_13rem_minmax(0,1fr)] @2xl:items-center';

/** A byte as text: printable ASCII, else a middle dot. */
const asciiOf = (hex) => {
  const c = parseInt(hex, 16);
  return c >= 0x21 && c <= 0x7e ? String.fromCharCode(c) : '·';
};
/** Signatures pinned to the first byte vs. ones found further in. */
const atStart = (note) => /\bbyte 0\b/.test(note);

const BYTE_LOOK = {
  ok: { borderColor: P.lineHi, color: P.ink, borderStyle: 'solid' },
  refused: { borderColor: alpha(P.alert, 0.5), color: P.alert, borderStyle: 'dashed' },
  gap: { borderColor: P.line, color: P.inkSubtle, borderStyle: 'dashed' },
};

function ByteBox({ hex, look }) {
  return (
    <span aria-hidden="true" className="flex w-9 flex-col items-center gap-1">
      <span
        className="flex h-8 w-9 items-center justify-center rounded-chip border bg-void font-mono text-label tabular-nums"
        style={BYTE_LOOK[look]}
      >
        {look === 'gap' ? '…' : hex}
      </span>
      <span className="h-4 font-mono text-micro leading-4 text-ink-subtle">{look === 'gap' ? '' : asciiOf(hex)}</span>
    </span>
  );
}

function Bytes({ bytes, look, offset = false }) {
  return (
    <span className="flex flex-wrap items-start gap-1.5">
      <span className="sr-only">{`${offset ? 'somewhere in, ' : ''}bytes ${bytes.join(' ')}`}</span>
      {offset && <ByteBox hex="" look="gap" />}
      {bytes.map((hex, i) => (
        <ByteBox key={`${i}-${hex}`} hex={hex} look={look} />
      ))}
    </span>
  );
}

function MagicBytes() {
  const { ref, reduce, shown } = useBlock(BLOCK_VIEW);
  const variants = rise(reduce);
  return (
    <motion.div ref={ref} className={BLOCK_GAP} initial={reduce ? false : 'hidden'} animate={shown ? 'show' : 'hidden'}>
      <motion.div variants={variants} custom={0}>
        <p className={`${LABEL} text-ink-subtle`}>
          Magic bytes{MAGIC_TICKET && <> · {MAGIC_TICKET}</>}
        </p>
        {MAGIC_LINE && <h3 className={`mt-3 ${H3}`}>{MAGIC_LINE}</h3>}
      </motion.div>

      <motion.div variants={variants} custom={1} className="mc-panel mt-8 min-w-0">
        <div className="@container min-w-0">
          <p className={`${LABEL} flex items-center gap-2 text-ink-subtle`}>
            <Glyph kind="pass" size={14} />
            Accepted
          </p>
          <ul className="mt-3">
            {SIGNATURES.map((sig, i) => (
              <motion.li key={sig.type} variants={variants} custom={i + 2} className={`${BYTE_GRID} border-t border-line py-4`}>
                <p className="font-mono text-label font-medium text-ink">{sig.type}</p>
                <Bytes bytes={sig.bytes} look="ok" offset={!atStart(sig.note)} />
                <p className="text-label text-ink-subtle">{sig.note}</p>
              </motion.li>
            ))}
          </ul>

          <p className={`${LABEL} mt-6 flex items-center gap-2 text-ink-subtle`}>
            <Glyph kind="block" size={14} />
            Refused
          </p>
          <motion.div
            variants={variants}
            custom={SIGNATURES.length + 2}
            className={`${BYTE_GRID} mt-3 rounded-md border px-3.5 py-4`}
            style={{ borderColor: alpha(P.alert, 0.35), background: alpha(P.alert, 0.04) }}
          >
            <div className="min-w-0">
              <p className="font-mono text-label font-medium text-ink [overflow-wrap:anywhere]">{REFUSED.name}</p>
              <p className="mt-1.5 font-mono text-micro text-ink-subtle">
                browser says <s className="text-ink-muted decoration-alert decoration-1">{REFUSED.claimed}</s>
              </p>
            </div>
            <Bytes bytes={REFUSED.bytes} look="refused" />
            <p className="text-label text-alert">{REFUSED.note}</p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── 5 · before the audit ──────────────────────────────────────────────── */

function Footer() {
  const { ref, reduce, shown } = useBlock(BLOCK_VIEW);
  const variants = rise(reduce);
  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : 'hidden'}
      animate={shown ? 'show' : 'hidden'}
      className={BLOCK_GAP}
    >
      <motion.div variants={variants} custom={0} className="min-w-0 max-w-[60ch]">
        <h3 className={`${LABEL} text-ink-subtle`}>Closed before the audit</h3>
        <ul className="mt-5 border-b border-line">
          {SECURITY.earlier.map((e) => (
            <li key={e.text} className="grid grid-cols-[3.75rem_minmax(0,1fr)] items-baseline gap-4 border-t border-line py-4">
              <span className="font-mono text-label tabular-nums text-ink-subtle">{e.when}</span>
              <p className="text-body text-ink-muted">{e.text}</p>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}

/* ── the section body ──────────────────────────────────────────────────── */

export default function Security({ accent = P.accent }) {
  return (
    <div className="min-w-0">
      <RequestStack accent={accent} />
      <Login accent={accent} />
      <AuditBoard />
      <MagicBytes />
      <Footer />
    </div>
  );
}
