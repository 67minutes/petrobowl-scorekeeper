import { describe, expect, it } from 'vitest';
import { apac2026 } from './presets/apac2026';
import { runDraw } from './draw';
import { generateStage, nextSwissRound } from './generate';
import { roundRobinPairs } from './formats/roundRobin';
import { seedOrder, seededSlots, generateKnockoutMatches } from './formats/knockout';
import { swissPairs } from './formats/swiss';
import { makeEvent, matchScore, matchWinner, needsSuddenDeath, questionState } from './scoring';
import { groupStandings } from './standings';
import { resolveEntrant, describeRef } from './resolve';
import { allLogsCsv, matchLogCsv } from './csv';
import { applyTemplate, blankTournament, makeTeams, defaultScoring } from './presets';
import type { Match, Side, Tournament } from './types';

const rules = defaultScoring();

function playTo(m: Match, a: number, b: number): Match {
  // score via correct answers (+10) and wrongs (−5) to hit exact totals
  const events: Match['events'] = [];
  const push = (side: Side, target: number) => {
    let s = 0;
    while (s < target) {
      events.push(makeEvent(m, 'correct', side, rules));
      s += 10;
    }
    while (s > target) {
      events.push(makeEvent(m, 'wrong', side, rules));
      s -= 5;
    }
  };
  push('a', a);
  push('b', b);
  return { ...m, events, status: 'final' };
}

function drawn(): Tournament {
  const t = apac2026();
  const g = t.stages[0];
  const res = runDraw(t.teams, g.groups!, 'seed-1', g.drawOptions!);
  const stages = t.stages.map((s, i) => (i === 0 ? { ...s, groups: res.groups } : s));
  return generateStage({ ...t, stages }, g.id);
}

describe('scoring', () => {
  it('applies +10 / −5 and steals', () => {
    let m: Match = drawn().matches[0];
    m = { ...m, events: [makeEvent(m, 'wrong', 'a', rules)] };
    expect(questionState(m, rules)).toEqual({ phase: 'steal', side: 'b' });
    m = { ...m, events: [...m.events, makeEvent(m, 'steal-correct', 'b', rules)] };
    expect(questionState(m, rules)).toEqual({ phase: 'closed', by: 'b' });
    expect(matchScore(m)).toEqual({ a: -5, b: 10 });
    // undo = pop
    m = { ...m, events: m.events.slice(0, -1) };
    expect(matchScore(m)).toEqual({ a: -5, b: 0 });
  });

  it('sudden death decides a tied knockout match', () => {
    let m: Match = { ...drawn().matches[0], status: 'final' };
    m = playTo(m, 30, 30);
    expect(needsSuddenDeath(m, 'knockout')).toBe(true);
    expect(matchWinner(m, 'groups')).toBe(null);
    m = { ...m, suddenDeath: true };
    m = { ...m, events: [...m.events, makeEvent(m, 'wrong', 'a', rules), makeEvent(m, 'steal-correct', 'b', rules)] };
    expect(m.events[m.events.length - 2].delta).toBe(0); // no penalty in SD by default
    expect(needsSuddenDeath(m, 'knockout')).toBe(false);
    expect(matchWinner(m, 'knockout')).toBe('b');
  });
});

