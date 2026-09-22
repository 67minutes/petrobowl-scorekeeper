import type { EventKind, Match, Tournament } from './types';
import { matchTeams, teamName } from './resolve';

const KIND: Record<EventKind, string> = {
  correct: 'Correct',
  wrong: 'Incorrect',
  'steal-correct': 'Steal correct',
  'steal-wrong': 'Steal incorrect',
  adjust: 'Adjustment',
};

const HEADERS = [
  'Match',
  'Stage',
  'Group/Round',
  'Team A',
  'Team B',
  'Seq',
  'Question',
  'Phase',
  'Side',
  'Team',
  'Action',
  'Points',
  'Score A',
  'Score B',
  'Note',
  'Timestamp',
];

/**
 * Escape a CSV cell: defang spreadsheet formula injection, then quote per RFC 4180.
 * Only string cells (team names, labels, notes) are defanged — numeric cells are
 * left alone so negative point deltas and scores stay as real numbers in Excel.
 */
function esc(v: string | number): string {
  let s = String(v ?? '');
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per answer event, with the running score after each event. */
export function matchLogRows(t: Tournament, m: Match): (string | number)[][] {
  const stage = t.stages.find((s) => s.id === m.stageId);
  const teams = matchTeams(t, m);
  const nameA = teamName(t, teams.a, true);
  const nameB = teamName(t, teams.b, true);
  const groupRound = m.group ? `Group ${m.group}` : m.roundName ?? '';
  const running = { a: 0, b: 0 };
  return m.events.map((e, i) => {
    running[e.side] += e.delta;
    return [
      m.label ?? '',
      stage?.name ?? '',
      groupRound,
      nameA,
      nameB,
      i + 1,
      e.q,
      e.sd ? 'Sudden death' : 'Regulation',
      e.side.toUpperCase(),
      teamName(t, teams[e.side], true),
      KIND[e.kind] ?? e.kind,
      e.delta,
      running.a,
      running.b,
      e.note ?? '',
      new Date(e.ts).toISOString(),
    ];
  });
}

function toCsv(rows: (string | number)[][]): string {
  return [HEADERS, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}

/** CSV of a single match's answer log. */
export function matchLogCsv(t: Tournament, m: Match): string {
  return toCsv(matchLogRows(t, m));
}

/** CSV of every match's answer log, in play order. */
export function allLogsCsv(t: Tournament, matches: Match[]): string {
  const ordered = [...matches].sort((a, b) => a.order - b.order);
  return toCsv(ordered.flatMap((m) => matchLogRows(t, m)));
}

export function safeFileName(s: string): string {
  return s.replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'export';
}
