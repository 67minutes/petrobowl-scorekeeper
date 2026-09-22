import type { Tournament } from './types';
import { generateGroupMatches } from './formats/roundRobin';
import { generateKnockoutMatches } from './formats/knockout';
import { generateSwissRound } from './formats/swiss';

const nextOrder = (t: Tournament) => t.matches.reduce((mx, m) => Math.max(mx, m.order + 1), 0);

/** Create fixtures for a stage (replacing any previous ones). Swiss creates round 1 only. */
export function generateStage(t: Tournament, stageId: string): Tournament {
  const stage = t.stages.find((s) => s.id === stageId);
  if (!stage) return t;
  const kept = t.matches.filter((m) => m.stageId !== stageId);
  const base: Tournament = { ...t, matches: kept };
  const start = nextOrder(base);
  const newStage = { ...stage, generated: true };
  const withStage: Tournament = { ...base, stages: t.stages.map((s) => (s.id === stageId ? newStage : s)) };
  let created;
  if (stage.type === 'groups') created = generateGroupMatches(newStage, start);
  else if (stage.type === 'knockout') created = generateKnockoutMatches(newStage, start);
  else created = generateSwissRound(withStage, newStage, start);
  return { ...withStage, matches: [...kept, ...created] };
}

export function nextSwissRound(t: Tournament, stageId: string): Tournament {
  const stage = t.stages.find((s) => s.id === stageId);
  if (!stage || stage.type !== 'swiss') return t;
  return { ...t, matches: [...t.matches, ...generateSwissRound(t, stage, nextOrder(t))] };
}
