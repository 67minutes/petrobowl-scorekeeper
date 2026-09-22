import { useState } from 'react';
import { useStore } from '../../store/store';
import type { EntrantRef, Stage, Tournament } from '../../engine/types';
import { runDraw } from '../../engine/draw';
import { generateStage } from '../../engine/generate';
import { describeRef, teamName } from '../../engine/resolve';
import { randomSeed } from '../../engine/util';

export function DrawPage() {
  const t = useStore((s) => s.tournament);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="title-font">
            Draw &amp; <span className="gold-text">fixtures</span>
          </h1>
          <p>Randomize groups (reveal them live on the big screen), then generate the fixtures for each stage.</p>
        </div>
      </div>
      {t.stages.map((s, i) => (
        <StageDraw key={s.id} stage={s} index={i} />
      ))}
      {t.stages.length === 0 && <div className="card">No stages. Set up a format first.</div>}
    </div>
  );
}

function useGenerate() {
  const t = useStore((s) => s.tournament);
  const update = useStore((s) => s.update);
  return (stage: Stage) => {
    const played = t.matches.some((m) => m.stageId === stage.id && (m.events.length || m.status === 'final'));
    if (played && !window.confirm(`Regenerate ${stage.name}? All results in this stage will be lost.`)) return;
    update((x) => generateStage(x, stage.id));
  };
}

function StageDraw({ stage: s, index }: { stage: Stage; index: number }) {
  if (s.type === 'groups' && (s.groups?.length ?? 0) > 1) return <GroupDraw stage={s} />;
  if (s.type === 'knockout') return <KnockoutSetup stage={s} index={index} />;
  return <SimpleStage stage={s} />;
}

function SimpleStage({ stage: s }: { stage: Stage }) {
  const t = useStore((x) => x.tournament);
  const generate = useGenerate();
  const count = s.type === 'swiss' ? s.teamIds?.length ?? 0 : s.groups?.[0]?.teamIds.length ?? 0;
  return (
    <section className="card">
      <div className="row">
        <h2 style={{ margin: 0 }}>{s.name}</h2>
        <span className="pill pill-soft">{s.type === 'swiss' ? `Swiss · ${s.rounds} rounds` : 'Round robin'}</span>
        <span className="muted">{count} teams</span>
        <div className="spacer" />
        <button className="btn btn-gold" disabled={count < 2} onClick={() => generate(s)}>
          {s.generated ? 'Regenerate' : s.type === 'swiss' ? 'Generate round 1' : 'Generate fixtures'}
        </button>
      </div>
      {s.type === 'swiss' && (
        <p className="muted">
          Round 1 pairs teams in list order (Teams tab); later rounds are generated from the Schedule tab once the
          previous round is complete.
        </p>
      )}
      {s.generated && (
        <p className="muted">{t.matches.filter((m) => m.stageId === s.id).length} matches generated. See Schedule.</p>
      )}
    </section>
  );
}

