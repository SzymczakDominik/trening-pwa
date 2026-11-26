import { createClient, type Session as AuthSession, type SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import type { AppData } from '../types';
import { mergeData, useStore } from './store';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export type SyncState = 'off' | 'idle' | 'syncing' | 'ok' | 'error' | 'offline';

export async function pull(userId: string): Promise<AppData | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('user_data').select('data').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data?.data as AppData) ?? null;
}

export async function push(userId: string, d: AppData) {
  if (!supabase) return;
  const { error } = await supabase.from('user_data').upsert({ user_id: userId, data: d, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Hook: sesja logowania + automatyczna synchronizacja (pobierz → scal → wyślij; potem wysyłka po każdej zmianie). */
export function useAuthSync() {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [state, setState] = useState<SyncState>(supabase ? 'idle' : 'off');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const ready = useRef(false);
  const timer = useRef<number>();
  const data = useStore((s) => s.data);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setAuth(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuth(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const fullSync = async (userId: string) => {
    if (!navigator.onLine) { setState('offline'); return; }
    setState('syncing');
    try {
      const remote = await pull(userId);
      const local = useStore.getState().data;
      const merged = remote ? mergeData(local, remote) : local;
      if (remote) useStore.getState().replaceData(merged);
      await push(userId, merged);
      ready.current = true;
      setState('ok'); setLastSync(Date.now());
    } catch (e) {
      console.error(e); setState('error');
    }
  };

  // po zalogowaniu i przy powrocie do aplikacji
  useEffect(() => {
    ready.current = false;
    if (!auth?.user) return;
    const id = auth.user.id;
    fullSync(id);
    const onVis = () => { if (document.visibilityState === 'visible') fullSync(id); };
    const onOnline = () => fullSync(id);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', onOnline);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', onOnline); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user?.id]);

  // wysyłka zmian (debounce)
  useEffect(() => {
    if (!auth?.user || !ready.current) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      if (!navigator.onLine) { setState('offline'); return; }
      try { setState('syncing'); await push(auth.user.id, useStore.getState().data); setState('ok'); setLastSync(Date.now()); }
      catch { setState('error'); }
    }, 1500);
  }, [data, auth?.user]);

  return { auth, state, lastSync, syncNow: () => auth?.user && fullSync(auth.user.id) };
}
