'use client';
/**
 * The full system graph: every part and every link of a project
 * (project.architectureGraph), drawn as a composed map rather than a physics
 * simulation. Each part sits where its data places it (x, y in percent), is
 * sized by importance and coloured by its category; links are soft curves in
 * the page's own ink, so they read on the dark page and on white.
 *
 *   hover / tab   a part lights with its links and neighbours; the rest dims.
 *                 A dot runs along each lit link in the direction the data
 *                 flows (one each way on a two-way link), all on one clock so
 *                 they leave together and arrive together; each lit link's
 *                 label sits wherever it fits without touching other text
 *                 (see placeNodeLabels / placeLinkLabels: nothing overlaps)
 *   click / Enter keeps a part selected (Escape or clicking it again clears)
 *   legend        hover or tap a category to light every part in it
 *   panel         what the selected part does and everything it connects to;
 *                 each connection selects that part
 *
 * Colours are CSS variables (./tokens), so the map follows the theme. Under
 * 640px the map keeps its size and scrolls sideways instead of shrinking past
 * legibility. Reduced motion: no drawing in, no running dots.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { HUES, P, alpha } from '@/components/ui/case/tokens';

const W = 1000; // viewBox width
const H = 620; // viewBox height
const PAD = { x: 70, top: 46, bottom: 58 }; // room for labels at the edges
const RADIUS = { center: 21, primary: 14, secondary: 10, leaf: 7 };
const CATEGORY_LABEL = {
  core: 'Core',
  auth: 'Auth and security',
  workflow: 'Workflow',
  location: 'Location',
  realtime: 'Realtime',
  storage: 'Storage',
  data: 'Data',
  ai: 'AI',
  ui: 'Interface',
  audio: 'Audio',
  infrastructure: 'Infrastructure',
};

/* One colour per category, distinct within any one project. Amber stays for
   what is lit (the selected part's links), so no category uses it. */
const MAP_COLOR = {
  core: HUES.ink,
  ui: HUES.slate,
  infrastructure: HUES.inkSubtle,
  workflow: HUES.sand,
  auth: HUES.jade,
  data: HUES.ice,
  storage: HUES.lilac,
  realtime: HUES.live,
  audio: HUES.live,
  ai: HUES.alert,
  location: HUES.alert,
};

const radiusOf = (n) => RADIUS[n.importance] ?? 10;
const descOf = (n) => n.description || n.desc || '';
const idOf = (end) => (typeof end === 'object' ? end.id : end);

/** A small stable hash, so each link bows the same way on every render. */
const bowOf = (a, b) => {
  let h = 0;
  for (const ch of `${a}>${b}`) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h % 2 === 0 ? 1 : -1;
};

/** A link from edge to edge of its two circles, bowed gently to one side. */
function linkGeometry(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const start = { x: a.x + ux * (a.r + 3), y: a.y + uy * (a.r + 3) };
  const end = { x: b.x - ux * (b.r + 3), y: b.y - uy * (b.r + 3) };
  const bow = Math.min(54, len * 0.14) * bowOf(a.id, b.id);
  const c = { x: (start.x + end.x) / 2 - uy * bow, y: (start.y + end.y) / 2 + ux * bow };
  // the curve's midpoint (t = 0.5 on a quadratic), where its label sits
  const mid = { x: 0.25 * start.x + 0.5 * c.x + 0.25 * end.x, y: 0.25 * start.y + 0.5 * c.y + 0.25 * end.y };
  const r1 = (n) => Math.round(n * 10) / 10;
  return { d: `M${r1(start.x)} ${r1(start.y)} Q${r1(c.x)} ${r1(c.y)} ${r1(end.x)} ${r1(end.y)}`, mid, curve: [start, c, end] };
}

/* ── labels that never overlap ─────────────────────────────────────────────
   Every label gets a box from an estimate of its text width (a little
   generous, so real text fits inside), and a short list of places it may go.
   It takes the first place whose box clears the map's edges, every part's
   dot and every label already placed. A link label that fits nowhere is left
   off the map (the panel lists every connection anyway). */
