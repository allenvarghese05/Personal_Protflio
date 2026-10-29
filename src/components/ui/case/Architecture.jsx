'use client';

/**
 * Architecture — "One Next.js app, N layers — follow a request through it."
 *
 * The system as layers, left → right (who · the app · the rules in src/lib ·
 * data · outside), one column per entry in LAYERS from the study data. Pick a
 * trace (TRACES) and its steps light in order while a path draws between
 * them; the first trace autoplays once the section is in view. Hover, tap or
 * tab to any part to read what it does. "Explore the full graph" swaps in the
 * existing force graph (project.architectureGraph) for every node and edge.
 *
 * Node copy comes from the project's architectureGraph by id — LAYERS only
 * carries the parts that graph doesn't have. People in the Who column read
 * their tier and headcount from ROLES when they have an entry there (the
 * Super Admin sits outside the approval chain and has none). Under 1024px
 * the layers stack as rows of wrapping pills. Node centres are measured from
 * layout offsets (transform-free) and re-measured by a ResizeObserver, so the
 * path follows every reflow. Reduced motion: the whole trace, instantly.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import ArchitectureGraph from '@/components/ui/ArchitectureGraph';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';

/* ── tuning ───────────────────────────────────────────────────────────────── */
const STEP_MS = 380; // one step of a trace lights every STEP_MS
const FIRST_STEP_MS = 120; // lead-in before step 1 lights
const AUTOPLAY_DELAY_MS = 450; // after the section scrolls into view
const COLUMNS_QUERY = '(min-width: 1024px)'; // Tailwind `lg` — one column per layer
const BRACKET_GAP = 14; // px a same-column hop bulges past the pill edge
const RETURN_BOW = 36; // px a backward hop bows away from the forward path
const ARC_GAP = 9; // px a same-row hop (stacked layout) arcs above the pills
const DIM_DOT = 0.4; // dot opacity for parts outside the active trace
const DRAW_S = (STEP_MS * 0.9) / 1000; // a hop finishes drawing as its node lights
const PORT_R = 2.5; // px — the dot where a hop meets a pill edge
const SKIP_GAP = 12; // px a layer-skipping hop runs clear of the layers it skips
const CORNER_R = 10; // px corner radius on a layer-skipping hop

const WHO_KEY = 'who';
// one grid column per layer at lg — whole literals, so Tailwind can see them
const LAYER_COLS = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' };
// LAYERS objects carry their own label/desc but no category — by layer
const FALLBACK_CATEGORY = { app: 'core' };
const NO_STEPS = [];

// Category hues for this view. Amber belongs to the trace alone (the active
// thing), so no category may use accent / accentLo here. Ice = data, so file
// storage shares it with the database; infrastructure (the scheduler outside
// the app) is plumbing like core, so it shares slate. The key merges entries
// that share a hue; the Outside column says the rest by position.
const ARCH_COLOR = {
  core: P.slate,
  infrastructure: P.slate,
  ui: P.slate,
  auth: P.jade,
  workflow: P.sand,
  audio: P.sand,
  location: P.lilac,
  ai: P.lilac,
  data: P.ice,
  storage: P.ice,
  realtime: P.inkMuted,
};

// in key order: categories that share a hue sit next to each other, so a
// merged key entry reads "Data · Storage", not in whatever order the layers
// happen to mention them
const CATEGORY_LABEL = {
  core: 'Core',
  infrastructure: 'Infrastructure',
  ui: 'UI',
  auth: 'Auth · security',
  workflow: 'Workflow',
  audio: 'Audio',
  location: 'Location',
  ai: 'AI · ML',
  data: 'Data',
  storage: 'Storage',
  realtime: 'Notifications',
};
const KEY_ORDER = Object.keys(CATEGORY_LABEL);
// unknown categories go to the end of the key, in order of appearance
const keyRank = (category) => {
  const i = KEY_ORDER.indexOf(category);
  return i === -1 ? KEY_ORDER.length : i;
};

