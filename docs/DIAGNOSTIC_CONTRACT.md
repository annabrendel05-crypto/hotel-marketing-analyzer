# Hotel Marketing Analyzer — DIAGNOSTIC_CONTRACT.md

Status: v0.1 — roboczy kontrakt diagnostyczny  
Cel: jedno źródło prawdy dla logiki diagnostycznej HMA.  
Zasada nadrzędna: **AI jest warstwą językową, nie decyzyjną.**

---

## 1. Ruch i jakość ruchu v0.2

### Zasada nadrzędna
Jakość ruchu oceniamy po głębokości zachowania, a nie po samym wejściu na stronę.

Hierarchia intencji:
`session < engaged_view < view_offer/room < Step1 < Step2 < Step3 < active booking`

Metryki pomocnicze, takie jak czas na stronie, CTR, CPC czy sama liczba sesji, mają niższą wagę niż zachowania związane bezpośrednio z decyzją zakupową.

### Kluczowe reguły
- Sesje rosną, zaangażowanie spada → możliwy płytszy ruch.
- Sesje rosną, zaangażowanie rośnie → lepszy sygnał jakościowy; nadal wymaga potwierdzenia sprzedażą.
- Sesje spadają, zaangażowanie rośnie → mniej ruchu, ale potencjalnie lepsza selekcja.
- Sesje spadają, kliknięcia tel/mail rosną → możliwy bardziej wartościowy ruch, ale trzeba potwierdzić realny kontakt.
- Dużo wejść, mało engaged_view → prawdopodobnie ruch płytki.
- Dużo engaged_view, mało ofert/pokoi → zainteresowanie treścią bez przejścia do wyższej intencji.
- Dużo ofert/pokoi, mało Step1 → etap inspiracji/rozważania lub brak wystarczającego bodźca do sprawdzenia pobytu.
- Dużo Step1, mało Step2 → nie zakładamy od razu problemu reklamy; możliwe cena, dostępność, długość pobytu, porównywanie.
- Mało czasu na stronie, dużo wejść do silnika → może być dobry ruch Brand/remarketing/powracający.
- Dużo czasu, mało działań → czas sam w sobie nie oznacza jakości.
- Dużo scrollowania, mało Step1 → dobry content, ale słabsza intencja zakupowa.
- Mało scrollowania, dużo Step1 → potencjalnie bardzo wartościowy ruch.
- Dużo Meta, mało purchase → nie oceniamy Meta wyłącznie po purchase; sprawdzamy zachowania, powroty i kanały domykające.
- Meta: dużo engaged_view, mało Step1 → uwaga jest, ale niekoniecznie intencja rezerwacyjna.
- Meta: mało sesji, dużo Step1 → mały, ale potencjalnie jakościowy ruch.
- Google Generic: dużo sesji, mało engaged_view/Step1 → możliwe zbyt szerokie frazy.
- Google Generic: mało purchase, dużo Step1/2 → możliwy problem głębiej w lejku.
- Google Brand: krótki czas, wysoki Step1 → naturalny, dobry układ.
- Powracający rosną szybciej niż nowi → dobre domykanie, ale możliwy słabszy dopływ nowego popytu.
- Nowi rosną, powracający nie → większy zasięg bez pewności dalszej intencji.
- Nowi rosną, kilka dni później rosną powracający → dobry sygnał górnego lejka.
- Direct rośnie z kampaniami płatnymi → nie traktujemy Direct automatycznie jako niezależnego od reklam.
- Organic rośnie po Meta → możliwy efekt wzrostu zainteresowania marką.
- Koszt ruchu spada, ale jakość też → tańszy ruch nie musi być lepszy.
- CPC rośnie, ale rośnie Step1/2 → droższy ruch może być bardziej wartościowy.
- CTR wysoki, jakość po kliknięciu niska → możliwy clickbait/niedopasowanie landing page.
- CTR niski, jakość po kliknięciu wysoka → selektywny, jakościowy ruch.
- Mobile: dużo ruchu, desktop lepszy głęboki lejek → możliwy problem UX lub naturalny cross-device.
- Mobile: wysoki Step1, duży spadek Step2/3 → mocny sygnał problemu mobilnego Booking Engine.
- Dużo mikro-konwersji, mało sprzedaży → intencja istnieje, blokada jest dalej.
- Mało mikro-konwersji i mało sprzedaży → bardziej prawdopodobny problem jakości ruchu.
- Dużo mikro-konwersji i rosnący Profitroom Direct → zdrowy układ.

