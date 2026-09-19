# Hotel Marketing Analyzer — DIAGNOSTIC_CONTRACT.md

Status: v0.2 — roboczy kontrakt diagnostyczny po audycie  
Cel: jedno źródło prawdy dla logiki diagnostycznej HMA.  
Zasada nadrzędna: **AI jest warstwą językową, nie decyzyjną.**

---

## 1. Ruch i jakość ruchu v0.2

### Zasada nadrzędna

Jakość ruchu oceniamy po głębokości zachowania, a nie po samym wejściu na stronę.

Hierarchia intencji:

`session < engaged_view < view_offer/room < Step1 < Step2 < Step3 < purchase`

### Walidacja biznesowa

`purchase` jest zdarzeniem analitycznym w GA4.

`Profitroom active booking` jest potwierdzonym wynikiem biznesowym z systemu rezerwacyjnego.

HMA traktuje te dwa sygnały osobno:

- `purchase` służy do oceny końca ścieżki analitycznej,
- `Profitroom active booking` służy do potwierdzenia faktycznej sprzedaży.

Rozbieżność pomiędzy `purchase` a `Profitroom active booking` jest sygnałem do diagnostyki trackingu.

### Zasady techniczne oceny jakości ruchu

#### 1. Jakość oceniamy na współczynnikach

Zmiany jakości ruchu oraz skuteczności przechodzenia użytkowników w głąb lejka oceniamy przede wszystkim na podstawie współczynników procentowych.

Podstawowe wskaźniki:

- `engaged_view_rate = sessions_with_engaged_view / sessions`
- `view_offer_or_room_rate = sessions_with_view_offer_or_room / sessions`
- `step1_rate = sessions_with_step1 / sessions`
- `step2_rate = sessions_with_step2 / sessions`
- `step3_rate = sessions_with_step3 / sessions`

Przy analizie lejka:

- `step1_to_step2_rate = Step2 / Step1`
- `step2_to_step3_rate = Step3 / Step2`
- `step3_to_purchase_rate = Purchase / Step3`

Liczby bezwzględne służą przede wszystkim do oceny wolumenu i wiarygodności próby.

Dla metryk procentowych rozróżniamy:

- zmianę względną w `%`,
- zmianę w punktach procentowych `pp`.

Do progów diagnostycznych używamy zmiany względnej. W raporcie klienta można dodatkowo pokazywać zmianę w `pp`.

#### 2. „Zaangażowanie” musi oznaczać konkretną metrykę

**`engaged_view_rate`**

Własny wskaźnik HMA. `engaged_view` oznacza minimum:

- 45 sekund na stronie,
- 50% scroll.

**GA4 engaged session rate**

Oficjalny wskaźnik GA4:

`engaged_sessions / sessions`

Jest osobnym, pomocniczym sygnałem jakości.

**Zachowania wysokiej jakości**

Określenie zbiorcze obejmujące m.in.:

`engaged_view → view_offer/room → Step1 → Step2 → Step3 → purchase`

oraz kontakt jako osobną mikro-konwersję.

Każda reguła diagnostyczna musi wskazywać konkretny rate.

#### 3. Oceny muszą być mierzalne

Oceny typu:

- dużo,
- mało,
- wysoko,
- nisko,
- mocno,
- słabo

wymagają jednocześnie:

- wskazanego okresu porównawczego,
- minimalnego wolumenu,
- konkretnego progu,
- odpowiedniego confidence.

Hierarchia punktu odniesienia:

1. poprzedni porównywalny okres,
2. historyczna norma hotelu przy wystarczającej liczbie danych,
3. konfigurowalne progi biznesowe hotelu.

#### 4. Źródło metryki musi być jawne

Meta Ads:

- impressions,
- clicks,
- spend,
- CTR,
- CPC,
- platform conversions,
- attributed conversion value,
- platform ROAS.

Google Ads:

- impressions,
- clicks,
- cost,
- CTR,
- CPC,
- conversions,
- conversion value,
- platform ROAS.

GA4:

- sessions,
- engaged_view,
- view_offer/room,
- Step1,
- Step2,
- Step3,
- purchase,
- zachowanie użytkownika.

Profitroom:

- created bookings,
- active bookings,
- revenue,
- sales channel,
- cancellations.

HMA zachowuje semantykę źródła. Kliknięcie reklamowe, sesja, purchase platformowy i potwierdzona rezerwacja to różne obiekty.

#### 5. Korelacja czasowa wspiera hipotezę

Poziomy dowodu:

- korelacja zagregowana → zwykle LOW/MEDIUM,
- korelacja + zgodne sygnały intencji → maksymalnie MEDIUM,
- potwierdzona ścieżka użytkownika → możliwy silniejszy wniosek.

#### 6. Returning users wymagają ciągłości ścieżki

Dane zagregowane mogą wskazywać wzorzec powrotów.

Silniejszy wniosek o ścieżce tego samego użytkownika wymaga danych pozwalających połączyć wizyty.

#### 7. Mobile → desktop wymaga dowodu cross-device

Różnice urządzeń można analizować na poziomie rate.

Wniosek o przejściu konkretnego użytkownika z mobile na desktop wymaga danych cross-device.

---

## 2. Lejek i lokalizacja problemu v0.2

### Zasada nadrzędna

Lejek służy do lokalizacji miejsca osłabienia.

Samo miejsce osłabienia nie określa jeszcze jego przyczyny.

### Twarde zasady oceny lejka

#### 1. Lejek oceniamy przez transition rates

- `step1_rate = Step1 / sessions`
- `step1_to_step2_rate = Step2 / Step1`
- `step2_to_step3_rate = Step3 / Step2`
- `step3_to_purchase_rate = Purchase / Step3`

County służą do oceny skali i jakości próby.

#### 2. Lokalizacja i przyczyna są rozdzielone

Przykład:

`step1_to_step2_rate` spada

oznacza:

„Największe osłabienie występuje pomiędzy Step1 i Step2.”

Możliwe przyczyny, takie jak:

- cena,
- dostępność,
- minimalna długość pobytu,
- warunki oferty,
- UX,
- problem techniczny,

pozostają hipotezami do dalszej weryfikacji.

#### 3. Końcówkę lejka walidujemy Profitroom

Jeżeli:

- Step3 jest stabilny lub rośnie,
- GA4 purchase spada,

HMA najpierw sprawdza:

- tracking purchase,
- confirmation page,
- return po płatności,
- transaction_id,
- cross-domain,
- consent,
- dane Profitroom.

Jeżeli Profitroom Direct created bookings są stabilne lub rosną, pierwszeństwo ma diagnostyka pomiaru.

Jeżeli równocześnie pogarsza się `step3_to_purchase_rate` i spadają rezerwacje Direct w Profitroom, rośnie prawdopodobieństwo realnego problemu na końcu procesu.

#### 4. GA4 i Profitroom mają różne role

GA4:

`session → engaged_view → view_offer/room → Step1 → Step2 → Step3 → purchase`

Profitroom:

zewnętrzna walidacja biznesowa:

- created booking,
- active booking,
- revenue,
- cancellation.

---

## 3. Sprzedaż i pieniądze v0.1

### Twarde zasady oceny sprzedaży

#### 1. Profitroom jest źródłem prawdy o realnej sprzedaży

Podstawą oceny biznesowej są dane z Profitroom:

- aktywne rezerwacje,
- wartość aktywnych rezerwacji,
- kanał sprzedaży,
- anulacje.

`purchase` w GA4 oraz konwersje raportowane przez Meta Ads i Google Ads są sygnałami analitycznymi i platformowymi.

#### 2. ROAS zawsze wskazuje źródło

Rozróżniamy:

- `Meta platform ROAS`,
- `Google Ads platform ROAS`,
- własny wskaźnik biznesowy oparty na Profitroom, jeżeli zostanie zdefiniowany.

ROAS platformowy opisuje atrybucję danej platformy.

#### 3. Bookings, revenue i average booking value analizujemy razem

HMA analizuje co najmniej:

- aktywne rezerwacje,
- aktywny revenue,
- średnią wartość rezerwacji.

#### 4. Direct i OTA oceniamy w kontekście total online

HMA zachowuje kanały Profitroom możliwie w oryginalnym podziale:

- Direct / Booking Engine,
- Booking.com,
- Expedia,
- HRS,
- pozostałe kanały występujące w raporcie.

Agregaty typu OTA są pomocnicze.

#### 5. Cancellations analizujemy osobno

Podstawą bieżącej sprzedaży są active bookings i active revenue.

Anulacje są osobnym sygnałem diagnostycznym i nie powinny być mieszane z aktywną sprzedażą.

#### 6. Profitroom freshness / completeness

HMA przechowuje:

`profitroom_data_through`

czyli datę, do której dane Profitroom są kompletne.

Jeżeli:

`selected_period_end > profitroom_data_through`

brakujące dni oznaczają brak danych, a nie zerową sprzedaż.

HMA:

- pokazuje GA4 / Meta / Google Ads dla pełnego dostępnego okresu,
- ogranicza mocne diagnozy sprzedażowe do wspólnego kompletnego zakresu,
- pokazuje użytkownikowi datę kompletności sprzedaży.

Przykład komunikatu:

„Dane sprzedażowe Profitroom są kompletne do 7 września. Dane ruchu i kampanii obejmują okres do 13 września. Ocena sprzedaży została wykonana dla zakresu z kompletnymi danymi Profitroom.”

---

## 4. Kto generuje popyt, kto wspomaga, kto domyka? v0.1

### Twarde zasady ról kanałów

#### 1. Rola kanału dotyczy konkretnego okresu

Role:

- `Demand Generator`
- `Assister`
- `Closer`

Rola nie jest stałą cechą kanału.

#### 2. Rola wynika z zestawu sygnałów

