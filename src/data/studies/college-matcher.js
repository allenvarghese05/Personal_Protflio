/**
 * College Matcher — every fact the case study shows. Checked against the
 * repository (allenvarghese05/college-matcher, one commit, 6 Aug 2025):
 * server/algorithms/*, server/services/aiCounselor.js, server/data/*,
 * server/index.js and the client pages.
 */

export const LINKS = [{ href: 'https://github.com/allenvarghese05/college-matcher', label: 'Repository' }];

export const COPY = {
  outcome:
    'College matching you can read: a 100-point score that shows exactly where every point came from, a balanced safety / target / reach list, and a voice counselor named Alex for the career side.',
  status: 'Personal project · prototype dataset',
  before: [
    'College rankings give one number with no explanation',
    'A list of dream schools isn’t a plan — students need safeties and reaches',
    'Career interest quizzes feel like forms, not conversations',
    'Cost, distance and fit rarely appear next to academics',
  ],
  after: [
    'A score out of 100 split into academics, money, personality, place and activities',
    'A top-10 list balanced across safety, target and reach by the student’s GPA',
    'A spoken conversation with an AI counselor that can pause and resume',
    'Budget, in-state tuition, location, size and climate all count toward the score',
  ],
  built:
    'A solo full-stack prototype — React 18 on an Express API — committed in one go on 6 Aug 2025. The matching engine and the counselor are real; the data is a starter set of 10 schools and 21 career profiles, so it’s a working demonstration rather than a complete database.',
  next: [
    'Replace the 10-school starter set with real college data.',
    'Grow the career database (21 detailed profiles today).',
    'Add authentication — it’s listed as planned — and store results per student.',
  ],
  headlines: {
    problem: 'A ranking gives one number; a student needs to know why — and what’s realistic.',
    how: 'From an assessment to a balanced list of ten — five weighted parts, two caps, three categories.',
    inside: 'An explainable score, honest admission odds, and a counselor you can talk to.',
    decisions: 'Three decisions that make the match explainable instead of a black box.',
    architecture: 'A React client and an Express API with two matching engines and an AI counselor.',
    build: 'One commit — the whole prototype.',
    next: 'What would make it a real tool.',
  },
  buildNote: 'The whole project is one commit (6 Aug 2025) — the history doesn’t show how it was built up, so there’s no timeline to draw. The repo’s own notes (ALGORITHM_IMPROVEMENTS.md) describe how the scoring weights were rebalanced.',
};

export const FLOW = {
  caption: 'From an assessment to ten schools',
  figureCaption: 'How a match score is made',
  steps: [
    { key: 'assess', label: 'Assessment', title: 'Tell it about yourself', body: 'A multi-step form (or the voice counselor) collects GPA and grade trend, intended major, budget and financial-aid need, home state, personality type, preferred location, size and climate, and activities.', facts: ['POST /api/assessment', 'Every school in the dataset is scored against it'] },
    { key: 'academic', label: 'Academics · 50', title: 'Can you get in, and is it strong in your major?', body: 'Up to 30 points for program strength in the intended major (weighted per school), up to 20 for admission probability, plus a bonus for a rising grade trend.', facts: ['30 × program strength (if the school is strong in the major)', '20 × admission probability'] },
    { key: 'money', label: 'Money · 20', title: 'Can you afford it?', body: 'Points step down as tuition moves past the budget — +15 well within, +12 within, +8 slightly over, +4 over, −5 far over — plus aid likelihood and a bonus for in-state tuition.', facts: ['Up to +8 for aid likelihood', '+5 in-state bonus; floor of −10'] },
    { key: 'fit', label: 'Fit · 15 + 10 + 5', title: 'Personality, place and activities', body: 'A personality-compatibility score (up to 15), location, size and climate preferences (up to 10), and how well the school’s programs match the student’s activities (up to 5).', facts: ['Personality: up to 15', 'Location & size: up to 10 · activities: up to 5'] },
    { key: 'caps', label: 'Reality check', title: 'Caps for the schools that aren’t realistic', body: 'A GPA well below a school’s average caps its score at 30; tuition more than 1.5× the budget caps it at 20. Then everything is clamped to 0–100.', facts: ['GPA < 0.8 × school average → max 30', 'Tuition > 1.5 × budget → max 20'] },
    { key: 'balance', label: 'Balance', title: 'Safeties, targets and reaches', body: 'Each school is labelled by admission probability — safety ≥ 0.8, target ≥ 0.4, otherwise reach — and the list is balanced across the three according to the student’s GPA, then filled with the best remaining matches up to ten.', facts: ['Match levels: Perfect ≥ 85, Excellent ≥ 70, Good ≥ 55, Fair ≥ 40', 'Top reasons and an explanation per school'] },
  ],
};