const SANS_EM = 0.6; // average glyph width, as a share of the font size
const MONO_EM = 0.64;
const boxOf = (x, y, w, h, anchor) => {
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  // a text box runs from about one font size above the baseline to a third
  // below it (the font's ascent and descent), plus a small margin
  return { l: left - 3, r: left + w + 3, t: y - h - 2, b: y + h * 0.35 + 2 };
};
const hits = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const inside = (a) => a.l >= 4 && a.r <= W - 4 && a.t >= 4 && a.b <= H - 4;
const dotBox = (n) => ({ l: n.x - n.r - 4, r: n.x + n.r + 4, t: n.y - n.r - 4, b: n.y + n.r + 4 });

/** Where each part's name goes: below its dot if it fits, else above, right or left. */
function placeNodeLabels(nodes) {
  const order = [...nodes].sort((a, b) => b.r - a.r); // the big parts choose first
  const dots = nodes.map(dotBox);
  const placed = new Map();
  const taken = [];
  for (const n of order) {
    const big = n.importance === 'center' || n.importance === 'primary';
    const size = big ? 14 : 12.5;
    const w = n.label.length * size * SANS_EM;
    const options = [
      { x: n.x, y: n.y + n.r + 16, anchor: 'middle' },
      { x: n.x, y: n.y - n.r - 8, anchor: 'middle' },
      { x: n.x + n.r + 8, y: n.y + size * 0.35, anchor: 'start' },
      { x: n.x - n.r - 8, y: n.y + size * 0.35, anchor: 'end' },
    ];
    let pick = null;
    for (const o of options) {
      const box = boxOf(o.x, o.y, w, size, o.anchor);
      const clearOfDots = dots.every((d, i) => nodes[i].id === n.id || !hits(box, d));
      if (inside(box) && clearOfDots && taken.every((t) => !hits(box, t))) {
        pick = { ...o, size, box };
        break;
      }
    }
    // nowhere is clear (very dense graph): keep the default spot, still clear of other names
    if (!pick) pick = { ...options[0], size, box: boxOf(options[0].x, options[0].y, w, size, 'middle') };
    placed.set(n.id, pick);
    taken.push(pick.box);
  }
  return placed;
}

/** A point on a quadratic curve at t (0 to 1). */
const along = ([p0, c, p1], t) => ({
  x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * c.x + t * t * p1.x,
  y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * c.y + t * t * p1.y,
});

/** Where each lit link's label goes, clear of every name, dot and other link label. */
function placeLinkLabels(lit, nodeLabels, nodes) {
  const taken = [...nodeLabels.values()].map((p) => p.box).concat(nodes.map(dotBox));
  const out = new Map();
  for (const l of lit) {
    if (!l.label) continue;
    const w = l.label.length * 10.5 * MONO_EM;
    for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78]) {
      const p = along(l.curve, t);
      const spot = [p.y - 7, p.y + 15].map((y) => ({ x: p.x, y, box: boxOf(p.x, y, w, 10.5, 'middle') })).find((o) => inside(o.box) && taken.every((b) => !hits(o.box, b)));
      if (spot) {
        out.set(l.key, spot);
        taken.push(spot.box);
        break;
      }
    }
  }
  return out;
}

