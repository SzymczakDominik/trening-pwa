import type { Exercise, Muscle, Equipment } from '../types';

const e = (
  id: string, name: string, primary: Muscle[], equipment: Equipment, compound: boolean,
  secondary: Muscle[] = [], step?: number, bodyweight = false,
): Exercise => ({
  id, name, primary, secondary, equipment, compound, bodyweight,
  step: step ?? (bodyweight ? 0 : compound ? 2.5 : equipment === 'hantle' ? 2 : 1.25),
});

export const EXERCISES: Exercise[] = [
  // Klatka
  e('bench', 'Wyciskanie sztangi na ławce płaskiej', ['klatka'], 'sztanga', true, ['triceps', 'barki']),
  e('incline_bench', 'Wyciskanie sztangi na ławce skośnej', ['klatka'], 'sztanga', true, ['barki', 'triceps']),
  e('db_bench', 'Wyciskanie hantli na ławce płaskiej', ['klatka'], 'hantle', true, ['triceps', 'barki'], 2),
  e('db_incline', 'Wyciskanie hantli na ławce skośnej', ['klatka'], 'hantle', true, ['barki', 'triceps'], 2),
  e('close_bench', 'Wyciskanie sztangi wąskim chwytem', ['triceps'], 'sztanga', true, ['klatka']),
  e('db_fly', 'Rozpiętki z hantlami', ['klatka'], 'hantle', false),
  e('cable_fly', 'Krzyżowanie linek wyciągu', ['klatka'], 'wyciąg', false),
  e('machine_press', 'Wyciskanie na maszynie (klatka)', ['klatka'], 'maszyna', true, ['triceps'], 5),
  e('pushup', 'Pompki', ['klatka'], 'masa ciała', true, ['triceps', 'barki'], 0, true),
  e('dips', 'Pompki na poręczach (dipy)', ['klatka', 'triceps'], 'masa ciała', true, ['barki'], 2.5),
  // Plecy
  e('deadlift', 'Martwy ciąg klasyczny', ['plecy', 'dwugłowe', 'pośladki'], 'sztanga', true, ['przedramiona'], 5),
  e('rdl', 'Martwy ciąg rumuński', ['dwugłowe', 'pośladki'], 'sztanga', true, ['plecy']),
  e('db_rdl', 'Martwy ciąg rumuński z hantlami', ['dwugłowe', 'pośladki'], 'hantle', true, ['plecy'], 2),
  e('row', 'Wiosłowanie sztangą w opadzie', ['plecy'], 'sztanga', true, ['biceps']),
  e('row_uh', 'Wiosłowanie sztangą podchwytem', ['plecy'], 'sztanga', true, ['biceps']),
  e('db_row', 'Wiosłowanie hantlem jednorącz', ['plecy'], 'hantle', true, ['biceps'], 2),
  e('cable_row', 'Przyciąganie linki siedząc', ['plecy'], 'wyciąg', true, ['biceps'], 5),
  e('chest_row', 'Wiosłowanie z podparciem klatki', ['plecy'], 'maszyna', true, ['biceps'], 5),
  e('pulldown', 'Ściąganie drążka wyciągu do klatki', ['plecy'], 'wyciąg', true, ['biceps'], 5),
  e('pulldown_close', 'Ściąganie wąskim chwytem neutralnym', ['plecy'], 'wyciąg', true, ['biceps'], 5),
  e('pullup', 'Podciąganie nachwytem', ['plecy'], 'masa ciała', true, ['biceps'], 2.5),
  e('chinup', 'Podciąganie podchwytem', ['plecy', 'biceps'], 'masa ciała', true, [], 2.5),
  e('band_chinup', 'Podciąganie z gumą (asysta)', ['plecy'], 'masa ciała', true, ['biceps'], 0, true),
  e('straight_pulldown', 'Prostowanie ramion na wyciągu (pullover)', ['plecy'], 'wyciąg', false, [], 2.5),
  e('face_pull', 'Face pull (przyciąganie liny do twarzy)', ['barki'], 'wyciąg', false, ['plecy'], 2.5),
  e('back_ext', 'Wyprosty tułowia na ławce rzymskiej', ['plecy', 'pośladki'], 'masa ciała', false, ['dwugłowe'], 2.5),
  // Barki
  e('ohp', 'Wyciskanie żołnierskie (sztanga nad głowę)', ['barki'], 'sztanga', true, ['triceps']),
  e('db_ohp', 'Wyciskanie hantli nad głowę siedząc', ['barki'], 'hantle', true, ['triceps'], 2),
  e('lateral', 'Wznosy hantli bokiem', ['barki'], 'hantle', false, [], 1),
  e('cable_lateral', 'Wznosy bokiem na wyciągu', ['barki'], 'wyciąg', false, [], 1.25),
  e('rear_delt', 'Odwrotne rozpiętki (tył barku)', ['barki'], 'hantle', false, ['plecy'], 1),
  e('arnold', 'Wyciskanie Arnolda', ['barki'], 'hantle', true, ['triceps'], 2),
  // Ramiona
  e('bb_curl', 'Uginanie ramion ze sztangą', ['biceps'], 'sztanga', false, ['przedramiona'], 1.25),
  e('db_curl', 'Uginanie ramion z hantlami z supinacją', ['biceps'], 'hantle', false, [], 1),
  e('incline_curl', 'Uginanie hantli na ławce skośnej', ['biceps'], 'hantle', false, [], 1),
  e('hammer', 'Uginanie młotkowe', ['biceps', 'przedramiona'], 'hantle', false, [], 1),
  e('preacher', 'Uginanie na modlitewniku', ['biceps'], 'sztanga', false, [], 1.25),
  e('cable_curl', 'Uginanie ramion na wyciągu', ['biceps'], 'wyciąg', false, [], 1.25),
  e('pushdown', 'Prostowanie ramion na wyciągu (linka)', ['triceps'], 'wyciąg', false, [], 1.25),
  e('oh_ext', 'Prostowanie ramion nad głową (wyciąg)', ['triceps'], 'wyciąg', false, [], 1.25),
  e('skull', 'Wyciskanie francuskie leżąc', ['triceps'], 'sztanga', false, [], 1.25),
  e('db_skull', 'Wyciskanie francuskie hantlami', ['triceps'], 'hantle', false, [], 1),
  // Nogi
  e('squat', 'Przysiad ze sztangą (high bar)', ['czworogłowe', 'pośladki'], 'sztanga', true, ['plecy']),
  e('front_squat', 'Przysiad przedni', ['czworogłowe'], 'sztanga', true, ['pośladki', 'brzuch']),
  e('goblet', 'Przysiad goblet', ['czworogłowe', 'pośladki'], 'hantle', true, [], 2),
  e('leg_press', 'Wypychanie nogami na suwnicy', ['czworogłowe', 'pośladki'], 'maszyna', true, [], 10),
  e('hack', 'Przysiad na maszynie hack', ['czworogłowe'], 'maszyna', true, ['pośladki'], 5),
  e('bss', 'Przysiad bułgarski', ['czworogłowe', 'pośladki'], 'hantle', true, [], 2),
  e('lunge', 'Zakroki z hantlami', ['czworogłowe', 'pośladki'], 'hantle', true, [], 2),
  e('step_up', 'Wejścia na skrzynię z hantlami', ['czworogłowe', 'pośladki'], 'hantle', true, [], 2),
  e('leg_ext', 'Prostowanie nóg na maszynie', ['czworogłowe'], 'maszyna', false, [], 2.5),
  e('leg_curl', 'Uginanie nóg leżąc na maszynie', ['dwugłowe'], 'maszyna', false, [], 2.5),
  e('seated_curl', 'Uginanie nóg siedząc na maszynie', ['dwugłowe'], 'maszyna', false, [], 2.5),
  e('hip_thrust', 'Hip thrust ze sztangą', ['pośladki'], 'sztanga', true, ['dwugłowe'], 5),
  e('glute_bridge', 'Mostek biodrowy ze sztangą', ['pośladki'], 'sztanga', true, ['dwugłowe'], 5),
  e('calf_stand', 'Wspięcia na palce stojąc', ['łydki'], 'maszyna', false, [], 5),
  e('calf_seated', 'Wspięcia na palce siedząc', ['łydki'], 'maszyna', false, [], 2.5),
  e('calf_single', 'Wspięcia na palce jednonóż', ['łydki'], 'hantle', false, [], 2),
  // Brzuch / core
  e('plank', 'Deska (sekundy)', ['brzuch'], 'masa ciała', false, [], 0, true),
  e('side_plank', 'Deska bokiem (sekundy)', ['brzuch'], 'masa ciała', false, [], 0, true),
  e('hanging_raise', 'Unoszenie nóg w zwisie', ['brzuch'], 'masa ciała', false, [], 0, true),
  e('captain', 'Unoszenie kolan na poręczach', ['brzuch'], 'masa ciała', false, [], 0, true),
  e('ab_wheel', 'Kółko do brzucha z kolan', ['brzuch'], 'inne', false, [], 0, true),
  e('cable_crunch', 'Spięcia brzucha na wyciągu', ['brzuch'], 'wyciąg', false, [], 2.5),
  e('pallof', 'Pallof press (antyrotacja)', ['brzuch'], 'wyciąg', false, [], 1.25),
  e('dead_bug', 'Dead bug', ['brzuch'], 'masa ciała', false, [], 0, true),
  e('farmer', 'Spacer farmera (metry)', ['przedramiona', 'brzuch'], 'hantle', true, ['plecy'], 2),
  e('shrug', 'Szrugsy z hantlami', ['plecy'], 'hantle', false, ['przedramiona'], 2),
];

export const MUSCLES: Muscle[] = [
  'klatka', 'plecy', 'barki', 'biceps', 'triceps', 'przedramiona',
  'czworogłowe', 'dwugłowe', 'pośladki', 'łydki', 'brzuch',
];

let extra: Exercise[] = [];
export function setCustomExercises(list: Exercise[]) { extra = list; }

export function allExercises(): Exercise[] { return [...EXERCISES, ...extra]; }

const map = new Map(EXERCISES.map((x) => [x.id, x]));
export function getExercise(id: string): Exercise {
  return map.get(id) ?? extra.find((x) => x.id === id) ?? {
    id, name: id, primary: [], equipment: 'inne', compound: false, step: 1,
  };
}
