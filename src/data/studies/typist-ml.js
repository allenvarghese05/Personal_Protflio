/**
 * The Typist-ML case study — every fact the page shows, in one place.
 * Components only render this; change copy here.
 *
 * Checked against the repository itself (github.com/allenvarghese05/typist-ml,
 * main at PR #45, 2026-10-30): the design doc (docs/design, v1.0, 42 pages),
 * CLAUDE.md, docs/analysis-plan.md, docs/decisions, the code under
 * services/api and apps/web, the golden fixture and the git history.
 *
 * Status, plainly: milestones M0–M3 are merged; the pilot has not run and
 * there are no results. The browser shows a typing demo, an admin page and a
 * bigram matrix — the participant screens are not wired to the API yet, and
 * the full loop runs only in a scripted server-side test.
 *
 * Where a number is a measurement, how it was made travels with it:
 *   - GATE samples, MEASURED, and the ledger and governor in DECISIONS come
 *     from running the repo's own generators and validator (main's code,
 *     seeds as stated, the 20,000-word corpus built by `typist corpus build`).
 *     They are reproducible, not hand-typed — but they are not a recorded run
 *     committed to the repo. The heuristic's 0.223–0.281 range at the first
 *     window matches docs/plans/T2.4-plan.md; the Markov median 0.175 matches
 *     docs/plans/T3.1-plan.md.
 *   - Not used anywhere: the LLM bake-off figures in D29/D30. They are
 *     reference constants in generation/llm/bakeoff.py; no measured run of
 *     the model is committed.
 */

/* ── the four methods (arms) ──────────────────────────────────────────────── */
// config arms_enabled, in its stored order (migration 0001) — the Latin
// square rotates this order, and the assignment shuffles it per participant.
export const ARMS = [
  { key: 'control', label: 'Control', initial: 'C', note: 'No targeted drills — plain practice text from the 5,000 most common words.' },
  { key: 'heuristic', label: 'Heuristic', initial: 'H', note: 'Picks real words that contain the target pairs, steering by a density governor.' },
  { key: 'markov', label: 'Markov', initial: 'M', note: 'An order-3 character chain writes pseudo-words, boosting each target pair’s second letter 10×.' },
  { key: 'llm', label: 'LLM', initial: 'L', note: 'Llama 3.2 1B (4-bit) on the laptop via mlx-lm, prompted with the target pairs.' },
];

