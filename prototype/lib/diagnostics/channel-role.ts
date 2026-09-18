import type { DiagnosticInput } from "./input";
import type { Diagnostic } from "./types";
import { deriveComparisonMetrics } from "./derived-metrics";

export function runChannelRoleDiagnostics(
  input: DiagnosticInput
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const { current, comparison } = input;

  const derived = deriveComparisonMetrics(
    current,
    comparison
  );

  /*
   * CHANNEL_ROLE.DEMAND_GENERATOR
   */

  const hasTrafficVolume =
    current.ga4.sessions >= 150 &&
    comparison.ga4.sessions >= 150;

  const trafficGrowing =
    derived.changes.sessions_pct !== null &&
    derived.changes.sessions_pct >= 15;

  const qualityNotWeak =
    (
      derived.changes.engaged_view_rate_pct === null ||
      derived.changes.engaged_view_rate_pct > -15
    ) &&
    (
      derived.changes.engaged_session_rate_pct === null ||
      derived.changes.engaged_session_rate_pct > -15
    ) &&
    (
      derived.changes.view_offer_or_room_rate_pct === null ||
      derived.changes.view_offer_or_room_rate_pct > -15
    );

  const laterSignalsPresent =
    (
      current.ga4.returning_users !== undefined &&
      comparison.ga4.returning_users !== undefined &&
      current.ga4.returning_users >
        comparison.ga4.returning_users
    ) ||
    (
      current.google_ads.brand_clicks !== undefined &&
      comparison.google_ads.brand_clicks !== undefined &&
      current.google_ads.brand_clicks >
        comparison.google_ads.brand_clicks
    );

  if (
    hasTrafficVolume &&
    trafficGrowing &&
    qualityNotWeak
  ) {
    diagnostics.push({
      family: "CHANNEL_ROLE",
      code: "DEMAND_GENERATOR",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        current_sessions:
          current.ga4.sessions,

        comparison_sessions:
          comparison.ga4.sessions,

        sessions_change_pct:
          derived.changes.sessions_pct,

        current_engaged_view_rate:
          derived.current.engaged_view_rate,

        comparison_engaged_view_rate:
          derived.comparison.engaged_view_rate,

        current_view_offer_or_room_rate:
          derived.current.view_offer_or_room_rate,

        comparison_view_offer_or_room_rate:
          derived.comparison.view_offer_or_room_rate,

        later_signals_present:
          laterSignalsPresent ? 1 : 0,
      },

      evidence: [
        "Ruch wzrósł przy zachowaniu stabilnej jakości pierwszego kontaktu.",
        laterSignalsPresent
          ? "Widoczne są również późniejsze sygnały powrotu lub zainteresowania marką."
          : "Na poziomie zagregowanym wzorzec jest zgodny z rolą generowania popytu.",
      ],

      confidence:
        laterSignalsPresent
          ? "MEDIUM"
          : "LOW",

      severity: "INFO",
      business_impact: "MEDIUM",
      urgency: "LOW",

      evidence_strength:
        laterSignalsPresent
          ? "MEDIUM"
          : "LOW",

      actionability: "LOW",

      data_completeness: "COMPLETE",

      recommendation_code:
        "MAINTAIN_AND_EVALUATE_DEMAND_GENERATION",

      action_type:
        "CHANNEL_ROLE / STRATEGY",

      related_diagnostics: [
        "TRAFFIC_UP_QUALITY_DOWN",
        "COST_UP_SALES_FLAT",
        "SALES_UP_EFFICIENCY_GOOD",
      ],

      client_text:
        "Wzorzec danych jest zgodny z rolą generowania popytu: działania zwiększają liczbę kontaktów z ofertą bez wyraźnego pogorszenia jakości ruchu. Pełne potwierdzenie tej roli wymaga analizy ścieżek użytkowników i danych per kanał.",
    });
  }

  /*
   * CHANNEL_ROLE.ASSISTER
   */

  const deeperFunnelVisible =
    current.ga4.step1 >= 20 &&
    current.ga4.step2 >= 5;

  const qualityVisible =
    (
      derived.current.engaged_view_rate !== null &&
      derived.current.engaged_view_rate > 0
    ) ||
    (
      derived.current.view_offer_or_room_rate !== null &&
      derived.current.view_offer_or_room_rate > 0
    );

  const returningVisible =
    current.ga4.returning_users !== undefined &&
    current.ga4.returning_users > 0;

  if (
    hasTrafficVolume &&
    deeperFunnelVisible &&
    qualityVisible &&
    returningVisible
  ) {
    diagnostics.push({
      family: "CHANNEL_ROLE",
      code: "ASSISTER",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        sessions:
          current.ga4.sessions,

        engaged_view_rate:
          derived.current.engaged_view_rate,

        view_offer_or_room_rate:
          derived.current.view_offer_or_room_rate,

        step1:
          current.ga4.step1,

        step2:
          current.ga4.step2,

        step3:
          current.ga4.step3,

        returning_users:
          current.ga4.returning_users ?? null,
      },

      evidence: [
        "Użytkownicy angażują się w ofertę i przechodzą do głębszych etapów lejka.",
        "Widoczne są również powroty użytkowników, co jest zgodne z rolą wspierającą decyzję zakupową.",
      ],

      confidence: "LOW",

      severity: "INFO",
      business_impact: "MEDIUM",
      urgency: "LOW",

      evidence_strength: "LOW",
      actionability: "LOW",

      data_completeness: "COMPLETE",

      recommendation_code:
        "MAINTAIN_AND_EVALUATE_ASSISTING_ROLE",

      action_type:
        "CHANNEL_ROLE / STRATEGY",

      related_diagnostics: [
        "DEMAND_GENERATOR",
        "CLOSER",
      ],

      client_text:
        "Dane są zgodne z rolą wspierającą decyzję: użytkownicy angażują się, wracają i przechodzą do dalszych etapów procesu rezerwacji. Pełne potwierdzenie wymaga danych o ścieżkach użytkownika i udziale konkretnego kanału.",
    });
  }

  /*
   * CHANNEL_ROLE.CLOSER
   */

  const endOfFunnelVisible =
    current.ga4.step3 >= 5 &&
    current.ga4.ga4_unique_purchases > 0;

  const strongFinalRate =
    derived.current.step3_to_purchase_rate !== null &&
    derived.current.step3_to_purchase_rate >= 0.1;

  const brandOrReturningSignal =
    (
      current.google_ads.brand_clicks !== undefined &&
      current.google_ads.brand_clicks > 0
    ) ||
    returningVisible;

  if (
    endOfFunnelVisible &&
    strongFinalRate &&
    brandOrReturningSignal
  ) {
    diagnostics.push({
      family: "CHANNEL_ROLE",
      code: "CLOSER",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        step3:
          current.ga4.step3,

        ga4_unique_purchases:
          current.ga4.ga4_unique_purchases,

        step3_to_purchase_rate:
          derived.current.step3_to_purchase_rate,

        brand_clicks:
          current.google_ads.brand_clicks ?? null,

        returning_users:
          current.ga4.returning_users ?? null,
      },

      evidence: [
        "Użytkownicy docierają do końcowej części lejka i finalizują część rezerwacji.",
        "Widoczny jest sygnał wysokiej intencji, taki jak ruch brandowy lub użytkownicy powracający.",
      ],

      confidence: "LOW",

      severity: "INFO",
      business_impact: "MEDIUM",
      urgency: "LOW",

      evidence_strength: "LOW",
      actionability: "LOW",

      data_completeness: "COMPLETE",

      recommendation_code:
        "MAINTAIN_AND_EVALUATE_CLOSING_ROLE",

      action_type:
        "CHANNEL_ROLE / STRATEGY",

      related_diagnostics: [
        "DEMAND_GENERATOR",
        "ASSISTER",
        "SALES_UP_EFFICIENCY_GOOD",
      ],

      client_text:
        "Wzorzec danych jest zgodny z rolą domykającą: użytkownicy znajdują się blisko końca ścieżki i część z nich finalizuje zakup. Sam wynik last-click nie oznacza jednak, że ten kanał stworzył popyt.",
    });
  }

  return diagnostics;
}
