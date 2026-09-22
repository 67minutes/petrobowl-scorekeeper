import type { EntrantRef, Match, Side, Stage, TeamId, Tournament } from './types';
import { matchWinner } from './scoring';
import { groupStandings, stageComplete } from './standings';

export function findStage(t: Tournament, id: string): Stage | undefined {
  return t.stages.find((s) => s.id === id);
}

/** Resolve a bracket reference to a concrete team, or null if not yet known. */
export function resolveEntrant(t: Tournament, ref: EntrantRef, depth = 0): TeamId | null {
  if (depth > 64) return null;
  switch (ref.kind) {
    case 'team':
      return ref.teamId;
    case 'bye':
    case 'tbd':
      return null;
    case 'rank': {
      const stage = findStage(t, ref.stageId);
      if (!stage || !stageComplete(t, stage, ref.group)) return null;
      const table = groupStandings(t, stage, ref.group);
      if (table.rows.some((r) => r.unresolvedTie)) return null;
      return table.rows[ref.rank - 1]?.teamId ?? null;
    }
    case 'winner':
    case 'loser': {
      const m = t.matches.find((x) => x.id === ref.matchId);
      if (!m) return null;
      const stage = findStage(t, m.stageId);
      const w = matchWinner(m, stage?.type);
      if (!w) return null;
      const side: Side = ref.kind === 'winner' ? w : w === 'a' ? 'b' : 'a';
      return resolveEntrant(t, m[side], depth + 1);
    }
  }
}

export function matchTeams(t: Tournament, m: Match): { a: TeamId | null; b: TeamId | null } {
  return { a: resolveEntrant(t, m.a), b: resolveEntrant(t, m.b) };
}

export function teamName(t: Tournament, id: TeamId | null, short = false): string {
  if (!id) return 'TBD';
  const team = t.teams.find((x) => x.id === id);
  if (!team) return 'Unknown';
  return short ? team.shortName || team.name : team.name;
}

/** Human-readable placeholder for an unresolved entrant ("Winner Group A", "Winner QF1"). */
export function describeRef(t: Tournament, ref: EntrantRef): string {
  switch (ref.kind) {
    case 'team':
      return teamName(t, ref.teamId);
    case 'bye':
      return 'BYE';
    case 'tbd':
      return 'TBD';
    case 'rank': {
      const ord = ['', '1st', '2nd', '3rd'][ref.rank] ?? `${ref.rank}th`;
      if (ref.group) return ref.rank === 1 ? `Winner Group ${ref.group}` : `${ref.rank === 2 ? 'Runner-up' : ord} Group ${ref.group}`;
      const stage = findStage(t, ref.stageId);
      return `${ord} ${stage?.name ?? ''}`.trim();
    }
    case 'winner':
    case 'loser': {
      const m = t.matches.find((x) => x.id === ref.matchId);
      return `${ref.kind === 'winner' ? 'Winner' : 'Loser'} ${m?.label ?? 'match'}`;
    }
  }
}

export function entrantLabel(t: Tournament, ref: EntrantRef, short = false): string {
  const id = resolveEntrant(t, ref);
  return id ? teamName(t, id, short) : describeRef(t, ref);
}

/** Matches that are actually playable (not byes). */
export function isByeMatch(m: Match): boolean {
  return m.a.kind === 'bye' || m.b.kind === 'bye';
}
