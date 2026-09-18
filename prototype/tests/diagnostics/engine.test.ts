import assert from "node:assert/strict";
import test from "node:test";

import { runDiagnostics } from "../../lib/diagnostics/index.ts";
import type { PriorityEngineResult } from "../../lib/diagnostics/priority-engine.ts";
import type { DiagnosticCode, DiagnosticFamily, DiagnosticStatus } from "../../lib/diagnostics/types.ts";
import { createBaseDiagnosticInput } from "./fixtures.ts";

function findDiagnostic(result: PriorityEngineResult, code: DiagnosticCode) {
  return result.diagnostics.find((item) => item.code === code);
}

function expectDiagnostic(
  result: PriorityEngineResult,
  code: DiagnosticCode,
  family: DiagnosticFamily,
  status: DiagnosticStatus = "ACTIVE",
) {
  const diagnostic = findDiagnostic(result, code);
  assert.ok(diagnostic, `Expected ${code}`);
  assert.equal(diagnostic.family, family);
  assert.equal(diagnostic.status, status);
  assert.ok(diagnostic.evidence.length > 0);
  assert.ok(diagnostic.priority_score > 0);
  return diagnostic;
}

test("A. Sprzedaż w dół: aktywny spadek jest top business issue", () => {
  const input = createBaseDiagnosticInput();
  Object.assign(input.current.profitroom, {
    direct_active_bookings: 14,
    direct_active_revenue: 28000,
    booking_com_active_bookings: 14,
    booking_com_active_revenue: 28000,
    expedia_active_bookings: 3,
    expedia_active_revenue: 6000,
    hrs_active_bookings: 2,
    hrs_active_revenue: 4000,
    other_ota_active_bookings: 2,
    other_ota_active_revenue: 4000,
    active_online_bookings: 35,
    active_online_revenue: 70000,
  });

  const result = runDiagnostics(input);
  const diagnostic = expectDiagnostic(result, "TOTAL_DEMAND_DOWN", "SALES_STRUCTURE");
  assert.equal(diagnostic.confidence, "HIGH");
  assert.equal(diagnostic.severity, "HIGH");
  assert.equal(diagnostic.data_completeness, "COMPLETE");
  assert.equal(result.top_business_issue?.code, "TOTAL_DEMAND_DOWN");
  assert.equal(result.recommendations[0]?.code, "TOTAL_DEMAND_DOWN");
  assert.equal(result.watch.length, 0);
  assert.equal(result.limitations.length, 0);
});

test("B. Sprzedaż w górę: aktywny wzrost bez diagnozy spadku", () => {
  const input = createBaseDiagnosticInput();
  Object.assign(input.current.profitroom, {
    direct_active_bookings: 24,
    direct_active_revenue: 48000,
    booking_com_active_bookings: 24,
    booking_com_active_revenue: 48000,
    expedia_active_bookings: 6,
    expedia_active_revenue: 12000,
    hrs_active_bookings: 4,
    hrs_active_revenue: 8000,
    other_ota_active_bookings: 2,
    other_ota_active_revenue: 4000,
    active_online_bookings: 60,
    active_online_revenue: 120000,
  });

  const result = runDiagnostics(input);
  const diagnostic = expectDiagnostic(result, "TOTAL_DEMAND_UP", "SALES_STRUCTURE");
  assert.equal(diagnostic.confidence, "HIGH");
  assert.equal(diagnostic.severity, "POSITIVE");
  assert.equal(result.top_business_issue?.family, "SALES_STRUCTURE");
  assert.equal(findDiagnostic(result, "TOTAL_DEMAND_DOWN"), undefined);
  assert.equal(result.limitations.length, 0);
});

