import type { PointRules, ScoringRules, Stage, Team, Tiebreak, Tournament } from '../types';
import { groupLetter, uid } from '../util';
import { crossoverSlots, rankedSlots } from '../formats/groupsToKnockout';
import { seededSlots } from '../formats/knockout';

export const defaultScoring = (): ScoringRules => ({
  correct: 10,
  wrong: -5,
  stealCorrect: 10,
  stealWrong: -5,
  allowSteal: true,
  suddenDeathPenalty: false,
  questionsPerMatch: null,
  matchTimerSec: null,
});

export const defaultPoints = (): PointRules => ({ win: 2, draw: 1, loss: 0 });
export const defaultTiebreaks = (): Tiebreak[] => ['h2h', 'diff', 'scored', 'coin'];

export function blankTournament(name = 'New Petrobowl Tournament'): Tournament {
  return {
    id: uid('t'),
    name,
    subtitle: '',
    teams: [],
    scoring: defaultScoring(),
    points: defaultPoints(),
    tiebreaks: defaultTiebreaks(),
    stages: [],
    matches: [],
    tieOrders: {},
  };
}

export function makeTeams(rows: { name: string; shortName?: string; country?: string }[]): Team[] {
  return rows.map((r) => ({
    id: uid('tm'),
    name: r.name.trim(),
    shortName: (r.shortName ?? '').trim() || abbreviate(r.name),
    country: r.country?.trim() || undefined,
  }));
}

export function abbreviate(name: string): string {
  const words = name.replace(/[“”"()]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 10);
  return words
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => (w === w.toUpperCase() && w.length > 1 ? w : w[0]))
    .join('')
    .slice(0, 10);
}

export function groupStage(name: string, sizes: number[], advance: number, legs: 1 | 2 = 1): Stage {
  return {
    id: uid('s'),
    name,
    type: 'groups',
    generated: false,
    groups: sizes.map((size, i) => ({ name: sizes.length === 1 ? 'League' : groupLetter(i), size, teamIds: [] })),
    legs,
    advance,
    drawOptions: { separateCountries: false, locks: {}, pots: [] },
  };
}

export function knockoutStage(name: string, from: Stage | null, teamsIn: number, thirdPlace = false): Stage {
  let slots: Stage['slots'] = [];
  if (from?.type === 'groups' && (from.groups?.length ?? 0) > 1) slots = crossoverSlots(from);
  else if (from) slots = rankedSlots(from, teamsIn);
  else slots = seededSlots(Array.from({ length: teamsIn }, () => ({ kind: 'tbd' as const })));
  return { id: uid('s'), name, type: 'knockout', generated: false, slots, thirdPlace };
}

export function swissStage(name: string, rounds: number, teamIds: string[]): Stage {
  return { id: uid('s'), name, type: 'swiss', generated: false, rounds, teamIds, advance: 4 };
}

/** Evenly split n teams into k groups, larger groups last (e.g. 13 → 3,3,3,4). */
export function evenGroupSizes(n: number, k: number): number[] {
  const base = Math.floor(n / k);
  const extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i >= k - extra ? 1 : 0));
}

export type TemplateId = 'groups-ko' | 'league' | 'league-ko' | 'single-elim' | 'swiss' | 'swiss-ko';

export const TEMPLATES: { id: TemplateId; label: string; hint: string }[] = [
  { id: 'groups-ko', label: 'Groups → Knockout', hint: 'Round robin inside groups, top teams advance to a bracket' },
  { id: 'league', label: 'Round robin (league)', hint: 'Everyone plays everyone once; table decides the winner' },
  { id: 'league-ko', label: 'Round robin → Top 4 playoff', hint: 'League table, then semifinals and final' },
  { id: 'single-elim', label: 'Single elimination', hint: 'Seeded bracket with automatic byes' },
  { id: 'swiss', label: 'Swiss system', hint: 'Fixed number of rounds, paired by record, no rematches' },
  { id: 'swiss-ko', label: 'Swiss → Top 4 playoff', hint: 'Swiss rounds, then semifinals and final' },
];

export interface TemplateOptions {
  groupCount: number;
  advance: number;
  swissRounds: number;
  thirdPlace: boolean;
}

export function applyTemplate(t: Tournament, id: TemplateId, o: TemplateOptions): Tournament {
  const n = t.teams.length;
  const ids = t.teams.map((x) => x.id);
  let stages: Stage[] = [];
  if (id === 'groups-ko') {
    const g = groupStage('Group Stage', evenGroupSizes(n, Math.max(1, o.groupCount)), o.advance);
    stages = [g, knockoutStage('Knockout Stage', g, o.groupCount * o.advance, o.thirdPlace)];
  } else if (id === 'league' || id === 'league-ko') {
    const g = groupStage('League', [n], id === 'league' ? 1 : 4);
    g.groups![0].teamIds = ids;
    stages = [g];
    if (id === 'league-ko') stages.push(knockoutStage('Playoffs', g, 4, o.thirdPlace));
  } else if (id === 'single-elim') {
    const k = knockoutStage('Knockout', null, n, o.thirdPlace);
    k.slots = seededSlots(ids.map((teamId) => ({ kind: 'team' as const, teamId })));
    stages = [k];
  } else {
    const s = swissStage('Swiss Rounds', o.swissRounds, ids);
    stages = [s];
    if (id === 'swiss-ko') stages.push(knockoutStage('Playoffs', s, 4, o.thirdPlace));
  }
  return { ...t, stages, matches: [], tieOrders: {} };
}
