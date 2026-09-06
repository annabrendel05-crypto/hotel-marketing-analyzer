# Projekt techniczny BigQuery — Hotel Marketing Analyzer

Wersja projektu: **0.2 — zaakceptowany projekt architektury BigQuery v1**. Data: 2026-09-06.

Etap 4 — Projekt BigQuery, krok 4.1. Podstawa: [zaakceptowany kontrakt analityczny 0.2](ANALYTICS_CONTRACT.md), commit `bb3e2dd` (`docs: accept analytics contract v1`).

**Zakres tego dokumentu:** projekt struktur, odpowiedzialności i późniejszego wdrożenia. Nazwy zasobów są propozycjami. Dokument nie tworzy zasobów, SQL, danych, poświadczeń ani integracji. Zaakceptowany kontrakt pozostaje bez zmian.

Oznaczenia: **USTALONE** oznacza zapis kontraktu; **PROPOZYCJA** oznacza rozwiązanie techniczne tego projektu; **OTWARTE** oznacza decyzję wymagającą uzgodnienia. O01–O14 w sekcji 14 tworzą pełny rejestr otwartych kwestii wraz z ryzykiem i momentem decyzji.

## 1. Cel i wynik przeglądu repozytorium

Celem jest przygotowanie jednej sprawdzalnej drogi od obserwacji źródłowej do liczby w aplikacji. Właścicielka hotelu ma widzieć, z czego wynika wskaźnik, na jaki okres się odnosi i dlaczego czasem pozostaje niedostępny. Programista otrzymuje ziarno danych, klucze, typy, etapy przetwarzania i kontrakt odczytu.

Sprawdzony punkt wyjścia:

- Gałąź `refactor/bigquery-foundation`; przed rozpoczęciem katalog roboczy czysty.
- Ostatnie commity: `bb3e2dd` — akceptacja kontraktu; `826a6b3` — migracja na Next.js; `70d737b` — demo z Auth; `571f585` — usunięcie demonstracyjnego bloku API; `d2e99cd` — notatka o teście wdrożenia.
- Root aplikacji: `prototype/`, standardowy Next.js 16.2.6, React 19.2.6, Node 24.x. Dashboard jest komponentem klienckim i korzysta z lokalnego `demo-data.ts` oraz stałych opisów.
- Supabase w aktualnym kodzie obsługuje Auth. Docelowe członkostwo, role i konfiguracja hotelu są wymaganiem kontraktu, a ich implementacja pozostaje kolejnym zadaniem.
- Repozytorium ma `01 Koncept/`, `docs/`, `supabase/` i `prototype/`. W `prototype/` są `app/`, `lib/`, `tests/`, `public/` oraz konfiguracje. Brakuje obecnych modeli lub połączenia BigQuery.

### 1.1. Przeczytane pliki i ich wpływ

| Pliki | Znaczenie dla projektu |
|---|---|
| `docs/ANALYTICS_CONTRACT.md` — pełna treść | Normatywne definicje, sześć widoków daily, pytania Q01–Q09, pięć warunków linked_booking_roas |
| `supabase/01_schema.sql` | Historyczny PostgreSQL: okresowe agregaty, UUID, NUMERIC, statusy i progi; model nie jest docelowym modelem BigQuery |
| `supabase/02_seed_synthetic.sql` | Starszy syntetyczny scenariusz, rezerwacje i diagnozy bez jednostkowych identyfikatorów łączenia |
| `supabase/03_audit.sql`, `04_audit_summary.sql`, `08_v2_audit.sql` | Inspiracja dla kontroli sum, jakości, zgodności hotelu i zakresu; ich wyników nie traktuje się jako wykonanych kontroli BigQuery |
| `supabase/05_readonly_policies.sql` | Historyczny publiczny odczyt danych syntetycznych; model dostępu aplikacji BigQuery będzie serwerowy |
| `supabase/06_demo_diagnosis_rpc.sql` | Historyczne RPC diagnozy; komentarze pozostają poza faktami BigQuery |
| `supabase/07_v2_periods_and_sales.sql`, `supabase/README.md` | Dwa okresy, dodatkowe pola i kanały; migracja pozostawia starsze kampanie i narracje, więc nie stanowi jednoznacznego seeda v1 |
| `prototype/lib/demo-data.ts` | Obecne nazwy pól, sumy kontrolne, agregat Meta i braki porównań |
| `prototype/lib/marketing-metrics.ts`, `campaign-data-sufficiency.ts` | Istniejące wzory i demonstracyjne progi; docelowo ocena jest serwerowa |
| `prototype/app/page.tsx` — typy, filtrowanie i obliczenia | Obecne agregaty okresowe, `number`, stałe statusy i narracje; przyszły adapter musi zachować semantykę kontraktu zamiast odtwarzać stare etykiety |
| `prototype/proxy.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts` | Weryfikacja sesji i granica klient/serwer; kontrola dostępu do hotelu pozostaje wymagana przed odczytem BigQuery |
| `prototype/package.json`, `tsconfig.json` | Runtime i typy; pakiet BigQuery będzie osobnym późniejszym zadaniem |

Zinwentaryzowano śledzone pliki i konfiguracje bez odczytu plików środowiska. Historyczne tabele `analysis_periods`, `diagnoses` i `evaluation_thresholds` nie są kopiowane jako analityczne tabele BigQuery. `package_bookings` i `booking_value` mają niepotwierdzoną semantykę; ich przypisanie jest O09. Źródłowa tabela „Meta Ads — Łącznie” jest agregatem, a nie odrębną kampanią do dodania do sumy kampanii.

## 2. Podział odpowiedzialności i przepływ

**USTALONE:** Profitroom jest kanonicznym źródłem sprzedaży, Meta i Google raportują własne wyniki, a `transaction_id` identyfikuje relację purchase–rezerwacja. Dodatkowa obserwacja marketingowa kwalifikuje rezerwację do płatnego zakresu. Progi i konfiguracja hotelu są w Supabase. Serwer wylicza KPI dla dowolnego zakresu od–do i wcześniejszego okresu identycznej długości.

**PROPOZYCJA:** surowe obserwacje i uporządkowane dane są dostępne tylko dla procesu importu/przetwarzania. Aplikacja ma odczyt sześciu widoków nad opublikowanymi dziennymi agregatami. Proces przebudowy odbywa się raz dziennie.

```mermaid
flowchart TD
    META["Meta Ads — dane syntetyczne"] --> RAW["hma_raw — obserwacje i rewizje źródeł"]
    GOOGLE["Google Ads — dane syntetyczne"] --> RAW
    GA["GA4 i Booking Engine — zdarzenia"] --> RAW
    PR["Profitroom — rezerwacje i statusy"] --> RAW
    OBS["Obserwacje marketingowe"] --> RAW
    RAW --> CORE["hma_core — normalizacja i deduplikacja"]
    CORE --> ID["purchase ↔ rezerwacja: tożsamość"]
    CORE --> PAID["obserwacja ↔ płatny marketing: kwalifikacja"]
    ID --> LINK["unikalny zbiór powiązanych rezerwacji"]
    PAID --> LINK
    CORE --> MART["hma_mart — dzienne liczniki i mianowniki"]
    LINK --> MART
    OPS["hma_ops — importy, kontrole, publikacja"] --> MART
    MART --> APP["hma_app — sześć widoków daily"]
    SB["Supabase — użytkownicy, członkostwo, ustawienia, progi"] --> SERVER["Next.js na Railway — autoryzacja, agregacja, KPI i reguły"]
    APP --> SERVER
    SB -. "zatwierdzona wersja map i zakresów jako wejście procesu" .-> CORE
    SERVER --> UI["Dashboard — oba wybrane okresy i aktualność"]
    SERVER -. "kolejny krok: gotowe fakty i reguły" .-> AI["AI — kontrolowany komentarz z referencjami"]
```

Przerywane połączenie konfiguracji oznacza przyszły odczyt wersjonowanej konfiguracji, nie nową bazę ustawień w BigQuery. Proces zapisuje przy faktach identyfikator użytej konfiguracji i rezultat kwalifikacji. Wartości progów skuteczności pozostają w Supabase; końcowa pewność i ocena są wyliczane na serwerze.

## 3. Projekt, datasety i lokalizacja

Wszystkie poniższe nazwy są **PROPOZYCJĄ**, bez sprawdzenia dostępności ani tworzenia zasobów:

