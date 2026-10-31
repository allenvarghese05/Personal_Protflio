/**
 * AutoMix AI — every fact the case study shows. Checked against the
 * repository (allenvarghese05/AutoMixAI, master after PR #1): automix-core/*,
 * the roadmap, the git history. Numbers a commit message or README reports
 * without a committed output file are labelled as self-reported.
 */

export const LINKS = [{ href: 'https://github.com/allenvarghese05/AutoMixAI', label: 'Repository' }];

export const COPY = {
  outcome:
    'A real-time audio engine that mixes several live microphones and catches acoustic feedback before it howls — the software core of a box meant to replace the sound engineer.',
  status: 'In progress · code done, real rooms next',
  before: [
    'A venue without an AV technician has no one to catch feedback — and it builds in seconds',
    'Every mic left open adds gain to the loop, so more mics means more howl',
    'A first ML detector scored 99.8% precision on its own test set — and fired on 100% of plain speech',
    'You can’t test feedback by adding a sine to a recording; there’s no loop',
  ],
  after: [
    'A classical detector that finds a ring by how it grows, then notches it at the right frequency',
    'Gain-sharing automix keeps total gain constant however many mics are open',
    'The CNN retired to legacy/ with a written post-mortem of the bug it learned',
    'A closed-loop room simulator and an independent judge score every change',
  ],
  built:
    'Solo project. Today it runs on a Mac with a USB audio interface: python main.py --channels 4 opens four mics, prints a live meter and writes a session log. Phase 1 code merged in PR #1; recording real rings in real rooms — the gate to the next phase — hasn’t happened yet.',
  next: [
    'Real rooms: record 20+ rings in each of three rooms, and tune the detector’s thresholds from them.',
    'Phase 2: a FastAPI + WebSocket control API, an auto-soundcheck that finds a room’s ring frequencies before the event, and an iPad app.',
    'Phase 3–4: a hardware gate (10-hour soak, under 1 false notch per hour), then a Raspberry Pi 5 box.',
    'Phase 5: evaluate an adaptive feedback canceller for more stable gain.',
  ],
  headlines: {
    problem: 'Feedback ruins a speech in seconds, and every open mic makes it more likely.',
    how: 'Eleven stages per microphone, five on the master — a ring is caught, notched, and only then ducked.',
    inside: 'A detector, a notch bank, a guard and an automix — each with numbers you can check in the code.',
    decisions: 'Three decisions: retire the model that cheated, judge in a closed loop, and stop adding hidden gain.',
    architecture: 'One Python engine, run live or inside a simulated room.',
    build: 'A signal chain in April, a model in September, a rebuild in October.',
    next: 'Real rooms first — then the box.',
  },
  buildNote: 'Four commits: the signal chain (12 Apr 2026), the CNN predictor (16 Sep 2026), and PR #1 (19 Oct 2026, +2,832 / −1,524) with the classical brain, the simulator and 38 tests.',
};

export const FLOW = {
  caption: 'One mic’s signal chain, stage by stage',
  figureCaption: 'From a microphone to the room, every 10.7 ms',
  steps: [
    { key: 'in', label: 'Input', title: 'Gain, clipper and high-pass', body: 'Each microphone is trimmed, hard-clipped at −2 dBFS and high-passed at 80 Hz to drop rumble — in 512-sample blocks at 48 kHz.', facts: ['48 kHz, 512-sample blocks (~10.7 ms)', 'HPF: 4th-order Butterworth, 80 Hz'] },
    { key: 'dyn', label: 'Gate + compressor', title: 'Quiet when nobody talks, even when they do', body: 'A noise gate closes below −40 dBFS; a 2.5:1 compressor at −24 dBFS evens out the talker. Both are numba kernels because envelope followers can’t be vectorised.', facts: ['Gate −40 dBFS, attack/hold/release 1/100/120 ms', 'Compressor 2.5:1 @ −24 dBFS, 6 dB knee, makeup 0'] },
    { key: 'detect', label: 'Detect', title: 'Is that a ring?', body: 'The detector looks for a lone, inharmonic spectral line that keeps growing — straight in dB, the signature of feedback — and rejects voices and sung notes by their harmonic partners.', facts: ['FFT 2048 → 23.4 Hz bins, 150 Hz–12 kHz', 'Peak gates: PTPR, PAPR 15 dB, PNPR 12 dB, harmonic 10 dB', 'Growth 0.2–4.0 dB/frame over 12 frames'] },
    { key: 'notch', label: 'Notch', title: 'Cut exactly that frequency', body: 'A Q=30 notch engages at −6 dB on the estimated frequency (sub-bin, by parabolic interpolation) and deepens by −3 dB each time the ring comes back, down to −18 dB.', facts: ['Up to 10 notches per bank', 'Live notches expire after 180 s'] },
    { key: 'guard', label: 'Guard', title: 'If the notch isn’t enough, duck', body: 'If a fully deep notch still doesn’t hold, the guard ducks that mic by 6 dB, releases after 2 s of quiet, and latches at −12 dB after three trips in a minute.', facts: ['States: open → ducked → releasing → latched', 'Never boosts'] },
    { key: 'mix', label: 'Automix', title: 'Share the gain, don’t add it', body: 'Dugan gain-sharing gives each mic a share proportional to its level, so the total stays constant: one talker gets it all, idle mics sit at −15 dB.', facts: ['gain_i = √(P_i / ΣP_j)', 'Attack 10 ms, release 300 ms, slew 1 dB/block'] },
    { key: 'master', label: 'Master', title: 'One more check on the sum', body: 'The mixed bus runs its own detector — a ring that builds from several mics only shows up there — then its own notches and a −0.5 dBFS limiter.', facts: ['Bus mode never notches a held music note', 'Limiter: instant attack, 100 ms release'] },
  ],
};

