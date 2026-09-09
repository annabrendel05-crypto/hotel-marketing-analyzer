# Projekt spójnych danych syntetycznych — Hotel Marketing Analyzer

Status: **0.2 — zaakceptowany scenariusz danych syntetycznych v1**. Data: 2026-09-09.

Podstawa: [ANALYTICS_CONTRACT.md 0.2](ANALYTICS_CONTRACT.md), [BIGQUERY_DESIGN.md 0.4](BIGQUERY_DESIGN.md) oraz [DDL ga4.events_demo](../bigquery/ddl/001_create_ga4_events_demo.sql). Dokument projektuje wspólny scenariusz, bez generatora, SQL, rekordów i operacji chmurowych.

**USTALONE:** Hotel Baltic Horizon Demo, hotel_id `hotel_demo_001`, premium nad polskim morzem, dokładnie 90 kolejnych dni, PLN, Europe/Warsaw, GA4 WEB, wyłącznie dane syntetyczne i powtarzalne. **USTALONE DLA DEMO:** poniższe zasady czasu, liczebności GA4, bilans Profitroom, identyfikatory i kontrolowane braki są podstawą generatora GA4. Pozostałe decyzje wdrożeniowe mają terminy w sekcji 10; nie blokują tego generatora. Wartości demo nie stanowią progów ani benchmarków produkcyjnych.

## 1. Profil hotelu i stały czas

Obowiązujący zakres: **2026-06-01–2026-08-29 włącznie: 30 + 31 + 29 = 90 lokalnych dni**. To okno zdarzeń, emisji reklam oraz utworzenia rezerwacji. Daty pobytu mogą wykraczać poza 29 sierpnia i stanowią kontekst, nie dodatkowe dni analizy sprzedaży.

Fikcyjny obiekt: 80 pokoi i apartamentów, strefa wellness, restauracja, oferta dla par i rodzin. Lipiec ma największy ruch, sierpień utrzymuje silny popyt; czerwiec obejmuje planowanie wakacji. Są to założenia dramaturgii demo, nie wyniki badania rynku. Scenariusz nie wyznacza obłożenia ani zrealizowanego przychodu.

| Typ pobytu | Oferta syntetyczna brutto po rabatach |
|---|---|
| Weekend dla pary | 2 noce, 1800–2800 PLN za rezerwację |
| Rodzinny pobyt wakacyjny | 4–7 nocy, 4000–8000 PLN |
| Pobyt wellness | 3 noce, 2700–4200 PLN |
| Apartament premium | 3–5 nocy, 4500–9000 PLN |

Wartości uwzględniają elementy zawarte w syntetycznej rezerwacji Profitroom. Prowizje OTA i przychód zrealizowany pozostają poza zakresem. Rozkład będzie zawierał różne kwoty, a sumy kontrolne poniżej mają średnią 4000 PLN na aktywną rezerwację; nie oznacza to identycznej ceny każdej rezerwacji.

Końcowy punkt stanu: `as_of_at = 2026-08-30T06:00:00Z` (08:00 lokalnie). Obowiązujące ładowanie: dzień po dacie źródłowej o 06:00 UTC; końcowa aktualizacja stanu Profitroom obejmuje znane wtedy anulacje. as_of_at to dokładnie 30 sierpnia 2026, 08:00 Europe/Warsaw. Loaded_at jest deterministycznym czasem scenariusza, a nie zegarem komputera wykonującego generator. Importy są identyfikowalne polami tabel; osobne logi i rejestry uruchomień pozostają poza v1.

Wszystkie 90 dni mają zadeklarowany zakres źródeł, również dni z zerowym wynikiem. Aplikacja nadal obsługuje dowolny zakres i poprzedni zakres tej samej długości. Porównanie całych 90 dni wymaga wcześniejszych 90 dni, których ten scenariusz nie zawiera: wynik zmiany otrzyma NO_DATA, a nie wymyślone porównanie. Przykład poprawnego porównania wewnątrz danych: 16–29 sierpnia do 2–15 sierpnia. Okres w trakcie testujemy kontrolowanym zegarem/punktem dostępności, bez przesuwania dat scenariusza.

## 2. Cztery źródła i wspólne identyfikatory

| Źródło | Rola i grain |
|---|---|
| `ga4.events_demo` | Jeden zaobserwowany syntetyczny event; zachowanie, intencje i etapy lejka. Istniejący DDL pozostaje bez zmian |
| `meta_ads.meta_ads_daily` — planowana | Dzienny wynik kampanii; koszt delivery oddzielony od wybranej akcji conversion zgodnie z projektem |
| `google_ads.google_ads_daily` — planowana | Analogiczny raport Google, własny model i okno; brand jest rozłączną klasą kampanii płatnych |
| `profitroom.profitroom_booking_revisions` — planowana | Rewizja jednej rezerwacji; po wyborze aktualnego stanu jedna kanoniczna rezerwacja na hotel i booking_id |

Osobny eksport Booking Engine pozostaje opcjonalny i nie jest potrzebny do tego scenariusza: wszystkie zdarzenia zachowania Booking Engine dostarcza GA4. Dane konfiguracyjne i progi nadal należą do Supabase. Ten dokument nie tworzy tam ustawień.

