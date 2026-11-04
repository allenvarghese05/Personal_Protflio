/**
 * Which theme /projects opens in. Plain module (not 'use client') so the
 * server page can inline THEME_SCRIPT, which runs before the page paints and
 * so never flashes dark before switching to light.
 *
 * In order:
 *   1. the toggle: a choice someone made is kept (localStorage) and wins
 *   2. the résumé link, /projects?theme=light: light for the rest of that
 *      visit (sessionStorage), so coming back from a case study, whose link
 *      has no ?theme, stays light
 *   3. otherwise dark, the site's Signal Amber
 *
 * resolveWorkTheme is the one copy of this rule: theme.jsx calls it, and
 * THEME_SCRIPT is its own source, so everything it needs is written inline.
 */
export const THEME_KEY = 'work-theme';

export function resolveWorkTheme() {
  const linked = new URLSearchParams(window.location.search).get('theme') === 'light';
  try {
    if (linked) window.sessionStorage.setItem('work-theme-link', 'light');
    const chosen = window.localStorage.getItem('work-theme');
    if (chosen === 'light' || chosen === 'dark') return chosen;
    return window.sessionStorage.getItem('work-theme-link') === 'light' ? 'light' : 'dark';
  } catch {
    return linked ? 'light' : 'dark'; // storage blocked: the link alone decides
  }
}

export const THEME_SCRIPT = `try{if((${resolveWorkTheme})()==='light')document.documentElement.dataset.workTheme='light'}catch(e){}`;
