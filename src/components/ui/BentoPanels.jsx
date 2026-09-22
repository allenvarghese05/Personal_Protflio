'use client';
import { PALETTE as P, alpha } from '@/lib/palette';

/**
 * The 2×2 architecture bento for the project brief (right column, top half):
 *   1 (TL) 5-tier approval flowchart   ·   2 (TR) GPS enforcement + 3-phase
 *   3 (BL) key metrics (2×2)           ·   4 (BR) key decisions
 *
 * Panels 1 & 2 are bespoke for the signature IET build; other projects get a
 * graceful generic flow / focus so the grid is always populated. All content
 * is data-driven where it can be (metrics, decisions, stack).
 */

function Panel({ heading, accent = P.accent, children }) {
  return (
    <div className="mc-panel flex min-w-0 flex-col">
      <div className="mc-label mb-4 font-semibold" style={{ color: accent }}>{heading}</div>
      <div className="relative min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ── PANEL 1 — 5-tier approval flowchart ─────────────────────────────────── */

function EndPill({ text, color, check }) {
  return (
    <div
      className="mx-auto text-center font-mono"
      style={{ width: '86%', background: P.surface2, border: `1px solid ${alpha(color, 0.6)}`, color, fontSize: '11px', borderRadius: '999px', padding: '5px 8px', letterSpacing: '0.08em' }}
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
        <rect x="6" y="256" width="150" height="20" rx="10" fill={P.surface2} stroke={P.accent} strokeWidth="0.5" />
        <text x="81" y="266" textAnchor="middle" dominantBaseline="middle" fill={P.accent} fontSize="9" fontFamily="monospace" letterSpacing="0.5">APPLICATION SUBMITTED</text>
      </g>
      {/* exit pill (top-right) */}
      <g>
        <rect x="250" y="14" width="144" height="20" rx="10" fill={P.surface2} stroke={P.jade} strokeWidth="0.5" />
        <text x="322" y="24" textAnchor="middle" dominantBaseline="middle" fill={P.jade} fontSize="9" fontFamily="monospace" letterSpacing="0.5">✓ PERMIT APPROVED</text>
      </g>

      {TIERS.map((t, i) => {
        const x = stepX(i);
        const y = stepY(i);
        const odd = i % 2 === 0; // steps 1,3,5 (index 0,2,4)
        const fill = odd ? P.raised : P.surface2;
        const accent = odd ? P.accent : P.accentLo;
        const pts = `${x + SKEW},${y} ${x + W},${y} ${x + W - SKEW},${y + H} ${x},${y + H}`;
        return (
          <g key={t.num}>
            {/* up-right connector arrow toward the next step */}
            {i < TIERS.length - 1 && (
              <text x={x + W - 4} y={y - 4} fontSize="9" fill={P.inkSubtle} fontFamily="monospace">↗</text>
            )}
            <polygon points={pts} fill={fill} />
            {/* amber/orange left accent edge */}
            <line x1={x + SKEW} y1={y} x2={x} y2={y + H} stroke={accent} strokeWidth="3" />
            {/* tier number */}
            <text x={x + SKEW + 6} y={y + H / 2} dominantBaseline="middle" fill={P.accent} fontSize="14" fontWeight="800" fontFamily="monospace">{t.num}</text>
            {/* role + action */}
            <text x={x + SKEW + 30} y={y + 12} dominantBaseline="middle" fill={P.inkMuted} fontSize="10" fontWeight="600" fontFamily="monospace">{t.role}</text>
            <text x={x + SKEW + 30} y={y + 24} dominantBaseline="middle" fill={P.inkSubtle} fontSize="9" fontStyle="italic" fontFamily="monospace">{t.action}</text>
            {/* population context */}
            <text x={x + SKEW} y={y + H + 9} dominantBaseline="middle" fill={P.inkSubtle} fontSize="8" fontFamily="monospace">{t.pop}</text>
          </g>
        );
      })}

      {/* travelling dot */}
      <path id="stair-path" d={dotPath} fill="none" stroke="none" />
      <circle r="3" fill={P.accent}>
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
  { w: 200, cy: 300, top: P.raised, left: P.surface, right: P.void, accent: P.accent, num: '01', role: 'PASTOR', sub: '3,000+ pastors · submits', side: 'L' },
  { w: 175, cy: 248, top: P.raised, left: P.surface, right: P.void, accent: P.accentLo, num: '02', role: 'DIVISION LEADER', sub: '~150 leaders · reviews', side: 'R' },
  { w: 150, cy: 196, top: P.raised, left: P.surface, right: P.void, accent: P.accent, num: '03', role: 'HQ TEAM', sub: 'national HQ · checks', side: 'L' },
  { w: 125, cy: 144, top: P.raised, left: P.surface, right: P.void, accent: P.accentLo, num: '04', role: 'PRESIDENT', sub: '1 president · approves', side: 'R' },
  { w: 100, cy: 92, top: P.raised, left: P.surface, right: P.void, accent: P.jade, num: '05', role: 'FINANCE DEPT', sub: 'finance board · releases', side: 'L' },
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
            <polygon points={top} fill={L.top} stroke={P.line} strokeWidth="0.5" />
            {/* accent glow on the front V edge */}
            <path d={accentD} fill="none" stroke={L.accent} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 3px ${L.accent})` }} />
            {/* label connector + diamond */}
            <line x1={edgeX} y1={L.cy} x2={labelX} y2={L.cy} stroke={P.line} strokeWidth="0.5" />
            <rect x={edgeX - 3} y={L.cy - 3} width="6" height="6" fill={L.accent} transform={`rotate(45 ${edgeX} ${L.cy})`} />
            {/* tier + role */}
            <text x={labelX} y={L.cy - 4} textAnchor={anchor} fontSize="10" fontWeight="700" fontFamily="monospace">
              <tspan fill={L.accent}>{L.num}</tspan>
              <tspan fill={P.inkMuted}>{`  ${L.role}`}</tspan>
            </text>
            {/* sublabel */}
            <text x={labelX} y={L.cy + 8} textAnchor={anchor} fontSize="8" fill={P.inkSubtle} fontFamily="monospace">{L.sub}</text>
          </g>
        );
      })}

      {/* top — permit approved */}
      <line x1={CX} y1={topApex} x2={CX} y2={topApex - 20} stroke={P.jade} strokeWidth="1" style={{ filter: `drop-shadow(0 0 3px ${P.jade})` }} />
      <text x={CX - 6} y={topApex - 24} textAnchor="middle" fontSize="11" fill={P.jade} style={{ filter: `drop-shadow(0 0 4px ${P.jade})` }}>✦</text>
      <text x={CX + 8} y={topApex - 21} textAnchor="start" fontSize="9" fill={P.jade} fontFamily="monospace" letterSpacing="0.5">PERMIT APPROVED</text>

      {/* bottom — application submitted pill */}
      <g>
        <rect x={CX - 78} y={ISO_LAYERS[0].cy + ISO_LAYERS[0].w * VR + DEPTH + 8} width="156" height="20" rx="10" fill={P.surface2} stroke={P.accent} strokeWidth="0.5" />
        <text x={CX} y={ISO_LAYERS[0].cy + ISO_LAYERS[0].w * VR + DEPTH + 18} textAnchor="middle" dominantBaseline="middle" fill={P.accent} fontSize="9" fontFamily="monospace" letterSpacing="0.5">APPLICATION SUBMITTED</text>
      </g>

      {/* travelling orb bottom → top */}
      <circle r="6" fill={P.accent} style={{ filter: `blur(1.5px) drop-shadow(0 0 4px ${P.accent})` }}>
        <animateMotion dur="3s" repeatCount="indefinite" path={`M ${CX},${ISO_LAYERS[0].cy} L ${CX},${topApex}`} />
      </circle>
    </svg>
  );
}

/* ── LearnFlow Panel 1 — 5-pipeline context assembly ─────────────────────── */

const PIPELINES = [
  { name: 'TRANSCRIPT', sub: 'live audio → text', color: P.jade },
  { name: 'LECTURE SLIDES', sub: 'OCR extracted', color: P.ice },
  { name: 'STUDENT NOTES', sub: 'indexed notes', color: P.lilac },
  { name: 'SYLLABUS', sub: 'course structure', color: P.accent },
  { name: 'ASSIGNMENTS', sub: 'rubrics & briefs', color: P.slate },
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
                <rect x="6" y={y} width="122" height="28" rx="4" fill={P.surface2} />
                <rect x="6" y={y} width="2" height="28" fill={p.color} />
                <text x="16" y={y + 12} dominantBaseline="middle" fontSize="9" fontWeight="600" fill={p.color} fontFamily="monospace">{p.name}</text>
                <text x="16" y={y + 21} dominantBaseline="middle" fontSize="8" fill={P.inkSubtle} fontStyle="italic" fontFamily="monospace">{p.sub}</text>
              </g>
            );
          })}

          {/* centre — context assembly */}
          <circle cx={CXc} cy={CYc} r="32" fill={P.raised} stroke={accent} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 5px ${accent})` }} />
          <text x={CXc} y={CYc - 4} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill={accent} fontFamily="monospace">CONTEXT</text>
          <text x={CXc} y={CYc + 7} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill={accent} fontFamily="monospace">ASSEMBLY</text>

          {/* centre → GPT-4o */}
          <line x1={CXc + 34} y1={CYc} x2="356" y2={CYc} stroke={accent} strokeWidth="1.5" />
          <text x="345" y={CYc - 6} textAnchor="middle" fontSize="7" fill={P.inkSubtle} fontFamily="monospace">assembled prompt</text>
          <rect x="356" y={CYc - 16} width="60" height="32" rx="4" fill={P.surface2} />
          <rect x="356" y={CYc - 16} width="2" height="32" fill={P.accent} />
          <text x="364" y={CYc - 3} dominantBaseline="middle" fontSize="8.5" fontWeight="700" fill={P.accent} fontFamily="monospace">GPT-4o</text>
          <text x="364" y={CYc + 8} dominantBaseline="middle" fontSize="7" fill={P.inkSubtle} fontFamily="monospace">tutor reply</text>
        </svg>
      </div>
    </Panel>
  );
}

