# Kontrakt danych i metryk Hotel Marketing Analyzer

> **HISTORICAL / SUPERSEDED** — dokument opisuje wcześniejszy etap projektu. Część odniesień do Supabase i `demo-data.ts` nie opisuje obecnego runtime. Aktualna architektura wykorzystuje BigQuery, modularny silnik diagnostyczny i Priority Engine; Supabase służy wyłącznie do uwierzytelniania.

Wersja dokumentu: **0.2 — zaakceptowany kontrakt produkcyjnego rdzenia v1**. Data: 2026-09-05.

Dokument opisuje docelowe zachowanie systemu na podstawie decyzji biznesowych etapu 2. Bieżąca praca obejmuje wyłącznie dokumentację; implementacja aplikacji, SQL i integracji będzie realizowana w kolejnych zadaniach. Odniesienia do obecnego kodu pochodzą z `prototype/lib/demo-data.ts`, `prototype/lib/marketing-metrics.ts`, `prototype/lib/campaign-data-sufficiency.ts` i `prototype/app/page.tsx`.

Oznaczenia:

- **USTALONE DLA V1** — przyjęta decyzja biznesowa obowiązująca w rdzeniu.
- **REKOMENDOWANE** — proponowane doprecyzowanie techniczne do akceptacji przed implementacją.
- **KOLEJNY ETAP** — rozszerzenie rozwijane po podstawowym rdzeniu.
- Rejestr D01–D18 w sekcji P określa stan rozstrzygnięcia i uzasadnienie. Pozostałe pytania oznaczono Q01–Q09.

## A. Cel i zakres kontraktu

**USTALONE DLA V1:** kontrakt definiuje fakty, jednostki, liczniki, mianowniki, źródła i zasady wnioskowania. Rdzeń jest wdrażany etapami: źródła i jakość → agregacja wybranych zakresów → reguły → kontrolowany komentarz AI. Każdy KPI, wykres, komentarz, reguła i odpowiedź AI korzysta z aktualnie wybranego hotelu oraz okresu analizowanego i porównawczego.

Podział odpowiedzialności:

| Warstwa | Odpowiedzialność v1 |
|---|---|
| Supabase | Użytkownicy, logowanie, role, członkostwo użytkownik–hotel, ustawienia hotelu i wersjonowane progi |
| BigQuery | Fakty analityczne w ziarnie dziennym i sześć ujednoliconych widoków aplikacyjnych |
| Serwer Next.js | Autoryzacja hotelu, odczyt widoków BigQuery i konfiguracji Supabase, agregacja dowolnego zakresu od–do i jego okresu porównawczego, obliczenia KPI i deterministyczne reguły |
| Interfejs | Jawne daty wybranego okresu i automatycznego okresu porównawczego, wyniki trzech warstw, data aktualizacji, jakość, pewność i ograniczenia |
| AI | Komentarz do przekazanych agregatów, statusów jakości i wyników reguł; referencje do metryk i kontrola zgodności liczb |

**USTALONE DLA V1:** BigQuery jest jedynym źródłem faktów analitycznych aplikacji. Konfiguracja z Supabase jest wejściem do silnika reguł. Serwer odczytuje analitykę przez ujednolicone widoki, a uprawnienia sprawdza przed wykonaniem zapytania. Demo wykorzystuje wyłącznie syntetyczne dane w rzeczywistym BigQuery.

**USTALONE DLA V1:** rdzeń obejmuje sprzedaż według utworzenia rezerwacji, koszty i wyniki platform, obserwowany lejek i ścieżki, podstawową jakość oraz techniczne powiązania przez `transaction_id`. Metryki zależne od powiązania otrzymują `NULL` do momentu spełnienia warunków wiarygodności. Podstawowe raportowanie sprzedaży i platform pozostaje dostępne niezależnie od gotowości tych metryk.

**KOLEJNY ETAP:** FX, potwierdzone rozmowy telefoniczne, analiza pobytowa, przychód zrealizowany, zaawansowana dojrzałość kohort, modele probabilistyczne i łączenie wielu urządzeń. Rozszerzenia mogą dodać zaawansowane wersjonowanie jakości i struktury wyników. Dokument zachowuje dla nich miejsce bez uzależniania podstawowego rdzenia od ich wdrożenia.

## B. Słownik źródeł danych

**USTALONE DLA V1:** poniższy podział określa wymagany zakres danych dla demo i pierwszego wdrożenia. Weryfikacja rzeczywistego eksportu jest kryterium gotowości adaptera.

| Źródło | Dane i rola | Kontekst interpretacji |
|---|---|---|
| Meta Ads | Dzienny wydatek, wyświetlenia, wskazany typ kliknięć, konwersje i wartość platformowa | Własny model i okno atrybucji platformy |
| Google Ads | Analogiczne metryki według konta i kampanii | Osobne wyniki platformy; Google Brand rozróżniany w mapie kampanii |
| GA4 | Zarejestrowane sesje, zdarzenia i źródła ruchu | Zakres pomiaru, zgody i dostępne identyfikatory są częścią jakości |
| Eksport rezerwacji Profitroom | Kanoniczna sprzedaż: stabilny identyfikator, kanał, status, utworzenie, daty pobytu i wartość | Źródło referencyjne demo i pierwszego wdrożenia |
| Inny PMS lub system rezerwacyjny | Przyszły adapter dostarczający te same pola i semantykę | Jeden kanoniczny zapis rezerwacji dla hotelu |
| OTA | Kanał sprzedaży zapisany przy rezerwacji Profitroom, np. Booking.com | Sprzedaż OTA raportowana jako osobny segment; wcześniejsze kontakty marketingowe mają osobny opis |
| Booking Engine | Rezerwacja online `direct_web`, zdarzenia etapów, `purchase` i techniczny `transaction_id` | Powiązanie zakupu z rezerwacją Profitroom jest weryfikowane |
| Konfiguracja hotelu w Supabase | Waluta, mapy kanałów i zdarzeń, progi, reguły kwalifikacji i wersje ustawień | Oddzielona od zaobserwowanych faktów w BigQuery |

**REKOMENDOWANE:** adapter dokumentuje nazwy pól źródłowych, typy, statusy i sposób uzyskania stabilnego identyfikatora. Wymagania kontraktu pozostają takie same dla kolejnych PMS i booking engine. Przy ograniczonym pokryciu kanałów interfejs używa etykiety „sprzedaż w dostępnych kanałach”.

## C. Definicje biznesowe

**USTALONE DLA V1:** definicje w tej sekcji są podstawą nazw i obliczeń. Szczegóły operacyjne opisane w pytaniach Q01–Q09 wymagają doprecyzowania przed odpowiednią częścią implementacji.

| Pojęcie | Definicja v1 |
|---|---|
| Wydatki reklamowe (`ad_spend`) | Koszt emisji raportowany przez Meta Ads lub Google Ads dla hotelu, dnia, konta i kampanii. Koszty agencji, kreacji i prowizje OTA są odrębnymi kategoriami. |
| Kwalifikujące wydatki (`eligible_ad_spend`) | Część kosztów odpowiadająca jawnej konfiguracji zakresu KPI. Rekomendacja: wszystkie płatne kampanie hotelu kierujące do Booking Engine, po uzgodnieniu Q01. |
| Konwersja platformowa (`platform_conversions`) | Akcja lub ułamkowy kredyt raportowany przez platformę przy zachowaniu jej modelu, okna, akcji konwersji i podstawy daty. W UI występuje jako wynik konkretnej platformy. |
| Koszt reklam na aktywną rezerwację online (`online_booking_ad_cost`) | Okresowy iloraz wszystkich kwalifikujących wydatków reklamowych (`eligible_ad_spend`) i aktywnych rezerwacji Booking Engine utworzonych w tym okresie (`active_direct_web_bookings`). Mianownik obejmuje także rezerwacje z ruchu organicznego, powracającego i innych zaobserwowanych źródeł. |
| Rezerwacja hotelowa | Jedna rezerwacja o kanonicznym identyfikatorze Profitroom w obrębie hotelu. Rezerwacja grupowa z jednym identyfikatorem stanowi jedną jednostkę. |
| Rezerwacja aktywna (`active_bookings`) | Rezerwacja o statusie `confirmed` lub `completed` na moment `as_of_at`. Status `completed` oznacza aktywną jednostkę w tej definicji sprzedaży historycznej. |
| Rezerwacja anulowana (`cancelled_bookings`) | Rezerwacja o statusie `cancelled` na moment `as_of_at`, należąca do kohorty utworzenia. |
| Pozostałe statusy | `pending`, `option` i `no_show` mają osobne liczniki. Nowy, nierozpoznany status otrzymuje osobną kategorię jakości do wyjaśnienia. |
| Rekord testowy | Rekord wyłączony z kohorty przez oznaczoną, wersjonowaną regułę jakości. Liczba wyłączeń pozostaje widoczna. |
| Rezerwacja bezpośrednia | Rezerwacja segmentu direct; `direct_web` oznacza Booking Engine, a `phone` i `email` są osobnymi kanałami direct. |
| Rezerwacja OTA | Rezerwacja o kanale OTA w Profitroom, z zachowaną nazwą kanału lub uzgodnioną kategorią `other_ota`. |
| Przychód platformowy (`platform_revenue`) | Wartość konwersji raportowana przez daną platformę według jej modelu i okna. Zachowuje odrębną etykietę od wartości rezerwacji Profitroom. |
| Wartość aktywnych rezerwacji (`active_booking_value`) | Wartość brutto po rabatach aktywnych rezerwacji, obejmująca elementy zawarte w wartości przekazanej przez Profitroom. Dokładna etykieta UI: „Wartość aktywnych rezerwacji”. |
| Cała sprzedaż hotelu | Zdeduplikowane rezerwacje i wartość ze wszystkich kanałów objętych pełnym eksportem Profitroom; główne sumy dotyczą statusów aktywnych, a pozostałe statusy są pokazywane osobno. |
| Sprzedaż powiązana z marketingiem | Aktywne rezerwacje Profitroom jednoznacznie połączone ze zdarzeniem purchase przez zweryfikowany `transaction_id` lub bezpieczny odpowiednik, z dodatkowym kwalifikującym powiązaniem z płatnym marketingiem na podstawie zaobserwowanych danych marketingowych. Tożsamość rezerwacji, powiązanie marketingowe i przyczynowość są odrębnymi poziomami wnioskowania. |
| Data utworzenia (`booking_created_at`) | Pierwotny czas utworzenia w Profitroom. Wyznacza domyślną kohortę sprzedaży. |
| Daty pobytu | `check_in_date` i `check_out_date`, zachowane w danych źródłowych jako kontekst przyszłej analizy pobytowej. |
| Dzień metryki (`metric_date`) | Lokalny dzień faktu lub jego kohorty według jawnego `date_basis`, w `Europe/Warsaw`. |
| Okres analizowany | Dowolny zakres dat od–do wybrany przez użytkownika, z obiema granicami włącznie; może obejmować np. 2 dni, 7 dni, miesiąc, kwartał lub własny przedział. |
| Okres porównawczy | Automatycznie wyznaczony, bezpośrednio wcześniejszy zakres o identycznej liczbie dni kalendarzowych, z tą samą definicją metryk i walutą. |

