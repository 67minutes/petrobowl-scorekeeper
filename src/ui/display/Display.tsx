import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/store';
import type { Match, Side, Stage, Tournament } from '../../engine/types';
import { entrantLabel, isByeMatch, matchTeams, teamName } from '../../engine/resolve';
import { matchScore, matchWinner, needsSuddenDeath, questionState, timerRemaining } from '../../engine/scoring';
import { Logo, Petals } from '../components/Brand';
import { StandingsTable } from '../components/StandingsTable';
import { Bracket } from '../components/Bracket';
import { formatClock, useNow } from '../hooks';
import './display.css';

export function Display() {
  const t = useStore((s) => s.tournament);
  const d = useStore((s) => s.display);
  const activeMatchId = useStore((s) => s.activeMatchId);

  useEffect(() => {
    document.title = `${t.name} · Big screen`;
  }, [t.name]);

  const stage = t.stages.find((s) => s.id === d.stageId);
  // Scoreboard target: the chosen match, else the one open in the scorer, else a live match, else the next one up.
  const byId = (id?: string) => (id ? t.matches.find((m) => m.id === id) : undefined);
  const upcoming = t.matches
    .filter((m) => !isByeMatch(m) && m.status !== 'final')
    .sort((a, b) => a.order - b.order);
  const match =
    byId(d.matchId) ??
    byId(activeMatchId) ??
    upcoming.find((m) => m.status === 'live') ??
    upcoming.find((m) => {
      const x = matchTeams(t, m);
      return x.a && x.b;
    });
  let body: JSX.Element;
  if (d.view === 'scoreboard' && match) body = <Scoreboard t={t} m={match} />;
  else if (d.view === 'standings') body = <StandingsView t={t} stage={stage ?? t.stages.find((s) => s.type !== 'knockout')} group={d.group} />;
  else if (d.view === 'bracket') body = <BracketView t={t} stage={stage ?? t.stages.find((s) => s.type === 'knockout')} />;
  else if (d.view === 'draw') body = <DrawView t={t} stage={stage ?? t.stages.find((s) => s.type === 'groups')} />;
  else if (d.view === 'schedule') body = <ScheduleView t={t} />;
  else body = <TitleView t={t} />;

  return (
    <div className="display bg-maroon" onDoubleClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
      <Petals opacity={d.view === 'title' ? 1 : 0.7} dense={d.view !== 'title'} />
      <div className="display-inner" key={`${d.view}-${d.matchId ?? ''}-${d.stageId ?? ''}-${d.group ?? ''}`}>
        {body}
      </div>
    </div>
  );
}

