import type { DrawOptions, DrawStep, Group, Team, TeamId } from './types';
import { makeRng, shuffle } from './util';

export interface DrawResult {
  groups: Group[];
  steps: DrawStep[];
}

/**
 * Randomly allocate teams to groups of fixed sizes.
 * - locked teams are placed first
 * - pots (if any) are drawn pot by pot; remaining teams form a final pot
 * - within a pot, teams fill groups in rotation, preferring groups with
 *   fewer same-country teams (best effort) and fewer teams from the same pot
 */
export function runDraw(
  teams: Team[],
  groupDefs: { name: string; size: number }[],
  seed: string,
  options: DrawOptions,
): DrawResult {
  const capacity = groupDefs.reduce((s, g) => s + g.size, 0);
  if (capacity !== teams.length) {
    throw new Error(`Group sizes add up to ${capacity} but there are ${teams.length} teams.`);
  }
  const rng = makeRng(seed);
  const byId = new Map(teams.map((t) => [t.id, t]));
  const groups: Group[] = groupDefs.map((g) => ({ name: g.name, size: g.size, teamIds: [] }));
  const steps: DrawStep[] = [];

  const place = (id: TeamId, g: Group) => {
    g.teamIds.push(id);
    steps.push({ teamId: id, group: g.name });
  };

  const placed = new Set<TeamId>();
  for (const [id, gName] of Object.entries(options.locks ?? {})) {
    const g = groups.find((x) => x.name === gName);
    if (g && byId.has(id) && g.teamIds.length < g.size) {
      place(id, g);
      placed.add(id);
    }
  }

  const pots = (options.pots ?? []).map((p) => p.filter((id) => byId.has(id) && !placed.has(id)));
  const inPots = new Set(pots.flat());
  const rest = teams.map((t) => t.id).filter((id) => !placed.has(id) && !inPots.has(id));
  if (rest.length) pots.push(rest);

  let cursor = 0;
  for (const pot of pots) {
    const potSet = new Set(pot);
    for (const id of shuffle(pot, rng)) {
      const country = byId.get(id)?.country;
      let best: Group | null = null;
      let bestScore = Infinity;
      for (let k = 0; k < groups.length; k++) {
        const g = groups[(cursor + k) % groups.length];
        if (g.teamIds.length >= g.size) continue;
        const sameCountry =
          options.separateCountries && country ? g.teamIds.filter((x) => byId.get(x)?.country === country).length : 0;
        const samePot = g.teamIds.filter((x) => potSet.has(x)).length;
        // rotation index k breaks ties, keeping the draw spread across groups
        const score = sameCountry * 1000 + samePot * 100 + g.teamIds.length / g.size + k * 0.001;
        if (score < bestScore) {
          bestScore = score;
          best = g;
        }
      }
      if (!best) throw new Error('No group has space left.');
      place(id, best);
      cursor = (groups.indexOf(best) + 1) % groups.length;
    }
  }
  return { groups, steps };
}