| Identyfikator | Obowiązująca wartość lub wzorzec |
|---|---|
| hotel_id | **USTALONE:** `hotel_demo_001` we wszystkich czterech źródłach |
| stream_id | `demo_web_001`, platform=WEB |
| scenario_id | `baltic_horizon_2026_v1` |
| generator_version / stałe ziarno | `ga4-demo-generator-v1` / `20260601`; przyszły algorytm i kolejność generowania muszą być wersjonowane |
| Konto Meta / Google | `demo_meta_account_001` / `demo_google_account_001` |
| Kampanie | `demo_meta_discovery_001`, `demo_meta_packages_002`, `demo_google_brand_001`, `demo_google_general_002` |
| Grupy reklam Google | `demo_google_brand_group_001`, `demo_google_general_group_001` |
| user_pseudo_id | `demo_browser_000001`…`demo_browser_012000`; NULL w zaprojektowanych brakach |
| Identyfikator sesji | ga_session_id jako INT64 w event_params; łączony z hotel_id, stream_id i user_pseudo_id |
| demo_event_id / raw_row_id | Deterministyczny identyfikator eventu / pozycji partii, bez zależności od rzeczywistego czasu wykonania |
| booking_id | `demo_booking_000001`…`demo_booking_000600`; mapowany do source_booking_id w planowanej tabeli Profitroom |
| transaction_id | `demo_tx_000001`…; przestrzeń transakcji demo dla hotelu, odrębna od booking_id |
| batch_id | `baltic_horizon_2026_v1:<source_system>:<data>:<rewizja>` |
| Adresy | Wyłącznie wygenerowane ścieżki pod `https://baltic-horizon.example/`, np. /oferty/rodzinne |

Nazwy kont, kampanii, grup, źródeł i mapy identyfikatorów są wspólne dla odpowiadających sobie rekordów. Wszystkie połączenia zawierają hotel_id; nazwa kampanii, kwota i timestamp nie są kluczem tożsamości.

**USTALONE:** generator stosuje `hotel_demo_001` jako STRING. Mapowanie do przyszłego UUID/członkostwa Supabase jest odłożone do integracji aplikacji (S02); drugi hotel powstanie jako osobny zestaw do testów izolacji. Żadna z tych czynności nie blokuje GA4.

Generator powstanie później według stałego algorytmu, ziarna, posortowanych kluczy i kwot w groszach. Ponowne wygenerowanie tej samej wersji daje te same ID, czasy i sumy. Scenariusz biznesowy jest wspólny, następnie każde źródło otrzymuje własny zakres obserwacji. Wiedza generatora o zdarzeniach niewidocznych dla pomiaru służy wyłącznie oczekiwanym wynikom testów — nie jest dowodem dostępnym aplikacji.

## 3. Kampanie i raporty reklamowe

**USTALONE DLA DEMO:** cztery kampanie są aktywne od 1 czerwca do 29 sierpnia. Identyfikatory pozostają stabilne mimo doprecyzowania nazw ról. Wszystkie kierują do oferty/Booking Engine tego hotelu i należą do demonstracyjnego zakresu kosztów; podatki, korekty i dodatkowe opłaty są poza bazowym scenariuszem.

| ID kampanii (skrót z sekcji 2) | Rola / nazwa fikcyjna | Kliknięcia | Wydatek PLN |
|---|---|---:|---:|
| meta_discovery_001 | Meta prospecting — Baltic Horizon: Odkryj wakacje | 9000 | 27000 |
| meta_packages_002 | Meta remarketing — Baltic Horizon: Pakiety i powroty | 3000 | 9000 |
| google_brand_001 | Google Brand — Baltic Horizon: Marka | 2000 | 6000 |
| google_general_002 | Google non-brand — Baltic Horizon: Wakacje nad morzem | 4000 | 18000 |
| **Meta razem** | | **12000** | **36000** |
| **Google razem** | | **6000** | **24000** |

Wyświetlenia kontrolne: Meta 1200000 (900000 + 300000), Google 120000 (40000 brand + 80000 non-brand). Każda kampania zachowuje jeden koszt delivery na dzień. Wynik platformowy ma oddzielną akcję i własne okno/model; ich dokładna specyfikacja powstanie przy tabelach Meta i Google (S04).

**Korekta spójności:** wcześniejsze liczby konwersji platformowych, ich wartości oraz założenie liczby wspólnych zakupów zostały zastąpione odroczeniem tych danych do S04. Dawna liczba różnych zakupów przewyższała nowy zbiór Booking Engine. Nowy rozkład ma wynikać ze wspólnej syntetycznej historii, ze wskazaniem zakupów zaliczanych przez obie platformy, daty raportowania i okna. Każda platforma zachowuje odrębny raport. To nie zmienia 65 purchase GA4 ani nie wymaga dopisywania zdarzeń GA4, by uzyskać wynik reklamowy.

`eligible_ad_spend=60000 PLN` w demonstracyjnym zakresie czterech kampanii. Produkcyjna kwalifikacja Q01/O03 oraz implementacja konfiguracji Supabase pozostają odrębnymi zadaniami.

## 4. GA4 — liczebności i konstrukcja ścieżek

### 4.1. Jednostki, urządzenia i zgody

| Wielkość | Ustalona liczba |
|---|---:|
| Obserwowalne unikalne user_pseudo_id | 12000 |
| Sesje z kompletnym kluczem urządzenie + sesja | 18000 |
| Sesje mobile / desktop | 12600 / 5400 |
| Identyfikatory mobile / desktop | 8400 / 3600 |
| Sesje z syntetycznym analytics_storage=Yes, ads_storage=Yes | 15000 |
| Sesje analytics_storage=Yes, ads_storage=No | 3000 |
| Dodatkowe page_view z analytics_storage=No i user_pseudo_id=NULL | 1200 |
| Dodatkowe page_view z nieznanym stanem zgody i user_pseudo_id=NULL | 300 |
| Wizyty bez żadnego eventu w GA4 — tylko wiedza scenariusza | 2500 |

