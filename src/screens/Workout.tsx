import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, liveSessions } from '../lib/store';
import { useNav } from '../nav';
import { getExercise } from '../data/exercises';
import { findPRs, fmtClock, fmtDuration, historyFor, sessionSets, sessionVolume, suggest, uid, workSets } from '../lib/calc';
import { Icon, NumInput, Ring, Sheet, bigFmt, kgFmt, toast } from '../components/ui';
import { ExercisePicker } from './Editor';
import type { EntryLog, Session } from '../types';

/* ───────── dźwięk (Web Audio – działa w Safari po pierwszym dotknięciu) ───────── */
let ctx: AudioContext | null = null;
export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* brak audio */ }
}
export function beep(freq = 880, ms = 180, times = 1) {
  if (!ctx || !useStore.getState().data.profile.sound) return;
  for (let i = 0; i < times; i++) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime + i * (ms / 1000 + 0.08);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.start(t); o.stop(t + ms / 1000 + 0.02);
  }
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* iOS nie obsługuje */ }
}

/* ───────── pasek przerwy ───────── */
export function RestBar({ aboveTabs = false }: { aboveTabs?: boolean }) {
  const rest = useStore((s) => s.rest);
  const adjust = useStore((s) => s.adjustRest);
  const clear = useStore((s) => s.clearRest);
  const [now, setNow] = useState(Date.now());
  const beeped = useRef<number>(-1);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const left = rest ? (rest.endsAt - now) / 1000 : 0;
  useEffect(() => {
    if (!rest) return;
    const s = Math.ceil(left);
    if (s <= 3 && s >= 1 && beeped.current !== s) { beeped.current = s; beep(660, 90); }
    if (s <= 0 && beeped.current !== 0) { beeped.current = 0; beep(990, 260, 2); }
    if (s > 3) beeped.current = -1;
  }, [left, rest]);
  if (!rest) return null;
  const over = left <= 0;
  return (
    <div className={`restbar ${over ? 'end' : ''}`} style={aboveTabs ? { bottom: 'calc(var(--safe-bottom) + 86px)' } : undefined}>
      <div className="row">
        <Ring value={over ? 1 : 1 - left / rest.total} size={62} stroke={6} color={over ? 'var(--accent)' : 'var(--violet)'}>
          <Icon name={over ? 'play' : 'timer'} size={20} fill={over} />
        </Ring>
        <div className="grow">
          <div className="xs muted ellipsis">{rest.label}</div>
          <div className="bigtime" style={{ fontSize: 38, color: over ? 'var(--accent)' : undefined }}>{over ? `+${fmtClock(-left)}` : fmtClock(left)}</div>
          {rest.next && <div className="small ellipsis"><span className="muted">{rest.betweenExercises ? 'Następne ćwiczenie: ' : 'Teraz: '}</span><b>{rest.next}</b></div>}
        </div>
      </div>
      <div className="row mt12">
        <button className="btn sm grow" onClick={() => adjust(-15)}>−15 s</button>
        <button className="btn sm grow" onClick={() => adjust(15)}>+15 s</button>
        <button className={`btn sm grow ${over ? 'primary' : 'violet'}`} onClick={clear}>{over ? 'Do dzieła' : 'Pomiń'}</button>
      </div>
    </div>
  );
}