Ocena uwzględnia m.in.:

- wolumen ruchu,
- quality / intent rates,
- Step1 / Step2 / Step3,
- purchase,
- branded search,
- Direct,
- Profitroom,
- total sales,
- opóźnienie czasowe.

#### 3. Dane zagregowane wskazują wzorzec

Zagregowane dane mogą wspierać hipotezę generowania lub wspomagania popytu.

Potwierdzona ścieżka wymaga danych użytkownika.

#### 4. First touch i last touch wymagają danych ścieżkowych

Określenia typu:

- Meta → Brand,
- Meta → Organic → Brand → Direct,
- Booking.com → Direct

mogą być traktowane jako potwierdzona ścieżka wyłącznie przy danych łączących kolejne kontakty tego samego użytkownika.

#### 5. Direct jest kategorią atrybucyjną

`(direct)/(none)` może obejmować m.in.:

- wpisanie adresu,
- bookmark,
- powrót z historii,
- utracone UTM,
- przejście po wcześniejszym kontakcie reklamowym,
- ruch z komunikatorów lub innych źródeł bez zachowanej informacji o źródle.

Direct nie jest automatycznie dowodem braku wcześniejszego wpływu marketingu.

#### 6. Halo / billboard effect wymaga confidence

Dane zagregowane mogą wspierać hipotezę halo/billboard effect na poziomie LOW/MEDIUM.

Silniejszy wniosek wymaga:

- danych ścieżkowych,
- albo bardzo mocnych i powtarzalnych sygnałów z wielu źródeł.

---

## 5. System rekomendacji v0.1

### Hierarchia

1. wiarygodność i kompletność danych,
2. lokalizacja problemu biznesowego,
3. weryfikacja możliwej przyczyny,
4. rekomendacja diagnostyczna,
5. decyzja budżetowa lub biznesowa.

### Główna zasada

Zmiana budżetu jest rekomendacją końcową, wymagającą silniejszych dowodów niż sama diagnoza.

### Twarde zasady

#### 1. Rekomendacja wymaga odpowiedniego confidence

LOW confidence kieruje przede wszystkim do:

- sprawdzenia danych,
- zebrania informacji,
- weryfikacji hipotezy,
- obserwacji.

#### 2. Kolejność weryfikacji: pomiar → biznes → reklamy

Jeżeli występuje możliwy problem trackingowy, najpierw diagnozujemy pomiar.

#### 3. Rekomendacja odpowiada konkretnemu problemowi

Zamiast ogólnego:

`zoptymalizuj kampanię`

rekomendacja powinna wskazywać konkretny krok.

#### 4. Każda rekomendacja ma evidence

Łańcuch:

`diagnosis → evidence → confidence → completeness check → recommendation`

#### 5. Niekompletny Profitroom ogranicza rekomendacje sprzedażowe

Rekomendacje zależne od sprzedaży opierają się na wspólnym kompletnym zakresie.

#### 6. Rekomendacje budżetowe są podwyższonego ryzyka

Zmiana:

- budżetu,
- alokacji,
- statusu kampanii

wymaga mocniejszego confidence, odpowiedniego wolumenu i kompletnych danych sprzedażowych.

#### 7. Znane miejsce, nieznana przyczyna → weryfikacja hipotez

Przykład:

`step1_to_step2_rate` spada

prowadzi do sprawdzenia m.in.:

- ceny,
- dostępności,
- min. pobytu,
- wariantów oferty,
- UX Booking Engine.

#### 8. Siła rekomendacji jest proporcjonalna do jakości dowodu

Im większa ingerencja, tym mocniejszego evidence wymaga HMA.

#### 9. HMA rozstrzyga konflikty rekomendacji

Priority Engine wybiera jeden spójny kierunek dla klienta.

#### 10. Język rekomendacji

Rekomendacje klient-facing są:

- konkretne,
- kierunkowe,
- pozytywnie sformułowane.

Przykład:

zamiast:

„Nie wyłączaj kampanii.”

preferowane:

„Utrzymaj kampanię do czasu weryfikacji końcówki lejka.”

### Mapa rekomendacji — kierunki

- `TRACKING_MISMATCH → CHECK_TRACKING`
- `DIRECT_TO_OTA / OTA_TO_DIRECT → CHECK_DIRECT_VS_OTA`
- `TRAFFIC_UP_QUALITY_DOWN → CHECK_TRAFFIC_QUALITY`
- `STEP3_TO_PURCHASE_WEAK → CHECK_END_OF_FUNNEL`
- `TOTAL_DEMAND_UP → CHECK_DEMAND_GROWTH_AND_SCALING_ELIGIBILITY`
- `COST_UP_SALES_FLAT → REVIEW_EFFICIENCY_AND_SCALING`
- `SMALL_CAMPAIGN_HIGH_EFFICIENCY → OBSERVE_AND_VALIDATE_STABILITY`

Action code nie wykonuje automatycznie zmiany.

---

## 6. Format raportu / Podsumowanie okresu v0.2

### Ekran główny — 60 sekund

#### 1. Główny wniosek

Jedno zdanie odpowiadające na pytanie:

„Co najważniejszego wydarzyło się w analizowanym okresie?”

Wniosek posiada `confidence`.

#### 2. Cztery główne KPI biznesowe

Na start:

- `direct_active_bookings`
- `direct_active_revenue`
- `blended_paid_media_cost_per_active_online_booking`
- `direct_booking_share`

Jeżeli dla danego hotelu inny zestaw KPI będzie ważniejszy, może być konfigurowalny.

#### 3. Kompletność Profitroom

Na ekranie widoczna jest informacja:

`Dane sprzedażowe Profitroom kompletne do: YYYY-MM-DD`

#### 4. Co wydarzyło się w okresie?

Krótki opis 3–4 zdania obejmujący najważniejsze zmiany:

- ruch,
- jakość,
- sprzedaż,
- koszt,
- struktura kanałów.

#### 5. Najważniejszy sygnał / problem

Jedna najważniejsza diagnoza wskazana przez Priority Engine.

#### 6. Które działania miały najsilniejszy związek ze sprzedażą?

HMA pokazuje obserwowane zależności wraz z confidence.

Dane zagregowane są opisywane jako wzorzec lub hipoteza, nie jako potwierdzona przyczynowość.

#### 7. Maksymalnie 3 rekomendacje

Rekomendacje:

- wynikają z Priority Engine,
- są spójne,
- mają evidence,
- respektują completeness i confidence.

### Szczegóły niżej / osobne sekcje

- Ruch i jakość ruchu
- Lejek
- Sprzedaż
- Kanały i atrybucja
- Meta Ads
- Google Ads
- Tracking
- Zapytaj dane

### Twarde zasady raportu

- ekran główny pokazuje wyłącznie informacje istotne decyzyjnie,
- hipotezy są oznaczane jako hipotezy,
- częściowe dane są jawnie opisane,
- KPI sprzedażowe wymagają kompletnego Profitroom dla analizowanego zakresu lub wspólnego kompletnego zakresu,
- platform ROAS pozostaje wynikiem platformowym,
- klient otrzymuje maksymalnie 3 rekomendacje.

### Zasada

**Nie pokazuj wszystkiego, co wiemy — pokaż to, co zmienia decyzję klienta.**

---

## 7. Mapa danych dla „Podsumowanie okresu”

### Zasada

Każdy element raportu posiada:

- źródło,
- definicję metryki,
- znaczenie biznesowe,
- informację o kompletności,
- confidence, jeżeli element zawiera wnioskowanie.

### Kategorie danych

- zachowanie użytkowników,
- wynik platformowy,
- realna sprzedaż,
- blended / business efficiency.

### Profitroom — realna sprzedaż

Metryki:

- `direct_active_bookings`
- `direct_active_revenue`
- `booking_com_active_bookings`
- `booking_com_active_revenue`
- `expedia_active_bookings`
- `expedia_active_revenue`
- `hrs_active_bookings`
- `hrs_active_revenue`

oraz analogiczne pola dla pozostałych kanałów raportowanych przez Profitroom.

Dodatkowo:

- `active_online_bookings`
- `active_online_revenue`
- `direct_booking_share = direct_active_bookings / active_online_bookings`
- `direct_revenue_share = direct_active_revenue / active_online_revenue`
- `profitroom_data_through`

Active bookings i cancellations pozostają osobnymi pojęciami.

### GA4 — zachowanie

- `sessions`
- `engaged_view_rate`
- `engaged_session_rate`
- `view_offer_or_room_rate`
- `step1_rate`
- `step1_to_step2_rate`
- `step2_to_step3_rate`
- `step3_to_purchase_rate`
- `purchase`

`purchase` jest zdarzeniem analitycznym i nie zastępuje rezerwacji Profitroom.

### Meta Ads — wynik platformowy

- spend
- impressions
- clicks
- CTR
- CPC
- platform conversions
- attributed conversion value

`Meta platform ROAS = attributed conversion value / spend`

### Google Ads — wynik platformowy

- cost
- impressions
- clicks
- CTR
- CPC
- conversions
- conversion value

`Google Ads platform ROAS = conversion value / cost`

### Blended / business efficiency

`blended_paid_media_cost_per_active_online_booking = (Meta spend + Google Ads cost) / active_online_bookings`

Jest to wskaźnik efektywności biznesowej wydatków paid media.

Nie jest platformowym CPA ani dowodem, że każda rezerwacja została wygenerowana przez reklamę.

### Pola diagnostyczne

- `family`
- `code`
- `scope`
- `scope_id`
- `status`
- `metric_context`
- `evidence`
- `confidence`
- `severity`
- `business_impact`
- `urgency`
- `data_completeness`
- `recommendation_code`
- `action_type`
- `related_diagnostics`
- `client_text`

Łańcuch:

`data → metric → diagnosis → evidence → confidence → recommendation`

