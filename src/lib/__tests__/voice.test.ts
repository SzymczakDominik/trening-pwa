import { describe, expect, it } from 'vitest';
import { BUILTIN_FOODS } from '../../data/foods';
import { parseMeal } from '../voice';

const first = (t: string) => parseMeal(t, BUILTIN_FOODS)[0];

describe('parseMeal', () => {
  it('rozpoznaje gramy, sztuki i kilka pozycji', () => {
    const r = parseMeal('200 gramów ryżu, dwa jajka i banan', BUILTIN_FOODS);
    expect(r.length).toBe(3);
    expect(r[0].grams).toBe(200);
    expect(r.every((x) => x.found)).toBe(true);
  });
  it('wybiera prosty produkt, nie danie', () => {
    expect(first('200 gramów ryżu').food?.name).toBe('Ryż biały, gotowany');
    expect(first('ryż').food?.name).not.toMatch(/mleku/);
  });
  it('respektuje „suchy"', () => {
    expect(first('100 g suchego ryżu').food?.name).toMatch(/suchy/);
  });
  it('typowe produkty', () => {
    for (const t of ['pierś z kurczaka', 'makaron', 'chleb', 'mleko', 'jogurt naturalny', 'jabłko', 'płatki owsiane', 'tuńczyk', 'twaróg']) {
      const f = first(`150 g ${t}`).food;
      console.log(t, '->', f?.name);
      expect(f).toBeTruthy();
    }
  });
});
