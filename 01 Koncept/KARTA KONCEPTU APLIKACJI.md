# **KARTA KONCEPTU APLIKACJI**

## **1\. Robocza nazwa projektu**

Aplikacja do analizy kampanii marketingowych i ścieżki rezerwacyjnej hoteli.

Roboczo można ją określać jako:

**Hotel Campaign Intelligence**

Nazwa jest tymczasowa i nie stanowi jeszcze nazwy finalnego produktu.

---

## **2\. Cel aplikacji**

Celem aplikacji jest wspieranie osoby prowadzącej kampanie reklamowe dla hoteli w podejmowaniu trafniejszych decyzji, które mają prowadzić do zwiększenia liczby i wartości rezerwacji.

Aplikacja ma pomagać nie tylko w rozwijaniu kampanii reklamowych, ale również w wykrywaniu problemów występujących:

* w jakości pozyskiwanego ruchu,  
* na stronie internetowej,  
* na landing page’u,  
* w ofercie,  
* w cenie,  
* w dostępności,  
* w kolejnych etapach procesu rezerwacyjnego.

Aplikacja nie ma być kolejnym raportem reklamowym.

Ma być narzędziem diagnostycznym, które łączy dane reklamowe, zachowanie użytkowników i wynik biznesowy.

---

## **3\. Główny problem biznesowy**

Dane potrzebne do oceny skuteczności marketingu hotelu są rozproszone pomiędzy różnymi systemami:

* Meta Ads,  
* Google Ads,  
* GA4,  
* systemem rezerwacyjnym,  
* BigQuery.

Obecnie analiza wymaga ręcznego sprawdzania danych w wielu źródłach i samodzielnego łączenia informacji.

Sama platforma reklamowa pokazuje, czy reklama wygenerowała kliknięcia, ale nie daje pełnej odpowiedzi na pytanie:

**Czy użytkownicy pozyskani przez kampanię wykonali działania prowadzące do kontaktu lub rezerwacji?**

GA4 pokazuje zachowanie użytkowników, ale nie daje pełnej oceny kampanii z uwzględnieniem kosztów, kreacji, budżetu i danych z systemu rezerwacyjnego.

System rezerwacyjny pokazuje sprzedaż, ale nie wyjaśnia, które działania marketingowe rozpoczęły, wspierały lub domknęły ścieżkę klienta.

Aplikacja ma połączyć te elementy w jeden spójny proces analizy.

---

## **4\. Główny użytkownik**

Jedynym użytkownikiem pierwszej wersji aplikacji będzie osoba prowadząca kampanie reklamowe i analizująca działania marketingowe hoteli.

Użytkownikiem aplikacji będzie Anna — specjalistka odpowiedzialna za:

* prowadzenie kampanii Meta Ads,  
* prowadzenie lub analizowanie kampanii Google Ads,  
* sprawdzanie zachowania użytkowników w GA4,  
* analizowanie danych zgromadzonych w BigQuery,  
* ocenę liczby kontaktów i rezerwacji,  
* rekomendowanie zmian w kampaniach,  
* rekomendowanie zmian na stronie, w ofercie lub procesie rezerwacyjnym.

Aplikacja nie musi na etapie pierwszego MVP uwzględniać różnych ról, poziomów dostępu ani osobnych widoków dla klientów hotelowych.

---

## **5\. Główna potrzeba użytkownika**

Użytkownik chce szybko odpowiedzieć na pytanie:

**Co powinnam zrobić, aby zwiększyć liczbę i wartość rezerwacji?**

Odpowiedź może zależeć od sytuacji.

Aplikacja nie powinna zawsze sugerować tego samego działania. Powinna rozpoznać, czy w danym przypadku należy:

* zwiększyć budżet,  
* pozostawić kampanię bez zmian,  
* ograniczyć budżet,  
* zatrzymać kampanię,  
* przygotować nową kreację,  
* zmienić grupę odbiorców,  
* poprawić landing page,  
* sprawdzić ofertę,  
* sprawdzić cenę,  
* sprawdzić dostępność,  
* przeanalizować proces rezerwacyjny,  
* poczekać na większą liczbę danych.

Najważniejszym celem aplikacji nie jest samo raportowanie wyników, ale pomaganie w rozwiązywaniu problemów wpływających na sprzedaż hotelu.

