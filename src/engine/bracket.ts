import type { EntrantRef, Match, Side, Stage, Tournament } from './types';
import { crossoverSlots, rankedSlots } from './formats/groupsToKnockout';

/** The automatic slots for a knockout stage fed by the stage before it (null if it isn't fed). */
export function autoSlots(t: Tournament, koId: string): EntrantRef[] | null {
  const idx = t.stages.findIndex((s) => s.id === koId);
  const from = t.stages[idx - 1];
  if (idx <= 0 || !from) return null;
  return from.type === 'groups' && (from.groups?.length ?? 0) > 1
    ? crossoverSlots(from)
    : rankedSlots(from, from.advance ?? 4);
}

export const sameRef = (x: EntrantRef, y: EntrantRef) => JSON.stringify(x) === JSON.stringify(y);

const labelIndex = (m: Match) => Number(/(\d+)$/.exec(m.label ?? '')?.[1] ?? 0);

/**
 * First-round matches in bracket order (slot pair 0, 1, 2, …).
 * Uses the stable label number (QF1, QF2, …) so reordering the schedule doesn't break it.
 */
export function firstRoundMatches(t: Tournament, stage: Stage): Match[] {
  return t.matches
    .filter((m) => m.stageId === stage.id && m.round === 1 && !m.isThirdPlace)
    .sort((a, b) => labelIndex(a) - labelIndex(b));
}

/** The generated match and side that a bracket slot feeds, if the bracket exists. */
export function slotMatch(t: Tournament, stage: Stage, index: number): { match: Match; side: Side } | null {
  if (!stage.generated) return null;
  const match = firstRoundMatches(t, stage)[Math.floor(index / 2)];
  return match ? { match, side: index % 2 === 0 ? 'a' : 'b' } : null;
}

export const matchHasResult = (m: Match) => m.events.length > 0 || m.status !== 'scheduled' || !!m.manualWinner;

/**
 * Put `ref` in a knockout slot. If the bracket is already generated, the first-round
 * match is updated in place (other results are kept); a match that already had scores
 * is reset, since its line-up changed.
 */
export function setKnockoutSlot(t: Tournament, stageId: string, index: number, ref: EntrantRef): Tournament {
  const stage = t.stages.find((s) => s.id === stageId);
  if (!stage || stage.type !== 'knockout' || !stage.slots || index < 0 || index >= stage.slots.length) return t;
  const slots = stage.slots.map((r, i) => (i === index ? ref : r));
  const target = slotMatch(t, stage, index);
  const matches = target
    ? t.matches.map((m): Match => {
        if (m.id !== target.match.id) return m;
        const next: Match = { ...m, [target.side]: ref };
        return matchHasResult(m)
          ? { ...next, events: [], status: 'scheduled' as const, currentQ: 1, suddenDeath: false, manualWinner: undefined, timer: undefined }
          : next;
      })
    : t.matches;
  return { ...t, stages: t.stages.map((s) => (s.id === stageId ? { ...s, slots } : s)), matches };
}

/** Put every slot back to its automatic qualifier. */
export function resetKnockoutSlots(t: Tournament, stageId: string): Tournament {
  const auto = autoSlots(t, stageId);
  const stage = t.stages.find((s) => s.id === stageId);
  if (!auto || !stage?.slots) return t;
  return auto.reduce((acc, ref, i) => (stage.slots![i] && !sameRef(stage.slots![i], ref) ? setKnockoutSlot(acc, stageId, i, ref) : acc), t);
}
