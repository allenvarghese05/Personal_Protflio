/**
 * Runs inline before /projects paints, so someone who chose light mode never
 * sees a flash of dark. Plain module (not 'use client') so the server page
 * receives the string itself. The key matches useWorkTheme in ./theme.jsx.
 */
export const THEME_KEY = 'work-theme';

export const THEME_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='light')document.documentElement.dataset.workTheme='light'}catch(e){}`;
