import type { DiagnosticPeriod } from "./input";
import {
  average,
  pctChange,
  percentagePointChange,
  safeRate,
} from "./helpers";

export type DerivedPeriodMetrics = {
  engaged_view_rate: number | null;
  engaged_session_rate: number | null;
  view_offer_or_room_rate: number | null;

  step1_rate: number | null;
  step2_rate: number | null;
  step3_rate: number | null;

  step1_to_step2_rate: number | null;
  step2_to_step3_rate: number | null;
  step3_to_purchase_rate: number | null;

  ota_total_active_bookings: number;
  ota_total_active_revenue: number;

  direct_booking_share: number | null;
  direct_revenue_share: number | null;

  average_booking_value: number | null;

  total_paid_media_cost: number;

  blended_paid_media_cost_per_active_online_booking: number | null;
};

export type DerivedComparisonMetrics = {
  current: DerivedPeriodMetrics;
  comparison: DerivedPeriodMetrics;

  changes: {
    sessions_pct: number | null;

    engaged_view_rate_pct: number | null;
    engaged_view_rate_pp: number | null;

    engaged_session_rate_pct: number | null;
    engaged_session_rate_pp: number | null;

    view_offer_or_room_rate_pct: number | null;
    view_offer_or_room_rate_pp: number | null;

    step1_rate_pct: number | null;
    step1_rate_pp: number | null;

    step1_to_step2_rate_pct: number | null;
    step1_to_step2_rate_pp: number | null;

    step2_to_step3_rate_pct: number | null;
    step2_to_step3_rate_pp: number | null;

    step3_to_purchase_rate_pct: number | null;
    step3_to_purchase_rate_pp: number | null;

    active_online_bookings_pct: number | null;
    active_online_revenue_pct: number | null;

    direct_active_bookings_pct: number | null;
    direct_active_revenue_pct: number | null;

    ota_total_active_bookings_pct: number | null;
    ota_total_active_revenue_pct: number | null;

    direct_booking_share_pct: number | null;
    direct_booking_share_pp: number | null;

    direct_revenue_share_pct: number | null;
    direct_revenue_share_pp: number | null;

    average_booking_value_pct: number | null;

    total_paid_media_cost_pct: number | null;

    blended_paid_media_cost_per_active_online_booking_pct: number | null;
  };
};

export function derivePeriodMetrics(
  period: DiagnosticPeriod
): DerivedPeriodMetrics {
  const otaTotalActiveBookings =
    period.profitroom.booking_com_active_bookings +
    period.profitroom.expedia_active_bookings +
    period.profitroom.hrs_active_bookings +
    period.profitroom.other_ota_active_bookings;

  const otaTotalActiveRevenue =
    period.profitroom.booking_com_active_revenue +
    period.profitroom.expedia_active_revenue +
    period.profitroom.hrs_active_revenue +
    period.profitroom.other_ota_active_revenue;

  const totalPaidMediaCost =
    period.meta.spend + period.google_ads.cost;

  return {
    engaged_view_rate:
      period.ga4.engaged_views === undefined
        ? null
        : safeRate(
            period.ga4.engaged_views,
            period.ga4.sessions
          ),

    engaged_session_rate: safeRate(
      period.ga4.engaged_sessions,
      period.ga4.sessions
    ),

    view_offer_or_room_rate: safeRate(
      period.ga4.view_offer_or_room,
      period.ga4.sessions
    ),

    step1_rate: safeRate(
      period.ga4.step1,
      period.ga4.sessions
    ),

    step2_rate: safeRate(
      period.ga4.step2,
      period.ga4.sessions
    ),

    step3_rate: safeRate(
      period.ga4.step3,
      period.ga4.sessions
    ),

    step1_to_step2_rate: safeRate(
      period.ga4.step2,
      period.ga4.step1
    ),

    step2_to_step3_rate: safeRate(
      period.ga4.step3,
      period.ga4.step2
    ),

    step3_to_purchase_rate: safeRate(
      period.ga4.ga4_unique_purchases,
      period.ga4.step3
    ),

    ota_total_active_bookings: otaTotalActiveBookings,
    ota_total_active_revenue: otaTotalActiveRevenue,

    direct_booking_share: safeRate(
      period.profitroom.direct_active_bookings,
      period.profitroom.active_online_bookings
    ),

    direct_revenue_share: safeRate(
      period.profitroom.direct_active_revenue,
      period.profitroom.active_online_revenue
    ),

    average_booking_value: average(
      period.profitroom.active_online_revenue,
      period.profitroom.active_online_bookings
    ),

    total_paid_media_cost: totalPaidMediaCost,

    blended_paid_media_cost_per_active_online_booking: safeRate(
      totalPaidMediaCost,
      period.profitroom.active_online_bookings
    ),
  };
}