---

## 8. AI

### Zasada nadrzędna

AI jest warstwą językową, nie decyzyjną.

Łańcuch:

`data → metric → diagnosis → evidence → confidence → recommendation → AI wording`

### Backend / rule engine przekazuje AI

Co najmniej:

- `metric_value`
- `previous_value`
- `delta_pct`
- `delta_pp`
- `family`
- `diagnostic_code`
- `evidence`
- `confidence`
- `severity`
- `business_impact`
- `urgency`
- `recommendation_code`
- `action_type`
- `data_completeness`
- `client_text`

### Rola AI

AI:

- upraszcza język,
- składa raport,
- tworzy podsumowania,
- odpowiada w „Zapytaj dane”,
- zachowuje znaczenie diagnozy,
- zachowuje confidence,
- zachowuje evidence,
- zachowuje liczby,
- zachowuje kierunek rekomendacji.

### FACT / HYPOTHESIS / RECOMMENDATION

AI rozróżnia:

- `FACT` — dane bezpośrednio potwierdzają stwierdzenie,
- `HYPOTHESIS` — wzorzec wspiera możliwe wyjaśnienie,
- `RECOMMENDATION` — sugerowany kolejny krok.

### Język confidence

MEDIUM:

- „Dane wskazują…”
- „Wzorzec jest zgodny z…”
- „Najbardziej prawdopodobny kierunek do sprawdzenia…”

HIGH może używać bardziej stanowczego języka, jeśli evidence, wolumen i completeness to uzasadniają.

### Liczby

AI używa wyłącznie liczb przekazanych przez warstwę danych / reguł.

Zaokrąglenie może upraszczać komunikat, ale zachowuje znaczenie wyniku.

### Brak lub częściowe dane

AI podaje:

- dostępny zakres,
- datę kompletności,
- zakres możliwej oceny,
- dane potrzebne do pełniejszego wniosku.

### „Zapytaj dane”

Odpowiedzi wykorzystują:

- dane hotelu,
- zdefiniowane metryki,
- kody diagnostyczne,
- evidence,
- confidence,
- recommendation,
- zasady kontraktu.

Pytanie wychodzące poza dostępne dane prowadzi do informacji o aktualnym zakresie i danych potrzebnych do odpowiedzi.

### Zasada różowego słonia

Dotyczy:

- tekstu dla klienta,
- promptów i instrukcji dla AI.

Prompty opisują przede wszystkim:

- co AI ma zrobić,
- z jakich danych korzystać,
- co zachować,
- jaki wynik wygenerować,
- jaki ma być kolejny krok.

Preferowane są pozytywne, konkretne instrukcje zamiast długich list zakazów.

Przykład:

zamiast:

„Nie wymyślaj liczb.”

preferowane:

„Używaj wyłącznie liczb przekazanych przez warstwę danych. Zachowuj ich znaczenie i zakres.”

Negacja może być użyta, gdy wymaga tego jednoznaczność lub bezpieczeństwo.

### Client text

Tekst dla klienta jest:

- prosty,
- konkretny,
- kierunkowy,
- oparty na danych.

Przykłady:

„Utrzymaj kampanię do czasu weryfikacji końcówki lejka.”

„Do pełnej oceny potrzebne są jeszcze dane sprzedażowe za ostatnie dni.”

„Dostępne dane pokazują współwystępowanie zmian. Do potwierdzenia ścieżki potrzebne są dane użytkownika.”

---

## 9. Progi i wiarygodność v0.1

### Zasada nadrzędna

Żaden próg procentowy nie działa samodzielnie.

Każda diagnoza wymaga jednocześnie:

- minimalnego wolumenu,
- odpowiedniej kompletności danych,
- właściwego typu źródła,
- porównywalnego okresu,
- odpowiedniego poziomu jakości dowodu.

### Progi startowe v0.1

Progi są wartościami startowymi i mogą być później kalibrowane dla hotelu, segmentu i typu kampanii.

#### Minimalny wolumen

- kampania: `spend >= 150 PLN`
- ruch: `sessions >= 150`

#### Rezerwacje Profitroom

- `0–2 active bookings` → próba zbyt mała do mocnej oceny sprzedażowej,
- `>=3 active bookings` → możliwe ostrożne wnioski,
- `>=10 active bookings` → wyższa wiarygodność oceny sprzedażowej.

#### Purchase GA4

`purchase` w GA4 jest oceniany osobno od aktywnych rezerwacji Profitroom.

Jeżeli dostępny jest `transaction_id`, purchase powinien być deduplikowany do unikalnych transakcji.

### Progi zmian

Zmiana względna:

- `<10%` → zwykle stabilnie,
- `10–20%` → sygnał do obserwacji,
- `>20%` → potencjalnie istotna zmiana,
- `>40%` → potencjalnie wysoki priorytet przy odpowiednim wolumenie i jakości danych.

Progi te są heurystyką ogólną.

Konkretny kod diagnostyczny może posiadać własny próg.

### Rate i punkty procentowe

Dla rate HMA przechowuje:

- zmianę względną `%`,
- zmianę `pp`.

Przykład:

`step1_rate: 10% → 7,5%`

oznacza:

- `-25%` względnie,
- `-2,5 pp`.

### Confidence

Confidence wynika z jakości dowodu.

Uwzględnia:

- wolumen,
- kompletność,
- świeżość,
- zgodność źródeł,
- typ dowodu,
- dostępność danych ścieżkowych,
- wielkość i stabilność zmiany.

#### LOW

Typowe sytuacje:

- mały wolumen,
- pojedynczy sygnał,
- częściowe dane,
- korelacja bez mocniejszego potwierdzenia.

#### MEDIUM

Typowe sytuacje:

- wystarczający wolumen,
- kilka zgodnych sygnałów,
- kompletne dane dla analizowanego zakresu,
- zgodność zachowania i wyniku biznesowego,
- dobrze wsparta hipoteza bez pełnego dowodu ścieżkowego.

#### HIGH

Typowe warunki:

- odpowiednio duży wolumen,
- kompletne i świeże dane,
- kilka niezależnych źródeł potwierdza ten sam wniosek,
- wysoka spójność sygnałów,
- mocny typ dowodu,
- stabilność w czasie lub potwierdzenie ścieżki.

W analizie atrybucji między kanałami dane zagregowane z reguły prowadzą maksymalnie do `MEDIUM`.

### Zero baseline

Jeżeli wartość bazowa wynosi `0`, standardowa względna zmiana procentowa nie jest używana.

Kod wykorzystuje wtedy:

- zmianę bezwzględną,
- pp,
- albo własną regułę specyficzną dla diagnozy.

### Minimum danych per diagnoza

Każdy podkod posiada własne:

`minimum_data_requirements`

Przykłady:

- traffic quality → sessions,
- Step1→Step2 → Step1,
- Step2→Step3 → Step2,
- Step3→purchase → Step3 / purchase,
- sales structure → bookings,
- budget decision → spend + sales volume.

### Progi biznesowe konfigurowalne per hotel

Przykładowo:

- `target_roas`
- `max_booking_cost`
- `target_direct_share`
- `hotel_segment`
- `target_booking_value`
- `min_volume_for_budget_change`
- `profitroom_freshness_limit`

### Twarda zasada

Progi są narzędziem interpretacji, a nie automatycznym werdyktem.

---

## 10. Diagnostic Families v1

### Struktura diagnozy

Każda diagnoza HMA korzysta ze wspólnego modelu:

- `family`
- `code`
- `scope`
- `scope_id`
- `status`
- `metric_context`
- `evidence`
- `confidence`
- `severity`
- `business_impact`
- `urgency`
- `data_completeness`
- `recommendation_code`
- `action_type`
- `related_diagnostics`
- `client_text`

### Rodziny diagnostyczne

- `DATA_QUALITY`
- `TRAFFIC_QUALITY`
- `FUNNEL`
- `SALES_STRUCTURE`
- `EFFICIENCY`
- `CHANNEL_ROLE`

---

### 10.1 DATA_QUALITY

Rodzina odpowiada na pytanie:

„Czy dane są wystarczająco wiarygodne, kompletne i poprawnie mierzone, aby można było na ich podstawie stawiać diagnozy biznesowe?”

Podkody v1:

- `TRACKING_MISMATCH`
- `INCOMPLETE_PROFITROOM`
- `INSUFFICIENT_DATA`

#### DATA_QUALITY.TRACKING_MISMATCH

Cel:

Wykrycie rozbieżności pomiędzy rezerwacjami Direct utworzonymi w Booking Engine a pomiarem `purchase` w GA4.

Źródła:

Profitroom:

- `direct_created_bookings`
- `profitroom_data_through`

GA4:

- `ga4_unique_purchases`
- `Step3`

Warunki wstępne:

- Profitroom kompletny dla analizowanego zakresu,
- GA4 i Profitroom dotyczą tego samego zakresu dat,
- `direct_created_bookings >= 3`.

Jeżeli dostępny jest `transaction_id`, purchase jest deduplikowany po unikalnym identyfikatorze transakcji.

`tracking_gap = (direct_created_bookings - ga4_unique_purchases) / direct_created_bookings`

Warunek podstawowy:

`tracking_gap >= 30%`

Silny wariant:

- `Step3 >= 5`
- `direct_created_bookings >= 3`
- `ga4_unique_purchases = 0`

Confidence:

- LOW — mała próba lub dane wymagają dodatkowej walidacji,
- MEDIUM — gap `30–50%` przy odpowiednim wolumenie i kompletnych danych,
- HIGH — gap `>50%` albo purchase `=0` przy potwierdzonej sprzedaży i odpowiednim wolumenie.

severity: HIGH  
business_impact: MEDIUM  
urgency: HIGH  
recommendation_code: CHECK_TRACKING  
action_type: TRACKING

