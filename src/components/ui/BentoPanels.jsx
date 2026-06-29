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

const TIERS = [
  { num: '01', role: 'PASTOR', action: 'submits', pop: '3,000+ pastors' },
  { num: '02', role: 'DIVISION LEADER', action: 'reviews', pop: '~150 leaders' },
  { num: '03', role: 'HQ TEAM', action: 'checks', pop: 'national HQ' },
  { num: '04', role: 'PRESIDENT', action: 'approves', pop: '1 president' },
  { num: '05', role: 'FINANCE DEPT', action: 'releases', pop: 'finance board' },
];

/* Ascending staircase — reads bottom-left (grassroots) → top-right (authority). */
function StaircaseChain() {
  const W = 150;
  const H = 34;
  const SKEW = 12;
  const stepX = (i) => 6 + i * 46;
  const stepY = (i) => 224 - i * 44; // y grows downward; higher i → higher up
  const cx = (i) => stepX(i) + W / 2;
  const cy = (i) => stepY(i) + H / 2;

  // path the travelling dot follows: entry → each step centre → exit
  const dotPath =
    `M 40,266 ` +
    TIERS.map((_, i) => `L ${cx(i)},${cy(i)}`).join(' ') +
    ` L 360,30`;

  return (
    <svg viewBox="0 0 400 290" width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      {/* entry pill (bottom-left) */}
      <g>
        <rect x="6" y="256" width="150" height="20" rx="10" fill="#0a1220" stroke="#e8a040" strokeWidth="0.5" />
        <text x="81" y="266" textAnchor="middle" dominantBaseline="middle" fill="#e8a040" fontSize="9" fontFamily="monospace" letterSpacing="0.5">APPLICATION SUBMITTED</text>
      </g>
      {/* exit pill (top-right) */}
      <g>
        <rect x="250" y="14" width="144" height="20" rx="10" fill="#0a1220" stroke="#30c0a0" strokeWidth="0.5" />
        <text x="322" y="24" textAnchor="middle" dominantBaseline="middle" fill="#30c0a0" fontSize="9" fontFamily="monospace" letterSpacing="0.5">✓ PERMIT APPROVED</text>
      </g>

      {TIERS.map((t, i) => {
        const x = stepX(i);
        const y = stepY(i);
        const odd = i % 2 === 0; // steps 1,3,5 (index 0,2,4)
        const fill = odd ? '#0d1828' : '#0a1220';
        const accent = odd ? '#e8a040' : '#c87030';
        const pts = `${x + SKEW},${y} ${x + W},${y} ${x + W - SKEW},${y + H} ${x},${y + H}`;
        return (
          <g key={t.num}>
            {/* up-right connector arrow toward the next step */}
            {i < TIERS.length - 1 && (
              <text x={x + W - 4} y={y - 4} fontSize="9" fill="#2a3a48" fontFamily="monospace">↗</text>
            )}
            <polygon points={pts} fill={fill} />
            {/* amber/orange left accent edge */}
            <line x1={x + SKEW} y1={y} x2={x} y2={y + H} stroke={accent} strokeWidth="3" />
            {/* tier number */}
            <text x={x + SKEW + 6} y={y + H / 2} dominantBaseline="middle" fill="#e8a040" fontSize="14" fontWeight="800" fontFamily="monospace">{t.num}</text>
            {/* role + action */}
            <text x={x + SKEW + 30} y={y + 12} dominantBaseline="middle" fill="#8aa0b8" fontSize="10" fontWeight="600" fontFamily="monospace">{t.role}</text>
            <text x={x + SKEW + 30} y={y + 24} dominantBaseline="middle" fill="#3a5060" fontSize="9" fontStyle="italic" fontFamily="monospace">{t.action}</text>
            {/* population context */}
            <text x={x + SKEW} y={y + H + 9} dominantBaseline="middle" fill="#2a3a48" fontSize="8" fontFamily="monospace">{t.pop}</text>
          </g>
        );
      })}

      {/* travelling dot */}
      <path id="stair-path" d={dotPath} fill="none" stroke="none" />
      <circle r="3" fill="#e8a040">
        <animateMotion dur="3s" repeatCount="indefinite">
          <mpath href="#stair-path" />
        </animateMotion>
      </circle>
    </svg>
  );
}

function ApprovalChainPanel({ project }) {
  const iet = project.id === 'iet';
  if (!iet) {
    return (
      <Panel heading="Primary Flow">
        <EndPill text="INPUT" color="#e8a040" />
        <div className="my-2 flex flex-col gap-2">
          {(project.primaryStack || []).map((s, i) => (
            <div key={s} className="flex items-center justify-between" style={{ background: '#0a0f18', borderLeft: '2px solid #e8a040', borderRadius: '0 4px 4px 0', padding: '8px 12px' }}>
              <span className="font-mono" style={{ color: '#8aa0b8', fontSize: '11px', fontWeight: 600 }}>{s.toUpperCase()}</span>
              <span className="font-mono" style={{ color: '#1a2535', fontSize: '9px' }}>{`0${i + 1}`}</span>
            </div>
          ))}
        </div>
        <EndPill text="SHIPPED" color="#30c0a0" />
      </Panel>
    );
  }
  return (
    <Panel heading="5-Tier Approval Chain">
      <div style={{ minHeight: '248px' }}>
        <StaircaseChain />
      </div>
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