/* ── 02 the golden session — services/api/tests/fixtures/golden_session.json ─ */
// Hand-derived by the owner line by line (docs/plans/T1.2-derivation.md);
// TypeScript (TextCursor) and Python (attribution) tests both read this file.
export const GOLDEN = {
  text: 'the small hill on the other side of the old red barn and the farm',
  signed: 'Oct 13',
  // every keystroke row: [seq, key, position, outcome (ok · err · bs),
  // first attempt, keydown ms from block start, first key after a blur]
  keys: [
    [0, "⌫", 0, "bs", null, 1851, false], [1, "t", 0, "ok", true, 2675, false], [2, "h", 1, "ok", true, 2765, false], [3, "e", 2, "ok", true, 2905, false],
    [4, " ", 3, "ok", true, 3065, false], [5, "s", 4, "ok", true, 3245, false], [6, "a", 5, "err", true, 3395, false], [7, "l", 6, "err", true, 3555, false],
    [8, "⌫", 6, "bs", null, 4455, false], [9, "⌫", 5, "bs", null, 4625, false], [10, "m", 5, "ok", false, 4855, false], [11, "a", 6, "ok", false, 5005, false],
    [12, "l", 7, "ok", true, 5145, false], [13, "l", 8, "ok", true, 5305, false], [14, " ", 9, "ok", true, 5455, false], [15, "h", 10, "ok", true, 5665, false],
    [16, " ", 11, "err", true, 5795, false], [17, "⌫", 11, "bs", null, 6645, false], [18, "i", 11, "ok", false, 6845, false], [19, "l", 12, "ok", true, 6995, false],
    [20, "l", 13, "ok", true, 7165.5, false], [21, "b", 14, "err", true, 7325.5, false], [22, "⌫", 14, "bs", null, 11325.5, true], [23, " ", 14, "ok", false, 11575.5, false],
    [24, "o", 15, "ok", true, 11755.5, false], [25, "n", 16, "ok", true, 11885.5, false], [26, " ", 17, "ok", true, 12035.5, false], [27, "t", 18, "ok", true, 12205.5, false],
    [28, "g", 19, "err", true, 12325.5, false], [29, "⌫", 19, "bs", null, 13205.5, false], [30, "h", 19, "ok", false, 13425.5, false], [31, "e", 20, "ok", true, 13555.5, false],
    [32, " ", 21, "ok", true, 13695.5, false], [33, "o", 22, "ok", true, 13885.5, false], [34, "t", 23, "ok", true, 14035.5, false], [35, "h", 24, "ok", true, 15835.5, true],
    [36, "e", 25, "ok", true, 15930.5, false], [37, "r", 26, "ok", true, 15990.5, false], [38, " ", 27, "ok", true, 16160.5, false], [39, "s", 28, "ok", true, 16320.5, false],
    [40, "i", 29, "ok", true, 16460.5, false], [41, "⌫", 29, "bs", null, 16760.5, false], [42, "i", 29, "ok", false, 16970.5, false], [43, "d", 30, "ok", true, 17120.5, false],
    [44, "e", 31, "ok", true, 17240.5, false], [45, " ", 32, "ok", true, 17390.5, false], [46, "o", 33, "ok", true, 17560.5, false], [47, "⌫", 33, "bs", null, 18510.5, false],
    [48, "⌫", 32, "bs", null, 18670.5, false], [49, "⌫", 31, "bs", null, 18830.5, false], [50, "e", 31, "ok", false, 19090.5, false], [51, " ", 32, "ok", false, 19230.5, false],
    [52, "o", 33, "ok", false, 19390.5, false], [53, "f", 34, "ok", true, 19540.5, false], [54, " ", 35, "ok", true, 19680.5, false], [55, "t", 36, "ok", true, 19860.5, false],
    [56, "e", 37, "err", true, 19960.5, false], [57, "h", 38, "err", true, 20050.5, false], [58, "⌫", 38, "bs", null, 20970.5, false], [59, "⌫", 37, "bs", null, 21120.5, false],
    [60, "h", 37, "ok", false, 21350.5, false], [61, "e", 38, "ok", false, 21470.5, false], [62, " ", 39, "ok", true, 21620.5, false], [63, "o", 40, "ok", true, 21790.5, false],
    [64, "l", 41, "ok", true, 24290.5, false], [65, "d", 42, "ok", true, 26290.5, false], [66, " ", 43, "ok", true, 26440.5, false], [67, "r", 44, "ok", true, 26620.5, false],
    [68, "w", 45, "err", true, 28120.5, true], [69, "⌫", 45, "bs", null, 29000.5, false], [70, "e", 45, "ok", false, 29210.5, false], [71, "d", 46, "ok", true, 29350.5, false],
    [72, " ", 47, "ok", true, 29500.5, false], [73, "b", 48, "ok", true, 29690.5, false], [74, "a", 49, "ok", true, 29840.5, false], [75, "r", 50, "ok", true, 29980.5, false],
    [76, "n", 51, "ok", true, 30140.5, false], [77, " ", 52, "ok", true, 30290.5, false], [78, "a", 53, "ok", true, 30460.5, false], [79, "n", 54, "ok", true, 30581, false],
    [80, "d", 55, "ok", true, 30691, false], [81, " ", 56, "ok", true, 30841, false], [82, "t", 57, "ok", true, 31021, false], [83, "h", 58, "ok", true, 31121, false],
    [84, "e", 59, "ok", true, 31231, false], [85, " ", 60, "ok", true, 31381, false], [86, "f", 61, "ok", true, 31561, false], [87, "s", 62, "err", true, 31701, false],
    [88, "r", 63, "ok", true, 31851, false],
  ],
  // the hand-derived verdict for every letter pair the block reaches:
  // [position j, pair, seq of its first letter, seq of its second, result, timing sample ms]
  pairs: [
    [1, "th", 1, 2, "counted", 90],
    [2, "he", 2, 3, "counted", 140],
    [5, "sm", 5, 6, "error", null],
    [6, "ma", 6, 7, "skipFirst", null],
    [7, "al", 7, 12, "skipFirst", null],
    [8, "ll", 12, 13, "counted", 160],
    [11, "hi", 15, 16, "error", null],
    [12, "il", 16, 19, "skipFirst", null],
    [13, "ll", 19, 20, "counted", 170.5],
    [16, "on", 24, 25, "counted", 130],
    [19, "th", 27, 28, "error", null],
    [20, "he", 28, 31, "skipFirst", null],
    [23, "ot", 33, 34, "counted", 150],
    [24, "th", 34, 35, "paused", null],
    [25, "he", 35, 36, "counted", 95],
    [26, "er", 36, 37, "counted", 60],
    [29, "si", 39, 40, "counted", 140],
    [30, "id", 40, 43, "skipBackspace", null],
    [31, "de", 43, 44, "counted", 120],
    [34, "of", 46, 53, "skipBackspace", null],
    [37, "th", 55, 56, "error", null],
    [38, "he", 56, 57, "skipFirst", null],
    [41, "ol", 63, 64, "paused", null],
    [42, "ld", 64, 65, "counted", 2000],
    [45, "re", 67, 68, "error", null],
    [46, "ed", 68, 71, "skipFirst", null],
    [49, "ba", 73, 74, "counted", 150],
    [50, "ar", 74, 75, "counted", 140],
    [51, "rn", 75, 76, "counted", 160],
    [54, "an", 78, 79, "counted", 120.5],
    [55, "nd", 79, 80, "counted", 110],
    [58, "th", 82, 83, "counted", 100],
    [59, "he", 83, 84, "counted", 110],
    [62, "fa", 86, 87, "error", null],
    [63, "ar", 87, 88, "skipFirst", null],
    [64, "rm", 88, null, "skipMissing", null],
  ],
  // expected_bigram_stats — what attribution must produce: [pair, attempts, errors, median ms]
  rows: [
    ["th", 5, 2, 95],
    ["he", 3, 0, 110],
    ["sm", 1, 1, null],
    ["ll", 2, 0, 165.25],
    ["hi", 1, 1, null],
    ["on", 1, 0, 130],
    ["ot", 1, 0, 150],
    ["er", 1, 0, 60],
    ["si", 1, 0, 140],
    ["de", 1, 0, 120],
    ["ol", 1, 0, null],
    ["ld", 1, 0, 2000],
    ["re", 1, 1, null],
    ["ba", 1, 0, 150],
    ["ar", 1, 0, 140],
    ["rn", 1, 0, 160],
    ["an", 1, 0, 120.5],
    ["nd", 1, 0, 110],
    ["fa", 1, 1, null],
  ],
  // the 18 labelled edge cases (case_index), in the fixture's own order;
  // `seqs` are the keystroke ranges each one covers
  cases: [
    { key: 'a', title: 'A wrong first letter voids the next pair', seqs: [[27, 31]], note: 'g typed for h: “th” is an attempt and an error, and “he” is skipped — even after the h is fixed.' },
    { key: 'b', title: 'A retyped letter is not a first attempt', seqs: [[29, 30]], note: 'Backspace, then h again at the same position: it no longer counts as a first try.' },
    { key: 'c', title: 'A Backspace between two letters voids their pair', seqs: [[39, 44]], note: '“si” counts (140 ms); the i is erased and retyped, so “id” is skipped; “de” counts.' },
    { key: 'd', title: 'Erasing back across a space', seqs: [[46, 53]], note: 'Three Backspaces erase o, a space and e. Only “of” is affected: skipped.' },
    { key: 'e', title: 'A Backspace before anything is typed', seqs: [[0, 0]], note: 'A no-op at position 0 — the next key is still the first attempt there.' },
    { key: 'f', title: 'A skipped letter shifts everything after it', seqs: [[5, 11]], note: 'The m in “small” is left out: a and l land one place early as errors. “sm” is an error; “ma” and “al” are skipped.' },
    { key: 'g', title: 'A transposition is one slip, not two', seqs: [[55, 61]], note: '“teh”: “th” is one error; “he” is skipped rather than counted as a second.' },
    { key: 'h', title: 'A space and a letter swapped', seqs: [[15, 18], [21, 21]], note: 'A space where the i belongs makes “hi” an error. A b where a space belongs costs accuracy but sits in no pair.' },
    { key: 'i', title: 'An error left on screen', seqs: [[86, 88]], note: 's typed for the a in “farm” is never fixed: “fa” is an error and “ar” is skipped.' },
    { key: 'j', title: 'The block ends early', seqs: [[88, 88]], note: 'Typing stops one character short, so “rm” has no second key — skipped.' },
    { key: 'k', title: 'Rollover', seqs: [[1, 2]], note: 'h goes down before t comes up; the “th” timing (90 ms) stands.' },
    { key: 'l', title: 'A key pressed and released inside another', seqs: [[36, 38]], note: 'r goes down and up while e is held; the “he” and “er” timings stand.' },
    { key: 'm', title: 'A pause after the window lost focus', seqs: [[34, 35]], note: 'The first key after a blur, 1,800 ms later: “th” is an attempt, but its timing is dropped.' },
    { key: 'n', title: 'A gap longer than two seconds', seqs: [[63, 64]], note: '2,500 ms with no blur: “ol” is an attempt with no timing sample.' },
    { key: 'o', title: 'A gap of exactly two seconds', seqs: [[64, 65]], note: '2,000 ms is not over 2,000, so “ld” keeps its 2,000 ms sample.' },
    { key: 'p', title: 'After a blur: a Backspace, later an error', seqs: [[22, 23], [67, 68]], note: 'The pause flag sits on the Backspace, not the key after it. w for e after a blur still makes “re” an error.' },
    { key: 'q', title: 'A key-up that never arrived', seqs: [[24, 26]], note: 'n has no release time, so its dwell is empty — the “on” timing (130 ms) is unaffected.' },
    { key: 's', title: 'The same key twice', seqs: [[12, 13], [19, 20]], note: 'Both double l’s come from one physical key (KeyL); samples 160 and 170.5 ms.' },
  ],
  // the cases the panel offers as shortcuts
  featured: [
    { key: 'f', label: 'Skipped letter' },
    { key: 'g', label: 'Transposition' },
    { key: 'c', label: 'Backspace between' },
    { key: 'm', label: 'Pause after a blur' },
    { key: 'o', label: 'Exactly 2 s' },
    { key: 'i', label: 'Error left in' },
  ],
  // expected_session
  session: { correct: 55, firstAttempts: 64, accuracy: 0.859375, wpm: 22 },
  // a pause is a blur, or a gap strictly over this (D24)
  pauseMs: 2000,
};

