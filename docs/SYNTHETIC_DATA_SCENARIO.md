# Projekt spójnych danych syntetycznych — Hotel Marketing Analyzer

Status: **0.3 — zaakceptowany scenariusz danych syntetycznych po kalibracji wszystkich źródeł**. Data: 2026-09-09.

Podstawa: [ANALYTICS_CONTRACT.md 0.2](ANALYTICS_CONTRACT.md), [BIGQUERY_DESIGN.md 0.4](BIGQUERY_DESIGN.md) oraz [DDL ga4.events_demo](../bigquery/ddl/001_create_ga4_events_demo.sql). Dokument projektuje wspólny scenariusz, bez generatora, SQL, rekordów i operacji chmurowych.

**USTALONE:** Hotel Baltic Horizon Demo, hotel_id `hotel_demo_001`, premium nad polskim morzem, dokładnie 90 kolejnych dni, PLN, Europe/Warsaw, GA4 WEB, wyłącznie dane syntetyczne i powtarzalne. **KALIBRACJA 0.3:** aktualne referencje i orientacyjne cele znajdują się w sekcjach 3.1–5. Dokładne liczebności, model powiązań i zależne KPI wymagają ponownego uzgodnienia przed generatorem; decyzje opisuje sekcja 10. Wartości demo nie stanowią progów ani benchmarków produkcyjnych.

## 1. Profil hotelu i stały czas

Obowiązujący zakres: **2026-06-01–2026-08-29 włącznie: 30 + 31 + 29 = 90 lokalnych dni**. To okno zdarzeń, emisji reklam oraz utworzenia rezerwacji. Daty pobytu mogą wykraczać poza 29 sierpnia i stanowią kontekst, nie dodatkowe dni analizy sprzedaży.

Fikcyjny obiekt: 80 pokoi i apartamentów, strefa wellness, restauracja, oferta dla par i rodzin. Lipiec ma największy ruch, sierpień utrzymuje silny popyt; czerwiec obejmuje planowanie wakacji. Są to założenia dramaturgii demo, nie wyniki badania rynku. Scenariusz nie wyznacza obłożenia ani zrealizowanego przychodu.

| Typ pobytu | Oferta syntetyczna brutto po rabatach |
|---|---|
| Weekend dla pary | 2 noce, 1800–2800 PLN za rezerwację |
| Rodzinny pobyt wakacyjny | 4–7 nocy, 4000–8000 PLN |
| Pobyt wellness | 3 noce, 2700–4200 PLN |
| Apartament premium | 3–5 nocy, 4500–9000 PLN |

Wartości uwzględniają elementy zawarte w syntetycznej rezerwacji Profitroom. Prowizje OTA i przychód zrealizowany pozostają poza zakresem. Rozkład będzie zawierał różne kwoty, a dawny model średniej 4000 PLN jest historyczną bazą wymagającą ponownego uzgodnienia po finalizacji kalibracji źródeł. Aktualna referencja wartości nieanulowanych jest w sekcji 5; rozkład cen i udział typów pobytu wymagają uzgodnienia z tą skalą.

Końcowy punkt stanu: `as_of_at = 2026-08-30T06:00:00Z` (08:00 lokalnie). Obowiązujące ładowanie: dzień po dacie źródłowej o 06:00 UTC; końcowa aktualizacja stanu Profitroom obejmuje znane wtedy anulacje. as_of_at to dokładnie 30 sierpnia 2026, 08:00 Europe/Warsaw. Loaded_at jest deterministycznym czasem scenariusza, a nie zegarem komputera wykonującego generator. Dla Profitroom source metadane czasu, hotelu, wersji i syntetyczności pozostają w lokalnym manifeście; pozostałe importy są identyfikowalne polami ich tabel; osobne logi i rejestry uruchomień pozostają poza v1.

Wszystkie 90 dni mają zadeklarowany zakres źródeł, również dni z zerowym wynikiem. Aplikacja nadal obsługuje dowolny zakres i poprzedni zakres tej samej długości. Porównanie całych 90 dni wymaga wcześniejszych 90 dni, których ten scenariusz nie zawiera: wynik zmiany otrzyma NO_DATA, a nie wymyślone porównanie. Przykład poprawnego porównania wewnątrz danych: 16–29 sierpnia do 2–15 sierpnia. Okres w trakcie testujemy kontrolowanym zegarem/punktem dostępności, bez przesuwania dat scenariusza.

## 2. Cztery źródła i wspólne identyfikatory

| Źródło | Rola i grain |
|---|---|
| `ga4.events_demo` | Jeden zaobserwowany syntetyczny event; zachowanie, intencje i etapy lejka. Istniejący DDL pozostaje bez zmian |
| `meta_ads.meta_ads_daily` — planowana | Dzienny wynik kampanii; koszt delivery oddzielony od wybranej akcji conversion zgodnie z projektem |
| `google_ads.Campaign_demo`, `CampaignBasicStats_demo`, `CampaignConversionStats_demo`, `Customer_demo` | Source query schema 1:1 widoków ads_* w my-story-sopot.my_story_sopot_dataset: 27/17/20/9 nullable pól; koszt w metrics_cost_micros INT64, konwersje w wierszach działań FLOAT64, _LATEST_DATE i _DATA_DATE zachowane. Role kampanii są konfiguracją scenariusza, nie dodatkowymi kolumnami source. Kalibracja pozostaje bez zmian. |
| `profitroom.reservations_demo` | Dokładne odwzorowanie 13 nullable pól rzeczywistej tabeli źródłowej; nowe dane syntetyczne, bez metadanych i pól canonical |

Osobny eksport Booking Engine pozostaje opcjonalny i nie jest potrzebny do tego scenariusza: wszystkie zdarzenia zachowania Booking Engine dostarcza GA4. Dane konfiguracyjne i progi nadal należą do Supabase. Ten dokument nie tworzy tam ustawień.

