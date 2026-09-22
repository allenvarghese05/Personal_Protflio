'use client';
import { PALETTE as P } from '@/lib/palette';
import { useState } from 'react';

/**
 * LearnFlow-specific strip between the bento grid and the architecture graph:
 * live deployment status on the left, a static screenshot carousel on the
 * right. Uses the shared .mc-panel / .mc-label primitives.
 */

function PanelShell({ label, className = '', children }) {
  return (
    <div className={`mc-panel flex min-w-0 flex-col ${className}`}>
      <div className="mc-label mb-3.5">{label}</div>
      <div className="relative min-w-0 flex-1">{children}</div>
    </div>
  );
}

function StatusCell({ label, value }) {
  return (
    <div>
      <div className="mc-label tracking-[0.12em]">{label}</div>
      <div className="mt-0.5 font-mono text-label text-ink-muted">{value}</div>
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
    <PanelShell label="Deployment Status" className="sm:w-[40%]">
      {/* live indicator */}
      <div className="flex items-center">
        <span className="live-pulse rounded-full" style={{ width: '10px', height: '10px', background: P.live }} />
        <span className="ml-2 font-mono text-micro font-bold tracking-[0.14em] text-live">LIVE</span>
      </div>

      {/* url */}
      <div
        className="mc-chip my-2.5 flex w-full text-ink"
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
        className="mt-3 w-full rounded-chip border border-live/60 bg-transparent p-2.5 font-mono text-micro font-semibold tracking-[0.14em] text-live transition-colors hover:bg-live/10"
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
    <PanelShell label="App Preview" className="sm:w-[60%]">
      <div className="relative" style={{ height: '140px', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${P.line}`, background: `linear-gradient(135deg, ${P.surface2} 0%, ${P.raised} 100%)` }}>
        {/* current slot */}
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={P.inkFaint} strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="9" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="font-mono text-micro text-ink-subtle">{`SCREENSHOT ${idx + 1}`}</span>
          </div>
        </div>
        {/* scanline overlay */}
        <div className="pointer-events-none absolute inset-0" style={{ background: SCANLINES }} />
        {/* preview badge */}
        <div className="pointer-events-none absolute right-2 top-2 font-mono text-micro uppercase tracking-[0.1em] text-ice">
          App Preview
        </div>
      </div>

      {/* carousel nav */}
      <div className="mt-2 flex items-center justify-end gap-3">
        {[['←', -1], ['→', 1]].map(([label, dir]) => (
          <button
            key={label}
            onClick={() => setIdx((i) => (i + dir + slots.length) % slots.length)}
            aria-label={dir < 0 ? 'Previous screenshot' : 'Next screenshot'}
            className="mc-ghost-btn"
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
    <div className="flex flex-col gap-4 sm:flex-row">
      <DeploymentPanel deployment={deployment} />
      <PreviewPanel />
    </div>
  );
}
