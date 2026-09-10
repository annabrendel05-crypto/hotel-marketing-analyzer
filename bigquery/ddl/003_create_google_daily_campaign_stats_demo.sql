-- GoogleSQL. Projekt DDL; ręczne wykonanie przez właścicielkę po akceptacji.
-- Projekt: hotel-marketing-analyzer-demo; dataset: google_ads; lokalizacja zadania: EU.
-- Podstawa: SYNTHETIC_DATA_SCENARIO.md 0.3, ANALYTICS_CONTRACT.md 0.2.
-- Grain i klucz logiczny: metric_date + hotel_id + customer_id + campaign_id.
-- Jedna aktualna wersja dnia kampanii, bez wierszy sum konta i dodatkowych breakdownów.
-- Ponowny import zastępuje logicznie ten sam wynik; batch_id nie rozszerza klucza.
-- Koszt występuje raz, niezależnie od liczby działań konwersyjnych.
-- IF NOT EXISTS nie zmienia istniejącej tabeli i nie weryfikuje jej schematu.
-- EU jest lokalizacją datasetu i zadania. Późniejsze dane i zapytania mogą kosztować.
--
-- Przechowujemy wymiary, metryki bazowe i metadane; NULL=brak, 0=zmierzone zero.
-- Koszt jest kwotą w currency_code, a nie cost_micros. Konwersje dopuszczają ułamki.
-- Mapowanie kanoniczne: Zakup -> purchases/purchase_value; Telefon -> phone_contacts;
-- Calls from ads -> calls_from_ads. Etapy mają własne kolumny o nazwach działań.
-- Kontakty są kredytami działań, nie liczbą unikalnych osób ani potwierdzonych rozmów.
-- Nie sumujemy różnych działań do liczby rezerwacji ani kontaktów unikalnych.
-- Google, Meta i GA4 mają odrębne obserwacje; Profitroom jest kanonicznym źródłem
-- rezerwacji, kanału, wartości i anulacji. purchase_value jest wynikiem Google Ads.
--
-- Wskaźniki pochodne poza tabelą: CTR=SUM(clicks)/SUM(impressions)*100;
-- CPC=SUM(cost)/SUM(clicks); CPM=SUM(cost)/SUM(impressions)*1000;
-- ROAS Google=SUM(purchase_value)/SUM(cost); koszt akcji=SUM(cost)/SUM(wybrana_akcja).
-- Liczymy ilorazy sum zgodnych okresów, walut i polityk, nie średnie dziennych KPI.
-- Zerowy mianownik lub niekompletny wymagany pomiar daje NULL z oceną jakości poza tabelą.
--
-- Walidacje przyszłego generatora/importu; DDL nie egzekwuje poniższych reguł:
-- 1. Unikalny klucz logiczny, niepuste ID; wyłącznie nowe syntetyczne nazwy i rekordy.
-- 2. Dokładnie 90 kolejnych dni; zakres kalendarzowy do ustalenia przy generatorze.
--    DDL nie ogranicza tabeli do konkretnych dat; dni bez emisji według planu pokrycia.
-- 3. Znane metryki >=0; impressions i clicks całkowite; kwoty demo zgodne z groszami.
-- 4. currency_code=PLN, source_timezone=Europe/Warsaw, source_system=google_ads.
-- 5. Jedna waluta w porównywanym zakresie; brak automatycznej konwersji walut.
-- 6. campaign_group: Search Generic, Brand, GHA; syntetyczne role niezależne od nazw.
--    Orientacyjny mix budżetu 60/35/5; dokładne kwoty i tolerancje do uzgodnienia.
-- 7. Bez wymogu purchases<=step3_confirmation ani step3<=step2<=step1 w dniu.
--    Atrybucja może przesuwać daty i dzielić kredyty; to nie chronologia jednej osoby.
-- 8. Wspólne pola atrybucji opisują wszystkie działania tylko przy zgodnej polityce.
--    Jeśli modele/okna różnią się między akcjami, model/window pozostają NULL,
--    attribution_policy_id wskazuje wersjonowaną specyfikację per akcja.
--    Przy różnych podstawach dat wymagane jest uzgodnienie przed importem;
--    nie mieszamy takich raportów w jednym wierszu. Szczegóły polityki: S04.
-- 9. as_of_at<=loaded_at; stałe czasy według projektu generatora, bez zegara uruchomienia.
-- 10. is_synthetic=true; poprawne wersje i deterministyczne ID, batch oraz sortowanie.
-- 11. Brakujące działania pozostają NULL; zero wymaga potwierdzonego pomiaru.
-- 12. Spójne sumy grup i konta; zaakceptowane 0,01 PLN różnicy referencji jest
--     zaokrągleniem, nie zgodą na dublowanie kosztu w syntetycznych danych.
--
CREATE TABLE IF NOT EXISTS `hotel-marketing-analyzer-demo.google_ads.daily_campaign_stats_demo`
(
  metric_date DATE NOT NULL OPTIONS(description = 'Dzień raportu Europe/Warsaw; koszt według dnia emisji, działania według action_date_basis.'),
  hotel_id STRING NOT NULL OPTIONS(description = 'Syntetyczny hotel; część każdego klucza i połączenia.'),
  customer_id STRING NOT NULL OPTIONS(description = 'Syntetyczny identyfikator konta Google Ads.'),
  campaign_id STRING NOT NULL OPTIONS(description = 'Stabilny syntetyczny identyfikator kampanii w koncie.'),
  campaign_name STRING OPTIONS(description = 'Wyłącznie syntetyczna nazwa kampanii; nie jest kluczem.'),
  campaign_group STRING NOT NULL OPTIONS(description = 'Logiczna rola demo: Search Generic, Brand lub GHA; kontrolowana przy importowaniu.'),
  advertising_channel_type STRING OPTIONS(description = 'Techniczny typ kanału Google Ads, odrębny od roli biznesowej; NULL gdy nieznany.'),
  campaign_status STRING OPTIONS(description = 'Status kampanii na as_of_at; nie potwierdza emisji danego dnia. NULL gdy nieznany.'),
  currency_code STRING NOT NULL OPTIONS(description = 'Waluta kosztu i wartości; PLN w demo.'),
  cost NUMERIC OPTIONS(description = 'Bazowy koszt Google Ads w jednostkach waluty, zapisany raz na dzień kampanii.'),
  impressions INT64 OPTIONS(description = 'Bazowa liczba wyświetleń reklam.'),
  clicks INT64 OPTIONS(description = 'Bazowa liczba kliknięć reklam; odrębna od sesji GA4.'),
  step1_dates_and_rooms NUMERIC OPTIONS(description = 'Kredyt działania step1_dates_and_rooms raportowany przez Google Ads, nie liczba eventów GA4.'),
  step2_extras NUMERIC OPTIONS(description = 'Kredyt działania step2_extras raportowany przez Google Ads.'),
  step3_confirmation NUMERIC OPTIONS(description = 'Kredyt działania step3_confirmation raportowany przez Google Ads.'),
  phone_contacts NUMERIC OPTIONS(description = 'Kredyt kanonicznego działania Telefon; odrębny od Calls from ads.'),
  calls_from_ads NUMERIC OPTIONS(description = 'Kredyt kanonicznego działania Calls from ads; nie jest liczbą unikalnych kontaktów.'),
  purchases NUMERIC OPTIONS(description = 'Kredyt kanonicznego zakupu: działanie Zakup mapowane na purchase; wynik platformowy.'),
  purchase_value NUMERIC OPTIONS(description = 'Wartość tego samego działania Zakup w currency_code; odrębna od liczby zakupów i wartości Profitroom.'),
  attribution_model STRING OPTIONS(description = 'Wspólny model działań, jeśli znany i zgodny; szczegóły per akcja wskazuje attribution_policy_id.'),
  attribution_window STRING OPTIONS(description = 'Wspólne okno działań, jeśli znane i zgodne; bez sumowania raportów różnych okien.'),
  attribution_policy_id STRING OPTIONS(description = 'Identyfikator wersji specyfikacji mapowania działań, modeli, okien i zakresu raportu; NULL gdy nieustalona.'),
  action_date_basis STRING OPTIONS(description = 'Wspólna podstawa daty działań, np. dzień interakcji lub konwersji; do uzgodnienia, NULL gdy nieznana.'),
  source_timezone STRING NOT NULL OPTIONS(description = 'Strefa raportu źródłowego; Europe/Warsaw w demo.'),
  as_of_at TIMESTAMP NOT NULL OPTIONS(description = 'Moment stanu raportu i statusu kampanii, odrębny od metric_date.'),
  loaded_at TIMESTAMP NOT NULL OPTIONS(description = 'Deterministyczny czas importu według projektu generatora.'),
  source_system STRING NOT NULL OPTIONS(description = 'Źródło: google_ads.'),
  batch_id STRING NOT NULL OPTIONS(description = 'Identyfikator syntetycznej partii; nie rozszerza klucza dnia kampanii.'),
  is_synthetic BOOL NOT NULL OPTIONS(description = 'Wymagane true dla wszystkich rekordów demo; kontrolowane przed importem.'),
  scenario_id STRING NOT NULL OPTIONS(description = 'Identyfikator wspólnego syntetycznego scenariusza.'),
  generator_version STRING NOT NULL OPTIONS(description = 'Wersja przyszłego generatora Google Ads; do ustalenia przy implementacji.'),
  contract_version STRING NOT NULL OPTIONS(description = 'Wersja kontraktu analitycznego, obecnie 0.2.'),
  scenario_version STRING NOT NULL OPTIONS(description = 'Wersja zaakceptowanego scenariusza, obecnie 0.3.')
)
PARTITION BY metric_date
CLUSTER BY hotel_id, customer_id, campaign_group, campaign_id
OPTIONS(require_partition_filter = TRUE, description = 'Syntetyczne dzienne wyniki Google Ads: jeden dzień, hotel, konto i kampania. Metryki bazowe i osobne działania atrybucyjne; koszt raz. Wyniki odrębne od Meta, GA4 i kanonicznych rezerwacji Profitroom.');
