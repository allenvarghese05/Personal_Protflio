'use client';

/**
 * Base-tier fallback — no WebGL / reduced-motion. Same content as the
 * 3D hero, fully readable, with a CSS-only starfield gradient backdrop.
 */
const SKILLS = [
  'TypeScript', 'React', 'Next.js', 'Python',
  'Node.js', 'PostgreSQL', 'GPT-4', 'Three.js',
];

export default function StaticHero() {
  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          'radial-gradient(circle at 50% 120%, #14233a 0%, #0b1322 40%, #060913 100%)',
      }}
    >
      <div className="glass glass-glow mb-8 flex items-center gap-2.5 rounded-full px-5 py-2">
        <span className="text-[var(--gold)] text-sm">★</span>
        <span className="font-mono text-xs tracking-wide text-[var(--text-secondary)]">
          NASA Space Apps — Global Nominee · Top 9% of 11,350+
        </span>
      </div>

      <h1 className="font-display text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
        <span className="text-gradient">Allen Shaji</span>
        <br />
        <span className="text-[var(--text-primary)]">Varghese</span>
      </h1>

      <p className="mt-6 max-w-xl text-base text-[var(--text-secondary)] sm:text-lg">
        Software Engineering student at Drexel building products that solve real
        problems through{' '}
        <span className="text-[var(--gold)]">AI</span> and{' '}
        <span className="text-[var(--steel-bright)]">technology</span>.
      </p>

      <div className="mt-8 flex max-w-2xl flex-wrap justify-center gap-2.5">
        {SKILLS.map((s) => (
          <span
            key={s}
            className="glass rounded-full px-4 py-1.5 font-mono text-xs text-[var(--text-secondary)]"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="mt-10 flex gap-5 font-mono text-sm">
        <a
          href="https://github.com/allenvarghese05"
          className="text-[var(--steel-bright)] hover:underline"
        >
          GitHub
        </a>
        <a
          href="https://www.linkedin.com/in/allen-shaji-varghese/"
          className="text-[var(--steel-bright)] hover:underline"
        >
          LinkedIn
        </a>
        <a
          href="mailto:allenvarghese05@gmail.com"
          className="text-[var(--steel-bright)] hover:underline"
        >
          Email
        </a>
      </div>
    </main>
  );
}
