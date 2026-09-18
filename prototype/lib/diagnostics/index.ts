import type { DiagnosticInput } from "./input";
import type { Diagnostic } from "./types";

import { runDataQualityDiagnostics } from "./data-quality";
import { runTrafficQualityDiagnostics } from "./traffic-quality";
import { runFunnelDiagnostics } from "./funnel";
import { runSalesStructureDiagnostics } from "./sales-structure";
import { runEfficiencyDiagnostics } from "./efficiency";
import { runChannelRoleDiagnostics } from "./channel-role";

import { applyDiagnosticGates } from "./gates";
import {
  runPriorityEngine,
  type PriorityEngineResult,
} from "./priority-engine";

export function runDiagnostics(
  input: DiagnosticInput
): PriorityEngineResult {
  const diagnostics: Diagnostic[] = [
    ...runDataQualityDiagnostics(input),
    ...runTrafficQualityDiagnostics(input),
    ...runFunnelDiagnostics(input),
    ...runSalesStructureDiagnostics(input),
    ...runEfficiencyDiagnostics(input),
    ...runChannelRoleDiagnostics(input),
  ];

  const gatedDiagnostics =
    applyDiagnosticGates(diagnostics);

  return runPriorityEngine(
    gatedDiagnostics
  );
}

export type {
  DiagnosticInput,
  Diagnostic,
  PriorityEngineResult,
};