Podział liczby sesji użytkownika: 8000 identyfikatorów ma jedną sesję, 2000 ma dwie, 2000 ma trzy: 8000 + 4000 + 6000 = 18000. Identyfikator oznacza przeglądarkę/urządzenie, nie osobę. Nie łączymy mobile i desktop w jedną osobę. 1500 bezidentyfikatorowych page_view jest poza 18000 identyfikowalnych sesji i poza 12000 użytkowników.

**Obowiązujący rozkład privacy_info:** wszystkie zdarzenia danej identyfikowalnej sesji dziedziczą jej stan. 15000 sesji ma `(analytics_storage=Yes, ads_storage=Yes, uses_transient_token=NULL)`, a 3000 `(Yes, No, NULL)`. 1200 anonimowych page_view ma `(No, No, NULL)`, a 300 `(NULL, NULL, NULL)`. Nieznany mechanizm tokenów pozostaje NULL. Te cztery rozłączne grupy obejmują wszystkie rekordy: 114515 zdarzeń w identyfikowalnych sesjach oraz 1500 anonimowych odsłon. Liczby eventów w dwóch grupach sesji wynikną z ich historii; liczby sesji są stałe.

Wszystkie 65 purchase występuje w sesjach z analytics_storage=Yes: 50 technicznie powiązanych w grupie ads_storage=Yes, 15 niepołączonych w grupie ads_storage=No. Sam stan zgody nie potwierdza płatnego pochodzenia. Stan jest stały w danej sesji; generator zachowuje jawne ograniczenia historii między sesjami.

Anonimowe 1500 page_view ma user_pseudo_id=NULL, brak ga_session_id oraz brak przypisania do konkretnej rezerwacji lub journey. demo_event_id identyfikuje rekord, nie urządzenie. Nie łączymy ich po czasie, adresie ani batch_id. Również 2500 całkowicie niewidocznych wizyt pozostaje wyłącznie wiedzą scenariusza. Powyższy rozkład jest syntetycznym modelem ograniczeń, nie implementacją consent mode ani benchmarkiem rynku.

### 4.2. Wszystkie 13 zdarzeń

Liczby oznaczają fizyczne eventy w bazowej tabeli, nie sumę różnych jednostek lejka.

| Jednostka | Obowiązująca interpretacja |
|---|---|
| Zdarzenie | Jeden rekord; 116015 rekordów obejmuje powtarzalne odsłony |
| Sesja | Jeden pełny klucz hotel + stream + user_pseudo_id + ga_session_id; 18000 session_start oznacza 18000 sesji |
| Urządzenie/przeglądarka | 12000 różnych syntetycznych user_pseudo_id; to nie liczba potwierdzonych osób |
| Etap w sesji | Maksymalnie jedno wystąpienie danego etapu, więc liczba eventów etapu równa się liczbie sesji tego etapu |
| Rezerwacja | Kanoniczny booking_id Profitroom; 600 rezerwacji, niezależnie od liczby rewizji i eventów |
| Journey | Wielosesyjna sekwencja urządzenia; jej licznik kohortowy zostanie wyznaczony w hma_core, osobno od 18000 sesji |


| event_name | Liczba | Znaczenie scenariusza |
|---|---:|---|
| session_start | 18000 | Dokładnie jeden na identyfikowalną sesję |
| page_view | 55500 | 54000 w sesjach + 1500 bez klucza sesji/użytkownika |
| user_engagement | 12000 | Jeden w każdej z 12000 sesji zaangażowanych |
| engaged_view | 9000 | Jeden na wybraną sesję kwalifikowanego obejrzenia; podzbiór zaangażowanych |
| step1_dates_and_rooms | 6840 | Unikalna sesja wybiera termin i pokój |
| step2_extras | 1250 | Podzbiór step1, po wyborze pokoju |
| step3_confirmation | 430 | Podzbiór step2, etap potwierdzenia przed zakupem |
| purchase | 65 | 65 różnych obserwowanych zakupów, bez duplikatów w bazie |
| click_tel | 450 | Kliknięcia telefonu jako intencja |
| click_mail | 180 | Kliknięcia e-maila jako intencja |
| form_submit | 300 | Wysłanie fikcyjnego formularza, odrębne od zakupu |
| open_apartment_details | 6500 | Obejrzenie szczegółów apartamentu |
| open_package_details | 5500 | Obejrzenie szczegółów pakietu |
| **Razem** | **116015** | W tym 1500 eventów poza identyfikowalnymi sesjami |

Oba rodzaje szczegółów oferty nakładają się w 3000 sesji: 6500 + 5500 − 3000 = 9000 sesji obejrzenia szczegółów, zgodnych z engaged_view. 6840 sesji step1 stanowi podzbiór tych 9000. Każdy typ otwarcia szczegółów występuje maksymalnie raz na sesję; engaged_view występuje raz po pierwszym kwalifikującym otwarciu. form_submit oznacza skutecznie wysłane zapytanie kontaktowe, maksymalnie raz na sesję, bez danych osobowych formularza. 450 click_tel, 180 click_mail i 300 form_submit mogą nakładać się między sobą i z etapami zakupu; nie są kolejnymi szczeblami ani dodatkowymi rezerwacjami.

Docelowa struktura przerwań: 18000 wejść → 12000 zaangażowanych → 9000 szczegółów → 6840 wyborów dat → 1250 dodatków → 430 potwierdzeń → 65 zakupów. Różnice wynoszą odpowiednio 6000, 3000, 2160, 5590, 820, 365. Każdy głębszy etap występuje po poprzednim, maksymalnie raz w sesji; purchase również maksymalnie raz. Powtórki odsłon page_view pozostają dozwolone. Udziały w 18000 sesji: step1 38%, step2 6,94%, step3 2,39%, purchase 0,36%. Przejścia między etapami: step1→step2 18,27%, step2→step3 34,40%, step3→purchase 15,12%.

