import { NextRequest, NextResponse } from "next/server";

import {
  generateAiLanguageSummary,
  isAiLanguageConfigured,
  type AiLanguageInput,
  type AiSummaryApiResponse,
} from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

function isAiLanguageInput(value: unknown): value is AiLanguageInput {
  if (!value || typeof value !== "object") return false;

  const input = value as Partial<AiLanguageInput>;

  return Boolean(
    input.period
    && input.relevant_metrics
    && Array.isArray(input.recommendations)
    && Array.isArray(input.watch)
    && Array.isArray(input.limitations),
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const response: AiSummaryApiResponse = {
      available: false,
      reason: "unauthorized",
    };
    return NextResponse.json(response, { status: 401 });
  }

  let input: unknown;

  try {
    input = await request.json();
  } catch {
    const response: AiSummaryApiResponse = {
      available: false,
      reason: "invalid_input",
    };
    return NextResponse.json(response, { status: 400 });
  }

  if (!isAiLanguageInput(input)) {
    const response: AiSummaryApiResponse = {
      available: false,
      reason: "invalid_input",
    };
    return NextResponse.json(response, { status: 400 });
  }

  if (!isAiLanguageConfigured()) {
    const response: AiSummaryApiResponse = {
      available: false,
      reason: "not_configured",
    };
    return NextResponse.json(response, { status: 503 });
  }

  try {
    const summary = await generateAiLanguageSummary(input);
    const response: AiSummaryApiResponse = { available: true, summary };
    return NextResponse.json(response);
  } catch (error) {
    console.error("AI summary generation failed:", error);
    const response: AiSummaryApiResponse = {
      available: false,
      reason: "generation_failed",
    };
    return NextResponse.json(response, { status: 502 });
  }
}
