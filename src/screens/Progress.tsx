import { useEffect, useMemo, useState } from 'react';
import { useStore, liveSessions } from '../lib/store';
import { useNav } from '../nav';
import { getExercise, MUSCLES } from '../data/exercises';
import { addDays, bestE1rm, e1rm, findPRs, fmtDate, fmtDuration, fmtShort, historyFor, mondayOf, muscleSets, sessionSets, sessionVolume, todayStr, WEEKLY_SETS, workSets } from '../lib/calc';
import { BarChart, LineChart } from '../components/charts';
import { Icon, NumInput, Seg, TopBar, bigFmt, kgFmt, toast } from '../components/ui';
import { ExImg } from '../components/ExImg';
import { stravaStatus, sendSessionToStrava } from '../lib/strava';
import type { Session } from '../types';

type PTab = 'overview' | 'exercises' | 'body';

export function ProgressScreen() {
  const [tab, setTab] = useState<PTab>('overview');
  return (
    <div className="screen">
      <h1 className="title">Postępy</h1>
      <div className="mt12"><Seg value={tab} onChange={setTab} options={[{ v: 'overview', l: 'Przegląd' }, { v: 'exercises', l: 'Ćwiczenia' }, { v: 'body', l: 'Ciało' }]} /></div>
      {tab === 'overview' && <Overview />}
      {tab === 'exercises' && <ExerciseList />}
      {tab === 'body' && <Body />}
    </div>
  );
}

function Overview() {
  const data = useStore((s) => s.data);
  const { push } = useNav();
  const sessions = liveSessions(data);
  const mon = mondayOf(todayStr());
  const [metric, setMetric] = useState<'vol' | 'sets' | 'n'>('vol');
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(mon, -7 * (11 - i)));
  const bars = weeks.map((w) => {
    const ss = sessions.filter((s) => s.date >= w && s.date < addDays(w, 7));
    return { label: fmtShort(w), value: metric === 'vol' ? ss.reduce((a, s) => a + sessionVolume(s), 0) : metric === 'sets' ? ss.reduce((a, s) => a + sessionSets(s), 0) : ss.length };
  });
  const [mWeek, setMWeek] = useState<'this' | 'last'>('this');
  const wk = mWeek === 'this' ? mon : addDays(mon, -7);
  const ms = muscleSets(sessions.filter((s) => s.date >= wk && s.date < addDays(wk, 7)));
  const prs = useMemo(() => {
    const out: { s: Session; pr: ReturnType<typeof findPRs>[0] }[] = [];
    const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 30);
    for (const s of sorted) for (const pr of findPRs(s, sessions)) out.push({ s, pr });
    return out.slice(0, 8);
  }, [sessions]);
  const totalVol = sessions.reduce((a, s) => a + sessionVolume(s), 0);
  const recent = [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 6);

  return (
    <>
      <div className="grid3 mt16">
        <div className="card stat"><b>{sessions.length}</b><span>treningów</span></div>
        <div className="card stat"><b style={{ fontSize: 20 }}>{bigFmt(totalVol)}</b><span>łączna objętość</span></div>
        <div className="card stat"><b>{sessions.reduce((a, s) => a + sessionSets(s), 0)}</b><span>serii</span></div>
      </div>

      <div className="section-h"><h2>Tygodnie</h2></div>
      <div className="card">
        <Seg value={metric} onChange={setMetric} options={[{ v: 'vol', l: 'Objętość' }, { v: 'sets', l: 'Serie' }, { v: 'n', l: 'Treningi' }]} />
        <div className="mt12"><BarChart bars={bars} unit={metric === 'vol' ? 'kg' : metric === 'sets' ? 'serii' : ''} /></div>
      </div>

      <div className="section-h"><h2>Serie na partię</h2><div className="chips"><button className={`chip ${mWeek === 'this' ? 'on' : ''}`} onClick={() => setMWeek('this')}>ten tydz.</button><button className={`chip ${mWeek === 'last' ? 'on' : ''}`} onClick={() => setMWeek('last')}>poprzedni</button></div></div>
      <div className="card">
        <p className="xs muted" style={{ marginBottom: 10 }}>Trudne serie (RIR ≤ 4) w tygodniu. Pasek tła = zakres {WEEKLY_SETS.min}–{WEEKLY_SETS.max} serii, optymalny dla wzrostu mięśni. Ćwiczenia pomocnicze liczą się jako ½ serii.</p>
        {MUSCLES.map((m) => {
          const v = ms[m] ?? 0; const max = 24;
          return (
            <div key={m} className="row" style={{ marginBottom: 8 }}>
              <div className="small" style={{ width: 96, textTransform: 'capitalize' }}>{m}</div>
              <div className="meter grow">
                <div className="zone" style={{ left: `${(WEEKLY_SETS.min / max) * 100}%`, width: `${((WEEKLY_SETS.max - WEEKLY_SETS.min) / max) * 100}%` }} />
                <i style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: v >= WEEKLY_SETS.min ? 'var(--accent)' : 'var(--violet)' }} />
              </div>
              <div className="small num bold" style={{ width: 32, textAlign: 'right' }}>{Math.round(v * 10) / 10}</div>
            </div>
          );
        })}
      </div>

      <div className="section-h"><h2>Ostatnie rekordy</h2></div>
      <div className="card">
        {prs.length ? prs.map(({ s, pr }, i) => (
          <button key={i} className="item" style={{ width: '100%', textAlign: 'left' }} onClick={() => push({ name: 'exercise', id: pr.exId })}>
            <ExImg id={pr.exId} size="sq" />
            <div className="grow"><div className="t">{getExercise(pr.exId).name}</div><div className="s">{fmtDate(s.date)} · {pr.type === 'kg' ? 'ciężar' : 'szac. 1RM'}</div></div>
            <div className="bold accent num">{kgFmt(pr.value)} kg</div>
          </button>
        )) : <div className="small muted">Rekordy pojawią się od drugiego treningu danego ćwiczenia.</div>}
      </div>

      <div className="section-h"><h2>Historia</h2></div>
      {recent.length ? recent.map((s) => (
        <button key={s.id} className="list-btn" onClick={() => push({ name: 'session', id: s.id })}>
          <div className="grow"><div className="bold">{s.workoutName}</div><div className="xs muted">{fmtDate(s.date)} · {s.entries.length} ćw. · {bigFmt(sessionVolume(s))}</div></div>
          <Icon name="right" />
        </button>
      )) : <div className="empty">Brak zapisanych treningów</div>}
    </>
  );
}