related_diagnostics:

- `FUNNEL.STEP3_TO_PURCHASE_WEAK`

Zasada priorytetu:

Jeżeli GA4 pokazuje słaby Step3→purchase, a Profitroom potwierdza normalną liczbę utworzonych rezerwacji Direct, `TRACKING_MISMATCH` ma pierwszeństwo.

#### DATA_QUALITY.INCOMPLETE_PROFITROOM

Cel:

Wykrycie sytuacji, w której Profitroom obejmuje krótszy zakres niż analizowany okres.

Źródła:

- `profitroom_data_through`
- `selected_period_end`

Warunek:

`profitroom_data_through < selected_period_end`

HMA wyznacza:

`common_complete_end = min(selected_period_end, profitroom_data_through)`

GA4, Meta i Google Ads mogą być prezentowane dla pełnego dostępnego zakresu.

Diagnozy sprzedażowe korzystają ze wspólnego kompletnego zakresu.

confidence: HIGH  
severity: MEDIUM  
business_impact: HIGH  
urgency: MEDIUM  
recommendation_code: USE_COMPLETE_SALES_RANGE  
action_type: DATA

related_diagnostics:

- `SALES_STRUCTURE.*`
- `EFFICIENCY.*`
- `FUNNEL.STEP3_TO_PURCHASE_WEAK`
- `DATA_QUALITY.TRACKING_MISMATCH`

#### DATA_QUALITY.INSUFFICIENT_DATA

Cel:

Wykrycie sytuacji, w której ilość danych jest zbyt mała do wiarygodnej diagnozy.

Każdy podkod posiada:

`minimum_data_requirements`

Jeżeli wymagania nie są spełnione:

- kandydat otrzymuje `status = WATCH`,
- uruchamiany jest `INSUFFICIENT_DATA`,
- mocna rekomendacja zostaje wstrzymana.

confidence: HIGH  
severity: LOW  
business_impact: MEDIUM  
urgency: LOW  
recommendation_code: COLLECT_MORE_DATA  
action_type: DATA

---

### 10.2 TRAFFIC_QUALITY

Rodzina odpowiada na pytanie:

„Czy wzrost ruchu oznacza wzrost wartościowego zainteresowania hotelem?”

Podkody v1:

- `TRAFFIC_UP_QUALITY_DOWN`

#### TRAFFIC_QUALITY.TRAFFIC_UP_QUALITY_DOWN

Cel:

Wykrycie sytuacji, w której sessions rosną, ale jakość pierwszego kontaktu ze stroną i ofertą pogarsza się.

Źródło główne:

GA4.

Główne wskaźniki:

- `engaged_view_rate`
- `engaged_session_rate`
- `view_offer_or_room_rate`

Warunki:

- minimum `150 sessions` w obu okresach,
- okresy porównywalne,
- poprawny tracking wymaganych zdarzeń,
- `sessions` rosną względnie o co najmniej `15%`,
- minimum 2 z 3 głównych wskaźników jakości spadają względnie o co najmniej `15%`.

Dla zimnego ruchu:

- YouTube,
- Demand Gen,
- zimna Meta

`step1_rate` jest sygnałem pomocniczym.

Niski Step1 przy stabilnym lub rosnącym zaangażowaniu jest zgodny z rolą kanału budującego popyt.

Po uruchomieniu diagnozy HMA lokalizuje kanał lub kampanię odpowiedzialną za dodatkowy ruch.

Sygnały późniejszego efektu:

- returning users,
- Brand,
- Direct,
- remarketing,
- Step1 podczas późniejszych wizyt.

Zagregowane sygnały wspierają hipotezę assisted effect.

confidence:

- LOW — wolumen blisko minimum lub słaby sygnał,
- MEDIUM — minimum 2 wskaźniki jakości spadają przy odpowiednim wolumenie,
- HIGH — wszystkie 3 spadają, wolumen jest duży i konkretny kanał pokazuje ten sam wzorzec.

severity: MEDIUM  
business_impact: MEDIUM  
urgency: MEDIUM  
recommendation_code: CHECK_TRAFFIC_QUALITY  
action_type: TARGETING / CREATIVE / LANDING / TRAFFIC_SOURCE

related_diagnostics:

- `CHANNEL_ROLE.DEMAND_GENERATOR`
- `EFFICIENCY.COST_UP_SALES_FLAT`

---

### 10.3 FUNNEL

Rodzina odpowiada na pytanie:

„Na którym etapie procesu rezerwacji pojawia się największe osłabienie?”

Podkody v1:

- `STEP1_TO_STEP2_WEAK`
- `STEP2_TO_STEP3_WEAK`
- `STEP3_TO_PURCHASE_WEAK`

#### FUNNEL.STEP1_TO_STEP2_WEAK

Cel:

Wykrycie osłabienia pomiędzy Step1 i Step2.

Główna metryka:

`step1_to_step2_rate = Step2 / Step1`

Warunki:

- `Step1 >= 20` w obu okresach,
- okresy porównywalne,
- poprawny tracking Step1 i Step2,
- względny spadek rate o co najmniej `20%`.

Interpretacja:

Największe osłabienie występuje pomiędzy Step1 i Step2.

Możliwe przyczyny do sprawdzenia:

- cena,
- dostępność,
- minimalna długość pobytu,
- warunki oferty,
- wybór pokoi,
- UX,
- szybkość lub błędy Booking Engine.

confidence:

- LOW — wolumen blisko minimum lub słaby spadek,
- MEDIUM — odpowiedni wolumen i wyraźny spadek,
- HIGH — duży wolumen, mocny i powtarzalny wzorzec.

severity: MEDIUM  
business_impact: HIGH  
urgency: MEDIUM  
recommendation_code: CHECK_STEP1_TO_STEP2  
action_type: OFFER / AVAILABILITY / BOOKING_ENGINE / UX

#### FUNNEL.STEP2_TO_STEP3_WEAK

Cel:

Wykrycie osłabienia pomiędzy Step2 i Step3.

Główna metryka:

`step2_to_step3_rate = Step3 / Step2`

Warunki:

- `Step2 >= 20` w obu okresach,
- okresy porównywalne,
- poprawny tracking Step2 i Step3,
- względny spadek rate o co najmniej `20%`.

Możliwe przyczyny:

- cena końcowa,
- koszt dodatków,
- warunki oferty,
- minimalny pobyt,
- dostępność dogodnej opcji,
- złożoność procesu,
- UX,
- problem techniczny Booking Engine.

confidence:

- LOW — wolumen blisko minimum lub słaby spadek,
- MEDIUM — odpowiedni wolumen i wyraźny spadek,
- HIGH — duży wolumen, mocny i powtarzalny wzorzec.

severity: HIGH  
business_impact: HIGH  
urgency: MEDIUM  
recommendation_code: CHECK_STEP2_TO_STEP3  
action_type: OFFER / CHECKOUT / BOOKING_ENGINE / UX

#### FUNNEL.STEP3_TO_PURCHASE_WEAK

Cel:

Wykrycie sytuacji, w której wcześniejsza część lejka jest względnie stabilna, a osłabienie pojawia się na końcu procesu.

Źródła:

GA4:

- Step2,
- Step3,
- `ga4_unique_purchases`,
- `step2_to_step3_rate`,
- `step3_to_purchase_rate`.

Profitroom:

- `direct_created_bookings`,
- `direct_active_bookings`,
- `profitroom_data_through`.

Warunki:

- `Step2 >= 20`,
- `Step3 >= 5`,
- porównywalne okresy,
- poprawny tracking,
- kompletny Profitroom dla analizowanego zakresu,
- `step3_to_purchase_rate` spada względnie o co najmniej `20%`,
- wcześniejsza część lejka pozostaje względnie stabilna.

Walidacja Profitroom:

A. GA4 słabnie, Profitroom created bookings stabilne/rosną  
→ sygnał problemu pomiarowego, priorytet dla `DATA_QUALITY.TRACKING_MISMATCH`.

B. GA4 słabnie i Profitroom created bookings spadają  
→ rośnie prawdopodobieństwo realnego osłabienia końcówki procesu.

`direct_created_bookings` służy do walidacji zakończenia rezerwacji.

`direct_active_bookings` służy do oceny wyniku biznesowego po anulacjach.

severity: HIGH  
business_impact: HIGH  
urgency: HIGH  
recommendation_code: CHECK_END_OF_FUNNEL  
action_type: TRACKING / CHECKOUT / OFFER

---

### 10.4 SALES_STRUCTURE

Rodzina odpowiada na pytanie:

„Czy zmieniła się całkowita sprzedaż online hotelu albo jej struktura pomiędzy Direct i OTA?”

Źródło główne:

Profitroom.

Podkody v1:

- `TOTAL_DEMAND_UP`
- `TOTAL_DEMAND_DOWN`
- `DIRECT_TO_OTA`
- `OTA_TO_DIRECT`

Twarde zasady rodziny:

- Profitroom jest źródłem prawdy o sprzedaży.
- Analizujemy aktywne rezerwacje i aktywny revenue.
- Kanały Profitroom zachowujemy osobno.
- Agregaty OTA są wskaźnikami pomocniczymi.
- Bookings, revenue i average booking value analizujemy razem.
- Najpierw oceniamy zmianę całkowitej sprzedaży, następnie zmianę miksu kanałów.
- Zmiana udziału kanału sama w sobie nie oznacza poprawy lub pogorszenia całego biznesu.

#### SALES_STRUCTURE.TOTAL_DEMAND_UP

Cel:

Wykrycie realnego wzrostu całkowitej sprzedaży online hotelu.

Źródło główne:

Profitroom.

Główne metryki:

- `active_online_bookings`
- `active_online_revenue`
- `average_booking_value`

Dodatkowo analizujemy strukturę wzrostu per kanał:

- Direct / Booking Engine
- Booking.com
- Expedia
- HRS
- pozostałe kanały występujące w danych Profitroom

Warunki wstępne:

- Profitroom kompletny dla obu porównywanych okresów,
- okresy porównywalne,
- minimum `10 active_online_bookings` w każdym okresie dla pełnej diagnozy,
- dane dotyczą aktywnych rezerwacji.

Warunek podstawowy:

- `active_online_bookings` rośnie względnie o co najmniej `15%`,
- `active_online_revenue` rośnie względnie o co najmniej `15%`.

Twarda zasada:

Wzrost jednego kanału nie wystarcza do uruchomienia `TOTAL_DEMAND_UP`, jeżeli całkowita sprzedaż online pozostaje stabilna albo spada.

Interpretacja:

„Całkowita sprzedaż online wzrosła.”

HMA powinien dodatkowo wskazać:

- które kanały odpowiadają za wzrost,
- czy wzrost jest szeroki, czy skoncentrowany w jednym kanale,
- jak zmieniła się średnia wartość rezerwacji.

Confidence:

- LOW — mały wolumen albo wzrost blisko progu,
- MEDIUM — bookings i revenue rosną przy wystarczającym wolumenie,
- HIGH — bookings i revenue rosną wyraźnie, wolumen jest duży, a wzrost jest potwierdzony przez kilka zgodnych sygnałów lub kanałów.

severity: POSITIVE

business_impact: HIGH

urgency: LOW

recommendation_code: CHECK_DEMAND_GROWTH_AND_SCALING_ELIGIBILITY

action_type: STRATEGY / BUDGET

related_diagnostics:

- `SALES_STRUCTURE.OTA_TO_DIRECT`
- `SALES_STRUCTURE.DIRECT_TO_OTA`
- `EFFICIENCY.SALES_UP_EFFICIENCY_GOOD`

Twarda zasada rekomendacji:

`TOTAL_DEMAND_UP` sam w sobie nie uruchamia automatycznego zwiększenia budżetu.

HMA najpierw sprawdza:

- efektywność kosztową,
- stabilność wzrostu,
- udział Direct,
- kompletność danych,
- minimalny wolumen wymagany dla decyzji budżetowej.

#### SALES_STRUCTURE.TOTAL_DEMAND_DOWN

Cel:

Wykrycie realnego spadku całkowitej sprzedaży online hotelu.

Źródło główne:

Profitroom.

Główne metryki:

- `active_online_bookings`
- `active_online_revenue`
- `average_booking_value`

Dodatkowo analizujemy zmianę per kanał:

- Direct / Booking Engine
- Booking.com
- Expedia
- HRS
- pozostałe kanały występujące w danych Profitroom

Warunki wstępne:

- Profitroom kompletny dla obu porównywanych okresów,
- okresy porównywalne,
- minimum `10 active_online_bookings` w każdym okresie dla pełnej diagnozy,
- dane dotyczą aktywnych rezerwacji.

Warunek podstawowy:

- `active_online_bookings` spada względnie o co najmniej `15%`,
- `active_online_revenue` spada względnie o co najmniej `15%`.

Twarda zasada:

Spadek liczby rezerwacji bez jednoczesnego spadku revenue nie uruchamia automatycznie `TOTAL_DEMAND_DOWN`.

HMA powinien dodatkowo ocenić zmianę `average_booking_value`.

Interpretacja:

„Całkowita sprzedaż online osłabła.”

HMA powinien dodatkowo wskazać:

- które kanały odpowiadają za spadek,
- czy spadek jest szeroki, czy skoncentrowany w jednym kanale,
- jak zmieniła się średnia wartość rezerwacji,
- czy Direct i OTA zachowują się podobnie, czy występuje zmiana miksu kanałów.

Confidence:

- LOW — mały wolumen albo spadek blisko progu,
- MEDIUM — bookings i revenue spadają przy wystarczającym wolumenie,
- HIGH — bookings i revenue spadają wyraźnie, wolumen jest duży, a spadek jest widoczny w kilku zgodnych sygnałach lub kanałach.

severity: HIGH

business_impact: HIGH

urgency: HIGH

recommendation_code: CHECK_TOTAL_DEMAND_DECLINE

action_type: SALES / STRATEGY

related_diagnostics:

- `SALES_STRUCTURE.DIRECT_TO_OTA`
- `SALES_STRUCTURE.OTA_TO_DIRECT`
- `EFFICIENCY.COST_UP_SALES_FLAT`
- `FUNNEL.*`

Twarda zasada rekomendacji:

`TOTAL_DEMAND_DOWN` prowadzi najpierw do lokalizacji problemu:

- ruch,
- jakość ruchu,
- lejek,
- dostępność / oferta,
- miks kanałów,
- tracking,
- koszty kampanii.

#### SALES_STRUCTURE.DIRECT_TO_OTA

Cel:

Wykrycie zmiany struktury sprzedaży, w której udział sprzedaży Direct osłabia się, a sprzedaż przez OTA rośnie.

Źródło główne:

Profitroom.

Główne metryki:

- `direct_active_bookings`
- `direct_active_revenue`
- `ota_total_active_bookings`
- `ota_total_active_revenue`
- `active_online_bookings`
- `active_online_revenue`
- `direct_booking_share`
- `direct_revenue_share`

Dodatkowo analizujemy poszczególne kanały OTA:

- Booking.com
- Expedia
- HRS
- pozostałe kanały występujące w danych Profitroom

Warunki wstępne:

- Profitroom kompletny dla obu porównywanych okresów,
- okresy porównywalne,
- `direct_active_bookings >= 3` w okresie bazowym,
- `ota_total_active_bookings >= 3` w okresie bazowym,
- odpowiedni wolumen całkowitej sprzedaży online.

Warunek podstawowy:

- `direct_active_bookings` spada względnie o co najmniej `15%`,
- `ota_total_active_bookings` rośnie względnie o co najmniej `15%`,
- `direct_booking_share` spada.

Warunek wspierający:

- `direct_revenue_share` również spada.

Zabezpieczenie:

`DIRECT_TO_OTA` opisuje zmianę miksu kanałów.

Jeżeli `active_online_bookings` lub `active_online_revenue` spadają mocno dla całej sprzedaży, pierwszeństwo ma diagnoza `TOTAL_DEMAND_DOWN`.

Orientacyjnie:

- spadek total online mniejszy niż `10%` jest zgodny z czystym przesunięciem struktury,
- większy spadek wymaga równoległej oceny całkowitego popytu.

Interpretacja:

„Struktura sprzedaży przesuwa się z Direct w stronę OTA.”

HMA powinien wskazać:

- który konkretny kanał OTA odpowiada za wzrost,
- jak zmienił się udział Direct w bookings,
- jak zmienił się udział Direct w revenue,
- czy całkowita sprzedaż pozostaje stabilna, rośnie czy spada.

Confidence:

- LOW — mały wolumen albo zmiana blisko progu,
- MEDIUM — Direct spada, OTA rośnie, a direct booking share wyraźnie spada przy odpowiednim wolumenie,
- HIGH — bookings, revenue share i konkretny kanał OTA pokazują spójny i wyraźny wzorzec przy dużym wolumenie.

severity: MEDIUM

business_impact: HIGH

urgency: MEDIUM

recommendation_code: CHECK_DIRECT_VS_OTA

action_type: DISTRIBUTION / OFFER / PRICING / CHANNEL_MIX

related_diagnostics:

- `SALES_STRUCTURE.TOTAL_DEMAND_UP`
- `SALES_STRUCTURE.TOTAL_DEMAND_DOWN`
- `EFFICIENCY.COST_UP_SALES_FLAT`
- `CHANNEL_ROLE.*`

Twarda zasada:

`DIRECT_TO_OTA` opisuje zmianę struktury sprzedaży.

Przed rekomendacją HMA sprawdza:

- parytet cenowy Direct vs OTA,
- dostępność,
- warunki rezerwacji,
- minimalną długość pobytu,
- ofertę specjalną,
- widoczność Direct,
- branded search,
- koszt pozyskania Direct,
- całkowity poziom sprzedaży.

#### SALES_STRUCTURE.OTA_TO_DIRECT

Cel:

Wykrycie zmiany struktury sprzedaży, w której sprzedaż Direct rośnie, a udział OTA maleje.

Źródło główne:

Profitroom.

Główne metryki:

- `direct_active_bookings`
- `direct_active_revenue`
- `ota_total_active_bookings`
- `ota_total_active_revenue`
- `active_online_bookings`
- `active_online_revenue`
- `direct_booking_share`
- `direct_revenue_share`

Dodatkowo analizujemy poszczególne kanały OTA:

- Booking.com
- Expedia
- HRS
- pozostałe kanały występujące w danych Profitroom

Warunki wstępne:

- Profitroom kompletny dla obu porównywanych okresów,
- okresy porównywalne,
- `direct_active_bookings >= 3` w okresie bazowym,
- `ota_total_active_bookings >= 3` w okresie bazowym,
- odpowiedni wolumen całkowitej sprzedaży online.

Warunek podstawowy:

- `direct_active_bookings` rośnie względnie o co najmniej `15%`,
- `ota_total_active_bookings` spada względnie o co najmniej `15%`,
- `direct_booking_share` rośnie.

Warunek wspierający:

- `direct_revenue_share` również rośnie.

Zabezpieczenie:

`OTA_TO_DIRECT` opisuje zmianę miksu kanałów.

Jeżeli `active_online_bookings` lub `active_online_revenue` mocno spadają dla całej sprzedaży, pierwszeństwo ma diagnoza `TOTAL_DEMAND_DOWN`.

Orientacyjnie:

- spadek total online mniejszy niż `10%` jest zgodny z przesunięciem struktury,
- większy spadek wymaga równoległej oceny całkowitego popytu.