/** What one keystroke row carries — apps/web/src/telemetry/KeystrokeRecorder.ts. */
export const ROW_FIELDS = [
  { name: 't_down_ms', note: 'the keydown’s event.timeStamp, from block start' },
  { name: 'dwell_ms', note: 'key-up paired to its press by physical key code' },
  { name: 'iki_ms', note: 'this press minus the previous press' },
  { name: 'outcome', note: 'correct · error · backspace, by position' },
  { name: 'first_attempt', note: 'only the first key ever typed at a position' },
  { name: 'after_pause', note: 'the first key after the window lost focus' },
  { name: 'handler_ms', note: 'the handler’s own cost, by performance.now()' },
];

/** Pool raw samples, then take one median — tests/unit/test_session_metrics.py. */
export const POOLING = { blocks: [[100, 200, 300], [1000]], pooled: 250, medianOfMedians: 600 };

/* ── 03 weak pairs → four fair sets — services/assignment.py ─────────────── */
export const ASSIGN = {
  strength: 20, // assignment_prior_strength (migration 0005)
  minObservations: 15, // lowered from the design's 20 by D28
  designMinObservations: 20,
  perSet: 4,
  fallbackPerSet: 3,
  sets: ['A', 'B', 'C', 'D'],
  seed: 20261021, // assignment_seed (migration 0005)
  // tests/unit/test_assignment.py — the two hand-computed posterior means
  examples: [
    { key: 'sparse', label: '1 error in 3 tries', errors: 1, attempts: 3, p0: 0.05, source: 'the design doc’s own example' },
    { key: 'steady', label: '3 errors in 10 tries', errors: 3, attempts: 10, p0: 0.1, source: 'a hand-computed test case' },
  ],
  // shuffle_arms(arms_enabled, random.Random(f"{seed}:{participant_id}")),
  // run on three example ids (real ids are random UUID4s)
  participants: [
    { id: '00000000-0000-4000-8000-000000000001', label: 'Participant 1', arms: ['control', 'heuristic', 'llm', 'markov'] },
    { id: '00000000-0000-4000-8000-000000000002', label: 'Participant 2', arms: ['llm', 'heuristic', 'markov', 'control'] },
    { id: '00000000-0000-4000-8000-000000000003', label: 'Participant 3', arms: ['markov', 'control', 'heuristic', 'llm'] },
  ],
  // alembic/versions/0005_assignment_config.py
  trigger: {
    sql: "CREATE TRIGGER … BEFORE UPDATE ON bigram_assignment\nWHEN OLD.frozen_at IS NOT NULL\nBEGIN SELECT RAISE(ABORT, 'bigram_assignment rows are frozen'); END",
    message: 'bigram_assignment rows are frozen',
  },
  // migration 0012 (T3.5): the same idea for the whole experiment config
  configKeys: 33,
};

