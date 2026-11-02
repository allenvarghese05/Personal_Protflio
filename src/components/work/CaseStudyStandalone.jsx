'use client';
/**
 * A case study on its own page (/projects/<id>), outside Mission Control. It
 * keeps Mission Control's frame (a fixed nav over a [data-mc-scroll] stage)
 * so the case-study sections behave exactly as they do in the game, and it
 * hands NextSection a navigate function so "Up next" changes the URL.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { projectById } from '@/data/projects';
import { caseStudyFor } from '@/data/caseStudies';
import { CASE_PAGES } from '@/components/ui/case/pages';
import { CaseNavContext } from '@/components/ui/case/shell';

export default function CaseStudyStandalone({ id }) {
  const router = useRouter();
  const project = projectById(id);
  const Page = CASE_PAGES[id];
  if (!project || !Page) return null;

  return (
    <CaseNavContext.Provider value={(nextId) => router.push(`/projects/${nextId}`)}>
      <div className="mc-root fixed inset-0 flex flex-col bg-void">
        <nav
          aria-label="Case study"
          className="relative flex h-14 shrink-0 items-center justify-between border-b border-line bg-void px-4 sm:px-6"
        >
          <Link href={`/projects#${id}`} className="mc-ghost-btn uppercase">
            ← All projects
          </Link>
          <div className="absolute left-1/2 hidden -translate-x-1/2 whitespace-nowrap font-mono text-micro uppercase tracking-[0.14em] md:block">
            <span className="text-ink-subtle">Allen Shaji Varghese</span>
            <span className="text-ink-faint"> · </span>
            <span className="text-accent">{project.label}</span>
          </div>
          <Link href="/" className="mc-ghost-btn uppercase">
            Portfolio ↗
          </Link>
        </nav>
        {/* keyed by project, so moving to the next case study starts at the top */}
        <div key={id} data-mc-scroll className="relative flex-1 overflow-y-auto">
          <Page project={project} study={caseStudyFor(id)} />
        </div>
      </div>
    </CaseNavContext.Provider>
  );
}
