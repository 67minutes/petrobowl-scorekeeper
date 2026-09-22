import { useStore } from '../../store/store';
import type { Stage } from '../../engine/types';
import { groupStandings, tieKey, unresolvedTeams } from '../../engine/standings';
import { teamName } from '../../engine/resolve';
import { StandingsTable } from '../components/StandingsTable';

export function StandingsPage() {
  const t = useStore((s) => s.tournament);
  const tables = t.stages.filter((s) => s.type === 'groups' || s.type === 'swiss');
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="title-font">
            <span className="gold-text">Standings</span>
          </h1>
          <p>
            Ranked by group points, then {t.tiebreaks.map((x) => ({ h2h: 'head-to-head', diff: 'point difference', scored: 'points scored', coin: 'drawing lots' })[x]).join(' → ')}.
            Gold rows advance.
          </p>
        </div>
      </div>
      {tables.length === 0 && <div className="card">This format has no table stages.</div>}
      {tables.map((s) => (
        <StageTables key={s.id} stage={s} />
      ))}
    </div>
  );
}

function StageTables({ stage: s }: { stage: Stage }) {
  const t = useStore((x) => x.tournament);
  const update = useStore((x) => x.update);
  const display = useStore((x) => x.display);
  const setDisplay = useStore((x) => x.setDisplay);
  const groups = s.type === 'groups' ? (s.groups ?? []).map((g) => g.name) : [undefined];

  const drawLots = (group: string | undefined, ids: string[]) => {
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    const names = shuffled.map((id, i) => `${i + 1}. ${teamName(t, id)}`).join('\n');
    if (!window.confirm(`Drawing of lots result:\n\n${names}\n\nApply this order?`)) return;
    update((x) => ({ ...x, tieOrders: { ...x.tieOrders, [tieKey(s.id, group)]: shuffled } }));
  };

  const onScreen = (g?: string) => display.view === 'standings' && display.stageId === s.id && display.group === g;

  return (
    <section className="card">
      <div className="row">
        <h2 style={{ margin: 0 }}>{s.name}</h2>
        <div className="spacer" />
        <button className={`btn btn-sm ${onScreen(undefined) ? 'btn-gold' : ''}`}
          onClick={() => setDisplay({ view: 'standings', stageId: s.id })}>
          {onScreen(undefined) ? 'All on big screen ✓' : 'Show all on big screen'}
        </button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(520px, 100%), 1fr))', marginTop: 12 }}>
        {groups.map((g) => {
          const table = groupStandings(t, s, g);
          const tied = table.complete ? unresolvedTeams(table) : [];
          return (
            <div key={g ?? 'all'} className="card-soft">
              <div className="row" style={{ marginBottom: 6 }}>
                {g && <span className="pill pill-gold">{g === 'League' ? 'League' : `Group ${g}`}</span>}
                <span className="muted">{table.complete ? 'Complete' : 'In progress'}</span>
                <div className="spacer" />
                {g && (
                  <button className={`btn btn-sm ${onScreen(g) ? 'btn-gold' : 'btn-ghost'}`}
                    onClick={() => setDisplay({ view: 'standings', stageId: s.id, group: g })}>
                    {onScreen(g) ? 'On screen ✓' : 'Big screen'}
                  </button>
                )}
              </div>
              <StandingsTable t={t} stage={s} group={g} />
              {tied.length > 0 && (
                <div className="banner banner-red row" style={{ marginTop: 8 }}>
                  Unbreakable tie: {tied.map((id) => teamName(t, id, true)).join(', ')}
                  <div className="spacer" />
                  <button className="btn btn-sm btn-gold" onClick={() => drawLots(g, tied)}>Draw lots</button>
                </div>
              )}
              {t.tieOrders[tieKey(s.id, g)] && (
                <div className="row" style={{ marginTop: 6 }}>
                  <span className="muted">Lots drawn: {t.tieOrders[tieKey(s.id, g)].map((id) => teamName(t, id, true)).join(' › ')}</span>
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => update((x) => { const o = { ...x.tieOrders }; delete o[tieKey(s.id, g)]; return { ...x, tieOrders: o }; })}>
                    Clear
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
