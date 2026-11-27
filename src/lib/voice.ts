import type { Food } from '../types';
import { norm, searchFoods } from './nutrition';

/** Wynik rozpoznania jednej pozycji z dyktowanego zdania. */
export interface VoiceItem { text: string; food?: Food; grams: number; found: boolean }

const NUM_WORDS: Record<string, number> = {
  pol: 0.5, pół: 0.5, jeden: 1, jedna: 1, jedno: 1, jedną: 1, dwa: 2, dwie: 2, dwoch: 2, trzy: 3, cztery: 4, piec: 5, pięć: 5,
  szesc: 6, sześć: 6, siedem: 7, osiem: 8, dziewiec: 9, dziewięć: 9, dziesiec: 10, dziesięć: 10, kilka: 3,
};
const w = (s: string) => norm(s);
const NUM_NORM: Record<string, number> = Object.fromEntries(Object.entries(NUM_WORDS).map(([k, v]) => [w(k), v]));

/** Jednostki: gramy na jednostkę (ml liczymy jak g). */
const UNITS: [RegExp, number | 'piece'][] = [
  [/^(kg|kilogram\w*|kilo)$/, 1000], [/^(dag|dekagram\w*|deko)$/, 10], [/^(g|gr|gram\w*)$/, 1],
  [/^(l|litr\w*)$/, 1000], [/^(ml|mililitr\w*)$/, 1],
  [/^szklank\w*$/, 250], [/^kubek\w*$|^kubk\w*$/, 250], [/^lyzk\w+$/, 15], [/^lyzeczk\w*$/, 5],
  [/^(porcj\w*|sztuk\w*|szt|kawalk\w*|plast\w*|kromk\w*|plasterk\w*)$/, 'piece'],
];

function qty(tokens: string[]): { amount: number; unit?: number | 'piece'; rest: string[] } {
  let amount: number | undefined; let unit: number | 'piece' | undefined; const rest: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const asNum = Number(t.replace(',', '.'));
    if (amount === undefined && t !== '' && Number.isFinite(asNum)) { amount = asNum; continue; }
    const m = t.match(/^(\d+(?:[.,]\d+)?)(kg|g|gr|ml|l|dag)$/);
    if (amount === undefined && m) { amount = Number(m[1].replace(',', '.')); unit = UNITS.find(([r]) => r.test(m[2]))?.[1]; continue; }
    if (amount === undefined && t in NUM_NORM) { amount = NUM_NORM[t]; continue; }
    if (unit === undefined && amount !== undefined) { const u = UNITS.find(([r]) => r.test(t)); if (u) { unit = u[1]; continue; } }
    rest.push(t);
  }
  return { amount: amount ?? 1, unit, rest };
}

const STOP = new Set(['i', 'z', 'ze', 'na', 'do', 'oraz', 'plus', 'a', 'jeszcze', 'zjadlem', 'zjadlam', 'wypilem', 'wypilam', 'zjadl', 'mialem', 'mialam', 'dzisiaj', 'dzis', 'rano', 'potem', 'tez', 'okolo', 'ok', 'troche', 'moze', 'gramow', 'gramy']);

/** Prosta odmiana → mianownik: usuwa końcówki, żeby „jajka/jajko/jajek” trafiały w to samo. */
const stem = (t: string) => (t.length > 5 ? t.slice(0, -2) : t.length > 3 ? t.slice(0, -1) : t);

/** Z kilku trafień wybiera to, co człowiek najpewniej miał na myśli: prosty produkt, w stanie „do zjedzenia". */
function pickBest(list: Food[], said: Set<string>): Food {
  const saidRaw = [...said].some((t) => /^(surow|such|sucha|suche|suchy)/.test(t));
  const score = (f: Food, i: number) => {
    const n = norm(f.name);
    let sc = i * 0.05;
    if (f.cat === 'Dania gotowe' || f.cat === 'Słodycze i przekąski') sc += 3;
    if (/ na | z | ze | w /.test(` ${n} `)) sc += 2;
    if (/gotowan|pieczon|smazon/.test(n) && !saidRaw) sc -= 1;
    if (/surow|such/.test(n) && !saidRaw) sc += 0.5;
    if (f.custom) sc -= 2;
    sc += n.split(' ').length * 0.1;
    return sc;
  };
  return list.map((f, i) => [score(f, i), f] as const).sort((a, b) => a[0] - b[0])[0][1];
}

export function parseMeal(text: string, foods: Food[]): VoiceItem[] {
  const parts = text.split(/[,;\n]+|\s+(?:i|oraz|plus|potem|jeszcze)\s+/i).map((s) => s.trim()).filter(Boolean);
  const out: VoiceItem[] = [];
  for (const part of parts) {
    const tokens = w(part).split(' ').filter(Boolean);
    const { amount, unit, rest } = qty(tokens);
    const words = rest.filter((t) => !STOP.has(t));
    if (!words.length) continue;
    // próbujemy pełnych słów, potem rdzeni, potem pojedynczych słów
    const tries = [words.join(' '), words.map(stem).join(' '), ...words.map(stem)];
    let food: Food | undefined;
    const said = new Set(words);
    for (const q of tries) { const r = searchFoods(foods, q, 25); if (r.length) { food = pickBest(r, said); break; } }
    const portion = food?.portion?.g ?? 100;
    let grams: number;
    if (unit === undefined) grams = amount > 20 ? amount : amount * (food?.portion?.g ?? 100); // „200 ryżu” = gramy, „2 jajka” = sztuki
    else if (unit === 'piece') grams = amount * portion;
    else grams = amount * unit;
    out.push({ text: part, food, grams: Math.round(grams), found: !!food });
  }
  return out;
}
