'use client';

/**
 * Decisions — the hard problems, one row each, through the kit's
 * DecisionList (text beside its visual, alternating sides, a code drawer).
 *
 * The visuals:
 *   lock     the section's advisory lock as a queue. "Approve + 8 saves" lines
 *            up nine transactions in the order they get the lock for the round
 *            you pick (an illustrative order — Postgres decides the real one):
 *            every save ahead of the approve reads draft and commits (200, a
 *            jade tick), the approve locks the section (amber — the thing
 *            happening), every save behind it reads approved and gets 409 (a
 *            red cross). "Two approves" shows one winning and one refused.
 *            "Without the lock" is the race the lock rules out — check, then
 *            write — drawn as an illustration, not as the code: the save reads
 *            draft, the approve commits, the save lands after lockedAt.
 *   devices  who gets in on which machine. Pick a person, a machine and the
 *            school's policy; the steps createDevice() takes light in order —
 *            the per-person tokens already in the browser's cookie, the MAC
 *            from the ARP table, the approver / temporary-password rule, the
 *            OS match — and end trusted (jade), pending the office's approval
 *            (sand) or trusted under "notify". The cookie after sign-in shows
 *            the new token added beside the others, never over them.
 *   roll     a section's roll numbers through one transaction. Each UPDATE is
 *            a row; a moment where two active students share a roll is
 *            flagged (sand) but allowed, because the EXCLUDE constraint is
 *            deferred to COMMIT. Leavers are dimmed and never compared. The
 *            COMMIT either passes (jade) or is refused with 23P01 (red).
 *
 * Every rule comes from DECISIONS in src/data/studies/bis-report-card.js and
 * the code it quotes; names, ids and orders are illustrative. Sequences start
 * once a panel is a third in view; reduced motion shows each final state.
 *
 * Layout: container queries — the device steps sit beside the cookie from
 * 34rem of panel; tables wrap their mono strings rather than scroll the page.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { PALETTE as P, alpha } from '@/lib/palette';
import { Choices, DecisionList, Glyph, PanelFrame, Readout, at, useRun } from '@/components/ui/case/kit';
import { LABEL } from '@/components/ui/case/shell';
import { DECISIONS } from '@/data/studies/bis-report-card';

const ROW_S = 0.16;
const LEAD_S = 0.2;
const pad2 = (n) => String(n).padStart(2, '0');
const rowIn = (reduce, i) => ({
  initial: reduce ? false : { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  transition: at(reduce, LEAD_S + i * ROW_S, 0.3),
});

/* ── lock ──────────────────────────────────────────────────────────────── */
const LOCK_SCENARIOS = [
  { key: 'race', label: 'Approve + 8 saves' },
  { key: 'double', label: 'Two approves' },
  { key: 'nolock', label: 'Without the lock' },
];

/** The nine transactions of one round, in lock-grant order. */
function raceRound(decision, round) {
  const k = decision.approveAt[round] ?? 1; // the approve is the k-th to get the lock
  const rows = [];
  let save = 0;
  for (let pos = 1; pos <= decision.saves + 1; pos += 1) {
    if (pos === k) {
      rows.push({ key: 'approve', label: 'approve', reads: 'draft', does: 'approved · lockedAt set', code: 201, tone: 'now' });
    } else {
      save += 1;
      const before = pos < k;
      rows.push({
        key: `save-${save}`,
        label: `save · roll ${save}`,
        reads: before ? 'draft' : 'approved',
        does: before ? 'mark written' : 'refused, nothing written',
        code: before ? 200 : 409,
        tone: before ? 'ok' : 'no',
      });
    }
  }
  return { rows, before: k - 1, after: decision.saves - (k - 1) };
}

