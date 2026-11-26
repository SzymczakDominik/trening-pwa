import { useState } from 'react';
import { useStore, mergeData } from '../lib/store';
import { useNav } from '../nav';
import { todayStr } from '../lib/calc';
import { supabase, type SyncState } from '../lib/sync';
import { Icon, NumInput, Seg, TopBar, toast, kgFmt } from '../components/ui';
import type { Session as AuthSession } from '@supabase/supabase-js';
import type { AppData } from '../types';

export interface SyncInfo { auth: AuthSession | null; state: SyncState; lastSync: number | null; syncNow: () => void }

const syncLabel: Record<SyncState, string> = { off: 'niedostępna', idle: 'nie zalogowano', syncing: 'synchronizuję…', ok: 'zsynchronizowano', error: 'błąd synchronizacji', offline: 'offline – zsynchronizuję później' };

export function MoreScreen({ sync }: { sync: SyncInfo }) {
  const { push } = useNav();
  const Item = ({ icon, t, d, onClick }: { icon: string; t: string; d: string; onClick: () => void }) => (
    <button className="list-btn" onClick={onClick}>
      <div className="badge"><Icon name={icon} size={18} /></div>
      <div className="grow"><div className="bold">{t}</div><div className="xs muted">{d}</div></div>
      <Icon name="right" />
    </button>
  );
  return (
    <div className="screen">
      <h1 className="title">Więcej</h1>
      <div className="mt16">
        <Item icon="user" t="Konto i synchronizacja" d={sync.auth?.user ? `${sync.auth.user.email} · ${syncLabel[sync.state]}` : 'Zaloguj się, by mieć kopię w chmurze'} onClick={() => push({ name: 'account' })} />
        <Item icon="food" t="Biblioteka produktów" d="Kalorie, białko, węgle i tłuszcz na 100 g i na porcję" onClick={() => push({ name: 'foodAdd', date: todayStr(), browse: true })} />
        <Item icon="tool" t="Kalkulatory" d="1RM, BMI, FFMI, tkanka tłuszczowa, kalorie, białko, woda" onClick={() => push({ name: 'tools' })} />
        <Item icon="info" t="Jak działa progresja" d="RIR, podwójna progresja, bloki i odciążenie" onClick={() => push({ name: 'method' })} />
        <Item icon="dumbbell" t="Biblioteka planów" d="Zmień lub podejrzyj plany" onClick={() => push({ name: 'library' })} />
        <Item icon="edit" t="Ustawienia" d="Profil, dźwięki, kopia zapasowa" onClick={() => push({ name: 'settings' })} />
        <Item icon="share" t="Zainstaluj na iPhonie" d="Ikona na ekranie początkowym" onClick={() => push({ name: 'install' })} />
      </div>
      <p className="xs muted mt24" style={{ textAlign: 'center' }}>FORMA · v1.0 · dane zapisują się na urządzeniu{sync.auth?.user ? ' i w chmurze' : ''}</p>
    </div>
  );
}