| Identyfikator | Obowiązująca wartość lub wzorzec |
|---|---|
| hotel_id | **USTALONE:** `hotel_demo_001` identyfikuje wspólny scenariusz; dla Google Ads jest w konfiguracji/manifeście, poza source schema |
| stream_id | `demo_web_001`, platform=WEB |
| scenario_id | `baltic_horizon_2026_v1` |
| generator_version / stałe ziarno | `ga4-demo-generator-v1` / `20260601`; przyszły algorytm i kolejność generowania muszą być wersjonowane |
| Konto Meta / Google | `demo_meta_account_001` / `demo_google_account_001` jako alias konfiguracji; source Google customer_id ma syntetyczną wartość INT64 |
| Kampanie | `demo_meta_discovery_001`, `demo_meta_packages_002`, `demo_google_brand_001`, `demo_google_general_002` |
| Grupy reklam Google | `demo_google_brand_group_001`, `demo_google_general_group_001` |
| user_pseudo_id | Syntetyczny prefiks `demo_browser_`; liczba urządzeń i braki identyfikatorów do uzgodnienia; dawny limit 12000 jest historyczny |
| Identyfikator sesji | ga_session_id jako INT64 w event_params; łączony z hotel_id, stream_id i user_pseudo_id |
| demo_event_id / raw_row_id | Deterministyczny identyfikator eventu / pozycji partii, bez zależności od rzeczywistego czasu wykonania |
| booking_id | Syntetyczny prefiks `demo_booking_`; mapowany do source_booking_id; dawny limit 600 jest historyczny, dokładny zakres do uzgodnienia |
| transaction_id | `demo_tx_000001`…; przestrzeń transakcji demo dla hotelu, odrębna od booking_id |
| batch_id | `baltic_horizon_2026_v1:<source_system>:<data>:<rewizja>` |
| Adresy | Wyłącznie wygenerowane ścieżki pod `https://baltic-horizon.example/`, np. /oferty/rodzinne |

Nazwy kont, kampanii, grup, źródeł i mapy identyfikatorów są wspólne dla odpowiadających sobie rekordów. Wszystkie połączenia zawierają hotel_id; nazwa kampanii, kwota i timestamp nie są kluczem tożsamości.

**USTALONE:** generator stosuje `hotel_demo_001` jako STRING. Mapowanie do przyszłego UUID/członkostwa Supabase jest odłożone do integracji aplikacji (S02); drugi hotel powstanie jako osobny zestaw do testów izolacji. Te czynności są odrębne od ponownego uzgodnienia liczebności i linkowania przed generatorem GA4.

Generator powstanie później według stałego algorytmu, ziarna, posortowanych kluczy i kwot w groszach. Ponowne wygenerowanie tej samej wersji daje te same ID, czasy i sumy. Scenariusz biznesowy jest wspólny, następnie każde źródło otrzymuje własny zakres obserwacji. Wiedza generatora o zdarzeniach niewidocznych dla pomiaru służy wyłącznie oczekiwanym wynikom testów — nie jest dowodem dostępnym aplikacji.

## 3. Kampanie i raporty reklamowe

**Baza historyczna 0.2:** poniższe liczby reklamowe i model czterech kampanii są historyczne; aktualne cele i role Meta oraz Google określają sekcje 3.1–3.2. Aktualną kalibrację GA4 i Profitroom opisują sekcje 4–5.

**HISTORYCZNA BAZA 0.2:** cztery kampanie są aktywne od 1 czerwca do 29 sierpnia. Identyfikatory pozostają stabilne mimo doprecyzowania nazw ról. Wszystkie kierują do oferty/Booking Engine tego hotelu i należą do demonstracyjnego zakresu kosztów; podatki, korekty i dodatkowe opłaty są poza bazowym scenariuszem.

| ID kampanii (skrót z sekcji 2) | Rola / nazwa fikcyjna | Kliknięcia | Wydatek PLN |
|---|---|---:|---:|
| meta_discovery_001 | Meta prospecting — Baltic Horizon: Odkryj wakacje | 9000 | 27000 |
| meta_packages_002 | Meta remarketing — Baltic Horizon: Pakiety i powroty | 3000 | 9000 |
| google_brand_001 | Google Brand — Baltic Horizon: Marka | 2000 | 6000 |
| google_general_002 | Google non-brand — Baltic Horizon: Wakacje nad morzem | 4000 | 18000 |
| **Meta razem** | | **12000** | **36000** |
| **Google razem** | | **6000** | **24000** |

Wyświetlenia kontrolne: Meta 1200000 (900000 + 300000), Google 120000 (40000 brand + 80000 non-brand). Każda kampania zachowuje jeden koszt delivery na dzień. Wynik platformowy ma oddzielną akcję i własne okno/model; ich dokładna specyfikacja powstanie przy tabelach Meta i Google (S04).

**Korekta spójności:** wcześniejsze liczby konwersji platformowych, ich wartości oraz założenie liczby wspólnych zakupów zostały zastąpione odroczeniem tych danych do S04. Dawna liczba różnych zakupów przewyższała nowy zbiór Booking Engine. Nowy rozkład ma wynikać ze wspólnej syntetycznej historii, ze wskazaniem zakupów zaliczanych przez obie platformy, daty raportowania i okna. Każda platforma zachowuje odrębny raport. Dawne 65 purchase GA4 jest historyczne. Licznik platformowy pozostaje odrębny od obserwacji GA4.

**Historyczna baza:** `eligible_ad_spend=60000 PLN` dla dawnych czterech kampanii wymaga ponownego uzgodnienia. Produkcyjna kwalifikacja Q01/O03 oraz implementacja konfiguracji Supabase pozostają odrębnymi zadaniami.

### 3.1. Kalibracja Meta Ads — zagregowane dane referencyjne

**Kalibracja Meta zakończona na poziomie agregatów; scenariusz 0.3 został zaakceptowany po kalibracji wszystkich źródeł.** Źródłem są przekazane przez właścicielkę zagregowane wyniki hotelu My Story Sopot za **29.08–07.09.2026 włącznie (10 dni)**. Nazwa wskazuje wyłącznie pochodzenie referencji w dokumentacji. Demo nadal przedstawia Hotel Baltic Horizon Demo i zawiera wyłącznie całkowicie syntetyczne rekordy, identyfikatory kont, kampanii, zestawów reklam i reklam, nazwy oraz kreacje. Z rzeczywistego hotelu korzystamy tylko ze skali, proporcji i zakresów zmienności; jego rekordy i wymienione elementy pozostają poza danymi demonstracyjnymi.

