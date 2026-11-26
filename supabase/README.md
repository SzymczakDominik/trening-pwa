# Strava – konfiguracja

1. Na https://www.strava.com/settings/api utwórz aplikację. **Authorization Callback Domain:** `szymczakdominik.github.io`.
2. W Supabase (projekt „Trening”) → SQL Editor uruchom `migrations/20261126_strava.sql`.
3. Edge Functions → *Deploy a new function* → nazwa `strava`, wklej `functions/strava/index.ts`.
4. Edge Functions → Secrets: dodaj `STRAVA_CLIENT_ID` i `STRAVA_CLIENT_SECRET`.
5. W aplikacji: Więcej → Strava → Połącz.

Client secret i tokeny nigdy nie trafiają do przeglądarki – tokeny leżą w tabeli `strava_tokens` (RLS bez polityk), dostęp ma tylko funkcja.
