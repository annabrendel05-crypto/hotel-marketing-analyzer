-- GoogleSQL. Projekt DDL; ręczne wykonanie przez właścicielkę po akceptacji.
-- Projekt: hotel-marketing-analyzer-demo; dataset: meta_ads; lokalizacja zadania: EU.
-- Podstawa: SYNTHETIC_DATA_SCENARIO.md 0.3, ANALYTICS_CONTRACT.md 0.2.
-- Aktualne zlecenie wybiera płaski grain zamiast wcześniejszych wierszy delivery/conversion.
-- Grain i klucz logiczny: metric_date + hotel_id + account_id + campaign_id.
-- Jedna aktualna wersja dnia kampanii; bez dodatkowych breakdownów i sum konta.
-- Ponowna partia zastępuje logicznie tę samą wersję, zamiast dodawać koszt drugi raz.
-- Jedna polityka atrybucji i jedna waluta w wierszu; ich zmiana wymaga kontroli porównywalności.
-- IF NOT EXISTS zachowuje istniejącą tabelę, ale nie weryfikuje jej schematu.
-- EU jest lokalizacją datasetu/zadania, nie opcją CREATE TABLE.
-- Tabela pusta; późniejsze przechowywanie i zapytania mogą generować koszt.
--
-- Wszystkie poniższe kolumny są przechowywane: wymiary, metryki bazowe lub metadane.
-- NULL metryki = brak pomiaru; 0 = zmierzone zero. Bez domyślnych zer.
-- NUMERIC dla kwot i konwersji zachowuje dokładność oraz ewentualny ułamkowy kredyt.
-- INT64 dla impressions, clicks, link_clicks i landing_page_views przechowuje całkowite liczniki.
-- Wskaźniki pochodne poza tabelą: CTR linku = SUM(link_clicks)/SUM(impressions)*100;
-- CTR wszystkich kliknięć analogicznie z clicks; CPC linku = SUM(spend)/SUM(link_clicks);
-- CPC wszystkich kliknięć analogicznie z clicks; CPM = SUM(spend)/SUM(impressions)*1000;
-- koszt etapu = SUM(spend)/SUM(wskazana_akcja); ROAS Meta = SUM(purchase_value)/SUM(spend).
-- Conversion rate wymaga jawnej akcji i mianownika, np. purchases/link_clicks.
-- Wskaźniki są ilorazami sum zgodnych okresów, nie średnimi wskaźników dziennych.
-- Zerowy mianownik lub niekompletny wymagany pomiar daje NULL, z oceną jakości poza tabelą.
--
-- Walidacje przyszłego generatora/importu (DDL nie egzekwuje tych reguł):
-- 1. Unikalny klucz logiczny; niepuste ID; wyłącznie syntetyczne rekordy i nazwy.
-- 2. Generator tworzy dokładnie 90 kolejnych dni danych demo.
--    Konkretny zakres dat zostanie ustalony przy projektowaniu generatora.
--    DDL nie ogranicza tabeli do konkretnego przedziału kalendarzowego.
-- 3. source_timezone=Europe/Warsaw; currency_code=PLN; source_system=meta_ads.
-- 4. is_synthetic=true; zgodne scenario_id, generator_version i deterministyczny batch_id.
-- 5. Znane metryki >=0; kwoty zgodne z groszami; braki pozostają NULL.
-- 6. link_clicks<=clicks przy zgodnym zakresie raportu.
-- 7. landing_page_views<=link_clicks jako kontrola spójności bazowego demo;
--    rozbieżność wymaga wyjaśnienia zakresu/pomiaru, nie automatycznego obcięcia wyniku.
-- 8. Bez wymogu purchases<=initiate_checkout ani chronologicznego lejka dziennego.
-- 9. Jedna kanoniczna akcja na kolumnę; bez sumowania aliasów zakupowych.
-- 10. purchase_value jest odrębne od purchases; nie jest wartością rezerwacji Profitroom.
-- 11. Polityka atrybucji i podstawa daty działań do uzgodnienia przed generatorem (S04).
-- 12. loaded_at jest czasem importu, as_of_at czasem stanu raportu; as_of_at<=loaded_at.
--     Stałe daty i aktualność zgodne ze scenariuszem; brak odwołań do zegara generatora.
--
CREATE TABLE IF NOT EXISTS `hotel-marketing-analyzer-demo.meta_ads.daily_campaign_stats_demo`
(
  metric_date DATE NOT NULL OPTIONS(description = 'Dzień raportu w Europe/Warsaw; koszt według dnia emisji, działania według jawnego action_date_basis.'),
  hotel_id STRING NOT NULL OPTIONS(description = 'Syntetyczny hotel; część klucza i każdego połączenia.'),
  account_id STRING NOT NULL OPTIONS(description = 'Syntetyczne konto reklamowe Meta.'),
  campaign_id STRING NOT NULL OPTIONS(description = 'Stabilny syntetyczny identyfikator kampanii w koncie.'),
  campaign_name STRING OPTIONS(description = 'Syntetyczna nazwa; nie jest kluczem. NULL oznacza brak nazwy.'),
  campaign_type STRING OPTIONS(description = 'Syntetyczna rola kampanii, np. prospecting, remarketing lub inne przyszłe role; NULL gdy nieznana.'),
  campaign_status STRING OPTIONS(description = 'Status kampanii na as_of_at; NULL gdy nieznany, nie jest dowodem emisji danego dnia.'),
  currency_code STRING NOT NULL OPTIONS(description = 'Waluta kwot: PLN dla demo; bez sumowania różnych walut.'),
  spend NUMERIC OPTIONS(description = 'Bazowy koszt emisji Meta; zapisany raz na dzień kampanii, w walucie raportu.'),
  impressions INT64 OPTIONS(description = 'Bazowa liczba wyświetleń reklam.'),
  clicks INT64 OPTIONS(description = 'Wszystkie kliknięcia raportowane przez Meta; odrębne od kliknięć linku.'),
  link_clicks INT64 OPTIONS(description = 'Kanoniczna akcja link_click; nie oznacza liczby unikalnych osób ani sesji.'),
  landing_page_views INT64 OPTIONS(description = 'Kanoniczna akcja landing_page_view; wynik platformowy Meta.'),
  search_events NUMERIC OPTIONS(description = 'Kanoniczna akcja offsite_conversion.fb_pixel_search; odrębna od etapu GA4.'),
  add_to_cart NUMERIC OPTIONS(description = 'Kanoniczna akcja offsite_conversion.fb_pixel_add_to_cart.'),
  initiate_checkout NUMERIC OPTIONS(description = 'Kanoniczna akcja offsite_conversion.fb_pixel_initiate_checkout.'),
  purchases NUMERIC OPTIONS(description = 'Kanoniczna akcja offsite_conversion.fb_pixel_purchase; bez sumowania purchase, omni_purchase i onsite_web_purchase.'),
  purchase_value NUMERIC OPTIONS(description = 'ActionValues dla offsite_conversion.fb_pixel_purchase w walucie raportu; wartość platformowa, nie przychód hotelu.'),
  attribution_model STRING OPTIONS(description = 'Model atrybucji działań platformowych; NULL gdy nieznany. Wymaga uzgodnienia przed generowaniem.'),
  attribution_window STRING OPTIONS(description = 'Jawne okno lub zestaw okien atrybucji działań; NULL gdy nieznane. Bez sumowania raportów różnych okien.'),
  action_date_basis STRING OPTIONS(description = 'Podstawa daty raportowania działań; NULL gdy nieznana. Nie zakłada chronologii zdarzeń jednej osoby.'),
  source_timezone STRING NOT NULL OPTIONS(description = 'Strefa raportu źródłowego; Europe/Warsaw w demo.'),
  as_of_at TIMESTAMP NOT NULL OPTIONS(description = 'Moment stanu raportu i statusu kampanii; odrębny od dnia metryki.'),
  loaded_at TIMESTAMP NOT NULL OPTIONS(description = 'Deterministyczny czas załadowania zgodny ze scenariuszem.'),
  source_system STRING NOT NULL OPTIONS(description = 'Źródło: meta_ads.'),
  batch_id STRING NOT NULL OPTIONS(description = 'Syntetyczna partia importu; nie rozszerza klucza logicznego dnia kampanii.'),
  is_synthetic BOOL NOT NULL OPTIONS(description = 'Wymagane true dla wszystkich rekordów demo; kontrolowane przed importem.'),
  scenario_id STRING NOT NULL OPTIONS(description = 'Identyfikator wspólnego syntetycznego scenariusza.'),
  generator_version STRING NOT NULL OPTIONS(description = 'Wersja przyszłego generatora Meta; do ustalenia przy implementacji.'),
  contract_version STRING NOT NULL OPTIONS(description = 'Wersja kontraktu analitycznego, obecnie 0.2; odrębna od wersji scenariusza.'),
  scenario_version STRING NOT NULL OPTIONS(description = 'Wersja zaakceptowanego scenariusza, obecnie 0.3.')
)
PARTITION BY metric_date
CLUSTER BY hotel_id, account_id, campaign_id
OPTIONS(require_partition_filter = TRUE, description = 'Syntetyczne dzienne wyniki kampanii Meta Ads. Jeden wiersz na dzień, hotel, konto i kampanię. Koszt raz, jedna kanoniczna kolumna na akcję. Wyniki platformowe odrębne od GA4, Google Ads i kanonicznych rezerwacji Profitroom.');
