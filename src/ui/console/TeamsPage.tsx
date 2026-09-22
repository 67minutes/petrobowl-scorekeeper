import { useState } from 'react';
import { useStore } from '../../store/store';
import type { Team, Tournament } from '../../engine/types';
import { makeTeams } from '../../engine/presets';
import { seededSlots } from '../../engine/formats/knockout';

/** Keep team-fed stages (league, swiss, first-stage knockout) in step with the team list. */
function syncStages(t: Tournament): Tournament {
  const ids = t.teams.map((x) => x.id);
  const stages = t.stages.map((s, i) => {
    if (s.generated) return s;
    if (s.type === 'swiss') return { ...s, teamIds: ids };
    if (s.type === 'groups' && s.groups?.length === 1 && i === 0)
      return { ...s, groups: [{ ...s.groups[0], size: ids.length, teamIds: ids }] };
    if (s.type === 'knockout' && i === 0) return { ...s, slots: seededSlots(ids.map((teamId) => ({ kind: 'team' as const, teamId }))) };
    if (s.type === 'groups') {
      // drop deleted teams from any draw
      return { ...s, groups: s.groups?.map((g) => ({ ...g, teamIds: g.teamIds.filter((id) => ids.includes(id)) })) };
    }
    return s;
  });
  return { ...t, stages };
}

export function TeamsPage() {
  const t = useStore((s) => s.tournament);
  const update = useStore((s) => s.update);
  const [paste, setPaste] = useState('');
  const locked = t.stages.some((s) => s.generated);

  const setTeam = (id: string, patch: Partial<Team>) =>
    update((x) => ({ ...x, teams: x.teams.map((tm) => (tm.id === id ? { ...tm, ...patch } : tm)) }), { history: false });

  const remove = (id: string) => {
    if (locked && !window.confirm('Fixtures already exist. Removing a team can break them. Remove anyway?')) return;
    update((x) => syncStages({ ...x, teams: x.teams.filter((tm) => tm.id !== id) }));
  };

  const addRows = (text: string) => {
    const rows = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [name, shortName, country] = l.split(/\t|;|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c?.trim().replace(/^"|"$/g, ''));
        return { name, shortName, country };
      })
      .filter((r) => r.name);
    if (!rows.length) return;
    update((x) => syncStages({ ...x, teams: [...x.teams, ...makeTeams(rows)] }));
    setPaste('');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="title-font">
            Teams <span className="gold-text">({t.teams.length})</span>
          </h1>
          <p>Short names are shown on the big screen. Country is used to keep teams apart in the draw.</p>
        </div>
      </div>
      {locked && (
        <div className="banner banner-gold">Fixtures are generated. Name edits are safe; adding or removing teams is not.</div>
      )}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(min(300px, 100%), 1fr)', alignItems: 'start' }}>
        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Full name</th>
                <th style={{ width: 150 }}>Short name</th>
                <th style={{ width: 150 }}>Country</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {t.teams.map((tm, i) => (
                <tr key={tm.id}>
                  <td className="muted">{i + 1}</td>
                  <td>
                    <input className="input" style={{ width: '100%' }} value={tm.name}
                      onChange={(e) => setTeam(tm.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input className="input" style={{ width: '100%' }} value={tm.shortName}
                      onChange={(e) => setTeam(tm.id, { shortName: e.target.value })} />
                  </td>
                  <td>
                    <input className="input" style={{ width: '100%' }} value={tm.country ?? ''}
                      onChange={(e) => setTeam(tm.id, { country: e.target.value || undefined })} />
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Remove" onClick={() => remove(tm.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {t.teams.length === 0 && <p className="muted">No teams yet. Paste a list on the right.</p>}
        </section>
        <section className="card">
          <h3>Add teams</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            One team per line. Optional columns separated by tab, comma or semicolon: <br />
            <code>Full name, Short name, Country</code>. You can paste straight from a spreadsheet.
          </p>
          <textarea className="input" rows={10} style={{ width: '100%', resize: 'vertical' }} value={paste}
            placeholder={'Institut Teknologi Bandung, ITB, Indonesia\nUniversiti Teknologi PETRONAS, UTP, Malaysia'}
            onChange={(e) => setPaste(e.target.value)} />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-gold" onClick={() => addRows(paste)} disabled={!paste.trim()}>
              Add teams
            </button>
            <button className="btn btn-ghost" onClick={() => addRows(`Team ${t.teams.length + 1}`)}>
              + One blank team
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
