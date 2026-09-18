import type {
  Actionability,
  BusinessImpact,
  Confidence,
  Diagnostic,
  EvidenceStrength,
  Urgency,
} from "./types";

type RankedDiagnostic = Diagnostic & {
  priority_score: number;
};

export type PriorityEngineResult = {
  diagnostics: RankedDiagnostic[];

  top_business_issue: RankedDiagnostic | null;
  top_operational_diagnosis: RankedDiagnostic | null;

  recommendations: RankedDiagnostic[];
  watch: RankedDiagnostic[];
  limitations: RankedDiagnostic[];
};

function scoreLevel(
  value:
    | BusinessImpact
    | Urgency
    | Confidence
    | EvidenceStrength
    | Actionability
): number {
  if (value === "HIGH") return 3;
  if (value === "MEDIUM") return 2;

  return 1;
}

function calculatePriorityScore(
  diagnostic: Diagnostic
): number {
  return (
    scoreLevel(diagnostic.business_impact) +
    scoreLevel(diagnostic.urgency) +
    scoreLevel(diagnostic.confidence) +
    scoreLevel(diagnostic.evidence_strength) +
    scoreLevel(diagnostic.actionability)
  );
}

function rankDiagnostics(
  diagnostics: Diagnostic[]
): RankedDiagnostic[] {
  return diagnostics
    .map((diagnostic) => ({
      ...diagnostic,
      priority_score:
        calculatePriorityScore(diagnostic),
    }))
    .sort((a, b) => {
      /*
       * Główne sortowanie:
       * priority_score
       */
      if (
        b.priority_score !==
        a.priority_score
      ) {
        return (
          b.priority_score -
          a.priority_score
        );
      }

      /*
       * Tie-break 1:
       * business impact
       */
      const impactDiff =
        scoreLevel(b.business_impact) -
        scoreLevel(a.business_impact);

      if (impactDiff !== 0) {
        return impactDiff;
      }

      /*
       * Tie-break 2:
       * confidence
       */
      const confidenceDiff =
        scoreLevel(b.confidence) -
        scoreLevel(a.confidence);

      if (confidenceDiff !== 0) {
        return confidenceDiff;
      }

      /*
       * Tie-break 3:
       * evidence strength
       */
      const evidenceDiff =
        scoreLevel(b.evidence_strength) -
        scoreLevel(a.evidence_strength);

      if (evidenceDiff !== 0) {
        return evidenceDiff;
      }

      /*
       * Tie-break 4:
       * actionability
       */
      const actionabilityDiff =
        scoreLevel(b.actionability) -
        scoreLevel(a.actionability);

      if (actionabilityDiff !== 0) {
        return actionabilityDiff;
      }

      /*
       * Tie-break 5:
       * urgency
       */
      return (
        scoreLevel(b.urgency) -
        scoreLevel(a.urgency)
      );
    });
}

function isDataQualityDiagnostic(
  diagnostic: RankedDiagnostic
): boolean {
  return diagnostic.family === "DATA_QUALITY";
}

function isChannelRoleDiagnostic(
  diagnostic: RankedDiagnostic
): boolean {
  return diagnostic.family === "CHANNEL_ROLE";
}

function isPositiveDiagnostic(
  diagnostic: RankedDiagnostic
): boolean {
  return diagnostic.severity === "POSITIVE";
}

function isBusinessDiagnostic(
  diagnostic: RankedDiagnostic
): boolean {
  return (
    diagnostic.family === "SALES_STRUCTURE" ||
    diagnostic.family === "EFFICIENCY"
  );
}

function isOperationalDiagnostic(
  diagnostic: RankedDiagnostic
): boolean {
  return (
    diagnostic.family === "FUNNEL" ||
    diagnostic.family === "TRAFFIC_QUALITY" ||
    diagnostic.family === "DATA_QUALITY"
  );
}

function uniqueDiagnostics(
  diagnostics: RankedDiagnostic[]
): RankedDiagnostic[] {
  const seen = new Set<string>();

  return diagnostics.filter(
    (diagnostic) => {
      const key = [
        diagnostic.family,
        diagnostic.code,
        diagnostic.scope,
        diagnostic.scope_id ?? "",
      ].join(":");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

export function runPriorityEngine(
  diagnostics: Diagnostic[]
): PriorityEngineResult {
  const ranked = rankDiagnostics(
    diagnostics
  );

  const active = ranked.filter(
    (diagnostic) =>
      diagnostic.status === "ACTIVE"
  );

  const watch = ranked.filter(
    (diagnostic) =>
      diagnostic.status === "WATCH"
  );

  const limitations = ranked.filter(
    (diagnostic) =>
      diagnostic.family === "DATA_QUALITY"
  );

  /*
   * TOP BUSINESS ISSUE
   *
   * Najpierw szukamy realnego sygnału
   * sprzedażowego lub efektywnościowego.
   *
   * DATA_QUALITY może ograniczyć interpretację,
   * ale nie zastępuje automatycznie problemu biznesowego.
   */
  const businessCandidates =
    active.filter(
      (diagnostic) =>
        isBusinessDiagnostic(
          diagnostic
        ) &&
        !isChannelRoleDiagnostic(
          diagnostic
        )
    );

  const topBusinessIssue =
    businessCandidates[0] ??
    active.find(
      (diagnostic) =>
        !isDataQualityDiagnostic(
          diagnostic
        ) &&
        !isChannelRoleDiagnostic(
          diagnostic
        )
    ) ??
    null;

  /*
   * TOP OPERATIONAL DIAGNOSIS
   *
   * Najbardziej konkretne miejsce,
   * które można sprawdzić lub poprawić.
   */
  const operationalCandidates =
    active.filter(
      (diagnostic) =>
        isOperationalDiagnostic(
          diagnostic
        ) &&
        diagnostic.actionability ===
          "HIGH"
    );

  const topOperationalDiagnosis =
    operationalCandidates[0] ??
    active.find(
      (diagnostic) =>
        isOperationalDiagnostic(
          diagnostic
        )
    ) ??
    null;

  /*
   * RECOMMENDATIONS
   *
   * Maksymalnie 3:
   *
   * 1. główny problem biznesowy
   * 2. najbardziej konkretna diagnoza operacyjna
   * 3. szansa / wzrost albo kolejny istotny aktywny sygnał
   */

  const opportunity =
    active.find(
      (diagnostic) =>
        isPositiveDiagnostic(
          diagnostic
        ) &&
        diagnostic !==
          topBusinessIssue &&
        diagnostic !==
          topOperationalDiagnosis
    ) ?? null;

  const additionalCandidate =
    active.find(
      (diagnostic) =>
        diagnostic !==
          topBusinessIssue &&
        diagnostic !==
          topOperationalDiagnosis &&
        diagnostic !==
          opportunity &&
        !isChannelRoleDiagnostic(
          diagnostic
        )
    ) ?? null;

  const recommendations =
    uniqueDiagnostics(
      [
        topBusinessIssue,
        topOperationalDiagnosis,
        opportunity ??
          additionalCandidate,
      ].filter(
        (
          diagnostic
        ): diagnostic is RankedDiagnostic =>
          diagnostic !== null
      )
    ).slice(0, 3);

  return {
    diagnostics: ranked,

    top_business_issue:
      topBusinessIssue,

    top_operational_diagnosis:
      topOperationalDiagnosis,

    recommendations,
    watch,
    limitations,
  };
}
