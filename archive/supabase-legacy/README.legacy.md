# Demonstracyjna baza Supabase

Ten katalog zawiera wyłącznie schemat i rekordy syntetyczne dla prototypu
Hotel Marketing Analyzer. Nie zawiera danych produkcyjnych ani osobowych.

## Kolejność uruchomienia

W panelu Supabase otwórz **SQL Editor**, wybierz **New Query** i wykonaj
zawartość plików w tej kolejności:

1. `01_schema.sql`
2. `02_seed_synthetic.sql`
3. `03_audit.sql`
4. `04_audit_summary.sql`
5. `05_readonly_policies.sql`
6. `06_demo_diagnosis_rpc.sql`
7. `07_v2_periods_and_sales.sql`
8. `08_v2_audit.sql`

Każdy plik uruchom jako osobne zapytanie. Po wykonaniu audytu zachowaj wyniki
lub zrzuty ekranu. Oczekiwany rezultat każdej kontroli opisano w komentarzach.
Plik `04_audit_summary.sql` zbiera najważniejsze kontrole w jednej tabeli
PASS/FAIL i jest najłatwiejszy do udokumentowania na zrzucie ekranu.
Plik `05_readonly_policies.sql` uruchom dopiero po pomyślnym audycie. Pozwala
aplikacji odczytywać wyłącznie rekordy oznaczone jako syntetyczne i nie
przyznaje prawa zapisu, aktualizacji ani usuwania.
Plik `06_demo_diagnosis_rpc.sql` tworzy odczytową funkcję demonstracyjną.
Aplikacja wywołuje ją metodą POST, dzięki czemu w panelu Network można
przeanalizować nagłówki, JSON payloadu oraz odpowiedź JSON.

Plik `07_v2_periods_and_sales.sql` jest addytywną i idempotentną migracją v2.
Dodaje drugi wybieralny okres, kompletne dane marketingowe i funnel dla obu
okresów oraz agregaty sprzedaży hotelu według kanałów. Nie usuwa istniejących
tabel ani rekordów.

Po migracji uruchom `08_v2_audit.sql`. Wszystkie kontrole zgodności hotelu z
okresem oraz sum sprzedaży powinny zwrócić `PASS`.

Na tym etapie nie dodawaj klucza Secret, `service_role`, hasła do bazy ani
connection stringa do repozytorium lub rozmowy.