function SplitTitle({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : '';
  return (
    <>
      {words.join(' ')} {last && <span className="gold-text">{last}</span>}
    </>
  );
}

function TopBar({ t, children }: { t: Tournament; children?: React.ReactNode }) {
  return (
    <div className="d-top">
      <div />
      <div className="d-logo-pill">
        <Logo src={t.logo} size={0.9} />
      </div>
      <div className="d-top-right">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TitleView({ t }: { t: Tournament }) {
  return (
    <div className="d-title-view">
      <Logo src={t.logo} size={1.6} />
      <h1 className="title-font d-hero">
        <SplitTitle text={t.name} />
      </h1>
      {t.subtitle && <div className="d-subtitle">{t.subtitle}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------

function useScoreFlash(score: number) {
  const prev = useRef(score);
  const [flash, setFlash] = useState<{ delta: number; key: number } | null>(null);
  useEffect(() => {
    if (score !== prev.current) {
      setFlash({ delta: score - prev.current, key: Date.now() });
      prev.current = score;
      const id = setTimeout(() => setFlash(null), 1400);
      return () => clearTimeout(id);
    }
  }, [score]);
  return flash;
}

function useCountUp(target: number, ms = 450) {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(a + (target - a) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = target;
    };
  }, [target, ms]);
  return val;
}

function TeamSide({ t, m, side, stage }: { t: Tournament; m: Match; side: Side; stage: Stage }) {
  const teams = matchTeams(t, m);
  const score = matchScore(m)[side];
  const shown = useCountUp(score);
  const flash = useScoreFlash(score);
  const q = questionState(m, t.scoring);
  const steal = m.status !== 'final' && q.phase === 'steal' && q.side === side;
  const winner = m.status === 'final' ? matchWinner(m, stage.type) : null;
  const team = t.teams.find((x) => x.id === teams[side]);
  return (
    <div className={`d-side d-side-${side} ${steal ? 'steal' : ''} ${winner === side ? 'winner' : ''} ${winner && winner !== side ? 'loser' : ''}`}>
      <div className="d-team-short">{team?.shortName ?? entrantLabel(t, m[side])}</div>
      <div className="d-team-full">{team?.name}</div>
      <div className={`d-score ${flash ? (flash.delta > 0 ? 'up' : 'down') : ''}`}>
        {shown}
        {flash && (
          <span key={flash.key} className={`d-delta ${flash.delta > 0 ? 'up' : 'down'}`}>
            {flash.delta > 0 ? `+${flash.delta}` : flash.delta}
          </span>
        )}
      </div>
      {steal && <div className="d-steal-tag">STEAL</div>}
      {winner === side && <div className="d-winner-tag">WINNER</div>}
    </div>
  );
}

function Scoreboard({ t, m }: { t: Tournament; m: Match }) {
  const now = useNow(200);
  const stage = t.stages.find((s) => s.id === m.stageId)!;
  const remaining = timerRemaining(m.timer, now);
  const final = m.status === 'final';
  const winner = final ? matchWinner(m, stage.type) : null;
  const tied = final && !winner;
  const sdWon = m.suddenDeath && !needsSuddenDeath(m, stage.type);
  const qLimit = t.scoring.questionsPerMatch;
  return (
    <div className="d-scoreboard">
      <TopBar t={t}>
        <div className="d-match-pill">
          <span>{stage.name}</span>
          <b>{m.group ? `Group ${m.group}` : m.roundName}</b>
          <span className="d-match-label">{m.label}</span>
        </div>
      </TopBar>
      <div className="d-board">
        <TeamSide t={t} m={m} side="a" stage={stage} />
        <div className="d-center">
          {m.suddenDeath && !final ? (
            <div className="d-sd">SUDDEN<br />DEATH</div>
          ) : (
            <>
              <div className="d-q-label">{final ? 'FINAL' : 'QUESTION'}</div>
              {!final && (
                <div className="d-q">
                  {m.currentQ}
                  {qLimit ? <span className="d-q-of">/{qLimit}</span> : null}
                </div>
              )}
              {final && <div className="d-vs">{tied ? 'DRAW' : 'FT'}</div>}
            </>
          )}
          {remaining != null && !final && (
            <div className={`d-timer ${remaining <= 30 ? 'low' : ''}`}>{formatClock(remaining)}</div>
          )}
          {sdWon && !final && <div className="d-q-label" style={{ marginTop: 12 }}>DECIDED</div>}
        </div>
        <TeamSide t={t} m={m} side="b" stage={stage} />
      </div>
      <div className="d-foot">{t.name}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function StandingsView({ t, stage, group }: { t: Tournament; stage?: Stage; group?: string }) {
  if (!stage) return <TitleView t={t} />;
  const groups = stage.type === 'groups' ? (group ? [group] : (stage.groups ?? []).map((g) => g.name)) : [undefined];
  const single = groups.length === 1;
  return (
    <div className="d-page">
      <TopBar t={t} />
      <h1 className="title-font d-h1">
        {single && group && group !== 'League' ? (
          <>
            Group <span className="gold-text">{group}</span>
          </>
        ) : (
          <SplitTitle text={`${stage.name} Standings`} />
        )}
      </h1>
      <div className={`d-tables ${single ? 'single' : ''}`}>
        {groups.map((g) => (
          <div key={g ?? 'all'} className="card d-table-card">
            {!single && g && <div className="pill pill-gold d-group-pill">Group {g}</div>}
            <StandingsTable t={t} stage={stage} group={g} big />
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketView({ t, stage }: { t: Tournament; stage?: Stage }) {
  if (!stage) return <TitleView t={t} />;
  return (
    <div className="d-page">
      <TopBar t={t} />
      <h1 className="title-font d-h1">
        <SplitTitle text={stage.name} />
      </h1>
      <div className="d-bracket">
        <Bracket t={t} stage={stage} big />
      </div>
    </div>
  );
}

function DrawView({ t, stage }: { t: Tournament; stage?: Stage }) {
  if (!stage || !stage.groups) return <TitleView t={t} />;
  const draw = stage.draw;
  const revealed = draw ? draw.steps.slice(0, draw.revealed) : [];
  const latest = revealed[revealed.length - 1];
  return (
    <div className="d-page">
      <TopBar t={t} />
      <h1 className="title-font d-h1">
        Group Stage <span className="gold-text">Draw</span>
      </h1>
      <div className="d-draw-latest">
        {latest ? (
          <div key={latest.teamId} className="d-draw-announce">
            <span className="d-draw-team">{teamName(t, latest.teamId)}</span>
            <span className="d-draw-arrow">→</span>
            <span className="pill pill-gold d-draw-group">Group {latest.group}</span>
          </div>
        ) : (
          <div className="d-draw-announce muted-cream">The draw is about to begin…</div>
        )}
      </div>
      <div className="d-draw-grid" style={{ gridTemplateColumns: `repeat(${Math.min(4, stage.groups.length)}, minmax(0, 1fr))` }}>
        {stage.groups.map((g) => {
          const inGroup = revealed.filter((s) => s.group === g.name);
          return (
            <div key={g.name} className="card d-draw-card">
              <div className="d-draw-head">Group {g.name}</div>
              {Array.from({ length: g.size }).map((_, i) => {
                const step = inGroup[i];
                const isLatest = step && latest && step.teamId === latest.teamId;
                return (
                  <div key={i} className={`d-draw-slot ${step ? 'filled' : ''} ${isLatest ? 'latest' : ''}`}>
                    {step ? (
                      <>
                        <b>{teamName(t, step.teamId, true)}</b>
                        <span>{teamName(t, step.teamId)}</span>
                      </>
                    ) : (
                      <span className="d-draw-empty">{g.name}{i + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleView({ t }: { t: Tournament }) {
  const list = t.matches
    .filter((m) => !isByeMatch(m) && m.status !== 'final')
    .sort((a, b) => a.order - b.order)
    .slice(0, 8);
  const recent = t.matches
    .filter((m) => m.status === 'final' && !isByeMatch(m))
    .sort((a, b) => b.order - a.order)
    .slice(0, 4);
  return (
    <div className="d-page">
      <TopBar t={t} />
      <h1 className="title-font d-h1">
        Match <span className="gold-text">Schedule</span>
      </h1>
      <div className="d-sched">
        <div className="card d-sched-card">
          <div className="d-sched-title">Up next</div>
          {list.length === 0 && <div className="muted">No upcoming matches.</div>}
          {list.map((m, i) => (
            <div key={m.id} className={`d-sched-row ${i === 0 ? 'first' : ''}`}>
              <span className="pill">{m.label}</span>
              <span className="d-sched-time">{m.time}</span>
              <b className="right">{entrantLabel(t, m.a, true)}</b>
              <span className="d-sched-vs">{m.status === 'live' ? <span className="pill pill-live">LIVE</span> : 'vs'}</span>
              <b>{entrantLabel(t, m.b, true)}</b>
            </div>
          ))}
        </div>
        {recent.length > 0 && (
          <div className="card d-sched-card">
            <div className="d-sched-title">Latest results</div>
            {recent.map((m) => {
              const s = matchScore(m);
              const stage = t.stages.find((x) => x.id === m.stageId);
              const w = matchWinner(m, stage?.type);
              return (
                <div key={m.id} className="d-sched-row">
                  <span className="pill">{m.label}</span>
                  <span />
                  <b className="right" style={{ opacity: w === 'b' ? 0.55 : 1 }}>{entrantLabel(t, m.a, true)}</b>
                  <span className="d-sched-vs score">{s.a} – {s.b}</span>
                  <b style={{ opacity: w === 'a' ? 0.55 : 1 }}>{entrantLabel(t, m.b, true)}</b>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