/* ── 04 the fairness gate — generation/validator.py ───────────────────────── */
export const GATE = {
  // d_min / d_max: 0.15 → 0.10 in migration 0011 (T3.4, D30), frozen since 0012
  window: { min: 0.1, max: 0.4, firstMin: 0.15 },
  maxAttempts: 5,
  // the eight reject reasons, in RejectReason order. `scope`: who it applies
  // to — 'all', 'targeted' (skipped for control, which has no targets), 'llm'
  rules: [
    { key: 'too_short', label: 'At least 270 characters', scope: 'all' },
    { key: 'bad_charset', label: 'Only a–z and single spaces', scope: 'all' },
    { key: 'density_low', label: 'Target density at least 0.10', scope: 'targeted' },
    { key: 'density_high', label: 'Target density at most 0.40', scope: 'targeted' },
    { key: 'coverage', label: 'Every target pair at least 3 times', scope: 'targeted' },
    { key: 'word_repeat', label: 'No word more than 3 times', scope: 'all' },
    { key: 'bigram_repeat', label: 'No pair three times back to back in a word', scope: 'all' },
    { key: 'real_word_ratio', label: 'At least 80% dictionary words', scope: 'llm' },
  ],
  // one drill per choice: seed 7, participant "p1", the four most / least
  // frequent of the 150 tracked pairs, window [0.10, 0.40]; metrics are the
  // validator's own
  samples: [
    {
      key: 'control', arm: 'control', label: 'Control', targets: [],
      text: 'road still suggested his stars areas by congress on pain all do sleep desk over stop awards moderate extremely decided coalition be francis low years first education rome give dollars wins production plays my but government votes india program standards hi asked clothing id five users avoid pray w i',
      density: 0, coverage: {}, length: 300, maxWord: 1, run: 1, realWord: 1, reasons: [],
    },
    {
      key: 'heuristic', arm: 'heuristic', label: 'Heuristic · th he in an', targets: ['th', 'he', 'in', 'an'],
      text: 'the about drug an apparent in the get practice in an nations that he inc got and example this he fine and nose can oh win near there ha taken into within whose them pull hand across any she check that champion can mind they concerned any skin they burned man going things happy grand she her while',
      density: 0.2473, coverage: { th: 11, he: 12, in: 11, an: 11 }, length: 297, maxWord: 2, run: 1, realWord: 1, reasons: [],
    },
    {
      key: 'markov', arm: 'markov', label: 'Markov · th he in an', targets: ['th', 'he', 'in', 'an'],
      text: 'belleal the ming reso par blans someasteac gang prehancese janalts micallorb way men don pents pan kup freme momb sustupther ast for thereve yourpmen ants train swating screc pries hatinctiab rend fens clumins ing respor objeaguse trannoorea wan meed cening the gover stroadelos dring lantanah slient',
      density: 0.1244, coverage: { th: 4, he: 4, in: 8, an: 10 }, length: 300, maxWord: 2, run: 1, realWord: 0.304, reasons: [],
    },
    {
      key: 'markov-rare', arm: 'markov', label: 'Markov · ex gr ey uc', targets: ['ex', 'gr', 'ey', 'uc'],
      text: 'beal harest milley ngs wittooming anducked gremaskeve muctupinal losespaids cbilen men don pently wayeporeac coughtobse libuce non astill ateeporter psy ant parring swarteranc beggisruct hate luci rend fens clucepulli blownist objeapt sheeksonsh freastatur masey stion gractionst serangs maticardom',
      density: 0.0448, coverage: { ex: 0, gr: 2, ey: 2, uc: 6 }, length: 298, maxWord: 1, run: 1, realWord: 0.132, reasons: ['density_low', 'coverage'],
    },
  ],
};

/* ── 05 who clears the gate — measured on main's generators ───────────────── */
// Seeds 0–49, one attempt each (the worker allows five), participant "p1",
// Markov β = 10. "Common" = the corpus's four most frequent tracked pairs;
// "rare" = the four least frequent of the 150; "3 pairs" = the fallback set
// size when too few pairs qualify. The heuristic's numbers move with the
// window because its governor aims at the window's midpoint.
export const MEASURED = {
  seeds: 50,
  windows: [
    { key: 'first', label: '0.15 – 0.40', min: 0.15, max: 0.4, note: 'the first window (migration 0001)' },
    { key: 'now', label: '0.10 – 0.40', min: 0.1, max: 0.4, note: 'calibrated in T3.4, frozen in T3.5' },
  ],
  rows: [
    { key: 'h-common', arm: 'heuristic', targets: 'th he in an', kind: 'common', first: { ok: 50, min: 0.265, med: 0.272, max: 0.281 }, now: { ok: 50, min: 0.244, med: 0.25, max: 0.257 } },
    { key: 'h-three', arm: 'heuristic', targets: 'th he in', kind: '3 pairs', first: { ok: 50, min: 0.266, med: 0.273, max: 0.28 }, now: { ok: 50, min: 0.242, med: 0.249, max: 0.255 } },
    { key: 'h-rare', arm: 'heuristic', targets: 'ex gr ey uc', kind: 'rare', first: { ok: 50, min: 0.223, med: 0.251, max: 0.267 }, now: { ok: 50, min: 0.224, med: 0.239, max: 0.251 } },
    { key: 'm-common', arm: 'markov', targets: 'th he in an', kind: 'common', first: { ok: 39, min: 0.124, med: 0.175, max: 0.238, why: 'density 6 · coverage 7' }, now: { ok: 43, min: 0.124, med: 0.175, max: 0.238, why: 'coverage 7' } },
    { key: 'm-three', arm: 'markov', targets: 'th he in', kind: '3 pairs', first: { ok: 6, min: 0.076, med: 0.123, max: 0.201, why: 'density 44 · coverage 4' }, now: { ok: 40, min: 0.076, med: 0.123, max: 0.201, why: 'density 8 · coverage 4' } },
    { key: 'm-rare', arm: 'markov', targets: 'ex gr ey uc', kind: 'rare', first: { ok: 0, min: 0.009, med: 0.033, max: 0.062, why: 'density 50 · coverage 50' }, now: { ok: 0, min: 0.009, med: 0.033, max: 0.062, why: 'density 50 · coverage 50' } },
  ],
  // control has no targets, so no density: it passed 50 of 50 at both windows
  control: { ok: 50 },
};

/* ── 06 a practice day — services/session_planner.py ──────────────────────── */
export const PLANNER = {
  practiceDays: 10, // practice_days (migration 0001)
  blockChars: 600, // block_chars
  drillChars: 300, // drill_length_chars → 2 drills per block
  poolDays: 3, // POOL_TARGET_DAYS → 6 ready drills per arm
  staleMinutes: 30, // an unfinished session older than this is abandoned
};

