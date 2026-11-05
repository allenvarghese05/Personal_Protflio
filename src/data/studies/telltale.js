/**
 * Telltale: every fact the case study shows. Checked against the repository
 * (allenvarghese05/telltale, HEAD 24b38ab): the README and its benchmark notes,
 * telltale/verify/checker.py, telltale/physics/attribution.py,
 * telltale/video/trend.py, telltale/agent/investigator.py,
 * telltale/evidence/store.py, .github/workflows/* and the git history.
 * Solo project; dates are the git commit dates in the commits' own time zone
 * (UTC-5, the EST the benchmark notes use).
 */

export const LINKS = [
  { href: 'https://huggingface.co/spaces/Allen05254/telltale', label: 'Live replay' },
  { href: 'https://github.com/allenvarghese05/telltale', label: 'Repository' },
];

export const COPY = {
  outcome:
    'Meta AI investigates a car crash from real dashcam video and the car’s own logs. Then plain Python redoes every number and the verdict, and holds back anything it cannot prove.',
  status: 'Hackathon build · Meta Global AI Developer Hackathon 2026, indie track',
  before: [
    'Working out what a driver-assist car did before a crash means lining up dashcam frames against CAN logs by hand',
    'A language model can read that evidence, but it can state things that are not true',
    'A crash report cannot contain a single invented number',
    'Measured frame to frame, SAM box jitter of about 10 px looks like motion',
  ],
  after: [
    'SAM 3.1 tracks every vehicle in the footage, and code works out when the struck car became a danger',
    'A Muse Wonder agent reads the logs through six tools and names the step that failed',
    'A Python checker recomputes every claim, blocks what it cannot prove, and withholds a verdict it disagrees with',
    'Every rate is a fitted slope that counts only when it passes a significance test',
  ],
  built:
    'Built solo by Allen for the Meta Global AI Developer Hackathon 2026 (indie track, 26 Oct to 4 Nov 2026), under the engineering rules in AGENTS.md. The work ran as four parallel tracks in separate git worktrees: video evidence, vehicle logs and physics, the agent and checker, and the replay site. The dashcam video is real (the Nexar Collision Dataset). The CAN and ADAS logs are synthetic, because real fleet logs are proprietary.',
  next: [
    'Label every verdict as robust or timing-sensitive. With the video’s measured timing error applied, the verdict stays the same only 46% of the time.',
    'Build the v2 physics model: a lead car that can brake, and a separate air-brake delay for trucks. It is written up in the README, not built.',
    'Add 2-D physics, so cross-path crashes such as an intersection U-turn can be attributed, not only described.',
    'Add a “seen safe first” rule for danger onset, aimed at early alarms at the start of a clip, and test it on a fresh pre-registered draw.',
    'Make clock alignment fail loudly at the edge of its search window. A CAN clock skewed by 5 s fails silently today.',
    'Add an adapter for a fleet’s real CAN log exports.',
  ],
  headlines: {
    problem: 'An AI can read a crash faster than an engineer, but it can make things up, and a crash report cannot.',
    how: 'Six steps from a dashcam clip to a report where every number has been recomputed.',
    inside: 'A checker that blocks unproven claims, an agent that ignored planted traps, and benchmarks that report their weak spots.',
    decisions: 'One choice made on the first night, and two problems that real footage and a live run exposed.',
    architecture: 'Meta’s models on one side, plain Python on the other, and a hashed evidence store between them. Follow a case through it.',
    build: 'Four parallel tracks, 170 commits, and benchmark protocols written before the runs.',
    next: 'What would make the verdicts safer to trust.',
  },
  buildNote:
    'The public git history runs from the scaffold on 2 Nov 2026 to the last merge on 4 Nov 2026: 170 commits and 26 merged pull requests.',
};

