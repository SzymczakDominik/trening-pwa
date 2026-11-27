import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import '../food.css';
import { useStore } from '../lib/store';
import { useNav } from '../nav';
import { addDays, DAY_SHORT, fromStr, mondayOf, MONTHS_GEN, todayStr, DAY_LONG, weekday, workoutKcal } from '../lib/calc';
import { ACTIVITY, MEALS, MODES, computeGoals, dayEntries, dayWater, entryMacros, r0, sumEntries } from '../lib/nutrition';
import { Icon, NumInput, Ring, Seg, Sheet, Stepper, TopBar, kgFmt, toast } from '../components/ui';
import { EntrySheet, SaveMealSheet } from './FoodAdd';
import type { Activity, DietMode, FoodEntry, MealKey } from '../types';

const lastWeight = (body: { date: string; weight?: number; deleted?: boolean }[], upTo: string) =>
  [...body].filter((b) => !b.deleted && b.weight && b.date <= upTo).sort((a, b) => a.date.localeCompare(b.date)).pop()?.weight;

function dayLabel(date: string) {
  const t = todayStr();
  if (date === t) return 'Dziś';
  if (date === addDays(t, -1)) return 'Wczoraj';
  if (date === addDays(t, 1)) return 'Jutro';
  return DAY_LONG[weekday(date)].replace(/^./, (c) => c.toUpperCase());
}
const dateLine = (date: string) => { const d = fromStr(date); return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; };

