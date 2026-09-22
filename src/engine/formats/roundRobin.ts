import type { Match, Stage, TeamId } from '../types';
import { uid } from '../util';

/** Circle-method pairings: returns rounds of [home, away] pairs. */
export function roundRobinPairs(teamIds: TeamId[], legs: 1 | 2 = 1): [TeamId, TeamId][][] {
  const ids: (TeamId | null)[] = [...teamIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push(null);
  const n = ids.length;
  const rounds: [TeamId, TeamId][][] = [];
  let rot = ids.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const circle = [ids[0], ...rot];
    const round: [TeamId, TeamId][] = [];
    for (let i = 0; i < n / 2; i++) {
      const x = circle[i];
      const y = circle[n - 1 - i];
      if (x && y) round.push(r % 2 === 0 ? [x, y] : [y, x]);
    }
    rounds.push(round);
    rot = [rot[rot.length - 1], ...rot.slice(0, -1)];
  }
  if (legs === 2) return [...rounds, ...rounds.map((rd) => rd.map(([x, y]) => [y, x] as [TeamId, TeamId]))];
  return rounds;
}

/** Group-stage fixtures, interleaved by round across groups so teams rest between matches. */
export function generateGroupMatches(stage: Stage, startOrder = 0): Match[] {
  const perGroup = (stage.groups ?? []).map((g) => ({ g, rounds: roundRobinPairs(g.teamIds, stage.legs ?? 1) }));
  const maxRounds = Math.max(0, ...perGroup.map((p) => p.rounds.length));
  const matches: Match[] = [];
  let order = startOrder;
  for (let r = 0; r < maxRounds; r++) {
    for (const { g, rounds } of perGroup) {
      for (const [x, y] of rounds[r] ?? []) {
        matches.push({
          id: uid('m'),
          stageId: stage.id,
          round: r + 1,
          roundName: `Matchday ${r + 1}`,
          group: g.name,
          label: `${g.name}${matches.filter((m) => m.group === g.name).length + 1}`,
          a: { kind: 'team', teamId: x },
          b: { kind: 'team', teamId: y },
          events: [],
          status: 'scheduled',
          order: order++,
          currentQ: 1,
          suddenDeath: false,
        });
      }
    }
  }
  return matches;
}