export const FLOW = {
  caption: 'One investigation, step by step',
  figureCaption: 'From a dashcam clip to a checked report',
  steps: [
    {
      key: 'watch',
      label: 'Watch',
      title: 'Track every vehicle, then find the moment of danger',
      body: 'SAM 3.1 tracks every vehicle in the clip. Plain code reduces each box to a point, measures its position across the lane, and works out time to collision from how fast the box grows. The earliest of three tests to fire is the danger onset.',
      facts: ['Lane position is measured in lane widths, which cancels perspective', 'Time to collision = box width divided by its rate of growth', 'Tests: entering the lane, predicted to enter within 2 s, or closing with under 2 s to collision'],
    },
    {
      key: 'witness',
      label: 'Witness',
      title: 'A second model describes what it sees',
      body: 'Muse Spark 1.3 watches the same clip and reports brake lights, turn signals, lighting, weather and road surface. A visual observation is verified only when an independent second source agrees; otherwise it is labelled single-source.',
      facts: ['Witness facts are stored as WIT:*', 'A recheck of a short window adds a WIT2:* fact', 'Rule R5: one source is not enough for what was seen'],
    },
    {
      key: 'evidence',
      label: 'Evidence',
      title: 'Logs on one clock, in a store nobody can edit',
      body: 'The CAN log is anchored to the video by the impact. The ADAS log is anchored to CAN by matching its speed trace to wheel speed. Every fact goes into an immutable store hashed with SHA-256.',
      facts: ['ADAS offset: grid search over ±1.5 s in 2 ms steps', 'Only tool facts (WIT2:*, CF:*) can be appended, and each append makes a new store', 'The CAN and ADAS logs are synthetic; the video is real'],
    },
    {
      key: 'investigate',
      label: 'Investigate',
      title: 'An agent that may not do its own arithmetic',
      body: 'A Muse Wonder agent builds the timeline, measures each interval with a tool, runs “what if it had reacted normally?” crashes, and submits a verdict with 5 to 10 claims. It never sees the checker’s physics facts or its verdict.',
      facts: ['Six tools: list_evidence, get_series, measure, run_counterfactual, witness_recheck, submit_findings', 'Hidden from the agent: PHYS:* and ATTR:*', 'Each claim carries its evidence IDs and an assertion code can recompute'],
    },
    {
      key: 'check',
      label: 'Check',
      title: 'Plain Python redoes every claim and the verdict',
      body: 'The checker recomputes each assertion from the cited facts, and requires every number in the text to match one of them. It then reaches its own verdict from the same evidence. If the two verdicts differ, the report is withheld for a person.',
      facts: ['A number matches within 0.05 or 5%, whichever is larger, with ms, km/h and mph conversions', 'Rules R1 to R6, from “evidence exists” to “intervals mean what their threshold judges”', 'No fault or blame language, and no claims about the driver without a driver camera'],
    },
    {
      key: 'report',
      label: 'Report',
      title: 'A report written by code, replayed in the browser',
      body: 'The plain-English incident report is written by code from verified facts, never by a language model. A static site replays each case: the footage, the tracks, the logs, every claim with its status, and the verdict.',
      facts: ['One real investigation: danger at 6.13 s, noticed at 7.24 s, 1.10 s against 0.30 s allowed', 'Impact at 8.00 s and 8.4 km/h; all 9 claims reproduced', 'Hosted on a Hugging Face Static Space, with no API key'],
    },
  ],
};

export const FEATURES = [
  { key: 'checker', label: 'Checker', title: 'Every number has to be earned', body: 'Each claim cites evidence IDs and an assertion such as “first seen minus danger onset equals 1.36”. The checker recomputes it, then scans the text: a number that does not match a cited fact is blocked, even when the statement is true.', stat: { value: '6', label: 'rules, R1 to R6' } },
  { key: 'traps', label: 'Robustness', title: 'It did not take the bait', body: 'Thirty manipulated cases, run live. With key evidence deleted, the agent never invented the missing value. Given a lying witness, it did not repeat the lie. It never followed an instruction planted in its evidence. The one wrong verdict in the set came from a misread interval, not a trap, and the checker withheld it. Ten runs per trap can show a failure is not common, not that it never happens.', stat: { value: '0 / 30', label: 'runs where the trap worked' } },
  { key: 'onset', label: 'Video', title: 'Danger onset, graded against people', body: 'Scored on 400 real crash clips labelled by people, with the method and stopping rule committed first. It found an onset on 65% of clips, 74% of those within 2 s. The spread lands in the pre-registered “weak” grade. The README traces that to early alarms at the start of a clip, a split it calls exploratory.', stat: { value: '0.91 s', label: 'median error, 400 clips' } },
  { key: 'limits', label: 'Limits', title: 'The weak point, measured', body: 'The checker guarantees the reasoning, not the camera. Shifting the danger onset by SAM’s measured timing error and re-running the attribution leaves the verdict unchanged only 46% of the time. The close-call and robustness sets are synthetic, so their accuracy is consistency by construction.', stat: { value: '46%', label: 'verdicts unchanged under timing error' } },
];

