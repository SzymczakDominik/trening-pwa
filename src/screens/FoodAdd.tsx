import { useEffect, useMemo, useRef, useState } from 'react';
import '../food.css';
import { useStore } from '../lib/store';
import { useNav } from '../nav';
import { todayStr } from '../lib/calc';
import {
  MEALS, allFoods, kcalFromMacros, lookupBarcode, mealForNow, r0, f1, recentFoods, scale, searchFoods, searchOpenFoodFacts, sumEntries,
} from '../lib/nutrition';
import { FOOD_CATEGORIES } from '../data/foods';
import { Icon, NumInput, Seg, Sheet, TopBar, toast } from '../components/ui';
import type { Food, FoodEntry, MealKey, Per100 } from '../types';

/** Pozycja gotowa do dodania do dziennika. */
export interface Pick { name: string; brand?: string; n: Per100; portion?: { label: string; g: number }; foodId?: string; barcode?: string; custom?: boolean; grams?: number; source?: Food }
const fromFood = (f: Food): Pick => ({ name: f.name, brand: f.brand, n: { kcal: f.kcal, p: f.p, c: f.c, f: f.f }, portion: f.portion, foodId: f.id, barcode: f.barcode, custom: f.custom, source: f });

const MealSeg = ({ value, onChange }: { value: MealKey; onChange: (m: MealKey) => void }) => (
  <Seg value={value} onChange={onChange} options={MEALS.map((m) => ({ v: m.k, l: m.l }))} />
);

/* ───────── ilość i posiłek: dodawanie lub edycja wpisu ───────── */
export function AmountSheet({ pick, entry, date, meal: meal0, onClose, onDone }: {
  pick: Pick | null; entry?: FoodEntry | null; date: string; meal?: MealKey; onClose: () => void; onDone?: () => void;
}) {
  const { push } = useNav();
  const add = useStore((s) => s.addFoodEntry);
  const upd = useStore((s) => s.updateFoodEntry);
  const del = useStore((s) => s.deleteFoodEntry);
  const saveFood = useStore((s) => s.saveCustomFood);
  const item = pick ?? (entry ? { name: entry.name, brand: entry.brand, n: entry.n, foodId: entry.foodId } : null);
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState<MealKey>(meal0 ?? mealForNow());

  useEffect(() => {
    if (entry) { setGrams(entry.grams); setMeal(entry.meal); }
    else if (pick) { setGrams(pick.grams ?? pick.portion?.g ?? 100); setMeal(meal0 ?? mealForNow()); }
  }, [pick, entry, meal0]);

  if (!item) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const m = scale(item.n, grams);
  const portions = [...(pick?.portion ? [{ l: `${pick.portion.label} · ${r0(pick.portion.g)} g`, g: pick.portion.g }] : []), ...[50, 100, 150, 200, 250].map((g) => ({ l: `${g} g`, g }))];
  const uniq = portions.filter((p, i) => portions.findIndex((q) => q.g === p.g) === i);

  const submit = () => {
    if (!(grams > 0)) { toast('Wpisz ilość w gramach'); return; }
    if (entry) { upd(entry.id, { grams, meal }); toast('Zapisano zmiany'); }
    else { add({ date, meal, name: item.name, brand: item.brand, grams, n: item.n, foodId: item.foodId }); toast(`Dodano: ${item.name}`); }
    onDone?.(); onClose();
  };

  return (
    <Sheet open onClose={onClose} title={item.name}>
      <div className="stack">
        {item.brand && <div className="small muted center" style={{ marginTop: -8 }}>{item.brand}</div>}
        <div className="gramsbox">
          <button className="iconbtn" aria-label="Mniej" onClick={() => setGrams(Math.max(0, grams - (grams > 100 ? 25 : 10)))}><Icon name="minus" /></button>
          <NumInput value={grams} onChange={setGrams} />
          <button className="iconbtn" aria-label="Więcej" onClick={() => setGrams(grams + (grams >= 100 ? 25 : 10))}><Icon name="plus" /></button>
        </div>
        <div className="center xs muted" style={{ marginTop: -6 }}>gramów (lub ml)</div>
        <div className="chips">{uniq.map((p) => <button key={p.l} className={`chip ${grams === p.g ? 'on' : ''}`} onClick={() => setGrams(p.g)}>{p.l}</button>)}</div>

        <div className="readout">
          <div className="kc num">{r0(m.kcal)}<small>kcal</small></div>
        </div>
        <div className="grid3">
          <div className="mac"><div className="t">Białko</div><div className="v num p-c">{f1(m.p)}<small> g</small></div></div>
          <div className="mac"><div className="t">Węgle</div><div className="v num c-c">{f1(m.c)}<small> g</small></div></div>
          <div className="mac"><div className="t">Tłuszcz</div><div className="v num f-c">{f1(m.f)}<small> g</small></div></div>
        </div>
        <div className="xs muted center num">Na 100 g: {r0(item.n.kcal)} kcal · B {f1(item.n.p)} · W {f1(item.n.c)} · T {f1(item.n.f)}</div>

        <MealSeg value={meal} onChange={setMeal} />
        <button className="btn primary lg block" onClick={submit}>{entry ? 'Zapisz zmiany' : `Dodaj do: ${MEALS.find((x) => x.k === meal)!.l.toLowerCase()}`}</button>
        {entry && <button className="btn danger block" onClick={() => { del(entry.id); toast('Usunięto wpis'); onClose(); }}><Icon name="trash" size={18} /> Usuń wpis</button>}
        {pick && !entry && !pick.custom && (
          <button className="btn ghost block sm" onClick={() => { saveFood({ id: `c-${Date.now().toString(36)}`, name: pick.name, brand: pick.brand, kcal: pick.n.kcal, p: pick.n.p, c: pick.n.c, f: pick.n.f, portion: pick.portion, barcode: pick.barcode, custom: true }); toast('Zapisano w Moich produktach'); }}>
            <Icon name="bookmark" size={16} /> Zapisz w moich produktach
          </button>
        )}
        {pick?.custom && pick.foodId && !entry && (
          <button className="btn ghost block sm" onClick={() => { onClose(); push({ name: 'foodEdit', id: pick.foodId }); }}><Icon name="edit" size={16} /> Edytuj produkt</button>
        )}
      </div>
    </Sheet>
  );
}

