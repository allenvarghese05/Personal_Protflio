/**
 * The BIS Report Card's own rules, ported line for line so the demos on this
 * page compute their verdicts instead of quoting them. Pure functions, no
 * React — every section imports what it needs.
 *
 *   resolveGrade, roundToOneDecimal, subjectResult, grandTotalPercentage
 *                       backend/src/marks/grading/grading.ts
 *   describeMarkProblem backend/src/marks/mark-validation.ts
 *   textToMarkRequest   frontend/src/components/marks/use-marks-entry.ts (the grid)
 *   parseTypedCellValue backend/src/marks/mark-validation.ts (the Excel import)
 *   planPaste           frontend/src/lib/grid/navigation.ts
 *   matchUploadRow      backend/src/import-export/import-export.service.ts
 *   backupRuns          ops/backup-cron.sh, simulated on a 5-minute clock
 */

/* ── grading ───────────────────────────────────────────────────────────── */

/** Rounds to one decimal place without floating-point drift (86.65 → 86.7). */
export const roundToOneDecimal = (value) => Math.round(value * 10 + Number.EPSILON) / 10;

/** Inclusive integer bands, rounded half-up first; below every band → the lowest. */
export function resolveGrade(percentage, scale) {
  if (scale.length === 0) return null;
  const rounded = Math.round(percentage);
  const match = scale.find((band) => rounded >= band.min && rounded <= band.max);
  if (match) return match.grade;
  const lowest = [...scale].sort((a, b) => a.min - b.min)[0];
  return lowest && rounded < lowest.min ? lowest.grade : null;
}

/**
 * One subject's result from its numeric components ({ max, value, absent }).
 * Absent handling follows `policy`; fully absent → grade 'AB'.
 */
export function subjectResult(components, scale, policy) {
  let total = 0;
  let maxApplicable = 0;
  let present = 0;
  let absent = 0;
  for (const c of components) {
    if (c.absent) {
      absent += 1;
      if (policy === 'count_as_zero') maxApplicable += c.max;
      continue;
    }
    if (c.value !== null && c.value !== undefined) {
      present += 1;
      total += c.value;
      maxApplicable += c.max;
    }
  }
  if (present === 0 && absent > 0) {
    const zero = policy === 'count_as_zero';
    return { total: zero ? 0 : null, maxApplicable: zero ? maxApplicable : null, percentage: zero ? 0 : null, grade: 'AB' };
  }
  if (present === 0) return { total: null, maxApplicable: null, percentage: null, grade: null };
  const percentage = maxApplicable > 0 ? roundToOneDecimal((total / maxApplicable) * 100) : null;
  return { total: roundToOneDecimal(total), maxApplicable, percentage, grade: percentage === null ? null : resolveGrade(percentage, scale) };
}

/** Marks obtained over marks applicable, across subjects — the Grand Total. */
export function grandTotalPercentage(results) {
  let total = 0;
  let applicable = 0;
  for (const r of results) {
    if (r && r.total !== null && r.maxApplicable !== null) {
      total += r.total;
      applicable += r.maxApplicable;
    }
  }
  return applicable > 0 ? roundToOneDecimal((total / applicable) * 100) : null;
}

/* ── marks: what the grid sends, what the server accepts ───────────────── */

/** The grid: text → a request, or an error that is never sent (PR #14 H1). */
export function textToMarkRequest(text) {
  const trimmed = text.trim();
  if (trimmed === '') return { valueNumeric: null, isAbsent: false };
  if (/^(ab|abs|absent)$/i.test(trimmed)) return { isAbsent: true };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { error: 'Enter a number or AB' };
  return { valueNumeric: value, isAbsent: false };
}

/** The Excel import: "AB" / "A" / "abs" / "absent" mean Absent. */
export function parseTypedCellValue(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { valueNumeric: null, isAbsent: false };
  if (/^(ab|abs|absent|a)$/i.test(text)) return { isAbsent: true };
  const value = Number(text);
  return { valueNumeric: Number.isFinite(value) ? value : Number.NaN, isAbsent: false };
}

