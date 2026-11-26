# FORMA – dziennik treningowy (PWA)

Aplikacja do planowania treningów siłowych, logowania serii i śledzenia progresu. Działa w przeglądarce, instaluje się na iPhonie jako ikona na ekranie początkowym i działa offline.

**Adres:** https://szymczakdominik.github.io/trening-pwa/

## Funkcje

- **Dopasowanie planu** – krótka ankieta (staż, dni w tygodniu, cel, miejsce) i rekomendacja z biblioteki 8 planów (FBW, góra/dół, push/pull, PPL, dom).
- **Bloki 4‑tygodniowe** – kalendarz automatycznie przełącza bloki; tydzień 1–3 falowanie zapasu (RIR +1 → −1), tydzień 4 odciążenie. Po ostatnim bloku start kolejnego cyklu.
- **Edycja planu** – kolejność ćwiczeń, dodawanie/usuwanie/zamiana, serie, zakres powtórzeń, RIR, przerwa, ciężar startowy, superserie, duplikowanie treningów, własne ćwiczenia.
- **Logowanie treningu** – kg / powtórzenia / RIR dla każdej serii, podpowiedź ciężaru (podwójna progresja), historia „ostatnio”, dodawanie serii i ćwiczeń w trakcie.
- **Timer przerw** – startuje po odhaczeniu serii, odliczanie 3‑2‑1 z dźwiękiem, ±15 s, osobny timer „koniec ćwiczenia → następne ćwiczenie za…”, obsługa superserii.
- **Kalendarz** – zrobione / zaplanowane / opuszczone dni, tygodnie odciążenia, start bloków, ręczne oznaczanie dnia.
- **Statystyki** – szacowany 1RM (Epley + RIR), maks. ciężar, objętość, rekordy powtórzeń, wykresy 1/3/6 mies., tygodniowa objętość, trudne serie na partię mięśniową vs zakres 10–20.
- **Ciało** – waga, % tłuszczu, talia, BMI/FFMI.
- **Kalkulatory** – 1RM z tabelą %, BMI, FFMI, tkanka tłuszczowa (metoda obwodów), kalorie (Mifflin‑St Jeor), białko, woda.
- **Konta i synchronizacja** – Supabase Auth (e‑mail + hasło), dane w tabeli `user_data` z RLS; zapis lokalny działa offline, synchronizacja po powrocie sieci.

## Technologie

React 18 + TypeScript + Vite, `vite-plugin-pwa` (Workbox, manifest, offline), Zustand (stan + localStorage), Supabase JS, Vitest. Hosting: GitHub Pages (GitHub Actions).

## Rozwój lokalnie

```bash
npm install
npm run dev        # serwer deweloperski
npm test           # testy logiki progresji i harmonogramu
npm run build      # build produkcyjny
```

Konfiguracja Supabase w `.env.production` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` – klucz publiczny/publishable). Bez nich aplikacja działa w trybie lokalnym.

### Baza danych

```sql
create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
-- polityki: każdy użytkownik widzi i zmienia tylko swój wiersz (auth.uid() = user_id)
```