/* ───────── ekran treningu ───────── */
export function Workout() {
  const active = useStore((s) => s.active);
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.updateActive);
  const startRest = useStore((s) => s.startRest);
  const clearRest = useStore((s) => s.clearRest);
  const finish = useStore((s) => s.finishActive);
  const discard = useStore((s) => s.discardActive);
  const rest = useStore((s) => s.rest);
  const { pop, push } = useNav();
  const [now, setNow] = useState(Date.now());
  const [focus, setFocus] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | { swap?: string }>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const sessions = liveSessions(data);
  const firstOpen = active?.entries.find((e) => e.sets.some((s) => !s.done))?.uid ?? null;
  const cur = focus && active?.entries.some((e) => e.uid === focus) ? focus : firstOpen;

  if (!active) {
    return <div className="screen"><div className="empty">Brak aktywnego treningu.</div><button className="btn block" onClick={pop}>Wróć</button></div>;
  }
  const totalSets = active.entries.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = active.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);

  const nextOpenAfter = (s: Session, uidCur: string) => {
    const i = s.entries.findIndex((e) => e.uid === uidCur);
    return [...s.entries.slice(i + 1), ...s.entries.slice(0, i)].find((e) => e.sets.some((x) => !x.done));
  };

  const toggleSet = (en: EntryLog, si: number) => {
    unlockAudio();
    const willBeDone = !en.sets[si].done;
    update((s) => { const e = s.entries.find((x) => x.uid === en.uid)!; e.sets[si].done = willBeDone; e.sets[si].at = Date.now(); });
    if (!willBeDone) return;
    const s = useStore.getState().active!;
    const e = s.entries.find((x) => x.uid === en.uid)!;
    const name = getExercise(e.exId).name;
    // superseria: przejdź do partnera bez przerwy
    if (e.superset) {
      const group = s.entries.filter((x) => x.superset === e.superset);
      const gi = group.findIndex((x) => x.uid === e.uid);
      const partner = [...group.slice(gi + 1), ...group.slice(0, gi)].find((x) => x.sets.some((q) => !q.done));
      if (partner && gi < group.length - 1) {
        clearRest(); setFocus(partner.uid); toast(`Superseria → ${getExercise(partner.exId).name}`); return;
      }
      if (partner) {
        setFocus(partner.uid);
        startRest({ total: e.restSec, label: `Superseria ${e.superset.toUpperCase()} – runda zakończona`, next: getExercise(partner.exId).name });
        return;
      }
    }
    const remaining = e.sets.filter((x) => !x.done).length;
    if (remaining > 0) {
      const n = e.sets.findIndex((x) => !x.done) + 1;
      startRest({ total: e.restSec, label: `${name} · seria ${si + 1} zrobiona`, next: `seria ${n} z ${e.sets.length}` });
    } else {
      const nx = nextOpenAfter(s, e.uid);
      if (nx) {
        setFocus(nx.uid);
        startRest({ total: Math.max(e.restSec, 90), label: `✓ Koniec ćwiczenia: ${name}`, next: getExercise(nx.exId).name, betweenExercises: true });
      } else {
        clearRest(); toast('Wszystkie serie zrobione! Zakończ trening 🎉');
      }
    }
  };

  const finishExercise = (en: EntryLog) => {
    unlockAudio();
    update((s) => { const e = s.entries.find((x) => x.uid === en.uid)!; e.sets = e.sets.filter((x) => x.done); });
    const s = useStore.getState().active!;
    const nx = nextOpenAfter(s, en.uid);
    if (nx) {
      setFocus(nx.uid);
      startRest({ total: Math.max(en.restSec, 90), label: `✓ Koniec ćwiczenia: ${getExercise(en.exId).name}`, next: getExercise(nx.exId).name, betweenExercises: true });
    } else toast('To było ostatnie ćwiczenie');
  };

  const setVal = (en: EntryLog, si: number, patch: Partial<EntryLog['sets'][0]>, propagate = false) => update((s) => {
    const e = s.entries.find((x) => x.uid === en.uid)!;
    Object.assign(e.sets[si], patch);
    // zmiana ciężaru w pierwszej niewykonanej serii → przenieś na kolejne niewykonane
    if (propagate) for (let k = si + 1; k < e.sets.length; k++) if (!e.sets[k].done) Object.assign(e.sets[k], patch);
  });

  const elapsed = now - active.startedAt;

  return (
    <div className="screen" style={{ paddingBottom: rest ? 220 : 60 }}>
      <div className="topbar">
        <button className="iconbtn" onClick={pop} aria-label="Zminimalizuj"><Icon name="down" /></button>
        <div className="grow">
          <div className="bold ellipsis">{active.workoutName}</div>
          <div className="xs muted num">{fmtClock(elapsed / 1000)} · {doneSets}/{totalSets} serii · {bigFmt(sessionVolume(active))}</div>
        </div>
        <button className="btn sm primary" onClick={() => setEnding(true)}>Zakończ</button>
      </div>
      <div className="progressbar"><i style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} /></div>

      <div className="stack mt16">
        {active.entries.map((en, idx) => {
          const ex = getExercise(en.exId);
          const isCur = en.uid === cur;
          const allDone = en.sets.length > 0 && en.sets.every((s) => s.done);
          const last = historyFor(en.exId, sessions)[0];
          const pe = en.plan;
          const sg = pe ? suggest({ uid: '', exId: en.exId, sets: pe.sets, repMin: pe.repMin, repMax: pe.repMax, rir: pe.rir, restSec: pe.restSec }, ex, sessions) : null;
          const prevSS = idx > 0 && en.superset && active.entries[idx - 1].superset === en.superset;
          return (
            <div key={en.uid}>
              {en.superset && !prevSS && <div className="tag violet" style={{ marginBottom: 6 }}>superseria {en.superset.toUpperCase()}</div>}
              <div className={`card excard ${isCur ? 'current' : ''} ${allDone && !isCur ? 'finished' : ''} ${en.superset ? 'ss' : ''}`}>
                <div className="row" onClick={() => setFocus(en.uid)}>
                  <div className="badge" style={allDone ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : undefined}>{allDone ? <Icon name="check" size={16} stroke={3} /> : idx + 1}</div>
                  <div className="grow">
                    <div className="bold">{ex.name}</div>
                    <div className="xs muted">
                      {pe ? `${pe.repMin}–${pe.repMax} powt. · RIR ${pe.rir} · przerwa ${fmtClock(en.restSec)}` : `przerwa ${fmtClock(en.restSec)}`}
                    </div>
                  </div>
                  <button className="iconbtn plain" onClick={(e) => { e.stopPropagation(); setMenu(en.uid); }}><Icon name="more" size={22} stroke={3} /></button>
                </div>

                {(isCur || !allDone) && (
                  <>
                    {isCur && sg && last && <div className={`hint mt12 ${sg.kind === 'up' ? 'up' : sg.kind === 'deload' ? 'deload' : ''}`}>{sg.kind === 'up' ? '▲ ' : ''}{sg.reason}</div>}
                    {isCur && sg && !last && <div className="hint mt12">{sg.reason}</div>}
                    {last && <div className="xs muted mt8">Ostatnio ({last.s.date.slice(5).split('-').reverse().join('.')}): {workSets(last.en).map((s) => `${kgFmt(s.kg)}×${s.reps}`).join(', ')}</div>}
                    <div className="setgrid mt12">
                      <div className="h">#</div><div className="h">{ex.bodyweight ? 'kg +' : 'kg'}</div><div className="h">{ex.name.includes('sekundy') ? 'sek.' : ex.name.includes('metry') ? 'metry' : 'powt.'}</div><div className="h">RIR</div><div className="h" />
                      {en.sets.map((s, si) => (
                        <div key={si} className={`setrow ${s.done ? 'done' : ''}`} style={{ display: 'contents' }}>
                          <div className="setno">{si + 1}</div>
                          <NumInput value={s.kg} onChange={(v) => setVal(en, si, { kg: v }, !s.done)} />
                          <NumInput value={s.reps} decimal={false} onChange={(v) => setVal(en, si, { reps: v })} />
                          <select className="setin sel" value={s.rir ?? ''} onChange={(e) => setVal(en, si, { rir: e.target.value === '' ? undefined : Number(e.target.value) })}>
                            <option value="">–</option>{[0, 1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button className={`check ${s.done ? 'on' : ''}`} onClick={() => toggleSet(en, si)} aria-label="Seria zrobiona"><Icon name="check" stroke={3} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="row mt12">
                      <button className="btn sm" onClick={() => update((s) => { const e = s.entries.find((x) => x.uid === en.uid)!; const l = e.sets[e.sets.length - 1]; e.sets.push({ kg: l?.kg ?? 0, reps: l?.reps ?? 8, rir: l?.rir, done: false }); })}><Icon name="plus" size={16} /> Seria</button>
                      {en.sets.length > 1 && <button className="btn sm" onClick={() => update((s) => { const e = s.entries.find((x) => x.uid === en.uid)!; e.sets.pop(); })}><Icon name="minus" size={16} /></button>}
                      <div className="grow" />
                      {isCur && !allDone && en.sets.some((s) => s.done) && <button className="btn sm violet" onClick={() => finishExercise(en)}>Zakończ ćwiczenie</button>}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn ghost block mt16" onClick={() => setPicker({})}><Icon name="plus" size={18} /> Dodaj ćwiczenie</button>
      <button className="btn ghost block mt8 danger" style={{ borderColor: 'transparent' }} onClick={() => { if (confirm('Odrzucić ten trening? Nic nie zostanie zapisane.')) { discard(); pop(); } }}>Odrzuć trening</button>

      <RestBar />

      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu ? getExercise(active.entries.find((e) => e.uid === menu)?.exId ?? '').name : ''}>
        {menu && (() => {
          const i = active.entries.findIndex((e) => e.uid === menu);
          const en = active.entries[i];
          const restOpts = [45, 60, 90, 120, 150, 180, 240];
          return (
            <div className="stack">
              <div className="small muted">Przerwa między seriami</div>
              <div className="chips">{restOpts.map((r) => <button key={r} className={`chip ${en.restSec === r ? 'on' : ''}`} onClick={() => update((s) => { s.entries[i].restSec = r; })}>{fmtClock(r)}</button>)}</div>
              <div className="grid2 mt8">
                <button className="btn" disabled={i === 0} onClick={() => update((s) => { [s.entries[i - 1], s.entries[i]] = [s.entries[i], s.entries[i - 1]]; })}><Icon name="up" size={18} /> Wyżej</button>
                <button className="btn" disabled={i === active.entries.length - 1} onClick={() => update((s) => { [s.entries[i + 1], s.entries[i]] = [s.entries[i], s.entries[i + 1]]; })}><Icon name="down" size={18} /> Niżej</button>
              </div>
              <button className="btn block" onClick={() => { setMenu(null); setPicker({ swap: menu }); }}><Icon name="swap" size={18} /> Zamień ćwiczenie</button>
              <button className="btn block" onClick={() => { setMenu(null); push({ name: 'exercise', id: en.exId }); }}><Icon name="chart" size={18} /> Historia i wykres</button>
              <button className="btn block danger" onClick={() => { update((s) => { s.entries.splice(i, 1); }); setMenu(null); }}><Icon name="trash" size={18} /> Usuń z treningu</button>
            </div>
          );
        })()}
      </Sheet>

      <ExercisePicker open={!!picker} onClose={() => setPicker(null)} title={picker?.swap ? 'Zamień ćwiczenie' : 'Dodaj ćwiczenie'} onPick={(id) => update((s) => {
        const ex = getExercise(id);
        if (picker?.swap) { const e = s.entries.find((x) => x.uid === picker.swap); if (e) { e.exId = id; e.sets.forEach((x) => { if (!x.done) x.kg = 0; }); } return; }
        const last = historyFor(id, sessions)[0];
        const ls = last ? workSets(last.en) : [];
        s.entries.push({ uid: uid(), exId: id, restSec: ex.compound ? 150 : 75, sets: Array.from({ length: 3 }, (_, k) => ({ kg: ls[k]?.kg ?? ls[0]?.kg ?? 0, reps: ls[k]?.reps ?? (ex.compound ? 8 : 12), done: false })) });
      })} />

      {ending && <FinishSheet onClose={() => setEnding(false)} onSave={(feel, note) => {
        const fin = finish(feel, note);
        setEnding(false); pop();
        if (fin) { const prs = findPRs(fin, useStore.getState().data.sessions); toast(prs.length ? `Zapisano! Nowe rekordy: ${prs.length} 🏆` : 'Trening zapisany ✓'); push({ name: 'session', id: fin.id }); }
      }} />}
    </div>
  );
}

function FinishSheet({ onClose, onSave }: { onClose: () => void; onSave: (feel?: number, note?: string) => void }) {
  const active = useStore((s) => s.active)!;
  const sessions = useStore((s) => s.data.sessions);
  const [feel, setFeel] = useState<number | undefined>();
  const [note, setNote] = useState('');
  const prs = useMemo(() => findPRs({ ...active, finishedAt: Date.now() }, sessions), [active, sessions]);
  const undone = active.entries.reduce((a, e) => a + e.sets.filter((s) => !s.done).length, 0);
  return (
    <Sheet open onClose={onClose} title="Podsumowanie">
      <div className="grid3">
        <div className="card2 stat"><b style={{ fontSize: 18 }}>{fmtDuration(Date.now() - active.startedAt)}</b><span>czas</span></div>
        <div className="card2 stat"><b style={{ fontSize: 18 }}>{bigFmt(sessionVolume(active))}</b><span>objętość</span></div>
        <div className="card2 stat"><b style={{ fontSize: 18 }}>{sessionSets(active)}</b><span>serie</span></div>
      </div>
      {prs.length > 0 && (
        <div className="card2 mt12">
          <div className="bold row"><span className="accent"><Icon name="trophy" size={18} /></span> Nowe rekordy</div>
          {prs.map((p) => <div key={p.exId} className="small mt8">{getExercise(p.exId).name}: <b className="accent">{p.type === 'kg' ? `${kgFmt(p.value)} kg` : `e1RM ${kgFmt(p.value)} kg`}</b> <span className="muted">(było {kgFmt(p.prev)})</span></div>)}
        </div>
      )}
      {undone > 0 && <div className="xs muted mt12">Niezaznaczone serie ({undone}) nie zostaną zapisane.</div>}
      <div className="small muted mt16">Jak się czułeś?</div>
      <div className="row mt8">{['😫', '😕', '😐', '🙂', '💪'].map((e, i) => <button key={i} className={`chip ${feel === i + 1 ? 'on' : ''}`} style={{ fontSize: 20, height: 44, flex: 1, justifyContent: 'center' }} onClick={() => setFeel(i + 1)}>{e}</button>)}</div>
      <textarea className="input mt12" placeholder="Notatka (opcjonalnie)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn primary block mt16" onClick={() => onSave(feel, note || undefined)}>Zapisz trening</button>
      <button className="btn ghost block mt8" onClick={onClose}>Wróć do treningu</button>
    </Sheet>
  );
}
