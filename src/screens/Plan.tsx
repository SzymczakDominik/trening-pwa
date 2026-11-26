import { useState } from 'react';
import { useStore } from '../lib/store';
import { useNav } from '../nav';
import { addDays, DAY_SHORT, fmtDate, fmtShort, mondayOf, programPosition, todayStr } from '../lib/calc';
import { getExercise } from '../data/exercises';
import { Icon, Sheet, toast } from '../components/ui';
import { ExImg } from '../components/ExImg';
import type { Program, WorkoutTemplate } from '../types';

export function WeeksBar({ p }: { p: Program }) {
  const pos = programPosition(p);
  const cells: JSX.Element[] = [];
  let w = 0;
  const cycleStart = pos.week - (pos.week % p.blocks.reduce((a, b) => a + b.weeks, 0));
  p.blocks.forEach((b, bi) => {
    if (bi) cells.push(<i key={`g${bi}`} className="gap" />);
    for (let k = 0; k < b.weeks; k++, w++) {
      const abs = cycleStart + w;
      const isDeload = p.deloadLastWeek && b.weeks >= 3 && k === b.weeks - 1;
      cells.push(<i key={`${bi}-${k}`} className={abs < pos.week ? 'done' : abs === pos.week ? 'now' : isDeload ? 'deload' : ''} />);
    }
  });
  return <div className="weeks">{cells}</div>;
}