/* ── 07 three hard problems ───────────────────────────────────────────────── */
export const DECISIONS = [
  {
    id: 'governor',
    kicker: 'Fairness',
    title: 'A greedy picker overshoots — so the heuristic steers by its own density',
    problem:
      'The heuristic builds a drill word by word from real words that contain the target pairs. Always taking the most target-rich word makes text that is almost all target pairs — the code’s own note says a greedy loop with no governor overshoots the 0.40 ceiling — and a drill denser than the other methods’ would win for the wrong reason.',
    decision:
      'Before every word it measures the drill so far: target-pair occurrences ÷ all letter pairs. At or under the window’s midpoint it picks a word for the least-covered target pair (a softmax over the top 50 by target share × word frequency); over the midpoint it picks a filler word that contains no target pair at all.',
    tradeoff:
      'The heuristic never writes the densest drill it could — by design it hovers at the midpoint (0.25 for the 0.10–0.40 window). In exchange it lands inside the window every time: 50 of 50 seeds on each target set measured, first try.',
    // HeuristicGenerator, seed 7, targets th he in an, window [0.10, 0.40]:
    // [word, density of the drill before this word, 1 = target word / 0 = filler]
    midpoint: 0.25,
    finalDensity: 0.2473,
    targets: ['th', 'he', 'in', 'an'],
    trace: [
      ["the", 0, 1], ["about", 1, 0], ["drug", 0.3333, 0], ["an", 0.2222, 1], ["apparent", 0.3, 0], ["in", 0.1765, 1],
      ["the", 0.2222, 1], ["get", 0.3, 0], ["practice", 0.2727, 0], ["in", 0.2069, 1], ["an", 0.2333, 1], ["nations", 0.2581, 0],
      ["that", 0.2162, 1], ["he", 0.225, 1], ["inc", 0.2439, 1], ["got", 0.2558, 0], ["and", 0.2444, 1], ["example", 0.2553, 0],
      ["this", 0.2264, 1], ["he", 0.2321, 1], ["fine", 0.2456, 1], ["and", 0.25, 1], ["nose", 0.2581, 0], ["can", 0.2462, 1],
      ["oh", 0.2537, 0], ["win", 0.25, 1], ["near", 0.2571, 0], ["there", 0.2466, 1], ["ha", 0.2597, 0], ["taken", 0.2564, 0],
      ["into", 0.2439, 1], ["within", 0.2471, 1], ["whose", 0.2556, 0], ["them", 0.2447, 1], ["pull", 0.2577, 0], ["hand", 0.25, 1],
      ["across", 0.2524, 0], ["any", 0.2407, 1], ["she", 0.2455, 1], ["check", 0.25, 1], ["that", 0.25, 1], ["champion", 0.2521, 0],
      ["can", 0.2381, 1], ["mind", 0.2422, 1], ["they", 0.2443, 1], ["concerned", 0.2537, 0], ["any", 0.2394, 1], ["skin", 0.2431, 1],
      ["they", 0.2449, 1], ["burned", 0.2533, 0], ["man", 0.2452, 1], ["going", 0.2484, 1], ["things", 0.2484, 1], ["happy", 0.253, 0],
      ["grand", 0.2471, 1], ["she", 0.2471, 1], ["her", 0.25, 1], ["while", 0.2528, 0],
    ],
    code: {
      file: 'services/api/src/typist/generation/heuristic.py',
      lang: 'py',
      body: `midpoint = (spec.min_density + spec.max_density) / 2
while True:
    density = target_occurrences / total_bigrams if total_bigrams else 0.0
    word = None
    if not density > midpoint:
        # under the midpoint: a word for the least-covered target pair
        lowest = min(coverage[bigram] for bigram in targets)
        tied = sorted(b for b in targets if coverage[b] == lowest)
        rng.shuffle(tied)
        for bigram in tied:
            eligible = [c for c in ranked[bigram] if used.get(c, 0) < 2][:50]
            if eligible:
                word = softmax_choice(rng, eligible, scores, 0.5)
                break
    if word is None:
        # over it: a filler word with no target pair, weighted by sqrt(freq)
        word = weighted_choice(rng, eligible_fillers, sqrt_freq)`,
    },
  },
  {
    id: 'claim',
    kicker: 'Concurrency',
    title: 'Two workers can never claim the same job',
    problem:
      'Drills are written ahead of time by a separate worker process — a language-model call takes seconds and can be rejected and retried, so it never runs in the typing loop. Jobs queue in SQLite. If two workers, or two poll cycles, read “the oldest pending job” at once, both would generate it.',
    decision:
      'One statement does the read and the write: UPDATE … SET status = ‘running’ WHERE id = (the oldest pending id) AND status = ‘pending’ RETURNING id. SQLite runs it as one write, so exactly one caller gets the id back; everyone else gets nothing and polls again in 2 s.',
    tradeoff:
      'Polling every two seconds instead of a push queue, on SQLite’s single writer — fine for one laptop and two participants, and nothing to install. A test fires four concurrent callers at one pending job: exactly one claims it.',
    scenarios: [
      { key: 'race', label: 'Four callers, one job', callers: 4, jobs: 1 },
      { key: 'queue', label: 'One caller, three jobs', callers: 1, jobs: 3 },
      { key: 'empty', label: 'Nothing pending', callers: 1, jobs: 0 },
    ],
    pollSeconds: 2,
    code: {
      file: 'services/api/src/typist/generation/service.py',
      lang: 'sql',
      body: `UPDATE generation_jobs
SET status = 'running', started_at = :started_at
WHERE id = (
    SELECT id FROM generation_jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
)
AND status = 'pending'
RETURNING id
-- no row back: someone else claimed it, or nothing is pending`,
    },
  },
  {
    id: 'ledger',
    kicker: 'Reproducibility',
    title: 'Every attempt gets its own seed, and every attempt is kept',
    problem:
      'A drill can take up to five tries to pass the gate. To audit the experiment later, every try has to be replayable exactly — and the rejected ones are data too: how often each method fails, and why.',
    decision:
      'Each attempt’s seed is SHA-256 of “assignment seed : participant : method : drill number : job retries : attempt”, cut to 31 bits — never Python’s hash(), which changes between runs. Every attempt, accepted or not, is a generation_attempts row with its text, density and reject reasons (and, for the LLM, tokens per second and peak memory).',
    tradeoff:
      'A row per try, even the failures, and a job that fails loudly after five rejections instead of quietly lowering the bar. That is how the rare-pair problem below shows up: five honest rejections in a row.',
    // derive_drill_seed + GenerationService.generate_with_retries on main's
    // code, window [0.10, 0.40], example participant id, drill 0, no retries
    seed: 20261021,
    participant: '00000000-0000-4000-8000-000000000005',
    runs: [
      {
        key: 'markov', arm: 'markov', label: 'Markov · th he in', targets: ['th', 'he', 'in'],
        attempts: [
          { digest: 'e5fc4c91382272f8', seed: 941781752, density: 0.09, reasons: ['density_low'] },
          { digest: '6ec76aa410761832', seed: 276174898, density: 0.152, reasons: [] },
        ],
      },
      {
        key: 'markov-rare', arm: 'markov', label: 'Markov · ex gr ey uc', targets: ['ex', 'gr', 'ey', 'uc'],
        attempts: [
          { digest: 'e5fc4c91382272f8', seed: 941781752, density: 0.033, reasons: ['density_low', 'coverage'] },
          { digest: '6ec76aa410761832', seed: 276174898, density: 0.051, reasons: ['density_low', 'coverage'] },
          { digest: '85af3262927d3865', seed: 310196325, density: 0.041, reasons: ['density_low', 'coverage'] },
          { digest: '1067b1fef0e6bc46', seed: 1894169670, density: 0.028, reasons: ['density_low', 'coverage'] },
          { digest: '2c75a4c234cd97fd', seed: 885889021, density: 0.06, reasons: ['density_low', 'coverage'] },
        ],
      },
      {
        key: 'heuristic', arm: 'heuristic', label: 'Heuristic · th he in', targets: ['th', 'he', 'in'],
        attempts: [{ digest: 'f4431b6cdee8a826', seed: 1592305702, density: 0.251, reasons: [] }],
      },
    ],
    code: {
      file: 'services/api/src/typist/generation/service.py',
      lang: 'py',
      body: `def derive_drill_seed(assignment_seed, participant_id, arm, drill_number, attempt, job_retries=0):
    payload = (
        f"{assignment_seed}:{participant_id}:{arm.value}:{drill_number}:{job_retries}:{attempt}"
    )
    digest = hashlib.sha256(payload.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big") & 0x7FFF_FFFF

for attempt in range(self._max_attempts):          # 5
    attempt_spec = replace(spec, seed=derive_drill_seed(...))
    candidate = generator.generate(attempt_spec)
    result = validate(candidate.text, attempt_spec, validator_config, self._known_words)
    # accepted or not, the attempt is a generation_attempts row
    ...
raise DrillGenerationExhaustedError(...)            # the job is marked failed`,
    },
  },
];