**ZAAKCEPTOWANE:** wartości są całkowicie syntetyczne, inspirowane realistycznymi proporcjami lejka, a nie skopiowanymi rekordami ani dokładnymi wynikami klienta. Katalog zachowuje 13 zdarzeń; step3_confirmation jest jedyną nazwą trzeciego etapu przed purchase. W dokumentach nie znaleziono odrębnej wcześniej zaakceptowanej definicji begin_checkout; wcześniejszy projekt scenariusza opisywał nim to samo miejsce przed zakupem.

Współczynniki przejścia różnią się według kanału. Poniższy zaakceptowany rozkład sumuje się do docelowego lejka. Źródło oznacza źródło sesji, w której wystąpił dany etap; dla purchase jest to sesja finalizacji, a nie dowód pozyskania rezerwacji.

| Kanał sesji | Sesje | step1 | step2 | step3 | purchase | Purchase / sesje |
|---|---:|---:|---:|---:|---:|---:|
| Paid Social — Meta | 7200 | 3000 | 250 | 50 | 2 | 0,028% |
| Paid Search — Google Brand | 1800 | 800 | 180 | 60 | 10 | 0,556% |
| Paid Search — Google ogólna | 3000 | 1200 | 250 | 90 | 12 | 0,400% |
| Organic Search (Google) | 2400 | 700 | 160 | 55 | 6 | 0,250% |
| Direct | 3000 | 950 | 350 | 155 | 32 | 1,067% |
| Referral | 600 | 190 | 60 | 20 | 3 | 0,500% |
| **Razem** | **18000** | **6840** | **1250** | **430** | **65** | **0,361%** |

Direct najczęściej domyka lejek: 32 z 65 zakupów i najwyższy udział zakupów w sesjach. Paid Search ma pośrednią skuteczność (22/4800=0,458%), a Paid Social generuje dużo wejść i rozpoczęć przy 2 zakupach w tej samej sesji. Część zaobserwowanych kontaktów Paid Social ujawnia się dopiero w ścieżkach wielosesyjnych; nie jest to potwierdzona przyczynowość.

Ścieżki wielosesyjne mają dodatkowe wcześniejsze kontakty; powyższy lejek opisuje etapy w obrębie sesji, a nie gotowy wskaźnik kohort journey z kontraktu. Definicja journey i jego cohort_date wymaga S06 przed późniejszą agregacją. Purchase GA4 jest obserwacją pomiarową; rezerwację, jej wartość i aktualny status potwierdza Profitroom.

W bazie każdy event ma własny demo_event_id i raw_row_id. event_params pozostaje ARRAY rekordów key/value, z jednym nośnikiem wartości na parametr. Zawiera typowane ga_session_id, session_engaged, engagement_time_msec, currency i fikcyjne adresy odpowiednio do zdarzenia. loaded_at, source_system=ga4, batch_id, is_synthetic=true, scenario_id, generator_version, ingest_date, source_timezone oraz wszystkie wymagane pola DDL są wypełnione. metric_date wynika z event_timestamp w Europe/Warsaw; ingest_date z loaded_at w UTC. Query do tej tabeli ogranicza metric_date.

### 4.3. Źródła sesji i kliknięcia reklam

| Ostatnie źródło sesji | Identyfikowalne sesje |
|---|---:|
| Meta | 7200 |
| Google Brand | 1800 |
| Google Ads ogólna | 3000 |
| Organic Search (Google) | 2400 |
| Direct | 3000 |
| Referral | 600 |
| **Razem** | **18000** |

To rozkład sesji według zaobserwowanego źródła, a nie rozkład rezerwacji. Równość 18000 kliknięć reklam i 18000 sesji ogółem jest przypadkowa: 12000 sesji płatnych uzupełnia 6000 Direct/Organic/Referral. Kliknięcie nie jest sesją; Direct i Organic mogą być powrotami urządzeń wcześniej pozyskanych przez reklamę. Różnica liczników nie jest liczbą utraconych wizyt. Pomocnicze ilorazy sesji do kliknięć: Meta 7200/12000=60%, Google 4800/6000=80%. Różnicę tworzą powtarzane kliknięcia w tej samej sesji, wizyty bez zgody, brak pomiaru, granice sesji i powroty. Nie projektujemy awarii technicznej jako automatycznego wyjaśnienia. Scenariusz nie udostępnia aplikacji pełnego mianownika indywidualnych kliknięć; click_arrival_rate pozostaje NULL, a sessions_per_click jest dostępne z odpowiednią etykietą.

traffic_source opisuje pierwszy kontakt urządzenia w scenariuszu, a session_traffic_source_last_click opisuje sesję. Wszystkie trzy zaakceptowane podzbiory manual_campaign, google_ads_campaign i cross_channel_campaign są obsługiwane; nieadekwatny podzbiór może być NULL. Google Brand otrzymuje ID kampanii brand, Organic nie otrzymuje płatnego ID. Direct jest jawną obserwowaną kategorią; nieznany source/medium pozostaje nieznany. Oznaczenia kanałów nie są wyprowadzane wyłącznie z nazw kampanii.

## 5. Profitroom — kanoniczna sprzedaż

600 rzeczywistych w sensie scenariusza rezerwacji (wszystkie syntetyczne). Baza nie zawiera rekordów testowych; dodatkowy wariant testowy jest odseparowany w sekcji 9. Liczby odnoszą się do unikalnych booking_id na końcowe as_of_at, nie do liczby rewizji.

| Segment | Wszystkie rezerwacje | Aktywne | Anulowane | Pozostałe statusy | Aktywna wartość kontrolna PLN |
|---|---:|---:|---:|---:|---:|
| direct_web (Booking Engine) | 150 | 120 | 25 | 5 | 480000 |
| OTA, phone, email i inne — razem | 450 | 360 | 65 | 25 | 1440000 |
| **Razem** | **600** | **480** | **90** | **30** | **1920000** |

