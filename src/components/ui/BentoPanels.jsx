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
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  marginBottom: '16px',
};

function Panel({ heading, accent = '#e8a040', children }) {
  return (
    <div
      className="flex min-w-0 flex-col"
      style={{ background: '#07090e', border: '0.5px solid #1a2535', borderRadius: '8px', padding: '16px' }}
    >
      <div className="font-mono" style={{ ...HEADING, color: accent }}>{heading}</div>
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

/* Isometric 3D stacked layers — widest/grassroots (Pastor) at the bottom,
   narrowing up to the single point of authority (Finance) at the top. */
const ISO_LAYERS = [
  { w: 200, cy: 300, top: '#0d1828', left: '#07101a', right: '#050d14', accent: '#e8a040', num: '01', role: 'PASTOR', sub: '3,000+ pastors · submits', side: 'L' },
  { w: 175, cy: 248, top: '#0e1a2a', left: '#081220', right: '#060f18', accent: '#c87030', num: '02', role: 'DIVISION LEADER', sub: '~150 leaders · reviews', side: 'R' },
  { w: 150, cy: 196, top: '#0d1828', left: '#07101a', right: '#050d14', accent: '#e8a040', num: '03', role: 'HQ TEAM', sub: 'national HQ · checks', side: 'L' },
  { w: 125, cy: 144, top: '#0e1a2a', left: '#081220', right: '#060f18', accent: '#c87030', num: '04', role: 'PRESIDENT', sub: '1 president · approves', side: 'R' },
  { w: 100, cy: 92, top: '#0d1828', left: '#07101a', right: '#050d14', accent: '#30c0a0', num: '05', role: 'FINANCE DEPT', sub: 'finance board · releases', side: 'L' },
];
const CX = 260;
const DEPTH = 18;
const VR = 0.32; // vertical:horizontal ratio (flatter than 0.5 so slabs read as platforms)

function IsoStack() {
  const top4 = ISO_LAYERS[4];
  const topApex = top4.cy - top4.w * VR;
  return (
    <svg viewBox="-90 0 640 430" width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      {ISO_LAYERS.map((L) => {
        const vy = L.w * VR;
        const Lx = CX - L.w;
        const Rx = CX + L.w;
        const top = `${Lx},${L.cy} ${CX},${L.cy - vy} ${Rx},${L.cy} ${CX},${L.cy + vy}`;
        const leftF = `${Lx},${L.cy} ${CX},${L.cy + vy} ${CX},${L.cy + vy + DEPTH} ${Lx},${L.cy + DEPTH}`;
        const rightF = `${CX},${L.cy + vy} ${Rx},${L.cy} ${Rx},${L.cy + DEPTH} ${CX},${L.cy + vy + DEPTH}`;
        const accentD = `M ${Lx},${L.cy} L ${CX},${L.cy + vy} L ${Rx},${L.cy}`;
        const onLeft = L.side === 'L';
        const edgeX = onLeft ? Lx : Rx;
        const labelX = onLeft ? Lx - 18 : Rx + 18;
        const anchor = onLeft ? 'end' : 'start';
        return (
          <g key={L.num}>
            <polygon points={leftF} fill={L.left} />
            <polygon points={rightF} fill={L.right} />
            <polygon points={top} fill={L.top} stroke="#1a2535" strokeWidth="0.5" />
            {/* accent glow on the front V edge */}
            <path d={accentD} fill="none" stroke={L.accent} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 3px ${L.accent})` }} />
            {/* label connector + diamond */}
            <line x1={edgeX} y1={L.cy} x2={labelX} y2={L.cy} stroke="#1a2535" strokeWidth="0.5" />
            <rect x={edgeX - 3} y={L.cy - 3} width="6" height="6" fill={L.accent} transform={`rotate(45 ${edgeX} ${L.cy})`} />
            {/* tier + role */}
            <text x={labelX} y={L.cy - 4} textAnchor={anchor} fontSize="10" fontWeight="700" fontFamily="monospace">
              <tspan fill={L.accent}>{L.num}</tspan>
              <tspan fill="#8aa0b8">{`  ${L.role}`}</tspan>
            </text>
            {/* sublabel */}
            <text x={labelX} y={L.cy + 8} textAnchor={anchor} fontSize="8" fill="#3a5060" fontFamily="monospace">{L.sub}</text>
          </g>
        );
      })}

      {/* top — permit approved */}
      <line x1={CX} y1={topApex} x2={CX} y2={topApex - 20} stroke="#30c0a0" strokeWidth="1" style={{ filter: 'drop-shadow(0 0 3px #30c0a0)' }} />
      <text x={CX - 6} y={topApex - 24} textAnchor="middle" fontSize="11" fill="#30c0a0" style={{ filter: 'drop-shadow(0 0 4px #30c0a0)' }}>✦</text>
      <text x={CX + 8} y={topApex - 21} textAnchor="start" fontSize="9" fill="#30c0a0" fontFamily="monospace" letterSpacing="0.5">PERMIT APPROVED</text>

      {/* bottom — application submitted pill */}
      <g>
        <rect x={CX - 78} y={ISO_LAYERS[0].cy + ISO_LAYERS[0].w * VR + DEPTH + 8} width="156" height="20" rx="10" fill="#0a1220" stroke="#e8a040" strokeWidth="0.5" />
        <text x={CX} y={ISO_LAYERS[0].cy + ISO_LAYERS[0].w * VR + DEPTH + 18} textAnchor="middle" dominantBaseline="middle" fill="#e8a040" fontSize="9" fontFamily="monospace" letterSpacing="0.5">APPLICATION SUBMITTED</text>
      </g>

      {/* travelling orb bottom → top */}
      <circle r="6" fill="#e8a040" style={{ filter: 'blur(1.5px) drop-shadow(0 0 4px #e8a040)' }}>
        <animateMotion dur="3s" repeatCount="indefinite" path={`M ${CX},${ISO_LAYERS[0].cy} L ${CX},${topApex}`} />
      </circle>
    </svg>
  );
}

/* ── LearnFlow Panel 1 — 5-pipeline context assembly ─────────────────────── */

const PIPELINES = [
  { name: 'TRANSCRIPT', sub: 'live audio → text', color: '#30c0a0' },
  { name: 'LECTURE SLIDES', sub: 'OCR extracted', color: '#4090e0' },
  { name: 'STUDENT NOTES', sub: 'indexed notes', color: '#9060e0' },
  { name: 'SYLLABUS', sub: 'course structure', color: '#e8a040' },
  { name: 'ASSIGNMENTS', sub: 'rubrics & briefs', color: '#608090' },
];

function PipelineFlowPanel({ accent }) {
  // viewBox coords: 5 inputs on the left flow into the centre, then to GPT-4o.
  const rowY = (i) => 26 + i * 42;
  const CXc = 300;
  const CYc = 118;
  return (
    <Panel heading="5-Pipeline Context Assembly" accent={accent}>
      <div style={{ minHeight: '224px' }}>
        <svg viewBox="0 0 420 236" width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
          {/* input pipelines + flowing arrows */}
          {PIPELINES.map((p, i) => {
            const y = rowY(i);
            return (
              <g key={p.name}>
                <line
                  className="pipe-dash"
                  x1="128" y1={y + 14} x2={CXc - 34} y2={CYc}
                  stroke={p.color} strokeOpacity="0.4" strokeWidth="0.75"
                  style={{ animationDelay: `${i * 0.4}s` }}
                />
                <rect x="6" y={y} width="122" height="28" rx="4" fill="#0a0f18" />
                <rect x="6" y={y} width="2" height="28" fill={p.color} />
                <text x="16" y={y + 12} dominantBaseline="middle" fontSize="9" fontWeight="600" fill={p.color} fontFamily="monospace">{p.name}</text>
                <text x="16" y={y + 21} dominantBaseline="middle" fontSize="8" fill="#3a5060" fontStyle="italic" fontFamily="monospace">{p.sub}</text>
              </g>
            );
          })}

          {/* centre — context assembly */}
          <circle cx={CXc} cy={CYc} r="32" fill="#0d1828" stroke="#30c0a0" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 5px #30c0a0)' }} />
          <text x={CXc} y={CYc - 4} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill="#30c0a0" fontFamily="monospace">CONTEXT</text>
          <text x={CXc} y={CYc + 7} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill="#30c0a0" fontFamily="monospace">ASSEMBLY</text>

          {/* centre → GPT-4o */}
          <line x1={CXc + 34} y1={CYc} x2="356" y2={CYc} stroke="#30c0a0" strokeWidth="1.5" />
          <text x="345" y={CYc - 6} textAnchor="middle" fontSize="7" fill="#3a5060" fontFamily="monospace">assembled prompt</text>
          <rect x="356" y={CYc - 16} width="60" height="32" rx="4" fill="#0a0f18" />
          <rect x="356" y={CYc - 16} width="2" height="32" fill="#e8a040" />
          <text x="364" y={CYc - 3} dominantBaseline="middle" fontSize="8.5" fontWeight="700" fill="#e8a040" fontFamily="monospace">GPT-4o</text>
          <text x="364" y={CYc + 8} dominantBaseline="middle" fontSize="7" fill="#3a5060" fontFamily="monospace">tutor reply</text>
        </svg>
      </div>
    </Panel>
  );
}

/* ── LearnFlow Panel 2 — platform reach + performance ────────────────────── */

function PlatformBadge({ children, label }) {
  return (
    <div className="flex items-center gap-2" style={{ background: '#0a0f18', border: '0.5px solid #1a2535', borderRadius: '4px', padding: '8px 16px' }}>
      {children}
      <span className="font-mono" style={{ fontSize: '10px', color: '#8aa0b8' }}>{label}</span>
    </div>
  );
}

function PlatformReachPanel({ accent }) {
  return (
    <Panel heading="Platform Reach · Performance" accent={accent}>
      {/* TOP — cross-platform */}
      <SubHeading>Cross-platform Desktop</SubHeading>
      <div className="flex items-center justify-center gap-3" style={{ marginBottom: '14px' }}>
        <PlatformBadge label="macOS">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#8aa0b8"><path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.16-.47 7.83 1.3 10.39.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.28 3.15-2.54.99-1.46 1.4-2.87 1.42-2.95-.03-.01-2.72-1.05-2.75-4.15zM14.6 4.5c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.02 1.55-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.58 3.03-1.45z"/></svg>
        </PlatformBadge>
        <span className="font-mono" style={{ fontSize: '11px', color: '#3a5060' }}>+</span>
        <PlatformBadge label="Windows">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#8aa0b8"><path d="M3 5.5 10.5 4.4v7.1H3V5.5zm0 13 7.5 1.1v-7H3v5.9zM11.5 4.2 21 3v8.5h-9.5V4.2zm0 8.3H21V21l-9.5-1.3v-7.2z"/></svg>
        </PlatformBadge>
      </div>

      <div style={{ borderTop: '0.5px solid #1a2535', margin: '0 0 14px 0' }} />

      {/* BOTTOM — performance */}
      <div className="text-center">
        <div className="font-mono" style={{ fontSize: '28px', fontWeight: 800, color: '#e8a040', letterSpacing: '-0.02em', lineHeight: 1 }}>&lt;150ms</div>
        <div className="font-mono" style={{ marginTop: '4px', fontSize: '8px', color: '#3a5060' }}>query performance</div>
        <div className="font-mono" style={{ fontSize: '8px', color: '#3a5060' }}>on 50K+ records</div>
        <div style={{ marginTop: '10px', height: '5px', width: '100%', background: '#0a0f18', borderRadius: '3px', overflow: 'hidden' }}>
          <div className="perf-fill" style={{ height: '100%', background: 'linear-gradient(90deg, #1a6b58, #30c0a0)', borderRadius: '3px' }} />
        </div>
        <div className="font-mono" style={{ marginTop: '6px', fontSize: '7px', letterSpacing: '0.14em', color: '#3a5060' }}>50K+ RECORDS INDEXED</div>
      </div>
    </Panel>
  );
}

function ApprovalChainPanel({ project, accent }) {
  if (project.id === 'learnflow-ai') return <PipelineFlowPanel accent={accent} />;
  const iet = project.id === 'iet';
  if (!iet) {
    return (
      <Panel heading="Primary Flow" accent={accent}>
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
    <Panel heading="5-Tier Approval Chain" accent={accent}>
      <div style={{ minHeight: '348px' }}>
        <IsoStack />
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

function GpsPhasePanel({ project, accent }) {
  if (project.id === 'learnflow-ai') return <PlatformReachPanel accent={accent} />;
  if (project.id !== 'iet') {
    const items = project.secondaryStack?.length ? project.secondaryStack : project.tags || [];
    return (
      <Panel heading="Supporting Systems" accent={accent}>
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
    <Panel heading="GPS · 3-Phase" accent={accent}>
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

function MetricsPanel({ project, accent }) {
  const metrics = (project.metrics || []).slice(0, 4);
  return (
    <Panel heading="Key Metrics" accent={accent}>
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

function DecisionsPanel({ project, accent }) {
  const decisions = project.keyDecisions || [];
  return (
    <Panel heading="Key Decisions" accent={accent}>
      <div>
        {decisions.map((d, i) => (
          <div key={d.title}>
            <div
              className="font-mono"
              style={{ fontSize: '10px', fontWeight: 700, color: accent, letterSpacing: '0.06em', borderLeft: `2px solid ${accent}`, paddingLeft: '8px', marginBottom: '5px' }}
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

export default function BentoPanels({ project, accent = '#e8a040' }) {
  return (
    <div className="grid grid-cols-2 min-w-0" style={{ gap: '16px' }}>
      <ApprovalChainPanel project={project} accent={accent} />
      <GpsPhasePanel project={project} accent={accent} />
      <MetricsPanel project={project} accent={accent} />
      <DecisionsPanel project={project} accent={accent} />
    </div>
  );
}