**USTALONE DLA V1:** prowizje OTA są osobną przyszłą metryką. „Przychód zrealizowany” należy do kolejnej analizy pobytowej. Direct jako źródło ruchu i direct jako segment sprzedaży mają oddzielne pola oraz etykiety.

## D. Trzy warstwy wyników

**USTALONE DLA V1:** aplikacja prezentuje trzy rozdzielone warstwy:

1. **Wyniki platformowe:** Meta i Google osobno, z akcją konwersji, modelem i oknem. Koszty można sumować przy zgodnym zakresie i walucie. Konwersje platformowe pozostają przypisane do platformy.
2. **Sprzedaż Profitroom:** unikalne rezerwacje, statusy na `as_of_at`, kanały i „Wartość aktywnych rezerwacji”. Liczniki hotelowe wynikają z deduplikacji kanonicznych identyfikatorów.
3. **Powiązania i obserwowane ścieżki:** połączenie purchase z konkretną rezerwacją przez `transaction_id`, odrębna kwalifikacja powiązania z płatnym marketingiem, kolejność kontaktów i pokrycie obu rodzajów łączenia. System opisuje korelację, techniczne powiązanie i atrybucję oddzielnie; twierdzenie przyczynowe wymaga dodatkowego badania.

**USTALONE DLA V1:** `linked_booking_roas` ma etykietę „ROAS rezerwacji powiązanych”. Metryka otrzymuje `NULL` z `metric_status` i `reason_codes` do spełnienia wszystkich pięciu warunków z H: tożsamości aktywnej rezerwacji, powiązania marketingowego, zgodności kosztu, deduplikacji i wymaganej jakości. Każdy wynik ujawnia zakres powiązanych danych i ograniczenia jakości.

## E. Metryki i wzory

### E.1. Wspólne zasady obliczeń

**USTALONE DLA V1:** serwer osobno agreguje dzienne liczniki i mianowniki dla okresu analizowanego oraz automatycznie wyznaczonego okresu porównawczego, a następnie oblicza wskaźniki i różnice między okresami. Każdy KPI jest obliczany deterministycznie. AI używa wyłącznie przekazanych faktów, statusów i wyników reguł.

**REKOMENDOWANE:** obowiązują następujące reguły reprezentacji:

- `0` oznacza zmierzone zero; `NULL` oznacza brak danych, nieznaną wartość lub niespełnione warunki obliczenia.
- Przy dodatnim mianowniku i zmierzonym zerze licznika wynik wynosi `0`. Przy zerowym mianowniku wynik wynosi `NULL`; wyjątek dla zmiany `0 → 0` opisano w tabeli.
- Brak wiersza jest oceniany przez jakość. Dopiero potwierdzony kompletny import pozwala przedstawić brak zdarzeń jako zero.
- Nieznane pokrycie otrzymuje `coverage_status=UNKNOWN` i `coverage_pct=NULL`. Status pokrycia jest oddzielony od dostępności samej liczby.
- `metric_status`: `OK`, `NO_DATA`, `PARTIAL_DATA`, `ZERO_DENOMINATOR`, `NOT_COMPARABLE`, `INSUFFICIENT_DATA`, `INVALID_DATA`. `reason_codes` zawiera konkretne przyczyny.
- Agregacja zachowuje informację o brakującym dniu, kanale lub koszcie. Wartość częściowa ma etykietę zakresu dostępnych danych; pełny KPI otrzymuje `NULL`, gdy jego warunki kompletności pozostają niespełnione.
- ROAS ma jednostkę mnożnika, koszty — waluty, udziały — procentów. Różnica dwóch udziałów jest dodatkowo wyrażana w punktach procentowych.
- Obliczenia i porównania progów używają dokładnych wartości. Rekomendowane zaokrąglenie prezentacji: kwoty i ROAS do 2 miejsc, procenty do 1 miejsca.
- Agregacja każdego wybranego okresu korzysta z sum bazowych, zachowując rozłączność dni i obiektów. Jedna wersja dnia jest wybierana jako aktualna; historyczne wersje służą odtwarzaniu raportu.

### E.2. Katalog KPI

**USTALONE DLA V1:** semantyka podstawowych wyników wynika z decyzji biznesowych. **REKOMENDOWANE:** poniższe zachowanie techniczne zer, braków i statusów jest wspólnym kontraktem implementacyjnym.

| Metryka i wzór | Licznik | Mianownik | Źródło | Zachowanie przy zerze | Zachowanie przy braku danych | Zakres interpretacji |
|---|---|---|---|---|---|---|
| `platform_roas = platform_revenue / ad_spend` | Wartość wskazanej konwersji platformowej | Koszt tej samej platformy i zakresu | Meta albo Google | Koszt 0 → NULL; wartość 0 przy koszcie >0 → 0 | NULL ze statusem | Wynik danej platformy, z modelem, oknem i podstawą daty |
| `linked_booking_roas = linked_active_booking_value / linked_scope_ad_spend` | Wartość aktywnych rezerwacji Profitroom połączonych z purchase przez transaction_id oraz odrębnie zakwalifikowanych do płatnego marketingu; każda rezerwacja liczona raz | Koszt odpowiadającego zakresu reklamowego i okresu | Profitroom + obserwacje marketingowe + reklamy | Koszt 0 → NULL; zmierzone zero powiązanej wartości przy spełnionej jakości → 0 | NULL wraz z metric_status i reason_codes do spełnienia wszystkich pięciu warunków z H | „ROAS rezerwacji powiązanych”; techniczny wskaźnik okresowy z pokryciem, przyczynowość wymaga dodatkowego badania |
| `platform_conversion_cost = ad_spend / platform_conversions` | Wydatek platformy | Konwersje/kredyty wybranej akcji | Ta sama platforma | Konwersje 0 → NULL; koszt 0 przy konwersjach >0 → 0 | NULL | Nazwa akcji określa, czy mierzymy zakup, kontakt czy inną konwersję |
| `online_booking_ad_cost = eligible_ad_spend / active_direct_web_bookings` | Kwalifikujące wydatki reklamowe hotelu w okresie | Aktywne rezerwacje Booking Engine utworzone w tym samym okresie | Reklamy + Profitroom | Rezerwacje 0 → NULL; koszt 0 przy rezerwacjach >0 → 0 | NULL przy brakującym koszcie, kanale lub statusie | UI: „Koszt reklam na aktywną rezerwację online”. Okresowy wskaźnik relacji wszystkich kwalifikujących wydatków reklamowych do aktywnych rezerwacji Booking Engine utworzonych w tym okresie; rezerwacje mogą pochodzić również z ruchu organicznego, powracającego i innych zaobserwowanych źródeł |
| `channel_booking_share_pct = active_channel_bookings / active_hotel_bookings × 100` | Aktywne rezerwacje kanału sprzedaży | Wszystkie aktywne rezerwacje hotelu | Profitroom | Całość 0 → NULL; kanał 0 przy całości >0 → 0 | NULL przy nieznanej całości | Rozłączne kanały sprzedaży; zestawienia direct i OTA mają jawne mianowniki |
| `channel_value_share_pct = active_channel_value / active_hotel_value × 100` | Wartość aktywnych rezerwacji kanału | Wartość wszystkich aktywnych rezerwacji | Profitroom | Całość 0 → NULL; licznik 0 przy całości >0 → 0 | NULL | Jedna waluta i wartość brutto po rabatach |
| `cancellation_rate_pct = cancelled_bookings / cohort_bookings × 100` | Rezerwacje cancelled na as_of_at, utworzone w okresie | Wszystkie rzeczywiste rezerwacje utworzone w tym okresie, po wyłączeniu testów, ze wszystkimi raportowanymi statusami | Profitroom | Kohorta 0 → NULL; anulacje 0 przy kohorcie >0 → 0 | NULL przy brakujących statusach lub historii aktualizacji | Rekomendowany mianownik v1; interfejs podaje as_of_at oraz kontekst świeżych kohort. Zaawansowana dojrzałość: kolejny etap |
| `transition_rate_pct = journeys_reaching_next / journeys_entering_stage × 100` | Journey z etapu A, które później osiągnęły B w ustalonym oknie | Kwalifikujące journey, które weszły do A | GA4 / Booking Engine | A=0 → NULL; B=0 przy kompletnym pomiarze → 0 | NULL przy brakującym etapie lub relacji | Ta sama kohorta journey, jawna kolejność i okno; jednostka device/browser journey |
| `period_change_pct = (current − previous) / previous × 100` | Różnica tej samej metryki | Wartość bezpośrednio wcześniejszego okresu o identycznej liczbie dni kalendarzowych | Serwerowe agregaty dzienne | 0→0: 0%; 0→dodatnia: NULL, „wzrost od zera”; dodatnia→0: −100% | NULL przy braku porównania lub niezgodnej definicji | Porównanie tego samego KPI; okres w trakcie ma jawne oznaczenie |
| `click_arrival_rate_pct = clicks_with_observed_arrival / eligible_outbound_clicks × 100` | Kwalifikujące unikalne kliknięcia z technicznie połączonym wejściem | Wszystkie kwalifikujące unikalne kliknięcia w deklarowanym zakresie | Reklama + pomiar wejść | Kliknięcia 0 → NULL; wejścia 0 przy spełnionej jakości → 0 | NULL do uzyskania wiarygodnego łączenia i dostępnego mianownika | Potwierdzone zaobserwowane dotarcie; jakość ujawnia zakres obserwacji |
| `sessions_per_click_pct = attributed_sessions / outbound_clicks × 100` | Zarejestrowane sesje o zgodnym źródle/kampanii | Raportowane kliknięcia wychodzące | GA4 + reklama | Kliknięcia 0 → NULL; sesje 0 przy znanym pomiarze → 0 | NULL | Pomocniczy stosunek dwóch różnych jednostek; wartość może przekroczyć 100%; różnicę opisuje się z kontekstem pomiaru |
| `meta_start_share_pct = paths_starting_meta / eligible_observed_paths × 100` | Kwalifikujące ścieżki z pierwszym zaobserwowanym kontaktem Meta | Wszystkie kwalifikujące obserwowane ścieżki dla tego samego wyniku | channel_paths_daily | Ścieżki 0 → NULL; Meta 0 przy zbiorze >0 → 0 | NULL przy brakującym mianowniku; pokrycie jawne | Początek zaobserwowanej sekwencji journey, okno 30 dni przed wynikiem |
| `closing_share_pct = paths_ending_in_channel / eligible_observed_paths × 100` | Ścieżki z ostatnim zaobserwowanym kontaktem wybranego kanału | Ten sam pełny zbiór kwalifikujących ścieżek | channel_paths_daily | Mianownik 0 → NULL; licznik 0 przy nim >0 → 0 | NULL | Oddzielnie Direct, Google Ads, Google Brand i Google Organic |

