'use client';

/**
 * DataModel — "N models across M domains." The Prisma schema as a calm grid:
 * one card per domain, one row per model (name + what it holds), then a small
 * step chart of how the schema grew, then the enums as a chip row with their
 * value counts. Everything renders from DATA_MODEL in src/data/studies/iet.js
 * — the summary line (model count, enum count, engine) and every count are
 * derived, never typed in. A model flagged `deprecated` (in the schema,
 * nothing uses it yet) is dimmed and tagged "unused" with the same dashed tag
 * the lifecycle gives a status the server never writes.
 *
 * Layout: 1 column on mobile, 2 at md, 3 at lg, all five domains side by side
 * at xl. Each card carries a thin top rule in its domain's tone (ice for
 * data, the project accent for Application, jade for Platform & audit). The
 * growth chart spaces its dated entries evenly (an entry per change, not a
 * time axis) and draws hairline steps from fixed data — the current count
 * alone in the accent. Cards, chart and enums fade up in a gentle stagger the
 * first time the block scrolls into view; with reduced motion everything is
 * simply there.
 */
import { Fragment, useId, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { DATA_MODEL } from '@/data/studies/iet';

/* ── constants ─────────────────────────────────────────────────────────── */
// What the schema runs on, split at its own " · " so the summary line sets
// each part with the same separators as the counts
const ENGINE = DATA_MODEL.engine.split(/\s*·\s*/).filter(Boolean);

const RULE_ALPHA = 0.6; // top rule — present, not loud
const RULE_PX = 2;
const STEP_S = 0.07; // stagger between blocks
const FADE_S = 0.6;
const RISE_PX = 14;
const IN_VIEW = { once: true, amount: 0.15 };

// Matches "deprecated — " / "unused — " at the start of a note; the tag says it
const UNUSED_PREFIX = /^(?:deprecated|unused)\s*[—–-]\s*/i;
const UNUSED_TAG = 'unused';
// A parenthesised list of camelCase field names, e.g. "(isBanned, bannedUntil)"
const FIELD_LIST = /\(([a-z][A-Za-z0-9]*(?:,\s*[a-z][A-Za-z0-9]*)*)\)/;
// PascalCase words: "OTPCode" → OTP · Code, "BiAnnualActivityReport" → Bi · Annual …
const CAMEL_PART = /[A-Z]+(?![a-z])|[A-Z]?[a-z0-9]+/g;

const MODEL_COUNT = DATA_MODEL.domains.reduce((n, d) => n + d.models.length, 0);
const ENUM_COUNT = DATA_MODEL.enums.length;

// Shared label column for the rows under the cards, so their content lines up
const ROW_LABEL = 'mc-label shrink-0 md:w-32';

/* ── how the schema grew — fixed geometry from DATA_MODEL.growth ──────────── */
const GROWTH = DATA_MODEL.growth ?? [];
const GROWTH_LABEL = 'Schema growth';
const GROWTH_STEP_S = 0.08; // the steps fade in left → right, after the row
const GROWTH_LEAD_S = 0.2;
const GROWTH_MAX = Math.max(...GROWTH.map((g) => g.models));
// the floor sits one model under the first count, so the first step is off the
// floor and each added model is the same rise; every step carries its number
const GROWTH_FLOOR = Math.min(...GROWTH.map((g) => g.models)) - 1;
const levelOf = (n) => ((n - GROWTH_FLOOR) / (GROWTH_MAX - GROWTH_FLOOR)) * 100; // % of plot height
const GROWTH_STEPS = GROWTH.map((g, i) => ({
  ...g,
  level: levelOf(g.models),
  prev: i > 0 ? levelOf(GROWTH[i - 1].models) : null,
  last: i === GROWTH.length - 1,
}));

/** Domain key → the tone of its top rule. Data domains stay ice. */
function toneFor(key, accent) {
  if (key === 'application') return accent;
  if (key === 'security') return P.jade;
  return P.ice;
}

/* ── small helpers ─────────────────────────────────────────────────────── */

/** Soft line-break opportunities at PascalCase boundaries, so a long model
 *  name ("ApplicationStatusHistory") wraps between words in a narrow column
 *  instead of mid-word — and copies back out as one unbroken identifier. */
function breakable(name) {
  const parts = name.match(CAMEL_PART);
  if (!parts || parts.join('') !== name) return name;
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
    </Fragment>
  ));
}

