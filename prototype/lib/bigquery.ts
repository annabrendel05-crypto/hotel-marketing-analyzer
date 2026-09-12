import { BigQuery } from "@google-cloud/bigquery";

const bigquery = new BigQuery({
  projectId: "hotel-marketing-analyzer-demo",
});

export async function getGa4Summary() {
  const query = `
    SELECT
      COUNTIF(event_name = 'session_start') AS sessions,
      COUNTIF(event_name = 'page_view') AS page_views,
      COUNTIF(event_name = 'step1_dates_and_rooms') AS step1,
      COUNTIF(event_name = 'step2_extras') AS step2,
      COUNTIF(event_name = 'step3_confirmation') AS step3,
      COUNTIF(event_name = 'purchase') AS purchases
    FROM \`hotel-marketing-analyzer-demo.ga4.events_demo\`
  `;

  const [rows] = await bigquery.query({
    query,
    location: "EU",
  });

  return rows[0];
}

export async function getMetaSummary(startDate: string, endDate: string) {
  const query = `
    WITH insights AS (
      SELECT
        ROUND(SUM(CAST(Spend AS FLOAT64)), 2) AS spend,
        SUM(CAST(Impressions AS INT64)) AS impressions,
        SUM(CAST(Clicks AS INT64)) AS clicks
      FROM \`hotel-marketing-analyzer-demo.meta_ads.AdInsights_demo\`
      WHERE DateStart BETWEEN @startDate AND @endDate
    ),

    actions AS (
      SELECT
        SUM(
          CASE
            WHEN ActionType = 'link_click'
            THEN ActionValue ELSE 0
          END
        ) AS link_clicks,

        SUM(
          CASE
            WHEN ActionType = 'landing_page_view'
            THEN ActionValue ELSE 0
          END
        ) AS landing_page_views,

        SUM(
          CASE
            WHEN ActionType = 'offsite_conversion.fb_pixel_search'
            THEN ActionValue ELSE 0
          END
        ) AS search,

        SUM(
          CASE
            WHEN ActionType = 'offsite_conversion.fb_pixel_add_to_cart'
            THEN ActionValue ELSE 0
          END
        ) AS add_to_cart,

        SUM(
          CASE
            WHEN ActionType = 'offsite_conversion.fb_pixel_initiate_checkout'
            THEN ActionValue ELSE 0
          END
        ) AS initiate_checkout,

        SUM(
          CASE
            WHEN ActionType = 'offsite_conversion.fb_pixel_purchase'
              AND ActionCollection = 'Actions'
            THEN ActionValue ELSE 0
          END
        ) AS purchases,

        SUM(
          CASE
            WHEN ActionType = 'offsite_conversion.fb_pixel_purchase'
              AND ActionCollection = 'ActionValues'
            THEN ActionValue ELSE 0
          END
        ) AS purchase_value

      FROM \`hotel-marketing-analyzer-demo.meta_ads.AdInsightsActions_demo\`
      WHERE DateStart BETWEEN @startDate AND @endDate
    )

    SELECT
      insights.spend,
      insights.impressions,
      insights.clicks,
      actions.link_clicks,
      actions.landing_page_views,
      actions.search,
      actions.add_to_cart,
      actions.initiate_checkout,
      actions.purchases,
      ROUND(actions.purchase_value, 2) AS purchase_value,
      SAFE_DIVIDE(actions.purchase_value, insights.spend) AS roas
    FROM insights
    CROSS JOIN actions
  `;

  const [rows] = await bigquery.query({
    query,
    location: "EU",
    params: {
      startDate,
      endDate,
    },
  });

  return rows[0];
}