describe('APAC 2026 preset', () => {
  it('draws 3/3/3/4 deterministically', () => {
    const t = apac2026();
    const g = t.stages[0];
    const r1 = runDraw(t.teams, g.groups!, 'abc', g.drawOptions!);
    const r2 = runDraw(t.teams, g.groups!, 'abc', g.drawOptions!);
    expect(r1.groups.map((x) => x.teamIds.length)).toEqual([3, 3, 3, 4]);
    expect(r1.groups).toEqual(r2.groups);
    expect(new Set(r1.groups.flatMap((x) => x.teamIds)).size).toBe(13);
    // country separation: the 4 non-Indonesian teams end up in different groups
    const foreign = t.teams.filter((x) => x.country !== 'Indonesia').map((x) => x.id);
    const groupsWithForeign = r1.groups.filter((g) => g.teamIds.some((id) => foreign.includes(id)));
    expect(groupsWithForeign.length).toBe(4);
  });

  it('generates 15 group matches, each pair once', () => {
    const t = drawn();
    expect(t.matches.length).toBe(15);
    for (const g of t.stages[0].groups!) {
      const ms = t.matches.filter((m) => m.group === g.name);
      const keys = new Set(ms.map((m) => [m.a, m.b].map((r) => (r as { teamId: string }).teamId).sort().join('|')));
      expect(keys.size).toBe((g.size * (g.size - 1)) / 2);
    }
  });

  it('fills the quarterfinals A1–B2 etc. once groups finish', () => {
    let t = drawn();
    const ko = t.stages[1];
    t = generateStage(t, ko.id);
    const qf = t.matches.filter((m) => m.roundName === 'Quarterfinal');
    expect(qf.map((m) => `${describeRef(t, m.a)} v ${describeRef(t, m.b)}`)).toEqual([
      'Winner Group A v Runner-up Group B',
      'Winner Group C v Runner-up Group D',
      'Winner Group B v Runner-up Group A',
      'Winner Group D v Runner-up Group C',
    ]);
    expect(resolveEntrant(t, qf[0].a)).toBe(null);
    // team drawn earlier into its group wins (a strict ranking, no cycles)
    const pos = (ref: Match['a']) =>
      t.stages[0].groups!.flatMap((g) => g.teamIds).indexOf((ref as { teamId: string }).teamId);
    t = {
      ...t,
      matches: t.matches.map((m) =>
        m.stageId !== t.stages[0].id ? m : pos(m.a) < pos(m.b) ? playTo(m, 50, 20) : playTo(m, 20, 50),
      ),
    };
    expect(resolveEntrant(t, qf[0].a)).not.toBe(null);
    expect(t.matches.filter((m) => m.stageId === ko.id).length).toBe(7);
  });
});

describe('standings', () => {
  it('breaks a 3-way tie by point difference when head-to-head is level', () => {
    let t = blankTournament();
    t.teams = makeTeams([{ name: 'Alpha' }, { name: 'Bravo' }, { name: 'Charlie' }]);
    t = applyTemplate(t, 'league', { groupCount: 1, advance: 1, swissRounds: 3, thirdPlace: false });
    t = generateStage(t, t.stages[0].id);
    const [A, B, C] = t.teams.map((x) => x.id);
    const res: Record<string, [number, number]> = { [`${A}|${B}`]: [50, 0], [`${B}|${C}`]: [30, 20], [`${C}|${A}`]: [40, 30] };
    t = {
      ...t,
      matches: t.matches.map((m) => {
        const a = (m.a as { teamId: string }).teamId;
        const b = (m.b as { teamId: string }).teamId;
        const k = res[`${a}|${b}`];
        if (k) return playTo(m, k[0], k[1]);
        const r = res[`${b}|${a}`];
        return playTo(m, r[1], r[0]);
      }),
    };
    const table = groupStandings(t, t.stages[0]);
    // all on 2 pts; h2h all 2 pts; diff A +40, B −40, C 0
    expect(table.rows.map((r) => r.teamId)).toEqual([A, C, B]);
    expect(table.rows[0].decidedBy).toBe('diff');
    expect(table.complete).toBe(true);
  });

  it('flags ties that need drawing of lots', () => {
    let t = blankTournament();
    t.teams = makeTeams([{ name: 'Alpha' }, { name: 'Bravo' }]);
    t = applyTemplate(t, 'league', { groupCount: 1, advance: 1, swissRounds: 3, thirdPlace: false });
    t = generateStage(t, t.stages[0].id);
    t = { ...t, matches: t.matches.map((m) => playTo(m, 20, 20)) };
    const s = t.stages[0];
    expect(groupStandings(t, s).rows.every((r) => r.unresolvedTie)).toBe(true);
    const [A, B] = t.teams.map((x) => x.id);
    t = { ...t, tieOrders: { [`${s.id}|League`]: [B, A] } };
    const rows = groupStandings(t, s, 'League').rows;
    expect(rows.map((r) => r.teamId)).toEqual([B, A]);
    expect(rows.some((r) => r.unresolvedTie)).toBe(false);
  });
});

