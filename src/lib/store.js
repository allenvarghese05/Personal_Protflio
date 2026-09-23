import { create } from 'zustand';

/**
 * Global app state for the Mission Allen experience.
 *
 * Intro phases (the galaxy-first journey):
 *   'loading' — assets streaming in, progress counter on screen
 *   'hero'    — name card over the slowly turning galaxy, awaiting Enter
 *   'dive'    — the auto-played cinematic (see lib/entrySequence.js)
 */
export const useStore = create((set) => ({
  phase: 'loading',
  setPhase: (phase) => set({ phase }),

  // 3D scene finished loading + compiling (gates the loader → hero handoff)
  sceneReady: false,
  setSceneReady: (sceneReady) => set({ sceneReady }),

  // Capability tier: 'base' | 'enhanced' | 'full'
  tier: 'full',
  setTier: (tier) => set({ tier }),

  // Surface exploration: which zone the astronaut is currently in range of
  // (null = none). Set only when it changes, not every frame.
  nearZone: null,
  setNearZone: (nearZone) =>
    set((s) => (s.nearZone === nearZone ? s : { nearZone })),

  // Which district the visitor has ENTERED — opens the Mission Control room
  // and dims/blurs the world behind it (null = out in the world).
  enteredZone: null,
  setEnteredZone: (enteredZone) =>
    set((s) => ({ enteredZone, selectedProject: enteredZone ? s.selectedProject : null })),

  // The project brief open inside Mission Control (null = the project wall).
  // Set directly by walking up to a monolith, or by picking a card.
  selectedProject: null,
  setSelectedProject: (selectedProject) => set({ selectedProject }),
  /** Open Mission Control straight onto one project's brief. */
  openProject: (id) => set({ enteredZone: 'engineering', selectedProject: id }),

  // The project monolith the astronaut is standing at (drives its preview
  // tag + the E key). Set only when it changes.
  nearProject: null,
  setNearProject: (nearProject) =>
    set((s) => (s.nearProject === nearProject ? s : { nearProject })),

  // The station landmark (observatory / studio / comms) within reach — E
  // enters it. Set only when it changes.
  nearStation: null,
  setNearStation: (nearStation) =>
    set((s) => (s.nearStation === nearStation ? s : { nearStation })),

  // The intro → landing → explore arc:
  //   'intro'   — galaxy hero + the two dives (ends in the Big Bang)
  //   'landing' — world visible, astronaut dropping in (control locked)
  //   'world'   — full player control
  journeyPhase: 'world',
  setJourneyPhase: (journeyPhase) => set({ journeyPhase }),
}));
