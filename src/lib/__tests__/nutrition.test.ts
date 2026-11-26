import { describe, expect, it } from 'vitest';
import { BUILTIN_FOODS } from '../../data/foods';
import { computeGoals, kcalFromMacros, offToFood, scale, searchFoods, sumEntries } from '../nutrition';
import { defaultProfile } from '../store';

describe('biblioteka produktów', () => {
  it('ma kilkaset produktów z unikalnymi id', () => {
    expect(BUILTIN_FOODS.length).toBeGreaterThan(300);
    expect(new Set(BUILTIN_FOODS.map((f) => f.id)).size).toBe(BUILTIN_FOODS.length);
  });
  it('kalorie są spójne z makroskładnikami (±30%)', () => {
    const bad = BUILTIN_FOODS.filter((f) => {
      if (f.kcal < 20 || /^(Piwo|Wino|Wódka)/.test(f.name)) return false; // alkohol ma 7 kcal/g
      const calc = kcalFromMacros(f);
      return Math.abs(calc - f.kcal) > Math.max(30, f.kcal * 0.3);
    });
    expect(bad.map((f) => `${f.name}: ${f.kcal} vs ${Math.round(kcalFromMacros(f))}`)).toEqual([]);
  });
  it('wyszukuje bez polskich znaków i w dowolnej kolejności słów', () => {
    expect(searchFoods(BUILTIN_FOODS, 'piers kurczaka')[0].name).toMatch(/Pierś z kurczaka/);
    expect(searchFoods(BUILTIN_FOODS, 'gotowany ryz').length).toBeGreaterThan(0);
  });
});

describe('obliczenia', () => {
  it('skaluje makro do gramatury', () => {
    expect(scale({ kcal: 200, p: 10, c: 20, f: 5 }, 150)).toEqual({ kcal: 300, p: 15, c: 30, f: 7.5 });
    expect(sumEntries([{ n: { kcal: 100, p: 1, c: 2, f: 3 }, grams: 200 }, { n: { kcal: 50, p: 0, c: 10, f: 0 }, grams: 100 }]).kcal).toBe(250);
  });
  it('cele: deficyt < utrzymanie < nadwyżka, makro sumuje się do kcal', () => {
    const pr = { ...defaultProfile, sex: 'm' as const, age: 30, height: 180 };
    const g = (mode: 'red' | 'keep' | 'mass') => computeGoals(pr, 80, { mode, activity: 1.55, updatedAt: 0 })!;
    expect(g('red').kcal).toBeLessThan(g('keep').kcal);
    expect(g('keep').kcal).toBeLessThan(g('mass').kcal);
    const k = g('keep');
    expect(Math.abs(k.p * 4 + k.c * 4 + k.f * 9 - k.kcal)).toBeLessThan(10);
    expect(g('keep').waterMl).toBe(2800);
  });
  it('ręczny cel kcal zmienia węglowodany, nie białko', () => {
    const pr = { ...defaultProfile, age: 30, height: 180 };
    const a = computeGoals(pr, 80, { mode: 'keep', activity: 1.55, updatedAt: 0 })!;
    const b = computeGoals(pr, 80, { mode: 'keep', activity: 1.55, kcal: a.kcal + 200, updatedAt: 0 })!;
    expect(b.p).toBe(a.p); expect(b.c).toBeGreaterThan(a.c);
  });
});

describe('Open Food Facts', () => {
  it('mapuje produkt i odrzuca niekompletne', () => {
    const f = offToFood({ code: '590', product_name: 'Skyr', brands: 'Marka, Inna', serving_quantity: '150', nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2 } })!;
    expect(f.kcal).toBe(63); expect(f.brand).toBe('Marka'); expect(f.portion?.g).toBe(150);
    expect(offToFood({ code: '1', product_name: 'Bez danych', nutriments: {} })).toBeUndefined();
    expect(offToFood({ code: '2', nutriments: { 'energy-kcal_100g': 10, proteins_100g: 1 } })).toBeUndefined();
  });
  it('przelicza kJ na kcal', () => {
    expect(offToFood({ code: '3', product_name: 'X', nutriments: { energy_100g: 418.4, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1 } })!.kcal).toBe(100);
  });
});
