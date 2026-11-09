import ProjectIndex from '@/components/work/ProjectIndex';
import { ENGINEERING_PROJECTS } from '@/data/projects';
import { THEME_SCRIPT } from '@/components/work/themeScript';

// The résumé link: every project without the 3D journey.
export const metadata = {
  title: 'Projects | Allen Shaji Varghese',
  description:
    'Every project by Allen Shaji Varghese, a software engineering student at Drexel: client systems, a school platform, AI products and research builds, each with a full case study.',
  alternates: { canonical: '/projects' },
  openGraph: {
    title: 'Projects | Allen Shaji Varghese',
    description: `${ENGINEERING_PROJECTS.length} projects, each written up from its own code.`,
    type: 'website',
    url: '/projects',
  },
  twitter: { card: 'summary_large_image' },
};

export default function ProjectsPage() {
  return (
    <>
      {/* before the page paints: light mode for anyone who chose it */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <ProjectIndex />
    </>
  );
}