Demo obejmuje ustalone 90 dni i hotel około dwa razy większy. Orientacyjny mnożnik sum wynosi **90 / 10 × 2 = 18**: dziewięciokrotnie dłuższy okres i około dwukrotna skala dzienna. To założenie scenariusza, nie prognoza wyników hotelu. Przyszły generator zachowuje proporcje i nieregularne wahania między dniami, tworząc nową, powtarzalną historię syntetyczną zamiast kopiować każdy dzień dokładnie 18 razy. Daty referencji są odrębne od zakresu demo 1 czerwca–29 sierpnia 2026.

| Metryka | Referencja: 10 dni | Cel demo: 90 dni ×2 |
|---|---:|---:|
| Wydatki | 1 719,52 PLN | około 30 951,36 PLN |
| Wyświetlenia | 102 421 | około 1 843 578 |
| Wszystkie kliknięcia | 5 469 | około 98 442 |
| Kliknięcia linku | 2 032 | około 36 576 |
| Wyświetlenia strony docelowej | 1 822 | około 32 796 |
| Search / wejścia do silnika | 939 | około 16 902 |
| Dodania do koszyka | 25 | około 450 |
| Rozpoczęcia finalizacji | 4 | około 72 |
| Zakupy raportowane przez Meta | 1 | około 18 |
| Wartość zakupów raportowana przez Meta | 1 556 PLN | około 28 008 PLN |

Cele są orientacyjne; dokładne sumy i rozkład na dwie syntetyczne kampanie oraz dni zostaną uzgodnione przed generatorem Meta. Liczniki oznaczają działania raportowane przez platformę, a nie unikalnych użytkowników, sesje GA4 ani kanoniczne rezerwacje.

#### Wskaźniki referencyjne

Wskaźniki wynikają z ilorazów sum za całe 10 dni, a nie ze średniej dziennych wskaźników.

| Wskaźnik | Wzór na agregatach referencyjnych | Wynik przybliżony |
|---|---|---:|
| CTR kliknięć linku | 2 032 / 102 421 × 100% | 1,98% |
| Koszt kliknięcia linku | 1 719,52 / 2 032 | 0,85 PLN |
| CPM | 1 719,52 / 102 421 × 1 000 | 16,79 PLN |
| Wyświetlenie strony docelowej / kliknięcie linku | 1 822 / 2 032 × 100% | 89,67% |
| Search / wyświetlenie strony docelowej | 939 / 1 822 × 100% | 51,54% |
| Koszt jednego Search | 1 719,52 / 939 | 1,83 PLN |
| Koszt rozpoczęcia finalizacji | 1 719,52 / 4 | 429,88 PLN |
| Platformowy ROAS Meta | 1 556 / 1 719,52 | 0,90 |

Jeden zakup w krótkim okresie daje ograniczoną podstawę do oceny skuteczności. Wskaźniki służą kalibracji, a ocena kampanii uwzględnia wielkość próby, jakość oraz skonfigurowane progi. Iloraz wyświetleń strony docelowej do kliknięć linku opisuje agregaty Meta; potwierdzone dotarcie pojedynczego kliknięcia wymaga osobnych dowodów zgodnie z kontraktem.

#### Dzienne zakresy referencyjne

| Metryka | Zakres w jednym dniu referencji |
|---|---:|
| Wydatki | 104,40–199,81 PLN |
| Wyświetlenia | 6 408–14 350 |
| Kliknięcia linku | 144–252 |
| Wyświetlenia strony docelowej | 133–238 |
| Search | 52–146 |
| Dodania do koszyka | 0–5 |
| Rozpoczęcia finalizacji | 0–2 |
| Zakup raportowany przez Meta | Wystąpił tylko jednego dnia |

Zakresy opisują referencję, a nie sztywne limity dla dni demo. Syntetyczna zmienność uwzględnia dni z zerem rzadszych działań; same minima, maksima i sumy nie określają rzeczywistej sekwencji dziennej.

#### Kanoniczne działania i interpretacja

| Metryka działania Meta | Jedyna kanoniczna nazwa działania |
|---|---|
| Kliknięcie linku | `link_click` |
| Wyświetlenie strony docelowej | `landing_page_view` |
| Search / wejście do silnika | `offsite_conversion.fb_pixel_search` |
| Dodanie do koszyka | `offsite_conversion.fb_pixel_add_to_cart` |
| Rozpoczęcie finalizacji | `offsite_conversion.fb_pixel_initiate_checkout` |
| Zakup | `offsite_conversion.fb_pixel_purchase` |

1. Każda metryka korzysta z jednej kanonicznej nazwy działania. Aliasy takie jak `purchase`, `omni_purchase`, `onsite_web_purchase` i pozostałe odpowiedniki opisują to samo działanie w różnych klasyfikacjach Meta; wybór kanonicznej akcji zastępuje ich sumowanie.
2. Wartość zakupu z `ActionValues` jest przechowywana oddzielnie od liczby zakupów. Koszt emisji pozostaje liczony raz na kampanię i dzień, niezależnie od liczby rodzajów działań.
3. Zakupy Meta oraz ich raportowana wartość są wynikiem platformowym. Profitroom pozostaje kanonicznym źródłem istnienia rezerwacji, jej wartości, kanału, statusu i anulacji.
4. Dzienne wyniki Meta są raportem atrybucji, a nie chronologicznym lejkiem jednej osoby. Zasady i okno atrybucji mogą przypisać zakup do dnia bez rozpoczęcia finalizacji w tym samym dniu. Model, okno oraz podstawa daty wymagają jawnego ustalenia przed generatorem Meta (S04).
5. Aplikacja rozróżnia działania raportowane przez Meta, zachowanie mierzone przez GA4 oraz rezerwacje potwierdzone przez Profitroom. Search Meta i etap GA4 mają odrębne liczniki; samo podobieństwo nazw lub proporcji nie stanowi powiązania rekordów.
6. Wszystkie kliknięcia i kliknięcia linku są osobnymi metrykami; stosunek sesji do kliknięć zawsze wskazuje konkretny typ kliknięcia. Zakup platformowy i płatne powiązanie rezerwacji podlegają odrębnym zasadom kontraktu.
7. Dane referencyjne służą wyłącznie kalibracji skali, proporcji i zmienności. Przyszłe wygenerowane rekordy są całkowicie syntetyczne, ze stabilnym seedem i identyfikatorami demo.

