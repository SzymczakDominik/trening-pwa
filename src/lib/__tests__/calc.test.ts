import { describe, expect, it } from 'vitest';
import { e1rm, programPosition, suggest, nextWorkoutIndex, findPRs } from '../calc';
import { getExercise } from '../../data/exercises';
import { PLANS } from '../../data/plans';
import type { PlannedExercise, Program, Session } from '../../types';

const prog = (start = '2026-11-02'): Program => ({
  id: 'p', templateId: 'fbw3-beg', name: 'x', startDate: start, trainingDays: [0, 2, 4],
  deloadLastWeek: true, blockOffsetWeeks: 0, blocks: PLANS[0].blocks, updatedAt: 0,
});
const sess = (date: string, exId: string, sets: [number, number, number?][], workoutId = 'A', t = 0): Session => ({
  id: date + exId + t, date, programId: 'p', workoutId, workoutName: workoutId, startedAt: new Date(date).getTime() + t, finishedAt: 1, updatedAt: 1,
  entries: [{ uid: 'u', exId, restSec: 90, sets: sets.map(([kg, reps, rir]) => ({ kg, reps, rir, done: true })) }],
});
const pe: PlannedExercise = { uid: 'x', exId: 'bench', sets: 3, repMin: 6, repMax: 8, rir: 2, restSec: 120 };

describe('e1rm', () => {
  it('Epley z RIR', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 5, 0)).toBeCloseTo(116.67, 1);
    expect(e1rm(100, 3, 2)).toBeCloseTo(116.67, 1);
  });
});

describe('harmonogram bloków', () => {
  it('przełącza blok po 4 tygodniach i oznacza odciążenie', () => {
    const p = prog('2026-11-02');
    expect(programPosition(p, '2026-11-02').blockIndex).toBe(0);
    expect(programPosition(p, '2026-11-02').targetRirShift).toBe(1);
    expect(programPosition(p, '2026-11-16').targetRirShift).toBe(-1);
    const w4 = programPosition(p, '2026-11-25');
    expect(w4.weekInBlock).toBe(4); expect(w4.deload).toBe(true);
    const b2 = programPosition(p, '2026-11-30');
    expect(b2.blockIndex).toBe(1); expect(b2.weekInBlock).toBe(1); expect(b2.blockStart).toBe('2026-11-30');
    const c2 = programPosition(p, '2026-12-28');
    expect(c2.cycle).toBe(2); expect(c2.blockIndex).toBe(0);
  });
  it('rotacja treningów A→B→C', () => {
    const p = prog('2026-11-02');
    expect(nextWorkoutIndex(p, [], '2026-11-04')).toBe(0);
    const s = [sess('2026-11-02', 'goblet', [[20, 10]], 'A'), sess('2026-11-04', 'rdl', [[60, 8]], 'B')];
    expect(nextWorkoutIndex(p, s, '2026-11-06')).toBe(2);
  });
});

describe('podwójna progresja', () => {
  const ex = getExercise('bench');
  it('podnosi ciężar gdy wszystkie serie na górze zakresu', () => {
    const s = suggest(pe, ex, [sess('2026-11-02', 'bench', [[60, 8, 2], [60, 8, 2], [60, 8, 1]])]);
    expect(s.kind).toBe('up'); expect(s.kg).toBe(62.5); expect(s.reps).toBe(6);
  });
  it('dokłada powtórzenia w zakresie', () => {
    const s = suggest(pe, ex, [sess('2026-11-02', 'bench', [[60, 7], [60, 6], [60, 6]])]);
    expect(s.kind).toBe('reps'); expect(s.kg).toBe(60); expect(s.reps).toBe(7);
  });
  it('reset po dwóch treningach poniżej zakresu', () => {
    const s = suggest(pe, ex, [sess('2026-11-02', 'bench', [[80, 4], [80, 4], [80, 3]], 'A', 0), sess('2026-11-04', 'bench', [[80, 4], [80, 3], [80, 3]], 'A', 1)]);
    expect(s.kind).toBe('reset'); expect(s.kg).toBe(72.5);
  });
  it('odciążenie zmniejsza serie i ciężar', () => {
    const s = suggest(pe, ex, [sess('2026-11-02', 'bench', [[100, 8]])], { deload: true, targetRirShift: 2 });
    expect(s.sets).toBe(2); expect(s.kg).toBe(90);
  });
});

describe('rekordy', () => {
  it('wykrywa nowy maks. ciężar', () => {
    const a = sess('2026-11-02', 'bench', [[60, 8]]);
    const b = sess('2026-11-04', 'bench', [[65, 5]]);
    expect(findPRs(b, [a, b])[0]).toMatchObject({ type: 'kg', value: 65, prev: 60 });
  });
});

import { workoutKcal } from '../calc';
describe('workoutKcal', () => {
  it('szacuje kcal dla treningu i 0 dla pustego', () => {
    const base: any = { id: 'x', date: '2026-01-01', startedAt: 0, finishedAt: 3600000, entries: [{ sets: Array(16).fill({ done: true, kg: 50, reps: 8 }) }] };
    const k = workoutKcal(base, 80);
    expect(k).toBeGreaterThan(250); expect(k).toBeLessThan(600);
    expect(workoutKcal({ ...base, entries: [{ sets: [{ done: false }] }] }, 80)).toBe(0);
  });
});
