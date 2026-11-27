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
  const body = `{\n  "p_token": "${token ?? 'TWÓJ-KLUCZ'}",\n  "p_day": "<Dzień>",\n  "p_steps": <Kroki>,\n  "p_active_kcal": <Kalorie>\n}`;

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
      <ol className="small stack mt8" style={{ paddingLeft: 18, listStyle: 'decimal', gap: 8 }}>
        <li>Skróty → <b>+</b> → nowy skrót, nazwij go „FORMA Zdrowie".</li>
        <li>Dodaj <b>Znajdź próbki zdrowia</b>: typ <b>Kroki</b>, „Data rozpoczęcia jest dzisiaj". Potem <b>Oblicz statystyki</b> (Suma) i <b>Ustaw zmienną</b> o nazwie <b>Kroki</b>.</li>
        <li>To samo dla typu <b>Energia aktywna</b>. Wynik zaokrąglij akcją <b>Zaokrąglij liczbę</b> i zapisz jako zmienną <b>Kalorie</b>.</li>
        <li><b>Data bieżąca</b> → <b>Formatuj datę</b> (własny format <b>yyyy-MM-dd</b>) → zmienna <b>Dzień</b>.</li>
        <li><b>Pobierz zawartość URL</b>: metoda <b>POST</b>, adres i nagłówki jak niżej, treść żądania <b>JSON</b> z pól jak niżej (Dzień jako tekst, Kroki i Kalorie jako liczby).</li>
        <li>Skróty → <b>Automatyzacja</b> → „Pora dnia" (np. 12:00 i 21:00) → uruchom skrót <b>natychmiast</b>, bez pytania.</li>
      </ol>
      <div className="stack mt12">
        <Copy label="Adres (URL)" value={ENDPOINT} />
        <Copy label="Nagłówek apikey" value={API_KEY} />
        <Copy label="Nagłówek Content-Type" value="application/json" />
        <Copy label="Treść JSON" value={body} />
      </div>

      <div className="card2 mt16 xs muted">
        Dane z Garmina trafią do Zdrowia tylko wtedy, gdy aplikacja zegarka zapisuje je w apce Zdrowie. Sprawdzisz to w Zdrowie → Udostępnianie → Aplikacje. Jeśli jej tam nie ma, Skrót wyśle kroki z iPhone'a (lub Apple Watch).
      </div>
      <button className="btn ghost block mt12" onClick={load}>Odśwież</button>
    </div>
  );
}