**Przejście z bazy 0.2 do kalibracji 0.3:** powyższe cele Meta zastępują wcześniejsze 36 000 PLN, 12 000 kliknięć bez rozróżnienia typu i 1 200 000 wyświetleń. Cel zakupów wynosi około 18, wartości około 28 008 PLN; szczegóły atrybucji pozostają odłożone. Stare rozkłady i zależne KPI są wyłącznie historią opisaną w sekcji 6. Aktualne kalibracje pozostałych źródeł znajdują się w sekcjach 3.2–5.

### 3.2. Kalibracja Google Ads — zagregowane dane referencyjne

**Finalna kalibracja Google Ads została zaakceptowana.** Cały scenariusz w wersji 0.3 został zaakceptowany po kalibracji wszystkich źródeł. Referencją są przekazane zagregowane dane Google Ads w BigQuery za **07.07–29.08.2026 włącznie, czyli 54 dni**. Dane referencyjne My Story Sopot służą kalibracji; demo otrzymuje własne syntetyczne rekordy, identyfikatory i nazwy.

Kampanie referencyjne pogrupowano funkcjonalnie do **Search Generic, Brand i GHA**. Historyczne `Main` oraz `SEARCH | MAIN | PL` są kolejnymi wariantami logicznej grupy Search Generic: działały kolejno w czasie, a nie jako dwie stałe kampanie równoległe przez cały okres. Te nazwy opisują wyłącznie mapowanie referencji; struktura demo jest syntetyczna.

#### Łączne wyniki i skalowanie

Demo obejmuje 90 dni i hotel około dwa razy większy. Mnożnik wynosi **90 / 54 × 2 = 10/3 ≈ 3,3333**. Obliczenia wykorzystują pełną wartość 10/3, a cele poniżej są zaokrąglone orientacyjnie.

| Metryka | Referencja: 54 dni | Orientacyjny cel demo: 90 dni ×2 |
|---|---:|---:|
| Koszt | 7 222,24 PLN | około 24 074 PLN |
| Wyświetlenia | 66 208 | około 220 693 |
| Kliknięcia | 3 411 | około 11 370 |
| `step1_dates_and_rooms` | 1 323,15 | około 4 411 |
| `step2_extras` | 70,17 | około 234 |
| `step3_confirmation` | 19 | około 63 |
| Zakupy raportowane przez Google Ads (`Zakup`) | 3 | około 10 |
| Wartość zakupów raportowana przez Google Ads | 16 112 PLN | około 53 707 PLN |

#### Struktura kampanii referencyjnej

| Metryka | Search Generic | Brand | GHA |
|---|---:|---:|---:|
| Koszt PLN | 4 471,33 | 2 382,98 | 367,92 |
| Wyświetlenia | 54 692 | 8 405 | 3 111 |
| Kliknięcia | 2 020 | 1 259 | 132 |
| `step1_dates_and_rooms` | 467,64 | 747,51 | 108 |
| `step2_extras` | 9 | 41,17 | 20 |
| `step3_confirmation` | 1 | 13 | 5 |
| `Zakup` | 0 | 3 | 0 |

Brand ma raportowaną wartość zakupów **16 112 PLN**, a kontakty telefoniczne są osobnymi działaniami: **`Telefon`: 8**, **`Calls from ads`: 2**. Dla pozostałych grup nie przekazano osobnych wartości tych kontaktów; brak informacji pozostaje brakiem, a nie domyślnym zerem.

**Kontrola kosztów referencji:** suma przekazanych kosztów grup wynosi 7 222,23 PLN, podczas gdy przekazany wynik łączny wynosi 7 222,24 PLN. Zachowujemy oba poziomy raportu i jawną różnicę 0,01 PLN; jest to zaakceptowana różnica zaokrągleń, a nie otwarty błąd wymagający wyjaśnienia. Skalowanie orientacyjne korzysta z przekazanego wyniku łącznego. Pozostałe liczniki z tabeli grup sumują się do odpowiednich wyników łącznych.

#### Udziały referencyjne i zaakceptowany mix demo

| Grupa | Udział kosztu referencji | Udział wyświetleń referencji | Udział kliknięć referencji | Docelowy udział budżetu demo | Orientacyjny budżet demo |
|---|---:|---:|---:|---:|---:|
| Search Generic | 61,91% | 82,61% | 59,22% | **60%** | około 14 445 PLN |
| Brand | 33,00% | 12,69% | 36,91% | **35%** | około 8 425 PLN |
| GHA | 5,09% | 4,70% | 3,87% | **5%** | około 1 204 PLN |

Zaakceptowany mix budżetu jest lekko wygładzony względem referencji, zamiast odwzorowania struktury My Story Sopot 1:1. Orientacyjne budżety grup sumują się do 24 074 PLN. Dokładne kwoty w groszach i rozdział reszt zaokrągleń zostaną ustalone przed generatorem. Udział budżetu nie narzuca identycznego udziału kliknięć, wyświetleń ani konwersji; rozkład tych metryk powinien uwzględniać różne role grup i wspólne cele łączne.

#### Działania kanoniczne i interpretacja

1. Google Ads pokazuje wyniki platformowe i atrybucyjne. Każda akcja zachowuje własny licznik: `step1_dates_and_rooms`, `step2_extras`, `step3_confirmation`, `Zakup`; osobno kontakty `Telefon` i `Calls from ads`. Suma wszystkich działań nie jest liczbą rezerwacji. Kontakty pozostają odrębne również między sobą, bez założenia unikalności osób.
2. Ułamkowe wartości konwersji są dopuszczalne jako kredyty modelu atrybucji. Wartości 1 323,15 i 70,17 oznaczają wyniki Google Ads, a nie liczbę fizycznych eventów GA4. Zbieżne nazwy etapów zachowują odrębność źródła, modelu i okna.
3. Zakupy i wartości zakupów raportowane przez Google Ads pozostają wynikami platformowymi. Profitroom jest kanonicznym źródłem potwierdzonej rezerwacji, jej kanału, wartości, statusu oraz anulacji; raport Google Ads nie wyznacza prawdziwej liczby rezerwacji ani przychodu hotelu.
4. GA4 pokazuje zachowanie użytkowników i lejek. Techniczne powiązanie i kwalifikacja marketingowa rezerwacji wymagają dowodów określonych w kontrakcie. Platformowe zakupy Meta i Google są prezentowane oddzielnie.
5. Przyszły generator tworzy nowe dane oraz realistyczne, nieregularne wahania dzienne przy stałym seedzie. Agregaty referencyjne służą skali i proporcjom, zamiast mechanicznego powielania pojedynczych dni źródłowych. Wyniki atrybucyjne dnia nie muszą tworzyć chronologicznego lejka jednej osoby.
6. Trzy zakupy w 54 dniach to mała próba. Akceptacja kalibracji określa scenariusz demo, a ocena skuteczności nadal uwzględnia jakość, liczebność i progi hotelu. Model, okno i podstawa daty raportowania wymagają określenia przed generatorem Google Ads.

