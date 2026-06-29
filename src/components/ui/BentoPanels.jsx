'use client';

/**
 * The 2×2 architecture bento for the project brief (right column, top half):
 *   1 (TL) 5-tier approval flowchart   ·   2 (TR) GPS enforcement + 3-phase
 *   3 (BL) key metrics (2×2)           ·   4 (BR) key decisions
 *
 * Panels 1 & 2 are bespoke for the signature IET build; other projects get a
 * graceful generic flow / focus so the grid is always populated. All content
 * is data-driven where it can be (metrics, decisions, stack).
 */

const HEADING = {
  color: '#e8a040',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  marginBottom: '16px',
};

function Panel({ heading, children }) {
  return (
    <div
      className="flex min-w-0 flex-col"
      style={{ background: '#07090e', border: '0.5px solid #1a2535', borderRadius: '8px', padding: '16px' }}
    >
      <div className="font-mono" style={HEADING}>{heading}</div>
      <div className="relative min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ── PANEL 1 — 5-tier approval flowchart ─────────────────────────────────── */

function EndPill({ text, color, check }) {
  return (
    <div
      className="mx-auto text-center font-mono"
      style={{ width: '86%', background: '#0d1420', border: `0.5px solid ${color}`, color, fontSize: '9px', borderRadius: '999px', padding: '5px 8px', letterSpacing: '0.08em' }}
    >
      {check && <span style={{ marginRight: '4px' }}>✓</span>}
      {text}
    </div>
  );
}

function ChainConnector({ dashed }) {
  return (
    <div className="relative mx-auto" style={{ width: '0', height: dashed ? '12px' : '16px' }}>
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{ width: dashed ? '0' : '1px', height: '100%', borderLeft: dashed ? '1px dashed #1a2535' : '1px solid #1a2535' }}
      />
      {dashed && (
        <span className="chain-dot absolute left-1/2 top-0 -translate-x-1/2 rounded-full" style={{ width: '4px', height: '4px', background: '#e8a040' }} />
      )}
    </div>
  );
}

const TIERS = [
  { name: 'PASTOR', action: 'submits application', tier: 'TIER 1' },
  { name: 'DIVISION LEADER', action: 'reviews & forwards', tier: 'TIER 2' },
  { name: 'HQ TEAM', action: 'compliance check', tier: 'TIER 3' },
  { name: 'PRESIDENT', action: 'executive approval', tier: 'TIER 4' },
  { name: 'FINANCE DEPT', action: 'releases funds', tier: 'TIER 5' },
];

function ApprovalChainPanel({ project }) {
  const iet = project.id === 'iet';
  const rows = iet
    ? TIERS
    : (project.primaryStack || []).map((s, i) => ({ name: s.toUpperCase(), action: '', tier: `0${i + 1}` }));
  return (
    <Panel heading={iet ? '5-Tier Approval Chain' : 'Primary Flow'}>
      <EndPill text={iet ? 'APPLICATION SUBMITTED' : 'INPUT'} color="#e8a040" />
      <ChainConnector />
      {rows.map((r, i) => (
        <div key={r.name}>
          <div
            className="flex items-center"
            style={{ background: '#0a0f18', borderLeft: '2px solid #e8a040', borderRadius: '0 4px 4px 0', padding: '8px 12px', gap: '8px' }}
          >
            <span className="font-mono" style={{ color: '#8aa0b8', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>{r.name}</span>
            <span className="flex-1 truncate text-center font-mono" style={{ color: '#3a5060', fontSize: '10px', fontStyle: 'italic' }}>{r.action}</span>
            <span className="font-mono" style={{ color: '#1a2535', fontSize: '9px', whiteSpace: 'nowrap' }}>{r.tier}</span>
          </div>
          {i < rows.length - 1 && <ChainConnector dashed />}
        </div>
      ))}
      <ChainConnector />
      <EndPill text={iet ? 'PERMIT APPROVED · FUNDS DISBURSED' : 'SHIPPED'} color="#30c0a0" check={iet} />
    </Panel>
  );
}

/* ── PANEL 2 — GPS enforcement + 3-phase construction ────────────────────── */

const PHASES = [
  { n: '1', name: 'FOUNDATION', desc: 'Site prep · foundation pour · survey signoff', filled: true },
  { n: '2', name: 'STRUCTURE', desc: 'Structural build · inspection checkpoints', filled: false },
  { n: '3', name: 'HANDOVER', desc: 'Final inspection · completion docs · handover', filled: false },
];

function SubHeading({ children }) {
  return (
    <div className="font-mono uppercase" style={{ fontSize: '8px', letterSpacing: '0.18em', color: '#3a5060', marginBottom: '10px' }}>
      {children}
    </div>
  );
}

function GpsPhasePanel({ project }) {
  if (project.id !== 'iet') {
    const items = project.secondaryStack?.length ? project.secondaryStack : project.tags || [];
    return (
      <Panel heading="Supporting Systems">
        <div className="flex flex-col gap-2.5">
          {items.map((it) => (
            <div key={it} className="flex items-center gap-2.5">
              <span className="shrink-0 rounded-full" style={{ width: '8px', height: '8px', border: '0.5px solid #1a2535' }} />
              <span className="font-mono" style={{ fontSize: '11px', color: '#8aa0b8' }}>{it}</span>
            </div>
          ))}
        </div>
      </Panel>
    );
  }
  return (
    <Panel heading="GPS · 3-Phase">
      {/* TOP — GPS enforcement */}
      <SubHeading>GPS Enforcement</SubHeading>
      <div className="flex flex-col items-center" style={{ marginBottom: '12px' }}>
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle className="gps-ring" cx="36" cy="36" r="35" fill="none" stroke="#e8a040" strokeWidth="1.5" />
          <circle cx="36" cy="36" r="35" fill="none" stroke="#3a5060" strokeWidth="0.5" strokeOpacity="0.4" strokeDasharray="3 4" />
          <circle cx="36" cy="36" r="23" fill="none" stroke="#e8a040" strokeWidth="0.5" strokeOpacity="0.3" />
          <circle cx="36" cy="36" r="4" fill="#e8a040" />
        </svg>
        <div className="font-mono" style={{ marginTop: '8px', fontSize: '8px', letterSpacing: '0.14em', color: '#3a5060' }}>
          8KM ENFORCEMENT RADIUS
        </div>
        <div className="font-mono" style={{ marginTop: '3px', fontSize: '8px', letterSpacing: '0.08em', color: '#1a2535' }}>
          Haversine · Great-circle distance
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{ borderTop: '0.5px solid #1a2535', margin: '0 0 12px 0' }} />

      {/* BOTTOM — 3-phase construction */}
      <SubHeading>Construction Phases</SubHeading>
      <div>
        {PHASES.map((p, i) => (
          <div
            key={p.name}
            className="flex items-center"
            style={{ gap: '10px', padding: '6px 0', borderTop: i > 0 ? '0.5px solid #0d1218' : 'none' }}
          >
            <span
              className="flex shrink-0 items-center justify-center rounded-full font-mono"
              style={
                p.filled
                  ? { width: '24px', height: '24px', background: '#e8a040', color: '#07090e', fontSize: '9px', fontWeight: 700 }
                  : { width: '24px', height: '24px', background: '#1a2535', border: '0.5px solid #3a5060', color: '#3a5060', fontSize: '9px', fontWeight: 700 }
              }
            >
              {p.n}
            </span>
            <div>
              <div className="font-mono" style={{ fontSize: '11px', fontWeight: 600, color: '#8aa0b8' }}>{p.name}</div>
              <div className="font-mono" style={{ fontSize: '9px', color: '#3a5060', lineHeight: 1.4 }}>{p.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── PANEL 3 — key metrics 2×2 ───────────────────────────────────────────── */

function MetricsPanel({ project }) {
  const metrics = (project.metrics || []).slice(0, 4);
  return (
    <Panel heading="Key Metrics">
      <div className="grid grid-cols-2" style={{ gap: '8px' }}>
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex flex-col"
            style={{ background: '#0a0f18', border: '0.5px solid #151c28', borderRadius: '4px', padding: '14px 12px' }}
          >
            <span className="font-mono" style={{ fontSize: '26px', fontWeight: 800, color: '#e8a040', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {m.value}
            </span>
            <span className="font-mono uppercase" style={{ marginTop: '6px', fontSize: '8px', letterSpacing: '0.16em', color: '#3a5060', lineHeight: 1.3 }}>
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── PANEL 4 — key decisions ─────────────────────────────────────────────── */

function DecisionsPanel({ project }) {
  const decisions = project.keyDecisions || [];
  return (
    <Panel heading="Key Decisions">
      <div>
        {decisions.map((d, i) => (
          <div key={d.title}>
            <div
              className="font-mono"
              style={{ fontSize: '10px', fontWeight: 700, color: '#e8a040', letterSpacing: '0.06em', borderLeft: '2px solid #e8a040', paddingLeft: '8px', marginBottom: '5px' }}
            >
              {d.title}
            </div>
            <div className="font-mono" style={{ fontSize: '11px', color: '#6080a0', lineHeight: 1.7 }}>
              {d.body}
            </div>
            {i < decisions.length - 1 && <div style={{ borderTop: '0.5px solid #0d1218', margin: '12px 0' }} />}
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function BentoPanels({ project }) {
  return (
    <div className="grid grid-cols-2 min-w-0" style={{ gap: '16px' }}>
      <ApprovalChainPanel project={project} />
      <GpsPhasePanel project={project} />
      <MetricsPanel project={project} />
      <DecisionsPanel project={project} />
    </div>
  );
}
