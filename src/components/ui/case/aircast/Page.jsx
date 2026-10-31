'use client';

/** AirCast — the case study, rendered by the shared StudyPage from src/data/studies/aircast.js. */
import StudyPage from '@/components/ui/case/StudyPage';
import * as DATA from '@/data/studies/aircast';

export default function Page({ project }) {
  return <StudyPage project={project} data={DATA} />;
}