/** Arkusz edycji istniejącego wpisu z dziennika. */
export function EntrySheet({ entry, onClose }: { entry: FoodEntry | null; onClose: () => void }) {
  return entry ? <AmountSheet pick={null} entry={entry} date={entry.date} onClose={onClose} /> : null;
}

/* ───────── zapis posiłku z dnia ───────── */
export function SaveMealSheet({ meal, entries, onClose }: { meal: MealKey | null; entries: FoodEntry[]; onClose: () => void }) {
  const save = useStore((s) => s.saveMeal);
  const [name, setName] = useState('');
  useEffect(() => { if (meal) setName(''); }, [meal]);
  const sum = sumEntries(entries);
  return (
    <Sheet open={!!meal} onClose={onClose} title="Zapisz jako posiłek">
      <div className="stack">
        <p className="small muted center">{entries.length} produktów · {r0(sum.kcal)} kcal. Później dodasz cały posiłek jednym dotknięciem.</p>
        <label className="field"><span>Nazwa</span><input className="input" value={name} placeholder="np. Owsianka z bananem" onChange={(e) => setName(e.target.value)} /></label>
        <button className="btn primary block" disabled={!name.trim()} onClick={() => { save(name.trim(), entries.map((e) => ({ name: e.name, brand: e.brand, grams: e.grams, n: e.n, foodId: e.foodId }))); toast('Posiłek zapisany'); onClose(); }}>Zapisz</button>
      </div>
    </Sheet>
  );
}

