'use client';

/** learnflow-ai — the case study, rendered by the shared StudyPage from src/data/studies/learnflow-ai.js. */
import StudyPage from '@/components/ui/case/StudyPage';
import * as DATA from '@/data/studies/learnflow-ai';

export default function Page({ project }) {
  return <StudyPage project={project} data={DATA} />;
}
