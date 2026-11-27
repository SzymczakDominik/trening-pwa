import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { allFoods, entryMacros, r0 } from '../lib/nutrition';
import { parseMeal, type VoiceItem } from '../lib/voice';
import { Icon, NumInput, Sheet, toast } from '../components/ui';
import type { MealKey } from '../types';

/** Dyktowanie posiłku: tekst z klawiatury (mikrofon iOS) → rozpoznane produkty → zatwierdzenie. */
export function VoiceSheet({ open, date, meal, onClose }: { open: boolean; date: string; meal: MealKey; onClose: () => void }) {
  const data = useStore((s) => s.data);
  const add = useStore((s) => s.addFoodEntry);
  const [text, setText] = useState('');
  const [items, setItems] = useState<VoiceItem[] | null>(null);
  const foods = useMemo(() => allFoods(data), [data]);

  const close = () => { setText(''); setItems(null); onClose(); };
  const ok = items?.filter((i) => i.found && i.grams > 0) ?? [];
  const kcal = ok.reduce((a, i) => a + entryMacros({ n: { kcal: i.food!.kcal, p: i.food!.p, c: i.food!.c, f: i.food!.f }, grams: i.grams }).kcal, 0);

  return (
    <Sheet open={open} onClose={close} title="Dyktuj posiłek">
      <div className="stack">
        {!items ? (<>
          <p className="small muted">Dotknij pola, potem <b>mikrofonu na klawiaturze iPhone'a</b> i powiedz, co zjadłeś, np. „200 gramów ryżu, dwa jajka i banan”. Możesz też wpisać ręcznie.</p>
          <textarea className="input" rows={4} value={text} placeholder="Co zjadłeś?" onChange={(e) => setText(e.target.value)} style={{ height: 'auto', padding: 12 }} />
          <button className="btn primary block" disabled={!text.trim()} onClick={() => setItems(parseMeal(text, foods))}><Icon name="mic" size={18} /> Rozpoznaj</button>
        </>) : (<>
          {items.length === 0 && <p className="small muted">Nie rozpoznałem żadnych produktów. Spróbuj powiedzieć wyraźniej lub wpisz nazwy.</p>}
          {items.map((it, i) => (
            <div key={i} className="card2" style={{ padding: 12 }}>
              <div className="row between">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="bold">{it.found ? it.food!.name : `Nie znaleziono: „${it.text}"`}</div>
                  {it.found && <div className="xs muted num">{r0(entryMacros({ n: { kcal: it.food!.kcal, p: it.food!.p, c: it.food!.c, f: it.food!.f }, grams: it.grams }).kcal)} kcal</div>}
                </div>
                <button className="iconbtn" aria-label="Usuń" onClick={() => setItems(items.filter((_, j) => j !== i))}><Icon name="close" size={18} /></button>
              </div>
              {it.found && <label className="field mt8"><span>Ilość (g)</span><NumInput value={it.grams} decimal={false} onChange={(n) => setItems(items.map((x, j) => (j === i ? { ...x, grams: n } : x)))} /></label>}
            </div>
          ))}
          <button className="btn primary block" disabled={!ok.length} onClick={() => {
            ok.forEach((i) => add({ date, meal, name: i.food!.name, brand: i.food!.brand, grams: i.grams, n: { kcal: i.food!.kcal, p: i.food!.p, c: i.food!.c, f: i.food!.f }, foodId: i.food!.id }));
            toast(`Dodano ${ok.length} ${ok.length === 1 ? 'pozycję' : 'pozycje'}`); close();
          }}>Dodaj {ok.length ? `(${r0(kcal)} kcal)` : ''}</button>
          <button className="btn block ghost" onClick={() => setItems(null)}>Wróć do dyktowania</button>
        </>)}
      </div>
    </Sheet>
  );
}