export function FoodScreen() {
  const { push } = useNav();
  const data = useStore((s) => s.data);
  const addWater = useStore((s) => s.addWater);
  const addBody = useStore((s) => s.addBody);
  const copyEntries = useStore((s) => s.copyEntries);
  const [date, setDate] = useState(todayStr());
  const [edit, setEdit] = useState<FoodEntry | null>(null);
  const [saveFor, setSaveFor] = useState<MealKey | null>(null);

  const entries = useMemo(() => dayEntries(data, date), [data, date]);
  const weight = lastWeight(data.body, date);
  const plan = data.food?.plan;
  const goals = computeGoals(data.profile, weight, plan);
  const total = sumEntries(entries);
  const water = dayWater(data, date);
  const todayWeight = data.body.find((b) => b.date === date && !b.deleted)?.weight;

  const week = useMemo(() => { const m = mondayOf(date); return Array.from({ length: 7 }, (_, i) => addDays(m, i)); }, [date]);
  const hasData = (d: string) => (data.food?.entries ?? []).some((e) => e.date === d && !e.deleted);

  const burned = data.sessions.filter((x) => x.date === date).reduce((a, x) => a + workoutKcal(x, weight ?? 75), 0);
  const left = goals ? goals.kcal - total.kcal : 0;
  const pct = goals ? total.kcal / goals.kcal : 0;
  const over = goals ? left < 0 : false;

  const macro = (k: 'p' | 'c' | 'f', label: string, color: string) => {
    const v = total[k], g = goals?.[k];
    return (
      <div className="mac">
        <div className="t">{label}</div>
        <div className="v num">{r0(v)}<small>{g ? ` / ${g} g` : ' g'}</small></div>
        <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, g ? (v / g) * 100 : 0)}%` }} transition={{ type: 'spring', damping: 24, stiffness: 160 }} style={{ background: g && v > g * 1.1 ? 'var(--danger)' : color }} /></div>
      </div>
    );
  };

  const yesterdayIds = (m: MealKey) => dayEntries(data, addDays(date, -1)).filter((e) => e.meal === m).map((e) => e.id);

  return (
    <div className="screen">
      <div className="between">
        <h1 className="title">Żywienie</h1>
        <div className="row" style={{ gap: 8 }}>
          <button className="iconbtn" aria-label="Biblioteka produktów" onClick={() => push({ name: 'foodAdd', date, browse: true })}><Icon name="search" size={19} /></button>
          <button className="iconbtn" aria-label="Cele" onClick={() => push({ name: 'foodSetup' })}><Icon name="target" size={19} /></button>
        </div>
      </div>

      <div className="fdate mt12">
        <button className="iconbtn" aria-label="Poprzedni dzień" onClick={() => setDate(addDays(date, -1))}><Icon name="back" /></button>
        <div className="lab"><b>{dayLabel(date)}</b><span>{dateLine(date)}</span></div>
        <button className="iconbtn" aria-label="Następny dzień" onClick={() => setDate(addDays(date, 1))}><Icon name="right" /></button>
      </div>
      <div className="fweek">
        {week.map((d, i) => (
          <button key={d} className={d === date ? 'on' : ''} onClick={() => setDate(d)}>
            {DAY_SHORT[i]}<b>{fromStr(d).getDate()}</b><i className={hasData(d) ? 'has' : ''} />
          </button>
        ))}
      </div>

      <div className="card fhero">
        <div className="frings">
        <Ring value={pct} size={176} stroke={14} color={over ? 'var(--danger)' : 'var(--accent)'}>
          {goals ? (
            <>
              <div className="big num">{Math.abs(r0(left))}</div>
              <div className="cap">{over ? 'kcal ponad cel' : 'kcal zostało'}</div>
            </>
          ) : (
            <>
              <div className="big num">{r0(total.kcal)}</div>
              <div className="cap">kcal</div>
            </>
          )}
        </Ring>
        <Ring value={burned / 500} size={84} stroke={9} color="var(--violet)">
          <div className="num bold" style={{ fontFamily: 'var(--display)', fontSize: 20, lineHeight: 1 }}>{r0(burned)}</div>
          <div className="xs muted" style={{ marginTop: 2 }}>spalone</div>
        </Ring>
        </div>
        <div className="xs muted center" style={{ marginTop: -4 }}>Spalone: szacunek z treningu w aplikacji{burned ? '' : ' (brak treningu tego dnia)'}</div>
        <div className="fsub">
          <div><b className="num">{r0(total.kcal)}</b><span>Zjedzone</span></div>
          <div><b className="num">{goals ? goals.kcal : '—'}</b><span>Cel</span></div>
          <div><b className="num">{goals ? r0(Math.max(0, left)) : '—'}</b><span>Zostało</span></div>
        </div>
      </div>

      {!goals && (
        <button className="card mt12 row" style={{ width: '100%', textAlign: 'left', borderColor: 'rgba(200,245,96,.35)' }} onClick={() => push({ name: 'foodSetup' })}>
          <div className="badge"><Icon name="target" size={18} /></div>
          <div className="grow"><div className="bold">Ustaw dzienny cel</div><div className="small muted">4 krótkie kroki – wyliczymy kcal, białko, węgle i tłuszcz</div></div>
          <Icon name="right" />
        </button>
      )}

      <div className="grid3 mt12">
        {macro('p', 'Białko', 'var(--prot)')}
        {macro('c', 'Węgle', 'var(--carb)')}
        {macro('f', 'Tłuszcz', 'var(--fat)')}
      </div>

      <div className="stack mt16">
        {MEALS.map((m) => {
          const es = entries.filter((e) => e.meal === m.k);
          const sum = sumEntries(es);
          const prev = yesterdayIds(m.k);
          return (
            <motion.div key={m.k} layout className="card meal">
              <div className="meal-h">
                <div className="ico">{m.icon}</div>
                <div className="grow">
                  <div className="bold" style={{ fontSize: 17 }}>{m.l}</div>
                  <div className="xs muted num">{es.length ? `B ${r0(sum.p)} · W ${r0(sum.c)} · T ${r0(sum.f)} g` : 'Nic tu jeszcze nie ma'}</div>
                </div>
                <div className="kc num">{es.length ? r0(sum.kcal) : '—'}<div className="xs muted" style={{ fontWeight: 600, fontFamily: 'var(--font)' }}>kcal</div></div>
              </div>
              <AnimatePresence initial={false}>
                {es.map((e) => {
                  const mc = entryMacros(e);
                  return (
                    <motion.button key={e.id} className="erow" onClick={() => setEdit(e)} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                      <div className="grow">
                        <div className="n">{e.name}</div>
                        <div className="m num">{r0(e.grams)} g · <span className="p-c">B {r0(mc.p)}</span> · <span className="c-c">W {r0(mc.c)}</span> · <span className="f-c">T {r0(mc.f)}</span></div>
                      </div>
                      <div className="k num">{r0(mc.kcal)}</div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
              <div className="meal-add">
                <button className="btn sm primary" onClick={() => push({ name: 'foodAdd', date, meal: m.k })}><Icon name="plus" size={18} /> Dodaj</button>
                <button className="btn sm" onClick={() => push({ name: 'foodScan', date, meal: m.k })}><Icon name="scan" size={18} /> Skanuj</button>
                {es.length > 0
                  ? <button className="btn sm ghost" style={{ flex: 'none', width: 46, padding: 0 }} aria-label="Zapisz jako posiłek" onClick={() => setSaveFor(m.k)}><Icon name="bookmark" size={18} /></button>
                  : prev.length > 0 && <button className="btn sm ghost" style={{ flex: 'none', padding: '0 12px' }} onClick={() => { copyEntries(prev, date); toast('Skopiowano z wczoraj'); }}><Icon name="copy" size={16} /> Wczoraj</button>}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="section-h"><h2>Woda</h2><span className="small muted num">{(water / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 2 })} / {((goals?.waterMl ?? 2500) / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 2 })} l</span></div>
      <div className="card stack">
        <div className="water-bar"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, (water / (goals?.waterMl ?? 2500)) * 100)}%` }} transition={{ type: 'spring', damping: 22, stiffness: 140 }} /></div>
        <div className="wbtns">
          <button className="btn ghost" aria-label="Odejmij szklankę" onClick={() => addWater(date, -250)}><Icon name="minus" size={18} /></button>
          {[200, 250, 500].map((ml) => <button key={ml} className="btn" onClick={() => addWater(date, ml)}><Icon name="drop" size={16} />{ml} ml</button>)}
        </div>
      </div>

      <div className="section-h"><h2>Waga ciała</h2><span className="small muted">{todayWeight ? 'zapisana' : weight ? `ostatnio ${kgFmt(weight)} kg` : ''}</span></div>
      <div className="card between">
        <div className="row"><div className="badge"><Icon name="scale" size={18} /></div><div><div className="bold">{dayLabel(date)}</div><div className="xs muted">Dotknij +/−, aby zapisać</div></div></div>
        <Stepper value={todayWeight ?? weight ?? 70} step={0.1} min={30} max={300} suffix=" kg" onChange={(n) => addBody({ date, weight: n })} />
      </div>

      <EntrySheet entry={edit} onClose={() => setEdit(null)} />
      <SaveMealSheet meal={saveFor} entries={entries.filter((e) => e.meal === saveFor)} onClose={() => setSaveFor(null)} />
    </div>
  );
}