Interpretacja:

„Struktura sprzedaży przesuwa się w stronę Direct.”

HMA powinien wskazać:

- które kanały OTA odpowiadają za spadek,
- jak zmienił się udział Direct w bookings,
- jak zmienił się udział Direct w revenue,
- czy całkowita sprzedaż pozostaje stabilna, rośnie czy spada.

Confidence:

- LOW — mały wolumen albo zmiana blisko progu,
- MEDIUM — Direct rośnie, OTA spada, a direct booking share wyraźnie rośnie przy odpowiednim wolumenie,
- HIGH — bookings, revenue share i konkretne kanały pokazują spójny i wyraźny wzorzec przy dużym wolumenie.

severity: POSITIVE

business_impact: HIGH

urgency: LOW

recommendation_code: CHECK_DIRECT_GROWTH_QUALITY

action_type: DISTRIBUTION / STRATEGY / CHANNEL_MIX

related_diagnostics:

- `SALES_STRUCTURE.TOTAL_DEMAND_UP`
- `SALES_STRUCTURE.TOTAL_DEMAND_DOWN`
- `EFFICIENCY.SALES_UP_EFFICIENCY_GOOD`
- `CHANNEL_ROLE.*`

Twarda zasada:

`OTA_TO_DIRECT` opisuje zmianę struktury.

HMA sprawdza dodatkowo:

- całkowity poziom sprzedaży,
- revenue,
- average booking value,
- koszt pozyskania Direct,
- stabilność wzrostu,
- zmianę udziału kanałów.

Przykład:

Jeżeli:

- OTA spada `-50%`,
- Direct rośnie `+10%`,
- total online spada `-30%`,

główną diagnozą jest `TOTAL_DEMAND_DOWN`, a wzrost udziału Direct pozostaje zmianą struktury.

---

### 10.5 EFFICIENCY

Rodzina odpowiada na pytanie:

„Czy koszt płatnych działań pozostaje proporcjonalny do realnego wyniku sprzedażowego hotelu?”

Podkody v1:

- `COST_UP_SALES_FLAT`
- `SALES_UP_EFFICIENCY_GOOD`

Twarde zasady rodziny:

- koszt płatnych działań oceniamy łącznie i per kanał,
- realna sprzedaż pochodzi z Profitroom,
- platformowe ROAS są sygnałami pomocniczymi,
- decyzja budżetowa wymaga wyższego confidence niż sama diagnoza efektywności,
- wzrost kosztu bez wzrostu sprzedaży wymaga najpierw sprawdzenia roli kanału, jakości ruchu i opóźnienia efektu.

#### EFFICIENCY.COST_UP_SALES_FLAT

Cel:

Wykrycie sytuacji, w której łączny koszt płatnych kampanii rośnie, a realna sprzedaż online pozostaje względnie stabilna.

Źródła:

Meta Ads:

- `spend`

Google Ads:

- `cost`

Profitroom:

- `active_online_bookings`
- `active_online_revenue`
- `profitroom_data_through`

Metryka kosztowa:

`total_paid_media_cost = Meta spend + Google Ads cost`

Warunki wstępne:

- Profitroom kompletny dla obu porównywanych okresów,
- okresy porównywalne,
- odpowiedni wolumen sprzedaży,
- `total_paid_media_cost >= 150 PLN` w obu okresach,
- dane Meta Ads i Google Ads obejmują ten sam analizowany zakres.

Warunek podstawowy:

- `total_paid_media_cost` rośnie względnie o co najmniej `20%`,
- `active_online_bookings` zmieniają się w przedziale od `-10%` do `+10%`,
- `active_online_revenue` zmienia się w przedziale od `-10%` do `+10%`.

Interpretacja:

„Koszt płatnych działań wzrósł, podczas gdy całkowita sprzedaż online pozostała względnie stabilna.”

HMA powinien dodatkowo sprawdzić:

- który kanał odpowiada za wzrost kosztu,
- czy wzrost kosztu dotyczy Meta Ads, Google Ads czy obu,
- czy zmienił się `blended_paid_media_cost_per_active_online_booking`,
- czy Direct i OTA zachowują się podobnie,
- czy wzrost kosztu poprzedza późniejszy efekt sprzedażowy,
- czy zmieniła się jakość ruchu lub lejek.

Confidence:

- LOW — wolumen blisko minimum albo częściowa zgodność sygnałów,
- MEDIUM — koszt rośnie wyraźnie, sprzedaż jest stabilna, a dane są kompletne,
- HIGH — wzrost kosztu jest duży i powtarzalny, sprzedaż pozostaje stabilna, a kilka okresów lub źródeł pokazuje ten sam wzorzec.

severity: HIGH

business_impact: HIGH

urgency: MEDIUM

recommendation_code: REVIEW_EFFICIENCY_AND_SCALING

action_type: BUDGET / CHANNEL_MIX / CAMPAIGN / STRATEGY

related_diagnostics:

- `SALES_STRUCTURE.TOTAL_DEMAND_DOWN`
- `SALES_STRUCTURE.DIRECT_TO_OTA`
- `TRAFFIC_QUALITY.TRAFFIC_UP_QUALITY_DOWN`
- `CHANNEL_ROLE.*`

Twarda zasada:

`COST_UP_SALES_FLAT` nie oznacza automatycznie, że kampanie są nieefektywne.

HMA powinien najpierw sprawdzić:

- rolę kanałów,
- opóźnienie między kosztem a sprzedażą,
- zmianę jakości ruchu,
- udział Direct,
- kompletność Profitroom,
- platformowe ROAS,
- blended cost per active online booking.

Rekomendacja budżetowa pojawia się dopiero po potwierdzeniu, że wzrost kosztu nie ma wystarczającego uzasadnienia w sprzedaży, jakości ruchu ani roli kanału.

#### EFFICIENCY.SALES_UP_EFFICIENCY_GOOD

Cel:

Wykrycie sytuacji, w której realna sprzedaż online rośnie, a koszt płatnych działań rośnie wolniej, pozostaje stabilny albo poprawia się koszt pozyskania sprzedaży.

Źródła:

Meta Ads:

- `spend`

Google Ads:

- `cost`

Profitroom:

- `active_online_bookings`
- `active_online_revenue`
- `profitroom_data_through`

Metryki:

- `total_paid_media_cost = Meta spend + Google Ads cost`
- `blended_paid_media_cost_per_active_online_booking`
- `active_online_bookings`
- `active_online_revenue`

Warunki wstępne:

- Profitroom kompletny dla obu porównywanych okresów,
- okresy porównywalne,
- odpowiedni wolumen sprzedaży,
- dane Meta Ads i Google Ads obejmują ten sam analizowany zakres.

Warunek podstawowy:

- `active_online_bookings` rosną względnie o co najmniej `15%`,
- `active_online_revenue` rośnie względnie o co najmniej `15%`,
- `blended_paid_media_cost_per_active_online_booking` pozostaje stabilny albo spada.

Wariant wspierający:

`total_paid_media_cost` może rosnąć, jeżeli sprzedaż rośnie szybciej niż koszt.

Interpretacja:

„Sprzedaż online rośnie przy utrzymanej lub poprawiającej się efektywności kosztowej płatnych działań.”

HMA powinien dodatkowo sprawdzić:

- który kanał odpowiada za wzrost sprzedaży,
- czy wzrost jest stabilny w czasie,
- czy Direct rośnie razem z total online,
- czy wzrost nie wynika wyłącznie z jednego kanału OTA,
- czy platformowe ROAS Meta i Google Ads są zgodne z kierunkiem zmian,
- czy jakość ruchu i lejek wspierają wzrost.

Confidence:

- LOW — mały wolumen albo wzrost blisko progu,
- MEDIUM — bookings i revenue rosną przy stabilnym lub lepszym blended cost,
- HIGH — wzrost sprzedaży jest wyraźny, wolumen duży, efektywność poprawia się, a kilka źródeł potwierdza ten sam kierunek.

severity: POSITIVE

business_impact: HIGH

urgency: LOW

recommendation_code: CHECK_SCALING_ELIGIBILITY

action_type: STRATEGY / BUDGET / CHANNEL_MIX

related_diagnostics:

- `SALES_STRUCTURE.TOTAL_DEMAND_UP`
- `SALES_STRUCTURE.OTA_TO_DIRECT`
- `CHANNEL_ROLE.*`

Twarda zasada:

`SALES_UP_EFFICIENCY_GOOD` nie oznacza automatycznego zwiększenia budżetu.

HMA przed rekomendacją skalowania sprawdza:

- minimalny wolumen wymagany dla decyzji budżetowej,
- stabilność wyniku w czasie,
- kompletność danych,
- udział Direct,
- jakość ruchu,
- lejek,
- rolę kanału,
- dostępny potencjał budżetowy.

Dopiero po spełnieniu warunków skalowania możliwa jest rekomendacja zwiększenia budżetu.

---

### 10.6 CHANNEL_ROLE

Rodzina odpowiada na pytanie:

„Jaką rolę kanał pełnił w analizowanym okresie: generował popyt, wspierał decyzję czy domykał sprzedaż?”

Podkody v1:

- `DEMAND_GENERATOR`
- `ASSISTER`
- `CLOSER`

Twarde zasady rodziny:

- rola kanału dotyczy konkretnego okresu,
- rola wynika z zestawu sygnałów,
- dane zagregowane wskazują wzorzec,
- potwierdzona ścieżka wymaga danych użytkownika,
- rola kanału sama w sobie nie uruchamia decyzji budżetowej.

#### CHANNEL_ROLE.DEMAND_GENERATOR

Cel:

Wykrycie sytuacji, w której kanał przede wszystkim zwiększa zainteresowanie hotelem i zasila górę lejka, a jego wpływ na sprzedaż może pojawiać się później lub w innym kanale.

