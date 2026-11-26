import { useState } from 'react';
import { PLANS, getPlan } from '../data/plans';
import { useStore } from '../lib/store';
import { useNav } from '../nav';
import { DAY_SHORT, fmtDate, mondayOf, todayStr, addDays } from '../lib/calc';
import { Icon, Sheet, TopBar, toast } from '../components/ui';
import { WorkoutList } from './Plan';
import type { Goal, Level, PlanTemplate } from '../types';

function PlanCard({ t, onOpen, score }: { t: PlanTemplate; onOpen: () => void; score?: boolean }) {
  return (
    <button className="card" style={{ width: '100%', textAlign: 'left', display: 'block', border: score ? '1px solid rgba(190,242,100,.5)' : undefined }} onClick={onOpen}>
      {score && <div className="tag accent" style={{ marginBottom: 8 }}>najlepsze dopasowanie</div>}
      <div className="between"><div className="bold" style={{ fontSize: 18 }}>{t.name}</div><Icon name="right" /></div>
      <p className="small muted mt8">{t.description}</p>
      <div className="chips mt12" style={{ flexWrap: 'wrap' }}>
        <span className="tag accent">{t.daysPerWeek} dni/tydz.</span>
        <span className="tag">{t.split}</span>
        <span className="tag">{t.level === 'początkujący' ? 'pocz.' : 'średnio-zaaw.'}</span>
        <span className="tag">~{t.minutes} min</span>
        <span className="tag violet">{t.blocks.length} bloki · {t.blocks.reduce((a, b) => a + b.weeks, 0)} tyg.</span>
      </div>
    </button>
  );
}

export function Library() {
  const { pop, push } = useNav();
  const [days, setDays] = useState<number | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const list = PLANS.filter((p) => (days == null || p.daysPerWeek === days) && (level == null || p.level === level));
  return (
    <div className="screen">
      <TopBar title="Biblioteka planów" onBack={pop} />
      <div className="chips">
        {[2, 3, 4].map((d) => <button key={d} className={`chip ${days === d ? 'on' : ''}`} onClick={() => setDays(days === d ? null : d)}>{d} dni</button>)}
        {(['początkujący', 'średniozaawansowany'] as Level[]).map((l) => <button key={l} className={`chip ${level === l ? 'on' : ''}`} onClick={() => setLevel(level === l ? null : l)}>{l}</button>)}
      </div>
      <div className="small muted mt12">{list.length} planów</div>
      <div className="stack mt12">
        {list.map((t) => <PlanCard key={t.id} t={t} onOpen={() => push({ name: 'planDetail', id: t.id })} />)}
      </div>
    </div>
  );
}

export function StartPlanSheet({ t, open, onClose }: { t: PlanTemplate; open: boolean; onClose: () => void }) {
  const startProgram = useStore((s) => s.startProgram);
  const hasProgram = useStore((s) => !!s.data.program);
  const { setTab } = useNav();
  const [days, setDays] = useState<number[]>(t.defaultDays);
  const thisMon = mondayOf(todayStr());
  const [start, setStart] = useState(thisMon);
  return (
    <Sheet open={open} onClose={onClose} title="Rozpocznij plan">
      <p className="small muted">Wybierz {t.daysPerWeek} dni treningowe. Najlepiej z co najmniej jednym dniem przerwy między treningami tej samej partii.</p>
      <div className="chips mt12">
        {DAY_SHORT.map((d, i) => (
          <button key={d} className={`chip ${days.includes(i) ? 'on' : ''}`} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}>{d}</button>
        ))}
      </div>
      {days.length !== t.daysPerWeek && <div className="xs mt8" style={{ color: 'var(--warn)' }}>Plan zakłada {t.daysPerWeek} dni, wybrano {days.length}. Treningi i tak idą po kolei (A→B→…).</div>}
      <div className="small muted bold mt16" style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>Start</div>
      <div className="seg mt8">
        <button className={start === thisMon ? 'on' : ''} onClick={() => setStart(thisMon)}>Ten tydzień</button>
        <button className={start === addDays(thisMon, 7) ? 'on' : ''} onClick={() => setStart(addDays(thisMon, 7))}>Od {fmtDate(addDays(thisMon, 7)).slice(0, 5)}</button>
      </div>
      {hasProgram && <div className="xs muted mt12">Obecny plan zostanie zastąpiony. Historia treningów i statystyki zostają.</div>}
      <button className="btn primary block mt16" disabled={!days.length} onClick={() => { startProgram(t, days, start); onClose(); setTab('today'); toast('Plan rozpoczęty – powodzenia!'); }}>Zaczynam</button>
    </Sheet>
  );
}

