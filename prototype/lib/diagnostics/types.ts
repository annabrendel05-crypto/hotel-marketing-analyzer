export type DiagnosticFamily =
  | "DATA_QUALITY"
  | "TRAFFIC_QUALITY"
  | "FUNNEL"
  | "SALES_STRUCTURE"
  | "EFFICIENCY"
  | "CHANNEL_ROLE";

export type DiagnosticStatus =
  | "ACTIVE"
  | "WATCH"
  | "BLOCKED";

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type Severity =
  | "INFO"
  | "LOW"
  | "POSITIVE"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type BusinessImpact = "LOW" | "MEDIUM" | "HIGH";

export type Urgency = "LOW" | "MEDIUM" | "HIGH";

export type EvidenceStrength = "LOW" | "MEDIUM" | "HIGH";

export type Actionability = "LOW" | "MEDIUM" | "HIGH";

export type DataCompleteness =
  | "COMPLETE"
  | "PARTIAL"
  | "INSUFFICIENT";

export type DiagnosticCode =
  | "TRACKING_MISMATCH"
  | "INCOMPLETE_PROFITROOM"
  | "INSUFFICIENT_DATA"
  | "TRAFFIC_UP_QUALITY_DOWN"
  | "STEP1_TO_STEP2_WEAK"
  | "STEP2_TO_STEP3_WEAK"
  | "STEP3_TO_PURCHASE_WEAK"
  | "TOTAL_DEMAND_UP"
  | "TOTAL_DEMAND_DOWN"
  | "DIRECT_TO_OTA"
  | "OTA_TO_DIRECT"
  | "COST_UP_SALES_FLAT"
  | "SALES_UP_EFFICIENCY_GOOD"
  | "DEMAND_GENERATOR"
  | "ASSISTER"
  | "CLOSER";

export type DiagnosticScope =
  | "HOTEL"
  | "CHANNEL"
  | "CAMPAIGN";

export type Diagnostic = {
  family: DiagnosticFamily;
  code: DiagnosticCode;

  scope: DiagnosticScope;
  scope_id?: string;

  status: DiagnosticStatus;

  metric_context: Record<string, number | string | null>;

  evidence: string[];

  confidence: Confidence;
  severity: Severity;
  business_impact: BusinessImpact;
  urgency: Urgency;
  evidence_strength: EvidenceStrength;
  actionability: Actionability;

  data_completeness: DataCompleteness;

  recommendation_code: string;
  action_type: string;

  related_diagnostics: DiagnosticCode[];

  blocking_diagnostic?: DiagnosticCode;

  client_text: string;
};