Zakres:

Diagnoza działa na poziomie:

- kanału,
- typu kampanii,
- opcjonalnie konkretnej kampanii.

Przykładowe kanały:

- Meta Ads,
- YouTube,
- Demand Gen,
- Google Generic Search,
- inne kanały zwiększające nowy popyt.

Źródła:

GA4:

- sessions,
- new users,
- returning users,
- `engaged_view_rate`,
- `view_offer_or_room_rate`,
- `step1_rate`,
- Step1 / Step2 / Step3,
- purchase.

Meta Ads / Google Ads:

- spend / cost,
- impressions,
- clicks,
- CTR,
- CPC,
- platform conversions.

Profitroom:

- sprzedaż Direct,
- sprzedaż całkowita,
- dane kompletności.

Dodatkowe sygnały:

- branded search,
- Direct,
- returning users,
- remarketing,
- późniejsze wejścia do lejka.

Warunki wstępne:

- odpowiedni wolumen ruchu dla analizowanego kanału,
- poprawny tracking,
- porównywalne okresy,
- identyfikowalne źródło lub kampania.

Warunek podstawowy:

Kanał może otrzymać rolę `DEMAND_GENERATOR`, jeżeli występuje kilka zgodnych sygnałów:

- istotny wzrost lub wysoki udział nowego ruchu,
- stabilny lub dobry `engaged_view_rate`,
- stabilny lub dobry `view_offer_or_room_rate`,
- wzrost zainteresowania ofertą,
- bez konieczności wysokiego `step1_rate` podczas pierwszego kontaktu,
- późniejsze sygnały w Brand, Direct, returning users, remarketing lub dalszych etapach lejka.

Twarda zasada:

Niski poziom bezpośrednich purchase lub Step1 nie wyklucza roli `DEMAND_GENERATOR`, jeżeli kanał dostarcza jakościowy nowy ruch i istnieją sygnały późniejszego efektu.

Dane zagregowane:

Jeżeli dostępne są wyłącznie dane zagregowane, HMA może stwierdzić:

„Wzorzec jest zgodny z rolą kanału generującego popyt.”

Potwierdzenie konkretnej ścieżki użytkownika wymaga danych ścieżkowych.

Interpretacja:

„Kanał najprawdopodobniej pełni rolę generatora popytu.”

HMA powinien dodatkowo wskazać:

- jaki ruch kanał generuje,
- jak wygląda jakość tego ruchu,
- czy pojawiają się późniejsze sygnały zainteresowania,
- czy wzrost sprzedaży występuje w tym samym lub późniejszym okresie,
- czy istnieją dane pozwalające potwierdzić ścieżkę użytkownika.

Confidence:

- LOW — kanał generuje dużo ruchu, ale późniejsze sygnały są słabe lub niepełne,
- MEDIUM — jakość ruchu jest dobra i kilka późniejszych sygnałów wspiera rolę demand generation,
- HIGH — dostępne dane ścieżkowe albo bardzo silny, powtarzalny wzorzec z kilku źródeł potwierdza rolę kanału.

severity: INFO

business_impact: MEDIUM

urgency: LOW

recommendation_code: MAINTAIN_AND_EVALUATE_DEMAND_GENERATION

action_type: CHANNEL_ROLE / STRATEGY

related_diagnostics:

- `TRAFFIC_QUALITY.TRAFFIC_UP_QUALITY_DOWN`
- `SALES_STRUCTURE.TOTAL_DEMAND_UP`
- `EFFICIENCY.COST_UP_SALES_FLAT`
- `CHANNEL_ROLE.ASSISTER`
- `CHANNEL_ROLE.CLOSER`

Twarda zasada rekomendacji:

`DEMAND_GENERATOR` nie jest samodzielnym sygnałem do zwiększenia ani zmniejszenia budżetu.

Decyzja budżetowa wymaga dodatkowo oceny:

- jakości ruchu,
- kosztu,
- późniejszego efektu,
- sprzedaży,
- roli pozostałych kanałów,
- confidence.

#### CHANNEL_ROLE.ASSISTER

Cel:

Wykrycie sytuacji, w której kanał wspiera użytkownika w procesie decyzyjnym i pomaga przesuwać go w głąb ścieżki, ale często nie jest ostatnim kanałem przed rezerwacją.

Zakres:

Diagnoza działa na poziomie:

- kanału,
- typu kampanii,
- opcjonalnie konkretnej kampanii.

Przykładowe kanały:

- Meta Ads,
- Google Generic Search,
- Organic Search,
- remarketing,
- newsletter,
- inne kanały wspierające decyzję.

Źródła:

GA4:

- sessions,
- returning users,
- `engaged_view_rate`,
- `view_offer_or_room_rate`,
- `step1_rate`,
- Step1,
- Step2,
- Step3,
- purchase.

Meta Ads / Google Ads:

- spend / cost,
- clicks,
- platform conversions,
- conversion value.

Profitroom:

- Direct bookings,
- total online bookings,
- revenue,
- completeness.

Dodatkowe sygnały:

- wzrost returning users,
- wzrost Brand,
- wzrost Direct,
- wejścia remarketingowe,
- przejścia użytkowników do głębszych etapów lejka w późniejszych wizytach.

Warunki wstępne:

- odpowiedni wolumen danych,
- poprawny tracking,
- porównywalne okresy,
- możliwe przypisanie ruchu do konkretnego kanału lub kampanii.

Warunek podstawowy:

Kanał może otrzymać rolę `ASSISTER`, jeżeli występuje kilka zgodnych sygnałów:

- ruch z kanału wykazuje dobrą jakość,
- użytkownicy przechodzą do Step1, Step2 lub Step3,
- udział bezpośrednich purchase może być umiarkowany,
- w późniejszym okresie rosną returning users, Brand, Direct lub remarketing,
- kanał współwystępuje ze wzrostem sprzedaży lub głębszego zaangażowania.

Twarda zasada:

`ASSISTER` oznacza wsparcie procesu decyzyjnego.

Dane zagregowane mogą wspierać hipotezę assisted effect.

Potwierdzenie, że konkretny użytkownik miał kontakt z kanałem przed późniejszą rezerwacją, wymaga danych ścieżkowych.

Interpretacja:

„Kanał najprawdopodobniej wspiera decyzję użytkownika i pomaga przesuwać go w głąb procesu rezerwacyjnego.”

HMA powinien dodatkowo wskazać:

- które etapy lejka kanał wspiera,
- czy użytkownicy wracają później,
- czy wzrastają Brand, Direct lub remarketing,
- czy kanał generuje wartościowe zachowania mimo umiarkowanej liczby bezpośrednich purchase,
- czy istnieją dane ścieżkowe potwierdzające rolę wspomagającą.

Confidence:

- LOW — pojedynczy sygnał lub mały wolumen,
- MEDIUM — kilka zgodnych sygnałów z lejka i późniejszych zachowań,
- HIGH — dane ścieżkowe albo mocny, powtarzalny wzorzec potwierdzony przez kilka źródeł.

severity: INFO

business_impact: MEDIUM

urgency: LOW

recommendation_code: MAINTAIN_AND_EVALUATE_ASSISTING_ROLE

action_type: CHANNEL_ROLE / STRATEGY

related_diagnostics:

- `CHANNEL_ROLE.DEMAND_GENERATOR`
- `CHANNEL_ROLE.CLOSER`
- `TRAFFIC_QUALITY.TRAFFIC_UP_QUALITY_DOWN`
- `SALES_STRUCTURE.TOTAL_DEMAND_UP`
- `EFFICIENCY.COST_UP_SALES_FLAT`

Twarda zasada rekomendacji:

`ASSISTER` sam w sobie nie uzasadnia decyzji budżetowej.

HMA przed zmianą budżetu sprawdza:

- koszt kanału,
- jakość ruchu,
- głębokość lejka,
- późniejsze zachowania użytkowników,
- sprzedaż,
- rolę innych kanałów,
- confidence.

#### CHANNEL_ROLE.CLOSER

Cel:

Wykrycie sytuacji, w której kanał przede wszystkim domyka istniejący popyt i pojawia się blisko końca procesu rezerwacyjnego.

Zakres:

Diagnoza działa na poziomie:

- kanału,
- typu kampanii,
- opcjonalnie konkretnej kampanii.

Przykładowe kanały:

- Google Brand,
- remarketing,
- Direct,
- kanały o wysokiej intencji zakupowej.

Źródła:

GA4:

- sessions,
- `step1_rate`,
- Step1,
- Step2,
- Step3,
- purchase.

Google Ads / Meta Ads:

- spend / cost,
- clicks,
- platform conversions,
- conversion value,
- platform ROAS.

Profitroom:

- Direct bookings,
- Direct revenue,
- total online bookings,
- total online revenue,
- completeness.

Dodatkowe sygnały:

- wysoki udział sesji o silnej intencji,
- wysoki udział Step2 / Step3 / purchase,
- branded search,
- returning users,
- wzrost Direct,
- krótki czas pomiędzy wejściem a rezerwacją, jeżeli taki sygnał jest dostępny.

Warunki wstępne:

- odpowiedni wolumen danych,
- poprawny tracking,
- porównywalne okresy,
- możliwe przypisanie ruchu do konkretnego kanału lub kampanii.

Warunek podstawowy:

Kanał może otrzymać rolę `CLOSER`, jeżeli występuje kilka zgodnych sygnałów:

- użytkownicy wchodzą z wysoką intencją,
- relatywnie często przechodzą do Step1, Step2 lub Step3,
- kanał ma wysoki udział w purchase lub platform conversions,
- wzrost kanału współwystępuje ze wzrostem Direct lub aktywnych rezerwacji,
- użytkownicy często są returning users albo trafiają przez Brand / remarketing / Direct.

