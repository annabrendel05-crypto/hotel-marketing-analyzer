"use client";

import {
  type Dispatch,
  type FormEvent,
  type KeyboardEvent,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  AskDataApiResponse,
  AskDataContext,
  AskDataConversationMessage,
  AiDiagnosticContext,
} from "@/lib/ai";
import type { GoogleAdsDetail, MetaDetail } from "@/lib/bigquery";
import type { DiagnosticInput, PriorityEngineResult } from "@/lib/diagnostics/index";

import { LogoutButton } from "./logout-button";

type ReportView =
  | "summary"
  | "sales"
  | "funnel"
  | "meta-ads"
  | "google-ads"
  | "data-quality"
  | "channel-role"
  | "ask-data";

type AnalysisPeriod = {
  currentStart: string;
  currentEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
};

type ProfitroomDailySeriesPoint = {
  date: string;
  active_bookings: number;
  active_revenue: number;
  direct_bookings: number;
  direct_revenue: number;
  ota_bookings: number;
  ota_revenue: number;
};

type DiagnosticsResponse = {
  input: DiagnosticInput;
  result: PriorityEngineResult;
  profitroom_data_from: string | null;
  series: {
    profitroom: {
      current: ProfitroomDailySeriesPoint[];
      comparison: ProfitroomDailySeriesPoint[];
    };
  };
  meta_detail: MetaDetail;
  google_ads_detail: GoogleAdsDetail;
};

type RequestStatus = "loading" | "error" | "success";
type RankedDiagnostic = NonNullable<PriorityEngineResult["top_business_issue"]>;
const channelRoleReading: Partial<Record<RankedDiagnostic["code"], string>> = {
  DEMAND_GENERATOR: "Budowanie popytu oznacza wcześniejszy kontakt z ofertą przed rezerwacją. Ta diagnoza dotyczy całej ścieżki hotelu, nie konkretnego kanału ani przypisanej mu sprzedaży.",
  ASSISTER: "Rola wspierająca oznacza sygnały zainteresowania przed finalizacją. Niewielka liczba zakupów raportowanych przez platformę nie dowodzi braku jej udziału, ale też sama nie potwierdza wpływu na sprzedaż.",
  CLOSER: "Rola domykająca oznacza widoczny koniec procesu rezerwacji. Ostatnie kliknięcie nie dowodzi, że dany kanał sam zbudował popyt.",
};
type AskDataUiMessage = AskDataConversationMessage & {
  keyFacts?: Array<{
    label: string;
    value: string;
    change?: string;
  }>;
  observation?: string;
  recommendedAction?: string;
  usedContext?: string[];
  limitations?: string[];
};

const initialPeriod: AnalysisPeriod = {
  currentStart: "2026-07-18",
  currentEnd: "2026-07-31",
  comparisonStart: "2026-07-04",
  comparisonEnd: "2026-07-17",
};

const reportViews: Array<{
  id: ReportView;
  label: string;
  description: string;
}> = [
  {
    id: "summary",
    label: "Podsumowanie okresu",
    description: "Najważniejsze wnioski i zmiany względem okresu porównawczego.",
  },
  {
    id: "sales",
    label: "Sprzedaż",
    description: "Wyniki sprzedażowe hotelu i ich zmiana w analizowanym okresie.",
  },
  {
    id: "funnel",
    label: "Lejek",
    description: "Przejścia użytkowników przez kolejne etapy ścieżki rezerwacyjnej.",
  },
  {
    id: "meta-ads",
    label: "Meta Ads",
    description: "Wyniki kampanii Meta Ads i jakość pozyskiwanego ruchu.",
  },
  {
    id: "google-ads",
    label: "Google Ads",
    description: "Wyniki Google Ads oraz sygnały związane z domykaniem popytu.",
  },
  {
    id: "data-quality",
    label: "Jakość danych",
    description: "Kompletność źródeł i wiarygodność danych użytych w analizie.",
  },
  {
    id: "channel-role",
    label: "Rola kanałów",
    description: "Rola kanałów marketingowych na ścieżce do rezerwacji.",
  },
  {
    id: "ask-data",
    label: "Czat AI",
    description: "Zapytaj o wyniki i najważniejsze zmiany w analizowanym okresie.",
  },
];

const askDataStarterQuestions = [
  "Co zmieniło się w sprzedaży?",
  "Gdzie jest problem w lejku?",
  "Jak działa Meta Ads?",
  "Co wymaga teraz mojej uwagi?",
];

function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return `${formatter.format(new Date(`${start}T00:00:00Z`))} – ${formatter.format(
    new Date(`${end}T00:00:00Z`),
  )}`;
}

function calculateComparisonPeriod(currentStart: string, currentEnd: string) {
  const dayInMilliseconds = 24 * 60 * 60 * 1000;
  const startTime = Date.parse(`${currentStart}T00:00:00Z`);
  const endTime = Date.parse(`${currentEnd}T00:00:00Z`);

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return null;
  }

  const periodLengthInDays = Math.floor((endTime - startTime) / dayInMilliseconds) + 1;
  const comparisonEndTime = startTime - dayInMilliseconds;
  const comparisonStartTime = comparisonEndTime - (periodLengthInDays - 1) * dayInMilliseconds;

  return {
    comparisonStart: new Date(comparisonStartTime).toISOString().slice(0, 10),
    comparisonEnd: new Date(comparisonEndTime).toISOString().slice(0, 10),
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pl-PL").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatPercentChange(current: number, comparison: number) {
  if (comparison === 0) return current === 0 ? "0%" : "nowe";

  const change = ((current - comparison) / comparison) * 100;
  const formatted = Math.abs(change).toLocaleString("pl-PL", { maximumFractionDigits: 1 });

  return `${change > 0 ? "+" : change < 0 ? "−" : ""}${formatted}%`;
}

function calculateShare(value: number, total: number) {
  return total === 0 ? null : (value / total) * 100;
}

function calculateRatio(value: number, total: number) {
  return total === 0 ? null : value / total;
}

function formatShare(value: number | null) {
  return value === null
    ? "—"
    : `${value.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%`;
}

function formatNullableCurrency(value: number | null) {
  return value === null ? "—" : formatCurrency(value);
}

function formatMultiplier(value: number | null) {
  return value === null
    ? "—"
    : `${value.toLocaleString("pl-PL", { maximumFractionDigits: 2 })}×`;
}

function formatShareChange(current: number | null, comparison: number | null) {
  if (current === null || comparison === null) return "—";

  const change = current - comparison;
  const formatted = Math.abs(change).toLocaleString("pl-PL", { maximumFractionDigits: 1 });

  return `${change > 0 ? "+" : change < 0 ? "−" : ""}${formatted} pp`;
}

function formatRelativeRateChange(current: number | null, comparison: number | null) {
  if (current === null || comparison === null || comparison === 0) return "—";

  return formatPercentChange(current, comparison);
}

function averageBookingValue(revenue: number, bookings: number) {
  return bookings === 0 ? null : revenue / bookings;
}

function confidencePresentation(confidence: RankedDiagnostic["confidence"]) {
  if (confidence === "HIGH") return "wysoka";
  if (confidence === "MEDIUM") return "średnia";

  return "niska";
}

function diagnosticStatusPresentation(status: RankedDiagnostic["status"]) {
  if (status === "ACTIVE") return "aktywne";
  if (status === "WATCH") return "do obserwacji";

  return "zablokowane";
}

function severityPresentation(severity: RankedDiagnostic["severity"]) {
  if (severity === "CRITICAL") return { label: "Krytyczne", tone: "red" };
  if (severity === "HIGH") return { label: "Wysoki priorytet", tone: "red" };
  if (severity === "MEDIUM") return { label: "Wymaga uwagi", tone: "amber" };
  if (severity === "POSITIVE") return { label: "Pozytywny sygnał", tone: "green" };

  return { label: "Informacja", tone: "gray" };
}

function TechnicalLabel({ children }: { children: React.ReactNode }) {
  return <small className="technical-label">{children}</small>;
}

function EvidenceList({ evidence, limit }: { evidence: string[]; limit?: number }) {
  const visibleEvidence = typeof limit === "number" ? evidence.slice(0, limit) : evidence;

  if (visibleEvidence.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 12, margin: "12px 0 0" }}>Brak dodatkowych dowodów.</p>;
  }

  return (
    <div className="evidence">
      {visibleEvidence.map((item) => <span key={item}>{item}</span>)}
    </div>
  );
}

type KpiTone = "positive" | "negative" | "warning" | "neutral";

function volumeTone(current: number, comparison: number): KpiTone {
  if (current > comparison) return "positive";
  if (current < comparison) return "negative";
  return "neutral";
}

function directShareTone(current: number | null, comparison: number | null): KpiTone {
  if (current === null || comparison === null || current === comparison) return "neutral";
  return current > comparison ? "positive" : "warning";
}

function marketingCostTone(
  currentCost: number,
  comparisonCost: number,
  currentRevenue: number,
  comparisonRevenue: number,
): KpiTone {
  if (comparisonCost === 0 || comparisonRevenue === 0) return "neutral";

  const costChange = (currentCost - comparisonCost) / comparisonCost;
  const revenueChange = (currentRevenue - comparisonRevenue) / comparisonRevenue;

  if (costChange < 0 && revenueChange >= 0) return "positive";
  if (costChange > 0 && revenueChange <= 0) return "negative";
  if (costChange > 0 && costChange > revenueChange) return "warning";
  return "neutral";
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    currency: "PLN",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);
}

function formatChartDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatHeadlineChange(value: number) {
  return Math.abs(value).toLocaleString("pl-PL", { maximumFractionDigits: 1 });
}

function businessIssueHeadline(issue: RankedDiagnostic | null) {
  if (!issue) return "Brak istotnego problemu biznesowego w tym okresie.";

  const bookingsChange = issue.metric_context.active_online_bookings_change_pct;

  if (typeof bookingsChange === "number") {
    if (bookingsChange < 0) {
      return `Sprzedaż online spadła o ${formatHeadlineChange(bookingsChange)}%`;
    }

    if (bookingsChange > 0) {
      return `Sprzedaż online wzrosła o ${formatHeadlineChange(bookingsChange)}%`;
    }

    return "Sprzedaż online pozostała na tym samym poziomie";
  }

  const fallbackHeadlines: Partial<Record<RankedDiagnostic["code"], string>> = {
    COST_UP_SALES_FLAT: "Koszt marketingu rośnie szybciej niż sprzedaż",
    DIRECT_TO_OTA: "Większa część sprzedaży przechodzi do OTA",
    OTA_TO_DIRECT: "Rośnie udział sprzedaży Direct",
    SALES_UP_EFFICIENCY_GOOD: "Sprzedaż rośnie przy dobrej efektywności",
  };

  return fallbackHeadlines[issue.code] ?? issue.client_text.split(".")[0];
}

function firstSentence(value: string) {
  return value.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? value;
}

function actionSentence(value: string) {
  const sentences = value.match(/[^.!?]+[.!?]+/g);
  return sentences?.at(-1)?.trim() ?? value;
}