Wartości kontrolne zachowują średnią 4000 PLN i różnorodność kwot. Podział pozostałych 450 rezerwacji na konkretne kanały oraz rozdział pending/option/no_show (5 online i 25 poza online) zostanie ustalony przy Profitroom (S03/S08). „Pozostałe kanały” są zbiorczą grupą scenariusza, nie nowym kodem źródłowego kanału ani synonimem OTA. Każda przyszła rezerwacja otrzyma konkretny kanał i status. Cały direct i udział OTA będą obliczane po tym podziale.

Aktywne 480 = confirmed 360 + completed 120. Rozdział completed pomiędzy kanały jest odłożony do Profitroom; zakończony pobyt musi poprzedzać as_of_at. Wszystkie daty pobytu są późniejsze od utworzenia, check_out jest późniejsze od check_in.

Kontrolna historia: 600 pierwszych zapisów + 90 rewizji anulacji + 120 rewizji completed po confirmed = **810 wierszy rewizji**. 15 anulacji dotyczy czerwcowych rezerwacji i następuje w sierpniu. Historia koryguje czerwcowe kohorty, a nie tworzy sierpniowych rezerwacji. Dokładne rekordy i format rewizji powstaną przy Profitroom; nie są warunkiem generatora GA4.

## 6. Powiązania, obserwowane ścieżki i granice wnioskowania

### 6.1. Bilans purchase–rezerwacja

**USTALONE:** porównanie purchase dotyczy wyłącznie Booking Engine i zgodnego statusu. Wszystkie rezerwacje hotelu oraz OTA pozostają osobnymi zestawieniami sprzedaży, poza mianownikiem pokrycia purchase.

| Podzbiór purchase GA4 | Liczba | Później aktywne | Później anulowane | Dostępność połączenia |
|---|---:|---:|---:|---|
| Zweryfikowany transaction_id → booking_id | 50 | 44 | 6 | Jednoznaczna tożsamość |
| Brak transaction_id | 8 | 6 | 2 | NULL w GA4 |
| ID obecne, bez dostępnego mapowania | 7 | 6 | 1 | Brak dowodu relacji |
| **Razem** | **65** | **56** | **9** | **50 połączonych** |

Pozostałe **85** rezerwacji Booking Engine bez purchase GA4 obejmuje **64 aktywne + 16 anulowanych + 5 innych statusów**. Bilans: 65+85=150; aktywne 44+6+6+64=120; anulowane 6+2+1+16=25. Pokrycie obserwacji aktywnych wynosi **56/120=46,67%** (wiedza generatora), a pokrycie zweryfikowanego połączenia **44/120=36,67%** (możliwe do wykazania z dostępnych źródeł). Ukryte przypisania 15 niepołączonych purchase nie trafiają do aplikacji.

**Mianowniki KPI tego scenariusza:** „aktywna rezerwacja online” oznacza wyłącznie aktywną rezerwację przez Booking Engine (`direct_web`), utworzoną w okresie 1 czerwca–29 sierpnia 2026, ze statusem confirmed/completed na as_of_at. Wspólny mianownik wynosi 120 takich rezerwacji. 46,67% = 56 purchase dotyczących aktywnych rezerwacji Booking Engine / 120 aktywnych rezerwacji Booking Engine (wiedza generatora). 36,67% = 44 jednoznacznie połączone aktywne rezerwacje Booking Engine / 120 aktywnych rezerwacji Booking Engine (zweryfikowane połączenia). OTA, telefon, e-mail i wszystkie pozostałe kanały są wyłączone z obu mianowników. „Koszt reklam na aktywną rezerwację online” = 60000 PLN kwalifikujących kosztów reklam / 120 aktywnych rezerwacji Booking Engine = 500 PLN; ten mianownik ma ten sam zakres kanału, okresu i statusu.

#### Kontrolowane braki aktywnych rezerwacji online

| Przyczyna syntetyczna | Aktywne rezerwacje bez purchase | Reprezentacja pomiarowa |
|---|---:|---|
| Odmowa zgody analitycznej | 32 | Zakupy należą do podzbioru 2500 całkowicie niewidocznych wizyt; zero rekordów purchase i brak identyfikatora do odtworzenia relacji |
| Brak poprawnego powrotu/pomiaru po zewnętrznym checkout | 18 | W 18 spośród 365 sesji kończących się na step3 pomiar urywa się po wyjściu; sesje mają analytics_storage=Yes, ads_storage=No |
| Utrata identyfikatora lub ciągłości sesji | 14 | W 14 innych spośród tych 365 sesji istnieje wcześniejszy etap step3, ale dalszej obserwacji zakupu brak; analytics_storage=Yes, ads_storage=No |
| **Razem** | **64** | Rozłączne przypadki, wliczone w istniejące sumy |

Te przyczyny są konstrukcją syntetyczną, nie potwierdzonymi benchmarkami rynku. Wspólna historia generatora służy testom; źródłowe GA4 nie otrzymuje ukrytych połączeń. Anonimowe zdarzenia pozostają niepołączalne. Dla 16 anulowanych bez purchase przyjmujemy całkowity brak obserwacji w podzbiorze 2500 niewidocznych wizyt; pozostałe 5 statusów nie ma zarejestrowanego purchase. Wszystkie te podzbiory mieszczą się w bazowych liczebnościach, a nie powiększają ich.

#### Deterministyczne kwoty i wspólna historia

