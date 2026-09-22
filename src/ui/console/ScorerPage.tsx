import { useEffect, useRef, useState } from 'react';
import { matchOps, timerOps, useStore } from '../../store/store';
import type { EventKind, Match, Side } from '../../engine/types';
import { entrantLabel, matchTeams, teamName } from '../../engine/resolve';
import { matchScore, matchWinner, needsSuddenDeath, other, questionState, timerRemaining } from '../../engine/scoring';
import { formatClock, downloadText, useNow } from '../hooks';
import { matchLogCsv, safeFileName } from '../../engine/csv';
import { playableMatches } from './SchedulePage';

const KEYS = { a: { correct: 'q', wrong: 'w' }, b: { correct: 'o', wrong: 'p' } } as const;

const KIND_LABEL: Record<EventKind, string> = {
  correct: 'Correct',
  wrong: 'Incorrect',
  'steal-correct': 'Steal ✓',
  'steal-wrong': 'Steal ✗',
  adjust: 'Adjustment',
};

export function ScorerPage() {
  const t = useStore((s) => s.tournament);
  const activeId = useStore((s) => s.activeMatchId);
  const setActive = useStore((s) => s.setActiveMatch);
  const list = playableMatches(t.matches).filter((m) => {
    const x = matchTeams(t, m);
    return x.a && x.b;
  });
  const m = t.matches.find((x) => x.id === activeId);

  useEffect(() => {
    if (!m && list.length) setActive((list.find((x) => x.status !== 'final') ?? list[0]).id);
  }, [m, list.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="title-font">
            Match <span className="gold-text">scorer</span>
          </h1>
          <p>
            Keys: Team A <kbd>Q</kbd> correct <kbd>W</kbd> wrong · Team B <kbd>O</kbd> correct <kbd>P</kbd> wrong · during a
            steal the same keys score the steal · <kbd>N</kbd> next question · <kbd>Z</kbd> undo · <kbd>Space</kbd> timer
          </p>
        </div>
        <div className="spacer" />
        <select className="select" value={activeId ?? ''} onChange={(e) => setActive(e.target.value)} style={{ maxWidth: 420 }}>
          {list.length === 0 && <option value="">No ready matches, generate fixtures first</option>}
          {list.map((x) => (
            <option key={x.id} value={x.id}>
              {x.status === 'final' ? '✓ ' : x.status === 'live' ? '● ' : ''}
              {x.label} · {entrantLabel(t, x.a, true)} vs {entrantLabel(t, x.b, true)}
            </option>
          ))}
        </select>
      </div>
      {m ? <Scorer key={m.id} m={m} /> : <div className="card">Select a match.</div>}
    </div>
  );
}

function Scorer({ m }: { m: Match }) {
  const t = useStore((s) => s.tournament);
  const answer = useStore((s) => s.answer);
  const adjust = useStore((s) => s.adjust);
  const updateMatch = useStore((s) => s.updateMatch);
  const display = useStore((s) => s.display);
  const setDisplay = useStore((s) => s.setDisplay);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const now = useNow(250);

  const stage = t.stages.find((s) => s.id === m.stageId)!;
  const rules = t.scoring;
  const teams = matchTeams(t, m);
  const score = matchScore(m);
  const q = questionState(m, rules);
  const final = m.status === 'final';
  const onScreen = display.view === 'scoreboard' && display.matchId === m.id;

  useEffect(() => {
    const d = useStore.getState().display;
    if ((d.view === 'title' || d.view === 'scoreboard') && d.matchId !== m.id) setDisplay({ view: 'scoreboard', matchId: m.id });
  }, [m.id, setDisplay]);
  const sdNeeded = needsSuddenDeath(m, stage.type);
  const winner = matchWinner({ ...m, status: 'final' }, stage.type);
  const sdDecided = m.suddenDeath && !sdNeeded;
  const qLimit = rules.questionsPerMatch;
  const overLimit = qLimit != null && !m.suddenDeath && m.currentQ > qLimit;
  const remaining = timerRemaining(m.timer, now);
  const mref = useRef(m);
  mref.current = m;

  const act = (side: Side, correct: boolean) => {
    const cur = mref.current;
    if (cur.status === 'final') return;
    const st = questionState(cur, rules);
    let kind: EventKind;
    if (st.phase === 'open') kind = correct ? 'correct' : 'wrong';
    else if (st.phase === 'steal' && st.side === side) kind = correct ? 'steal-correct' : 'steal-wrong';
    else return;
    if (cur.status === 'scheduled' && !onScreen && (display.view === 'title' || display.view === 'scoreboard'))
      setDisplay({ view: 'scoreboard', matchId: cur.id });
    answer(cur.id, kind, side);
    // question closes on a correct answer, a failed steal, or a wrong answer when steals are off
    const closes = correct || kind === 'steal-wrong' || !rules.allowSteal;
    if (closes && autoAdvance && !(cur.suddenDeath && correct)) updateMatch(cur.id, matchOps.nextQuestion);
  };

  const undo = () => {
    const cur = mref.current;
    const last = cur.events[cur.events.length - 1];
    if (!last || cur.status === 'final') return;
    updateMatch(cur.id, (x) => ({ ...x, events: x.events.slice(0, -1), currentQ: last.q }));
  };

  const next = () => mref.current.status !== 'final' && updateMatch(mref.current.id, matchOps.nextQuestion);

  const toggleTimer = () => {
    const cur = mref.current;
    if (!rules.matchTimerSec) return;
    if (cur.timer?.startedAt != null) updateMatch(cur.id, timerOps.pause);
    else updateMatch(cur.id, (x) => timerOps.start(x, rules.matchTimerSec!));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === KEYS.a.correct) act('a', true);
      else if (k === KEYS.a.wrong) act('a', false);
      else if (k === KEYS.b.correct) act('b', true);
      else if (k === KEYS.b.wrong) act('b', false);
      else if (k === 'n' || k === 'arrowright') next();
      else if (k === 'z' || k === 'backspace') undo();
      else if (k === ' ') toggleTimer();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const finalize = () => {
    if (sdNeeded) {
      if (window.confirm('Scores are level in a knockout match. Start sudden death?\n\nFirst correct answer wins.')) {
        updateMatch(m.id, matchOps.startSuddenDeath);
      }
      return;
    }
    const w = winner;
    const msg =
      w == null
        ? `Finalize as a DRAW ${score.a}–${score.b}?`
        : `Finalize: ${teamName(t, teams[w])} wins ${Math.max(score.a, score.b)}–${Math.min(score.a, score.b)}?`;
    if (window.confirm(msg)) updateMatch(m.id, matchOps.finalize);
  };

  const doAdjust = (side: Side) => {
    const raw = window.prompt(`Adjust ${teamName(t, teams[side])}'s score by (e.g. 10 or -5):`, '');
    if (!raw) return;
    const delta = Number(raw);
    if (!Number.isFinite(delta) || delta === 0) return;
    const note = window.prompt('Reason (optional, e.g. judge ruling on Q12):', '') ?? '';
    adjust(m.id, side, delta, note);
  };

  const panel = (side: Side) => {
    const isSteal = q.phase === 'steal' && q.side === side;
    const enabled = !final && (q.phase === 'open' || isSteal);
    const leading = score[side] > score[other(side)];
    return (
      <div className={`team-panel ${isSteal ? 'steal' : ''}`}>
        <div className="row">
          <span className="pill pill-gold">Team {side.toUpperCase()}</span>
          {final && winner === side && <span className="pill pill-good" style={{ background: 'var(--good)' }}>Winner</span>}
          {isSteal && <span className="pill pill-live">STEAL</span>}
          <div className="spacer" />
          <button className="btn btn-ghost btn-sm" disabled={final} onClick={() => doAdjust(side)}>
            ± Adjust
          </button>
        </div>
        <div className="tp-name">{teamName(t, teams[side])}</div>
        <div className="tp-score" style={{ color: leading ? 'var(--amber-400)' : 'var(--cream-50)' }}>{score[side]}</div>
        <div className="tp-buttons">
          <button className="btn btn-good" disabled={!enabled} onClick={() => act(side, true)}>
            {isSteal ? `Steal ✓ +${rules.stealCorrect}` : `Correct +${rules.correct}`}
            <kbd>{KEYS[side].correct.toUpperCase()}</kbd>
          </button>
          <button className="btn btn-bad" disabled={!enabled} onClick={() => act(side, false)}>
            {isSteal ? `Steal ✗ ${m.suddenDeath && !rules.suddenDeathPenalty ? '' : rules.stealWrong}` : `Wrong ${m.suddenDeath && !rules.suddenDeathPenalty ? '' : rules.wrong}`}
            <kbd>{KEYS[side].wrong.toUpperCase()}</kbd>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <section className="card-maroon scorer-bar">
        <span className="pill pill-gold">{m.label}</span>
        <span style={{ fontWeight: 600 }}>
          {stage.name} · {m.group ? `Group ${m.group}` : m.roundName}
        </span>
        {m.status === 'live' && <span className="pill pill-live">● Live</span>}
        {final && <span className="pill pill-done">Final</span>}
        {m.suddenDeath && <span className="pill pill-live">Sudden death</span>}
        <div className="spacer" />
        <button className={`btn btn-sm ${onScreen ? 'btn-gold' : ''}`} onClick={() => setDisplay({ view: 'scoreboard', matchId: m.id })}>
          {onScreen ? 'On big screen ✓' : 'Show on big screen'}
        </button>
      </section>

      <section className="card-maroon scorer-bar">
        <div className="qbox">
          <button className="btn btn-ghost btn-icon btn-sm" disabled={final} onClick={() => updateMatch(m.id, matchOps.prevQuestion)}>◀</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', opacity: 0.8 }}>{m.suddenDeath ? 'SUDDEN DEATH' : 'QUESTION'}</div>
            <div className="big">
              {m.currentQ}
              {qLimit && !m.suddenDeath ? <span style={{ fontSize: '1rem', opacity: 0.6 }}> / {qLimit}</span> : null}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" disabled={final} onClick={next}>▶</button>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          {final ? (
            <div className="banner banner-gold">
              Match final · {winner ? `${teamName(t, teams[winner])} wins` : 'Draw'}
            </div>
          ) : sdDecided && winner ? (
            <div className="banner banner-gold">{teamName(t, teams[winner])} wins in sudden death. Finalize the match.</div>
          ) : q.phase === 'steal' ? (
            <div className="banner banner-gold">STEAL open for {teamName(t, teams[q.side], true)}. Score it or press N for no steal.</div>
          ) : q.phase === 'closed' ? (
            <div className="banner" style={{ background: 'rgba(0,0,0,0.25)' }}>Question closed. Press N for the next question.</div>
          ) : overLimit ? (
            <div className="banner banner-gold">All {qLimit} questions played. End the match when ready.</div>
          ) : (
            <div className="banner" style={{ background: 'rgba(0,0,0,0.25)' }}>Waiting for a buzz…</div>
          )}
        </div>
        {rules.matchTimerSec ? (
          <div className="qbox">
            <div className="big" style={{ color: remaining != null && remaining <= 30 ? 'var(--bad)' : undefined, minWidth: 90, textAlign: 'center' }}>
              {formatClock(remaining ?? rules.matchTimerSec)}
            </div>
            <button className="btn btn-sm" onClick={toggleTimer}>{m.timer?.startedAt != null ? 'Pause' : 'Start'}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => updateMatch(m.id, (x) => timerOps.reset(x, rules.matchTimerSec!))}>Reset</button>
          </div>
        ) : null}
      </section>

      <div className="scorer">
        {panel('a')}
        {panel('b')}
      </div>

      <section className="card-maroon scorer-bar">
        <button className="btn" disabled={!m.events.length || final} onClick={undo}>↶ Undo last <kbd>Z</kbd></button>
        <button className="btn btn-ghost" disabled={final} onClick={next}>Next question <kbd>N</kbd></button>
        <label className="row" style={{ gap: 6, fontSize: '0.9rem' }}>
          <input type="checkbox" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} />
          Auto-advance when a question closes
        </label>
        <div className="spacer" />
        {!final && m.suddenDeath && sdNeeded && (
          <button className="btn btn-ghost btn-sm" onClick={() => updateMatch(m.id, matchOps.endSuddenDeath)}>Cancel sudden death</button>
        )}
        {!final && (
          <button className="btn btn-gold" onClick={finalize}>
            {sdNeeded ? 'End regulation → Sudden death' : 'End & finalize match'}
          </button>
        )}
        {final && (
          <button className="btn btn-ghost" onClick={() => window.confirm('Reopen this match for corrections? Standings and bracket will update.') && updateMatch(m.id, matchOps.reopen)}>
            Reopen match
          </button>
        )}
        <button className="btn btn-ghost btn-sm"
          onClick={() => window.confirm('Reset this match? All answers will be erased.') && updateMatch(m.id, matchOps.reset)}>
          Reset
        </button>
      </section>

      <section className="card">
        <div className="row">
          <h3 style={{ margin: 0 }}>Answer log</h3>
          <span className="muted">{m.events.length} entries</span>
          <div className="spacer" />
          <button
            className="btn btn-ghost btn-sm"
            disabled={m.events.length === 0}
            onClick={() =>
              downloadText(`${safeFileName(`${t.name}_${m.label ?? 'match'}_log`)}.csv`, matchLogCsv(t, m), 'text/csv;charset=utf-8')
            }
          >
            ⬇ Export CSV
          </button>
        </div>
        <div className="log" style={{ marginTop: 10 }}>
          {m.events.length === 0 && <div className="muted">No answers yet.</div>}
          {[...m.events].reverse().map((e) => (
            <div key={e.id} className="log-item">
              <span className="pill pill-soft" style={{ minWidth: 54, justifyContent: 'center' }}>
                {e.sd ? 'SD' : 'Q'}{e.q}
              </span>
              <b style={{ minWidth: 90 }}>{teamName(t, teams[e.side], true)}</b>
              <span style={{ flex: 1 }}>
                {KIND_LABEL[e.kind]}
                {e.note ? ` · ${e.note}` : ''}
              </span>
              <b style={{ color: e.delta > 0 ? 'var(--good)' : e.delta < 0 ? 'var(--bad)' : 'var(--ink-soft)' }}>
                {e.delta > 0 ? `+${e.delta}` : e.delta}
              </b>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