function ProfitroomRevenueChart({
  current,
}: {
  current: ProfitroomDailySeriesPoint[];
}) {
  if (current.length === 0) {
    return <p className="summary-empty">Brak dziennych danych sprzedażowych dla wybranego okresu.</p>;
  }

  const width = 1000;
  const height = 340;
  const padding = { bottom: 42, left: 70, right: 24, top: 22 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const pointCount = Math.max(current.length, 2);
  const maxRevenue = Math.max(
    1,
    ...current.map((point) => point.active_revenue),
  );
  const x = (index: number) => padding.left + (index / (pointCount - 1)) * plotWidth;
  const y = (value: number) => padding.top + plotHeight - (value / maxRevenue) * plotHeight;
  const pathFor = (points: ProfitroomDailySeriesPoint[]) => points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.active_revenue)}`)
    .join(" ");
  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labelStep = Math.max(1, Math.ceil(current.length / 5));

  return (
    <div className="revenue-chart">
      <svg
        aria-label="Dzienny przychód aktywnych rezerwacji online w analizowanym okresie"
        className="chart-plot"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {gridLines.map((ratio) => {
          const lineY = padding.top + plotHeight - ratio * plotHeight;
          return (
            <g key={ratio}>
              <line className="chart-grid-line" x1={padding.left} x2={width - padding.right} y1={lineY} y2={lineY} />
              <text className="chart-axis-label" textAnchor="end" x={padding.left - 12} y={lineY + 4}>
                {formatCompactCurrency(maxRevenue * ratio)}
              </text>
            </g>
          );
        })}
        {current.length > 0 && (
          <path className="chart-line current" d={pathFor(current)} />
        )}
        {current.map((point, index) => (
          <g key={point.date}>
            <circle className="chart-point" cx={x(index)} cy={y(point.active_revenue)} r="3">
              <title>{`${formatChartDate(point.date)}: ${formatCurrency(point.active_revenue)}`}</title>
            </circle>
            {(index % labelStep === 0 || index === current.length - 1) && (
              <text className="chart-axis-label" textAnchor="middle" x={x(index)} y={height - 12}>
                {formatChartDate(point.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function toAiDiagnosticContext(
  diagnostic: RankedDiagnostic,
): AiDiagnosticContext {
  return {
    family: diagnostic.family,
    code: diagnostic.code,
    status: diagnostic.status,
    severity: diagnostic.severity,
    confidence: diagnostic.confidence,
    client_text: diagnostic.client_text,
    evidence: diagnostic.evidence,
    recommendation_code: diagnostic.recommendation_code,
    action_type: diagnostic.action_type,
    blocking_diagnostic: diagnostic.blocking_diagnostic,
  };
}

function buildAskDataContext(diagnostics: DiagnosticsResponse): AskDataContext {
  const { input, result } = diagnostics;

  return {
    period: {
      current: {
        start: input.current.start_date,
        end: input.current.end_date,
      },
      comparison: {
        start: input.comparison.start_date,
        end: input.comparison.end_date,
      },
    },
    top_business_issue: result.top_business_issue
      ? toAiDiagnosticContext(result.top_business_issue)
      : null,
    top_operational_diagnosis: result.top_operational_diagnosis
      ? toAiDiagnosticContext(result.top_operational_diagnosis)
      : null,
    recommendations: result.recommendations.map(toAiDiagnosticContext),
    watch: result.watch.map(toAiDiagnosticContext),
    limitations: result.limitations.map(toAiDiagnosticContext),
    diagnostics: result.diagnostics.map(toAiDiagnosticContext),
    sales: {
      current: input.current.profitroom,
      comparison: input.comparison.profitroom,
    },
    funnel: {
      current: input.current.ga4,
      comparison: input.comparison.ga4,
    },
    meta_ads: {
      current: input.current.meta,
      comparison: input.comparison.meta,
      campaigns: diagnostics.meta_detail.campaigns,
    },
    google_ads: {
      current: input.current.google_ads,
      comparison: input.comparison.google_ads,
      campaigns: diagnostics.google_ads_detail.campaigns,
    },
  };
}

function SummaryView({ diagnostics }: { diagnostics: DiagnosticsResponse }) {
  const { input, result, series } = diagnostics;
  const businessIssue = result.top_business_issue;
  const currentSales = input.current.profitroom;
  const comparisonSales = input.comparison.profitroom;
  const currentDirectShare = calculateShare(
    currentSales.direct_active_bookings,
    currentSales.active_online_bookings,
  );
  const comparisonDirectShare = calculateShare(
    comparisonSales.direct_active_bookings,
    comparisonSales.active_online_bookings,
  );
  const currentMarketingCost = input.current.meta.spend + input.current.google_ads.cost;
  const comparisonMarketingCost = input.comparison.meta.spend + input.comparison.google_ads.cost;
  const currentMarketingCostPerBooking = calculateRatio(
    currentMarketingCost,
    currentSales.active_online_bookings,
  );
  const comparisonMarketingCostPerBooking = calculateRatio(
    comparisonMarketingCost,
    comparisonSales.active_online_bookings,
  );
  const kpis = [
    {
      change: formatPercentChange(currentSales.active_online_bookings, comparisonSales.active_online_bookings),
      comparison: formatNumber(comparisonSales.active_online_bookings),
      label: "Rezerwacje",
      tone: volumeTone(currentSales.active_online_bookings, comparisonSales.active_online_bookings),
      value: formatNumber(currentSales.active_online_bookings),
    },
    {
      change: formatPercentChange(currentSales.active_online_revenue, comparisonSales.active_online_revenue),
      comparison: formatCurrency(comparisonSales.active_online_revenue),
      label: "Przychód",
      tone: volumeTone(currentSales.active_online_revenue, comparisonSales.active_online_revenue),
      value: formatCurrency(currentSales.active_online_revenue),
    },
    {
      change: formatShareChange(currentDirectShare, comparisonDirectShare),
      comparison: formatShare(comparisonDirectShare),
      label: "Udział Direct",
      tone: directShareTone(currentDirectShare, comparisonDirectShare),
      value: formatShare(currentDirectShare),
    },
    {
      change: formatPercentChange(currentMarketingCost, comparisonMarketingCost),
      comparison: formatCurrency(comparisonMarketingCost),
      label: "Koszt marketingu",
      tone: marketingCostTone(
        currentMarketingCost,
        comparisonMarketingCost,
        currentSales.active_online_revenue,
        comparisonSales.active_online_revenue,
      ),
      value: formatCurrency(currentMarketingCost),
    },
    {
      change: currentMarketingCostPerBooking === null || comparisonMarketingCostPerBooking === null
        ? "—"
        : formatPercentChange(currentMarketingCostPerBooking, comparisonMarketingCostPerBooking),
      comparison: formatNullableCurrency(comparisonMarketingCostPerBooking),
      description: "Meta + Google / wszystkie aktywne rezerwacje online (Direct + OTA)",
      label: "Koszt marketingu / rezerwację",
      tone: "neutral" as const,
      value: formatNullableCurrency(currentMarketingCostPerBooking),
    },
  ];
  const salesComment = result.diagnostics.find(
    (diagnostic) => diagnostic.family === "SALES_STRUCTURE" || diagnostic.family === "EFFICIENCY",
  );
  const funnelDiagnostics = result.diagnostics.filter((diagnostic) => diagnostic.family === "FUNNEL");
  const currentGa4 = input.current.ga4;
  const funnelStages = [
    { label: "Sesje", value: currentGa4.sessions },
    { label: "Step 1", value: currentGa4.step1 },
    { label: "Step 2", value: currentGa4.step2 },
    { label: "Step 3", value: currentGa4.step3 },
    { label: "Purchase", value: currentGa4.ga4_unique_purchases },
  ];
  const funnelTransitions: Array<{
    code: RankedDiagnostic["code"] | null;
    denominator: number;
    numerator: number;
  }> = [
    { code: null, denominator: currentGa4.sessions, numerator: currentGa4.step1 },
    { code: "STEP1_TO_STEP2_WEAK", denominator: currentGa4.step1, numerator: currentGa4.step2 },
    { code: "STEP2_TO_STEP3_WEAK", denominator: currentGa4.step2, numerator: currentGa4.step3 },
    { code: "STEP3_TO_PURCHASE_WEAK", denominator: currentGa4.step3, numerator: currentGa4.ga4_unique_purchases },
  ];
  const channelData = [
    { label: "Direct", value: currentSales.direct_active_bookings },
    { label: "Booking.com", value: currentSales.booking_com_active_bookings },
    { label: "Expedia", value: currentSales.expedia_active_bookings },
    { label: "HRS", value: currentSales.hrs_active_bookings },
    { label: "Other OTA", value: currentSales.other_ota_active_bookings },
  ];
  const currentMetaRoas = calculateRatio(
    input.current.meta.attributed_conversion_value,
    input.current.meta.spend,
  );
  const currentGoogleRoas = calculateRatio(
    input.current.google_ads.conversion_value,
    input.current.google_ads.cost,
  );
  const currentMarketingCostRevenueShare = calculateShare(
    currentMarketingCost,
    currentSales.active_online_revenue,
  );
  const qualityItems = [...result.limitations, ...result.watch].filter(
    (item, index, items) => items.findIndex(
      (candidate) => candidate.code === item.code && candidate.client_text === item.client_text,
    ) === index,
  );
  const incompleteProfitroom = qualityItems.find(
    (item) => item.code === "INCOMPLETE_PROFITROOM",
  );
  const visibleQualityItems = incompleteProfitroom
    ? [incompleteProfitroom, ...qualityItems.filter((item) => item !== incompleteProfitroom)].slice(0, 2)
    : qualityItems.slice(0, 2);
  const channelReadingMessages = result.diagnostics
    .filter((diagnostic) => diagnostic.family === "CHANNEL_ROLE" && diagnostic.scope === "HOTEL" && diagnostic.status === "ACTIVE")
    .map((diagnostic) => channelRoleReading[diagnostic.code])
    .filter((message): message is string => Boolean(message))
    .slice(0, 2);

  return (
    <div className="summary-view">
      <section className="summary-hero">
        <span className="eyebrow">PODSUMOWANIE OKRESU</span>
        <h1>{businessIssueHeadline(businessIssue)}</h1>
        {businessIssue && (
          <p className="summary-hero-explanation">{firstSentence(businessIssue.client_text)}</p>
        )}
        {businessIssue && (
          <div className="summary-hero-meta">
            <span className={`status ${severityPresentation(businessIssue.severity).tone}`}>
              {severityPresentation(businessIssue.severity).label}
            </span>
            <span>Pewność: {confidencePresentation(businessIssue.confidence)}</span>
            {businessIssue.evidence[0] && (
              <span className="summary-hero-evidence">{businessIssue.evidence[0]}</span>
            )}
          </div>
        )}
      </section>

      <section aria-label="Najważniejsze wskaźniki" className="summary-kpis">
        {kpis.map((kpi) => (
          <article className="summary-kpi" key={kpi.label}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            {kpi.description && <p className="summary-kpi-description">{kpi.description}</p>}
            <div>
              <b className={`tone-${kpi.tone}`}>{kpi.change}</b>
              <small>vs poprzedni okres · {kpi.comparison}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="summary-section summary-chart-section">
        <div className="summary-section-heading">
          <div>
            <span className="eyebrow">SPRZEDAŻ DZIEŃ PO DNIU</span>
            <h2>Przychód z aktywnych rezerwacji</h2>
          </div>
          <span className="summary-section-note">Profitroom · PLN</span>
        </div>
        <ProfitroomRevenueChart
          current={series.profitroom.current}
        />
        <p className="summary-comment">
          {salesComment?.client_text ?? businessIssue?.client_text ?? "Sprzedaż w analizowanym okresie nie wymaga dodatkowego komentarza diagnostycznego."}
        </p>
      </section>

      <section className="summary-section">
        <div className="summary-section-heading">
          <div>
            <span className="eyebrow">ŚCIEŻKA REZERWACYJNA</span>
            <h2>Gdzie użytkownicy przechodzą dalej?</h2>
          </div>
        </div>
        <div className="summary-funnel">
          {funnelStages.map((stage, index) => {
            const transition = funnelTransitions[index];
            const matchingDiagnostic = transition?.code
              ? funnelDiagnostics.find((diagnostic) => diagnostic.code === transition.code)
              : undefined;

            return (
              <div className="summary-funnel-part" key={stage.label}>
                <article className="summary-funnel-stage">
                  <span>{stage.label}</span>
                  <strong>{formatNumber(stage.value)}</strong>
                </article>
                {transition && (
                  <div className={`summary-funnel-transition${matchingDiagnostic ? " has-issue" : ""}`}>
                    <span>→</span>
                    <small>{formatShare(calculateShare(transition.numerator, transition.denominator))}</small>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {funnelDiagnostics[0] && <p className="summary-comment">{funnelDiagnostics[0].client_text}</p>}
      </section>

      <section className="summary-section">
        <div className="summary-section-heading">
          <div>
            <span className="eyebrow">STRUKTURA SPRZEDAŻY</span>
            <h2>Skąd pochodzą rezerwacje?</h2>
          </div>
        </div>
        <div className="channel-structure">
          {channelData.map((channel) => {
            const share = calculateShare(channel.value, currentSales.active_online_bookings);
            return (
              <div className="channel-structure-row" key={channel.label}>
                <span>{channel.label}</span>
                <div><i style={{ width: `${share ?? 0}%` }} /></div>
                <strong>{formatShare(share)}</strong>
                <small>{formatNumber(channel.value)} rez.</small>
              </div>
            );
          })}
        </div>
        <p className="summary-comment">
          {result.diagnostics.find((diagnostic) => diagnostic.family === "SALES_STRUCTURE")?.client_text
            ?? `Direct odpowiada za ${formatShare(currentDirectShare)} aktywnych rezerwacji online; pozostała część pochodzi z kanałów OTA.`}
        </p>
      </section>

      <section className="summary-section">
        <div className="summary-section-heading">
          <div>
            <span className="eyebrow">MARKETING</span>
            <h2>Czy koszt marketingu jest pod kontrolą?</h2>
            <p className="marketing-period-summary">
              {currentMarketingCostRevenueShare === null
                ? `Przychód online wyniósł ${formatCurrency(currentSales.active_online_revenue)} przy wydatkach reklamowych ${formatCurrency(currentMarketingCost)}. Nie można obliczyć udziału marketingu w potwierdzonym przychodzie online.`
                : `Przychód online wyniósł ${formatCurrency(currentSales.active_online_revenue)} przy wydatkach reklamowych ${formatCurrency(currentMarketingCost)}. Koszt reklam stanowił ${formatShare(currentMarketingCostRevenueShare)} potwierdzonego przychodu online.`}
            </p>
          </div>
        </div>
        <div className="marketing-cost-kpis">
          <article>
            <span>Przychód online z rezerwacji</span>
            <strong>{formatCurrency(currentSales.active_online_revenue)}</strong>
            <small>Direct + OTA, aktywne rezerwacje Profitroom</small>
          </article>
          <article>
            <span>Łączny koszt reklam</span>
            <strong>{formatCurrency(currentMarketingCost)}</strong>
            <small>Meta Ads + Google Ads</small>
          </article>
          <article>
            <span>Koszt reklam / przychód online</span>
            <strong>{formatShare(currentMarketingCostRevenueShare)}</strong>
            <small>udział kosztu reklam w potwierdzonym przychodzie online</small>
          </article>
        </div>
        <div className="marketing-platform-context">
          <div><span>Meta platform ROAS</span><strong>{formatMultiplier(currentMetaRoas)}</strong></div>
          <div><span>Google Ads platform ROAS</span><strong>{formatMultiplier(currentGoogleRoas)}</strong></div>
        </div>
        <div className="marketing-meaning">
          <strong>Co to znaczy?</strong>
          <p>
            {currentMarketingCostRevenueShare === null
              ? "Brak przychodu online w tym okresie — nie można przeliczyć wydatków reklamowych na 100 zł przychodu."
              : `Na każde 100 zł przychodu online przypadało około ${formatCurrency(currentMarketingCostRevenueShare)} wydatków reklamowych.`}
          </p>
        </div>
        <p className="summary-platform-note">
          Wskaźniki kosztowe odnoszą wydatki reklamowe do potwierdzonej sprzedaży online z Profitroom. Nie są modelem atrybucji sprzedaży do reklam.
        </p>
      </section>

      <aside className="summary-reading" aria-label="Jak czytać ten wynik?">
        <h2>Jak czytać ten wynik?</h2>
        <div>
          {(channelReadingMessages.length > 0
            ? channelReadingMessages
            : ["Silnik nie potwierdził aktywnej roli kanałów w tym okresie. Nie oceniaj kanałów wyłącznie po ostatnim kliknięciu."]
          ).map((message) => <p key={message}>{message}</p>)}
        </div>
      </aside>

      <section className="summary-section">
        <div className="summary-section-heading">
          <div>
            <span className="eyebrow">CO ZROBIĆ TERAZ?</span>
            <h2>Najważniejsze działania</h2>
          </div>
        </div>
        {result.recommendations.length > 0 ? (
          <ol className="summary-actions">
            {result.recommendations.slice(0, 3).map((recommendation, index) => (
              <li key={`${recommendation.code}-${recommendation.scope_id ?? index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{recommendation.client_text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="summary-empty">Brak rekomendacji wymagających działania.</p>
        )}
      </section>

      <aside className="summary-quality-strip">
        <span>Jakość danych</span>
        {qualityItems.length === 0 ? (
          <p>Dane dla tego okresu są wystarczające do podstawowej oceny.</p>
        ) : (
          <div>
            {visibleQualityItems.map((item, index) => (
              <p key={`${item.code}-${item.scope_id ?? index}`}>{item.client_text}</p>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

type SalesChartMetric = "revenue" | "bookings";

function SalesTimelineChart({ series }: { series: ProfitroomDailySeriesPoint[] }) {
  const [metric, setMetric] = useState<SalesChartMetric>("revenue");

  if (series.length === 0) {
    return <p className="sales-empty">Brak dziennych danych sprzedażowych dla wybranego okresu.</p>;
  }

  const width = 1000;
  const height = 340;
  const padding = { bottom: 42, left: 70, right: 24, top: 22 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = series.map((point) => (
    metric === "revenue" ? point.active_revenue : point.active_bookings
  ));
  const maxValue = Math.max(1, ...values);
  const slotWidth = plotWidth / series.length;
  const barWidth = Math.min(42, slotWidth * 0.68);
  const y = (value: number) => padding.top + plotHeight - (value / maxValue) * plotHeight;
  const labelStep = Math.max(1, Math.ceil(series.length / 5));
  const formatAxisValue = (value: number) => metric === "revenue"
    ? formatCompactCurrency(value)
    : new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(value);

  return (
    <div className="sales-timeline">
      <div className="sales-chart-switch" aria-label="Metryka wykresu" role="group">
        <button
          aria-pressed={metric === "revenue"}
          className={metric === "revenue" ? "active" : undefined}
          onClick={() => setMetric("revenue")}
          type="button"
        >
          Przychód
        </button>
        <button
          aria-pressed={metric === "bookings"}
          className={metric === "bookings" ? "active" : undefined}
          onClick={() => setMetric("bookings")}
          type="button"
        >
          Rezerwacje
        </button>
      </div>
      <svg
        aria-label={metric === "revenue" ? "Dzienny przychód aktywnych rezerwacji" : "Dzienna liczba aktywnych rezerwacji"}
        className="sales-chart-plot"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const lineY = padding.top + plotHeight - ratio * plotHeight;
          return (
            <g key={ratio}>
              <line className="chart-grid-line" x1={padding.left} x2={width - padding.right} y1={lineY} y2={lineY} />
              <text className="chart-axis-label" textAnchor="end" x={padding.left - 12} y={lineY + 4}>
                {formatAxisValue(maxValue * ratio)}
              </text>
            </g>
          );
        })}
        {series.map((point, index) => (
          <g key={point.date}>
            <rect
              className={`sales-chart-bar${values[index] === maxValue ? " peak" : ""}`}
              height={padding.top + plotHeight - y(values[index])}
              width={barWidth}
              x={padding.left + index * slotWidth + (slotWidth - barWidth) / 2}
              y={y(values[index])}
            >
              <title>
                {`${formatChartDate(point.date)}: ${metric === "revenue" ? formatCurrency(values[index]) : `${formatNumber(values[index])} rezerwacji`}`}
              </title>
            </rect>
            {(index % labelStep === 0 || index === series.length - 1) && (
              <text className="chart-axis-label" textAnchor="middle" x={padding.left + (index + 0.5) * slotWidth} y={height - 12}>
                {formatChartDate(point.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function SalesView({ diagnostics }: { diagnostics: DiagnosticsResponse }) {
  const { input, result, series } = diagnostics;
  const current = input.current.profitroom;
  const comparison = input.comparison.profitroom;
  const currentAverage = averageBookingValue(current.active_online_revenue, current.active_online_bookings);
  const comparisonAverage = averageBookingValue(comparison.active_online_revenue, comparison.active_online_bookings);
  const currentDirectShare = calculateShare(current.direct_active_bookings, current.active_online_bookings);
  const comparisonDirectShare = calculateShare(comparison.direct_active_bookings, comparison.active_online_bookings);
  const channels = [
    { name: "Direct", bookings: current.direct_active_bookings, revenue: current.direct_active_revenue },
    { name: "Booking.com", bookings: current.booking_com_active_bookings, revenue: current.booking_com_active_revenue },
    { name: "Expedia", bookings: current.expedia_active_bookings, revenue: current.expedia_active_revenue },
    { name: "HRS", bookings: current.hrs_active_bookings, revenue: current.hrs_active_revenue },
    { name: "Other OTA", bookings: current.other_ota_active_bookings, revenue: current.other_ota_active_revenue },
  ];
  const currentOtaBookings = channels.slice(1).reduce((total, channel) => total + channel.bookings, 0);
  const currentOtaRevenue = channels.slice(1).reduce((total, channel) => total + channel.revenue, 0);
  const directBookingShare = calculateShare(current.direct_active_bookings, current.active_online_bookings);
  const otaBookingShare = calculateShare(currentOtaBookings, current.active_online_bookings);
  const directRevenueShare = calculateShare(current.direct_active_revenue, current.active_online_revenue);
  const otaRevenueShare = calculateShare(currentOtaRevenue, current.active_online_revenue);
  const directAverage = averageBookingValue(current.direct_active_revenue, current.direct_active_bookings);
  const otaAverage = averageBookingValue(currentOtaRevenue, currentOtaBookings);
  const kpis = [
    {
      change: formatPercentChange(current.active_online_bookings, comparison.active_online_bookings),
      label: "Aktywne rezerwacje online",
      tone: volumeTone(current.active_online_bookings, comparison.active_online_bookings),
      value: formatNumber(current.active_online_bookings),
    },
    {
      change: formatPercentChange(current.active_online_revenue, comparison.active_online_revenue),
      label: "Przychód online",
      tone: volumeTone(current.active_online_revenue, comparison.active_online_revenue),
      value: formatCurrency(current.active_online_revenue),
    },
    {
      change: currentAverage === null || comparisonAverage === null
        ? "—"
        : formatPercentChange(currentAverage, comparisonAverage),
      label: "Średnia wartość rezerwacji",
      tone: currentAverage === null || comparisonAverage === null
        ? "neutral" as KpiTone
        : volumeTone(currentAverage, comparisonAverage),
      value: formatNullableCurrency(currentAverage),
    },
    {
      change: formatShareChange(currentDirectShare, comparisonDirectShare),
      label: "Udział Direct",
      tone: directShareTone(currentDirectShare, comparisonDirectShare),
      value: formatShare(currentDirectShare),
    },
  ];
  const supportedSalesCodes: RankedDiagnostic["code"][] = [
    "TOTAL_DEMAND_UP",
    "TOTAL_DEMAND_DOWN",
    "DIRECT_TO_OTA",
    "OTA_TO_DIRECT",
  ];
  const salesStructureDiagnostics = result.diagnostics.filter(
    (diagnostic) => diagnostic.family === "SALES_STRUCTURE" && supportedSalesCodes.includes(diagnostic.code),
  ).slice(0, 3);
  const directOtaDiagnostic = result.diagnostics.find(
    (diagnostic) => diagnostic.code === "DIRECT_TO_OTA" || diagnostic.code === "OTA_TO_DIRECT",
  );
  const salesRecommendations = result.recommendations.filter(
    (recommendation) =>
      recommendation.family === "SALES_STRUCTURE"
      || recommendation.family === "EFFICIENCY"
      || recommendation.action_type.includes("SALES"),
  ).slice(0, 3);
  const incompleteProfitroom = result.diagnostics.find(
    (diagnostic) => diagnostic.code === "INCOMPLETE_PROFITROOM",
  );

  return (
    <div className="sales-view-redesign">
      <section className="sales-kpi-strip" aria-label="Najważniejsze wyniki sprzedaży">
        {kpis.map((kpi) => (
          <article key={kpi.label}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <small className={`tone-${kpi.tone}`}>{kpi.change} vs poprzedni okres</small>
          </article>
        ))}
      </section>

      <section className="sales-report-section">
        <div className="sales-section-heading">
          <div><span className="eyebrow">SPRZEDAŻ W CZASIE</span><h2>Przychód dzień po dniu</h2></div>
        </div>
        <SalesTimelineChart series={series.profitroom.current} />
      </section>

      <section className="sales-report-section">
        <div className="sales-section-heading">
          <div><span className="eyebrow">KANAŁY SPRZEDAŻY</span><h2>Skąd pochodzi sprzedaż?</h2></div>
        </div>
        <div className="sales-channel-bars">
          {channels.map((channel) => {
            const share = calculateShare(channel.bookings, current.active_online_bookings);
            return (
              <div className="sales-channel-row" key={channel.name}>
                <span>{channel.name}</span>
                <div className="sales-channel-track"><i style={{ width: `${share ?? 0}%` }} /></div>
                <div className="sales-channel-values">
                  <strong>{formatShare(share)}</strong>
                  <small>{formatNumber(channel.bookings)} rez.</small>
                  <b>{formatCurrency(channel.revenue)}</b>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="sales-report-section">
        <div className="sales-section-heading">
          <div><span className="eyebrow">DIRECT VS OTA</span><h2>Jak dzieli się sprzedaż bezpośrednia i pośrednia?</h2></div>
        </div>
        <div className="direct-ota-visual" aria-label={`Direct ${formatShare(directBookingShare)}, OTA ${formatShare(otaBookingShare)}`} role="img">
          <span className="direct" style={{ width: `${directBookingShare ?? 0}%` }} />
          <span className="ota" style={{ width: `${otaBookingShare ?? 0}%` }} />
        </div>
        <div className="direct-ota-metrics">
          <div><span>Direct · rezerwacje</span><strong>{formatShare(directBookingShare)}</strong></div>
          <div><span>OTA · rezerwacje</span><strong>{formatShare(otaBookingShare)}</strong></div>
          <div><span>Direct · przychód</span><strong>{formatShare(directRevenueShare)}</strong></div>
          <div><span>OTA · przychód</span><strong>{formatShare(otaRevenueShare)}</strong></div>
        </div>
        <p className="sales-context-comment">
          {directOtaDiagnostic?.client_text
            ?? `Direct odpowiada za ${formatShare(directBookingShare)} rezerwacji, a OTA za ${formatShare(otaBookingShare)} aktywnej sprzedaży online.`}
        </p>
      </section>

      <section className="sales-report-section">
        <div className="sales-section-heading">
          <div><span className="eyebrow">WARTOŚĆ REZERWACJI</span><h2>Jaka jest wartość rezerwacji?</h2></div>
        </div>
        <div className="booking-value-columns">
          <article><span>Ogółem</span><strong>{formatNullableCurrency(currentAverage)}</strong><small>średnia wartość aktywnej rezerwacji online</small></article>
          <article><span>Direct</span><strong>{formatNullableCurrency(directAverage)}</strong><small>średnia wartość aktywnej rezerwacji bezpośredniej</small></article>
          <article><span>OTA</span><strong>{formatNullableCurrency(otaAverage)}</strong><small>średnia wartość aktywnej rezerwacji z OTA</small></article>
        </div>
      </section>

      <section className="sales-report-section">
        <div className="sales-section-heading">
          <div><span className="eyebrow">CO SIĘ ZMIENIŁO?</span><h2>Najważniejsze sygnały sprzedażowe</h2></div>
        </div>
        {salesStructureDiagnostics.length > 0 ? (
          <div className="sales-diagnoses">
            {salesStructureDiagnostics.map((diagnostic) => {
              const severity = severityPresentation(diagnostic.severity);
              return (
                <article key={`${diagnostic.code}-${diagnostic.scope_id ?? "hotel"}`}>
                  <div><span className={`status ${severity.tone}`}>{severity.label}</span><small>Pewność: {confidencePresentation(diagnostic.confidence)}</small></div>
                  <p>{firstSentence(diagnostic.client_text)}</p>
                </article>
              );
            })}
          </div>
        ) : <p className="sales-empty">Brak istotnej zmiany w strukturze sprzedaży dla tego okresu.</p>}
      </section>

      <section className="sales-report-section">
        <div className="sales-section-heading">
          <div><span className="eyebrow">CO WARTO SPRAWDZIĆ?</span><h2>Priorytety sprzedażowe</h2></div>
        </div>
        {salesRecommendations.length > 0 ? (
          <ol className="sales-recommendations">
            {salesRecommendations.map((recommendation, index) => (
              <li key={`${recommendation.code}-${recommendation.scope_id ?? index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{actionSentence(recommendation.client_text)}</p>
              </li>
            ))}
          </ol>
        ) : <p className="sales-empty">Brak dodatkowych rekomendacji sprzedażowych dla tego okresu.</p>}
      </section>

      <aside className={`sales-data-note${incompleteProfitroom ? " warning" : ""}`}>
        <span>Dane sprzedażowe dostępne do: {current.profitroom_data_through ? formatDate(current.profitroom_data_through) : "brak informacji"}</span>
        {incompleteProfitroom && <p>{firstSentence(incompleteProfitroom.client_text)}</p>}
      </aside>
    </div>
  );
}

function FunnelView({ diagnostics }: { diagnostics: DiagnosticsResponse }) {
  const { input, result } = diagnostics;
  const current = input.current.ga4;
  const comparison = input.comparison.ga4;
  const funnelDiagnostics = result.diagnostics.filter(
    (diagnostic) => diagnostic.family === "FUNNEL",
  );
  const trackingMismatch = result.diagnostics.find(
    (diagnostic) => diagnostic.code === "TRACKING_MISMATCH",
  );
  const step3ToPurchaseDiagnostic = result.diagnostics.find(
    (diagnostic) => diagnostic.code === "STEP3_TO_PURCHASE_WEAK",
  );
  const offerInterest = calculateShare(current.view_offer_or_room, current.sessions);
  const step1Entry = calculateShare(current.step1, current.sessions);
  const transitions = [
    {
      code: "STEP1_TO_STEP2_WEAK",
      label: "Step 1 → Step 2",
      current: calculateShare(current.step2, current.step1),
      comparison: calculateShare(comparison.step2, comparison.step1),
    },
    {
      code: "STEP2_TO_STEP3_WEAK",
      label: "Step 2 → Step 3",
      current: calculateShare(current.step3, current.step2),
      comparison: calculateShare(comparison.step3, comparison.step2),
    },
    {
      code: "STEP3_TO_PURCHASE_WEAK",
      label: "Step 3 → Purchase",
      current: calculateShare(current.ga4_unique_purchases, current.step3),
      comparison: calculateShare(comparison.ga4_unique_purchases, comparison.step3),
    },
  ];
  const comparisonOfferInterest = calculateShare(comparison.view_offer_or_room, comparison.sessions);
  const comparisonStep1Entry = calculateShare(comparison.step1, comparison.sessions);
  const visibleFunnelInsights = funnelDiagnostics.filter(
    (diagnostic) => diagnostic.status === "ACTIVE" || diagnostic.status === "WATCH",
  ).slice(0, 2);
  const middleDiagnostic = funnelDiagnostics.find(
    (diagnostic) =>
      ["STEP1_TO_STEP2_WEAK", "STEP2_TO_STEP3_WEAK"].includes(diagnostic.code) &&
      diagnostic.status === "ACTIVE",
  ) ?? funnelDiagnostics.find(
    (diagnostic) =>
      ["STEP1_TO_STEP2_WEAK", "STEP2_TO_STEP3_WEAK"].includes(diagnostic.code) &&
      diagnostic.status === "WATCH",
  );
  const endDiagnostic = funnelDiagnostics.find(
    (diagnostic) => diagnostic.code === "STEP3_TO_PURCHASE_WEAK" && diagnostic.status === "ACTIVE",
  ) ?? funnelDiagnostics.find(
    (diagnostic) => diagnostic.code === "STEP3_TO_PURCHASE_WEAK" && diagnostic.status === "WATCH",
  );
  const middleStatus = middleDiagnostic?.status === "ACTIVE"
    ? "PROBLEM"
    : middleDiagnostic?.status === "WATCH"
      ? "WYMAGA UWAGI"
      : "BEZ AKTYWNEGO PROBLEMU";
  const endStatus = endDiagnostic?.status === "ACTIVE"
    ? "PROBLEM"
    : endDiagnostic?.status === "WATCH"
      ? "WYMAGA UWAGI"
      : "BEZ AKTYWNEGO PROBLEMU";
  const trackingLimitsEnd = Boolean(trackingMismatch || step3ToPurchaseDiagnostic?.blocking_diagnostic);
  const phaseAction = (diagnostic: RankedDiagnostic | undefined) => {
    if (!diagnostic) return "Silnik nie wskazał działania dla tego etapu.";
    const recommendation = result.recommendations.find(
      (item) => item.code === diagnostic.code || item.recommendation_code === diagnostic.recommendation_code,
    );
    return actionSentence((recommendation ?? diagnostic).client_text);
  };
  const insightHeadlines: Partial<Record<RankedDiagnostic["code"], string>> = {
    STEP1_TO_STEP2_WEAK: "Przejście do Step 2 wymaga uwagi",
    STEP2_TO_STEP3_WEAK: "Przejście do Step 3 wymaga uwagi",
    STEP3_TO_PURCHASE_WEAK: "Końcówka lejka wymaga uwagi",
  };
  const funnelRecommendations = result.recommendations.filter(
    (recommendation) => recommendation.family === "FUNNEL" || recommendation.code === "TRACKING_MISMATCH",
  ).slice(0, 3);

  return (
    <div className="funnel-v2">
      <section className="funnel-v2-hero">
        <span className="eyebrow">LEJEK REZERWACYJNY</span>
        <h1>Gdzie tracimy użytkowników w procesie rezerwacji?</h1>
        <p>Trzy części ścieżki rezerwacyjnej na tle poprzedniego okresu.</p>
      </section>

      <section className="funnel-v2-section">
        <div className="funnel-v2-heading">
          <span className="eyebrow">POCZĄTEK / ŚRODEK / KONIEC</span>
          <h2>Ścieżka w trzech krokach</h2>
        </div>
        <div className="funnel-v2-phases">
          <article className="tone-neutral">
            <div className="funnel-v2-phase-intro">
              <span className="funnel-v2-phase-label">01 · POCZĄTEK</span>
              <h3>Czy ruch wchodzi w proces?</h3>
              <span className="funnel-v2-phase-status">BEZ AKTYWNEGO PROBLEMU</span>
            </div>
            <div className="funnel-v2-phase-result">
              <strong>{formatShare(step1Entry)}</strong>
              <span>Step 1 ÷ sesje</span>
              <small>Poprzednio {formatShare(comparisonStep1Entry)} · {formatShareChange(step1Entry, comparisonStep1Entry)}</small>
            </div>
            <div className="funnel-v2-phase-secondary">
              <span>Oferta / pokój ÷ sesje</span>
              <strong>{formatShare(offerInterest)}</strong>
              <small>poprzednio {formatShare(comparisonOfferInterest)} · {formatShareChange(offerInterest, comparisonOfferInterest)}</small>
            </div>
            <div className="funnel-v2-phase-explanation">
              <p><b>Co to znaczy?</b> Silnik nie zwrócił aktywnej diagnozy dla początku ścieżki.</p>
              <p><b>Co sprawdzić?</b> Silnik nie wskazał działania dla tego etapu.</p>
            </div>
          </article>
          <article className={`tone-${middleDiagnostic?.status === "ACTIVE" ? "negative" : middleDiagnostic?.status === "WATCH" ? "warning" : "neutral"}`}>
            <div className="funnel-v2-phase-intro">
              <span className="funnel-v2-phase-label">02 · ŚRODEK</span>
              <h3>Czy użytkownicy odpadają w trakcie?</h3>
              <span className="funnel-v2-phase-status">{middleStatus}</span>
            </div>
            <div className="funnel-v2-phase-result">
              <strong>{formatShare(transitions[0].current)}</strong>
              <span>Step 1 → Step 2</span>
              <small>Poprzednio {formatShare(transitions[0].comparison)} · {formatShareChange(transitions[0].current, transitions[0].comparison)}</small>
            </div>
            <div className="funnel-v2-phase-secondary">
              <span>Step 2 → Step 3</span>
              <strong>{formatShare(transitions[1].current)}</strong>
              <small>poprzednio {formatShare(transitions[1].comparison)} · {formatShareChange(transitions[1].current, transitions[1].comparison)}</small>
            </div>
            <div className="funnel-v2-phase-explanation">
              <p><b>Co to znaczy?</b> {middleDiagnostic?.evidence[0] ?? "Silnik nie zwrócił aktywnej diagnozy dla środka ścieżki."}</p>
              <p><b>Co sprawdzić?</b> {phaseAction(middleDiagnostic)}</p>
            </div>
          </article>
          <article className={`tone-${endDiagnostic?.status === "ACTIVE" ? "negative" : endDiagnostic?.status === "WATCH" ? "warning" : "neutral"}`}>
            <div className="funnel-v2-phase-intro">
              <span className="funnel-v2-phase-label">03 · KONIEC</span>
              <h3>Czy użytkownicy finalizują?</h3>
              <span className="funnel-v2-phase-status">{endStatus}</span>
            </div>
            <div className="funnel-v2-phase-result">
              <strong>{formatShare(transitions[2].current)}</strong>
              <span>Step 3 → Purchase</span>
              <small>Poprzednio {formatShare(transitions[2].comparison)} · {formatShareChange(transitions[2].current, transitions[2].comparison)}</small>
            </div>
            <div className="funnel-v2-phase-secondary">
              <span>Step 3 · Purchase w GA4</span>
              <strong>{formatNumber(current.step3)} → {formatNumber(current.ga4_unique_purchases)}</strong>
            </div>
            <div className="funnel-v2-phase-explanation">
              <p><b>Co to znaczy?</b> {endDiagnostic?.evidence[0] ?? "Silnik nie zwrócił aktywnej diagnozy dla końca ścieżki."}</p>
              <p><b>Co sprawdzić?</b> {phaseAction(endDiagnostic)}</p>
              {trackingLimitsEnd && <small>Najpierw sprawdź tracking końca ścieżki.</small>}
            </div>
          </article>
        </div>
        <p className="funnel-v2-note">
          Purchase w GA4 opisuje zachowanie użytkowników. Profitroom pozostaje źródłem potwierdzonej sprzedaży hotelu.
        </p>
      </section>

      <section className="funnel-v2-section">
        <div className="funnel-v2-heading">
          <span className="eyebrow">DIAGNOZY LEJKA</span>
          <h2>Co potwierdził silnik diagnostyczny?</h2>
        </div>
        {visibleFunnelInsights.length > 0 ? (
          <div className="funnel-v2-insights">
            {visibleFunnelInsights.map((diagnostic) => {
              const severity = severityPresentation(diagnostic.severity);
              return (
                <article className={`tone-${diagnostic.status === "WATCH" ? "warning" : severity.tone}`} key={`${diagnostic.code}-${diagnostic.scope_id ?? "hotel"}`}>
                  <span className="eyebrow">
                    {diagnostic.status === "WATCH" ? "SYGNAŁ DO OBSERWACJI" : "PROBLEM POTWIERDZONY"}
                  </span>
                  <h3>{insightHeadlines[diagnostic.code] ?? "Sygnał z lejka rezerwacyjnego"}</h3>
                  <p>{firstSentence(diagnostic.client_text)}</p>
                  <small>Pewność: {confidencePresentation(diagnostic.confidence)} · {severity.label}</small>
                </article>
              );
            })}
          </div>
        ) : <p className="funnel-v2-empty">Brak aktywnej diagnozy lejka dla tego okresu.</p>}
      </section>

      <section className="funnel-v2-section">
        <div className="funnel-v2-heading">
          <span className="eyebrow">NAJBLIŻSZE DZIAŁANIA</span>
          <h2>Co zrobić teraz?</h2>
        </div>
        {funnelRecommendations.length > 0 ? (
          <ol className="funnel-v2-actions">
            {funnelRecommendations.map((recommendation, index) => (
              <li key={`${recommendation.code}-${recommendation.scope_id ?? index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{actionSentence(recommendation.client_text)}</p>
              </li>
            ))}
          </ol>
        ) : <p className="funnel-v2-empty">Brak dodatkowych rekomendacji dotyczących lejka.</p>}
      </section>
    </div>
  );
}

function MetaAdsView({ diagnostics }: { diagnostics: DiagnosticsResponse }) {
  const { input, result } = diagnostics;
  const current = input.current.meta;
  const comparison = input.comparison.meta;
  const metaCampaigns = diagnostics.meta_detail?.campaigns ?? [];
  const resultMetrics = [
    { label: "Wydatki", current: current.spend, comparison: comparison.spend, format: formatCurrency },
    { label: "Wyświetlenia", current: current.impressions, comparison: comparison.impressions, format: formatNumber },
    { label: "Kliknięcia", current: current.clicks, comparison: comparison.clicks, format: formatNumber },
    {
      label: "Konwersje raportowane przez Meta",
      current: current.platform_conversions,
      comparison: comparison.platform_conversions,
      format: formatNumber,
    },
    {
      label: "Wartość konwersji raportowana przez Meta",
      current: current.attributed_conversion_value,
      comparison: comparison.attributed_conversion_value,
      format: formatCurrency,
    },
  ];
  const currentCtr = calculateShare(current.clicks, current.impressions);
  const comparisonCtr = calculateShare(comparison.clicks, comparison.impressions);
  const currentCpc = calculateRatio(current.spend, current.clicks);
  const comparisonCpc = calculateRatio(comparison.spend, comparison.clicks);
  const currentRoas = calculateRatio(current.attributed_conversion_value, current.spend);
  const comparisonRoas = calculateRatio(
    comparison.attributed_conversion_value,
    comparison.spend,
  );
  const currentCostPerConversion = calculateRatio(
    current.spend,
    current.platform_conversions,
  );
  const comparisonCostPerConversion = calculateRatio(
    comparison.spend,
    comparison.platform_conversions,
  );
  const efficiencyMetrics = [
    { label: "CTR", current: currentCtr, comparison: comparisonCtr, format: formatShare },
    { label: "CPC", current: currentCpc, comparison: comparisonCpc, format: formatNullableCurrency },
    { label: "Platform ROAS", current: currentRoas, comparison: comparisonRoas, format: formatMultiplier },
    {
      label: "Koszt konwersji platformowej",
      current: currentCostPerConversion,
      comparison: comparisonCostPerConversion,
      format: formatNullableCurrency,
    },
  ];
  const roleCodes: RankedDiagnostic["code"][] = ["DEMAND_GENERATOR", "ASSISTER", "CLOSER"];
  const channelRoleDiagnostics = result.diagnostics.filter(
    (diagnostic) => roleCodes.includes(diagnostic.code),
  );
  const trackingMismatch = result.diagnostics.find(
    (diagnostic) => diagnostic.code === "TRACKING_MISMATCH",
  );
  const comparisonMetrics = [
    { label: "Wydatki", current: current.spend, comparison: comparison.spend, format: formatCurrency },
    { label: "Kliknięcia", current: current.clicks, comparison: comparison.clicks, format: formatNumber },
    {
      label: "Konwersje raportowane przez Meta",
      current: current.platform_conversions,
      comparison: comparison.platform_conversions,
      format: formatNumber,
    },
    {
      label: "Wartość konwersji raportowana przez Meta",
      current: current.attributed_conversion_value,
      comparison: comparison.attributed_conversion_value,
      format: formatCurrency,
    },
  ];

  return (
    <div>
      <section className="dashboard-section" style={{ paddingTop: 0 }}>
        <div className="section-title">
          <div>
            <span className="eyebrow">WYNIKI META ADS</span>
            <h2>Co raportuje platforma reklamowa?</h2>
          </div>
        </div>

        <div className="sales-channels">
          {resultMetrics.map((metric) => (
            <article key={metric.label}>
              <div><span>{metric.label}</span></div>
              <strong>{metric.format(metric.current)}</strong>
              <p>Poprzednio: {metric.format(metric.comparison)}</p>
              <p>Zmiana: {formatPercentChange(metric.current, metric.comparison)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">EFEKTYWNOŚĆ PLATFORMOWA</span>
            <h2>Podstawowe wskaźniki Meta Ads</h2>
          </div>
        </div>

        <div className="metrics">
          {efficiencyMetrics.map((metric) => (
            <article className="metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.format(metric.current)}</strong>
              <div><small>poprzednio {metric.format(metric.comparison)}</small></div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section meta-campaigns-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">KAMPANIE I REKLAMY</span>
            <h2>Kampanie Meta Ads</h2>
          </div>
        </div>

        {metaCampaigns.length > 0 ? (
          <div className="meta-campaign-list">
            {metaCampaigns.map((campaign) => (
              <article className="meta-campaign" key={campaign.campaign_id}>
                <header className="meta-campaign-header">
                  <div>
                    <span className="eyebrow">KAMPANIA</span>
                    <h3>{campaign.campaign_name}</h3>
                  </div>
                  <dl className="meta-campaign-metrics">
                    <div><dt>Wydatki</dt><dd>{formatCurrency(campaign.metrics.spend)}</dd></div>
                    <div><dt>Kliknięcia</dt><dd>{formatNumber(campaign.metrics.clicks)}</dd></div>
                    <div><dt>Landing page views</dt><dd>{formatNumber(campaign.metrics.landing_page_views)}</dd></div>
                    <div><dt>Konwersje platformowe</dt><dd>{formatNumber(campaign.metrics.platform_conversions)}</dd></div>
                    <div><dt>Platform ROAS</dt><dd>{formatMultiplier(campaign.metrics.platform_roas)}</dd></div>
                  </dl>
                </header>

                <div className="meta-ad-list">
                  <span className="meta-ad-list-label">REKLAMY</span>
                  {campaign.ads.map((ad, index) => (
                    <div className="meta-ad-row" key={ad.ad_id}>
                      <div className="meta-ad-copy">
                        <span className="meta-ad-index">{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <h4>{ad.ad_name}</h4>
                          <small>{ad.adset_name}</small>
                          {ad.headline && <strong>{ad.headline}</strong>}
                          {ad.primary_text && <p>{ad.primary_text}</p>}
                        </div>
                      </div>
                      <dl className="meta-ad-metrics">
                        <div><dt>Wydatki</dt><dd>{formatCurrency(ad.metrics.spend)}</dd></div>
                        <div><dt>Kliknięcia</dt><dd>{formatNumber(ad.metrics.clicks)}</dd></div>
                        <div><dt>LPV</dt><dd>{formatNumber(ad.metrics.landing_page_views)}</dd></div>
                        <div><dt>CTR</dt><dd>{formatShare(ad.metrics.ctr)}</dd></div>
                        <div><dt>Konwersje</dt><dd>{formatNumber(ad.metrics.platform_conversions)}</dd></div>
                        <div><dt>ROAS</dt><dd>{formatMultiplier(ad.metrics.platform_roas)}</dd></div>
                      </dl>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="meta-campaign-empty">Brak danych kampanii Meta Ads dla wybranego okresu.</p>
        )}

        <p className="meta-campaign-note">
          Konwersje i ROAS są raportowane przez Meta Ads. Profitroom pozostaje źródłem potwierdzonej sprzedaży hotelu.
        </p>
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">KONTEKST ROLI KANAŁÓW</span>
            <h2>Sygnały dotyczące roli kanałów w całej ścieżce rezerwacyjnej</h2>
          </div>
        </div>

        <p className="context-note">
          Obecna wersja silnika określa rolę na poziomie całej ścieżki hotelu. Wyniku nie należy jeszcze interpretować jako roli przypisanej wyłącznie do Meta Ads.
        </p>

        {channelRoleDiagnostics.length > 0 ? (
          <div className="insights">
            {channelRoleDiagnostics.map((diagnostic, index) => {
              const severity = severityPresentation(diagnostic.severity);

              return (
                <article key={`${diagnostic.code}-${diagnostic.scope_id ?? index}`}>
                  <span className="number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <TechnicalLabel>{diagnostic.code}</TechnicalLabel>
                    <h3>{diagnostic.client_text}</h3>
                    <span className={`status ${severity.tone}`}>{severity.label}</span>
                    <p>Pewność: {confidencePresentation(diagnostic.confidence)}</p>
                    <p>Status: {diagnosticStatusPresentation(diagnostic.status)}</p>
                    <EvidenceList evidence={diagnostic.evidence} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <article className="layer-card">
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Backend nie zwrócił roli kanału dla tego okresu.
            </p>
          </article>
        )}
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">KONTEKST SPRZEDAŻOWY</span>
            <h2>Jak interpretować dane platformowe?</h2>
          </div>
        </div>

        <p className="context-note">
          Wartość i konwersje Meta Ads są danymi raportowanymi przez platformę reklamową. Profitroom pozostaje źródłem potwierdzonej sprzedaży hotelu.
        </p>

        {trackingMismatch && (
          <article className="diagnosis-card compact-card">
            <div className="diagnosis-icon">!</div>
            <div>
              <TechnicalLabel>{trackingMismatch.code}</TechnicalLabel>
              <h3>{trackingMismatch.client_text}</h3>
            </div>
          </article>
        )}
      </section>

      <section className="dashboard-section" style={{ borderBottom: 0 }}>
        <div className="section-title">
          <div>
            <span className="eyebrow">ZMIANA WYNIKÓW</span>
            <h2>Neutralne porównanie okresów</h2>
          </div>
        </div>

        <article className="layer-card">
          <div style={{ display: "grid", gap: 0 }}>
            {comparisonMetrics.map((metric) => (
              <div
                key={metric.label}
                style={{
                  alignItems: "center",
                  borderBottom: "1px solid var(--line)",
                  display: "grid",
                  gap: 14,
                  gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
                  padding: "14px 0",
                }}
              >
                <strong style={{ fontSize: 12 }}>{metric.label}</strong>
                <span>{metric.format(metric.current)}</span>
                <span style={{ color: "var(--muted)" }}>{metric.format(metric.comparison)}</span>
                <span>{formatPercentChange(metric.current, metric.comparison)}</span>
              </div>
            ))}
            <div
              style={{
                alignItems: "center",
                display: "grid",
                gap: 14,
                gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
                padding: "14px 0 0",
              }}
            >
              <strong style={{ fontSize: 12 }}>Platform ROAS</strong>
              <span>{formatMultiplier(currentRoas)}</span>
              <span style={{ color: "var(--muted)" }}>{formatMultiplier(comparisonRoas)}</span>
              <span>{formatRelativeRateChange(currentRoas, comparisonRoas)}</span>
            </div>
          </div>
          <p className="definition-note">
            Zmiany pokazują różnicę między okresami. Ocena ich znaczenia pochodzi wyłącznie z diagnoz backendu.
          </p>
        </article>
      </section>
    </div>
  );
}

function GoogleAdsView({ diagnostics }: { diagnostics: DiagnosticsResponse }) {
  const { input, result } = diagnostics;
  const current = input.current.google_ads;
  const comparison = input.comparison.google_ads;
  const googleCampaigns = diagnostics.google_ads_detail?.campaigns ?? [];
  const resultMetrics = [
    { label: "Koszt", current: current.cost, comparison: comparison.cost, format: formatCurrency },
    { label: "Wyświetlenia", current: current.impressions, comparison: comparison.impressions, format: formatNumber },
    { label: "Kliknięcia", current: current.clicks, comparison: comparison.clicks, format: formatNumber },
    {
      label: "Konwersje raportowane przez Google Ads",
      current: current.conversions,
      comparison: comparison.conversions,
      format: formatNumber,
    },
    {
      label: "Wartość konwersji raportowana przez Google Ads",
      current: current.conversion_value,
      comparison: comparison.conversion_value,
      format: formatCurrency,
    },
  ];
  const currentCtr = calculateShare(current.clicks, current.impressions);
  const comparisonCtr = calculateShare(comparison.clicks, comparison.impressions);
  const currentCpc = calculateRatio(current.cost, current.clicks);
  const comparisonCpc = calculateRatio(comparison.cost, comparison.clicks);
  const currentRoas = calculateRatio(current.conversion_value, current.cost);
  const comparisonRoas = calculateRatio(comparison.conversion_value, comparison.cost);
  const currentCostPerConversion = calculateRatio(current.cost, current.conversions);
  const comparisonCostPerConversion = calculateRatio(
    comparison.cost,
    comparison.conversions,
  );
  const efficiencyMetrics = [
    { label: "CTR", current: currentCtr, comparison: comparisonCtr, format: formatShare },
    { label: "CPC", current: currentCpc, comparison: comparisonCpc, format: formatNullableCurrency },
    { label: "Platform ROAS", current: currentRoas, comparison: comparisonRoas, format: formatMultiplier },
    {
      label: "Koszt konwersji platformowej",
      current: currentCostPerConversion,
      comparison: comparisonCostPerConversion,
      format: formatNullableCurrency,
    },
  ];
  const hasCurrentClickSplit =
    typeof current.brand_clicks === "number"
    && typeof current.generic_clicks === "number";
  const hasComparisonClickSplit =
    typeof comparison.brand_clicks === "number"
    && typeof comparison.generic_clicks === "number";
  const roleCodes: RankedDiagnostic["code"][] = ["DEMAND_GENERATOR", "ASSISTER", "CLOSER"];
  const channelRoleDiagnostics = result.diagnostics.filter(
    (diagnostic) => roleCodes.includes(diagnostic.code),
  );
  const trackingMismatch = result.diagnostics.find(
    (diagnostic) => diagnostic.code === "TRACKING_MISMATCH",
  );

  return (
    <div>
      <section className="dashboard-section" style={{ paddingTop: 0 }}>
        <div className="section-title">
          <div>
            <span className="eyebrow">WYNIKI GOOGLE ADS</span>
            <h2>Co raportuje platforma reklamowa?</h2>
          </div>
        </div>

        <div className="sales-channels">
          {resultMetrics.map((metric) => (
            <article key={metric.label}>
              <div><span>{metric.label}</span></div>
              <strong>{metric.format(metric.current)}</strong>
              <p>Poprzednio: {metric.format(metric.comparison)}</p>
              <p>Zmiana: {formatPercentChange(metric.current, metric.comparison)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section google-campaigns-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">KAMPANIE</span>
            <h2>Kampanie Google Ads</h2>
          </div>
        </div>

        {googleCampaigns.length > 0 ? (
          <div className="google-campaign-list">
            {googleCampaigns.map((campaign) => (
              <article className="google-campaign" key={campaign.campaign_id}>
                <header className="google-campaign-header">
                  <div className="google-campaign-identity">
                    <span className="eyebrow">KAMPANIA</span>
                    <div className="google-campaign-title">
                      <h3>{campaign.campaign_name}</h3>
                      {campaign.segment && (
                        <span className="google-campaign-segment">{campaign.segment}</span>
                      )}
                    </div>
                  </div>
                  <dl className="google-campaign-metrics">
                    <div><dt>Koszt</dt><dd>{formatCurrency(campaign.metrics.cost)}</dd></div>
                    <div><dt>Kliknięcia</dt><dd>{formatNumber(campaign.metrics.clicks)}</dd></div>
                    <div><dt>Konwersje platformowe</dt><dd>{formatNumber(campaign.metrics.conversions)}</dd></div>
                    <div><dt>Platform ROAS</dt><dd>{formatMultiplier(campaign.metrics.platform_roas)}</dd></div>
                    <div><dt>Wartość konwersji</dt><dd>{formatCurrency(campaign.metrics.conversion_value)}</dd></div>
                  </dl>
                </header>
                <div className="google-campaign-details">
                  <span className="google-campaign-details-label">SZCZEGÓŁY KAMPANII</span>
                  <dl>
                    <div><dt>Wyświetlenia</dt><dd>{formatNumber(campaign.metrics.impressions)}</dd></div>
                    <div><dt>CTR</dt><dd>{formatShare(campaign.metrics.ctr)}</dd></div>
                    <div><dt>CPC</dt><dd>{formatNullableCurrency(campaign.metrics.cpc)}</dd></div>
                    <div>
                      <dt>Typ kampanii</dt>
                      <dd className="google-campaign-type">
                        {campaign.campaign_type ?? "—"}
                      </dd>
                    </div>
                    <div><dt>Status</dt><dd>{campaign.status ?? "—"}</dd></div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="google-campaign-empty">Brak danych kampanii Google Ads dla wybranego okresu.</p>
        )}

        <p className="google-campaign-note">
          Dane są dostępne na poziomie kampanii. Konwersje raportuje Google Ads; Profitroom pozostaje źródłem potwierdzonej sprzedaży hotelu.
        </p>
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">EFEKTYWNOŚĆ PLATFORMOWA</span>
            <h2>Podstawowe wskaźniki Google Ads</h2>
          </div>
        </div>

        <div className="metrics">
          {efficiencyMetrics.map((metric) => (
            <article className="metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.format(metric.current)}</strong>
              <div><small>poprzednio {metric.format(metric.comparison)}</small></div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">BRAND VS GENERIC</span>
            <h2>Aktualny podział kliknięć</h2>
          </div>
        </div>

        {hasCurrentClickSplit ? (
          <div className="two-col">
            <article className="layer-card">
              <span className="eyebrow">BRAND</span>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: 25, fontWeight: 500, margin: "8px 0" }}>
                {formatNumber(current.brand_clicks ?? 0)} kliknięć
              </h3>
              <p>Udział we wszystkich kliknięciach: {formatShare(calculateShare(current.brand_clicks ?? 0, current.clicks))}</p>
              <p>
                Zmiana vs poprzedni okres: {hasComparisonClickSplit
                  ? formatPercentChange(current.brand_clicks ?? 0, comparison.brand_clicks ?? 0)
                  : "—"}
              </p>
            </article>
            <article className="layer-card">
              <span className="eyebrow">GENERIC</span>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: 25, fontWeight: 500, margin: "8px 0" }}>
                {formatNumber(current.generic_clicks ?? 0)} kliknięć
              </h3>
              <p>Udział we wszystkich kliknięciach: {formatShare(calculateShare(current.generic_clicks ?? 0, current.clicks))}</p>
              <p>
                Zmiana vs poprzedni okres: {hasComparisonClickSplit
                  ? formatPercentChange(current.generic_clicks ?? 0, comparison.generic_clicks ?? 0)
                  : "—"}
              </p>
            </article>
          </div>
        ) : (
          <article className="layer-card">
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Podział kliknięć Brand i Generic nie jest dostępny dla tego okresu.
            </p>
          </article>
        )}

        <p className="definition-note">
          To aktualny podział dostępny w danych Google Ads. Sam udział kliknięć nie stanowi oceny jakości kanału.
        </p>
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">KONTEKST ROLI KANAŁÓW</span>
            <h2>Sygnały dotyczące roli kanałów w całej ścieżce rezerwacyjnej</h2>
          </div>
        </div>

        <p className="context-note">
          Obecna wersja silnika określa rolę na poziomie całej ścieżki hotelu. Wyniku nie należy jeszcze interpretować jako roli przypisanej wyłącznie do Google Ads.
        </p>

        {channelRoleDiagnostics.length > 0 ? (
          <div className="insights">
            {channelRoleDiagnostics.map((diagnostic, index) => {
              const severity = severityPresentation(diagnostic.severity);

              return (
                <article key={`${diagnostic.code}-${diagnostic.scope_id ?? index}`}>
                  <span className="number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <TechnicalLabel>{diagnostic.code}</TechnicalLabel>
                    <h3>{diagnostic.client_text}</h3>
                    <span className={`status ${severity.tone}`}>{severity.label}</span>
                    <p>Pewność: {confidencePresentation(diagnostic.confidence)}</p>
                    <p>Status: {diagnosticStatusPresentation(diagnostic.status)}</p>
                    <EvidenceList evidence={diagnostic.evidence} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <article className="layer-card">
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Backend nie zwrócił roli kanału dla tego okresu.
            </p>
          </article>
        )}
      </section>

      <section className="dashboard-section" style={{ borderBottom: 0 }}>
        <div className="section-title">
          <div>
            <span className="eyebrow">KONTEKST SPRZEDAŻOWY</span>
            <h2>Jak interpretować dane platformowe?</h2>
          </div>
        </div>

        <p className="context-note">
          Konwersje i wartość konwersji Google Ads są danymi raportowanymi przez platformę reklamową. Profitroom pozostaje źródłem potwierdzonej sprzedaży hotelu.
        </p>

        {trackingMismatch && (
          <article className="diagnosis-card compact-card">
            <div className="diagnosis-icon">!</div>
            <div>
              <TechnicalLabel>{trackingMismatch.code}</TechnicalLabel>
              <h3>{trackingMismatch.client_text}</h3>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}

function DataQualityView({ diagnostics }: { diagnostics: DiagnosticsResponse }) {
  const { input, result } = diagnostics;
  const dataQualityDiagnostics = result.diagnostics.filter(
    (diagnostic) => diagnostic.family === "DATA_QUALITY",
  );
  const activeDataQualityDiagnostics = dataQualityDiagnostics.filter(
    (diagnostic) => diagnostic.status === "ACTIVE",
  );
  const dataQualityWatch = result.watch.filter(
    (diagnostic) => diagnostic.family === "DATA_QUALITY",
  );
  const incompleteProfitroom = dataQualityDiagnostics.find(
    (diagnostic) =>
      diagnostic.code === "INCOMPLETE_PROFITROOM"
      && diagnostic.status === "ACTIVE",
  );
  const trackingMismatch = dataQualityDiagnostics.find(
    (diagnostic) =>
      diagnostic.code === "TRACKING_MISMATCH"
      && diagnostic.status === "ACTIVE",
  );
  const trackingBlockedDiagnostics = result.diagnostics.filter(
    (diagnostic) => diagnostic.blocking_diagnostic === "TRACKING_MISMATCH",
  );
  const dataThrough = input.current.profitroom.profitroom_data_through;
  const profitroomCoversPeriod = dataThrough
    ? dataThrough >= input.current.end_date
    : null;
  const hasQualityContext =
    result.limitations.length > 0
    || dataQualityWatch.length > 0
    || activeDataQualityDiagnostics.length > 0;

  function QualitySignal({ diagnostic }: { diagnostic: RankedDiagnostic }) {
    const severity = severityPresentation(diagnostic.severity);

    return (
      <article className="layer-card">
        <TechnicalLabel>{diagnostic.code}</TechnicalLabel>
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 500, margin: "8px 0" }}>
          {diagnostic.client_text}
        </h3>
        <span className={`status ${severity.tone}`}>{severity.label}</span>
        <p style={{ color: "var(--muted)", fontSize: 12, margin: "10px 0 0" }}>
          Pewność: {confidencePresentation(diagnostic.confidence)}
        </p>
      </article>
    );
  }

  return (
    <div>
      <section className="dashboard-section" style={{ paddingTop: 0 }}>
        <div className="section-title">
          <div>
            <span className="eyebrow">CZY DANE SĄ WYSTARCZAJĄCE DO ANALIZY?</span>
            <h2>Na ile można ufać temu raportowi?</h2>
          </div>
        </div>

        {!hasQualityContext ? (
          <article className="layer-card">
            <p style={{ margin: 0 }}>Dane dla tego okresu są wystarczające do podstawowej oceny.</p>
          </article>
        ) : (
          <div className="two-col">
            {result.limitations.map((diagnostic, index) => (
              <QualitySignal
                diagnostic={diagnostic}
                key={`limitation-${diagnostic.code}-${diagnostic.scope_id ?? "hotel"}-${index}`}
              />
            ))}
            {activeDataQualityDiagnostics
              .filter((diagnostic) => !result.limitations.includes(diagnostic))
              .map((diagnostic) => (
                <QualitySignal
                  diagnostic={diagnostic}
                  key={`active-${diagnostic.code}-${diagnostic.scope_id ?? "hotel"}`}
                />
              ))}
            {dataQualityWatch.map((diagnostic, index) => (
              <QualitySignal
                diagnostic={diagnostic}
                key={`watch-${diagnostic.code}-${diagnostic.scope_id ?? "hotel"}-${index}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">DIAGNOZY JAKOŚCI DANYCH</span>
            <h2>Co silnik wykrył w źródłach danych?</h2>
          </div>
        </div>

        {dataQualityDiagnostics.length > 0 ? (
          <div className="insights">
            {dataQualityDiagnostics.map((diagnostic, index) => {
              const severity = severityPresentation(diagnostic.severity);

              return (
                <article key={`${diagnostic.code}-${diagnostic.scope_id ?? index}`}>
                  <span className="number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <TechnicalLabel>{diagnostic.code}</TechnicalLabel>
                    <h3>{diagnostic.client_text}</h3>
                    <span className={`status ${severity.tone}`}>{severity.label}</span>
                    <p>Pewność: {confidencePresentation(diagnostic.confidence)}</p>
                    <p>Status: {diagnosticStatusPresentation(diagnostic.status)}</p>
                    <EvidenceList evidence={diagnostic.evidence} />
                    {diagnostic.blocking_diagnostic && (
                      <div style={{ marginTop: 10 }}>
                        <TechnicalLabel>
                          blocking_diagnostic: {diagnostic.blocking_diagnostic}
                        </TechnicalLabel>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <article className="layer-card">
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Backend nie zwrócił diagnoz jakości danych dla tego okresu.
            </p>
          </article>
        )}
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">KOMPLETNOŚĆ PROFITROOM</span>
            <h2>Czy dane sprzedażowe obejmują analizowany okres?</h2>
          </div>
        </div>

        <div className="metrics">
          <article className="metric">
            <span>Dane Profitroom dostępne do</span>
            <strong>{dataThrough ? formatDate(dataThrough) : "—"}</strong>
          </article>
          <article className="metric">
            <span>Koniec analizowanego okresu</span>
            <strong>{formatDate(input.current.end_date)}</strong>
          </article>
          <article className="metric">
            <span>Pokrycie całego okresu</span>
            <strong>
              {profitroomCoversPeriod === null
                ? "Brak informacji"
                : profitroomCoversPeriod
                  ? "Tak"
                  : "Nie"}
            </strong>
          </article>
        </div>

        {incompleteProfitroom && (
          <article className="diagnosis-card compact-card" style={{ marginTop: 18 }}>
            <div className="diagnosis-icon">!</div>
            <div>
              <TechnicalLabel>{incompleteProfitroom.code}</TechnicalLabel>
              <h3>{incompleteProfitroom.client_text}</h3>
            </div>
          </article>
        )}

        <p className="context-note">
          Brakujące dni w danych Profitroom oznaczają brak danych, a nie brak sprzedaży.
        </p>
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">TRACKING I KOŃCÓWKA LEJKA</span>
            <h2>Czy tracking ogranicza interpretację wyników?</h2>
          </div>
        </div>

        {trackingMismatch ? (
          <>
            <article className="diagnosis-card compact-card">
              <div className="diagnosis-icon">!</div>
              <div>
                <TechnicalLabel>{trackingMismatch.code}</TechnicalLabel>
                <h3>{trackingMismatch.client_text}</h3>
                <EvidenceList evidence={trackingMismatch.evidence} />
              </div>
            </article>

            <article className="layer-card" style={{ marginTop: 18 }}>
              <span className="eyebrow">OGRANICZONE DIAGNOZY</span>
              {trackingBlockedDiagnostics.length > 0 ? (
                trackingBlockedDiagnostics.map((diagnostic) => (
                  <div
                    key={`${diagnostic.code}-${diagnostic.scope_id ?? "hotel"}`}
                    style={{ borderTop: "1px solid var(--line)", padding: "14px 0" }}
                  >
                    <strong style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                      {diagnostic.client_text}
                    </strong>
                    <TechnicalLabel>{diagnostic.code}</TechnicalLabel>
                    <div>
                      <TechnicalLabel>
                        blocking_diagnostic: {diagnostic.blocking_diagnostic}
                      </TechnicalLabel>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 0 }}>
                  Backend nie wskazał diagnoz blokowanych przez ten problem.
                </p>
              )}
            </article>
          </>
        ) : (
          <article className="layer-card">
            <p style={{ margin: 0 }}>
              Silnik nie wykrył aktywnego problemu zgodności trackingu dla tego okresu.
            </p>
          </article>
        )}
      </section>

      <section className="dashboard-section" style={{ borderBottom: 0 }}>
        <div className="section-title">
          <div>
            <span className="eyebrow">DO OBSERWACJI</span>
            <h2>Sygnały, które warto śledzić</h2>
          </div>
        </div>

        {result.watch.length > 0 ? (
          <div className="two-col">
            {result.watch.map((diagnostic, index) => (
              <article
                className="layer-card"
                key={`${diagnostic.code}-${diagnostic.scope_id ?? "hotel"}-${index}`}
              >
                <TechnicalLabel>{diagnostic.code}</TechnicalLabel>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 500, margin: "8px 0" }}>
                  {diagnostic.client_text}
                </h3>
                <p style={{ color: "var(--muted)", fontSize: 12, margin: "10px 0 0" }}>
                  Pewność: {confidencePresentation(diagnostic.confidence)}
                </p>
                {diagnostic.blocking_diagnostic && (
                  <div style={{ marginTop: 8 }}>
                    <TechnicalLabel>
                      blocking_diagnostic: {diagnostic.blocking_diagnostic}
                    </TechnicalLabel>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <article className="layer-card">
            <p style={{ margin: 0 }}>Brak dodatkowych sygnałów wymagających obserwacji.</p>
          </article>
        )}
      </section>
    </div>
  );
}

function ChannelRoleView({ diagnostics }: { diagnostics: DiagnosticsResponse }) {
  const { input, result } = diagnostics;
  const currentMeta = input.current.meta;
  const comparisonMeta = input.comparison.meta;
  const currentGoogle = input.current.google_ads;
  const comparisonGoogle = input.comparison.google_ads;
  const currentGa4 = input.current.ga4;
  const comparisonGa4 = input.comparison.ga4;
  const currentProfitroom = input.current.profitroom;
  const comparisonProfitroom = input.comparison.profitroom;
  const roleCodes: RankedDiagnostic["code"][] = ["DEMAND_GENERATOR", "ASSISTER", "CLOSER"];
  const channelRoleDiagnostics = result.diagnostics.filter(
    (diagnostic) =>
      diagnostic.family === "CHANNEL_ROLE"
      && roleCodes.includes(diagnostic.code),
  );
  const currentMetaRoas = calculateRatio(
    currentMeta.attributed_conversion_value,
    currentMeta.spend,
  );
  const comparisonMetaRoas = calculateRatio(
    comparisonMeta.attributed_conversion_value,
    comparisonMeta.spend,
  );
  const currentGoogleRoas = calculateRatio(
    currentGoogle.conversion_value,
    currentGoogle.cost,
  );
  const comparisonGoogleRoas = calculateRatio(
    comparisonGoogle.conversion_value,
    comparisonGoogle.cost,
  );
  const metaMetrics = [
    { label: "Wydatki", current: currentMeta.spend, comparison: comparisonMeta.spend, format: formatCurrency },
    { label: "Kliknięcia", current: currentMeta.clicks, comparison: comparisonMeta.clicks, format: formatNumber },
    {
      label: "Konwersje raportowane przez Meta Ads",
      current: currentMeta.platform_conversions,
      comparison: comparisonMeta.platform_conversions,
      format: formatNumber,
    },
    {
      label: "Wartość konwersji raportowana przez Meta Ads",
      current: currentMeta.attributed_conversion_value,
      comparison: comparisonMeta.attributed_conversion_value,
      format: formatCurrency,
    },
  ];
  const googleMetrics = [
    { label: "Koszt", current: currentGoogle.cost, comparison: comparisonGoogle.cost, format: formatCurrency },
    { label: "Kliknięcia", current: currentGoogle.clicks, comparison: comparisonGoogle.clicks, format: formatNumber },
    {
      label: "Konwersje raportowane przez Google Ads",
      current: currentGoogle.conversions,
      comparison: comparisonGoogle.conversions,
      format: formatNumber,
    },
    {
      label: "Wartość konwersji raportowana przez Google Ads",
      current: currentGoogle.conversion_value,
      comparison: comparisonGoogle.conversion_value,
      format: formatCurrency,
    },
  ];
  const currentOtaBookings =
    currentProfitroom.booking_com_active_bookings
    + currentProfitroom.expedia_active_bookings
    + currentProfitroom.hrs_active_bookings
    + currentProfitroom.other_ota_active_bookings;
  const comparisonOtaBookings =
    comparisonProfitroom.booking_com_active_bookings
    + comparisonProfitroom.expedia_active_bookings
    + comparisonProfitroom.hrs_active_bookings
    + comparisonProfitroom.other_ota_active_bookings;
  const behaviorAndSalesMetrics = [
    { label: "GA4 — sesje", current: currentGa4.sessions, comparison: comparisonGa4.sessions, format: formatNumber },
    { label: "GA4 — Step 1", current: currentGa4.step1, comparison: comparisonGa4.step1, format: formatNumber },
    { label: "GA4 — Step 2", current: currentGa4.step2, comparison: comparisonGa4.step2, format: formatNumber },
    { label: "GA4 — Step 3", current: currentGa4.step3, comparison: comparisonGa4.step3, format: formatNumber },
    {
      label: "GA4 — Purchase",
      current: currentGa4.ga4_unique_purchases,
      comparison: comparisonGa4.ga4_unique_purchases,
      format: formatNumber,
    },
    {
      label: "Profitroom — aktywne rezerwacje online",
      current: currentProfitroom.active_online_bookings,
      comparison: comparisonProfitroom.active_online_bookings,
      format: formatNumber,
    },
    {
      label: "Profitroom — przychód online",
      current: currentProfitroom.active_online_revenue,
      comparison: comparisonProfitroom.active_online_revenue,
      format: formatCurrency,
    },
    {
      label: "Profitroom — aktywne rezerwacje Direct",
      current: currentProfitroom.direct_active_bookings,
      comparison: comparisonProfitroom.direct_active_bookings,
      format: formatNumber,
    },
    {
      label: "Profitroom — aktywne rezerwacje OTA",
      current: currentOtaBookings,
      comparison: comparisonOtaBookings,
      format: formatNumber,
    },
  ];
  const limitationCodes: RankedDiagnostic["code"][] = [
    "TRACKING_MISMATCH",
    "INCOMPLETE_PROFITROOM",
    "INSUFFICIENT_DATA",
  ];
  const interpretationLimitations = [
    ...result.diagnostics.filter((diagnostic) => limitationCodes.includes(diagnostic.code)),
    ...result.limitations,
  ].filter(
    (diagnostic, index, diagnosticsList) =>
      diagnosticsList.findIndex(
        (candidate) =>
          candidate.code === diagnostic.code
          && candidate.scope === diagnostic.scope
          && candidate.scope_id === diagnostic.scope_id
          && candidate.client_text === diagnostic.client_text,
      ) === index,
  );

  return (
    <div>
      <section className="dashboard-section" style={{ paddingTop: 0 }}>
        <div className="section-title">
          <div>
            <span className="eyebrow">JAKĄ ROLĘ PEŁNIĄ KANAŁY?</span>
            <h2>Sygnały z całej ścieżki rezerwacyjnej</h2>
          </div>
        </div>

        <p className="context-note">
          Obecna wersja silnika określa rolę na poziomie całej ścieżki hotelu. Wyniku nie należy jeszcze interpretować jako twardej atrybucji do pojedynczego kanału.
        </p>

        {channelRoleDiagnostics.length > 0 ? (
          <div className="insights">
            {channelRoleDiagnostics.map((diagnostic, index) => {
              const severity = severityPresentation(diagnostic.severity);

              return (
                <article key={`${diagnostic.code}-${diagnostic.scope_id ?? index}`}>
                  <span className="number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <TechnicalLabel>{diagnostic.code}</TechnicalLabel>
                    <h3>{diagnostic.client_text}</h3>
                    <span className={`status ${severity.tone}`}>{severity.label}</span>
                    <p>Pewność: {confidencePresentation(diagnostic.confidence)}</p>
                    <p>Status: {diagnosticStatusPresentation(diagnostic.status)}</p>
                    <EvidenceList evidence={diagnostic.evidence} />
                    {channelRoleReading[diagnostic.code] && (
                      <p className="channel-reading-note">{channelRoleReading[diagnostic.code]}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <article className="layer-card">
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Backend nie zwrócił roli kanałów dla tego okresu.
            </p>
          </article>
        )}
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">KONTEKST META ADS</span>
            <h2>Dane raportowane przez platformę Meta Ads</h2>
          </div>
        </div>

        <div className="sales-channels">
          {metaMetrics.map((metric) => (
            <article key={metric.label}>
              <div><span>{metric.label}</span></div>
              <strong>{metric.format(metric.current)}</strong>
              <p>Poprzednio: {metric.format(metric.comparison)}</p>
              <p>Zmiana: {formatPercentChange(metric.current, metric.comparison)}</p>
            </article>
          ))}
          <article>
            <div><span>Platform ROAS</span></div>
            <strong>{formatMultiplier(currentMetaRoas)}</strong>
            <p>Poprzednio: {formatMultiplier(comparisonMetaRoas)}</p>
            <p>Zmiana: {formatRelativeRateChange(currentMetaRoas, comparisonMetaRoas)}</p>
          </article>
        </div>

        <p className="context-note">
          To dane raportowane przez Meta Ads, a nie potwierdzona sprzedaż hotelu.
        </p>
        <p className="channel-reading-note">
          Meta może wspierać wcześniejszy kontakt z ofertą, zanim użytkownik przejdzie do rezerwacji. Niski ROAS platformowy nie dowodzi braku wpływu ani nie potwierdza go dla tego hotelu.
        </p>
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">KONTEKST GOOGLE ADS</span>
            <h2>Dane raportowane przez platformę Google Ads</h2>
          </div>
        </div>

        <div className="sales-channels">
          {googleMetrics.map((metric) => (
            <article key={metric.label}>
              <div><span>{metric.label}</span></div>
              <strong>{metric.format(metric.current)}</strong>
              <p>Poprzednio: {metric.format(metric.comparison)}</p>
              <p>Zmiana: {formatPercentChange(metric.current, metric.comparison)}</p>
            </article>
          ))}
          <article>
            <div><span>Platform ROAS</span></div>
            <strong>{formatMultiplier(currentGoogleRoas)}</strong>
            <p>Poprzednio: {formatMultiplier(comparisonGoogleRoas)}</p>
            <p>Zmiana: {formatRelativeRateChange(currentGoogleRoas, comparisonGoogleRoas)}</p>
          </article>
          {typeof currentGoogle.brand_clicks === "number" && (
            <article>
              <div><span>Brand clicks</span></div>
              <strong>{formatNumber(currentGoogle.brand_clicks)}</strong>
              <p>
                Poprzednio: {typeof comparisonGoogle.brand_clicks === "number"
                  ? formatNumber(comparisonGoogle.brand_clicks)
                  : "—"}
              </p>
            </article>
          )}
          {typeof currentGoogle.generic_clicks === "number" && (
            <article>
              <div><span>Generic clicks</span></div>
              <strong>{formatNumber(currentGoogle.generic_clicks)}</strong>
              <p>
                Poprzednio: {typeof comparisonGoogle.generic_clicks === "number"
                  ? formatNumber(comparisonGoogle.generic_clicks)
                  : "—"}
              </p>
            </article>
          )}
        </div>

        <p className="context-note">
          To dane raportowane przez Google Ads, a nie potwierdzona sprzedaż hotelu.
        </p>
        <p className="channel-reading-note">
          Google może przechwycić istniejącą intencję użytkownika. Konwersja raportowana przez platformę nie dowodzi, że Google samodzielnie wygenerował popyt lub potwierdzoną sprzedaż.
        </p>
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">KONTEKST ZACHOWANIA I SPRZEDAŻY</span>
            <h2>Co wydarzyło się na stronie i w sprzedaży?</h2>
          </div>
        </div>

        <div className="sales-channels">
          {behaviorAndSalesMetrics.map((metric) => (
            <article key={metric.label}>
              <div><span>{metric.label}</span></div>
              <strong>{metric.format(metric.current)}</strong>
              <p>Poprzednio: {metric.format(metric.comparison)}</p>
              <p>Zmiana: {formatPercentChange(metric.current, metric.comparison)}</p>
            </article>
          ))}
        </div>

        <p className="context-note">
          GA4 opisuje zachowanie użytkowników. Profitroom pozostaje źródłem potwierdzonej sprzedaży.
        </p>
        <div className="channel-reading-pair">
          <p className="channel-reading-note"><strong>Direct</strong> Booking Engine pokazuje finalizację sprzedaży bezpośredniej, ale nie całą wcześniejszą ścieżkę. Direct nie wskazuje, który kanał pierwotnie zbudował popyt.</p>
          <p className="channel-reading-note"><strong>OTA</strong> Gość może poznać hotel dzięki reklamie, a zarezerwować przez OTA. Taka rezerwacja nie dowodzi ani nie wyklucza wpływu marketingu.</p>
        </div>
      </section>

      <section className="dashboard-section" style={{ borderBottom: 0 }}>
        <div className="section-title">
          <div>
            <span className="eyebrow">OGRANICZENIA INTERPRETACJI</span>
            <h2>Co może ograniczać ocenę roli kanałów?</h2>
          </div>
        </div>

        {interpretationLimitations.length > 0 ? (
          <div className="two-col">
            {interpretationLimitations.map((diagnostic, index) => {
              const severity = severityPresentation(diagnostic.severity);

              return (
                <article
                  className="layer-card"
                  key={`${diagnostic.code}-${diagnostic.scope_id ?? "hotel"}-${index}`}
                >
                  <TechnicalLabel>{diagnostic.code}</TechnicalLabel>
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 500, margin: "8px 0" }}>
                    {diagnostic.client_text}
                  </h3>
                  <span className={`status ${severity.tone}`}>{severity.label}</span>
                  {diagnostic.blocking_diagnostic && (
                    <div style={{ marginTop: 8 }}>
                      <TechnicalLabel>
                        blocking_diagnostic: {diagnostic.blocking_diagnostic}
                      </TechnicalLabel>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <article className="layer-card">
            <p style={{ margin: 0 }}>
              Brak aktywnych ograniczeń danych, które istotnie utrudniają ocenę roli kanałów.
            </p>
          </article>
        )}
      </section>
    </div>
  );
}

function askDataContextLabel(context: string) {
  const labels: Record<string, string> = {
    period: "okres",
    sales: "sprzedaż",
    funnel: "lejek",
    meta_ads: "Meta Ads",
    google_ads: "Google Ads",
    campaign_details: "kampanie",
    diagnostics: "diagnozy",
    recommendations: "rekomendacje",
    watch: "obserwacja",
    limitations: "jakość danych",
  };

  return labels[context] ?? context;
}

function AskDataView({
  onClose,
  diagnostics,
  messages,
  setMessages,
}: {
  onClose: () => void;
  diagnostics: DiagnosticsResponse;
  messages: AskDataUiMessage[];
  setMessages: Dispatch<SetStateAction<AskDataUiMessage[]>>;
}) {
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const historyEndRef = useRef<HTMLDivElement>(null);
  const { current, comparison } = diagnostics.input;

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending, isUnavailable]);

  async function sendQuestion(rawQuestion: string) {
    const nextQuestion = rawQuestion.trim();
    if (!nextQuestion || isSending) return;

    const conversation = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    const userMessage: AskDataUiMessage = {
      role: "user",
      content: nextQuestion,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setQuestion("");
    setIsSending(true);
    setIsUnavailable(false);

    try {
      const response = await fetch("/api/ask-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: nextQuestion,
          context: buildAskDataContext(diagnostics),
          conversation,
        }),
      });
      const payload = await response.json() as AskDataApiResponse;

      if (!response.ok || !payload.available) {
        setIsUnavailable(true);
        return;
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: payload.result.answer,
          keyFacts: payload.result.key_facts,
          observation: payload.result.observation,
          recommendedAction: payload.result.recommended_action,
          usedContext: payload.result.used_context,
          limitations: payload.result.limitations,
        },
      ]);
    } catch {
      setIsUnavailable(true);
    } finally {
      setIsSending(false);
    }
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(question);
  }

  function handleQuestionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendQuestion(question);
    }
  }

  return (
    <>
      <button
        aria-label="Zamknij asystenta danych"
        className="ask-data-backdrop"
        onClick={onClose}
        type="button"
      />
      <aside aria-label="Asystent danych HMA" className="ask-data-drawer" role="dialog">
      <header className="ask-data-drawer-header">
        <div>
          <span className="eyebrow">ZAPYTAJ DANE</span>
          <h2>Asystent danych HMA</h2>
          <p>Zapytaj o sprzedaż, lejek, Meta Ads lub Google Ads.</p>
        </div>
        <button aria-label="Zamknij" className="ask-data-close" onClick={onClose} type="button">
          ×
        </button>
      </header>

      <div className="ask-data-period">
        <span>Analizowany okres</span>
        <strong>{formatDateRange(current.start_date, current.end_date)}</strong>
        <small>Porównanie: {formatDateRange(comparison.start_date, comparison.end_date)}</small>
      </div>

      <div className="ask-data-history" aria-live="polite">
          {messages.length === 0 && (
            <div className="ask-data-welcome">
              <span>HMA</span>
              <p>
                Zapytaj mnie o wyniki aktualnego okresu. Odpowiem wyłącznie na podstawie
                danych i diagnoz dostępnych w HMA.
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <article className={`ask-data-message ${message.role}`} key={`${message.role}-${index}`}>
              <span className="ask-data-author">{message.role === "user" ? "Ty" : "HMA"}</span>
              <div>
                <p className="ask-data-lead">{message.content}</p>
                {message.keyFacts && message.keyFacts.length > 0 && (
                  <section className="ask-data-facts">
                    <h3>Najważniejsze liczby</h3>
                    <dl>
                      {message.keyFacts.map((fact) => (
                        <div key={`${fact.label}-${fact.value}`}>
                          <dt>{fact.label}</dt>
                          <dd>{fact.value}</dd>
                          <small>{fact.change ?? ""}</small>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
                {message.observation && (
                  <section className="ask-data-answer-section">
                    <h3>Co zwraca uwagę?</h3>
                    <p>{message.observation}</p>
                  </section>
                )}
                {message.recommendedAction && (
                  <section className="ask-data-answer-section action">
                    <h3>Co zrobić teraz?</h3>
                    <p>{message.recommendedAction}</p>
                  </section>
                )}
                {message.limitations && message.limitations.length > 0 && (
                  <aside className="ask-data-limitations">
                    <strong>Ograniczenia danych</strong>
                    {message.limitations.map((limitation) => (
                      <small key={limitation}>{limitation}</small>
                    ))}
                  </aside>
                )}
                {message.usedContext && message.usedContext.length > 0 && (
                  <small className="ask-data-sources">
                    Źródła odpowiedzi: {message.usedContext.map(askDataContextLabel).join(", ")}
                  </small>
                )}
              </div>
            </article>
          ))}
          {isSending && (
            <article className="ask-data-message assistant pending">
              <span className="ask-data-author">HMA</span>
              <div><p>Analizuję dane…</p></div>
            </article>
          )}
          <div ref={historyEndRef} />
      </div>

      <footer className="ask-data-composer">
        {isUnavailable && (
          <p className="ask-data-unavailable" role="status">
            Asystent danych jest chwilowo niedostępny. Pozostałe raporty HMA działają normalnie.
          </p>
        )}

        <div className="ask-data-suggestions">
          {askDataStarterQuestions.map((starterQuestion) => (
            <button
              disabled={isSending}
              key={starterQuestion}
              onClick={() => void sendQuestion(starterQuestion)}
              type="button"
            >
              {starterQuestion}
            </button>
          ))}
        </div>

        <form className="ask-data-form" onSubmit={submitQuestion}>
          <div>
            <textarea
              aria-label="Twoje pytanie"
              disabled={isSending}
              id="ask-data-question"
              maxLength={600}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleQuestionKeyDown}
              placeholder="Zapytaj o sprzedaż, lejek lub kampanie…"
              rows={1}
              value={question}
            />
            <button className="primary" disabled={isSending || !question.trim()} type="submit">
              Wyślij
            </button>
          </div>
          <small>Enter wysyła · Shift+Enter dodaje nową linię</small>
        </form>
      </footer>
      </aside>
    </>
  );
}

async function fetchDiagnostics(selectedPeriod: AnalysisPeriod) {
  const params = new URLSearchParams(selectedPeriod);
  const response = await fetch(`/api/diagnostics?${params.toString()}`);
  const payload = (await response.json()) as DiagnosticsResponse | { error?: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "Nie udało się pobrać danych diagnostycznych.",
    );
  }

  return payload as DiagnosticsResponse;
}

function clampPeriodToProfitroom(
  selectedPeriod: AnalysisPeriod,
  profitroomDataThrough: string | null,
) {
  if (!profitroomDataThrough) return selectedPeriod;

  const currentStart = selectedPeriod.currentStart > profitroomDataThrough
    ? profitroomDataThrough
    : selectedPeriod.currentStart;
  const currentEnd = selectedPeriod.currentEnd > profitroomDataThrough
    ? profitroomDataThrough
    : selectedPeriod.currentEnd;
  const comparisonPeriod = calculateComparisonPeriod(currentStart, currentEnd);

  return comparisonPeriod
    ? { currentStart, currentEnd, ...comparisonPeriod }
    : selectedPeriod;
}

async function fetchAvailableDiagnostics(selectedPeriod: AnalysisPeriod) {
  const initialResponse = await fetchDiagnostics(selectedPeriod);
  const profitroomDataThrough =
    initialResponse.input.current.profitroom.profitroom_data_through;
  const availablePeriod = clampPeriodToProfitroom(selectedPeriod, profitroomDataThrough);

  if (
    availablePeriod.currentStart === selectedPeriod.currentStart
    && availablePeriod.currentEnd === selectedPeriod.currentEnd
  ) {
    return { diagnostics: initialResponse, period: selectedPeriod };
  }

  return {
    diagnostics: await fetchDiagnostics(availablePeriod),
    period: availablePeriod,
  };
}

export default function Home() {
  const [activeView, setActiveView] = useState<ReportView>("summary");
  const [period, setPeriod] = useState<AnalysisPeriod>(initialPeriod);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("loading");
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [askDataMessages, setAskDataMessages] = useState<AskDataUiMessage[]>([]);
  const [isAskDataOpen, setIsAskDataOpen] = useState(false);

  const activeReport = reportViews.find((report) => report.id === activeView) ?? reportViews[0];
  const profitroomDataFrom = diagnostics?.profitroom_data_from ?? null;
  const profitroomDataThrough =
    diagnostics?.input.current.profitroom.profitroom_data_through ?? null;
  const currentStartMax = profitroomDataThrough && profitroomDataThrough < period.currentEnd
    ? profitroomDataThrough
    : period.currentEnd;

  function updateCurrentPeriod(field: "currentStart" | "currentEnd", value: string) {
    setPeriod((current) => {
      const updatedPeriod = { ...current, [field]: value };
      const comparisonPeriod = calculateComparisonPeriod(
        updatedPeriod.currentStart,
        updatedPeriod.currentEnd,
      );

      return comparisonPeriod
        ? { ...updatedPeriod, ...comparisonPeriod }
        : updatedPeriod;
    });
  }

  async function loadDiagnostics(selectedPeriod: AnalysisPeriod = period) {
    setRequestStatus("loading");
    setRequestError(null);

    try {
      const response = await fetchAvailableDiagnostics(selectedPeriod);
      setPeriod(response.period);
      setDiagnostics(response.diagnostics);
      setAskDataMessages([]);
      setIsAskDataOpen(false);
      setActiveView("summary");
      setRequestStatus("success");
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Nie udało się pobrać danych diagnostycznych.",
      );
      setRequestStatus("error");
    }
  }

  function applyPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadDiagnostics(period);
  }

  useEffect(() => {
    let isCurrent = true;

    void fetchAvailableDiagnostics(initialPeriod)
      .then((response) => {
        if (!isCurrent) return;
        setPeriod(response.period);
        setDiagnostics(response.diagnostics);
        setRequestStatus("success");
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        setRequestError(
          error instanceof Error ? error.message : "Nie udało się pobrać danych diagnostycznych.",
        );
        setRequestStatus("error");
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <div className="app-shell" data-diagnostics-endpoint="/api/diagnostics">
      <aside className="sidebar">
        <div className="brand compact">
          <span className="brand-mark">H</span>
          <span>Hotel Marketing<br />Analyzer</span>
        </div>

        <nav aria-label="Główna nawigacja">
          {reportViews.map((report) => (
            <button
              aria-label={report.label}
              className={
                report.id === "ask-data"
                  ? (isAskDataOpen ? "active" : undefined)
                  : (activeView === report.id ? "active" : undefined)
              }
              key={report.id}
              onClick={() => {
                if (report.id === "ask-data") {
                  setIsAskDataOpen(true);
                  return;
                }

                setActiveView(report.id);
                setIsAskDataOpen(false);
              }}
              type="button"
            >
              <span className="nav-abbreviation" aria-hidden="true">
                {report.label.slice(0, 2).toUpperCase()}
              </span>
              <span className="nav-label">{report.label}</span>
            </button>
          ))}
        </nav>

        <div className="side-bottom">
          <LogoutButton />
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="topbar-title">
            <strong>{activeReport.label}</strong>
          </div>
          <div className="top-actions">
            <div className="topbar-period-control">
              <form className="topbar-range-form" onSubmit={applyPeriod}>
                <label>
                  <span>Od</span>
                  <input
                    aria-label="Analizowany okres — data od"
                    max={currentStartMax}
                    onChange={(event) => updateCurrentPeriod("currentStart", event.target.value)}
                    required
                    type="date"
                    value={period.currentStart}
                  />
                </label>
                <label>
                  <span>Do</span>
                  <input
                    aria-label="Analizowany okres — data do"
                    max={profitroomDataThrough ?? undefined}
                    min={period.currentStart}
                    onChange={(event) => updateCurrentPeriod("currentEnd", event.target.value)}
                    required
                    type="date"
                    value={period.currentEnd}
                  />
                </label>
                <button disabled={requestStatus === "loading"} type="submit">Zastosuj</button>
              </form>
              {profitroomDataFrom && profitroomDataThrough && (
                <small className="topbar-data-through">
                  Dane sprzedażowe dostępne: {formatDate(profitroomDataFrom)} – {formatDate(profitroomDataThrough)}
                </small>
              )}
            </div>
            <span className="topbar-comparison">
              <small>Porównanie</small>
              {formatDateRange(period.comparisonStart, period.comparisonEnd)}
            </span>
          </div>
        </header>

        <section className="page">
          {activeView !== "summary" && activeView !== "funnel" && (
            <div className="page-heading">
              <div>
                <span className="eyebrow">HOTEL MARKETING ANALYZER V1</span>
                <h1>{activeReport.label}</h1>
                <p>{activeReport.description}</p>
              </div>
            </div>
          )}

          {requestStatus === "loading" && (
            <article className="layer-card" aria-live="polite">
              <span className="eyebrow">ANALIZA W TOKU</span>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 500, margin: "8px 0 12px" }}>
                Pobieram i analizuję dane...
              </h2>
              <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
                Łączę dane dla wybranego okresu i przygotowuję diagnozy.
              </p>
            </article>
          )}

          {requestStatus === "error" && (
            <article className="layer-card" aria-live="assertive">
              <span className="eyebrow">BŁĄD POBIERANIA DANYCH</span>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 500, margin: "8px 0 12px" }}>
                Nie udało się przygotować analizy
              </h2>
              <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: "0 0 20px" }}>
                {requestError ?? "Nie udało się pobrać danych diagnostycznych."}
              </p>
              <button className="primary" onClick={() => void loadDiagnostics()} type="button">
                Ponów pobieranie
              </button>
            </article>
          )}

          {requestStatus === "success" && diagnostics && activeView === "summary" && (
            <SummaryView diagnostics={diagnostics} />
          )}

          {requestStatus === "success" && diagnostics && activeView === "sales" && (
            <SalesView diagnostics={diagnostics} />
          )}

          {requestStatus === "success" && diagnostics && activeView === "funnel" && (
            <FunnelView diagnostics={diagnostics} />
          )}

          {requestStatus === "success" && diagnostics && activeView === "meta-ads" && (
            <MetaAdsView diagnostics={diagnostics} />
          )}

          {requestStatus === "success" && diagnostics && activeView === "google-ads" && (
            <GoogleAdsView diagnostics={diagnostics} />
          )}

          {requestStatus === "success" && diagnostics && activeView === "data-quality" && (
            <DataQualityView diagnostics={diagnostics} />
          )}

          {requestStatus === "success" && diagnostics && activeView === "channel-role" && (
            <ChannelRoleView diagnostics={diagnostics} />
          )}

        </section>
      </main>

      {requestStatus === "success" && diagnostics && isAskDataOpen && (
        <AskDataView
          diagnostics={diagnostics}
          messages={askDataMessages}
          onClose={() => setIsAskDataOpen(false)}
          setMessages={setAskDataMessages}
        />
      )}
    </div>
  );
}
