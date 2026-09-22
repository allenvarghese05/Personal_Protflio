/**
 * Shared Web Audio context for the synthesized entry sound design.
 *
 * Browsers only allow audio after a user gesture, so the portal button calls
 * unlockAudio() on click; the Big Bang and landing beats read it back through
 * getAudio(). Sound is a bonus — every caller must tolerate `null`.
 */
let ctx = null;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    ctx.resume();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function getAudio() {
  return ctx;
}