test("C. Direct → OTA: udział Direct spada mimo stabilnego popytu", () => {
  const input = createBaseDiagnosticInput();
  Object.assign(input.current.profitroom, {
    direct_active_bookings: 15,
    direct_active_revenue: 30000,
    booking_com_active_bookings: 28,
    booking_com_active_revenue: 56000,
    expedia_active_bookings: 6,
    expedia_active_revenue: 12000,
    hrs_active_bookings: 4,
    hrs_active_revenue: 8000,
    other_ota_active_bookings: 2,
    other_ota_active_revenue: 4000,
    active_online_bookings: 55,
    active_online_revenue: 110000,
  });

  const result = runDiagnostics(input);
  const diagnostic = expectDiagnostic(result, "DIRECT_TO_OTA", "SALES_STRUCTURE");
  assert.equal(diagnostic.confidence, "HIGH");
  assert.equal(diagnostic.severity, "MEDIUM");
  assert.ok(Number(diagnostic.metric_context.direct_booking_share_change_pp) < 0);
  assert.equal(result.top_business_issue?.code, "DIRECT_TO_OTA");
  assert.equal(result.recommendations[0]?.code, "DIRECT_TO_OTA");
});

test("D. OTA → Direct: udział Direct rośnie", () => {
  const input = createBaseDiagnosticInput();
  Object.assign(input.current.profitroom, {
    direct_active_bookings: 30,
    direct_active_revenue: 60000,
    booking_com_active_bookings: 16,
    booking_com_active_revenue: 32000,
    expedia_active_bookings: 4,
    expedia_active_revenue: 8000,
    hrs_active_bookings: 2,
    hrs_active_revenue: 4000,
    other_ota_active_bookings: 2,
    other_ota_active_revenue: 4000,
    active_online_bookings: 54,
    active_online_revenue: 108000,
  });

  const result = runDiagnostics(input);
  const diagnostic = expectDiagnostic(result, "OTA_TO_DIRECT", "SALES_STRUCTURE");
  assert.equal(diagnostic.confidence, "HIGH");
  assert.equal(diagnostic.severity, "POSITIVE");
  assert.ok(Number(diagnostic.metric_context.direct_booking_share_change_pp) > 0);
  assert.equal(result.top_business_issue?.code, "OTA_TO_DIRECT");
});

test("E. Tracking mismatch ogranicza słaby koniec lejka przez WATCH", () => {
  const input = createBaseDiagnosticInput();
  input.current.ga4.ga4_unique_purchases = 8;

  const result = runDiagnostics(input);
  const tracking = expectDiagnostic(result, "TRACKING_MISMATCH", "DATA_QUALITY");
  const end = expectDiagnostic(result, "STEP3_TO_PURCHASE_WEAK", "FUNNEL", "WATCH");
  assert.equal(tracking.confidence, "HIGH");
  assert.equal(tracking.severity, "HIGH");
  assert.equal(end.confidence, "LOW");
  assert.equal(end.blocking_diagnostic, "TRACKING_MISMATCH");
  assert.ok(result.watch.some((item) => item.code === end.code));
  assert.ok(result.limitations.some((item) => item.code === tracking.code));
  assert.notEqual(result.top_operational_diagnosis?.code, end.code);
  assert.ok(result.recommendations.some((item) => item.code === tracking.code));
});

test("F. Niepełny Profitroom nie jest zerową sprzedażą ani aktywną diagnozą spadku", () => {
  const input = createBaseDiagnosticInput();
  input.current.profitroom.profitroom_data_through = "2026-07-29";
  input.current.profitroom.active_online_bookings = 0;
  input.current.profitroom.active_online_revenue = 0;

  const result = runDiagnostics(input);
  const incomplete = expectDiagnostic(result, "INCOMPLETE_PROFITROOM", "DATA_QUALITY");
  assert.equal(incomplete.data_completeness, "PARTIAL");
  assert.equal(incomplete.confidence, "HIGH");
  assert.ok(result.limitations.some((item) => item.code === incomplete.code));
  assert.equal(findDiagnostic(result, "TOTAL_DEMAND_DOWN"), undefined);
  assert.equal(findDiagnostic(result, "COST_UP_SALES_FLAT"), undefined);
  assert.equal(findDiagnostic(result, "SALES_UP_EFFICIENCY_GOOD"), undefined);
  assert.equal(result.top_business_issue?.code, undefined);
});