/* ── 08 architecture — layers, and the paths real requests take ──────────── */
// node ids are architectureGraph ids in src/data/projects/typist-ml.js
export const LAYERS = [
  { key: 'who', label: 'Who', nodes: ['who-participant', 'who-builder'] },
  { key: 'web', label: 'Browser · React 19', nodes: ['surface', 'recorder', 'buffer', 'admin', 'matrix'] },
  { key: 'api', label: 'FastAPI · CLI', nodes: ['api', 'cli'] },
  { key: 'domain', label: 'Rules · services', nodes: ['stats', 'attribution', 'assignment', 'planner', 'composer', 'checks'] },
  { key: 'worker', label: 'Worker process', nodes: ['worker', 'generators', 'llm', 'gate'] },
  { key: 'data', label: 'Data · on disk', nodes: ['sqlite', 'corpus', 'heartbeat'] },
];

export const TRACES = [
  { id: 'upload', label: 'Upload keystrokes (wiring next)', steps: ['who-participant', 'surface', 'recorder', 'buffer', 'api', 'sqlite'] },
  { id: 'complete', label: 'Finish a session', steps: ['api', 'stats', 'attribution', 'sqlite'] },
  { id: 'assign', label: 'Assign weak pairs', steps: ['who-builder', 'admin', 'api', 'assignment', 'sqlite'] },
  { id: 'drill', label: 'Generate a drill', steps: ['worker', 'generators', 'corpus', 'gate', 'sqlite'] },
  { id: 'day', label: 'Plan a practice day', steps: ['api', 'planner', 'sqlite', 'worker'] },
];

/* ── 09 data model — services/api/src/typist/models: 11 tables ───────────── */
export const DATA_MODEL = {
  engine: 'SQLModel · SQLite (WAL) · Alembic',
  noun: 'tables',
  domains: [
    { key: 'people', label: 'People & config', models: [
      { name: 'participants', note: 'an alias only · 7 statuses · the builder is never blinded (a CHECK says so)' },
      { name: 'experiment_config', note: '33 keys as JSON text · frozen by trigger since T3.5' },
    ] },
    { key: 'typing', label: 'Typing', models: [
      { name: 'text_passages', note: 'form A for baseline, form B for retest · two parts each' },
      { name: 'sessions', note: 'baseline · practice · retest, with the day’s block order (e.g. CHML)' },
      { name: 'session_blocks', note: 'one method per block, and the text typed in it' },
      { name: 'keystroke_events', note: 'append-only · (block_id, seq) unique, so a re-sent batch is stored once' },
    ] },
    { key: 'stats', label: 'Stats & assignment', models: [
      { name: 'bigram_stats', note: 'per session and pair: attempts, errors, median timing · rebuilt by recompute' },
      { name: 'bigram_assignment', note: 'set A–D, method, baseline rank, weakness score · frozen by trigger' },
    ] },
    { key: 'generation', label: 'Generation', models: [
      { name: 'drills', note: 'text and its measured density · ready → used → retired' },
      { name: 'generation_jobs', note: 'pending → running → done or failed · retries' },
      { name: 'generation_attempts', note: 'every try: raw output, reject reasons, tokens/s, peak memory' },
    ] },
  ],
  // value sets enforced by CHECK constraints
  enums: [
    { name: 'participants.status', count: 7 },
    { name: 'session_blocks.arm', count: 5 },
    { name: 'generation_jobs.status', count: 4 },
    { name: 'bigram_assignment.set_label', count: 4 },
    { name: 'sessions.phase', count: 3 },
    { name: 'sessions.status', count: 3 },
    { name: 'keystroke_events.outcome', count: 3 },
    { name: 'drills.status', count: 3 },
    { name: 'text_passages.form', count: 2 },
  ],
  growthLabel: 'Tables by migration',
  growth: [
    { when: 'T1.1 · Oct 3', models: 6 },
    { when: 'T1.9 · Oct 21', models: 7 },
    { when: 'T2.1 · Oct 21', models: 11 },
  ],
};

/* ── 10 how it was built — the git history and CI ─────────────────────────── */
export const BUILD = {
  totals: [
    { value: '39', label: 'pull requests, reviewed and merged by Allen' },
    { value: '32', label: 'design-doc tasks shipped, T0.1 – T3.6' },
    { value: '42', label: 'page design doc, written first' },
    { value: '12', label: 'migrations, each tested up and down' },
  ],
  // .github/workflows — ci.yml (web, api), codeql.yml, audit.yml
  ci: [
    { name: 'web', when: 'every PR · push to main', steps: ['biome ci', 'biome format', 'tsc -b', 'vitest run', 'vite build'] },
    { name: 'api', when: 'every PR · push to main', steps: ['ruff check', 'ruff format', 'pyright', 'pytest', 'bandit', 'semgrep'] },
    { name: 'codeql', when: 'every PR · weekly', steps: ['actions', 'TypeScript', 'Python'] },
    { name: 'audit', when: 'weekly', steps: ['pip-audit', 'pnpm audit'] },
  ],
  suites: [
    { value: '443', label: 'pytest tests' },
    { value: '126', label: 'Vitest tests' },
    { value: '18', label: 'golden-fixture edge cases' },
    { value: '89', label: 'keystrokes in the golden fixture' },
  ],
  // the pipeline every task runs through (CLAUDE.md, "How work gets done")
  pipeline: [
    { key: 'understand', label: 'Understand', who: 'analyst agent', out: 'brief' },
    { key: 'blueprint', label: 'Blueprint', who: 'architect agent', out: 'plan' },
    { key: 'build', label: 'Build', who: 'builder agent', out: 'code · tests · commits' },
    { key: 'review', label: 'Review', who: 'reviewer agent', out: 'verdict' },
    { key: 'ship', label: 'Ship', who: 'orchestrator', out: 'pull request' },
    { key: 'merge', label: 'Merge', who: 'Allen', out: 'main' },
  ],
  days: 37, // Sep 24 → Oct 30, 2026
};

