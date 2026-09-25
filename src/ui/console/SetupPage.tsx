import { useRef, useState } from 'react';
import { useStore } from '../../store/store';
import type { Stage, Tiebreak, Tournament } from '../../engine/types';
import { apac2026 } from '../../engine/presets/apac2026';
import { TEMPLATES, applyTemplate, blankTournament, type TemplateId } from '../../engine/presets';
import { autoSlots } from '../../engine/bracket';
import { groupLetter } from '../../engine/util';

const TB_LABEL: Record<Tiebreak, string> = {
  h2h: 'Head-to-head',
  diff: 'Point difference',
  scored: 'Points scored',
  coin: 'Coin flip / drawing lots',
};

/** Re-derive a knockout stage's slots from the stage before it. */
export function refreshKnockout(t: Tournament, koId: string): Tournament {
  const idx = t.stages.findIndex((s) => s.id === koId);
  const ko = t.stages[idx];
  const slots = autoSlots(t, koId);
  if (!ko || ko.type !== 'knockout' || !slots) return t;
  return {
    ...t,
    stages: t.stages.map((s) => (s.id === koId ? { ...s, slots, generated: false } : s)),
    matches: t.matches.filter((m) => m.stageId !== koId),
  };
}

function refreshAllKnockouts(t: Tournament): Tournament {
  return t.stages.reduce((acc, s, i) => (s.type === 'knockout' && i > 0 ? refreshKnockout(acc, s.id) : acc), t);
}

