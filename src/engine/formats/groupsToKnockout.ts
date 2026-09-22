import type { EntrantRef, Stage } from '../types';
import { seededSlots } from './knockout';

/**
 * Knockout slots fed by a group stage.
 * With an even number of groups and 2 qualifiers each, uses the classic crossover
 * (A1–B2, C1–D2 | B1–A2, D1–C2) so group-mates can only meet in the final.
 * Otherwise seeds all group winners first, then runners-up, etc.
 */
export function crossoverSlots(from: Stage): EntrantRef[] {
  const names = (from.groups ?? []).map((g) => g.name);
  const adv = from.advance ?? 2;
  const ref = (group: string, rank: number): EntrantRef => ({ kind: 'rank', stageId: from.id, group, rank });

  if (adv === 2 && names.length >= 2 && names.length % 2 === 0) {
    const top: EntrantRef[] = [];
    const bottom: EntrantRef[] = [];
    for (let i = 0; i < names.length; i += 2) {
      const [x, y] = [names[i], names[i + 1]];
      top.push(ref(x, 1), ref(y, 2));
      bottom.push(ref(y, 1), ref(x, 2));
    }
    return [...top, ...bottom];
  }
  if (adv === 1 && names.length === 1) return [ref(names[0], 1)];
  const ranked: EntrantRef[] = [];
  for (let r = 1; r <= adv; r++) for (const n of names) ranked.push(ref(n, r));
  return seededSlots(ranked);
}

/** Knockout slots fed by a single ranked table (league or swiss): 1 v N, 2 v N-1 … */
export function rankedSlots(from: Stage, count: number): EntrantRef[] {
  const group = from.type === 'groups' ? from.groups?.[0]?.name : undefined;
  const ranked: EntrantRef[] = [];
  for (let r = 1; r <= count; r++) ranked.push({ kind: 'rank', stageId: from.id, group, rank: r });
  return seededSlots(ranked);
}
