'use client';
import { motion } from 'framer-motion';
import { ABOUT, JOURNEY, SKILLS, AWARDS } from '@/data/about';
import { projectById } from '@/data/projects';
import { useStore } from '@/lib/store';
import { StationHeader, StationSection, stagger, rise } from './shared';

/**
 * The Observatory — who Allen is: a short bio, the journey so far, skills
 * backed by the projects that use them, and recognition. Project links jump
 * straight to that project's case study.
 */
function ProjectLink({ id }) {
  const openProject = useStore((s) => s.openProject);
  const p = projectById(id);
  if (!p) return null;
  return (
    <button onClick={() => openProject(id)} className="mc-chip transition-colors hover:text-ink">
      {p.label} →
    </button>
  );
}

export default function ObservatoryPanel() {
  return (
    <motion.article variants={stagger} initial="hidden" animate="show" className="w-full">
      <StationHeader kicker="Observatory" title={ABOUT.headline} />

      <div className="mx-auto max-w-6xl px-6 pb-16 sm:px-12">
        <StationSection label="About">
          <div className="flex max-w-3xl flex-col gap-4">
            {ABOUT.bio.map((p) => (
              <motion.p key={p} variants={rise} className="text-lg leading-relaxed text-ink-muted">
                {p}
              </motion.p>
            ))}
          </div>
        </StationSection>

        <StationSection label="The journey">
          <ol className="relative max-w-3xl">
            <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-line-hi" />
            {JOURNEY.map((j) => (
              <motion.li key={j.title} variants={rise} className="relative pb-8 pl-8 last:pb-0">
                <span aria-hidden className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-accent bg-void" />
                <div className="font-mono text-micro uppercase tracking-[0.16em] text-ink-subtle">{j.dates}</div>
                <div className="font-display mt-1 text-lg font-semibold text-ink">{j.title}</div>
                <div className="text-sm text-ink-muted">{j.org}</div>
                <div className="mt-1.5 text-sm text-ink-subtle">{j.note}</div>
                {j.project && (
                  <div className="mt-3">
                    <ProjectLink id={j.project} />
                  </div>
                )}
              </motion.li>
            ))}
          </ol>
        </StationSection>

        <StationSection label="Skills">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SKILLS.map((g) => (
              <motion.div key={g.group} variants={rise} className="mc-panel">
                <div className="mc-label">{g.group}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.items.map((it) => (
                    <span key={it} className="mc-chip text-ink">
                      {it}
                    </span>
                  ))}
                </div>
                <div className="mt-4 text-label text-ink-subtle">
                  Used in {g.projects.map((id) => projectById(id)?.label).filter(Boolean).join(', ')}
                </div>
              </motion.div>
            ))}
          </div>
        </StationSection>

        <StationSection label="Recognition">
          {AWARDS.map((a) => (
            <motion.div key={a.title} variants={rise} className="mc-panel flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-display text-lg font-semibold text-ink">{a.title}</div>
                <div className="text-sm text-ink-muted">{a.detail}</div>
              </div>
              {a.project && <ProjectLink id={a.project} />}
            </motion.div>
          ))}
        </StationSection>
      </div>
    </motion.article>
  );
}
