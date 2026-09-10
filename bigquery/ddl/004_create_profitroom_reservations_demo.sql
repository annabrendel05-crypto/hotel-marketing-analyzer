-- GoogleSQL. Projekt DDL; ręczne wykonanie przez właścicielkę po akceptacji.
-- Projekt: hotel-marketing-analyzer-demo; dataset: profitroom; lokalizacja zadania: EU.
-- Podstawa: SYNTHETIC_DATA_SCENARIO.md 0.3, ANALYTICS_CONTRACT.md 0.2.
-- Grain: jedna rezerwacja i jej aktualny stan na as_of_at.
-- Klucz logiczny: hotel_id + reservation_id; bez historii rewizji i powielania stanów.
-- Ponowny import aktualizuje ten sam klucz; batch_id i as_of_at nie rozszerzają klucza.
-- Późniejsza anulacja zmienia stan w pierwotnej kohorcie utworzenia rezerwacji.
-- Raport historyczny może się zmienić; tabela nie odtwarza wcześniejszych stanów as_of_at.
-- Historię rewizji można rozważyć po osobnej decyzji, gdy potrzebny będzie taki odczyt.
-- IF NOT EXISTS nie zmienia istniejącej tabeli i nie weryfikuje jej schematu.
-- EU jest lokalizacją datasetu i zadania. Późniejsze dane i zapytania mogą kosztować.
--
-- Partycja metric_date to techniczna projekcja daty utworzenia w Europe/Warsaw.
-- Jedynym źródłem czasu utworzenia jest reservation_created_at:
-- metric_date = DATE(reservation_created_at, 'Europe/Warsaw').
-- DATE(reservation_created_at) bez strefy daje dzień UTC, możliwie inny przy północy.
-- Osobna kolumna DATE zachowuje lokalny dzień oraz styl partycji istniejących DDL.
-- Spójność projekcji sprawdza import; DDL jej automatycznie nie wylicza.
-- Arrival opisuje pobyt, loaded_at import, więc nie wyznaczają kohorty sprzedaży.
-- Każde zapytanie wymaga filtra metric_date; aktualizacja anulacji dotyczy też starszych partycji.
--
-- NULL=brak informacji, 0=znana wartość zerowa; brak domyślnych zer.
-- is_cancelled=false oznacza nieanulowaną, nie automatycznie confirmed/completed/active.
-- Rezerwacja grupowa z jednym reservation_id pozostaje jedną jednostką.
-- reservation_value: kanoniczna wartość brutto po rabatach przekazana przez Profitroom,
-- z elementami zawartymi w rezerwacji; nie przychód zrealizowany ani wartość reklam/GA4.
-- Anulacja nie zeruje automatycznie wartości: można zachować kwotę sprzed anulacji.
-- Wartość nieanulowanych to suma reservation_value tylko dla is_cancelled=false;
-- przy brakujących kwotach ujawniamy niekompletność zamiast pełnej sumy z pominięciem NULL.
-- nights liczymy jako DATE_DIFF(departure_date, arrival_date, DAY), z NULL przy braku dat.
-- Booking Engine identyfikujemy przez booking_channel=booking_engine; bez osobnego booleana.
-- Brak cancellation_reason: nie jest potrzebna do kalibracji ani obecnych analiz.
-- Brak statusu operacyjnego i pól linkowania; ich projekty pozostają odroczone.
--
-- Walidacje generatora/importu (DDL nie egzekwuje poniższych reguł):
-- 1. Niepuste hotel_id i reservation_id; unikalny klucz w całej tabeli, nie tylko partycji.
-- 2. Nowe syntetyczne identyfikatory i rezerwacje; bez danych osobowych i kopiowania klientów.
-- 3. metric_date zgodne z reservation_created_at w Europe/Warsaw; czas utworzenia niezmienny.
-- 4. Okno raportowe obejmuje 90 kolejnych dni; konkretne daty do ustalenia przy generatorze.
--    Dzień bez rezerwacji nie wymaga fikcyjnego rekordu; pokrycie sprawdzamy osobno.
--    DDL nie ogranicza dat kalendarzowych; pobyty i import mogą wykraczać poza okno.
-- 5. Jeśli daty pobytu znane: departure_date>arrival_date;
--    arrival_date>=metric_date, aby dopuścić rezerwację w dniu przyjazdu.
-- 6. Znana reservation_value>=0; kwoty demo w groszach; znane guests>0.
-- 7. booking_channel w kontrolowanej mapie demo: booking_com, expedia, booking_engine.
--    Rozszerzenie mapy wymaga jawnej decyzji; etykiety UI odrębne od stabilnych kodów.
-- 8. is_cancelled=false wymaga cancelled_at=NULL. Dla true data może być nieznana (NULL);
--    bazowy generator może wymagać daty po uzgodnieniu historii anulacji, bez zgadywania z as_of_at.
-- 9. Jeśli cancelled_at znane: is_cancelled=true oraz reservation_created_at<=cancelled_at<=as_of_at.
-- 10. reservation_created_at<=as_of_at<=loaded_at; stałe czasy, bez zegara uruchomienia.
--     as_of_at oznacza czas aktualności konkretnego rekordu, nie automatycznie całego zbioru.
-- 11. currency_code=PLN, source_timezone=Europe/Warsaw, source_system=profitroom,
--     is_synthetic=true; jawne wersje, deterministyczne ID i batch_id.
-- 12. Nieanulowane+anulowane=wszystkie rezerwacje; brak sumowania rewizji.
--     Cele około 277/230/47 i około 37 Booking Engine wymagają dokładnego bilansu generatora.
--     Warunki aktywnych rezerwacji i zależne KPI pozostają poza tym DDL.
--
CREATE TABLE IF NOT EXISTS `hotel-marketing-analyzer-demo.profitroom.reservations_demo`
(
  hotel_id STRING NOT NULL OPTIONS(description = 'Syntetyczny identyfikator hotelu; część klucza i każdego połączenia.'),
  reservation_id STRING NOT NULL OPTIONS(description = 'Kanoniczny syntetyczny identyfikator rezerwacji w hotelu; jeden aktualny rekord.'),
  booking_channel STRING NOT NULL OPTIONS(description = 'Stabilny kod kanału: booking_com dla Booking.com, expedia dla Expedia, booking_engine dla Booking Engine.'),
  reservation_created_at TIMESTAMP NOT NULL OPTIONS(description = 'Pierwotny moment utworzenia rezerwacji; źródło dnia kohorty sprzedaży.'),
  metric_date DATE NOT NULL OPTIONS(description = 'Techniczna projekcja reservation_created_at na dzień Europe/Warsaw; walidowana przy imporcie i używana do partycjonowania.'),
  arrival_date DATE OPTIONS(description = 'Lokalna data przyjazdu; może wykraczać poza okres raportowy. NULL gdy nieznana.'),
  departure_date DATE OPTIONS(description = 'Lokalna data wyjazdu; późniejsza od arrival_date. NULL gdy nieznana.'),
  guests INT64 OPTIONS(description = 'Łączna liczba gości w rezerwacji, dorośli i dzieci, nie unikalni klienci hotelu. NULL gdy nieznana.'),
  currency_code STRING NOT NULL OPTIONS(description = 'Waluta wartości rezerwacji; PLN w demo.'),
  reservation_value NUMERIC OPTIONS(description = 'Kanoniczna wartość brutto po rabatach; anulacja nie wymusza zera. NULL oznacza brak kwoty, 0 znaną wartość zerową.'),
  is_cancelled BOOL NOT NULL OPTIONS(description = 'Stan anulacji na as_of_at: true anulowana, false nieanulowana; nie potwierdza statusu active, confirmed ani completed.'),
  cancelled_at TIMESTAMP OPTIONS(description = 'Moment anulacji, jeśli znany; NULL dla nieanulowanej lub przy nieznanej dacie anulacji.'),
  source_timezone STRING NOT NULL OPTIONS(description = 'Strefa interpretacji dat źródłowych; Europe/Warsaw w demo.'),
  as_of_at TIMESTAMP NOT NULL OPTIONS(description = 'Moment aktualności stanu tej rezerwacji; historia poprzednich stanów nie jest przechowywana.'),
  loaded_at TIMESTAMP NOT NULL OPTIONS(description = 'Deterministyczny czas importu aktualnego rekordu, odrębny od daty utworzenia.'),
  source_system STRING NOT NULL OPTIONS(description = 'Źródło: profitroom.'),
  batch_id STRING NOT NULL OPTIONS(description = 'Identyfikator partii ostatniego importu rekordu; nie rozszerza klucza rezerwacji.'),
  is_synthetic BOOL NOT NULL OPTIONS(description = 'Wymagane true dla wszystkich rekordów demo; kontrolowane przed importem.'),
  scenario_id STRING NOT NULL OPTIONS(description = 'Identyfikator wspólnego syntetycznego scenariusza.'),
  generator_version STRING NOT NULL OPTIONS(description = 'Wersja przyszłego generatora Profitroom; do ustalenia przy implementacji.'),
  contract_version STRING NOT NULL OPTIONS(description = 'Wersja kontraktu analitycznego, obecnie 0.2.'),
  scenario_version STRING NOT NULL OPTIONS(description = 'Wersja zaakceptowanego scenariusza, obecnie 0.3.')
)
PARTITION BY metric_date
CLUSTER BY hotel_id, booking_channel, is_cancelled
OPTIONS(require_partition_filter = TRUE, description = 'Syntetyczne rezerwacje Profitroom: jeden aktualny stan na hotel i reservation_id. Kanoniczne źródło rezerwacji, kanału, wartości i anulacji. Bez historii rewizji, statusów operacyjnych i linkowania GA4.');
