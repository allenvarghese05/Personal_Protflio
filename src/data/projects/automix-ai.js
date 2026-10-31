/**
 * automix-ai — the project's wall card, brief data and case-study copy.
 * Facts from the repository (allenvarghese05/AutoMixAI); the page's own copy
 * lives in src/data/studies/automix-ai.js.
 */

export const project = {
  id: 'automix-ai',
  kind: 'current',
  cardBadge: 'IN PROGRESS',
  badge: 'IN PROGRESS · SOLO',
  label: 'AutoMix AI',
  subtitle:
    'A real-time engine that mixes live microphones and catches acoustic feedback — a classical ring detector, notch filters and a gain guard, scored in a simulated room',
  role: 'Solo engineer',
  company: 'Personal project',
  dateRange: 'Apr 2026 – Present',
  location: 'Python · real-time audio',
  repo: 'https://github.com/allenvarghese05/AutoMixAI',
  live: null,
  tags: ['Python', 'DSP', 'NumPy · SciPy', 'Numba', 'Real-time audio'],
  metrics: [
    { value: '38', label: 'Test cases: DSP, detector, closed loop' },
    { value: '11', label: 'Stages per mic, plus 5 on the master' },
    { value: '3 Hz', label: 'Ring frequency accuracy (tested)' },
    { value: '+3.3 dB', label: 'Added stable gain, simulated (self-reported)' },
  ],
  primaryStack: ['Python 3.12', 'NumPy', 'SciPy', 'Numba', 'sounddevice (PortAudio)'],
  secondaryStack: ['pyroomacoustics', 'soundfile', 'pytest'],
  keyDecisions: [
    { title: 'Retire the model that learned an artifact', body: 'A CNN with 99.8% precision on its own test set fired on 100% of speech; it was retired with a post-mortem for a classical detector scored in a closed loop.' },
    { title: 'Judge feedback in a loop', body: 'A closed-loop room simulator and an independent oracle decide what a howl is, and a bench bisects the highest stable gain with and without the brain.' },
    { title: 'Every dB of boost is a dB less before feedback', body: 'Every stage became attenuate-only and per-mic boosting gave way to Dugan gain-sharing, whose gains sum to unity in power.' },
  ],
  timeline: [
    { week: 'Apr 12', start: '2026-04-12', end: '2026-04-12', title: 'The signal chain', desc: 'Full-duplex audio engine, filters, gate, compressor, EQ, limiter, a live meter and session logs.', done: true },
    { week: 'Sep 16', start: '2026-09-16', end: '2026-09-16', title: 'A CNN predictor', desc: 'A 1-D CNN trained on synthetic spectra, adaptive notches and a two-device input engine.', done: true },
    { week: 'Oct 19 · PR #1', start: '2026-10-19', end: '2026-10-19', title: 'The classical brain', desc: 'Ring detector, notch bank, guard, Dugan automix, the closed-loop simulator, 38 tests; the CNN retired.', done: true },
  ],
  architectureGraph: {
    nodes: [
      { id: 'channel', label: 'Channel pipeline', description: 'Per mic: gain → clipper → 80 Hz high-pass → gate → compressor → cut-only EQ → detector → notches → guard → trim → ceiling.', category: 'audio', importance: 'center', x: 48, y: 40 },
      { id: 'venue', label: 'The room', description: 'Microphones and speakers in a venue — today, a Mac and a USB audio interface.', category: 'ui', importance: 'leaf', x: 6, y: 40 },
      { id: 'main', label: 'main.py', description: 'Opens N mics on one interface, builds a pipeline per channel and a master chain, runs the audio callback.', category: 'core', importance: 'primary', x: 26, y: 22 },
      { id: 'meter', label: 'Terminal meter', description: 'An ANSI meter redrawn every 50 ms; Ctrl+C prints a session report.', category: 'ui', importance: 'secondary', x: 26, y: 48 },
      { id: 'recorder', label: 'Ring recorder', description: 'Ramps forward gain until the oracle hears a ring, backs off 12 dB, saves the wav and a JSON description.', category: 'core', importance: 'secondary', x: 26, y: 74 },
      { id: 'detector', label: 'Howl detector', description: 'FFT 2048, spectral gates (PTPR, PAPR, PNPR, harmonic, series veto) and temporal gates (persistence, growth, sustain); sub-bin frequency.', category: 'audio', importance: 'primary', x: 48, y: 14 },
      { id: 'notches', label: 'Notch bank', description: 'Up to 10 Q=30 notches, −6 dB deepening to −18 dB, fixed or live (180 s expiry).', category: 'audio', importance: 'primary', x: 64, y: 22 },
      { id: 'guard', label: 'Howl guard', description: 'Open → ducked (−6 dB) → releasing → latched (−12 dB after 3 trips in 60 s).', category: 'workflow', importance: 'secondary', x: 64, y: 52 },
      { id: 'automix', label: 'Gain-sharing automix', description: 'Dugan: gain_i = √(P_i/ΣP), idle floor −15 dB, playback channels pass at unity.', category: 'audio', importance: 'primary', x: 48, y: 66 },
      { id: 'master', label: 'Master chain', description: 'Mix bus → bus-mode detector → notches → −0.5 dBFS limiter.', category: 'audio', importance: 'secondary', x: 48, y: 88 },
      { id: 'sim', label: 'Closed-loop simulator', description: 'Talker + speaker output convolved with a room impulse response, fed back every block.', category: 'workflow', importance: 'primary', x: 78, y: 30 },
      { id: 'oracle', label: 'Oracle', description: 'An independent howl judge: a peak ≥ 20 dB over its neighbours held for 0.5 s.', category: 'workflow', importance: 'secondary', x: 78, y: 56 },
      { id: 'bench', label: 'Bench', description: 'Bisects the maximum stable gain, bypass vs brain, across simulated rooms.', category: 'workflow', importance: 'secondary', x: 78, y: 80 },
      { id: 'audio', label: 'Audio interface', description: 'sounddevice / PortAudio full-duplex stream, 48 kHz, 512-sample blocks.', category: 'infrastructure', importance: 'leaf', x: 94, y: 30 },
      { id: 'logs', label: 'Session logs', description: 'Per-session CSVs and recorded rings (wav + JSON).', category: 'storage', importance: 'leaf', x: 94, y: 70 },
    ],
    edges: [
      { source: 'venue', target: 'audio', label: 'mics + speakers', direction: 'two-way' },
      { source: 'audio', target: 'main', label: '512-sample blocks', direction: 'two-way' },
      { source: 'main', target: 'channel', label: 'per mic', direction: 'one-way' },
      { source: 'main', target: 'meter', label: 'every 50 ms', direction: 'one-way' },
      { source: 'channel', target: 'detector', label: '', direction: 'one-way' },
      { source: 'detector', target: 'notches', label: 'confidence ≥ 0.8', direction: 'one-way' },
      { source: 'notches', target: 'guard', label: 'still ringing at −18', direction: 'one-way' },
      { source: 'channel', target: 'automix', label: '', direction: 'one-way' },
      { source: 'automix', target: 'master', label: '', direction: 'one-way' },
      { source: 'bench', target: 'sim', label: 'bisect gain', direction: 'one-way' },
      { source: 'sim', target: 'channel', label: 'as process_fn', direction: 'two-way' },
      { source: 'sim', target: 'oracle', label: 'judge', direction: 'one-way' },
      { source: 'recorder', target: 'oracle', label: '', direction: 'one-way' },
      { source: 'recorder', target: 'logs', label: 'wav + json', direction: 'one-way' },
      { source: 'main', target: 'logs', label: 'session CSV', direction: 'one-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'private', shots: [] },
  live: null,
  problem:
    'Venues without an AV technician have no one to catch acoustic feedback, and it builds in seconds — while every open microphone adds gain to the loop.',
  built:
    'A Python real-time engine: a classical ring detector drives notch filters and a gain guard, Dugan gain-sharing keeps total gain constant, and a closed-loop room simulator scores every change.',
  how: [
    'A ring is a lone, inharmonic spectral line that grows exponentially; voices and sung notes are rejected by their harmonic partners.',
    'Notches engage shallow and deepen only if the ring returns; a guard ducks the mic as a last resort.',
    'A simulated room with an independent oracle measures added stable gain.',
  ],
  next: [],
};