function LockRow({ row, index, reduce, accent }) {
  const tone = row.tone === 'now' ? accent : row.tone === 'ok' ? P.jade : P.alert;
  return (
    <motion.li
      {...rowIn(reduce, index)}
      className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 border-t border-line py-2"
      style={row.tone === 'now' ? { background: alpha(accent, 0.06) } : undefined}
    >
      <span className="font-mono text-micro tabular-nums text-ink-subtle">{pad2(index + 1)}</span>
      <span className="min-w-0">
        <span className={`block font-mono text-label ${row.tone === 'now' ? '' : 'text-ink'}`} style={row.tone === 'now' ? { color: accent } : undefined}>
          {row.label}
        </span>
        <span className="block text-micro text-ink-subtle">
          reads {row.reads} → {row.does}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-label tabular-nums" style={{ color: tone }}>
          {row.code}
        </span>
        {row.tone === 'now' ? (
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <rect x="5" y="9" width="10" height="7" rx="1.5" fill={alpha(accent, 0.15)} stroke={accent} strokeWidth="1.3" />
            <path d="M7.3 9 V7 a2.7 2.7 0 0 1 5.4 0 V9" fill="none" stroke={accent} strokeWidth="1.3" />
          </svg>
        ) : (
          <Glyph kind={row.tone === 'ok' ? 'tick' : 'cross'} />
        )}
      </span>
    </motion.li>
  );
}

const NOLOCK_STEPS = [
  { who: 'save', text: 'reads the status: draft', tone: 'idle' },
  { who: 'approve', text: 'sets approved · lockedAt = now', tone: 'now' },
  { who: 'save', text: 'writes the mark · updatedAt > lockedAt', tone: 'no' },
];

