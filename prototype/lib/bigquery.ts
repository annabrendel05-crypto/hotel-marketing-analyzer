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

export type MetaDetailMetrics = {
  spend: number;
  impressions: number;
  clicks: number;
  link_clicks: number;
  landing_page_views: number;
  platform_conversions: number;
  conversion_value: number;
  ctr: number | null;
  cpc: number | null;
  platform_roas: number | null;
};

export type MetaDetailAd = {
  ad_id: string;
  ad_name: string;
  adset_name: string;
  creative_id: string | null;
  creative_name: string | null;
  headline: string | null;
  primary_text: string | null;
  metrics: MetaDetailMetrics;
};

export type MetaDetailCampaign = {
  campaign_id: string;
  campaign_name: string;
  metrics: MetaDetailMetrics;
  ads: MetaDetailAd[];
};

export type MetaDetail = {
  campaigns: MetaDetailCampaign[];
};

function metaDetailMetrics(values: {
  spend: number;
  impressions: number;
  clicks: number;
  link_clicks: number;
  landing_page_views: number;
  platform_conversions: number;
  conversion_value: number;
}): MetaDetailMetrics {
  const spend = Math.round(values.spend * 100) / 100;
  const conversionValue = Math.round(values.conversion_value * 100) / 100;

  return {
    ...values,
    spend,
    conversion_value: conversionValue,
    ctr: values.impressions === 0 ? null : (values.clicks / values.impressions) * 100,
    cpc: values.clicks === 0 ? null : spend / values.clicks,
    platform_roas: spend === 0 ? null : conversionValue / spend,
  };
}

