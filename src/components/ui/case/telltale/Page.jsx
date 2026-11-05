'use client';

/** Telltale: the case study, rendered by the shared StudyPage from src/data/studies/telltale.js, with its own hero figure. */
import StudyPage from '@/components/ui/case/StudyPage';
import * as DATA from '@/data/studies/telltale';
import Hero from './Hero';

export default function Page({ project }) {
  return <StudyPage project={project} data={DATA} hero={<Hero />} />;
}