test("F2. Niepełny okres porównawczy blokuje interpretację wzrostu", () => {
  const input = createBaseDiagnosticInput();
  input.comparison.profitroom.profitroom_data_through = "2026-07-15";
  input.current.profitroom.active_online_bookings = 65;
  input.current.profitroom.active_online_revenue = 130000;

  const result = runDiagnostics(input);
  const incomplete = expectDiagnostic(result, "INCOMPLETE_PROFITROOM", "DATA_QUALITY");
  assert.equal(incomplete.metric_context.comparison_period_end, "2026-07-17");
  assert.equal(findDiagnostic(result, "TOTAL_DEMAND_UP"), undefined);
  assert.equal(findDiagnostic(result, "SALES_UP_EFFICIENCY_GOOD"), undefined);
  assert.ok(result.limitations.some((item) => item.code === incomplete.code));
});

test("G. Mały wolumen daje ograniczenie, bez agresywnych rekomendacji", () => {
  const input = createBaseDiagnosticInput();
  for (const period of [input.current, input.comparison]) {
    Object.assign(period.ga4, {
      sessions: 40,
      engaged_sessions: 20,
      view_offer_or_room: 10,
      step1: 4,
      step2: 2,
      step3: 1,
      ga4_unique_purchases: 0,
    });
    Object.assign(period.profitroom, {
      direct_created_bookings: 1,
      direct_active_bookings: 1,
      direct_active_revenue: 2000,
      booking_com_active_bookings: 1,
      booking_com_active_revenue: 2000,
      expedia_active_bookings: 0,
      expedia_active_revenue: 0,
      hrs_active_bookings: 0,
      hrs_active_revenue: 0,
      other_ota_active_bookings: 0,
      other_ota_active_revenue: 0,
      active_online_bookings: 2,
      active_online_revenue: 4000,
    });
  }

  const result = runDiagnostics(input);
  const insufficient = expectDiagnostic(result, "INSUFFICIENT_DATA", "DATA_QUALITY");
  assert.equal(insufficient.data_completeness, "INSUFFICIENT");
  assert.equal(insufficient.severity, "LOW");
  assert.equal(result.top_business_issue, null);
  assert.equal(result.top_operational_diagnosis?.code, "INSUFFICIENT_DATA");
  assert.ok(result.limitations.some((item) => item.code === insufficient.code));
  assert.ok(result.recommendations.every((item) => item.code === "INSUFFICIENT_DATA"));
  assert.equal(findDiagnostic(result, "STEP3_TO_PURCHASE_WEAK"), undefined);
});

test("H. Step1 → Step2: spadek przejścia aktywuje diagnozę", () => {
  const input = createBaseDiagnosticInput();
  input.current.ga4.step2 = 90;
  input.current.ga4.step3 = 45;
  input.current.ga4.ga4_unique_purchases = 15;

  const result = runDiagnostics(input);
  const diagnostic = expectDiagnostic(result, "STEP1_TO_STEP2_WEAK", "FUNNEL");
  assert.equal(diagnostic.confidence, "MEDIUM");
  assert.equal(diagnostic.severity, "MEDIUM");
  assert.equal(diagnostic.data_completeness, "COMPLETE");
  assert.ok(
    Math.abs(Number(diagnostic.metric_context.step1_to_step2_change_pct) + 25)
      < Number.EPSILON * 100,
  );
  assert.equal(result.top_operational_diagnosis?.code, diagnostic.code);
  assert.equal(findDiagnostic(result, "STEP2_TO_STEP3_WEAK"), undefined);
});

test("H2. Spadek Step1 → Step2 poniżej progu nie aktywuje diagnozy", () => {
  const input = createBaseDiagnosticInput();
  input.current.ga4.step2 = 110;
  const result = runDiagnostics(input);
  assert.equal(findDiagnostic(result, "STEP1_TO_STEP2_WEAK"), undefined);
});

test("I. Step2 → Step3: spadek przejścia aktywuje diagnozę", () => {
  const input = createBaseDiagnosticInput();
  input.current.ga4.step3 = 40;
  input.current.ga4.ga4_unique_purchases = 13;

  const result = runDiagnostics(input);
  const diagnostic = expectDiagnostic(result, "STEP2_TO_STEP3_WEAK", "FUNNEL");
  assert.equal(diagnostic.confidence, "MEDIUM");
  assert.equal(diagnostic.severity, "HIGH");
  assert.equal(diagnostic.data_completeness, "COMPLETE");
  assert.ok(Number(diagnostic.metric_context.step2_to_step3_change_pct) < -20);
  assert.equal(result.top_operational_diagnosis?.code, diagnostic.code);
  assert.equal(findDiagnostic(result, "STEP3_TO_PURCHASE_WEAK"), undefined);
});