---

## 2. Lejek i lokalizacja problemu v0.2

### Zasady nadrzędne
1. Im głębiej użytkownik dochodzi w lejku, tym mniej prawdopodobne, że problem leży wyłącznie w reklamie.
2. Analyzer nie diagnozuje problemu na podstawie pojedynczego eventu.
3. Zmiany między etapami lejka zawsze zestawiamy z faktycznymi rezerwacjami Profitroom.

### Reguły
- Step1 rośnie, Step2 spada → problem po wejściu do Booking Engine; możliwe: dostępność, cena, typ pokoju, długość pobytu, warunki, niedopasowanie oferty, porównanie z OTA lub niższa intencja dodatkowego ruchu.
- Step2 rośnie, Step3 spada → użytkownik ma już wysoką intencję; częściej problem finalnej oferty, opłat, anulacji, płatności, OTA albo zgodności obietnicy reklamy.
- Step3 wysoki, purchase niski → najpierw tracking; potem checkout/oferta/płatność.
- GA4 purchase niski, Profitroom wysoki → przede wszystkim problem pomiaru, nie automatycznie problem sprzedaży.
- Dużo wejść w pokoje/oferty, mało Step1 → bardziej inspiracyjny etap decyzji.
- Google Brand ma dużo Step1/2, Meta dużo oglądania ofert → możliwy naturalny podział ról: Meta buduje popyt, Brand domyka.
- Booking.com rośnie, Direct spada → problem struktury kanałów; sprawdź parity, Genius, mobile rates, UX i warunki.
- Direct rośnie, kampanie nie pokazują purchase → zbadaj ścieżkę, powracających, branded search, utratę źródła, inne kanały.
- Step1 spada przy stabilnym/rosnącym ruchu → możliwy problem między stroną a Booking Engine.
- Step1 i Step2 rosną, Direct nie rośnie → problem głębiej albo finalizacja innym kanałem.
- Cały lejek GA4 spada, Profitroom stabilny → silny sygnał problemu analitycznego.
- Cały lejek rośnie proporcjonalnie → zdrowy wzrost, szczególnie jeśli Profitroom też rośnie.
- Step1 mocno rośnie, kolejne etapy nie rosną proporcjonalnie → dodatkowy ruch może być słabszy jakościowo.
- Step2/3 rosną, purchase pojawia się z opóźnieniem → możliwy dłuższy cykl decyzyjny.

---

## 3. Sprzedaż i pieniądze v0.1

### Kluczowe zasady
- ROAS platformowy nie jest równoznaczny z inkrementalnością.
- Profitroom jest źródłem prawdy o faktycznych rezerwacjach i przychodzie.
- Dobra kampania to nie tylko wysoki ROAS, ale zgodność z biznesowym wynikiem hotelu.
- Ocenę dzielimy na: atrybucję, jakość ruchu, problem w lejku, ekonomikę sprzedaży.

### Reguły
- Meta ROAS 5, Direct nie rośnie → możliwa atrybucja, remarketing, view-through, duble, anulacje, przesunięcie kanału.
- Brand wysoki ROAS → zwykle closer istniejącego popytu, nie automatycznie generator nowego.
- Generic dużo wydaje, dużo klików, mało zakupów → szerokie frazy, słaba intencja, niedopasowanie landing/oferty, porównywanie.
- GHA mało klików, dobry koszt rezerwacji → mały wolumen, wysoka intencja; kandydat do ostrożnego zwiększenia udziału.
- Booking.com dużo, Direct stoi → popyt jest, ale hotel nie przejmuje go do własnego kanału.
- Direct i Booking.com rosną → możliwy wzrost całego popytu.
- Revenue rośnie, bookings spadają → wyższy AOV/ADR, dłuższe pobyty, droższy mix.
- Bookings rosną, revenue stoi → niższy AOV/ADR, rabaty, krótsze pobyty.
- Spend rośnie szybciej niż sprzedaż → spada efektywność marginalnego budżetu.
- Brak purchase, dużo Step2/3 → wartościowy ruch, ale problem na końcu lejka lub w pomiarze.

---

## 4. Kto generuje popyt, kto wspomaga, kto domyka? v0.1

### Zasady nadrzędne
- Kanał raportujący konwersję nie musi być kanałem, który stworzył popyt.
- Każdy wzrost kanału zestawiamy z pozostałymi kanałami i sprzedażą całkowitą.
- Role interpretacyjne:
  - Demand Generator
  - Assister
  - Closer