**Przejście z bazy 0.2:** ta sekcja zastępuje dawny model dwóch kampanii Google, 24 000 PLN kosztu, 120 000 wyświetleń i 6 000 kliknięć. Obowiązują trzy grupy Google: Search Generic, Brand i GHA, obok dwóch ról Meta. Dotychczasowe tekstowe ID Brand i kampanii ogólnej można zachować jako aliasy konfiguracji; source Google campaign_id wymaga syntetycznych wartości INT64; ID GHA i jego mapowanie do GA4 zostaną uzgodnione przed generatorami, bez kopiowania identyfikatorów referencji.

Wiersze starego Google w sekcjach 2–3 stanowią historyczną bazę 0.2. Aktualne liczebności referencyjne GA4 i Profitroom opisują sekcje 4–5; rozdzielenie syntetycznego ruchu GHA wymaga uzgodnienia. Historyczne KPI znajdują się w sekcji 6. Kalibracje czterech źródeł i scenariusz 0.3 zostały zaakceptowane; szczegóły zależności pozostają odroczone zgodnie z sekcją 10.

## 4. GA4 — aktualna kalibracja referencyjna

Referencja obejmuje **07.07–29.08.2026, 54 dni**. Mnożnik dla 90-dniowego demo hotelu około dwa razy większego wynosi **90 / 54 × 2 = 10/3 ≈ 3,3333**. Obliczenia korzystają z pełnego 10/3, a cele są orientacyjne, zaokrąglone do zdarzeń.

| Zdarzenie | Referencja: 54 dni | Orientacyjny cel demo |
|---|---:|---:|
| session_start | 27 637 | około 92 123 |
| page_view | 69 243 | około 230 810 |
| user_engagement | 37 432 | około 124 773 |
| step1_dates_and_rooms | 10 862 | około 36 207 |
| step2_extras | 582 | około 1 940 |
| step3_confirmation | 154 | około 513 |
| purchase | 24 | około 80 |
| click_tel | 177 | około 590 |
| form_submit | 71 | około 237 |
| open_apartment_details | 4 061 | około 13 537 |
| open_package_details | 1 816 | około 6 053 |
| engaged_view | Brak wystarczającej podstawy referencyjnej | Do uzgodnienia; bez celu liczbowego |
| click_mail | Brak wystarczającej podstawy referencyjnej | Do uzgodnienia; bez celu liczbowego |

Są to liczby zdarzeń, odrębne od liczby unikalnych urządzeń, sesji, journey i rezerwacji. session_start jest licznikiem zdarzeń rozpoczęcia sesji. Referencja ma więcej user_engagement niż session_start; syntetyczny model dopuszcza wiele user_engagement w sesji. Liczba urządzeń, powtarzalność sesji, rozkład zgód i zdarzenia bez identyfikatorów wymagają ponownego uzgodnienia. Dawne 116015 zdarzeń nie jest aktualną sumą. Pełna suma wszystkich 13 typów pozostaje nieustalona do decyzji o dwóch zdarzeniach bez podstawy referencyjnej i dokładnych liczebnościach generatora.

### 4.1. Referencyjny lejek zdarzeniowy

| Iloraz liczników | Obliczenie | Wynik |
|---|---|---:|
| session_start → step1 | 10862 / 27637 | 39,30% |
| step1 → step2 | 582 / 10862 | 5,36% |
| step2 → step3 | 154 / 582 | 26,46% |
| step3 → purchase | 24 / 154 | 15,58% |
| session_start → purchase | 24 / 27637 | około 0,087% |

**Te proporcje są ilorazami liczby zdarzeń w agregacie. Nie stanowią dowodu, że te same osoby lub sesje przechodziły kolejno przez wszystkie etapy.** Nie wyznaczają też liczby przerwanych indywidualnych ścieżek.

Osobny syntetyczny model indywidualnych ścieżek może określić kolejność zdarzeń, powroty i braki pomiaru, ale wymaga ponownego uzgodnienia przed generatorem. Dawny wymóg jednej obserwacji każdego etapu w sesji oraz pełnego lejka dla każdego purchase nie wynika z referencji. form_submit pozostaje gałęzią kontaktową, a nie rezerwacją. step3_confirmation pozostaje nazwą trzeciego etapu. Okno obserwowanych ścieżek wynosi 30 dni; wiarygodność łączenia zależy od dostępnych identyfikatorów, a nie od podobieństwa agregatów.

### 4.2. Kanały i urządzenia referencyjne

| Kanał | Przybliżony udział w sesjach |
|---|---:|
| Paid Social | 35,01% |
| Paid Search | 14,67% |
| Organic Search | 13,67% |
| Referral | 11,14% |
| Unassigned | 11,04% |
| Organic Social | 6,94% |
| Direct | 6,21% |

Podane udziały sumują się do 98,68%. Pozostałe 1,32 punktu procentowego wymaga ustalenia zakresu pozostałych kategorii; nie przypisujemy go samodzielnie do Direct ani Unassigned i nie normalizujemy tabeli do 100%. Dokładny podział kanałów demo, w tym Brand i GHA, pozostaje do uzgodnienia.

**Mobile: około 87,45% sesji.** Dawne 70% mobile jest historyczne. Podział pozostałych urządzeń wymaga danych lub osobnej decyzji. Pierwsze źródło urządzenia jest odrębne od źródła sesji; Direct oraz nieznane źródło pozostają różnymi kategoriami. Sesje i kliknięcia reklam są różnymi jednostkami, a różnica ich liczników sama nie dowodzi awarii ani utraty pomiaru.

### 4.3. Purchase i wartość