**REKOMENDOWANE:** kwalifikacja do `eligible_outbound_clicks` wynika z zakresu i dostępności pomiaru przed oceną dotarcia. Dzięki temu mianownik obejmuje również kliknięcia z brakiem zaobserwowanego wejścia. Przy dostępnych wyłącznie agregatach kliknięć system pokazuje pomocniczy stosunek sesji do kliknięć, a potwierdzone dotarcie pozostaje `NULL`.

**REKOMENDOWANE:** udział warunkowy „Meta na początku ścieżek kończących się Google” jest osobną metryką: liczba kwalifikujących ścieżek z początkiem Meta i końcem Google / wszystkie kwalifikujące ścieżki z końcem Google × 100. Źródłem jest pełny rozkład ścieżek; zerowy/brakujący mianownik daje NULL, a zmierzone zero licznika przy dodatnim mianowniku daje 0. Komunikat podaje kategorię Google i pokrycie.

**REKOMENDOWANE:** wartości ujemne powstałe wskutek korekt otrzymują jawny kontekst rozliczenia i ocenę jakości przed użyciem wzorów zakładających nieujemne wartości. Koszty źródłowe i kwalifikujące są rozróżniane (Q01).

## F. Zasady czasu

**USTALONE DLA V1:** podstawą BigQuery są dane dzienne z `metric_date`. Użytkownik wybiera dowolny zakres dat od–do: np. 2 dni, 7 dni, miesiąc, kwartał lub własny przedział. Aplikacja automatycznie wyznacza bezpośrednio wcześniejszy okres o identycznej liczbie dni kalendarzowych. Interfejs jawnie pokazuje daty od–do obu okresów. Zakresy obejmują pełne lokalne dni w strefie `Europe/Warsaw`. Dane odświeżają się raz dziennie, a interfejs pokazuje datę ostatniej aktualizacji.

**USTALONE DLA V1:** sprzedaż domyślnie korzysta z daty utworzenia rezerwacji. Status na `as_of_at` może spowodować przeliczenie historycznego dnia po późniejszej anulacji. Daty pobytu są osobnym kontekstem. Zakres obejmujący bieżący dzień w Europe/Warsaw otrzymuje etykietę „okres w trakcie”.

**REKOMENDOWANE:** magazyn przechowuje chwile jako UTC, a datę metryki wyznacza z uwzględnieniem strefy. Zakres dat jest domknięty w UI; filtr chwil obejmuje lokalną północ początku i kończy się na północy po ostatnim dniu. Dni zmiany czasu pozostają pełnymi lokalnymi dniami.

**REKOMENDOWANE:** w okresie w trakcie prezentowane są zakończone lokalne dni dostępne po imporcie, licznik dostępnych dni oraz porównanie do bezpośrednio wcześniejszego okresu o tej samej liczbie dni kalendarzowych co cały wybrany zakres, z jawną informacją o różnej kompletności. Granice wybranych okresów pozostają stałe również przy częściowej dostępności danych. Reguła trendu oczekuje porównywalnej kompletności; do tego czasu zwraca `INSUFFICIENT_DATA`. Godzina odświeżania i szczegóły dostępności pełnych dni pozostają Q03.

**REKOMENDOWANE:** `date_basis` jest jawne: `ad_delivery`, `platform_reported`, `booking_created`, `journey_cohort` lub `outcome_occurred`. Dla platform zachowuje się dodatkowo źródłową podstawę daty, model i okno atrybucji. Przekształcenie agregatu w innej strefie wymaga opisanej możliwości źródła; zgodność czasową ocenia `data_quality_daily` (Q03).

**REKOMENDOWANE:** `as_of_at` opisuje moment stanu faktów, a `updated_at` moment publikacji do widoku. Raport podaje również zakres `available_through_date`. Ponowny import aktualizuje historyczne dni dotknięte zmianą statusu. Wybrana rewizja dnia jest jednoznaczna; opcjonalny `snapshot_id` wspiera odtwarzanie, jeśli istnieje takie wymaganie.

**KOLEJNY ETAP:** zaawansowane okna dojrzałości kohort, analizy pobytowe i bardziej rozbudowana historia wersji jakości.

**USTALONE DLA V1 — wyznaczenie porównania:** dla zakresu `[start_date, end_date]` liczba dni kalendarzowych wynosi `N = end_date − start_date + 1`. Okres porównawczy ma `comparison_end = start_date − 1 dzień` i `comparison_start = start_date − N dni`. Arytmetyka dotyczy lokalnych dat kalendarzowych, również przy zmianie czasu. Przykład: 10–11 września porównuje się z 8–9 września. Miesiąc i kwartał korzystają z rzeczywistej liczby dni wybranego zakresu, a porównanie zachowuje dokładnie tę długość.

**USTALONE DLA V1:** po zmianie zakresu każdy KPI, wykres, komentarz, reguła i odpowiedź AI otrzymuje aktualne okresy. Serwer agreguje dane dzienne osobno dla obu zakresów, następnie oblicza wskaźniki i różnice; interfejs pokazuje obie pary dat oraz datę ostatniej aktualizacji danych.

## G. Zasady walut

**USTALONE DLA V1:** rdzeń pracuje w jednej walucie hotelu, a demo w PLN. Każda kwota ma `currency_code`. Agregacja sumuje kwoty zgodnej waluty. Przy innej walucie źródła zależny KPI otrzymuje `NULL` i przyczynę `CURRENCY_MISMATCH`; dostępne kwoty mogą być prezentowane oddzielnie z walutą.

**REKOMENDOWANE:** pieniądze mają dokładny typ dziesiętny. Definicja wartości Profitroom to brutto po rabatach z elementami zawartymi w przekazanej wartości. Prowizje OTA pozostają osobną przyszłą kategorią.

**KOLEJNY ETAP:** FX obejmie jawną walutę i kwotę źródłową, kurs, datę kursu, źródło, politykę i wynik przeliczenia. Kierunek będzie określony jako jednostki waluty bazowej za jednostkę źródłową: `base_amount = original_amount × fx_rate`.

## H. Deduplikacja i techniczne powiązania

**USTALONE DLA V1:** podstawą sprzedaży jest jedna rezerwacja o kanonicznym identyfikatorze Profitroom. Identyfikatory konwersji Meta i Google mają odrębne przestrzenie nazw. Ten sam zakup obserwowany w obu platformach pozostaje jedną rezerwacją hotelową.

**USTALONE DLA V1:** zweryfikowany `transaction_id` lub jego bezpieczny odpowiednik potwierdza tożsamość konkretnej rezerwacji Profitroom i technicznie łączy ją ze zdarzeniem `purchase` z Booking Engine/GA4. Powiązanie tej rezerwacji z płatnym marketingiem wymaga dodatkowej zaobserwowanej informacji: kwalifikującego `source/medium`, `campaign_id`, identyfikatora kliknięcia albo ścieżki journey zgodnej z ustalonym oknem obserwacji. Informacja marketingowa musi być połączona z tym purchase/rezerwacją i przejść regułę kwalifikacji do płatnego zakresu. Raport oddziela tożsamość rezerwacji od kwalifikacji marketingowej; wniosek przyczynowy wymaga dodatkowego badania.

**USTALONE DLA V1 — bramka `linked_booking_roas`:** obliczenie jest dostępne po łącznym spełnieniu pięciu warunków:

1. Purchase jest jednoznacznie połączone z aktywną rezerwacją Profitroom.
2. Rezerwacja ma dodatkowe kwalifikujące powiązanie z płatnym marketingiem na podstawie zaobserwowanej informacji marketingowej.
3. Zakres kosztu odpowiada zakresowi uwzględnionych rezerwacji.
4. Każda rezerwacja wnosi wartość tylko raz.
5. Pokrycie i jakość powiązania spełniają skonfigurowane wymagania.

Do spełnienia całej bramki wynik wynosi `NULL` wraz z `metric_status` i `reason_codes`. **REKOMENDOWANE:** przykładowe przyczyny to `PURCHASE_BOOKING_LINK_UNVERIFIED`, `PAID_MARKETING_LINK_UNVERIFIED`, `COST_SCOPE_MISMATCH`, `BOOKING_DEDUPLICATION_UNVERIFIED`, `LINKAGE_COVERAGE_UNKNOWN` i `LINKAGE_QUALITY_BELOW_THRESHOLD`. Brak pomiaru otrzymuje `NO_DATA`, niespełniona bramka jakości `INSUFFICIENT_DATA`, rozbieżny zakres `NOT_COMPARABLE`, a błędna deduplikacja `INVALID_DATA`. Po przejściu bramki obowiązują również reguły zerowego mianownika z E.

**REKOMENDOWANE:** adapter mapuje `(hotel_id, source_system, source_booking_id)` do `(hotel_id, canonical_booking_id)`. Aktualizacja statusu lub wartości zmienia ten sam rekord. Rezerwacja grupowa z jednym identyfikatorem pozostaje jedną jednostką. Reguła wyłączenia testów zachowuje identyfikator i wersję kontroli.

**REKOMENDOWANE:** wiarygodność połączenia tożsamości wymaga zgodności hotelu, przestrzeni identyfikatorów, czasu i jednoznaczności transakcji oraz poprawnego mapowania do aktywnej rezerwacji. Metoda i pokrycie połączenia tożsamości oraz dodatkowego powiązania marketingowego są rejestrowane oddzielnie. Zbieżność kwoty, czasu albo trendu pozostaje informacją kontekstową. Metryka powiązana otrzymuje NULL do momentu przejścia kontroli.

