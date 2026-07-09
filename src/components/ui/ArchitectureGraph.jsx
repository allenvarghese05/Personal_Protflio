'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GRAPH } from '@/lib/motion';

/**
 * Obsidian-style force-directed architecture graph, rendered as SVG with d3
 * controlling the DOM directly (force sim + zoom/pan + drag + focus mode).
 *
 * Interactions: scroll/pinch zoom, drag-to-pan empty space, two-finger
 * trackpad pan, drag nodes, click a node for FOCUS MODE (dims everything else
 * and shows a tooltip with its connections). Reads the rich node schema
 * (category / importance / x,y% / edge direction).
 */

const COLOR_BY_CATEGORY = {
  core: '#e8a040',
  auth: '#30c0a0',
  data: '#4090e0',
  realtime: '#9060e0',
  storage: '#608090',
  location: '#4090e0',
  workflow: '#c87830',
  // LearnFlow categories
  ai: '#9060e0',
  ui: '#4090e0',
  audio: '#e8a040',
  infrastructure: '#3a5060',
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
  ai: 'AI / Intelligence',
  ui: 'UI',
  audio: 'Audio',
  infrastructure: 'Infrastructure',
};

const radiusOf = (n) => n.r ?? RADIUS_BY_IMPORTANCE[n.importance] ?? 12;
const descOf = (n) => n.description || n.desc || '';

