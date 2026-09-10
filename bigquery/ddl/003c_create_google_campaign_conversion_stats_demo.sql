-- GoogleSQL. Ręczne wykonanie przez właścicielkę po akceptacji.
-- Projekt demo: hotel-marketing-analyzer-demo; dataset google_ads w EU.
-- Wzorzec query schema: my-story-sopot.my_story_sopot_dataset.ads_CampaignConversionStats_6604551350.
-- Dokładnie 20 pól w kolejności źródłowej; wszystkie nullable.
-- Tabela demo odwzorowuje wynik widoku ads_*, nie techniczne tabele p_ads_*.
-- _LATEST_DATE i _DATA_DATE są zwykłymi polami źródłowego query schema.
-- Bez własnych pól canonical, partycjonowania i clusteringu.
-- NULL oznacza brak wartości, 0 zmierzone zero. Dane wyłącznie syntetyczne.
-- Koszt (jeśli występuje) pozostaje INT64 w micros; konwersje FLOAT64.
-- Działania pozostają w wierszach źródła, bez pivotowania i sumowania różnych akcji.
-- IF NOT EXISTS nie zmienia istniejącej tabeli ani nie sprawdza zgodności schematu.

CREATE TABLE IF NOT EXISTS `hotel-marketing-analyzer-demo.google_ads.CampaignConversionStats_demo`
(
  campaign_id INT64,
  customer_id INT64,
  campaign_base_campaign STRING,
  metrics_conversions FLOAT64,
  metrics_conversions_value FLOAT64,
  metrics_value_per_conversion FLOAT64,
  segments_ad_network_type STRING,
  segments_conversion_action STRING,
  segments_conversion_action_category STRING,
  segments_conversion_action_name STRING,
  segments_conversion_attribution_event_type STRING,
  segments_date DATE,
  segments_day_of_week STRING,
  segments_month DATE,
  segments_quarter DATE,
  segments_slot STRING,
  segments_week DATE,
  segments_year INT64,
  _LATEST_DATE DATE,
  _DATA_DATE DATE
);
