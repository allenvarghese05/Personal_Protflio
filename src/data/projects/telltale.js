/**
 * telltale: the project's wall card, brief data and case-study copy.
 * Facts from the repository (allenvarghese05/telltale): the README, the code
 * and the git history. The page's own copy lives in src/data/studies/telltale.js.
 */

export const project = {
  id: 'telltale',
  kind: 'current',
  cardBadge: 'META AI HACKATHON',
  badge: 'META GLOBAL AI HACKATHON 2026 · INDIE TRACK · SOLO',
  label: 'Telltale',
  subtitle:
    'Meta AI investigates a vehicle crash from real dashcam video and the car’s logs, then a plain Python checker recomputes every number and the verdict before a person reads the report',
  role: 'Solo engineer',
  company: 'Meta Global AI Developer Hackathon 2026',
  dateRange: 'Oct to Nov 2026 · Meta AI hackathon',
  location: 'Hackathon',
  repo: 'https://github.com/allenvarghese05/telltale',
  live: 'https://huggingface.co/spaces/Allen05254/telltale',
  flowEnd: 'REPORT',
  tags: ['Python', 'SAM 3.1', 'Muse Spark', 'Muse Wonder', 'NumPy'],
  metrics: [
    { value: '151', label: 'Live AI investigations, each one checked by code' },
    { value: '0', label: 'Wrong verdicts that got past the checker (2 caught)' },
    { value: '400', label: 'Real crash clips scored against human labels' },
    { value: '74%', label: 'Danger onsets within 2 s of the human mark' },
  ],
  primaryStack: ['Python 3.12', 'SAM 3.1', 'Muse Spark 1.3', 'Muse Wonder', 'NumPy + SciPy'],
  secondaryStack: ['cantools', 'MCAP', 'OpenCV', 'Plotly', 'Vanilla JS', 'Hugging Face Static Space', 'pytest', 'ruff', 'gitleaks', 'pip-audit', 'CodeQL', 'GitHub Actions'],
  keyDecisions: [
    { title: 'The AI decides, and code decides again', body: 'The agent never sees the checker’s physics or its verdict. Plain Python reaches its own verdict from the same evidence, and a report whose verdicts disagree is withheld for a person.' },
    { title: 'A true subtraction with the wrong meaning', body: 'A live run compared the human driver’s brake time with the system’s command limit. Rule R6 now checks that an interval is the one its threshold measures.' },
    { title: 'Box jitter that looked like motion', body: 'SAM boxes jitter by about 10 px. Every rate is now a median-filtered, windowed slope that counts only when it beats three times its own standard error.' },
  ],
  timeline: [
    { week: 'Nov 2 · afternoon', start: '2026-11-02', end: '2026-11-02', title: 'Scaffold + plans', desc: 'The schema, the hashed evidence store, the CLI, CI and security scans, and plans for four parallel tracks.', done: true },
    { week: 'Nov 2 · late', start: '2026-11-02', end: '2026-11-02', title: 'Physics + checker', desc: 'Vehicle profiles, the crash simulator, attribution, CAN and ADAS log I/O, the log generator, the Muse Wonder investigator and the checker.', done: true },
    { week: 'Nov 3 · day', start: '2026-11-03', end: '2026-11-03', title: 'Video evidence', desc: 'SAM 3.1 tracking, lane entry, time to collision, danger onset, the Muse Spark witness and the first real-label benchmark.', done: true },
    { week: 'Nov 3 · evening', start: '2026-11-03', end: '2026-11-03', title: 'Replay site + first live runs', desc: 'The static replay site, the code-written incident report, four demo clips, and 16 demo cases plus a 19-case benchmark run live.', done: true },
    { week: 'Nov 3 · overnight', start: '2026-11-03', end: '2026-11-04', title: 'Hard cases + robustness', desc: 'Any dashcam clip, 30 close-call cases, 18 truck cases, the robustness benchmark, and the danger-onset benchmark at 400 clips.', done: true },
    { week: 'Nov 4 · day', start: '2026-11-04', end: '2026-11-04', title: 'R6 + the final replay', desc: 'The interval-meaning rule, 20 confusable cases, the perception-error study, the replay for judges and the README.', done: true },
  ],
  architectureGraph: {
    nodes: [
      { id: 'checker', label: 'Checker', description: 'Plain Python. Recomputes every claim from the evidence under rules R1 to R6, blocks what it cannot reproduce, and withholds a verdict that disagrees with its own.', category: 'core', importance: 'center', x: 74, y: 50 },
      { id: 'reviewer', label: 'Reviewer', description: 'The person who reads the verified timeline and signs it off, and who gets any withheld report.', category: 'ui', importance: 'leaf', x: 95, y: 50 },
      { id: 'upload', label: 'Upload page', description: 'A local-only page (127.0.0.1) for your own dashcam clip: .mp4 or .mov up to 200 MB. Never part of the hosted site.', category: 'ui', importance: 'secondary', x: 6, y: 8 },
      { id: 'clip', label: 'Dashcam clip', description: 'Real crash footage from the Nexar Collision Dataset, or your own clip with its impact time.', category: 'data', importance: 'secondary', x: 6, y: 34 },
      { id: 'logs', label: 'CAN + ADAS logs', description: 'Synthetic logs (candump and MCAP), generated to agree with each clip’s real danger and impact times. The fault each was built with stays hidden from the agent and the checker.', category: 'data', importance: 'secondary', x: 6, y: 76 },
      { id: 'sam', label: 'SAM 3.1', description: 'Meta’s segmentation model tracks every vehicle in the clip.', category: 'ai', importance: 'secondary', x: 22, y: 14 },
      { id: 'spark', label: 'Muse Spark 1.3', description: 'The video witness: brake lights, turn signals, lighting, weather and road surface. It can take a second look at a short window.', category: 'ai', importance: 'secondary', x: 22, y: 46 },
      { id: 'video-facts', label: 'Video facts', description: 'Deterministic code turns tracks into lane position, time to collision and the moment the struck vehicle became a danger.', category: 'core', importance: 'primary', x: 38, y: 24 },
      { id: 'align', label: 'Clock alignment', description: 'Puts the CAN log, the ADAS log and the video on one clock: impact for CAN, a speed-trace match for ADAS.', category: 'workflow', importance: 'secondary', x: 26, y: 78 },
      { id: 'store', label: 'Evidence store', description: 'Immutable and hashed with SHA-256. Only the agent’s tools can append facts (witness rechecks and what-if runs), and each append makes a new store.', category: 'storage', importance: 'primary', x: 48, y: 52 },
      { id: 'agent', label: 'Investigator', description: 'A Muse Wonder agent that reads the evidence through six tools, runs what-if crashes and names the primary cause. It cannot see the checker’s facts.', category: 'ai', importance: 'primary', x: 64, y: 24 },
      { id: 'tools', label: 'Six tools', description: 'list_evidence, get_series, measure, run_counterfactual, witness_recheck and submit_findings. Every number the agent uses comes from one of them.', category: 'workflow', importance: 'secondary', x: 50, y: 10 },
      { id: 'wonder', label: 'Muse Wonder', description: 'Meta’s model behind the investigator, called through Meta’s API. Every call is cached, so the replay never needs a key.', category: 'ai', importance: 'leaf', x: 80, y: 8 },
      { id: 'sim', label: 'Crash simulator', description: 'One-dimensional braking physics with a 1 ms step, used for the agent’s what-if runs and the attribution’s but-for test.', category: 'core', importance: 'secondary', x: 50, y: 86 },
      { id: 'attr', label: 'Attribution', description: 'Fixed order: incomplete brake log, then unavoidable, then no fault, then the step furthest over its tolerance. Its verdict is hidden from the agent.', category: 'core', importance: 'primary', x: 66, y: 74 },
      { id: 'report', label: 'Incident report', description: 'Plain English written by code from verified facts, never by a language model. A missing field drops its sentence.', category: 'workflow', importance: 'secondary', x: 88, y: 28 },
      { id: 'site', label: 'Replay site', description: 'Static HTML and vanilla JavaScript with Plotly timelines: the footage, the tracks, the logs, every claim with its status, and the verdict.', category: 'ui', importance: 'primary', x: 88, y: 72 },
      { id: 'hf', label: 'Hugging Face Space', description: 'Hosts the static replay. Deployed after CI passes on main; it never holds an API key.', category: 'infrastructure', importance: 'leaf', x: 95, y: 92 },
    ],
    edges: [
      { source: 'upload', target: 'clip', label: 'your own clip', direction: 'one-way' },
      { source: 'clip', target: 'sam', label: 'frames', direction: 'one-way' },
      { source: 'clip', target: 'spark', label: 'same clip', direction: 'one-way' },
      { source: 'sam', target: 'video-facts', label: 'tracks', direction: 'one-way' },
      { source: 'video-facts', target: 'store', label: 'VID facts', direction: 'one-way' },
      { source: 'spark', target: 'store', label: 'WIT facts', direction: 'one-way' },
      { source: 'logs', target: 'align', label: '', direction: 'one-way' },
      { source: 'align', target: 'store', label: 'one clock', direction: 'one-way' },
      { source: 'align', target: 'attr', label: 'latencies', direction: 'one-way' },
      { source: 'attr', target: 'sim', label: 'but-for run', direction: 'two-way' },
      { source: 'attr', target: 'store', label: 'hidden ATTR facts', direction: 'one-way' },
      { source: 'store', target: 'agent', label: 'visible facts only', direction: 'one-way' },
      { source: 'agent', target: 'wonder', label: 'tool calls', direction: 'two-way' },
      { source: 'agent', target: 'tools', label: '', direction: 'two-way' },
      { source: 'tools', target: 'sim', label: 'run_counterfactual', direction: 'two-way' },
      { source: 'tools', target: 'spark', label: 'witness_recheck', direction: 'two-way' },
      { source: 'tools', target: 'store', label: 'append WIT2, CF', direction: 'one-way' },
      { source: 'agent', target: 'checker', label: 'claims + verdict', direction: 'one-way' },
      { source: 'store', target: 'checker', label: 'all facts', direction: 'one-way' },
      { source: 'checker', target: 'report', label: 'verified facts', direction: 'one-way' },
      { source: 'checker', target: 'reviewer', label: 'withheld', direction: 'one-way' },
      { source: 'report', target: 'site', label: '', direction: 'one-way' },
      { source: 'reviewer', target: 'site', label: 'replay', direction: 'two-way' },
      { source: 'site', target: 'hf', label: 'static files', direction: 'one-way' },
    ],
  },
};

export const caseStudy = {
  media: { frame: 'browser', url: 'huggingface.co/spaces/Allen05254/telltale', shots: [] },
  live: 'https://huggingface.co/spaces/Allen05254/telltale',
  liveLabel: 'Open the live replay',
  problem:
    'When a car with driver-assist crashes, someone has to work out what it did, and today that means lining up dashcam frames against CAN logs by hand. A language model could do the reading, but it can state things that are not true, and a crash report cannot contain one invented number.',
  built:
    'A pipeline where SAM 3.1 and Muse Spark 1.3 read real dashcam video, a Muse Wonder agent investigates the car’s logs with six tools, and a plain Python checker recomputes every claim and the verdict before the report is published or held for a person.',
  how: [
    'Vehicle tracks become lane position, time to collision and a danger onset, using fitted slopes with a significance test.',
    'The agent sees only the facts it is allowed to, and every number it uses comes from a tool.',
    'The checker blocks any claim it cannot reproduce and withholds a verdict that differs from its own.',
    'The incident report is written by code from verified facts, not by a language model.',
  ],
  next: [],
};
