-- GoogleSQL. Schemat źródłowy Profitroom 1:1: 13 pól, wszystkie nullable.
-- Projekt demo: hotel-marketing-analyzer-demo; dataset profitroom w EU.
-- source schema != canonical schema. Metadane demo są w lokalnym manifeście.
-- Kolejność i typy odpowiadają schematowi przekazanemu przez właścicielkę.
-- Data anulacji: obecna = anulowana; NULL = brak informacji o anulowaniu.
-- FLOAT64 odwzorowuje źródło; generator oblicza płatności w całkowitych groszach.
-- Bez dodatkowych pól, partycjonowania i klastrowania z poprzedniego modelu.
-- IF NOT EXISTS nie zmieni istniejącej tabeli o wcześniejszym schemacie 22 pól.
-- Plik nie wykonuje migracji; zmiana istniejącego zasobu wymaga osobnej operacji ręcznej.
CREATE TABLE IF NOT EXISTS `hotel-marketing-analyzer-demo.profitroom.reservations_demo`
(
  `Data rezerwacji` TIMESTAMP,
  `Kod rezerwacji` STRING,
  `Kanał rezerwacji` STRING,
  `Oferta` STRING,
  `Typ pokoju` STRING,
  `Liczba pokoi` INT64,
  `Data przyjazdu` DATE,
  `Data wyjazdu` DATE,
  `Data anulacji` TIMESTAMP,
  `Wartość` FLOAT64,
  `Zapłacono` FLOAT64,
  `Pozostało do zapłaty` FLOAT64,
  `Waluta` STRING
);