export default function SystemMap({ nodes: rawNodes = [], edges: rawEdges = [], accent = P.accent }) {
  const colorOf = (category) => MAP_COLOR[category] ?? P.slate;
  const wrapRef = useRef(null);
  const inView = useInView(wrapRef, { once: true, amount: 0.25 });
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  const [category, setCategory] = useState(null);

  const svgRef = useRef(null);
  const { nodes, byId, links, categories, nodeLabels } = useMemo(() => {
    // the data's positions, stretched to fill the map (they were drawn for a
    // smaller canvas, so they cluster); the layout's shape is kept
    const xs = rawNodes.map((n) => n.x ?? 50);
    const ys = rawNodes.map((n) => n.y ?? 50);
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    const fit = (v, lo, hi) => (hi - lo < 1 ? 0.5 : (v - lo) / (hi - lo));
    const placed = rawNodes.map((n) => ({
      ...n,
      r: radiusOf(n),
      x: PAD.x + fit(n.x ?? 50, x0, x1) * (W - PAD.x * 2),
      y: PAD.top + fit(n.y ?? 50, y0, y1) * (H - PAD.top - PAD.bottom),
      color: MAP_COLOR[n.category] ?? P.slate,
    }));
    const map = new Map(placed.map((n) => [n.id, n]));
    const ls = rawEdges
      .map((e, i) => {
        const a = map.get(idOf(e.source));
        const b = map.get(idOf(e.target));
        if (!a || !b) return null;
        return { key: `${a.id}-${b.id}-${i}`, a, b, label: e.label || '', twoWay: e.direction === 'two-way', ...linkGeometry(a, b) };
      })
      .filter(Boolean);
    const cats = [...new Set(placed.map((n) => n.category))].filter(Boolean);
    return { nodes: placed, byId: map, links: ls, categories: cats, nodeLabels: placeNodeLabels(placed) };
  }, [rawNodes, rawEdges]);

  const active = pinned ?? hover;
  const neighbours = useMemo(() => {
    if (!active) return null;
    const set = new Set([active]);
    links.forEach((l) => {
      if (l.a.id === active) set.add(l.b.id);
      if (l.b.id === active) set.add(l.a.id);
    });
    return set;
  }, [active, links]);

  const linkLabels = useMemo(
    () => (active ? placeLinkLabels(links.filter((l) => l.a.id === active || l.b.id === active), nodeLabels, nodes) : new Map()),
    [active, links, nodeLabels, nodes],
  );

  // every dot on the map runs on one clock: restart it whenever the selection
  // changes, so the dots leave their parts together and arrive together
  useEffect(() => {
    if (active) svgRef.current?.setCurrentTime?.(0);
  }, [active]);

  const isLitNode = (n) => (active ? neighbours.has(n.id) : category ? n.category === category : true);
  const isLitLink = (l) =>
    active ? l.a.id === active || l.b.id === active : category ? l.a.category === category && l.b.category === category : false;
  const dimmed = Boolean(active || category);

  const select = (id) => setPinned((cur) => (cur === id ? null : id));
  const node = active ? byId.get(active) : null;
  const connections = node
    ? links
        .filter((l) => l.a.id === node.id || l.b.id === node.id)
        .map((l) => {
          const out = l.a.id === node.id;
          const other = out ? l.b : l.a;
          return { key: l.key, other, label: l.label, way: l.twoWay ? 'both ways' : out ? 'outgoing' : 'incoming' };
        })
    : [];

  return (
    <div ref={wrapRef} className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
      {/* ── the map ── */}
      <div className="min-w-0">
        <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full min-w-[720px] select-none"
            role="group"
            aria-label="Every part of the system and how they connect"
            onPointerLeave={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setPinned(null);
                setHover(null);
              }
            }}
          >
            <defs>
              <pattern id="map-dots" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill={alpha(P.ink, 0.09)} />
              </pattern>
            </defs>
            <rect x="0" y="0" width={W} height={H} fill="url(#map-dots)" onClick={() => setPinned(null)} />

            {/* links, under the parts */}
            <g fill="none" strokeLinecap="round">
              {links.map((l, i) => {
                const lit = isLitLink(l);
                return (
                  <motion.path
                    key={l.key}
                    d={l.d}
                    stroke={lit ? accent : P.ink}
                    strokeWidth={lit ? 2 : 1.25}
                    initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                    animate={inView ? { pathLength: 1, opacity: dimmed && !lit ? 0.08 : lit ? 0.95 : 0.26 } : {}}
                    transition={{
                      pathLength: { duration: 0.9, delay: reduce ? 0 : 0.15 + i * 0.025, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: 0.25 },
                    }}
                  />
                );
              })}
            </g>

            {/* the flow along each lit link: one dot per direction the data
                moves (two for a two-way link), all on the same clock */}
            {active && !reduce &&
              links.filter(isLitLink).map((l) =>
                (l.twoWay ? ['0;1', '1;0'] : ['0;1']).map((points) => (
                  <circle key={`flow-${l.key}-${points}`} r="3.5" fill={accent} pointerEvents="none" opacity="0">
                    <animateMotion dur="1.8s" repeatCount="indefinite" path={l.d} keyPoints={points} keyTimes="0;1" calcMode="linear" />
                    <animate attributeName="opacity" dur="1.8s" repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.12;0.88;1" />
                  </circle>
                )),
              )}

            {/* the lit links' labels, wherever they fit without touching anything */}
            {links.map((l) => {
              const spot = linkLabels.get(l.key);
              if (!spot) return null;
              return (
                <text
                  key={`label-${l.key}`}
                  x={spot.x}
                  y={spot.y}
                  textAnchor="middle"
                  className="font-mono"
                  fontSize="10.5"
                  fill={P.inkMuted}
                  stroke={P.void}
                  strokeWidth="4"
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {l.label}
                </text>
              );
            })}

            {/* the parts */}
            {nodes.map((n, i) => {
              const lit = isLitNode(n);
              const on = n.id === active;
              const big = n.importance === 'center' || n.importance === 'primary';
              return (
                <motion.g
                  key={n.id}
                  tabIndex={0}
                  role="button"
                  aria-pressed={pinned === n.id}
                  aria-label={`${n.label}. ${CATEGORY_LABEL[n.category] ?? n.category}.`}
                  className="cursor-pointer [&:focus-visible_.ring]:opacity-100"
                  style={{ outline: 'none' }}
                  onPointerEnter={() => setHover(n.id)}
                  onFocus={() => setHover(n.id)}
                  onBlur={() => setHover((cur) => (cur === n.id ? null : cur))}
                  onClick={() => select(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      select(n.id);
                    }
                  }}
                  initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                  animate={inView ? { opacity: dimmed && !lit ? 0.28 : 1, scale: 1 } : {}}
                  transition={{ duration: 0.45, delay: reduce ? 0 : 0.05 + i * 0.02, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* a larger, invisible target, so small parts are easy to hit */}
                  <circle cx={n.x} cy={n.y} r={Math.max(n.r + 10, 18)} fill="transparent" />
                  <circle className="ring opacity-0 transition-opacity" cx={n.x} cy={n.y} r={n.r + 7} fill="none" stroke={accent} strokeWidth="1.5" />
                  {on && <circle cx={n.x} cy={n.y} r={n.r + 9} fill={alpha(n.color, 0.16)} />}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill={on || n.importance === 'center' ? n.color : alpha(n.color, 0.2)}
                    stroke={n.color}
                    strokeWidth={big ? 2 : 1.5}
                  />
                  <text
                    x={nodeLabels.get(n.id).x}
                    y={nodeLabels.get(n.id).y}
                    textAnchor={nodeLabels.get(n.id).anchor}
                    fontSize={nodeLabels.get(n.id).size}
                    fontWeight={big ? 600 : 500}
                    fill={big ? P.ink : P.inkMuted}
                    stroke={P.void}
                    strokeWidth="5"
                    paintOrder="stroke"
                  >
                    {n.label}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* legend: every category, each lights its parts */}
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label="Categories">
          {categories.map((c) => (
            <li key={c}>
              <button
                type="button"
                onPointerEnter={() => setCategory(c)}
                onPointerLeave={() => setCategory(null)}
                onFocus={() => setCategory(c)}
                onBlur={() => setCategory(null)}
                className={`inline-flex items-center gap-2 text-label transition-colors ${category === c ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}
              >
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(c) }} />
                {CATEGORY_LABEL[c] ?? c}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ── the panel ── */}
      <aside aria-live="polite" className="min-w-0 lg:pt-2">
        {node ? (
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-micro uppercase tracking-[0.16em] text-ink-subtle">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: node.color }} />
              {CATEGORY_LABEL[node.category] ?? node.category}
              {pinned === node.id && <span className="text-accent">selected</span>}
            </p>
            <h4 className="mt-2 font-display text-xl font-semibold tracking-[-0.02em] text-ink">{node.label}</h4>
            {descOf(node) && <p className="mt-3 text-sm leading-relaxed text-ink-muted">{descOf(node)}</p>}
            {connections.length > 0 && (
              <>
                <p className="mc-label mt-6">Connects {connections.length === 1 ? 'to one part' : `to ${connections.length} parts`}</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {connections.map((c) => (
                    <li key={c.key}>
                      <button
                        type="button"
                        onClick={() => setPinned(c.other.id)}
                        className="group flex w-full items-baseline gap-2.5 text-left text-sm"
                      >
                        <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 self-start rounded-full" style={{ background: c.other.color }} />
                        <span className="min-w-0">
                          <span className="font-medium text-ink group-hover:text-accent">{c.other.label}</span>
                          <span className="block text-label text-ink-subtle">
                            {c.label ? `${c.label}, ` : ''}
                            {c.way}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <div>
            <p className="mc-label">The whole system</p>
            <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {nodes.length} parts, {links.length} links
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Hover or tab to any part to see what it does and what it talks to. Click to keep it selected; click a connection to follow it.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