/** A note as prose, with any "(fieldA, fieldB)" list set as code. */
function Note({ text, unused }) {
  const clean = unused ? text.replace(UNUSED_PREFIX, '') : text;
  const m = clean.match(FIELD_LIST);
  if (!m) return clean;
  const before = clean.slice(0, m.index);
  const after = clean.slice(m.index + m[0].length);
  return (
    <>
      {before}(
      {m[1].split(/,\s*/).map((field, i) => (
        <Fragment key={field}>
          {i > 0 && ', '}
          <code className="font-mono text-label text-ink-subtle">{field}</code>
        </Fragment>
      ))}
      ){after}
    </>
  );
}

/** Fade-up variants; `custom` is the block's order in the stagger. */
function makeRise(reduced) {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : RISE_PX },
    show: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: reduced
        ? { duration: 0 }
        : { duration: FADE_S, ease: EASE_OUT, delay: i * STEP_S },
    }),
  };
}

/* ── pieces ────────────────────────────────────────────────────────────── */

function Summary({ variants }) {
  const parts = [
    { key: 'models', n: MODEL_COUNT, text: 'models' },
    { key: 'enums', n: ENUM_COUNT, text: 'enums' },
    ...ENGINE.map((text) => ({ key: text, text })),
  ];
  return (
    <motion.p
      variants={variants}
      custom={0}
      className="font-mono text-label text-ink-subtle"
    >
      {parts.map((p, i) => (
        <Fragment key={p.key}>
          {i > 0 && (
            <span aria-hidden="true" className="mx-2 text-ink-faint">
              ·
            </span>
          )}
          {p.n != null && <span className="tabular-nums text-ink">{p.n} </span>}
          {p.text}
        </Fragment>
      ))}
    </motion.p>
  );
}

function ModelRow({ model }) {
  const { name, note } = model;
  // `deprecated` in the data: in the schema, but nothing reads or writes it yet
  const unused = Boolean(model.deprecated);
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <code
          className={`font-mono text-[13px] leading-snug ${
            unused ? 'text-ink-muted' : 'text-ink'
          }`}
        >
          {breakable(name)}
        </code>
        {unused && (
          // hollow and dashed, like the lifecycle's never-written statuses
          <span className="inline-flex items-center rounded-chip border border-dashed border-line-hi px-1.5 font-mono text-micro leading-normal text-ink-subtle">
            {UNUSED_TAG}
          </span>
        )}
      </div>
      <p
        className={`mt-1 text-[13px] leading-normal ${
          unused ? 'text-ink-subtle' : 'text-ink-muted'
        }`}
      >
        <Note text={note} unused={unused} />
      </p>
    </li>
  );
}

function DomainCard({ domain, tone, variants, order }) {
  const count = domain.models.length;
  return (
    <motion.li
      variants={variants}
      custom={order}
      className="relative flex min-w-0 flex-col overflow-hidden rounded-panel border border-line bg-surface"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0"
        style={{ height: RULE_PX, background: alpha(tone, RULE_ALPHA) }}
      />
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 pb-3 pt-4">
        {/* .mc-label sets its own colour; the inline style lifts it a step */}
        <h3 className="mc-label leading-normal xl:min-h-[3em]" style={{ color: P.inkMuted }}>
          {domain.label}
        </h3>
        <span className="shrink-0 font-mono text-label leading-normal tabular-nums text-ink-subtle">
          {count}
          <span className="sr-only"> {count === 1 ? 'model' : 'models'}</span>
        </span>
      </header>
      <ul className="flex-1 divide-y divide-line px-4 py-4">
        {domain.models.map((model) => (
          <ModelRow key={model.name} model={model} />
        ))}
      </ul>
    </motion.li>
  );
}

/** Fade-in for one step of the growth chart; `custom` is its index. */
function makeStep(reduced, base) {
  return {
    hidden: { opacity: 0 },
    show: (i = 0) => ({
      opacity: 1,
      transition: reduced
        ? { duration: 0 }
        : { duration: FADE_S, ease: EASE_OUT, delay: base + GROWTH_LEAD_S + i * GROWTH_STEP_S },
    }),
  };
}

