import { useState } from 'react';
import { motion } from 'motion/react';
import { useStore, liveSessions } from '../lib/store';
import { useNav } from '../nav';
import { addDays, DAY_SHORT, DAY_LONG, fmtShort, mondayOf, nextWorkoutIndex, programPosition, sessionVolume, todayStr, weekday, fromStr, MONTHS_GEN } from '../lib/calc';
import { getExercise } from '../data/exercises';
import { Icon, Ring, bigFmt } from '../components/ui';
import { ExImg } from '../components/ExImg';
import { WeeksBar } from './Plan';

const rise = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.05 * i, duration: 0.35, ease: [0.2, 0.8, 0.2, 1] as const } });

export function Today() {
  const data = useStore((s) => s.data);
  const active = useStore((s) => s.active);
  const startSession = useStore((s) => s.startSession);
  const { push, setTab } = useNav();
  const [open, setOpen] = useState(false);
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

  const hasWeek = (w: string) => sessions.some((s) => s.date >= w && s.date < addDays(w, 7));
  let streak = 0;
  for (let w = hasWeek(mon) ? mon : addDays(mon, -7); hasWeek(w) && streak < 520; w = addDays(w, -7)) streak++;

  const pos = p ? programPosition(p) : undefined;
  const nextIdx = p ? nextWorkoutIndex(p, data.sessions) : 0;
  const next = pos?.block.workouts[nextIdx];
  const isTrainingDay = !!p?.trainingDays.includes(weekday(today));
  const doneToday = sessions.some((s) => s.date === today);

  // następny zaplanowany dzień treningowy
  let nextDay: string | null = null;
  if (p) for (let i = doneToday ? 1 : 0; i < 14; i++) { const x = addDays(today, i); if (p.trainingDays.includes(weekday(x))) { nextDay = x; break; } }
  const nextLabel = nextDay ? (nextDay === today ? 'dziś' : nextDay === addDays(today, 1) ? 'jutro' : DAY_LONG[weekday(nextDay)]) : '';

  const start = () => { if (!active) startSession(next, pos?.blockIndex); push({ name: 'workout' }); };
  const activeDone = active ? active.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0) : 0;
  const activeTotal = active ? active.entries.reduce((a, e) => a + e.sets.length, 0) : 0;
  const mins = next ? Math.round(next.exercises.reduce((a, e) => a + e.sets * (45 + e.restSec), 0) / 60) : 0;

  const title = active ? 'Trening w toku' : doneToday ? 'Dobra robota 💪' : isTrainingDay ? 'Czas na trening' : p ? 'Dzień regeneracji' : 'Cześć!';

  return (
    <div className="screen">
      <motion.div {...rise(0)}>
        <div className="subtitle">{DAY_LONG[weekday(today)]}, {d.getDate()} {MONTHS_GEN[d.getMonth()]}</div>
        <h1 className="title">{title}</h1>
      </motion.div>

      {active ? (
        <motion.div {...rise(1)} className="card mt16" style={{ borderColor: 'rgba(200,245,96,.4)' }}>
          <div className="row">
            <Ring value={activeTotal ? activeDone / activeTotal : 0} size={64} stroke={7}>
              <span className="num bold" style={{ fontFamily: 'var(--display)' }}>{activeDone}/{activeTotal}</span>
            </Ring>
            <div className="grow"><div className="bold" style={{ fontSize: 18 }}>{active.workoutName}</div><div className="small muted">Wróć dokładnie tam, gdzie skończyłeś</div></div>
          </div>
          <button className="btn lg primary block mt16" onClick={() => push({ name: 'workout' })}><Icon name="play" size={20} fill /> Kontynuuj trening</button>
        </motion.div>
      ) : p && pos && next ? (
        <motion.div {...rise(1)} className="card mt16" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, next.exercises.length)}, minmax(0,1fr))`, gap: 2, height: 108 }}>
            {next.exercises.slice(0, 4).map((e) => <ExImg key={e.uid} id={e.exId} size="fill" />)}
          </div>
          <div style={{ padding: 16 }}>
            <div className="between">
              <span className="tag accent">{isTrainingDay && !doneToday ? 'Dziś' : `Następny: ${nextLabel}`}</span>
              {pos.deload ? <span className="tag violet">odciążenie</span> : <span className="tag">RIR {Math.max(0, 2 + pos.targetRirShift)}</span>}
            </div>
            <div className="bold mt12" style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: '-0.02em' }}>{next.name}</div>
            <div className="small muted">{next.exercises.length} ćwiczeń · {next.exercises.reduce((a, e) => a + (pos.deload ? Math.max(1, Math.round(e.sets * 0.6)) : e.sets), 0)} serii · ok. {mins} min</div>
            <button className="btn lg primary block mt16 shine" onClick={start}><Icon name="play" size={20} fill /> {isTrainingDay && !doneToday ? 'Rozpocznij trening' : 'Trenuj teraz'}</button>
            <div className="grid2 mt12">
              <button className="btn sm ghost" onClick={() => setOpen(!open)}>{open ? 'Ukryj ćwiczenia' : 'Zobacz ćwiczenia'}</button>
              <button className="btn sm ghost" onClick={() => push({ name: 'editWorkout', blockIndex: pos.blockIndex, workoutId: next.id })}><Icon name="edit" size={15} /> Edytuj</button>
            </div>
            {open && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden' }}>
                <div className="mt12">
                  {next.exercises.map((e) => (
                    <div key={e.uid} className={`item ${e.superset ? 'ss' : ''}`}>
                      <ExImg id={e.exId} size="sq" />
                      <div className="grow">
                        <div className="t">{getExercise(e.exId).name}</div>
                        <div className="s">{pos.deload ? Math.max(1, Math.round(e.sets * 0.6)) : e.sets} × {e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`} · RIR {Math.max(0, e.rir + pos.targetRirShift)} · przerwa {e.restSec >= 60 ? `${Math.round(e.restSec / 6) / 10} min` : `${e.restSec} s`}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div {...rise(1)} className="hero mt16">
          <div className="bold" style={{ fontFamily: 'var(--display)', fontSize: 22 }}>Wybierz plan treningowy</div>
          <p className="small muted mt8">Odpowiesz na 4 pytania, a aplikacja dobierze plan. Bloki 4‑tygodniowe kalendarz przełącza sam.</p>
          <button className="btn lg primary block mt16" onClick={() => push({ name: 'onboarding' })}>Dopasuj plan do mnie</button>
          <button className="btn ghost block mt8" onClick={() => push({ name: 'library' })}>Przeglądaj bibliotekę</button>
        </motion.div>
      )}

      <motion.div {...rise(2)}>
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
          <div className="card stat"><b style={{ fontSize: 21 }}>{bigFmt(weekVol)}</b><span>objętość {prevWeekVol > 0 && <em className={weekVol >= prevWeekVol ? 'accent' : 'danger'} style={{ fontStyle: 'normal' }}>{weekVol >= prevWeekVol ? '▲' : '▼'}{Math.abs(Math.round((weekVol / prevWeekVol - 1) * 100))}%</em>}</span></div>
          <div className="card stat"><b>{streak}</b><span>tyg. z rzędu</span></div>
        </div>
      </motion.div>

      {p && pos && (
        <motion.div {...rise(3)} className="hero mt16" onClick={() => setTab('plan')}>
          <div className="between">
            <div className="grow">
              <div className="xs muted bold ellipsis" style={{ letterSpacing: '.08em', textTransform: 'uppercase' }}>{p.name}</div>
              <div className="bold" style={{ fontFamily: 'var(--display)', fontSize: 21, marginTop: 4 }}>{pos.block.name}</div>
              <div className="small muted">Tydzień {pos.weekInBlock} z {pos.block.weeks} · cykl {pos.cycle} · do {fmtShort(pos.blockEnd)}</div>
            </div>
            <Icon name="right" />
          </div>
          <WeeksBar p={p} />
        </motion.div>
      )}
    </div>
  );
}
