import { useCallback, useEffect, useState } from 'react';
import { supabase } from './sync';

export interface HealthDay { day: string; steps?: number; active_kcal?: number; updated_at?: string }
const CACHE = 'forma-health-v1';

const readCache = (): Record<string, HealthDay> => { try { return JSON.parse(localStorage.getItem(CACHE) || '{}'); } catch { return {}; } };
const writeCache = (c: Record<string, HealthDay>) => { try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch { /* brak */ } };

/** Pobiera ostatnie dni danych ze Zdrowia (wysyłane Skrótem iOS). Działa offline z pamięci podręcznej. */
export async function fetchHealth(): Promise<Record<string, HealthDay>> {
  const cache = readCache();
  if (!supabase) return cache;
  try {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return cache;
    const { data, error } = await supabase.from('health_daily').select('day,steps,active_kcal,updated_at').order('day', { ascending: false }).limit(60);
    if (error || !data) return cache;
    const next = { ...cache };
    for (const r of data as HealthDay[]) next[r.day] = r;
    writeCache(next);
    return next;
  } catch { return cache; }
}

export function useHealth(date: string) {
  const [all, setAll] = useState<Record<string, HealthDay>>(readCache);
  const refresh = useCallback(() => { fetchHealth().then(setAll); }, []);
  useEffect(() => {
    refresh();
    const on = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [refresh]);
  return { day: all[date] as HealthDay | undefined, all, refresh };
}

/** Klucz do Skrótu iOS (tworzony raz; zwraca null, gdy brak konta lub tabeli). */
export async function getHealthToken(create: boolean): Promise<{ token?: string; error?: string }> {
  if (!supabase) return { error: 'Brak połączenia z chmurą.' };
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return { error: 'Zaloguj się w „Konto i synchronizacja".' };
  const sel = await supabase.from('health_tokens').select('token').eq('user_id', uid).maybeSingle();
  if (sel.error) return { error: 'Brak tabel w bazie – wklej SQL z pliku supabase/health.sql.' };
  if (sel.data?.token) return { token: sel.data.token as string };
  if (!create) return {};
  const ins = await supabase.from('health_tokens').insert({ user_id: uid }).select('token').single();
  if (ins.error || !ins.data) return { error: 'Nie udało się utworzyć klucza.' };
  return { token: ins.data.token as string };
}

export async function resetHealthToken(): Promise<void> {
  if (!supabase) return;
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id; if (!uid) return;
  await supabase.from('health_tokens').delete().eq('user_id', uid);
}