/* ── helpers ──────────────────────────────────────────────────────────────── */
const pad2 = (n) => String(n).padStart(2, '0');
const round1 = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${round1(p.x)} ${round1(p.y)}`; // SVG path coordinate pair

/** LAYERS entry (graph id or own object) → one flat node record. */
function resolveNode(entry, layer, graphById) {
  if (typeof entry === 'string') {
    const g = graphById.get(entry) ?? {};
    return {
      id: entry,
      label: g.label ?? entry,
      desc: g.description ?? g.desc ?? '',
      category: g.category,
      layer,
    };
  }
  return {
    id: entry.id,
    label: entry.label,
    desc: entry.desc ?? '',
    category: entry.category ?? FALLBACK_CATEGORY[layer.key],
    layer,
  };
}

/** Who-layer node id ('tier-pastor') → its ROLES entry, for tier + headcount.
 *  Undefined for people outside the approval chain (tier-admin). */
const roleOf = (id, roles = []) => roles.find((r) => `tier-${r.key}` === id);

/** Layout position of `el` inside `root`, ignoring transforms (entrance
 *  animations), so the path never measures a pill mid-slide. */
function offsetWithin(el, root) {
  let x = 0;
  let y = 0;
  let node = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  if (node === root) return { x, y };
  // root isn't an offset ancestor — fall back to the rendered rects
  const a = el.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top };
}

// pill edge anchors — hops start and end on the border, so the whole path
// lives in the gutters and draws on in full (hops that skip a column route
// around the columns between — see skipHopPath)
const rightOf = (n) => ({ x: n.x + n.w / 2, y: n.y });
const leftOf = (n) => ({ x: n.x - n.w / 2, y: n.y });
const topOf = (n) => ({ x: n.x, y: n.y - n.h / 2 });
const bottomOf = (n) => ({ x: n.x, y: n.y + n.h / 2 });

/**
 * One hop of a trace as a cubic Bézier between two measured nodes.
 * `rel`: 0 = same layer, 1 = to a later layer, -1 = back to an earlier one.
 * Columns: forward hops are horizontal S-curves edge to edge; same-column
 * hops bracket out to the right; backward hops bow below the forward line.
 * (Hops that skip a column take skipHopPath instead.)
 * Rows (stacked): the same idea turned 90°. Returns { d, from, to }.
 */
function hopPath(a, b, rel, columns) {
  let from;
  let to;
  let c1;
  let c2;
  // a cubic whose two handles sit k out from the ends peaks at 0.75k
  const bracket = (gap) => (gap * 4) / 3;

  if (columns) {
    if (rel === 0) {
      from = rightOf(a);
      to = rightOf(b);
      const k = bracket(BRACKET_GAP);
      c1 = { x: from.x + k, y: from.y };
      c2 = { x: to.x + k, y: to.y };
    } else if (rel > 0) {
      from = rightOf(a);
      to = leftOf(b);
      const half = (to.x - from.x) / 2;
      c1 = { x: from.x + half, y: from.y };
      c2 = { x: to.x - half, y: to.y };
    } else {
      from = leftOf(a);
      to = rightOf(b);
      const half = (from.x - to.x) / 2;
      c1 = { x: from.x - half, y: from.y + RETURN_BOW };
      c2 = { x: to.x + half, y: to.y + RETURN_BOW };
    }
  } else {
    const tol = Math.min(a.h, b.h) / 2;
    if (Math.abs(a.y - b.y) < tol) {
      // same line of pills — arc over the top
      from = topOf(a);
      to = topOf(b);
      const k = bracket(ARC_GAP);
      c1 = { x: from.x, y: from.y - k };
      c2 = { x: to.x, y: to.y - k };
    } else if (b.y > a.y) {
      from = bottomOf(a);
      to = topOf(b);
      const half = (to.y - from.y) / 2;
      c1 = { x: from.x, y: from.y + half };
      c2 = { x: to.x, y: to.y - half };
    } else {
      from = topOf(a);
      to = bottomOf(b);
      const half = (from.y - to.y) / 2;
      const bow = rel < 0 ? RETURN_BOW : 0;
      c1 = { x: from.x + bow, y: from.y - half };
      c2 = { x: to.x + bow, y: to.y + half };
    }
  }

  return { d: `M${pt(from)} C${pt(c1)} ${pt(c2)} ${pt(to)}`, from, to };
}

/** Polyline → path with each inner vertex rounded off by up to `radius`. */
function roundedPath(points, radius) {
  let d = `M${pt(points[0])}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const p = points[i];
    const next = points[i + 1];
    const inLen = Math.hypot(p.x - prev.x, p.y - prev.y);
    const outLen = Math.hypot(next.x - p.x, next.y - p.y);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    if (r > 0) {
      const enter = { x: p.x - ((p.x - prev.x) / inLen) * r, y: p.y - ((p.y - prev.y) / inLen) * r };
      const exit = { x: p.x + ((next.x - p.x) / outLen) * r, y: p.y + ((next.y - p.y) / outLen) * r };
      d += ` L${pt(enter)} Q${pt(p)} ${pt(exit)}`;
    } else {
      d += ` L${pt(p)}`;
    }
  }
  return `${d} L${pt(points[points.length - 1])}`;
}

