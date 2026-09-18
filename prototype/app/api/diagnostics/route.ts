import { NextRequest, NextResponse } from "next/server";

import { getGoogleAdsDetail, getMetaDetail, getProfitroomDailySeries } from "@/lib/bigquery";
import { getDiagnosticInput } from "@/lib/diagnostics/adapter";
import { runDiagnostics } from "@/lib/diagnostics/index";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const currentStart =
      searchParams.get("currentStart");

    const currentEnd =
      searchParams.get("currentEnd");

    const comparisonStart =
      searchParams.get("comparisonStart");

    const comparisonEnd =
      searchParams.get("comparisonEnd");

    if (
      !currentStart ||
      !currentEnd ||
      !comparisonStart ||
      !comparisonEnd
    ) {
      return NextResponse.json(
        {
          error:
            "Brak pełnego zakresu dat",
        },
        {
          status: 400,
        }
      );
    }

    const [input, currentSeries, comparisonSeries, metaDetail, googleAdsDetail] =
      await Promise.all([
        getDiagnosticInput(
          currentStart,
          currentEnd,
          comparisonStart,
          comparisonEnd
        ),
        getProfitroomDailySeries(currentStart, currentEnd),
        getProfitroomDailySeries(comparisonStart, comparisonEnd),
        getMetaDetail(currentStart, currentEnd),
        getGoogleAdsDetail(currentStart, currentEnd),
      ]);

    const result =
      runDiagnostics(input);

    return NextResponse.json({
      input,
      result,
      series: {
        profitroom: {
          current: currentSeries,
          comparison: comparisonSeries,
        },
      },
      meta_detail: metaDetail,
      google_ads_detail: googleAdsDetail,
    });
  } catch (error) {
    console.error(
      "Diagnostics API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Nie udało się policzyć diagnoz",
      },
      {
        status: 500,
      }
    );
  }
}