**REKOMENDOWANE:** w v1 `linked_booking_roas` jest raportowany na poziomie hotelu dla jednego zadeklarowanego zakresu płatnego marketingu. Każda powiązana aktywna rezerwacja wnosi wartość raz do tego zbioru, także gdy jej ścieżka obejmuje Meta i Google. Dokładny warunek powiązania z zakresem kosztu wymaga Q02. Przyszły podział między kampanie wymaga osobnej polityki alokacji; platformowe ROAS są już raportowane osobno.

**USTALONE DLA V1:** widoki aplikacyjne udostępniają agregaty. Identyfikatory rezerwacji, `transaction_id` i `journey_id` służą deduplikacji i łączeniu przed agregacją. Aplikacja pokazuje znane pokrycie; nieznane pokrycie ma `UNKNOWN`.

**KOLEJNY ETAP:** modele probabilistyczne i łączenie wielu urządzeń. W v1 różne urządzenia pozostają odrębnymi obserwacjami z widocznym ograniczeniem.

## I. Poziomy pewności

**USTALONE DLA V1:** pewność zależy od kompletności, próby, jakości pomiaru i możliwości połączenia źródeł. Silnik nadaje poziom dla konkretnej metryki lub wniosku. AI przekazuje otrzymany poziom wraz z ograniczeniami.

**REKOMENDOWANE:** poziomy są interpretowane następująco:

| Poziom | Oczekiwane warunki i komunikat |
|---|---|
| Wysoka (`HIGH`) | Spełnione kryteria jakości i próby dla hotelu; wniosek łączący źródła ma zweryfikowane powiązanie. Komunikat precyzuje zakres faktu. |
| Średnia (`MEDIUM`) | Dostępne dane pozwalają na ograniczony opis, a jawne luki lub mniejsza próba ograniczają zakres rekomendacji. |
| Niska (`LOW`) | Zaobserwowane wartości pozwalają wskazać sygnał do sprawdzenia; rekomendacja koncentruje się na weryfikacji pomiaru i kontekstu. |
| Niewystarczające dane (`INSUFFICIENT_DATA`) | Krytyczne wejście, powiązanie albo próg pozostaje niespełniony. System podaje brakujący warunek i obserwowane fakty. |

**REKOMENDOWANE:** poziom pewności liczby rezerwacji i poziom pewności interpretacji marketingowej są oceniane oddzielnie. `coverage_status=UNKNOWN` oznacza nieznane pokrycie, a wpływ tego stanu na wniosek wynika z jego wymagań jakościowych. Reguła wymagająca znanego pokrycia oczekuje tego pomiaru. Progi HIGH/MEDIUM/LOW dla pierwszego hotelu wymagają Q05.

## J. Wystarczalność danych

**USTALONE — stan obecnego demo:** `checkCampaignDataSufficiency` uznaje dane za wystarczające przy `spend >= 150 OR sessions >= 150`. To historyczna reguła demonstracyjna. Jej przyszłe zastosowanie wynika z konfiguracji hotelu.

**USTALONE DLA V1:** brak wystarczalności oznacza potrzebę kolejnych obserwacji lub uzupełnienia pomiaru. Ocena skuteczności kampanii pozostaje odrębna. Rekomendacja uwzględnia próbę i poziom pewności.

**REKOMENDOWANE:** konfiguracja ma osobne obszary: reklama, ruch, lejek, sprzedaż i powiązania. Progi wolumenu mogą korzystać z AND/OR, a obowiązkowe kryteria jakości są sprawdzane łącznie. Wydatki i sesje są przesłankami wielkości próby; gotowość połączenia tożsamości, kwalifikacja marketingowa oraz pozostałe warunki z H są osobną bramką `linked_booking_roas`.

**REKOMENDOWANE:** wystarczalność dla każdego wybranego zakresu korzysta z zagregowanej próby oraz jakości wszystkich wymaganych dni. Wynik zawiera użyte progi, wersję konfiguracji, liczbę obserwacji i powody oczekiwania na dane.

## K. Konfiguracja i progi hotelu

**USTALONE DLA V1:** ustawienia hotelu i progi są przechowywane w Supabase. Serwerowy silnik reguł łączy konfigurację Supabase z faktami BigQuery. Konfiguracja ma wersję; widoki BigQuery v1 obejmują sześć zbiorów faktów wymienionych w N.

| Parametr | Znaczenie | Konfiguracja demo |
|---|---|---|
| `target_roas` | Docelowy ROAS dla jawnie wskazanej metryki platformowej lub powiązanej | `>= 4` |
| `maximum_online_booking_ad_cost` | Maksymalny koszt reklam na aktywną rezerwację online | `<= 450 PLN` |
| `minimum_spend` | Minimalny wydatek dla oceny | `150 PLN` |
| `minimum_sessions` | Minimalna liczba sesji | `150`; historyczny tryb OR z wydatkiem |
| `minimum_conversions` | Minimalna próba dla wskazanego typu konwersji/rezerwacji | Obecny UI demo pokazuje 3 rezerwacje; produkcyjna konfiguracja wymaga Q05 |
| `maximum_cancellation_rate_pct` | Dopuszczalny współczynnik anulacji | Wartość hotelu do ustalenia |
| `minimum_measurement_completeness_pct` | Minimalne znane pokrycie pomiaru | Wartość hotelu do ustalenia |
| `minimum_linkage_coverage_pct` | Minimalne znane pokrycie powiązań wymagane przez konkretną regułę | Wartość hotelu do ustalenia |
| `minimum_runtime_days`, `maximum_lag_hours` | Wymagany czas obserwacji i aktualność | UI demo pokazuje 3 dni emisji; świeżość do ustalenia |

**USTALONE DLA V1:** ROAS 4, koszt 450 PLN i spend/sessions to wartości demonstracyjne. Każdy hotel otrzymuje własną konfigurację adekwatną do swojej ekonomiki i pomiaru.

**REKOMENDOWANE:** wersja konfiguracji obejmuje `hotel_id`, `config_version`, `valid_from`, `valid_to`, `approved_at`, zakres reguły, metrykę, wartość, jednostkę i operator. Raport wskazuje użyte `config_version` oraz `rule_version`. Jawnie wyłączony próg ma `enabled=false`; wymagany brakujący próg daje `INSUFFICIENT_DATA` dla zależnej reguły. Dokładne role edycji i zatwierdzania pozostają Q06.

## L. Generowanie wniosków i AI

**USTALONE DLA V1:** kolejność to **fakt → reguła → interpretacja → rekomendacja**, z poziomem pewności i ograniczeniami.

- Fakt zawiera `metric_id`, hotel, okres, wartość, jednostkę, liczniki i mianowniki, `as_of_at` oraz jakość.
- Reguła zawiera identyfikator, wersję, zastosowane progi i wynik deterministycznej oceny.
- Interpretacja rozróżnia obserwację, techniczne powiązanie, korelację oraz hipotezę.
- Rekomendacja uwzględnia poziom pewności, wielkość próby i możliwe działania weryfikacyjne.

**USTALONE DLA V1:** AI otrzymuje zagregowane fakty, statusy jakości i wyniki reguł. KPI oblicza serwerowy silnik. Odpowiedź zawiera referencje do użytych metryk i przechodzi kontrolę zgodności liczb z wejściem. Rozmowy v1 działają bez trwałego zapisu.

**REKOMENDOWANE:** referencja faktu obejmuje hotel, zakres dat, metrykę i wersję danych. Po zmianie okresu serwer przekazuje aktualny zestaw faktów. Walidator dopuszcza wyłącznie liczby obecne w przekazanym zestawie lub jego z góry przygotowanych formatach prezentacyjnych. W razie rozbieżności system wyświetla zweryfikowaną odpowiedź szablonową albo prosi o ponowienie. Użyty model i forma kontrolowanej odpowiedzi pozostają szczegółem implementacyjnym przyszłego zadania (Q09).

**REKOMENDOWANE:** efemeryczny stan rozmowy oraz zakres logów są dostosowane do zasady braku trwałego zapisu rozmów. Polityka logów i dostawcy wymaga doprecyzowania przed integracją AI.

## M. Wzorce precyzyjnych komunikatów

**REKOMENDOWANE:** przykładowe liczby są ilustracją formy. W działającej aplikacji wszystkie wartości i procenty są dostarczane przez silnik obliczeń. Podany poziom pewności jest warunkowy i wynika z jakości konkretnego zbioru.

