import type {
  Confidence,
  DiagnosticCode,
  DiagnosticFamily,
  DiagnosticStatus,
  Severity,
} from "@/lib/diagnostics/types";

export type AiPeriod = {
  current: {
    start: string;
    end: string;
  };
  comparison: {
    start: string;
    end: string;
  };
};

export type AiDiagnosticContext = {
  family: DiagnosticFamily;
  code: DiagnosticCode;
  status: DiagnosticStatus;
  severity: Severity;
  confidence: Confidence;
  client_text: string;
  evidence: string[];
  recommendation_code: string;
  action_type: string;
  blocking_diagnostic?: DiagnosticCode;
};

export type AiRelevantMetrics = {
  sales: {
    active_online_bookings: number;
    comparison_active_online_bookings: number;
    active_online_revenue: number;
    comparison_active_online_revenue: number;
    direct_booking_share_percent: number | null;
    comparison_direct_booking_share_percent: number | null;
  };
  funnel: {
    sessions: number;
    comparison_sessions: number;
    step1_to_step2_percent: number | null;
    comparison_step1_to_step2_percent: number | null;
    step2_to_step3_percent: number | null;
    comparison_step2_to_step3_percent: number | null;
    step3_to_purchase_percent: number | null;
    comparison_step3_to_purchase_percent: number | null;
  };
  marketing: {
    total_ad_cost: number;
    comparison_total_ad_cost: number;
    ad_cost_to_online_revenue_percent: number | null;
  };
};

export type AiLanguageInput = {
  period: AiPeriod;
  top_business_issue: AiDiagnosticContext | null;
  top_operational_diagnosis: AiDiagnosticContext | null;
  recommendations: AiDiagnosticContext[];
  watch: AiDiagnosticContext[];
  limitations: AiDiagnosticContext[];
  relevant_metrics: AiRelevantMetrics;
};

export type AiLanguageOutput = {
  executive_summary: string;
  what_changed: string;
  what_it_means: string;
  what_to_do_now: string;
  limitations: string[];
};

export type AiSummaryApiResponse =
  | {
      available: true;
      summary: AiLanguageOutput;
    }
  | {
      available: false;
      reason: "not_configured" | "generation_failed" | "invalid_input" | "unauthorized";
    };
