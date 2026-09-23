'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CONTACT } from '@/data/about';
import { StationHeader, StationSection, stagger, rise } from './shared';

/**
 * Comms — the way to reach Allen: email (one-click copy), LinkedIn, GitHub,
 * the resume, and what he's looking for. The loudest, simplest room on the
 * planet, because it's the one recruiters need most.
 */
function Channel({ label, value, href, onCopy, copied }) {
  return (
    <motion.div variants={rise} className="mc-panel flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="mc-label">{label}</div>
        <a href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer" className="hero-link mt-1 inline-block truncate font-display text-xl font-semibold text-ink">
          {value}
        </a>
      </div>
      <div className="flex gap-2">
        {onCopy && (
          <button onClick={onCopy} className="skip-btn" style={{ paddingRight: '1rem' }}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        )}
        <a href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer" className="skip-btn" style={{ paddingRight: '1rem' }}>
          Open ↗
        </a>
      </div>
    </motion.div>
  );
}

const handle = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

export default function CommsPanel() {
  const [copied, setCopied] = useState(false);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the Open button still works */
    }
  };

  return (
    <motion.article variants={stagger} initial="hidden" animate="show" className="w-full">
      <StationHeader kicker="Comms" title="Let’s build something.">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-lg text-ink-muted">
            <span className="live-pulse h-2 w-2 rounded-full bg-live" />
            {CONTACT.availability}
          </span>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href={`mailto:${CONTACT.email}`} className="hero-cta">
            Email me <span aria-hidden className="hero-cta__arrow">→</span>
          </a>
          {CONTACT.resume ? (
            <a href={CONTACT.resume} target="_blank" rel="noreferrer" className="skip-btn" style={{ paddingRight: '1rem', height: '3.25rem' }}>
              Download resume ↓
            </a>
          ) : (
            <a
              href={`mailto:${CONTACT.email}?subject=${encodeURIComponent('Resume request')}`}
              className="skip-btn"
              style={{ paddingRight: '1rem', height: '3.25rem' }}
            >
              Request my resume
            </a>
          )}
        </div>
      </StationHeader>

      <div className="mx-auto max-w-6xl px-6 pb-16 sm:px-12">
        <StationSection label="Channels">
          <div className="flex max-w-3xl flex-col gap-3">
            <Channel label="Email" value={CONTACT.email} href={`mailto:${CONTACT.email}`} onCopy={copyEmail} copied={copied} />
            <Channel label="LinkedIn" value={handle(CONTACT.linkedin)} href={CONTACT.linkedin} />
            <Channel label="GitHub" value={handle(CONTACT.github)} href={CONTACT.github} />
          </div>
        </StationSection>
        <StationSection label="Based in">
          <motion.p variants={rise} className="text-lg text-ink-muted">
            {CONTACT.location}
          </motion.p>
        </StationSection>
      </div>
    </motion.article>
  );
}
