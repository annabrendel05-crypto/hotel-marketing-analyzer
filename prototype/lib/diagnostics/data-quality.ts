import type { DiagnosticInput } from "./input";
import type { Diagnostic } from "./types";

function isProfitroomComplete(
  selectedPeriodEnd: string,
  profitroomDataThrough: string | null
): boolean {
  if (!profitroomDataThrough) return false;

  return profitroomDataThrough >= selectedPeriodEnd;
}

export function runDataQualityDiagnostics(
  input: DiagnosticInput
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const { current, comparison } = input;

  const currentProfitroomComplete = isProfitroomComplete(
    current.end_date,
    current.profitroom.profitroom_data_through
  );

  const comparisonProfitroomComplete = isProfitroomComplete(
    comparison.end_date,
    comparison.profitroom.profitroom_data_through
  );

  /*
   * DATA_QUALITY.INCOMPLETE_PROFITROOM
   */
  if (!currentProfitroomComplete) {
    diagnostics.push({
      family: "DATA_QUALITY",
      code: "INCOMPLETE_PROFITROOM",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        selected_period_end: current.end_date,
        profitroom_data_through:
          current.profitroom.profitroom_data_through,
      },

      evidence: [
        "Wybrany okres wykracza poza zakres kompletnych danych Profitroom.",
      ],

      confidence: "HIGH",
      severity: "MEDIUM",
      business_impact: "HIGH",
      urgency: "MEDIUM",
      evidence_strength: "HIGH",
      actionability: "HIGH",

      data_completeness: "PARTIAL",

      recommendation_code: "USE_COMPLETE_SALES_RANGE",
      action_type: "DATA",

      related_diagnostics: [
        "TRACKING_MISMATCH",
        "STEP3_TO_PURCHASE_WEAK",
        "TOTAL_DEMAND_UP",
        "TOTAL_DEMAND_DOWN",
        "DIRECT_TO_OTA",
        "OTA_TO_DIRECT",
        "COST_UP_SALES_FLAT",
        "SALES_UP_EFFICIENCY_GOOD",
      ],

      client_text:
        "Dane sprzedażowe Profitroom obejmują krótszy zakres niż wybrany okres. Ocena sprzedaży powinna korzystać ze wspólnego kompletnego zakresu danych.",
    });
  }

  /*
   * DATA_QUALITY.TRACKING_MISMATCH
   */
  if (
    currentProfitroomComplete &&
    current.profitroom.direct_created_bookings >= 3
  ) {
    const directCreated =
      current.profitroom.direct_created_bookings;

    const ga4Purchases =
      current.ga4.ga4_unique_purchases;

    const trackingGap =
      directCreated > 0
        ? (directCreated - ga4Purchases) / directCreated
        : 0;

    const strongVariant =
      current.ga4.step3 >= 5 &&
      directCreated >= 3 &&
      ga4Purchases === 0;

    if (trackingGap >= 0.3 || strongVariant) {
      let confidence: Diagnostic["confidence"] = "MEDIUM";

      if (
        trackingGap > 0.5 ||
        strongVariant
      ) {
        confidence = "HIGH";
      }

      diagnostics.push({
        family: "DATA_QUALITY",
        code: "TRACKING_MISMATCH",

        scope: "HOTEL",
        status: "ACTIVE",

        metric_context: {
          direct_created_bookings: directCreated,
          ga4_unique_purchases: ga4Purchases,
          step3: current.ga4.step3,
          tracking_gap: trackingGap,
        },

        evidence: [
          "Profitroom potwierdza utworzone rezerwacje Direct.",
          "Liczba purchase w GA4 jest wyraźnie niższa od liczby utworzonych rezerwacji.",
        ],

        confidence,
        severity: "HIGH",
        business_impact: "MEDIUM",
        urgency: "HIGH",
        evidence_strength:
          confidence === "HIGH" ? "HIGH" : "MEDIUM",
        actionability: "HIGH",

        data_completeness: "COMPLETE",

        recommendation_code: "CHECK_TRACKING",
        action_type: "TRACKING",

        related_diagnostics: [
          "STEP3_TO_PURCHASE_WEAK",
        ],

        client_text:
          "Profitroom potwierdza sprzedaż Direct, a GA4 rejestruje wyraźnie mniej purchase. Najpierw warto sprawdzić pomiar końca ścieżki rezerwacyjnej.",
      });
    }
  }

  /*
   * DATA_QUALITY.INSUFFICIENT_DATA
   *
   * Ten kod będzie docelowo uruchamiany również przez gates.ts
   * dla konkretnych diagnoz kandydackich.
   *
   * Na tym etapie wykrywamy tylko ogólny brak podstawowego wolumenu
   * potrzebnego do analizy porównawczej.
   */
  const currentHasBasicVolume =
    current.ga4.sessions >= 150 ||
    current.profitroom.active_online_bookings >= 3;

  const comparisonHasBasicVolume =
    comparison.ga4.sessions >= 150 ||
    comparison.profitroom.active_online_bookings >= 3;

  if (!currentHasBasicVolume || !comparisonHasBasicVolume) {
    diagnostics.push({
      family: "DATA_QUALITY",
      code: "INSUFFICIENT_DATA",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        current_sessions: current.ga4.sessions,
        comparison_sessions: comparison.ga4.sessions,
        current_active_online_bookings:
          current.profitroom.active_online_bookings,
        comparison_active_online_bookings:
          comparison.profitroom.active_online_bookings,
      },

      evidence: [
        "Wolumen danych jest zbyt mały do części mocnych diagnoz porównawczych.",
      ],

      confidence: "HIGH",
      severity: "LOW",
      business_impact: "MEDIUM",
      urgency: "LOW",
      evidence_strength: "HIGH",
      actionability: "HIGH",

      data_completeness: "INSUFFICIENT",

      recommendation_code: "COLLECT_MORE_DATA",
      action_type: "DATA",

      related_diagnostics: [],

      client_text:
        "Do pełnej oceny potrzebny jest większy wolumen danych. Aktualny wynik może pozostać sygnałem do obserwacji.",
    });
  }

  /*
   * Jeśli comparison Profitroom też jest niekompletny,
   * traktujemy to jako dodatkowe evidence dla jakości danych.
   */
  if (
    currentProfitroomComplete &&
    !comparisonProfitroomComplete
  ) {
    diagnostics.push({
      family: "DATA_QUALITY",
      code: "INCOMPLETE_PROFITROOM",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        comparison_period_end: comparison.end_date,
        comparison_profitroom_data_through:
          comparison.profitroom.profitroom_data_through,
      },

      evidence: [
        "Okres porównawczy wykracza poza zakres kompletnych danych Profitroom.",
      ],

      confidence: "HIGH",
      severity: "MEDIUM",
      business_impact: "HIGH",
      urgency: "MEDIUM",
      evidence_strength: "HIGH",
      actionability: "HIGH",

      data_completeness: "PARTIAL",

      recommendation_code: "USE_COMPLETE_SALES_RANGE",
      action_type: "DATA",

      related_diagnostics: [
        "TOTAL_DEMAND_UP",
        "TOTAL_DEMAND_DOWN",
        "DIRECT_TO_OTA",
        "OTA_TO_DIRECT",
        "COST_UP_SALES_FLAT",
        "SALES_UP_EFFICIENCY_GOOD",
      ],

      client_text:
        "Okres porównawczy ma niepełne dane Profitroom. Porównanie sprzedaży powinno korzystać ze wspólnego kompletnego zakresu.",
    });
  }

  return diagnostics;
}