test("J. Step3 → Purchase: aktywny, nieblokowany problem jest top operational", () => {
  const input = createBaseDiagnosticInput();
  input.current.ga4.ga4_unique_purchases = 12;
  input.current.profitroom.direct_created_bookings = 15;

  const result = runDiagnostics(input);
  const diagnostic = expectDiagnostic(result, "STEP3_TO_PURCHASE_WEAK", "FUNNEL");
  assert.equal(diagnostic.confidence, "HIGH");
  assert.equal(diagnostic.severity, "HIGH");
  assert.equal(diagnostic.blocking_diagnostic, undefined);
  assert.equal(result.top_operational_diagnosis?.code, diagnostic.code);
  assert.equal(result.recommendations[0]?.code, diagnostic.code);
  assert.equal(findDiagnostic(result, "TRACKING_MISMATCH"), undefined);
});

test("J2. Brak purchase przy zbyt małym wolumenie nie daje agresywnej diagnozy", () => {
  const input = createBaseDiagnosticInput();
  Object.assign(input.current.ga4, {
    step2: 10,
    step3: 4,
    ga4_unique_purchases: 0,
  });
  Object.assign(input.comparison.ga4, {
    step2: 10,
    step3: 4,
    ga4_unique_purchases: 2,
  });
  input.current.profitroom.direct_created_bookings = 2;

  const result = runDiagnostics(input);
  assert.equal(findDiagnostic(result, "STEP3_TO_PURCHASE_WEAK"), undefined);
  assert.equal(findDiagnostic(result, "TRACKING_MISMATCH"), undefined);
  assert.ok(result.recommendations.every((item) => item.code !== "STEP3_TO_PURCHASE_WEAK"));
});

test("K. Koszt rośnie, sprzedaż pozostaje płaska", () => {
  const input = createBaseDiagnosticInput();
  input.current.meta.spend = 1300;
  input.current.google_ads.cost = 1300;

  const result = runDiagnostics(input);
  const diagnostic = expectDiagnostic(result, "COST_UP_SALES_FLAT", "EFFICIENCY");
  assert.equal(diagnostic.confidence, "MEDIUM");
  assert.equal(diagnostic.severity, "HIGH");
  assert.equal(diagnostic.data_completeness, "COMPLETE");
  assert.equal(diagnostic.metric_context.total_paid_media_cost_change_pct, 30);
  assert.equal(result.top_business_issue?.code, diagnostic.code);
  assert.equal(result.recommendations[0]?.code, diagnostic.code);
});

test("L. Wzrost sprzedaży i stabilny koszt na rezerwację daje potencjał skali", () => {
  const input = createBaseDiagnosticInput();
  input.current.profitroom.active_online_bookings = 60;
  input.current.profitroom.active_online_revenue = 120000;
  input.current.meta.spend = 1100;
  input.current.google_ads.cost = 1100;

  const result = runDiagnostics(input);
  const diagnostic = expectDiagnostic(result, "SALES_UP_EFFICIENCY_GOOD", "EFFICIENCY");
  assert.equal(diagnostic.confidence, "HIGH");
  assert.equal(diagnostic.severity, "POSITIVE");
  assert.equal(diagnostic.recommendation_code, "CHECK_SCALING_ELIGIBILITY");
  assert.ok(result.recommendations.some((item) => item.code === diagnostic.code));
  assert.equal(result.limitations.length, 0);
});

test("L2. Wzrost sprzedaży bez wymaganej efektywności nie daje rekomendacji skali", () => {
  const input = createBaseDiagnosticInput();
  input.current.profitroom.active_online_bookings = 60;
  input.current.profitroom.active_online_revenue = 120000;
  input.current.meta.spend = 1500;
  input.current.google_ads.cost = 1500;

  const result = runDiagnostics(input);
  expectDiagnostic(result, "TOTAL_DEMAND_UP", "SALES_STRUCTURE");
  assert.equal(findDiagnostic(result, "SALES_UP_EFFICIENCY_GOOD"), undefined);
  assert.ok(result.recommendations.every((item) => item.recommendation_code !== "CHECK_SCALING_ELIGIBILITY"));
});
