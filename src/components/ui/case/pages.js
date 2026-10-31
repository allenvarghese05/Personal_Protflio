/**
 * The case-study pages, by project id. Each project's page lives in
 * src/components/ui/case/<id>/Page.jsx and composes the shared shell
 * (case/shell.jsx) and kit (case/kit.jsx) with its own section components;
 * its facts live in src/data/studies/<id>.js. Pages load on demand, so the
 * wall doesn't carry ten case studies in its bundle.
 */
import dynamic from 'next/dynamic';

const page = (load) => dynamic(load, { loading: () => null });

export const CASE_PAGES = {
  iet: page(() => import('./CaseStudyIET')),
  'bis-report-card': page(() => import('./bis-report-card/Page')),
  'learnflow-ai': page(() => import('./learnflow-ai/Page')),
  'chronos-ai': page(() => import('./chronos-ai/Page')),
  'typist-ml': page(() => import('./typist-ml/Page')),
  'automix-ai': page(() => import('./automix-ai/Page')),
  'aircast': page(() => import('./aircast/Page')),
  'jam-duel': page(() => import('./jam-duel/Page')),
  'college-matcher': page(() => import('./college-matcher/Page')),
  'streetspot': page(() => import('./streetspot/Page')),
};
