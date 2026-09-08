-- GoogleSQL. Ręczne wykonanie przez właścicielkę po akceptacji SQL.
-- Projekt: hotel-marketing-analyzer-demo; dataset: ga4; lokalizacja zadania: EU.
-- Tworzy wyłącznie pustą tabelę. IF NOT EXISTS zachowuje istniejącą tabelę
-- i nie sprawdza zgodności jej schematu: istniejący schemat wymaga porównania.
-- Sam DDL nie skanuje danych; późniejsze przechowywanie i zapytania mogą kosztować.
-- Podstawa: BIGQUERY_DESIGN.md 0.3, ANALYTICS_CONTRACT.md 0.2.
-- Grain: jedno syntetyczne zdarzenie urządzenia/przeglądarki w strumieniu.
-- Unikalność logiczna hotel_id + demo_event_id jest kontrolowana przy ładowaniu.
-- Bez deklaracji PK/FK i bez danych. Reguły wartości i spójności dat
-- wymagają walidacji przyszłego importu; opisy pól nie wymuszają tych reguł.

CREATE TABLE IF NOT EXISTS `hotel-marketing-analyzer-demo.ga4.events_demo`
(
  hotel_id STRING NOT NULL OPTIONS(description = 'Identyfikator hotelu; część każdego klucza i połączenia.'),
  demo_event_id STRING NOT NULL OPTIONS(description = 'Syntetyczny identyfikator zdarzenia, unikalny w obrębie hotelu.'),
  event_date STRING NOT NULL OPTIONS(description = 'Dzień źródłowy YYYYMMDD według source_timezone.'),
  event_timestamp INT64 NOT NULL OPTIONS(description = 'Czas zdarzenia: mikrosekundy od epoki UTC.'),
  metric_date DATE NOT NULL OPTIONS(description = 'Dzień metryki Europe/Warsaw. Import dostarcza DATE(TIMESTAMP_MICROS(event_timestamp), Europe/Warsaw).'),
  event_name STRING NOT NULL OPTIONS(description = 'Nazwa zdarzenia z zatwierdzonego scenariusza GA4.'),
  event_params ARRAY<STRUCT<
    key STRING NOT NULL,
    value STRUCT<
      string_value STRING,
      int_value INT64,
      float_value FLOAT64,
      double_value FLOAT64
    > NOT NULL
  >> OPTIONS(description = 'Powtarzalne parametry zdarzenia. Jeden nośnik wartości na parametr; brak parametrów to pusta lista.'),
  user_pseudo_id STRING OPTIONS(description = 'Wyłącznie syntetyczny identyfikator przeglądarki lub urządzenia. NULL ogranicza łączenie sesji i journey.'),
  privacy_info STRUCT<
    analytics_storage STRING,
    ads_storage STRING,
    uses_transient_token STRING
  > OPTIONS(description = 'Syntetyczne stany zgód i użycia identyfikatorów przejściowych; brak informacji pozostaje NULL.'),
  device STRUCT<
    category STRING,
    operating_system STRING,
    web_info STRUCT<browser STRING>
  > OPTIONS(description = 'Podzbiór informacji o urządzeniu i przeglądarce.'),
  traffic_source STRUCT<
    name STRING,
    source STRING,
    medium STRING
  > OPTIONS(description = 'Źródło pierwszego pozyskania użytkownika; odrębne od atrybucji sesyjnej.'),
  session_traffic_source_last_click STRUCT<
    manual_campaign STRUCT<
      campaign_id STRING,
      campaign_name STRING,
      source STRING,
      medium STRING,
      term STRING,
      content STRING,
      source_platform STRING,
      creative_format STRING,
      marketing_tactic STRING
    >,
    google_ads_campaign STRUCT<
      customer_id STRING,
      account_name STRING,
      campaign_id STRING,
      campaign_name STRING,
      ad_group_id STRING,
      ad_group_name STRING
    >,
    cross_channel_campaign STRUCT<
      campaign_id STRING,
      campaign_name STRING,
      source STRING,
      medium STRING,
      source_platform STRING,
      default_channel_group STRING,
      primary_channel_group STRING
    >
  > OPTIONS(description = 'Trzy zatwierdzone podzbiory atrybucji sesyjnej. Brak źródła nie oznacza automatycznie Direct.'),
  stream_id STRING NOT NULL OPTIONS(description = 'Syntetyczny identyfikator strumienia przypisanego do hotelu.'),
  platform STRING NOT NULL OPTIONS(description = 'Platforma zdarzenia; WEB w zatwierdzonym scenariuszu demo.'),
  ecommerce STRUCT<
    transaction_id STRING OPTIONS(description = 'Syntetyczna tożsamość zakupu do weryfikacji z Profitroom; sama nie potwierdza płatnego źródła.'),
    purchase_revenue FLOAT64 OPTIONS(description = 'Wartość zakupu raportowana przez GA4 w walucie zdarzenia; kanoniczna wartość rezerwacji pochodzi z Profitroom.')
  > OPTIONS(description = 'Obserwacja zakupu; NULL jest oczekiwane dla zdarzeń niezwiązanych z zakupem.'),
  loaded_at TIMESTAMP NOT NULL OPTIONS(description = 'Moment załadowania rekordu; odrębny od czasu zdarzenia.'),
  source_system STRING NOT NULL OPTIONS(description = 'Źródło danych: ga4. Wartość sprawdzana przy ładowaniu.'),
  batch_id STRING NOT NULL OPTIONS(description = 'Identyfikator partii importu przechowywany przy rekordzie.'),
  raw_row_id STRING NOT NULL OPTIONS(description = 'Identyfikator rekordu w partii; wspiera idempotencję importu.'),
  is_synthetic BOOL NOT NULL OPTIONS(description = 'Dla każdego rekordu demo wymagane true, sprawdzane przy ładowaniu.'),
  scenario_id STRING NOT NULL OPTIONS(description = 'Identyfikator zatwierdzonego scenariusza syntetycznego.'),
  generator_version STRING NOT NULL OPTIONS(description = 'Wersja przyszłego generatora danych syntetycznych.'),
  ingest_date DATE NOT NULL OPTIONS(description = 'Data UTC wyprowadzona z loaded_at przez przyszły proces ładowania.'),
  source_timezone STRING NOT NULL OPTIONS(description = 'Strefa źródłowa służąca walidacji event_date; dzień metric_date używa Europe/Warsaw.')
)
PARTITION BY metric_date
CLUSTER BY hotel_id, event_name, stream_id, user_pseudo_id
OPTIONS(require_partition_filter = TRUE, description = 'Syntetyczne zdarzenia GA4 Hotel Marketing Analyzer. Jeden rekord to jedno zdarzenie hotelu w strumieniu. Dane o zachowaniu i lejku; Profitroom pozostaje kanonicznym źródłem rezerwacji, wartości, statusów i anulacji. Bez rzeczywistych danych klientów.');
