-- GoogleSQL. Ręczne wykonanie przez właścicielkę po akceptacji.
-- Projekt demo: hotel-marketing-analyzer-demo; dataset google_ads w EU.
-- Wzorzec query schema: my-story-sopot.my_story_sopot_dataset.ads_Campaign_6604551350.
-- Dokładnie 27 pól w kolejności źródłowej; wszystkie nullable.
-- Tabela demo odwzorowuje wynik widoku ads_*, nie techniczne tabele p_ads_*.
-- _LATEST_DATE i _DATA_DATE są zwykłymi polami źródłowego query schema.
-- Bez własnych pól canonical, partycjonowania i clusteringu.
-- NULL oznacza brak wartości, 0 zmierzone zero. Dane wyłącznie syntetyczne.
-- Koszt (jeśli występuje) pozostaje INT64 w micros; konwersje FLOAT64.
-- Działania pozostają w wierszach źródła, bez pivotowania i sumowania różnych akcji.
-- IF NOT EXISTS nie zmienia istniejącej tabeli ani nie sprawdza zgodności schematu.

CREATE TABLE IF NOT EXISTS `hotel-marketing-analyzer-demo.google_ads.Campaign_demo`
(
  campaign_id INT64,
  customer_id INT64,
  bidding_strategy_name STRING,
  campaign_advertising_channel_sub_type STRING,
  campaign_advertising_channel_type STRING,
  campaign_bidding_strategy STRING,
  campaign_bidding_strategy_type STRING,
  campaign_budget_amount_micros INT64,
  campaign_budget_explicitly_shared BOOL,
  campaign_budget_has_recommended_budget BOOL,
  campaign_budget_period STRING,
  campaign_budget_recommended_budget_amount_micros INT64,
  campaign_budget_total_amount_micros INT64,
  campaign_campaign_budget STRING,
  campaign_end_date_time DATETIME,
  campaign_experiment_type STRING,
  campaign_manual_cpc_enhanced_cpc_enabled BOOL,
  campaign_maximize_conversion_value_target_roas FLOAT64,
  campaign_name STRING,
  campaign_percent_cpc_enhanced_cpc_enabled BOOL,
  campaign_serving_status STRING,
  campaign_start_date_time DATETIME,
  campaign_status STRING,
  campaign_tracking_url_template STRING,
  campaign_url_custom_parameters STRING,
  _LATEST_DATE DATE,
  _DATA_DATE DATE
);