W **24 referencyjnych purchase brakowało wiarygodnego przychodu GA4**. Brak wartości nie oznacza zera. GA4 dostarcza obserwacji zachowania i lejka, a Profitroom pozostaje kanonicznym źródłem wartości rezerwacji. Sposób reprezentacji braków wartości w demo i ewentualnych zweryfikowanych par wymaga uzgodnienia; nie odtwarzamy przychodu GA4 z samego agregatu Profitroom.

## 5. Profitroom — aktualna kalibracja źródła rezerwacji

**Doprecyzowanie schematu: source schema ≠ canonical schema.** Demo odwzorowuje 1:1 nazwy, typy, nullable i kolejność 13 kolumn rzeczywistej tabeli (DDL 004). Źródło → przyszły adapter / canonical reservations → hma_core → hma_app. Warstwa canonical pozostaje odroczona.

Dane demo używają kanałów Booking.com, Expedia, Booking Engine. `Data anulacji IS NOT NULL` oznacza anulowaną; NULL oznacza brak informacji o anulowaniu. „Nieanulowane” w poniższej kalibracji jest skrótem dla rekordów bez daty anulacji, a nie statusem aktywnym. `Wartość`, `Zapłacono` i `Pozostało do zapłaty` mają typ FLOAT64; generator oblicza kwoty w groszach i zachowuje sumę wpłaty oraz pozostałej kwoty równą wartości. Anulacja nie zeruje automatycznie wartości. Oferta i typ pokoju są całkowicie syntetyczne. Metadane scenariusza i czasu pozostają w manifeście; tabela nie zawiera pól kanonicznych, technicznych ani linkage.

Referencja obejmuje **54 dni**. Mnożnik: **90 / 54 × 2 = 10/3 ≈ 3,3333**. Profitroom pozostaje kanonicznym źródłem rezerwacji, kanału, wartości i anulacji.

| Metryka | Referencja | Orientacyjny cel demo |
|---|---:|---:|
| Wszystkie rezerwacje | 83 | około 277 |
| Nieanulowane | 69 | około 230 |
| Anulowane | 14 | około 47 |
| Wartość nieanulowanych | 171 918,61 PLN | około 573 062 PLN |
| Średnia wartość nieanulowanej rezerwacji | około 2 491,57 PLN | Wzorzec rozkładu wartości, bez nowego KPI |
| Wszystkie rezerwacje Booking Engine | 11 | około 37 |

| Kanał referencyjny | Wszystkie | Nieanulowane |
|---|---:|---:|
| Booking.com | 50 | 40 |
| Expedia | 22 | 20 |
| Booking Engine | 11 | 9 |
| Razem | 83 | 69 |

Dokładne całkowite liczebności demo i podział kanałów wymagają uzgodnienia z zaokrągleniami. Skala ×2 zwiększa łączną liczbę i wartość rezerwacji, a nie automatycznie cenę pojedynczej rezerwacji.

**Status dostępny w referencji:** nieanulowane albo anulowane. Ta tabela nie potwierdza statusów confirmed, completed ani active. Dawne confirmed/completed były elementem czysto syntetycznego modelu 0.2; obecna referencja ich nie potwierdza, a ich przyszłe generowanie wymaga jawnej decyzji.

Kontrakt definiuje aktywne rezerwacje przez confirmed/completed. Samo „nieanulowane” nie wystarcza do ustalenia tego mianownika. Dostępność statusów, ewentualny syntetyczny model oraz KPI aktywnych rezerwacji pozostają do uzgodnienia. Brak potwierdzenia oznacza brak gotowego wyniku KPI, zamiast automatycznej zamiany nieanulowanych na aktywne.

## 6. Powiązania GA4–Profitroom i zależne KPI — do ponownego uzgodnienia

Nowe orientacyjne cele to **80 purchase GA4** i **37 wszystkich rezerwacji Booking Engine**. Są to różne obserwacje. Agregaty referencyjne nie pozwalają ustalić relacji 1:1 ani przyjąć `1 GA4 purchase = 1 Booking Engine reservation`. Nie wyjaśniają również przyczyny różnicy; nie dopisujemy duplikatów, brakujących rezerwacji ani fikcyjnych powiązań jako rzekomo potwierdzonego rozwiązania.

Finalny syntetyczny model linkowania wymaga osobnego ponownego uzgodnienia. Zweryfikowany transaction_id potwierdza tożsamość rezerwacji; płatne powiązanie wymaga dodatkowego dowodu marketingowego. OTA, telefon i e-mail pozostają poza mianownikiem pokrycia Booking Engine.

Poniższe wartości są wyłącznie **historyczną bazą wymagającą ponownego uzgodnienia po finalizacji kalibracji źródeł**; nie obowiązują jako cele generatora ani KPI:

| Historyczne założenie 0.2 | Stan po kalibracji |
|---|---|
| 18000 sesji, 12000 urządzeń, 116015 eventów; lejek 18000 → 6840 → 1250 → 430 → 65 | Zastąpione kalibracją GA4; liczba urządzeń i pełna suma do uzgodnienia |
| engaged_view 9000, click_mail 180; mobile 70%; dawne macierze kanałów i urządzeń | Brak aktualnej akceptacji tych celów |
| Zgody 15000/3000 sesji, 1500 anonimowych odsłon i 2500 niewidocznych wizyt | Syntetyczny model braków i zgód do uzgodnienia |
| 600 rezerwacji, 480 aktywnych, 90 anulowanych, 30 innych; 1920000 PLN; średnia 4000 PLN | Zastąpione referencją i celami Profitroom |
| Booking Engine 150 wszystkich / 120 aktywnych; 810 rewizji | Liczebności i historia statusów do uzgodnienia |
| 65 purchase przypisanych do 65 różnych rezerwacji Booking Engine; 50 linked, 8 bez ID, 7 bez mapy | Model relacji wycofany z części obowiązującej |
| 56 później aktywnych, 9 anulowanych purchase; 44 połączone aktywne; pokrycie 46,67% i 36,67% | Historyczne; nowego pokrycia nie ustalono |
| 64 braki pomiaru podzielone 32+18+14; wspólne kwoty wszystkich 65 purchase | Przyczyny braków, liczby i kwoty par do uzgodnienia |
| 50 ścieżek, pokrycie 76,92%, Meta na początku 48%, podziały domknięć | Historyczne; nowy rozkład ścieżek do uzgodnienia |
| 30 płatnie powiązanych o wartości 120000 PLN i 14 pozostałych o wartości 56000 PLN | Historyczne; brak nowych liczników linked |
| Meta 36000 PLN + Google 24000 PLN = 60000 PLN; koszt online 500 PLN; kandydat linked ROAS 2,00 | Historyczne; bez nowych KPI w tym zadaniu |
| Udział direct_web 25%, anulacje 15%, wzrosty bloków 33,33% i 25% | Historyczne wyniki starego bilansu |
| Sesje/kliknięcia Meta 60%, Google 80%; równość 18000 kliknięć i sesji | Historyczne porównania, nie aktualne wskaźniki |