function ExerciseList() {
  const data = useStore((s) => s.data);
  const { push } = useNav();
  const sessions = liveSessions(data);
  const ids = [...new Set(sessions.flatMap((s) => s.entries.filter((e) => workSets(e).length).map((e) => e.exId)))];
  const rows = ids.map((id) => {
    const h = historyFor(id, sessions);
    const best = Math.max(...h.map((x) => bestE1rm(x.en)));
    const first = bestE1rm(h[h.length - 1].en);
    return { id, n: h.length, best, gain: first ? (best / first - 1) * 100 : 0, last: h[0].s.date };
  }).sort((a, b) => b.last.localeCompare(a.last));
  if (!rows.length) return <div className="empty mt24">Zrób pierwszy trening, a tu pojawi się progres każdego ćwiczenia.</div>;
  return (
    <div className="mt16">
      {rows.map((r) => (
        <button key={r.id} className="list-btn" onClick={() => push({ name: 'exercise', id: r.id })}>
          <ExImg id={r.id} size="sq" />
          <div className="grow">
            <div className="bold" style={{ lineHeight: 1.25 }}>{getExercise(r.id).name}</div>
            <div className="xs muted" style={{ marginTop: 3 }}>{r.n} sesji · ostatnio {fmtShort(r.last)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="bold num">{r.best ? `${kgFmt(r.best)} kg` : '–'}</div>
            {r.gain > 0.5 && <div className="xs accent">▲ {Math.round(r.gain)}%</div>}
          </div>
        </button>
      ))}
    </div>
  );
}

export function ExerciseDetail({ id }: { id: string }) {
  const data = useStore((s) => s.data);
  const { pop, push } = useNav();
  const ex = getExercise(id);
  const [range, setRange] = useState<'1m' | '3m' | '6m' | 'all'>('3m');
  const [metric, setMetric] = useState<'e1rm' | 'kg' | 'vol' | 'reps'>(ex.bodyweight ? 'reps' : 'e1rm');
  const hist = historyFor(id, liveSessions(data)).reverse();
  const from = range === 'all' ? '0000' : addDays(todayStr(), -({ '1m': 30, '3m': 91, '6m': 182 }[range]));
  const pts = hist.filter((h) => h.s.date >= from).map((h) => {
    const ws = workSets(h.en);
    const y = metric === 'e1rm' ? bestE1rm(h.en) : metric === 'kg' ? Math.max(...ws.map((s) => s.kg)) : metric === 'vol' ? ws.reduce((a, s) => a + s.kg * s.reps, 0) : ws.reduce((a, s) => a + s.reps, 0);
    return { x: h.s.startedAt, y, label: fmtShort(h.s.date) };
  });
  const allSets = hist.flatMap((h) => workSets(h.en).map((s) => ({ ...s, date: h.s.date })));
  const repPR = [1, 3, 5, 8, 10, 12].map((r) => {
    const c = allSets.filter((s) => s.reps >= r);
    const best = c.reduce((a, s) => (s.kg > (a?.kg ?? -1) ? s : a), undefined as (typeof allSets)[0] | undefined);
    return { r, best };
  });
  const bestE = allSets.reduce((a, s) => Math.max(a, e1rm(s.kg, s.reps, s.rir)), 0);
  const ys = pts.map((p) => p.y);

  return (
    <div className="screen">
      <TopBar title={ex.name} onBack={pop} />
      <ExImg id={id} size="hero16" animate />
      <div className="small muted mt12 center">{ex.primary.join(', ')}{ex.secondary?.length ? ` · pomocniczo: ${ex.secondary.join(', ')}` : ''} · {ex.equipment}</div>
      <div className="grid3 mt16">
        <div className="card stat"><b style={{ fontSize: 20 }}>{bestE ? kgFmt(bestE) : '–'}</b><span>szac. 1RM (kg)</span></div>
        <div className="card stat"><b style={{ fontSize: 20 }}>{allSets.length ? kgFmt(Math.max(...allSets.map((s) => s.kg))) : '–'}</b><span>maks. ciężar</span></div>
        <div className="card stat"><b style={{ fontSize: 20 }}>{hist.length}</b><span>sesji</span></div>
      </div>
      <div className="card mt12">
        <div className="chips">{(['1m', '3m', '6m', 'all'] as const).map((r) => <button key={r} className={`chip ${range === r ? 'on' : ''}`} onClick={() => setRange(r)}>{r === 'all' ? 'Wszystko' : r.toUpperCase().replace('M', ' mies.')}</button>)}</div>
        <div className="mt12"><Seg value={metric} onChange={setMetric} options={[{ v: 'e1rm', l: '1RM' }, { v: 'kg', l: 'Ciężar' }, { v: 'vol', l: 'Objętość' }, { v: 'reps', l: 'Powt.' }]} /></div>
        <div className="mt12"><LineChart points={pts} unit={metric === 'reps' ? 'powt.' : 'kg'} color={metric === 'vol' ? 'var(--violet)' : 'var(--accent)'} /></div>
        {pts.length > 1 && <div className="grid2 mt8 small"><div className="card2">Min: <b className="num">{kgFmt(Math.min(...ys))}</b></div><div className="card2">Maks: <b className="num">{kgFmt(Math.max(...ys))}</b></div></div>}
      </div>
      <p className="xs muted mt8">Szacowany 1RM liczony wzorem Epleya z uwzględnieniem zapasu (RIR): ciężar × (1 + (powt. + RIR) / 30).</p>

      {!ex.bodyweight && allSets.length > 0 && (
        <>
          <div className="section-h"><h2>Rekordy powtórzeń</h2></div>
          <div className="card">
            <table className="t"><thead><tr><th>Powt.</th><th>Najwięcej kg</th><th>Data</th></tr></thead><tbody>
              {repPR.filter((x) => x.best).map((x) => <tr key={x.r}><td>{x.r}+</td><td className="bold num">{kgFmt(x.best!.kg)} kg × {x.best!.reps}</td><td className="muted">{fmtShort(x.best!.date)}</td></tr>)}
            </tbody></table>
          </div>
        </>
      )}

      <div className="section-h"><h2>Historia</h2></div>
      {[...hist].reverse().map((h) => (
        <button key={h.s.id} className="list-btn" onClick={() => push({ name: 'session', id: h.s.id })}>
          <div className="grow">
            <div className="bold">{fmtDate(h.s.date)}</div>
            <div className="small muted">{workSets(h.en).map((s) => `${kgFmt(s.kg)}×${s.reps}${s.rir != null ? ` @${s.rir}` : ''}`).join('  ·  ')}</div>
          </div>
          <div className="small num">{kgFmt(bestE1rm(h.en))}</div>
        </button>
      ))}
      {!hist.length && <div className="empty">Brak historii dla tego ćwiczenia</div>}
    </div>
  );
}

function StravaSendButton({ id, sent }: { id: string; sent: boolean }) {
  const [st, setSt] = useState<'idle' | 'busy'>('idle');
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => { if (!sent) stravaStatus().then((r) => setConnected(r.connected)).catch(() => setConnected(false)); }, [sent]);
  if (sent) return <div className="card small mt12 row"><span className="accent"><Icon name="check" size={18} /></span> Wysłano do Stravy</div>;
  if (!connected) return null;
  return (
    <button className="btn block mt12" disabled={st === 'busy'} onClick={async () => {
      setSt('busy');
      try { await sendSessionToStrava(id); toast('Wysłano do Stravy ✓'); } catch (e) { toast((e as Error).message); }
      setSt('idle');
    }}><Icon name="activity" size={18} /> {st === 'busy' ? 'Wysyłam…' : 'Wyślij do Stravy'}</button>
  );
}

