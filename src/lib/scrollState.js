/**
 * Shared, mutable scroll state read inside the R3F render loop.
 * Updated by ScrollManager (Lenis) every scroll tick; read by the camera,
 * rocket, and post-processing in useFrame — no React re-renders involved.
 */
export const scrollState = {
  progress: 0, // 0 → 1 across the flight scroll distance
  velocity: 0, // smoothed |scroll velocity| for speed-reactive effects
};
