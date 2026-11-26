import type { Activity, AppData, DietMode, Food, FoodData, FoodEntry, MealKey, NutritionPlan, Per100, Profile } from '../types';
import { BUILTIN_FOODS } from '../data/foods';

export const emptyFood = (): FoodData => ({ entries: [], customFoods: [], meals: [], water: [] });

export const MEALS: { k: MealKey; l: string; icon: string }[] = [
  { k: 'sniadanie', l: 'Śniadanie', icon: '🌅' },
  { k: 'obiad', l: 'Obiad', icon: '🍲' },
  { k: 'kolacja', l: 'Kolacja', icon: '🌙' },
  { k: 'przekaski', l: 'Przekąski', icon: '🥜' },
];

/** Sugerowany posiłek według pory dnia. */
export function mealForNow(d = new Date()): MealKey {
  const h = d.getHours();
  return h < 10 ? 'sniadanie' : h < 15 ? 'obiad' : h < 20 ? 'kolacja' : 'przekaski';
}

export interface Macros { kcal: number; p: number; c: number; f: number }
export const ZERO: Macros = { kcal: 0, p: 0, c: 0, f: 0 };

/** Wartości dla danej wagi porcji. */
export function scale(n: Per100, grams: number): Macros {
  const k = grams / 100;
  return { kcal: n.kcal * k, p: n.p * k, c: n.c * k, f: n.f * k };
}
export const add = (a: Macros, b: Macros): Macros => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f });
export const entryMacros = (e: Pick<FoodEntry, 'n' | 'grams'>) => scale(e.n, e.grams);
export const sumEntries = (es: Pick<FoodEntry, 'n' | 'grams'>[]) => es.reduce((a, e) => add(a, entryMacros(e)), ZERO);

/** Energia z makroskładników (4/4/9) – do sprawdzenia spójności wpisów użytkownika. */
export const kcalFromMacros = (n: { p: number; c: number; f: number }) => n.p * 4 + n.c * 4 + n.f * 9;

export const r0 = (n: number) => Math.round(n);
export const r1 = (n: number) => Math.round(n * 10) / 10;
/** Liczba z przecinkiem dziesiętnym do wyświetlenia. */
export const f1 = (n: number) => r1(n).toLocaleString('pl-PL');
export const fmtG = (n: number) => `${r1(n).toLocaleString('pl-PL')} g`;

export function dayEntries(d: AppData, date: string): FoodEntry[] {
  return (d.food?.entries ?? []).filter((e) => e.date === date && !e.deleted);
}
export function dayWater(d: AppData, date: string): number {
  return d.food?.water.find((w) => w.date === date)?.ml ?? 0;
}

/* ───────── cele dzienne ───────── */
export const ACTIVITY: { v: Activity; l: string; d: string }[] = [
  { v: 1.2, l: 'Siedzący', d: 'praca przy biurku, mało ruchu' },
  { v: 1.375, l: 'Lekki', d: '1–3 treningi w tygodniu' },
  { v: 1.55, l: 'Umiarkowany', d: '3–5 treningów w tygodniu' },
  { v: 1.725, l: 'Wysoki', d: '6–7 treningów lub praca fizyczna' },
  { v: 1.9, l: 'Bardzo wysoki', d: 'codzienne ciężkie treningi i praca fizyczna' },
];
export const MODES: { v: DietMode; l: string; d: string }[] = [
  { v: 'red', l: 'Redukcja', d: 'deficyt ok. 15% – spadek masy ciała' },
  { v: 'keep', l: 'Utrzymanie', d: 'bilans zerowy – stała waga' },
  { v: 'mass', l: 'Masa', d: 'nadwyżka ok. 10% – przyrost masy' },
];

/** Podstawowa przemiana materii (Mifflin–St Jeor). */
export function bmr(sex: 'm' | 'k', kg: number, cm: number, age: number) {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'm' ? 5 : -161);
}

export interface Goals { kcal: number; p: number; c: number; f: number; waterMl: number; tdee: number }

export function computeGoals(profile: Profile, kg: number | undefined, plan?: NutritionPlan): Goals | undefined {
  if (!plan) return undefined;
  const w = kg ?? 75;
  let tdee: number;
  if (profile.height && profile.age) tdee = bmr(profile.sex, w, profile.height, profile.age) * plan.activity;
  else tdee = w * (profile.sex === 'm' ? 33 : 30); // bez wzrostu i wieku: szacunek z masy ciała
  const factor = plan.mode === 'red' ? 0.85 : plan.mode === 'mass' ? 1.1 : 1;
  const kcal = Math.round((plan.kcal ?? tdee * factor) / 10) * 10;
  // białko 1,8–2 g/kg (przy redukcji więcej), tłuszcz min. 0,8 g/kg lub ~25% energii, reszta węglowodany
  const p = plan.p ?? Math.round(w * (plan.mode === 'red' ? 2.1 : 1.8));
  const f = plan.f ?? Math.round(Math.max(w * 0.8, (kcal * 0.25) / 9));
  const c = plan.c ?? Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4));
  const waterMl = plan.waterMl ?? Math.round((w * 35) / 50) * 50;
  return { kcal, p, c, f, waterMl, tdee: Math.round(tdee) };
}