export function SessionDetail({ id }: { id: string }) {
  const data = useStore((s) => s.data);
  const del = useStore((s) => s.deleteSession);
  const { pop, push } = useNav();
  const s = data.sessions.find((x) => x.id === id);
  if (!s || s.deleted) return <div className="screen"><TopBar onBack={pop} title="Trening usunięty" /></div>;
  const prs = findPRs(s, data.sessions);
  const feel = s.feel ? ['😫', '😕', '😐', '🙂', '💪'][s.feel - 1] : null;
  return (
    <div className="screen">
      <TopBar title={s.workoutName} onBack={pop} />
      <div className="small muted">{fmtDate(s.date)}{s.week ? ` · tydzień programu ${s.week}` : ''}{feel ? ` · ${feel}` : ''}</div>
      <div className="grid3 mt16">
        <div className="card stat"><b style={{ fontSize: 18 }}>{s.finishedAt && s.entries.length ? fmtDuration(s.finishedAt - s.startedAt) : '–'}</b><span>czas</span></div>
        <div className="card stat"><b style={{ fontSize: 18 }}>{bigFmt(sessionVolume(s))}</b><span>objętość</span></div>
        <div className="card stat"><b style={{ fontSize: 18 }}>{sessionSets(s)}</b><span>serie</span></div>
      </div>
      {prs.length > 0 && <div className="card mt12"><div className="bold row"><span className="accent"><Icon name="trophy" size={18} /></span> Rekordy</div>{prs.map((p) => <div key={p.exId} className="small mt8">{getExercise(p.exId).name}: <b className="accent">{kgFmt(p.value)} kg</b> {p.type === 'e1rm' ? '(szac. 1RM)' : ''}</div>)}</div>}
      {s.note && <div className="card mt12 small">{s.note}</div>}
      <div className="stack mt12">
        {s.entries.map((en) => (
          <button key={en.uid} className="card" style={{ textAlign: 'left' }} onClick={() => push({ name: 'exercise', id: en.exId })}>
            <div className="row"><ExImg id={en.exId} size="sm" /><div className="bold grow" style={{ lineHeight: 1.25 }}>{getExercise(en.exId).name}</div><span className="xs muted">1RM ≈ {kgFmt(bestE1rm(en))}</span></div>
            <div className="small muted mt8">{workSets(en).map((x, i) => <span key={i} style={{ marginRight: 12 }}>{kgFmt(x.kg)} × {x.reps}{x.rir != null ? <span className="violet"> @{x.rir}</span> : null}</span>)}</div>
          </button>
        ))}
        {!s.entries.length && <div className="card small muted">Trening oznaczony ręcznie w kalendarzu (bez szczegółów).</div>}
      </div>
      {s.entries.length > 0 && <StravaSendButton id={s.id} sent={!!s.stravaId} />}
      <button className="btn danger block mt24" onClick={() => { if (confirm('Usunąć ten trening ze statystyk?')) { del(s.id); pop(); toast('Usunięto'); } }}><Icon name="trash" size={18} /> Usuń trening</button>
    </div>
  );
}

