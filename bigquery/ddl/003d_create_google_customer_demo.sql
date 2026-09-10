-- GoogleSQL. Ręczne wykonanie przez właścicielkę po akceptacji.
-- Projekt demo: hotel-marketing-analyzer-demo; dataset google_ads w EU.
-- Wzorzec query schema: my-story-sopot.my_story_sopot_dataset.ads_Customer_6604551350.
-- Dokładnie 9 pól w kolejności źródłowej; wszystkie nullable.
-- Tabela demo odwzorowuje wynik widoku ads_*, nie techniczne tabele p_ads_*.
-- _LATEST_DATE i _DATA_DATE są zwykłymi polami źródłowego query schema.
-- Bez własnych pól canonical, partycjonowania i clusteringu.
-- NULL oznacza brak wartości, 0 zmierzone zero. Dane wyłącznie syntetyczne.
-- Koszt (jeśli występuje) pozostaje INT64 w micros; konwersje FLOAT64.
-- Działania pozostają w wierszach źródła, bez pivotowania i sumowania różnych akcji.
-- IF NOT EXISTS nie zmienia istniejącej tabeli ani nie sprawdza zgodności schematu.

CREATE TABLE IF NOT EXISTS `hotel-marketing-analyzer-demo.google_ads.Customer_demo`
(
  customer_id INT64,
  customer_auto_tagging_enabled BOOL,
  customer_currency_code STRING,
  customer_descriptive_name STRING,
  customer_manager BOOL,
  customer_test_account BOOL,
  customer_time_zone STRING,
  _LATEST_DATE DATE,
  _DATA_DATE DATE
);
