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

export function runSalesStructureDiagnostics(
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
    direct_active_bookings_pct,
    direct_active_revenue_pct,
    ota_total_active_bookings_pct,
    ota_total_active_revenue_pct,
    direct_booking_share_pp,
    direct_revenue_share_pp,
  } = derived.changes;

  /*
   * SALES_STRUCTURE.TOTAL_DEMAND_UP
   */
  if (
    current.profitroom.active_online_bookings >= 10 &&
    comparison.profitroom.active_online_bookings >= 10 &&
    active_online_bookings_pct !== null &&
    active_online_revenue_pct !== null &&
    active_online_bookings_pct >= 15 &&
    active_online_revenue_pct >= 15
  ) {
    const broadGrowth =
      direct_active_bookings_pct !== null &&
      ota_total_active_bookings_pct !== null &&
      direct_active_bookings_pct > 0 &&
      ota_total_active_bookings_pct > 0;

    diagnostics.push({
      family: "SALES_STRUCTURE",
      code: "TOTAL_DEMAND_UP",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
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

        current_average_booking_value:
          derived.current.average_booking_value,
        comparison_average_booking_value:
          derived.comparison.average_booking_value,

        average_booking_value_change_pct:
          derived.changes.average_booking_value_pct,
      },

      evidence: [
        `Liczba aktywnych rezerwacji online wzrosła o ${active_online_bookings_pct.toFixed(
          1
        )}%.`,
        `Przychód z aktywnych rezerwacji online wzrósł o ${active_online_revenue_pct.toFixed(
          1
        )}%.`,
      ],

      confidence: broadGrowth ? "HIGH" : "MEDIUM",

      severity: "POSITIVE",
      business_impact: "HIGH",
      urgency: "LOW",

      evidence_strength: broadGrowth
        ? "HIGH"
        : "MEDIUM",

      actionability: "MEDIUM",

      data_completeness: "COMPLETE",

      recommendation_code:
        "CHECK_DEMAND_GROWTH_AND_SCALING_ELIGIBILITY",

      action_type:
        "STRATEGY / BUDGET",

      related_diagnostics: [
        "OTA_TO_DIRECT",
        "DIRECT_TO_OTA",
        "SALES_UP_EFFICIENCY_GOOD",
      ],

      client_text:
        "Całkowita sprzedaż online wzrosła: rośnie zarówno liczba aktywnych rezerwacji, jak i przychód. Warto sprawdzić, które kanały odpowiadają za wzrost oraz czy efektywność pozwala bezpiecznie utrzymać lub zwiększyć skalę działań.",
    });
  }

  /*
   * SALES_STRUCTURE.TOTAL_DEMAND_DOWN
   */
  if (
    current.profitroom.active_online_bookings >= 10 &&
    comparison.profitroom.active_online_bookings >= 10 &&
    active_online_bookings_pct !== null &&
    active_online_revenue_pct !== null &&
    active_online_bookings_pct <= -15 &&
    active_online_revenue_pct <= -15
  ) {
    diagnostics.push({
      family: "SALES_STRUCTURE",
      code: "TOTAL_DEMAND_DOWN",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
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

        current_average_booking_value:
          derived.current.average_booking_value,
        comparison_average_booking_value:
          derived.comparison.average_booking_value,

        average_booking_value_change_pct:
          derived.changes.average_booking_value_pct,
      },

      evidence: [
        `Liczba aktywnych rezerwacji online spadła o ${Math.abs(
          active_online_bookings_pct
        ).toFixed(1)}%.`,
        `Przychód z aktywnych rezerwacji online spadł o ${Math.abs(
          active_online_revenue_pct
        ).toFixed(1)}%.`,
      ],

      confidence: "HIGH",

      severity: "HIGH",
      business_impact: "HIGH",
      urgency: "HIGH",

      evidence_strength: "HIGH",
      actionability: "MEDIUM",

      data_completeness: "COMPLETE",

      recommendation_code:
        "CHECK_TOTAL_DEMAND_DECLINE",

      action_type:
        "SALES / STRATEGY",

      related_diagnostics: [
        "DIRECT_TO_OTA",
        "OTA_TO_DIRECT",
        "COST_UP_SALES_FLAT",
        "STEP1_TO_STEP2_WEAK",
        "STEP2_TO_STEP3_WEAK",
        "STEP3_TO_PURCHASE_WEAK",
      ],

      client_text:
        "Całkowita sprzedaż online spadła: niższa jest zarówno liczba aktywnych rezerwacji, jak i przychód. Warto ustalić, czy spadek zaczyna się na poziomie ruchu, jakości ruchu, lejka rezerwacyjnego, oferty czy struktury kanałów sprzedaży.",
    });
  }

  /*
   * SALES_STRUCTURE.DIRECT_TO_OTA
   */
  if (
    comparison.profitroom.direct_active_bookings >= 3 &&
    derived.comparison.ota_total_active_bookings >= 3 &&
    direct_active_bookings_pct !== null &&
    ota_total_active_bookings_pct !== null &&
    direct_booking_share_pp !== null &&
    active_online_bookings_pct !== null &&
    direct_active_bookings_pct <= -15 &&
    ota_total_active_bookings_pct >= 15 &&
    direct_booking_share_pp < 0 &&
    active_online_bookings_pct > -10
  ) {
    diagnostics.push({
      family: "SALES_STRUCTURE",
      code: "DIRECT_TO_OTA",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        direct_active_bookings_change_pct:
          direct_active_bookings_pct,

        direct_active_revenue_change_pct:
          direct_active_revenue_pct,

        ota_total_active_bookings_change_pct:
          ota_total_active_bookings_pct,

        ota_total_active_revenue_change_pct:
          ota_total_active_revenue_pct,

        current_direct_booking_share:
          derived.current.direct_booking_share,

        comparison_direct_booking_share:
          derived.comparison.direct_booking_share,

        direct_booking_share_change_pp:
          direct_booking_share_pp,

        current_direct_revenue_share:
          derived.current.direct_revenue_share,

        comparison_direct_revenue_share:
          derived.comparison.direct_revenue_share,

        direct_revenue_share_change_pp:
          direct_revenue_share_pp,

        total_bookings_change_pct:
          active_online_bookings_pct,
      },

      evidence: [
        `Rezerwacje Direct spadły o ${Math.abs(
          direct_active_bookings_pct
        ).toFixed(1)}%.`,
        `Rezerwacje OTA wzrosły o ${ota_total_active_bookings_pct.toFixed(
          1
        )}%.`,
        "Udział Direct w liczbie rezerwacji spadł.",
      ],

      confidence:
        direct_revenue_share_pp !== null &&
        direct_revenue_share_pp < 0
          ? "HIGH"
          : "MEDIUM",

      severity: "MEDIUM",
      business_impact: "HIGH",
      urgency: "MEDIUM",

      evidence_strength:
        direct_revenue_share_pp !== null &&
        direct_revenue_share_pp < 0
          ? "HIGH"
          : "MEDIUM",

      actionability: "HIGH",

      data_completeness: "COMPLETE",

      recommendation_code:
        "CHECK_DIRECT_VS_OTA",

      action_type:
        "DISTRIBUTION / OFFER / PRICING / CHANNEL_MIX",

      related_diagnostics: [
        "TOTAL_DEMAND_UP",
        "TOTAL_DEMAND_DOWN",
      ],

      client_text:
        "Większa część sprzedaży przesuwa się z kanału Direct do OTA. Warto sprawdzić ceny, dostępność, warunki rezerwacji, minimalną długość pobytu, przewagę oferty bezpośredniej oraz widoczność kanału Direct.",
    });
  }

  /*
   * SALES_STRUCTURE.OTA_TO_DIRECT
   */
  if (
    comparison.profitroom.direct_active_bookings >= 3 &&
    derived.comparison.ota_total_active_bookings >= 3 &&
    direct_active_bookings_pct !== null &&
    ota_total_active_bookings_pct !== null &&
    direct_booking_share_pp !== null &&
    active_online_bookings_pct !== null &&
    direct_active_bookings_pct >= 15 &&
    ota_total_active_bookings_pct <= -15 &&
    direct_booking_share_pp > 0 &&
    active_online_bookings_pct > -10
  ) {
    diagnostics.push({
      family: "SALES_STRUCTURE",
      code: "OTA_TO_DIRECT",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        direct_active_bookings_change_pct:
          direct_active_bookings_pct,

        direct_active_revenue_change_pct:
          direct_active_revenue_pct,

        ota_total_active_bookings_change_pct:
          ota_total_active_bookings_pct,

        ota_total_active_revenue_change_pct:
          ota_total_active_revenue_pct,

        current_direct_booking_share:
          derived.current.direct_booking_share,

        comparison_direct_booking_share:
          derived.comparison.direct_booking_share,

        direct_booking_share_change_pp:
          direct_booking_share_pp,

        current_direct_revenue_share:
          derived.current.direct_revenue_share,

        comparison_direct_revenue_share:
          derived.comparison.direct_revenue_share,

        direct_revenue_share_change_pp:
          direct_revenue_share_pp,

        total_bookings_change_pct:
          active_online_bookings_pct,
      },

      evidence: [
        `Rezerwacje Direct wzrosły o ${direct_active_bookings_pct.toFixed(
          1
        )}%.`,
        `Rezerwacje OTA spadły o ${Math.abs(
          ota_total_active_bookings_pct
        ).toFixed(1)}%.`,
        "Udział Direct w liczbie rezerwacji wzrósł.",
      ],

      confidence:
        direct_revenue_share_pp !== null &&
        direct_revenue_share_pp > 0
          ? "HIGH"
          : "MEDIUM",

      severity: "POSITIVE",
      business_impact: "HIGH",
      urgency: "LOW",

      evidence_strength:
        direct_revenue_share_pp !== null &&
        direct_revenue_share_pp > 0
          ? "HIGH"
          : "MEDIUM",

      actionability: "MEDIUM",

      data_completeness: "COMPLETE",

      recommendation_code:
        "CHECK_DIRECT_GROWTH_QUALITY",

      action_type:
        "DISTRIBUTION / STRATEGY / CHANNEL_MIX",

      related_diagnostics: [
        "TOTAL_DEMAND_UP",
        "TOTAL_DEMAND_DOWN",
      ],

      client_text:
        "Większa część sprzedaży przesuwa się w stronę kanału Direct. Warto sprawdzić, które działania wspierają ten wzrost oraz czy poprawa udziału Direct idzie w parze ze stabilnym całkowitym popytem i dobrą efektywnością.",
    });
  }

  return diagnostics;
}