export const DECISIONS = [
  {
    id: 'verdict',
    kicker: 'Trust',
    title: 'The AI decides, and code decides again without telling it',
    problem: 'Checking each claim is not enough. An agent can state true numbers and still reach the wrong conclusion, and a crash report’s conclusion is the part people act on.',
    decision: 'Allen kept two verdicts. Deterministic attribution reaches one from the evidence and stores it as ATTR:label, which the agent cannot see. The agent reaches its own with tools. The checker compares them, and a disagreement withholds the report for human review.',
    tradeoff: 'The independent verdict is only as good as the attribution rules and the evidence timing. On the synthetic close-call and robustness sets, the expected labels come from the same attribution, so accuracy there is consistency by construction.',
    caption: 'Two verdicts from the same evidence',
    steps: ['Attribution runs in a fixed order: incomplete brake log, then unavoidable, then no fault, then the step furthest over its limit', 'Its result is stored as ATTR:label, hidden from the agent', 'The agent investigates with six tools and submits its own verdict', 'The checker compares the two labels', 'Different labels: the report is withheld pending human review'],
    readout: 'Two wrong verdicts in 151 live investigations. The checker withheld both and verified neither.',
    code: {
      file: 'telltale/verify/checker.py',
      lang: 'python',
      body: `def check_verdict(agent_label: str, store: EvidenceStore) -> dict:
    """Compare the agent's verdict with \`ATTR:label\`, which deterministic code derived from the same evidence."""
    independent = str(store.get("ATTR:label").value)
    if agent_label == independent:
        return {"agent_label": agent_label, "independent_label": independent, "status": "VERIFIED", "reason": ""}
    return {
        "agent_label": agent_label,
        "independent_label": independent,
        "status": "REJECTED",
        "reason": f"independent recomputation from the same evidence gives {independent}; "
        f"report withheld pending human review",
    }`,
    },
  },
  {
    id: 'interval',
    kicker: 'Checker',
    title: 'A true subtraction that meant the wrong thing',
    problem: 'On a late-handoff case, Muse Wonder measured the “command” time from the brake request the human driver made after the car handed back control. The claim “Command took 2.39 s (8.482 s minus 6.0895 s), well above the 0.1 s command threshold” passed: the subtraction was right, but the interval was not the one the threshold judges.',
    decision: 'Allen added rule R6. Each threshold names the intervals it judges, and a claim that compares any other interval with it is blocked. The command threshold never applies after a handoff.',
    tradeoff: 'Its first version blocked 12 true claims and was loosened before the live run. On the 20 new cases it still blocked one true claim, and one misleading argument with true numbers and no threshold got through, so the independent verdict check stays the last line.',
    caption: 'What R6 found',
    steps: ['The wrong verdict was withheld by the verdict check, not by the claim rules', 'Re-checked offline over 132 earlier runs (1,158 claims): 6 claims newly blocked, no verdict changed', '20 new confusable cases built around the mistake: 8 wrong-interval claims', 'R6 blocked all 8; the old checker would have verified all 8', '1 true claim blocked by R6 (a false alarm)'],
    readout: 'Commits a537398 and 61210d3, added after the robustness benchmark.',
    code: {
      file: 'telltale/verify/checker.py',
      lang: 'python',
      body: `# R6, interval meaning (added after the robustness benchmark): each threshold judges one specific interval.
# A claim comparing a different interval with it can be arithmetically true and still misleading, e.g. the human's
# brake request after a handoff measured against the system's command threshold.
THRESHOLD_INTERVALS = {
    "PROFILE:perception_threshold_s": (("AV:first_seen_t", "VID:hazard_onset_t"),),
    "PROFILE:command_threshold_s": (("AV:brake_request_t", "AV:first_seen_t"),),
    "PROFILE:actuation_threshold_s": (("CAN:pressure_reached_t", "CAN:brake_request_t"),),
    # The handoff margin is judged against human reaction time, and so is the human's actual reaction after it.
    "PROFILE:human_prt_s": (("VID:impact_t", "AV:handoff_t"), ("CAN:brake_request_t", "AV:handoff_t")),
}`,
    },
  },
  {
    id: 'jitter',
    kicker: 'Video',
    title: 'Box jitter that looked like motion',
    problem: 'SAM box widths jitter by about 10 px from frame to frame, and a box sometimes merges with a neighbour for one frame. On one clip the target’s width spiked by 444 px on a single frame. Frame-to-frame rates turned the jitter into sub-second time to collision at the start of every clip.',
    decision: 'Every rate in Telltale is a windowed least-squares slope. The series is median-filtered over 5 frames, a line is fitted over 15, and the slope counts only when it is more than three times its own standard error. The noise is measured with the median absolute deviation, so one outlier cannot inflate it.',
    tradeoff: 'Requiring significance throughout split one lane change into three pieces where its rate dipped, so continuing a lane change now needs only half the starting rate. If the slope is not significant, time to collision is infinite: the car is treated as not approaching.',
    caption: 'From noisy boxes to a rate you can trust',
    steps: ['Median filter over 5 frames removes single-frame spikes instead of smearing them', 'Fit a line over a 15-frame window', 'Measure the noise from the raw residuals, using the median absolute deviation', 'Keep the slope only when it is more than 3 times its standard error', 'Time to collision = fitted width divided by that slope'],
    readout: 'telltale/video/trend.py, used for both time to collision and lane changes.',
    code: {
      file: 'telltale/video/trend.py',
      lang: 'python',
      body: `t, v = times[lo:hi], smoothed[lo:hi]
centred = t - t.mean()
spread = float(np.sum(centred**2))
if spread <= 0:
    continue
gradient = float(np.sum(centred * (v - v.mean())) / spread)
line = v.mean() + gradient * centred
residuals = values[lo:hi] - line
sigma = MAD_TO_SIGMA * float(np.median(np.abs(residuals - np.median(residuals))))
slope[i] = gradient
fitted[i] = v.mean() + gradient * (times[i] - t.mean())
significant[i] = abs(gradient) > significance * (sigma / float(np.sqrt(spread)))`,
    },
  },
];