### Reguły
- Meta ↑ + Brand ↑ → możliwy demand generation → closer.
- Meta ↑ + Brand ↑ + Direct ↑ → możliwy zdrowy pełny lejek.
- Meta ↓ + Brand ↓ → możliwe powiązanie popytu.
- Meta ↓ + Brand stabilny → Brand może opierać się na innych źródłach.
- Meta ↑ + Direct ↑ → możliwy efekt wspomagania.
- Meta ↑ + Booking.com ↑ → możliwy halo effect i utrata części wartości do OTA.
- Meta ↑ + Booking.com ↑ + Direct flat → popyt może być, ale kanał własny go nie przejmuje.
- Meta ↑ + Booking.com ↓ + Direct ↑ → możliwy korzystny shift do Direct.
- Brand ↑ bez Meta → popyt może pochodzić z SEO, PR, eventu, organic, offline, powracających.
- Brand ↑, Direct flat → więcej szukania marki bez wzrostu sprzedaży.
- Brand wysoki ROAS, Brand Search/Direct flat → możliwe przechwytywanie istniejącego popytu.
- Direct/(none) ≠ brak marketingu.
- Powroty wielokanałowe są normalne; np. Meta → Organic → Brand → Direct → purchase.
- Generic first touch → Brand last touch → Generic może odkrywać hotel, Brand domykać.
- Booking.com first touch → Direct last touch → możliwy billboard effect.
- Meta first touch → Booking.com last touch → popyt wygenerowany, ale finalizacja poza Direct.
- Brak purchase, później rośnie Direct/Brand/OTA → możliwy efekt wspomagający z opóźnieniem.
- Brak purchase, brak Step2/3, brak późniejszego wzrostu innych kanałów → słaby sygnał wpływu.
- Brand + Direct + Booking.com rosną → możliwy wzrost całkowitego popytu.
- Direct ↑, Booking.com ↓, total flat → raczej migracja kanału niż nowy popyt.
- Meta dużo purchase, total sales flat → możliwe zawyżenie atrybucji platformowej.
- Meta umiarkowany ROAS, ale Direct + Brand + total sales ↑ → możliwy niedoszacowany wpływ Meta.
- Kanał A ↓, kanał B ↑ podobnie, total flat → możliwa migracja/kanibalizacja.
- Kilka kanałów ↑ i total sales ↑ → większe prawdopodobieństwo realnego wzrostu popytu.

---

## 5. System rekomendacji v0.1

### Hierarchia
1. Wiarygodność danych.
2. Problem biznesowy.
3. Dopiero na końcu decyzja budżetowa.

### Główna zasada
**Zmiana budżetu jest ostatnią rekomendacją, nie pierwszą.**

### Reguły
- Dobry ROAS + rosnąca realna sprzedaż → zwiększ budżet stopniowo.
- Dobry ROAS + total sales flat → nie zwiększaj; sprawdź atrybucję i Profitroom.
- Niski ROAS + dużo Step2/3 → nie wyłączaj; sprawdź tracking/ofertę/checkout.
- Dużo klików + mało mikro-konwersji → targetowanie/frazy/kreacja/landing.
- Spend rośnie szybciej niż sprzedaż → stop skalowania / możliwe zmniejszenie.
- Meta jakościowa, mało purchase → sprawdź rolę wspomagającą i atrybucję.
- Brand wysoki ROAS → utrzymuj pokrycie, nie skaluj automatycznie.
- Booking.com ↑, Direct ↓ → sprawdź OTA i przewagę Direct.
- Direct ↑, Booking.com ↓ → wspieraj Direct, jeśli total sales nie cierpi.
- Lejek dobry, sprzedaż nie rośnie → sprawdź Profitroom, anulacje, płatność, OTA, tracking.
- Sprzedaż rośnie, tracking zły → napraw tracking, nie wyłączaj skutecznych kampanii.
- Mała kampania bardzo efektywna → skaluj ostrożnie, sprawdź stabilność.
- Duża kampania przeciętna → oceniaj również po wolumenie, nie tylko po ROAS.

