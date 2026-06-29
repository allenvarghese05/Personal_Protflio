'use client';

/**
 * The 2×2 architecture bento for the project brief (right column, top half).
 *  1 (TL) 5-tier approval chain   ·   2 (TR) GPS + 3-phase construction
 *  3 (BL) tech-stack visual        ·   4 (BR) key metrics
 *
 * Panels 1 & 2 are bespoke for the signature IET build; other projects get a
 * clean generic flow / focus panel so the grid is always populated.
 */

const PANEL = '#090c12';
const BORDER = '#151c28';

function Panel({ label, accent, children }) {
  return (
    <div
      className="relative flex flex-col rounded-md p-4"
      style={{ background: PANEL, border: `0.5px solid ${BORDER}` }}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 rounded-t-md"
        style={{ height: '1.5px', background: accent }}
      />
      <div
        className="mb-3 font-mono uppercase"
        style={{ fontSize: '8px', letterSpacing: '0.18em', color: '#304050' }}
      >
        {label}
      </div>
      <div className="relative flex-1">{children}</div>
    </div>
  );
}

/* ── Panel 1 ──────────────────────────────────────────────────────────── */

function NodeRow({ name, right }) {
  return (
    <div
      className="flex items-center justify-between rounded-[3px] px-[10px] py-[7px]"
      style={{ border: '0.5px solid #1a3050' }}
    >
      <span className="font-mono" style={{ fontSize: '10px', color: '#5a7090', lineHeight: 1.2 }}>
        {name}
      </span>
      {right != null && (
        <span className="font-mono" style={{ fontSize: '8px', color: '#1c2535', lineHeight: 1.2 }}>
          {right}
        </span>
      )}
    </div>
  );
}

function Connector() {
  return <div className="mx-auto" style={{ width: '0.5px', height: '8px', background: '#1a2530' }} />;
}

function FlowPanel({ project }) {
  const iet = project.id === 'iet';
  const rows = iet
    ? [
        ['PASTOR', 'TIER 1'],
        ['DIVISION', 'TIER 2'],
        ['HQ', 'TIER 3'],
        ['PRESIDENT', 'TIER 4'],
        ['FINANCE', 'TIER 5'],
      ]
    : (project.primaryStack || []).map((s, i) => [s, `0${i + 1}`]);
  return (
    <Panel label={iet ? '5-TIER APPROVAL CHAIN' : 'PRIMARY FLOW'} accent="#e8a040">
      <div className="flex flex-col">
        {rows.map(([name, right], i) => (
          <div key={name}>
            <NodeRow name={name} right={right} />
            {i < rows.length - 1 && <Connector />}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Panel 2 ──────────────────────────────────────────────────────────── */

function GpsConstructionPanel({ project }) {
  if (project.id !== 'iet') {
    // Generic "focus" panel: the supporting cast as a checklist.
    const items = project.secondaryStack?.length ? project.secondaryStack : project.tags || [];
    return (
      <Panel label="SUPPORTING SYSTEMS" accent="#4090e0">
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <div key={it} className="flex items-center gap-[10px]">
              <span className="shrink-0 rounded-full" style={{ width: '8px', height: '8px', border: '0.5px solid #1a2530' }} />
              <span className="font-mono" style={{ fontSize: '10px', color: '#4a6070' }}>{it}</span>
            </div>
          ))}
        </div>
      </Panel>
    );
  }
  const phases = [
    ['FOUNDATION', true],
    ['STRUCTURE', false],
    ['HANDOVER', false],
  ];
  return (
    <Panel label="GPS · 3-PHASE" accent="#e8a040">
      <div className="flex h-full flex-col items-stretch">
        {/* GPS concentric rings */}
        <div className="flex flex-col items-center">
          <div className="relative" style={{ width: '64px', height: '64px' }}>
            <span
              className="gps-pulse absolute inset-0 rounded-full"
              style={{ border: '1.5px solid #e8a040' }}
            />
            <span
              className="absolute rounded-full"
              style={{ width: '40px', height: '40px', top: '12px', left: '12px', border: '1px solid rgba(232,160,64,0.5)' }}
            />
            <span
              className="absolute rounded-full"
              style={{ width: '8px', height: '8px', top: '28px', left: '28px', background: '#e8a040' }}
            />
          </div>
          <div className="mt-2 font-mono" style={{ fontSize: '7px', letterSpacing: '0.1em', color: '#304050' }}>
            HAVERSINE · 8KM RADIUS
          </div>
        </div>
        {/* 3-phase construction */}
        <div className="mt-3">
          <div className="mb-2 font-mono uppercase" style={{ fontSize: '7px', letterSpacing: '0.14em', color: '#304050' }}>
            3-PHASE CONSTRUCTION
          </div>
          <div className="flex flex-col">
            {phases.map(([name, filled], i) => (
              <div key={name}>
                <div className="flex items-center gap-[10px]">
                  <span
                    className="shrink-0 rounded-full"
                    style={filled ? { width: '8px', height: '8px', background: '#e8a040' } : { width: '8px', height: '8px', border: '0.5px solid #1a2530' }}
                  />
                  <span className="font-mono" style={{ fontSize: '10px', color: '#4a6070' }}>{name}</span>
                </div>
                {i < phases.length - 1 && (
                  <div style={{ width: '0.5px', height: '12px', background: '#1a2530', marginLeft: '3.75px' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ── Panel 3 ──────────────────────────────────────────────────────────── */

function TechVisualPanel({ project }) {
  const primary = project.primaryStack || [];
  const secondary = project.secondaryStack || [];
  const chip = (name, isPrimary) => (
    <span
      key={name}
      className="rounded-[3px] font-mono"
      style={
        isPrimary
          ? { fontSize: '9px', padding: '6px 12px', color: '#e8a040', background: 'rgba(232,160,64,0.08)', border: '0.5px solid rgba(232,160,64,0.2)' }
          : { fontSize: '9px', padding: '6px 12px', color: '#4a6070', background: '#0a0e14', border: '0.5px solid #1a2530' }
      }
    >
      {name}
    </span>
  );
  return (
    <Panel label="TECH STACK" accent="#4090e0">
      <div className="flex flex-wrap gap-[6px]">
        {primary.map((n) => chip(n, true))}
        {secondary.map((n) => chip(n, false))}
      </div>
    </Panel>
  );
}

/* ── Panel 4 ──────────────────────────────────────────────────────────── */

function MetricsPanel({ project }) {
  const metrics = (project.metrics || []).slice(0, 4);
  return (
    <Panel label="KEY METRICS" accent="#30c0a0">
      <div className="grid grid-cols-2 gap-[6px]">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex flex-col rounded-[3px] p-[10px]"
            style={{ border: `0.5px solid ${BORDER}` }}
          >
            <span className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: '#e8a040', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {m.value}
            </span>
            <span className="mt-[6px] font-mono uppercase" style={{ fontSize: '7px', letterSpacing: '0.14em', color: '#304050', lineHeight: 1.3 }}>
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function BentoPanels({ project }) {
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-4" style={{ minHeight: '280px' }}>
      <FlowPanel project={project} />
      <GpsConstructionPanel project={project} />
      <TechVisualPanel project={project} />
      <MetricsPanel project={project} />
    </div>
  );
}
