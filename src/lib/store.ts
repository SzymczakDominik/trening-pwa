import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppData, BodyLog, EntryLog, Exercise, PlanTemplate, Profile, Program, Session, WorkoutTemplate } from '../types';
import { mondayOf, todayStr, uid, programPosition, suggest } from './calc';
import { getExercise, setCustomExercises } from '../data/exercises';

export interface RestTimer {
  endsAt: number;
  total: number;
  label: string;      // co się właśnie skończyło
  next?: string;      // co dalej
  betweenExercises?: boolean;
}

export const defaultProfile: Profile = { sex: 'm', level: 'początkujący', goal: 'sylwetka', unitStepKg: 2.5, sound: true };

export const emptyData = (): AppData => ({
  version: 1, profile: defaultProfile, sessions: [], body: [], customExercises: [], updatedAt: 0,
});

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

interface State {
  data: AppData;
  active?: Session;
  rest?: RestTimer;
  onboarded: boolean;
  setProfile(p: Partial<Profile>): void;
  startProgram(t: PlanTemplate, days?: number[], startDate?: string): void;
  updateProgram(fn: (p: Program) => void): void;
  updateWorkout(blockIndex: number, workoutId: string, fn: (w: WorkoutTemplate) => void): void;
  removeProgram(): void;
  startSession(w?: WorkoutTemplate, blockIndex?: number): void;
  updateActive(fn: (s: Session) => void): void;
  finishActive(feel?: number, note?: string): Session | undefined;
  discardActive(): void;
  updateSession(id: string, fn: (s: Session) => void): void;
  deleteSession(id: string): void;
  addBody(b: Omit<BodyLog, 'id' | 'updatedAt'>): void;
  deleteBody(id: string): void;
  addCustomExercise(e: Exercise): void;
  startRest(r: Omit<RestTimer, 'endsAt'>): void;
  adjustRest(deltaSec: number): void;
  clearRest(): void;
  replaceData(d: AppData): void;
  setOnboarded(v: boolean): void;
}

