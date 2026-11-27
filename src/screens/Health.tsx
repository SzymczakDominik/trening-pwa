import { useEffect, useState } from 'react';
import { TopBar, toast } from '../components/ui';
import { useNav } from '../nav';
import { fetchHealth, getHealthToken, resetHealthToken, type HealthDay } from '../lib/health';

const URL_BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const API_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
const ENDPOINT = `${URL_BASE}/rest/v1/rpc/ingest_health`;

function Copy({ label, value }: { label: string; value: string }) {
  return (
    <div className="card2" style={{ padding: 12 }}>
      <div className="xs muted bold" style={{ letterSpacing: '.07em', textTransform: 'uppercase' }}>{label}</div>
      <div className="small mt8" style={{ wordBreak: 'break-all', fontFamily: 'ui-monospace, Menlo, monospace', userSelect: 'all' }}>{value}</div>
      <button className="btn sm ghost mt8" onClick={() => { navigator.clipboard?.writeText(value).then(() => toast('Skopiowano'), () => toast('Nie udało się skopiować')); }}>Kopiuj</button>
    </div>
  );
}

export function HealthSetup() {
  const { pop } = useNav();
  const [token, setToken] = useState<string | undefined>();
  const [err, setErr] = useState<string | undefined>();
  const [last, setLast] = useState<HealthDay | undefined>();
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const t = await getHealthToken(false);
    setToken(t.token); setErr(t.error);
    const all = await fetchHealth();
    setLast(Object.values(all).sort((a, b) => b.day.localeCompare(a.day))[0]);
  };
  useEffect(() => { load(); }, []);

  const create = async () => { setBusy(true); const t = await getHealthToken(true); setToken(t.token); setErr(t.error); setBusy(false); };

  return (
    <div className="screen">
      <TopBar onBack={pop} title="Zdrowie i kroki" />
      <p className="small muted">Aplikacja nie ma wglądu w apkę Zdrowie na iPhonie, więc dane wysyła do niej prosty Skrót iOS: kroki i energia aktywna z dnia. Trafiają do kółka „spalone" w zakładce Żywienie. Konfiguracja trwa kilka minut i robisz ją raz.</p>

      {err && <div className="card2 mt12 small" style={{ borderColor: 'rgba(255,107,107,.4)' }}>{err}</div>}

      {last && <div className="card2 mt12 small">Ostatnie dane: <b>{last.day}</b> · {last.steps ?? '—'} kroków · {last.active_kcal ?? '—'} kcal</div>}

      <h2 className="mt16" style={{ fontSize: 18 }}>1. Klucz</h2>
      {token ? (
        <div className="stack mt8">
          <Copy label="Twój klucz" value={token} />
          <button className="btn sm ghost" onClick={async () => { if (confirm('Wygenerować nowy klucz? Stary Skrót przestanie działać.')) { await resetHealthToken(); setToken(undefined); create(); } }}>Wygeneruj nowy klucz</button>
        </div>
      ) : (
        <button className="btn primary block mt8" disabled={busy} onClick={create}>{busy ? 'Tworzę…' : 'Utwórz klucz'}</button>
      )}

      <h2 className="mt16" style={{ fontSize: 18 }}>2. Skrót w aplikacji Skróty</h2>
      <ol className="small stack mt8" style={{ paddingLeft: 18, listStyle: 'decimal', gap: 10 }}>
        <li>Otwórz aplikację <b>Skróty</b> na iPhonie. Zakładka <b>Skróty</b> → przycisk <b>+</b> (u góry). Nazwij skrót <b>FORMA Zdrowie</b>.</li>
        <li><b>Dodaj działanie</b> → wyszukaj <b>Znajdź próbki zdrowia</b> (Find Health Samples). Dotknij <b>Dodaj filtr</b>: <b>Typ</b> = <b>Kroki</b>; drugi filtr <b>Data rozpoczęcia</b> = <b>jest dzisiaj</b>.</li>
        <li>Dodaj działanie <b>Oblicz statystyki</b> (Calculate Statistics): wybierz <b>Suma</b>. Dodaj <b>Zaokrąglij liczbę</b> (bez miejsc po przecinku), potem <b>Ustaw zmienną</b> i nazwij ją <b>Kroki</b>.</li>
        <li>To samo drugi raz: <b>Znajdź próbki zdrowia</b> z typem <b>Energia aktywna</b> i „Data rozpoczęcia jest dzisiaj" → <b>Oblicz statystyki</b> (Suma) → <b>Zaokrąglij liczbę</b> → <b>Ustaw zmienną</b> o nazwie <b>Kalorie</b>.</li>
        <li>Dodaj <b>Data bieżąca</b> → <b>Formatuj datę</b>: format <b>Własny</b>, wpisz <b>yyyy-MM-dd</b> → <b>Ustaw zmienną</b> o nazwie <b>Dzień</b>.</li>
        <li>Dodaj <b>Pobierz zawartość URL</b>. Wklej adres z pola poniżej. Rozwiń strzałką <b>Pokaż więcej</b>: <b>Metoda</b> = <b>POST</b>. W <b>Nagłówki</b> dodaj dwa: <b>apikey</b> (wartość z pola poniżej) i <b>Content-Type</b> = <b>application/json</b>. <b>Treść żądania</b> = <b>JSON</b>.</li>
        <li>W treści JSON dotknij <b>Dodaj nowe pole</b> cztery razy: <b>Tekst</b> o kluczu <b>p_token</b> (wklej swój klucz); <b>Tekst</b> o kluczu <b>p_day</b> (wartość: zmienna <b>Dzień</b>); <b>Liczba</b> o kluczu <b>p_steps</b> (zmienna <b>Kroki</b>); <b>Liczba</b> o kluczu <b>p_active_kcal</b> (zmienna <b>Kalorie</b>). Zmienną wstawisz, dotykając pola wartości i wybierając ją nad klawiaturą.</li>
        <li>Dotknij ▶ w skrócie i zezwól na dostęp do danych Zdrowia (kroki, energia aktywna) oraz do sieci.</li>
        <li>Wróć tu i dotknij <b>Odśwież</b>: u góry pojawi się „Ostatnie dane".</li>
        <li>Automatyzacja: zakładka <b>Automatyzacja</b> → <b>+</b> → <b>Pora dnia</b> (np. 21:00, codziennie) → <b>Uruchom skrót</b> <b>FORMA Zdrowie</b> → ustaw <b>Uruchom natychmiast</b> i wyłącz powiadomienie.</li>
      </ol>
      <div className="stack mt12">
        <Copy label="Adres (URL)" value={ENDPOINT} />
        <Copy label="Nagłówek apikey" value={API_KEY} />
        <Copy label="Nagłówek Content-Type" value="application/json" />
        
      </div>

      <div className="card2 mt16 xs muted">
        Dane z Garmina trafią do Zdrowia tylko wtedy, gdy aplikacja zegarka zapisuje je w apce Zdrowie. Sprawdzisz to w Zdrowie → Udostępnianie → Aplikacje. Jeśli jej tam nie ma, Skrót wyśle kroki z iPhone'a (lub Apple Watch).
      </div>
      <button className="btn ghost block mt12" onClick={load}>Odśwież</button>
    </div>
  );
}