export function SetupPage({ onNext }: { onNext: () => void }) {
  const t = useStore((s) => s.tournament);
  const update = useStore((s) => s.update);
  const replace = useStore((s) => s.replace);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [tpl, setTpl] = useState<TemplateId>('groups-ko');
  const [opts, setOpts] = useState({ groupCount: 4, advance: 2, swissRounds: 4, thirdPlace: false });

  const hasResults = t.matches.some((m) => m.events.length > 0 || m.status === 'final');
  const confirmReset = (what: string) =>
    !hasResults || window.confirm(`${what}\n\nThis clears existing fixtures and results. Continue?`);

  const set = (patch: Partial<Tournament>) => update((x) => ({ ...x, ...patch }));
  const setScoring = (patch: Partial<Tournament['scoring']>) => update((x) => ({ ...x, scoring: { ...x.scoring, ...patch } }));
  const setPoints = (patch: Partial<Tournament['points']>) => update((x) => ({ ...x, points: { ...x.points, ...patch } }));

  const updateStage = (id: string, fn: (s: Stage) => Stage, structural = false) => {
    if (structural && !confirmReset('Changing the stage structure.')) return;
    update((x) => {
      let next: Tournament = { ...x, stages: x.stages.map((s) => (s.id === id ? fn(s) : s)) };
      if (structural) {
        next = { ...next, matches: next.matches.filter((m) => m.stageId !== id) };
        next = { ...next, stages: next.stages.map((s) => (s.id === id ? { ...s, generated: false } : s)) };
        next = refreshAllKnockouts(next);
      }
      return next;
    });
  };

  const moveTb = (i: number, dir: -1 | 1) =>
    update((x) => {
      const arr = [...x.tiebreaks];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return x;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...x, tiebreaks: arr };
    });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${t.name.replace(/[^\w-]+/g, '_')}_${new Date().toISOString().slice(0, 16).replace(':', '')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as Tournament;
      if (!Array.isArray(data.teams) || !Array.isArray(data.stages) || !Array.isArray(data.matches)) throw new Error('bad');
      replace({ ...blankTournament(), ...data });
    } catch {
      window.alert('That file is not a valid tournament backup.');
    }
  };

  const loadLogo = (f: File) => {
    const r = new FileReader();
    r.onload = () => set({ logo: String(r.result) });
    r.readAsDataURL(f);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="title-font">
            Tournament <span className="gold-text">setup</span>
          </h1>
          <p>Pick a preset or build a format, set the scoring rules, then add teams.</p>
        </div>
        <div className="spacer" />
        <button className="btn btn-gold" onClick={onNext}>
          Next: Teams →
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))' }}>
        <section className="card">
          <h2>Start from</h2>
          <div className="card-soft" style={{ marginBottom: 14 }}>
            <div className="row">
              <div>
                <b>Petrobowl APAC 2026</b>
                <div className="muted">13 teams · Groups A–C of 3, D of 4 · top 2 → QF, SF, Final · +10 / −5</div>
              </div>
              <div className="spacer" />
              <button
                className="btn btn-gold"
                onClick={() => confirmReset('Load the Petrobowl APAC 2026 preset.') && replace(apac2026())}
              >
                Load preset
              </button>
            </div>
          </div>
          <div className="card-soft">
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <label className="field" style={{ flex: 1, minWidth: 220 }}>
                Custom format (keeps current teams)
                <select className="select" value={tpl} onChange={(e) => setTpl(e.target.value as TemplateId)}>
                  {TEMPLATES.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </label>
              {tpl === 'groups-ko' && (
                <>
                  <label className="field" style={{ width: 90 }}>
                    Groups
                    <input className="input" type="number" min={1} max={16} value={opts.groupCount}
                      onChange={(e) => setOpts({ ...opts, groupCount: +e.target.value || 1 })} />
                  </label>
                  <label className="field" style={{ width: 110 }}>
                    Advance / grp
                    <input className="input" type="number" min={1} max={8} value={opts.advance}
                      onChange={(e) => setOpts({ ...opts, advance: +e.target.value || 1 })} />
                  </label>
                </>
              )}
              {tpl.startsWith('swiss') && (
                <label className="field" style={{ width: 90 }}>
                  Rounds
                  <input className="input" type="number" min={1} max={15} value={opts.swissRounds}
                    onChange={(e) => setOpts({ ...opts, swissRounds: +e.target.value || 1 })} />
                </label>
              )}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <span className="muted">{TEMPLATES.find((x) => x.id === tpl)?.hint}</span>
              <div className="spacer" />
              {tpl !== 'league' && tpl !== 'swiss' && (
                <label className="row" style={{ gap: 6 }}>
                  <input type="checkbox" checked={opts.thirdPlace}
                    onChange={(e) => setOpts({ ...opts, thirdPlace: e.target.checked })} />
                  3rd-place match
                </label>
              )}
              <button
                className="btn"
                disabled={t.teams.length < 2}
                title={t.teams.length < 2 ? 'Add teams first' : ''}
                onClick={() => confirmReset('Apply a new format.') && update((x) => applyTemplate(x, tpl, opts))}
              >
                Apply format
              </button>
            </div>
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-ghost btn-sm"
              onClick={() => window.confirm('Start a blank tournament? Current data will be replaced (export a backup first).') && replace(blankTournament())}>
              New blank tournament
            </button>
          </div>
        </section>

        <section className="card">
          <h2>Details</h2>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label className="field">
              Tournament name
              <input className="input" value={t.name} onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label className="field">
              Subtitle
              <input className="input" value={t.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
            </label>
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <div className="field" style={{ flex: 1 }}>
              Logo (SPE ITB SC lockup, PNG with transparency works best)
              <div className="row">
                {t.logo ? (
                  <img src={t.logo} alt="" style={{ height: 44, background: 'var(--maroon-700)', borderRadius: 8, padding: 4 }} />
                ) : (
                  <span className="muted">Using built-in text lockup</span>
                )}
                <button className="btn btn-sm" onClick={() => logoRef.current?.click()}>Upload…</button>
                {t.logo && <button className="btn btn-ghost btn-sm" onClick={() => set({ logo: undefined })}>Remove</button>}
              </div>
            </div>
            <input ref={logoRef} type="file" accept="image/*" hidden
              onChange={(e) => e.target.files?.[0] && loadLogo(e.target.files[0])} />
          </div>
          <h3 style={{ marginTop: 20 }}>Backup</h3>
          <div className="row">
            <button className="btn" onClick={exportJson}>Export JSON</button>
            <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>Import JSON…</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden
              onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          </div>
          <p className="muted">Everything autosaves in this browser. Export a backup between sessions or to move to another laptop.</p>
        </section>

        <section className="card">
          <h2>Match scoring</h2>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', alignItems: 'end' }}>
            <NumField label="Correct" value={t.scoring.correct} onChange={(v) => setScoring({ correct: v ?? 0 })} />
            <NumField label="Incorrect" value={t.scoring.wrong} onChange={(v) => setScoring({ wrong: v ?? 0 })} />
            <NumField label="Steal correct" value={t.scoring.stealCorrect} onChange={(v) => setScoring({ stealCorrect: v ?? 0 })} />
            <NumField label="Steal incorrect" value={t.scoring.stealWrong} onChange={(v) => setScoring({ stealWrong: v ?? 0 })} />
            <NumField label="Questions / match" value={t.scoring.questionsPerMatch} optional
              onChange={(v) => setScoring({ questionsPerMatch: v })} />
            <NumField label="Timer (min)" value={t.scoring.matchTimerSec == null ? null : t.scoring.matchTimerSec / 60} optional step={0.5}
              onChange={(v) => setScoring({ matchTimerSec: v == null ? null : Math.round(v * 60) })} />
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={t.scoring.allowSteal} onChange={(e) => setScoring({ allowSteal: e.target.checked })} />
              Allow steals after a wrong answer
            </label>
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={t.scoring.suddenDeathPenalty}
                onChange={(e) => setScoring({ suddenDeathPenalty: e.target.checked })} />
              Deduct points for wrong answers in sudden death
            </label>
          </div>
          <p className="muted">Knockout ties go to sudden death: the first correct answer wins.</p>
        </section>

        <section className="card">
          <h2>Group points &amp; tiebreakers</h2>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', alignItems: 'end' }}>
            <NumField label="Win" value={t.points.win} onChange={(v) => setPoints({ win: v ?? 0 })} />
            <NumField label="Draw" value={t.points.draw} onChange={(v) => setPoints({ draw: v ?? 0 })} />
            <NumField label="Loss" value={t.points.loss} onChange={(v) => setPoints({ loss: v ?? 0 })} />
          </div>
          <div className="muted" style={{ margin: '14px 0 6px' }}>When teams are level on group points, apply in order:</div>
          {t.tiebreaks.map((tb, i) => (
            <div key={tb} className="team-chip">
              <span className="pill pill-gold">{i + 1}</span>
              {TB_LABEL[tb]}
              <div className="spacer" />
              <button className="btn btn-ghost btn-icon btn-sm" disabled={i === 0} onClick={() => moveTb(i, -1)}>↑</button>
              <button className="btn btn-ghost btn-icon btn-sm" disabled={i === t.tiebreaks.length - 1} onClick={() => moveTb(i, 1)}>↓</button>
            </div>
          ))}
        </section>
      </div>

      <section className="card">
        <h2>Stages</h2>
        {t.stages.length === 0 && <p className="muted">No stages yet. Load the preset or apply a format above.</p>}
        <div className="grid">
          {t.stages.map((s, i) => (
            <StageEditor key={s.id} stage={s} index={i} update={updateStage} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StageEditor({
  stage: s,
  index,
  update,
}: {
  stage: Stage;
  index: number;
  update: (id: string, fn: (s: Stage) => Stage, structural?: boolean) => void;
}) {
  const t = useStore((x) => x.tournament);
  const [sizes, setSizes] = useState((s.groups ?? []).map((g) => g.size).join(', '));
  const typeLabel = { groups: (s.groups?.length ?? 0) > 1 ? 'Groups · round robin' : 'Round robin', knockout: 'Knockout', swiss: 'Swiss' }[s.type];
  const applySizes = () => {
    const arr = sizes.split(/[,\s]+/).map(Number).filter((n) => n > 0);
    if (!arr.length) return;
    update(
      s.id,
      (x) => ({
        ...x,
        groups: arr.map((size, i) => ({ name: arr.length === 1 ? 'League' : groupLetter(i), size, teamIds: [] })),
        draw: undefined,
      }),
      true,
    );
  };
  const total = (s.groups ?? []).reduce((a, g) => a + g.size, 0);

  return (
    <div className="card-soft">
      <div className="row">
        <span className="pill">Stage {index + 1}</span>
        <input className="input" style={{ fontWeight: 700, width: 240 }} value={s.name}
          onChange={(e) => update(s.id, (x) => ({ ...x, name: e.target.value }))} />
        <span className="pill pill-soft">{typeLabel}</span>
        {s.generated && <span className="pill pill-gold">Fixtures generated</span>}
      </div>
      {s.type === 'groups' && (
        <div className="row" style={{ marginTop: 10, alignItems: 'flex-end' }}>
          <label className="field">
            Group sizes (comma separated)
            <div className="row" style={{ gap: 6 }}>
              <input className="input" value={sizes} onChange={(e) => setSizes(e.target.value)} style={{ width: 160 }} />
              <button className="btn btn-sm" onClick={applySizes}>Apply</button>
            </div>
          </label>
          <label className="field" style={{ width: 120 }}>
            Advance per group
            <input className="input" type="number" min={1} value={s.advance ?? 2}
              onChange={(e) => update(s.id, (x) => ({ ...x, advance: Math.max(1, +e.target.value) }), true)} />
          </label>
          <label className="field" style={{ width: 130 }}>
            Legs
            <select className="select" value={s.legs ?? 1}
              onChange={(e) => update(s.id, (x) => ({ ...x, legs: +e.target.value as 1 | 2 }), true)}>
              <option value={1}>Single</option>
              <option value={2}>Double (home &amp; away)</option>
            </select>
          </label>
          <span className={total === t.teams.length ? 'muted' : 'pill pill-live'}>
            {total} slots / {t.teams.length} teams
          </span>
        </div>
      )}
      {s.type === 'knockout' && (
        <div className="row" style={{ marginTop: 10 }}>
          <span className="muted">
            {s.slots?.length ?? 0} bracket slots
            {index > 0 ? ` · fed by ${t.stages[index - 1].name}` : ' · seeded from teams (edit on the Draw tab)'}
          </span>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={!!s.thirdPlace}
              onChange={(e) => update(s.id, (x) => ({ ...x, thirdPlace: e.target.checked }), true)} />
            3rd-place match
          </label>
        </div>
      )}
      {s.type === 'swiss' && (
        <div className="row" style={{ marginTop: 10, alignItems: 'flex-end' }}>
          <label className="field" style={{ width: 100 }}>
            Rounds
            <input className="input" type="number" min={1} value={s.rounds ?? 4}
              onChange={(e) => update(s.id, (x) => ({ ...x, rounds: Math.max(1, +e.target.value) }))} />
          </label>
          <span className="muted">{s.teamIds?.length ?? 0} teams · pairs by record, no rematches, bye to lowest-ranked</span>
        </div>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  optional,
  step = 1,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  optional?: boolean;
  step?: number;
}) {
  return (
    <label className="field">
      {label}
      <input
        className="input"
        type="number"
        step={step}
        value={value ?? ''}
        placeholder={optional ? 'off' : ''}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') onChange(optional ? null : 0);
          else onChange(Number(raw));
        }}
      />
    </label>
  );
}
