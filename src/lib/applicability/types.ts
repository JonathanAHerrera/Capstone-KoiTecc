import { z } from "zod";
import type { FrameworkId } from "@/lib/practice-types";

// How confident the deterministic rules are that a framework applies to this organization.
export type ApplicabilityVerdict = "likely_applies" | "may_apply" | "unlikely";

export type FrameworkApplicability = {
  framework: FrameworkId;
  verdict: ApplicabilityVerdict;
  // Concrete, profile-grounded statements explaining the verdict (never legal advice).
  reasons: string[];
  // Optional friendly paragraph added by Claude when an API key is present; falls
  // back to undefined so the deterministic reasons are always sufficient on their own.
  plainEnglish?: string;
};

// The signals the rules read. Assembled from the organization row plus the optional
// radar profile so the engine stays a pure function over plain data.
export type ApplicabilitySignals = {
  handlesCui: boolean;
  governmentContractor: boolean;
  handlesTexasResidentData: boolean;
  processesPersonalDataAtScale: boolean;
  texasPhysicalPresence: boolean;
  sellsToStateOfTexas: boolean;
  handlesSensitiveData: boolean;
  texasOperations: boolean;
};

export const FrameworkEnrichmentSchema = z.object({
  plainEnglish: z
    .string()
    .describe(
      "A single warm, plain-English paragraph (2-4 sentences) telling a Texas small-business owner why this framework likely does or does not apply to them, grounded only in the provided reasons. No legal advice, no certainty claims.",
    ),
});

export type FrameworkEnrichment = z.infer<typeof FrameworkEnrichmentSchema>;
