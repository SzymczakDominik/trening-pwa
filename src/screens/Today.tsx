import { useStore, liveSessions } from '../lib/store';
import { useNav } from '../nav';
import { addDays, DAY_SHORT, DAY_LONG, fmtShort, mondayOf, nextWorkoutIndex, programPosition, sessionVolume, todayStr, weekday, fromStr, MONTHS_GEN } from '../lib/calc';
import { getExercise } from '../data/exercises';
import { Icon, bigFmt } from '../components/ui';
import { WeeksBar } from './Plan';

export function Today() {
  const data = useStore((s) => s.data);
  const active = useStore((s) => s.active);
  const startSession = useStore((s) => s.startSession);
  const { push, setTab } = useNav();
  const p = data.program;
  const today = todayStr();
  const sessions = liveSessions(data);
  const d = fromStr(today);

  const mon = mondayOf(today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const doneDates = new Set(sessions.map((s) => s.date));
  const weekSessions = sessions.filter((s) => s.date >= mon);
  const weekVol = weekSessions.reduce((a, s) => a + sessionVolume(s), 0);
  const prevWeekVol = sessions.filter((s) => s.date >= addDays(mon, -7) && s.date < mon).reduce((a, s) => a + sessionVolume(s), 0);

  // seria tygodni z co najmniej 1 treningiem
  const hasWeek = (w: string) => sessions.some((s) => s.date >= w && s.date < addDays(w, 7));
  let streak = 0;
  for (let w = hasWeek(mon) ? mon : addDays(mon, -7); hasWeek(w) && streak < 520; w = addDays(w, -7)) streak++;

  const pos = p ? programPosition(p) : undefined;
  const nextIdx = p ? nextWorkoutIndex(p, data.sessions) : 0;
  const next = pos?.block.workouts[nextIdx];
  const isTrainingDay = p?.trainingDays.includes(weekday(today));
  const doneToday = sessions.some((s) => s.date === today);

  const start = () => { if (!active) startSession(next, pos?.blockIndex); push({ name: 'workout' }); };

  return (
    <div className="screen">
      <div className="subtitle">{DAY_LONG[weekday(today)]}, {d.getDate()} {MONTHS_GEN[d.getMonth()]}</div>
      <h1 className="title">{doneToday ? 'Dobra robota 💪' : isTrainingDay ? 'Dziś trening' : p ? 'Dzień regeneracji' : 'Cześć!'}</h1>

      {active && (
        <button className="card mt12 row" style={{ width: '100%', textAlign: 'left', border: '1px solid var(--accent)' }} onClick={() => push({ name: 'workout' })}>
          <div className="badge"><Icon name="play" size={16} fill /></div>
          <div className="grow"><div className="bold">Trening w toku</div><div className="small muted">{active.workoutName} · wróć do logowania serii</div></div>
          <Icon name="right" />
        </button>
      )}

      {p && pos ? (
        <div className="hero mt16" onClick={() => setTab('plan')}>
          <div className="between">
            <div className="grow">
              <div className="xs muted bold" style={{ letterSpacing: '.08em', textTransform: 'uppercase' }}>{p.name}</div>
              <div className="bold" style={{ fontSize: 22, marginTop: 4 }}>{pos.block.name}</div>
              <div className="small muted">Tydzień {pos.weekInBlock} z {pos.block.weeks} · cykl {pos.cycle} · do {fmtShort(pos.blockEnd)}</div>
            </div>
            {pos.deload ? <span className="tag violet">odciążenie</span> : <span className="tag accent">RIR {Math.max(0, 2 + pos.targetRirShift)}</span>}
          </div>
          <WeeksBar p={p} />
        </div>
      ) : (
        <div className="hero mt16">
          <div className="bold" style={{ fontSize: 20 }}>Wybierz plan treningowy</div>
          <p className="small muted mt8">Dobierzemy plan do Twojego poziomu i liczby dni. Każdy plan to bloki 4‑tygodniowe, które kalendarz przełącza automatycznie.</p>
          <div className="row mt16">
            <button className="btn primary" onClick={() => push({ name: 'onboarding' })}>Dopasuj plan</button>
            <button className="btn ghost" onClick={() => push({ name: 'library' })}>Biblioteka</button>
          </div>
        </div>
      )}

      <div className="section-h"><h2>Ten tydzień</h2><button className="link" onClick={() => setTab('calendar')}>Kalendarz</button></div>
      <div className="card" style={{ padding: 10 }}>
        <div className="weekstrip">
          {week.map((day, i) => {
            const done = doneDates.has(day);
            const plan = p?.trainingDays.includes(i) && day >= (p.createdOn ?? p.startDate);
            const miss = plan && !done && day < today;
            return (
              <div key={day} className={`d ${day === today ? 'today' : ''}`}>
                <span>{DAY_SHORT[i]}</span>
                <div className={`dot ${done ? 'done' : miss ? 'miss' : plan ? 'plan' : ''}`}>{done ? <Icon name="check" size={16} stroke={3} /> : fromStr(day).getDate()}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid3 mt12">
        <div className="card stat"><b>{weekSessions.length}</b><span>treningi w tyg.</span></div>
        <div className="card stat"><b style={{ fontSize: 20 }}>{bigFmt(weekVol)}</b><span>objętość {prevWeekVol > 0 && <em className={weekVol >= prevWeekVol ? 'accent' : 'danger'} style={{ fontStyle: 'normal' }}>{weekVol >= prevWeekVol ? '▲' : '▼'}{Math.abs(Math.round((weekVol / prevWeekVol - 1) * 100))}%</em>}</span></div>
        <div className="card stat"><b>{streak}</b><span>tyg. z rzędu</span></div>
      </div>

      {p && next && (
        <>
          <div className="section-h"><h2>{doneToday ? 'Następny trening' : 'Do zrobienia'}</h2><span className="small muted">{pos?.block.workouts.length} w rotacji</span></div>
          <div className="card">
            <div className="between">
              <div>
                <div className="bold" style={{ fontSize: 20 }}>{next.name}</div>
                <div className="small muted">{next.exercises.length} ćwiczeń · ~{Math.round(next.exercises.reduce((a, e) => a + e.sets * (45 + e.restSec), 0) / 60)} min</div>
              </div>
              <button className="iconbtn" onClick={() => push({ name: 'editWorkout', blockIndex: pos!.blockIndex, workoutId: next.id })}><Icon name="edit" size={18} /></button>
            </div>
            <div className="mt8">
              {next.exercises.map((e, i) => (
                <div key={e.uid} className={`exrow ${e.superset ? 'ss' : ''}`}>
                  <div className="badge">{i + 1}</div>
                  <div className="grow">
                    <div className="ellipsis">{getExercise(e.exId).name}</div>
                    <div className="xs muted">{pos?.deload ? Math.max(1, Math.round(e.sets * 0.6)) : e.sets} × {e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`} · RIR {Math.max(0, e.rir + (pos?.targetRirShift ?? 0))} · przerwa {Math.round(e.restSec / 60 * 10) / 10} min</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn primary block mt12" onClick={start}><Icon name="play" size={18} fill /> {active ? 'Wróć do treningu' : 'Rozpocznij trening'}</button>
          </div>
        </>
      )}
      <button className="btn ghost block mt12" onClick={() => { if (!active) startSession(); push({ name: 'workout' }); }}><Icon name="plus" size={18} /> Trening dowolny</button>
    </div>
  );
}
