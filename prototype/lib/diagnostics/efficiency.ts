import type { DiagnosticInput } from "./input";
import type { Diagnostic } from "./types";
import { deriveComparisonMetrics } from "./derived-metrics";

function isProfitroomComplete(
  selectedPeriodEnd: string,
  profitroomDataThrough: string | null
): boolean {
  if (!profitroomDataThrough) return false;

  return profitroomDataThrough >= selectedPeriodEnd;
}

function isFlat(change: number | null): boolean {
  return change !== null && change >= -10 && change <= 10;
}

export function runEfficiencyDiagnostics(
  input: DiagnosticInput
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const { current, comparison } = input;

  const currentComplete = isProfitroomComplete(
    current.end_date,
    current.profitroom.profitroom_data_through
  );

  const comparisonComplete = isProfitroomComplete(
    comparison.end_date,
    comparison.profitroom.profitroom_data_through
  );

  if (!currentComplete || !comparisonComplete) {
    return diagnostics;
  }

  const derived = deriveComparisonMetrics(
    current,
    comparison
  );

  const {
    active_online_bookings_pct,
    active_online_revenue_pct,
    total_paid_media_cost_pct,
    blended_paid_media_cost_per_active_online_booking_pct,
  } = derived.changes;

  /*
   * EFFICIENCY.COST_UP_SALES_FLAT
   */
  if (
    derived.current.total_paid_media_cost >= 150 &&
    derived.comparison.total_paid_media_cost >= 150 &&
    current.profitroom.active_online_bookings >= 3 &&
    comparison.profitroom.active_online_bookings >= 3 &&
    total_paid_media_cost_pct !== null &&
    total_paid_media_cost_pct >= 20 &&
    isFlat(active_online_bookings_pct) &&
    isFlat(active_online_revenue_pct)
  ) {
    diagnostics.push({
      family: "EFFICIENCY",
      code: "COST_UP_SALES_FLAT",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        current_total_paid_media_cost:
          derived.current.total_paid_media_cost,

        comparison_total_paid_media_cost:
          derived.comparison.total_paid_media_cost,

        total_paid_media_cost_change_pct:
          total_paid_media_cost_pct,

        current_active_online_bookings:
          current.profitroom.active_online_bookings,

        comparison_active_online_bookings:
          comparison.profitroom.active_online_bookings,

        active_online_bookings_change_pct:
          active_online_bookings_pct,

        current_active_online_revenue:
          current.profitroom.active_online_revenue,

        comparison_active_online_revenue:
          comparison.profitroom.active_online_revenue,

        active_online_revenue_change_pct:
          active_online_revenue_pct,

        current_blended_cost_per_booking:
          derived.current
            .blended_paid_media_cost_per_active_online_booking,

        comparison_blended_cost_per_booking:
          derived.comparison
            .blended_paid_media_cost_per_active_online_booking,

        blended_cost_per_booking_change_pct:
          blended_paid_media_cost_per_active_online_booking_pct,
      },

      evidence: [
        `Łączny koszt Meta Ads i Google Ads wzrósł o ${total_paid_media_cost_pct.toFixed(
          1
        )}%.`,
        "Liczba aktywnych rezerwacji online pozostała w zbliżonym przedziale.",
        "Przychód z aktywnych rezerwacji online pozostał w zbliżonym przedziale.",
      ],

      confidence: "MEDIUM",

      severity: "HIGH",
      business_impact: "HIGH",
      urgency: "MEDIUM",

      evidence_strength: "MEDIUM",
      actionability: "HIGH",

      data_completeness: "COMPLETE",

      recommendation_code:
        "REVIEW_EFFICIENCY_AND_SCALING",

      action_type:
        "BUDGET / CHANNEL_MIX / CAMPAIGN / STRATEGY",

      related_diagnostics: [
        "TOTAL_DEMAND_DOWN",
        "DIRECT_TO_OTA",
        "TRAFFIC_UP_QUALITY_DOWN",
        "DEMAND_GENERATOR",
        "ASSISTER",
        "CLOSER",
      ],

      client_text:
        "Koszt płatnych działań wzrósł, ale realna sprzedaż pozostaje na podobnym poziomie. Warto sprawdzić, który kanał odpowiada za wzrost kosztu, jaką pełni rolę w ścieżce oraz czy dodatkowy ruch przekłada się na jakość, lejek i sprzedaż Direct.",
    });
  }

  /*
   * EFFICIENCY.SALES_UP_EFFICIENCY_GOOD
   */
  const blendedEfficiencyGood =
    blended_paid_media_cost_per_active_online_booking_pct !== null &&
    blended_paid_media_cost_per_active_online_booking_pct <= 10;

  if (
    derived.current.total_paid_media_cost >= 150 &&
    derived.comparison.total_paid_media_cost >= 150 &&
    current.profitroom.active_online_bookings >= 10 &&
    comparison.profitroom.active_online_bookings >= 10 &&
    active_online_bookings_pct !== null &&
    active_online_revenue_pct !== null &&
    active_online_bookings_pct >= 15 &&
    active_online_revenue_pct >= 15 &&
    blendedEfficiencyGood
  ) {
    const costPerBookingImproved =
      blended_paid_media_cost_per_active_online_booking_pct !== null &&
      blended_paid_media_cost_per_active_online_booking_pct < 0;

    diagnostics.push({
      family: "EFFICIENCY",
      code: "SALES_UP_EFFICIENCY_GOOD",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        current_total_paid_media_cost:
          derived.current.total_paid_media_cost,

        comparison_total_paid_media_cost:
          derived.comparison.total_paid_media_cost,

        total_paid_media_cost_change_pct:
          total_paid_media_cost_pct,

        current_active_online_bookings:
          current.profitroom.active_online_bookings,

        comparison_active_online_bookings:
          comparison.profitroom.active_online_bookings,

        active_online_bookings_change_pct:
          active_online_bookings_pct,

        current_active_online_revenue:
          current.profitroom.active_online_revenue,

        comparison_active_online_revenue:
          comparison.profitroom.active_online_revenue,

        active_online_revenue_change_pct:
          active_online_revenue_pct,

        current_blended_cost_per_booking:
          derived.current
            .blended_paid_media_cost_per_active_online_booking,

        comparison_blended_cost_per_booking:
          derived.comparison
            .blended_paid_media_cost_per_active_online_booking,

        blended_cost_per_booking_change_pct:
          blended_paid_media_cost_per_active_online_booking_pct,
      },

      evidence: [
        `Liczba aktywnych rezerwacji online wzrosła o ${active_online_bookings_pct.toFixed(
          1
        )}%.`,
        `Przychód z aktywnych rezerwacji online wzrósł o ${active_online_revenue_pct.toFixed(
          1
        )}%.`,
        costPerBookingImproved
          ? "Średni koszt płatnych działań przypadający na aktywną rezerwację spadł."
          : "Średni koszt płatnych działań przypadający na aktywną rezerwację pozostał stabilny względem wzrostu sprzedaży.",
      ],

      confidence: costPerBookingImproved
        ? "HIGH"
        : "MEDIUM",

      severity: "POSITIVE",
      business_impact: "HIGH",
      urgency: "LOW",

      evidence_strength: costPerBookingImproved
        ? "HIGH"
        : "MEDIUM",

      actionability: "MEDIUM",

      data_completeness: "COMPLETE",

      recommendation_code:
        "CHECK_SCALING_ELIGIBILITY",

      action_type:
        "STRATEGY / BUDGET / CHANNEL_MIX",

      related_diagnostics: [
        "TOTAL_DEMAND_UP",
        "OTA_TO_DIRECT",
        "DEMAND_GENERATOR",
        "ASSISTER",
        "CLOSER",
      ],

      client_text:
        "Sprzedaż i przychód rosną szybciej niż koszt płatnych działań lub koszt pozyskania rezerwacji pozostaje stabilny. Warto sprawdzić, które kanały odpowiadają za wynik i czy warunki pozwalają bezpiecznie zwiększać skalę.",
    });
  }

  return diagnostics;
}
