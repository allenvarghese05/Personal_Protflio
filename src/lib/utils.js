/** Minimal className combiner (no extra deps needed for this project). */
export function cn(...inputs) {
  return inputs.flat(Infinity).filter(Boolean).join(' ');
}