| Sytuacja | Rekomendowane sformułowanie | Wymagane fakty | Poziom pewności |
|---|---|---|---|
| Meta → Google Brand | „W 12 z 40 obserwowanych ścieżek do rezerwacji pierwszy zaobserwowany kontakt był z Meta, a ostatni z Google Brand. Pokrycie wynosi 60%. Wynik opisuje zarejestrowane sekwencje.” | Journey, 30 dni przed wynikiem, pełny mianownik, końce ścieżki, pokrycie, transaction_id dla powiązanej rezerwacji | Według jakości obserwacji; zwykle ograniczony przez pokrycie |
| Meta → Direct | „W obserwowanej ścieżce Meta poprzedzała kontakt Direct i rezerwację. Analiza obejmuje dostępny identyfikator urządzenia lub przeglądarki oraz udzielone zgody.” | Uporządkowana sekwencja, wynik, metoda identyfikacji i jakość | MEDIUM/LOW zależnie od kompletności; HIGH tylko dla spełnionych kryteriów faktu |
| Kliknięcia i sesje | „Zarejestrowano 1000 kliknięć wychodzących i 700 sesji. Ich stosunek wynosi 70%. Porównujemy dwie jednostki pomiaru; sprawdźmy pokrycie i działanie strony.” | Typ kliknięcia, sesje, zgodny okres i kampania, wyliczony stosunek | Wysoka dla kompletnych liczników, osobna ocena interpretacji |
| Mała próba | „Odnotowano 2 aktywne rezerwacje. Do oceny skalowania oczekujemy spełnienia progu tego hotelu.” | Statusy, okres, próba, próg i wynik reguły | INSUFFICIENT_DATA dla skalowania |
| Wzrost budżetu i rezerwacji online | „Aktywne rezerwacje online wzrosły o 20%, a kwalifikujący wydatek o 40%. Koszt reklam na aktywną rezerwację online wzrósł o 16,7%.” | Oba okresy, zgodne zakresy, obliczone zmiany i koszt | Zależny od kompletności; komentarz opisuje efektywność okresową |
| Ruch i OTA | „W tym samym okresie wzrosły sesje z Meta i aktywne rezerwacje OTA. Obserwujemy korelację. Ocenę technicznego powiązania umożliwią odpowiednie identyfikatory.” | Osobne agregaty ruchu i OTA, okres, status łączenia | Dla korelacji według danych; przypisanie oczekuje powiązania |
| ROAS powiązanych rezerwacji | „ROAS rezerwacji powiązanych wynosi 3,2 dla wskazanego zakresu reklam. Purchase połączono z aktywnymi rezerwacjami Profitroom, a kwalifikujące obserwacje marketingowe powiązano z tymi rezerwacjami. Pokrycie kwalifikującego powiązania wynosi 65% i spełnia próg tego hotelu.” | Zweryfikowane transaction_id, dodatkowe informacje marketingowe i ich kwalifikacja, zgodny koszt, wartość każdej rezerwacji raz, pokrycie obu połączeń, spełnione progi jakości, wyliczony ROAS | Według bramki jakości i próby; przyczynowość wymaga dodatkowego badania |
| Nieznane pokrycie | „Pokrycie pomiaru: nieznane. Pokazujemy zarejestrowane wartości; ocena wymagająca znanego pokrycia oczekuje uzupełnienia danych.” | coverage_status=UNKNOWN, obserwowane wartości, wymagania reguły | INSUFFICIENT_DATA dla zależnego wniosku |
| Zerowa baza | „W poprzednim okresie było 0, w bieżącym 4. Zarejestrowano wzrost od zera.” | Dwa policzone wyniki, status procentu ZERO_DENOMINATOR | Według jakości liczb |
| Okres w trakcie | „Okres w trakcie: [od–do]. Dostępne są [k] z [N] pełnych dni. Porównanie: [od–do okresu porównawczego], obejmujące poprzednie [N] dni. Ostatnia aktualizacja: [data].” | Zakresy, liczba dostępnych dni, updated_at | Ograniczona porównywalność trendu |

## N. Kontrakty widoków BigQuery v1

### N.1. Wspólna konstrukcja

**USTALONE DLA V1:** sześć widoków dziennych ma płaskie kolumny. Serwer osobno sumuje liczniki i mianowniki obu wybranych okresów, następnie oblicza KPI, różnice i uruchamia reguły z konfiguracją Supabase. Model dzienny obsługuje dowolny zakres dat już w v1, bez przebudowy źródeł. `period_key` może być identyfikatorem raportu w aplikacji; fizyczną osią danych jest `metric_date`.

**REKOMENDOWANE:** poniższe schematy są kontraktem logicznym do weryfikacji implementacyjnej. Wszystkie kolumny są wymagane w schemacie; „NULL: tak” określa dopuszczalny brak wartości. `STRING` to tekst, `INT64` liczba całkowita, `NUMERIC` liczba dziesiętna, `BOOL` wartość logiczna, `DATE` lokalny dzień, `TIMESTAMP` chwila UTC. `ARRAY<STRING>` służy prostej liście kodów; pozostałe wyniki są skalarne.

Wspólne kolumny wszystkich sześciu widoków:

| Kolumna | Typ | NULL | Opis |
|---|---|---|---|
| `hotel_id` | STRING | nie | Stabilny identyfikator hotelu |
| `metric_date` | DATE | nie | Dzień faktu/kohorty zgodnie z date_basis |
| `date_basis` | STRING | nie | Jawna podstawa dnia |
| `as_of_at` | TIMESTAMP | nie | Moment stanu danych, w tym statusu rezerwacji |
| `updated_at` | TIMESTAMP | nie | Publikacja aktualnej wersji agregatu |
| `source_watermark_at` | TIMESTAMP | tak | Aktualność źródeł dla danego zakresu |
| `contract_version` | STRING | nie | Wersja semantyki, początkowo 0.2 |
| `is_synthetic` | BOOL | nie | Oznaczenie demo |
| `metric_status` | STRING | nie | Ogólna dostępność wiersza według E.1 |
| `reason_codes` | ARRAY<STRING> | nie | Powody ograniczeń; pusta lista dla poprawnych danych |

**REKOMENDOWANE:** klucz bazowy `B=(hotel_id, metric_date)` odnosi się do jednej aktualnej wersji kontraktu i danych. Wersjonowane tabele mogą zachować `snapshot_id` za widokiem; widok aplikacyjny wybiera jeden aktualny rekord danego klucza. `as_of_at` opisuje rewizję, a jego wartości pozostają metadanymi aktualności podczas agregacji. Dla raportu wybiera się spójny opublikowany przebieg odświeżenia; rozbieżność źródeł jest widoczna w jakości.

**REKOMENDOWANE:** jakość per metryka znajduje się w `data_quality_daily`, powiązana kluczem `(hotel_id, metric_date, scope_key, metric_id)`. Ogólny status wiersza sygnalizuje dostępność, a metryka korzysta z własnego statusu, aby brak ścieżek mógł współistnieć z poprawną sprzedażą.

**REKOMENDOWANE — addytywność journey:** deduplikacja następuje przed agregacją. W obrębie jednej definicji każdy journey należy do jednej kohorty wejścia do lejka. Liczniki przejść są przypisywane do dnia tej kohorty, również gdy następny etap wystąpi później. Dzienna unikalność per dzień zdarzenia jest odrębną metryką od kohortowych journey. Dla ścieżek jeden wynik w danym journey i definicji otrzymuje jeden dzień wyniku; regułę wyboru wyniku doprecyzowuje Q04. Dzięki temu suma dni dowolnego wybranego zakresu zachowuje jednostkę zdefiniowaną w kontrakcie.

### N.2. `dashboard_overview_daily`

Przeznaczenie: sumy hotelowe dnia oraz liczniki dla kosztu online i ROAS powiązanego. Unikalność: **B**. `date_basis=booking_created`; koszty są zestawieniem z emisji tego samego dnia, co ujawnia `spend_date_basis`.

| Kolumna dodatkowa | Typ | NULL | Opis |
|---|---|---|---|
| `currency_code` | STRING | nie | Waluta hotelu |
| `spend_date_basis` | STRING | nie | `ad_delivery` dla kosztów |
| `ad_spend` | NUMERIC | tak | Suma kosztu bez dublowania kont/kampanii |
| `eligible_ad_spend` | NUMERIC | tak | Licznik kosztu reklam na aktywną rezerwację online |
| `spend_scope_id` | STRING | nie | Wersjonowany zakres kwalifikacji kosztu |
| `active_hotel_bookings` | INT64 | tak | Aktywne confirmed+completed we wszystkich dostępnych kanałach |
| `active_hotel_value` | NUMERIC | tak | Wartość brutto po rabatach |
| `active_direct_web_bookings` | INT64 | tak | Mianownik głównego KPI online |
| `cohort_bookings`, `cancelled_bookings` | INT64, każda | tak | Kohorta i licznik anulacji |
| `linked_active_bookings` | INT64 | tak | Unikalne aktywne rezerwacje z potwierdzoną tożsamością purchase oraz dodatkowym kwalifikującym powiązaniem z płatnym marketingiem w zakresie hotelu |
| `linked_active_booking_value` | NUMERIC | tak | Licznik linked_booking_roas: wartość rezerwacji z oboma powiązaniami, każda liczona raz |
| `linked_scope_ad_spend` | NUMERIC | tak | Mianownik linked_booking_roas: koszt zakresu odpowiadającego zakwalifikowanym rezerwacjom |
| `linkage_scope_id` | STRING | tak | Wersja zakresu płatnego marketingu, okna i reguły kwalifikacji; wymagana dla linked_booking_roas |
| `purchase_linked_active_bookings` | INT64 | tak | Aktywne rezerwacje z potwierdzoną tożsamością purchase; licznik kontrolny odrębny od zbioru zakwalifikowanego do płatnego marketingu |
| `marketing_link_rule_version` | STRING | tak | Wersja kwalifikacji zaobserwowanych informacji marketingowych; wymagana dla linked_booking_roas |
| `linked_booking_roas_status` | STRING | nie | metric_status dedykowany gotowości ROAS powiązanego |
| `linked_booking_roas_reason_codes` | ARRAY<STRING> | nie | Powody niespełnienia pięciu warunków; agregowane i ponownie oceniane dla wybranego okresu |

Serwer liczy `online_booking_ad_cost`, `linked_booking_roas` i anulacje dopiero po sumowaniu dni każdego okresu i sprawdzeniu jakości. Wyniki platformowe są agregowane oddzielnie z `campaign_performance_daily`.

### N.3. `campaign_performance_daily`

Przeznaczenie: fakty platformowe i ruch pojedynczej kampanii. Unikalność: **B + `(platform, account_id, campaign_id)`** dla jednej skonfigurowanej akcji zakupowej i polityki w danym dniu. Agregaty kanałów są wyliczane z kampanii na serwerze. Wybór akcji i mapy Brand jest opisany w Q02/Q04.

| Kolumna dodatkowa | Typ | NULL | Opis |
|---|---|---|---|
| `platform`, `account_id`, `campaign_id`, `campaign_name` | STRING, każda | nie | Tożsamość kampanii |
| `marketing_channel` | STRING | nie | Meta, Google Ads albo Google Brand; Brand jest rozłącznym podzbiorem w prezentacji |
| `currency_code` | STRING | nie | Waluta danych |
| `conversion_action` | STRING | tak | Wybrana akcja; NULL ogranicza interpretację platformowych konwersji |
| `platform_attribution_model`, `platform_attribution_window`, `platform_date_basis` | STRING, każda | tak | Zachowana polityka źródła; wymagane dla porównań platformowych |
| `ad_spend`, `eligible_ad_spend` | NUMERIC, każda | tak | Koszt źródłowy i kwalifikujący |
| `spend_scope_id` | STRING | nie | Wersja kwalifikacji kosztu |
| `impressions`, `outbound_clicks` | INT64, każda | tak | Wyświetlenia i kliknięcia wychodzące |
| `click_type` | STRING | tak | Definicja użytego kliknięcia |
| `platform_conversions`, `platform_revenue` | NUMERIC, każda | tak | Wynik i wartość raportowane przez tę platformę |
| `sessions`, `engaged_sessions`, `offer_views`, `intent_events` | INT64, każda | tak | Dzienny ruch i zdarzenia według jawnej definicji |
| `traffic_definition_id` | STRING | nie | Wersja definicji ruchu i mapowania do kampanii |
| `eligible_outbound_clicks`, `clicks_with_observed_arrival` | INT64, każda | tak | Mianownik i licznik potwierdzonego dotarcia; NULL do spełnienia warunków |

