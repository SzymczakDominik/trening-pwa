import { supabase } from './sync';
import { getExercise } from '../data/exercises';
import { workSets } from './calc';
import { useStore } from './store';
import type { Session } from '../types';

export interface StravaStatus { connected: boolean; athlete: string | null }
export interface StravaActivity { id: number; name: string; sport: string; date: string; distance: number; moving_time: number; elevation: number }

const STATE_KEY = 'forma-strava-state';

async function call<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('Chmura nie jest skonfigurowana.');
  const { data, error } = await supabase.functions.invoke('strava', { body: { action, ...extra } });
  if (error) {
    let msg = 'Nie udało się połączyć ze Stravą.';
    try { const j = await (error as { context?: Response }).context?.json(); if (j?.error) msg = j.error; } catch { /* brak treści */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const stravaStatus = () => call<StravaStatus>('status');
export const stravaDisconnect = () => call<StravaStatus>('disconnect');
export const stravaActivities = (afterSec?: number) => call<{ activities: StravaActivity[] }>('activities', { after: afterSec }).then((r) => r.activities);

const redirectUri = () => location.origin + location.pathname;

/** Przekierowuje do strony zgody Stravy. */
export async function stravaConnect() {
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem(STATE_KEY, state);
  const { url } = await call<{ url: string }>('auth_url', { redirect_uri: redirectUri(), state });
  location.href = url;
}

/** Jeśli wróciliśmy ze Stravy (?code=…), kończy łączenie. Zwraca komunikat albo null. */
export async function finishStravaRedirect(): Promise<{ ok: boolean; msg: string } | null> {
  const p = new URLSearchParams(location.search);
  const state = p.get('state');
  const saved = localStorage.getItem(STATE_KEY);
  if (!saved || state !== saved || !(p.get('code') || p.get('error'))) return null;
  localStorage.removeItem(STATE_KEY);
  const code = p.get('code'), scope = p.get('scope') ?? '';
  history.replaceState(null, '', location.pathname + location.hash);
  if (!code) return { ok: false, msg: 'Anulowano łączenie ze Stravą.' };
  try {
    const r = await call<{ athlete: string | null }>('exchange', { code, scope });
    return { ok: true, msg: `Połączono ze Stravą${r.athlete ? `: ${r.athlete}` : ''}` };
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}

const pl = (n: number) => (Math.round(n * 10) / 10).toLocaleString('pl-PL');

export function describeSession(s: Session): string {
  return s.entries.map((en) => {
    const sets = workSets(en);
    if (!sets.length) return '';
    return `${getExercise(en.exId).name}: ${sets.map((x) => (x.kg ? `${pl(x.kg)}×${x.reps}` : `${x.reps} powt.`)).join(', ')}`;
  }).filter(Boolean).join('\n');
}

export function sessionToActivity(s: Session) {
  const start = new Date(s.startedAt);
  const local = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().replace(/\.\d+Z$/, 'Z');
  return {
    name: s.workoutName, start_date_local: local,
    elapsed_time: ((s.finishedAt ?? s.startedAt) - s.startedAt) / 1000,
    description: describeSession(s),
  };
}

/** Wysyła zapisany trening do Stravy i zapamiętuje id aktywności (żeby nie wysłać dwa razy). */
export async function sendSessionToStrava(id: string): Promise<void> {
  const s = useStore.getState().data.sessions.find((x) => x.id === id);
  if (!s || s.deleted || s.stravaId || !s.entries.length) return;
  const { id: stravaId } = await call<{ id: number }>('upload', { activity: sessionToActivity(s) });
  useStore.getState().updateSession(id, (x) => { x.stravaId = stravaId; });
}
