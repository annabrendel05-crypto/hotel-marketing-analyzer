-- GoogleSQL. Ręczne wykonanie przez właścicielkę po akceptacji.
-- Projekt demo: hotel-marketing-analyzer-demo; dataset google_ads w EU.
-- Wzorzec query schema: my-story-sopot.my_story_sopot_dataset.ads_CampaignBasicStats_6604551350.
-- Dokładnie 17 pól w kolejności źródłowej; wszystkie nullable.
-- Tabela demo odwzorowuje wynik widoku ads_*, nie techniczne tabele p_ads_*.
-- _LATEST_DATE i _DATA_DATE są zwykłymi polami źródłowego query schema.
-- Bez własnych pól canonical, partycjonowania i clusteringu.
-- NULL oznacza brak wartości, 0 zmierzone zero. Dane wyłącznie syntetyczne.
-- Koszt (jeśli występuje) pozostaje INT64 w micros; konwersje FLOAT64.
-- Działania pozostają w wierszach źródła, bez pivotowania i sumowania różnych akcji.
-- IF NOT EXISTS nie zmienia istniejącej tabeli ani nie sprawdza zgodności schematu.

CREATE TABLE IF NOT EXISTS `hotel-marketing-analyzer-demo.google_ads.CampaignBasicStats_demo`
(
  campaign_id INT64,
  customer_id INT64,
  campaign_base_campaign STRING,
  metrics_clicks INT64,
  metrics_conversions FLOAT64,
  metrics_conversions_value FLOAT64,
  metrics_cost_micros INT64,
  metrics_impressions INT64,
  metrics_interaction_event_types STRING,
  metrics_interactions INT64,
  metrics_view_through_conversions INT64,
  segments_ad_network_type STRING,
  segments_date DATE,
  segments_device STRING,
  segments_slot STRING,
  _LATEST_DATE DATE,
  _DATA_DATE DATE
);
