/**
 * Light or dark, for the whole site. Plain module (not 'use client') so the
 * root layout can inline THEME_SCRIPT, which runs before anything paints and
 * so never flashes the wrong theme.
 *
 * The theme lives on <html data-theme="light"> (dark has no attribute: it's
 * the :root palette, Signal Amber). In order:
 *   1. the toggle: a choice someone made is kept (localStorage) and wins
 *   2. the résumé link (?theme=light): light for the rest of that visit
 *   3. otherwise the visitor's device setting (prefers-color-scheme)
 *
 * resolveTheme is the one copy of this rule: useTheme calls it, and
 * THEME_SCRIPT is its own source, so everything it needs is written inline.
 */
export const THEME_KEY = 'theme';

export function resolveTheme() {
  const linked = new URLSearchParams(window.location.search).get('theme') === 'light';
  try {
    if (linked) window.sessionStorage.setItem('theme-link', 'light');
    // 'work-theme' was the key when only /projects had a light mode
    const chosen = window.localStorage.getItem('theme') || window.localStorage.getItem('work-theme');
    if (chosen === 'light' || chosen === 'dark') return chosen;
    if (window.sessionStorage.getItem('theme-link') === 'light') return 'light';
  } catch {
    if (linked) return 'light'; // storage blocked: the link alone decides
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export const THEME_SCRIPT = `try{if((${resolveTheme})()==='light')document.documentElement.dataset.theme='light'}catch(e){}`;