/** The server's verdict on one numeric mark: a message, or null when valid. */
export function describeMarkProblem(maxMarks, input) {
  if (input.isAbsent) return null;
  const value = input.valueNumeric;
  if (value === null || value === undefined) return null; // clearing the cell
  if (!Number.isFinite(value)) return 'Must be a number';
  if (value < 0) return 'Cannot be negative';
  if (value > maxMarks) return `Max is ${maxMarks}`;
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) return 'Use at most two decimal places';
  return null;
}

/**
 * A pasted matrix over the grid from `origin` (a row index), clipped to the
 * grid; empty strings are skipped so a sparse paste never clears a mark.
 * Returns every pasted cell with where it landed, and the overflow count.
 */
export function planPaste(matrix, origin, rowCount, colCount) {
  const cells = [];
  let overflow = 0;
  matrix.forEach((line, r) => {
    line.forEach((value, c) => {
      const row = origin + r;
      if (value === '') {
        if (row < rowCount && c < colCount) cells.push({ row, col: c, value, kind: 'gap' });
        return;
      }
      if (row >= rowCount || c >= colCount) {
        overflow += 1;
        cells.push({ row, col: c, value, kind: 'overflow' });
        return;
      }
      cells.push({ row, col: c, value, kind: 'cell' });
    });
  });
  return { cells, overflow };
}

/** An uploaded row → the student it is for, or the reason it is refused. */
export function matchUploadRow(row, roster) {
  const id = row.id && roster[row.id] !== undefined ? row.id : null;
  if (!id) {
    return {
      reason: row.id
        ? 'Student is not in this section (download a fresh template for this class)'
        : 'Student ID missing — this row was not produced by the template; download a fresh one',
    };
  }
  if (row.roll && row.roll.trim().toLowerCase() !== String(roster[id]).trim().toLowerCase()) {
    return { reason: `Roll No ${row.roll} does not match this student (ID ${id}); leave the first three columns as downloaded` };
  }
  return { id };
}

/* ── the backup scheduler ──────────────────────────────────────────────── */

/**
 * ops/backup-cron.sh over `hours` hours from Day 1 00:00, on its own clock:
 * check now; a backup is due when the last success is older than `dueAfterH`,
 * or it is `hour` o'clock and the last success is older than `atHourAfterH`.
 * A run (assumed to finish inside one check) sleeps `checkMin` after a success
 * and `retryMin` after a failure. `off` = [[from, to]] hours the server is down
 * (the clock restarts at boot); `fail` = hours at which a run fails.
 * `lastSuccess` is in hours (negative = before the window).
 */
export function backupRuns({ rule, off = [], fail = [], hours = 72, lastSuccess = -22 }) {
  const runs = [];
  const isOff = (t) => off.some(([a, b]) => t >= a && t < b);
  const fails = new Set(fail.map((h) => Math.round(h * 60)));
  let last = lastSuccess * 60; // minutes
  let t = 0;
  while (t < hours * 60) {
    if (isOff(t / 60)) {
      // down: wake at the end of the outage
      const end = off.find(([a, b]) => t / 60 >= a && t / 60 < b)[1];
      t = end * 60;
      continue;
    }
    const age = t - last;
    const hourOfDay = Math.floor(t / 60) % 24;
    const due = age > rule.dueAfterH * 60 || (hourOfDay === rule.hour && age > rule.atHourAfterH * 60);
    if (due) {
      const failed = fails.has(t);
      runs.push({ at: t, ok: !failed, age, catchUp: age > rule.dueAfterH * 60 });
      if (failed) {
        t += rule.retryMin;
      } else {
        last = t;
        t += rule.checkMin;
      }
    } else {
      t += rule.checkMin;
    }
  }
  return runs;
}

/** 1980 (minutes from Day 1 00:00) → 'Day 2 · 09:00'. */
export function clockOf(minutes) {
  const day = Math.floor(minutes / 1440) + 1;
  const m = minutes % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `Day ${day} · ${hh}:${mm}`;
}
