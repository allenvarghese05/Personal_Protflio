'use client';
import { useState } from 'react';

/**
 * LearnFlow-specific strip between the bento grid and the architecture graph:
 * live deployment status on the left, a static screenshot carousel on the
 * right. Follows the same #07090e panel / #1a2535 border / micro-label system.
 */

function PanelShell({ label, width, children }) {
  return (
    <div
      className="flex min-w-0 flex-col"
      style={{ width, background: '#07090e', border: '0.5px solid #1a2535', borderRadius: '8px', padding: '16px' }}
    >
      <div className="font-mono uppercase" style={{ fontSize: '8px', letterSpacing: '0.2em', color: '#3a5060', marginBottom: '14px' }}>
        {label}
      </div>
      <div className="relative min-w-0 flex-1">{children}</div>
    </div>
  );
}

function StatusCell({ label, value }) {
  return (
    <div>
      <div className="font-mono uppercase" style={{ fontSize: '7px', letterSpacing: '0.12em', color: '#3a5060' }}>{label}</div>
      <div className="font-mono" style={{ fontSize: '9px', color: '#6080a0', marginTop: '2px' }}>{value}</div>
    </div>
  );
}

function DeploymentPanel({ deployment }) {
  const [launching, setLaunching] = useState(false);
  const href = deployment.href || `https://${deployment.url}`;

  const onLaunch = () => {
    if (launching) return;
    setLaunching(true);
    setTimeout(() => window.open(href, '_blank', 'noopener'), 500);
    setTimeout(() => setLaunching(false), 800);
  };

  return (
    <PanelShell label="Deployment Status" width="40%">
      {/* live indicator */}
      <div className="flex items-center">
        <span className="live-pulse rounded-full" style={{ width: '10px', height: '10px', background: '#22c55e' }} />
        <span className="font-mono" style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#22c55e' }}>LIVE</span>
      </div>

      {/* url */}
      <div
        className="font-mono"
        style={{ margin: '10px 0', fontSize: '11px', color: '#8aa0b8', background: '#0a0f18', border: '0.5px solid #1a2535', borderRadius: '3px', padding: '6px 10px' }}
      >
        {deployment.url}
      </div>

      {/* status grid */}
      <div className="grid grid-cols-2" style={{ gap: '10px' }}>
        <StatusCell label="Platform" value={deployment.platform} />
        <StatusCell label="Status" value={deployment.status} />
        <StatusCell label="Type" value={deployment.type} />
        <StatusCell label="Build" value={deployment.build} />
      </div>

      {/* launch button */}
      <button
        onClick={onLaunch}
        className="w-full font-mono transition-colors"
        style={{ marginTop: '12px', padding: '9px', border: '0.5px solid #22c55e', background: 'transparent', borderRadius: '4px', color: '#22c55e', fontSize: '9px', letterSpacing: '0.14em', fontWeight: 600 }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(34,197,94,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {launching ? (
          <>ESTABLISHING CONNECTION<span className="blink-cursor">_</span></>
        ) : (
          'LAUNCH MISSION ↗'
        )}
      </button>
    </PanelShell>
  );
}

/* Static screenshot carousel — the web app isn't publicly fetchable, so these
   are styled placeholder slots ready to accept real images.
   TODO: Replace with real screenshots.
   Place images in /public/screenshots/learnflow/
   learnflow-01.jpg, learnflow-02.jpg, learnflow-03.jpg
   Recommended: 1200x800px — the main transcript UI, the AI tutor panel,
   and the context assembly dashboard. */
const SCANLINES =
  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)';

function PreviewPanel() {
  const [idx, setIdx] = useState(0);
  const slots = [0, 1, 2];
  return (
    <PanelShell label="App Preview" width="60%">
      <div className="relative" style={{ height: '140px', borderRadius: '6px', overflow: 'hidden', border: '0.5px solid #1a2535', background: 'linear-gradient(135deg, #0a0f18 0%, #0d1828 100%)' }}>
        {/* current slot */}
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2535" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="9" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="font-mono" style={{ fontSize: '9px', color: '#1a2535' }}>{`SCREENSHOT ${idx + 1}`}</span>
          </div>
        </div>
        {/* scanline overlay */}
        <div className="pointer-events-none absolute inset-0" style={{ background: SCANLINES }} />
        {/* preview badge */}
        <div className="pointer-events-none absolute right-2 top-2 font-mono uppercase" style={{ fontSize: '7px', letterSpacing: '0.1em', color: '#30c0a0' }}>
          App Preview
        </div>
      </div>

      {/* carousel nav */}
      <div className="mt-2 flex items-center justify-end gap-3">
        {[['←', -1], ['→', 1]].map(([label, dir]) => (
          <button
            key={label}
            onClick={() => setIdx((i) => (i + dir + slots.length) % slots.length)}
            className="font-mono transition-colors"
            style={{ fontSize: '9px', color: '#3a5060' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#8aa0b8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#3a5060')}
          >
            [ {label} ]
          </button>
        ))}
      </div>
    </PanelShell>
  );
}

export default function DeploymentStatusStrip({ deployment }) {
  if (!deployment) return null;
  return (
    <div className="flex" style={{ gap: '16px' }}>
      <DeploymentPanel deployment={deployment} />
      <PreviewPanel />
    </div>
  );
}
