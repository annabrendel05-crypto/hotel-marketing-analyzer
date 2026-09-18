import { NextRequest, NextResponse } from "next/server";

import {
  askHmaData,
  isAiLanguageConfigured,
  type AskDataApiResponse,
  type AskDataInput,
} from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

function isConversation(value: unknown) {
  return (
    value === undefined
    || (
      Array.isArray(value)
      && value.length <= 10
      && value.every((message) => (
        message
        && typeof message === "object"
        && (message.role === "user" || message.role === "assistant")
        && typeof message.content === "string"
        && message.content.length <= 4_000
      ))
    )
  );
}

function isAskDataInput(value: unknown): value is AskDataInput {
  if (!value || typeof value !== "object") return false;

  const input = value as Partial<AskDataInput>;
  const question = typeof input.question === "string" ? input.question.trim() : "";

  return Boolean(
    question.length >= 2
    && question.length <= 600
    && input.context
    && typeof input.context === "object"
    && input.context.period
    && input.context.sales
    && input.context.funnel
    && input.context.meta_ads
    && input.context.google_ads
    && Array.isArray(input.context.diagnostics)
    && Array.isArray(input.context.recommendations)
    && Array.isArray(input.context.watch)
    && Array.isArray(input.context.limitations)
    && isConversation(input.conversation),
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const response: AskDataApiResponse = { available: false, reason: "unauthorized" };
    return NextResponse.json(response, { status: 401 });
  }

  let input: unknown;

  try {
    input = await request.json();
  } catch {
    const response: AskDataApiResponse = { available: false, reason: "invalid_input" };
    return NextResponse.json(response, { status: 400 });
  }

  if (!isAskDataInput(input)) {
    const response: AskDataApiResponse = { available: false, reason: "invalid_input" };
    return NextResponse.json(response, { status: 400 });
  }

  if (!isAiLanguageConfigured()) {
    const response: AskDataApiResponse = { available: false, reason: "not_configured" };
    return NextResponse.json(response, { status: 503 });
  }

  try {
    const result = await askHmaData({
      ...input,
      question: input.question.trim(),
      conversation: input.conversation?.slice(-6),
    });
    const response: AskDataApiResponse = { available: true, result };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Ask data generation failed:", error);
    const response: AskDataApiResponse = { available: false, reason: "generation_failed" };
    return NextResponse.json(response, { status: 502 });
  }
}