function GroupDraw({ stage: s }: { stage: Stage }) {
  const t = useStore((x) => x.tournament);
  const update = useStore((x) => x.update);
  const setDisplay = useStore((x) => x.setDisplay);
  const generate = useGenerate();
  const [seed, setSeed] = useState(s.draw?.seed ?? randomSeed());
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [showLocks, setShowLocks] = useState(false);
  const opts = s.drawOptions ?? { separateCountries: false, locks: {}, pots: [] };
  const seeded = new Set(opts.pots[0] ?? []);

  const setStage = (fn: (st: Stage) => Stage, history = true) =>
    update((x) => ({ ...x, stages: x.stages.map((st) => (st.id === s.id ? fn(st) : st)) }), { history });
  const setOpts = (patch: Partial<typeof opts>) => setStage((st) => ({ ...st, drawOptions: { ...opts, ...patch } }), false);

  const doDraw = () => {
    if (s.generated && !window.confirm('Fixtures exist for this stage. Redrawing will delete them. Continue?')) return;
    try {
      const res = runDraw(t.teams, s.groups!, seed, opts);
      setError('');
      update((x: Tournament) => ({
        ...x,
        stages: x.stages.map((st) =>
          st.id === s.id ? { ...st, groups: res.groups, draw: { seed, steps: res.steps, revealed: 0 }, generated: false } : st,
        ),
        matches: x.matches.filter((m) => m.stageId !== s.id),
      }));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const swap = (a: string, b: string) =>
    setStage((st) => ({
      ...st,
      generated: false,
      groups: st.groups!.map((g) => ({ ...g, teamIds: g.teamIds.map((id) => (id === a ? b : id === b ? a : id)) })),
    }));

  const moveTo = (id: string, group: string) =>
    setStage((st) => ({
      ...st,
      generated: false,
      groups: st.groups!.map((g) =>
        g.name === group ? { ...g, teamIds: [...g.teamIds.filter((x) => x !== id), id] } : { ...g, teamIds: g.teamIds.filter((x) => x !== id) },
      ),
    }));

  const onChip = (id: string) => {
    if (!picked) return setPicked(id);
    if (picked !== id) swap(picked, id);
    setPicked(null);
  };

  const setRevealed = (n: number) =>
    setStage((st) => (st.draw ? { ...st, draw: { ...st.draw, revealed: Math.max(0, Math.min(n, st.draw.steps.length)) } } : st), false);

  const placed = new Set(s.groups!.flatMap((g) => g.teamIds));
  const unplaced = t.teams.filter((tm) => !placed.has(tm.id));
  const full = s.groups!.every((g) => g.teamIds.length === g.size) && unplaced.length === 0;
  const hasGeneratedMatches = t.matches.some((m) => m.stageId === s.id);
  const draw = s.draw;
  const onScreen = useStore((x) => x.display.view === 'draw' && x.display.stageId === s.id);

  return (
    <section className="card">
      <div className="row">
        <h2 style={{ margin: 0 }}>{s.name}</h2>
        <span className="pill pill-soft">
          {s.groups!.length} groups · {s.groups!.map((g) => g.size).join('/')} · top {s.advance} advance
        </span>
        {hasGeneratedMatches && <span className="pill pill-gold">Fixtures generated</span>}
      </div>

      <div className="card-soft" style={{ marginTop: 14 }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field">
            Draw seed (record it for transparency)
            <div className="row" style={{ gap: 6 }}>
              <input className="input" value={seed} onChange={(e) => setSeed(e.target.value)} style={{ width: 170 }} />
              <button className="btn btn-sm" title="New random seed" onClick={() => setSeed(randomSeed())}>
                🎲
              </button>
            </div>
          </label>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={opts.separateCountries} onChange={(e) => setOpts({ separateCountries: e.target.checked })} />
            Spread same-country teams
          </label>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowLocks(!showLocks)}>
            {showLocks ? 'Hide' : 'Seeds & locks…'}
          </button>
          <div className="spacer" />
          <button className="btn btn-gold" onClick={doDraw}>
            Run draw
          </button>
        </div>
        {showLocks && (
          <div style={{ marginTop: 12 }}>
            <p className="muted" style={{ margin: '0 0 8px' }}>
              <b>Seeded</b> teams are drawn first, one per group. <b>Lock</b> forces a team into a group (e.g. host placement).
            </p>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 6 }}>
              {t.teams.map((tm) => (
                <div key={tm.id} className="row" style={{ gap: 8 }}>
                  <label className="row" style={{ gap: 4, width: 90 }}>
                    <input
                      type="checkbox"
                      checked={seeded.has(tm.id)}
                      onChange={(e) => {
                        const next = new Set(seeded);
                        if (e.target.checked) next.add(tm.id);
                        else next.delete(tm.id);
                        setOpts({ pots: next.size ? [[...next]] : [] });
                      }}
                    />
                    Seeded
                  </label>
                  <span style={{ flex: 1, fontWeight: 600 }}>{tm.shortName}</span>
                  <select
                    className="select"
                    value={opts.locks[tm.id] ?? ''}
                    onChange={(e) => {
                      const locks = { ...opts.locks };
                      if (e.target.value) locks[tm.id] = e.target.value;
                      else delete locks[tm.id];
                      setOpts({ locks });
                    }}
                  >
                    <option value="">Any group</option>
                    {s.groups!.map((g) => (
                      <option key={g.name} value={g.name}>
                        Lock to {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <div className="banner banner-red" style={{ marginTop: 10 }}>{error}</div>}
      </div>

      {draw && (
        <div className="card-soft" style={{ marginTop: 12 }}>
          <div className="row">
            <b>Big-screen reveal</b>
            <span className="muted">
              {draw.revealed} / {draw.steps.length} revealed · seed <code>{draw.seed}</code>
            </span>
            <div className="spacer" />
            <button className={`btn btn-sm ${onScreen ? 'btn-gold' : ''}`} onClick={() => setDisplay({ view: 'draw', stageId: s.id })}>
              {onScreen ? 'On big screen ✓' : 'Show on big screen'}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setRevealed(0)}>Reset</button>
            <button className="btn btn-sm btn-good" disabled={draw.revealed >= draw.steps.length}
              onClick={() => setRevealed(draw.revealed + 1)}>
              Reveal next ▶
            </button>
            <button className="btn btn-sm" onClick={() => setRevealed(draw.steps.length)}>Reveal all</button>
          </div>
          {draw.revealed < draw.steps.length && (
            <div className="muted" style={{ marginTop: 6 }}>
              Next: <b>{teamName(t, draw.steps[draw.revealed].teamId)}</b> → Group {draw.steps[draw.revealed].group}
            </div>
          )}
        </div>
      )}

      <div className="group-grid" style={{ marginTop: 16 }}>
        {s.groups!.map((g) => (
          <div key={g.name} className="card-soft group-card">
            <h3>
              <span className="pill pill-gold">Group {g.name}</span>
              <span className="muted">
                {g.teamIds.length}/{g.size}
              </span>
            </h3>
            {g.teamIds.map((id) => (
              <div key={id} className="team-chip"
                style={{ cursor: 'pointer', outline: picked === id ? '2px solid var(--gold-500)' : undefined }}
                onClick={() => onChip(id)} title="Click two teams to swap them">
                <span className="short">{teamName(t, id, true)}</span>
                <span className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {teamName(t, id)}
                </span>
              </div>
            ))}
            {unplaced.length > 0 && g.teamIds.length < g.size && (
              <select className="select" value="" onChange={(e) => e.target.value && moveTo(e.target.value, g.name)} style={{ width: '100%' }}>
                <option value="">+ Place a team…</option>
                {unplaced.map((tm) => (
                  <option key={tm.id} value={tm.id}>{tm.shortName} · {tm.name}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
      {picked && <p className="muted">Selected {teamName(t, picked, true)}; click another team to swap, or click it again to cancel.</p>}

      <div className="row" style={{ marginTop: 16 }}>
        <span className="muted">
          {full ? 'All teams placed.' : `${unplaced.length} team(s) not placed yet.`}
        </span>
        <div className="spacer" />
        <button className="btn btn-gold" disabled={!full} onClick={() => generate(s)}>
          {hasGeneratedMatches ? 'Regenerate fixtures' : 'Confirm groups & generate fixtures'}
        </button>
      </div>
    </section>
  );
}

function KnockoutSetup({ stage: s, index }: { stage: Stage; index: number }) {
  const t = useStore((x) => x.tournament);
  const update = useStore((x) => x.update);
  const generate = useGenerate();
  const slots = s.slots ?? [];
  const fedByStage = index > 0;

  const setSlot = (i: number, ref: EntrantRef) =>
    update((x) => ({
      ...x,
      stages: x.stages.map((st) => (st.id === s.id ? { ...st, slots: slots.map((r, j) => (j === i ? ref : r)) } : st)),
    }));

  const pairs: [number, number][] = [];
  for (let i = 0; i < slots.length; i += 2) pairs.push([i, i + 1]);

  const slotEditor = (i: number) => {
    const ref = slots[i];
    if (fedByStage) return <span style={{ fontWeight: 600 }}>{describeRef(t, ref)}</span>;
    const value = ref.kind === 'team' ? ref.teamId : ref.kind;
    return (
      <select className="select" value={value}
        onChange={(e) => setSlot(i, e.target.value === 'bye' ? { kind: 'bye' } : e.target.value === 'tbd' ? { kind: 'tbd' } : { kind: 'team', teamId: e.target.value })}>
        <option value="tbd">TBD</option>
        <option value="bye">BYE</option>
        {t.teams.map((tm) => (
          <option key={tm.id} value={tm.id}>{tm.shortName} · {tm.name}</option>
        ))}
      </select>
    );
  };

  return (
    <section className="card">
      <div className="row">
        <h2 style={{ margin: 0 }}>{s.name}</h2>
        <span className="pill pill-soft">
          Knockout · {slots.length} slots{s.thirdPlace ? ' · 3rd-place match' : ''}
        </span>
        <div className="spacer" />
        <button className="btn btn-gold" onClick={() => generate(s)} disabled={slots.length < 2}>
          {s.generated ? 'Regenerate bracket' : 'Generate bracket'}
        </button>
      </div>
      <p className="muted">
        {fedByStage
          ? `Qualifiers from ${t.stages[index - 1].name} fill in automatically once each group is complete. You can generate the bracket now.`
          : 'Seeded 1 v N with byes for the top seeds. Change any slot below.'}
      </p>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 10 }}>
        {pairs.map(([x, y], k) => (
          <div key={k} className="card-soft">
            <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>Match {k + 1}</div>
            <div className="row" style={{ gap: 8 }}>{slotEditor(x)}</div>
            <div className="muted" style={{ margin: '4px 0' }}>vs</div>
            <div className="row" style={{ gap: 8 }}>{slotEditor(y)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
