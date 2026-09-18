import { AI_LANGUAGE_SYSTEM_PROMPT, buildAiLanguageUserPrompt } from "./prompt";
import { extractOpenAiResponseText, type OpenAiResponse } from "./openai-response";
import type { AiLanguageInput, AiLanguageOutput } from "./types";

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "executive_summary",
    "what_changed",
    "what_it_means",
    "what_to_do_now",
    "limitations",
  ],
  properties: {
    executive_summary: { type: "string" },
    what_changed: { type: "string" },
    what_it_means: { type: "string" },
    what_to_do_now: { type: "string" },
    limitations: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

function isAiLanguageOutput(value: unknown): value is AiLanguageOutput {
  if (!value || typeof value !== "object") return false;

  const output = value as Partial<AiLanguageOutput>;

  return (
    typeof output.executive_summary === "string"
    && typeof output.what_changed === "string"
    && typeof output.what_it_means === "string"
    && typeof output.what_to_do_now === "string"
    && Array.isArray(output.limitations)
    && output.limitations.every((item) => typeof item === "string")
  );
}

export function isAiLanguageConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function generateAiLanguageSummary(
  input: AiLanguageInput,
): Promise<AiLanguageOutput> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("AI language layer is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_AI_SUMMARY_MODEL ?? "gpt-5-mini",
      instructions: AI_LANGUAGE_SYSTEM_PROMPT,
      input: buildAiLanguageUserPrompt(input),
      max_output_tokens: 700,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "hma_language_summary",
          strict: true,
          schema: OUTPUT_SCHEMA,
        },
      },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI response failed with status ${response.status}`);
  }

  const payload = await response.json() as OpenAiResponse;
  const text = extractOpenAiResponseText(payload);

  if (!text) {
    throw new Error("OpenAI response did not contain text output");
  }

  const parsed: unknown = JSON.parse(text);

  if (!isAiLanguageOutput(parsed)) {
    throw new Error("OpenAI response did not match AiLanguageOutput");
  }

  return parsed;
}
