import type { Match, Stage, TeamId, Tiebreak, Tournament } from './types';
import { matchScore, matchWinner } from './scoring';

export interface StandingRow {
  teamId: TeamId;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pf: number;
  pa: number;
  diff: number;
  pts: number;
  /** tie that could only be broken by drawing lots, and no lots drawn yet */
  unresolvedTie?: boolean;
  /** which criterion separated this team from its neighbour(s) */
  decidedBy?: Tiebreak;
}

export interface StandingsTable {
  rows: StandingRow[];
  complete: boolean;
}

export const tieKey = (stageId: string, group?: string) => `${stageId}|${group ?? ''}`;

export function stageTeamIds(stage: Stage, group?: string): TeamId[] {
  if (stage.type === 'groups') {
    if (group) return stage.groups?.find((g) => g.name === group)?.teamIds ?? [];
    return (stage.groups ?? []).flatMap((g) => g.teamIds);
  }
  return stage.teamIds ?? [];
}

export function stageMatches(t: Tournament, stage: Stage, group?: string): Match[] {
  return t.matches.filter((m) => m.stageId === stage.id && (group === undefined || m.group === group));
}

export function stageComplete(t: Tournament, stage: Stage, group?: string): boolean {
  if (!stage.generated) return false;
  const ms = stageMatches(t, stage, group);
  if (ms.length === 0) return false;
  if (stage.type === 'swiss') {
    const rounds = new Set(ms.map((m) => m.round)).size;
    if (rounds < (stage.rounds ?? 0)) return false;
  }
  return ms.every((m) => m.status === 'final' || m.a.kind === 'bye' || m.b.kind === 'bye');
}

interface Tally {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pf: number;
  pa: number;
  pts: number;
}

function tally(t: Tournament, teamIds: TeamId[], matches: Match[], stage: Stage): Map<TeamId, Tally> {
  const map = new Map<TeamId, Tally>();
  for (const id of teamIds) map.set(id, { played: 0, won: 0, drawn: 0, lost: 0, pf: 0, pa: 0, pts: 0 });
  const P = t.points;
  for (const m of matches) {
    const aId = m.a.kind === 'team' ? m.a.teamId : null;
    const bId = m.b.kind === 'team' ? m.b.teamId : null;
    // Swiss bye: counts as a win with no points scored.
    if (m.b.kind === 'bye' && aId && map.has(aId)) {
      const r = map.get(aId)!;
      r.played++;
      r.won++;
      r.pts += P.win;
      continue;
    }
    if (m.status !== 'final' || !aId || !bId) continue;
    const ra = map.get(aId);
    const rb = map.get(bId);
    if (!ra || !rb) continue;
    const s = matchScore(m);
    const w = matchWinner(m, stage.type);
    ra.played++;
    rb.played++;
    ra.pf += s.a;
    ra.pa += s.b;
    rb.pf += s.b;
    rb.pa += s.a;
    if (w === 'a') {
      ra.won++;
      rb.lost++;
      ra.pts += P.win;
      rb.pts += P.loss;
    } else if (w === 'b') {
      rb.won++;
      ra.lost++;
      rb.pts += P.win;
      ra.pts += P.loss;
    } else {
      ra.drawn++;
      rb.drawn++;
      ra.pts += P.draw;
      rb.pts += P.draw;
    }
  }
  return map;
}

interface RankCtx {
  t: Tournament;
  stage: Stage;
  matches: Match[];
  full: Map<TeamId, Tally>;
  order: Tiebreak[];
  lots?: TeamId[];
  unresolved: Set<TeamId>;
  decided: Map<TeamId, Tiebreak>;
}

