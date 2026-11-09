'use client';
import { Fragment } from 'react';
import { CONTACT, EXPERIENCE, SKILLS, STORY } from '@/data/about';
import { ENGINEERING_PROJECTS, projectById } from '@/data/projects';
import { SHORT } from '@/data/showcase';
import OverflowShowcase from '@/components/work/OverflowShowcase';
import { ArrowDot, PILL_LINE, PILL_SOLID } from '@/components/work/parts';
import MeetMe from './meet/MeetMe';
import { Band, Chapter, ChapterHead, Lead, Reveal, TITLE_SIZE, useRoomLink } from './Story';
import { PageLink } from '@/components/audio/SiteAudio';

/**
 * The Observatory: who I am, told as a profile in six chapters (data:
 * STORY in src/data/about.js). Meet Me opens it: my name and the helmet,
 * then the lead and chapters 01–03 (Drexel, building, building for home)
 * while the helmet holds beside them. Then the page opens to full width:
 * 04 Overflow (the figures, the write-up, the people who saw the work),
 * 05 what I'm building now, my skills and the projects behind each, and 06,
 * what's next and how to reach me.
 */

/** Each full-width chapter opens under a hairline, with room above it; the
 *  rule sits as close to its own heading as the chapters beside the helmet
 *  do (pt-10 / 12). */
const SECTION = 'mt-20 border-t border-line pt-10 lg:mt-28 lg:pt-12';
/** The full-width half's grid: a label column and a content column, the same
 *  4 / 8 split (and 56px gap) as the recommendation and team quotes in 04,
 *  switching at the same container width (60rem), so Skills and 05 start on
 *  the same edge at every size. */
const SPLIT_GRID = '@[60rem]:grid @[60rem]:grid-cols-12 @[60rem]:gap-x-14';