Linked ROAS wymaga pięciu warunków: jednoznacznego połączenia purchase z aktywną rezerwacją; dodatkowego kwalifikującego powiązania płatnego; zgodnego zakresu kosztu; jednokrotnego uwzględnienia wartości rezerwacji; wystarczającego pokrycia i jakości. Do ich spełnienia wynik pozostaje NULL z metric_status i reason_codes. Nieznane pokrycie pozostaje UNKNOWN. Nowe KPI kosztowe, ROAS i pokrycia będą ustalone oddzielnie, bez wyliczania ich z nieuzgodnionych mianowników.

## 7. Rozkład 90 dni — do ponownego uzgodnienia

Zakres 1 czerwca–29 sierpnia 2026 pozostaje stały. Dawne trzy bloki po 30 dni oraz ich sumy sesji, kosztów i rezerwacji są historyczne; nie są ograniczeniami nowego generatora. Dokładne rozkłady dzienne i kampanijne wymagają uzgodnienia po kalibracji. Przyszły generator zachowa sumy zatwierdzonej wersji, deterministyczny sposób rozdziału reszt i realistyczną nieregularność, bez kopiowania rzeczywistych dni.

## 8. Reguły spójności i syntetyczności

1. Demo obejmuje 90 lokalnych dni, PLN, Europe/Warsaw, WEB oraz stałe as_of_at i loaded_at z sekcji 1. Daty pobytu i importu są odrębne od daty utworzenia rezerwacji i zdarzenia.
2. Powstają całkowicie nowe rekordy, identyfikatory, nazwy kampanii i rezerwacje. Dane referencyjne są wzorcem proporcji i skali; generator nie kopiuje klientów, numerów rezerwacji, adresów ani rekordów i dni rzeczywistych hoteli, ani mechanicznie ich nie powiela.
3. Jednostki event, sesja, urządzenie, journey i rezerwacja pozostają rozdzielone. Własny model historii syntetycznych wymaga uzgodnienia, a raporty platform zachowują ich model, okno i podstawę daty.
4. Meta i Google dostarczają odrębnych wyników platformowych; GA4 zachowania i lejka; Profitroom rezerwacji, kanału, wartości i anulacji. Spójność nie oznacza fikcyjnej ścieżki 1:1 przez wszystkie źródła.
5. Każde źródło ma własne pokrycie obserwacji. Brak identyfikatora oznacza ograniczenie łączenia; Direct, Unassigned i brak danych są rozróżniane. Ukryta wiedza generatora służy testom, a nie dowodom dostępnym aplikacji.
6. Wartości wspólnych, rzeczywiście zaprojektowanych i zweryfikowanych par podlegają regułom uzgodnionego linkowania. Brak wiarygodnej wartości GA4 pozostaje brakiem, a nie automatycznie wartością Profitroom.
7. Kwoty powstają i są obliczane w groszach. FLOAT64 w GA4 odzwierciedla istniejący DDL; dokładne kwoty i rozkłady są przedmiotem projektu generatora.
8. Koszt emisji jest liczony raz na kampanię i dzień, niezależnie od liczby akcji konwersji. Sumy kampanii i źródeł muszą odpowiadać zatwierdzonym dokładnym celom, zamiast historycznemu 60000 PLN.
9. Identyfikatory, sortowanie, seed i wersja są deterministyczne. Hotel jest częścią każdego połączenia. Nowa wersja algorytmu jest jawna, bez ukrytej zmiany znaczenia identyfikatorów.
10. Kontrole schematu, dat, unikalności, sekwencji syntetycznych, braków i powtarzalności wynikną z uzgodnionego modelu. Pełne dostarczenie źródła nie oznacza pełnego pomiaru wszystkich gości.

## 9. Przypadki testowe — osobno od bazowych sum

Liczebności kontrolowanych braków wymagają ponownego uzgodnienia zgodnie z sekcją 6. Poniższe dodatkowe warianty awarii są odrębnymi uruchomieniami testowymi, a nie dodatkowymi rekordami bazowego scenariusza. Nie wymagają osobnych tabel ani datasetu ops.

| Przypadek | Oczekiwane zachowanie późniejszej aplikacji/przetwarzania |
|---|---|
| Ponowienie identycznej partii | Te same sumy i identyfikatory, bez podwójnych eventów/kosztów |
| Powtórzone purchase | Jeden zakup po deduplikacji, widoczna jakość duplikatów |
| Transaction wskazuje dwa booking_id | INVALID_DATA/niejednoznaczne połączenie, wartość poza wynikiem linked |
| Purchase połączony, bez płatnego dowodu | Tożsamość potwierdzona; poza licznikiem płatnie powiązanym |
| Anulacja czerwcowej rezerwacji w sierpniu | Korekta czerwcowych aktywnych i wartości, bez nowego utworzenia |
| Usunięty dzień raportu reklam | NO_DATA/PARTIAL_DATA, brak nie jest zerowym wydatkiem |
| Zmierzony dzień bez konwersji | Zero konwersji, koszt konwersji NULL z ZERO_DENOMINATOR |
| Okres z 1–2 zakupami | Ograniczona próba, oczekiwanie na próg; bez automatycznej negatywnej oceny |
| Brak mianownika pokrycia płatnego | UNKNOWN i NULL zależnego linked ROAS |
| Inny zakres kosztów | NOT_COMPARABLE/COST_SCOPE_MISMATCH |
| Kwota EUR w jednym rekordzie | CURRENCY_MISMATCH; brak automatycznego FX |
| Rekord testowy Profitroom | Wyłączenie wersjonowaną regułą; licznik wyłączeń widoczny |
| Event przed i po lokalnej północy | Prawidłowe metric_date i partycja; zgodność event_date z source_timezone |
| Pełne 90 dni vs brak wcześniejszych 90 | NO_DATA dla zmiany okresowej; dostępne sumy bieżące |
| Ograniczona aktualność w środku zakresu | „Okres w trakcie” według kontrolowanego zegara i jawna dostępność |
| Ten sam ID w innym hotelu | Test izolacji wymaga drugiego fixture hotelu — S02; aktualny scenariusz jednego hotelu go nie zalicza |
| Pierwszy kontakt Meta, końcowy Brand lub Direct | Oddzielny pierwszy i ostatni zaobserwowany kontakt, bez wniosku przyczynowego |
| Ruch Meta i rezerwacje OTA rosną jednocześnie | Opis korelacji; brak przypisania OTA do reklamy |

