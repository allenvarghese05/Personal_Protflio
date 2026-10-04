'use client';

/**
 * CodeBlock — a quiet, dependency-free code listing for the case studies.
 *
 * Header bar: the file path (mono), a "Simplified for illustration" tag and a
 * copy button. Body: line numbers in a sticky gutter, the code in a <pre>
 * that scrolls sideways inside itself — never the page — with a right-edge
 * fade while more code hides past it (scrollbars are off site-wide). Syntax
 * tint is a single per-line regex pass: comments, strings, a handful of
 * keywords and numbers; everything else stays ink-muted. Line numbers are decorative
 * (aria-hidden, unselectable) so a copy is just the code.
 *
 * Props: code = { file, lang, body } (see DECISIONS in src/data/studies/iet.js).
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

/* ── constants ─────────────────────────────────────────────────────────── */
const COPIED_MS = 1600; // how long "Copied" shows before reverting

// One pass, leftmost match wins — so a "//" inside a string stays a string.
// Groups: 1 comment · 2 string · 3 keyword · 4 number
const TOKEN_RE =
  /(\/\/.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(const|export|async|function|await|return|let)\b|\b(\d+(?:\.\d+)?)\b/g;

// Token kind → text colour. Comments use ink-subtle, not ink-faint: they
// carry meaning here ("any throw → every write above rolls back").
const TONE = {
  comment: 'text-ink-subtle italic',
  string: 'text-jade',
  keyword: 'text-lilac',
  number: 'text-sand',
  plain: 'text-ink-muted',
};

/* ── helpers ───────────────────────────────────────────────────────────── */

/** True while code runs past the scroller's right edge. Scrollbars are hidden
 *  site-wide, so this drives a fade that says "there's more this way". */
function hasMoreRight(el) {
  return Math.ceil(el.scrollLeft) + el.clientWidth < el.scrollWidth - 1;
}

/** One line of source → [{ kind, text }] in order. */
function tokenize(line) {
  const out = [];
  let last = 0;
  for (const m of line.matchAll(TOKEN_RE)) {
    if (m.index > last) out.push({ kind: 'plain', text: line.slice(last, m.index) });
    const kind = m[1] ? 'comment' : m[2] ? 'string' : m[3] ? 'keyword' : 'number';
    out.push({ kind, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ kind: 'plain', text: line.slice(last) });
  return out;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    const t = timer;
    return () => clearTimeout(t.current);
  }, []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return; // no clipboard (insecure context / denied) — stay quiet
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="mc-ghost-btn rounded-chip px-2 py-1.5 uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      style={copied ? { color: 'var(--jade)' } : undefined}
    >
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

/* ── component ─────────────────────────────────────────────────────────── */

export default function CodeBlock({ code }) {
  const { file, lang, body } = code;
  const lines = useMemo(() => body.split('\n').map(tokenize), [body]);
  const last = lines.length - 1;
  const scrollerRef = useRef(null);
  const preRef = useRef(null);
  const [more, setMore] = useState(false);

  // Re-check on any size change of the viewport or the code itself (the
  // mono font swapping in widens it); scrolling re-checks via onScroll.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setMore(hasMoreRight(el)));
    ro.observe(el);
    if (preRef.current) ro.observe(preRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <figure
      className="min-w-0 overflow-hidden rounded-panel border border-line bg-void"
      data-lang={lang}
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
        <span className="min-w-0 font-mono text-label text-ink-muted [overflow-wrap:anywhere]">
          {file}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="mc-chip">Simplified for illustration</span>
          <CopyButton text={body} />
        </span>
      </figcaption>

      <div className="relative">
        {/* the only horizontal scroller — the page never scrolls sideways.
            Its focus ring is the overlay below (the figure clips an outside
            outline, and the sticky gutter would cover an inset one). */}
        <div
          ref={scrollerRef}
          role="region"
          aria-label={`Code: ${file}`}
          tabIndex={0}
          onScroll={(e) => setMore(hasMoreRight(e.currentTarget))}
          className="peer flex overflow-x-auto font-mono text-[12.5px] leading-[1.75]"
          style={{ outline: 'none' }}
        >
          <div
            aria-hidden="true"
            className="sticky left-0 shrink-0 select-none border-r border-line bg-void py-4 pl-4 pr-3 text-right tabular-nums text-ink-faint"
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre ref={preRef} className="m-0 flex-1 py-4 pl-4 pr-6">
            <code className="whitespace-pre">
              {lines.map((tokens, i) => (
                <Fragment key={i}>
                  {tokens.map((tok, j) => (
                    <span key={j} className={TONE[tok.kind]}>
                      {tok.text}
                    </span>
                  ))}
                  {i < last && '\n'}
                </Fragment>
              ))}
            </code>
          </pre>
        </div>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-0 w-10 transition-opacity duration-200 motion-reduce:transition-none ${more ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(to left, var(--void), transparent)' }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden rounded-b-[calc(var(--radius-panel)_-_1px)] border-2 border-accent peer-focus-visible:block"
        />
      </div>
    </figure>
  );
}
