import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { useNav } from '../nav';
import { Icon, TopBar, toast } from '../components/ui';
import { supabase } from '../lib/sync';
import { fmtDate, fmtDuration } from '../lib/calc';
import { sendSessionToStrava, stravaActivities, stravaConnect, stravaDisconnect, stravaStatus, type StravaActivity, type StravaStatus } from '../lib/strava';
import type { SyncInfo } from './More';

const SPORT: Record<string, string> = { Run: 'Bieg', TrailRun: 'Bieg w terenie', Ride: 'Rower', VirtualRide: 'Rower (trenażer)', GravelRide: 'Gravel', MountainBikeRide: 'MTB', Walk: 'Spacer', Hike: 'Wędrówka', Swim: 'Pływanie', WeightTraining: 'Trening siłowy', Workout: 'Trening', Yoga: 'Joga' };
const km = (m: number) => (m / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 });

export function StravaScreen({ sync }: { sync: SyncInfo }) {
  const { pop } = useNav();
  const profile = useStore((s) => s.data.profile);
  const setProfile = useStore((s) => s.setProfile);
  const sessions = useStore((s) => s.data.sessions);
  const [st, setSt] = useState<StravaStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acts, setActs] = useState<StravaActivity[] | null>(null);
  const user = sync.auth?.user;

  useEffect(() => {
    if (!user) return;
    stravaStatus().then(setSt).catch((e) => setErr((e as Error).message));
  }, [user?.id]);

  useEffect(() => {
    if (!st?.connected) return;
    stravaActivities().then((a) => setActs(a.filter((x) => x.sport !== 'WeightTraining'))).catch((e) => setErr((e as Error).message));
  }, [st?.connected]);

  const unsent = sessions.filter((s) => !s.deleted && s.finishedAt && !s.stravaId && s.entries.length && s.date >= new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10));

  const sendAll = async () => {
    setBusy(true);
    let ok = 0;
    for (const s of unsent) { try { await sendSessionToStrava(s.id); ok++; } catch (e) { toast((e as Error).message); break; } }
    if (ok) toast(`Wysłano do Stravy: ${ok}`);
    setBusy(false);
  };

  let body;
  if (!supabase) body = <div className="card small muted">Najpierw skonfiguruj synchronizację w chmurze (Więcej → Konto).</div>;
  else if (!user) body = (
    <div className="card small">Strava łączy się z kontem FORMA, żeby bezpiecznie trzymać dostęp w chmurze. <button className="accent bold" onClick={() => useNav.getState().push({ name: 'account' })}>Zaloguj się</button></div>
  );
  else if (!st) body = <div className="card small muted">{err ?? 'Sprawdzam połączenie…'}</div>;
  else if (!st.connected) body = (
    <div className="stack">
      <div className="card small" style={{ lineHeight: 1.55 }}>
        Po połączeniu zakończone treningi mogą trafiać na Stravę jako <b>trening siłowy</b> – z czasem trwania i opisem serii. Pobierzemy też Twoje biegi i rowery, żeby pokazać je obok siłowni.
      </div>
      {err && <div className="hint">{err}</div>}
      <button className="btn primary block" disabled={busy} onClick={async () => { setBusy(true); setErr(null); try { await stravaConnect(); } catch (e) { setErr((e as Error).message); setBusy(false); } }}><Icon name="activity" size={18} /> {busy ? '…' : 'Połącz ze Stravą'}</button>
      <p className="xs muted">Zgody: odczyt profilu i aktywności oraz zapis aktywności. Dostęp możesz cofnąć tutaj albo w ustawieniach Stravy.</p>
    </div>
  );
  else body = (
    <div className="stack">
      <div className="card">
        <div className="small muted">Połączono jako</div>
        <div className="bold" style={{ fontSize: 18 }}>{st.athlete ?? 'konto Strava'}</div>
      </div>
      <button className="card between" style={{ width: '100%' }} onClick={() => setProfile({ stravaAuto: !profile.stravaAuto })}>
        <div style={{ textAlign: 'left' }}><div className="bold">Wysyłaj treningi automatycznie</div><div className="xs muted">Po zapisaniu treningu trafi na Stravę (wymaga internetu)</div></div>
        <span className={`chip ${profile.stravaAuto ? 'on' : ''}`}>{profile.stravaAuto ? 'wł.' : 'wył.'}</span>
      </button>
      {unsent.length > 0 && <button className="btn block" disabled={busy} onClick={sendAll}>{busy ? 'Wysyłam…' : `Wyślij niewysłane treningi (${unsent.length})`}</button>}
      <div className="card">
        <div className="bold">Biegi, rowery i inne (ostatnie 30 dni)</div>
        {acts === null && <div className="small muted mt8">{err ?? 'Pobieram…'}</div>}
        {acts?.length === 0 && <div className="small muted mt8">Brak aktywności.</div>}
        {acts && acts.length > 0 && (
          <div className="small mt8" style={{ display: 'grid', gap: 8 }}>
            <div className="muted">Razem: {acts.length} · {km(acts.reduce((a, x) => a + x.distance, 0))} km · {fmtDuration(acts.reduce((a, x) => a + x.moving_time, 0) * 1000)}</div>
            {acts.slice(0, 12).map((x) => (
              <div key={x.id} className="between">
                <div><div className="bold">{x.name}</div><div className="xs muted">{SPORT[x.sport] ?? x.sport} · {fmtDate(x.date.slice(0, 10))}</div></div>
                <div className="xs muted" style={{ textAlign: 'right' }}>{x.distance > 0 ? `${km(x.distance)} km · ` : ''}{fmtDuration(x.moving_time * 1000)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {err && <div className="hint">{err}</div>}
      <button className="btn danger block" onClick={async () => { if (!confirm('Odłączyć Stravę? Treningi już wysłane zostają na Stravie.')) return; try { await stravaDisconnect(); setSt({ connected: false, athlete: null }); setActs(null); setProfile({ stravaAuto: false }); toast('Odłączono Stravę'); } catch (e) { toast((e as Error).message); } }}>Odłącz Stravę</button>
    </div>
  );

  return <div className="screen"><TopBar title="Strava" onBack={pop} />{body}</div>;
}