export default function ArchitectureGraph({ nodes, edges, categoryColors, accent = '#e8a040' }) {
  const colorOf = (n) =>
    n.color || categoryColors?.[n.category] || COLOR_BY_CATEGORY[n.category] || '#608090';
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const zoomApi = useRef(null);
  const focusApi = useRef(null);
  const [tip, setTip] = useState(null); // { x, y, label, desc, category, connected[] }
  const [legendItems, setLegendItems] = useState([]);
  const [showHint, setShowHint] = useState(true);
  const [zoomPct, setZoomPct] = useState(100);

  useEffect(() => {
    if (!nodes || !edges) return;
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);

    const simNodes = nodes.map((n) => ({
      ...n,
      _r: radiusOf(n),
      _c: colorOf(n),
      _desc: descOf(n),
      _px: n.x, // authored layout % — captured before d3 mutates node.x/y
      _py: n.y,
      _hasXY: typeof n.x === 'number' && typeof n.y === 'number',
    }));
    const byId = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks = edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label || '',
      direction: e.direction || 'one-way',
    }));
    const neighbours = new Map(simNodes.map((n) => [n.id, new Set()]));
    simLinks.forEach((l) => {
      neighbours.get(l.source).add(l.target);
      neighbours.get(l.target).add(l.source);
    });

    let width = wrap.clientWidth || 600;
    let height = wrap.clientHeight || 360;

    // Legend — categories present.
    const cats = [...new Set(simNodes.map((n) => n.category).filter(Boolean))];
    setLegendItems(cats.map((c) => ({ color: categoryColors?.[c] || COLOR_BY_CATEGORY[c] || '#608090', label: CATEGORY_LABEL[c] || c })));

    /* ---- SVG scaffold ------------------------------------------------- */
    svg.selectAll('*').remove();
    // transparent background rect captures pan/zoom events everywhere
    const bgRect = svg
      .append('rect')
      .attr('class', 'bg')
      .attr('fill', 'transparent')
      .style('cursor', 'grab');
    const zoomG = svg.append('g').attr('class', 'zoom-group');
    const linkG = zoomG.append('g').attr('class', 'links');
    const nodeG = zoomG.append('g').attr('class', 'nodes');

    const link = linkG
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', 'rgba(255,255,255,0.06)')
      .attr('stroke-width', 0.5)
      .style('transition', 'stroke-opacity 0.2s ease, stroke 0.2s ease');

    const node = nodeG
      .selectAll('g.node')
      .data(simNodes, (d) => d.id)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    // inner scale group (separate from position translate so the breathing
    // tick doesn't fight the CSS scale transition)
    const scaleG = node
      .append('g')
      .attr('class', 'scaleG')
      .style('transition', 'transform 0.2s ease, opacity 0.2s ease')
      .style('transform-box', 'fill-box')
      .style('transform-origin', 'center');

    scaleG
      .append('circle')
      .attr('r', (d) => d._r)
      .attr('fill', '#07090e')
      .attr('stroke', (d) => d._c)
      .attr('stroke-width', 1.5)
      .style('transition', 'stroke-width 0.2s ease, filter 0.2s ease');

    scaleG
      .append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => d._c)
      .attr('font-family', 'ui-monospace, "JetBrains Mono", monospace')
      .attr('font-size', (d) => (d.importance === 'center' ? 10 : 8))
      .attr('font-weight', (d) => (d.importance === 'center' ? 600 : 400))
      .attr('dominant-baseline', (d) => (d.importance === 'center' ? 'middle' : 'hanging'))
      .attr('y', (d) => (d.importance === 'center' ? 0 : d._r + 4))
      .style('paint-order', 'stroke')
      .style('stroke', '#07090e')
      .style('stroke-width', (d) => (d.importance === 'center' ? 3 : 0));

    /* ---- force simulation -------------------------------------------- */
    const sim = d3
      .forceSimulation(simNodes)
      .force('link', d3.forceLink(simLinks).id((d) => d.id).distance((l) => 26 + l.source._r + l.target._r).strength(0.18))
      .force('charge', d3.forceManyBody().strength(-55).distanceMax(220))
      .force('collide', d3.forceCollide().radius((d) => d._r + 10))
      .alphaDecay(GRAPH.alphaDecay)
      .velocityDecay(GRAPH.velocityDecay)
      .alphaTarget(GRAPH.alphaTarget)
      .on('tick', ticked);

    function seed() {
      simNodes.forEach((n, i) => {
        if (n._hasXY) {
          n._tx = (0.05 + (n._px / 100) * 0.9) * width;
          n._ty = (0.05 + (n._py / 100) * 0.8) * height;
        } else {
          const a = (i / simNodes.length) * Math.PI * 2;
          n._tx = width / 2 + Math.cos(a) * Math.min(width, height) * 0.34;
          n._ty = height / 2 + Math.sin(a) * Math.min(width, height) * 0.34;
        }
        n.x = n._tx;
        n.y = n._ty;
      });
      sim.force('x', d3.forceX((n) => n._tx).strength(0.14));
      sim.force('y', d3.forceY((n) => n._ty).strength(0.14));
    }
    seed();

    function ticked() {
      // clamp inside the canvas (runs after d3 integrates positions)
      for (const n of simNodes) {
        n.x = Math.max(n._r + 2, Math.min(width - n._r - 2, n.x));
        n.y = Math.max(n._r + 2, Math.min(height - n._r - 14, n.y));
      }
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    }

    /* ---- focus + hover state ----------------------------------------- */
    let focusId = null;
    let hoverId = null;

    function isLit(id) {
      const active = focusId || hoverId;
      if (!active) return true;
      return id === active || neighbours.get(active).has(id);
    }
    function applyState() {
      const active = focusId || hoverId;
      const isFocus = !!focusId;
      scaleG
        .style('opacity', (d) => (!active ? 1 : isLit(d.id) ? 1 : isFocus ? 0.08 : 0.12))
        .style('transform', (d) => {
          if (!active) return 'scale(1)';
          if (d.id === active) return isFocus ? 'scale(1.15)' : 'scale(1.2)';
          return isLit(d.id) ? 'scale(1.05)' : 'scale(1)';
        });
      scaleG
        .select('circle')
        .attr('stroke-width', (d) => (d.id === active ? 3 : 1.5))
        .style('filter', (d) => (d.id === active ? `drop-shadow(0 0 8px ${d._c})` : 'none'));
      link
        .style('stroke', (l) => {
          if (active && (l.source.id === active || l.target.id === active)) return byId.get(active)._c;
          return 'rgba(255,255,255,0.06)';
        })
        .style('stroke-opacity', (l) => {
          if (!active) return 1;
          const on = l.source.id === active || l.target.id === active;
          return on ? 0.7 : isFocus ? 0.03 : 0.04;
        })
        .attr('stroke-width', (l) => (active && (l.source.id === active || l.target.id === active) ? 1.5 : 0.5));
    }

    function setFocus(id) {
      focusId = id;
      applyState();
      if (id) {
        const n = byId.get(id);
        const connected = [...neighbours.get(id)].map((cid) => byId.get(cid).label);
        const t = d3.zoomTransform(svgEl);
        setTip({
          id,
          x: t.applyX(n.x),
          y: t.applyY(n.y),
          label: n.label,
          desc: n._desc,
          category: n.category,
          connected,
          flipX: t.applyX(n.x) > width * 0.7,
          flipY: t.applyY(n.y) > height * 0.8,
        });
      } else {
        setTip(null);
      }
    }
    focusApi.current = () => setFocus(null);

    /* ---- drag (suppresses pan via isDraggingNode) --------------------- */
    let isDraggingNode = false;
    const drag = d3
      .drag()
      .container(() => zoomG.node())
      .on('start', (event, d) => {
        isDraggingNode = true;
        d._moved = false;
        svgEl.style.cursor = 'move';
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        if (Math.hypot(event.dx, event.dy) > 0.5) d._moved = true;
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        isDraggingNode = false;
        svgEl.style.cursor = '';
        if (!event.active) sim.alphaTarget(GRAPH.alphaTarget);
        d.fx = null;
        d.fy = null;
        // click (no real movement) → toggle focus
        if (!d._moved) setFocus(focusId === d.id ? null : d.id);
      });
    node.call(drag);

    // hover via per-node pointer events
    node
      .on('pointerenter', (event, d) => {
        hoverId = d.id;
        if (!focusId) applyState();
      })
      .on('pointerleave', () => {
        hoverId = null;
        if (!focusId) applyState();
      });

    /* ---- zoom + pan --------------------------------------------------- */
    const zoom = d3
      .zoom()
      .scaleExtent([0.2, 4])
      .translateExtent([[-600, -600], [width + 600, height + 600]])
      .filter((event) => {
        if (event.type === 'wheel') return true; // zoom/pan via wheel
        if (event.type === 'mousedown') return !isDraggingNode;
        return !isDraggingNode;
      })
      .on('start', (event) => {
        if (event.sourceEvent && event.sourceEvent.type === 'mousedown') bgRect.style('cursor', 'grabbing');
      })
      .on('zoom', (event) => {
        zoomG.attr('transform', event.transform);
        setZoomPct(Math.round(event.transform.k * 100));
        if (focusId) {
          const n = byId.get(focusId);
          setTip((prev) => (prev ? { ...prev, x: event.transform.applyX(n.x), y: event.transform.applyY(n.y), flipX: event.transform.applyX(n.x) > width * 0.7, flipY: event.transform.applyY(n.y) > height * 0.8 } : prev));
        }
      })
      .on('end', () => bgRect.style('cursor', 'grab'));
    svg.call(zoom).on('dblclick.zoom', null);

    // Stop the page/stage from scrolling — let d3-zoom own the wheel.
    const preventWheel = (e) => e.preventDefault();
    svgEl.addEventListener('wheel', preventWheel, { passive: false });

    // empty-canvas click → exit focus (drag handles node clicks)
    svg.on('click', (event) => {
      if (event.defaultPrevented) return;
      const [mx, my] = d3.pointer(event, zoomG.node());
      const onNode = simNodes.some((n) => Math.hypot(n.x - mx, n.y - my) < n._r + 6);
      if (!onNode) setFocus(null);
    });
    // double-click empty space → reset zoom to fit
    svg.on('dblclick', (event) => {
      if (event.target === svgEl || event.target.tagName === 'rect') {
        svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
      }
    });

    zoomApi.current = {
      zoomBy: (f) => svg.transition().duration(200).call(zoom.scaleBy, f),
      reset: () => svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity),
    };

    /* ---- resize ------------------------------------------------------- */
    function resize() {
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      svg.attr('width', width).attr('height', height);
      bgRect.attr('width', width).attr('height', height);
      zoom.translateExtent([[-600, -600], [width + 600, height + 600]]);
      seed();
      sim.alpha(0.5).restart();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const onKey = (e) => {
      if (e.key === 'Escape' && focusId) setFocus(null);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      sim.stop();
      ro.disconnect();
      svgEl.removeEventListener('wheel', preventWheel);
      window.removeEventListener('keydown', onKey);
      svg.on('.zoom', null).on('click', null).on('dblclick', null);
    };
  }, [nodes, edges]);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden bg-[#05070a]"
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      <svg ref={svgRef} className="block h-full w-full" />

      {/* zoom-level indicator */}
      <div
        className="pointer-events-none absolute font-mono"
        style={{ left: '8px', bottom: '6px', fontSize: '8px', color: '#1a2535', letterSpacing: '0.06em' }}
      >
        {zoomPct}%
      </div>

      {/* tooltip */}
      {tip && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: tip.flipX ? tip.x - 236 : tip.x + 16,
            top: tip.flipY ? tip.y - 8 - 120 : tip.y - 8,
            maxWidth: '220px',
            background: '#07090e',
            border: `0.5px solid ${accent}`,
            borderRadius: '6px',
            padding: '10px 14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}
        >
          <div className="font-mono" style={{ fontSize: '10px', fontWeight: 600, color: accent, marginBottom: '6px' }}>
            {tip.label}
          </div>
          <div className="font-mono" style={{ fontSize: '10px', color: '#6080a0', lineHeight: 1.6 }}>
            {tip.desc}
          </div>
          {tip.connected?.length > 0 && (
            <div className="font-mono" style={{ marginTop: '8px' }}>
              <span className="uppercase" style={{ fontSize: '8px', letterSpacing: '0.1em', color: '#3a5060' }}>Connected to: </span>
              <span style={{ fontSize: '9px', color: '#3a5060' }}>{tip.connected.join(', ')}</span>
            </div>
          )}
          {tip.category && (
            <div className="font-mono uppercase" style={{ fontSize: '8px', letterSpacing: '0.1em', color: '#3a5060', marginTop: '6px' }}>
              {tip.category}
            </div>
          )}
        </div>
      )}

      {/* legend */}
      {legendItems.length > 0 && (
        <div
          className="pointer-events-none absolute left-2 flex flex-wrap gap-x-3 gap-y-1"
          style={{ bottom: '22px', maxWidth: 'calc(100% - 90px)', background: 'rgba(5,7,10,0.78)', borderRadius: '4px', padding: '5px 8px' }}
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

      {/* hint */}
      {showHint && (
        <div
          className="pointer-events-none absolute left-2 top-2 font-mono"
          style={{ fontSize: '8px', color: '#1a2535', transition: 'opacity 0.6s', letterSpacing: '0.06em' }}
        >
          scroll to zoom · drag to pan · click nodes to explore
        </div>
      )}

      {/* zoom controls */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        {[
          { k: '+', fn: () => zoomApi.current?.zoomBy(1.3) },
          { k: '−', fn: () => zoomApi.current?.zoomBy(1 / 1.3) },
          { k: '⊡', fn: () => zoomApi.current?.reset() },
        ].map((b) => (
          <button
            key={b.k}
            onClick={b.fn}
            className="flex items-center justify-center font-mono transition-colors"
            style={{ width: '24px', height: '24px', background: '#07090e', border: '0.5px solid #1a2535', borderRadius: '4px', color: '#3a5060', fontSize: '12px' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#0d1420'; e.currentTarget.style.color = '#6080a0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#07090e'; e.currentTarget.style.color = '#3a5060'; }}
          >
            {b.k}
          </button>
        ))}
      </div>
    </div>
  );
}