function relativeChange(
  current: number | null,
  comparison: number | null
): number | null {
  if (current === null || comparison === null) {
    return null;
  }

  return pctChange(current, comparison);
}

export function deriveComparisonMetrics(
  currentPeriod: DiagnosticPeriod,
  comparisonPeriod: DiagnosticPeriod
): DerivedComparisonMetrics {
  const current = derivePeriodMetrics(currentPeriod);
  const comparison = derivePeriodMetrics(comparisonPeriod);

  return {
    current,
    comparison,

    changes: {
      sessions_pct: pctChange(
        currentPeriod.ga4.sessions,
        comparisonPeriod.ga4.sessions
      ),

      engaged_view_rate_pct: relativeChange(
        current.engaged_view_rate,
        comparison.engaged_view_rate
      ),
      engaged_view_rate_pp: percentagePointChange(
        current.engaged_view_rate,
        comparison.engaged_view_rate
      ),

      engaged_session_rate_pct: relativeChange(
        current.engaged_session_rate,
        comparison.engaged_session_rate
      ),
      engaged_session_rate_pp: percentagePointChange(
        current.engaged_session_rate,
        comparison.engaged_session_rate
      ),

      view_offer_or_room_rate_pct: relativeChange(
        current.view_offer_or_room_rate,
        comparison.view_offer_or_room_rate
      ),
      view_offer_or_room_rate_pp: percentagePointChange(
        current.view_offer_or_room_rate,
        comparison.view_offer_or_room_rate
      ),

      step1_rate_pct: relativeChange(
        current.step1_rate,
        comparison.step1_rate
      ),
      step1_rate_pp: percentagePointChange(
        current.step1_rate,
        comparison.step1_rate
      ),

      step1_to_step2_rate_pct: relativeChange(
        current.step1_to_step2_rate,
        comparison.step1_to_step2_rate
      ),
      step1_to_step2_rate_pp: percentagePointChange(
        current.step1_to_step2_rate,
        comparison.step1_to_step2_rate
      ),

      step2_to_step3_rate_pct: relativeChange(
        current.step2_to_step3_rate,
        comparison.step2_to_step3_rate
      ),
      step2_to_step3_rate_pp: percentagePointChange(
        current.step2_to_step3_rate,
        comparison.step2_to_step3_rate
      ),

      step3_to_purchase_rate_pct: relativeChange(
        current.step3_to_purchase_rate,
        comparison.step3_to_purchase_rate
      ),
      step3_to_purchase_rate_pp: percentagePointChange(
        current.step3_to_purchase_rate,
        comparison.step3_to_purchase_rate
      ),

      active_online_bookings_pct: pctChange(
        currentPeriod.profitroom.active_online_bookings,
        comparisonPeriod.profitroom.active_online_bookings
      ),

      active_online_revenue_pct: pctChange(
        currentPeriod.profitroom.active_online_revenue,
        comparisonPeriod.profitroom.active_online_revenue
      ),

      direct_active_bookings_pct: pctChange(
        currentPeriod.profitroom.direct_active_bookings,
        comparisonPeriod.profitroom.direct_active_bookings
      ),

      direct_active_revenue_pct: pctChange(
        currentPeriod.profitroom.direct_active_revenue,
        comparisonPeriod.profitroom.direct_active_revenue
      ),

      ota_total_active_bookings_pct: pctChange(
        current.ota_total_active_bookings,
        comparison.ota_total_active_bookings
      ),

      ota_total_active_revenue_pct: pctChange(
        current.ota_total_active_revenue,
        comparison.ota_total_active_revenue
      ),

      direct_booking_share_pct: relativeChange(
        current.direct_booking_share,
        comparison.direct_booking_share
      ),
      direct_booking_share_pp: percentagePointChange(
        current.direct_booking_share,
        comparison.direct_booking_share
      ),

      direct_revenue_share_pct: relativeChange(
        current.direct_revenue_share,
        comparison.direct_revenue_share
      ),
      direct_revenue_share_pp: percentagePointChange(
        current.direct_revenue_share,
        comparison.direct_revenue_share
      ),

      average_booking_value_pct: relativeChange(
        current.average_booking_value,
        comparison.average_booking_value
      ),

      total_paid_media_cost_pct: pctChange(
        current.total_paid_media_cost,
        comparison.total_paid_media_cost
      ),

      blended_paid_media_cost_per_active_online_booking_pct:
        relativeChange(
          current.blended_paid_media_cost_per_active_online_booking,
          comparison.blended_paid_media_cost_per_active_online_booking
        ),
    },
  };
}