- Nazwa opisowa: **Hotel Marketing Analyzer — Demo**.
- Wzorzec ID projektu: `hma-analytics-demo-<unikalny-sufiks>`; sufiks zostanie wybrany przy zatwierdzaniu Google Cloud.
- Przyszła produkcja: odrębny projekt `hma-analytics-prod-<unikalny-sufiks>`, te same nazwy datasetów.
- **USTALONE:** rekomendowana lokalizacja wszystkich datasetów demo to **`EU`**. Istniejące środowisko danych właścicielki działa w EU; osobny projekt demo zapewnia oddzielenie środowisk bez potrzeby wybierania innej lokalizacji. Lokalizacji istniejącego datasetu nie można zmienić w miejscu; przeniesienie danych wymaga osobnej operacji do innego datasetu. Zgodna lokalizacja pozostawia możliwość przyszłego, świadomie zatwierdzonego transferu lub pracy z istniejącymi danymi. Nie oznacza to obecnego połączenia środowisk. Strefa prezentacji pozostaje `Europe/Warsaw`, niezależnie od lokalizacji danych. [Dokumentacja lokalizacji BigQuery](https://docs.cloud.google.com/bigquery/docs/locations).

**Granica środowiska:** demo będzie osobnym projektem Google Cloud. Nie korzysta obecnie z `creatic-503805`, nie odczytuje prawdziwych danych klientów i zawiera wyłącznie dane syntetyczne. Utworzenie projektu demo nie nadaje automatycznego dostępu do innych projektów. Ewentualne przyszłe użycie istniejących danych wymaga osobnej decyzji, sprawdzenia zakresu i jawnego nadania uprawnień.

| Dataset | Przeznaczenie | Użytkownik techniczny | Zawartość |
|---|---|---|---|
| `hma_raw` | Historia importowanych obserwacji, bez zmiany znaczenia źródła | Import i przetwarzanie | 6 tabel źródłowych |
| `hma_core` | Znormalizowane fakty, relacje i jednostki przed agregacją | Przetwarzanie | 10 tabel pośrednich |
| `hma_mart` | Spójne dzienne liczniki z metadanymi jakości | Przetwarzanie; odczyt pośrednio przez widoki | 6 tabel agregatów |
| `hma_app` | Stabilny kontrakt odczytu aplikacji | Serwer aplikacji | 6 widoków logicznych |
| `hma_ops` | Ślad importów, publikacja i kwarantanna błędów | Import/przetwarzanie/utrzymanie | 3 tabele operacyjne |

Rozdzielenie datasetów odpowiada granicom dostępu, a nie osobnym produktom. W małym demo operacje mogą być wykonywane jednym kontrolowanym procesem. Dzienna częstotliwość nie wymaga strumieniowania.

**USTALONE:** tabele ustawień hotelu, członkostwa i progów KPI pozostają w Supabase. BigQuery przechowuje wyłącznie odniesienia do wersji, wyniki normalizacji oraz fakty jakości. Projekt nie zakłada `hotel_thresholds` w BigQuery.

## 4. Wspólne typy, identyfikatory i czas

### 4.1. Typy i NULL

**PROPOZYCJA:** poniższe zestawy kolumn są dziedziczone przez tabele opisane w sekcjach 5–8. W listach kolumn `?` oznacza NULL dozwolone, brak `?` — wymagana wartość na tym etapie walidacji. Pola surowe mogą być niepoprawne lub nieznane; dostają kwarantannę i kod powodu zamiast domyślnej liczby.

| Typ BigQuery | Zastosowanie |
|---|---|
| `STRING` | UUID hotelu jako tekst; identyfikatory kont/kampanii; tokeny identyfikatorów; enumy i wersje |
| `INT64` | Liczniki zdarzeń, sesji i rezerwacji; source sequence; dni |
| `NUMERIC` | Kwoty i ułamkowe konwersje platformowe; dokładne składniki ilorazów |
| `TIMESTAMP` | Czas zdarzenia, utworzenia, zmiany i importu jako chwila UTC |
| `DATE` | `metric_date`, daty pobytu i zakresy importu |
| `BOOL` | Syntetyczność, aktywność, kwalifikacja, flagi kompletności |
| `ARRAY<STRING>` | Kody przyczyn, referencje do batchy; płaskie dane liczbowe pozostają scalar |
| `JSON` | Wyłącznie kontrolowany payload w raw lub diagnostyce; aplikacja odczytuje jawne typowane kolumny |

Kwoty w adapterze Next.js należy przenosić w sposób zachowujący dziesiętną dokładność do obliczenia i prezentacji; obecny TypeScript `number` nie rozstrzyga tego kontraktu transportowego (O14). Dla dużych `INT64` adapter również wymaga jawnej konwersji i kontroli zakresu.

`NULL` oznacza nieznany albo niedopuszczony wynik, `0` — potwierdzone zero. Kompletna partia bez rezerwacji może dać zero; brak partii daje `NO_DATA`. `SUM` pomijające NULL wymaga równoległej kontroli braków, aby częściowa suma pozostała oznaczona jako częściowa. Błędna waluta blokuje powiązane agregaty; v1 pracuje w walucie hotelu, demo PLN.

### 4.2. Zestawy metadanych

**RAW_META**, we wszystkich sześciu raw: `hotel_id STRING`, `batch_id STRING`, `raw_row_id STRING`, `source_record_key STRING?`, `source_revision STRING?`, `source_updated_at TIMESTAMP?`, `extracted_at TIMESTAMP`, `ingested_at TIMESTAMP`, `ingest_date DATE`, `metric_date DATE?`, `source_timezone STRING?`, `source_payload JSON?`, `payload_hash STRING`, `is_synthetic BOOL`, `scenario_id STRING?`, `generator_version STRING?`. Dla demo ostatnie dwa pola są wymagane. `raw_row_id` opisuje pozycję z jednego eksportu; nie zastępuje klucza biznesowego.

**CORE_META**, we wszystkich core: `hotel_id STRING`, `metric_date DATE`, `date_basis STRING`, `as_of_at TIMESTAMP`, `processed_at TIMESTAMP`, `source_batch_ids ARRAY<STRING>`, `contract_version STRING` = `0.2`, `transform_version STRING`, `config_version STRING?`, `is_synthetic BOOL`, `scenario_id STRING?`, `metric_status STRING`, `reason_codes ARRAY<STRING>`. `config_version` jest wymagane dla faktów zależnych od map/kwalifikacji. Brak takiej wersji daje stan niedostępności kwalifikacji.

**APP_META**, we wszystkich sześciu mart i sześciu app, dokładnie jak N.1 kontraktu: `hotel_id STRING`, `metric_date DATE`, `date_basis STRING`, `as_of_at TIMESTAMP`, `updated_at TIMESTAMP`, `source_watermark_at TIMESTAMP?`, `contract_version STRING`, `is_synthetic BOOL`, `metric_status STRING`, `reason_codes ARRAY<STRING>`. Wszystkie oprócz watermarku są wymagane. Tabele mart dodatkowo mają `release_id STRING` i `transform_version STRING`; widoki udostępniają jedną opublikowaną rewizję. Wersja konfiguracji wiążąca proces znajduje się również w rejestrze publikacji.

**OPS_META:** `hotel_id STRING`, `is_synthetic BOOL`; daty i klucze każdego rejestru są wskazane w sekcji 8.

### 4.3. Klucze, relacje i semantyka dat

- Hotel: stabilny UUID z Supabase przenoszony jako `STRING`; każde łączenie danych hotelowych zawiera `hotel_id`.
- Kampania: `(hotel_id, platform, account_id, campaign_id)`. Nazwa jest etykietą, nie kluczem. Brand to rozłączna etykieta wybranego podzbioru Google Ads.
- Rezerwacja: `(hotel_id, canonical_booking_id)`, wyprowadzony z przestrzeni Profitroom. Grupa o jednym ID jest jedną rezerwacją.
- Transakcja: `(hotel_id, transaction_namespace, transaction_token)`. Surowe ID i bezpieczny token mają audytowalne mapowanie przed agregacją.
- Zdarzenie: `(hotel_id, source_system, canonical_event_id)`. Klucz deterministyczny wymaga dostępnych pól źródła; sam timestamp + nazwa zdarzenia mogą kolidować (O05).
- Sesja: `(hotel_id, session_key)` uwzględniający property/stream i identyfikator przeglądarki. Przypisana do jednego dnia startu; reguła granicy sesji w O05.
- Journey: `(hotel_id, journey_definition_id, journey_id)` na dostępnym identyfikatorze urządzenia/przeglądarki; lifecycle i wiele wyników wymagają O05.
- Obserwacja marketingowa ma własny identyfikator; jeden purchase może mieć wiele obserwacji, lecz rezerwacja trafia raz do hotelowej wartości powiązanej.

Klucze w tym projekcie są regułami unikalności sprawdzanymi przed publikacją. BigQuery nie wymusza PK/FK; deklaracje ograniczeń można dodać dopiero przy zapewnionej integralności. [Klucze w BigQuery](https://docs.cloud.google.com/bigquery/docs/primary-foreign-keys).

| Czas | Znaczenie i wykorzystanie |
|---|---|
| `event_at` | Faktyczny czas obserwacji ruchu, zakupu lub kontaktu |
| `booking_created_at` | Pierwotne utworzenie rezerwacji; wyznacza `metric_date` sprzedaży |
| `source_updated_at` | Rewizja statusu/wartości w źródle; wybór aktualnej wersji |
| `check_in_date`, `check_out_date` | Kontekst przyszłego pobytu; osobny od daty sprzedaży |
| `extracted_at`, `ingested_at` | Pobranie i zapis; import nie zmienia daty biznesowej |
| `as_of_at`, `updated_at` | Stan danych i publikacja; pokazywane jako aktualność |
| `cohort_started_at` | Jeden moment przypisania journey do kohorty lejka |
| `outcome_at` | Wynik ścieżki; dla rezerwacji wynika z daty utworzenia Profitroom |

Dzień docelowy wyznacza `Europe/Warsaw`, z granicami lokalnych dni i poprawną zmianą czasu. Dzienne raporty platform w innej strefie pozostają oznaczone jako nieporównywalne do czasu zatwierdzenia transformacji (O04). Każde źródło docelowo wnosi `metric_date`; w raw niepoprawna data pozostaje NULL i trafia do kontroli, nie do fikcyjnej daty.

## 5. Tabele raw — obserwacje źródłowe

To projekt wejścia adapterów i generatora syntetycznego, a nie deklaracja, że obecnie posiadamy takie eksporty. Każda tabela dziedziczy RAW_META. Partycja wszystkich raw: **`ingest_date`**, aby zachować również późne rewizje starych dat. Klaster: **`hotel_id`**, następnie wskazane kolumny. PK fizyczny: `(hotel_id, batch_id, raw_row_id)`; klucz logiczny opisuje deduplikację między batchami.

### 5.1. `hma_raw.meta_ads_daily`

- Grain: jeden wiersz raportu Meta dla konta, kampanii, dnia i rodzaju rekordu: `delivery` lub `conversion`, w jednej rewizji eksportu. Koszt pochodzi z delivery; akcje z conversion. To typowana otoczka raportu źródłowego.
- Klucz logiczny: hotel + account + campaign + source_report_date + record_type + conversion_action + policy + source_breakdown_key. Puste zastosowanie to jawne `not_applicable`; nieznana akcja/polityka ma NULL i jakość.
- Klaster: `hotel_id, account_id, campaign_id, record_type`.
- Pola: `account_id STRING`, `campaign_id STRING`, `campaign_name STRING?`, `source_report_date DATE`, `record_type STRING`, `source_breakdown_key STRING`, `currency_code STRING?`, `ad_spend NUMERIC?`, `impressions INT64?`, `outbound_clicks INT64?`, `click_type STRING?`, `conversion_action STRING?`, `platform_conversions NUMERIC?`, `platform_revenue NUMERIC?`, `platform_attribution_model STRING?`, `platform_attribution_window STRING?`, `platform_date_basis STRING?`.
- Delivery ma koszt jeden raz. Jeśli eksport powtarza koszt przy akcjach, adapter zachowuje payload, a do modelu delivery wybiera jeden koszt kontrolowany sumą. Dodatkowe breakdowny są odrębnym zakresem importu, z kontrolą pokrywania sum.

### 5.2. `hma_raw.google_ads_daily`

- Grain, klucze, kolumny i klaster jak w Meta, lecz dane pochodzą z Google Ads; odrębna tabela zachowuje odrębną semantykę platformy.
- Dodatkowo `cost_micros INT64?` zachowuje źródłową jednostkę, jeśli używa jej wybrany eksport. Adapter wyznacza `ad_spend NUMERIC` zgodnie z opisem jednostki; dokładny format importu wymaga O03.
- Wybrana akcja zakupowa, okno i model są jawne. Google Organic pochodzi z obserwacji ruchu, a nie z kosztów Google Ads.

### 5.3. `hma_raw.ga4_events`

- Grain: jedna zarejestrowana obserwacja GA4 w rewizji eksportu; JSON zachowuje wyłącznie dopuszczone parametry.
- Klucz logiczny: hotel + property/stream + źródłowy event ID albo uzgodniony deterministyczny klucz. Duplikaty eksportu są rozróżniane od realnie powtarzanych zdarzeń.
- Klaster: `hotel_id, property_id, event_name, browser_token`.
- Pola: `property_id STRING`, `stream_id STRING?`, `source_event_id STRING?`, `event_name STRING`, `event_at TIMESTAMP`, `source_sequence INT64?`, `browser_token STRING?`, `source_session_id STRING?`, `transaction_token STRING?`, `transaction_namespace STRING?`, `source STRING?`, `medium STRING?`, `campaign_id STRING?`, `ad_account_id STRING?`, `click_token STRING?`, `consent_state STRING?`, `engagement_time_msec INT64?`, `session_engaged BOOL?`, `event_value NUMERIC?`, `currency_code STRING?`.
- Brak identyfikatora pozostawia zdarzenie jako obserwację, lecz ogranicza unikalne sesje/journey i powiązania. Eksport natywny GA4 może mieć inną strukturę; późniejszy adapter odwzoruje ją do tego wejścia.

### 5.4. `hma_raw.booking_engine_events`

- Grain: jedno zdarzenie booking engine, np. etap, purchase, telefon/e-mail, w rewizji importu.
- Klucz logiczny: hotel + engine_instance + source_event_id; przy braku ID reguła O05.
- Klaster: `hotel_id, engine_instance_id, event_name, transaction_token`.
- Pola: `engine_instance_id STRING`, `source_event_id STRING?`, `event_name STRING`, `event_at TIMESTAMP`, `source_sequence INT64?`, `browser_token STRING?`, `source_session_id STRING?`, `transaction_namespace STRING?`, `transaction_token STRING?`, `source_booking_id STRING?`, `source STRING?`, `medium STRING?`, `campaign_id STRING?`, `click_token STRING?`, `consent_state STRING?`, `event_value NUMERIC?`, `currency_code STRING?`.
- Purchase w GA4 i booking engine może reprezentować tę samą transakcję. Odrębność źródeł pozostaje w raw, wspólna tożsamość jest ustalana przed liczeniem rezerwacji.

### 5.5. `hma_raw.profitroom_booking_revisions`

- Grain: stan jednej rezerwacji z jednego eksportu; kolejne eksporty zachowują historię zmian.
- Klucz logiczny: hotel + source_booking_id + źródłowa rewizja/czas aktualizacji. Tożsamość rezerwacji: hotel + source_booking_id.
- Klaster: `hotel_id, source_booking_id, source_status`.
- Pola: `source_booking_id STRING`, `booking_created_at TIMESTAMP?`, `check_in_date DATE?`, `check_out_date DATE?`, `source_status STRING?`, `source_sales_channel STRING?`, `gross_value_after_discounts NUMERIC?`, `currency_code STRING?`, `transaction_namespace STRING?`, `transaction_token STRING?`, `test_flag BOOL?`, `source_deleted BOOL?`.
- Mapowanie transaction do rezerwacji może być dostarczone w dodatkowej obserwacji adaptera. Kolumna jest nullable do czasu potwierdzenia jej dostępności. Wymagane biznesowo pola z kontraktu podlegają kontroli próbki Profitroom (O02).
- Brak rezerwacji w kolejnym pliku nie oznacza automatycznej anulacji; tryb pełny/delta i znaczenie usunięcia muszą być jawne.

### 5.6. `hma_raw.marketing_observations`

- Grain: jedna obserwacja lub jawne źródłowe wskazanie relacji, np. kliknięcie, źródło sesji, mapowanie transaction→booking. Jest dowodem wejściowym, nie wynikiem oceny skuteczności.
- Klucz logiczny: hotel + observation_source + source_observation_id; odniesienie do zdarzenia zabezpiecza przed powtórnym liczeniem obserwacji wyprowadzonych z GA4/BE.
- Klaster: `hotel_id, observation_type, transaction_token, campaign_id`.
- Pola: `observation_source STRING`, `source_observation_id STRING`, `observation_type STRING` (`click`, `session_source`, `purchase_context`, `transaction_booking_map`), `observed_at TIMESTAMP`, `referenced_source_event_id STRING?`, `browser_token STRING?`, `source_session_id STRING?`, `transaction_namespace STRING?`, `transaction_token STRING?`, `source_booking_id STRING?`, `source STRING?`, `medium STRING?`, `platform STRING?`, `account_id STRING?`, `campaign_id STRING?`, `click_token STRING?`, `consent_state STRING?`, `evidence_origin STRING`.
- Tabela może być pusta lub niekompletna; jakość opisuje ten stan. Indywidualne kliknięcia są warunkiem potwierdzonego click_arrival_rate, a nie założonym zasobem platform. Syntetyczny generator może je dostarczyć jawnie (O10).

## 6. Tabele core — normalizacja i relacje

Każda tabela dziedziczy CORE_META. Ziarno opisuje aktualny, zweryfikowany stan przed publikacją. Historia źródła pozostaje w raw, a opublikowane rewizje agregatów w mart. Małe tabele demo mogą być w całości odtwarzane w codziennym przebiegu.

| Tabela | Grain i logiczny klucz, zawsze z hotel_id | Partycja | Klaster |
|---|---|---|---|
| `ad_campaign_daily` | Jedna kampania/dzień: metric_date + platform + account_id + campaign_id; jedna wybrana akcja zakupowa | metric_date | hotel_id, platform, account_id, campaign_id |
| `web_events` | Jedno kanoniczne zdarzenie: source_system + canonical_event_id | metric_date = dzień zdarzenia | hotel_id, event_name, journey_id, transaction_token |
| `sessions` | Jedna sesja: session_key; dzień startu | metric_date | hotel_id, platform, campaign_id, session_key |
| `journeys` | Jeden journey: journey_definition_id + journey_id; dzień kohorty | metric_date | hotel_id, journey_definition_id, journey_id |
| `journey_stage_reach` | Jeden journey × scope × etap: journey_definition_id + journey_id + scope_key + stage_id | metric_date = dzień kohorty | hotel_id, scope_key, journey_id, stage_id |
| `bookings_current` | Jedna rezerwacja: canonical_booking_id; aktualny status | metric_date = dzień utworzenia | hotel_id, canonical_booking_id, sales_channel, booking_status |
| `purchase_booking_links` | Jedna próba mapowania kanonicznej transakcji: transaction_namespace + transaction_token | metric_date = dzień purchase | hotel_id, transaction_token, canonical_booking_id |
| `booking_marketing_evidence` | Jedna obserwacja przypisana do rezerwacji i zakresu: canonical_booking_id + observation_key + linkage_scope_id | metric_date = dzień utworzenia rezerwacji | hotel_id, canonical_booking_id, linkage_scope_id, campaign_id |
| `booking_marketing_links` | Jedna decyzja technicznej kwalifikacji rezerwacji w zakresie: canonical_booking_id + linkage_scope_id | metric_date = dzień utworzenia | hotel_id, linkage_scope_id, canonical_booking_id |
| `journey_outcomes` | Jeden wybrany wynik journey w definicji: path_definition_id + journey_id + outcome_type + outcome_key | metric_date = dzień wyniku | hotel_id, path_definition_id, outcome_type, path_signature |

Każda tabela jest w `hma_core`. PK nie zawiera metrycznej daty w tabelach jednostkowych, gdy jednostka ma jedną stałą tożsamość; data jest fizyczną partycją. Korekta daty wymaga przeniesienia jednostki i przebudowy starej oraz nowej partycji. O05 rozstrzyga selekcję wielu wyników journey; do czasu rozstrzygnięcia zależne ścieżki pozostają niedostępne, bez arbitralnego wyboru pierwszego zakupu.

### 6.1. Kolumny szczegółowe core

**`ad_campaign_daily`:** `platform STRING`, `account_id STRING`, `campaign_id STRING`, `campaign_name STRING`, `marketing_channel STRING`, `currency_code STRING`, `ad_spend NUMERIC?`, `eligible_ad_spend NUMERIC?`, `is_spend_eligible BOOL?`, `spend_scope_id STRING`, `linked_scope_ad_spend NUMERIC?`, `linkage_scope_id STRING?`, `conversion_action STRING?`, `platform_conversions NUMERIC?`, `platform_revenue NUMERIC?`, `platform_attribution_model STRING?`, `platform_attribution_window STRING?`, `platform_date_basis STRING?`, `impressions INT64?`, `outbound_clicks INT64?`, `click_type STRING?`. Delivery i jedna wybrana conversion są deduplikowane oddzielnie, następnie łączone 1:1; koszt pozostaje jeden raz.

**`web_events`:** `source_system STRING`, `canonical_event_id STRING`, `event_name STRING`, `event_at TIMESTAMP`, `event_order_key STRING`, `browser_token STRING?`, `session_key STRING?`, `journey_id STRING?`, `journey_definition_id STRING?`, `transaction_namespace STRING?`, `transaction_token STRING?`, `source STRING?`, `medium STRING?`, `platform STRING?`, `account_id STRING?`, `campaign_id STRING?`, `marketing_channel STRING?`, `click_token STRING?`, `consent_state STRING?`, `is_duplicate_purchase BOOL`, `traffic_definition_id STRING`. Zachowanie obserwacji jest oddzielone od dopuszczenia do liczenia.

**`sessions`:** `session_key STRING`, `started_at TIMESTAMP`, `ended_at TIMESTAMP?`, `journey_id STRING?`, `platform STRING?`, `account_id STRING?`, `campaign_id STRING?`, `source STRING?`, `medium STRING?`, `marketing_channel STRING?`, `is_engaged BOOL?`, `traffic_definition_id STRING`. Jedna sesja otrzymuje jedno przypisanie kampanijne według wersji definicji. Sesje wielodniowe są liczone w dniu startu; inna definicja wymaga jawnej zmiany mapy O05.

**`journeys`:** `journey_id STRING`, `journey_definition_id STRING`, `browser_token STRING`, `cohort_started_at TIMESTAMP`, `ended_at TIMESTAMP?`, `measurement_method STRING`, `consent_state STRING?`, `funnel_definition_id STRING`, `is_closed BOOL`. Device/browser to granica obserwacji, nie osoba. Brak identyfikatora ogranicza journey, a nie tworzy wspólnego „anonimowego użytkownika”.

**`journey_stage_reach`:** `journey_id STRING`, `journey_definition_id STRING`, `scope_key STRING`, `funnel_definition_id STRING`, `stage_id STRING`, `stage_order INT64`, `first_reached_at TIMESTAMP`, `first_event_order_key STRING`, `first_event_id STRING`, `entry_at TIMESTAMP`, `purchase_identity_linked BOOL?`. Zduplikowany etap w journey zapisuje pierwsze kwalifikujące osiągnięcie. Mapa przejść A→B jest wejściem konfiguracji z Supabase; agregacja porównuje czas i kolejność oraz okno. Telefon/e-mail mają oddzielne gałęzie.

**`bookings_current`:** `canonical_booking_id STRING`, `source_system STRING` = Profitroom, `source_booking_id STRING`, `booking_created_at TIMESTAMP`, `source_updated_at TIMESTAMP?`, `source_revision STRING?`, `check_in_date DATE?`, `check_out_date DATE?`, `booking_status STRING`, `sales_channel STRING`, `sales_segment STRING`, `is_active BOOL`, `is_test BOOL`, `test_rule_id STRING?`, `test_rule_version STRING?`, `gross_value_after_discounts NUMERIC?`, `currency_code STRING?`, `transaction_namespace STRING?`, `transaction_token STRING?`, `channel_mapping_version STRING`, `status_mapping_version STRING`. `is_active` oznacza confirmed/completed. Testy są zachowane audytowo, a agregacja kohorty wybiera `is_test=false`.

**`purchase_booking_links`:** `transaction_namespace STRING`, `transaction_token STRING`, `purchase_source_system STRING`, `canonical_purchase_event_id STRING`, `purchase_at TIMESTAMP`, `canonical_booking_id STRING?`, `candidate_booking_count INT64`, `identity_link_status STRING` (`VERIFIED`, `UNMATCHED`, `AMBIGUOUS`, `INVALID`), `identity_link_method STRING`, `identity_rule_version STRING`, `is_active_booking BOOL?`. Przy wielu kandydatach pole booking pozostaje NULL, a dowody wejściowe są dostępne w raw. Relacja do web_events używa pełnego klucza hotel_id + purchase_source_system + canonical_purchase_event_id. Wybór kanonicznego purchase deduplikuje powtórki BE/GA4 w tej samej przestrzeni transakcji; nie zmienia liczby realnych rezerwacji.

**`booking_marketing_evidence`:** `canonical_booking_id STRING`, `observation_key STRING`, `transaction_token STRING?`, `journey_id STRING?`, `observation_at TIMESTAMP`, `evidence_type STRING`, `source STRING?`, `medium STRING?`, `platform STRING?`, `account_id STRING?`, `campaign_id STRING?`, `click_token STRING?`, `linkage_scope_id STRING`, `observation_window_days INT64?`, `is_qualifying_paid_evidence BOOL?`, `marketing_link_rule_version STRING`, `qualification_reason_codes ARRAY<STRING>`. Token transakcji poświadcza tożsamość; płatność źródła i zgodność zakresu wynika z tych dodatkowych obserwacji.

**`booking_marketing_links`:** `canonical_booking_id STRING`, `linkage_scope_id STRING`, `identity_verified BOOL`, `paid_evidence_verified BOOL?`, `cost_scope_compatible BOOL?`, `deduplication_verified BOOL`, `qualifying_evidence_count INT64`, `linked_active_value NUMERIC?`, `currency_code STRING?`, `marketing_link_rule_version STRING?`, `technical_link_status STRING`, `technical_reason_codes ARRAY<STRING>`. Jeden rekord sumuje dowody wielu platform jako kwalifikację jednej rezerwacji. Progi jakości/pewności hotelu są odrębną oceną serwera.

**`journey_outcomes`:** `path_definition_id STRING`, `journey_id STRING`, `outcome_type STRING`, `outcome_key STRING`, `outcome_at TIMESTAMP`, `canonical_booking_id STRING?`, `path_signature STRING`, `path_sequence STRING`, `path_label STRING`, `first_observed_channel STRING?`, `last_observed_channel STRING?`, `observation_window_days INT64` = 30, `identity_linked BOOL?`, `paid_marketing_linked BOOL?`, `eligible_for_share BOOL`, `measurement_method STRING`, `marketing_link_rule_version STRING?`. Ścieżka pochodzi z uporządkowanych zdarzeń/obserwacji danego journey w 30 dniach przed wynikiem. Sygnatura wynika z jednoznacznie zakodowanej sekwencji i wersji mapy, nie tylko z etykiety UI.

### 6.2. Relacje i zabezpieczenie przed mnożeniem kwot

- Raw ma wiele rewizji → core jeden aktualny fakt na klucz. Dwa różne source payloady tej samej rewizji tworzą konflikt jakości zamiast losowego wyboru.
- Journey 1:N events, journey 1:N stage_reach, session 1:N events. Klucz hotelu uczestniczy w każdej relacji.
- Purchase transakcja → 0 lub 1 kanoniczna rezerwacja po walidacji. Wiele eventów zakupu tej samej transakcji jest historią jednej tożsamości.
- Booking 1:N marketing_evidence → booking_marketing_links 1 rekord na zakres. Dopiero ten rekord wnosi wartość do sumy powiązanych rezerwacji.
- Ads agregowane po kampanii/dniu, sales po kanale/dniu, links po hotelu/dniu. Overview łączy już zagregowane zbiory 1:1 po hotelu/dniu, dzięki czemu ilość zdarzeń nie mnoży kosztów ani rezerwacji.
- Google Brand stanowi rozłączną klasę Google Ads w prezentacji; sumy platformy obejmują każdą kampanię raz.

## 7. Mart i sześć widoków aplikacyjnych

**PROPOZYCJA:** sześć fizycznych tabel `hma_mart.<nazwa>_store` przechowuje kompletną opublikowaną wersję dziennych agregatów dla hotelu i `release_id`. Sześć widoków logicznych `hma_app.<nazwa>` wybiera aktywną publikację hotelu z `hma_ops.releases`. Logiczne widoki odczytują tabele bazowe; partycjonowanie i klastrowanie należą do tabel. [Widoki logiczne BigQuery](https://docs.cloud.google.com/bigquery/docs/views-intro).

Każda tabela mart dziedziczy APP_META oraz metadane publikacji. Każdy widok eksponuje **wszystkie** kolumny swojej sekcji N.2–N.7 zaakceptowanego kontraktu, zachowując ich nazwy, typy i NULL. Poniżej podano grain, powstanie i najważniejsze pola. Wersja kontraktu jest stała `0.2`, a wersja transformacji jest osobnym oznaczeniem implementacji.

| Tabela mart → widok w hma_app | Grain widoku; PK tabeli dodatkowo zawiera release_id | Partycja tabeli | Klaster tabeli |
|---|---|---|---|
| `dashboard_overview_daily_store` → `dashboard_overview_daily` | hotel_id + metric_date | metric_date | hotel_id, release_id |
| `campaign_performance_daily_store` → `campaign_performance_daily` | hotel_id + metric_date + platform + account_id + campaign_id | metric_date | hotel_id, platform, campaign_id, release_id |
| `booking_funnel_daily_store` → `booking_funnel_daily` | hotel_id + metric_date + funnel_definition_id + scope_key + stage_id + next_stage_id | metric_date | hotel_id, scope_key, stage_id, release_id |
| `hotel_sales_daily_store` → `hotel_sales_daily` | hotel_id + metric_date + sales_channel | metric_date | hotel_id, sales_channel, release_id |
| `channel_paths_daily_store` → `channel_paths_daily` | hotel_id + metric_date + path_definition_id + outcome_type + path_signature | metric_date | hotel_id, outcome_type, path_signature, release_id |
| `data_quality_daily_store` → `data_quality_daily` | hotel_id + metric_date + scope_key + metric_id + source_system | metric_date | hotel_id, metric_id, scope_key, release_id |

W małym demo dzienne partycje są przede wszystkim czytelnym wzorcem i kontrolą zakresu; realna korzyść wydajnościowa wymaga pomiaru wolumenu. Przy małych partycjach koszt metadanych może uzasadnić rzadsze partycjonowanie w przyszłości bez zmiany `metric_date`. [Partycjonowanie BigQuery](https://docs.cloud.google.com/bigquery/docs/partitioned-tables).

### 7.1. `dashboard_overview_daily`

Źródła: osobno zagregowane `ad_campaign_daily`, `bookings_current`, `purchase_booking_links`, `booking_marketing_links`, jakość importów i kalendarz oczekiwanych dni.

Pola zgodne z kontraktem:

- Kontekst: `currency_code STRING`, `spend_date_basis STRING`, `spend_scope_id STRING`, `linkage_scope_id STRING?`, `marketing_link_rule_version STRING?`.
- Koszty: `ad_spend NUMERIC?`, `eligible_ad_spend NUMERIC?`, `linked_scope_ad_spend NUMERIC?`.
- Sprzedaż: `active_hotel_bookings INT64?`, `active_hotel_value NUMERIC?`, `active_direct_web_bookings INT64?`, `cohort_bookings INT64?`, `cancelled_bookings INT64?`.
- Dwa poziomy łączenia: `purchase_linked_active_bookings INT64?` — tylko potwierdzona tożsamość; `linked_active_bookings INT64?`, `linked_active_booking_value NUMERIC?` — tożsamość i kwalifikujące dowody płatnego marketingu, każda rezerwacja raz.
- Gotowość: `linked_booking_roas_status STRING`, `linked_booking_roas_reason_codes ARRAY<STRING>`; to metadane gotowości, a finalna bramka jakości jest uruchamiana przez serwer dla wybranego zakresu (sekcja 10.3).

`date_basis=booking_created` opisuje stronę sprzedażową; `spend_date_basis=ad_delivery` koszty tych samych dat. Wiersz overview nie oznacza wspólnej kohorty kliknięcia i rezerwacji. Dzień z poprawnym kosztem i brakującym eksportem sprzedaży zachowuje koszt, a właściwe pola sprzedaży NULL oraz jakość per KPI.

### 7.2. `campaign_performance_daily` — kampanie Meta i Google

Źródła: `ad_campaign_daily`, sesje i zdarzenia najpierw zagregowane do kampanii/dnia; ewentualne obserwacje kliknięć.

- Tożsamość: `platform`, `account_id`, `campaign_id`, `campaign_name`, `marketing_channel`, `currency_code`, `spend_scope_id`, `traffic_definition_id` — `STRING`, wymagane.
- Polityka: `conversion_action`, `platform_attribution_model`, `platform_attribution_window`, `platform_date_basis`, `click_type` — `STRING?`.
- Reklama: `ad_spend`, `eligible_ad_spend`, `platform_conversions`, `platform_revenue` — `NUMERIC?`; `impressions`, `outbound_clicks` — `INT64?`.
- Ruch: `sessions`, `engaged_sessions`, `offer_views`, `intent_events` — `INT64?`.
- Dotarcie: `eligible_outbound_clicks`, `clicks_with_observed_arrival` — `INT64?`.

Kampanie Meta i Google są dwoma filtrami **tego samego widoku** (`platform=meta_ads` / `google_ads`), a nie dodatkową kopią tabel i kosztów. Widok zachowuje platformową politykę. Metryki etapów kampanii pochodzą z funnel ze scope kampanii. Ruch organiczny/direct jest obserwowany w core/funnel/paths; część bez wiarygodnej kampanii pozostaje poza przypisanym ruchem kampanijnym, z informacją o pokryciu.

### 7.3. `booking_funnel_daily`

Źródła: `journeys`, `journey_stage_reach`, `web_events`, mapa etapów i `purchase_booking_links`.

- Definicja: `funnel_definition_id`, `scope_key`, `stage_id`, `next_stage_id`, `stage_label`, `counting_unit` — `STRING`; `stage_order INT64`.
- Bazy: `stage_journeys`, `journeys_entering_stage`, `journeys_reaching_next`, `entry_journeys`, `purchase_journeys`, `purchase_journeys_linked_to_profitroom` — `INT64?`.
- Okno: `transition_window_hours NUMERIC?`; `next_stage_id=end` dla końca.

`metric_date` jest dniem wejścia do kohorty, a `date_basis=journey_cohort`. Pierwsze kwalifikujące wejście A i późniejsze B w oknie tworzą jeden udział journey w danej relacji. Późne B przelicza dzień kohorty. Licznik B jest podzbiorem mianownika A. Dla udziału etapu wybiera się jedną reprezentację etapu: powielony mianownik A dla telefonu i e-maila pozostaje nieaddytywny między gałęziami. Sumowanie różnych scope może nakładać te same journey; zakres hotelowy jest liczony samodzielnie.

### 7.4. `hotel_sales_daily`

Źródło: `bookings_current` po wyłączeniu testów.

- Kanały i definicje: `sales_channel`, `sales_segment`, `channel_mapping_version`, `status_mapping_version`, `currency_code`, `sales_value_basis` — `STRING`.
- `cohort_bookings`, `confirmed_bookings`, `completed_bookings`, `active_bookings`, `cancelled_bookings`, `pending_bookings`, `option_bookings`, `no_show_bookings`, `unknown_status_bookings` — `INT64?`.
- `active_booking_value NUMERIC?`, brutto po rabatach, z elementami wartości Profitroom; `sales_value_basis=profitroom_gross_after_discounts`.

`active_bookings=confirmed+completed`. Kohorta obejmuje wszystkie rzeczywiste statusy; `active_bookings` jest alternatywną sumą, a nie dodatkowym statusem do dodania. `direct_web` zasila mianownik kosztu reklam online; phone/email tworzą oddzielne kanały segmentu direct. OTA jest osobnym segmentem. Przy brakującej wartości aktywnej rezerwacji liczba może pozostać znana, a pełna wartość jest NULL z informacją o brakach.

### 7.5. `channel_paths_daily`

Źródło: `journey_outcomes` i ocena kwalifikacji obserwacji.

- `path_definition_id`, `path_signature`, `path_sequence`, `path_label`, `outcome_type`, `measurement_method` — `STRING`; `first_observed_channel`, `last_observed_channel`, `marketing_link_rule_version` — `STRING?`.
- `observation_window_days INT64` = 30; `path_count`, `linked_outcome_count`, `paid_marketing_linked_outcome_count` — `INT64?`; `eligible_for_share BOOL`.

Dzień wyniku jest `metric_date`; dla rezerwacji dzień jej utworzenia. Końce opisują pierwszy/ostatni zaobserwowany kontakt. Direct jest widoczny; Google Ads, Brand i Organic rozłączne. Widok zawiera pełny rozkład, a UI może pokazywać top N dopiero po policzeniu mianownika. Brak obserwowanego początku lub końca daje wykluczenie z kwalifikującego mianownika i wpis jakości.

`linked_outcome_count` oznacza tożsamość wyniku połączoną z Profitroom; `paid_marketing_linked_outcome_count` dodatkowo płatną kwalifikację. Jednostka ścieżki nie zastępuje liczby rezerwacji z Profitroom. Kilka wyników journey wymaga ustalenia O05, aby addytywność zachowała sens.

### 7.6. `data_quality_daily`

Źródła: `import_batches`, kontrola schematu i kluczy, błędy przetwarzania, źródłowe oczekiwane zbiory oraz oba rodzaje powiązań.

- Klucz/opis: `scope_key`, `metric_id`, `source_system`, `linkage_type`, `coverage_unit`, `coverage_status`, `linkage_coverage_status`, `quality_rule_id`, `quality_rule_version` — `STRING`.
- Bazy: `expected_units`, `observed_units`, `eligible_outcomes`, `linked_outcomes`, `observation_count`, `duplicate_count`, `invalid_record_count`, `excluded_test_count` — `INT64?`.
- Prezentacja dzienna: `coverage_pct NUMERIC?`, `linkage_coverage_pct NUMERIC?`, `available_through_date DATE?`, `lag_hours NUMERIC?`.
- Status metryki i powody pochodzą z APP_META. `linkage_type` rozróżnia `purchase_booking_identity`, `paid_marketing`, `not_applicable`; osobne metric_id zapobiegają kolizji klucza.

Mianownik kompletności importu to oczekiwane konta-dni/kanały-dni zgodnie z zatwierdzonym zakresem, a nie tylko liczba zaimportowanych rekordów. Mianownik powiązań musi być zdefiniowany przed łączeniem, obejmując także kwalifikujące wyniki niepołączone. Nieznany mianownik daje UNKNOWN. Pełna telemetria importu nie oznacza pełnego pomiaru zachowania wszystkich gości.

Procenty dzienne są wygodą diagnostyczną. Serwer liczy procent okresu z sum baz zgodnej jednostki; nie uśrednia procentów. `all_required` jest podsumowaniem jakości i nie powiększa mianownika źródeł. Pewność HIGH/MEDIUM/LOW/INSUFFICIENT_DATA powstaje później na serwerze z konfiguracją Supabase.

## 8. Rejestry operacyjne, publikacja i anulacje

### 8.1. Tabele `hma_ops`

| Tabela | Grain / klucz | Główne kolumny dodatkowe do OPS_META | Partycja / klaster |
|---|---|---|---|
| `import_batches` | Jedna logiczna partia źródła na hotel; PK hotel_id + batch_id | batch_id STRING, source_system STRING, source_scope_id STRING, source_locator STRING?, extraction_mode STRING, coverage_start DATE, coverage_end DATE, extracted_at TIMESTAMP, ingested_at TIMESTAMP, is_complete BOOL, received_rows INT64, expected_rows INT64?, checksum STRING, schema_version STRING, status STRING, reason_codes ARRAY<STRING> | DATE(ingested_at); hotel_id, source_system, batch_id |
| `releases` | Jedna wersja kompletnej publikacji hotelu; PK hotel_id + release_id; maksymalnie jedna aktywna na hotel | release_id STRING, created_at TIMESTAMP, published_at TIMESTAMP?, as_of_at TIMESTAMP, status STRING, is_active BOOL, included_batch_ids ARRAY<STRING>, covered_start DATE, covered_end DATE, config_version STRING, contract_version STRING, transform_version STRING, validation_status STRING, failure_codes ARRAY<STRING> | Bez partycji w małym demo; hotel_id, release_id |
| `rejected_records` | Jeden błąd kontroli rekordu/reguły; PK hotel_id + batch_id + raw_row_id + quality_rule_id + quality_rule_version | batch_id STRING, raw_row_id STRING, detected_at TIMESTAMP, source_system STRING, quality_rule_id STRING, quality_rule_version STRING, reason_code STRING, rejected_field STRING?, diagnostic_class STRING | DATE(detected_at); hotel_id, source_system, reason_code |

`source_locator` jest bezpiecznym identyfikatorem pochodzenia, bez tokenów dostępu. Kwarantanna wskazuje raw_row_id zamiast powielać dowolne dane wejściowe w logach. Mianowniki pokrycia per dzień są budowane w quality z zakresu oczekiwań oraz manifestów, a nie z `expected_rows=NULL` zamienionego na zero.

### 8.2. Codzienny przebieg — propozycja minimalna dla demo

1. Proces ustala hotel, zakres źródeł i jedną zatwierdzoną wersję konfiguracji Supabase. Tworzy logiczny batch z deterministycznym checksumem.
2. Import dopisuje raw. Ponowienie tej samej partii jest idempotentne po hotel/batch/raw_row_id; nowa rewizja starego dnia jest nową obserwacją.
3. Kontrole parsowania i pól wymaganych zapisują powody do kwarantanny; poprawne fakty trafiają do core. Błędy nie znikają z jakości.
4. Rezerwacja aktualna jest wybierana według wiarygodnej rewizji źródła. Przy jej braku kolejność poprawnych pełnych ekstrakcji jest propozycją wymagającą potwierdzenia O02; sprzeczne dane tej samej rewizji wymagają wyjaśnienia.
5. Dla małego demo proces przelicza całą zadeklarowaną historię do nowego `release_id` we wszystkich sześciu mart. Koszt prostoty jest jawny; ograniczona dzienna skala demo pozwala uniknąć komplikacji częściowych snapshotów.
6. Po kontrolach publikacji jeden atomowy krok przełącza aktywną wersję hotelu. Nieudana przebudowa pozostawia poprzednią opublikowaną wersję z jej starą datą aktualizacji. Transakcje BigQuery pozwalają grupować operacje DML w atomowy przebieg; dokładny skrypt powstanie później. [Transakcje BigQuery](https://docs.cloud.google.com/bigquery/docs/transactions).
7. Serwer odczytuje potrzebne widoki dla obu zakresów w jednym spójnym odczycie, np. pojedynczym zapytaniu lub transakcji odczytowej. Sześć niezależnych żądań wykonanych po obu stronach przełączenia publikacji wymaga ochrony przed mieszaniem wersji (O12).

**Anulacja:** rezerwacja utworzona 10 lipca, anulowana 5 września, aktualizuje kohortę 10 lipca. Maleją active_bookings i active_booking_value, rośnie cancelled_bookings, a cohort_bookings pozostaje stałe. Jej wartość jest również usuwana z aktywnych powiązań, a wynik typu active_booking w ścieżkach jest aktualizowany. Sam historyczny purchase pozostaje zdarzeniem. Zmiana kanału, wartości lub daty utworzenia przebudowuje wszystkie dotknięte sumy.

**Późne obserwacje:** powiązanie znalezione dziś może zmienić historyczny dzień rezerwacji i dzień kohorty journey. Okno 30 dni ścieżki nie ogranicza czasu wykrywania anulacji. Przyszły incremental processing będzie odtwarzał zestaw dotkniętych rezerwacji, journey i dat, a nie tylko ostatnią partycję importu. Retencja musi pozwolić na tę rekonstrukcję (O08/O12).

## 9. Mapowanie metryk kontraktu do struktur i miejsca obliczenia

W tabeli `Σ` oznacza sumę dla jednego wybranego okresu po kontroli jakości i zgodności zakresu; drugi okres jest liczony osobno. Wskaźniki biznesowe powstają na serwerze aplikacji, dzienne bazy w core/mart, a widoki udostępniają je bez zmiany semantyki.

| Metryka / fakt | Źródło i droga | Pola widoku | Miejsce wyniku i ograniczenia |
|---|---|---|---|
| Wydatki reklamy | raw Meta/Google delivery → ad_campaign_daily → campaign/overview mart | ad_spend | Baza w tabeli; Σ na serwerze, zgodna waluta i brak powtórzonego kosztu |
| Kwalifikujące wydatki | Ta sama droga + zatwierdzony zakres Supabase | eligible_ad_spend, spend_scope_id | Kwalifikacja jako fakt przetwarzania, Σ na serwerze; brak konfiguracji daje NULL |
| Platformowe konwersje i wartość | raw conversion → wybrana akcja core → campaign | platform_conversions, platform_revenue, model/window/action | Oddzielnie dla platform; ułamkowa konwersja zachowuje NUMERIC |
| platform_roas | campaign_performance_daily | Σ platform_revenue / Σ ad_spend | Serwer; zero kosztu → NULL, polityka źródła jawna |
| platform_conversion_cost | campaign_performance_daily | Σ ad_spend / Σ platform_conversions | Serwer; zero konwersji → NULL; nie zawsze koszt rezerwacji |
| Aktywne online | Profitroom → bookings_current → sales i overview | active_direct_web_bookings; active_bookings kanału direct_web | Dokładne unikalne confirmed+completed, bez testów, według utworzenia |
| online_booking_ad_cost | Overview: reklamowy licznik + Profitroom mianownik | Σ eligible_ad_spend / Σ active_direct_web_bookings | Serwer; „Koszt reklam na aktywną rezerwację online”; wszystkie kwalifikujące koszty, także wobec organicznych/powracających rezerwacji |
| Wartość aktywnych rezerwacji / cała sprzedaż | Profitroom → bookings_current → hotel_sales/overview | active_booking_value, active_hotel_value, active_bookings | Bazy i Σ; brutto po rabatach, pełny zakres hotelu tylko przy pokryciu kanałów |
| channel_booking_share_pct | hotel_sales_daily | Σ active_bookings kanału / Σ active_bookings hotelu ×100 | Serwer; rozłączne kanały, unknown widoczny; zero całości → NULL |
| channel_value_share_pct | hotel_sales_daily | Σ active_booking_value kanału / Σ hotelu ×100 | Serwer; jedna waluta, wartość brutto po rabatach |
| Anulacje / cancellation_rate_pct | Profitroom rewizje → bookings_current → hotel_sales | Σ cancelled_bookings / Σ cohort_bookings ×100 | Status na as_of_at dla kohorty utworzenia; zero kohorty → NULL |
| Tożsamość purchase | GA4/BE + Profitroom + źródłowa mapa → purchase_booking_links | purchase_linked_active_bookings, purchase_journeys_linked_to_profitroom, linked_outcome_count | Bazy liczą różne jawne jednostki; techniczne potwierdzenie rezerwacji |
| Sprzedaż płatnie powiązana | Poprzednia relacja + marketing_observations/web_events → evidence → links | linked_active_bookings, linked_active_booking_value | Jeden booking w jednym hotelowym zakresie; dodatkowa informacja marketingowa |
| linked_booking_roas | Overview + quality + konfiguracja serwera | Σ linked_active_booking_value / Σ linked_scope_ad_spend | Serwer po pięciu warunkach; szczegóły w sekcji 10 |
| Sessions i zaangażowanie | GA4/BE → sessions/web_events → campaign | sessions, engaged_sessions | Liczniki w mart; engagement_rate = Σ engaged / Σ sessions ×100 na serwerze |
| Intencja, offer_views | web_events + mapa zdarzeń → campaign/funnel | intent_events, offer_views; stage_journeys dla journey | Wydarzenie i journey to odrębne jednostki; definicja jawna |
| transition_rate_pct | journeys + stage_reach → funnel | Σ journeys_reaching_next / Σ journeys_entering_stage ×100 | Serwer; ta sama kohorta, A przed B, ustalone okno, zero A → NULL |
| Udział etapu w wejściach | booking_funnel_daily | Σ stage_journeys / Σ entry_journeys ×100 | Serwer, jeden reprezentant etapu; osobno od przejścia A→B |
| click_arrival_rate_pct | Pełny kwalifikujący zbiór obserwacji kliknięć + zdarzenia wejść → campaign | Σ clicks_with_observed_arrival / Σ eligible_outbound_clicks ×100 | Serwer; do dostępności pełnego mianownika i łączenia NULL |
| sessions_per_click_pct | sessions + reklama → campaign | Σ sessions / Σ outbound_clicks ×100 | Serwer; pomocniczy iloraz dwóch jednostek, dopuszczalne >100% |
| meta_start_share_pct | journey_outcomes → pełny channel_paths | Σ path_count z początkiem Meta / Σ eligible path_count ×100 | Serwer; filtr definicji, typu wyniku, metody i okresu |
| closing_share_pct | channel_paths_daily | Σ path_count z końcem danego kanału / Σ eligible path_count ×100 | Serwer, Direct i trzy klasy Google osobno |
| Warunkowy udział Meta→Google | channel_paths_daily | Początek Meta i koniec wskazanej klasy Google / wszystkie kwalifikujące ścieżki z takim końcem ×100 | Serwer; pełny mianownik, nie top N |
| period_change_pct | Dwa niezależnie policzone wyniki tej samej metryki | (current − previous) / previous ×100 | Serwer; 0→0=0%; 0→dodatnia=NULL „wzrost od zera”; dodatnia→0=−100% |
| CTR/CPC z historycznego UI | Reklama z uzgodnioną definicją kliknięcia → campaign | clicks/impressions, ad_spend/clicks | Serwer po dostarczeniu zgodnego typu kliknięcia; outbound CTR należy tak nazwać; stałe UI pozostają historyczne |
| Status i przyczyny braku | importy, kontrole, core i quality → app | metric_status, reason_codes; dedicated linked status | Techniczne przyczyny w danych; finalny status okresu i zależnej reguły na serwerze |
| Pokrycie i pewność | data_quality + Supabase progi | expected/observed, eligible/linked, UNKNOWN | Dzienne proporcje pomocnicze w widoku; proporcje okresu i HIGH/MEDIUM/LOW/INSUFFICIENT_DATA na serwerze |
| Komentarz / rekomendacja | Serwerowe fakty i reguły → przyszłe AI | Referencje do metric_id, dat, hotelu, wersji | AI używa przekazanych wyników; komentarze poza tabelami faktów |

**Zakresy czasu:** dla wybranych `[start,end]` liczba lokalnych dni to `N=end−start+1`; porównanie `[start−N, start−1]`. BigQuery filtruje `metric_date` z obu zakresów. Serwer liczy oddzielne sumy i wskaźniki; wszystkie wykresy, reguły i odpowiedzi korzystają z tej samej pary. Bieżący dzień oznacza „okres w trakcie”. Brak danych pozostaje powiązany z wybraną datą, bez podstawienia innego okresu.

## 10. Trzy szczególnie ważne granice obliczeń

### 10.1. `active_direct_web_bookings` i `eligible_ad_spend`

Aktywne online to unikalne rezerwacje Profitroom o `sales_channel=direct_web`, statusie confirmed/completed na as_of_at, z datą utworzenia w zakresie, po wyłączeniu testów. Rezerwacja z telefonu/e-maila pozostaje w direct ogółem, ale nie w mianowniku online. Jedna grupowa rezerwacja o jednym ID wnosi 1.

`eligible_ad_spend` wynika z pełnego kosztu kampanii zakwalifikowanych do wersjonowanego zakresu. Wynik kwalifikacji: true → koszt; false → zmierzone 0 kwalifikującego kosztu; unknown → NULL. Zakres obowiązuje niezależnie od tego, czy kampania przyniosła powiązaną rezerwację. Koszt kampanii bez zakupu nadal uczestniczy w kosztach jej zakresu: w liczniku online_booking_ad_cost oraz w mianowniku linked_booking_roas, gdy kampania należy do tego zakresu powiązania.

Konfiguracja jest odczytywana z Supabase jako wejście procesu. W BigQuery zapisuje się `spend_scope_id`, `config_version`, flagę i zakwalifikowaną kwotę, nie kopię ustawień KPI. Serwer sprawdza zgodność wybranej konfiguracji z wersją użytej kwalifikacji. Rozbieżność wersji wymaga przeliczenia lub statusu niedostępności, jawnego zachowania zgodności składników KPI (O07).

### 10.2. Tożsamość a płatne powiązanie

Purchase z poprawnym transaction_id może być zakupem organicznym. `purchase_booking_links` w takim przypadku potwierdza tożsamość i podnosi licznik połączeń tożsamości, lecz dopiero `booking_marketing_evidence` może potwierdzić kwalifikujące źródło płatne. Dane source/medium, campaign_id, click token albo journey muszą odnosić się do tego zakupu i ustalonego okna/scope. Relacja jest techniczna; przyczynowość pozostaje odrębnym badaniem.

Dla `linked_booking_roas` obowiązuje pięć warunków kontraktu:

1. Purchase jednoznacznie połączone z aktywną rezerwacją Profitroom.
2. Dodatkowe kwalifikujące powiązanie z płatnym marketingiem.
3. Koszt zgodnego zakresu uwzględnionych rezerwacji, także kampanii bez konwersji w tym zakresie.
4. Jednokrotne wniesienie wartości przez rezerwację.
5. Skonfigurowane wymagania pokrycia i jakości są spełnione dla wybranego okresu.

Metryka otrzymuje NULL wraz z właściwym statusem do czasu spełnienia bramki; po jej przejściu zerowy koszt nadal daje ZERO_DENOMINATOR. Zmierzone zero kwalifikujących rezerwacji może dać 0 przy działającym i odpowiednio pokrytym pomiarze. Sama nieobecność linków nie dowodzi zmierzonego zera.

### 10.3. Luka granicy danych i reguł — jawne doprecyzowanie do akceptacji

Kontrakt jednocześnie umieszcza w overview `linked_booking_roas_status` i lokuje końcową ocenę progów w Supabase/serwerze. **PROPOZYCJA:** dzienny status jest stanem gotowości technicznych wejść; serwer ponownie ocenia cały okres i progi z Supabase, nadając finalny status KPI. Dzienny `OK` znaczy „technicznie dostępne wejścia”, a nie „spełniono produkcyjny próg prób dla dowolnego okresu”. Ta interpretacja realizuje zapis o ponownej ocenie okresu, ale wymaga potwierdzenia O11 przed SQL. Kontrakt nie został zmieniony.

| Sytuacja | Dane / kod powodu | Wynik okresowy |
|---|---|---|
| Brak źródła | NO_DATA, SOURCE_NOT_AVAILABLE | Zależny KPI NULL; niezależne źródła zachowują dostępne liczby |
| Brak dnia/fragment importu | PARTIAL_DATA, INCOMPLETE_IMPORT | Pełny KPI NULL lub jawny dostępny podzbiór zgodnie z kontraktem |
| Brak tożsamości | PURCHASE_BOOKING_LINK_UNVERIFIED | linked KPI NULL przy niespełnionej bramce |
| Brak kwalifikującego dowodu płatnego | PAID_MARKETING_LINK_UNVERIFIED | Rezerwacja poza licznikiem płatnym; gotowość pomiaru oceniana osobno |
| Koszt/wersja/okno niezgodne | NOT_COMPARABLE, COST_SCOPE_MISMATCH / CONFIG_VERSION_MISMATCH | KPI NULL |
| Niejednoznaczny klucz/duplikacja | INVALID_DATA, BOOKING_DEDUPLICATION_UNVERIFIED | Wartość oczekuje rozstrzygnięcia, KPI NULL |
| Pokrycie nieznane | coverage_status=UNKNOWN, LINKAGE_COVERAGE_UNKNOWN | Reguła wymagająca znanego pokrycia oczekuje danych |
| Pokrycie poniżej progu | Serwer: INSUFFICIENT_DATA, LINKAGE_QUALITY_BELOW_THRESHOLD | KPI/wynik reguły według bramki pozostaje NULL |
| Zmierzony mianownik zero | ZERO_DENOMINATOR | NULL zgodnie z katalogiem metryk |

Lista reason_codes jest propozycją implementacyjną; zestaw z kontraktu pozostaje zachowany. Wszystkie powody są zachowane jako zbiór. Proponowany priorytet głównego statusu: INVALID_DATA → NOT_COMPARABLE → NO_DATA → PARTIAL_DATA → INSUFFICIENT_DATA → ZERO_DENOMINATOR → OK; do potwierdzenia wraz z O11.

## 11. Bezpieczeństwo, izolacja hoteli i syntetyczność

### 11.1. Propozycja dostępu dla demo

- Osobny projekt demo, wszystkie rekordy biznesowe `is_synthetic=true`. Produkcja ma odrębny projekt i tożsamości serwisowe.
- `hotel_id` jest wymagany w każdym ziarnie, kluczu łączenia, cache i raporcie. Minimum dwa hotele syntetyczne umożliwią test przenikania danych, bez tworzenia ich w tym kroku.
- Przeglądarka nie ma dostępu do Google Cloud. Serwer najpierw weryfikuje sesję i członkostwo w Supabase, a następnie wykonuje parametryzowane zapytanie z zatwierdzonym hotel_id i datami.
- Tożsamość importu zapisuje raw/ops; tożsamość transformacji ma potrzebny odczyt/zapis core/mart/ops; tożsamość aplikacji ma `bigquery.jobs.create` w projekcie wykonania i odczyt wyłącznie zatwierdzonych widoków.
- Proponowane authorized views w `hma_app` udostępniają dane z mart i stanu publikacji bez nadawania aplikacji odczytu tabel źródłowych. Tabele źródłowe i widoki są w uzgodnionej lokalizacji. [Odczyt widoków i uprawnienia](https://docs.cloud.google.com/bigquery/docs/querying-clustered-tables).
- Wszystkie filtrowania i nazwy widoków są kontrolowane przez serwer; parametry reprezentują wartości, a lista dopuszczonych struktur jest stała. Cache obejmuje hotel, obie daty, publikację, konfigurację i wersję reguł.

**Istotna granica:** wspólne konto serwisowe z dostępem do widoków wielu hoteli widzi w BigQuery sumę swoich uprawnień. BigQuery nie zna automatycznie użytkownika Supabase. Współdzielone demo opiera izolację użytkowników na serwerowej autoryzacji i testach. Jeżeli wymagana jest osobna izolacja egzekwowana przez hurtownię, trzeba wybrać osobne tożsamości/tenant views lub polityki dostępu dla odpowiednich principal; sama klauzula `hotel_id` albo klastrowanie nie jest taką izolacją (O13). [Podejścia wielodostępne BigQuery](https://docs.cloud.google.com/bigquery/docs/best-practices-for-multi-tenant-workloads-on-bigquery).

### 11.2. Dane i koszty operacyjne

Demo ma wyłącznie wygenerowane ID, daty, kwoty i obserwacje; `scenario_id` i `generator_version` pozwalają odtworzyć scenariusz. Kopiowanie danych osobowych do demo nie jest częścią projektu. W przyszłych danych produkcyjnych identyfikatory urządzeń i transakcji pozostają chronione w raw/core; agregaty aplikacyjne nie zawierają tych identyfikatorów. Pseudonimizacja nie oznacza automatycznie anonimowości; retencja i metoda tokenizacji wymagają O08.

Projekt uprawnień ogranicza aplikację do odczytu. Mechanizm serwerowego uwierzytelnienia Google Cloud, retencja, logi, limity zapytań i budżet będą zatwierdzone przed zasobami; w tym kroku nie dodaje się poświadczeń. Parametryzowane filtry partycji i maksymalna liczba skanowanych bajtów są rekomendacją kosztową. Limity techniczne powinny kontrolować koszt, zachowując biznesową możliwość dowolnego zakresu dat (O01/O14).

**Partycjonowanie a uprawnienia:** partycja po dacie i klaster zaczynający się od hotel_id ograniczają skanowanie, lecz nie nadają uprawnień. Zapytania aplikacji filtrują daty, a późniejszy test dry-run sprawdzi skuteczność przycięcia partycji przez widoki. [Partycje i pruning](https://docs.cloud.google.com/bigquery/docs/partitioned-tables).

### 11.3. Obowiązująca granica ręcznego wdrażania — cały Etap 4

**USTALONE:** Codex przygotowuje dokumentację, lokalne pliki SQL, instrukcje oraz testy w zakresie zleconego kroku. Codex nie otrzymuje dostępu do Google Cloud i nie tworzy ani nie modyfikuje projektów, datasetów, tabel, widoków, kont serwisowych, IAM, budżetów ani innych zasobów chmurowych.

Wszystkie operacje w konsoli Google Cloud oraz wszystkie zapytania tworzące lub zmieniające zasoby uruchamia **ręcznie właścicielka aplikacji**. Dotyczy to również importów, transformacji, publikacji i testów wykonywanych w chmurze. Opis procesu dziennego w sekcji 8 przedstawia logikę docelową; w Etapie 4 każde jego wykonanie w Google Cloud pozostaje ręczne, po stronie właścicielki. Przyszłe tożsamości techniczne z sekcji 11.1 służą docelowej aplikacji i procesom, a nie dostępowi Codex.

Przed każdym wykonaniem właścicielka otrzymuje wyjaśnienie: co zostanie utworzone lub zmienione, w jakim dokładnie projekcie, jaki jest zakres działania, możliwy skutek oraz koszt. Każde polecenie jest najpierw sprawdzane pod kątem **project_id, lokalizacji EU i zakresu działania**. Niezgodność, nierozstrzygnięty zakres albo brak zrozumiałej oceny skutków oznacza **STOP**. Akceptacja architektury nie zastępuje sprawdzenia konkretnego polecenia.

### 11.4. Ochrona kosztów przed zapytaniami

Przed utworzeniem zasobów uzgadniamy sposób rozliczeń, budżet i limity, a przed pierwszym zapytaniem właścicielka sprawdza ich faktyczne zastosowanie:

- wskazane konto rozliczeniowe albo świadoma praca w ograniczeniach BigQuery sandbox; dostępność wymaganych operacji trzeba sprawdzić dla wybranego trybu;
- zatwierdzony budżet oraz alerty kosztowe z określonym odbiorcą i progami; w sandboxie zapisujemy ograniczenia i sposób monitorowania zamiast zakładać dostępność funkcji rozliczeniowych;
- dzienny limit przetwarzanych danych lub inna dostępna kontrola kosztów odpowiednia do trybu rozliczeń, wraz z limitem pojedynczego zapytania tam, gdzie jest obsługiwany;
- sprawdzenie szacowanych przetwarzanych bajtów przed każdym zapytaniem, np. przez walidator lub dry-run; przy niedostępnej albo niepełnej estymacji wykonanie czeka na ocenę kosztu inną metodą;
- osobna ocena kosztu przechowywania, zapisu wyników i ewentualnego transferu, których sama liczba bajtów skanowania nie wyczerpuje.

**Zwykły alert budżetowy nie jest automatycznie twardym limitem wydatków.** Powiadomienie wymaga reakcji; ochronę uzupełniają dostępne limity i kontrola każdego wykonania. Nieznany koszt, przekroczony limit lub brak ustalonej ochrony oznacza STOP. W tym kroku opisujemy te zabezpieczenia, bez ich konfigurowania.

## 12. Spójność z zaakceptowanym kontraktem

| Obszar kontraktu | Realizacja w projekcie | Stan |
|---|---|---|
| Profitroom i statusy | Raw revisions, bookings_current, hotel_sales_daily | Zgodne; próbka eksportu O02 |
| Konfiguracja w Supabase | Odczyt procesu i serwera; BQ przechowuje odniesienia/rezultaty | Zgodne; polityka wersji O07 |
| Dowolny zakres dat | metric_date, równoliczny poprzedni zakres, serwerowe ilorazy | Zgodne, bez ograniczenia do tygodnia |
| Sześć płaskich widoków | Dokładne nazwy i pełne kolumny N.1–N.7 kontraktu | Zachowane; pola core/ops są technicznym rozwinięciem |
| Dwa poziomy łączenia | purchase_booking_links, evidence, booking_marketing_links | Zgodne; szczegóły kwalifikacji O03 |
| Pięć warunków linked ROAS | Bazy i kontrola techniczna, finalna bramka serwera | Doprecyzowanie granicy statusu O11 |
| Journey i okno 30 dni | Jawne kohorty i wyniki, aktualizacja historycznych dni | Definicja lifecycle i wielu wyników O05 blokuje finalną agregację tej części |
| NULL, zero i UNKNOWN | Manifest importu, quality per KPI, serwerowa ocena | Zgodne; mianowniki i hierarchia O08/O11 |
| AI z gotowymi faktami | Wyniki serwera z referencjami, bez tabel narracji | Zgodne; integracja jest późniejszym zadaniem |
| Syntetyczne dane | Osobny projekt, is_synthetic, scenariusze z dwoma hotelami | Zgodne; treść scenariusza O09 |

**Wniosek:** projekt struktur można przygotować bez zmiany kontraktu. Luki O03/O05/O07/O11 wymagają decyzji przed wdrożeniem zależnych kwalifikacji, journey i statusów. Pozostałe rdzeniowe tabele sprzedaży/reklam mogą być projektowane niezależnie. Żadna niepewna decyzja biznesowa nie została uznana tutaj za zatwierdzoną.

## 13. Kolejność późniejszego wdrożenia

Pełna architektura pozostaje zachowana: 25 tabel fizycznych i sześć widoków. **Struktury będą powstawać etapami, a nie jednocześnie.** Każdy etap wymaga kontroli wyniku przed przejściem dalej. Codex przygotowuje lokalne materiały po osobnym zleceniu; wszystkie wykonania chmurowe poniżej realizuje ręcznie właścicielka zgodnie z sekcją 11.3. Krok 4.1 kończy się na dokumencie.

Przed A uzgadniamy sposób rozliczeń, budżet i limity; B obejmuje ich ustawienie lub potwierdzenie dostępnych zabezpieczeń w wybranym trybie. Przed każdym poleceniem obowiązuje kontrola projektu, EU, zakresu oraz skutku i kosztu.

| Stan / etap | Co dokładnie powstaje | Kto wykonuje operację | Kontrola przed przejściem dalej | Warunek STOP | Czy może generować koszt? |
|---|---|---|---|---|---|
| [ ] A. Osobny projekt | Nowy projekt demo z wybranym finalnym project_id | Właścicielka ręcznie | Nowe ID, odrębność od creatic-503805, właściciel projektu, uzgodniony tryb rozliczeń | Wybrany istniejący projekt klientów, błędne ID lub brak ustaleń finansowych | Sam pusty projekt nie przetwarza danych; podłączenie płatnych usług otwiera możliwość kosztów |
| [ ] B. EU i ochrona kosztów | Zatwierdzenie EU dla wszystkich datasetów i zadań; konfiguracja rozliczeń albo sandboxa, budżetu, dostępnych alertów i limitów | Właścicielka ręcznie | Faktyczny zakres limitów, odbiorcy alertów, ograniczenia sandboxa; lokalizacja jest własnością datasetów, nie całego projektu | Inna lokalizacja, nieznane ograniczenia lub traktowanie alertu jako twardego limitu | Konfiguracja nie skanuje danych; płatny tryb pozwala naliczać opłaty za późniejsze użycie |
| [ ] C. Puste datasety | hma_ops, hma_raw, hma_core, hma_mart, hma_app — bez tabel i danych | Właścicielka ręcznie, z kontrolą każdego datasetu | Każdy dataset w nowym projekcie i EU, właściwy dostęp, brak danych | Błędny projekt, lokalizacja lub niezamierzony dostęp | Puste datasety nie generują skanowania ani przechowywania danych użytkowych |
| [ ] D. Tabele ops | import_batches, releases, rejected_records | Właścicielka ręcznie, pojedynczo | Zgodność schematów, kluczy i partycji z sekcją 8; tabele puste | Rozbieżny schemat, niezamierzony zapis danych lub nadpisanie istniejącej struktury | Puste definicje bez skanowania; późniejsze zapisy i odczyty mogą kosztować |
| [ ] E. Tabele raw | Sześć tabel z sekcji 5, każda osobno | Właścicielka ręcznie, jedna tabela na wykonanie | Źródło, grain, typy, metadane, partycje, syntetyczność; odbiór każdej tabeli | Brak decyzji o wymaganym schemacie, odwołanie do realnych danych lub niewłaściwe ID | Puste definicje bez skanowania; koszt danych dopiero przy późniejszym użyciu |
| [ ] F. Odpowiadające tabele core | Dziesięć struktur sekcji 6 w kolejności zależności od gotowych raw i innych core | Właścicielka ręcznie, pojedynczo | Klucze hotelu, deduplikacja, daty, NULL; rozstrzygnięte wymagane O02–O05/O07/O11 | Brak zależności lub decyzji potrzebnej danej strukturze | Puste definicje bez skanowania; transformacje z danymi mogą kosztować |
| [ ] G. Tabele mart | Sześć tabel daily_store z sekcji 7 | Właścicielka ręcznie, pojedynczo | Grain, release_id, liczniki i mianowniki, zgodność kontraktu, gotowe zależności | Nieaddytywne bazy potraktowane jako sumowalne, brak metadanych jakości lub zależności | Puste definicje bez skanowania; późniejsza agregacja i przechowywanie mogą kosztować |
| [ ] H. Widoki app | Sześć widoków daily nad mart i stanem publikacji; wymagane jawne uprawnienia | Właścicielka ręcznie, pojedynczo | Nazwy i kolumny kontraktu, wybór publikacji, zakres hotelu, tylko zatwierdzone zależności | Dostęp do raw przez aplikację, niewłaściwy projekt lub niespójna publikacja | Sama definicja widoku nie materializuje danych; odczyt/walidacja zapytaniem może kosztować |
| [ ] I. Dane syntetyczne | Zatwierdzony scenariusz co najmniej dwóch hoteli w raw/ops oraz wyniki ręcznie uruchomionych transformacji core/mart i publikacja | Właścicielka ręcznie, kontrolowanymi partiami | O09, is_synthetic, scenario_id, generator_version, liczby kontrolne, estymacja kosztu każdego zadania | Dane rzeczywiste, niejawna semantyka, naruszenie izolacji, brak estymacji/limitu albo niezgodne sumy | Tak: zależnie od trybu importu, transformacji, skanowania i przechowywania; sandbox ma ograniczenia |
| [ ] J. Testy | Wyniki kontroli obliczeń, izolacji hoteli i zgodności kontraktu; bez podłączania aplikacji w tym kroku | Właścicielka uruchamia testy chmurowe ręcznie; Codex może przygotować i uruchamiać zlecone testy lokalne bez dostępu do chmury | Zera/NULL, anulacje, pięć warunków linked ROAS, dowolne daty, brak mnożenia kwot, publikacja i separacja hotel_id/uprawnień | Błąd merytoryczny, przeciek hotelu, koszt poza limitem lub brak decyzji blokującej test | Tak dla zapytań i zapisywanych wyników; lokalne testy bez połączenia nie generują kosztu Google Cloud |

Warunek STOP w jednej zależnej części oznacza jej wstrzymanie do wyjaśnienia; nie jest zgodą na zgadywanie ani usuwanie jej z architektury. Testy endpointów i cache zostaną uzupełnione w osobnym etapie aplikacyjnym, gdy powstanie adapter. Integracja Next.js, reguły, AI, aktualizacje dashboardu i wdrożenia pozostają późniejszymi zadaniami.

## 14. Wszystkie otwarte decyzje i ryzyka

Oznaczenia Q odnoszą się do zaakceptowanego kontraktu. Pytania techniczne nie zastępują jego rozstrzygnięć biznesowych.

| ID | Otwarte pytanie | Ryzyko i sposób zachowania do rozstrzygnięcia | Moment decyzji |
|---|---|---|---|
| O01 | **CZĘŚCIOWO ROZSTRZYGNIĘTE:** demo będzie osobnym projektem; rekomendowana lokalizacja ustalona na EU. Finalny project_id wybierze właścicielka podczas ręcznego tworzenia. Sposób rozliczeń (konto albo sandbox), budżet, alerty i limity kosztów pozostają do ustalenia. | Zgodna lokalizacja nie nadaje dostępu do innych projektów; ochrona kosztów wymaga jawnych zabezpieczeń, a sam alert nie zatrzymuje wydatków | Ustalenia finansowe przed utworzeniem zasobów; ID przy ręcznym tworzeniu, kontrola zabezpieczeń przed zapytaniami |
| O02 | Jak wygląda faktyczna próbka Profitroom, stabilne ID, statusy, wartości, kanały, czas rewizji oraz tryb pełny/delta/usunięcia? Gdzie dostępne jest mapowanie transaction? | Błędne anulacje, latest-state i zakres „całej sprzedaży”; niejednoznaczne rekordy wymagają jakości | Przed adapterem sprzedaży; kontrakt D01/D03 |
| O03 | Które kampanie/koszty są eligible, jak traktujemy podatki i korekty? Jaka akcja zakupowa i polityka platformy obowiązuje? Jaki dowód płatny i zakres kosztu kwalifikuje linked ROAS? | Ukryta zmiana mianownika lub uznanie identity za paid; dependent KPI pozostają NULL | Przed kwalifikacją, Q01/Q02 |
| O04 | O której aktualizujemy dane, jaki jest cutoff pełnych dni i źródłowe strefy? Jak obsłużyć dzienne raporty w innej strefie? | Porównanie różnych dni, opóźnienie; date_basis i aktualność pozostają jawne | Przed harmonogramem, Q03 |
| O05 | Jak deduplikować eventy BE/GA4, tworzyć sesję/journey i kończyć journey? Jakie są mapa etapów, okno przejść, Google Brand i wybór wielu wyników? | Wiele dni może podwójnie policzyć journey, a purchase w obu źródłach podwoić efekt; blokada zależnych przejść/udziałów | Przed sesjami, lejkiem i ścieżkami, Q04 |
| O06 | Jakie produkcyjne progi jakości, wolumenu i pewności zatwierdzi pierwszy hotel? | Obecność rekordów może udawać wystarczalność; tylko demo ma opisane wartości przykładowe | Przed regułami, Q05 |
| O07 | Jak proces importu czyta zatwierdzoną konfigurację Supabase? Kto ją zatwierdza i która wersja obowiązuje przy historycznym przeliczeniu? | Rozbieżne eligible/linkage między procesem i serwerem; potrzeba wersji i powtórnego przeliczenia | Przed kwalifikacją/mapami, Q06 oraz granica konfiguracji |
| O08 | Jakie identyfikatory/tokenizacja, retencja i logi są dopuszczone? Jak znamy mianowniki pokrycia i stan zgód? | Błędne 100% pokrycia albo brak danych do rekonstrukcji; UNKNOWN przy nieznanym mianowniku | Przed realnymi danymi i jakością, Q07 |
| O09 | Jakie syntetyczne dni, kampanie, statusy i połączenia utworzymy? Które dawne sumy i semantyki zachowamy? | Nadanie starym package_bookings/booking_value fikcyjnej atrybucji; nowy scenariusz jest jawny | Przed generatorami i seedem, Q08 |
| O10 | Czy dostępny będzie kompletny zbiór indywidualnych kwalifikujących kliknięć i wiarygodne wejścia, czy tylko agregaty? | Selekcja tylko kliknięć z wizytą zawyży dotarcie; click_arrival_rate pozostaje NULL, sessions_per_click osobno | Przed metryką dotarcia |
| O11 | Czy akceptujemy rozdzielenie technicznego dziennego statusu i finalnej bramki KPI na serwerze oraz hierarchię reason/status? | Progi zależne od zakresu mogłyby być oceniane na pojedynczych dniach; status dzienny nie jest końcową oceną okresu | Przed SQL mart i adapterem statusów |
| O12 | Jaki zakres historii, retencję publikacji i limit pełnej przebudowy demo przyjmujemy? Jak serwer zapewni jeden spójny odczyt publikacji? | Mieszanie wersji, koszt pełnych rebuildów, brak reakcji na stare anulacje; aktywna ostatnia poprawna publikacja pozostaje dostępna | Przed publikacją i skalowaniem |
| O13 | Czy serwerowa izolacja współdzielonego demo wystarcza, a przed produkcją jaki model egzekwowania izolacji w BigQuery i uwierzytelnienia serwera wybieramy? | Wspólne konto serwisowe nie rozróżnia użytkowników Supabase; wymagane testy uprawnień i świadoma granica | Przed IAM i rzeczywistymi hotelami |
| O14 | Jak transportujemy NUMERIC/INT64, ograniczamy koszt zapytań i wybieramy model/format AI, logi oraz walidację odpowiedzi? | Utrata dokładności, rozbieżne liczby i koszt; brak obliczeń w AI, jawny adapter liczb | Adapter w osobnym etapie; AI według Q09 |

Dalszy rozwój pozostaje zgodny z kontraktem: FX, potwierdzone rozmowy, pobyty, przychód zrealizowany, zaawansowana dojrzałość, probabilistyka i cross-device. Tego kroku nie blokuje wybór modelu AI ani implementacja tych rozszerzeń.

## 15. Kryteria akceptacji projektu BigQuery

Poniższe kryteria rozróżniają akceptację projektu od przyszłej realizacji i testów implementacji; sam dokument nie potwierdza ich wykonania w chmurze.

- [ ] Cały Etap 4 zachowuje ręczne wykonanie chmurowe przez właścicielkę; Codex przygotowuje materiały bez dostępu do Google Cloud.
- [ ] Datasety demo powstają w osobnym projekcie i EU; rozliczenia, budżet i dostępne limity są uzgodnione, a każde zapytanie ma sprawdzony koszt i zakres.
- [ ] Checklista A–J jest realizowana etapami, z kontrolą wyniku i warunkami STOP.
- [x] Właścicielka zaakceptowała granice datasetów, osobny projekt demonstracyjny, lokalizację EU, zasadę ręcznego wdrażania oraz aktualny stan decyzji O01–O14.
- [ ] Sześć app views zachowuje wszystkie pola, grain i NULL z kontraktu 0.2; dodatkowe struktury są wyłącznie technicznym zapleczem.
- [ ] Każdy raw/core/mart/ops ma klucz, typ, hotel, partycję lub uzasadniony jej brak, wersję i źródło.
- [ ] O02–O05 oraz O07/O11 są rozstrzygnięte przed implementacją zależnych części; brak decyzji jest widoczny jako ograniczenie, nie losowe założenie.
- [ ] Ponowny import tego samego batcha nie zmienia sum; kolejna rewizja ma pierwszeństwo zgodne z ustalonym porządkiem źródła.
- [ ] Anulacja starej rezerwacji aktualizuje historyczne active, cancelled, wartość i aktywne powiązania, zachowując kohortę utworzenia.
- [ ] Purchase poprawnie połączony z Profitroom, lecz bez kwalifikacji płatnej, jest oddzielony od licznika linked_booking_roas.
- [ ] Pięć warunków linked ROAS i zerowy mianownik mają osobne przypadki: duplicate, identity missing, paid missing, cost mismatch, UNKNOWN i próg jakości.
- [ ] Delivery i conversion nie mnożą kosztu, a pełne hotelowe sumy nie dodają agregatu Meta do kampanii składowych.
- [ ] Journey przekraczające północ, powtórzony purchase i wiele wyników są policzone zgodnie z zaakceptowaną definicją; liczniki przejścia są podzbiorami mianowników.
- [ ] Dowolne 1/2/7 dni, miesiąc, kwartał, zmiana miesiąca/roku/czasu i bieżący dzień zachowują zakresy, poprzedni okres tej samej długości oraz metadane aktualności.
- [ ] Zera, brak pliku, nieznane pokrycie i waluta inna niż hotelowa dają odpowiednie NULL/status/powody; częściowe sumy są opisane.
- [ ] Mianownik ścieżek obejmuje pełny kwalifikujący zbiór, niezależnie od top N; `paid_marketing` i `purchase_booking_identity` mają osobne jakości.
- [ ] Publikacja jest atomowa, odczyt spójny, a nieudany proces pozostawia ostatnie poprawne dane z ich rzeczywistą datą aktualizacji.
- [ ] Dwa syntetyczne hotele mają celowo kolidujące źródłowe ID; testy potwierdzają izolację joinów, endpointów i cache.
- [ ] Aplikacja ma wyłącznie serwerowy odczyt authorized views, a ustawienia i role pozostają w Supabase; poświadczenia są poza przeglądarką i repozytorium.
- [ ] Późniejsze dry-runy mierzą skanowane bajty i działanie filtrów partycji; prognoza kosztu mieści się w zatwierdzonym budżecie.
- [ ] NUMERIC i INT64 zachowują dokładność na granicy aplikacji; każdy końcowy KPI ma referencję hotel/okres/metryka/publikacja/konfiguracja.

Krok 4.1 został zaakceptowany. Dokument stanowi podstawę ręcznego wdrażania architektury BigQuery w kolejnych krokach Etapu 4. Nie utworzono jeszcze żadnych zasobów Google Cloud.
