/**
 * Mission Control content — the Engineering District project briefs.
 *
 * Each project lives in its own module under src/data/projects/<id>.js (its
 * wall card, brief data and case-study copy); this file only sets the order —
 * the wall's order, left → right on the Engineering mesa. Each
 * project carries its own `architectureGraph` (nodes + edges) for the
 * force-directed diagram. `kind` drives the accent colour:
 * signature | current | award | project. `cardBadge` overrides the badge word
 * on the wall card; `flowEnd` labels the end of the generic flow panel.
 * Everything here comes from each project's own README — no invented metrics.
 */

import { project as Iet, caseStudy as IetStudy } from './projects/iet';
import { project as BisReportCard, caseStudy as BisReportCardStudy } from './projects/bis-report-card';
import { project as LearnflowAi, caseStudy as LearnflowAiStudy } from './projects/learnflow-ai';
import { project as ChronosAi, caseStudy as ChronosAiStudy } from './projects/chronos-ai';
import { project as TypistMl, caseStudy as TypistMlStudy } from './projects/typist-ml';
import { project as AutomixAi, caseStudy as AutomixAiStudy } from './projects/automix-ai';
import { project as Aircast, caseStudy as AircastStudy } from './projects/aircast';
import { project as JamDuel, caseStudy as JamDuelStudy } from './projects/jam-duel';
import { project as CollegeMatcher, caseStudy as CollegeMatcherStudy } from './projects/college-matcher';
import { project as Streetspot, caseStudy as StreetspotStudy } from './projects/streetspot';

export const ENGINEERING_PROJECTS = [Iet, BisReportCard, LearnflowAi, ChronosAi, TypistMl, AutomixAi, Aircast, JamDuel, CollegeMatcher, Streetspot];

/** Case-study copy by project id (see src/data/caseStudies.js). */
export const PROJECT_STUDIES = { [Iet.id]: IetStudy, [BisReportCard.id]: BisReportCardStudy, [LearnflowAi.id]: LearnflowAiStudy, [ChronosAi.id]: ChronosAiStudy, [TypistMl.id]: TypistMlStudy, [AutomixAi.id]: AutomixAiStudy, [Aircast.id]: AircastStudy, [JamDuel.id]: JamDuelStudy, [CollegeMatcher.id]: CollegeMatcherStudy, [Streetspot.id]: StreetspotStudy };

export const projectById = (id) => ENGINEERING_PROJECTS.find((p) => p.id === id);