Przyszły generator najpierw wyznacza 65 technicznych indeksów zakupu w stabilnej kolejności daty, sesji i zdarzenia. Dla każdego indeksu wspólna funkcja oparta na seedzie, scenario_id i wersji wyznacza datę utworzenia, booking_id, wewnętrzną tożsamość transakcji oraz dodatnią kwotę całkowitą w groszach. Ta sama funkcja zostanie wykorzystana przez Profitroom. Maskowanie 8 transaction_id oraz brak publicznej mapy kolejnych 7 następuje dopiero przy odwzorowaniu źródeł. Generator nie wpisuje tej ukrytej mapy do event_params ani do widoków aplikacji.

Dla podzbiorów o zadanej sumie wartości stosujemy pary odchyleń w groszach od 400000 groszy: +d i −d, z deterministycznym doborem i kolejnością, a przy nieparzystej liczebności jeden element bazowy. Odchylenia mieszczą się w cenach profilu hotelu. Dzięki temu zróżnicowane kwoty 30 aktywnych płatnie powiązanych dają 120000 PLN, a 14 pozostałych aktywnych powiązanych 56000 PLN. Pozostałe kwoty również mają stałe wyliczenie. Wszystkie 65 wartości GA4 odtwarza się identycznie w Profitroom, także dla brakującego publicznego połączenia. Kwoty wewnętrzne są w groszach; wymagane przez DDL purchase_revenue FLOAT64 to reprezentacja kwoty PLN, walidowana po zaokrągleniu do grosza. Status po anulacji zmienia się w Profitroom, a historyczna wartość purchase pozostaje obserwacją.

Wśród 44 aktywnych powiązanych tożsamością: **30** ma kwalifikujące obserwacje płatne i wartość **120000 PLN**; **14** to organiczne/direct bez dowodu płatnego, wartość **56000 PLN**. Łączna wartość aktywnych z potwierdzoną tożsamością wynosi 176000 PLN. 6 powiązanych anulowanych jest poza licznikiem linked_booking_roas.

### 6.2. Ścieżki do 50 technicznie powiązanych zakupów

| Pierwszy → ostatni zaobserwowany kontakt | Wszystkie ścieżki | Aktywne powiązane rezerwacje | Anulowane |
|---|---:|---:|---:|
| Meta → Google Brand | 10 | 9 | 1 |
| Meta → Direct | 12 | 10 | 2 |
| Meta → Meta | 2 | 2 | 0 |
| Google Ads ogólna → Google Ads ogólna | 10 | 9 | 1 |
| Organic Search (Google) → Direct | 10 | 9 | 1 |
| Direct → Direct | 6 | 5 | 1 |
| **Razem** | **50** | **44** | **6** |

Każda z tych ścieżek ma dostępny identyfikator urządzenia i jedną rezerwację, 1–3 sesje, a wszystkie kontakty mieszczą się w 30 dniach przed wynikiem. Część Meta→Brand i Meta→Direct powraca po 8–20 dniach: Meta jest pierwszym zaobserwowanym kontaktem, lecz platformowa konwersja Meta nie musi jej uwzględniać. W sesji końcowej traffic_source pozostaje Meta, podczas gdy sesyjne źródło wskazuje Brand albo Direct. Nie oznacza to potwierdzonego przyczynowego wpływu Meta ani Google.

Pozostałych 15 purchase GA4 ma również niezależnie zaplanowany brak obserwowalnej historii poprzednich sesji (przerwana ciągłość identyfikatora przed sesją zakupu); sama nieobecność transaction_id nie oznacza braku ścieżki. W tym scenariuszu nie włącza się ich do mianownika pełnych ścieżek. Ich końcowe sesje obejmują 2 Google ogólna, 6 Organic, 4 Direct i 3 Referral. Razem ze zidentyfikowanymi ścieżkami daje to dokładnie kanałowy rozkład 65 zakupów z sekcji 4.2.

Pokrycie kwalifikowanych ścieżek względem wszystkich obserwowanych purchase wynosi 50/65=76,92%. Dobór podzbioru nie uprawnia do uogólnienia na wszystkie rezerwacje hotelu. Dla outcome_type=purchase mianownik wynosi 50; dla active_booking wynosi 44 i udziały trzeba policzyć ponownie.

Na pełnym zbiorze 50 obserwowanych ścieżek do purchase pierwszy kontakt Meta ma 24/50=48%; ostatni Google Brand 10/50=20%, ostatni Google Ads ogólna 10/50=20%, ostatni Direct 28/50=56%, ostatni Meta 2/50=4%. Nie sumujemy ścieżek różnych outcome_type. Warunkowy udział Meta w ścieżkach kończących się Brand wynosi 10/10=100% wyłącznie w tym celowo skonstruowanym podzbiorze.

Granice obserwacji: pierwsze kontakty nie poprzedzają 1 czerwca. Scenariusz nie udaje znajomości wcześniejszej historii urządzenia. Raport za pierwsze 30 dni ujawnia ograniczone okno wstecz; interpretacja „pierwszy kontakt” zawsze oznacza pierwszy zaobserwowany. Szersza atrybucja i cross-device pozostają poza zakresem.

### 6.3. Oczekiwane KPI kontrolne, warunkowe wobec akceptacji reguł

| Wynik dla całych 90 dni | Arytmetyczny wynik kontrolny |
|---|---|
| Wydatki | 36000 + 24000 = 60000 PLN |
| ROAS platformowy Meta / Google | Odroczony do nowego bilansu konwersji i wartości platform w S04 |
| Koszt konwersji Meta / Google | Odroczony do liczników platformowych w S04 |
| Koszt reklam na aktywną rezerwację online | 60000/120 = 500 PLN |
| Wartość aktywnych rezerwacji | 1920000 PLN |
| Udział direct_web w aktywnej liczbie i wartości | 120/480 = 25%; 480000/1920000 = 25% |
| Udział całego direct (web + phone + email) | Odroczony do podziału pozostałych kanałów Profitroom |
| Współczynnik anulacji | 90/600 = 15% |
| Powiązanie tożsamości aktywnych online | 44/120 = 36,67%; jednostka: aktywna rezerwacja direct_web |
| Kandydat linked_booking_roas | 120000/60000 = 2,00, dopiero po spełnieniu pięciu warunków |

