'use client';
import { Fragment, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { EASE_OUT } from '@/lib/motion';
import Figure from '@/components/work/Figure';

/**
 * The About room's story, as a magazine profile: a lead paragraph, then
 * numbered chapters whose titles read as one paragraph. Each chapter is a
 * meta line, a title, a few sentences, the figures that prove it, the roles
 * behind it, and where to read more. No cards: hairlines and space.
 *
 * Everything rises once as it arrives, on the browser's own scroll; the
 * figures settle as they come into view (see work/Figure).
 */

/** One size for every chapter title (01, 02, 03, 05) and for Skills: only
 *  04's and 06's heads, which open the full-width half and close the page,
 *  are bigger. */
export const TITLE_SIZE = 'text-[clamp(1.625rem,2.5vw,2.25rem)] leading-[1.1] tracking-[-0.028em]';

/** Rises into place once, the first time it's on screen. */
export function Reveal({ as = 'div', delay = 0, className = '', children, ...rest }) {
  const reduce = useReducedMotion();
  const M = motion[as];
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay }}
      {...rest}
    >
      {children}
    </M>
  );
}

/**
 * Opens a case study or another room from this one. Back (and Esc) returns
 * here, to the same scroll; the new view starts at its top and takes focus
 * (see Fresh in MissionControl.jsx).
 */
export function useRoomLink() {
  const openProject = useStore((s) => s.openProject);
  const setEnteredZone = useStore((s) => s.setEnteredZone);
  // `key` is the clicked control's data-return-key: Back focuses it again
  return useCallback(
    (to, key) => (e) => {
      const scroller = e.currentTarget.closest('[data-mc-scroll]');
      const zone = useStore.getState().enteredZone;
      useStore.setState({ returnTo: zone ? { zone, scrollTop: scroller?.scrollTop ?? 0, key } : null, focusOnEnter: true });
      if (to.project) openProject(to.project);
      else if (to.zone) setEnteredZone(to.zone);
    },
    [openProject, setEnteredZone]
  );
}

/** "01 · Drexel · 2023": the chapter's number in amber, then the rest. */
export function Meta({ n, parts = [] }) {
  return (
    <p className="font-mono text-micro uppercase tracking-[0.18em] text-ink-subtle">
      {n && <span className="text-accent">{n}</span>}
      {parts.map((p, i) => (n || i > 0 ? ` · ${p}` : p)).join('')}
    </p>
  );
}

/** A title whose hyphenated words never break across a line ("co-op"). */
function Unbroken({ text }) {
  return text.split(' ').map((w, i) => (
    <Fragment key={i}>
      {i > 0 && ' '}
      {w.includes('-') ? <span className="whitespace-nowrap">{w}</span> : w}
    </Fragment>
  ));
}

/** The opening paragraph: three sentences in three tones (ink, muted, ink). */
export function Lead({ parts }) {
  return (
    <Reveal
      as="p"
      className="max-w-[26ch] text-pretty font-display text-[clamp(1.5rem,2.3vw,2.125rem)] font-medium leading-[1.22] tracking-[-0.022em]"
    >
      {parts.map((p, i) => (
        <span key={p.text} className={p.tone === 'muted' ? 'text-ink-muted' : 'text-ink'}>
          {i > 0 && ' '}
          {p.text}
        </span>
      ))}
    </Reveal>
  );
}

