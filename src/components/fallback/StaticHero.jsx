'use client';
import { useEffect, useRef } from 'react';
import { identity } from '@/data/timeline';
import { useStore } from '@/lib/store';
import { PageLink } from '@/components/audio/SiteAudio';
import ThemeToggle from '@/components/ui/ThemeToggle';

// set when "About me" opens the room, so focus comes back to it on the way out
let cameFromAbout = false;

/**
 * Base-tier fallback — no WebGL / reduced-motion. Same editorial hero as the
 * 3D intro, fully readable, no canvas and no motion.
 */
export default function StaticHero() {
  const { links } = identity;
  const about = useRef(null);
  useEffect(() => {
    if (!cameFromAbout) return;
    cameFromAbout = false;
    about.current?.focus();
  }, []);
  const openAbout = () => {
    cameFromAbout = true;
    useStore.setState({ focusOnEnter: true });
    useStore.getState().setEnteredZone('observatory');
  };
  return (
    <main
      className="relative flex min-h-screen flex-col justify-between p-6 sm:p-10"
      style={{
        background: 'radial-gradient(120% 80% at 100% 0%, var(--raised) 0%, var(--surface) 35%, var(--void) 80%)',
      }}
    >
      <header className="flex items-center justify-between">
        <span className="whitespace-nowrap text-sm font-medium tracking-tight text-ink">Allen Varghese</span>
        <nav className="flex items-center gap-3 text-sm text-ink-muted sm:gap-7">
          <a className="hero-link" href={links.github} target="_blank" rel="noreferrer">GitHub</a>
          <a className="hero-link" href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          <a className="hero-link" href={`mailto:${links.email}`}>Email</a>
          <ThemeToggle className="-my-2 -ml-2 -mr-2 sm:-ml-3" />
        </nav>
      </header>

      <div className="max-w-3xl">
        <p className="mb-6 font-mono text-micro uppercase tracking-[0.22em] text-ink-muted">
          {identity.credential}
        </p>
        <h1 className="font-display text-[clamp(3.25rem,9vw,8.5rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-ink">
          Allen Shaji
          <br />
          Varghese
        </h1>
        <p className="mt-7 max-w-md text-body text-ink-muted">{identity.tagline}</p>
        <p className="mt-6 font-mono text-micro uppercase tracking-[0.2em] text-accent">{identity.badge}</p>
        {/* the work, without the 3D journey, and the About room as a page */}
        <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
          {/* a full load, like the hero's (unless a beat is playing) */}
          <PageLink href="/projects" className="hero-cta group inline-flex">
            See the projects
            <span aria-hidden className="hero-cta__arrow">→</span>
          </PageLink>
          {/* the About room, as a plain page (no 3D journey on this tier) */}
          <button ref={about} type="button" onClick={openAbout} className="hero-link text-[0.9375rem] font-medium text-ink-muted">
            About me
          </button>
        </div>
      </div>
    </main>
  );
}