Zmiana czasu nie przypada w ustalonych 90 dniach. Test DST z kontraktu wymaga odrębnego fixture poza tym zakresem, a nie rozszerzenia bazowego okresu. O12 pozostaje odroczona do implementacji agregatów hma_core.

## 10. Decyzje S01–S09 i terminy dalszej realizacji

Wersja 0.3 zawiera referencje wszystkich czterech źródeł i cele orientacyjne. Gotowość generatora wymaga ponownego uzgodnienia zależności poniżej; historyczna akceptacja 0.2 nie zatwierdza ich nowych wartości.

| ID | Zachowane lub skalibrowane | Do uzgodnienia i termin |
|---|---|---|
| S01 | Hotel, zakres 90 dni, as_of_at, loaded_at, strefa i stały zegar | Produkcyjny harmonogram przed automatycznym importem |
| S02 | hotel_demo_001 i syntetyczne przestrzenie ID | Mapowanie Supabase przed integracją; drugi hotel przed testami izolacji |
| S03 | Referencja GA4 i orientacyjne cele sekcji 4 | engaged_view, click_mail, dokładne sumy, liczba urządzeń/sesji, brakujące 1,32 p.p. kanałów i ich rozkład, urządzenia — przed generatorem GA4 |
| S04 | Meta ×18; Google ×10/3, mix 60/35/5; 0,01 PLN zaakceptowane jako zaokrąglenie | Dokładne rozkłady kampanii/dni, ID i mapowanie GHA, model/okno/data raportów — przed generatorami reklam; zakres kwalifikacji i KPI — przed regułami |
| S05 | Braki pomiaru są odrębne od zer i Direct | Zgody, maskowanie i liczby braków przed generatorem; pokrycie, progi i pewność przed regułami |
| S06 | 30-dniowe okno; lejek referencyjny jest ilorazem eventów | Syntetyczne sekwencje i wielokrotność zdarzeń przed generatorem; lifecycle i kohorty journey przed hma_core |
| S07 | scenario_id, stream_id, seed, generator_version, .example i sortowanie | Algorytm, dokładne liczebności i test powtarzalności przed generowaniem |
| S08 | Referencja Profitroom, nieanulowane/anulowane, orientacyjne cele sekcji 5 | Dokładny bilans i kanały, ewentualne syntetyczne confirmed/completed, historia rewizji, model purchase–booking, liczby i wartości par — przed zależnymi generatorami; agregaty nie rozstrzygają relacji 1:1 |
| S09 | Zasady kontroli i osobne warianty awarii | Nowe oczekiwane wyniki testów po uzgodnieniu modelu; implementacja przy odpowiednich źródłach i hma_core |

O11 i O12 pozostają odłożone do hma_core. Uprawnienia, konfiguracja Supabase, AI i ochrona kosztów zachowują ustalenia kontraktu. Ich implementacja jest odrębnym zadaniem.

## 11. Akceptacja scenariusza i późniejsze kontrole

- [x] Zachowano hotel, zakres 90 dni, PLN, Europe/Warsaw, WEB i stały czas.
- [x] Zakończono i zaakceptowano kalibrację GA4 za 54 dni oraz orientacyjne cele ×10/3.
- [x] Zakończono i zaakceptowano kalibrację Profitroom za 54 dni oraz orientacyjne cele ×10/3.
- [x] Zakończono i zaakceptowano kalibrację Meta Ads za 10 dni oraz orientacyjne cele ×18.
- [x] Zakończono i zaakceptowano kalibrację Google Ads za 54 dni, cele ×10/3 i mix 60% / 35% / 5%.
- [x] Potwierdzono spójność interpretacji czterech źródeł: wyniki platformowe, zachowanie GA4 i kanoniczne rezerwacje Profitroom.
- [x] Właścicielka zaakceptowała scenariusz 0.3 jako podstawę kolejnych prac.
- [x] Rozdzielono eventy od sesji i rezerwacji oraz nieanulowane od niepotwierdzonych statusów active/confirmed/completed.
- [x] Wycofano stare liczebności, powiązania i KPI z części obowiązującej; pozostają historią 0.2.
- [ ] Uzgodniono dokładne liczebności, kanały, urządzenia, zgody i zdarzenia bez referencji.
- [ ] Uzgodniono nowy model linkowania, statusów i wartości oraz oczekiwane pokrycie, zamiast historycznego bilansu 65/50/8/7.
- [ ] Uzgodniono zależne KPI, w tym linked bookings, pokrycie, linked ROAS i koszt rezerwacji.
- [ ] Przygotowano i zweryfikowano DDL pozostałych tabel oraz hma_app; załadowano dane demo.
- [ ] Generator i testy potwierdzają zatwierdzony model, sumy, daty, unikalność, braki i powtarzalność.
- [ ] hma_core i reguły zachowują pięć warunków linked ROAS, NULL, UNKNOWN i rozdzielenie jednostek.
- [ ] Osobne testy izolacji hoteli, DST i awarii wykonano w odpowiednich etapach.

Scenariusz danych syntetycznych w wersji 0.3 został zaakceptowany. Kalibracja GA4, Profitroom, Meta Ads i Google Ads stanowi podstawę projektowania schematów tabel i generatora. Otwarte kwestie pozostają celowo odroczone do odpowiednich dalszych etapów wskazanych w sekcji 10. Akceptacja scenariusza nie oznacza gotowości generatora ani tabel demo, wykonania modelu linkowania, zależnych KPI, hma_core, hma_app, ładowania danych ani testów końcowych.
