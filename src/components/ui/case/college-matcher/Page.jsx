'use client';

/** college-matcher — the case study, rendered by the shared StudyPage from src/data/studies/college-matcher.js. */
import StudyPage from '@/components/ui/case/StudyPage';
import * as DATA from '@/data/studies/college-matcher';

export default function Page({ project }) {
  return <StudyPage project={project} data={DATA} />;
}