export async function getProfitroomSales(startDate: string, endDate: string) {
  const query = `
    SELECT
      CASE
        WHEN \`Kanał rezerwacji\` = 'Booking Engine' THEN 'Direct'
        WHEN \`Kanał rezerwacji\` = 'Booking.com' THEN 'Booking.com'
        WHEN \`Kanał rezerwacji\` IN ('Expedia', 'HRS') THEN 'Other OTA'
        ELSE 'Other OTA'
      END AS channel,
      COUNT(*) AS bookings,
      ROUND(SUM(\`Wartość\`), 2) AS revenue
    FROM \`hotel-marketing-analyzer-demo.profitroom.reservations_demo\`
    WHERE DATE(\`Data rezerwacji\`) BETWEEN @startDate AND @endDate
      AND \`Data anulacji\` IS NULL
    GROUP BY channel
    ORDER BY channel
  `;

  const [rows] = await bigquery.query({
    query,
    location: "EU",
    params: {
      startDate,
      endDate,
    },
  });

  const base = [
    { channel: "Direct", bookings: 0, revenue: 0 },
    { channel: "Booking.com", bookings: 0, revenue: 0 },
    { channel: "Other OTA", bookings: 0, revenue: 0 },
    { channel: "Phone", bookings: 0, revenue: 0 },
    { channel: "Email", bookings: 0, revenue: 0 },
  ];

  return base.map((item) => {
    const found = rows.find((row) => row.channel === item.channel);

    return found
      ? {
          channel: item.channel,
          bookings: Number(found.bookings),
          revenue: Number(found.revenue),
        }
      : item;
  });
}

export async function getGoogleAdsSummary(startDate: string, endDate: string) {
  const query = `
    WITH basic AS (
      SELECT
        campaign_id,
        SUM(metrics_cost_micros) / 1000000 AS spend,
        SUM(metrics_impressions) AS impressions,
        SUM(metrics_clicks) AS clicks
      FROM \`hotel-marketing-analyzer-demo.google_ads.CampaignBasicStats_demo\`
      WHERE segments_date BETWEEN @startDate AND @endDate
      GROUP BY campaign_id
    ),

    conversions AS (
      SELECT
        campaign_id,

        SUM(
          CASE
            WHEN segments_conversion_action_name = 'Demo Baltic — wybór terminu'
            THEN metrics_conversions ELSE 0
          END
        ) AS step1,

        SUM(
          CASE
            WHEN segments_conversion_action_name = 'Demo Baltic — wybór dodatków'
            THEN metrics_conversions ELSE 0
          END
        ) AS step2,

        SUM(
          CASE
            WHEN segments_conversion_action_name = 'Demo Baltic — podsumowanie pobytu'
            THEN metrics_conversions ELSE 0
          END
        ) AS step3,

        SUM(
          CASE
            WHEN segments_conversion_action_name = 'Demo Baltic — zakup online'
            THEN metrics_conversions ELSE 0
          END
        ) AS purchases,

        SUM(
          CASE
            WHEN segments_conversion_action_name = 'Demo Baltic — zakup online'
            THEN metrics_conversions_value ELSE 0
          END
        ) AS purchase_value

      FROM \`hotel-marketing-analyzer-demo.google_ads.CampaignConversionStats_demo\`
      WHERE segments_date BETWEEN @startDate AND @endDate
      GROUP BY campaign_id
    )

    SELECT
      c.campaign_id,
      c.campaign_name,
      c.campaign_advertising_channel_type AS channel_type,

      ROUND(COALESCE(b.spend, 0), 2) AS spend,
      COALESCE(b.impressions, 0) AS impressions,
      COALESCE(b.clicks, 0) AS clicks,

      ROUND(COALESCE(v.step1, 0), 2) AS step1,
      ROUND(COALESCE(v.step2, 0), 2) AS step2,
      ROUND(COALESCE(v.step3, 0), 2) AS step3,
      ROUND(COALESCE(v.purchases, 0), 2) AS purchases,
      ROUND(COALESCE(v.purchase_value, 0), 2) AS purchase_value,

      SAFE_DIVIDE(
        COALESCE(v.purchase_value, 0),
        COALESCE(b.spend, 0)
      ) AS roas

    FROM \`hotel-marketing-analyzer-demo.google_ads.Campaign_demo\` c

    LEFT JOIN basic b
      USING (campaign_id)

    LEFT JOIN conversions v
      USING (campaign_id)

    ORDER BY spend DESC
  `;

  const [rows] = await bigquery.query({
    query,
    location: "EU",
    params: {
      startDate,
      endDate,
    },
  });

  return rows;
}