/**
 * How the schema grew: one evenly spaced column per dated entry. A column's
 * riser climbs from the previous count at its left edge, its tread holds the
 * count until the next entry (the last runs to the edge — still true today),
 * a dot marks the date, the number sits above. Hairlines in ink; the current
 * count, and the step that reached it, in the accent.
 */
function Growth({ variants, order, accent, reduced }) {
  const headId = useId();
  const step = makeStep(reduced, order * STEP_S);
  return (
    <motion.div
      variants={variants}
      custom={order}
      className="mt-8 flex flex-col gap-3 border-t border-line pt-6 md:flex-row md:items-start md:gap-6"
    >
      <h3 id={headId} className={ROW_LABEL}>
        {GROWTH_LABEL}
      </h3>
      <ol aria-labelledby={headId} className="flex w-full min-w-0 max-w-[30rem]">
        {GROWTH_STEPS.map((g, i) => {
          const color = g.last ? accent : P.inkSubtle;
          return (
            <motion.li key={`${g.when}-${i}`} variants={step} custom={i} className="min-w-0 flex-1">
              <span className="sr-only">
                {g.when}: {g.models} models
              </span>
              <div aria-hidden="true" className="pt-5">
                <div className="relative h-10 border-b border-line">
                  {g.prev != null && g.prev !== g.level ? (
                    <span
                      className="absolute left-0 w-px"
                      style={{
                        bottom: `${Math.min(g.prev, g.level)}%`,
                        height: `${Math.abs(g.level - g.prev)}%`,
                        background: color,
                      }}
                    />
                  ) : null}
                  <span
                    className="absolute inset-x-0 h-px"
                    style={{ bottom: `${g.level}%`, background: color }}
                  />
                  <span
                    className="absolute -left-[2px] h-[5px] w-[5px] rounded-full"
                    style={{ bottom: `calc(${g.level}% - 2px)`, background: g.last ? accent : P.inkMuted }}
                  />
                  <span
                    className={`absolute left-0 font-mono text-micro leading-none tabular-nums ${
                      g.last ? '' : 'text-ink-subtle'
                    }`}
                    style={{ bottom: `calc(${g.level}% + 6px)`, ...(g.last ? { color: accent } : null) }}
                  >
                    {g.models}
                  </span>
                </div>
                <span
                  className={`mt-1.5 block whitespace-nowrap font-mono text-micro ${
                    g.last ? 'text-ink-muted' : 'text-ink-subtle'
                  }`}
                >
                  {g.when}
                </span>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </motion.div>
  );
}

function Enums({ variants, order }) {
  return (
    <motion.div
      variants={variants}
      custom={order}
      className="mt-8 flex flex-col gap-3 border-t border-line pt-6 md:flex-row md:items-baseline md:gap-6"
    >
      <h3 className={ROW_LABEL}>Enums</h3>
      <ul className="flex flex-wrap gap-2">
        {DATA_MODEL.enums.map((e) => (
          <li key={e.name} className="mc-chip">
            <span className="text-ink-muted">{e.name}</span>
            {e.count != null && (
              <>
                <span aria-hidden="true" className="mx-1.5 text-ink-faint">
                  ·
                </span>
                <span className="tabular-nums text-ink">{e.count}</span>
                <span className="sr-only"> values</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/* ── the block ─────────────────────────────────────────────────────────── */

export default function DataModel({ accent = P.accent, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, IN_VIEW);
  const reduced = useReducedMotion();
  const rise = makeRise(reduced);
  const { domains } = DATA_MODEL;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={reduced || inView ? 'show' : 'hidden'}
      className={`min-w-0 ${className}`}
    >
      <Summary variants={rise} />

      <ul
        aria-label={`${MODEL_COUNT} Prisma models in ${domains.length} domains`}
        className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        {domains.map((domain, i) => (
          <DomainCard
            key={domain.key}
            domain={domain}
            tone={toneFor(domain.key, accent)}
            variants={rise}
            order={i + 1}
          />
        ))}
      </ul>

      {GROWTH_STEPS.length > 1 ? (
        <Growth variants={rise} order={domains.length + 1} accent={accent} reduced={reduced} />
      ) : null}

      <Enums variants={rise} order={domains.length + 2} />
    </motion.div>
  );
}
