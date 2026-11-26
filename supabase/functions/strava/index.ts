// Edge function „strava”: OAuth, wysyłka treningów i pobieranie aktywności.
// Client secret i tokeny żyją tylko tutaj (sekrety funkcji + tabela strava_tokens).
// Sekrety do ustawienia: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET
// (SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY dodaje Supabase automatycznie).
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SCOPE = 'read,activity:read_all,activity:write';
const clientId = Deno.env.get('STRAVA_CLIENT_ID') ?? '';
const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

async function tokenRequest(params: Record<string, string>) {
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(400, 'Strava odrzuciła autoryzację – spróbuj połączyć ponownie.');
  return j;
}

/** Zwraca ważny access token (odświeża, gdy wygasa). */
async function accessToken(userId: string): Promise<string> {
  const { data: row } = await admin.from('strava_tokens').select('*').eq('user_id', userId).maybeSingle();
  if (!row) throw new HttpError(409, 'Strava nie jest połączona.');
  if (new Date(row.expires_at).getTime() - Date.now() > 120_000) return row.access_token;
  const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: row.refresh_token });
  await admin.from('strava_tokens').update({
    access_token: t.access_token, refresh_token: t.refresh_token,
    expires_at: new Date(t.expires_at * 1000).toISOString(), updated_at: new Date().toISOString(),
  }).eq('user_id', userId);
  return t.access_token;
}

async function stravaApi(userId: string, path: string, init?: RequestInit) {
  const tok = await accessToken(userId);
  const r = await fetch(`https://www.strava.com/api/v3${path}`, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${tok}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) throw new HttpError(409, 'Strava odrzuciła dostęp – połącz konto ponownie.');
    if (r.status === 429) throw new HttpError(429, 'Limit zapytań Stravy – spróbuj za kilkanaście minut.');
    throw new HttpError(502, `Strava: ${j?.message ?? r.status}`);
  }
  return j;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!clientId || !clientSecret) throw new HttpError(500, 'Brak sekretów STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET w Supabase.');
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /i, '');
    const { data: u, error: ue } = await admin.auth.getUser(jwt);
    if (ue || !u.user) throw new HttpError(401, 'Zaloguj się do konta FORMA.');
    const userId = u.user.id;
    const body = await req.json().catch(() => ({}));

    switch (body.action) {
      case 'status': {
        const { data } = await admin.from('strava_tokens').select('athlete_id, athlete_name, scope').eq('user_id', userId).maybeSingle();
        return json({ connected: !!data, athlete: data?.athlete_name ?? null, scope: data?.scope ?? null });
      }
      case 'auth_url': {
        const redirect = String(body.redirect_uri ?? '');
        if (!/^https?:\/\//.test(redirect)) throw new HttpError(400, 'Nieprawidłowy adres powrotu.');
        const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: 'code', approval_prompt: 'auto', scope: SCOPE, state: String(body.state ?? '') });
        return json({ url: `https://www.strava.com/oauth/authorize?${q}` });
      }
      case 'exchange': {
        const t = await tokenRequest({ grant_type: 'authorization_code', code: String(body.code ?? '') });
        const scope = String(body.scope ?? '');
        if (!scope.includes('activity:write')) throw new HttpError(400, 'Zaznacz zgodę na zapisywanie aktywności, inaczej nie wyślę treningów.');
        const name = [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(' ') || null;
        const { error } = await admin.from('strava_tokens').upsert({
          user_id: userId, athlete_id: t.athlete?.id, athlete_name: name,
          access_token: t.access_token, refresh_token: t.refresh_token,
          expires_at: new Date(t.expires_at * 1000).toISOString(), scope, updated_at: new Date().toISOString(),
        });
        if (error) throw new HttpError(500, 'Nie udało się zapisać połączenia.');
        return json({ connected: true, athlete: name });
      }
      case 'upload': {
        const a = body.activity ?? {};
        const created = await stravaApi(userId, '/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            name: String(a.name ?? 'Trening siłowy').slice(0, 200),
            sport_type: 'WeightTraining',
            start_date_local: String(a.start_date_local),
            elapsed_time: String(Math.max(60, Math.round(Number(a.elapsed_time) || 0))),
            description: String(a.description ?? '').slice(0, 4000),
          }),
        });
        return json({ id: created.id });
      }
      case 'activities': {
        const after = Math.floor(Number(body.after) || (Date.now() / 1000 - 30 * 86400));
        const list = await stravaApi(userId, `/athlete/activities?after=${after}&per_page=60`);
        return json({
          activities: (Array.isArray(list) ? list : []).map((x: any) => ({
            id: x.id, name: x.name, sport: x.sport_type ?? x.type, date: x.start_date_local,
            distance: x.distance, moving_time: x.moving_time, elevation: x.total_elevation_gain,
          })),
        });
      }
      case 'disconnect': {
        try {
          const tok = await accessToken(userId);
          await fetch('https://www.strava.com/oauth/deauthorize', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ access_token: tok }) });
        } catch { /* i tak usuwamy lokalnie */ }
        await admin.from('strava_tokens').delete().eq('user_id', userId);
        return json({ connected: false });
      }
      default:
        throw new HttpError(400, 'Nieznana akcja.');
    }
  } catch (e) {
    const err = e instanceof HttpError ? e : new HttpError(500, 'Błąd serwera.');
    if (!(e instanceof HttpError)) console.error(e);
    return json({ error: err.message }, err.status);
  }
});
