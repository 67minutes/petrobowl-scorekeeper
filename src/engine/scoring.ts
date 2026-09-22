import type { EventKind, Match, MatchEvent, ScoringRules, Side, Stage } from './types';
import { uid } from './util';

export const other = (s: Side): Side => (s === 'a' ? 'b' : 'a');

export function matchScore(m: Pick<Match, 'events'>): { a: number; b: number } {
  const s = { a: 0, b: 0 };
  for (const e of m.events) s[e.side] += e.delta;
  return s;
}

export function eventDelta(kind: EventKind, rules: ScoringRules, suddenDeath: boolean): number {
  switch (kind) {
    case 'correct':
      return rules.correct;
    case 'steal-correct':
      return rules.stealCorrect;
    case 'wrong':
      return suddenDeath && !rules.suddenDeathPenalty ? 0 : rules.wrong;
    case 'steal-wrong':
      return suddenDeath && !rules.suddenDeathPenalty ? 0 : rules.stealWrong;
    default:
      return 0;
  }
}

export function makeEvent(
  m: Match,
  kind: EventKind,
  side: Side,
  rules: ScoringRules,
  opts: { delta?: number; note?: string } = {},
): MatchEvent {
  return {
    id: uid('e'),
    q: m.currentQ,
    kind,
    side,
    delta: opts.delta ?? eventDelta(kind, rules, m.suddenDeath),
    sd: m.suddenDeath || undefined,
    note: opts.note,
    ts: Date.now(),
  };
}

export type QuestionState =
  | { phase: 'open' }
  | { phase: 'steal'; side: Side }
  | { phase: 'closed'; by?: Side };

/** State of the current question derived from its events. */
export function questionState(m: Match, rules: ScoringRules): QuestionState {
  const evs = m.events.filter((e) => e.q === m.currentQ && e.kind !== 'adjust');
  if (evs.length === 0) return { phase: 'open' };
  const last = evs[evs.length - 1];
  if (last.kind === 'correct' || last.kind === 'steal-correct') return { phase: 'closed', by: last.side };
  if (last.kind === 'wrong') {
    return rules.allowSteal ? { phase: 'steal', side: other(last.side) } : { phase: 'closed' };
  }
  return { phase: 'closed' };
}

export function questionsPlayed(m: Match): number {
  return m.events.reduce((mx, e) => Math.max(mx, e.sd ? 0 : e.q), 0);
}

/**
 * Winner of a match, or null for a draw / undecided.
 * Knockout ties are decided by the first correct answer in sudden death.
 */
export function matchWinner(m: Match, stageType?: Stage['type']): Side | null {
  if (m.a.kind === 'bye' && m.b.kind !== 'bye') return 'b';
  if (m.b.kind === 'bye' && m.a.kind !== 'bye') return 'a';
  if (m.manualWinner) return m.manualWinner;
  if (m.status !== 'final') return null;
  const regular = matchScore({ events: m.events.filter((e) => !e.sd) });
  if (regular.a !== regular.b) return regular.a > regular.b ? 'a' : 'b';
  const sdWin = m.events.find((e) => e.sd && (e.kind === 'correct' || e.kind === 'steal-correct'));
  if (sdWin) return sdWin.side;
  if (stageType === 'knockout') {
    const total = matchScore(m);
    if (total.a !== total.b) return total.a > total.b ? 'a' : 'b';
  }
  return null;
}

/** True when a knockout match is tied on regulation and still needs sudden death. */
export function needsSuddenDeath(m: Match, stageType: Stage['type']): boolean {
  if (stageType !== 'knockout' || m.manualWinner) return false;
  const regular = matchScore({ events: m.events.filter((e) => !e.sd) });
  if (regular.a !== regular.b) return false;
  return !m.events.some((e) => e.sd && (e.kind === 'correct' || e.kind === 'steal-correct'));
}

export function timerRemaining(t: Match['timer'], now = Date.now()): number | null {
  if (!t) return null;
  if (t.startedAt == null) return t.remainingSec;
  return Math.max(0, t.remainingSec - (now - t.startedAt) / 1000);
}