/* ───────── kreator celów (krok po kroku) ───────── */
export function FoodSetup() {
  const { pop } = useNav();
  const data = useStore((s) => s.data);
  const setProfile = useStore((s) => s.setProfile);
  const addBody = useStore((s) => s.addBody);
  const setPlan = useStore((s) => s.setNutritionPlan);
  const prof = data.profile;
  const old = data.food?.plan;
  const w0 = lastWeight(data.body, todayStr());

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [mode, setMode] = useState<DietMode>(old?.mode ?? (prof.goal === 'masa' ? 'mass' : 'keep'));
  const [act, setAct] = useState<Activity>(old?.activity ?? 1.55);
  const [sex, setSex] = useState(prof.sex);
  const [age, setAge] = useState<number | undefined>(prof.age);
  const [height, setHeight] = useState<number | undefined>(prof.height);
  const [weight, setWeight] = useState<number | undefined>(w0);
  const [kcalAdj, setKcalAdj] = useState<number | undefined>(old?.kcal);
  const [sheet, setSheet] = useState(false);

  const body = !!(age && height && weight);
  const auto = computeGoals({ ...prof, sex, age, height }, weight, { mode, activity: act, updatedAt: 0 });
  const goals = computeGoals({ ...prof, sex, age, height }, weight, { mode, activity: act, kcal: kcalAdj, updatedAt: 0 });
  const total = 4;
  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); window.scrollTo(0, 0); };
  const canNext = step !== 2 || body;

  const finish = () => {
    setProfile({ sex, age, height });
    if (weight && weight !== w0) addBody({ date: todayStr(), weight });
    setPlan({ mode, activity: act, kcal: kcalAdj });
    toast('Cele zapisane');
    pop();
  };

  const stepsUi = [
    <div key="mode" className="stack">
      <h2 className="pname">Jaki masz cel?</h2>
      <p className="small muted center">Od tego zależy, ile kalorii możesz zjeść dziennie.</p>
      {MODES.map((m) => (
        <button key={m.v} className={`opt ${mode === m.v ? 'on' : ''}`} onClick={() => setMode(m.v)}>
          <span className="dotr">{mode === m.v && <Icon name="check" size={14} stroke={3} />}</span>
          <div className="grow"><div className="bold">{m.l}</div><div className="small muted">{m.d}</div></div>
        </button>
      ))}
    </div>,
    <div key="act" className="stack">
      <h2 className="pname">Jak bardzo jesteś aktywny?</h2>
      <p className="small muted center">Wliczając pracę, codzienny ruch i treningi.</p>
      {ACTIVITY.map((a) => (
        <button key={a.v} className={`opt ${act === a.v ? 'on' : ''}`} onClick={() => setAct(a.v)}>
          <span className="dotr">{act === a.v && <Icon name="check" size={14} stroke={3} />}</span>
          <div className="grow"><div className="bold">{a.l}</div><div className="small muted">{a.d}</div></div>
        </button>
      ))}
    </div>,
    <div key="body" className="stack">
      <h2 className="pname">Twoje dane</h2>
      <p className="small muted center">Potrzebne tylko do obliczeń, zostają w Twojej aplikacji.</p>
      <Seg value={sex} onChange={setSex} options={[{ v: 'm', l: 'Mężczyzna' }, { v: 'k', l: 'Kobieta' }]} />
      <div className="grid3">
        <label className="field"><span>Wiek</span><NumInput value={age} onChange={setAge} decimal={false} placeholder="lat" /></label>
        <label className="field"><span>Wzrost cm</span><NumInput value={height} onChange={setHeight} decimal={false} placeholder="cm" /></label>
        <label className="field"><span>Waga kg</span><NumInput value={weight} onChange={setWeight} placeholder="kg" /></label>
      </div>
      {!body && <div className="hint">Uzupełnij wszystkie trzy pola, aby przejść dalej.</div>}
    </div>,
    <div key="sum" className="stack">
      <h2 className="pname">Twój dzienny plan</h2>
      {goals && auto && (
        <>
          <div className="result">
            <b className="num">{goals.kcal}</b>
            <div className="bold">kcal dziennie</div>
            <div className="small muted mt8">Zapotrzebowanie: {goals.tdee} kcal · {mode === 'red' ? 'deficyt ok. 15%' : mode === 'mass' ? 'nadwyżka ok. 10%' : 'bilans zerowy'}</div>
          </div>
          <div className="grid3">
            <div className="mac"><div className="t">Białko</div><div className="v num p-c">{goals.p}<small> g</small></div></div>
            <div className="mac"><div className="t">Węgle</div><div className="v num c-c">{goals.c}<small> g</small></div></div>
            <div className="mac"><div className="t">Tłuszcz</div><div className="v num f-c">{goals.f}<small> g</small></div></div>
          </div>
          <div className="card2 between">
            <div><div className="bold">Woda</div><div className="xs muted">ok. 35 ml na kg masy ciała</div></div>
            <div className="bold num">{(goals.waterMl / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 2 })} l</div>
          </div>
          <button className="btn block ghost" onClick={() => setSheet(true)}><Icon name="edit" size={18} /> Zmień kalorie ręcznie</button>
          <p className="xs muted center">To punkt wyjścia. Jeśli po 2–3 tygodniach waga nie zmienia się tak, jak chcesz, popraw cel o 100–200 kcal.</p>
        </>
      )}
    </div>,
  ];

  return (
    <div className="screen">
      <TopBar title="Cele żywieniowe" onBack={step === 0 ? pop : () => go(step - 1)} />
      <div className="segs mb8" style={{ marginBottom: 18 }}>
        {Array.from({ length: total }, (_, i) => <i key={i} className={i === step ? 'cur' : ''}><b style={{ width: i < step ? '100%' : '0%' }} /></i>)}
      </div>
      <div className="stepwrap">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div key={step} custom={dir}
            initial={{ opacity: 0, x: dir * 36 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -36 }}
            transition={{ duration: 0.2 }}>
            {stepsUi[step]}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt24">
        {step < total - 1
          ? <button className="btn primary lg block" disabled={!canNext} onClick={() => go(step + 1)}>Dalej</button>
          : <button className="btn primary lg block" onClick={finish}>Zapisz plan</button>}
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Dzienne kalorie">
        <div className="stack">
          <div className="center"><Stepper value={goals?.kcal ?? 2000} step={50} min={1000} max={6000} suffix=" kcal" onChange={(n) => setKcalAdj(n)} /></div>
          <p className="xs muted center">Wyliczone automatycznie: {auto?.kcal} kcal. Białko, węgle i tłuszcz dopasują się do nowego celu.</p>
          <button className="btn block ghost" onClick={() => { setKcalAdj(undefined); setSheet(false); }}>Wróć do wyliczonej wartości</button>
          <button className="btn primary block" onClick={() => setSheet(false)}>Gotowe</button>
        </div>
      </Sheet>
    </div>
  );
}