### Mapa rekomendacji
- TRACKING_MISMATCH → FIX_TRACKING
- DIRECT_DOWN_OTA_UP → CHECK_DIRECT_VS_OTA
- TRAFFIC_UP_INTENT_DOWN → IMPROVE_TRAFFIC_QUALITY
- FUNNEL_STRONG_PURCHASE_WEAK → CHECK_TRACKING_AND_CHECKOUT
- SALES_UP_EFFICIENCY_GOOD → INCREASE_BUDGET
- COST_UP_SALES_FLAT → STOP_OR_REDUCE_SCALING
- SMALL_CAMPAIGN_HIGH_EFFICIENCY → SCALE_CAUTIOUSLY

---

## 6. Format raportu / Podsumowanie okresu v0.2

### Ekran główny — 60 sekund
1. Najważniejszy wniosek okresu — jedno zdanie.
2. 4 KPI biznesowe:
   - aktywne rezerwacje Direct,
   - przychód Direct,
   - koszt reklam / aktywną rezerwację online,
   - udział Direct w sprzedaży online.
3. Co wydarzyło się w okresie — 3–4 zdania.
4. Co działało / gdzie był problem.
5. Co dało pieniądze.
6. Co robimy dalej — maks. 3 rekomendacje.

### Szczegóły niżej / osobne sekcje
- Lejek
- Jakość ruchu
- Kanały i atrybucja
- Kampanie
- Tracking

### Zasada
**Nie pokazuj wszystkiego, co wiemy — pokaż to, co zmienia decyzję klienta.**

---

## 7. Mapa danych dla „Podsumowanie okresu”

### Faktyczna sprzedaż
Źródło: Profitroom.

- Direct bookings: aktywne rezerwacje kanału Booking Engine/Direct.
- Direct revenue: suma wartości aktywnych rezerwacji Direct.
- Booking.com / OTA: aktywne rezerwacje i przychód.
- Cost per active online booking:
  `(Meta spend + Google spend) / active online bookings`
- Direct share:
  `Direct bookings / online bookings`
  albo `Direct revenue / online revenue`.

### Wynik platformowy
- Meta ROAS = attributed revenue / spend.
- Google ROAS = conversion value / cost.

Nie mieszamy wyniku platformowego z faktyczną sprzedażą Profitroom.

---

## 8. AI

### Twarda zasada
**AI = warstwa językowa, nie decyzyjna.**

Backend / BigQuery / warstwa reguł zwraca m.in.:
- metric_value
- previous_value
- delta_pct
- diagnostic_code
- confidence
- severity
- business_impact
- urgency
- recommendation_code
- action_type
- client_text

AI:
- upraszcza język,
- składa raport,
- streszcza,
- odpowiada na pytania,
- nie wymyśla diagnoz poza kontraktem.

---

## 9. Progi i wiarygodność v0.1

### Progi startowe
- kampania: spend >= 150 PLN
- ruch: >= 150 sesji
- 0–2 rezerwacje/purchase → za mała próba do mocnej oceny
- >= 3 → ostrożne wnioski
- >= 10 → wyższa pewność
- zmiana <10% → zwykle stabilnie
- 10–20% → sygnał do obserwacji
- >20% → istotna zmiana
- >40% → wysoki priorytet, jeśli wolumen wystarczający

### Confidence
- LOW — mało danych / pojedynczy sygnał
- MEDIUM — kilka zgodnych sygnałów
- HIGH — kilka źródeł potwierdza ten sam wniosek

### Progi biznesowe konfigurowalne per hotel
Przykładowo:
- target_roas
- max_booking_cost
- target_direct_share
- hotel_segment

---

## 10. Diagnostic Contract v1 — pierwsze 10 kodów

### TRACKING_MISMATCH
Warunek:
- Profitroom Direct >= 3 aktywne rezerwacje
- GA4 purchase niższy o >=30% względem aktywnych Direct
lub
- Step3 >=5, Profitroom pokazuje rezerwacje, GA4 purchase bliski 0.

Confidence:
- MEDIUM: 30–50% rozjazdu
- HIGH: >50% lub purchase=0 przy realnej sprzedaży

severity: HIGH  
business_impact: MEDIUM  
urgency: HIGH  
recommendation_code: FIX_TRACKING  
action_type: TRACKING

### DIRECT_DOWN_OTA_UP
Warunek:
- Direct bookings ↓ >=15%
- OTA bookings ↑ >=15%
- total online bookings nie spadają >10%

Minimalne dane:
- >=10 online bookings / okres
- >=3 Direct i >=3 OTA w bazie

recommendation_code: CHECK_DIRECT_VS_OTA  
action_type: OTA / OFFER