/* ── LearnFlow Panel 2 — platform reach + performance ────────────────────── */

function PlatformBadge({ children, label }) {
  return (
    <div className="mc-chip gap-2 px-4 py-2">
      {children}
      <span className="text-ink-muted">{label}</span>
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill={P.inkMuted}><path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.16-.47 7.83 1.3 10.39.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.28 3.15-2.54.99-1.46 1.4-2.87 1.42-2.95-.03-.01-2.72-1.05-2.75-4.15zM14.6 4.5c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.02 1.55-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.58 3.03-1.45z"/></svg>
        </PlatformBadge>
        <span className="font-mono text-micro text-ink-subtle">+</span>
        <PlatformBadge label="Windows">
          <svg width="12" height="12" viewBox="0 0 24 24" fill={P.inkMuted}><path d="M3 5.5 10.5 4.4v7.1H3V5.5zm0 13 7.5 1.1v-7H3v5.9zM11.5 4.2 21 3v8.5h-9.5V4.2zm0 8.3H21V21l-9.5-1.3v-7.2z"/></svg>
        </PlatformBadge>
      </div>

      <div style={{ borderTop: `1px solid ${P.line}`, margin: '0 0 14px 0' }} />

      {/* BOTTOM — performance */}
      <div className="text-center">
        <div className="font-display text-3xl font-bold leading-none tracking-tight" style={{ color: accent }}>&lt;150ms</div>
        <div className="mt-1.5 text-label text-ink-muted">query performance on 50K+ records</div>
        <div style={{ marginTop: '10px', height: '5px', width: '100%', background: P.surface2, borderRadius: '3px', overflow: 'hidden' }}>
          <div className="perf-fill" style={{ height: '100%', background: `linear-gradient(90deg, ${alpha(accent, 0.35)}, ${accent})`, borderRadius: '3px' }} />
        </div>
        <div className="mc-label mt-2 tracking-[0.14em]">50K+ records indexed</div>
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
        <EndPill text="INPUT" color={P.accent} />
        <div className="my-2 flex flex-col gap-2">
          {(project.primaryStack || []).map((s, i) => (
            <div key={s} className="flex items-center justify-between" style={{ background: P.surface2, borderLeft: `2px solid ${P.accent}`, borderRadius: '0 4px 4px 0', padding: '8px 12px' }}>
              <span className="font-mono text-micro font-semibold text-ink-muted">{s.toUpperCase()}</span>
              <span className="font-mono text-micro text-ink-faint">{`0${i + 1}`}</span>
            </div>
          ))}
        </div>
        <EndPill text="SHIPPED" color={P.jade} />
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
    <div className="mc-label mb-2.5">
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
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ border: `1px solid ${alpha(accent, 0.6)}` }} />
              <span className="text-sm text-ink-muted">{it}</span>
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
          <circle className="gps-ring" cx="36" cy="36" r="35" fill="none" stroke={P.accent} strokeWidth="1.5" />
          <circle cx="36" cy="36" r="35" fill="none" stroke={P.inkSubtle} strokeWidth="0.5" strokeOpacity="0.4" strokeDasharray="3 4" />
          <circle cx="36" cy="36" r="23" fill="none" stroke={P.accent} strokeWidth="0.5" strokeOpacity="0.3" />
          <circle cx="36" cy="36" r="4" fill={P.accent} />
        </svg>
        <div className="mc-label mt-2 tracking-[0.14em]">
          8KM ENFORCEMENT RADIUS
        </div>
        <div className="mt-1 font-mono text-micro text-ink-subtle">
          Haversine · Great-circle distance
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{ borderTop: `1px solid ${P.line}`, margin: '0 0 12px 0' }} />

      {/* BOTTOM — 3-phase construction */}
      <SubHeading>Construction Phases</SubHeading>
      <div>
        {PHASES.map((p, i) => (
          <div
            key={p.name}
            className="flex items-center"
            style={{ gap: '10px', padding: '8px 0', borderTop: i > 0 ? `1px solid ${P.line}` : 'none' }}
          >
            <span
              className="flex shrink-0 items-center justify-center rounded-full font-mono"
              style={
                p.filled
                  ? { width: '24px', height: '24px', background: accent, color: P.void, fontSize: '11px', fontWeight: 700 }
                  : { width: '24px', height: '24px', background: P.raised, border: `1px solid ${P.lineHi}`, color: P.inkSubtle, fontSize: '11px', fontWeight: 700 }
              }
            >
              {p.n}
            </span>
            <div>
              <div className="font-mono text-micro font-semibold tracking-[0.06em] text-ink">{p.name}</div>
              <div className="mt-0.5 text-label text-ink-muted">{p.desc}</div>
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
            style={{ background: P.surface2, border: `1px solid ${P.line}`, borderRadius: '6px', padding: '14px 12px' }}
          >
            <span className="font-display text-3xl font-bold leading-none tracking-tight" style={{ color: accent }}>
              {m.value}
            </span>
            <span className="mc-label mt-2 leading-snug tracking-[0.12em]">
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
              style={{ fontSize: '12px', fontWeight: 700, color: accent, letterSpacing: '0.04em', borderLeft: `2px solid ${accent}`, paddingLeft: '8px', marginBottom: '6px' }}
            >
              {d.title}
            </div>
            <div className="text-sm leading-relaxed text-ink-muted">
              {d.body}
            </div>
            {i < decisions.length - 1 && <div style={{ borderTop: `1px solid ${P.line}`, margin: '14px 0' }} />}
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function BentoPanels({ project, accent = P.accent }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
      <ApprovalChainPanel project={project} accent={accent} />
      <GpsPhasePanel project={project} accent={accent} />
      <MetricsPanel project={project} accent={accent} />
      <DecisionsPanel project={project} accent={accent} />
    </div>
  );
}
