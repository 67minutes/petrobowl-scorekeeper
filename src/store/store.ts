import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { EventKind, Match, Side, Tournament } from '../engine/types';
import { apac2026 } from '../engine/presets/apac2026';
import { makeEvent, needsSuddenDeath, timerRemaining } from '../engine/scoring';

export type DisplayView = 'title' | 'scoreboard' | 'standings' | 'bracket' | 'draw' | 'schedule';

export interface DisplayState {
  view: DisplayView;
  matchId?: string;
  stageId?: string;
  /** standings: show only this group (undefined = all groups) */
  group?: string;
}

interface State {
  tournament: Tournament;
  display: DisplayState;
  /** match open in the operator's scorer */
  activeMatchId?: string;
  /** in-memory undo stack for whole-tournament edits (not persisted) */
  history: Tournament[];

  update: (fn: (t: Tournament) => Tournament, opts?: { history?: boolean }) => void;
  replace: (t: Tournament) => void;
  undo: () => void;
  setDisplay: (d: Partial<DisplayState> & { view: DisplayView }) => void;
  setActiveMatch: (id?: string) => void;
  updateMatch: (id: string, fn: (m: Match, t: Tournament) => Match) => void;
  answer: (id: string, kind: EventKind, side: Side) => void;
  adjust: (id: string, side: Side, delta: number, note: string) => void;
  undoEvent: (id: string) => void;
}

export const STORAGE_KEY = 'petrobowl-scorekeeper-v1';

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      tournament: apac2026(),
      display: { view: 'title' },
      history: [],

      update: (fn, opts = {}) => {
        const prev = get().tournament;
        const next = fn(prev);
        if (next === prev) return;
        set({
          tournament: next,
          history: opts.history === false ? get().history : [...get().history.slice(-49), prev],
        });
      },
      replace: (t) => set({ tournament: t, history: [...get().history.slice(-49), get().tournament], activeMatchId: undefined }),
      undo: () => {
        const h = get().history;
        if (!h.length) return;
        set({ tournament: h[h.length - 1], history: h.slice(0, -1) });
      },
      setDisplay: (d) => set({ display: { ...d } }),
      setActiveMatch: (id) => set({ activeMatchId: id }),

      updateMatch: (id, fn) =>
        get().update(
          (t) => ({ ...t, matches: t.matches.map((m) => (m.id === id ? fn(m, t) : m)) }),
          // per-match changes have their own event-level undo
          { history: false },
        ),

      answer: (id, kind, side) =>
        get().updateMatch(id, (m, t) => ({
          ...m,
          status: m.status === 'final' ? m.status : 'live',
          events: [...m.events, makeEvent(m, kind, side, t.scoring)],
        })),

      adjust: (id, side, delta, note) =>
        get().updateMatch(id, (m, t) => ({
          ...m,
          events: [...m.events, makeEvent(m, 'adjust', side, t.scoring, { delta, note })],
        })),

      undoEvent: (id) => get().updateMatch(id, (m) => ({ ...m, events: m.events.slice(0, -1) })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ tournament: s.tournament, display: s.display, activeMatchId: s.activeMatchId }),
    },
  ),
);

/** Keep every open window (console + big screen) in sync through localStorage events. */
export function enableCrossWindowSync() {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) useStore.persist.rehydrate();
  });
}

// ---- match helpers ---------------------------------------------------------

export const matchOps = {
  nextQuestion: (m: Match): Match => ({ ...m, currentQ: m.currentQ + 1 }),
  prevQuestion: (m: Match): Match => ({ ...m, currentQ: Math.max(1, m.currentQ - 1) }),
  start: (m: Match): Match => ({ ...m, status: 'live' }),
  finalize: (m: Match): Match => ({ ...m, status: 'final', timer: pauseTimer(m.timer) }),
  reopen: (m: Match): Match => ({ ...m, status: 'live' }),
  startSuddenDeath: (m: Match): Match => ({ ...m, suddenDeath: true, currentQ: m.currentQ + 1, status: 'live' }),
  endSuddenDeath: (m: Match): Match => ({ ...m, suddenDeath: false }),
  setWinner: (m: Match, side?: Side): Match => ({ ...m, manualWinner: side }),
  reset: (m: Match): Match => ({
    ...m,
    events: [],
    status: 'scheduled',
    currentQ: 1,
    suddenDeath: false,
    manualWinner: undefined,
    timer: undefined,
  }),
};

export function pauseTimer(t: Match['timer']): Match['timer'] {
  if (!t || t.startedAt == null) return t;
  return { ...t, startedAt: null, remainingSec: timerRemaining(t) ?? 0 };
}

export const timerOps = {
  start: (m: Match, durationSec: number): Match => {
    const t = m.timer ?? { durationSec, startedAt: null, remainingSec: durationSec };
    if (t.startedAt != null) return m;
    return { ...m, timer: { ...t, startedAt: Date.now() } };
  },
  pause: (m: Match): Match => ({ ...m, timer: pauseTimer(m.timer) }),
  reset: (m: Match, durationSec: number): Match => ({
    ...m,
    timer: { durationSec, startedAt: null, remainingSec: durationSec },
  }),
};

export { needsSuddenDeath };