Mianownik pokrycia tożsamości obejmuje także niepołączone aktywne online. 30/120=25% opisuje udział aktywnych online ze zweryfikowanym płatnym powiązaniem, a nie samodzielną miarę jakości pomiaru: część z pozostałych rezerwacji jest organiczna. Pokrycie technicznych dowodów płatnych wymaga osobnego kwalifikującego mianownika ustalonego w odroczonej części S04/S05. Do zatwierdzenia tej definicji i progu linked_booking_roas pozostaje **NULL**, z metric_status i reason_codes; wartość 2 jest oczekiwaniem arytmetycznym, a nie obietnicą wyniku UI.

Pięć warunków: purchase łączy się z aktywnym Profitroom; istnieje dodatkowa kwalifikująca informacja płatna; koszt obejmuje ten sam zakres i okres, również kampanie bez konwersji; booking wnosi wartość raz; pokrycie i jakość spełniają skonfigurowane wymagania. AI otrzyma wyłącznie zweryfikowane wyniki silnika i ich ograniczenia.

## 7. Rozkład 90 dni i testy zmiany okresów

Ustalone trzy bloki po 30 dni: 1–30 czerwca, 1–30 lipca, 31 lipca–29 sierpnia. To rozkład kontrolny seeda, nie ograniczenie selektora aplikacji.

| Baza | Blok 1 | Blok 2 | Blok 3 | Razem |
|---|---:|---:|---:|---:|
| Sesje | 5000 | 6500 | 6500 | 18000 |
| Meta spend PLN | 9000 | 12000 | 15000 | 36000 |
| Google spend PLN | 6000 | 8000 | 10000 | 24000 |
| Aktywne direct_web według utworzenia | 30 | 40 | 50 | 120 |
| Wszystkie rezerwacje według utworzenia | 170 | 200 | 230 | 600 |
| Aktywne wszystkie kanały | 130 | 160 | 190 | 480 |
| Anulowane | 30 | 30 | 30 | 90 |
| Pozostałe statusy | 10 | 10 | 10 | 30 |

Między blokiem 1 i 2 budżet i aktywne online rosną o 33,33%; między 2 i 3 o 25%. Koszt online pozostaje 500 PLN. To kontrolowany przykład, w którym wzrost rezerwacji przy wzroście budżetu nie dowodzi poprawy efektywności ani przyczynowości. W trzecim bloku można równocześnie zwiększyć ruch Meta i OTA, pozostawiając brak identyfikatora łączącego: aplikacja opisuje współwystępowanie.

W obrębie każdego bloku generator ma rozdzielić całkowite liczby na dni metodą zachowującą sumę, z ustaloną kolejnością rozstrzygania reszt. Najpierw powstają spójne historie i statusy, następnie rozkłady zdarzeń i raportów; nie losujemy niezależnych tabel z pozornie zgodnymi sumami. Matryce dzienne i krzyżowe kampania × zgody × urządzenie są kolejnym projektem generatora, podlegającym tym sumom i ograniczeniom.

## 8. Reguły spójności i kontrolowane braki

1. Dokładnie 90 różnych metric_date w pokryciu bazowych źródeł; wszystkie czasy zdarzeń mieszczą się w zakresie lokalnym. Pobyt i loaded_at mogą wykraczać poza to okno.
2. Żadna identyfikowalna sesja nie ma więcej niż jednego session_start w bazie; każde jej zdarzenie ma zgodny klucz, hotel i urządzenie. 1500 page_view bez klucza pozostaje oddzielną jednostką.
3. Każdy purchase należy do jednej z 430 sesji step3_confirmation; step3 do step2, step2 do step1. W bazie występuje maksymalnie jeden zakup na sesję oraz pełna sekwencja etapów w sesji zakupowej; obserwowalność wcześniejszej historii wielosesyjnej jest oceniana osobno. Kolejne zdarzenia mają jawne różne timestampy, poza osobnym testem konfliktu.
4. Kwota każdego z 65 purchase GA4 w wiedzy wspólnego scenariusza jest zgodna z wartością Profitroom w chwili utworzenia. Status późniejszej anulacji pochodzi wyłącznie z Profitroom. Wartości platformowe pozostają własnym raportem platformy.
5. 810 rewizji daje 600 rezerwacji, nie 810. Cohort_bookings to suma rozłącznych statusów, active to confirmed+completed.
6. Koszty składowych kampanii sumują się do źródeł i 60000 PLN. Raport zbiorczy Meta nie jest dodatkową kampanią. Rekord conversion nie dubluje kosztu delivery.
7. Do aplikacji przechodzą wyłącznie zaobserwowane dowody; generator nie uzupełnia ukrytych transaction_id, zgód ani marketingowych źródeł.
8. Zgoda nieznana, brak źródła i Direct to różne stany. Wzorce source/medium i grupy kanałów są jawne i wersjonowane.
9. Kwoty są generowane w groszach. FLOAT64 w ecommerce odzwierciedla DDL, a późniejsza normalizacja NUMERIC zachowuje docelową kwotę groszową.
10. Podstawowe pola techniczne są deterministyczne. Nowa rewizja scenariusza otrzymuje nową wersję, a nie zmienia znaczenia dotychczasowych ID bez śladu.
11. Bazowe źródła są kompletne w sensie dostarczenia plików/rekordów zadeklarowanego seeda. To nie oznacza 100% pomiaru gości. Wiedza o 2500 niewidocznych wizytach pozostaje testową prawdą generatora, bez fikcyjnego licznika w widokach.
12. Różnorodność cen jest uzgadniana z sumami kanałów i podzbiorów połączeń przed zapisaniem seeda; cena nie służy do identyfikacji rezerwacji.