export const LAYERS = [
  { key: 'who', label: 'Who', nodes: ['reviewer'] },
  { key: 'app', label: 'Replay + upload', nodes: ['site', 'report', 'upload'] },
  { key: 'domain', label: 'Plain Python', nodes: ['checker', 'attr', 'sim', 'video-facts', 'align'] },
  { key: 'agent', label: 'Investigator', nodes: ['agent', 'tools'] },
  { key: 'data', label: 'Evidence', nodes: ['store', 'clip', 'logs'] },
  { key: 'out', label: 'Outside', nodes: ['sam', 'spark', 'wonder', 'hf'] },
];

export const TRACES = [
  { id: 'investigate', label: 'Investigate one crash', steps: ['clip', 'sam', 'video-facts', 'store', 'agent', 'wonder', 'tools', 'sim', 'checker', 'report', 'site', 'reviewer'] },
  { id: 'withheld', label: 'A wrong verdict, withheld', steps: ['logs', 'align', 'attr', 'sim', 'store', 'agent', 'checker', 'reviewer'] },
  { id: 'witness', label: 'A second look at the video', steps: ['clip', 'spark', 'store', 'agent', 'tools', 'spark', 'store', 'checker'] },
  { id: 'own-clip', label: 'Your own dashcam clip', steps: ['upload', 'clip', 'sam', 'video-facts', 'spark', 'report', 'site'] },
];

export const BUILD = {
  totals: [
    { value: '170', label: 'commits' },
    { value: '26', label: 'pull requests merged' },
    { value: '6', label: 'benchmark protocols, pre-registered' },
    { value: '4', label: 'parallel tracks, one worktree each' },
  ],
  // .github/workflows: ci.yml, security.yml, deploy.yml
  ci: [
    { name: 'ci', when: 'every PR · push to main', steps: ['ruff check', 'ruff format', 'vulture', 'pytest, no network'] },
    { name: 'security', when: 'every PR · push to main · weekly', steps: ['gitleaks, full history', 'pip-audit', 'dependency review', 'CodeQL'] },
    { name: 'deploy', when: 'after CI passes on main', steps: ['telltale export-site', 'upload to the Hugging Face Space'] },
  ],
  suites: [
    { value: '302', label: 'pytest test functions' },
    { value: '43', label: 'test files' },
    { value: '1,158', label: 'committed claims re-checked offline' },
    { value: '162', label: 'synthetic attribution cases' },
  ],
};

/* ── the case study in one screen ─────────────────────────────────────────── */
export const OVERVIEW = [
  { label: 'What it is', text: 'A crash investigator for cars with driver-assist. Meta AI watches real dashcam video and reads the car’s logs to decide which step failed: noticing the danger, commanding the brakes, the brakes themselves, or handing control back. Plain Python then has to reproduce every number and the verdict.' },
  { label: 'Why it exists', text: 'Built for the Meta Global AI Developer Hackathon 2026. Language models still state things that are not true, and a crash report cannot contain one invented number. So the AI makes the decision, and code checks every word of it before a person sees it.' },
  { label: 'What Allen built', text: 'Solo: the video evidence from SAM 3.1 tracks, the Muse Spark witness, the synthetic log generator and clock alignment, the braking physics and attribution, the Muse Wonder agent and its six tools, the checker, the code-written report, the replay site, and the benchmarks that grade it.' },
  { label: 'Where it stands', text: 'A hackathon build with a live replay. In 151 live investigations the AI was wrong twice and the checker held both back. The logs are synthetic, the danger-onset benchmark grades weak, and a realistic timing error changes about half of verdicts, which the README reports.' },
];