Koszt jest zapisany raz dla kampanii i dnia. Rozszerzenie o wiele akcji konwersji wymaga osobnego ziarna wyników platformowych; serwer zachowuje pojedynczy koszt kampanii. Metryki lejka dla kampanii pochodzą z `booking_funnel_daily`. Platformy o różnych politykach są raportowane w osobnych grupach. Zmiana polityki w analizowanym lub porównawczym okresie daje kontekst jakości dla porównania.

### N.4. `booking_funnel_daily`

Przeznaczenie: kohortowe liczby journey i przejścia według mapy zdarzeń, z telefonem i e-mailem jako gałęziami intencji. Unikalność: **B + `(funnel_definition_id, scope_key, stage_id, next_stage_id)`**; dla końca `next_stage_id=end`. `date_basis=journey_cohort`.

| Kolumna dodatkowa | Typ | NULL | Opis |
|---|---|---|---|
| `funnel_definition_id`, `scope_key` | STRING, każda | nie | Definicja i zakres: hotel/kampania/kanał |
| `stage_id`, `next_stage_id`, `stage_label` | STRING, każda | nie | Jawna relacja etapów lub zakończenie |
| `stage_order` | INT64 | nie | Kolejność mapy |
| `counting_unit` | STRING | nie | `journey` w podstawowym lejku |
| `stage_journeys` | INT64 | tak | Journey kohorty, które osiągnęły etap |
| `journeys_entering_stage` | INT64 | tak | Mianownik przejścia |
| `journeys_reaching_next` | INT64 | tak | Podzbiór po przejściu A→B |
| `entry_journeys` | INT64 | tak | Liczba wejść kohorty dla udziału etapu |
| `transition_window_hours` | NUMERIC | tak | Jawne okno mapy; do doprecyzowania Q04 |
| `purchase_journeys` | INT64 | tak | Journey ze zdarzeniem purchase; pole właściwe dla etapu purchase |
| `purchase_journeys_linked_to_profitroom` | INT64 | tak | Podzbiór ze zweryfikowanym transaction_id; potwierdzenie transakcji oddzielone od liczby aktywnych rezerwacji |

Serwer wylicza przejście z sumy odpowiednich liczników. `stage_journeys` i `entry_journeys` mogą być powtórzone dla kilku gałęzi; do udziału etapu wybiera się jedną reprezentację etapu. Telefon i e-mail pozostają odrębnymi gałęziami. Sekwencja jest obserwowana na dostępnym identyfikatorze urządzenia/przeglądarki. Pełne potwierdzanie rozmów jest kolejnym etapem.

### N.5. `hotel_sales_daily`

Przeznaczenie: dzienna kohorta utworzenia według kanału i aktualnego statusu Profitroom. Unikalność: **B + `sales_channel`**. `date_basis=booking_created`. Deduplikacja rezerwacji następuje przed agregacją.

| Kolumna dodatkowa | Typ | NULL | Opis |
|---|---|---|---|
| `sales_channel` | STRING | nie | direct_web, phone, email, booking_com, other_ota, other, unknown |
| `sales_segment` | STRING | nie | direct, ota, other, unknown |
| `channel_mapping_version`, `status_mapping_version` | STRING, każda | nie | Wersje mapowania |
| `currency_code` | STRING | nie | Jedna waluta hotelu |
| `cohort_bookings` | INT64 | tak | Wszystkie rzeczywiste rezerwacje dnia po wyłączeniu testów |
| `confirmed_bookings`, `completed_bookings` | INT64, każda | tak | Osobne statusy aktywne |
| `active_bookings` | INT64 | tak | confirmed + completed |
| `cancelled_bookings` | INT64 | tak | Status cancelled na as_of_at |
| `pending_bookings`, `option_bookings`, `no_show_bookings` | INT64, każda | tak | Pozostałe statusy raportowane osobno |
| `unknown_status_bookings` | INT64 | tak | Status wymagający mapowania |
| `active_booking_value` | NUMERIC | tak | Brutto po rabatach, elementy według Profitroom |
| `sales_value_basis` | STRING | nie | `profitroom_gross_after_discounts` |

Kontrola sum porównuje `cohort_bookings` z sumą rozłącznych statusów. `active_bookings` jest ich podsumowaniem i jest agregowane jako alternatywa do confirmed+completed. Kanał `unknown` pozostaje widoczny. Sprzedaż direct_web zasila główny KPI online; direct ogółem i OTA mają osobne zestawienia.

### N.6. `channel_paths_daily`

Przeznaczenie: pełny zagregowany rozkład obserwowanych sekwencji journey według dnia wyniku. Unikalność: **B + `(path_definition_id, outcome_type, path_signature)`**. `date_basis=outcome_occurred`; dla rezerwacji dniem wyniku jest lokalna data jej utworzenia.

| Kolumna dodatkowa | Typ | NULL | Opis |
|---|---|---|---|
| `path_definition_id`, `path_signature` | STRING, każda | nie | Wersja definicji i sygnatura sekwencji |
| `path_sequence`, `path_label` | STRING, każda | nie | Kanoniczny tekst uporządkowanych kontaktów oraz etykieta |
| `outcome_type` | STRING | nie | Np. active_booking, purchase, phone_click, email_click |
| `first_observed_channel`, `last_observed_channel` | STRING, każda | tak | Pierwszy i ostatni zaobserwowany kontakt |
| `observation_window_days` | INT64 | nie | 30 dni przed wynikiem |
| `path_count` | INT64 | tak | Liczba kwalifikujących jednostek journey/wyniku tej sekwencji |
| `linked_outcome_count` | INT64 | tak | Podzbiór wyników o tożsamości połączonej z Profitroom przez transaction_id; kwalifikacja płatnego marketingu jest oceniana oddzielnie |
| `paid_marketing_linked_outcome_count` | INT64 | tak | Podzbiór wyników z potwierdzoną tożsamością rezerwacji i dodatkowym kwalifikującym powiązaniem z płatnym marketingiem |
| `marketing_link_rule_version` | STRING | tak | Wersja kwalifikacji marketingowej w zakresie tej ścieżki |
| `eligible_for_share` | BOOL | nie | Czy znane końce i jakość pozwalają zaliczyć sekwencję do mianownika |
| `measurement_method` | STRING | nie | Metoda obserwacji na dostępnym identyfikatorze urządzenia/przeglądarki |

Direct pozostaje widoczny. Kategorie Google Ads, Google Brand i Google Organic są rozłącznie mapowane; Google Brand jest wyróżnioną klasą kampanii brandowych Google Ads. Cały mianownik obejmuje pełny rozkład kwalifikujących ścieżek, również poza listą wyświetlanych najczęstszych sekwencji. Pokrycie i nieznane wyniki znajdują się w jakości. Wielourządzeniowość i zgody są widocznym ograniczeniem. Q04 doprecyzowuje wybór wyniku dla journey z kilkoma zakupami.

### N.7. `data_quality_daily`

Przeznaczenie: płaskie kontrole dostępności, jakości i pokrycia. Unikalność: **B + `(scope_key, metric_id, source_system)`**. Podstawa daty odpowiada ocenianej metryce. Ten widok zawiera fakty jakości; serwer nadaje pewność i wynik reguły z progów Supabase.

| Kolumna dodatkowa | Typ | NULL | Opis |
|---|---|---|---|
| `scope_key`, `metric_id`, `source_system` | STRING, każda | nie | Zakres, metryka i źródło; `all_required` oznacza ocenę zbiorczą |
| `linkage_type` | STRING | nie | `purchase_booking_identity`, `paid_marketing` lub `not_applicable`; metric_id rozróżnia oba rodzaje ocen w kluczu widoku |
| `coverage_unit` | STRING | nie | Np. konta-dni, rezerwacje, zdarzenia; ustalona definicja oczekiwanego zbioru |
| `expected_units`, `observed_units` | INT64, każda | tak | Mianownik i licznik pokrycia |
| `coverage_status` | STRING | nie | KNOWN albo UNKNOWN |
| `coverage_pct` | NUMERIC | tak | observed / expected ×100 dla znanego dodatniego mianownika |
| `eligible_outcomes`, `linked_outcomes` | INT64, każda | tak | Pełny kwalifikujący zbiór wyników i połączony podzbiór, według jawnego linkage_type |
| `linkage_coverage_status` | STRING | nie | KNOWN albo UNKNOWN |
| `linkage_coverage_pct` | NUMERIC | tak | linked / eligible ×100 dla dodatniego znanego mianownika |
| `observation_count` | INT64 | tak | Próba właściwa dla metryki |
| `duplicate_count`, `invalid_record_count`, `excluded_test_count` | INT64, każda | tak | Deduplikacja, błędy i testy przed agregacją |
| `quality_rule_id`, `quality_rule_version` | STRING, każda | nie | Identyfikator i wersja kontroli, w tym wyłączenia testów |
| `available_through_date` | DATE | tak | Ostatni pełny dzień dostępny dla źródła |
| `lag_hours` | NUMERIC | tak | Opóźnienie względem uzgodnionego harmonogramu |

Dla każdego wybranego okresu serwer liczy pokrycie z sum porównywalnych baz i zachowuje UNKNOWN, gdy wymagany mianownik pozostaje nieznany. Powtórzone oceny `all_required` są podsumowaniem, a nie dodatkowymi jednostkami do sumowania. Wspólne `metric_status` i `reason_codes` opisują każdą ocenianą metrykę. Zaawansowane wersjonowanie ocen jakości pozostaje rozszerzeniem.

**REKOMENDOWANE:** przed agregacją warstwa łączenia zachowuje audytowalną relację purchase–rezerwacja oraz osobno typ i pochodzenie dowodu marketingowego (`source/medium`, `campaign_id`, identyfikator kliknięcia lub kwalifikująca ścieżka journey), okno obserwacji, zakres kosztu i wersję reguły. Widoki aplikacyjne udostępniają wynikowe liczniki i statusy. Pokrycie tożsamości rezerwacji oraz pokrycie kwalifikującego powiązania płatnego marketingu mają osobne metric_id, liczniki i mianowniki.

### N.8. Granica v1 i rozszerzeń

**USTALONE DLA V1:** konfiguracja progów jest odczytywana z Supabase i wersjonowana zgodnie z K. Fakty BigQuery są oddzielone od konfiguracji, reguł i komentarza AI.