/* ───────── szybkie kalorie ───────── */
function QuickSheet({ open, date, meal, onClose }: { open: boolean; date: string; meal: MealKey; onClose: () => void }) {
  const add = useStore((s) => s.addFoodEntry);
  const [name, setName] = useState(''); const [kcal, setKcal] = useState<number>(); const [p, setP] = useState<number>(); const [c, setC] = useState<number>(); const [f, setF] = useState<number>();
  const reset = () => { setName(''); setKcal(undefined); setP(undefined); setC(undefined); setF(undefined); };
  const k = kcal ?? (p || c || f ? Math.round(kcalFromMacros({ p: p ?? 0, c: c ?? 0, f: f ?? 0 })) : 0);
  return (
    <Sheet open={open} onClose={onClose} title="Szybkie kalorie">
      <div className="stack">
        <label className="field"><span>Nazwa (opcjonalnie)</span><input className="input" value={name} placeholder="np. Obiad u mamy" onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Kalorie (kcal)</span><NumInput value={kcal} onChange={setKcal} decimal={false} /></label>
        <div className="grid3">
          <label className="field"><span>Białko g</span><NumInput value={p} onChange={setP} /></label>
          <label className="field"><span>Węgle g</span><NumInput value={c} onChange={setC} /></label>
          <label className="field"><span>Tłuszcz g</span><NumInput value={f} onChange={setF} /></label>
        </div>
        <p className="xs muted center">Makroskładniki są opcjonalne. Bez kalorii wyliczymy je z makro.</p>
        <button className="btn primary block" disabled={!k} onClick={() => { add({ date, meal, name: name.trim() || 'Szybki wpis', grams: 100, n: { kcal: k, p: p ?? 0, c: c ?? 0, f: f ?? 0 } }); toast('Dodano'); reset(); onClose(); }}>Dodaj {k ? `${k} kcal` : ''}</button>
      </div>
    </Sheet>
  );
}

/* ───────── lista produktu ───────── */
function FoodRow({ f, onClick }: { f: { name: string; brand?: string; n: Per100; portion?: { label: string; g: number }; custom?: boolean }; onClick: () => void }) {
  return (
    <button className="frow" onClick={onClick}>
      <div className="grow">
        <div className="n">{f.name}</div>
        <div className="m num">
          {f.brand && <span>{f.brand}</span>}
          <span className="p-c">B {f1(f.n.p)}</span><span className="c-c">W {f1(f.n.c)}</span><span className="f-c">T {f1(f.n.f)}</span>
          {f.portion && <span>{f.portion.label} {r0(f.portion.g)} g</span>}
        </div>
      </div>
      <div className="kc num"><b>{r0(f.n.kcal)}</b><span>kcal/100 g</span></div>
    </button>
  );
}
const asRow = (f: Food) => ({ name: f.name, brand: f.brand, n: { kcal: f.kcal, p: f.p, c: f.c, f: f.f }, portion: f.portion, custom: f.custom });

type Tab = 'baza' | 'moje' | 'posilki' | 'ostatnie';