/** Skills, each group with the projects that use it (the /projects head). */
function Skills() {
  const go = useRoomLink();
  return (
    <section aria-labelledby="skills-title" className={SECTION}>
      <Reveal className={`${SPLIT_GRID} @[60rem]:items-end`}>
        <h3 id="skills-title" className={`font-display font-semibold text-ink @[60rem]:col-span-4 ${TITLE_SIZE}`}>
          Skills
        </h3>
        <p className="mt-3 max-w-[44ch] text-[0.975rem] text-ink-muted @[60rem]:col-span-8 @[60rem]:mt-0">Each one backed by the projects that use it.</p>
      </Reveal>
      <dl className="mt-10">
        {SKILLS.map((g, i) => (
          <Reveal key={g.group} delay={i * 0.05} className={`grid grid-cols-1 gap-y-2 border-t border-line py-6 ${SPLIT_GRID}`}>
            <dt className="font-display text-[1.125rem] font-semibold text-ink @[60rem]:col-span-4">{g.group}</dt>
            <dd className="@[60rem]:col-span-8">
              <p className="text-base leading-relaxed text-ink">
                {g.items.map((it, k) => (
                  <Fragment key={it}>
                    {k > 0 && ' '}
                    {/* the dot travels with the item after it, so no line ends on one */}
                    <span className="whitespace-nowrap">
                      {k > 0 && (
                        <>
                          <span aria-hidden className="text-ink-faint">
                            ·
                          </span>
                          <span className="sr-only">,</span>
                          {'\u00a0'}
                        </>
                      )}
                      {it}
                    </span>
                  </Fragment>
                ))}
              </p>
              <p className="mt-2 text-[0.8125rem] text-ink-subtle">
                Used in{' '}
                {g.projects
                  .map(projectById)
                  .filter(Boolean)
                  .map((p, k, all) => (
                    <Fragment key={p.id}>
                      <button
                        type="button"
                        onClick={go({ project: p.id }, `skill-${g.group}-${p.id}`)}
                        data-return-key={`skill-${g.group}-${p.id}`}
                        aria-label={`Read the case study: ${p.label}`}
                        className="whitespace-nowrap text-ink-muted underline decoration-line-hi underline-offset-4 transition-colors hover:text-ink hover:decoration-ink-subtle"
                      >
                        {SHORT[p.id] || p.label}
                      </button>
                      {k < all.length - 1 ? ', ' : ''}
                    </Fragment>
                  ))}
              </p>
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}

/** 06: what's next, and every way to reach me. */
function Next() {
  const { n, meta, title } = STORY.next;
  return (
    // the target of the opener's "Next" line; focus lands here without a ring
    <section id="next" tabIndex={-1} aria-labelledby="next-title" className={`${SECTION} scroll-mt-6 pb-24`} style={{ outline: 'none' }}>
      <ChapterHead id="next-title" n={n} meta={meta} title={title} size="xl" />
      <Reveal as="p" delay={0.12} className="mt-6 max-w-[52ch] text-[1.125rem] leading-relaxed text-ink-muted">
        {CONTACT.availability} Based in {CONTACT.location}.
      </Reveal>
      <Reveal delay={0.18} className="mt-10 flex flex-wrap gap-3">
        <a href={`mailto:${CONTACT.email}`} className={PILL_SOLID}>
          Email me <ArrowDot />
        </a>
        <a href={CONTACT.linkedin} target="_blank" rel="noreferrer" className={PILL_LINE}>
          LinkedIn <span aria-hidden className="text-ink-subtle">↗</span>
        </a>
        <a href={CONTACT.github} target="_blank" rel="noreferrer" className={PILL_LINE}>
          GitHub <span aria-hidden className="text-ink-subtle">↗</span>
        </a>
        {CONTACT.resume && (
          <a href={CONTACT.resume} target="_blank" rel="noreferrer" className={PILL_LINE}>
            Résumé <span aria-hidden className="text-ink-subtle">↗</span>
          </a>
        )}
      </Reveal>
      {/* the work, on this site: a quiet line, not another contact pill */}
      <Reveal delay={0.24} className="mt-8 flex flex-col gap-2 text-sm">
        {/* a full load drops the 3D scene on purpose (unless a beat is playing) */}
        <PageLink href="/projects" className="group w-fit font-medium text-ink-muted transition-colors duration-200 hover:text-ink">
          Or see all {ENGINEERING_PROJECTS.length} projects{' '}
          <span aria-hidden className="inline-block transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </PageLink>
        <span className="text-ink-subtle">{CONTACT.email}</span>
      </Reveal>
    </section>
  );
}

export default function ObservatoryPanel() {
  const featured = EXPERIENCE.find((j) => j.featured);
  const { overflow } = STORY;

  return (
    <article className="w-full">
      {/* my name and the helmet, then the lead and 01–03 beside it */}
      <MeetMe>
        <Lead parts={STORY.lead} />
        {STORY.chapters.map((c) => (
          <Chapter key={c.n} chapter={c} />
        ))}
      </MeetMe>

      <div className="@container mx-auto max-w-6xl px-6 sm:px-12">
        {/* 04, Overflow: the target of the opener's "Most recently" line
            (focus lands here, without a ring around the whole section) */}
        <section
          id="experience"
          tabIndex={-1}
          aria-labelledby="overflow-title"
          className="scroll-mt-6 border-t border-line pt-10 lg:pt-12"
          style={{ outline: 'none' }}
        >
          <ChapterHead id="overflow-title" n={overflow.n} meta={[featured?.org, featured?.dates, 'Remote'].filter(Boolean)} title={overflow.title} />
          {featured && (
            <>
              <div className="mt-12 lg:mt-16">
                <Band label={overflow.band} stats={featured.stats} />
              </div>
              <div className="mt-14 lg:mt-20">
                <OverflowShowcase job={featured} variant="about" />
              </div>
            </>
          )}
        </section>

        {/* 05, now */}
        <section aria-label="Now" className={SECTION}>
          <Chapter chapter={STORY.now} wide />
        </section>

        <Skills />
        <Next />
      </div>
    </article>
  );
}
