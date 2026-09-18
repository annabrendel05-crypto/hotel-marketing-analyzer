import { extractOpenAiResponseText, type OpenAiResponse } from "./openai-response";
import { ASK_DATA_SYSTEM_PROMPT, buildAskDataContextMessage } from "./ask-data-prompt";
import type { AskDataInput, AskDataOutput } from "./ask-data-types";

const ASK_DATA_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "answer",
    "key_facts",
    "observation",
    "recommended_action",
    "used_context",
    "limitations",
  ],
  properties: {
    answer: { type: "string" },
    key_facts: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value", "change"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          change: { type: ["string", "null"] },
        },
      },
    },
    observation: { type: ["string", "null"] },
    recommended_action: { type: ["string", "null"] },
    used_context: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "period",
          "sales",
          "funnel",
          "meta_ads",
          "google_ads",
          "campaign_details",
          "diagnostics",
          "recommendations",
          "watch",
          "limitations",
        ],
      },
    },
    limitations: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

function isAskDataOutput(value: unknown): value is AskDataOutput {
  if (!value || typeof value !== "object") return false;

  const output = value as Partial<AskDataOutput>;

  return (
    typeof output.answer === "string"
    && Array.isArray(output.key_facts)
    && output.key_facts.length <= 4
    && output.key_facts.every((fact) => (
      fact
      && typeof fact === "object"
      && typeof fact.label === "string"
      && typeof fact.value === "string"
      && (fact.change === undefined || typeof fact.change === "string")
    ))
    && (output.observation === undefined || typeof output.observation === "string")
    && (output.recommended_action === undefined || typeof output.recommended_action === "string")
    && Array.isArray(output.used_context)
    && output.used_context.every((item) => typeof item === "string")
    && Array.isArray(output.limitations)
    && output.limitations.every((item) => typeof item === "string")
  );
}

export async function askHmaData(input: AskDataInput): Promise<AskDataOutput> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("AI language layer is not configured");
  }

  const conversation = (input.conversation ?? []).slice(-6);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_AI_SUMMARY_MODEL ?? "gpt-5-mini",
      instructions: ASK_DATA_SYSTEM_PROMPT,
      input: [
        { role: "user", content: buildAskDataContextMessage(input.context) },
        ...conversation,
        { role: "user", content: input.question },
      ],
      max_output_tokens: 900,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "hma_ask_data_answer",
          strict: true,
          schema: ASK_DATA_OUTPUT_SCHEMA,
        },
      },
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI response failed with status ${response.status}`);
  }

  const payload = await response.json() as OpenAiResponse;
  const text = extractOpenAiResponseText(payload);

  if (!text) {
    throw new Error("OpenAI response did not contain text output");
  }

  const raw: unknown = JSON.parse(text);

  if (!raw || typeof raw !== "object") {
    throw new Error("OpenAI response did not match AskDataOutput");
  }

  const structured = raw as {
    answer?: unknown;
    key_facts?: Array<{ label?: unknown; value?: unknown; change?: unknown }>;
    observation?: unknown;
    recommended_action?: unknown;
    used_context?: unknown;
    limitations?: unknown;
  };
  const parsed: unknown = {
    ...structured,
    key_facts: structured.key_facts?.map((fact) => ({
      label: fact.label,
      value: fact.value,
      ...(typeof fact.change === "string" ? { change: fact.change } : {}),
    })),
    ...(typeof structured.observation === "string"
      ? { observation: structured.observation }
      : { observation: undefined }),
    ...(typeof structured.recommended_action === "string"
      ? { recommended_action: structured.recommended_action }
      : { recommended_action: undefined }),
  };

  if (!isAskDataOutput(parsed)) {
    throw new Error("OpenAI response did not match AskDataOutput");
  }

  return parsed;
}