/** A chapter's figures, two across, each over its caption. */
function Proofs({ items }) {
  return (
    <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-x-8">
      {items.map((it, i) => (
        <div key={it.value} className="flex min-w-0 flex-col">
          <dt className="order-last mt-3 max-w-[24ch] text-balance text-sm leading-snug text-ink-subtle">{it.label}</dt>
          <dd className="font-display text-[clamp(1.875rem,2.4vw,2.25rem)] font-semibold leading-none tracking-[-0.04em] text-ink">
            <Figure value={it.value} delay={i * 120} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The roles behind a chapter, quietly: "Role, Org · dates". */
function Ledger({ items }) {
  return (
    <ul className="mt-8 flex flex-col gap-1.5 text-[0.8125rem] leading-snug text-ink-subtle">
      {items.map((r) => (
        <li key={`${r.role}-${r.org}`}>
          <span className="text-ink-muted">{r.role}</span>, {r.org} <span className="whitespace-nowrap">· {r.dates}</span>
        </li>
      ))}
    </ul>
  );
}

/** Where to read more: case studies, or another room. */
function Links({ items }) {
  const go = useRoomLink();
  return (
    <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
      {items.map((l) => (
        <button
          key={l.label}
          type="button"
          onClick={go(l, `story-${l.project || l.zone}`)}
          data-return-key={`story-${l.project || l.zone}`}
          className="group inline-flex items-center gap-1.5 py-1 text-sm font-medium text-ink transition-colors duration-200 hover:text-accent-hi"
        >
          {l.label}
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * One chapter. Beside the helmet (01–03) it's a single column under a
 * hairline; `wide` (05, full width) puts the meta and title on the left and
 * the rest on the right from `lg`.
 */
export function Chapter({ chapter, wide = false }) {
  const { n, meta, title, body, proofs, ledger, links } = chapter;
  const head = (
    <>
      <Reveal>
        <Meta n={n} parts={meta} />
      </Reveal>
      <Reveal
        as="h3"
        delay={0.07}
        className={`mt-4 text-balance font-display font-semibold text-ink ${TITLE_SIZE} ${wide ? 'max-w-[20ch]' : 'max-w-[22ch]'}`}
      >
        <Unbroken text={title} />
      </Reveal>
    </>
  );
  const rest = (
    <>
      <Reveal as="p" delay={0.14} className={`max-w-[46ch] text-base leading-[1.7] text-ink-muted ${wide ? 'mt-6 @[60rem]:mt-9' : 'mt-4'}`}>
        {body}
      </Reveal>
      {proofs && (
        <Reveal delay={0.21}>
          <Proofs items={proofs} />
        </Reveal>
      )}
      {ledger && (
        <Reveal delay={0.21}>
          <Ledger items={ledger} />
        </Reveal>
      )}
      {links && (
        <Reveal delay={0.21}>
          <Links items={links} />
        </Reveal>
      )}
    </>
  );

  if (wide) {
    return (
      // the full-width half's 4 / 8 grid, switching with the same container
      // width as the Overflow write-up above it (see ObservatoryPanel)
      <article className="@[60rem]:grid @[60rem]:grid-cols-12 @[60rem]:gap-x-14">
        <div className="@[60rem]:col-span-4">{head}</div>
        <div className="@[60rem]:col-span-8 @[60rem]:col-start-5">{rest}</div>
      </article>
    );
  }
  return (
    <article className="mt-20 border-t border-line pt-10 split:mt-28">
      {head}
      {rest}
    </article>
  );
}

// 06 closes at the size of my name in the opener
const HEAD_SIZE = {
  lg: 'max-w-[20ch] text-[clamp(2rem,4.2vw,3.75rem)] leading-[1.02] tracking-[-0.035em]',
  xl: 'max-w-[16ch] text-[clamp(2.75rem,5.2vw,5rem)] leading-[0.95] tracking-[-0.045em]',
};

/** The head of a full-width chapter (04, 06): its meta line over a big title. */
export function ChapterHead({ n, meta, title, size = 'lg', id }) {
  return (
    <div>
      <Reveal>
        <Meta n={n} parts={meta} />
      </Reveal>
      <Reveal as="h3" id={id} delay={0.07} className={`mt-5 text-balance font-display font-semibold text-ink ${HEAD_SIZE[size]}`}>
        <Unbroken text={title} />
      </Reveal>
    </div>
  );
}

/**
 * Figures across the full width, ruled above and below: three cells with
 * hairline dividers from `md`, three ruled rows (figure left, caption right)
 * on phones.
 */
export function Band({ label, stats }) {
  return (
    <div>
      <Reveal className="mc-label">{label}</Reveal>
      <dl className="mt-4 grid grid-cols-1 border-y border-line md:grid-cols-3">
        {stats.map((s, i) => (
          <Reveal
            key={s.label}
            delay={i * 0.12}
            className="grid grid-cols-[11rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 border-t border-line py-4 first:border-t-0 max-[22rem]:grid-cols-1 md:flex md:flex-col md:border-l md:border-t-0 md:py-10 md:pl-8 md:first:border-l-0 md:first:pl-0"
          >
            <dt className="text-balance text-sm leading-snug text-ink-subtle md:mt-3">{s.label}</dt>
            <dd className="order-first font-display text-[2.25rem] font-semibold leading-none tracking-[-0.04em] text-ink md:text-[clamp(2.25rem,3.4vw,3rem)]">
              <Figure value={s.value} delay={i * 120} />
            </dd>
          </Reveal>
        ))}
      </dl>
    </div>
  );
}
