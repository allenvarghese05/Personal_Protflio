/**
 * Centralised animation tokens so timings/easings are tuned in one place.
 * Used by the Mission Control transition, card stagger, and the force graph.
 */

// Easings (framer-motion cubic-bezier arrays)
export const EASE_OUT = [0.16, 1, 0.3, 1]; // cinematic slide-up
export const EASE_STD = [0.22, 1, 0.36, 1];

// Durations (seconds)
export const DUR = {
  worldBlur: 0.4, // 3D world blur/darken on enter
  slideIn: 0.5, // Mission Control slides up
  slideOut: 0.4, // Mission Control slides down
  unblur: 0.3, // world un-blurs on exit
  cardFade: 0.5, // each project card fade-up
  cardStagger: 0.05, // delay between cards
  briefFade: 0.45,
};

// Graph / world timings
export const GRAPH = {
  hoverMs: 200, // node highlight/dim transition
  alphaTarget: 0.03, // keeps the sim gently "breathing"
  alphaDecay: 0.001,
  velocityDecay: 0.6,
};

export const CAMERA_PIVOT_S = 0.8; // GSAP pivot-to-face-buildings on trigger

// Card / badge accent colours (also the graph palette)
export const ACCENTS = {
  signature: '#e8a040', // amber
  current: '#30c0a0', // teal
  project: '#4090e0', // blue
  classified: '#303040', // dark grey
};

// Force-graph node palette
export const NODE_COLOR = {
  amber: '#e8a040',
  teal: '#30c0a0',
  blue: '#4090e0',
  purple: '#9060e0',
  grey: '#608090',
};
