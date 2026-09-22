import { useStore } from '../../store/store';
import { Bracket } from '../components/Bracket';

export function BracketPage() {
  const t = useStore((s) => s.tournament);
  const display = useStore((s) => s.display);
  const setDisplay = useStore((s) => s.setDisplay);
  const kos = t.stages.filter((s) => s.type === 'knockout');
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="title-font">
            <span className="gold-text">Bracket</span>
          </h1>
          <p>Fills in automatically as groups finish and matches are finalized.</p>
        </div>
      </div>
      {kos.length === 0 && <div className="card">This format has no knockout stage.</div>}
      {kos.map((s) => {
        const on = display.view === 'bracket' && display.stageId === s.id;
        return (
          <section key={s.id} className="card">
            <div className="row" style={{ marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>{s.name}</h2>
              <div className="spacer" />
              <button className={`btn btn-sm ${on ? 'btn-gold' : ''}`} onClick={() => setDisplay({ view: 'bracket', stageId: s.id })}>
                {on ? 'On big screen ✓' : 'Show on big screen'}
              </button>
            </div>
            <Bracket t={t} stage={s} />
          </section>
        );
      })}
    </div>
  );
}
