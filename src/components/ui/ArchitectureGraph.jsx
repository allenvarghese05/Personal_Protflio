'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GRAPH } from '@/lib/motion';

/**
 * Obsidian-style force-directed architecture graph drawn directly on a canvas
 * (D3 owns the simulation; no React wrapper). Reusable for any { nodes, edges }.
 *
 * Reads the rich schema (category / importance / x,y% / edge direction) when
 * present, and falls back to a simple { color, r, desc } schema otherwise.
 */

const COLOR_BY_CATEGORY = {
  core: '#e8a040',
  auth: '#30c0a0',
  data: '#4090e0',
  realtime: '#9060e0',
  storage: '#608090',
  location: '#4090e0',
  workflow: '#c87830',
};
const RADIUS_BY_IMPORTANCE = { center: 26, primary: 15, secondary: 11, leaf: 7 };
const CATEGORY_LABEL = {
  core: 'Core',
  auth: 'Auth / Security',
  workflow: 'Workflow',
  location: 'Location',
  realtime: 'Realtime',
  storage: 'Storage',
  data: 'Data',
};

const colorOf = (n) => n.color || COLOR_BY_CATEGORY[n.category] || '#608090';
const radiusOf = (n) => n.r ?? RADIUS_BY_IMPORTANCE[n.importance] ?? 12;
const descOf = (n) => n.description || n.desc || '';