export const FEATURES = [
  { key: 'detector', label: 'Detector', title: 'Classical, from the literature', body: 'Built on van Waterschoot & Moonen’s feedback criteria plus a growth test. Its tests assert it catches a rising tone before it reaches −20 dBFS and estimates its frequency within 3 Hz.', stat: { value: '3 Hz', label: 'frequency accuracy (test)' } },
  { key: 'notches', label: 'Notch bank', title: 'Shallow first, deeper only if needed', body: 'Notches are blended toward an allpass so each one cuts exactly the requested depth, fade in and out over four blocks, and expire when a ring stops coming back.', stat: { value: '−6 → −18', label: 'dB, in −3 dB steps' } },
  { key: 'sim', label: 'Simulator', title: 'A room in the loop', body: 'Each block, the mic hears the talker plus the speaker’s past output convolved with a room impulse response. An independent oracle — never the detector under test — decides what counts as a howl.', stat: { value: '+3.3 dB', label: 'median added stable gain, 3 simulated rooms (self-reported)' } },
  { key: 'tests', label: 'Tests', title: 'Bugs the tests caught', body: 'A low-shelf filter with poles on the unit circle, a compressor knee that boosted instead of cut, and a limiter release overshoot — each fixed with a test that would fail again.', stat: { value: '38', label: 'test cases (DSP, detector, closed loop)' } },
];