export const FEATURES = [
  { key: 'score', label: 'Matching', title: 'Every point accounted for', body: 'Five weighted parts — academics 50, money 20, personality 15, location & size 10, activities 5 — returned as a breakdown with the top reasons, so the student can see why a school ranks where it does.', stat: { value: '100', label: 'points, five parts' } },
  { key: 'odds', label: 'Admissions', title: 'Odds from the GPA ratio', body: 'Admission probability starts from the student’s GPA divided by the school’s average (0.95 at 1.2× or more, down to 0.1 below 0.7×), with a small penalty for being far overqualified, and then the school’s acceptance rate.', stat: { value: '3', label: 'categories: safety, target, reach' } },
  { key: 'alex', label: 'Voice', title: 'Alex, the career counselor', body: 'A spoken conversation in the browser (Web Speech API for listening and speaking) with a GPT-4 counselor that asks follow-up questions, can pause and resume, and maps the answers to career profiles.', stat: { value: 'GPT-4', label: 'temperature 0.7' } },
  { key: 'careers', label: 'Careers', title: 'Careers with salaries and skill gaps', body: 'Each career profile carries skills, interests, work environment, typical majors, a salary range, growth outlook and a skills-gap list, matched by a second algorithm.', stat: { value: '21', label: 'detailed career profiles' } },
];

