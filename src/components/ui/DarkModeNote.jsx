'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { applyTheme, useThemeValue } from '@/lib/useTheme';
import { THEME_KEY, LANDING_KEY } from '@/lib/theme';

const DISMISSED_KEY = 'dark-note-dismissed';

/**
 * A visit that starts on /projects is light (see src/lib/theme.js) and stays
 * light when it comes over to the 3D side. This card says the 3D side was
 * made for the dark and offers the switch. Shown only when the light came
 * from landing on /projects: never to someone who picked light with the
 * toggle, and not again in this visit once closed or used.
 */
export default function DarkModeNote() {
  const theme = useThemeValue();
  const tier = useStore((s) => s.tier);
  const phase = useStore((s) => s.phase);
  const journeyPhase = useStore((s) => s.journeyPhase);
  const [eligible, setEligible] = useState(false);

  // storage is only readable after mount
  useEffect(() => {
    try {
      const chose = localStorage.getItem(THEME_KEY) || localStorage.getItem('work-theme');
      const landedLight = sessionStorage.getItem(LANDING_KEY) === 'light';
      const dismissed = sessionStorage.getItem(DISMISSED_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount read
      setEligible(!chose && landedLight && !dismissed);
    } catch {
      /* no storage: no note */
    }
  }, []);

  // not over the loader or the dive's cinematic: on the name card, the
  // world, and the plain (base tier) page
  const calm = tier === 'base' || journeyPhase === 'world' || phase === 'hero';
  const show = eligible && theme === 'light' && calm;

  const close = () => {
    setEligible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* closes for now anyway */
    }
  };

  const goDark = () => {
    const html = document.documentElement;
    html.classList.add('is-theming');
    applyTheme('dark');
    requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove('is-theming')));
    // for this visit, like the landing theme (the toggle is the lasting choice)
    try {
      sessionStorage.setItem(LANDING_KEY, 'dark');
    } catch {
      /* switches anyway */
    }
    close();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.25 } }}
          className="fixed bottom-6 left-6 z-[240] w-[min(20rem,calc(100vw-3rem))] rounded-2xl border border-ink/15 bg-void/70 p-4 text-ink shadow-[0_10px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-[14px] sm:bottom-8 sm:left-10"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
          <p className="pr-6 text-sm leading-relaxed">
            I built this side of the site for the dark. It looks its best there.
          </p>
          <button
            type="button"
            onClick={goDark}
            className="mt-3 inline-flex h-8 items-center gap-2 rounded-full bg-ink px-3.5 text-xs font-medium text-void transition-opacity hover:opacity-85"
          >
            <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
              <path d="M16.2 12.4A6.6 6.6 0 0 1 7.6 3.8a6.6 6.6 0 1 0 8.6 8.6Z" />
            </svg>
            Switch to dark
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