export function Account({ sync }: { sync: SyncInfo }) {
  const { pop } = useNav();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const user = sync.auth?.user;

  if (!supabase) {
    return <div className="screen"><TopBar title="Konto" onBack={pop} /><div className="card small muted">Synchronizacja w chmurze nie jest jeszcze skonfigurowana. Dane są bezpiecznie zapisywane na tym urządzeniu – możesz też zrobić kopię w Ustawieniach.</div></div>;
  }
  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase!.auth.signUp({ email, password: pass, options: { emailRedirectTo: location.origin + location.pathname } });
        if (error) throw error;
        setMsg(data.session ? 'Konto utworzone, jesteś zalogowany.' : 'Sprawdź skrzynkę e‑mail i kliknij link potwierdzający, potem zaloguj się.');
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        toast('Zalogowano');
      }
    } catch (e) {
      const m = (e as Error).message;
      setMsg(m.includes('Invalid login') ? 'Nieprawidłowy e‑mail lub hasło.' : m.includes('confirmed') ? 'Potwierdź najpierw adres e‑mail (link w wiadomości).' : m.includes('Password') ? 'Hasło musi mieć min. 6 znaków.' : m);
    } finally { setBusy(false); }
  };
  const reset = async () => {
    if (!email) { setMsg('Wpisz adres e‑mail.'); return; }
    await supabase!.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    setMsg('Wysłaliśmy link do zmiany hasła.');
  };
  return (
    <div className="screen">
      <TopBar title="Konto" onBack={pop} />
      {user ? (
        <div className="stack">
          <div className="card">
            <div className="small muted">Zalogowano jako</div>
            <div className="bold" style={{ fontSize: 18 }}>{user.email}</div>
            <div className="row mt12 small"><span className={sync.state === 'ok' ? 'accent' : sync.state === 'error' ? 'danger' : 'muted'}><Icon name="cloud" size={18} /></span>{syncLabel[sync.state]}{sync.lastSync ? ` · ${new Date(sync.lastSync).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
          </div>
          <button className="btn block" onClick={sync.syncNow}><Icon name="cloud" size={18} /> Synchronizuj teraz</button>
          <button className="btn block ghost" onClick={async () => { await supabase!.auth.signOut(); toast('Wylogowano'); }}>Wyloguj</button>
          <p className="xs muted">Treningi zapisują się najpierw na telefonie (działa bez internetu), a potem automatycznie trafiają do chmury. Po zalogowaniu na innym urządzeniu zobaczysz te same dane.</p>
        </div>
      ) : (
        <div className="stack">
          <Seg value={mode} onChange={setMode} options={[{ v: 'login', l: 'Logowanie' }, { v: 'signup', l: 'Nowe konto' }]} />
          <label className="field"><span>E‑mail</span><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value.trim())} /></label>
          <label className="field"><span>Hasło</span><input className="input" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={pass} onChange={(e) => setPass(e.target.value)} /></label>
          {msg && <div className="hint">{msg}</div>}
          <button className="btn primary block" disabled={busy || !email || pass.length < 6} onClick={submit}>{busy ? '…' : mode === 'signup' ? 'Załóż konto' : 'Zaloguj'}</button>
          {mode === 'login' && <button className="small muted" onClick={reset}>Nie pamiętam hasła</button>}
          <p className="xs muted">Twoje dotychczasowe dane z tego telefonu zostaną połączone z kontem.</p>
        </div>
      )}
    </div>
  );
}

export function Settings() {
  const { pop } = useNav();
  const data = useStore((s) => s.data);
  const setProfile = useStore((s) => s.setProfile);
  const replace = useStore((s) => s.replaceData);
  const pr = data.profile;
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `forma-kopia-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };
  const importJson = (f: File) => f.text().then((t) => {
    try { const d = JSON.parse(t) as AppData; if (!Array.isArray(d.sessions)) throw new Error(); replace(mergeData(useStore.getState().data, d)); toast('Zaimportowano i scalono dane'); }
    catch { toast('Nieprawidłowy plik kopii'); }
  });
  return (
    <div className="screen">
      <TopBar title="Ustawienia" onBack={pop} />
      <div className="card stack">
        <div className="bold">Profil</div>
        <Seg value={pr.sex} onChange={(v) => setProfile({ sex: v })} options={[{ v: 'm', l: 'Mężczyzna' }, { v: 'k', l: 'Kobieta' }]} />
        <div className="grid2">
          <label className="field"><span>Wiek</span><NumInput className="input" decimal={false} value={pr.age} onChange={(v) => setProfile({ age: v || undefined })} /></label>
          <label className="field"><span>Wzrost cm</span><NumInput className="input" decimal={false} value={pr.height} onChange={(v) => setProfile({ height: v || undefined })} /></label>
        </div>
      </div>
      <button className="card between mt12" style={{ width: '100%' }} onClick={() => setProfile({ sound: !pr.sound })}>
        <div style={{ textAlign: 'left' }}><div className="bold">Dźwięk timera</div><div className="xs muted">Sygnał 3‑2‑1 i koniec przerwy (iPhone: wyłącz tryb cichy)</div></div>
        <span className={`chip ${pr.sound ? 'on' : ''}`}>{pr.sound ? 'wł.' : 'wył.'}</span>
      </button>
      <div className="card mt12 stack">
        <div className="bold">Kopia zapasowa</div>
        <button className="btn block" onClick={exportJson}><Icon name="share" size={18} /> Eksportuj dane (JSON)</button>
        <label className="btn block ghost">Importuj z pliku<input type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} /></label>
      </div>
      <button className="btn danger block mt24" onClick={() => { if (confirm('Usunąć WSZYSTKIE dane z tego urządzenia? (kopia w chmurze zostaje)')) { localStorage.clear(); location.reload(); } }}>Wyczyść dane na urządzeniu</button>
    </div>
  );
}

export function Method() {
  const { pop } = useNav();
  const S = ({ t, children }: { t: string; children: React.ReactNode }) => <div className="card"><div className="bold">{t}</div><div className="small muted mt8" style={{ lineHeight: 1.55 }}>{children}</div></div>;
  return (
    <div className="screen">
      <TopBar title="Jak działa progresja" onBack={pop} />
      <div className="stack">
        <S t="RIR – zapas powtórzeń">Po każdej serii oceniasz, ile powtórzeń dałbyś radę jeszcze zrobić z dobrą techniką. RIR 2 = mogłem jeszcze 2. Trening z zapasem 1–3 daje prawie ten sam efekt co trening do upadku, przy dużo mniejszym zmęczeniu. RIR wpływa też na szacowany 1RM.</S>
        <S t="Podwójna progresja">Każde ćwiczenie ma zakres, np. 8–12. Trzymasz ten sam ciężar i dokładasz powtórzenia. Gdy we wszystkich seriach zrobisz górną granicę z zakładanym zapasem, aplikacja podpowie większy ciężar (+2,5 kg na bojach, +1–2 kg na izolacjach) i wracasz do dolnej granicy zakresu.</S>
        <S t="Zabezpieczenie przed stagnacją">Jeśli dwa treningi z rzędu kończysz poniżej zakresu, aplikacja zaproponuje zejście ~10% i odbudowę. Lepiej cofnąć się o krok niż utknąć na tygodnie.</S>
        <S t="Bloki i falowanie wysiłku">Plan składa się z 4‑tygodniowych bloków. Tydzień 1: RIR +1 (wejście), tydzień 2: RIR jak w planie, tydzień 3: RIR −1 (najmocniej), tydzień 4: odciążenie. Kalendarz sam przełącza bloki w poniedziałek po zakończeniu poprzedniego, a blok 2 wprowadza trudniejsze warianty i niższe zakresy.</S>
        <S t="Odciążenie (deload)">Raz na blok: ~60% serii i ~90% ciężaru, zapas 3–4. Zmęczenie spada, a forma rośnie. Możesz je wyłączyć w ustawieniach planu.</S>
        <S t="Objętość tygodniowa">Zakładka Postępy pokazuje trudne serie na każdą partię. Dla wzrostu mięśni celuj w ok. 10–20 serii tygodniowo na partię. Mniej = rezerwa do wzrostu, dużo więcej = ryzyko przemęczenia.</S>
        <S t="Szacowany 1RM i rekordy">Z każdej serii liczymy e1RM = ciężar × (1 + (powt. + RIR)/30). Dzięki temu widzisz progres siły, nawet gdy nie robisz maksów. Rekordy (ciężar i e1RM) wykrywane są automatycznie.</S>
      </div>
    </div>
  );
}

export function Install() {
  const { pop } = useNav();
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone;
  return (
    <div className="screen">
      <TopBar title="Instalacja" onBack={pop} />
      {standalone ? <div className="card">✅ Aplikacja jest już zainstalowana na ekranie początkowym.</div> : (
        <div className="stack">
          {['Otwórz tę stronę w Safari.', 'Stuknij przycisk Udostępnij (kwadrat ze strzałką w górę).', 'Przewiń i wybierz „Do ekranu początkowego”.', 'Zatwierdź „Dodaj”. Ikona FORMA pojawi się na pulpicie i otworzy się na pełnym ekranie, również offline.'].map((t, i) => (
            <div key={i} className="card row"><div className="badge">{i + 1}</div><div className="grow">{t}</div></div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── kalkulatory ───────── */
type Calc = '1rm' | 'bmi' | 'ffmi' | 'bf' | 'kcal' | 'protein' | 'water';
export function Tools() {
  const { pop } = useNav();
  const pr = useStore((s) => s.data.profile);
  const lastW = useStore((s) => [...s.data.body].filter((b) => !b.deleted && b.weight).sort((a, b) => a.date.localeCompare(b.date)).pop()?.weight);
  const [c, setC] = useState<Calc>('1rm');
  const [kg, setKg] = useState<number>(); const [reps, setReps] = useState<number>();
  const [w, setW] = useState<number | undefined>(lastW); const [h, setH] = useState<number | undefined>(pr.height); const [age, setAge] = useState<number | undefined>(pr.age);
  const [sex, setSex] = useState(pr.sex); const [bf, setBf] = useState<number>();
  const [waist, setWaist] = useState<number>(); const [neck, setNeck] = useState<number>(); const [hip, setHip] = useState<number>();
  const [act, setAct] = useState(1.55); const [goal, setGoal] = useState<'red' | 'keep' | 'mass'>('keep');

  const F = ({ l, v, s, dec = true }: { l: string; v: number | undefined; s: (n: number) => void; dec?: boolean }) => <label className="field"><span>{l}</span><NumInput className="input" value={v} onChange={s} decimal={dec} /></label>;
  const R = ({ v, l, d }: { v: string; l: string; d?: string }) => <div className="result mt12"><b>{v}</b><div className="bold">{l}</div>{d && <div className="small muted mt8">{d}</div>}</div>;
  const hm = (h ?? 0) / 100;
  const bmr = w && h && age ? 10 * w + 6.25 * h - 5 * age + (sex === 'm' ? 5 : -161) : 0;

  return (
    <div className="screen">
      <TopBar title="Kalkulatory" onBack={pop} />
      <div className="chips" style={{ flexWrap: 'wrap' }}>
        {([['1rm', '1RM'], ['bmi', 'BMI'], ['ffmi', 'FFMI'], ['bf', 'Tkanka tł.'], ['kcal', 'Kalorie'], ['protein', 'Białko'], ['water', 'Woda']] as [Calc, string][]).map(([k, l]) => <button key={k} className={`chip ${c === k ? 'on' : ''}`} onClick={() => setC(k)}>{l}</button>)}
      </div>
      <div className="card mt16 stack">
        {c === '1rm' && <>
          <div className="grid2"><F l="Ciężar kg" v={kg} s={setKg} /><F l="Powtórzenia" v={reps} s={setReps} dec={false} /></div>
          {kg && reps ? (() => {
            const ep = reps === 1 ? kg : kg * (1 + reps / 30); const br = reps === 1 ? kg : kg * 36 / (37 - Math.min(reps, 36));
            const one = (ep + br) / 2;
            return <>
              <R v={`${kgFmt(one)} kg`} l="Szacowany 1RM" d={`Epley ${kgFmt(ep)} · Brzycki ${kgFmt(br)}. Najdokładniej do 10 powtórzeń.`} />
              <table className="t mt12"><thead><tr><th>% 1RM</th><th>Ciężar</th><th>~ powt.</th></tr></thead><tbody>
                {[[95, 2], [90, 4], [85, 6], [80, 8], [75, 10], [70, 12], [65, 15]].map(([p, r]) => <tr key={p}><td>{p}%</td><td className="bold num">{kgFmt(Math.round(one * p / 100 / 2.5) * 2.5)} kg</td><td className="muted">{r}</td></tr>)}
              </tbody></table>
            </>;
          })() : null}
        </>}
        {c === 'bmi' && <>
          <div className="grid2"><F l="Waga kg" v={w} s={setW} /><F l="Wzrost cm" v={h} s={setH} dec={false} /></div>
          {w && h ? (() => { const b = w / hm ** 2; return <R v={b.toFixed(1)} l={b < 18.5 ? 'Niedowaga' : b < 25 ? 'Prawidłowa masa' : b < 30 ? 'Nadwaga' : 'Otyłość'} d="BMI nie odróżnia mięśni od tłuszczu – u osób trenujących lepiej patrzeć na FFMI i obwód talii." />; })() : null}
        </>}
        {c === 'ffmi' && <>
          <div className="grid3"><F l="Waga kg" v={w} s={setW} /><F l="Wzrost cm" v={h} s={setH} dec={false} /><F l="Tłuszcz %" v={bf} s={setBf} /></div>
          {w && h && bf ? (() => { const lean = w * (1 - bf / 100); const f = lean / hm ** 2 + 6.1 * (1.8 - hm); const t = sex === 'm' ? [18, 20, 22, 23.5] : [14, 16, 18, 19.5]; return <R v={f.toFixed(1)} l={f < t[0] ? 'Poniżej średniej' : f < t[1] ? 'Średnio' : f < t[2] ? 'Powyżej średniej' : f < t[3] ? 'Bardzo dobrze' : 'Wybitnie'} d={`Beztłuszczowa masa ciała: ${kgFmt(lean)} kg. FFMI znormalizowany do 1,80 m.`} />; })() : null}
        </>}
        {c === 'bf' && <>
          <Seg value={sex} onChange={setSex} options={[{ v: 'm', l: 'Mężczyzna' }, { v: 'k', l: 'Kobieta' }]} />
          <div className="grid2"><F l="Wzrost cm" v={h} s={setH} dec={false} /><F l="Talia (pępek) cm" v={waist} s={setWaist} /><F l="Szyja cm" v={neck} s={setNeck} />{sex === 'k' && <F l="Biodra cm" v={hip} s={setHip} />}</div>
          {h && waist && neck && (sex === 'm' || hip) ? (() => {
            const v = sex === 'm' ? 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h)) - 450 : 495 / (1.29579 - 0.35004 * Math.log10(waist + hip! - neck) + 0.221 * Math.log10(h)) - 450;
            return <R v={`${v.toFixed(1)}%`} l="Tkanka tłuszczowa (metoda obwodów)" d="Mierz rano, taśmą przylegającą do skóry. Śledź trend, nie pojedynczy wynik." />;
          })() : <div className="xs muted">Metoda obwodów (US Navy) – wystarczy centymetr krawiecki.</div>}
        </>}
        {c === 'kcal' && <>
          <Seg value={sex} onChange={setSex} options={[{ v: 'm', l: 'Mężczyzna' }, { v: 'k', l: 'Kobieta' }]} />
          <div className="grid3"><F l="Waga kg" v={w} s={setW} /><F l="Wzrost cm" v={h} s={setH} dec={false} /><F l="Wiek" v={age} s={setAge} dec={false} /></div>
          <div className="chips" style={{ flexWrap: 'wrap' }}>{([[1.2, 'Siedzący'], [1.375, 'Lekko'], [1.55, 'Umiarkowanie'], [1.725, 'Aktywnie'], [1.9, 'B. aktywnie']] as [number, string][]).map(([v, l]) => <button key={v} className={`chip ${act === v ? 'on' : ''}`} onClick={() => setAct(v)}>{l}</button>)}</div>
          <Seg value={goal} onChange={setGoal} options={[{ v: 'red', l: 'Redukcja' }, { v: 'keep', l: 'Utrzymanie' }, { v: 'mass', l: 'Masa' }]} />
          {bmr ? (() => { const tdee = bmr * act; const t = goal === 'red' ? tdee - 400 : goal === 'mass' ? tdee + 250 : tdee; return <R v={`${Math.round(t)} kcal`} l={goal === 'red' ? 'Na redukcję (−400 kcal)' : goal === 'mass' ? 'Na masę (+250 kcal)' : 'Zapotrzebowanie (TDEE)'} d={`Podstawowa przemiana (Mifflin‑St Jeor): ${Math.round(bmr)} kcal · TDEE ${Math.round(tdee)} kcal. ${goal === 'red' ? 'Celuj w spadek 0,5–1% masy/tydz.' : goal === 'mass' ? 'Celuj w przyrost ok. 0,25–0,5% masy/tydz.' : ''}`} />; })() : null}
        </>}
        {c === 'protein' && <>
          <F l="Waga kg" v={w} s={setW} />
          {w ? <R v={`${Math.round(w * 1.6)}–${Math.round(w * 2.2)} g`} l="Białko dziennie" d="1,6–2,2 g/kg masy ciała. Na redukcji bliżej górnej granicy. Rozłóż na 3–5 posiłków po 25–40 g." /> : null}
        </>}
        {c === 'water' && <>
          <F l="Waga kg" v={w} s={setW} />
          {w ? <R v={`${(w * 0.035).toFixed(1)} l`} l="Woda dziennie" d={`ok. 35 ml/kg. W dni treningowe dodaj ~0,5–0,75 l na godzinę treningu (razem ${(w * 0.035 + 0.6).toFixed(1)} l).`} /> : null}
        </>}
      </div>
      <p className="xs muted mt12">Wyniki są orientacyjne i nie zastępują konsultacji ze specjalistą.</p>
    </div>
  );
}
