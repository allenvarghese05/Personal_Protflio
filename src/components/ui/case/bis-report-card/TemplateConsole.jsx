'use client';

/**
 * TemplateConsole — the school's control panel for card formats. A card is a
 * template stored as data: a definition (terms, subjects, grading, …) and a
 * print layout (page settings plus an ordered list of blocks). In the admin
 * console the school edits both, the server checks them against the schema,
 * and the next print uses the new format — no code change, no redeploy.
 *
 * Left: the selected layout as a sheet of paper, its blocks in print order.
 * Right: what a template defines and what the page settings control. Footer:
 * the four steps from edit to print. Below: the guard that stops a redesign
 * from re-grading cards that are already approved.
 *
 * Renders only from TEMPLATE_CONSOLE in src/data/studies/bis-report-card.js.
 * Reduced motion: the blocks are simply there.
 */
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PALETTE as P } from '@/lib/palette';
import { EASE_OUT } from '@/lib/motion';
import { TEMPLATE_CONSOLE as C } from '@/data/studies/bis-report-card';
import { Choices, PanelFrame } from '@/components/ui/case/kit';

function List({ title, items }) {
  return (
    <div className="min-w-0">
      <p className="mc-label">{title}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((t) => (
          <li key={t} className="mc-chip">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TemplateConsole({ accent = P.accent }) {
  const reduce = useReducedMotion();
  const [key, setKey] = useState(C.layouts[0].key);
  const layout = C.layouts.find((l) => l.key === key);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h3 className="font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink">The template console</h3>
        <p className="mt-3 max-w-[70ch] text-body text-ink-muted">{C.intro}</p>
      </div>

      <PanelFrame
        caption="Admin · Templates"
        controls={<Choices label="Layouts" options={C.layouts.map((l) => ({ key: l.key, label: l.label }))} value={key} onChoose={setKey} accent={accent} />}
        footer={
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-label text-ink-muted">
            {C.steps.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className="font-mono tabular-nums" style={{ color: accent }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{s}</span>
                {i < C.steps.length - 1 && (
                  <span aria-hidden className="px-1 text-ink-faint">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        }
      >
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="mx-auto w-full max-w-[300px]">
            <div className="rounded-[6px] border border-line-hi bg-surface-2 p-4" style={{ aspectRatio: '1 / 1.414' }}>
              <ol aria-label={`${layout.label}, blocks in print order`} className="flex h-full flex-col gap-1.5">
                {layout.blocks.map((b, i) => (
                  <motion.li
                    key={`${key}-${b}`}
                    initial={reduce ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT, delay: i * 0.05 }}
                    className="flex min-h-0 flex-1 items-center gap-2 rounded-[3px] border border-line px-2 font-mono text-micro text-ink-muted"
                  >
                    <span className="tabular-nums text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
                    <span className="truncate">{b}</span>
                  </motion.li>
                ))}
              </ol>
            </div>
            <p className="mt-3 text-center font-mono text-micro text-ink-subtle">a block list, not pixel positions — prints the same on screen and in Chromium</p>
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <List title="What a template defines" items={C.definition} />
            <List title="What the print layout controls" items={C.page} />
          </div>
        </div>
      </PanelFrame>

      <p className="flex max-w-[72ch] gap-3 text-label text-ink-muted">
        <span aria-hidden className="mt-[7px] h-[2px] w-3 shrink-0 rounded-full bg-sand" />
        <span>{C.guard}</span>
      </p>
    </div>
  );
}