---

## **6\. Główna przewaga aplikacji**

Największą przewagą aplikacji ma być połączenie pełnej ścieżki użytkownika:

**reklama → użytkownik → zachowanie → powrót → kontakt → rezerwacja**

Aplikacja ma odpowiadać na cztery główne pytania:

### **Kto i skąd przyszedł?**

Aplikacja identyfikuje kanał, źródło, kampanię i inne dostępne informacje o pozyskanym ruchu.

### **Co zrobił po wejściu?**

Aplikacja analizuje zachowanie użytkowników na stronie:

* zaangażowanie,  
* czas,  
* scroll,  
* odsłony,  
* otwarcie szczegółów oferty,  
* otwarcie pokoju lub apartamentu,  
* wykonane mikro-konwersje.

### **Czy przesunął się dalej w procesie decyzyjnym?**

Aplikacja sprawdza, czy użytkownik wykonał działania świadczące o rosnącej intencji:

* przeszedł do wyboru terminu,  
* wszedł w proces rezerwacyjny,  
* przeszedł przez kolejne kroki,  
* wykonał połączenie,  
* dokonał rezerwacji.

### **Które kanały rozpoczęły, wspierały i domknęły ścieżkę?**

Aplikacja pokazuje udział kanałów na różnych etapach ścieżki, nawet jeśli pełne przypisanie konkretnego użytkownika nie zawsze będzie możliwe.

Wnioski mają być oparte na danych i wysokim prawdopodobieństwie, a nie muszą stanowić stuprocentowego odtworzenia ścieżki każdej osoby.

---

## **7\. Definicje głównych wyników biznesowych**

### **Rezerwacja**

Za rezerwację uznawane jest zdarzenie:

**step4 / purchase**

Rezerwacja powinna być analizowana zarówno ilościowo, jak i wartościowo.

Podstawowe wskaźniki:

* liczba rezerwacji,  
* wartość rezerwacji,  
* koszt rezerwacji,  
* ROAS,  
* współczynnik przejścia do zakupu.

### **Wartościowy kontakt**

Za wartościowy kontakt uznawane jest:

**wykonanie połączenia telefonicznego.**

Samo kliknięcie przycisku telefonu nie zawsze musi oznaczać przeprowadzenie rozmowy. Należy więc wyraźnie rozróżnić:

* kliknięcie telefonu,  
* rozpoczęcie połączenia,  
* potwierdzone wykonanie połączenia, jeśli takie dane będą dostępne.

Na etapie konceptu należy przyjąć, że wartościowy kontakt oznacza wykonanie połączenia, ale sposób technicznego potwierdzania tego zdarzenia pozostaje do późniejszego ustalenia.

---

## **8\. Zakres poziomów analizy**

Pierwsze MVP powinno działać na dwóch podstawowych poziomach:

### **Poziom hotelu**

Widok całościowy odpowiadający na pytania:

* Jak hotel radzi sobie w bieżącym okresie?  
* Czy liczba rezerwacji wzrosła czy spadła?  
* Czy wzrosła lub spadła wartość rezerwacji?  
* Jak zmieniły się wydatki reklamowe?  
* Które kanały i kampanie odpowiadają za zmianę?  
* Na którym etapie ścieżki występuje największy problem?

### **Poziom kampanii**

Widok szczegółowy odpowiadający na pytania:

* Jaki ruch wygenerowała kampania?  
* Czy był to ruch wartościowy?  
* Jak użytkownicy zachowywali się po wejściu?  
* Czy wykonali mikro-konwersje?  
* Czy dotarli do kontaktu lub rezerwacji?  
* Czy kampania ma potencjał do skalowania?  
* Czy kampania zaczyna się wypalać?  
* Czy kampania przepala budżet?  
* Czy problem znajduje się w reklamie czy dalej w lejku?

W pierwszym MVP nie jest konieczna osobna analiza na poziomie pojedynczej reklamy, zestawu reklam, słowa kluczowego, pokoju ani konkretnej rezerwacji.

Te poziomy mogą zostać dodane w późniejszych wersjach.

---

## **9\. Sposób porównywania okresów**

Podstawową jednostką analizy jest tydzień porównywany z poprzednim tygodniem.