/**
 * Columns only: a hop that skips layers (app → outside). Edge to edge it would
 * pass under the pills of every layer between, so it steps into the gutter
 * beside `a`, runs along `bandY` — over the headers going forward, under the
 * skipped stacks coming back — then drops into the gutter beside `b`.
 */
function skipHopPath(a, b, forward, gutterA, gutterB, bandY) {
  const from = forward ? rightOf(a) : leftOf(a);
  const to = forward ? leftOf(b) : rightOf(b);
  const d = roundedPath(
    [from, { x: gutterA, y: from.y }, { x: gutterA, y: bandY }, { x: gutterB, y: bandY }, { x: gutterB, y: to.y }, to],
    CORNER_R,
  );
  return { d, from, to };
}

/** Pill colours for its state — inline so the accent prop drives them. */
function pillStyle({ lit, dim, pending, focused, accent }) {
  if (lit) {
    return {
      background: `color-mix(in srgb, ${accent} ${focused ? 16 : 11}%, ${P.surface})`,
      borderColor: alpha(accent, focused ? 0.95 : 0.6),
      color: P.ink,
    };
  }
  if (focused) return { background: P.surface2, borderColor: P.lineHi, color: P.ink };
  if (dim) return { background: P.surface, borderColor: P.line, color: P.inkSubtle };
  if (pending) return { background: P.surface, borderColor: P.line, color: P.inkMuted };
  return { background: P.surface, borderColor: P.line, color: P.ink };
}

function Dot({ color, dim = false }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full transition-opacity duration-300"
      style={{ background: color, opacity: dim ? DIM_DOT : 1 }}
    />
  );
}

/* ── component ────────────────────────────────────────────────────────────── */
/**
 * `layers`: [{ key, label, nodes: [graph node id | { id, label, desc, category }] }]
 * (the first layer keyed 'who' holds the people); `traces`: [{ id, label,
 * steps: [node ids] }]; `roles` (optional): [{ key, num, pop }] for the people's
 * tier + headcount. Node copy comes from project.architectureGraph by id.
 */
