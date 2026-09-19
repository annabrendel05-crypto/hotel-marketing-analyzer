# Hotel Marketing Analyzer

Hotel Marketing Analyzer (HMA) to aplikacja do analizy marketingu i sprzedaży hotelowej. Łączy dane z GA4, Meta Ads, Google Ads i Profitroom, aby pokazać sprzedaż, lejek rezerwacyjny, efektywność kampanii oraz najważniejsze problemy biznesowe.

## Problem biznesowy

Skuteczności marketingu hotelu nie da się ocenić na podstawie jednej platformy reklamowej. Goście korzystają z różnych kanałów, a systemy analityczne, reklamowe i rezerwacyjne mierzą różne etapy ścieżki. HMA zestawia te perspektywy, nie utożsamiając konwersji raportowanych przez reklamy z potwierdzoną sprzedażą.

## Architektura

```text
GA4 / Meta Ads / Google Ads / Profitroom
  → BigQuery
  → backend HMA
  → modularny silnik diagnostyczny
  → Priority Engine
  → UI
  → warstwa językowa AI / Czat AI
```

BigQuery stanowi warstwę danych. Profitroom jest źródłem potwierdzonej sprzedaży, a Meta Ads i Google Ads dostarczają danych raportowanych przez platformy reklamowe. Silnik diagnostyczny ustala diagnozy, a Priority Engine ich priorytety. AI otrzymuje gotowe wyniki i wyjaśnia je prostym językiem — nie ustala progów, diagnoz ani priorytetów.

Supabase jest wykorzystywany wyłącznie do uwierzytelniania użytkowników. Dane raportowe HMA są pobierane z BigQuery.

Dashboard i endpointy aplikacji są dostępne wyłącznie dla uwierzytelnionych użytkowników posiadających aktywną sesję Supabase.

## Główne widoki

- Podsumowanie okresu
- Sprzedaż
- Lejek
- Meta Ads
- Google Ads
- Jakość danych
- Rola kanałów
- Czat AI

## Dane demonstracyjne

Aplikacja demonstracyjna korzysta z danych syntetycznych, których struktura odwzorowuje rzeczywiste źródła. Surowe eksporty i robocze pliki kalibracyjne nie są publikowane w repozytorium. Dokumentacja nie ujawnia szczegółowych reguł kalibracji ani pełnego procesu generowania danych.

Aktualna wersja publiczna korzysta z danych syntetycznych przechowywanych w BigQuery. Architektura aplikacji została przygotowana tak, aby warstwę demonstracyjną można było zastąpić danymi rzeczywistymi z GA4, Meta Ads, Google Ads i systemu rezerwacyjnego bez zmiany logiki diagnostycznej i interfejsu.

## Uruchomienie lokalne

Wymagane są Node.js 24.x, npm, dostęp do BigQuery i projekt Supabase. OpenAI API jest opcjonalne — bez niego raporty pozostają dostępne, a funkcje AI korzystają z obsługi niedostępności usługi.

```bash
cd prototype
npm install
```

## Wymagane zmienne środowiskowe

| Zmienna | Wymagana | Zastosowanie |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Tak | Adres projektu Supabase używanego do logowania |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Tak | Publiczny klucz Supabase używany przez aplikację |
| `GOOGLE_APPLICATION_CREDENTIALS` | Tak | Ścieżka do pliku JSON konta serwisowego z dostępem do BigQuery |
| `OPENAI_API_KEY` | Nie | Obsługa funkcji AI i Czatu AI |
| `OPENAI_AI_SUMMARY_MODEL` | Nie | Wybór modelu OpenAI używanego przez warstwę AI |

- `NEXT_PUBLIC_*` są zmiennymi publicznymi po stronie frontendu i nie powinny zawierać sekretów.
- `OPENAI_API_KEY` oraz plik Google credentials są sekretami i nie mogą trafiać do repozytorium.
- Brak `OPENAI_API_KEY` nie blokuje działania raportów; niedostępne są tylko funkcje AI.

Utwórz plik `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
OPENAI_AI_SUMMARY_MODEL=
```

Zmienne `OPENAI_*` są opcjonalne. `GOOGLE_APPLICATION_CREDENTIALS` musi wskazywać na plik JSON z credentials konta serwisowego z dostępem do BigQuery. Następnie uruchom:

```bash
GOOGLE_APPLICATION_CREDENTIALS="/ścieżka/do/service-account.json" npm run dev
```

Aplikacja będzie dostępna pod adresem [http://localhost:3000](http://localhost:3000). Nie dodawaj plików credentials ani `.env.local` do repozytorium.

## Testy

Projekt zawiera obecnie 16 testów regresyjnych modularnego silnika diagnostycznego i Priority Engine.

```bash
npm test
npx tsc --noEmit
npm run build
```

## Produkcja i technologie

Wersja produkcyjna: [Hotel Marketing Analyzer na Railway](https://hotel-marketing-analyzer-production.up.railway.app/).

Technologie: Next.js, TypeScript, BigQuery, Supabase, OpenAI API i Railway.
