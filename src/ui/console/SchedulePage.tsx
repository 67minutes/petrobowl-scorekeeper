import { useStore } from '../../store/store';
import type { Match, Stage } from '../../engine/types';
import { entrantLabel, isByeMatch, matchTeams } from '../../engine/resolve';
import { matchScore, matchWinner } from '../../engine/scoring';
import { nextSwissRound } from '../../engine/generate';
import { stageMatches } from '../../engine/standings';
import { allLogsCsv, safeFileName } from '../../engine/csv';
import { downloadText } from '../hooks';

export function playableMatches(matches: Match[]) {
  return matches.filter((m) => !isByeMatch(m)).sort((a, b) => a.order - b.order);
}

export function SchedulePage({ onOpen }: { onOpen: () => void }) {
  const t = useStore((s) => s.tournament);
  const update = useStore((s) => s.update);
  const setActive = useStore((s) => s.setActiveMatch);
  const setDisplay = useStore((s) => s.setDisplay);

  const open = (m: Match) => {
    setActive(m.id);
    onOpen();
  };

  const move = (m: Match, dir: -1 | 1) =>
    update((x) => {
      const list = playableMatches(x.matches);
      const i = list.findIndex((y) => y.id === m.id);
      const other = list[i + dir];
      if (!other) return x;
      return {
        ...x,
        matches: x.matches.map((y) =>
          y.id === m.id ? { ...y, order: other.order } : y.id === other.id ? { ...y, order: m.order } : y,
        ),
      };
    });

  const setField = (id: string, patch: Partial<Match>) =>
    update((x) => ({ ...x, matches: x.matches.map((y) => (y.id === id ? { ...y, ...patch } : y)) }), { history: false });

  const all = playableMatches(t.matches);
  const next = all.find((m) => m.status !== 'final' && matchTeams(t, m).a && matchTeams(t, m).b);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="title-font">
            <span className="gold-text">Schedule</span>
          </h1>
          <p>Matches run in this order. Use the arrows to reorder and click Score to open a match in the scorer.</p>
        </div>
        <div className="spacer" />
        <button
          className="btn btn-ghost"
          disabled={!t.matches.some((m) => m.events.length > 0)}
          title="Download every match's answer log as one CSV"
          onClick={() =>
            downloadText(`${safeFileName(`${t.name}_answer_logs`)}.csv`, allLogsCsv(t, playableMatches(t.matches)), 'text/csv;charset=utf-8')
          }
        >
          ⬇ Export answer logs (CSV)
        </button>
        <button className="btn" onClick={() => setDisplay({ view: 'schedule' })}>
          Show schedule on big screen
        </button>
      </div>

      {next && (
        <section className="card-maroon row">
          <span className="pill pill-gold">Next up</span>
          <b style={{ fontSize: '1.2rem' }}>
            {entrantLabel(t, next.a)} <span style={{ opacity: 0.6 }}>vs</span> {entrantLabel(t, next.b)}
          </b>
          <span className="muted" style={{ color: 'var(--cream-200)' }}>
            {next.label} · {next.roundName}
          </span>
          <div className="spacer" />
          <button className="btn btn-gold" onClick={() => open(next)}>
            Score this match ▶
          </button>
        </section>
      )}

      {t.stages.map((s) => (
        <StageSchedule key={s.id} stage={s} onOpen={open} onMove={move} onField={setField}
          onNextRound={() => update((x) => nextSwissRound(x, s.id))} />
      ))}
    </div>
  );
}