export default function Architecture({ project, layers: LAYERS = [], traces: TRACES = [], roles = [], accent = P.accent }) {
  const uid = useId();
  const reduced = useReducedMotion();
  const graph = project?.architectureGraph;

  const rootRef = useRef(null);
  const nodeEls = useRef(new Map());
  const inView = useInView(rootRef, { once: true, amount: 0.3 });

  const [explore, setExplore] = useState(false);
  // the view has been switched at least once — the layers panel fades in only
  // when it returns, not on first mount
  const [toggled, setToggled] = useState(false);
  const [traceId, setTraceId] = useState(TRACES[0]?.id);
  const [run, setRun] = useState(0); // play count — 0 until the first trace runs
  const [step, setStep] = useState(0); // steps lit in the current run
  const [peek, setPeek] = useState(null); // hovered / focused node id
  const [pinned, setPinned] = useState(null); // clicked / tapped node id
  const [geo, setGeo] = useState(null); // measured { columns, nodes: {id: {x,y,w,h}} }
  // the canvas element, as state: it mounts late when returning from the graph
  // (AnimatePresence waits for the exit), and measuring must follow it
  const [canvas, setCanvas] = useState(null);

  /* data → layers of resolved nodes */
  const { layers, nodeById, layerIndexOf, legend } = useMemo(() => {
    const graphById = new Map((graph?.nodes ?? []).map((n) => [n.id, n]));
    const built = LAYERS.map((layer) => ({
      ...layer,
      nodes: layer.nodes.map((entry) => resolveNode(entry, layer, graphById)),
    }));
    const byId = new Map();
    const indexOf = new Map();
    built.forEach((layer, i) =>
      layer.nodes.forEach((n) => {
        byId.set(n.id, n);
        indexOf.set(n.id, i);
      }),
    );
    // the key: People first, then only the categories the parts actually use,
    // in key order (a stable sort keeps unknown ones in order of appearance)
    const seen = new Set();
    const cats = [];
    built.forEach((layer) => {
      if (layer.key === WHO_KEY) return;
      layer.nodes.forEach((n) => {
        if (n.category && !seen.has(n.category)) {
          seen.add(n.category);
          cats.push(n.category);
        }
      });
    });
    cats.sort((a, b) => keyRank(a) - keyRank(b));
    return { layers: built, nodeById: byId, layerIndexOf: indexOf, legend: cats };
  }, [graph, LAYERS]);

  // category → hue (the project's own graph palette first, else the amber-free
  // ARCH_COLOR); people are ink
  // (ARCH_COLOR always — a project's own graph palette may use amber, which here is the trace's)
  const graphColors = ARCH_COLOR;
  const categoryColor = useCallback((category) => graphColors[category] ?? P.slate, [graphColors]);
  const colorOf = useCallback(
    (node) => (node.layer.key === WHO_KEY ? P.ink : categoryColor(node.category)),
    [categoryColor],
  );

  /* trace state */
  const trace = TRACES.find((t) => t.id === traceId) ?? TRACES[0];
  const steps = trace?.steps ?? NO_STEPS;
  const started = reduced || run > 0;
  // reduced motion: the final state, instantly
  const shown = !started ? 0 : reduced ? steps.length : step;
  const stepsOf = useMemo(() => {
    const m = new Map();
    steps.forEach((id, i) => m.set(id, [...(m.get(id) ?? []), i]));
    return m;
  }, [steps]);

  const play = useCallback((id) => {
    setTraceId(id);
    setStep(0);
    setRun((r) => r + 1);
  }, []);

  // autoplay the first trace once, when the section is first seen
  useEffect(() => {
    if (!inView || reduced || run > 0) return undefined;
    const first = TRACES[0]?.id;
    if (!first) return undefined;
    const t = setTimeout(() => play(first), AUTOPLAY_DELAY_MS);
    return () => clearTimeout(t);
  }, [inView, reduced, run, play, TRACES]);

  // light the steps of the current run, one every STEP_MS
  useEffect(() => {
    if (run === 0 || reduced) return undefined;
    const timers = steps.map((_, i) => setTimeout(() => setStep(i + 1), FIRST_STEP_MS + i * STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, [run, steps, reduced]);

  /* measurement — node centres relative to the canvas */
  const nodeRefs = useMemo(() => {
    const refs = {};
    nodeById.forEach((_, id) => {
      refs[id] = (el) => {
        if (el) nodeEls.current.set(id, el);
        else nodeEls.current.delete(id);
      };
    });
    return refs;
  }, [nodeById]);

  useEffect(() => {
    const root = canvas;
    if (!root) return undefined;
    let frame = 0;
    let alive = true;
    const measure = () => {
      frame = 0;
      const nodes = {};
      nodeEls.current.forEach((el, id) => {
        const { x, y } = offsetWithin(el, root);
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        nodes[id] = { x: x + w / 2, y: y + h / 2, w, h };
      });
      setGeo({ columns: window.matchMedia(COLUMNS_QUERY).matches, nodes });
    };
    const schedule = () => {
      if (alive && !frame) frame = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(schedule); // fires once on observe, then on every reflow
    ro.observe(root);
    nodeEls.current.forEach((el) => ro.observe(el));
    document.fonts?.ready.then(schedule); // webfonts change pill sizes
    return () => {
      alive = false;
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [canvas]);

  const hops = useMemo(() => {
    if (!geo) return [];
    // each layer's measured extent — a hop that skips layers routes around them
    const cols = layers.map((layer) => {
      const boxes = layer.nodes.map((n) => geo.nodes[n.id]).filter(Boolean);
      return {
        left: Math.min(...boxes.map((n) => n.x - n.w / 2)),
        right: Math.max(...boxes.map((n) => n.x + n.w / 2)),
        bottom: Math.max(...boxes.map((n) => n.y + n.h / 2)),
      };
    });
    const gutterAfter = (li) => (cols[li].right + cols[li + 1].left) / 2;
    return steps.slice(0, -1).map((id, i) => {
      const a = geo.nodes[id];
      const b = geo.nodes[steps[i + 1]];
      if (!a || !b) return null;
      const ia = layerIndexOf.get(id) ?? 0;
      const ib = layerIndexOf.get(steps[i + 1]) ?? 0;
      if (geo.columns && Math.abs(ib - ia) > 1) {
        const forward = ib > ia;
        const gutterA = gutterAfter(forward ? ia : ia - 1);
        const gutterB = gutterAfter(forward ? ib - 1 : ib);
        // forward: over the layer headers (the canvas top); back: under the
        // tallest of the skipped stacks
        const skipped = cols.slice(Math.min(ia, ib) + 1, Math.max(ia, ib));
        const band = forward ? -SKIP_GAP : Math.max(...skipped.map((c) => c.bottom)) + SKIP_GAP;
        if ([gutterA, gutterB, band].every(Number.isFinite)) {
          return skipHopPath(a, b, forward, gutterA, gutterB, band);
        }
      }
      return hopPath(a, b, Math.sign(ib - ia), geo.columns);
    });
  }, [geo, steps, layers, layerIndexOf]);

  /* detail */
  const detailId = peek ?? pinned;
  const detail = detailId ? nodeById.get(detailId) : null;
  const leave = (id) => setPeek((cur) => (cur === id ? null : cur));

  const graphNodeCount = graph?.nodes?.length ?? 0;
  const graphEdgeCount = graph?.edges?.length ?? 0;
  const viewId = `${uid}-view`;

  return (
    <div ref={rootRef} className="w-full min-w-0">
      {/* ── controls: traces + the graph toggle ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        {explore ? (
          <p className="mc-label">
            Full graph · {graphNodeCount} parts · {graphEdgeCount} links · drag, zoom, click a node
          </p>
        ) : (
          <div role="group" aria-label="Trace a request" className="flex flex-wrap items-center gap-2">
            <span className="mc-label mr-1">Trace a request:</span>
            {TRACES.map((t) => {
              const on = started && t.id === traceId;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => play(t.id)}
                  // built from utilities, not .mc-chip: that rule is unlayered and
                  // would cancel the padding and hover utilities
                  className={`inline-flex min-h-8 cursor-pointer items-center rounded-chip border border-line bg-surface-2 px-3 font-mono text-micro leading-none text-ink-muted transition-colors duration-200 hover:border-line-hi hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${on ? 'mc-chip--accent' : ''}`}
                  style={on ? { '--chip': accent } : undefined}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          aria-controls={viewId}
          onClick={() => {
            setExplore((v) => !v);
            setToggled(true);
          }}
          className="mc-ghost-btn inline-flex min-h-9 items-center gap-2 rounded-md border border-line px-3 uppercase hover:border-line-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {explore ? (
            <>
              <span aria-hidden="true">←</span> Back to layers
            </>
          ) : (
            <>
              Explore the full graph <span aria-hidden="true">→</span>
            </>
          )}
        </button>
      </div>

      <div id={viewId} className="mt-5">
        {/* no initial={false} here: AnimatePresence would hand it to every motion
            child of the first panel for life, so paths, badges and the pill
            stagger would start finished. The panel skips its own fade instead. */}
        <AnimatePresence mode="wait">
          {explore ? (
            <motion.div
              key="graph"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="h-[440px] overflow-hidden rounded-panel border border-line"
            >
              {graph ? (
                <ArchitectureGraph
                  nodes={graph.nodes}
                  edges={graph.edges}
                  categoryColors={graphColors}
                  accent={accent}
                />
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key="layers"
              initial={reduced || !toggled ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="overflow-hidden rounded-panel border border-line px-4 pb-5 pt-5 sm:px-6 sm:pt-6"
            >
              {/* ── the layers; the trace path draws underneath the pills ── */}
              <div
                ref={setCanvas}
                className={`relative grid gap-6 lg:gap-x-8 xl:gap-x-12 ${LAYER_COLS[layers.length] ?? 'lg:grid-cols-5'}`}
              >
                <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible">
                  {hops.map((hop, i) =>
                    hop && shown > i ? (
                      <g key={`${run}-${traceId}-${i}`}>
                        <motion.path
                          d={hop.d}
                          fill="none"
                          stroke={accent}
                          strokeWidth={geo?.columns ? 1.5 : 1.25}
                          strokeLinecap="round"
                          strokeOpacity={geo?.columns ? 0.85 : 0.6}
                          initial={reduced ? false : { pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: DRAW_S, ease: 'easeInOut' }}
                        />
                        <circle cx={hop.from.x} cy={hop.from.y} r={PORT_R} fill={accent} />
                        <motion.circle
                          cx={hop.to.x}
                          cy={hop.to.y}
                          r={PORT_R}
                          fill={accent}
                          initial={reduced ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.15, delay: reduced ? 0 : DRAW_S }}
                        />
                      </g>
                    ) : null,
                  )}
                </svg>

                {layers.map((layer, li) => {
                  const headId = `${uid}-layer-${layer.key}`;
                  return (
                    <div key={layer.key} role="group" aria-labelledby={headId} className="min-w-0">
                      {/* above the trace (z-2, opaque) so a hop into this row
                          passes under the header instead of striking it out */}
                      <div className="relative z-[2] mb-3 flex items-baseline justify-between gap-2 border-b border-line bg-void pb-2">
                        <span
                          id={headId}
                          className="font-mono text-micro font-medium uppercase tracking-[0.18em] text-ink-muted"
                        >
                          {layer.label}
                        </span>
                        <span className="font-mono text-micro tabular-nums text-ink-subtle">
                          {layer.nodes.length}
                        </span>
                      </div>
                      <ul className="flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap lg:gap-2.5">
                        {layer.nodes.map((node, ni) => {
                          const idxs = stepsOf.get(node.id) ?? [];
                          const reached = idxs.filter((i) => i < shown);
                          const lit = reached.length > 0;
                          const dim = shown > 0 && idxs.length === 0;
                          const pending = shown > 0 && idxs.length > 0 && !lit;
                          const focused = node.id === peek || node.id === pinned;
                          return (
                            <li key={node.id} className="lg:w-full">
                              <motion.button
                                ref={nodeRefs[node.id]}
                                type="button"
                                aria-pressed={pinned === node.id}
                                aria-describedby={`${uid}-desc-${node.id}`}
                                onMouseEnter={() => setPeek(node.id)}
                                onMouseLeave={() => leave(node.id)}
                                onFocus={() => setPeek(node.id)}
                                onBlur={() => leave(node.id)}
                                onClick={() => setPinned((cur) => (cur === node.id ? null : node.id))}
                                initial={reduced ? false : { opacity: 0, y: 6 }}
                                animate={inView || reduced ? { opacity: 1, y: 0 } : undefined}
                                transition={{ duration: 0.45, ease: EASE_OUT, delay: li * 0.07 + ni * 0.035 }}
                                className="relative z-[2] flex min-h-10 items-center gap-2.5 rounded-md border px-3 py-2 text-left text-[13px] leading-snug transition-[background-color,border-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:min-h-11 lg:w-full lg:text-sm"
                                style={pillStyle({ lit, dim, pending, focused, accent })}
                              >
                                <Dot color={colorOf(node)} dim={dim && !focused} />
                                <span className="min-w-0">{node.label}</span>
                                {lit ? (
                                  <motion.span
                                    key={`${run}-${reached.length}`}
                                    aria-hidden="true"
                                    initial={reduced ? false : { scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.25, ease: EASE_OUT }}
                                    className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-micro font-semibold tabular-nums"
                                    style={{ background: accent, color: P.void }}
                                  >
                                    {reached.map((i) => i + 1).join('·')}
                                  </motion.span>
                                ) : null}
                              </motion.button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* descriptions for assistive tech (the visible copy is the detail panel) */}
              <div hidden>
                {[...nodeById.values()].map((n) => (
                  <span key={n.id} id={`${uid}-desc-${n.id}`}>
                    {n.desc}
                  </span>
                ))}
              </div>

              {/* ── caption (the trace in words) + detail ── */}
              <div className="mt-6 grid gap-6 border-t border-line pt-5 lg:grid-cols-2 lg:gap-10">
                <TraceCaption trace={trace} shown={shown} nodeById={nodeById} accent={accent} />
                <DetailPanel
                  roles={roles}
                  node={detail}
                  colorOf={colorOf}
                  categoryColor={categoryColor}
                  accent={accent}
                  trace={trace}
                  reached={detail ? (stepsOf.get(detail.id) ?? []).filter((i) => i < shown) : []}
                  legend={legend}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── the steps of the current trace, in words ─────────────────────────────── */
function TraceCaption({ trace, shown, nodeById, accent }) {
  const last = trace.steps.length - 1;
  return (
    <div className="min-w-0">
      <p className="mc-label mb-3">
        {trace.label} · {trace.steps.length} steps
      </p>
      <ol aria-label={`${trace.label}, step by step`} className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {trace.steps.map((id, i) => {
          const reached = i < shown;
          return (
            <li key={`${id}-${i}`} className="inline-flex items-center gap-1.5 text-[13px] leading-snug">
              <span
                className="font-mono text-micro tabular-nums transition-colors duration-300"
                style={{ color: reached ? accent : P.inkSubtle }}
              >
                {pad2(i + 1)}
              </span>
              <span className={`transition-colors duration-300 ${reached ? 'text-ink' : 'text-ink-subtle'}`}>
                {nodeById.get(id)?.label ?? id}
              </span>
              {i < last ? (
                <span aria-hidden="true" className="px-0.5 text-ink-subtle">
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── what the hovered / focused / pinned part does ─────────────────────────── */
function DetailPanel({ node, colorOf, categoryColor, accent, trace, reached, legend, roles }) {
  if (!node) {
    // one entry per hue — categories that share a hue share an entry
    const entries = [];
    legend.forEach((cat) => {
      const color = categoryColor(cat);
      const label = CATEGORY_LABEL[cat] ?? cat;
      const same = entries.findIndex((e) => e.color === color);
      if (same === -1) entries.push({ color, label });
      else entries[same] = { color, label: `${entries[same].label} · ${label}` };
    });
    return (
      <div className="min-w-0 lg:min-h-[10.5rem]">
        <p className="mc-label mb-3">Key</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
          <li className="inline-flex items-center gap-2 text-label text-ink-muted">
            <Dot color={P.ink} /> People
          </li>
          {entries.map((e) => (
            <li key={e.color} className="inline-flex items-center gap-2 text-label text-ink-muted">
              <Dot color={e.color} /> {e.label}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-label text-ink-subtle">Hover, tap or tab to any part to read what it does.</p>
      </div>
    );
  }

  // people: tier + headcount when ROLES has them, else just the layer (a
  // person's graph category isn't a part's category); parts: their category
  const isWho = node.layer.key === WHO_KEY;
  const role = isWho ? roleOf(node.id, roles) : null;
  let meta = [node.layer.label, CATEGORY_LABEL[node.category] ?? node.category];
  if (isWho) meta = role ? [node.layer.label, `Tier ${role.num}`, role.pop] : [node.layer.label];

  return (
    <div className="min-w-0 lg:min-h-[10.5rem]">
      <div className="flex items-center gap-2.5">
        <Dot color={colorOf(node)} />
        <p className="font-display text-lg leading-tight text-ink sm:text-xl">{node.label}</p>
      </div>
      <p className="mc-label mt-2">{meta.filter(Boolean).join(' · ')}</p>
      {reached.length > 0 ? (
        <p className="mt-1.5 font-mono text-micro tabular-nums" style={{ color: accent }}>
          Step {reached.map((i) => i + 1).join(' & ')} of {trace.steps.length} · {trace.label}
        </p>
      ) : null}
      {node.desc ? <p className="mt-3 max-w-[70ch] text-body text-ink-muted">{node.desc}</p> : null}
    </div>
  );
}
