'use client';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { PALETTE, PALETTE_LIGHT } from './palette';
import { THEME_KEY, resolveTheme } from './theme';

/**
 * The site's theme, for React. <html data-theme> is the source of truth (set
 * before paint by THEME_SCRIPT in the root layout); components subscribe to
 * it, so a toggle anywhere updates everything, including canvases and the 3D
 * scenes that read colours from usePalette().
 */
const html = () => document.documentElement;

export function applyTheme(theme) {
  if (theme === 'light') html().dataset.theme = 'light';
  else delete html().dataset.theme;
}

function subscribe(onChange) {
  const mo = new MutationObserver(onChange);
  mo.observe(html(), { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}
const getSnapshot = () => (html().dataset.theme === 'light' ? 'light' : 'dark');
const getServerSnapshot = () => 'dark';

/** 'light' | 'dark' — re-renders when it changes. */
export function useThemeValue() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** The palette (hex values) for the theme in force: for canvas, SVG
 *  attributes and three.js materials, which can't read CSS variables. */
export function usePalette() {
  return useThemeValue() === 'light' ? PALETTE_LIGHT : PALETTE;
}

/** [theme, toggle]. Also follows the device setting live until someone
 *  makes a choice with the toggle. */
export function useTheme() {
  const theme = useThemeValue();

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!mq) return undefined;
    const onChange = () => {
      try {
        if (localStorage.getItem(THEME_KEY) || localStorage.getItem('work-theme')) return;
      } catch {
        /* no storage: follow the device */
      }
      applyTheme(resolveTheme());
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    const next = getSnapshot() === 'light' ? 'dark' : 'light';
    // swap every token at once rather than letting each surface ease alone
    html().classList.add('is-theming');
    applyTheme(next);
    requestAnimationFrame(() => requestAnimationFrame(() => html().classList.remove('is-theming')));
    try {
      localStorage.setItem(THEME_KEY, next);
      localStorage.removeItem('work-theme');
    } catch {
      /* not persisted; still switches */
    }
  }, []);

  return [theme, toggle];
}
