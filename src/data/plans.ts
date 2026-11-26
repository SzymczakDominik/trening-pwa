import type { PlanTemplate, PlannedExercise, WorkoutTemplate, Block } from '../types';

let n = 0;
/** x('squat', 3, '6-8', 150) → 3 serie po 6–8 powt., przerwa 150 s */
function x(exId: string, sets: number, reps: string, restSec: number, opts: Partial<PlannedExercise> = {}): PlannedExercise {
  const [a, b] = reps.split('-').map(Number);
  return { uid: `p${++n}`, exId, sets, repMin: a, repMax: b ?? a, rir: 2, restSec, ...opts };
}
const w = (id: string, name: string, exercises: PlannedExercise[]): WorkoutTemplate => ({ id, name, exercises });
const B1 = 'Blok bazowy (tyg. 1–4). Uczysz się techniki i budujesz objętość. Tydzień 1 kończ serie z zapasem 3 powtórzeń, potem zapas maleje. Ostatni tydzień to odciążenie.';
const B2 = 'Blok rozwojowy (tyg. 5–8). Mniej powtórzeń, więcej ciężaru i trudniejsze warianty ćwiczeń. Progresja z bloku 1 jest kontynuowana.';
const b1 = (workouts: WorkoutTemplate[]): Block => ({ name: 'Blok 1 · Baza', weeks: 4, description: B1, workouts });
const b2 = (workouts: WorkoutTemplate[]): Block => ({ name: 'Blok 2 · Rozwój', weeks: 4, description: B2, workouts });

