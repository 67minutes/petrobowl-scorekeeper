import type { EntrantRef, Match, Stage } from '../types';
import { uid } from '../util';

export const nextPow2 = (n: number) => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};

/** Standard seed positions: [1, 8, 4, 5, 2, 7, 3, 6] for 8, etc. (1-based seeds). */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

/** Place ranked entrants into a bracket with byes for the top seeds. */
export function seededSlots(ranked: EntrantRef[]): EntrantRef[] {
  const size = nextPow2(Math.max(2, ranked.length));
  return seedOrder(size).map((s) => ranked[s - 1] ?? { kind: 'bye' });
}

export function roundName(teamsInRound: number): string {
  if (teamsInRound === 2) return 'Final';
  if (teamsInRound === 4) return 'Semifinal';
  if (teamsInRound === 8) return 'Quarterfinal';
  return `Round of ${teamsInRound}`;
}

const abbrev = (name: string) =>
  name === 'Final' ? 'F' : name === 'Semifinal' ? 'SF' : name === 'Quarterfinal' ? 'QF' : `R${name.replace(/\D/g, '')}-`;

/** Build every knockout match up-front; later rounds reference earlier winners. */
export function generateKnockoutMatches(stage: Stage, startOrder = 0): Match[] {
  let slots = [...(stage.slots ?? [])];
  const size = nextPow2(Math.max(2, slots.length));
  while (slots.length < size) slots.push({ kind: 'bye' });
  const matches: Match[] = [];
  let order = startOrder;
  let round = 1;
  let current: EntrantRef[] = slots;
  let semis: Match[] = [];
  while (current.length >= 2) {
    const name = roundName(current.length);
    const next: EntrantRef[] = [];
    const roundMatches: Match[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const idx = i / 2 + 1;
      const m: Match = {
        id: uid('m'),
        stageId: stage.id,
        round,
        roundName: name,
        label: name === 'Final' ? 'Final' : `${abbrev(name)}${idx}`,
        a: current[i],
        b: current[i + 1],
        events: [],
        status: 'scheduled',
        order: 0,
        currentQ: 1,
        suddenDeath: false,
      };
      roundMatches.push(m);
      next.push({ kind: 'winner', matchId: m.id });
    }
    if (name === 'Semifinal') semis = roundMatches;
    if (name === 'Final' && stage.thirdPlace && semis.length === 2) {
      matches.push({
        id: uid('m'),
        stageId: stage.id,
        round,
        roundName: 'Third Place',
        label: '3rd Place',
        a: { kind: 'loser', matchId: semis[0].id },
        b: { kind: 'loser', matchId: semis[1].id },
        events: [],
        status: 'scheduled',
        order: 0,
        currentQ: 1,
        suddenDeath: false,
        isThirdPlace: true,
      });
    }
    matches.push(...roundMatches);
    current = next;
    round++;
  }
  // 3rd-place match is played before the final
  for (const m of matches) m.order = order++;
  return matches;
}
