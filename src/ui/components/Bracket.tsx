import type { Match, Stage, Tournament } from '../../engine/types';
import { entrantLabel, isByeMatch } from '../../engine/resolve';
import { matchScore, matchWinner } from '../../engine/scoring';
import { stageMatches } from '../../engine/standings';
import './bracket.css';

function MatchBox({ t, m, stage, big }: { t: Tournament; m: Match; stage: Stage; big: boolean }) {
  const s = matchScore(m);
  const w = matchWinner(m, stage.type);
  const started = m.status !== 'scheduled';
  const sd = m.events.some((e) => e.sd);
  const row = (side: 'a' | 'b') => (
    <div className={`bx-row ${w === side ? 'win' : w ? 'lose' : ''}`}>
      <span className="bx-name">{entrantLabel(t, m[side], big)}</span>
      <span className="bx-score">{isByeMatch(m) ? '' : started ? s[side] : ''}</span>
    </div>
  );
  return (
    <div className={`bx ${m.status === 'live' ? 'live' : ''}`}>
      <div className="bx-label">
        {m.label}
        {m.status === 'live' && <span className="bx-live">● LIVE</span>}
        {sd && m.status === 'final' && <span className="bx-sd">SD</span>}
      </div>
      {row('a')}
      {row('b')}
    </div>
  );
}

export function Bracket({ t, stage, big = false }: { t: Tournament; stage: Stage; big?: boolean }) {
  const ms = stageMatches(t, stage);
  if (!ms.length) return <p className="muted">Bracket not generated yet.</p>;
  const main = ms.filter((m) => !m.isThirdPlace);
  const third = ms.find((m) => m.isThirdPlace);
  const rounds = [...new Set(main.map((m) => m.round))].sort((a, b) => a - b);
  return (
    <div className={`bracket ${big ? 'bracket-big' : ''}`}>
      {rounds.map((r) => {
        const rm = main.filter((m) => m.round === r);
        return (
          <div key={r} className="br-col">
            <div className="br-head">{rm[0]?.roundName}</div>
            <div className="br-matches">
              {rm.map((m) => (
                <div key={m.id} className="br-slot">
                  <MatchBox t={t} m={m} stage={stage} big={big} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {third && (
        <div className="br-col">
          <div className="br-head">Third Place</div>
          <div className="br-matches">
            <div className="br-slot">
              <MatchBox t={t} m={third} stage={stage} big={big} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
