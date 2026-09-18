import type { DiagnosticInput, DiagnosticPeriod } from "../../lib/diagnostics/input.ts";

function createPeriod(start_date: string, end_date: string): DiagnosticPeriod {
  return {
    start_date,
    end_date,
    ga4: {
      sessions: 1000,
      engaged_sessions: 500,
      view_offer_or_room: 300,
      step1: 200,
      step2: 120,
      step3: 60,
      ga4_unique_purchases: 20,
    },
    profitroom: {
      direct_created_bookings: 20,
      direct_active_bookings: 20,
      direct_active_revenue: 40000,
      booking_com_active_bookings: 20,
      booking_com_active_revenue: 40000,
      expedia_active_bookings: 5,
      expedia_active_revenue: 10000,
      hrs_active_bookings: 3,
      hrs_active_revenue: 6000,
      other_ota_active_bookings: 2,
      other_ota_active_revenue: 4000,
      active_online_bookings: 50,
      active_online_revenue: 100000,
      profitroom_data_through: end_date,
    },
    meta: {
      spend: 1000,
      impressions: 10000,
      clicks: 300,
      platform_conversions: 10,
      attributed_conversion_value: 15000,
    },
    google_ads: {
      cost: 1000,
      impressions: 10000,
      clicks: 300,
      conversions: 10,
      conversion_value: 15000,
    },
  };
}

export function createBaseDiagnosticInput(): DiagnosticInput {
  return {
    hotel_id: "test-hotel",
    current: createPeriod("2026-07-18", "2026-07-31"),
    comparison: createPeriod("2026-07-04", "2026-07-17"),
  };
}
