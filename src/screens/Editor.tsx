import { useState } from 'react';
import { useStore } from '../lib/store';
import { useNav } from '../nav';
import { allExercises, getExercise, MUSCLES } from '../data/exercises';
import { Icon, NumInput, ReorderList, Sheet, Stepper, TopBar, toast } from '../components/ui';
import { uid } from '../lib/calc';
import { ExImg } from '../components/ExImg';
import type { Equipment, Exercise, Muscle, PlannedExercise } from '../types';

export function ExercisePicker({ open, onClose, onPick, title = 'Dodaj ćwiczenie' }: { open: boolean; onClose: () => void; onPick: (id: string) => void; title?: string }) {
  const [q, setQ] = useState('');
  const [m, setM] = useState<Muscle | null>(null);
  const [creating, setCreating] = useState(false);
  const add = useStore((s) => s.addCustomExercise);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<Muscle>('klatka');
  const [eq, setEq] = useState<Equipment>('hantle');
  const list = allExercises().filter((e) => (!m || e.primary.includes(m)) && e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {!creating ? (
        <>
          <input className="input left" placeholder="Szukaj ćwiczenia…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="chips mt12">{MUSCLES.map((x) => <button key={x} className={`chip ${m === x ? 'on' : ''}`} onClick={() => setM(m === x ? null : x)}>{x}</button>)}</div>
          <div className="mt12" style={{ minHeight: 300 }}>
            {list.map((e) => (
              <button key={e.id} className="item" style={{ width: '100%', textAlign: 'left' }} onClick={() => { onPick(e.id); onClose(); }}>
                <ExImg id={e.id} size="sq" />
                <div className="grow"><div className="t">{e.name}</div><div className="s">{e.primary.join(', ')} · {e.equipment}{e.custom ? ' · własne' : ''}</div></div>
                <span className="accent"><Icon name="plus" size={20} /></span>
              </button>
            ))}
            {!list.length && <div className="empty small">Brak wyników</div>}
          </div>
          <button className="btn ghost block mt12" onClick={() => { setCreating(true); setName(q); }}>Utwórz własne ćwiczenie</button>
        </>
      ) : (
        <div className="stack">
          <label className="field"><span>Nazwa</span><input className="input left" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span>Główna partia</span>
            <select className="input" value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle)}>{MUSCLES.map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <label className="field"><span>Sprzęt</span>
            <select className="input" value={eq} onChange={(e) => setEq(e.target.value as Equipment)}>{(['sztanga', 'hantle', 'wyciąg', 'maszyna', 'masa ciała', 'inne'] as Equipment[]).map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <button className="btn primary block" disabled={!name.trim()} onClick={() => {
            const ex: Exercise = { id: `c_${uid()}`, name: name.trim(), primary: [muscle], equipment: eq, compound: eq === 'sztanga', step: eq === 'sztanga' ? 2.5 : eq === 'masa ciała' ? 0 : 2, bodyweight: eq === 'masa ciała', custom: true };
            add(ex); onPick(ex.id); setCreating(false); onClose(); toast('Dodano ćwiczenie');
          }}>Zapisz i dodaj</button>
          <button className="btn ghost block" onClick={() => setCreating(false)}>Anuluj</button>
        </div>
      )}
    </Sheet>
  );
}

const REST = [30, 45, 60, 90, 120, 150, 180, 240, 300];

function EditExercise({ pe, onChange, onClose }: { pe: PlannedExercise; onChange: (p: PlannedExercise) => void; onClose: () => void }) {
  const ex = getExercise(pe.exId);
  const set = (patch: Partial<PlannedExercise>) => onChange({ ...pe, ...patch });
  return (
    <Sheet open onClose={onClose} title={ex.name}>
      <div className="stack">
        <div className="between"><span>Serie</span><Stepper value={pe.sets} min={1} max={10} onChange={(v) => set({ sets: v })} /></div>
        <div className="between"><span>Powtórzenia od</span><Stepper value={pe.repMin} min={1} max={50} onChange={(v) => set({ repMin: v, repMax: Math.max(v, pe.repMax) })} /></div>
        <div className="between"><span>Powtórzenia do</span><Stepper value={pe.repMax} min={1} max={60} onChange={(v) => set({ repMax: v, repMin: Math.min(v, pe.repMin) })} /></div>
        <div className="between"><div><div>Zapas (RIR)</div><div className="xs muted">ile powtórzeń zostaje „w baku”</div></div><Stepper value={pe.rir} min={0} max={5} onChange={(v) => set({ rir: v })} /></div>
        <div>
          <div className="small muted">Przerwa po serii</div>
          <div className="chips mt8">{REST.map((r) => <button key={r} className={`chip ${pe.restSec === r ? 'on' : ''}`} onClick={() => set({ restSec: r })}>{r < 60 ? `${r}s` : `${r / 60} min`}</button>)}</div>
        </div>
        {!ex.bodyweight && (
          <label className="field"><span>Ciężar startowy (kg, opcjonalnie)</span><NumInput className="input" value={pe.kg} onChange={(v) => set({ kg: v || undefined })} /></label>
        )}
        <div>
          <div className="small muted">Superseria (te same litery = wykonywane naprzemiennie)</div>
          <div className="chips mt8">{['', 'a', 'b', 'c'].map((l) => <button key={l} className={`chip ${(pe.superset ?? '') === l ? 'on' : ''}`} onClick={() => set({ superset: l || undefined })}>{l ? l.toUpperCase() : 'brak'}</button>)}</div>
        </div>
        <button className="btn primary block mt8" onClick={onClose}>Gotowe</button>
      </div>
    </Sheet>
  );
}

