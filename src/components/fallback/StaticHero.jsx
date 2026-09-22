'use client';
import { identity } from '@/data/timeline';

/**
 * Base-tier fallback — no WebGL / reduced-motion. Same editorial hero as the
 * 3D intro, fully readable, no canvas and no motion.
 */
export default function StaticHero() {
  const { links } = identity;
  return (
    <main
      className="relative flex min-h-screen flex-col justify-between p-6 sm:p-10"
      style={{
        background: 'radial-gradient(120% 80% at 100% 0%, var(--raised) 0%, var(--surface) 35%, var(--void) 80%)',
      }}
    >
      <header className="flex items-center justify-between">
        <span className="text-sm font-medium tracking-tight text-ink">Allen Varghese</span>
        <nav className="flex items-center gap-5 text-sm text-ink-muted sm:gap-7">
          <a className="hero-link" href={links.github} target="_blank" rel="noreferrer">GitHub</a>
          <a className="hero-link" href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          <a className="hero-link" href={`mailto:${links.email}`}>Email</a>
        </nav>
      </header>

      <div className="max-w-3xl">
        <p className="mb-6 font-mono text-micro uppercase tracking-[0.22em] text-ink-muted">
          Software Engineer — Drexel University ’27
        </p>
        <h1 className="font-display text-[clamp(3.25rem,9vw,8.5rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-ink">
          Allen Shaji
          <br />
          Varghese
        </h1>
        <p className="mt-7 max-w-md text-body text-ink-muted">{identity.tagline}</p>
        <p className="mt-6 font-mono text-micro uppercase tracking-[0.2em] text-accent">{identity.badge}</p>
      </div>
    </main>
  );
}
