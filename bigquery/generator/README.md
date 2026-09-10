# Lokalny fundament generatora v1

Wyłącznie wspólne helpery; bez generatorów źródeł, uploadu i danych demo.
Runtime bazowy: Node.js **24.18.0**, przypięty w `.node-version` (wersja użyta do kontroli). Przy zmianie runtime należy ponowić testy deterministyczności, szczególnie Intl/stref czasowych.

Uruchomienie z katalogu repozytorium, z istniejącymi narzędziami prototype:

```sh
node --test bigquery/generator/__tests__/*.test.mts
prototype/node_modules/.bin/tsc -p bigquery/generator/tsconfig.json
prototype/node_modules/.bin/eslint --config bigquery/generator/eslint.config.mjs bigquery/generator/
```

- `config.mts`: typ konfiguracji i walidator. Brak konfiguracji produkcyjnej lub domyślnego start_date. Jawna data w testach to wyłącznie fixture.
- `random.mts`: kanoniczny JSON, hashe, losowania indeksowane/strumienie oraz syntetyczne ID. Hotel i scenario zachowują tożsamość konfiguracji. Liczbowe ga_session_id eksportuje się jako dokładny ciąg dziesiętny INT64.
- `time.mts`: 90 lokalnych dni, Warsaw/UTC, jawne rozstrzyganie powtórzonych godzin. Zakres dat 2000–2099. Techniczna polityka: as_of_at o 08:00 Warsaw po ostatnim dniu; dzienny loaded_at o 06:00 UTC następnego dnia; snapshot loaded_at to późniejszy z końcowego importu dziennego i as_of_at. Bez odczytu bieżącego zegara.
- `allocation.mts`: wagi, największe reszty z pojemnościami, grosze, tolerancje, unikalność i wspólny przydział wartości zakupu. Kwoty wejściowe to bezpieczne całkowite grosze, wynik to dziesiętne ciągi dla NUMERIC. Wagi są kwantowane do 1e-9 po normalizacji. Pojemność ma jednostkę przydziału (np. grosze). Brak wykonalnego przydziału zgłasza błąd.
- `signals.mts`: wspólny syntetyczny popyt oraz osobny szum namespace źródła. Nie zapisuje tabel ani plików.
- `manifest.mts`: manifest w pamięci, planowane artefakty i hashe jawnie przekazanej zawartości/plików. Bez automatycznego eksportu czy wyszukiwania plików.

Dokładne przydzielenie podanej puli nie jest wymuszaniem targetu kalibracji: przyszłe źródło najpierw sprawdza G02 i nie koryguje wyniku mieszczącego się w tolerancji. Helpery nie tworzą rekordów ani nie zmieniają automatycznie danych. Bezwzględna tolerancja małych liczebności jest jawnym zamiennikiem tolerancji względnej w danym sprawdzeniu; caller ustala ją w konfiguracji.

Helper purchases/value przyjmuje wyłącznie komórki jednej kanonicznej akcji i zgodnej polityki. `valueMeasured=false` albo nieznany purchases zachowuje NULL. Maska `allowed` oznacza dopuszczalność raportowania akcji, nie emisję reklam. Każdy generator reklam ma osobno wyzerować koszt przy braku emisji.

Przed generatorami źródeł: jawny finalny start_date, rozkłady i parametry braków, kanałów, kampanii, pobytów, kredytów oraz limity małych liczebności. Przed publikacją: osobny odbiór i G08. Żadnych poświadczeń ani SDK Google Cloud.
