export type Muscle =
  | 'klatka' | 'plecy' | 'barki' | 'biceps' | 'triceps' | 'przedramiona'
  | 'czworogłowe' | 'dwugłowe' | 'pośladki' | 'łydki' | 'brzuch';

export type Equipment = 'sztanga' | 'hantle' | 'wyciąg' | 'maszyna' | 'masa ciała' | 'inne';

export interface Exercise {
  id: string;
  name: string;
  primary: Muscle[];
  secondary?: Muscle[];
  equipment: Equipment;
  compound: boolean;
  /** domyślny krok obciążenia w kg */
  step: number;
  /** ćwiczenie bez ciężaru zewnętrznego (powtórzenia / czas) */
  bodyweight?: boolean;
  custom?: boolean;
}

/** Jedna pozycja w treningu (szablon) */
export interface PlannedExercise {
  uid: string;
  exId: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** docelowy zapas powtórzeń (Reps In Reserve) */
  rir: number;
  restSec: number;
  /** startowy / ręcznie ustawiony ciężar w kg */
  kg?: number;
  /** wspólna litera = superseria */
  superset?: string;
  note?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}

export interface Block {
  name: string;
  weeks: number;
  description: string;
  workouts: WorkoutTemplate[];
}

export type Level = 'początkujący' | 'średniozaawansowany';
export type Goal = 'siła' | 'masa' | 'sylwetka';

export interface PlanTemplate {
  id: string;
  name: string;
  split: string;
  level: Level;
  daysPerWeek: number;
  minutes: number;
  goal: Goal[];
  equipment: Equipment[];
  description: string;
  /** dni tygodnia 0=pon..6=nd domyślnego rozkładu */
  defaultDays: number[];
  blocks: Block[];
}

export interface Program {
  id: string;
  templateId: string;
  name: string;
  startDate: string; // YYYY-MM-DD (poniedziałek tygodnia startu)
  /** pierwszy dzień, od którego liczymy zaplanowane/opuszczone treningi */
  createdOn?: string;
  trainingDays: number[]; // 0=pon..6=nd
  /** czy ostatni tydzień bloku jest tygodniem odciążenia */
  deloadLastWeek: boolean;
  /** ręczne przesunięcie bloku (gdy użytkownik przeskoczy) */
  blockOffsetWeeks: number;
  blocks: Block[];
  updatedAt: number;
}

export interface SetLog {
  kg: number;
  reps: number;
  rir?: number;
  done: boolean;
  warmup?: boolean;
  at?: number;
}

export interface EntryLog {
  uid: string;
  exId: string;
  plan?: { sets: number; repMin: number; repMax: number; rir: number; restSec: number };
  restSec: number;
  superset?: string;
  sets: SetLog[];
}

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD
  programId?: string;
  workoutId?: string;
  workoutName: string;
  blockIndex?: number;
  week?: number;
  startedAt: number;
  finishedAt?: number;
  entries: EntryLog[];
  note?: string;
  /** ocena samopoczucia 1-5 */
  feel?: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface BodyLog {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  waist?: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface Profile {
  sex: 'm' | 'k';
  age?: number;
  height?: number;
  level: Level;
  goal: Goal;
  unitStepKg: number;
  sound: boolean;
}

export interface AppData {
  version: 1;
  profile: Profile;
  program?: Program;
  sessions: Session[];
  body: BodyLog[];
  customExercises: Exercise[];
  updatedAt: number;
}
