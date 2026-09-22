import type { Match, Stage, TeamId, Tournament } from '../types';
import { groupStandings, stageMatches } from '../standings';
import { uid } from '../util';

const pairKey = (x: TeamId, y: TeamId) => (x < y ? `${x}|${y}` : `${y}|${x}`);

/** Pair a ranked list top-down without rematches (backtracking); falls back to allowing rematches. */
export function swissPairs(ranked: TeamId[], played: Set<string>): [TeamId, TeamId][] {
  const solve = (pool: TeamId[], allowRematch: boolean): [TeamId, TeamId][] | null => {
    if (pool.length === 0) return [];
    const [first, ...rest] = pool;
    for (let i = 0; i < rest.length; i++) {
      if (!allowRematch && played.has(pairKey(first, rest[i]))) continue;
      const sub = solve([...rest.slice(0, i), ...rest.slice(i + 1)], allowRematch);
      if (sub) return [[first, rest[i]], ...sub];
    }
    return null;
  };
  return solve(ranked, false) ?? solve(ranked, true) ?? [];
}

export function generateSwissRound(t: Tournament, stage: Stage, startOrder: number): Match[] {
  const existing = stageMatches(t, stage);
  const round = existing.reduce((mx, m) => Math.max(mx, m.round), 0) + 1;
  const table = groupStandings(t, stage);
  let ranked = table.rows.map((r) => r.teamId);
  // Round 1 has no standings yet: use entry order (seeding).
  if (round === 1) ranked = [...(stage.teamIds ?? [])];

  const played = new Set<string>();
  const hadBye = new Set<TeamId>();
  for (const m of existing) {
    if (m.a.kind === 'team' && m.b.kind === 'team') played.add(pairKey(m.a.teamId, m.b.teamId));
    if (m.a.kind === 'team' && m.b.kind === 'bye') hadBye.add(m.a.teamId);
  }

  const matches: Match[] = [];
  let order = startOrder;
  const base = (a: Match['a'], b: Match['b'], i: number): Match => ({
    id: uid('m'),
    stageId: stage.id,
    round,
    roundName: `Round ${round}`,
    label: `R${round}-${i}`,
    a,
    b,
    events: [],
    status: 'scheduled',
    order: order++,
    currentQ: 1,
    suddenDeath: false,
  });

  let byeTeam: TeamId | null = null;
  if (ranked.length % 2 === 1) {
    byeTeam = [...ranked].reverse().find((id) => !hadBye.has(id)) ?? ranked[ranked.length - 1];
    ranked = ranked.filter((id) => id !== byeTeam);
  }
  swissPairs(ranked, played).forEach(([x, y], i) => matches.push(base({ kind: 'team', teamId: x }, { kind: 'team', teamId: y }, i + 1)));
  if (byeTeam) matches.push(base({ kind: 'team', teamId: byeTeam }, { kind: 'bye' }, matches.length + 1));
  return matches;
}