describe('csv answer log export', () => {
  it('writes a header, running scores, and quotes commas', () => {
    let m: Match = drawn().matches[0];
    m = {
      ...m,
      events: [
        makeEvent(m, 'wrong', 'a', rules),
        makeEvent(m, 'steal-correct', 'b', rules),
        makeEvent(m, 'adjust', 'a', rules, { delta: 5, note: 'judge ruling, Q1' }),
      ],
    };
    const t = { ...drawn(), matches: [m] };
    const lines = matchLogCsv(t, m).split('\r\n');
    expect(lines[0]).toContain('Score A');
    expect(lines.length).toBe(4); // header + 3 events
    // running scores: a: -5, then b steal +10, then a +5 -> a=0,b=10
    expect(lines[1]).toContain(',-5,'); // team A wrong delta
    expect(lines[3]).toContain('"judge ruling, Q1"'); // comma-containing note is quoted
    expect(lines[3].endsWith(',0,10,"judge ruling, Q1",' + lines[3].split(',').pop())).toBe(true);
  });

  it('combines every match into one file', () => {
    const t = drawn();
    const withEvents = {
      ...t,
      matches: t.matches.map((m, i) => (i < 2 ? { ...m, events: [makeEvent(m, 'correct', 'a', rules)] } : m)),
    };
    const rows = allLogsCsv(withEvents, withEvents.matches).split('\r\n');
    expect(rows.length).toBe(1 + 2); // header + 2 events total
  });
});

describe('formats', () => {
  it('round robin covers every pair once', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const pairs = roundRobinPairs(ids).flat();
    expect(pairs.length).toBe(10);
    expect(new Set(pairs.map((p) => [...p].sort().join())).size).toBe(10);
  });

  it('seeds brackets and gives byes to top seeds', () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    const slots = seededSlots(['1', '2', '3', '4', '5', '6'].map((teamId) => ({ kind: 'team' as const, teamId })));
    expect(slots[1]).toEqual({ kind: 'bye' }); // seed 1 vs bye
    const t = blankTournament();
    t.teams = makeTeams(['1', '2', '3', '4', '5', '6'].map((name) => ({ name })));
    const stage = { id: 's', name: 'KO', type: 'knockout' as const, generated: true, slots, thirdPlace: true };
    const ms = generateKnockoutMatches(stage);
    expect(ms.length).toBe(4 + 2 + 1 + 1);
    const tt = { ...t, stages: [stage], matches: ms };
    expect(resolveEntrant(tt, { kind: 'winner', matchId: ms[0].id })).toBe('1');
  });

  it('swiss avoids rematches', () => {
    const played = new Set(['a|b', 'c|d']);
    const pairs = swissPairs(['a', 'b', 'c', 'd'], played);
    for (const [x, y] of pairs) expect(played.has([x, y].sort().join('|'))).toBe(false);
  });

  it('swiss runs rounds with a bye for odd teams', () => {
    let t = blankTournament();
    t.teams = makeTeams(['A', 'B', 'C', 'D', 'E'].map((name) => ({ name })));
    t = applyTemplate(t, 'swiss', { groupCount: 1, advance: 1, swissRounds: 3, thirdPlace: false });
    t = generateStage(t, t.stages[0].id);
    expect(t.matches.length).toBe(3);
    expect(t.matches.filter((m) => m.b.kind === 'bye').length).toBe(1);
    t = { ...t, matches: t.matches.map((m) => (m.b.kind === 'bye' ? m : playTo(m, 20, 10))) };
    t = nextSwissRound(t, t.stages[0].id);
    const r2 = t.matches.filter((m) => m.round === 2);
    expect(r2.length).toBe(3);
    const byes = t.matches.filter((m) => m.b.kind === 'bye').map((m) => (m.a as { teamId: string }).teamId);
    expect(new Set(byes).size).toBe(2);
  });
});