function criterionValue(ctx: RankCtx, crit: Tiebreak, subset: TeamId[]): Map<TeamId, number> {
  const out = new Map<TeamId, number>();
  if (crit === 'h2h') {
    const set = new Set(subset);
    const h2hMatches = ctx.matches.filter(
      (m) => m.a.kind === 'team' && m.b.kind === 'team' && set.has(m.a.teamId) && set.has(m.b.teamId),
    );
    const mini = tally(ctx.t, subset, h2hMatches, ctx.stage);
    for (const id of subset) out.set(id, mini.get(id)!.pts);
  } else if (crit === 'diff') {
    for (const id of subset) {
      const r = ctx.full.get(id)!;
      out.set(id, r.pf - r.pa);
    }
  } else if (crit === 'scored') {
    for (const id of subset) out.set(id, ctx.full.get(id)!.pf);
  } else {
    // coin / drawing of lots: use stored order if it covers everyone in the subset
    const lots = ctx.lots ?? [];
    const covered = subset.every((id) => lots.includes(id));
    for (const id of subset) out.set(id, covered ? -lots.indexOf(id) : 0);
    if (!covered) subset.forEach((id) => ctx.unresolved.add(id));
  }
  return out;
}

function rankSubset(ctx: RankCtx, subset: TeamId[], critIdx: number): TeamId[] {
  if (subset.length <= 1) return subset;
  if (critIdx >= ctx.order.length) {
    subset.forEach((id) => ctx.unresolved.add(id));
    return [...subset].sort((x, y) => nameOf(ctx.t, x).localeCompare(nameOf(ctx.t, y)));
  }
  const crit = ctx.order[critIdx];
  const vals = criterionValue(ctx, crit, subset);
  const buckets = new Map<number, TeamId[]>();
  for (const id of subset) {
    const v = vals.get(id)!;
    if (!buckets.has(v)) buckets.set(v, []);
    buckets.get(v)!.push(id);
  }
  const keys = [...buckets.keys()].sort((a, b) => b - a);
  if (keys.length > 1) subset.forEach((id) => ctx.decided.set(id, crit));
  const result: TeamId[] = [];
  for (const k of keys) {
    const group = buckets.get(k)!;
    if (group.length === 1) {
      result.push(group[0]);
    } else if (crit === 'h2h' && group.length < subset.length) {
      // re-apply head-to-head among the smaller tied group
      result.push(...rankSubset(ctx, group, critIdx));
    } else {
      result.push(...rankSubset(ctx, group, critIdx + 1));
    }
  }
  return result;
}

function nameOf(t: Tournament, id: TeamId) {
  return t.teams.find((x) => x.id === id)?.name ?? id;
}

export function groupStandings(t: Tournament, stage: Stage, group?: string): StandingsTable {
  const teamIds = stageTeamIds(stage, group);
  const matches = stageMatches(t, stage, group);
  const full = tally(t, teamIds, matches, stage);
  const ctx: RankCtx = {
    t,
    stage,
    matches,
    full,
    order: t.tiebreaks,
    lots: t.tieOrders[tieKey(stage.id, group)],
    unresolved: new Set(),
    decided: new Map(),
  };

  // primary: group points
  const byPts = new Map<number, TeamId[]>();
  for (const id of teamIds) {
    const p = full.get(id)!.pts;
    if (!byPts.has(p)) byPts.set(p, []);
    byPts.get(p)!.push(id);
  }
  const ordered: TeamId[] = [];
  for (const p of [...byPts.keys()].sort((a, b) => b - a)) ordered.push(...rankSubset(ctx, byPts.get(p)!, 0));

  const rows: StandingRow[] = ordered.map((id, i) => {
    const r = full.get(id)!;
    return {
      teamId: id,
      rank: i + 1,
      ...r,
      diff: r.pf - r.pa,
      unresolvedTie: ctx.unresolved.has(id) || undefined,
      decidedBy: ctx.decided.get(id),
    };
  });
  return { rows, complete: stageComplete(t, stage, group) };
}

/** Teams currently tied that need lots drawn (only meaningful when group complete). */
export function unresolvedTeams(table: StandingsTable): TeamId[] {
  return table.rows.filter((r) => r.unresolvedTie).map((r) => r.teamId);
}