Aplikacja nie powinna wymagać porównywania wyłącznie pełnych tygodni kalendarzowych.

Porównanie powinno zależeć od dnia, w którym wykonywana jest analiza.

Przykłady:

* środa bieżącego tygodnia do środy poprzedniego tygodnia,  
* niedziela bieżącego tygodnia do niedzieli poprzedniego tygodnia,  
* ostatnie siedem zakończonych dni do poprzednich siedmiu dni.

Najważniejszą zasadą jest porównywanie okresów o tej samej długości i odpowiadających sobie dniach tygodnia.

Aplikacja powinna wyraźnie informować, jaki zakres został porównany, np.:

**17–23 lipca 2026 vs 10–16 lipca 2026**

lub:

**poniedziałek–środa bieżącego tygodnia vs poniedziałek–środa poprzedniego tygodnia.**

Dzięki temu użytkownik nie powinien przypadkowo porównywać niepełnego tygodnia z pełnym tygodniem.

---

## **10\. Warstwy analizy**

Aplikacja powinna analizować kampanie w czterech warstwach.

### **Warstwa 1\. Wyniki reklamowe**

* wydatki,  
* wyświetlenia,  
* zasięg,  
* częstotliwość,  
* CTR,  
* CPC,  
* kontakty przypisane do kampanii,  
* koszt kontaktu.

Ta warstwa odpowiada na pytanie:

**Czy reklama jest w stanie przyciągnąć uwagę i wygenerować ruch?**

Nie może jednak samodzielnie decydować o ocenie skuteczności kampanii.

### **Warstwa 2\. Jakość ruchu**

* użytkownicy,  
* sesje,  
* sesje zaangażowane,  
* współczynnik zaangażowania,  
* średni czas zaangażowania,  
* scroll,  
* odsłony,  
* działania na stronie.

Ta warstwa odpowiada na pytanie:

**Czy użytkownicy pozyskani z kampanii rzeczywiście zainteresowali się ofertą?**

### **Warstwa 3\. Mikro-konwersje i lejek zachowań**

* otwarcie szczegółów oferty,  
* otwarcie szczegółów pokoju lub apartamentu,  
* przejście do wyboru terminu,  
* rozpoczęcie procesu rezerwacyjnego,  
* przejście do kolejnych etapów procesu,  
* kliknięcie telefonu,  
* wykonanie połączenia,  
* kliknięcie adresu e-mail,  
* wysłanie formularza,  
* step1,  
* step2,  
* step3,  
* inne zdarzenia wskazujące na wzrost intencji.

Ta warstwa odpowiada na pytanie:

**Czy użytkownik przesunął się dalej w procesie decyzyjnym?**

### **Warstwa 4\. Wynik biznesowy**

* liczba rezerwacji,  
* wartość rezerwacji,  
* koszt rezerwacji,  
* ROAS,  
* liczba wartościowych kontaktów,  
* koszt wartościowego kontaktu,  
* wartość wygenerowana na użytkownika,  
* wartość wygenerowana na 1000 sesji.

Ta warstwa odpowiada na pytanie:

**Czy kampania przyniosła realną wartość biznesową?**

---

## **11\. Główny scenariusz użytkownika**

### **Krok 1\. Wejście do aplikacji**

Użytkownik otwiera aplikację.

### **Krok 2\. Wybór hotelu**

Użytkownik wybiera hotel, którego wyniki chce przeanalizować.

### **Krok 3\. Wybór okresu**

Użytkownik wybiera bieżący okres.

Aplikacja automatycznie proponuje odpowiadający mu okres porównawczy z poprzedniego tygodnia.

### **Krok 4\. Diagnoza całego hotelu**

Użytkownik widzi najważniejsze zmiany:

* liczbę rezerwacji,  
* wartość rezerwacji,  
* wydatki,  
* liczbę kontaktów,  
* najważniejsze zmiany w lejku,  
* kampanie odpowiadające za wzrost lub spadek.

### **Krok 5\. Lista kampanii**

Użytkownik widzi kampanie pogrupowane według stanu:

* kampanie działające dobrze,  
* kampanie wymagające uwagi,  
* kampanie o potencjale do skalowania,  
* kampanie wypalające się,  
* kampanie przepalające budżet,  
* kampanie z niewystarczającą liczbą danych.