/* ── the page's own copy ─────────────────────────────────────────────────── */
export const COPY = {
  outcome:
    'A typing coach built as a controlled experiment: do drills aimed at your weakest letter pairs beat plain practice — and does an on-device language model write them better?',
  status: 'Code complete · pilot next',
  beforeLabel: 'The easy way',
  afterLabel: 'Typist-ML',
  before: [
    'Count every wrong key as a mistake, however it happened',
    'Rank weak pairs by raw error rate — one slip in three tries reads as 33%',
    'Give the hardest pairs to the method you hope will win',
    'Let each generator say how targeted its own text is',
    'Decide how to read the results after seeing them',
  ],
  after: [
    'An error counts only on the first try at a letter pair — one rule, signed off line by line, that TypeScript and Python must both pass',
    'Each pair’s rate is shrunk toward your own average, so a handful of tries can’t top the list',
    'Sixteen pairs dealt into four equally hard sets, a seeded shuffle picks which method gets which, then the database refuses edits',
    'One gate measures every drill from every method — the same density window, the same eight checks',
    'The analysis plan was committed, dated, before any practice session — if plain practice does as well, that is the finding',
  ],
  // the words the page leans on, in plain English
  glossary: [
    { term: 'Letter pair', def: 'Two letters typed in a row inside a word, like “th” — a bigram. Pairs across a space are never counted.' },
    { term: 'Method', def: 'One way of choosing practice text — the design doc calls them arms. Control is plain practice; the other three aim at your weak pairs.' },
    { term: 'Density', def: 'How much of a drill is target pairs: target-pair occurrences ÷ all letter pairs in it.' },
    { term: 'Within-person', def: 'With one or two participants, each person is their own comparison: four sets of their own weak pairs, one method each.' },
  ],
  // what's next — the design doc's schedule (section 16) and what the repo shows (main at #48)
  next: [
    'Run the pilot: about 14 days, the builder first — two baseline sessions, ten practice days, two retest sessions.',
    'Read the results with the analysis that’s already written and frozen: per-set error-rate change minus the control set’s, with Jeffreys intervals and posterior effect samples — and timing as the key secondary.',
    'Reveal which method had which set only in the debrief, after the retest.',
    'Record the on-device language-model bake-off on the M1 Pro — the harness is built, no measured run is committed yet.',
  ],
};

/* ── the case study in one screen ─────────────────────────────────────────── */
export const OVERVIEW = [
  { label: 'What it is', text: 'A typing coach built as a small controlled experiment. It finds the letter pairs you’re weakest at, practises them three different ways — plus plain practice as a control — and measures which way actually helped.' },
  { label: 'Why it exists', text: 'Typing tutors assume targeted drills work, and new ones assume an AI writes better drills. Nobody shows it fairly. Testing it means the same exposure for every method, the same rules for what counts as a mistake, and a plan written before the results.' },
  { label: 'What Allen built', text: 'Solo: keystroke capture in the browser, a first-attempt error rule both TypeScript and Python must pass, weak-pair ranking, four fair practice sets, three drill generators including an on-device language model, one fairness gate, a blinded daily schedule, and the analysis and dashboard.' },
  { label: 'Where it stands', text: 'The code is complete — milestones M0 to M4 are merged, the configuration is frozen and the analysis plan is committed and dated. The pilot, with Allen as the first participant, is next; there are no results yet.' },
];

/* ── why four methods ─────────────────────────────────────────────────────── */
// design doc §1 (the research question) and D01–D04
export const WHY_ARMS = {
  questions: [
    { key: 'q1', label: 'Do targeted drills beat plain practice?', arms: ['control', 'heuristic', 'markov', 'llm'], note: 'Needs a control: a set of your weak pairs that gets no targeted drills, plus a plain-practice block of the same length every day.' },
    { key: 'q2', label: 'Does a small on-device AI write better drills?', arms: ['heuristic', 'markov', 'llm'], note: 'Needs simpler generators to beat: a dictionary heuristic (real words) and a Markov chain (pseudo-words), against Llama 3.2 1B running on the laptop.' },
  ],
  roles: {
    control: { tests: 'Practice without targeting', why: 'Separates the effect of targeting from simply typing more — and from regression to the mean, since your weakest pairs would improve a little anyway.' },
    heuristic: { tests: 'The cheapest targeting', why: 'Real words that contain your weak pairs, picked from a 20,000-word list. If this does as well as the AI, the AI isn’t needed.' },
    markov: { tests: 'Statistics without meaning', why: 'An order-3 character chain that writes pseudo-words, boosting your weak pairs 10×. It shows whether plausibility matters at all.' },
    llm: { tests: 'A language model, on the laptop', why: 'Llama 3.2 1B (4-bit) via mlx-lm, prompted with your weak pairs. The newest idea — and the one most worth testing against the others.' },
  },
  within: [
    'With one or two participants, one person per method would make the person and the method impossible to tell apart.',
    'So every participant runs all four at once: their 16 weakest pairs are dealt into four equally hard sets, one per method.',
    'A seeded shuffle — not the builder — decides which method gets which set, and the database then refuses any edit.',
    'Each day’s four blocks follow a rotating Latin square, so no method is always first (warm-up) or last (fatigue). The screen only says “Block 1–4”.',
  ],
};

/* ── what could be better — stated up front, in the design doc ────────────── */
export const LIMITS = [
  'Error rates on single letter pairs are low (often under 5%), so a set may show only ~10 errors at retest — which is why timing is the key secondary outcome and the retest guarantees at least 40 attempts per tracked pair.',
  'Pairs share fingers and keys, so practice on one set can spill into another — that would make effects look smaller, not larger.',
  'Markov drills use pseudo-words while the tests use real words.',
  'The builder isn’t blind to the design — so the method-to-set mapping stays hidden until after the retest.',
];