export function PlanDetail({ id }: { id: string }) {
  const { pop } = useNav();
  const t = getPlan(id)!;
  const [bi, setBi] = useState(0);
  const [sheet, setSheet] = useState(false);
  return (
    <div className="screen">
      <TopBar title="" onBack={pop} />
      <h1 className="title">{t.name}</h1>
      <p className="muted mt8">{t.description}</p>
      <div className="chips mt12" style={{ flexWrap: 'wrap' }}>
        <span className="tag accent">{t.daysPerWeek} dni/tydz.</span><span className="tag">{t.split}</span><span className="tag">{t.level}</span><span className="tag">~{t.minutes} min</span>
        <span className="tag">{t.equipment.join(' · ')}</span>
      </div>
      <div className="card mt16 small">
        <div className="bold">Jak działa progresja</div>
        <p className="muted mt8">Każde ćwiczenie ma zakres powtórzeń (np. 8–12) i zapas RIR. Gdy we wszystkich seriach zrobisz górę zakresu, aplikacja podpowie większy ciężar. Tydzień 1 bloku zaczynasz z większym zapasem, a ostatni tydzień to odciążenie. Po 4 tygodniach kalendarz sam przełącza blok.</p>
      </div>
      <div className="seg mt16">
        {t.blocks.map((b, i) => <button key={i} className={i === bi ? 'on' : ''} onClick={() => setBi(i)}>{b.name}</button>)}
      </div>
      <p className="small muted mt12">{t.blocks[bi].description}</p>
      <div className="mt12"><WorkoutList key={bi} workouts={t.blocks[bi].workouts} /></div>
      <div style={{ height: 80 }} />
      <div style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(var(--safe-bottom) + 16px)', maxWidth: 608, margin: '0 auto' }}>
        <button className="btn primary block" onClick={() => setSheet(true)}>Wybierz ten plan</button>
      </div>
      <StartPlanSheet t={t} open={sheet} onClose={() => setSheet(false)} />
    </div>
  );
}

/* ───────── Dopasowanie planu ───────── */
export function Onboarding() {
  const { pop, push } = useNav();
  const setProfile = useStore((s) => s.setProfile);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<Level>('początkujący');
  const [days, setDays] = useState(3);
  const [goal, setGoal] = useState<Goal>('sylwetka');
  const [place, setPlace] = useState<'siłownia' | 'dom'>('siłownia');

  const scored = PLANS.map((p) => {
    let s = 0;
    if (p.daysPerWeek === days) s += 5; else s -= Math.abs(p.daysPerWeek - days) * 2;
    if (p.level === level) s += 3;
    if (p.goal.includes(goal)) s += 2;
    const home = p.equipment.every((e) => e === 'hantle' || e === 'masa ciała');
    if (place === 'dom') s += home ? 6 : -4; else if (home) s -= 3;
    return { p, s };
  }).sort((a, b) => b.s - a.s);

  const Q = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mt24"><div className="bold" style={{ fontSize: 22 }}>{title}</div><div className="stack mt16">{children}</div></div>
  );
  const Opt = ({ on, onClick, t, d }: { on: boolean; onClick: () => void; t: string; d?: string }) => (
    <button className="list-btn" style={{ border: on ? '1px solid var(--accent)' : '1px solid transparent' }} onClick={onClick}>
      <div className="grow"><div className="bold">{t}</div>{d && <div className="small muted">{d}</div>}</div>
      {on && <span className="accent"><Icon name="check" stroke={3} /></span>}
    </button>
  );
  const next = () => setStep(step + 1);
  return (
    <div className="screen">
      <TopBar title={`Dopasowanie ${Math.min(step + 1, 5)}/5`} onBack={() => (step ? setStep(step - 1) : pop())} />
      <div className="progressbar"><i style={{ width: `${(Math.min(step + 1, 5) / 5) * 100}%` }} /></div>
      {step === 0 && <Q title="Jak długo trenujesz?">
        <Opt on={level === 'początkujący'} onClick={() => { setLevel('początkujący'); next(); }} t="Zaczynam / do roku" d="Uczę się techniki, ciężary rosną z tygodnia na tydzień" />
        <Opt on={level === 'średniozaawansowany'} onClick={() => { setLevel('średniozaawansowany'); next(); }} t="Ponad rok regularnie" d="Znam bóje, progres zwalnia, potrzebuję więcej objętości" />
      </Q>}
      {step === 1 && <Q title="Ile dni w tygodniu możesz trenować?">
        {[2, 3, 4].map((d) => <Opt key={d} on={days === d} onClick={() => { setDays(d); next(); }} t={`${d} dni`} d={d === 2 ? 'Minimum, które daje efekty' : d === 3 ? 'Złoty środek dla większości' : 'Więcej objętości, krótsze sesje'} />)}
      </Q>}
      {step === 2 && <Q title="Co jest Twoim głównym celem?">
        <Opt on={goal === 'sylwetka'} onClick={() => { setGoal('sylwetka'); next(); }} t="Sylwetka i forma" d="Mniej tłuszczu, więcej mięśni, lepsza kondycja" />
        <Opt on={goal === 'masa'} onClick={() => { setGoal('masa'); next(); }} t="Masa mięśniowa" d="Hipertrofia, większa objętość" />
        <Opt on={goal === 'siła'} onClick={() => { setGoal('siła'); next(); }} t="Siła" d="Wyższe wyniki w przysiadzie, wyciskaniu, martwym" />
      </Q>}
      {step === 3 && <Q title="Gdzie trenujesz?">
        <Opt on={place === 'siłownia'} onClick={() => { setPlace('siłownia'); next(); }} t="Siłownia" d="Sztanga, hantle, wyciągi, maszyny" />
        <Opt on={place === 'dom'} onClick={() => { setPlace('dom'); next(); }} t="Dom" d="Hantle, ławka, drążek lub guma" />
      </Q>}
      {step >= 4 && (
        <div className="mt24">
          <div className="bold" style={{ fontSize: 22 }}>Polecane plany</div>
          <p className="small muted mt8">Możesz później dowolnie edytować ćwiczenia, kolejność, serie, powtórzenia i ciężary.</p>
          <div className="stack mt16">
            {scored.slice(0, 3).map(({ p }, i) => <PlanCard key={p.id} t={p} score={i === 0} onOpen={() => { setProfile({ level, goal }); setOnboarded(true); push({ name: 'planDetail', id: p.id }); }} />)}
          </div>
        </div>
      )}
    </div>
  );
}