export async function getMetaDetail(
  startDate: string,
  endDate: string,
): Promise<MetaDetail> {
  const query = `
    WITH insights AS (
      SELECT
        CampaignId AS campaign_id,
        ANY_VALUE(CampaignName) AS campaign_name,
        AdId AS ad_id,
        ANY_VALUE(AdName) AS ad_name,
        ANY_VALUE(AdSetName) AS adset_name,
        ROUND(SUM(CAST(Spend AS FLOAT64)), 2) AS spend,
        SUM(CAST(Impressions AS INT64)) AS impressions,
        SUM(CAST(Clicks AS INT64)) AS clicks
      FROM \`hotel-marketing-analyzer-demo.meta_ads.AdInsights_demo\`
      WHERE DateStart BETWEEN @startDate AND @endDate
      GROUP BY campaign_id, ad_id
    ),
    actions AS (
      SELECT
        AdId AS ad_id,
        SUM(IF(
          ActionCollection = 'Actions' AND ActionType = 'link_click',
          ActionValue,
          0
        )) AS link_clicks,
        SUM(IF(
          ActionCollection = 'Actions' AND ActionType = 'landing_page_view',
          ActionValue,
          0
        )) AS landing_page_views,
        SUM(IF(
          ActionCollection = 'Actions'
            AND ActionType = 'offsite_conversion.fb_pixel_purchase',
          ActionValue,
          0
        )) AS platform_conversions,
        SUM(IF(
          ActionCollection = 'ActionValues'
            AND ActionType = 'offsite_conversion.fb_pixel_purchase',
          ActionValue,
          0
        )) AS conversion_value
      FROM \`hotel-marketing-analyzer-demo.meta_ads.AdInsightsActions_demo\`
      WHERE DateStart BETWEEN @startDate AND @endDate
      GROUP BY ad_id
    ),
    ads AS (
      SELECT
        ID AS ad_id,
        ANY_VALUE(AdCreativeId) AS creative_id
      FROM \`hotel-marketing-analyzer-demo.meta_ads.Ads_demo\`
      GROUP BY ad_id
    ),
    creatives AS (
      SELECT
        ID AS creative_id,
        ANY_VALUE(Name) AS creative_name,
        ANY_VALUE(Title) AS headline,
        ANY_VALUE(Body) AS primary_text
      FROM \`hotel-marketing-analyzer-demo.meta_ads.AdCreatives_demo\`
      GROUP BY creative_id
    )
    SELECT
      insights.campaign_id,
      insights.campaign_name,
      insights.ad_id,
      insights.ad_name,
      insights.adset_name,
      ads.creative_id,
      creatives.creative_name,
      creatives.headline,
      creatives.primary_text,
      insights.spend,
      insights.impressions,
      insights.clicks,
      COALESCE(actions.link_clicks, 0) AS link_clicks,
      COALESCE(actions.landing_page_views, 0) AS landing_page_views,
      COALESCE(actions.platform_conversions, 0) AS platform_conversions,
      ROUND(COALESCE(actions.conversion_value, 0), 2) AS conversion_value
    FROM insights
    LEFT JOIN actions USING (ad_id)
    LEFT JOIN ads USING (ad_id)
    LEFT JOIN creatives USING (creative_id)
    ORDER BY insights.spend DESC, insights.campaign_name, insights.ad_name
  `;

  const [rows] = await bigquery.query({
    query,
    location: "EU",
    params: { startDate, endDate },
  });

  const campaigns = new Map<string, MetaDetailCampaign>();

  for (const row of rows) {
    const adValues = {
      spend: Number(row.spend ?? 0),
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      link_clicks: Number(row.link_clicks ?? 0),
      landing_page_views: Number(row.landing_page_views ?? 0),
      platform_conversions: Number(row.platform_conversions ?? 0),
      conversion_value: Number(row.conversion_value ?? 0),
    };
    const campaignId = String(row.campaign_id);
    const campaign = campaigns.get(campaignId) ?? {
      campaign_id: campaignId,
      campaign_name: String(row.campaign_name),
      metrics: metaDetailMetrics({
        spend: 0,
        impressions: 0,
        clicks: 0,
        link_clicks: 0,
        landing_page_views: 0,
        platform_conversions: 0,
        conversion_value: 0,
      }),
      ads: [],
    };

    campaign.ads.push({
      ad_id: String(row.ad_id),
      ad_name: String(row.ad_name),
      adset_name: String(row.adset_name),
      creative_id: row.creative_id == null ? null : String(row.creative_id),
      creative_name: row.creative_name == null ? null : String(row.creative_name),
      headline: row.headline == null ? null : String(row.headline),
      primary_text: row.primary_text == null ? null : String(row.primary_text),
      metrics: metaDetailMetrics(adValues),
    });

    const previous = campaign.metrics;
    campaign.metrics = metaDetailMetrics({
      spend: previous.spend + adValues.spend,
      impressions: previous.impressions + adValues.impressions,
      clicks: previous.clicks + adValues.clicks,
      link_clicks: previous.link_clicks + adValues.link_clicks,
      landing_page_views: previous.landing_page_views + adValues.landing_page_views,
      platform_conversions: previous.platform_conversions + adValues.platform_conversions,
      conversion_value: previous.conversion_value + adValues.conversion_value,
    });
    campaigns.set(campaignId, campaign);
  }

  return {
    campaigns: [...campaigns.values()]
      .map((campaign) => ({
        ...campaign,
        ads: campaign.ads.sort((a, b) => b.metrics.spend - a.metrics.spend),
      }))
      .sort((a, b) => b.metrics.spend - a.metrics.spend),
  };
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
    WHERE DATE(\`Data rezerwacji\`, "Europe/Warsaw") BETWEEN @startDate AND @endDate
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

export type GoogleAdsDetailMetrics = {
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversion_value: number;
  ctr: number | null;
  cpc: number | null;
  platform_roas: number | null;
};

export type GoogleAdsDetailCampaign = {
  customer_id: string;
  campaign_id: string;
  campaign_name: string;
  campaign_type: string | null;
  status: string | null;
  segment: "Brand" | "Generic" | "GHA" | null;
  metrics: GoogleAdsDetailMetrics;
  ads: [];
};

export type GoogleAdsDetail = {
  campaigns: GoogleAdsDetailCampaign[];
};

export async function getGoogleAdsDetail(
  startDate: string,
  endDate: string,
): Promise<GoogleAdsDetail> {
  const query = `
    WITH basic AS (
      SELECT
        customer_id,
        campaign_id,
        SUM(metrics_cost_micros) / 1000000 AS cost,
        SUM(metrics_impressions) AS impressions,
        SUM(metrics_clicks) AS clicks
      FROM \`hotel-marketing-analyzer-demo.google_ads.CampaignBasicStats_demo\`
      WHERE segments_date BETWEEN @startDate AND @endDate
      GROUP BY customer_id, campaign_id
    ),
    purchases AS (
      SELECT
        customer_id,
        campaign_id,
        SUM(metrics_conversions) AS conversions,
        SUM(metrics_conversions_value) AS conversion_value
      FROM \`hotel-marketing-analyzer-demo.google_ads.CampaignConversionStats_demo\`
      WHERE segments_date BETWEEN @startDate AND @endDate
        AND segments_conversion_action_name = 'Demo Baltic — zakup online'
      GROUP BY customer_id, campaign_id
    )
    SELECT
      CAST(c.customer_id AS STRING) AS customer_id,
      CAST(c.campaign_id AS STRING) AS campaign_id,
      c.campaign_name,
      c.campaign_advertising_channel_type AS campaign_type,
      c.campaign_status AS status,
      CASE
        WHEN c.campaign_advertising_channel_type = 'HOTEL'
          AND c.campaign_name = 'Demo Baltic Horizon | GHA' THEN 'GHA'
        WHEN c.campaign_advertising_channel_type = 'SEARCH'
          AND c.campaign_name = 'Demo Baltic Horizon | Brand' THEN 'Brand'
        WHEN c.campaign_advertising_channel_type = 'SEARCH'
          AND c.campaign_name = 'Demo Baltic Horizon | Search Generic' THEN 'Generic'
        ELSE NULL
      END AS segment,
      ROUND(COALESCE(b.cost, 0), 2) AS cost,
      COALESCE(b.impressions, 0) AS impressions,
      COALESCE(b.clicks, 0) AS clicks,
      ROUND(COALESCE(p.conversions, 0), 2) AS conversions,
      ROUND(COALESCE(p.conversion_value, 0), 2) AS conversion_value
    FROM \`hotel-marketing-analyzer-demo.google_ads.Campaign_demo\` c
    LEFT JOIN basic b USING (customer_id, campaign_id)
    LEFT JOIN purchases p USING (customer_id, campaign_id)
    WHERE c.campaign_id IS NOT NULL
    ORDER BY cost DESC, campaign_name
  `;

  const [rows] = await bigquery.query({
    query,
    location: "EU",
    params: { startDate, endDate },
  });

  return {
    campaigns: rows.map((row): GoogleAdsDetailCampaign => {
      const cost = Number(row.cost ?? 0);
      const impressions = Number(row.impressions ?? 0);
      const clicks = Number(row.clicks ?? 0);
      const conversionValue = Number(row.conversion_value ?? 0);

      return {
        customer_id: String(row.customer_id),
        campaign_id: String(row.campaign_id),
        campaign_name: String(row.campaign_name ?? "Kampania bez nazwy"),
        campaign_type: row.campaign_type == null ? null : String(row.campaign_type),
        status: row.status == null ? null : String(row.status),
        segment: row.segment === "Brand" || row.segment === "Generic" || row.segment === "GHA"
          ? row.segment
          : null,
        metrics: {
          cost,
          impressions,
          clicks,
          conversions: Number(row.conversions ?? 0),
          conversion_value: conversionValue,
          ctr: impressions === 0 ? null : (clicks / impressions) * 100,
          cpc: clicks === 0 ? null : cost / clicks,
          platform_roas: cost === 0 ? null : conversionValue / cost,
        },
        ads: [],
      };
    }),
  };
}

export async function getGa4DiagnosticInputSummary(
  startDate: string,
  endDate: string
) {
  const query = `
    WITH events AS (
      SELECT
        user_pseudo_id,
        event_name,
        (
          SELECT value.int_value
          FROM UNNEST(event_params)
          WHERE key = 'ga_session_id'
        ) AS ga_session_id,
        (
          SELECT value.int_value
          FROM UNNEST(event_params)
          WHERE key = 'session_engaged'
        ) AS session_engaged
      FROM \`hotel-marketing-analyzer-demo.ga4.events_demo\`
      WHERE PARSE_DATE('%Y%m%d', event_date)
        BETWEEN PARSE_DATE('%Y-%m-%d', @startDate)
        AND PARSE_DATE('%Y-%m-%d', @endDate)
    ),

    sessions AS (
      SELECT
        CONCAT(
          COALESCE(user_pseudo_id, ''),
          '-',
          CAST(ga_session_id AS STRING)
        ) AS session_key,

        COUNTIF(event_name = 'session_start') > 0
          AS has_session_start,

        MAX(COALESCE(session_engaged, 0)) = 1
          AS engaged_session,

        COUNTIF(
          event_name IN (
            'open_apartment_details',
            'open_package_details'
          )
        ) > 0
          AS view_offer_or_room,

        COUNTIF(event_name = 'step1_dates_and_rooms') > 0
          AS step1,

        COUNTIF(event_name = 'step2_extras') > 0
          AS step2,

        COUNTIF(event_name = 'step3_confirmation') > 0
          AS step3,

        COUNTIF(event_name = 'purchase') > 0
          AS purchase

      FROM events
      WHERE ga_session_id IS NOT NULL
      GROUP BY session_key
    )

    SELECT
      COUNTIF(has_session_start) AS sessions,
      COUNTIF(has_session_start AND engaged_session) AS engaged_sessions,
      COUNTIF(view_offer_or_room) AS view_offer_or_room,
      COUNTIF(step1) AS step1,
      COUNTIF(step2) AS step2,
      COUNTIF(step3) AS step3,
      COUNTIF(purchase) AS purchases
    FROM sessions
  `;

  const [rows] = await bigquery.query({
    query,
    location: "EU",
    params: {
      startDate,
      endDate,
    },
  });

  const row = rows[0] ?? {};

  return {
    sessions: Number(row.sessions ?? 0),
    engaged_sessions: Number(row.engaged_sessions ?? 0),
    view_offer_or_room: Number(row.view_offer_or_room ?? 0),
    step1: Number(row.step1 ?? 0),
    step2: Number(row.step2 ?? 0),
    step3: Number(row.step3 ?? 0),
    purchases: Number(row.purchases ?? 0),
  };
}

const PROFITROOM_DEMO_DATA_THROUGH = "2026-08-29";

export type ProfitroomDailySeriesPoint = {
  date: string;
  active_bookings: number;
  active_revenue: number;
  direct_bookings: number;
  direct_revenue: number;
  ota_bookings: number;
  ota_revenue: number;
};

export async function getProfitroomDailySeries(
  startDate: string,
  endDate: string
): Promise<ProfitroomDailySeriesPoint[]> {
  const query = `
    WITH days AS (
      SELECT day
      FROM UNNEST(
        GENERATE_DATE_ARRAY(DATE(@startDate), DATE(@endDate))
      ) AS day
    ),
    daily AS (
      SELECT
        DATE(\`Data rezerwacji\`, "Europe/Warsaw") AS day,
        COUNT(*) AS active_bookings,
        ROUND(SUM(\`Wartość\`), 2) AS active_revenue,
        COUNTIF(\`Kanał rezerwacji\` = 'Booking Engine') AS direct_bookings,
        ROUND(SUM(IF(\`Kanał rezerwacji\` = 'Booking Engine', \`Wartość\`, 0)), 2) AS direct_revenue,
        COUNTIF(\`Kanał rezerwacji\` IS DISTINCT FROM 'Booking Engine') AS ota_bookings,
        ROUND(SUM(IF(\`Kanał rezerwacji\` IS DISTINCT FROM 'Booking Engine', \`Wartość\`, 0)), 2) AS ota_revenue
      FROM \`hotel-marketing-analyzer-demo.profitroom.reservations_demo\`
      WHERE DATE(\`Data rezerwacji\`, "Europe/Warsaw")
        BETWEEN DATE(@startDate) AND DATE(@endDate)
        AND \`Data anulacji\` IS NULL
      GROUP BY day
    )
    SELECT
      FORMAT_DATE('%Y-%m-%d', days.day) AS date,
      COALESCE(daily.active_bookings, 0) AS active_bookings,
      COALESCE(daily.active_revenue, 0) AS active_revenue,
      COALESCE(daily.direct_bookings, 0) AS direct_bookings,
      COALESCE(daily.direct_revenue, 0) AS direct_revenue,
      COALESCE(daily.ota_bookings, 0) AS ota_bookings,
      COALESCE(daily.ota_revenue, 0) AS ota_revenue
    FROM days
    LEFT JOIN daily USING (day)
    ORDER BY days.day
  `;

  const [rows] = await bigquery.query({
    query,
    location: "EU",
    params: { startDate, endDate },
  });

  return rows.map((row): ProfitroomDailySeriesPoint => ({
    date: String(row.date),
    active_bookings: Number(row.active_bookings),
    active_revenue: Number(row.active_revenue),
    direct_bookings: Number(row.direct_bookings),
    direct_revenue: Number(row.direct_revenue),
    ota_bookings: Number(row.ota_bookings),
    ota_revenue: Number(row.ota_revenue),
  }));
}

export async function getProfitroomDiagnosticInputSummary(
  startDate: string,
  endDate: string
) {
  const query = `
    SELECT
      \`Kanał rezerwacji\` AS channel,

      COUNT(*) AS created_bookings,

      COUNTIF(
        \`Data anulacji\` IS NULL
      ) AS active_bookings,

      ROUND(
        SUM(
          IF(
            \`Data anulacji\` IS NULL,
            \`Wartość\`,
            0
          )
        ),
        2
      ) AS active_revenue

    FROM \`hotel-marketing-analyzer-demo.profitroom.reservations_demo\`

    WHERE DATE(\`Data rezerwacji\`, "Europe/Warsaw")
      BETWEEN @startDate AND @endDate

    GROUP BY channel
  `;

  const [rows] = await bigquery.query({
    query,
    location: "EU",
    params: {
      startDate,
      endDate,
    },
  });

  function getChannel(channel: string) {
    const row = rows.find(
      (item) => item.channel === channel
    );

    return {
      created_bookings: Number(
        row?.created_bookings ?? 0
      ),
      active_bookings: Number(
        row?.active_bookings ?? 0
      ),
      active_revenue: Number(
        row?.active_revenue ?? 0
      ),
    };
  }

  const direct = getChannel("Booking Engine");
  const bookingCom = getChannel("Booking.com");
  const expedia = getChannel("Expedia");
  const hrs = getChannel("HRS");

  const knownChannels = new Set([
    "Booking Engine",
    "Booking.com",
    "Expedia",
    "HRS",
  ]);

  const otherOtaRows = rows.filter(
    (row) => !knownChannels.has(row.channel)
  );

  const otherOta = {
    active_bookings: otherOtaRows.reduce(
      (sum, row) =>
        sum + Number(row.active_bookings ?? 0),
      0
    ),

    active_revenue: otherOtaRows.reduce(
      (sum, row) =>
        sum + Number(row.active_revenue ?? 0),
      0
    ),
  };

  const activeOnlineBookings =
    direct.active_bookings +
    bookingCom.active_bookings +
    expedia.active_bookings +
    hrs.active_bookings +
    otherOta.active_bookings;

  const activeOnlineRevenue =
    direct.active_revenue +
    bookingCom.active_revenue +
    expedia.active_revenue +
    hrs.active_revenue +
    otherOta.active_revenue;

  return {
    direct_created_bookings:
      direct.created_bookings,

    direct_active_bookings:
      direct.active_bookings,

    direct_active_revenue:
      direct.active_revenue,

    booking_com_active_bookings:
      bookingCom.active_bookings,

    booking_com_active_revenue:
      bookingCom.active_revenue,

    expedia_active_bookings:
      expedia.active_bookings,

    expedia_active_revenue:
      expedia.active_revenue,

    hrs_active_bookings:
      hrs.active_bookings,

    hrs_active_revenue:
      hrs.active_revenue,

    other_ota_active_bookings:
      otherOta.active_bookings,

    other_ota_active_revenue:
      otherOta.active_revenue,

    active_online_bookings:
      activeOnlineBookings,

    active_online_revenue:
      Number(activeOnlineRevenue.toFixed(2)),

    profitroom_data_through:
      PROFITROOM_DEMO_DATA_THROUGH,
  };
}
