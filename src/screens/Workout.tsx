import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { useStore, liveSessions } from '../lib/store';
import { useNav } from '../nav';
import { getExercise } from '../data/exercises';
import { findPRs, fmtClock, fmtDuration, historyFor, sessionSets, sessionVolume, suggest, uid, workSets } from '../lib/calc';
import { Icon, NumInput, Ring, ReorderList, Sheet, bigFmt, kgFmt, toast } from '../components/ui';
import { ExImg } from '../components/ExImg';
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

/** Odliczanie przerwy: zwraca pozostałe sekundy i pilnuje sygnałów 3‑2‑1 i końca. */
function useRestClock() {
  const rest = useStore((s) => s.rest);
  const [now, setNow] = useState(Date.now());
  const beeped = useRef<number>(-1);
  useEffect(() => { if (!rest) return; const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, [rest]);
  const left = rest ? (rest.endsAt - now) / 1000 : 0;
  useEffect(() => {
    if (!rest) { beeped.current = -1; return; }
    const s = Math.ceil(left);
    if (s <= 3 && s >= 1 && beeped.current !== s) { beeped.current = s; beep(660, 90); }
    if (s <= 0 && beeped.current !== 0) { beeped.current = 0; beep(990, 260, 2); }
    if (s > 3) beeped.current = -1;
  }, [left, rest]);
  return { rest, left };
}

/* ───────── mały pasek przerwy (gdy trening jest zminimalizowany) ───────── */
export function RestBar() {
  const { rest, left } = useRestClock();
  const adjust = useStore((s) => s.adjustRest);
  const clear = useStore((s) => s.clearRest);
  const { push } = useNav();
  if (!rest) return null;
  const over = left <= 0;
  return (
    <motion.div className={`restbar ${over ? 'end' : ''}`} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <div className="row" onClick={() => push({ name: 'workout' })}>
        <Ring value={over ? 1 : 1 - left / rest.total} size={52} stroke={5} color={over ? 'var(--accent)' : 'var(--violet)'}>
          <Icon name={over ? 'play' : 'timer'} size={16} fill={over} />
        </Ring>
        <div className="grow">
          <div className="xs muted ellipsis">{rest.label}</div>
          <div className="num bold" style={{ fontFamily: 'var(--display)', fontSize: 26, color: over ? 'var(--accent)' : undefined }}>{over ? `+${fmtClock(-left)}` : fmtClock(left)}</div>
        </div>
        <button className="btn sm" onClick={(e) => { e.stopPropagation(); adjust(15); }}>+15 s</button>
        <button className={`btn sm ${over ? 'primary' : 'violet'}`} onClick={(e) => { e.stopPropagation(); clear(); }}>{over ? 'OK' : 'Pomiń'}</button>
      </div>
    </motion.div>
  );
}

/* ───────── odtwarzacz treningu ───────── */
const unitOf = (name: string) => (name.includes('(sekundy)') ? { l: 'Sekundy', step: 5 } : name.includes('(metry)') ? { l: 'Metry', step: 5 } : { l: 'Powtórzenia', step: 1 });

export function Workout() {
  const active = useStore((s) => s.active);
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.updateActive);
  const startRest = useStore((s) => s.startRest);
  const clearRest = useStore((s) => s.clearRest);
  const adjustRest = useStore((s) => s.adjustRest);
  const finish = useStore((s) => s.finishActive);
  const discard = useStore((s) => s.discardActive);
  const { pop, push } = useNav();
  const { rest, left } = useRestClock();
  const [now, setNow] = useState(Date.now());
  const [focus, setFocus] = useState<string | null>(null);
  const [selSet, setSelSet] = useState<number | null>(null);
  const [picker, setPicker] = useState<null | { swap?: string }>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [overview, setOverview] = useState(false);
  const [ending, setEnding] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // ekran nie gaśnie w trakcie treningu
  useEffect(() => {
    let lock: { release?: () => void } | undefined;
    const req = async () => { try { lock = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => void }> } }).wakeLock?.request('screen'); } catch { /* brak */ } };
    req();
    const vis = () => { if (document.visibilityState === 'visible') req(); };
    document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); lock?.release?.(); };
  }, []);

  const sessions = liveSessions(data);
  const entries = active?.entries ?? [];
  const firstOpen = entries.find((e) => e.sets.some((s) => !s.done));
  const cur: EntryLog | undefined = entries.find((e) => e.uid === focus) ?? firstOpen ?? entries[entries.length - 1];
  const curIdxEntry = cur ? entries.indexOf(cur) : -1;

  if (!active) {
    return <div className="screen"><div className="empty">Brak aktywnego treningu.</div><button className="btn block" onClick={pop}>Wróć</button></div>;
  }

  const totalSets = entries.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const elapsed = now - active.startedAt;

  const firstUndone = cur ? cur.sets.findIndex((s) => !s.done) : -1;
  const setIdx = cur ? (selSet != null && selSet < cur.sets.length ? selSet : firstUndone >= 0 ? firstUndone : Math.max(0, cur.sets.length - 1)) : 0;
  const curSet = cur?.sets[setIdx];
  const ex = cur ? getExercise(cur.exId) : undefined;
  const unit = ex ? unitOf(ex.name) : unitOf('');
  const pe = cur?.plan;
  const last = cur ? historyFor(cur.exId, sessions)[0] : undefined;
  const sg = cur && pe && ex ? suggest({ uid: '', exId: cur.exId, sets: pe.sets, repMin: pe.repMin, repMax: pe.repMax, rir: pe.rir, restSec: pe.restSec }, ex, sessions) : null;

  const nextOpenAfter = (s: Session, uidCur: string) => {
    const i = s.entries.findIndex((e) => e.uid === uidCur);
    return [...s.entries.slice(i + 1), ...s.entries.slice(0, i)].find((e) => e.sets.some((x) => !x.done));
  };
  const detailOf = (e: EntryLog, idx: number) => `Seria ${idx + 1} z ${e.sets.length}${e.plan ? ` · ${e.plan.repMin === e.plan.repMax ? e.plan.repMin : `${e.plan.repMin}–${e.plan.repMax}`} powt.` : ''}`;

  const setVal = (patch: Partial<EntryLog['sets'][0]>, propagate = false) => {
    if (!cur) return;
    update((s) => {
      const e = s.entries.find((x) => x.uid === cur.uid)!;
      Object.assign(e.sets[setIdx], patch);
      if (propagate) for (let k = setIdx + 1; k < e.sets.length; k++) if (!e.sets[k].done) Object.assign(e.sets[k], patch);
    });
  };

  const completeSet = () => {
    if (!cur || !curSet) return;
    unlockAudio();
    if (curSet.done) { setSelSet(null); toast('Zapisano zmianę'); return; }
    update((s) => { const e = s.entries.find((x) => x.uid === cur.uid)!; e.sets[setIdx].done = true; e.sets[setIdx].at = Date.now(); });
    setSelSet(null);
    const s = useStore.getState().active!;
    const e = s.entries.find((x) => x.uid === cur.uid)!;
    const name = getExercise(e.exId).name;

    if (e.superset) {
      const group = s.entries.filter((x) => x.superset === e.superset);
      const gi = group.findIndex((x) => x.uid === e.uid);
      const partner = [...group.slice(gi + 1), ...group.slice(0, gi)].find((x) => x.sets.some((q) => !q.done));
      if (partner && gi < group.length - 1) { clearRest(); setFocus(partner.uid); toast(`Superseria → ${getExercise(partner.exId).name}`); return; }
      if (partner) {
        setFocus(partner.uid);
        const pi = partner.sets.findIndex((q) => !q.done);
        startRest({ total: e.restSec, label: `Superseria ${e.superset.toUpperCase()}: runda zakończona`, next: getExercise(partner.exId).name, nextExId: partner.exId, nextDetail: detailOf(partner, pi) });
        return;
      }
    }
    const remaining = e.sets.filter((x) => !x.done).length;
    if (remaining > 0) {
      const ni = e.sets.findIndex((x) => !x.done);
      startRest({ total: e.restSec, label: `Seria ${setIdx + 1} zrobiona`, next: name, nextExId: e.exId, nextDetail: detailOf(e, ni) });
    } else {
      const nx = nextOpenAfter(s, e.uid);
      if (nx) {
        setFocus(nx.uid);
        const ni = nx.sets.findIndex((x) => !x.done);
        startRest({ total: Math.max(e.restSec, 90), label: 'Ćwiczenie ukończone', doneExId: e.exId, next: getExercise(nx.exId).name, nextExId: nx.exId, nextDetail: detailOf(nx, ni), betweenExercises: true });
      } else { clearRest(); setEnding(true); }
    }
  };

  const finishExercise = () => {
    if (!cur) return;
    unlockAudio();
    update((s) => { const e = s.entries.find((x) => x.uid === cur.uid)!; e.sets = e.sets.filter((x) => x.done); });
    setSelSet(null);
    const s = useStore.getState().active!;
    const nx = nextOpenAfter(s, cur.uid);
    if (nx) {
      setFocus(nx.uid);
      const ni = nx.sets.findIndex((x) => !x.done);
      startRest({ total: Math.max(cur.restSec, 90), label: 'Ćwiczenie ukończone', doneExId: cur.exId, next: getExercise(nx.exId).name, nextExId: nx.exId, nextDetail: detailOf(nx, ni), betweenExercises: true });
    } else setEnding(true);
  };

  const jump = (uidTo: string) => { clearRest(); setFocus(uidTo); setSelSet(null); setOverview(false); };

  const doneEntry = rest?.doneExId ? entries.find((e) => e.exId === rest.doneExId) : undefined;
  const over = rest ? left <= 0 : false;

  return (
    <div className="player">
      <div className="player-top">
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <button className="iconbtn" onClick={pop} aria-label="Zminimalizuj"><Icon name="down" /></button>
            <div className="grow center">
              <div className="bold ellipsis" style={{ fontFamily: 'var(--display)', fontSize: 17 }}>{active.workoutName}</div>
              <div className="xs muted num">{fmtClock(elapsed / 1000)} · {doneSets}/{totalSets} serii · {bigFmt(sessionVolume(active))}</div>
            </div>
            <button className="iconbtn" onClick={() => setOverview(true)} aria-label="Lista ćwiczeń"><Icon name="list" /></button>
          </div>
          <div className="segs">
            {entries.map((e, i) => (
              <i key={e.uid} className={i === curIdxEntry ? 'cur' : ''} onClick={() => jump(e.uid)}>
                <b style={{ width: `${e.sets.length ? (e.sets.filter((s) => s.done).length / e.sets.length) * 100 : 0}%` }} />
              </i>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {rest ? (
          <motion.div key="rest" className="player-body" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}>
            <div className="restwrap">
              {rest.betweenExercises && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 260 }} style={{ width: 58, height: 58, borderRadius: 20, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={32} stroke={3} />
                </motion.div>
              )}
              <div className="bold" style={{ fontFamily: 'var(--display)', fontSize: 20, color: rest.betweenExercises ? 'var(--accent)' : undefined }}>{over ? 'Czas minął. Zaczynaj!' : rest.label}</div>
              {doneEntry && <div className="chips wrap" style={{ justifyContent: 'center' }}>{workSets(doneEntry).map((s, i) => <span key={i} className="tag accent">{kgFmt(s.kg)} × {s.reps}</span>)}</div>}
              <Ring value={over ? 1 : 1 - left / rest.total} size={216} stroke={12} color={over ? 'var(--accent)' : 'var(--violet)'}>
                <div className="bigtime" style={{ color: over ? 'var(--accent)' : undefined }}>{over ? `+${fmtClock(-left)}` : fmtClock(left)}</div>
                <div className="xs muted mt8">{over ? 'ponad plan' : 'przerwa'}</div>
              </Ring>
              {rest.next && (
                <div className="nextcard">
                  {rest.nextExId && <ExImg id={rest.nextExId} size="sq" />}
                  <div className="grow">
                    <div className="xs muted bold" style={{ letterSpacing: '.07em', textTransform: 'uppercase' }}>{rest.betweenExercises ? 'Następne ćwiczenie' : 'Następna seria'}</div>
                    <div className="bold" style={{ lineHeight: 1.25, marginTop: 2 }}>{rest.next}</div>
                    {rest.nextDetail && <div className="small muted mt8" style={{ marginTop: 3 }}>{rest.nextDetail}</div>}
                  </div>
                </div>
              )}
              <div className="grid2" style={{ width: '100%' }}>
                <button className="btn" onClick={() => adjustRest(-15)}>−15 s</button>
                <button className="btn" onClick={() => adjustRest(15)}>+15 s</button>
              </div>
            </div>
          </motion.div>
        ) : cur && ex && curSet ? (
          <motion.div key={`work-${cur.uid}`} className="player-body" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}>
            <div className="stack" style={{ gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <ExImg id={cur.exId} size="hero16" animate />
                <span className="tag" style={{ position: 'absolute', left: 10, top: 10, background: 'rgba(11,12,15,.72)', color: '#fff', backdropFilter: 'blur(6px)' }}>Ćwiczenie {curIdxEntry + 1}/{entries.length}</span>
                {cur.superset && <span className="tag violet" style={{ position: 'absolute', right: 10, top: 10 }}>superseria {cur.superset.toUpperCase()}</span>}
              </div>
              <div className="pname">{ex.name}</div>
              <div className="metaline">
                <span className="tag accent">Seria {setIdx + 1} z {cur.sets.length}</span>
                {pe && <span className="tag">{pe.repMin === pe.repMax ? pe.repMin : `${pe.repMin}–${pe.repMax}`} {unit.l === 'Powtórzenia' ? 'powt.' : unit.l.toLowerCase()}</span>}
                {pe && <span className="tag">RIR {pe.rir}</span>}
                <span className="tag">przerwa {fmtClock(cur.restSec)}</span>
              </div>
              {!curSet.done && sg && <div className={`hint ${sg.kind === 'up' ? 'up' : sg.kind === 'deload' ? 'deload' : ''}`}>{sg.kind === 'up' ? '▲ ' : ''}{sg.reason}</div>}
              {last && <div className="xs muted center">Ostatnio ({last.s.date.slice(5).split('-').reverse().join('.')}): {workSets(last.en).map((s) => `${kgFmt(s.kg)}×${s.reps}`).join(' · ')}</div>}

              <div className="grid2">
                <div className="stepcard">
                  <div className="lab">{ex.bodyweight ? 'Dodatkowe kg' : 'Ciężar (kg)'}</div>
                  <div className="val">
                    <button className="stepbtn" onClick={() => setVal({ kg: Math.max(0, +(curSet.kg - (ex.step || 2.5)).toFixed(2)) }, !curSet.done)} aria-label="mniej"><Icon name="minus" /></button>
                    <button className="stepbtn" onClick={() => setVal({ kg: +(curSet.kg + (ex.step || 2.5)).toFixed(2) }, !curSet.done)} aria-label="więcej"><Icon name="plus" /></button>
                  </div>
                  <NumInput className="big" value={curSet.kg} onChange={(v) => setVal({ kg: v }, !curSet.done)} />
                </div>
                <div className="stepcard">
                  <div className="lab">{unit.l}</div>
                  <div className="val">
                    <button className="stepbtn" onClick={() => setVal({ reps: Math.max(0, curSet.reps - unit.step) })} aria-label="mniej"><Icon name="minus" /></button>
                    <button className="stepbtn" onClick={() => setVal({ reps: curSet.reps + unit.step })} aria-label="więcej"><Icon name="plus" /></button>
                  </div>
                  <NumInput className="big" decimal={false} value={curSet.reps} onChange={(v) => setVal({ reps: v })} />
                </div>
              </div>

              <div>
                <div className="xs muted bold center" style={{ letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>Ile powtórzeń zostało w zapasie (RIR)</div>
                <div className="xs muted center" style={{ marginTop: -4, marginBottom: 8 }}>0 = nie dałbym rady więcej · 4+ = było lekko</div>
                <div className="rirrow">
                  {[0, 1, 2, 3, 4].map((r) => <button key={r} className={curSet.rir === r ? 'on' : ''} onClick={() => setVal({ rir: curSet.rir === r ? undefined : r })}>{r === 4 ? '4+' : r}</button>)}
                </div>
              </div>

              <div>
              <div className="xs muted bold center" style={{ letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 4 }}>Serie w tym ćwiczeniu</div>
              <div className="xs muted center" style={{ marginBottom: 8 }}>Numer = kolejna seria · ✓ zrobiona · zielona ramka = ta, którą teraz wpisujesz · + dodaje serię</div>
              <div className="pills">
                {cur.sets.map((s, i) => (
                  <button key={i} className={`pill-set ${s.done ? 'done' : ''} ${i === setIdx ? 'cur' : ''}`} onClick={() => setSelSet(i)}>
                    {s.done ? <span className="pop"><Icon name="check" size={18} stroke={3} /></span> : i + 1}
                  </button>
                ))}
                <button className="pill-set" aria-label="Dodaj serię" onClick={() => { update((s) => { const e = s.entries.find((x) => x.uid === cur.uid)!; const l = e.sets[e.sets.length - 1]; e.sets.push({ kg: l?.kg ?? 0, reps: l?.reps ?? 8, rir: l?.rir, done: false }); }); setSelSet(cur.sets.length); }}><Icon name="plus" size={18} /></button>
              </div>
              </div>

              <div className="grid2">
                <button className="btn sm ghost" disabled={!cur.sets.some((s) => s.done) || cur.sets.every((s) => s.done)} onClick={finishExercise}>Zakończ ćwiczenie</button>
                <button className="btn sm ghost" onClick={() => setMenu(cur.uid)}>Więcej opcji</button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty" className="player-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="empty">Dodaj pierwsze ćwiczenie, aby zacząć.</div>
            <button className="btn primary block" onClick={() => setPicker({})}><Icon name="plus" size={18} /> Dodaj ćwiczenie</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="player-cta">
        {rest ? (
          <button className={`btn lg block ${over ? 'primary shine' : 'violet'}`} onClick={() => { unlockAudio(); clearRest(); }}>{over ? 'Zaczynam' : 'Pomiń przerwę'} <Icon name="right" /></button>
        ) : cur && curSet ? (
          <button className="btn lg primary block shine" onClick={completeSet}>
            <Icon name="check" stroke={3} /> {curSet.done ? 'Zapisz zmianę' : 'Seria zrobiona'}
          </button>
        ) : (
          <button className="btn lg block" onClick={() => setEnding(true)}>Zakończ trening</button>
        )}
      </div>

      {/* lista ćwiczeń */}
      <Sheet open={overview} onClose={() => setOverview(false)} title="Plan treningu">
        <div className="xs muted center" style={{ marginBottom: 4 }}>Przytrzymaj ćwiczenie i przeciągnij, aby zmienić kolejność</div>
        <ReorderList items={entries} getKey={(e) => e.uid} rowClass={(e) => `item ${e.superset ? 'ss' : ''}`}
          onReorder={(next) => update((s) => { const m = new Map(s.entries.map((x) => [x.uid, x])); s.entries = next.map((x) => m.get(x.uid)!); })}>
          {(e, i) => {
            const ee = getExercise(e.exId); const d = e.sets.filter((s) => s.done).length;
            return (
              <>
                <button className="row grow" style={{ textAlign: 'left' }} onClick={() => jump(e.uid)}>
                  <ExImg id={e.exId} size="sq" />
                  <div className="grow">
                    <div className="t ellipsis">{i + 1}. {ee.name}</div>
                    <div className="s">{d}/{e.sets.length} serii{e.uid === cur?.uid ? ' · teraz' : ''}</div>
                  </div>
                  {d === e.sets.length && e.sets.length > 0 && <span className="accent"><Icon name="check" stroke={3} /></span>}
                </button>
                <button className="iconbtn plain" onClick={() => { setOverview(false); setMenu(e.uid); }}><Icon name="more" size={20} stroke={3} /></button>
              </>
            );
          }}
        </ReorderList>
        <button className="btn block mt12" onClick={() => { setOverview(false); setPicker({}); }}><Icon name="plus" size={18} /> Dodaj ćwiczenie</button>
        <button className="btn primary block mt12" onClick={() => { setOverview(false); setEnding(true); }}><Icon name="check" size={18} stroke={3} /> Zakończ trening i zapisz</button>
        <button className="btn danger block mt12" onClick={() => { if (confirm('Odrzucić ten trening? Nic nie zostanie zapisane.')) { discard(); setOverview(false); pop(); } }}>Odrzuć trening</button>
      </Sheet>

      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu ? getExercise(entries.find((e) => e.uid === menu)?.exId ?? '').name : ''}>
        {menu && (() => {
          const i = entries.findIndex((e) => e.uid === menu);
          const en = entries[i];
          if (!en) return null;
          return (
            <div className="stack">
              <div className="small muted center">Przerwa między seriami</div>
              <div className="chips wrap" style={{ justifyContent: 'center' }}>{[45, 60, 90, 120, 150, 180, 240].map((r) => <button key={r} className={`chip ${en.restSec === r ? 'on' : ''}`} onClick={() => update((s) => { s.entries[i].restSec = r; })}>{fmtClock(r)}</button>)}</div>
              <div className="grid2">
                <button className="btn" disabled={i === 0} onClick={() => update((s) => { [s.entries[i - 1], s.entries[i]] = [s.entries[i], s.entries[i - 1]]; })}><Icon name="up" size={18} /> Wyżej</button>
                <button className="btn" disabled={i === entries.length - 1} onClick={() => update((s) => { [s.entries[i + 1], s.entries[i]] = [s.entries[i], s.entries[i + 1]]; })}><Icon name="down" size={18} /> Niżej</button>
              </div>
              <button className="btn block" disabled={en.sets.length < 2} onClick={() => update((s) => { s.entries[i].sets.pop(); setSelSet(null); })}><Icon name="minus" size={18} /> Usuń ostatnią serię</button>
              <button className="btn block" onClick={() => { setMenu(null); setPicker({ swap: menu }); }}><Icon name="swap" size={18} /> Zamień ćwiczenie</button>
              <button className="btn block" onClick={() => { setMenu(null); push({ name: 'exercise', id: en.exId }); }}><Icon name="chart" size={18} /> Historia i wykres</button>
              <button className="btn block danger" onClick={() => { update((s) => { s.entries.splice(i, 1); }); setMenu(null); setFocus(null); }}><Icon name="trash" size={18} /> Usuń z treningu</button>
            </div>
          );
        })()}
      </Sheet>

      <ExercisePicker open={!!picker} onClose={() => setPicker(null)} title={picker?.swap ? 'Zamień ćwiczenie' : 'Dodaj ćwiczenie'} onPick={(id) => update((s) => {
        const e2 = getExercise(id);
        if (picker?.swap) { const e = s.entries.find((x) => x.uid === picker.swap); if (e) { e.exId = id; e.sets.forEach((x) => { if (!x.done) x.kg = 0; }); } return; }
        const l = historyFor(id, sessions)[0];
        const ls = l ? workSets(l.en) : [];
        const nu = uid();
        s.entries.push({ uid: nu, exId: id, restSec: e2.compound ? 150 : 75, sets: Array.from({ length: 3 }, (_, k) => ({ kg: ls[k]?.kg ?? ls[0]?.kg ?? 0, reps: ls[k]?.reps ?? (e2.compound ? 8 : 12), done: false })) });
        setFocus(nu);
      })} />

      {ending && <FinishSheet allDone={!entries.some((e) => e.sets.some((s) => !s.done))} onClose={() => setEnding(false)} onSave={(feel, note) => {
        const fin = finish(feel, note);
        setEnding(false); pop();
        if (fin) { const prs = findPRs(fin, useStore.getState().data.sessions); toast(prs.length ? `Zapisano! Nowe rekordy: ${prs.length} 🏆` : 'Trening zapisany ✓'); push({ name: 'session', id: fin.id }); }
      }} />}
    </div>
  );
}

function FinishSheet({ onClose, onSave, allDone }: { onClose: () => void; onSave: (feel?: number, note?: string) => void; allDone: boolean }) {
  const active = useStore((s) => s.active)!;
  const sessions = useStore((s) => s.data.sessions);
  const [feel, setFeel] = useState<number | undefined>();
  const [note, setNote] = useState('');
  const prs = useMemo(() => findPRs({ ...active, finishedAt: Date.now() }, sessions), [active, sessions]);
  const undone = active.entries.reduce((a, e) => a + e.sets.filter((s) => !s.done).length, 0);
  useEffect(() => {
    if (!allDone && !prs.length) return;
    const fire = (x: number) => confetti({ particleCount: 70, spread: 80, startVelocity: 38, origin: { x, y: 0.75 }, colors: ['#c8f560', '#8b7bff', '#ffffff'], zIndex: 200 });
    fire(0.2); setTimeout(() => fire(0.8), 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Sheet open onClose={onClose} title={allDone ? 'Trening ukończony! 🎉' : 'Podsumowanie'}>
      <div className="grid3">
        <div className="card2 stat" style={{ minHeight: 80 }}><b style={{ fontSize: 20 }}>{fmtDuration(Date.now() - active.startedAt)}</b><span>czas</span></div>
        <div className="card2 stat" style={{ minHeight: 80 }}><b style={{ fontSize: 20 }}>{bigFmt(sessionVolume(active))}</b><span>objętość</span></div>
        <div className="card2 stat" style={{ minHeight: 80 }}><b style={{ fontSize: 20 }}>{sessionSets(active)}</b><span>serie</span></div>
      </div>
      {prs.length > 0 && (
        <div className="card2 mt12">
          <div className="bold row" style={{ justifyContent: 'center' }}><span className="accent"><Icon name="trophy" size={18} /></span> Nowe rekordy</div>
          {prs.map((p) => <div key={p.exId} className="small mt8 center">{getExercise(p.exId).name}: <b className="accent">{p.type === 'kg' ? `${kgFmt(p.value)} kg` : `e1RM ${kgFmt(p.value)} kg`}</b> <span className="muted">(było {kgFmt(p.prev)})</span></div>)}
        </div>
      )}
      {undone > 0 && <div className="card2 small mt12 center">{(() => { const n = sessionSets(active); const f = n === 1 ? 'wykonaną serię' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20) ? 'wykonane serie' : 'wykonanych serii'; return `Zapiszemy ${n} ${f}. Niezrobione (${undone}) zostaną pominięte.`; })()}</div>}
      <div className="small muted mt16 center">Jak się czułeś?</div>
      <div className="grid3 mt8" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))' }}>{['😫', '😕', '😐', '🙂', '💪'].map((e, i) => <button key={i} className={`chip ${feel === i + 1 ? 'on' : ''}`} style={{ fontSize: 22, height: 48, borderRadius: 14 }} onClick={() => setFeel(i + 1)}>{e}</button>)}</div>
      <textarea className="input left mt12" placeholder="Notatka (opcjonalnie)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn lg primary block mt16" onClick={() => onSave(feel, note || undefined)}>Zapisz trening</button>
      <button className="btn ghost block mt8" onClick={onClose}>Wróć do treningu</button>
    </Sheet>
  );
}
