-- Tokeny Stravy użytkownika. Tabela dostępna WYŁĄCZNIE dla edge function
-- (service role). RLS włączone i brak polityk = przeglądarka nie ma dostępu.
create table if not exists public.strava_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  athlete_id bigint not null,
  athlete_name text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.strava_tokens enable row level security;
revoke all on public.strava_tokens from anon, authenticated;
