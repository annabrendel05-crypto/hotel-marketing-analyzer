import { NextRequest, NextResponse } from "next/server";
import { getProfitroomSales } from "@/lib/bigquery";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const currentStart = searchParams.get("currentStart");
    const currentEnd = searchParams.get("currentEnd");
    const comparisonStart = searchParams.get("comparisonStart");
    const comparisonEnd = searchParams.get("comparisonEnd");

    if (!currentStart || !currentEnd) {
      return NextResponse.json(
        { error: "Brak currentStart lub currentEnd" },
        { status: 400 }
      );
    }

    const current = await getProfitroomSales(currentStart, currentEnd);

    const comparison =
      comparisonStart && comparisonEnd
        ? await getProfitroomSales(comparisonStart, comparisonEnd)
        : [];

    return NextResponse.json({
      current,
      comparison,
    });
  } catch (error) {
    console.error("Profitroom summary error:", error);

    return NextResponse.json(
      { error: "Nie udało się pobrać danych Profitroom" },
      { status: 500 }
    );
  }
}