**KOLEJNY ETAP:** złożony `STRUCT MetricResult` może ujednolicić odpowiedź serwerową o wynik, jednostkę, bazę, status i referencje. Płaskie kolumny rdzenia pozwalają dodać taką reprezentację bez zmiany semantyki danych dziennych. Rozbudowane snapshoty jakości, wiele akcji konwersji, podział kredytu kampanijnego i analiza pobytów są rozwijane według potrzeb.

## O. Mapowanie obecnego demo i stałych interfejsu

**USTALONE DLA V1:** `package_bookings` i `booking_value` mają obecnie niepotwierdzoną semantykę. Nowe syntetyczne BigQuery zawiera osobno platformowe konwersje i wartości, aktywne rezerwacje Profitroom, purchase połączone z rezerwacjami przez `transaction_id`, dodatkowe zaobserwowane informacje kwalifikujące do płatnego marketingu i obserwowane ścieżki. Etykiety i wartości UI będą dopasowane w późniejszej implementacji.

| Obecny element | Docelowe miejsce v1 | Zasada mapowania |
|---|---|---|
| DEMO_HOTEL_ID i hotel_id | hotel_id we wszystkich widokach; konfiguracja i uprawnienia Supabase | Stabilne mapowanie hotelu |
| demoPeriods.id, label, current_start/end, comparison_start/end | Dowolne zakresy od–do i automatyczne porównanie tej samej długości, oparte na metric_date | Obecne zakresy 14-dniowe są historycznym scenariuszem; nowy model przechowuje dni |
| demoCampaigns.id, campaign_name, channel | campaign_performance_daily | Kanoniczne konto/kampania oraz mapa kanału |
| Meta Ads — Łącznie | Agregacja kanału na serwerze | Nowe syntetyczne źródło dostarcza jawne kampanie składowe albo odrębny kontrolny agregat do uzgodnienia scenariusza |
| demoCampaigns.status | Wynik silnika reguł | Status jest obliczany z faktów i konfiguracji |
| campaign_id, period_id w demoCampaignMetrics | campaign_id i metric_date | Nowy scenariusz syntetyczny ma jawny rozkład dzienny |
| spend | ad_spend i jawnie kwalifikowany eligible_ad_spend | Koszt platformy i zakres KPI są odróżnione |
| sessions, engaged_sessions, offer_views, medium_high_intent_events | sessions, engaged_sessions, offer_views, intent_events | Jednostki i mapy zdarzeń mają wersję |
| engagement_rate | Iloraz sum engaged_sessions / sessions na serwerze | Obliczany dla aktualnie wybranych okresów |
| step2, step3 | booking_funnel_daily | Etapy journey z kohortą i kolejnością |
| package_bookings, booking_value | Nowe odrębne pola platformowe i powiązane po zdefiniowaniu syntetycznego scenariusza | Istniejące etykiety są historyczne; semantyka pochodzi z nowego scenariusza |
| demoFunnelMetrics.period_variant | Wybór zakresu na serwerze | Jeden dzień/kohorta jest odczytywany we właściwym okresie |
| entries, engaged_sessions, package_opens, date_searches, step1–3, purchases | Wiersze etapów booking_funnel_daily | Nowe journey i mapowanie zdarzeń; purchase połączone z Profitroom przez transaction_id |
| demoHotelSales.channel, bookings, revenue | hotel_sales_daily.sales_channel, active_bookings, active_booking_value | Nowy scenariusz jawnie określa statusy i brutto po rabatach |
| Direct, Phone, Email | direct_web, phone, email | Główny KPI korzysta z direct_web; direct ogółem jest osobnym zestawieniem |
| demoContactMetrics.phone_clicks | Gałąź intencji w booking_funnel_daily | Podstawowy obserwowany kontakt |
| calls_started, confirmed_calls | Kolejny etap potwierdzonych rozmów | Oddzielna przyszła definicja i źródło |
| one_night_inquiries | Przyszły atrybut kontaktu | Zakres dodatkowej analizy do przyszłego zadania |
| demoChannelPaths.id, path_label, path_count, outcome | channel_paths_daily | Nowe journey, okno 30 dni, jawny wynik, pełny rozkład i pokrycie |
| confidence_level demo | Serwerowa ocena na data_quality_daily + konfiguracja Supabase | Pewność wynika z jakości i próby |
| fallbackPeriod, demoCampaignIds, warunek 3 kampanii/5 kanałów | Zakres raportu i oczekiwane zbiory jakości | Brak danych otrzymuje własny status dla wybranego zakresu |
| Stałe spendDelta, zmiany sesji, engagement, CTR/CPC | Obliczenia okresowe z dziennych baz | CTR i CPC wymagają jawnego typu kliknięcia; brak baz daje NULL |
| Stałe procenty kanałów, 42%, 45%, 9,8%→5,4%, +21% | Obliczenia z pełnych ścieżek i kohort lejka | Dowody są generowane z aktualnych liczników i mianowników |
| fallbackCampaigns diagnosis/recommendation/evidence, positiveSignal, MEDIUM/LOW | Fakty → reguła → interpretacja → rekomendacja | Wersjonowane reguły i referencje do metryk |
| Ustawienia UI: ROAS 4, 450 PLN, spend/sessions; pozostałe progi demo | Konfiguracja hotelu w Supabase | 450 PLN dotyczy „Kosztu reklam na aktywną rezerwację online” (`online_booking_ad_cost`); wartości demo mają jawny typ metryki i wersję |
| Częstotliwości demo 2,0/5,0/3,0 | Opcjonalne przyszłe kryteria | Oddzielny zakres oceny reklamy |
| ask(), odpowiedzi słów kluczowych i stałe dowody | Kontrolowany komentarz AI do faktów | Nowa odpowiedź z referencjami i walidacją liczb |
| Hotel X, Gdynia, PLN, profil użytkownika | Ustawienia hotelu i użytkownik Supabase | Metadane oddzielone od faktów analitycznych |

**USTALONE DLA V1:** dotychczasowe sumy mogą służyć jako kontrola arytmetyczna po przypisaniu znaczenia. Przykłady obecnych 14-dniowych zbiorów: wydatek 10 000 / 9300 PLN, sprzedaż 238 / 214 rezerwacji i 549 000 / 479 000 PLN. Kampanijne 15 / 14 oraz 35 200 / 31 600 PLN wymagają jawnego przypisania do nowej warstwy. Nowe syntetyczne dane dzienne będą projektowane osobno; kontrola dawnych sum może obejmować agregację odpowiadającego im historycznego zakresu dat.

**USTALONE — stan repozytorium:** helpery marketingowe i dotychczasowa obsługa procentów pozostają przedmiotem późniejszej implementacji. Wersja 0.2 definiuje zachowanie docelowe; obecne dane, kod i UI zachowują aktualny stan.

## P. Rejestr decyzji D01–D18

### P.1. Status decyzji

| ID | Status | Rozstrzygnięcie i uzasadnienie |
|---|---|---|
| D01 | ROZSTRZYGNIĘTE DLA V1 | Profitroom jest źródłem kanonicznym demo i pierwszego wdrożenia. Stabilny identyfikator i wspólny kontrakt pozwalają później podłączyć inne adaptery. |
| D02 | CZĘŚCIOWO ROZSTRZYGNIĘTE | Wartość brutto po rabatach, elementy według Profitroom, UI „Wartość aktywnych rezerwacji”. Prowizje OTA i przychód zrealizowany przechodzą do dalszego rozwoju; kwalifikacja i szczegóły kosztu reklamy wymagają Q01. |
| D03 | ROZSTRZYGNIĘTE DLA V1 | Jedna rezerwacja na identyfikator; confirmed/completed aktywne, cancelled anulowane, pending/option/no_show osobno; testy wyłączane regułą jakości; grupa z jednym ID liczona raz. To zapewnia spójne sumy. |
| D04 | CZĘŚCIOWO ROZSTRZYGNIĘTE | Status na as_of_at, przeliczanie historii po anulacji i widoczna aktualizacja. Zaawansowana dojrzałość i rozliczenia pobytowe są odroczone, co upraszcza v1. |
| D05 | CZĘŚCIOWO ROZSTRZYGNIĘTE | direct_web=Booking Engine; phone/email osobno; główny KPI „Koszt reklam na aktywną rezerwację online” (`online_booking_ad_cost`) = eligible_ad_spend / active_direct_web_bookings. Cały direct i OTA mają osobne zestawienia. Dokładny zakres kwalifikujących kampanii pozostaje Q01. |
| D06 | CZĘŚCIOWO ROZSTRZYGNIĘTE | Platformy zachowują własne modele i okna; transaction_id potwierdza tożsamość purchase/rezerwacji. Linked_booking_roas wymaga dodatkowo kwalifikującej obserwacji płatnego marketingu, zgodnego kosztu, jednokrotnego ujęcia wartości oraz skonfigurowanej jakości i pokrycia. Szczegóły reguły kwalifikacji, akcji platformowej i zakresu kosztów to Q02; podział kredytu i probabilistyka są dalszym rozwojem. |
| D07 | CZĘŚCIOWO ROZSTRZYGNIĘTE | Journey, 30 dni przed wynikiem, widoczny Direct i rozróżnienie Google ustalone. Ograniczenia zgód i urządzeń są jawne. Reguła wielu wyników oraz techniczna mapa kanałów wymagają Q04; cross-device jest odroczone. |
| D08 | CZĘŚCIOWO ROZSTRZYGNIĘTE | Lejek opiera się na journey urządzenia/przeglądarki, kolejności zdarzeń i gałęziach intencji; purchase łączy transaction_id. Konkretna mapa, okno przejścia i lifecycle journey wymagają Q04. |
| D09 | CZĘŚCIOWO ROZSTRZYGNIĘTE | Dzienne źródła, dowolny zakres od–do, automatyczny bezpośrednio wcześniejszy okres tej samej długości, Europe/Warsaw, pełne dni, „okres w trakcie” dla zakresu z bieżącym dniem i aktualizacja raz dziennie są ustalone. Godzina aktualizacji i szczegóły cutoffu pozostają Q03. |
| D10 | ODROCZONE DO KOLEJNEGO ETAPU | V1 działa w jednej walucie hotelu, demo w PLN. FX otrzyma osobną politykę kursów i przeliczeń. |
| D11 | CZĘŚCIOWO ROZSTRZYGNIĘTE | Konfigurowalne progi i ich wartości demo są ustalone. Produkcyjne wartości, kryteria jakości i granice pewności dla pierwszego hotelu wymagają Q05. |
| D12 | CZĘŚCIOWO ROZSTRZYGNIĘTE | Konfiguracja i progi znajdują się w Supabase; silnik łączy je z faktami BigQuery. Wersjonowanie pozostaje częścią kontraktu. Role edycji i zatwierdzania oraz wybór wersji raportu to Q06. |
| D13 | ROZSTRZYGNIĘTE DLA V1 | Metric_date jest osią fizyczną; sześć płaskich widoków daily i agregacja serwerowa obsługują dowolne zakresy dat i ich porównania już w v1. Snapshoty są opcjonalnym narzędziem odtwarzania. |
| D14 | CZĘŚCIOWO ROZSTRZYGNIĘTE | Aplikacja odczytuje agregaty, łączenie jest techniczne, pokrycie znane jest pokazywane, a nieznane ma UNKNOWN. Szczegóły ochrony identyfikatorów, retencji i mianowników wymagają Q07. |
| D15 | CZĘŚCIOWO ROZSTRZYGNIĘTE | Nowe demo rozdziela platformy, Profitroom, powiązania i ścieżki. Obecne pola mają niepotwierdzoną semantykę; konkretne rekordy dzienne i przypisanie sum do nowych warstw wymagają Q08. |
| D16 | ODROCZONE DO KOLEJNEGO ETAPU | Potwierdzone rozmowy i pełna analiza kontaktów są odroczone. V1 zachowuje obserwowane kliknięcia telefonu i e-maila jako gałęzie intencji. |
| D17 | ROZSTRZYGNIĘTE DLA V1 | AI korzysta z agregatów, jakości i reguł; KPI liczy silnik, odpowiedź ma referencje i kontrolę liczb, rozmowy są efemeryczne. Model i szczegóły techniczne zostaną wybrane w zadaniu AI (Q09). |
| D18 | ODROCZONE DO KOLEJNEGO ETAPU | Daty pobytu pozostają w źródle jako kontekst. Analiza pobytów, noclegów i przychodu zrealizowanego otrzyma osobny zakres. |