Twarda zasada:

Wysoka liczba konwersji last-click nie oznacza automatycznie, że kanał sam wygenerował popyt.

`CLOSER` opisuje rolę domykającą.

Interpretacja:

„Kanał najprawdopodobniej pełni rolę domykającą i przechwytuje użytkowników o wysokiej gotowości do rezerwacji.”

HMA powinien dodatkowo wskazać:

- jak głęboko użytkownicy wchodzą w lejek,
- czy kanał ma wysoki udział Step2 / Step3 / purchase,
- czy użytkownicy są powracający,
- czy kanał współwystępuje ze wzrostem Direct lub sprzedaży,
- czy wcześniejsze kanały mogły generować lub wspierać popyt.

Confidence:

- LOW — mały wolumen albo pojedynczy sygnał,
- MEDIUM — kilka zgodnych sygnałów wysokiej intencji i sprzedaży,
- HIGH — mocny, powtarzalny wzorzec i dane ścieżkowe albo bardzo silna zgodność kilku źródeł.

severity: INFO

business_impact: MEDIUM

urgency: LOW

recommendation_code: MAINTAIN_AND_EVALUATE_CLOSING_ROLE

action_type: CHANNEL_ROLE / STRATEGY

related_diagnostics:

- `CHANNEL_ROLE.DEMAND_GENERATOR`
- `CHANNEL_ROLE.ASSISTER`
- `SALES_STRUCTURE.TOTAL_DEMAND_UP`
- `SALES_STRUCTURE.OTA_TO_DIRECT`
- `EFFICIENCY.SALES_UP_EFFICIENCY_GOOD`

Twarda zasada rekomendacji:

`CLOSER` sam w sobie nie uzasadnia zwiększenia budżetu.

HMA przed decyzją budżetową sprawdza:

- koszt kanału,
- udział w sprzedaży,
- jakość końcowego ruchu,
- rolę wcześniejszych kanałów,
- możliwość przejęcia konwersji przez last-click,
- confidence.

---

## 11. Priority Engine v0.2

### Cel

Priority Engine ustala:

- który problem biznesowy jest najważniejszy,
- która diagnoza jest najbardziej użyteczna operacyjnie,
- które rekomendacje można pokazać klientowi,
- które diagnozy wymagają statusu `WATCH`,
- które rekomendacje są ograniczone przez jakość lub kompletność danych.

### Zasada nadrzędna

Priority Engine nie działa jako sztywna hierarchia rodzin.

Każda diagnoza jest oceniana na podstawie kilku wymiarów:

- `business_impact`
- `urgency`
- `confidence`
- `evidence_strength`
- `actionability`
- `data_completeness`

Rodzina diagnozy jest kontekstem, a nie automatycznym zwycięzcą.

### Dwa wyniki końcowe

HMA rozdziela:

1. `top_business_issue`
2. `top_operational_diagnosis`

`top_business_issue` odpowiada na pytanie:

„Co ma największy wpływ na wynik hotelu?”

`top_operational_diagnosis` odpowiada na pytanie:

„Gdzie mamy najbardziej użyteczny i konkretny punkt do działania?”

Przykład:

- `SALES_STRUCTURE.TOTAL_DEMAND_DOWN` może być `top_business_issue`,
- `FUNNEL.STEP2_TO_STEP3_WEAK` może być `top_operational_diagnosis`.

### Ocena diagnozy

Każda diagnoza otrzymuje ocenę w wymiarach:

#### business_impact

- LOW = 1
- MEDIUM = 2
- HIGH = 3

#### urgency

- LOW = 1
- MEDIUM = 2
- HIGH = 3

#### confidence

- LOW = 1
- MEDIUM = 2
- HIGH = 3

#### evidence_strength

- LOW = 1
- MEDIUM = 2
- HIGH = 3

#### actionability

- LOW = 1
- MEDIUM = 2
- HIGH = 3

### Evidence strength

`evidence_strength` opisuje jakość dowodu stojącego za diagnozą.

Przykładowo:

LOW:

- pojedynczy sygnał,
- mała próba,
- korelacja bez potwierdzenia,
- częściowe dane.

MEDIUM:

- kilka zgodnych sygnałów,
- wystarczający wolumen,
- kompletne dane dla zakresu,
- zgodność zachowania i wyniku biznesowego.

HIGH:

- kilka niezależnych źródeł potwierdza ten sam wzorzec,
- duży wolumen,
- stabilność w czasie,
- dane ścieżkowe albo silne potwierdzenie biznesowe.

### Actionability

`actionability` opisuje, jak konkretny kolejny krok wynika z diagnozy.

LOW:

- diagnoza mówi głównie „co się wydarzyło”.

MEDIUM:

- wskazuje obszar wymagający sprawdzenia.

HIGH:

- wskazuje konkretne miejsce i konkretny następny krok.

Przykład:

`TOTAL_DEMAND_DOWN`

może mieć:

- business_impact = HIGH
- actionability = MEDIUM

`STEP2_TO_STEP3_WEAK`

może mieć:

- business_impact = HIGH
- actionability = HIGH

### Data completeness gate

Przed scoringiem HMA sprawdza kompletność danych.

Jeżeli diagnoza zależy od Profitroom, a:

`selected_period_end > profitroom_data_through`

HMA:

- ogranicza analizę do `common_complete_end`,
- albo nadaje diagnozie `status = WATCH`,
- albo obniża confidence,
- albo blokuje rekomendację budżetową.

Niepełne dane nie muszą usuwać diagnozy całkowicie.

### Blocking diagnostics

Pole:

`blocking_diagnostic`

może wskazywać diagnozę ograniczającą inną diagnozę.

Przykład:

`DATA_QUALITY.TRACKING_MISMATCH`

może ograniczać:

- `FUNNEL.STEP3_TO_PURCHASE_WEAK`
- decyzje budżetowe oparte na purchase GA4.

`DATA_QUALITY.INCOMPLETE_PROFITROOM`

może ograniczać:

- `SALES_STRUCTURE.*`
- `EFFICIENCY.*`

dla niekompletnego zakresu sprzedażowego.

`DATA_QUALITY.INSUFFICIENT_DATA`

może zmienić diagnozę kandydacką na:

`status = WATCH`

### Reguły pierwszeństwa

#### 1. Problem pomiarowy może mieć pierwszeństwo przed problemem biznesowym

Jeżeli:

- GA4 pokazuje spadek purchase,
- Profitroom potwierdza normalną sprzedaż,

priorytet ma:

`DATA_QUALITY.TRACKING_MISMATCH`

#### 2. Realny spadek sprzedaży ma wysoki business priority

`TOTAL_DEMAND_DOWN` powinien mieć wysoki priorytet biznesowy.

Nie oznacza to jednak automatycznie, że będzie najlepszą diagnozą operacyjną.

#### 3. Diagnoza lejka może być najlepszym punktem działania

Jeżeli HMA wykrywa:

`FUNNEL.STEP2_TO_STEP3_WEAK`

oraz:

`TOTAL_DEMAND_DOWN`

raport może pokazać:

- problem biznesowy: spadek sprzedaży,
- punkt działania: Step2 → Step3.

#### 4. Role kanałów są kontekstem

`DEMAND_GENERATOR`, `ASSISTER` i `CLOSER`:

- pomagają interpretować inne diagnozy,
- wpływają na rekomendację,
- same w sobie nie są alarmem.

#### 5. Pozytywne diagnozy mogą współistnieć z negatywnymi

Przykład:

- `TOTAL_DEMAND_UP`
- `DIRECT_TO_OTA`

mogą występować równocześnie.

Interpretacja:

„Całkowita sprzedaż rośnie, ale struktura przesuwa się z Direct w stronę OTA.”

Priority Engine nie usuwa jednego z tych wniosków, ponieważ opisują różne aspekty biznesu.

#### 6. Rekomendacje budżetowe wymagają dodatkowego warunku

Rekomendacja budżetowa wymaga:

- odpowiedniego confidence,
- kompletności danych,
- minimalnego wolumenu,
- oceny efektywności,
- oceny roli kanału,
- braku aktywnej blokady DATA_QUALITY.

### Scoring

Scoring służy do uporządkowania diagnoz po przejściu reguł jakości danych.

Proponowany score:

`priority_score = business_impact + urgency + confidence + evidence_strength + actionability`

Zakres:

`5–15`

Score jest narzędziem porządkującym.

Reguły biznesowe i blokady mają pierwszeństwo przed samym wynikiem liczbowym.

### Rozstrzyganie remisów

Jeżeli dwie diagnozy mają podobny score, HMA preferuje:

1. wyższy `business_impact`,
2. wyższy `confidence`,
3. wyższy `evidence_strength`,
4. wyższy `actionability`,
5. wyższą `urgency`.

### Konflikty rekomendacji

Jeżeli dwie diagnozy prowadzą do sprzecznych działań wobec tego samego obszaru, HMA:

1. sprawdza blocking diagnostics,
2. porównuje confidence,
3. porównuje evidence strength,
4. porównuje business impact,
5. wybiera kierunek o mocniejszym dowodzie,
6. słabszą diagnozę może pozostawić jako `WATCH`.

### Maksymalnie 3 rekomendacje

Raport klienta pokazuje maksymalnie 3 rekomendacje.

Preferowane role rekomendacji:

1. najważniejszy problem biznesowy,
2. najbardziej konkretne działanie operacyjne,
3. dodatkowa szansa lub kierunek wzrostu.

### Zasada końcowa

Priority Engine nie ma wybrać „jednej prawdy”.

Ma uporządkować kilka prawdziwych sygnałów tak, aby klient zobaczył:

- co jest najważniejsze,
- co jest najbardziej prawdopodobne,
- co wymaga sprawdzenia,
- co zrobić najpierw.

---
