import type { Organization } from "@/lib/org";
import { FRAMEWORK_ORDER } from "@/lib/practice-types";
import type { RadarProfile } from "@/lib/radar/types";
import { hasAnthropicApiKey } from "@/lib/reviewer";
import { enrichApplicabilityWithClaude } from "./enrich";
import { evaluateApplicabilityRules, gatherApplicabilitySignals } from "./rules";
import type { FrameworkApplicability } from "./types";

export type { FrameworkApplicability, ApplicabilityVerdict } from "./types";

// Deterministic first (works with no API key), then optional Claude enrichment layered on
// top. The return order always follows FRAMEWORK_ORDER so CMMC stays first.
export async function computeApplicability(
  organization: Organization,
  radarProfile: RadarProfile | null,
): Promise<FrameworkApplicability[]> {
  const signals = gatherApplicabilitySignals(organization, radarProfile);
  const ruled = evaluateApplicabilityRules(signals);
  const ordered = FRAMEWORK_ORDER.map((framework) => ruled[framework]);

  if (!hasAnthropicApiKey()) return ordered;
  return enrichApplicabilityWithClaude(ordered);
}
