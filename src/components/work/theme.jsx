'use client';
/**
 * Light / dark for the projects page. Dark (the site's Signal Amber) is the
 * default; the résumé link (?theme=light) opens it light, and a choice made
 * with the toggle is remembered and wins (see resolveWorkTheme).
 *
 * The theme lives on <html data-work-theme="light"> so it can be set before
 * first paint (THEME_SCRIPT in ./themeScript.js runs inline, ahead of the page's markup) and so
 * the page background behind overscroll matches. It's removed when the page
 * unmounts: the game and the case-study pages are dark-only.
 */
import { useCallback, useLayoutEffect, useSyncExternalStore } from 'react';
import { THEME_KEY as KEY, resolveWorkTheme } from './themeScript';

const html = () => document.documentElement;

function apply(theme) {
  if (theme === 'light') html().dataset.workTheme = 'light';
  else delete html().dataset.workTheme;
}

// <html data-work-theme> is the source of truth; React subscribes to it
function subscribe(onChange) {
  const mo = new MutationObserver(onChange);
  mo.observe(html(), { attributes: true, attributeFilter: ['data-work-theme'] });
  return () => mo.disconnect();
}
const getSnapshot = () => (html().dataset.workTheme === 'light' ? 'light' : 'dark');
const getServerSnapshot = () => 'dark';

export function useWorkTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // before paint on client-side navigation too, where the inline script
  // doesn't run; and off again when the page goes (the rest is dark-only)
  useLayoutEffect(() => {
    apply(resolveWorkTheme());
    return () => apply('dark');
  }, []);

  const toggle = useCallback(() => {
    const next = getSnapshot() === 'light' ? 'dark' : 'light';
    const root = document.querySelector('.work-root');
    // swap every token at once rather than letting each surface ease alone
    root?.classList.add('is-theming');
    apply(next);
    requestAnimationFrame(() => requestAnimationFrame(() => root?.classList.remove('is-theming')));
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* not persisted; still switches */
    }
  }, []);

  return [theme, toggle];
}

function Sun() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="10" cy="10" r="3.6" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        return <line key={a} x1={10 + Math.cos(r) * 6.2} y1={10 + Math.sin(r) * 6.2} x2={10 + Math.cos(r) * 8.2} y2={10 + Math.sin(r) * 8.2} />;
      })}
    </svg>
  );
}

function Moon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M16.2 12.4A6.6 6.6 0 0 1 7.6 3.8a6.6 6.6 0 1 0 8.6 8.6Z" />
    </svg>
  );
}

export function ThemeToggle({ theme, onToggle }) {
  const light = theme === 'light';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      title={light ? 'Dark mode' : 'Light mode'}
      className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-ink-muted transition-[background-color,color,transform] duration-200 hover:bg-surface-2 hover:text-ink active:scale-[0.94]"
    >
      <span className={`absolute transition-[opacity,transform] duration-300 ${light ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}>
        <Moon />
      </span>
      <span className={`absolute transition-[opacity,transform] duration-300 ${light ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`}>
        <Sun />
      </span>
    </button>
  );
}