### **Krok 6\. Szczegóły kampanii**

Użytkownik wybiera kampanię i sprawdza:

* wyniki reklamowe,  
* jakość ruchu,  
* lejek zachowań,  
* mikro-konwersje,  
* kontakty,  
* rezerwacje,  
* udział kanałów w ścieżce.

### **Krok 7\. Diagnoza**

Aplikacja wskazuje, gdzie najprawdopodobniej znajduje się problem:

* reklama,  
* kreacja,  
* jakość ruchu,  
* landing page,  
* oferta,  
* cena,  
* dostępność,  
* proces rezerwacyjny,  
* brak wystarczających danych.

### **Krok 8\. Rekomendacja**

Aplikacja przedstawia konkretne zalecenie wraz z uzasadnieniem liczbowym.

### **Krok 9\. Rozmowa z aplikacją**

Użytkownik może zadać dodatkowe pytanie na czacie, np.:

* Dlaczego liczba rezerwacji spadła?  
* Która kampania wygenerowała najbardziej wartościowy ruch?  
* Czy kampanię można skalować?  
* Czy problemem może być landing page?  
* Które kanały wspierały rezerwacje?  
* Co zmieniło się w lejku?  
* Dlaczego koszt kampanii wzrósł?  
* Czy mam już wystarczająco dużo danych, aby podjąć decyzję?  
* Co powinnam zrobić jako pierwsze?

Chat nie powinien tworzyć odpowiedzi oderwanych od danych.

Każda odpowiedź powinna odnosić się do aktualnie wybranego hotelu, kampanii i okresu.

---

## **12\. Pierwszy ekran aplikacji**

Pierwszy ekran nie powinien rozpoczynać się od rozbudowanej tabeli ani wielu wykresów.

Powinien pokazywać przede wszystkim diagnozę.

Proponowany układ:

### **Podsumowanie okresu**

* liczba rezerwacji,  
* wartość rezerwacji,  
* wydatki reklamowe,  
* liczba wartościowych kontaktów,  
* zmiana względem poprzedniego tygodnia.

### **Najważniejsza diagnoza**

Jedno krótkie zdanie opisujące sytuację, np.:

**Wartość rezerwacji wzrosła o 24%, mimo że liczba sesji spadła. Wzrost wynika głównie z kampanii Google Brand i powracających użytkowników.**

### **Najważniejsze zmiany**

Maksymalnie 3–5 najistotniejszych obserwacji.

### **Kampanie wymagające decyzji**

Lista kampanii z krótkim statusem i rekomendacją.

### **Główne zalecenia**

Lista działań uporządkowanych według priorytetu.

### **Pole rozmowy z danymi**

Widoczne pole, w którym użytkownik może zadać pytanie dotyczące wyników.

Dopiero po wejściu w szczegóły powinny pojawiać się rozbudowane dane, tabele i wykresy.

---

## **13\. Model diagnozy**

Aplikacja powinna rozdzielać wnioski na trzy poziomy pewności.

### **1\. Potwierdzone przez dane**

Są to informacje wynikające bezpośrednio z danych.

Przykład:

**Liczba rezerwacji spadła z 12 do 8, czyli o 33%. Jednocześnie wydatki wzrosły o 18%.**

### **2\. Wysokie prawdopodobieństwo**

Są to wnioski wynikające z połączenia kilku sygnałów.

Przykład:

**Kampania generuje zaangażowany ruch i przejścia do wyboru terminu, ale użytkownicy rzadko przechodzą do kolejnego kroku. Z wysokim prawdopodobieństwem problem występuje po stronie oferty, ceny, dostępności lub procesu rezerwacyjnego, a nie samej reklamy.**

### **3\. Do sprawdzenia**

Są to hipotezy wymagające dodatkowej weryfikacji.

Przykład:

**Do sprawdzenia: czy w analizowanym okresie zmieniły się ceny, dostępność pokoi albo warunki pakietu. Dane o zachowaniu wskazują na zainteresowanie, ale nie potwierdzają przyczyny rezygnacji.**

Aplikacja nie powinna przedstawiać hipotez jako faktów.

Każda diagnoza powinna zawierać:

* dowód liczbowy,  
* poziom pewności,  
* krótkie uzasadnienie,  
* rekomendowane działanie,  
* informację o brakujących danych, jeśli występują.

---

## **14\. Reguły oceny kampanii**

Reguły oceny będą definiowane przez użytkownika aplikacji.

System nie powinien samodzielnie narzucać uniwersalnych progów dla wszystkich hoteli.

Reguły mogą uwzględniać:

* minimalny poziom wydatków,  
* minimalną liczbę sesji,  
* minimalną liczbę zdarzeń,  
* zmianę CTR,  
* zmianę CPC,  
* zmianę częstotliwości,  
* jakość ruchu,  
* przejścia między etapami lejka,  
* liczbę kontaktów,  
* liczbę rezerwacji,  
* koszt rezerwacji,  
* ROAS,  
* zmianę wyniku względem poprzedniego tygodnia,  
* historię konkretnego hotelu.

Przykładowe statusy:

### **Działa dobrze**

Kampania generuje wartościowy ruch, mikro-konwersje, kontakty lub rezerwacje na akceptowalnym poziomie kosztowym.

### **Potencjał do skalowania**

Kampania generuje realną wartość, wyniki są stabilne, a wzrost budżetu nie powinien w danym momencie istotnie pogorszyć efektywności.

### **Wypalanie kampanii**

Częstotliwość, CPC lub koszt wyniku rośnie, a CTR, zaangażowanie albo liczba mikro-konwersji spada.

### **Przepalanie budżetu**

Wydatki rosną bez odpowiedniego wzrostu jakości ruchu, mikro-konwersji, kontaktów lub rezerwacji.

### **Dobry ruch, problem dalej w lejku**

Reklama przyciąga właściwych użytkowników, ale użytkownicy odpadają na stronie, ofercie albo w procesie rezerwacyjnym.

### **Za mało danych**

Próg danych nie pozwala na sformułowanie wiarygodnego wniosku.

Dokładne wartości progów zostaną określone na późniejszym etapie.

---

## **15\. Minimalny zakres pierwszego MVP**

Pierwsze MVP powinno obejmować:

### **1\. Porównanie danych**

Porównanie bieżącego okresu z analogicznym okresem poprzedniego tygodnia.

### **2\. Analizę całego hotelu**

Podsumowanie wyniku biznesowego, wydatków i głównych zmian.

### **3\. Analizę kampanii**

Ocena wyników kampanii w połączeniu z zachowaniem użytkowników i rezerwacjami.

### **4\. Lejek zachowań**

Pokazanie przejść użytkowników przez najważniejsze etapy:

* wejście,  
* zaangażowanie,  
* mikro-konwersje,  
* proces rezerwacyjny,  
* kontakt,  
* purchase.

### **5\. Analizę udziału kanałów w ścieżce**

Pokazanie, które kanały:

* rozpoczynały ścieżkę,  
* wspierały ścieżkę,  
* domykały kontakt lub rezerwację.

### **6\. Diagnozę**

Wskazanie, co się zmieniło i gdzie prawdopodobnie występuje problem.

### **7\. Chat z danymi**

Możliwość zadawania pytań dotyczących wybranego hotelu, okresu, kanału i kampanii.

Chat powinien umożliwiać analizę i prowadzić do decyzji.

W pierwszym prototypie chat może symulować odpowiedzi i nie musi być jeszcze połączony z rzeczywistymi danymi.

---

## **16\. Funkcje poza zakresem pierwszego MVP**

Na tym etapie nie są konieczne:

* automatyczne zwiększanie lub zmniejszanie budżetów,  
* automatyczne wyłączanie kampanii,  
* bezpośrednie wprowadzanie zmian w Meta Ads,  
* bezpośrednie wprowadzanie zmian w Google Ads,  
* analiza pojedynczych kreacji,  
* analiza pojedynczych słów kluczowych,  
* analiza cen konkurencji,  
* prognozowanie przyszłej sprzedaży,  
* automatyczne generowanie raportów dla klientów,  
* osobne konta dla hoteli,  
* rozbudowany system uprawnień,  
* aplikacja mobilna,  
* pełna atrybucja każdego użytkownika między urządzeniami.