/* ── inside the code — real excerpts, lightly trimmed ─────────────────────── */
export const TOUR = [
  {
    key: 'attribution',
    label: 'What counts as an error',
    why: 'The whole experiment rests on one rule: a mistake on a letter pair counts only on the first attempt at the second letter, and only if the first letter was typed right first time. This loop applies it to a session’s keystrokes.',
    code: {
      file: 'services/api/src/typist/services/attribution.py',
      lang: 'py',
      body: `for j in range(1, len(target_text)):
    if not (_is_letter(target_text[j - 1]) and _is_letter(target_text[j])):
        continue                                   # pairs across a space don't count
    a = first_attempt_at.get(j - 1)
    b = first_attempt_at.get(j)
    if a is None or b is None:
        continue
    if a.outcome != "correct":
        continue                                   # first letter wrong → pair not attempted
    if any(a.seq < seq < b.seq for seq in backspace_seqs):
        continue                                   # a correction in between → skip
    bigram = target_text[j - 1] + target_text[j]
    attempts[bigram] = attempts.get(bigram, 0) + 1
    errors.setdefault(bigram, 0)
    samples.setdefault(bigram, [])
    if b.outcome == "error":
        errors[bigram] += 1
    elif b.seq == a.seq + 1:
        gap = b.t_down_ms - a.t_down_ms
        paused = b.after_pause or gap > PAUSE_GAP_MS
        if not paused:
            samples[bigram].append(gap)            # timing only from unbroken pairs`,
    },
    notes: [
      'Only letter-letter pairs inside words are tracked — “e t” across a space never counts.',
      'If the first letter was wrong, the pair was never fairly attempted, so it’s skipped rather than counted against you.',
      'A backspace between the two letters means the pair was interrupted — skipped too.',
      'Timing samples come only from consecutive keystrokes with no pause over 2 s, so a phone glance doesn’t look like a slow pair.',
      'An 89-keystroke golden session with 18 edge cases pins this — TypeScript and Python must both reproduce it exactly.',
    ],
  },
  {
    key: 'assignment',
    label: 'Four fair sets',
    why: 'Ranking pairs by raw error rate would put a pair with 1 error in 3 tries at the top. Each rate is shrunk toward your own average first; the top 16 are dealt in snake order so every set is equally hard; a seeded shuffle picks which method gets which set.',
    code: {
      file: 'services/api/src/typist/services/assignment.py',
      lang: 'py',
      body: `def smoothed_rate(errors, attempts, *, p0, strength):
    # Beta posterior mean: shrinks few-observation pairs toward your own rate p0
    return (errors + strength * p0) / (attempts + strength)

def snake_deal(ranked, sets):
    dealt = []
    for index, item in enumerate(ranked):
        cycle, position = divmod(index, sets)
        set_index = position if cycle % 2 == 0 else sets - 1 - position
        dealt.append((item, set_index))       # ranks 1,8,9,16 → set A …
    return dealt

def shuffle_arms(arms, rng):
    shuffled = list(arms)
    rng.shuffle(shuffled)   # rng = random.Random(f"{assignment_seed}:{participant_id}")
    return shuffled`,
    },
    notes: [
      'The prior strength is 20, so a pair needs real evidence before its own rate outweighs your average.',
      'Snake order (A B C D D C B A …) gives every set ranks that add up to the same total — 34 each for 16 pairs.',
      'The shuffle is seeded per participant, so it’s reproducible — and nobody, including the builder, chooses the mapping.',
      'Once written, a SQLite trigger aborts any update to the assignment: “bigram_assignment rows are frozen”.',
    ],
  },
  {
    key: 'gate',
    label: 'The fairness gate',
    why: 'If one method’s drills were denser or longer, that alone could explain a win. Every drill from every method passes this one function, which measures it and collects every rule it breaks.',
    code: {
      file: 'services/api/src/typist/generation/validator.py',
      lang: 'py',
      body: `metrics = _metrics(text, spec, known_words)
reasons = []
if metrics.length_chars < config.min_length_chars:
    reasons.append(RejectReason.TOO_SHORT)
if not _charset_ok(text):
    reasons.append(RejectReason.BAD_CHARSET)
if spec.target_bigrams:
    if metrics.target_density < spec.min_density:
        reasons.append(RejectReason.DENSITY_LOW)
    if metrics.target_density > spec.max_density:
        reasons.append(RejectReason.DENSITY_HIGH)
    if any(count < config.min_coverage for count in metrics.coverage.values()):
        reasons.append(RejectReason.COVERAGE)
if metrics.max_word_count > config.max_word_repeats:
    reasons.append(RejectReason.WORD_REPEAT)
if spec.arm is Arm.LLM and metrics.real_word_ratio < config.min_real_word_ratio:
    reasons.append(RejectReason.REAL_WORD_RATIO)
return ValidationResult(accepted=not reasons, reasons=tuple(reasons), metrics=metrics)`,
    },
    notes: [
      'Generators only return text — the gate computes every metric itself, so no method can grade its own drill.',
      'It collects every failing rule instead of stopping at the first, and each rejected attempt is logged with its reasons.',
      'Density and coverage are skipped for the control set, which has no targets.',
      'The real-word check applies only to the language model, the one generator that could drift into nonsense.',
    ],
  },
  {
    key: 'analysis',
    label: 'Reading the result',
    why: 'With so few errors per set, a single “before vs after” number would be noise. The analysis compares each set’s change to the control set’s change, drawing from the posteriors, and reports the median effect and how much of it is below zero.',
    code: {
      file: 'services/api/src/typist/services/analysis.py',
      lang: 'py',
      body: `rng = np.random.default_rng(seed)
# Jeffreys prior Beta(0.5, 0.5) on every error rate
p_base_s  = rng.beta(base_errors + 0.5, base_attempts - base_errors + 0.5, size=n_draws)
p_ret_s   = rng.beta(ret_errors + 0.5, ret_attempts - ret_errors + 0.5, size=n_draws)
p_base_c  = rng.beta(ctl_base_errors + 0.5, ctl_base_attempts - ctl_base_errors + 0.5, size=n_draws)
p_ret_c   = rng.beta(ctl_ret_errors + 0.5, ctl_ret_attempts - ctl_ret_errors + 0.5, size=n_draws)

effect = (p_ret_s - p_base_s) - (p_ret_c - p_base_c)   # difference in differences
median = float(np.median(effect))
share_below = float(np.mean(effect < 0.0))             # how much of it is an improvement`,
    },
    notes: [
      'The targeting effect is a difference in differences: a set’s change minus the control set’s change.',
      'Sampling from four posteriors carries the uncertainty of every count through to the effect.',
      'It describes one or two people — it is not a significance test, and the write-up says so.',
      'The plan behind this code was committed and dated before any practice session.',
    ],
  },
];