export function FoodAdd({ date, meal, browse }: { date: string; meal?: MealKey; browse?: boolean }) {
  const { pop, push } = useNav();
  const data = useStore((s) => s.data);
  const delMeal = useStore((s) => s.deleteMeal);
  const addMealToDay = useStore((s) => s.addMealToDay);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('baza');
  const [cat, setCat] = useState<string | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [quick, setQuick] = useState(false);
  const [mealPick, setMealPick] = useState<string | null>(null);
  const [mealTarget, setMealTarget] = useState<MealKey>(meal ?? mealForNow());
  const [off, setOff] = useState<{ state: 'idle' | 'loading' | 'ok' | 'err'; items: Food[] }>({ state: 'idle', items: [] });
  const [retry, setRetry] = useState(0);

  const foods = useMemo(() => allFoods(data), [data]);
  const query = q.trim();
  const local = useMemo(() => (query ? searchFoods(foods, query) : []), [foods, query]);

  // Open Food Facts: wyszukiwanie po krótkiej pauzie w pisaniu
  useEffect(() => {
    if (query.length < 3 || tab !== 'baza') { setOff({ state: 'idle', items: [] }); return; }
    const ctl = new AbortController();
    setOff((o) => ({ ...o, state: 'loading' }));
    const t = setTimeout(() => {
      searchOpenFoodFacts(query, ctl.signal).then((items) => setOff({ state: 'ok', items })).catch((e) => { if (e?.name !== 'AbortError') setOff({ state: 'err', items: [] }); });
    }, 550);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [query, tab, retry]);

  const mine = useMemo(() => (data.food?.customFoods ?? []).filter((f) => !f.deleted).sort((a, b) => a.name.localeCompare(b.name, 'pl')), [data]);
  const myFiltered = query ? searchFoods(mine, query) : mine;
  const recents = useMemo(() => recentFoods(data), [data]);
  const meals = (data.food?.meals ?? []).filter((m) => !m.deleted);
  const catFoods = cat ? foods.filter((f) => f.cat === cat) : [];
  const openPick = (p: Pick) => setPick(p);
  const mealTitle = meal ? MEALS.find((m) => m.k === meal)!.l : null;
  const d = date || todayStr();

  const tabs: { v: Tab; l: string }[] = [{ v: 'baza', l: 'Baza' }, { v: 'moje', l: 'Moje' }, { v: 'posilki', l: 'Posiłki' }, { v: 'ostatnie', l: 'Ostatnie' }];

  return (
    <div className="screen">
      <TopBar title={browse ? 'Biblioteka produktów' : `Dodaj: ${mealTitle ?? 'produkt'}`} onBack={pop}
        right={<button className="iconbtn" aria-label="Skanuj kod" onClick={() => push({ name: 'foodScan', date: d, meal })}><Icon name="scan" size={20} /></button>} />

      <div className="search">
        <span className="ico"><Icon name="search" size={19} /></span>
        <input className="input" placeholder="Szukaj produktu lub marki" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" autoCapitalize="none" />
        {q && <button className="iconbtn plain clr" aria-label="Wyczyść" onClick={() => setQ('')}><Icon name="close" size={18} /></button>}
      </div>

      <div className="mt12"><Seg<Tab> value={tab} onChange={(v) => { setTab(v); }} options={tabs} /></div>

      <div className="row mt12" style={{ gap: 8 }}>
        <button className="btn sm grow" onClick={() => setQuick(true)}><Icon name="zap" size={16} /> Szybkie kalorie</button>
        <button className="btn sm grow" onClick={() => push({ name: 'foodEdit', prefill: query ? { name: query } : undefined })}><Icon name="plus" size={16} /> Własny produkt</button>
      </div>

      {tab === 'baza' && (
        <>
          {!query && (
            <>
              <div className="chips mt12">
                <button className={`chip ${cat === null ? 'on' : ''}`} onClick={() => setCat(null)}>Wszystkie</button>
                {FOOD_CATEGORIES.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
              </div>
              <div className="card mt12" style={{ padding: 0, overflow: 'hidden' }}>
                {(cat ? catFoods : foods.filter((f) => !f.custom)).slice(0, cat ? 400 : 60).map((f) => <FoodRow key={f.id} f={asRow(f)} onClick={() => openPick(fromFood(f))} />)}
              </div>
              {!cat && <p className="xs muted center mt12">Pokazuję 60 z {foods.filter((f) => !f.custom).length} produktów. Wybierz kategorię albo wpisz nazwę.</p>}
            </>
          )}
          {query && (
            <>
              {local.length > 0 && <div className="card mt12" style={{ padding: 0, overflow: 'hidden' }}>{local.map((f) => <FoodRow key={f.id} f={asRow(f)} onClick={() => openPick(fromFood(f))} />)}</div>}
              {query.length < 3 && local.length === 0 && <div className="empty">Brak wyników w bibliotece. Wpisz min. 3 litery, aby szukać w Open Food Facts.</div>}
              {query.length >= 3 && (
                <>
                  <div className="sect">Open Food Facts · produkty ze sklepów</div>
                  {off.state === 'loading' && <div className="empty">Szukam…</div>}
                  {off.state === 'err' && <div className="empty">Nie udało się połączyć z Open Food Facts. Sprawdź internet – biblioteka działa offline.<br /><button className="chip mt8" onClick={() => setRetry((n) => n + 1)}>Spróbuj ponownie</button></div>}
                  {off.state === 'ok' && off.items.length === 0 && <div className="empty">Nic nie znaleziono. Możesz dodać własny produkt.</div>}
                  {off.items.length > 0 && <div className="card" style={{ padding: 0, overflow: 'hidden' }}>{off.items.map((f) => <FoodRow key={f.id} f={asRow(f)} onClick={() => openPick(fromFood(f))} />)}</div>}
                </>
              )}
            </>
          )}
        </>
      )}

      {tab === 'moje' && (
        myFiltered.length ? (
          <div className="card mt12" style={{ padding: 0, overflow: 'hidden' }}>{myFiltered.map((f) => <FoodRow key={f.id} f={asRow(f)} onClick={() => openPick(fromFood(f))} />)}</div>
        ) : <div className="empty">Nie masz jeszcze własnych produktów.<br />Dodaj produkt z etykiety albo zapisz wynik z Open Food Facts.</div>
      )}

      {tab === 'ostatnie' && (
        recents.length ? (
          <div className="card mt12" style={{ padding: 0, overflow: 'hidden' }}>
            {recents.filter((r) => !query || searchFoods([{ id: 'x', name: r.name, brand: r.brand, kcal: 0, p: 0, c: 0, f: 0 }], query).length).map((r, i) => (
              <FoodRow key={i} f={r} onClick={() => openPick({ name: r.name, brand: r.brand, n: r.n, foodId: r.foodId, grams: r.grams })} />
            ))}
          </div>
        ) : <div className="empty">Tu pojawią się produkty, które ostatnio dodawałeś.</div>
      )}

      {tab === 'posilki' && (
        meals.length ? (
          <div className="stack mt12">
            {meals.map((m) => {
              const sum = sumEntries(m.items);
              return (
                <div key={m.id} className="card row">
                  <button className="grow" style={{ textAlign: 'left' }} onClick={() => setMealPick(m.id)}>
                    <div className="bold">{m.name}</div>
                    <div className="xs muted num">{m.items.length} prod. · {r0(sum.kcal)} kcal · B {r0(sum.p)} · W {r0(sum.c)} · T {r0(sum.f)}</div>
                  </button>
                  <button className="iconbtn" aria-label="Usuń posiłek" onClick={() => { delMeal(m.id); toast('Usunięto posiłek'); }}><Icon name="trash" size={18} /></button>
                </div>
              );
            })}
          </div>
        ) : <div className="empty">Zapisane posiłki to Twoje stałe zestawy.<br />Na ekranie dziennika dotknij zakładki przy posiłku, aby zapisać jego skład.</div>
      )}

      <AmountSheetHost pick={pick} setPick={setPick} date={d} meal={meal} />
      <QuickSheet open={quick} date={d} meal={meal ?? mealForNow()} onClose={() => setQuick(false)} />
      <Sheet open={!!mealPick} onClose={() => setMealPick(null)} title="Dodaj posiłek">
        <div className="stack">
          <p className="small muted center">{meals.find((m) => m.id === mealPick)?.name}</p>
          <MealSeg value={mealTarget} onChange={setMealTarget} />
          <button className="btn primary lg block" onClick={() => { addMealToDay(mealPick!, d, mealTarget); toast('Dodano posiłek'); setMealPick(null); pop(); }}>Dodaj do dziennika</button>
        </div>
      </Sheet>
    </div>
  );
}

function AmountSheetHost({ pick, setPick, date, meal }: { pick: Pick | null; setPick: (p: Pick | null) => void; date: string; meal?: MealKey }) {
  return pick ? <AmountSheet pick={pick} date={date} meal={meal} onClose={() => setPick(null)} /> : null;
}

/* ───────── własny produkt ───────── */
export function FoodEdit({ id, prefill }: { id?: string; prefill?: Partial<Food> }) {
  const { pop } = useNav();
  const foods = useStore((s) => s.data.food?.customFoods ?? []);
  const save = useStore((s) => s.saveCustomFood);
  const del = useStore((s) => s.deleteCustomFood);
  const ex = id ? foods.find((f) => f.id === id) : undefined;
  const init = { ...prefill, ...ex };
  const [name, setName] = useState(init.name ?? '');
  const [brand, setBrand] = useState(init.brand ?? '');
  const [kcal, setKcal] = useState<number | undefined>(init.kcal);
  const [p, setP] = useState<number | undefined>(init.p);
  const [c, setC] = useState<number | undefined>(init.c);
  const [f, setF] = useState<number | undefined>(init.f);
  const [pg, setPg] = useState<number | undefined>(init.portion?.g);
  const [pl, setPl] = useState(init.portion?.label ?? '');
  const [code, setCode] = useState(init.barcode ?? '');
  const calc = Math.round(kcalFromMacros({ p: p ?? 0, c: c ?? 0, f: f ?? 0 }));
  const mismatch = kcal != null && kcal > 0 && (p || c || f) && Math.abs(calc - kcal) > Math.max(25, kcal * 0.25);
  const ok = name.trim() && (kcal != null) && kcal >= 0 && kcal <= 900;

  return (
    <div className="screen">
      <TopBar title={ex ? 'Edytuj produkt' : 'Własny produkt'} onBack={pop} />
      <div className="stack">
        <label className="field"><span>Nazwa</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Domowy hummus" /></label>
        <label className="field"><span>Marka (opcjonalnie)</span><input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} /></label>
        <div className="sect" style={{ margin: '8px 0 0' }}>Wartości na 100 g</div>
        <label className="field"><span>Kalorie (kcal)</span><NumInput value={kcal} onChange={setKcal} /></label>
        <div className="grid3">
          <label className="field"><span>Białko g</span><NumInput value={p} onChange={setP} /></label>
          <label className="field"><span>Węgle g</span><NumInput value={c} onChange={setC} /></label>
          <label className="field"><span>Tłuszcz g</span><NumInput value={f} onChange={setF} /></label>
        </div>
        {mismatch && <div className="hint">Z makroskładników wychodzi ok. {calc} kcal – sprawdź, czy przepisałeś dane z etykiety poprawnie.</div>}
        <div className="sect" style={{ margin: '8px 0 0' }}>Typowa porcja (opcjonalnie)</div>
        <div className="grid2">
          <label className="field"><span>Nazwa porcji</span><input className="input" value={pl} onChange={(e) => setPl(e.target.value)} placeholder="np. kubek" /></label>
          <label className="field"><span>Gramy</span><NumInput value={pg} onChange={setPg} /></label>
        </div>
        <label className="field"><span>Kod kreskowy (opcjonalnie)</span><NumInput value={code ? Number(code) : undefined} onChange={(n) => setCode(n ? String(n) : '')} decimal={false} placeholder="EAN" /></label>
        <button className="btn primary lg block mt12" disabled={!ok} onClick={() => {
          save({ id: ex?.id ?? `c-${Date.now().toString(36)}`, name: name.trim(), brand: brand.trim() || undefined, kcal: kcal ?? 0, p: p ?? 0, c: c ?? 0, f: f ?? 0, portion: pg && pg > 0 ? { label: pl.trim() || 'porcja', g: pg } : undefined, barcode: code || undefined, custom: true });
          toast(ex ? 'Zapisano produkt' : 'Dodano do Moich produktów'); pop();
        }}>Zapisz produkt</button>
        {ex && <button className="btn danger block" onClick={() => { del(ex.id); toast('Usunięto produkt'); pop(); }}><Icon name="trash" size={18} /> Usuń produkt</button>}
      </div>
    </div>
  );
}

/* ───────── skaner kodów kreskowych ───────── */
export function FoodScan({ date, meal }: { date: string; meal?: MealKey }) {
  const { pop, push } = useNav();
  const customFoods = useStore((s) => s.data.food?.customFoods);
  const videoRef = useRef<HTMLVideoElement>(null);
  const busy = useRef(false);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'denied' | 'lookup'>('starting');
  const [manual, setManual] = useState('');
  const [found, setFound] = useState<Pick | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [net, setNet] = useState(false);

  const handle = async (code: string) => {
    if (busy.current) return; busy.current = true; setStatus('lookup'); setNet(false);
    try { navigator.vibrate?.(30); } catch { /* brak */ }
    const mine = customFoods?.find((x) => x.barcode === code && !x.deleted);
    try {
      const fd = mine ?? await lookupBarcode(code);
      if (fd) setFound(fromFood(fd)); else setMissing(code);
    } catch { setNet(true); setMissing(code); }
    setStatus('scanning');
  };

  useEffect(() => {
    let stop: (() => void) | undefined; let dead = false;
    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
        const hints = new Map(); hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
        const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } }, videoRef.current!, (res) => { if (res && !busy.current) handle(res.getText()); });
        if (dead) controls.stop(); else { stop = () => controls.stop(); setStatus('scanning'); }
      } catch { if (!dead) setStatus('denied'); }
    })();
    return () => { dead = true; stop?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeFound = () => { setFound(null); busy.current = false; };
  const closeMissing = () => { setMissing(null); busy.current = false; };

  return (
    <div className="scanner">
      <video ref={videoRef} playsInline muted autoPlay />
      <div className="scan-top"><button className="iconbtn" aria-label="Zamknij" onClick={pop}><Icon name="back" /></button><h2>Skanuj kod kreskowy</h2></div>
      <div className="scan-frame" />
      <div className="scan-bottom">
        {status === 'denied' ? (
          <p>Nie mam dostępu do aparatu. Zezwól na aparat w ustawieniach przeglądarki (Safari → aA → Ustawienia witryny) lub wpisz kod ręcznie.</p>
        ) : <p>{status === 'starting' ? 'Uruchamiam aparat…' : status === 'lookup' ? 'Szukam produktu…' : 'Ustaw kod kreskowy w ramce'}</p>}
        <div className="row" style={{ gap: 8 }}>
          <input className="input" inputMode="numeric" placeholder="Albo wpisz kod EAN" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))} style={{ background: 'rgba(0,0,0,.55)' }} />
          <button className="btn primary" style={{ flex: 'none' }} disabled={manual.length < 8} onClick={() => handle(manual)}>Szukaj</button>
        </div>
      </div>

      <AmountSheet pick={found} date={date} meal={meal} onClose={closeFound} onDone={pop} />
      <Sheet open={!!missing} onClose={closeMissing} title={net ? 'Brak połączenia' : 'Nie znaleziono produktu'}>
        <div className="stack">
          <p className="small muted center">{net ? 'Nie udało się sprawdzić kodu w Open Food Facts. Sprawdź internet i spróbuj ponownie.' : `Kodu ${missing} nie ma jeszcze w bazie. Możesz dodać produkt ręcznie z etykiety – następnym razem skan go rozpozna.`}</p>
          {!net && <button className="btn primary block" onClick={() => { const code = missing!; closeMissing(); push({ name: 'foodEdit', prefill: { barcode: code } }); }}>Dodaj produkt z etykiety</button>}
          <button className="btn ghost block" onClick={closeMissing}>Skanuj dalej</button>
        </div>
      </Sheet>
    </div>
  );
}
