export type TeamId = string;
export type Side = 'a' | 'b';

export interface Team {
  id: TeamId;
  name: string;
  shortName: string;
  country?: string;
}

export interface ScoringRules {
  /** Points for a correct first response. */
  correct: number;
  /** Points for an incorrect first response (negative). */
  wrong: number;
  stealCorrect: number;
  stealWrong: number;
  allowSteal: boolean;
  /** Apply the wrong-answer penalty during sudden death. */
  suddenDeathPenalty: boolean;
  questionsPerMatch: number | null;
  matchTimerSec: number | null;
}

export interface PointRules {
  win: number;
  draw: number;
  loss: number;
}

export type Tiebreak = 'h2h' | 'diff' | 'scored' | 'coin';

/** Where a match participant comes from. Resolved lazily against the tournament. */
export type EntrantRef =
  | { kind: 'team'; teamId: TeamId }
  | { kind: 'rank'; stageId: string; group?: string; rank: number }
  | { kind: 'winner'; matchId: string }
  | { kind: 'loser'; matchId: string }
  | { kind: 'bye' }
  | { kind: 'tbd' };

export type EventKind = 'correct' | 'wrong' | 'steal-correct' | 'steal-wrong' | 'adjust';

export interface MatchEvent {
  id: string;
  q: number;
  kind: EventKind;
  side: Side;
  delta: number;
  /** Recorded during sudden death. */
  sd?: boolean;
  note?: string;
  ts: number;
}

export type MatchStatus = 'scheduled' | 'live' | 'final';

export interface TimerState {
  durationSec: number;
  /** epoch ms when last started; null when paused */
  startedAt: number | null;
  /** seconds remaining at last pause */
  remainingSec: number;
}

export interface Match {
  id: string;
  stageId: string;
  round: number;
  roundName?: string;
  group?: string;
  label?: string;
  a: EntrantRef;
  b: EntrantRef;
  events: MatchEvent[];
  status: MatchStatus;
  /** global play order */
  order: number;
  currentQ: number;
  suddenDeath: boolean;
  manualWinner?: Side;
  isThirdPlace?: boolean;
  room?: string;
  time?: string;
  timer?: TimerState;
}

export interface Group {
  name: string;
  size: number;
  teamIds: TeamId[];
}

export interface DrawStep {
  teamId: TeamId;
  group: string;
}

export interface DrawState {
  seed: string;
  steps: DrawStep[];
  /** number of steps revealed on the big screen */
  revealed: number;
}

export interface DrawOptions {
  separateCountries: boolean;
  /** team id -> group name */
  locks: Record<TeamId, string>;
  /** optional pots of team ids, drawn pot by pot */
  pots: TeamId[][];
}

export type StageType = 'groups' | 'knockout' | 'swiss';

export interface Stage {
  id: string;
  name: string;
  type: StageType;
  generated: boolean;
  /** groups / round-robin (a single group = league) */
  groups?: Group[];
  legs?: 1 | 2;
  advance?: number;
  draw?: DrawState;
  drawOptions?: DrawOptions;
  /** knockout: slots in bracket order, consecutive pairs play in round 1 */
  slots?: EntrantRef[];
  thirdPlace?: boolean;
  /** swiss */
  rounds?: number;
  teamIds?: TeamId[];
}

export interface Tournament {
  id: string;
  name: string;
  subtitle: string;
  teams: Team[];
  scoring: ScoringRules;
  points: PointRules;
  tiebreaks: Tiebreak[];
  stages: Stage[];
  matches: Match[];
  /** manual / drawn-lots order for unresolved ties, key = `${stageId}|${group ?? ''}` */
  tieOrders: Record<string, TeamId[]>;
  /** logo image as a data URL (optional) */
  logo?: string;
}
