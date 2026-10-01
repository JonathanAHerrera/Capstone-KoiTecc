import { READINESS_DISCLAIMER } from "@/components/onboarding/readiness-disclaimer";
import type { CmmcLevel, DerivedPracticeStatus, PracticeFamily } from "@/lib/practice-types";
import type { ProgressSummary } from "@/lib/progress";
import { acceptedCountForFamily } from "./family-progress-list";
import type { NeedsAttentionItem } from "./needs-attention-list";
import { readinessRemainingCount } from "./readiness-overview";

export type BuildSummaryTextInput = {
  organizationName: string;
  level: CmmcLevel;
  progress: ProgressSummary;
  families: PracticeFamily[];
  statuses: Record<string, DerivedPracticeStatus>;
  needsAttentionItems: NeedsAttentionItem[];
  pointsAtRisk: number | null;
};

export function buildSummaryText({
  organizationName,
  level,
  progress,
  families,
  statuses,
  needsAttentionItems,
  pointsAtRisk,
}: BuildSummaryTextInput): string {
  const familyLine = families
    .map((family) => `${family.code} ${acceptedCountForFamily(family, statuses)}/${family.practices.length}`)
    .join(", ");
  const needsAttentionLine =
    needsAttentionItems.length === 0
      ? "Needs attention: none"
      : `Needs attention (${needsAttentionItems.length}): ${needsAttentionItems.map((item) => item.practice.id).join(", ")}`;

  return [
    `${organizationName} — CMMC Level ${level} readiness`,
    `${progress.percent}% ready · ${progress.accepted} accepted · ${progress.needsWork} needs work · ${readinessRemainingCount(progress)} remaining (of ${progress.total})`,
    `By family: ${familyLine}`,
    needsAttentionLine,
    pointsAtRisk === null ? null : `Points at risk among covered requirements: ${pointsAtRisk}`,
    `Generated ${new Date().toISOString().slice(0, 10)} with CMMC Ready`,
    READINESS_DISCLAIMER,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
