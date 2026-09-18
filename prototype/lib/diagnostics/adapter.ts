import {
  getGa4DiagnosticInputSummary,
  getGoogleAdsSummary,
  getMetaSummary,
  getProfitroomDiagnosticInputSummary,
} from "../bigquery";

import type {
  DiagnosticInput,
  DiagnosticPeriod,
  GoogleAdsMetrics,
} from "./input";

const DEMO_HOTEL_ID =
  "10000000-0000-4000-8000-000000000001";

function summarizeGoogleAds(
  rows: Array<{
    campaign_name?: string;
    spend?: number;
    impressions?: number;
    clicks?: number;
    purchases?: number;
    purchase_value?: number;
  }>
): GoogleAdsMetrics {
  let cost = 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let conversionValue = 0;

  let brandClicks = 0;
  let genericClicks = 0;

  for (const row of rows) {
    const campaignName =
      row.campaign_name?.toLowerCase() ?? "";

    const rowClicks = Number(
      row.clicks ?? 0
    );

    cost += Number(
      row.spend ?? 0
    );

    impressions += Number(
      row.impressions ?? 0
    );

    clicks += rowClicks;

    conversions += Number(
      row.purchases ?? 0
    );

    conversionValue += Number(
      row.purchase_value ?? 0
    );

    /*
     * Tymczasowa klasyfikacja dla danych DEMO.
     *
     * W wersji produkcyjnej rola kampanii
     * będzie pochodziła z jawnego mapowania,
     * a nie z nazwy kampanii.
     */
    if (campaignName.includes("brand")) {
      brandClicks += rowClicks;
    }

    if (
      campaignName.includes(
        "search generic"
      )
    ) {
      genericClicks += rowClicks;
    }
  }

  return {
    cost: Number(cost.toFixed(2)),
    impressions,
    clicks,

    conversions:
      Number(conversions.toFixed(2)),

    conversion_value:
      Number(conversionValue.toFixed(2)),

    brand_clicks: brandClicks,
    generic_clicks: genericClicks,
  };
}

async function getDiagnosticPeriod(
  startDate: string,
  endDate: string
): Promise<DiagnosticPeriod> {
  const [
    ga4,
    profitroom,
    meta,
    googleRows,
  ] = await Promise.all([
    getGa4DiagnosticInputSummary(
      startDate,
      endDate
    ),

    getProfitroomDiagnosticInputSummary(
      startDate,
      endDate
    ),

    getMetaSummary(
      startDate,
      endDate
    ),

    getGoogleAdsSummary(
      startDate,
      endDate
    ),
  ]);

  const googleAds =
    summarizeGoogleAds(googleRows);

  return {
    start_date: startDate,
    end_date: endDate,

    ga4: {
      sessions:
        ga4.sessions,

      engaged_sessions:
        ga4.engaged_sessions,

      view_offer_or_room:
        ga4.view_offer_or_room,

      step1:
        ga4.step1,

      step2:
        ga4.step2,

      step3:
        ga4.step3,

      ga4_unique_purchases:
        ga4.purchases,

      /*
       * engaged_views dodamy później,
       * gdy metryka pojawi się
       * w danych hotelowych.
       */
    },

    profitroom,

    meta: {
      spend:
        Number(meta.spend ?? 0),

      impressions:
        Number(meta.impressions ?? 0),

      clicks:
        Number(meta.clicks ?? 0),

      platform_conversions:
        Number(meta.purchases ?? 0),

      attributed_conversion_value:
        Number(meta.purchase_value ?? 0),
    },

    google_ads: googleAds,
  };
}

export async function getDiagnosticInput(
  currentStart: string,
  currentEnd: string,
  comparisonStart: string,
  comparisonEnd: string
): Promise<DiagnosticInput> {
  const [
    current,
    comparison,
  ] = await Promise.all([
    getDiagnosticPeriod(
      currentStart,
      currentEnd
    ),

    getDiagnosticPeriod(
      comparisonStart,
      comparisonEnd
    ),
  ]);

  return {
    hotel_id: DEMO_HOTEL_ID,
    current,
    comparison,
  };
}
