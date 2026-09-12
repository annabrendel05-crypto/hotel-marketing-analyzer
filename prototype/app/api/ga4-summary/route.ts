import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

const bigquery = new BigQuery({
  projectId: "hotel-marketing-analyzer-demo",
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const currentStart = searchParams.get("currentStart");
  const currentEnd = searchParams.get("currentEnd");
  const comparisonStart = searchParams.get("comparisonStart");
  const comparisonEnd = searchParams.get("comparisonEnd");
  const source = searchParams.get("source");

  if (!currentStart || !currentEnd || !comparisonStart || !comparisonEnd) {
    return NextResponse.json(
      { error: "Brak zakresu dat" },
      { status: 400 }
    );
  }

  const query = `
    WITH raw AS (
      SELECT
        PARSE_DATE('%Y%m%d', event_date) AS event_day,
        user_pseudo_id,
        event_name,

        (
          SELECT value.int_value
          FROM UNNEST(event_params)
          WHERE key = 'ga_session_id'
        ) AS ga_session_id,

        COALESCE((
          SELECT value.int_value
          FROM UNNEST(event_params)
          WHERE key = 'engagement_time_msec'
        ), 0) AS engagement_time_msec

      FROM \`hotel-marketing-analyzer-demo.ga4.events_demo\`

      WHERE PARSE_DATE('%Y%m%d', event_date)
        BETWEEN PARSE_DATE('%Y-%m-%d', @comparisonStart)
        AND PARSE_DATE('%Y-%m-%d', @currentEnd)
        AND (
          @source != 'meta'
          OR (
            collected_traffic_source.manual_source = 'facebook'
            AND collected_traffic_source.manual_medium = 'paid_social'
          )
        )
    ),

    sessions AS (
      SELECT
        CASE
          WHEN MIN(event_day)
            BETWEEN PARSE_DATE('%Y-%m-%d', @currentStart)
            AND PARSE_DATE('%Y-%m-%d', @currentEnd)
            THEN 'current'

          WHEN MIN(event_day)
            BETWEEN PARSE_DATE('%Y-%m-%d', @comparisonStart)
            AND PARSE_DATE('%Y-%m-%d', @comparisonEnd)
            THEN 'comparison'
        END AS period,

        user_pseudo_id,
        ga_session_id,

        COUNTIF(event_name = 'session_start') AS session_starts,

        SUM(engagement_time_msec) AS engagement_time_msec,

        COUNTIF(event_name = 'page_view') AS page_views,

        COUNTIF(event_name IN (
          'conversion_event_contact',
          'form_submit',
          'open_apartment_details',
          'open_package_details',
          'purchase',
          'step1_dates_and_rooms',
          'step2_extras',
          'step3_confirmation',
          'step4_payment_confirmation'
        )) AS key_events,

        COUNTIF(event_name = 'open_apartment_details') AS apartment_opens,
        COUNTIF(event_name = 'open_package_details') AS package_opens,
        COUNTIF(event_name = 'step1_dates_and_rooms') AS step1_events,
        COUNTIF(event_name = 'step2_extras') AS step2_events,
        COUNTIF(event_name = 'step3_confirmation') AS step3_events,
        COUNTIF(event_name = 'purchase') AS purchase_events

      FROM raw

      WHERE ga_session_id IS NOT NULL

      GROUP BY
        user_pseudo_id,
        ga_session_id
    )

    SELECT
      period,

      COUNT(*) AS sessions,

      COUNTIF(
        engagement_time_msec > 10000
        OR page_views >= 2
        OR key_events >= 1
      ) AS engaged_sessions,

      COUNTIF(
        engagement_time_msec > 60000
      ) AS sessions_over_60s,

      COUNTIF(apartment_opens > 0) AS apartment_open_sessions,
      COUNTIF(package_opens > 0) AS package_open_sessions,
      COUNTIF(step1_events > 0) AS step1,
      COUNTIF(step2_events > 0) AS step2,
      COUNTIF(step3_events > 0) AS step3,
      COUNTIF(purchase_events > 0) AS purchases

    FROM sessions

    WHERE
      period IS NOT NULL
      AND session_starts > 0

    GROUP BY period
    ORDER BY period
  `;

  try {
    const [rows] = await bigquery.query({
      query,
      location: "EU",
      params: {
        currentStart,
        currentEnd,
        comparisonStart,
        comparisonEnd,
        source: source ?? "all",
      },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("BigQuery GA4 error:", error);

    return NextResponse.json(
      { error: "Nie udało się pobrać danych GA4" },
      { status: 500 }
    );
  }
}
