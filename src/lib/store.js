import { create } from 'zustand';

/**
 * Global app state for the Mission Allen experience.
 *
 * The opening plays as a scripted cinematic, then hands control to scroll:
 *   'boot'     — Act I: darkness, smoke pulse, terminal boot log printing
 *   'ignition' — Act II: fire erupts and reveals the rocket (key light)
 *   'ready'    — Act III: active idle; "SCROLL TO INITIATE ASCENT"
 *   'flight'   — scroll-driven ascent (scrubbed by scrollState.progress)
 *   'reveal'   — orbital reveal: planet below + name title card
 */
export const useStore = create((set) => ({
  phase: 'boot',
  setPhase: (phase) => set({ phase }),

  // Timestamp (performance.now) of the last "scrolled too early" nudge —
  // the rocket rattles on the pad for a beat instead of launching.
  rattleAt: 0,
  setRattle: (rattleAt) => set({ rattleAt }),

  // Audio toggle (wired in later phases)
  audioOn: false,
  toggleAudio: () => set((s) => ({ audioOn: !s.audioOn })),

  // Capability tier: 'base' | 'enhanced' | 'full'
  tier: 'full',
  setTier: (tier) => set({ tier }),

  // Which content panel is active along the journey:
  //   0 = launch cinematic (no panel)
  //   1 = orbit / name card
  //   2 = Origins ... (grows as chapters are added)
  activeChapter: 0,
  setActiveChapter: (activeChapter) => set({ activeChapter }),

  // Which interactive memory/fragment is open (null = none) + where it was
  // on screen when clicked, so the card can grow out of it.
  selectedMemory: null,
  memoryOrigin: null, // { x, y } in viewport px
  setSelectedMemory: (selectedMemory, memoryOrigin = null) =>
    set({ selectedMemory, memoryOrigin }),

  // Surface exploration: which zone the astronaut is currently in range of
  // (null = none). Set only when it changes, not every frame.
  nearZone: null,
  setNearZone: (nearZone) =>
    set((s) => (s.nearZone === nearZone ? s : { nearZone })),
}));