function LockVisual({ decision, inView, reduce, accent }) {
  const [active, choose] = useRun(inView, reduce, LOCK_SCENARIOS[0].key);
  const [round, setRound] = useState(0);
  const key = active?.key ?? null;
  const runKey = active ? `${active.key}-${active.run}-${round}` : 'idle';
  const race = raceRound(decision, round);
  const rounds = Array.from({ length: decision.rounds }, (_, i) => ({ key: String(i), label: `Round ${i + 1}` }));

  let footer = <p className="text-body text-ink-subtle">Pick a scenario.</p>;
  let doneAt = 0;
  if (key === 'race') {
    doneAt = LEAD_S + race.rows.length * ROW_S;
    footer = (
      <Readout runKey={runKey} delay={doneAt} reduce={reduce} tone={P.jade} status="0 marks after lockedAt">
        <span className="text-body text-ink-muted">
          {race.before} {race.before === 1 ? 'save' : 'saves'} committed before the approve; {race.after} got 409. Every save is one or the other — never
          both.
        </span>
      </Readout>
    );
  } else if (key === 'double') {
    doneAt = LEAD_S + 2 * ROW_S;
    footer = (
      <Readout runKey={runKey} delay={doneAt} reduce={reduce} tone={P.jade} status="201 · 400">
        <span className="text-body text-ink-muted">Exactly one approve wins; the revision goes up by one, not two.</span>
      </Readout>
    );
  } else if (key === 'nolock') {
    doneAt = LEAD_S + NOLOCK_STEPS.length * ROW_S;
    footer = (
      <Readout runKey={runKey} delay={doneAt} reduce={reduce} tone={P.alert} status="A mark in a locked card">
        <span className="text-body text-ink-muted">What the lock rules out: with it, the approve waits for the save to commit — or the save reads “approved” and gets 409.</span>
      </Readout>
    );
  }

  return (
    <PanelFrame
      caption="section:<session>:<section> · who holds the lock"
      controls={<Choices label="Pick a scenario" options={LOCK_SCENARIOS} value={key} onChoose={choose} accent={accent} />}
      footer={footer}
    >
      {key === 'race' && (
        <div className="mb-4">
          <Choices label="Pick a round" options={rounds} value={String(round)} onChoose={(k) => setRound(Number(k))} accent={accent} />
          <p className="mt-2 font-mono text-micro text-ink-subtle">lock order is illustrative · the test asserts the outcome, five rounds</p>
        </div>
      )}
      <div key={runKey} className="min-w-0">
        {key === 'race' && (
          <ol aria-label="Transactions, in the order they get the lock" className="border-b border-line">
            {race.rows.map((row, i) => (
              <LockRow key={row.key} row={row} index={i} reduce={reduce} accent={accent} />
            ))}
          </ol>
        )}
        {key === 'double' && (
          <ol aria-label="Two approves, in lock order" className="border-b border-line">
            <LockRow row={{ key: 'a1', label: 'approve · division head', reads: 'submitted', does: 'approved · approvalCount + 1', code: 201, tone: 'now' }} index={0} reduce={reduce} accent={accent} />
            <LockRow row={{ key: 'a2', label: 'approve · principal', reads: 'approved', does: '“Already approved and locked”', code: 400, tone: 'no' }} index={1} reduce={reduce} accent={accent} />
          </ol>
        )}
        {key === 'nolock' && (
          <div>
            <p className={`${LABEL} text-ink-subtle`}>Illustration · check, then write, no lock</p>
            <ol className="mt-3 border-b border-line">
              {NOLOCK_STEPS.map((s, i) => (
                <motion.li key={s.text} {...rowIn(reduce, i)} className="grid grid-cols-[1.5rem_5rem_minmax(0,1fr)_20px] items-center gap-x-3 border-t border-line py-2.5">
                  <span className="font-mono text-micro tabular-nums text-ink-subtle">{pad2(i + 1)}</span>
                  <span className="font-mono text-label" style={{ color: s.tone === 'now' ? accent : P.ink }}>
                    {s.who}
                  </span>
                  <span className="text-label text-ink-muted">{s.text}</span>
                  <Glyph kind={s.tone === 'no' ? 'cross' : 'idle'} />
                </motion.li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </PanelFrame>
  );
}

/* ── devices ───────────────────────────────────────────────────────────── */
const POLICIES = [
  { key: 'required', label: 'required (default)' },
  { key: 'notify', label: 'notify' },
];

/** createDevice() for a browser this person has never used before. */
function signIn(person, machine, policy) {
  const registered = machine.mac === 'registered';
  const eligible = !person.approver && !person.tempPassword;
  const osMatch = registered && machine.os === machine.registeredOs;
  const school = registered && eligible && osMatch;
  const status = school || policy === 'notify' ? 'trusted' : 'pending';
  const kind = school ? 'school' : 'personal';
  const steps = [
    { label: 'Password', value: 'argon2id · ok', state: 'pass' },
    {
      label: 'Tokens already in this browser',
      value: machine.cookie.length ? `${machine.cookie.join(', ')} — none for u${person.id}` : 'none',
      state: 'pass',
    },
    { label: 'MAC from the ARP table', value: registered ? `registered as ${machine.registeredOs} PC` : 'not a registered PC', state: registered ? 'pass' : 'skip' },
    {
      label: 'May use a school computer?',
      value: person.approver ? 'no — approvers never' : person.tempPassword ? 'no — still on a temporary password' : 'yes',
      state: !registered ? 'skip' : eligible ? 'pass' : 'stop',
    },
    {
      label: 'Browser OS = registered OS?',
      value: registered ? `${machine.os} vs ${machine.registeredOs}` : '—',
      state: !registered || !eligible ? 'skip' : osMatch ? 'pass' : 'stop',
    },
  ];
  const tokenKey = kind === 'school' ? 'school' : `u${person.id}`;
  return { status, kind, steps, cookieAfter: [...machine.cookie.filter((k) => k !== tokenKey), tokenKey], tokenKey };
}

const STEP_GLYPH = { pass: 'tick', stop: 'cross', skip: 'idle' };

function DeviceVisual({ decision, inView, reduce, accent }) {
  const [active, choose] = useRun(inView, reduce, decision.people[0].key);
  const [machineKey, setMachineKey] = useState(decision.machines[0].key);
  const [policy, setPolicy] = useState(POLICIES[0].key);
  const personKey = active?.key ?? decision.people[0].key;
  const person = decision.people.find((p) => p.key === personKey);
  const machine = decision.machines.find((m) => m.key === machineKey);
  const r = signIn(person, machine, policy);
  const runKey = `${personKey}-${machineKey}-${policy}-${active?.run ?? 0}`;
  const doneAt = LEAD_S + r.steps.length * ROW_S;
  const tone = r.status === 'pending' ? P.sand : P.jade;
  const verdict =
    r.kind === 'school'
      ? 'Trusted as a school computer'
      : r.status === 'trusted'
        ? 'Trusted · policy “notify”'
        : 'Pending · holding screen';
  const told =
    r.kind === 'school'
      ? `The office is told: “… signed in on ${machine.label.split(' · ')[0]} (a registered school computer) — trusted automatically.”`
      : r.status === 'trusted'
        ? 'The office is told: “… signed in from a new device.”'
        : 'The office is asked: “… is signing in from a device that is new … Open Devices to approve or deny it.”';

  return (
    <PanelFrame
      caption="First sign-in on this browser"
      controls={
        <Choices label="Who signs in" options={decision.people.map((p) => ({ key: p.key, label: p.label }))} value={personKey} onChoose={choose} accent={accent} />
      }
      footer={
        <Readout runKey={runKey} delay={doneAt} reduce={reduce} tone={tone} status={verdict}>
          <span className="text-body text-ink-muted">{told}</span>
        </Readout>
      }
    >
      <div className="flex flex-col gap-3">
        <Choices label="On which machine" options={decision.machines.map((m) => ({ key: m.key, label: m.label }))} value={machineKey} onChoose={setMachineKey} accent={accent} />
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${LABEL} text-ink-subtle`}>Policy</span>
          <Choices label="Device policy" options={POLICIES} value={policy} onChoose={setPolicy} accent={accent} />
        </div>
        {machine.note && <p className="text-label text-ink-subtle">{machine.note}</p>}
      </div>

      <div className="@container mt-5 min-w-0">
        <div key={runKey} className="grid grid-cols-1 gap-5 @[34rem]:grid-cols-[minmax(0,1fr)_minmax(0,12rem)]">
          <ol aria-label="What createDevice checks" className="border-b border-line">
            {r.steps.map((s, i) => (
              <motion.li key={s.label} {...rowIn(reduce, i)} className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-x-3 border-t border-line py-2">
                <Glyph kind={STEP_GLYPH[s.state]} />
                <span className="min-w-0">
                  <span className={`block text-label ${s.state === 'skip' ? 'text-ink-subtle' : 'text-ink'}`}>{s.label}</span>
                  <span className="block font-mono text-micro text-ink-subtle [overflow-wrap:anywhere]">{s.value}</span>
                </span>
              </motion.li>
            ))}
          </ol>
          <motion.div {...rowIn(reduce, r.steps.length)} className="min-w-0 rounded-md border border-line bg-void p-3">
            <p className={`${LABEL} text-ink-subtle`}>The cookie, after</p>
            <ul className="mt-2.5 flex flex-col gap-1.5 font-mono text-label">
              {r.cookieAfter.map((k) => {
                const fresh = k === r.tokenKey;
                return (
                  <li key={k} className="flex items-center justify-between gap-2">
                    <span style={{ color: fresh ? tone : P.inkMuted }}>{k}</span>
                    <span className="text-micro text-ink-subtle">{fresh ? (r.status === 'pending' ? 'new · pending' : 'new · trusted') : 'kept'}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-micro text-ink-subtle">only SHA-256 hashes reach the database · 20 tokens kept</p>
          </motion.div>
        </div>
      </div>
    </PanelFrame>
  );
}

/* ── roll numbers ──────────────────────────────────────────────────────── */

/** Students after `steps`, and whether any two active ones share a roll. */
function rollState(students, steps) {
  const now = students.map((s) => ({ ...s }));
  for (const st of steps) {
    const s = now.find((x) => x.name === st.who);
    if (s) s.roll = st.roll;
  }
  const active = now.filter((s) => s.active).map((s) => s.roll);
  const clash = active.length !== new Set(active).size;
  return { now, clash };
}

function RollVisual({ decision, inView, reduce, accent }) {
  // accent marks the picked change (Choices); the verdicts carry their own tones
  const scenarios = decision.scenarios;
  const [active, choose] = useRun(inView, reduce, scenarios[0].key);
  const key = active?.key ?? scenarios[0].key;
  const sc = scenarios.find((s) => s.key === key);
  const runKey = active ? `${active.key}-${active.run}` : 'idle';
  const final = rollState(sc.students, sc.steps);
  const commitAt = sc.steps.length + 1;
  const doneAt = LEAD_S + (commitAt + 1) * ROW_S;

  return (
    <PanelFrame
      caption="students_active_roll_no_unique · checked at COMMIT"
      controls={<Choices label="Pick a change" options={scenarios.map((s) => ({ key: s.key, label: s.label }))} value={key} onChoose={choose} accent={accent} />}
      footer={
        <Readout runKey={runKey} delay={doneAt} reduce={reduce} tone={sc.ok ? P.jade : P.alert} status={sc.ok ? 'COMMIT' : '23P01'}>
          <span className="text-body text-ink-muted">{sc.says}</span>
        </Readout>
      }
    >
      <div key={runKey} className="min-w-0">
        <ul aria-label="The section" className="flex flex-wrap gap-2">
          {final.now.map((s) => {
            const was = sc.students.find((x) => x.name === s.name).roll;
            return (
              <li
                key={s.name}
                className="flex min-w-[7.5rem] flex-1 items-center justify-between gap-2 rounded-md border px-3 py-2"
                style={s.active ? { borderColor: P.lineHi } : { borderColor: P.line, borderStyle: 'dashed' }}
              >
                <span className={`text-label ${s.active ? 'text-ink' : 'text-ink-subtle'}`}>
                  {s.name}
                  {!s.active && <span className="ml-1.5 font-mono text-micro text-ink-subtle">left</span>}
                </span>
                <span className="font-mono text-label tabular-nums text-ink-muted">
                  {was !== s.roll ? (
                    <>
                      <span className="text-ink-subtle line-through">{was}</span> → <span className="text-ink">{s.roll}</span>
                    </>
                  ) : (
                    s.roll
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        <ol aria-label="The transaction" className="mt-5 border-b border-line font-mono text-label">
          <motion.li {...rowIn(reduce, 0)} className="border-t border-line py-2 text-ink-subtle">
            BEGIN
          </motion.li>
          {sc.steps.map((st, i) => {
            const mid = rollState(sc.students, sc.steps.slice(0, i + 1));
            const flagged = mid.clash && i < sc.steps.length - 1;
            const lastClash = mid.clash && i === sc.steps.length - 1;
            return (
              <motion.li key={`${st.who}-${st.roll}`} {...rowIn(reduce, i + 1)} className="grid grid-cols-[minmax(0,1fr)_20px] items-start gap-x-3 border-t border-line py-2">
                <span className="min-w-0">
                  <span className="block text-ink [overflow-wrap:anywhere]">
                    UPDATE students SET roll_no = {st.roll} <span className="text-ink-subtle">— {st.who}</span>
                  </span>
                  <span className="mt-0.5 block font-sans text-micro text-ink-subtle">{st.note}</span>
                </span>
                <Glyph kind={flagged || lastClash ? 'flag' : 'idle'} />
              </motion.li>
            );
          })}
          <motion.li {...rowIn(reduce, commitAt)} className="grid grid-cols-[minmax(0,1fr)_20px] items-center gap-x-3 border-t border-line py-2">
            <span style={{ color: sc.ok ? P.jade : P.alert }}>COMMIT · the deferred check runs</span>
            <Glyph kind={sc.ok ? 'tick' : 'cross'} />
          </motion.li>
        </ol>
        <p className="mt-3 flex items-center gap-2 text-micro text-ink-subtle">
          <Glyph kind="flag" /> two active students share a roll · allowed until COMMIT
        </p>
      </div>
    </PanelFrame>
  );
}

/* ── the list ──────────────────────────────────────────────────────────── */

function renderVisual(decision, props) {
  switch (decision.id) {
    case 'lock':
      return <LockVisual decision={decision} {...props} />;
    case 'devices':
      return <DeviceVisual decision={decision} {...props} />;
    case 'roll':
      return <RollVisual decision={decision} {...props} />;
    default:
      return null;
  }
}

export default function Decisions({ accent = P.accent }) {
  return <DecisionList decisions={DECISIONS} renderVisual={renderVisual} accent={accent} />;
}