function StageSchedule({
  stage: s,
  onOpen,
  onMove,
  onField,
  onNextRound,
}: {
  stage: Stage;
  onOpen: (m: Match) => void;
  onMove: (m: Match, d: -1 | 1) => void;
  onField: (id: string, p: Partial<Match>) => void;
  onNextRound: () => void;
}) {
  const t = useStore((x) => x.tournament);
  const ms = stageMatches(t, s).sort((a, b) => a.order - b.order);
  if (!s.generated) {
    return (
      <section className="card">
        <h2>{s.name}</h2>
        <p className="muted">Fixtures not generated yet. Go to the Draw tab.</p>
      </section>
    );
  }
  const rounds = [...new Set(ms.map((m) => m.round))].sort((a, b) => a - b);
  const lastRound = rounds[rounds.length - 1];
  const lastDone = ms.filter((m) => m.round === lastRound).every((m) => m.status === 'final' || isByeMatch(m));
  const canNext = s.type === 'swiss' && lastDone && rounds.length < (s.rounds ?? 0);

  return (
    <section className="card">
      <div className="row">
        <h2 style={{ margin: 0 }}>{s.name}</h2>
        <span className="muted">
          {ms.filter((m) => m.status === 'final').length} / {ms.filter((m) => !isByeMatch(m)).length} played
        </span>
        <div className="spacer" />
        {s.type === 'swiss' && (
          <button className="btn btn-gold" disabled={!canNext} onClick={onNextRound}>
            Generate round {rounds.length + 1} of {s.rounds}
          </button>
        )}
      </div>
      {rounds.map((r) => (
        <div key={r} style={{ marginTop: 14 }}>
          <div className="pill pill-soft" style={{ marginBottom: 4 }}>
            {ms.find((m) => m.round === r)?.roundName}
          </div>
          {ms
            .filter((m) => m.round === r)
            .map((m) => (
              <MatchRow key={m.id} m={m} stage={s} onOpen={onOpen} onMove={onMove} onField={onField} />
            ))}
        </div>
      ))}
    </section>
  );
}

function MatchRow({
  m,
  stage,
  onOpen,
  onMove,
  onField,
}: {
  m: Match;
  stage: Stage;
  onOpen: (m: Match) => void;
  onMove: (m: Match, d: -1 | 1) => void;
  onField: (id: string, p: Partial<Match>) => void;
}) {
  const t = useStore((x) => x.tournament);
  const activeId = useStore((x) => x.activeMatchId);
  const bye = isByeMatch(m);
  const teams = matchTeams(t, m);
  const ready = !!teams.a && !!teams.b;
  const s = matchScore(m);
  const w = matchWinner(m, stage.type);
  const started = m.status !== 'scheduled';
  return (
    <div className={`match-row ${m.status === 'live' ? 'live' : ''}`} style={{ opacity: bye ? 0.55 : 1 }}>
      <span className="pill" style={{ justifySelf: 'start' }}>{m.label}</span>
      <input className="input" placeholder="time / room" value={m.time ?? ''} style={{ width: '100%', fontSize: '0.8em' }}
        onChange={(e) => onField(m.id, { time: e.target.value })} />
      <span className="right" style={{ fontWeight: w === 'a' ? 800 : 500 }}>{entrantLabel(t, m.a)}</span>
      <span className="score">{bye ? 'BYE' : started ? `${s.a} – ${s.b}` : 'vs'}</span>
      <span style={{ fontWeight: w === 'b' ? 800 : 500 }}>{entrantLabel(t, m.b)}</span>
      <span>
        {m.status === 'final' && <span className="pill pill-done">Final{m.events.some((e) => e.sd) ? ' (SD)' : ''}</span>}
        {m.status === 'live' && <span className="pill pill-live">● Live</span>}
        {m.status === 'scheduled' && !bye && <span className="pill pill-soft">{ready ? 'Ready' : 'Waiting'}</span>}
      </span>
      <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
        {!bye && (
          <>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onMove(m, -1)} title="Move earlier">↑</button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onMove(m, 1)} title="Move later">↓</button>
            <button className={`btn btn-sm ${activeId === m.id ? 'btn-gold' : ''}`} disabled={!ready} onClick={() => onOpen(m)}>
              {m.status === 'final' ? 'View' : 'Score ▶'}
            </button>
          </>
        )}
      </span>
    </div>
  );
}
