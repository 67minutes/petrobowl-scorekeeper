import type { Stage, Tournament } from '../../engine/types';
import { groupStandings } from '../../engine/standings';
import { teamName } from '../../engine/resolve';

const TB_SHORT = { h2h: 'H2H', diff: 'Diff', scored: 'PF', coin: 'Lots' } as const;

export function StandingsTable({
  t,
  stage,
  group,
  big = false,
}: {
  t: Tournament;
  stage: Stage;
  group?: string;
  big?: boolean;
}) {
  const table = groupStandings(t, stage, group);
  const advance = stage.advance ?? 0;
  return (
    <table className={`table ${big ? 'table-big' : ''}`}>
      <thead>
        <tr>
          <th className="num">#</th>
          <th>Team</th>
          <th className="num">P</th>
          <th className="num">W</th>
          <th className="num">D</th>
          <th className="num">L</th>
          <th className="num">PF</th>
          <th className="num">PA</th>
          <th className="num">+/−</th>
          <th className="num">Pts</th>
        </tr>
      </thead>
      <tbody>
        {table.rows.map((r) => (
          <tr key={r.teamId} className={r.rank <= advance ? 'qualify' : ''}>
            <td className="num">{r.rank}</td>
            <td style={{ fontWeight: 600 }}>
              {big ? teamName(t, r.teamId, true) : teamName(t, r.teamId)}
              {table.complete && r.unresolvedTie && <span className="pill pill-live" style={{ marginLeft: 8 }}>tie</span>}
              {table.complete && r.decidedBy && r.decidedBy !== 'h2h' && !big && (
                <span className="muted" style={{ marginLeft: 8, fontSize: '0.75em' }}>({TB_SHORT[r.decidedBy]})</span>
              )}
              {r.decidedBy === 'h2h' && !big && table.complete && (
                <span className="muted" style={{ marginLeft: 8, fontSize: '0.75em' }}>(H2H)</span>
              )}
            </td>
            <td className="num">{r.played}</td>
            <td className="num">{r.won}</td>
            <td className="num">{r.drawn}</td>
            <td className="num">{r.lost}</td>
            <td className="num">{r.pf}</td>
            <td className="num">{r.pa}</td>
            <td className="num">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
            <td className="num" style={{ fontWeight: 800 }}>{r.pts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
