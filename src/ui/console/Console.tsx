import { useEffect, useState } from 'react';
import { useStore, type DisplayView } from '../../store/store';
import { Logo, Petals } from '../components/Brand';
import { openDisplayWindow } from '../hooks';
import { SetupPage } from './SetupPage';
import { TeamsPage } from './TeamsPage';
import { DrawPage } from './DrawPage';
import { SchedulePage } from './SchedulePage';
import { ScorerPage } from './ScorerPage';
import { StandingsPage } from './StandingsPage';
import { BracketPage } from './BracketPage';
import './console.css';

const TABS = [
  { id: 'setup', label: 'Setup' },
  { id: 'teams', label: 'Teams' },
  { id: 'draw', label: 'Draw' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'scorer', label: 'Scorer' },
  { id: 'standings', label: 'Standings' },
  { id: 'bracket', label: 'Bracket' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const VIEW_LABEL: Record<DisplayView, string> = {
  title: 'Title slide',
  scoreboard: 'Scoreboard',
  standings: 'Standings',
  bracket: 'Bracket',
  draw: 'Draw reveal',
  schedule: 'Schedule',
};

export function Console() {
  const [tab, setTab] = useState<TabId>(() => (localStorage.getItem('pb-tab') as TabId) || 'setup');
  const t = useStore((s) => s.tournament);
  const display = useStore((s) => s.display);
  const activeMatchId = useStore((s) => s.activeMatchId);
  const setDisplay = useStore((s) => s.setDisplay);
  const undo = useStore((s) => s.undo);
  const canUndo = useStore((s) => s.history.length > 0);

  useEffect(() => {
    try {
      localStorage.setItem('pb-tab', tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  const goScorer = () => setTab('scorer');

  return (
    <div className="console bg-maroon">
      <Petals dense opacity={0.55} />
      <header className="console-header">
        <Logo src={t.logo} size={0.8} />
        <div className="console-title">
          <div className="title-font">{t.name}</div>
          {t.subtitle && <div className="console-subtitle">{t.subtitle}</div>}
        </div>
        <div className="spacer" />
        <div className="screen-control">
          <span className="screen-label">Big screen</span>
          <select
            className="select"
            value={display.view}
            onChange={(e) => {
              const view = e.target.value as DisplayView;
              setDisplay(view === 'scoreboard' ? { view, matchId: activeMatchId ?? display.matchId } : { ...display, view });
            }}
          >
            {Object.entries(VIEW_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button className="btn btn-gold" onClick={openDisplayWindow}>
            Open big screen ↗
          </button>
        </div>
        <button className="btn btn-ghost btn-sm" disabled={!canUndo} onClick={undo} title="Undo last setup change">
          ↶ Undo
        </button>
      </header>
      <nav className="console-tabs">
        {TABS.map((x) => (
          <button key={x.id} className={`tab ${tab === x.id ? 'active' : ''}`} onClick={() => setTab(x.id)}>
            {x.label}
          </button>
        ))}
      </nav>
      <main className="console-main">
        {tab === 'setup' && <SetupPage onNext={() => setTab('teams')} />}
        {tab === 'teams' && <TeamsPage />}
        {tab === 'draw' && <DrawPage />}
        {tab === 'schedule' && <SchedulePage onOpen={goScorer} />}
        {tab === 'scorer' && <ScorerPage />}
        {tab === 'standings' && <StandingsPage />}
        {tab === 'bracket' && <BracketPage />}
      </main>
    </div>
  );
}