### P.2. Pozostałe pytania

Poniższe pytania doprecyzowują decyzje; ich rozstrzygnięcie jest przypisane do odpowiedniej części wdrożenia rdzenia.

| ID | Pytanie | Moment rozstrzygnięcia |
|---|---|---|
| Q01 | Które kampanie i konta należą do kwalifikującego zakresu kosztu online? Jak traktujemy podatki i korekty kosztów platform? | Przed KPI kosztowym i konfiguracją zakresu |
| Q02 | Jak weryfikujemy jednoznaczne połączenie purchase z rezerwacją Profitroom przez transaction_id? Które dodatkowe source/medium, campaign_id, identyfikatory kliknięć lub ścieżki kwalifikują tę rezerwację do płatnego marketingu i zgodnego zakresu kosztu? Jaką akcję zakupową raportujemy z każdej platformy i jakie kontrole potwierdzają oba powiązania? | Przed uruchomieniem metryk powiązanych; do tego czasu NULL |
| Q03 | O której godzinie aktualizujemy dane i jaki jest cutoff dostępności pełnych dni dla dowolnie wybranego zakresu? Jak traktujemy strefy oraz opóźnienia źródeł? | Przed harmonogramem importu i selektorem okresu |
| Q04 | Jak tworzymy i kończymy journey_id, mapujemy zdarzenia i Google Brand oraz ustalamy okno przejścia? Jak przypisujemy journey z wieloma wynikami do kohort, aby dzienne sumy miały spójną jednostkę? | Przed lejkiem i ścieżkami |
| Q05 | Jakie wartości produkcyjnych progów, próby, kompletności, pokrycia powiązań i granic pewności zatwierdza pierwszy hotel? | Przed oceną skuteczności i rekomendacjami |
| Q06 | Które role edytują i zatwierdzają konfigurację oraz którą wersję stosuje przeliczany raport historyczny? | Przed zapisem ustawień i uruchomieniem reguł |
| Q07 | Jaki bezpieczny odpowiednik identyfikatorów i okres retencji stosujemy przed agregacją? Skąd pochodzą oczekiwane mianowniki pokrycia i jak weryfikujemy zgody? | Przed importem rzeczywistych danych i kontrolami jakości |
| Q08 | Jakie syntetyczne rekordy dzienne, statusy i powiązania tworzą nowe demo? Do których odrębnych warstw przypisujemy historyczne sumy kontrolne? | Przed seedem syntetycznego BigQuery |
| Q09 | Jaki model i format odpowiedzi wykorzystamy, jak wdrożymy walidację liczb oraz efemeryczny stan rozmowy i zakres logów? | W przyszłym zadaniu integracji AI |

## Q. Kryteria akceptacji rdzenia v1

**REKOMENDOWANE:** checklistę stosuje się etapowo. Gotowość sprzedaży i platform może poprzedzać gotowość powiązań, ścieżek i AI; zależne metryki ujawniają swój status do czasu spełnienia warunków.

### Q.1. Kontrakt i podstawowe źródła

- [x] Wersja 0.2 została zaakceptowana jako kontrakt v1 wraz z zakresem rozszerzeń.
- [ ] Próbka eksportu Profitroom potwierdza wymagane pola i stabilny identyfikator; adapter mapuje kanały, statusy i wartość brutto po rabatach.
- [ ] Reguła wyłączenia testów jest oznaczona i wersjonowana; grupy z jednym ID są liczone jako jedna rezerwacja.
- [ ] Zatwierdzono Q01, Q03, Q07 i Q08 w zakresie pierwszego importu i dashboardu.
- [ ] Sześć widoków daily ma zaakceptowane płaskie kolumny, klucze, NULL, date_basis, metric_date i metadane aktualności.
- [ ] Konfiguracja jest w Supabase, fakty w BigQuery, a serwer sprawdza członkostwo użytkownik–hotel przed odczytem.
- [ ] Demo zawiera wyłącznie syntetyczne dane, z oddzielnymi wynikami platform, rezerwacjami Profitroom, powiązaniami i ścieżkami.

### Q.2. Agregacja i prezentacja

- [ ] Serwer osobno sumuje dzienne liczniki i mianowniki dla okresu analizowanego i porównawczego, a następnie oblicza wskaźniki i różnice.
- [ ] Użytkownik wybiera dowolny zakres od–do; aplikacja pokazuje jego daty i daty bezpośrednio wcześniejszego okresu o identycznej liczbie dni kalendarzowych. Europe/Warsaw, pełne dni, „okres w trakcie” dla zakresu z bieżącym dniem i ostatnia aktualizacja są jawne.
- [ ] Kontrole okresów obejmują 1 dzień, 2 dni, 7 dni, miesiąc, kwartał, własny przedział, zmianę miesiąca/roku i zmianę czasu; porównanie ma zawsze tę samą liczbę dni kalendarzowych i kończy się dzień przed początkiem analizy.
- [ ] Zmiana dat aktualizuje KPI, wykresy, komentarze, reguły i odpowiedzi AI dla obu okresów.
- [ ] Statusy confirmed/completed, cancelled, pending, option i no_show są poprawnie rozdzielone na as_of_at; późniejsza anulacja aktualizuje właściwy historyczny dzień.
- [ ] UI stosuje „Wartość aktywnych rezerwacji” i „Koszt reklam na aktywną rezerwację online”; direct_web, cały direct i OTA mają właściwe mianowniki.
- [ ] Meta i Google zachowują model i okno; koszty oraz kampanie są deduplikowane przed agregacją.
- [ ] Znane pokrycie jest widoczne; nieznane otrzymuje UNKNOWN. NULL, zero, brak dnia, zerowa baza i niezgodna waluta mają sprawdzone zachowanie.

### Q.3. Powiązania, lejek i reguły

- [ ] Q02 i Q04 rozstrzygnięto dla uruchamianych funkcji. Linked_booking_roas spełnia wszystkie pięć warunków z H; do tego czasu zwraca NULL wraz z metric_status i reason_codes.
- [ ] Transaction_id potwierdza tożsamość purchase i konkretnej aktywnej rezerwacji Profitroom. Osobna kontrola potwierdza kwalifikującą obserwację płatnego marketingu i jej zgodność z zakresem kosztu.
- [ ] Każda rezerwacja wnosi wartość raz do linked_booking_roas, także przy kontaktach z Meta i Google; pokrycie i jakość obu powiązań spełniają skonfigurowane wymagania.
- [ ] Scenariusz purchase z transaction_id i bez kwalifikującej informacji marketingowej pozostaje poza licznikiem linked_booking_roas; brak gotowości wymaganych powiązań daje NULL z właściwymi statusami.
- [ ] Journey ma zdefiniowany cykl i przypisanie do dnia/kohorty; suma dzienna zachowuje unikalność właściwej jednostki dla dowolnego wybranego zakresu.
- [ ] Ścieżki mają 30 dni przed wynikiem, widoczny Direct i rozłączne Google Ads/Brand/Organic; pełny mianownik udziałów oraz ograniczenia zgód i urządzeń są jawne.
- [ ] Lejek ma uporządkowaną mapę zdarzeń, gałęzie telefonu/e-maila i liczniki przejścia będące podzbiorami mianowników.
- [ ] Zatwierdzono Q05 i Q06 dla ocen hotelu; reguła zapisuje wersję konfiguracji i uzasadnienie pewności. Wartości demo są rozpoznawalne jako demo.

### Q.4. Kontrolowany komentarz i dalszy rozwój

- [ ] Wzorce komunikatów zachowują fakt, regułę, interpretację i rekomendację z referencjami oraz poziomem pewności.
- [ ] Przed etapem AI rozstrzygnięto Q09; model otrzymuje gotowe agregaty i wyniki reguł, odpowiedź przechodzi kontrolę liczb, a rozmowa pozostaje efemeryczna.
- [ ] FX, potwierdzone rozmowy, pobyty, przychód zrealizowany, zaawansowana dojrzałość, probabilistyka i cross-device pozostają oznaczone jako kolejny etap.
- [ ] Scenariusze kontroli obejmują zero, brak danych, UNKNOWN, okres w trakcie, późną anulację, duplikaty, testy, zakup wielokanałowy i journey z wieloma zdarzeniami.

**USTALONE DLA V1:** dokument został zaakceptowany jako podstawa kolejnych etapów implementacji kodu, SQL, usług i integracji, realizowanych w osobnych, zatwierdzonych zadaniach.
