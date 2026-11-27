-- Kroki i spalone kalorie z Zdrowia (iPhone / zegarek) przez Skrót iOS.
-- Uruchom raz w Supabase → SQL Editor.

create table if not exists public.health_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token uuid not null default gen_random_uuid()
);
alter table public.health_tokens enable row level security;
drop policy if exists "wlasny klucz - odczyt" on public.health_tokens;
drop policy if exists "wlasny klucz - zapis" on public.health_tokens;
drop policy if exists "wlasny klucz - usuwanie" on public.health_tokens;
create policy "wlasny klucz - odczyt" on public.health_tokens for select using (auth.uid() = user_id);
create policy "wlasny klucz - zapis" on public.health_tokens for insert with check (auth.uid() = user_id);
create policy "wlasny klucz - usuwanie" on public.health_tokens for delete using (auth.uid() = user_id);

create table if not exists public.health_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  steps int,
  active_kcal int,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.health_daily enable row level security;
drop policy if exists "wlasne dane zdrowia - odczyt" on public.health_daily;
create policy "wlasne dane zdrowia - odczyt" on public.health_daily for select using (auth.uid() = user_id);

create or replace function public.ingest_health(
  p_token uuid, p_day date, p_steps int default null, p_active_kcal int default null
) returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select user_id into uid from public.health_tokens where token = p_token;
  if uid is null then raise exception 'nieprawidlowy klucz'; end if;
  insert into public.health_daily (user_id, day, steps, active_kcal, updated_at)
  values (uid, p_day, p_steps, p_active_kcal, now())
  on conflict (user_id, day) do update set
    steps = coalesce(excluded.steps, public.health_daily.steps),
    active_kcal = coalesce(excluded.active_kcal, public.health_daily.active_kcal),
    updated_at = now();
end $$;
grant execute on function public.ingest_health(uuid, date, int, int) to anon, authenticated;