Te elementy mogą zostać rozważone w kolejnych wersjach.

---

## **17\. Podstawowe założenia dotyczące danych**

Aplikacja ma korzystać z danych pochodzących z:

* Meta Ads,  
* Google Ads,  
* GA4,  
* systemu rezerwacyjnego,  
* BigQuery.

BigQuery może pełnić rolę głównego miejsca, w którym dane są przechowywane, porządkowane i łączone.

Na etapie konceptu nie jest jeszcze ustalane:

* jak często dane będą odświeżane,  
* czy dane będą pobierane bezpośrednio z API,  
* jak będzie działać integracja z systemem rezerwacyjnym,  
* jaki będzie finalny model danych,  
* w jakiej technologii powstanie aplikacja,  
* jaki model AI będzie obsługiwać diagnozy i chat.

Te decyzje należą do kolejnego etapu.

---

## **18\. Najważniejsze ryzyka**

### **Brak pełnej atrybucji**

Nie zawsze będzie możliwe połączenie konkretnej reklamy z konkretną rezerwacją.

Aplikacja powinna w takich przypadkach korzystać z wysokiego prawdopodobieństwa, analizy agregatów i wielu sygnałów, ale musi jasno komunikować poziom pewności.

### **Niespójne nazwy kampanii i identyfikatory**

Dane z różnych systemów mogą posługiwać się innymi nazwami lub identyfikatorami kampanii.

Bez uporządkowania tych danych analiza może być błędna.

### **Braki w śledzeniu zdarzeń**

Nie wszystkie hotele muszą mieć prawidłowo wdrożone te same zdarzenia.

Aplikacja powinna wykrywać brak danych zamiast interpretować brak zdarzenia jako brak zachowania użytkownika.

### **Kliknięcie telefonu a wykonanie połączenia**

Kliknięcie numeru telefonu nie zawsze oznacza faktyczne przeprowadzenie rozmowy.

To ryzyko trzeba uwzględnić w definicji wartościowego kontaktu.

### **Sezonowość**

Porównanie tydzień do tygodnia może nie uwzględniać:

* świąt,  
* wakacji,  
* wydarzeń,  
* zmian dostępności,  
* zmian cen,  
* kampanii promocyjnych,  
* nagłych zmian popytu.

Aplikacja powinna pozwalać oznaczać takie zdarzenia albo przynajmniej wskazywać je jako możliwy kontekst.

### **Zbyt szybkie rekomendacje**

Mała liczba sesji, kontaktów lub rezerwacji może prowadzić do błędnych wniosków.

Dlatego jednym z podstawowych wyników analizy musi być status:

**Za mało danych do podjęcia decyzji.**

### **Ryzyko zamiany w dashboard**

Jeśli aplikacja zostanie zbudowana wokół tabel, KPI i wykresów, może stać się kolejnym narzędziem raportowym.

Aby temu zapobiec, każdy główny ekran powinien odpowiadać na cztery pytania:

1. Co się zmieniło?  
2. Dlaczego prawdopodobnie się zmieniło?  
3. Jakie dane to potwierdzają?  
4. Co należy zrobić dalej?

---

## **19\. Zasady projektowania interfejsu**

Aplikacja powinna być:

* prosta,  
* czytelna,  
* premium,  
* spokojna wizualnie,  
* pozbawiona nadmiaru wykresów,  
* oparta na hierarchii informacji,  
* napisana prostym językiem,  
* zrozumiała bez wiedzy technicznej,  
* skoncentrowana na decyzjach.

Najpierw użytkownik powinien widzieć:

* diagnozę,  
* priorytet,  
* rekomendację,  
* dowód.

Dopiero później:

* wskaźniki,  
* tabele,  
* wykresy,  
* szczegółowe dane.

Każda rekomendacja powinna być możliwa do rozwinięcia, aby użytkownik mógł zobaczyć liczby, na podstawie których została sformułowana.

---

## **20\. Proponowane ekrany klikalnego prototypu**

### **Ekran 1\. Wybór hotelu i okresu**

* wybór hotelu,  
* wybór daty końcowej analizy,  
* automatyczny zakres porównawczy,  
* przycisk „Analizuj”.

### **Ekran 2\. Diagnoza hotelu**

