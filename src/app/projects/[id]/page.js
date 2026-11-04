import { notFound } from 'next/navigation';
import { ENGINEERING_PROJECTS, projectById } from '@/data/projects';
import CaseStudyStandalone from '@/components/work/CaseStudyStandalone';
import { THEME_SCRIPT } from '@/components/work/themeScript';

// One case study per project, outside the game, so each has its own link.
export const dynamicParams = false;

export function generateStaticParams() {
  return ENGINEERING_PROJECTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const project = projectById(id);
  if (!project) return {};
  return {
    title: `${project.label} | Allen Shaji Varghese`,
    description: project.subtitle,
    alternates: { canonical: `/projects/${id}` },
  };
}

export default async function CaseStudyRoute({ params }) {
  const { id } = await params;
  if (!projectById(id)) notFound();
  return (
    <>
      {/* before the page paints: light when /projects is light, so no dark flash */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <CaseStudyStandalone id={id} />
    </>
  );
}
