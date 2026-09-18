import type { GoogleAdsDetail, MetaDetail } from "@/lib/bigquery";
import type {
  Ga4Metrics,
  GoogleAdsMetrics,
  MetaMetrics,
  ProfitroomMetrics,
} from "@/lib/diagnostics/input";

import type { AiDiagnosticContext, AiPeriod } from "./types";

export type AskDataConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AskDataContext = {
  period: AiPeriod;
  sales: {
    current: ProfitroomMetrics;
    comparison: ProfitroomMetrics;
  };
  funnel: {
    current: Ga4Metrics;
    comparison: Ga4Metrics;
  };
  meta_ads: {
    current: MetaMetrics;
    comparison: MetaMetrics;
    campaigns: MetaDetail["campaigns"];
  };
  google_ads: {
    current: GoogleAdsMetrics;
    comparison: GoogleAdsMetrics;
    campaigns: GoogleAdsDetail["campaigns"];
  };
  top_business_issue: AiDiagnosticContext | null;
  top_operational_diagnosis: AiDiagnosticContext | null;
  recommendations: AiDiagnosticContext[];
  watch: AiDiagnosticContext[];
  limitations: AiDiagnosticContext[];
  diagnostics: AiDiagnosticContext[];
};

export type AskDataInput = {
  question: string;
  context: AskDataContext;
  conversation?: AskDataConversationMessage[];
};

export type AskDataOutput = {
  answer: string;
  key_facts: Array<{
    label: string;
    value: string;
    change?: string;
  }>;
  observation?: string;
  recommended_action?: string;
  used_context: string[];
  limitations: string[];
};

export type AskDataApiResponse =
  | {
      available: true;
      result: AskDataOutput;
    }
  | {
      available: false;
      reason: "not_configured" | "generation_failed" | "invalid_input" | "unauthorized";
    };
