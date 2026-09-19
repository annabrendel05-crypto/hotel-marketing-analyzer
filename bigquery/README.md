# Warstwa danych HMA

Warstwa danych Hotel Marketing Analyzer powstała jako osobny etap projektu. Obejmuje przygotowanie struktur BigQuery oraz źródeł wykorzystywanych przez backend do analizy sprzedaży, marketingu i zachowania użytkowników.

Źródła są rozdzielone według ich roli:

- **GA4** — dane analityczne o zachowaniu użytkowników; eksporty demo rozwijane iteracyjnie od v1 do v4.
- **Meta Ads** — dane reklamowe; eksport demo v1.
- **Google Ads** — dane reklamowe; eksport demo v1.
- **Profitroom** — dane rezerwacyjne; eksport demo v1.

Dane demo były przygotowywane iteracyjnie, a ich struktury i spójność walidowano względem formatu źródeł oraz założeń biznesowych HMA. Rozdzielenie danych analitycznych, reklamowych i rezerwacyjnych pozwala zachować właściwy kontekst każdej metryki w backendzie.

Repozytorium nie publikuje surowych eksportów ani roboczych plików kalibracyjnych. Szczegółowe reguły przygotowania i kalibracji danych pozostają poza tym opisem.