export const PLANS: PlanTemplate[] = [
  {
    id: 'fbw3-beg', name: 'Całe ciało 3× w tygodniu', split: 'FBW', level: 'początkujący', daysPerWeek: 3, minutes: 60,
    goal: ['sylwetka', 'masa', 'siła'], equipment: ['sztanga', 'hantle', 'wyciąg', 'maszyna'], defaultDays: [0, 2, 4],
    description: 'Najlepszy start: każdy trening angażuje całe ciało, więc każdą partię ćwiczysz 3 razy w tygodniu. Proste ćwiczenia bazowe, szybka nauka techniki i stały progres ciężaru.',
    blocks: [
      b1([
        w('A', 'Trening A', [x('goblet', 3, '8-12', 120), x('db_bench', 3, '8-12', 120), x('pulldown', 3, '8-12', 120), x('leg_curl', 2, '10-15', 90), x('lateral', 2, '12-15', 60), x('plank', 2, '30-45', 60)]),
        w('B', 'Trening B', [x('rdl', 3, '8-10', 150), x('db_ohp', 3, '8-12', 120), x('cable_row', 3, '10-12', 120), x('lunge', 2, '10-12', 90), x('db_curl', 2, '10-15', 60), x('pushdown', 2, '10-15', 60)]),
        w('C', 'Trening C', [x('leg_press', 3, '10-12', 120), x('incline_bench', 3, '8-10', 150), x('db_row', 3, '8-12', 90), x('glute_bridge', 2, '10-12', 90), x('face_pull', 2, '12-15', 60), x('dead_bug', 2, '8-12', 60)]),
      ]),
      b2([
        w('A', 'Trening A', [x('squat', 4, '6-8', 180), x('bench', 3, '6-8', 180), x('pulldown', 3, '8-10', 120), x('leg_curl', 3, '8-12', 90), x('lateral', 3, '12-15', 60)]),
        w('B', 'Trening B', [x('rdl', 3, '6-8', 180), x('ohp', 3, '6-8', 150), x('row', 3, '8-10', 120), x('bss', 2, '8-10', 90), x('incline_curl', 2, '10-12', 60), x('oh_ext', 2, '10-12', 60)]),
        w('C', 'Trening C', [x('leg_press', 3, '8-10', 150), x('db_incline', 3, '8-10', 120), x('chinup', 3, '5-8', 150), x('hip_thrust', 3, '8-10', 120), x('rear_delt', 2, '12-15', 60), x('hanging_raise', 2, '8-12', 60)]),
      ]),
    ],
  },
  {
    id: 'fbw3-int', name: 'Całe ciało 3× – wyższa objętość', split: 'FBW', level: 'średniozaawansowany', daysPerWeek: 3, minutes: 90,
    goal: ['masa', 'siła'], equipment: ['sztanga', 'hantle', 'wyciąg', 'maszyna'], defaultDays: [0, 2, 4],
    description: 'Dla osób z co najmniej rokiem treningu. Każdy dzień ma inny akcent (siła / hipertrofia / objętość), co pozwala trenować całe ciało często i bez przemęczenia.',
    blocks: [
      b1([
        w('A', 'Trening A · siła', [x('squat', 4, '4-6', 210, { rir: 2 }), x('bench', 4, '4-6', 210), x('row', 3, '6-8', 150), x('leg_curl', 3, '8-10', 90), x('lateral', 3, '12-15', 60, { superset: 'a' }), x('rear_delt', 3, '12-15', 60, { superset: 'a' })]),
        w('B', 'Trening B · hipertrofia', [x('rdl', 3, '8-10', 150), x('db_incline', 3, '8-12', 120), x('pulldown', 4, '8-12', 120), x('bss', 3, '8-12', 90), x('db_curl', 3, '10-12', 60, { superset: 'a' }), x('pushdown', 3, '10-12', 60, { superset: 'a' })]),
        w('C', 'Trening C · objętość', [x('leg_press', 4, '10-15', 120), x('ohp', 3, '6-10', 150), x('chest_row', 3, '10-12', 90), x('hip_thrust', 3, '8-12', 120), x('cable_fly', 2, '12-15', 60), x('cable_crunch', 3, '10-15', 60)]),
      ]),
      b2([
        w('A', 'Trening A · siła', [x('squat', 5, '3-5', 240), x('bench', 5, '3-5', 240), x('pullup', 4, '4-6', 180), x('seated_curl', 3, '8-10', 90), x('cable_lateral', 3, '12-15', 60)]),
        w('B', 'Trening B · hipertrofia', [x('deadlift', 3, '4-6', 240), x('db_bench', 3, '8-10', 120), x('row_uh', 3, '8-10', 120), x('hack', 3, '8-12', 120), x('incline_curl', 3, '8-12', 60, { superset: 'a' }), x('skull', 3, '8-12', 60, { superset: 'a' })]),
        w('C', 'Trening C · objętość', [x('front_squat', 3, '6-8', 180), x('db_ohp', 3, '8-12', 120), x('pulldown_close', 3, '10-12', 90), x('glute_bridge', 3, '10-12', 90), x('dips', 3, '8-12', 90), x('hanging_raise', 3, '10-15', 60)]),
      ]),
    ],
  },
  {
    id: 'ul4-beg', name: 'Góra / dół 4× w tygodniu', split: 'góra–dół', level: 'początkujący', daysPerWeek: 4, minutes: 60,
    goal: ['sylwetka', 'masa'], equipment: ['sztanga', 'hantle', 'wyciąg', 'maszyna'], defaultDays: [0, 1, 3, 4],
    description: 'Cztery krótsze treningi: dwa na górę ciała, dwa na dół. Każda partia 2× w tygodniu, krótsze sesje, łatwa regeneracja. Dobry wybór, gdy chcesz trenować częściej niż 3 razy.',
    blocks: [
      b1([
        w('A', 'Góra A', [x('db_bench', 3, '8-12', 120), x('cable_row', 3, '8-12', 120), x('db_ohp', 3, '8-12', 90), x('pulldown', 3, '10-12', 90), x('db_curl', 2, '10-15', 60), x('pushdown', 2, '10-15', 60)]),
        w('B', 'Dół A', [x('goblet', 3, '8-12', 120), x('rdl', 3, '8-10', 150), x('leg_ext', 2, '12-15', 60), x('leg_curl', 2, '10-15', 60), x('calf_stand', 3, '10-15', 60), x('plank', 2, '30-45', 60)]),
        w('C', 'Góra B', [x('incline_bench', 3, '8-10', 150), x('db_row', 3, '8-12', 90), x('lateral', 3, '12-15', 60), x('band_chinup', 3, '5-8', 120), x('hammer', 2, '10-12', 60), x('oh_ext', 2, '10-12', 60)]),
        w('D', 'Dół B', [x('leg_press', 3, '10-12', 120), x('glute_bridge', 3, '8-12', 120), x('lunge', 2, '10-12', 90), x('seated_curl', 2, '10-15', 60), x('calf_seated', 3, '12-15', 60), x('captain', 2, '8-12', 60)]),
      ]),
      b2([
        w('A', 'Góra A', [x('bench', 4, '6-8', 180), x('row', 3, '6-8', 150), x('ohp', 3, '6-8', 150), x('pulldown', 3, '8-10', 90), x('bb_curl', 2, '8-12', 60), x('skull', 2, '8-12', 60)]),
        w('B', 'Dół A', [x('squat', 4, '6-8', 180), x('rdl', 3, '6-8', 150), x('leg_ext', 2, '10-12', 60), x('leg_curl', 3, '8-12', 60), x('calf_stand', 3, '8-12', 60), x('ab_wheel', 3, '6-10', 60)]),
        w('C', 'Góra B', [x('db_incline', 3, '8-10', 120), x('chest_row', 3, '8-10', 90), x('cable_lateral', 3, '12-15', 60), x('chinup', 3, '4-8', 150), x('incline_curl', 2, '10-12', 60), x('dips', 2, '6-10', 90)]),
        w('D', 'Dół B', [x('hack', 3, '8-10', 150), x('hip_thrust', 3, '6-10', 120), x('bss', 3, '8-10', 90), x('seated_curl', 3, '8-12', 60), x('calf_single', 3, '10-12', 60), x('hanging_raise', 3, '8-12', 60)]),
      ]),
    ],
  },
  {
    id: 'ul4-int', name: 'Góra / dół 4× – siła i masa', split: 'góra–dół', level: 'średniozaawansowany', daysPerWeek: 4, minutes: 80,
    goal: ['siła', 'masa'], equipment: ['sztanga', 'hantle', 'wyciąg', 'maszyna'], defaultDays: [0, 1, 3, 4],
    description: 'Klasyczny układ siła + hipertrofia: pierwsze dwa dni tygodnia ciężkie bóje na niskich powtórzeniach, kolejne dwa wyższa objętość. Dla osób, które chcą jednocześnie podnosić wyniki i budować masę.',
    blocks: [
      b1([
        w('A', 'Góra · siła', [x('bench', 4, '4-6', 210), x('row', 4, '5-7', 180), x('ohp', 3, '5-7', 150), x('pullup', 3, '5-8', 150), x('skull', 3, '8-10', 90)]),
        w('B', 'Dół · siła', [x('squat', 4, '4-6', 240), x('rdl', 3, '6-8', 180), x('leg_press', 3, '8-10', 120), x('leg_curl', 3, '8-10', 90), x('calf_stand', 4, '8-12', 60)]),
        w('C', 'Góra · objętość', [x('db_incline', 4, '8-12', 120), x('cable_row', 3, '10-12', 90), x('lateral', 4, '12-15', 60, { superset: 'a' }), x('face_pull', 3, '12-15', 60, { superset: 'a' }), x('incline_curl', 3, '10-12', 60, { superset: 'b' }), x('pushdown', 3, '10-12', 60, { superset: 'b' })]),
        w('D', 'Dół · objętość', [x('deadlift', 3, '4-6', 240), x('hack', 3, '8-12', 120), x('bss', 3, '8-10', 90), x('seated_curl', 3, '10-12', 60), x('calf_seated', 3, '12-15', 60), x('pallof', 3, '10-12', 60)]),
      ]),
      b2([
        w('A', 'Góra · siła', [x('bench', 5, '3-5', 240), x('chest_row', 4, '6-8', 150), x('close_bench', 3, '5-7', 180), x('pullup', 4, '4-6', 180), x('preacher', 3, '8-10', 90)]),
        w('B', 'Dół · siła', [x('squat', 5, '3-5', 240), x('deadlift', 3, '3-5', 240), x('leg_ext', 3, '10-12', 60), x('leg_curl', 3, '6-8', 90), x('calf_stand', 4, '8-10', 60)]),
        w('C', 'Góra · objętość', [x('db_bench', 4, '8-10', 120), x('pulldown_close', 4, '8-12', 90), x('arnold', 3, '8-12', 90), x('cable_lateral', 3, '12-15', 60, { superset: 'a' }), x('rear_delt', 3, '12-15', 60, { superset: 'a' }), x('hammer', 3, '10-12', 60, { superset: 'b' }), x('oh_ext', 3, '10-12', 60, { superset: 'b' })]),
        w('D', 'Dół · objętość', [x('front_squat', 3, '6-8', 180), x('hip_thrust', 4, '8-10', 120), x('lunge', 3, '10-12', 90), x('seated_curl', 3, '10-12', 60), x('calf_single', 3, '10-12', 60), x('hanging_raise', 3, '10-15', 60)]),
      ]),
    ],
  },
  {
    id: 'pp4-beg', name: 'Push / pull 4× w tygodniu', split: 'push–pull', level: 'początkujący', daysPerWeek: 4, minutes: 60,
    goal: ['sylwetka', 'masa'], equipment: ['sztanga', 'hantle', 'wyciąg', 'maszyna'], defaultDays: [0, 1, 3, 4],
    description: 'Dzień „pchający” (klatka, barki, triceps, przód uda) i „ciągnący” (plecy, biceps, tył uda, pośladki), każdy 2× w tygodniu. Dużo pracy na górę ciała przy krótkich sesjach.',
    blocks: [
      b1([
        w('A', 'Push A', [x('goblet', 3, '8-12', 120), x('db_bench', 3, '8-12', 120), x('db_ohp', 3, '8-12', 90), x('leg_ext', 2, '12-15', 60), x('lateral', 3, '12-15', 60), x('pushdown', 2, '10-15', 60)]),
        w('B', 'Pull A', [x('rdl', 3, '8-10', 150), x('pulldown', 3, '8-12', 120), x('cable_row', 3, '10-12', 90), x('leg_curl', 2, '10-15', 60), x('db_curl', 3, '10-12', 60), x('dead_bug', 2, '8-12', 60)]),
        w('C', 'Push B', [x('leg_press', 3, '10-12', 120), x('incline_bench', 3, '8-10', 150), x('machine_press', 2, '10-12', 90), x('cable_lateral', 3, '12-15', 60), x('oh_ext', 2, '10-12', 60), x('calf_stand', 3, '10-15', 60)]),
        w('D', 'Pull B', [x('glute_bridge', 3, '8-12', 120), x('db_row', 3, '8-12', 90), x('band_chinup', 3, '5-8', 120), x('face_pull', 2, '12-15', 60), x('hammer', 2, '10-12', 60), x('captain', 3, '8-12', 60)]),
      ]),
      b2([
        w('A', 'Push A', [x('squat', 4, '6-8', 180), x('bench', 3, '6-8', 180), x('ohp', 3, '6-8', 150), x('leg_ext', 2, '10-12', 60), x('lateral', 3, '12-15', 60), x('skull', 2, '8-12', 60)]),
        w('B', 'Pull A', [x('rdl', 3, '6-8', 180), x('chinup', 3, '4-8', 150), x('row', 3, '8-10', 120), x('leg_curl', 3, '8-12', 60), x('incline_curl', 3, '8-12', 60), x('ab_wheel', 3, '6-10', 60)]),
        w('C', 'Push B', [x('hack', 3, '8-10', 150), x('db_incline', 3, '8-10', 120), x('dips', 3, '6-10', 120), x('cable_lateral', 3, '12-15', 60), x('oh_ext', 2, '10-12', 60), x('calf_stand', 3, '8-12', 60)]),
        w('D', 'Pull B', [x('hip_thrust', 3, '8-10', 120), x('chest_row', 3, '8-10', 90), x('pulldown_close', 3, '8-12', 90), x('rear_delt', 3, '12-15', 60), x('bb_curl', 2, '8-10', 60), x('hanging_raise', 3, '8-12', 60)]),
      ]),
    ],
  },
  {
    id: 'ppl3-int', name: 'Push / pull / nogi 3× w tygodniu', split: 'PPL', level: 'średniozaawansowany', daysPerWeek: 3, minutes: 75,
    goal: ['masa', 'sylwetka'], equipment: ['sztanga', 'hantle', 'wyciąg', 'maszyna'], defaultDays: [0, 2, 4],
    description: 'Każdy dzień skupia się na jednej grupie ruchów, co pozwala na dużą objętość dla danej partii w jednej sesji. Dobry, gdy masz 3 dni i lubisz „mocno dobić” mięśnie.',
    blocks: [
      b1([
        w('A', 'Push', [x('bench', 4, '6-8', 180), x('db_ohp', 3, '8-10', 120), x('db_incline', 3, '8-12', 90), x('lateral', 4, '12-15', 60), x('pushdown', 3, '10-12', 60, { superset: 'a' }), x('oh_ext', 3, '10-12', 60, { superset: 'a' })]),
        w('B', 'Pull', [x('deadlift', 3, '4-6', 240), x('pullup', 3, '6-8', 150), x('cable_row', 3, '8-12', 90), x('face_pull', 3, '12-15', 60), x('incline_curl', 3, '8-12', 60), x('hammer', 2, '10-12', 60)]),
        w('C', 'Nogi', [x('squat', 4, '6-8', 210), x('rdl', 3, '8-10', 150), x('leg_press', 3, '10-12', 120), x('leg_curl', 3, '10-12', 60), x('calf_stand', 4, '10-15', 60), x('cable_crunch', 3, '10-15', 60)]),
      ]),
      b2([
        w('A', 'Push', [x('incline_bench', 4, '5-7', 180), x('ohp', 3, '5-7', 180), x('dips', 3, '6-10', 120), x('cable_lateral', 4, '12-15', 60), x('skull', 3, '8-10', 60), x('cable_fly', 2, '12-15', 60)]),
        w('B', 'Pull', [x('row', 4, '5-7', 180), x('chinup', 3, '5-8', 150), x('chest_row', 3, '8-10', 90), x('rear_delt', 3, '12-15', 60), x('bb_curl', 3, '6-10', 60), x('shrug', 3, '10-12', 60)]),
        w('C', 'Nogi', [x('front_squat', 4, '5-7', 210), x('hip_thrust', 3, '6-10', 150), x('bss', 3, '8-10', 90), x('seated_curl', 3, '8-12', 60), x('calf_seated', 4, '10-15', 60), x('hanging_raise', 3, '10-15', 60)]),
      ]),
    ],
  },
  {
    id: 'fbw2-min', name: 'Minimum 2× w tygodniu', split: 'FBW', level: 'początkujący', daysPerWeek: 2, minutes: 50,
    goal: ['sylwetka'], equipment: ['sztanga', 'hantle', 'wyciąg'], defaultDays: [1, 4],
    description: 'Gdy masz mało czasu: dwa pełne treningi tygodniowo, tylko najbardziej opłacalne ćwiczenia. Utrzymuje i buduje siłę oraz sylwetkę przy minimalnym nakładzie.',
    blocks: [
      b1([
        w('A', 'Trening A', [x('goblet', 3, '8-12', 120), x('db_bench', 3, '8-12', 120), x('pulldown', 3, '8-12', 90), x('rdl', 2, '8-10', 120), x('lateral', 2, '12-15', 60)]),
        w('B', 'Trening B', [x('leg_press', 3, '10-12', 120), x('db_ohp', 3, '8-12', 90), x('cable_row', 3, '10-12', 90), x('glute_bridge', 2, '10-12', 90), x('plank', 2, '30-45', 60)]),
      ]),
      b2([
        w('A', 'Trening A', [x('squat', 3, '6-8', 180), x('bench', 3, '6-8', 180), x('pulldown', 3, '8-10', 90), x('rdl', 3, '6-8', 150), x('lateral', 3, '12-15', 60)]),
        w('B', 'Trening B', [x('bss', 3, '8-10', 90), x('ohp', 3, '6-8', 150), x('row', 3, '8-10', 120), x('hip_thrust', 3, '8-10', 120), x('ab_wheel', 2, '6-10', 60)]),
      ]),
    ],
  },
  {
    id: 'db3-home', name: 'Hantle w domu 3×', split: 'FBW', level: 'początkujący', daysPerWeek: 3, minutes: 50,
    goal: ['sylwetka', 'masa'], equipment: ['hantle', 'masa ciała'], defaultDays: [0, 2, 4],
    description: 'Tylko hantle, ławka i drążek (lub guma). Plan całego ciała do domu – wyższe zakresy powtórzeń kompensują lżejsze ciężary.',
    blocks: [
      b1([
        w('A', 'Trening A', [x('goblet', 3, '10-15', 90), x('db_bench', 3, '8-12', 90), x('db_row', 3, '10-12', 90), x('db_rdl', 3, '10-12', 90), x('lateral', 2, '12-20', 60), x('dead_bug', 2, '8-12', 45)]),
        w('B', 'Trening B', [x('lunge', 3, '10-12', 90), x('db_ohp', 3, '8-12', 90), x('band_chinup', 3, '5-8', 120), x('glute_bridge', 3, '12-15', 60), x('db_curl', 2, '10-15', 60), x('db_skull', 2, '10-15', 60)]),
        w('C', 'Trening C', [x('bss', 3, '8-12', 90), x('db_incline', 3, '8-12', 90), x('db_row', 3, '8-12', 90), x('calf_single', 3, '10-15', 60), x('rear_delt', 2, '12-20', 60), x('side_plank', 2, '20-40', 45)]),
      ]),
      b2([
        w('A', 'Trening A', [x('bss', 4, '8-10', 90), x('db_bench', 4, '8-10', 90), x('db_row', 4, '8-10', 90), x('db_rdl', 3, '8-10', 90), x('lateral', 3, '12-20', 60)]),
        w('B', 'Trening B', [x('step_up', 3, '8-10', 90), x('arnold', 3, '8-10', 90), x('chinup', 3, '3-6', 150), x('glute_bridge', 3, '10-12', 60), x('hammer', 3, '10-12', 60), x('pushup', 3, '10-20', 60)]),
        w('C', 'Trening C', [x('goblet', 4, '8-12', 90), x('db_incline', 3, '8-10', 90), x('db_row', 3, '8-10', 90), x('calf_single', 3, '10-15', 60), x('incline_curl', 2, '10-12', 60), x('ab_wheel', 3, '6-10', 60)]),
      ]),
    ],
  },
  {
    id: 'panie3', name: 'Trening dla pań', split: 'dół + całe ciało', level: 'początkujący', daysPerWeek: 3, minutes: 60,
    goal: ['sylwetka'], equipment: ['hantle', 'wyciąg', 'maszyna', 'sztanga', 'inne'], defaultDays: [0, 2, 4],
    description: 'Trzy dni z naciskiem na nogi i pośladki: suwnica, hip thrust, wykopy nogi w tył, przywodzenie i odwodzenie, do tego plecy, barki, ramiona i brzuch.',
    blocks: [
      b1([
        w('D1', 'Dzień 1', [x('leg_press', 3, '10-15', 120), x('calf_stand', 3, '12-15', 60), x('pulldown', 3, '10-12', 90), x('side_bend', 3, '12-15', 60), x('glute_kickback', 3, '12-15', 60), x('db_curl', 3, '10-15', 60)]),
        w('D2', 'Dzień 2', [x('back_ext', 3, '10-15', 90), x('side_bend', 3, '12-15', 60), x('deadlift', 3, '6-8', 150), x('face_pull', 3, '12-15', 60), x('ohp', 3, '8-10', 120), x('db_fly', 3, '10-15', 60), x('adductor', 3, '12-15', 60), x('abductor', 3, '12-15', 60)]),
        w('D3', 'Dzień 3', [x('hip_thrust', 3, '8-12', 120), x('row', 3, '8-12', 90), x('db_bench', 3, '8-12', 90), x('lunge', 3, '10-12', 90), x('pushdown', 3, '10-15', 60), x('crunch', 3, '15-20', 45)]),
      ]),
      b2([
        w('D1', 'Dzień 1', [x('leg_press', 4, '8-12', 150), x('calf_stand', 4, '10-15', 60), x('pulldown', 3, '8-10', 90), x('side_bend', 3, '10-15', 60), x('glute_kickback', 3, '10-12', 60), x('db_curl', 3, '8-12', 60)]),
        w('D2', 'Dzień 2', [x('back_ext', 3, '8-12', 90), x('side_bend', 3, '10-15', 60), x('deadlift', 4, '5-6', 180), x('face_pull', 3, '12-15', 60), x('ohp', 3, '6-8', 150), x('db_fly', 3, '10-12', 60), x('adductor', 3, '10-15', 60), x('abductor', 3, '10-15', 60)]),
        w('D3', 'Dzień 3', [x('hip_thrust', 4, '6-10', 150), x('row', 3, '8-10', 90), x('db_bench', 3, '8-10', 90), x('lunge', 3, '8-12', 90), x('pushdown', 3, '10-12', 60), x('crunch', 3, '15-20', 45)]),
      ]),
    ],
  },
];

export const getPlan = (id: string) => PLANS.find((p) => p.id === id);
