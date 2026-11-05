'use client';

/** jam-duel — the case study, rendered by the shared StudyPage from src/data/studies/jam-duel.js. */
import StudyPage from '@/components/ui/case/StudyPage';
import * as DATA from '@/data/studies/jam-duel';
import Hero from './Hero';

export default function Page({ project }) {
  return <StudyPage project={project} data={DATA} hero={<Hero />} />;
}
