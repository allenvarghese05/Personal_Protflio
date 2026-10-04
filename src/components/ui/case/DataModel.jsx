'use client';

/**
 * DataModel — "15 models across five domains." The Prisma schema (v2.0) as a
 * calm grid: one card per domain, one row per model (name + what it holds),
 * then the enums as a chip row. Everything renders from DATA_MODEL in
 * src/data/studies/iet.js — counts are derived, never typed in.
 *
 * Layout: 1 column on mobile, 2 at md, 3 at lg, all five side by side at xl.
 * Each card carries a thin top rule in its domain's tone (ice for data, the
 * project accent for Application, jade for Security). Cards fade up in a
 * gentle stagger the first time the block scrolls into view; with reduced
 * motion everything is simply there.
 */
import { Fragment, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { DATA_MODEL } from '@/data/studies/iet';

/* ── constants ─────────────────────────────────────────────────────────── */
// The storage stack this schema runs on (projects.js: 'prisma', 'database')
const ENGINE = ['Prisma', 'PostgreSQL (Supabase)'];

const RULE_ALPHA = 0.6; // top rule — present, not loud
const RULE_PX = 2;
const STEP_S = 0.07; // stagger between blocks
const FADE_S = 0.6;
const RISE_PX = 14;
const IN_VIEW = { once: true, amount: 0.15 };

// Matches "deprecated — " at the start of a note; the chip already says it
const DEPRECATED_PREFIX = /^deprecated\s*[—–-]\s*/i;
// A parenthesised list of camelCase field names, e.g. "(isBanned, bannedUntil)"
const FIELD_LIST = /\(([a-z][A-Za-z0-9]*(?:,\s*[a-z][A-Za-z0-9]*)*)\)/;
// PascalCase words: "OTPCode" → OTP · Code, "BiAnnualActivityReport" → Bi · Annual …
const CAMEL_PART = /[A-Z]+(?![a-z])|[A-Z]?[a-z0-9]+/g;

const MODEL_COUNT = DATA_MODEL.domains.reduce((n, d) => n + d.models.length, 0);
const ENUM_COUNT = DATA_MODEL.enums.length;

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
function Note({ text, deprecated }) {
  const clean = deprecated ? text.replace(DEPRECATED_PREFIX, '') : text;
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
  const { name, note, deprecated } = model;
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <code
          className={`font-mono text-[13px] leading-snug ${
            deprecated ? 'text-ink-muted' : 'text-ink'
          }`}
        >
          {breakable(name)}
        </code>
        {deprecated && (
          <span className="mc-chip" style={{ padding: '3px 6px' }}>
            deprecated
          </span>
        )}
      </div>
      <p
        className={`mt-1 text-[13px] leading-normal ${
          deprecated ? 'text-ink-subtle' : 'text-ink-muted'
        }`}
      >
        <Note text={note} deprecated={deprecated} />
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

function Enums({ variants, order }) {
  return (
    <motion.div
      variants={variants}
      custom={order}
      className="mt-8 flex flex-col gap-3 border-t border-line pt-6 md:flex-row md:items-baseline md:gap-6"
    >
      <h3 className="mc-label shrink-0">Enums</h3>
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

      <Enums variants={rise} order={domains.length + 1} />
    </motion.div>
  );
}
