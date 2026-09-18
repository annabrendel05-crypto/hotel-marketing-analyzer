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

export function runFunnelDiagnostics(
  input: DiagnosticInput
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const { current, comparison } = input;

  const derived = deriveComparisonMetrics(
    current,
    comparison
  );

  /*
   * FUNNEL.STEP1_TO_STEP2_WEAK
   */

  const step1ToStep2Change =
    derived.changes.step1_to_step2_rate_pct;

  if (
    current.ga4.step1 >= 20 &&
    comparison.ga4.step1 >= 20 &&
    step1ToStep2Change !== null &&
    step1ToStep2Change <= -20
  ) {
    const nearMinimumVolume =
      current.ga4.step1 < 40 ||
      comparison.ga4.step1 < 40;

    diagnostics.push({
      family: "FUNNEL",
      code: "STEP1_TO_STEP2_WEAK",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        current_step1: current.ga4.step1,
        comparison_step1: comparison.ga4.step1,

        current_step2: current.ga4.step2,
        comparison_step2: comparison.ga4.step2,

        current_step1_to_step2_rate:
          derived.current.step1_to_step2_rate,

        comparison_step1_to_step2_rate:
          derived.comparison.step1_to_step2_rate,

        step1_to_step2_change_pct:
          step1ToStep2Change,

        step1_to_step2_change_pp:
          derived.changes.step1_to_step2_rate_pp,
      },

      evidence: [
        `Przejście Step1 → Step2 spadło relatywnie o ${Math.abs(
          step1ToStep2Change
        ).toFixed(1)}%.`,
      ],

      confidence: nearMinimumVolume
        ? "LOW"
        : "MEDIUM",

      severity: "MEDIUM",
      business_impact: "HIGH",
      urgency: "MEDIUM",

      evidence_strength: nearMinimumVolume
        ? "LOW"
        : "MEDIUM",

      actionability: "HIGH",

      data_completeness: "COMPLETE",

      recommendation_code:
        "CHECK_STEP1_TO_STEP2",

      action_type:
        "OFFER / AVAILABILITY / BOOKING_ENGINE / UX",

      related_diagnostics: [],

      client_text:
        "Mniej użytkowników przechodzi od wyboru terminu lub pokoju do kolejnego etapu rezerwacji. Warto sprawdzić dostępność, ceny, minimalną długość pobytu, prezentację oferty oraz wygodę korzystania z silnika rezerwacyjnego.",
    });
  }

  /*
   * FUNNEL.STEP2_TO_STEP3_WEAK
   */

  const step2ToStep3Change =
    derived.changes.step2_to_step3_rate_pct;

  if (
    current.ga4.step2 >= 20 &&
    comparison.ga4.step2 >= 20 &&
    step2ToStep3Change !== null &&
    step2ToStep3Change <= -20
  ) {
    const nearMinimumVolume =
      current.ga4.step2 < 40 ||
      comparison.ga4.step2 < 40;

    diagnostics.push({
      family: "FUNNEL",
      code: "STEP2_TO_STEP3_WEAK",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        current_step2: current.ga4.step2,
        comparison_step2: comparison.ga4.step2,

        current_step3: current.ga4.step3,
        comparison_step3: comparison.ga4.step3,

        current_step2_to_step3_rate:
          derived.current.step2_to_step3_rate,

        comparison_step2_to_step3_rate:
          derived.comparison.step2_to_step3_rate,

        step2_to_step3_change_pct:
          step2ToStep3Change,

        step2_to_step3_change_pp:
          derived.changes.step2_to_step3_rate_pp,
      },

      evidence: [
        `Przejście Step2 → Step3 spadło relatywnie o ${Math.abs(
          step2ToStep3Change
        ).toFixed(1)}%.`,
      ],

      confidence: nearMinimumVolume
        ? "LOW"
        : "MEDIUM",

      severity: "HIGH",
      business_impact: "HIGH",
      urgency: "MEDIUM",

      evidence_strength: nearMinimumVolume
        ? "LOW"
        : "MEDIUM",

      actionability: "HIGH",

      data_completeness: "COMPLETE",

      recommendation_code:
        "CHECK_STEP2_TO_STEP3",

      action_type:
        "OFFER / CHECKOUT / BOOKING_ENGINE / UX",

      related_diagnostics: [],

      client_text:
        "Mniej użytkowników przechodzi z wyboru oferty do końcowej części rezerwacji. Warto sprawdzić końcową cenę, dodatki, warunki pobytu, dostępne opcje oraz sam proces przechodzenia do finalizacji.",
    });
  }

  /*
   * FUNNEL.STEP3_TO_PURCHASE_WEAK
   */

  const step3ToPurchaseChange =
    derived.changes.step3_to_purchase_rate_pct;

  const earlierStep1Stable =
    derived.changes.step1_to_step2_rate_pct === null ||
    derived.changes.step1_to_step2_rate_pct > -20;

  const earlierStep2Stable =
    derived.changes.step2_to_step3_rate_pct === null ||
    derived.changes.step2_to_step3_rate_pct > -20;

  const currentProfitroomComplete =
    isProfitroomComplete(
      current.end_date,
      current.profitroom.profitroom_data_through
    );

  const comparisonProfitroomComplete =
    isProfitroomComplete(
      comparison.end_date,
      comparison.profitroom.profitroom_data_through
    );

  if (
    current.ga4.step2 >= 20 &&
    comparison.ga4.step2 >= 20 &&
    current.ga4.step3 >= 5 &&
    comparison.ga4.step3 >= 5 &&
    currentProfitroomComplete &&
    comparisonProfitroomComplete &&
    earlierStep1Stable &&
    earlierStep2Stable &&
    step3ToPurchaseChange !== null &&
    step3ToPurchaseChange <= -20
  ) {
    const directCreatedChange =
      comparison.profitroom.direct_created_bookings > 0
        ? (
            (
              current.profitroom.direct_created_bookings -
              comparison.profitroom.direct_created_bookings
            ) /
            comparison.profitroom.direct_created_bookings
          ) * 100
        : null;

    const profitroomStableOrGrowing =
      directCreatedChange !== null &&
      directCreatedChange >= -10;

    diagnostics.push({
      family: "FUNNEL",
      code: "STEP3_TO_PURCHASE_WEAK",

      scope: "HOTEL",
      status: "ACTIVE",

      metric_context: {
        current_step3: current.ga4.step3,
        comparison_step3: comparison.ga4.step3,

        current_ga4_unique_purchases:
          current.ga4.ga4_unique_purchases,

        comparison_ga4_unique_purchases:
          comparison.ga4.ga4_unique_purchases,

        current_step3_to_purchase_rate:
          derived.current.step3_to_purchase_rate,

        comparison_step3_to_purchase_rate:
          derived.comparison.step3_to_purchase_rate,

        step3_to_purchase_change_pct:
          step3ToPurchaseChange,

        step3_to_purchase_change_pp:
          derived.changes.step3_to_purchase_rate_pp,

        current_direct_created_bookings:
          current.profitroom.direct_created_bookings,

        comparison_direct_created_bookings:
          comparison.profitroom.direct_created_bookings,

        direct_created_bookings_change_pct:
          directCreatedChange,
      },

      evidence: [
        `Przejście Step3 → purchase spadło relatywnie o ${Math.abs(
          step3ToPurchaseChange
        ).toFixed(1)}%.`,

        profitroomStableOrGrowing
          ? "Profitroom pokazuje stabilną lub rosnącą liczbę utworzonych rezerwacji Direct, dlatego pomiar GA4 wymaga szczególnej kontroli."
          : "Słabszy wynik końca lejka jest widoczny również przy ocenie finalizacji rezerwacji.",
      ],

      confidence: profitroomStableOrGrowing
        ? "MEDIUM"
        : "HIGH",

      severity: "HIGH",
      business_impact: "HIGH",
      urgency: "HIGH",

      evidence_strength: profitroomStableOrGrowing
        ? "MEDIUM"
        : "HIGH",

      actionability: "HIGH",

      data_completeness: "COMPLETE",

      recommendation_code:
        "CHECK_END_OF_FUNNEL",

      action_type:
        "TRACKING / CHECKOUT / OFFER",

      related_diagnostics: [
        "TRACKING_MISMATCH",
      ],

      client_text: profitroomStableOrGrowing
        ? "GA4 pokazuje słabszą finalizację po wejściu w ostatni etap rezerwacji, ale Profitroom potwierdza stabilną sprzedaż Direct. Najpierw warto sprawdzić pomiar purchase i końca ścieżki."
        : "Użytkownicy docierają do końcowej części procesu rezerwacji, ale rzadziej finalizują zakup. Warto sprawdzić checkout, warunki oferty oraz techniczną poprawność końca ścieżki.",
    });
  }

  return diagnostics;
}