* podsumowanie okresu,  
* liczba i wartość rezerwacji,  
* wydatki,  
* wartościowe kontakty,  
* 3–5 najważniejszych wniosków,  
* lista rekomendacji,  
* kampanie wymagające działania,  
* pole chatu.

### **Ekran 3\. Lista kampanii**

* nazwa kampanii,  
* status,  
* wydatki,  
* zmiana kosztów,  
* jakość ruchu,  
* mikro-konwersje,  
* kontakty,  
* rezerwacje,  
* rekomendowane działanie.

### **Ekran 4\. Szczegóły kampanii**

* diagnoza kampanii,  
* porównanie tydzień do tygodnia,  
* wyniki reklamowe,  
* jakość ruchu,  
* lejek zachowań,  
* kontakty,  
* rezerwacje,  
* dowody liczbowe,  
* rekomendacja.

### **Ekran 5\. Lejek zachowań**

* wejście,  
* zaangażowanie,  
* szczegóły oferty,  
* wybór terminu,  
* kolejne kroki rezerwacji,  
* kontakt,  
* purchase,  
* największe spadki między etapami.

### **Ekran 6\. Udział kanałów w ścieżce**

* kanały rozpoczynające,  
* kanały wspierające,  
* kanały domykające,  
* ścieżki prowadzące do kontaktu,  
* ścieżki prowadzące do rezerwacji.

### **Ekran 7\. Chat z danymi**

* pole do wpisania pytania,  
* proponowane pytania,  
* odpowiedź,  
* poziom pewności,  
* dowody liczbowe,  
* rekomendowane działanie,  
* możliwość przejścia do wskazanej kampanii lub fragmentu lejka.

---

## **21\. Przykład odpowiedzi aplikacji**

### **Diagnoza**

**Liczba rezerwacji spadła o 25%, mimo że wydatki reklamowe wzrosły o 18%. Spadek nie wynika jednak ze zmniejszenia ruchu. Użytkownicy częściej otwierali szczegóły oferty i przechodzili do wyboru terminu, ale rzadziej przechodzili z pierwszego do drugiego etapu rezerwacji.**

### **Poziom pewności**

**Wysokie prawdopodobieństwo**

### **Dowody**

* wydatki: \+18%,  
* sesje z kampanii: \+12%,  
* sesje zaangażowane: \+15%,  
* przejścia do wyboru terminu: \+21%,  
* przejście step1 → step2: spadek z 9,8% do 5,4%,  
* liczba purchase: spadek z 8 do 6\.

### **Interpretacja**

**Kampanie nadal generują zainteresowanie. Problem najprawdopodobniej znajduje się po wejściu do procesu rezerwacyjnego, a nie na poziomie reklamy.**

### **Rekomendacja**

**Nie zwiększaj obecnie budżetu. Sprawdź ceny, dostępność i działanie drugiego etapu procesu rezerwacyjnego. Utrzymaj kampanie bez większych zmian do czasu zakończenia tej weryfikacji.**

### **Do sprawdzenia**

* zmiana cen,  
* brak dostępności wybranych terminów,  
* błąd techniczny,  
* dodatkowe koszty pojawiające się w drugim kroku,  
* niedopasowanie komunikatu reklamy do finalnej oferty.

---

## **22\. Kryterium sukcesu pierwszego prototypu**

Pierwszy klikalny prototyp będzie wartościowy, jeśli po jego przejściu użytkownik będzie mógł odpowiedzieć:

* Co zmieniło się względem poprzedniego tygodnia?  
* Które kampanie odpowiadają za tę zmianę?  
* Na którym etapie ścieżki występuje problem?  
* Czy problem leży w reklamie, ruchu, stronie czy procesie rezerwacyjnym?  
* Która kampania generuje realną wartość?  
* Która kampania tylko dobrze wygląda w panelu reklamowym?  
* Czy są kampanie możliwe do skalowania?  
* Jakie działanie należy podjąć jako pierwsze?  
* Jakie dane potwierdzają tę rekomendację?  
* Czy danych jest wystarczająco dużo, aby podjąć decyzję?

Jeśli prototyp pokazuje wyłącznie wskaźniki i wykresy, ale nie prowadzi użytkownika do decyzji, nie realizuje głównego celu aplikacji.