### TRAFFIC_UP_INTENT_DOWN
Warunek:
- sessions ↑ >=15%
- min. 2 wskaźniki intencji spadają:
  engaged sessions rate / engaged_view rate / offer-room per session / Step1 rate / Step2 rate

Minimalne dane:
- >=150 sesji / okres
- >=20 mikro-konwersji

recommendation_code: IMPROVE_TRAFFIC_QUALITY  
action_type: TARGETING / LANDING / CREATIVE

### FUNNEL_STRONG_PURCHASE_WEAK
Warunek:
- Step2/Step3 mocne lub rosną
- purchase nie rośnie proporcjonalnie lub spada
- gap Step3→purchase większy niż wcześniej

Minimalne dane:
- Step2 >=20
- Step3 >=5
- Profitroom Direct >=3

recommendation_code: CHECK_TRACKING_AND_CHECKOUT  
action_type: TRACKING / CHECKOUT / OFFER

### TOTAL_DEMAND_UP
Warunek:
- total online bookings ↑ >=15%
- online revenue ↑ >=15%
- wzrost nie pochodzi wyłącznie z jednego kanału

recommendation_code: KEEP_OR_SCALE  
action_type: BUDGET / STRATEGY

### DIRECT_UP_OTA_DOWN
Warunek:
- Direct ↑ >=15%
- OTA ↓ >=15%
- total online sales nie spada >10%

recommendation_code: SUPPORT_DIRECT_SHIFT  
action_type: STRATEGY / DIRECT

### COST_UP_SALES_FLAT
Warunek:
- Meta+Google spend ↑ >=20%
- active online bookings rosną <10% lub spadają
lub revenue rośnie dużo wolniej niż spend

recommendation_code: STOP_OR_REDUCE_SCALING  
action_type: BUDGET / EFFICIENCY

### META_DEMAND_GENERATOR
Warunek:
- Meta traffic ↑
- jakość nie spada
- rośnie min. jeden wskaźnik intencji
- po 1–7 dniach rośnie Brand/Direct/powracający
- brak silnego sygnału płytkiego ruchu

recommendation_code: KEEP_AND_MONITOR_ASSISTED_EFFECT  
action_type: STRATEGY / ATTRIBUTION

### BRAND_CLOSER
Warunek:
- Brand ma wysoki udział Step1/Step2/purchase
- Brand ma wysoką intencję
- wzrost Brand pojawia się równolegle lub po innych źródłach popytu

recommendation_code: KEEP_BRAND_COVERAGE  
action_type: BRAND / ATTRIBUTION

### INSUFFICIENT_DATA
Warunek:
- brak minimalnego wolumenu
lub
- dane niepełne / nieporównywalne
lub
- tracking uniemożliwia wiarygodną ocenę

recommendation_code: COLLECT_MORE_DATA  
action_type: DATA

---

## 11. Priority Engine v0.1

### Skale
severity:
- INFO = 0
- POSITIVE = 1
- MEDIUM = 2
- HIGH = 3
- CRITICAL = 4

business_impact:
- LOW = 1
- MEDIUM = 2
- HIGH = 3

urgency:
- LOW = 1
- MEDIUM = 2
- HIGH = 3

confidence:
- LOW = 1
- MEDIUM = 2
- HIGH = 3

### Wzór
`priority_score = severity + business_impact + urgency + confidence`

### Reguły nadrzędne
- TRACKING_MISMATCH wygrywa przed rekomendacją budżetową.
- INSUFFICIENT_DATA blokuje mocne rekomendacje.
- Sprzedaż i finanse mają wyższy priorytet niż sam ruch.
- Negatywna diagnoza o wysokim wpływie może przebić pozytywną.
- META_DEMAND_GENERATOR i BRAND_CLOSER nie są samodzielnym alarmem.
- TOTAL_DEMAND_UP nie przykrywa DIRECT_DOWN_OTA_UP.

---

## 12. Kolejny krok techniczny

1. Przenieść ten kontrakt do repo jako `docs/DIAGNOSTIC_CONTRACT.md`.
2. Zaimplementować pierwsze 10 reguł w backendzie / warstwie analitycznej.
3. Backend ma wystawiać gotowe pola diagnostyczne.
4. Frontend ma tylko prezentować wynik.
5. Dopiero potem przebudować ekran „Podsumowanie okresu”.
6. Na końcu podłączyć AI do językowego składania wniosków.