/* ───────── biblioteka produktów ───────── */
export const norm = (s: string) =>
  s.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function allFoods(d: AppData): Food[] {
  return [...(d.food?.customFoods ?? []).filter((f) => !f.deleted), ...BUILTIN_FOODS];
}

/** Wyszukiwanie: wszystkie słowa muszą wystąpić; wcześniejsze dopasowanie początku nazwy wygrywa. */
export function searchFoods(foods: Food[], q: string, limit = 60): Food[] {
  const words = norm(q).split(' ').filter(Boolean);
  if (!words.length) return [];
  const scored: [number, Food][] = [];
  for (const f of foods) {
    const hay = norm(`${f.name} ${f.brand ?? ''}`);
    if (!words.every((w) => hay.includes(w))) continue;
    const name = norm(f.name);
    let s = 0;
    if (name.startsWith(words[0])) s -= 3;
    if (words.every((w) => name.split(' ').some((x) => x.startsWith(w)))) s -= 2;
    s += name.length / 100;
    if (f.custom) s -= 1;
    scored.push([s, f]);
  }
  return scored.sort((a, b) => a[0] - b[0]).slice(0, limit).map((x) => x[1]);
}

/** Ostatnio używane produkty (unikalne po nazwie). */
export function recentFoods(d: AppData, limit = 20): { name: string; brand?: string; n: Per100; grams: number; foodId?: string }[] {
  const seen = new Set<string>();
  const out: { name: string; brand?: string; n: Per100; grams: number; foodId?: string }[] = [];
  const es = [...(d.food?.entries ?? [])].filter((e) => !e.deleted).sort((a, b) => b.updatedAt - a.updatedAt);
  for (const e of es) {
    const k = norm(e.name + (e.brand ?? ''));
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ name: e.name, brand: e.brand, n: e.n, grams: e.grams, foodId: e.foodId });
    if (out.length >= limit) break;
  }
  return out;
}

/* ───────── Open Food Facts ───────── */
interface OffProduct {
  code?: string; product_name?: string; product_name_pl?: string; brands?: string;
  serving_quantity?: number | string; serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

const num = (v: unknown) => { const n = typeof v === 'string' ? Number(v.replace(',', '.')) : (v as number); return typeof n === 'number' && Number.isFinite(n) ? n : undefined; };

export function offToFood(p: OffProduct): Food | undefined {
  const n = p.nutriments ?? {};
  let kcal = num(n['energy-kcal_100g']);
  if (kcal == null) { const kj = num(n['energy_100g']) ?? num(n['energy-kj_100g']); if (kj != null) kcal = kj / 4.184; }
  const pr = num(n['proteins_100g']), c = num(n['carbohydrates_100g']), f = num(n['fat_100g']);
  const name = (p.product_name_pl || p.product_name || '').trim();
  if (!name || kcal == null || (pr == null && c == null && f == null)) return undefined;
  if (kcal < 0 || kcal > 950) return undefined;
  const food: Food = {
    id: `off-${p.code ?? name}`, name, brand: p.brands?.split(',')[0]?.trim() || undefined,
    kcal: r1(kcal), p: r1(pr ?? 0), c: r1(c ?? 0), f: r1(f ?? 0), barcode: p.code,
  };
  const sq = num(p.serving_quantity);
  if (sq && sq > 0 && sq < 1500) food.portion = { label: p.serving_size?.trim().slice(0, 24) || 'porcja', g: sq };
  return food;
}

const OFF_FIELDS = 'code,product_name,product_name_pl,brands,nutriments,serving_quantity,serving_size';

export async function searchOpenFoodFacts(q: string, signal?: AbortSignal): Promise<Food[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=30&lc=pl&fields=${OFF_FIELDS}`
    + '&tagtype_0=countries&tag_contains_0=contains&tag_0=poland&sort_by=unique_scans_n';
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error('off');
  const j = (await r.json()) as { products?: OffProduct[] };
  const seen = new Set<string>();
  return (j.products ?? []).map(offToFood).filter((x): x is Food => !!x && !seen.has(x.id) && !!seen.add(x.id));
}

export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<Food | undefined> {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`, { signal });
  if (!r.ok) throw new Error('off');
  const j = (await r.json()) as { status?: number; product?: OffProduct };
  if (j.status !== 1 || !j.product) return undefined;
  return offToFood({ ...j.product, code });
}
