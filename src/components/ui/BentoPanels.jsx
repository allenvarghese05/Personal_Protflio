'use client';
import { PALETTE as P, alpha } from '@/lib/palette';

/**
 * "Under the hood" — two bespoke visuals per project that show how it works
 * (the approval chain, the audio pipeline, the data fusion, the matching
 * engine, a battle, the live map …). A new project without its own visuals
 * falls back to a generic flow + supporting-systems pair. Metrics live in
 * the brief header and key decisions in the case study, not here.
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

/* ── AirCast Panel 1 — space-to-street data fusion ─────────────────────── */

const AIRCAST_SOURCES = [
  { name: 'NASA TEMPO', sub: 'satellite · 35,786 km', color: P.ice },
  { name: 'OPENAQ', sub: 'ground sensors · 25 km', color: P.sand },
  { name: 'OPENWEATHER', sub: 'live meteorology', color: P.jade },
];
const AIRCAST_OUTPUTS = ['6-HR FORECAST', 'AI BRIEF · A–F', '5 SAFETY PROFILES'];

function FusionPanel({ accent }) {
  const rowY = (i) => 30 + i * 62;
  const CXc = 214;
  const CYc = 92;
  return (
    <Panel heading="Space → Street Fusion" accent={accent}>
      <svg viewBox="0 0 420 236" width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        {AIRCAST_SOURCES.map((src, i) => {
          const y = rowY(i);
          return (
            <g key={src.name}>
              <line className="pipe-dash" x1="130" y1={y + 14} x2={CXc - 30} y2={CYc} stroke={src.color} strokeOpacity="0.45" strokeWidth="0.75" style={{ animationDelay: `${i * 0.4}s` }} />
              <rect x="4" y={y} width="126" height="30" rx="4" fill={P.surface2} />
              <rect x="4" y={y} width="2" height="30" fill={src.color} />
              <text x="14" y={y + 12} dominantBaseline="middle" fontSize="9.5" fontWeight="600" fill={src.color} fontFamily="monospace">{src.name}</text>
              <text x="14" y={y + 23} dominantBaseline="middle" fontSize="8.5" fill={P.inkSubtle} fontFamily="monospace">{src.sub}</text>
            </g>
          );
        })}

        <circle cx={CXc} cy={CYc} r="30" fill={P.raised} stroke={accent} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 5px ${accent})` }} />
        <text x={CXc} y={CYc} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill={accent} fontFamily="monospace">FUSION</text>

        {AIRCAST_OUTPUTS.map((o, i) => {
          const y = 42 + i * 34;
          return (
            <g key={o}>
              <line x1={CXc + 30} y1={CYc} x2="286" y2={y + 11} stroke={accent} strokeOpacity="0.5" strokeWidth="0.75" />
              <rect x="286" y={y} width="130" height="22" rx="11" fill={P.surface2} stroke={alpha(accent, 0.5)} strokeWidth="0.75" />
              <text x="351" y={y + 11} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fontWeight="600" fill={P.inkMuted} fontFamily="monospace">{o}</text>
            </g>
          );
        })}

        <text x="210" y="222" textAnchor="middle" fontSize="9" fill={P.inkSubtle} fontFamily="monospace">
          accuracy = 100 − |tempo − ground| ÷ max × 100
        </text>
      </svg>
    </Panel>
  );
}

/* ── AirCast Panel 2 — the explainable forecast's drivers ─────────────────── */

const FORECAST_DRIVERS = [
  { driver: 'Wind', when: '> 15 mph', k: 0.75 },
  { driver: 'Rain', when: 'any', k: 0.65 },
  { driver: 'Overnight', when: '22–5 h', k: 0.95 },
  { driver: 'Humidity', when: '> 80%', k: 1.05 },
  { driver: 'Rush hour', when: '7–9 · 16–19 h', k: 1.15 },
  { driver: 'Heat', when: '> 85°F', k: 1.2 },
];

function ForecastDriversPanel({ accent }) {
  return (
    <Panel heading="Forecast Drivers" accent={accent}>
      <SubHeading>AQI multiplier per hour</SubHeading>
      <div className="flex flex-col gap-2">
        {FORECAST_DRIVERS.map((d) => {
          const better = d.k < 1;
          const color = better ? P.jade : accent;
          // bar grows from the 1.0 midline: left = cleaner air, right = worse
          const w = Math.min(50, Math.abs(1 - d.k) * 140);
          return (
            <div key={d.driver} className="grid items-center gap-3" style={{ gridTemplateColumns: '5.5rem 1fr 3rem' }}>
              <div>
                <div className="font-mono text-micro font-semibold text-ink">{d.driver}</div>
                <div className="font-mono text-micro text-ink-subtle">{d.when}</div>
              </div>
              <div className="relative h-1.5 rounded-full" style={{ background: P.surface2 }}>
                <span className="absolute top-[-3px] h-3 w-px" style={{ left: '50%', background: P.lineHi }} />
                <span
                  className="absolute top-0 h-1.5 rounded-full"
                  style={{ background: color, width: `${w}%`, left: better ? `${50 - w}%` : '50%' }}
                />
              </div>
              <div className="text-right font-mono text-micro font-semibold" style={{ color }}>
                ×{d.k.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 font-mono text-micro text-ink-subtle">±5 pts variation · 0.9 carry-over per hour · every hour returns its reason</div>
    </Panel>
  );
}

/* ── College Matcher — the matching engine + the voice counselor ───────── */

const MATCH_FACTORS = [
  { name: 'Academics', sub: 'GPA · scores · rigor', w: 0.9 },
  { name: 'Interests', sub: 'activities · hobbies', w: 0.75 },
  { name: 'Career goals', sub: 'salary · environment', w: 0.8 },
  { name: 'Location', sub: 'region · climate · setting', w: 0.55 },
  { name: 'Finances', sub: 'budget · aid needs', w: 0.7 },
];

function MatchEnginePanel({ accent }) {
  const R = 38;
  const C = 2 * Math.PI * R;
  return (
    <Panel heading="Matching Engine" accent={accent}>
      <div className="flex items-center gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {MATCH_FACTORS.map((f) => (
            <div key={f.name}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-micro font-semibold text-ink">{f.name}</span>
                <span className="truncate font-mono text-micro text-ink-subtle">{f.sub}</span>
              </div>
              <div className="mt-1 h-1 rounded-full" style={{ background: P.surface2 }}>
                <div className="perf-fill h-1 rounded-full" style={{ width: `${f.w * 100}%`, background: `linear-gradient(90deg, ${alpha(accent, 0.35)}, ${accent})` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="relative shrink-0" style={{ width: 104, height: 104 }}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke={P.surface2} strokeWidth="6" />
            <circle cx="50" cy="50" r={R} fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * 0.08} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold" style={{ color: accent }}>92%</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">match</span>
          </div>
        </div>
      </div>
      <div className="mt-4 font-mono text-micro text-ink-subtle">Five factors → one ranked match per school · illustrative values</div>
    </Panel>
  );
}

function VoiceCounselorPanel({ accent }) {
  const bars = [4, 9, 14, 7, 18, 11, 22, 15, 9, 17, 24, 12, 8, 16, 20, 10, 6, 13, 19, 9, 5];
  return (
    <Panel heading="AI Voice Counselor" accent={accent}>
      <div className="flex flex-col gap-2.5">
        <div className="max-w-[85%] self-start rounded-xl rounded-tl-sm px-3 py-2 text-sm leading-snug text-ink" style={{ background: P.surface2 }}>
          What would a great day at college look like for you?
        </div>
        <div className="max-w-[85%] self-end rounded-xl rounded-tr-sm px-3 py-2 text-sm leading-snug text-ink" style={{ background: alpha(accent, 0.14), border: `1px solid ${alpha(accent, 0.3)}` }}>
          Building things in a lab, then a city to explore after…
          <span className="blink-cursor ml-0.5" style={{ color: accent }}>▍</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="live-pulse h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: P.live }} />
        <div className="flex h-7 flex-1 items-center gap-[3px]">
          {bars.map((h, i) => (
            <span key={i} className="flex-1 rounded-full" style={{ height: `${h + 4}px`, background: i < 14 ? accent : P.lineHi }} />
          ))}
        </div>
        <span className="mc-chip">Pause</span>
      </div>
      <div className="mt-3 font-mono text-micro text-ink-subtle">Web Speech API · live transcript · OpenAI keeps the thread</div>
    </Panel>
  );
}

/* ── Jam Duel — a battle + where the recommendations come from ─────────── */

function BattleSide({ label, pct, lead, accent }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <div
        className="aspect-square w-full rounded-lg"
        style={{
          background: lead
            ? `linear-gradient(135deg, ${alpha(accent, 0.55)}, ${P.raised})`
            : `linear-gradient(135deg, ${alpha(P.lilac, 0.45)}, ${P.raised})`,
          boxShadow: lead ? `0 0 0 1px ${alpha(accent, 0.6)}` : `0 0 0 1px ${P.line}`,
        }}
      />
      <span className="font-mono text-micro font-semibold text-ink">{label}</span>
      <span className="font-display text-lg font-bold" style={{ color: lead ? accent : P.inkMuted }}>{pct}%</span>
    </div>
  );
}

function BattlePanel({ accent }) {
  return (
    <Panel heading="Head-to-Head" accent={accent}>
      <div className="flex items-center gap-3">
        <BattleSide label="Track A" pct={58} lead accent={accent} />
        <span className="font-display text-sm font-bold text-ink-subtle">VS</span>
        <BattleSide label="Track B" pct={42} accent={accent} />
      </div>
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full">
        <span style={{ width: '58%', background: accent }} />
        <span style={{ width: '42%', background: alpha(P.lilac, 0.7) }} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="h-2 w-2 rounded-full" style={{ background: i < 7 ? accent : P.surface2 }} />
          ))}
        </div>
        <span className="font-mono text-micro text-ink-muted">7 / 10 votes today · 5-day streak</span>
      </div>
      <div className="mt-3 font-mono text-micro text-ink-subtle">10 votes a day · resets at midnight · illustrative battle</div>
    </Panel>
  );
}

function FlowBox({ title, sub, color }) {
  return (
    <div className="rounded-md px-3 py-2" style={{ background: P.surface2, borderLeft: `2px solid ${color}` }}>
      <div className="font-mono text-micro font-semibold" style={{ color }}>{title}</div>
      <div className="font-mono text-micro text-ink-subtle">{sub}</div>
    </div>
  );
}

function RecFlowPanel({ accent }) {
  return (
    <Panel heading="How Recommendations Work" accent={accent}>
      <div className="grid items-center gap-3" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        <div className="flex flex-col gap-2">
          <FlowBox title="FAVOURITES" sub="songs you love" color={P.ice} />
          <FlowBox title="VOTING HISTORY" sub="every battle you called" color={P.lilac} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-micro text-ink-subtle">→</span>
          <span className="rounded-full px-3 py-1.5 font-mono text-micro font-bold" style={{ color: accent, border: `1px solid ${accent}`, background: alpha(accent, 0.1) }}>GPT-4</span>
          <span className="font-mono text-micro text-ink-subtle">→</span>
        </div>
        <div className="flex flex-col gap-2">
          <FlowBox title="BY MOOD" sub="grouped for you" color={accent} />
          <FlowBox title="FRESH DAILY" sub="new picks each day" color={P.jade} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {['Spotify search + previews', 'YouTube playback', 'Friends & taste compare'].map((t) => (
          <span key={t} className="mc-chip">{t}</span>
        ))}
      </div>
    </Panel>
  );
}

/* ── StreetSpot — the live map + levels & roadmap ───────────────────────── */

function LiveMapPanel({ accent }) {
  const pins = [
    { x: 62, y: 70, open: true },
    { x: 150, y: 58, open: true },
    { x: 118, y: 150, open: false },
    { x: 40, y: 190, open: true },
    { x: 168, y: 214, open: false },
  ];
  return (
    <Panel heading="Live Spot Map" accent={accent}>
      <div className="flex items-center gap-5">
        <div className="shrink-0 overflow-hidden rounded-[22px] p-1.5" style={{ background: P.raised, boxShadow: `0 0 0 1px ${P.lineHi}` }}>
          <svg viewBox="0 0 200 260" width="132" style={{ display: 'block', borderRadius: 16, background: P.surface2 }}>
            {[40, 100, 160, 220].map((y) => <rect key={`h${y}`} x="0" y={y} width="200" height="9" fill={P.raised} />)}
            {[30, 95, 160].map((x) => <rect key={`v${x}`} x={x} y="0" width="9" height="260" fill={P.raised} />)}
            {pins.map((p, i) => (
              <g key={i} transform={`translate(${p.x} ${p.y})`}>
                <circle r="9" fill={alpha(p.open ? P.jade : accent, 0.22)} />
                <circle r="4.5" fill={p.open ? P.jade : accent} />
              </g>
            ))}
            <circle cx="104" cy="112" r="6" fill={P.ice} stroke={P.ink} strokeWidth="2" />
            <rect x="14" y="228" width="172" height="22" rx="11" fill={P.void} opacity="0.85" />
            <text x="100" y="239" textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={P.ink} fontFamily="monospace">Spot reported · 2 min ago</text>
          </svg>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: P.jade }} /><span className="text-sm text-ink-muted">Open spot</span></div>
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} /><span className="text-sm text-ink-muted">Just taken</span></div>
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: P.ice }} /><span className="text-sm text-ink-muted">You</span></div>
          <div className="mt-1 font-mono text-micro text-ink-subtle">Google Maps · Expo Location · offline cache</div>
        </div>
      </div>
      <div className="mt-3 font-mono text-micro text-ink-subtle">Illustrative map</div>
    </Panel>
  );
}

const ROADMAP = [
  { phase: 'Phase 1', state: 'done', items: 'Auth · map · reporting · points · leaderboards' },
  { phase: 'Phase 2', state: 'next', items: 'Realtime backend · push alerts · predictions' },
  { phase: 'Phase 3', state: 'later', items: 'Social · analytics · meters · more cities' },
];

function LevelsRoadmapPanel({ accent }) {
  return (
    <Panel heading="Contributors & Roadmap" accent={accent}>
      <SubHeading>Earn your way up</SubHeading>
      <div className="flex items-center gap-2">
        <span className="mc-chip mc-chip--accent" style={{ '--chip': accent }}>Rookie</span>
        <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${accent}, ${P.jade})` }} />
        <span className="font-mono text-micro text-ink-subtle">10 pts / report + bonuses</span>
        <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${P.jade}, ${P.accentHi})` }} />
        <span className="mc-chip mc-chip--accent" style={{ '--chip': P.accentHi }}>Legend</span>
      </div>
      <div className="my-4 border-t border-line" />
      <SubHeading>Roadmap</SubHeading>
      <div className="flex flex-col gap-2.5">
        {ROADMAP.map((r) => (
          <div key={r.phase} className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold"
              style={
                r.state === 'done'
                  ? { background: P.jade, color: P.void }
                  : r.state === 'next'
                    ? { border: `1px solid ${accent}`, color: accent }
                    : { border: `1px solid ${P.lineHi}`, color: P.inkSubtle }
              }
            >
              {r.state === 'done' ? '✓' : ''}
            </span>
            <div className="min-w-0">
              <div className="font-mono text-micro font-semibold text-ink">
                {r.phase} <span className="text-ink-subtle">· {r.state === 'done' ? 'built' : r.state === 'next' ? 'next' : 'future'}</span>
              </div>
              <div className="text-label text-ink-muted">{r.items}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ApprovalChainPanel({ project, accent }) {
  if (project.id === 'learnflow-ai') return <PipelineFlowPanel accent={accent} />;
  if (project.id === 'aircast') return <FusionPanel accent={accent} />;
  if (project.id === 'college-matcher') return <MatchEnginePanel accent={accent} />;
  if (project.id === 'jam-duel') return <BattlePanel accent={accent} />;
  if (project.id === 'streetspot') return <LiveMapPanel accent={accent} />;
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
        <EndPill text={project.flowEnd || 'SHIPPED'} color={P.jade} />
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
  if (project.id === 'aircast') return <ForecastDriversPanel accent={accent} />;
  if (project.id === 'college-matcher') return <VoiceCounselorPanel accent={accent} />;
  if (project.id === 'jam-duel') return <RecFlowPanel accent={accent} />;
  if (project.id === 'streetspot') return <LevelsRoadmapPanel accent={accent} />;
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

export default function BentoPanels({ project, accent = P.accent }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
      <ApprovalChainPanel project={project} accent={accent} />
      <GpsPhasePanel project={project} accent={accent} />
    </div>
  );
}
