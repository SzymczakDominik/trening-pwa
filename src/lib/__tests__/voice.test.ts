import { describe, expect, it } from 'vitest';
import { BUILTIN_FOODS } from '../../data/foods';
import { parseMeal } from '../voice';

describe('parseMeal', () => {
  it('rozpoznaje gramy, sztuki i kilka pozycji', () => {
    const r = parseMeal('200 gramów ryżu, dwa jajka i banan', BUILTIN_FOODS);
    console.log(r.map((x) => `${x.text} -> ${x.food?.name} ${x.grams}g`));
    expect(r.length).toBe(3);
    expect(r[0].grams).toBe(200);
    expect(r.every((x) => x.found)).toBe(true);
  });
});