function Body() {
  const data = useStore((s) => s.data);
  const add = useStore((s) => s.addBody);
  const del = useStore((s) => s.deleteBody);
  const [weight, setWeight] = useState<number>();
  const [bf, setBf] = useState<number>();
  const [waist, setWaist] = useState<number>();
  const [metric, setMetric] = useState<'weight' | 'bodyFat' | 'waist'>('weight');
  const list = data.body.filter((b) => !b.deleted).sort((a, b) => a.date.localeCompare(b.date));
  const pts = list.filter((b) => b[metric] != null).map((b) => ({ x: new Date(b.date).getTime(), y: b[metric]!, label: fmtShort(b.date) }));
  const lastW = [...list].reverse().find((b) => b.weight)?.weight;
  const h = data.profile.height;
  return (
    <>
      <div className="card mt16">
        <div className="bold">Dzisiejszy pomiar</div>
        <div className="grid3 mt12">
          <label className="field"><span>Waga kg</span><NumInput className="input" value={weight} onChange={setWeight} placeholder={lastW ? String(lastW) : '0'} /></label>
          <label className="field"><span>Tłuszcz %</span><NumInput className="input" value={bf} onChange={setBf} /></label>
          <label className="field"><span>Talia cm</span><NumInput className="input" value={waist} onChange={setWaist} /></label>
        </div>
        <button className="btn primary block mt12" disabled={!weight && !bf && !waist} onClick={() => { add({ date: todayStr(), weight: weight || undefined, bodyFat: bf || undefined, waist: waist || undefined }); setWeight(undefined); setBf(undefined); setWaist(undefined); toast('Zapisano pomiar'); }}>Zapisz</button>
        <p className="xs muted mt8">Ważenie najlepiej rano, na czczo, po toalecie. Patrz na średnią tygodniową, nie pojedyncze dni.</p>
      </div>
      <div className="card mt12">
        <Seg value={metric} onChange={setMetric} options={[{ v: 'weight', l: 'Waga' }, { v: 'bodyFat', l: 'Tłuszcz' }, { v: 'waist', l: 'Talia' }]} />
        <div className="mt12"><LineChart points={pts} unit={metric === 'weight' ? 'kg' : metric === 'bodyFat' ? '%' : 'cm'} color="var(--violet)" /></div>
      </div>
      {lastW && h ? <div className="card mt12 small">BMI: <b>{(lastW / (h / 100) ** 2).toFixed(1)}</b>{[...list].reverse().find((b) => b.bodyFat)?.bodyFat ? <> · FFMI: <b>{(() => { const f = [...list].reverse().find((b) => b.bodyFat)!.bodyFat!; const lean = lastW * (1 - f / 100); return (lean / (h / 100) ** 2 + 6.1 * (1.8 - h / 100)).toFixed(1); })()}</b></> : null}</div> : <div className="xs muted mt12">Uzupełnij wzrost w Ustawieniach, aby zobaczyć BMI/FFMI.</div>}
      <div className="section-h"><h2>Pomiary</h2></div>
      {[...list].reverse().slice(0, 30).map((b) => (
        <div key={b.id} className="list-btn">
          <div className="grow"><div className="bold">{fmtDate(b.date)}</div><div className="small muted">{[b.weight && `${kgFmt(b.weight)} kg`, b.bodyFat && `${b.bodyFat}%`, b.waist && `talia ${b.waist} cm`].filter(Boolean).join(' · ')}</div></div>
          <button className="iconbtn plain" onClick={() => del(b.id)}><Icon name="trash" size={18} /></button>
        </div>
      ))}
    </>
  );
}
