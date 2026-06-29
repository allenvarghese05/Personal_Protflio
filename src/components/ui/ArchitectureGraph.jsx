'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GRAPH } from '@/lib/motion';

/**
 * Obsidian-style force-directed architecture graph, drawn directly on a
 * <canvas> with D3 controlling the simulation (no React wrapper). Reusable —
 * pass any { nodes, edges } shape. Nodes are draggable, hovering a node dims
 * the rest and highlights its edges, clicking a node shows a tooltip, the
 * cursor gently repels nearby nodes, and the layout never fully settles.
 *
 * Pure 2D/DOM — no Three.js here (keeps the world and Mission Control separate).
 */
export default function ArchitectureGraph({ nodes, edges }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [tip, setTip] = useState(null); // { x, y, label, desc }
  const [legendItems, setLegendItems] = useState([]);

  useEffect(() => {
    if (!nodes || !edges) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Deep-copy so the simulation can mutate x/y/vx/vy without touching props.
    const simNodes = nodes.map((n) => ({ ...n, _a: 1 }));
    const byId = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks = edges.map((e, i) => ({ source: e.source, target: e.target, _a: 1, _phase: (i * 0.37) % 1 }));

    // Semi-fixed initial positions — largest node at centre, the rest on a ring
    // around it — so the layout starts organised, then the forces relax it.
    const center = simNodes.reduce((a, b) => (b.r > a.r ? b : a), simNodes[0]);
    const others = simNodes.filter((n) => n !== center);
    center.x = 0;
    center.y = 0;
    others.forEach((n, i) => {
      const a = (i / others.length) * Math.PI * 2;
      n.x = Math.cos(a) * 120;
      n.y = Math.sin(a) * 120;
    });

    // Legend: distinct node colours present, mapped to human labels.
    const COLOR_LABELS = {
      '#e8a040': 'Core / Logic',
      '#30c0a0': 'Auth / Security',
      '#4090e0': 'Data / Service',
      '#9060e0': 'Realtime',
      '#608090': 'Storage',
    };
    const legend = [...new Set(simNodes.map((n) => n.color))].map((c) => ({
      color: c,
      label: COLOR_LABELS[c] || '',
    }));
    setLegendItems(legend);

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const mouse = { x: null, y: null, down: false };
    let hover = null; // node under cursor
    let dragging = null; // node being dragged
    let downAt = null; // { x, y, node } for click-vs-drag
    let raf = 0;

    // Cursor repulsion — pushes nodes away from the pointer when it's near.
    const mouseForce = () => {
      if (mouse.x == null || dragging) return;
      const R = 90;
      for (const n of simNodes) {
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const f = ((R - d) / R) * 6;
          n.vx += (dx / d) * f;
          n.vy += (dy / d) * f;
        }
      }
    };

    const sim = d3
      .forceSimulation(simNodes)
      .force('link', d3.forceLink(simLinks).id((d) => d.id).distance((l) => 40 + (l.source.r || 10) + (l.target.r || 10)).strength(0.25))
      .force('charge', d3.forceManyBody().strength(-380))
      .force('collide', d3.forceCollide().radius((d) => d.r + 16))
      .force('mouse', mouseForce)
      .alphaDecay(GRAPH.alphaDecay)
      .velocityDecay(GRAPH.velocityDecay)
      .alphaTarget(GRAPH.alphaTarget)
      .on('tick', draw);

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
      sim.force('center', d3.forceCenter(width / 2, height / 2));
      sim.alpha(0.6).restart();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    // Per-frame alpha lerp so highlight/dim eases over ~hoverMs.
    const lerpK = 1 - Math.exp(-(1000 / 60) / GRAPH.hoverMs * 4);
    function targetAlpha(node) {
      if (!hover) return 1;
      if (node === hover) return 1;
      return isLinked(hover.id, node.id) ? 1 : 0.18;
    }
    function targetLinkAlpha(l) {
      if (!hover) return 1;
      return l.source.id === hover.id || l.target.id === hover.id ? 1 : 0.12;
    }
    function isLinked(a, b) {
      return simLinks.some(
        (l) =>
          (l.source.id === a && l.target.id === b) ||
          (l.source.id === b && l.target.id === a)
      );
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const now = performance.now();
      // Edges
      for (const l of simLinks) {
        l._a += (targetLinkAlpha(l) - l._a) * lerpK;
        const lit = hover && (l.source.id === hover.id || l.target.id === hover.id);
        ctx.beginPath();
        ctx.moveTo(l.source.x, l.source.y);
        ctx.lineTo(l.target.x, l.target.y);
        if (lit) {
          const c = d3.color(hover.color);
          c.opacity = 0.6 * l._a;
          ctx.strokeStyle = c.toString();
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = `rgba(255,255,255,${0.08 * l._a})`;
          ctx.lineWidth = 0.5;
        }
        ctx.stroke();
        // Animated pulse travelling along the edge (data flow)
        const t = ((now / 1600) + l._phase) % 1;
        const px = l.source.x + (l.target.x - l.source.x) * t;
        const py = l.source.y + (l.target.y - l.source.y) * t;
        const pc = d3.color(lit ? hover.color : l.source.color);
        pc.opacity = (lit ? 0.9 : 0.5) * l._a;
        ctx.beginPath();
        ctx.arc(px, py, lit ? 2 : 1.4, 0, Math.PI * 2);
        ctx.fillStyle = pc.toString();
        ctx.fill();
      }
      // Nodes
      for (const n of simNodes) {
        n._a += (targetAlpha(n) - n._a) * lerpK;
        const isHover = n === hover;
        ctx.save();
        ctx.globalAlpha = n._a;
        if (isHover) {
          ctx.shadowColor = n.color;
          ctx.shadowBlur = 18;
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = '#0c1420';
        ctx.fill();
        ctx.lineWidth = isHover ? 3 : 1.5;
        ctx.strokeStyle = n.color;
        ctx.stroke();
        ctx.restore();
        // Label
        ctx.globalAlpha = n._a;
        ctx.fillStyle = n.color;
        ctx.font = '8px ui-monospace, "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(n.label, n.x, n.y + n.r + 4);
        ctx.globalAlpha = 1;
      }
    }

    // Pointer helpers
    function toLocal(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function pick(p) {
      let best = null;
      let bd = Infinity;
      for (const n of simNodes) {
        const d = Math.hypot(n.x - p.x, n.y - p.y);
        if (d < n.r + 6 && d < bd) {
          bd = d;
          best = n;
        }
      }
      return best;
    }

    function onMove(e) {
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
    }
    function onLeave() {
      mouse.x = null;
      mouse.y = null;
      hover = null;
    }
    function onDown(e) {
      const p = toLocal(e);
      const n = pick(p);
      downAt = { x: p.x, y: p.y, node: n };
      if (n) {
        dragging = n;
        n.fx = n.x;
        n.fy = n.y;
        sim.alphaTarget(0.3).restart();
      }
    }
    function onUp(e) {
      const p = toLocal(e);
      if (dragging) {
        dragging.fx = null;
        dragging.fy = null;
        dragging = null;
        sim.alphaTarget(GRAPH.alphaTarget);
      }
      // Click (no real movement) on a node → toggle tooltip
      if (downAt) {
        const moved = Math.hypot(p.x - downAt.x, p.y - downAt.y);
        if (moved < 4) {
          if (downAt.node) {
            setTip((t) =>
              t && t.id === downAt.node.id
                ? null
                : { id: downAt.node.id, x: downAt.node.x, y: downAt.node.y, label: downAt.node.label, desc: downAt.node.desc }
            );
          } else {
            setTip(null);
          }
        }
      }
      downAt = null;
    }

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    return () => {
      sim.stop();
      ro.disconnect();
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [nodes, edges]);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden rounded-lg bg-[#05070a]">
      <canvas ref={canvasRef} className="block h-full w-full" />
      {tip && (
        <div
          className="pointer-events-none absolute z-10 max-w-[220px] -translate-x-1/2 rounded-md border border-white/10 bg-[#0b1018]/95 px-3 py-2 backdrop-blur-sm"
          style={{ left: tip.x, top: tip.y + 22 }}
        >
          <div className="font-mono text-[10px] font-semibold tracking-wide text-[#dde6f0]">
            {tip.label}
          </div>
          <div className="mt-1 text-[11px] leading-snug text-[#7a8a9a]">{tip.desc}</div>
        </div>
      )}
      {/* Colour legend */}
      {legendItems.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1.5">
          {legendItems.map((l) => (
            <div key={l.color} className="flex items-center gap-2">
              <span className="rounded-full" style={{ width: '7px', height: '7px', background: l.color }} />
              <span
                className="font-mono uppercase"
                style={{ fontSize: '7px', letterSpacing: '0.14em', color: '#304050' }}
              >
                {l.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