## 9. Przypadki testowe — osobno od bazowych sum

Kontrolowane braki z sekcji 4 i 6 są wliczone w bazę. Poniższe dodatkowe warianty awarii są odrębnymi uruchomieniami testowymi, a nie dodatkowymi rekordami bazowego scenariusza. Nie wymagają osobnych tabel ani datasetu ops.

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

Akceptacja obejmuje całość potrzebną do przygotowania generatora GA4; żadna z poniższych odroczonych części nie blokuje jego opracowania. Wspólna historia i identyfikatory poprzedzają odwzorowanie kolejnych źródeł, a gotowe DDL pozostałych tabel nie są wymagane dla GA4.

| ID | Rozstrzygnięte dla generatora GA4 | Pozostała decyzja i termin |
|---|---|---|
| S01 | Zakres, as_of_at, dzienne loaded_at, strefa i niezależność od zegara | Produkcyjny harmonogram/cutoff — przed automatycznym importem, Q03/O04 |
| S02 | hotel_demo_001 i pierwszy scenariusz jednego hotelu | Mapowanie Supabase — przed integracją aplikacji; drugi hotel — przed testami izolacji hma_core/aplikacji |
| S03 | 13 zdarzeń, 116015 rekordów, urządzenia, sesje, kanały, bilans Booking Engine, kwoty i rozkład bloków | Podział pozostałych kanałów/statusów i historia 810 rewizji — przed generatorem Profitroom |
| S04 | Cztery kampanie, ich tożsamości i role, sesje/kliknięcia oraz demonstracyjny koszt 60000 PLN | Nowy bilans konwersji i wartości, model/okno i data platform — przed generatorami Meta/Google; kwalifikacja płatna i zakres jakości — przed linked KPI w hma_core/regułach |
| S05 | privacy_info, maskowanie, 32+18+14 braków aktywnych purchase, rozdzielenie wiedzy generatora i aplikacji | Progi jakości/pewności i mianowniki płatnego pokrycia — przed jakością i regułami; produkcyjna retencja — przed realnymi danymi |
| S06 | Sekwencja etapów, unikalność w sesji, engaged_view, form_submit, 30-dniowa historia urządzenia | Lifecycle journey, kohorty i wiele wyników — przed agregacją lejka/ścieżek hma_core, Q04/O05 |
| S07 | scenario_id, stream_id, seed, generator_version, .example, sortowanie, deterministyczne ID i grosze | Brak otwartej decyzji biznesowej przed GA4; implementacja algorytmu i test powtarzalności w osobnym zadaniu generatora |
| S08 | Wspólna tożsamość, data i kwota 65 zakupów; maskowanie 50/8/7 | DDL Meta/Google/Profitroom, adapter publicznego mapowania i szczegóły rewizji — przed odpowiednim źródłem; fizyczne połączenia — przed hma_core |
| S09 | Kontrole bazowe schematu, sum, unikalności, dat, kolejności i powtarzalności; awarie poza bazą | Wybór i implementacja dodatkowych wariantów — przy testach odpowiednich źródeł i hma_core |

O11 (status dzienny a bramka okresu) i O12 (spójne agregaty) pozostają odłożone do hma_core. Uprawnienia, konfiguracja Supabase, AI i ochrona kosztów zachowują ustalenia kontraktu. Ich implementacja jest odrębnym zadaniem.

## 11. Akceptacja scenariusza i późniejsze kontrole

- [x] Właścicielka zaakceptowała scenariusz v1 oraz decyzje potrzebne przed generatorem GA4.
- [x] Ustalono zakres 90 dni, PLN, Europe/Warsaw, WEB, hotel_demo_001 i stały czas stanu/ładowania.
- [x] Ustalono 13 zdarzeń i sumę 116015; liczby zdarzeń, sesji, urządzeń i rezerwacji są odrębnymi jednostkami.
- [x] Uzgodniono bilans 65 purchase: 56 aktywnych i 9 anulowanych; połączenia 50/8/7.
- [x] Uzgodniono 120 aktywnych Booking Engine, pokrycia 56/120 i 44/120 oraz braki 32+18+14.
- [x] Uzgodniono 600 rezerwacji Profitroom: 480 aktywnych, 90 anulowanych, 30 innych statusów; Booking Engine 150, pozostałe kanały 450.
- [x] Uzgodniono wyłącznie syntetyczne identyfikatory, adresy, kwoty i historie, bez kopiowania danych klientów.
- [x] Odroczone decyzje mają terminy i nie blokują generatora GA4.
- [ ] Generator i testy potwierdzają schemat, dokładne sumy, daty, kolejność, unikalność, maskowanie i powtarzalność.
- [ ] Przyszłe źródła odtwarzają wspólne kwoty i identyfikatory; 810 rewizji zachowuje 600 rezerwacji.
- [ ] hma_core i reguły zachowują pięć warunków linked ROAS, NULL, UNKNOWN i odrębność jednostek journey/sesja.
- [ ] Osobne testy izolacji dwóch hoteli, DST i awarii zostały wykonane w odpowiednich etapach.

Dokument jest zaakceptowaną podstawą osobno zleconego generatora GA4 i późniejszego spójnego odwzorowania czterech źródeł. W tym kroku zaktualizowano wyłącznie dokumentację; DDL, generator, dane, Supabase, aplikacja i zasoby Google Cloud pozostają bez zmian.
