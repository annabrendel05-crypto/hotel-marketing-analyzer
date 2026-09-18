import type { DiagnosticInput } from "./input";
import type { Diagnostic } from "./types";
import { deriveComparisonMetrics } from "./derived-metrics";

export function runTrafficQualityDiagnostics(
  input: DiagnosticInput
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const { current, comparison } = input;

  const derived = deriveComparisonMetrics(
    current,
    comparison
  );

  const {
    sessions_pct,
    engaged_view_rate_pct,
    engaged_session_rate_pct,
    view_offer_or_room_rate_pct,
  } = derived.changes;

  /*
   * TRAFFIC_QUALITY.TRAFFIC_UP_QUALITY_DOWN
   *
   * Ruch rośnie, ale jakość pierwszego kontaktu spada.
   *
   * Warunki:
   * - minimum 150 sesji w obu okresach,
   * - wzrost sessions >= 15%,
   * - minimum 2 z 3 podstawowych wskaźników jakości
   *   spadają relatywnie o >= 15%.
   */

  const qualitySignals = [
    {
      name: "engaged_view_rate",
      change: engaged_view_rate_pct,
    },
    {
      name: "engaged_session_rate",
      change: engaged_session_rate_pct,
    },
    {
      name: "view_offer_or_room_rate",
      change: view_offer_or_room_rate_pct,
    },
  ];

  const decliningSignals = qualitySignals.filter(
    (signal) =>
      signal.change !== null &&
      signal.change <= -15
  );

  const hasMinimumVolume =
    current.ga4.sessions >= 150 &&
    comparison.ga4.sessions >= 150;

  const trafficIncreased =
    sessions_pct !== null &&
    sessions_pct >= 15;

  if (
    hasMinimumVolume &&
    trafficIncreased &&
    decliningSignals.length >= 2
  ) {
    const nearMinimumVolume =
      current.ga4.sessions < 300 ||
      comparison.ga4.sessions < 300;

    const confidence: Diagnostic["confidence"] =
      nearMinimumVolume ? "LOW" : "MEDIUM";

    const evidence = [
      `Liczba sesji wzrosła o ${sessions_pct.toFixed(1)}%.`,
      ...decliningSignals.map(
        (signal) =>
          `${signal.name} spadł relatywnie o ${Math.abs(
            signal.change ?? 0
          ).toFixed(1)}%.`
      ),
    ];

    diagnostics.push({
      family: "TRAFFIC_QUALITY",
      code: "TRAFFIC_UP_QUALITY_DOWN",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        current_sessions: current.ga4.sessions,
        comparison_sessions:
          comparison.ga4.sessions,

        sessions_change_pct:
          sessions_pct,

        current_engaged_view_rate:
          derived.current.engaged_view_rate,
        comparison_engaged_view_rate:
          derived.comparison.engaged_view_rate,
        engaged_view_rate_change_pct:
          engaged_view_rate_pct,

        current_engaged_session_rate:
          derived.current.engaged_session_rate,
        comparison_engaged_session_rate:
          derived.comparison.engaged_session_rate,
        engaged_session_rate_change_pct:
          engaged_session_rate_pct,

        current_view_offer_or_room_rate:
          derived.current.view_offer_or_room_rate,
        comparison_view_offer_or_room_rate:
          derived.comparison.view_offer_or_room_rate,
        view_offer_or_room_rate_change_pct:
          view_offer_or_room_rate_pct,

        declining_quality_signals:
          decliningSignals.length,
      },

      evidence,

      confidence,
      severity: "MEDIUM",
      business_impact: "MEDIUM",
      urgency: "MEDIUM",

      evidence_strength:
        decliningSignals.length === 3 &&
        !nearMinimumVolume
          ? "HIGH"
          : "MEDIUM",

      actionability: "MEDIUM",

      data_completeness: "COMPLETE",

      recommendation_code:
        "CHECK_TRAFFIC_QUALITY",

      action_type:
        "TARGETING / CREATIVE / LANDING / TRAFFIC_SOURCE",

      related_diagnostics: [
        "DEMAND_GENERATOR",
        "COST_UP_SALES_FLAT",
      ],

      client_text:
        "Ruch na stronie wzrósł, ale użytkownicy rzadziej angażują się i przechodzą do przeglądania oferty. Warto sprawdzić, z jakich kampanii lub źródeł pochodzi dodatkowy ruch i czy trafia do właściwej grupy odbiorców.",
    });
  }

  return diagnostics;
}