export function WorkoutList({ workouts, rirShift = 0, deload = false, onEdit }: { workouts: WorkoutTemplate[]; rirShift?: number; deload?: boolean; onEdit?: (w: WorkoutTemplate) => void }) {
  const [open, setOpen] = useState<string | null>(workouts[0]?.id ?? null);
  return (
    <div className="stack">
      {workouts.map((w) => (
        <div key={w.id} className="card">
          <button className="between" style={{ width: '100%' }} onClick={() => setOpen(open === w.id ? null : w.id)}>
            <div style={{ textAlign: 'left' }}>
              <div className="bold">{w.name}</div>
              <div className="xs muted">{w.exercises.length} ćwiczeń · {w.exercises.reduce((a, e) => a + e.sets, 0)} serii</div>
            </div>
            <div className="row">
              {onEdit && <span className="iconbtn" onClick={(e) => { e.stopPropagation(); onEdit(w); }}><Icon name="edit" size={18} /></span>}
              <Icon name={open === w.id ? 'up' : 'down'} />
            </div>
          </button>
          {open === w.id && (
            <div className="mt8">
              {w.exercises.map((e, i) => {
                const prevSS = i > 0 && e.superset && w.exercises[i - 1].superset === e.superset;
                return (
                  <div key={e.uid}>
                    {e.superset && !prevSS && <div className="tag violet mt8">superseria</div>}
                    <div className={`item ${e.superset ? 'ss' : ''}`}>
                      <ExImg id={e.exId} size="sq" />
                      <div className="grow">
                        <div className="t">{getExercise(e.exId).name}</div>
                        <div className="s">
                          {deload ? Math.max(1, Math.round(e.sets * 0.6)) : e.sets} × {e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`} · RIR {Math.max(0, e.rir + rirShift)} · przerwa {e.restSec >= 60 ? `${Math.round(e.restSec / 6) / 10} min` : `${e.restSec} s`}{e.kg ? ` · ${e.kg} kg` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function PlanScreen() {
  const p = useStore((s) => s.data.program);
  const updateProgram = useStore((s) => s.updateProgram);
  const removeProgram = useStore((s) => s.removeProgram);
  const { push } = useNav();
  const [bi, setBi] = useState<number | null>(null);
  const [settings, setSettings] = useState(false);

  if (!p) {
    return (
      <div className="screen">
        <h1 className="title">Plan</h1>
        <div className="empty">Nie masz aktywnego planu.</div>
        <button className="btn primary block" onClick={() => push({ name: 'onboarding' })}>Dopasuj plan do mnie</button>
        <button className="btn ghost block mt8" onClick={() => push({ name: 'library' })}>Przeglądaj biblioteką planów</button>
      </div>
    );
  }
  const pos = programPosition(p);
  const b = bi ?? pos.blockIndex;
  const block = p.blocks[b];

  const skipBlock = () => {
    const left = pos.block.weeks - pos.weekInBlock + 1;
    updateProgram((q) => { q.blockOffsetWeeks += left; });
    toast('Przeskoczono do następnego bloku');
  };

  return (
    <div className="screen">
      <div className="between">
        <h1 className="title" style={{ fontSize: 26 }}>{p.name}</h1>
        <button className="iconbtn" onClick={() => setSettings(true)} aria-label="Ustawienia planu"><Icon name="more" size={24} stroke={3} /></button>
      </div>
      <div className="subtitle">Start {fmtDate(p.startDate)} · {p.trainingDays.map((d) => DAY_SHORT[d]).join(', ')}</div>

      <div className="hero mt16">
        <div className="between">
          <div>
            <div className="bold" style={{ fontSize: 20 }}>{pos.block.name}</div>
            <div className="small muted">Tydzień {pos.weekInBlock}/{pos.block.weeks} · {fmtShort(pos.blockStart)}–{fmtShort(pos.blockEnd)}</div>
          </div>
          {pos.deload ? <span className="tag violet">odciążenie</span> : <span className="tag accent">cykl {pos.cycle}</span>}
        </div>
        <WeeksBar p={p} />
        <p className="small muted mt12">{pos.deload ? 'Tydzień odciążenia: ~60% serii, ~90% ciężaru, zapas 3–4 powt. Pozwala zregenerować się i wejść w kolejny blok mocniej.' : `Kalendarz sam przełączy blok ${fmtDate(addDays(pos.blockEnd, 1))}. Docelowy zapas w tym tygodniu: RIR ${Math.max(0, 2 + pos.targetRirShift)} (dla ćwiczeń z RIR 2 w planie).`}</p>
      </div>

      <div className="chips mt16">
        {p.blocks.map((x, i) => <button key={i} className={`chip ${i === b ? 'on' : ''}`} onClick={() => setBi(i)}>{x.name}{i === pos.blockIndex ? ' • teraz' : ''}</button>)}
      </div>
      <p className="small muted mt12">{block.description}</p>
      <div className="mt12">
        <WorkoutList workouts={block.workouts} rirShift={b === pos.blockIndex ? pos.targetRirShift : 0} deload={b === pos.blockIndex && pos.deload}
          onEdit={(w) => push({ name: 'editWorkout', blockIndex: b, workoutId: w.id })} />
      </div>

      <Sheet open={settings} onClose={() => setSettings(false)} title="Ustawienia planu">
        <div className="small muted bold" style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>Dni treningowe</div>
        <div className="chips mt8">
          {DAY_SHORT.map((d, i) => (
            <button key={d} className={`chip ${p.trainingDays.includes(i) ? 'on' : ''}`} onClick={() => updateProgram((q) => {
              q.trainingDays = q.trainingDays.includes(i) ? q.trainingDays.filter((x) => x !== i) : [...q.trainingDays, i].sort();
            })}>{d}</button>
          ))}
        </div>
        <label className="field mt16"><span>Początek programu (tydzień)</span>
          <input className="input" type="date" value={p.startDate} onChange={(e) => e.target.value && updateProgram((q) => { q.startDate = mondayOf(e.target.value); q.blockOffsetWeeks = 0; })} />
        </label>
        <button className="between card2 mt12" style={{ width: '100%' }} onClick={() => updateProgram((q) => { q.deloadLastWeek = !q.deloadLastWeek; })}>
          <div style={{ textAlign: 'left' }}><div className="bold">Tydzień odciążenia</div><div className="xs muted">Ostatni tydzień każdego bloku lżejszy</div></div>
          <span className={`chip ${p.deloadLastWeek ? 'on' : ''}`}>{p.deloadLastWeek ? 'wł.' : 'wył.'}</span>
        </button>
        <div className="stack mt16">
          <button className="btn block" onClick={() => { skipBlock(); setSettings(false); }}><Icon name="skip" size={18} /> Przejdź do następnego bloku</button>
          {p.blockOffsetWeeks !== 0 && <button className="btn block ghost" onClick={() => updateProgram((q) => { q.blockOffsetWeeks = 0; })}>Przywróć harmonogram wg kalendarza</button>}
          <button className="btn block" onClick={() => { setSettings(false); push({ name: 'library' }); }}><Icon name="swap" size={18} /> Zmień plan</button>
          <button className="btn block danger" onClick={() => { if (confirm('Zakończyć plan? Historia treningów zostanie zachowana.')) { removeProgram(); setSettings(false); } }}>Zakończ plan</button>
        </div>
        <div className="xs muted mt12">Dziś: {fmtDate(todayStr())}</div>
      </Sheet>
    </div>
  );
}
