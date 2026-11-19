/**
 * Light or dark, for the whole site. Plain module (not 'use client') so the
 * root layout can inline THEME_SCRIPT, which runs before anything paints and
 * so never flashes the wrong theme.
 *
 * The theme lives on <html data-theme="light"> (dark has no attribute: it's
 * the :root palette, Signal Amber). In order:
 *   1. the toggle: a choice someone made is kept (localStorage) and wins
 *   2. the page a visit starts on, kept for the rest of that visit
 *      (sessionStorage): /projects and the case studies (the résumé link)
 *      open light, allenvarghese.com and the 3D journey open dark.
 *      ?theme=light or ?theme=dark on any link sets it too.
 * The device setting is ignored on purpose: the route decides.
 *
 * resolveTheme is the one copy of this rule: useTheme calls it, and
 * THEME_SCRIPT is its own source, so everything it needs is written inline.
 */
export const THEME_KEY = 'theme';
/** sessionStorage: the theme the visit started in ('light' | 'dark'). */
export const LANDING_KEY = 'theme-landing';

export function resolveTheme() {
  const asked = new URLSearchParams(window.location.search).get('theme');
  const path = window.location.pathname;
  const fromUrl =
    asked === 'light' || asked === 'dark'
      ? asked
      : path === '/projects' || path.indexOf('/projects/') === 0
        ? 'light'
        : 'dark';
  try {
    // 'work-theme' was the key when only /projects had a light mode
    const chosen = window.localStorage.getItem('theme') || window.localStorage.getItem('work-theme');
    if (chosen === 'light' || chosen === 'dark') return chosen;
    const ss = window.sessionStorage;
    // an explicit ?theme= link wins; otherwise the first page of the visit
    if (asked === 'light' || asked === 'dark' || !ss.getItem('theme-landing')) ss.setItem('theme-landing', fromUrl);
    return ss.getItem('theme-landing') === 'light' ? 'light' : 'dark';
  } catch {
    return fromUrl; // storage blocked: each page decides alone
  }
}

export const THEME_SCRIPT = `try{if((${resolveTheme})()==='light')document.documentElement.dataset.theme='light'}catch(e){}`;
