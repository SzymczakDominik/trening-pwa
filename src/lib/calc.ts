import type { Block, EntryLog, Exercise, Muscle, PlannedExercise, Program, Session, SetLog } from '../types';
import { getExercise } from '../data/exercises';

/* ───────── daty (czas lokalny) ───────── */
export const pad = (n: number) => String(n).padStart(2, '0');
export const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromStr = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayStr = () => toStr(new Date());
export const addDays = (s: string, n: number) => { const d = fromStr(s); d.setDate(d.getDate() + n); return toStr(d); };
/** 0 = poniedziałek … 6 = niedziela */
export const weekday = (s: string) => (fromStr(s).getDay() + 6) % 7;
export const mondayOf = (s: string) => addDays(s, -weekday(s));
export const daysBetween = (a: string, b: string) => Math.round((fromStr(b).getTime() - fromStr(a).getTime()) / 86400000);
export const DAY_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
export const DAY_LONG = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
export const MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
export const MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
export const fmtDate = (s: string) => { const d = fromStr(s); return `${d.getDate()}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; };
export const fmtShort = (s: string) => { const d = fromStr(s); return `${d.getDate()}.${pad(d.getMonth() + 1)}`; };
export const fmtClock = (sec: number) => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
export const fmtDuration = (ms: number) => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/* ───────── harmonogram bloków ───────── */
export interface ProgramPosition {
  week: number;          // tydzień programu od 0
  cycle: number;         // 1, 2, … (po przejściu wszystkich bloków program zaczyna się od nowa)
  blockIndex: number;
  block: Block;
  weekInBlock: number;   // 1..weeks
  blockStart: string;    // data poniedziałku startu bloku
  blockEnd: string;      // ostatni dzień bloku (niedziela)
  deload: boolean;
  targetRirShift: number; // przesunięcie RIR względem planu w danym tygodniu
}

export function programPosition(p: Program, date = todayStr()): ProgramPosition {
  const total = p.blocks.reduce((a, b) => a + b.weeks, 0) || 1;
  const raw = Math.max(0, Math.floor(daysBetween(p.startDate, date) / 7)) + p.blockOffsetWeeks;
  const week = Math.max(0, raw);
  const cycle = Math.floor(week / total) + 1;
  let inCycle = week % total;
  let blockIndex = 0;
  for (let i = 0; i < p.blocks.length; i++) {
    if (inCycle < p.blocks[i].weeks) { blockIndex = i; break; }
    inCycle -= p.blocks[i].weeks;
  }
  const block = p.blocks[blockIndex];
  const weekInBlock = inCycle + 1;
  const blockStart = addDays(mondayOf(date), -7 * inCycle);
  const blockEnd = addDays(blockStart, block.weeks * 7 - 1);
  const deload = p.deloadLastWeek && block.weeks >= 3 && weekInBlock === block.weeks;
  // RIR: tydzień 1 = +1 (więcej zapasu), ostatni tydzień przed odciążeniem = -1
  const hardWeeks = p.deloadLastWeek ? block.weeks - 1 : block.weeks;
  let shift = 0;
  if (deload) shift = 2;
  else if (hardWeeks >= 2) shift = Math.round(1 - (2 * (weekInBlock - 1)) / (hardWeeks - 1));
  return { week, cycle, blockIndex, block, weekInBlock, blockStart, blockEnd, deload, targetRirShift: shift };
}

/** Następny trening w rotacji A→B→C… liczony od początku bieżącego bloku. */
export function nextWorkoutIndex(p: Program, sessions: Session[], date = todayStr()) {
  const pos = programPosition(p, date);
  const done = sessions.filter((s) => !s.deleted && s.finishedAt && s.programId === p.id && s.date >= pos.blockStart && s.date <= date);
  const last = [...done].sort((a, b) => (a.startedAt - b.startedAt)).pop();
  const ws = pos.block.workouts;
  if (!last) return 0;
  const i = ws.findIndex((w) => w.id === last.workoutId);
  return i < 0 ? done.length % ws.length : (i + 1) % ws.length;
}

/* ───────── siła / objętość ───────── */
/** Szacowany 1RM (Epley z uwzględnieniem zapasu RIR). */
export function e1rm(kg: number, reps: number, rir = 0) {
  if (!kg || !reps) return 0;
  const r = reps + (rir || 0);
  return r <= 1 ? kg : kg * (1 + r / 30);
}
export const workSets = (en: EntryLog) => en.sets.filter((s) => s.done && !s.warmup && s.reps > 0);
export const entryVolume = (en: EntryLog) => workSets(en).reduce((a, s) => a + s.kg * s.reps, 0);
export const sessionVolume = (s: Session) => s.entries.reduce((a, en) => a + entryVolume(en), 0);
export const bestE1rm = (en: EntryLog) => Math.max(0, ...workSets(en).map((s) => e1rm(s.kg, s.reps, s.rir)));
export const sessionSets = (s: Session) => s.entries.reduce((a, en) => a + workSets(en).length, 0);

export function muscleSets(sessions: Session[]): Record<Muscle, number> {
  const out = {} as Record<Muscle, number>;
  for (const s of sessions) for (const en of s.entries) {
    const ex = getExercise(en.exId);
    const n = workSets(en).filter((x) => x.rir == null || x.rir <= 4).length;
    for (const m of ex.primary) out[m] = (out[m] ?? 0) + n;
    for (const m of ex.secondary ?? []) out[m] = (out[m] ?? 0) + n * 0.5;
  }
  return out;
}

export const roundTo = (kg: number, step: number) => {
  const s = step > 0 ? step : 0.5;
  return Math.round(kg / s) * s;
};

/* ───────── progresja (podwójna progresja + RIR) ───────── */
export interface Suggestion {
  kg?: number;
  reps: number;
  sets: number;
  rir: number;
  reason: string;
  kind: 'start' | 'up' | 'reps' | 'hold' | 'reset' | 'deload';
}

export function historyFor(exId: string, sessions: Session[], before?: number) {
  return sessions
    .filter((s) => !s.deleted && s.finishedAt && (before == null || s.startedAt < before))
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((s) => ({ s, en: s.entries.find((e) => e.exId === exId) }))
    .filter((x): x is { s: Session; en: EntryLog } => !!x.en && workSets(x.en).length > 0);
}

function topSet(sets: SetLog[]) {
  return sets.reduce((a, b) => (b.kg > a.kg || (b.kg === a.kg && b.reps > a.reps) ? b : a), sets[0]);
}

export function suggest(pe: PlannedExercise, ex: Exercise, sessions: Session[], pos?: Pick<ProgramPosition, 'deload' | 'targetRirShift'>, stepOverride?: number): Suggestion {
  const shift = pos?.targetRirShift ?? 0;
  const rir = Math.max(0, pe.rir + shift);
  const step = ex.bodyweight ? 0 : stepOverride && !ex.custom ? Math.max(ex.step, stepOverride) : ex.step;
  const sets = pos?.deload ? Math.max(1, Math.round(pe.sets * 0.6)) : pe.sets;
  const hist = historyFor(ex.id, sessions);
  if (!hist.length) {
    return {
      kg: pe.kg, reps: pe.repMax, sets, rir, kind: 'start',
      reason: ex.bodyweight
        ? `Pierwszy raz: zrób ${pe.repMin}–${pe.repMax} powt., zostaw ${rir} w zapasie.`
        : `Pierwszy raz: dobierz ciężar, z którym zrobisz ${pe.repMax} powt. i zostanie Ci ${rir} w zapasie.`,
    };
  }
  const last = workSets(hist[0].en);
  const top = topSet(last);
  const atTop = last.filter((s) => s.kg >= top.kg);
  const allHitMax = atTop.length >= Math.min(pe.sets, last.length) && atTop.every((s) => s.reps >= pe.repMax && (s.rir == null || s.rir >= Math.max(0, pe.rir - 1)));
  const below = last.filter((s) => s.reps < pe.repMin).length;
  const avgReps = Math.round(atTop.reduce((a, s) => a + s.reps, 0) / atTop.length);

  if (pos?.deload) {
    return { kg: ex.bodyweight ? top.kg : roundTo(top.kg * 0.9, step), reps: pe.repMin, sets, rir: Math.max(rir, 3), kind: 'deload', reason: 'Tydzień odciążenia: mniej serii, ~90% ciężaru, lekki wysiłek. Regeneracja = przyszły progres.' };
  }
  if (allHitMax) {
    if (ex.bodyweight || step === 0) {
      return { kg: top.kg || undefined, reps: pe.repMax + 1, sets, rir, kind: 'up', reason: `Górny zakres osiągnięty – spróbuj ${pe.repMax + 1} powt. lub dodaj obciążenie.` };
    }
    return { kg: roundTo(top.kg + step, step), reps: pe.repMin, sets, rir, kind: 'up', reason: `Wszystkie serie na ${pe.repMax} powt. → +${step} kg, wracasz do ${pe.repMin} powt.` };
  }
  if (below >= Math.ceil(last.length / 2)) {
    const prev = hist[1] ? workSets(hist[1].en) : [];
    const prevBelow = prev.filter((s) => s.reps < pe.repMin).length >= Math.ceil(Math.max(1, prev.length) / 2);
    if (prevBelow && !ex.bodyweight) {
      return { kg: roundTo(top.kg * 0.9, step), reps: pe.repMax, sets, rir, kind: 'reset', reason: 'Dwa treningi poniżej zakresu – zejdź o ~10% i zbuduj progres ponownie.' };
    }
    return { kg: top.kg || undefined, reps: pe.repMin, sets, rir, kind: 'hold', reason: `Ostatnio poniżej ${pe.repMin} powt. – zostań przy ${top.kg} kg i celuj w dolny zakres.` };
  }
  const target = Math.min(pe.repMax, Math.max(pe.repMin, avgReps + 1));
  return { kg: top.kg || undefined, reps: target, sets, rir, kind: 'reps', reason: `Ten sam ciężar, dobij powtórzenia (cel: ${target}). Przy ${pe.repMax} we wszystkich seriach – podnosisz ciężar.` };
}

/* ───────── rekordy ───────── */
export interface PR { exId: string; type: 'e1rm' | 'kg'; value: number; prev: number }

export function findPRs(session: Session, sessions: Session[]): PR[] {
  const out: PR[] = [];
  for (const en of session.entries) {
    const ws = workSets(en);
    if (!ws.length) continue;
    const hist = historyFor(en.exId, sessions.filter((s) => s.id !== session.id), session.startedAt);
    if (!hist.length) continue;
    const prevE = Math.max(...hist.map((h) => bestE1rm(h.en)));
    const prevKg = Math.max(...hist.flatMap((h) => workSets(h.en).map((s) => s.kg)));
    const curE = bestE1rm(en);
    const curKg = Math.max(...ws.map((s) => s.kg));
    if (curKg > prevKg && curKg > 0) out.push({ exId: en.exId, type: 'kg', value: curKg, prev: prevKg });
    else if (curE > prevE * 1.005 && curE > 0) out.push({ exId: en.exId, type: 'e1rm', value: curE, prev: prevE });
  }
  return out;
}

/** Rekomendowana tygodniowa liczba trudnych serii na partię (zakres z badań nad hipertrofią). */
export const WEEKLY_SETS = { min: 10, max: 20 };