export function WorkoutEditor({ blockIndex, workoutId }: { blockIndex: number; workoutId: string }) {
  const { pop } = useNav();
  const program = useStore((s) => s.data.program);
  const updateWorkout = useStore((s) => s.updateWorkout);
  const updateProgram = useStore((s) => s.updateProgram);
  const w = program?.blocks[blockIndex]?.workouts.find((x) => x.id === workoutId);
  const [edit, setEdit] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | { swap?: string }>(null);
  if (!w || !program) return <div className="screen"><TopBar onBack={pop} title="Brak treningu" /></div>;

  const upd = (fn: (list: PlannedExercise[]) => void) => updateWorkout(blockIndex, workoutId, (x) => fn(x.exercises));
  const editing = w.exercises.find((e) => e.uid === edit);

  return (
    <div className="screen">
      <TopBar title="Edycja treningu" onBack={pop} />
      <label className="field"><span>Nazwa treningu</span>
        <input className="input" value={w.name} onChange={(e) => updateWorkout(blockIndex, workoutId, (x) => { x.name = e.target.value; })} />
      </label>
      <div className="small muted mt12">{program.blocks[blockIndex].name} · zmiany dotyczą tylko tego bloku</div>
      <div className="xs muted center mt12">Przytrzymaj uchwyt ⋮⋮ i przeciągnij, aby zmienić kolejność</div>
      <div className="mt8">
        <ReorderList items={w.exercises} getKey={(e) => e.uid} rowClass={() => 'exrow-wrap'}
          onReorder={(next) => updateWorkout(blockIndex, workoutId, (x) => { const m = new Map(x.exercises.map((y) => [y.uid, y])); x.exercises = next.map((y) => m.get(y.uid)!); })}>
          {(e, i, handle) => {
            const ex = getExercise(e.exId);
            return (
              <div className={`card ${e.superset ? 'ss' : ''}`} style={{ padding: 12, marginBottom: 12, marginTop: 0 }}>
                <div className="row">
                  {handle}
                  <button className="row grow" style={{ textAlign: 'left' }} onClick={() => setEdit(e.uid)}>
                    <ExImg id={e.exId} size="sq" />
                    <div className="grow">
                      <div className="bold" style={{ lineHeight: 1.25 }}>{ex.name}</div>
                      <div className="xs muted" style={{ marginTop: 3 }}>{e.sets} × {e.repMin}–{e.repMax} · RIR {e.rir} · {e.restSec}s{e.kg ? ` · ${e.kg} kg` : ''}{e.superset ? ` · superseria ${e.superset.toUpperCase()}` : ''}</div>
                    </div>
                  </button>
                  <button className="iconbtn plain" onClick={() => setPicker({ swap: e.uid })} aria-label="Zamień"><Icon name="swap" size={18} /></button>
                  <button className="iconbtn plain danger" onClick={() => upd((l) => { l.splice(i, 1); })} aria-label="Usuń"><Icon name="trash" size={18} /></button>
                </div>
              </div>
            );
          }}
        </ReorderList>
      </div>
      <button className="btn block mt12" onClick={() => setPicker({})}><Icon name="plus" size={18} /> Dodaj ćwiczenie</button>
      <button className="btn ghost block mt8" onClick={() => {
        updateProgram((p) => {
          const src = p.blocks[blockIndex].workouts.find((x) => x.id === workoutId)!;
          p.blocks[blockIndex].workouts.push({ ...JSON.parse(JSON.stringify(src)), id: uid(), name: `${src.name} (kopia)` });
        });
        toast('Dodano kopię treningu do rotacji');
      }}>Duplikuj trening</button>
      {program.blocks[blockIndex].workouts.length > 1 && (
        <button className="btn danger block mt8" onClick={() => { if (confirm('Usunąć ten trening z rotacji?')) { updateProgram((p) => { p.blocks[blockIndex].workouts = p.blocks[blockIndex].workouts.filter((x) => x.id !== workoutId); }); pop(); } }}>Usuń trening z bloku</button>
      )}

      {editing && <EditExercise pe={editing} onClose={() => setEdit(null)} onChange={(p) => upd((l) => { const k = l.findIndex((x) => x.uid === p.uid); l[k] = p; })} />}
      <ExercisePicker open={!!picker} title={picker?.swap ? 'Zamień ćwiczenie' : 'Dodaj ćwiczenie'} onClose={() => setPicker(null)} onPick={(id) => upd((l) => {
        if (picker?.swap) { const k = l.findIndex((x) => x.uid === picker.swap); if (k >= 0) l[k] = { ...l[k], exId: id, kg: undefined }; }
        else { const ex = getExercise(id); l.push({ uid: uid(), exId: id, sets: 3, repMin: ex.compound ? 6 : 10, repMax: ex.compound ? 10 : 15, rir: 2, restSec: ex.compound ? 150 : 75 }); }
      })} />
    </div>
  );
}