export default function ArchitectureGraph({ nodes, edges }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [tip, setTip] = useState(null); // { x, y, label, desc, flipX, flipY }
  const [legendItems, setLegendItems] = useState([]);

  useEffect(() => {
    if (!nodes || !edges) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const simNodes = nodes.map((n) => ({
      ...n,
      _r: radiusOf(n),
      _c: colorOf(n),
      _desc: descOf(n),
      _a: 1, // display alpha (hover dim)
      _s: 1, // display scale (hover grow)
      _hasXY: typeof n.x === 'number' && typeof n.y === 'number',
      _px: n.x, // authored layout % — captured before d3 mutates node.x/y
      _py: n.y,
    }));
    const byId = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks = edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label || '',
      direction: e.direction || 'one-way',
      _a: 1,
    }));

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: null, y: null };
    let hover = null;
    let dragging = null;
    let downAt = null;
    let released = false;

    // Legend — only categories present in this project's nodes.
    const cats = [...new Set(simNodes.map((n) => n.category).filter(Boolean))];
    setLegendItems(
      cats.map((c) => ({ color: COLOR_BY_CATEGORY[c] || '#608090', label: CATEGORY_LABEL[c] || c }))
    );

    // Cursor repulsion (strength 60 within 70px).
    const REPEL_R = 70;
    const mouseForce = () => {
      if (mouse.x == null || dragging) return;
      for (const n of simNodes) {
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL_R * REPEL_R) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / REPEL_R) * 60;
          n.vx += (dx / d) * f * 0.02;
          n.vy += (dy / d) * f * 0.02;
        }
      }
    };

    // Hard clamp so nodes can never leave the canvas. Must run AFTER d3's
    // position integration (i.e. in the tick handler, not as a force), or the
    // x += vx step re-pushes nodes back out of bounds.
    const clampPositions = () => {
      for (const n of simNodes) {
        n.x = Math.max(n._r + 2, Math.min(width - n._r - 2, n.x));
        n.y = Math.max(n._r + 2, Math.min(height - n._r - 14, n.y));
      }
    };

    const sim = d3
      .forceSimulation(simNodes)
      .force('link', d3.forceLink(simLinks).id((d) => d.id).distance((l) => 26 + l.source._r + l.target._r).strength(0.18))
      .force('charge', d3.forceManyBody().strength(-55).distanceMax(220))
      .force('collide', d3.forceCollide().radius((d) => d._r + 10))
      .force('mouse', mouseForce)
      .alphaDecay(GRAPH.alphaDecay)
      .velocityDecay(GRAPH.velocityDecay)
      .alphaTarget(GRAPH.alphaTarget)
      .on('tick', draw);

    function seed() {
      // Anchor each node toward its authored x,y% (or a ring if none) so the
      // layout matches the design, then let it drift gently from there.
      const hasLayout = simNodes.some((n) => n._hasXY);
      simNodes.forEach((n, i) => {
        if (n._hasXY) {
          // Pad the authored 0–100% layout into the canvas with margins so
          // labels and the legend never collide with the edges. Use the
          // captured percentage (_px/_py), not the live, sim-mutated x/y.
          n._tx = (0.05 + (n._px / 100) * 0.9) * width;
          n._ty = (0.05 + (n._py / 100) * 0.8) * height;
        } else {
          const a = (i / simNodes.length) * Math.PI * 2;
          n._tx = width / 2 + Math.cos(a) * Math.min(width, height) * 0.34;
          n._ty = height / 2 + Math.sin(a) * Math.min(width, height) * 0.34;
        }
      });
      sim.force('x', d3.forceX((n) => n._tx).strength(0.14));
      sim.force('y', d3.forceY((n) => n._ty).strength(0.14));
      if (!released) {
        // Pin to authored positions, then release after 2s for a natural drift.
        simNodes.forEach((n) => {
          n.x = n._tx;
          n.y = n._ty;
          n.fx = n._tx;
          n.fy = n._ty;
        });
        setTimeout(() => {
          released = true;
          simNodes.forEach((n) => {
            n.fx = null;
            n.fy = null;
          });
          sim.alpha(0.5).restart();
        }, 2000);
      }
    }

    function resize() {
      const r = wrap.getBoundingClientRect();
      width = r.width;
      height = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      sim.alpha(0.6).restart();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const lerpK = 1 - Math.exp((-(1000 / 60) / 120) * 4); // ~120ms ease
    const linkedTo = (a, b) =>
      simLinks.some(
        (l) =>
          (l.source.id === a && l.target.id === b) || (l.source.id === b && l.target.id === a)
      );
    const targetNodeAlpha = (n) => (!hover ? 1 : n === hover ? 1 : linkedTo(hover.id, n.id) ? 1 : 0.12);
    const targetNodeScale = (n) => (n === hover ? 1.2 : 1);
    const targetLinkAlpha = (l) =>
      !hover ? 1 : l.source.id === hover.id || l.target.id === hover.id ? 1 : 0.04;

    function draw() {
      clampPositions();
      ctx.clearRect(0, 0, width, height);
      const now = performance.now();

      // Edges
      for (const l of simLinks) {
        l._a += (targetLinkAlpha(l) - l._a) * lerpK;
        const connected = hover && (l.source.id === hover.id || l.target.id === hover.id);
        ctx.beginPath();
        ctx.moveTo(l.source.x, l.source.y);
        ctx.lineTo(l.target.x, l.target.y);
        if (connected) {
          const c = d3.color(hover._c);
          c.opacity = 0.6 * l._a;
          ctx.strokeStyle = c.toString();
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = `rgba(255,255,255,${0.06 * l._a})`;
          ctx.lineWidth = 0.5;
        }
        ctx.stroke();

        // Directional pulse — a dash travelling source→target at ~15px/s,
        // in the destination colour. Two-way edges pulse both directions.
        const len = Math.hypot(l.target.x - l.source.x, l.target.y - l.source.y) || 1;
        const drawPulse = (from, to, col) => {
          const u = (((now / 1000) * 15) / len) % 1;
          const px = from.x + (to.x - from.x) * u;
          const py = from.y + (to.y - from.y) * u;
          const pc = d3.color(col);
          pc.opacity = (connected ? 0.9 : 0.2) * l._a;
          ctx.beginPath();
          ctx.arc(px, py, connected ? 2 : 1.4, 0, Math.PI * 2);
          ctx.fillStyle = pc.toString();
          ctx.fill();
        };
        drawPulse(l.source, l.target, l.target._c);
        if (l.direction === 'two-way') drawPulse(l.target, l.source, l.source._c);
      }

      // Nodes
      for (const n of simNodes) {
        n._a += (targetNodeAlpha(n) - n._a) * lerpK;
        n._s += (targetNodeScale(n) - n._s) * lerpK;
        const isHover = n === hover;
        const r = n._r * n._s;
        ctx.save();
        ctx.globalAlpha = n._a;
        if (isHover) {
          ctx.shadowColor = n._c;
          ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n === dragging ? 'rgba(232,160,64,0.15)' : '#07090e';
        ctx.fill();
        ctx.lineWidth = isHover ? 3 : 1.5;
        ctx.strokeStyle = n._c;
        ctx.stroke();
        ctx.restore();

        // Label — center node inside, others below.
        ctx.globalAlpha = n._a;
        ctx.textAlign = 'center';
        if (n.importance === 'center') {
          ctx.font = '600 10px ui-monospace, "JetBrains Mono", monospace';
          ctx.fillStyle = '#e8a040';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#07090e';
          ctx.shadowBlur = 6;
          ctx.fillText(n.label, n.x, n.y);
          ctx.shadowBlur = 0;
        } else {
          ctx.font = '8px ui-monospace, "JetBrains Mono", monospace';
          ctx.fillStyle = n._c;
          ctx.textBaseline = 'top';
          ctx.fillText(n.label, n.x, n.y + r + 4);
        }
        ctx.globalAlpha = 1;
      }

      // Hovered edge label
      if (hover) {
        for (const l of simLinks) {
          if (!l.label) continue;
          if (l.source.id !== hover.id && l.target.id !== hover.id) continue;
          const mx = (l.source.x + l.target.x) / 2;
          const my = (l.source.y + l.target.y) / 2;
          ctx.font = '7px ui-monospace, "JetBrains Mono", monospace';
          const w = ctx.measureText(l.label).width + 8;
          ctx.fillStyle = 'rgba(5,7,10,0.92)';
          ctx.fillRect(mx - w / 2, my - 7, w, 13);
          ctx.fillStyle = '#6080a0';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(l.label, mx, my);
        }
      }
    }

    // Pointer
    const toLocal = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const pick = (p) => {
      let best = null;
      let bd = Infinity;
      for (const n of simNodes) {
        const d = Math.hypot(n.x - p.x, n.y - p.y);
        if (d < n._r + 6 && d < bd) {
          bd = d;
          best = n;
        }
      }
      return best;
    };
    const onMove = (e) => {
      const p = toLocal(e);
      mouse.x = p.x;
      mouse.y = p.y;
      if (dragging) {
        dragging.fx = p.x;
        dragging.fy = p.y;
        sim.alphaTarget(0.3).restart();
        return;
      }
      const h = pick(p);
      if (h !== hover) {
        hover = h;
        canvas.style.cursor = h ? 'pointer' : 'default';
      }
    };
    const onLeave = () => {
      mouse.x = null;
      mouse.y = null;
      hover = null;
    };
    const onDown = (e) => {
      const p = toLocal(e);
      const n = pick(p);
      downAt = { x: p.x, y: p.y, node: n };
      if (n) {
        dragging = n;
        n.fx = n.x;
        n.fy = n.y;
        sim.alphaTarget(0.3).restart();
      }
    };
    const onUp = (e) => {
      const p = toLocal(e);
      if (dragging) {
        dragging.fx = null;
        dragging.fy = null;
        dragging = null;
        sim.alphaTarget(GRAPH.alphaTarget);
      }
      if (downAt) {
        const moved = Math.hypot(p.x - downAt.x, p.y - downAt.y);
        if (moved < 4) {
          const n = downAt.node;
          if (n) {
            setTip((t) =>
              t && t.id === n.id
                ? null
                : { id: n.id, x: n.x, y: n.y, label: n.label, desc: n._desc, category: n.category, flipX: n.x > width * 0.7, flipY: n.y > height * 0.8 }
            );
          } else setTip(null);
        }
      }
      downAt = null;
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    return () => {
      sim.stop();
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [nodes, edges]);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-[#05070a]">
      <canvas ref={canvasRef} className="block h-full w-full" />
      {tip && (
        <div
          className="pointer-events-none absolute z-10"
          style={{
            left: tip.flipX ? tip.x - 236 : tip.x + 16,
            top: tip.flipY ? tip.y - 8 - 96 : tip.y - 8,
            maxWidth: '220px',
            background: '#07090e',
            border: '0.5px solid #e8a040',
            borderRadius: '6px',
            padding: '10px 14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}
        >
          <div className="font-mono" style={{ fontSize: '10px', fontWeight: 600, color: '#e8a040', marginBottom: '6px' }}>
            {tip.label}
          </div>
          <div className="font-mono" style={{ fontSize: '10px', color: '#6080a0', lineHeight: 1.6 }}>
            {tip.desc}
          </div>
          {tip.category && (
            <div className="font-mono uppercase" style={{ fontSize: '8px', letterSpacing: '0.1em', color: '#3a5060', marginTop: '8px' }}>
              {tip.category}
            </div>
          )}
        </div>
      )}
      {legendItems.length > 0 && (
        <div
          className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1"
          style={{ maxWidth: 'calc(100% - 16px)', background: 'rgba(5,7,10,0.78)', borderRadius: '4px', padding: '5px 8px' }}
        >
          {legendItems.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="rounded-full" style={{ width: '6px', height: '6px', background: l.color }} />
              <span className="font-mono uppercase" style={{ fontSize: '7px', letterSpacing: '0.1em', color: '#3a5060' }}>
                {l.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