export const DECISIONS = [
  {
    id: 'weights',
    kicker: 'Scoring',
    title: 'Weights you can defend, and a breakdown you can read',
    problem: 'An earlier version over-weighted personality. A single opaque score can’t be questioned, and it can rank a dream school above everything a student can actually reach.',
    decision: 'Fix the weights at 50 / 20 / 15 / 10 / 5 with academic fit first, compute each part separately, and return the breakdown and the top reasons with every match.',
    tradeoff: 'The weights are a judgement, not learned from outcomes — but because they’re explicit, a student or counselor can see and argue with them.',
    caption: 'The weights',
    steps: ['Academic fit — 50', 'Financial fit — 20', 'Personality compatibility — 15 (reduced from 25)', 'Location and size — 10', 'Extracurricular alignment — 5'],
    readout: 'server/algorithms/matchingAlgorithm.js — scoringWeights.',
    code: {
      file: 'server/algorithms/matchingAlgorithm.js',
      lang: 'js',
      body: `this.scoringWeights = {
  academic: 50,      // Academic fit is #1 predictor of success
  financial: 20,     // Important but not dominant
  personality: 15,   // Matters but was over-weighted before
  locationSize: 10,  // Location and size preferences
  extracurricular: 5 // Nice to have but not critical
};`,
    },
  },
  {
    id: 'caps',
    kicker: 'Realism',
    title: 'A great fit you can’t get into isn’t a great match',
    problem: 'Adding up fit scores lets a school a student can’t realistically attend or afford still come out on top.',
    decision: 'Hard caps after the sum: a GPA below 80% of the school’s average caps the score at 30, and tuition more than 1.5× the budget caps it at 20.',
    tradeoff: 'Caps are blunt: a student just under the GPA line gets the same ceiling as one far below it.',
    caption: 'Applied after the five parts are added',
    steps: ['Add the five parts', 'GPA < 0.8 × school average → cap at 30', 'Tuition > 1.5 × budget → cap at 20', 'Clamp to 0–100 and round'],
    readout: 'calculateMatches() in matchingAlgorithm.js.',
    code: {
      file: 'server/algorithms/matchingAlgorithm.js',
      lang: 'js',
      body: `if (assessment.currentGPA < school.averageGPA * 0.8) {
  totalScore = Math.min(totalScore, 30); // Cap at 30 if significantly below average
}
if (assessment.maxBudget && school.tuition > assessment.maxBudget * 1.5) {
  totalScore = Math.min(totalScore, 20); // Cap at 20 if unaffordable
}
totalScore = Math.min(Math.max(totalScore, 0), 100);`,
    },
  },
  {
    id: 'balance',
    kicker: 'Lists',
    title: 'A list with safeties in it',
    problem: 'Sorting by score alone can return ten reaches — or ten safeties — depending on the student.',
    decision: 'Label every school safety, target or reach from its admission probability, take a GPA-dependent number of each, then fill the rest with the best remaining matches, up to ten.',
    tradeoff: 'The final order mixes categories rather than pure score, by design.',
    caption: 'Building the top ten',
    steps: ['Probability ≥ 0.8 → safety', 'Probability ≥ 0.4 → target', 'Otherwise → reach', 'Take a GPA-based share of each', 'Fill with the best remaining, up to 10'],
    readout: 'balanceRecommendationsAdaptive() in matchingAlgorithm.js.',
    code: {
      file: 'server/algorithms/matchingAlgorithm.js',
      lang: 'js',
      body: `const balanced = [];
balanced.push(...categorized.Safety.slice(0, balance.safety));
balanced.push(...categorized.Target.slice(0, balance.target));
balanced.push(...categorized.Reach.slice(0, balance.reach));
// Fill remaining slots with best overall matches
const remaining = matches.filter(m => !balanced.includes(m));
balanced.push(...remaining.slice(0, 2));
return balanced.slice(0, 10);`,
    },
  },
];

export const LAYERS = [
  { key: 'who', label: 'Who', nodes: ['student'] },
  { key: 'app', label: 'React client', nodes: ['assess-ui', 'voice-ui', 'browse'] },
  { key: 'domain', label: 'Express API', nodes: ['match', 'career', 'counselor'] },
  { key: 'data', label: 'Data', nodes: ['schools', 'careers'] },
  { key: 'out', label: 'Outside', nodes: ['openai', 'speech'] },
];

export const TRACES = [
  { id: 'match', label: 'Match colleges', steps: ['student', 'assess-ui', 'match', 'schools', 'match'] },
  { id: 'voice', label: 'Talk to Alex', steps: ['student', 'voice-ui', 'speech', 'counselor', 'openai', 'career', 'careers'] },
  { id: 'browse', label: 'Browse schools', steps: ['student', 'browse', 'schools'] },
];

/* ── the case study in one screen ─────────────────────────────────────────── */
export const OVERVIEW = [
  { label: 'What it is', text: 'A college matcher you can read: a 100-point score split into academics, money, personality, place and activities; a balanced list of safeties, targets and reaches; and Alex, a GPT-4 voice counselor for the career side.' },
  { label: 'Why it exists', text: 'Rankings give one opaque number. A student needs to know why a school fits, whether they can get in and afford it — and a list that isn’t ten reaches.' },
  { label: 'What Allen did', text: 'Solo: the matching engine and its caps, the admission odds, the safety/target/reach balance, the career matcher, the voice counselor and the React client.' },
  { label: 'Where it stands', text: 'A working prototype in one commit, with a starter dataset — 10 schools and 21 career profiles — rather than a full college database.' },
];