const touch = (d: AppData) => { d.updatedAt = Date.now(); };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      data: emptyData(),
      onboarded: false,
      setOnboarded: (v) => set({ onboarded: v }),
      setProfile: (p) => set((s) => { const d = clone(s.data); d.profile = { ...d.profile, ...p }; touch(d); return { data: d }; }),

      startProgram: (t, days, startDate) => set((s) => {
        const d = clone(s.data);
        d.program = {
          id: uid(), templateId: t.id, name: t.name,
          startDate: mondayOf(startDate ?? todayStr()),
          createdOn: (startDate ?? todayStr()) > todayStr() ? mondayOf(startDate!) : todayStr(),
          trainingDays: days ?? t.defaultDays, deloadLastWeek: true, blockOffsetWeeks: 0,
          blocks: clone(t.blocks), updatedAt: Date.now(),
        };
        touch(d);
        return { data: d };
      }),
      updateProgram: (fn) => set((s) => {
        if (!s.data.program) return {};
        const d = clone(s.data); fn(d.program!); d.program!.updatedAt = Date.now(); touch(d); return { data: d };
      }),
      updateWorkout: (bi, wid, fn) => get().updateProgram((p) => {
        const w = p.blocks[bi]?.workouts.find((x) => x.id === wid); if (w) fn(w);
      }),
      removeProgram: () => set((s) => { const d = clone(s.data); d.program = undefined; touch(d); return { data: d }; }),

      startSession: (w, blockIndex) => {
        const { data } = get();
        const p = data.program;
        const pos = p ? programPosition(p) : undefined;
        const entries: EntryLog[] = (w?.exercises ?? []).map((pe) => {
          const ex = getExercise(pe.exId);
          const sg = suggest(pe, ex, data.sessions, pos);
          return {
            uid: uid(), exId: pe.exId, restSec: pe.restSec, superset: pe.superset,
            plan: { sets: sg.sets, repMin: pe.repMin, repMax: pe.repMax, rir: sg.rir, restSec: pe.restSec },
            sets: Array.from({ length: sg.sets }, () => ({ kg: sg.kg ?? 0, reps: sg.reps, rir: sg.rir, done: false })),
          };
        });
        const now = Date.now();
        set({
          active: {
            id: uid(), date: todayStr(), programId: w ? p?.id : undefined, workoutId: w?.id,
            workoutName: w?.name ?? 'Trening dowolny', blockIndex: blockIndex ?? pos?.blockIndex, week: pos ? pos.week + 1 : undefined,
            startedAt: now, entries, updatedAt: now,
          },
          rest: undefined,
        });
      },
      updateActive: (fn) => set((s) => { if (!s.active) return {}; const a = clone(s.active); fn(a); a.updatedAt = Date.now(); return { active: a }; }),
      finishActive: (feel, note) => {
        const a = get().active; if (!a) return;
        const fin: Session = { ...clone(a), finishedAt: Date.now(), feel, note, updatedAt: Date.now() };
        fin.entries = fin.entries.filter((e) => e.sets.some((x) => x.done));
        set((s) => { const d = clone(s.data); d.sessions.push(fin); touch(d); return { data: d, active: undefined, rest: undefined }; });
        return fin;
      },
      discardActive: () => set({ active: undefined, rest: undefined }),
      updateSession: (id, fn) => set((s) => {
        const d = clone(s.data); const x = d.sessions.find((q) => q.id === id); if (!x) return {};
        fn(x); x.updatedAt = Date.now(); touch(d); return { data: d };
      }),
      deleteSession: (id) => get().updateSession(id, (s) => { s.deleted = true; s.entries = []; }),
      addBody: (b) => set((s) => {
        const d = clone(s.data);
        const ex = d.body.find((x) => x.date === b.date && !x.deleted);
        if (ex) Object.assign(ex, Object.fromEntries(Object.entries(b).filter(([, v]) => v != null && v !== '')), { updatedAt: Date.now() });
        else d.body.push({ ...b, id: uid(), updatedAt: Date.now() });
        touch(d); return { data: d };
      }),
      deleteBody: (id) => set((s) => {
        const d = clone(s.data); const x = d.body.find((q) => q.id === id); if (x) { x.deleted = true; x.updatedAt = Date.now(); }
        touch(d); return { data: d };
      }),
      addCustomExercise: (e) => set((s) => {
        const d = clone(s.data); d.customExercises.push(e); setCustomExercises(d.customExercises); touch(d); return { data: d };
      }),
      startRest: (r) => set({ rest: { ...r, endsAt: Date.now() + r.total * 1000 } }),
      adjustRest: (delta) => set((s) => s.rest ? { rest: { ...s.rest, endsAt: s.rest.endsAt + delta * 1000, total: Math.max(5, s.rest.total + delta) } } : {}),
      clearRest: () => set({ rest: undefined }),
      replaceData: (d) => { setCustomExercises(d.customExercises ?? []); set({ data: d }); },
    }),
    {
      name: 'forma-v1',
      onRehydrateStorage: () => (st) => { if (st) setCustomExercises(st.data.customExercises ?? []); },
    },
  ),
);

/** Scalanie danych lokalnych i z chmury – nowszy rekord wygrywa (po updatedAt). */
export function mergeData(a: AppData, b: AppData): AppData {
  const byId = <T extends { id: string; updatedAt: number }>(x: T[], y: T[]) => {
    const m = new Map<string, T>();
    for (const it of [...x, ...y]) { const cur = m.get(it.id); if (!cur || it.updatedAt > cur.updatedAt) m.set(it.id, it); }
    return [...m.values()];
  };
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const pa = a.program, pb = b.program;
  const program = !pa ? (newer === b ? pb : undefined) : !pb ? (newer === a ? pa : undefined) : pa.updatedAt >= pb.updatedAt ? pa : pb;
  const ce = new Map<string, Exercise>();
  for (const e of [...(a.customExercises ?? []), ...(b.customExercises ?? [])]) ce.set(e.id, e);
  return {
    version: 1,
    profile: newer.profile,
    program,
    sessions: byId(a.sessions, b.sessions),
    body: byId(a.body, b.body),
    customExercises: [...ce.values()],
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

export const liveSessions = (d: AppData) => d.sessions.filter((s) => !s.deleted && s.finishedAt);
