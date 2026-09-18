import type {
  Diagnostic,
  DiagnosticCode,
  Confidence,
} from "./types";

function lowerConfidence(
  confidence: Confidence
): Confidence {
  if (confidence === "HIGH") return "MEDIUM";
  if (confidence === "MEDIUM") return "LOW";

  return "LOW";
}

function hasActiveDiagnostic(
  diagnostics: Diagnostic[],
  code: DiagnosticCode
): boolean {
  return diagnostics.some(
    (diagnostic) =>
      diagnostic.code === code &&
      diagnostic.status === "ACTIVE"
  );
}

function applyWatch(
  diagnostic: Diagnostic,
  blockingCode: DiagnosticCode
): Diagnostic {
  return {
    ...diagnostic,
    status: "WATCH",
    confidence: lowerConfidence(
      diagnostic.confidence
    ),
    blocking_diagnostic: blockingCode,
  };
}

export function applyDiagnosticGates(
  diagnostics: Diagnostic[]
): Diagnostic[] {
  const hasTrackingMismatch =
    hasActiveDiagnostic(
      diagnostics,
      "TRACKING_MISMATCH"
    );

  const hasIncompleteProfitroom =
    hasActiveDiagnostic(
      diagnostics,
      "INCOMPLETE_PROFITROOM"
    );

  return diagnostics.map((diagnostic) => {
    /*
     * TRACKING_MISMATCH
     *
     * Jeżeli Profitroom potwierdza sprzedaż,
     * a GA4 ma problem z purchase,
     * nie interpretujemy od razu słabego
     * Step3 → purchase jako realnego problemu sprzedażowego.
     */
    if (
      hasTrackingMismatch &&
      diagnostic.code ===
        "STEP3_TO_PURCHASE_WEAK"
    ) {
      return applyWatch(
        diagnostic,
        "TRACKING_MISMATCH"
      );
    }

    /*
     * INCOMPLETE_PROFITROOM
     *
     * Niepełny zakres Profitroom ogranicza
     * diagnozy bazujące na realnej sprzedaży.
     */
    if (hasIncompleteProfitroom) {
      const profitroomDependentCodes:
        DiagnosticCode[] = [
          "TRACKING_MISMATCH",
          "STEP3_TO_PURCHASE_WEAK",
          "TOTAL_DEMAND_UP",
          "TOTAL_DEMAND_DOWN",
          "DIRECT_TO_OTA",
          "OTA_TO_DIRECT",
          "COST_UP_SALES_FLAT",
          "SALES_UP_EFFICIENCY_GOOD",
        ];

      if (
        profitroomDependentCodes.includes(
          diagnostic.code
        )
      ) {
        return applyWatch(
          diagnostic,
          "INCOMPLETE_PROFITROOM"
        );
      }
    }

    return diagnostic;
  });
}