export const DECISIONS = [
  {
    id: 'cnn',
    kicker: 'ML',
    title: 'Retire the model that learned an artifact',
    problem: 'The September CNN reported 99.8% precision on its own test set — and fired on 100% of plain speech once a realistic noise floor was added. Its training tone was generated with a float32 time vector, leaving a faint residue the network learned to read as “feedback”.',
    decision: 'Move the CNN, its data and its training scripts to legacy/ with a written post-mortem, and replace it with classical criteria plus a growth test, scored in a closed loop rather than on a held-out set.',
    tradeoff: 'No learning from data: the thresholds are hand-set until real recordings exist to tune them. If ML comes back, the roadmap says it trains inside the closed loop on real rooms.',
    caption: 'What the post-mortem found',
    steps: ['Synthetic tones built with a float32 time vector', 'A −100 dBFS residue floor the features mapped to ≈ 0.2', 'Two sines 6×10⁻⁶ apart scored 0.96 vs 0.000006', 'With a realistic noise floor: fired on 100% of plain speech', 'Retired to legacy/; classical detector + closed-loop scoring instead'],
    readout: 'From legacy/README.md and the PR #1 commit.',
    code: {
      file: 'legacy/scripts/generate_training_data.py',
      lang: 'python',
      body: `# the bug: a float32 time vector leaves a residue floor
t = np.arange(n, dtype=np.float32) / SAMPLE_RATE
tone = np.sin(2.0 * np.pi * freq_hz * t).astype(np.float32)`,
    },
  },
  {
    id: 'loop',
    kicker: 'Testing',
    title: 'Judge feedback in a loop, with an independent judge',
    problem: 'Adding a sine to speech is not feedback — there’s no loop, so a detector can look perfect and still fail in a room.',
    decision: 'A closed-loop simulator: each block the mic hears the talker plus the speaker’s past output through a room impulse response; the output is processed, amplified, clipped and fed back. A separate oracle judges howls, and a bench bisects the highest stable gain with and without the brain.',
    tradeoff: 'The rooms and the talker are simulated (shoebox and synthetic rooms, formant-shaped noise). Real rooms and real voices are the next, unchecked step.',
    caption: 'One bench probe',
    steps: ['Talker (speech-like noise) + speaker output ⊛ room response → mic', 'Signal chain processes the block', '× forward gain, clipped, delayed 1024 samples', 'Back into the room', 'Oracle: a peak ≥ 20 dB over its neighbours, held ≥ 0.5 s, is a howl', 'Bisect gain −40…+30 dB at 0.5 dB, bypass vs brain'],
    readout: 'Added stable gain = the output level the brain allows above bypass.',
    code: {
      file: 'automix-core/sim/loop.py',
      lang: 'python',
      body: `mic_block = (source[s].astype(np.float64) + fb).astype(np.float32)
y = self.process_fn(mic_block) if self.process_fn is not None else mic_block
y = np.ravel(y).astype(np.float64) * self.gain
np.clip(y, -self.speaker_limit, self.speaker_limit, out=y)
# ...convolve the speaker output back into the room
self._tail[: len(rir) + bs - 1] += fftconvolve(y_out, rir)`,
    },
  },
  {
    id: 'gain',
    kicker: 'Gain',
    title: 'Every dB of boost is a dB less before feedback',
    problem: 'The original chain quietly added loop gain: an auto-gain that boosted up to +8 dB, compressor auto-makeup of +4.5 dB, and an EQ preset with presence boosts.',
    decision: 'Make every stage attenuate-only — trim instead of auto-gain, makeup 0, cut-only EQ — and replace per-mic boosting with Dugan gain-sharing, whose gains sum to unity in power.',
    tradeoff: 'Speech can sound slightly less “present” with no boost anywhere; the gain margin before feedback is worth more in an untended room.',
    caption: 'Hidden gain removed in PR #1',
    steps: ['AutoGain up to +8 dB → AutoTrim, attenuate-only', 'Compressor auto-makeup +4.5 dB → makeup 0', 'EQ +2 dB @ 3 kHz, +1.5 dB @ 8 kHz → cut-only', 'Per-mic boosting → Dugan automix (Σ gains² = 1)'],
    readout: 'From git show 2208b45 vs master.',
    code: {
      file: 'automix-core/dsp/automix.py',
      lang: 'python',
      body: `level = self._env[mics] + self._noise_floor[mics] + 1e-9
power = level * level
share = np.sqrt(power / np.sum(power))     # Dugan: gains sum to unity in power
share = np.maximum(share, self._floor_linear)
target_db[mics] = 20.0 * np.log10(share)
delta = np.clip(target_db - self._gain_db, -self._slew, self._slew)`,
    },
  },
];

export const LAYERS = [
  { key: 'who', label: 'Who', nodes: ['venue'] },
  { key: 'app', label: 'Run', nodes: ['main', 'meter', 'recorder'] },
  { key: 'domain', label: 'Engine', nodes: ['channel', 'detector', 'notches', 'guard', 'automix', 'master'] },
  { key: 'data', label: 'Score', nodes: ['sim', 'oracle', 'bench'] },
  { key: 'out', label: 'Outside', nodes: ['audio', 'logs'] },
];

export const TRACES = [
  { id: 'live', label: 'A live ring', steps: ['venue', 'audio', 'main', 'channel', 'detector', 'notches', 'guard', 'automix', 'master', 'audio'] },
  { id: 'bench', label: 'Score a change', steps: ['bench', 'sim', 'channel', 'master', 'oracle', 'bench'] },
  { id: 'record', label: 'Record a real ring', steps: ['recorder', 'audio', 'channel', 'oracle', 'logs'] },
];

/* ── the case study in one screen ─────────────────────────────────────────── */
export const OVERVIEW = [
  { label: 'What it is', text: 'A real-time audio engine that mixes several live microphones and catches acoustic feedback before it howls — the software core of a box meant to replace the sound engineer at small venues.' },
  { label: 'Why it exists', text: 'Churches, hotels and offices run events without an AV technician, and feedback builds in seconds. Every open mic also adds gain to the loop, so more mics means more risk.' },
  { label: 'What Allen did', text: 'Solo. A classical ring detector, notch filters that deepen only when needed, a gain guard, gain-sharing automix — and a simulated room with an independent judge to score every change. He also retired an ML detector that turned out to have learned a bug.' },
  { label: 'Where it stands', text: 'In progress: the code for this phase is merged and tested in simulation. Recording real rings in real rooms is the next gate; the hardware box is later.' },
];
