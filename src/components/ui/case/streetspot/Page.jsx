'use client';

/** streetspot — the case study, rendered by the shared StudyPage from src/data/studies/streetspot.js. */
import StudyPage from '@/components/ui/case/StudyPage';
import Hero from '@/components/ui/case/streetspot/Hero';
import * as DATA from '@/data/studies/streetspot';

export default function Page({ project }) {
  return <StudyPage project={project} data={DATA} hero={<Hero />} />;
}
