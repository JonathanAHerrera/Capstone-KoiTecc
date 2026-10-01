import { getPracticesForLevel } from "@/lib/practices";
import type { CmmcLevel, DerivedPracticeStatus } from "@/lib/practice-types";
import { listPracticeStatuses } from "@/lib/submissions";

export type ProgressSummary = {
  level: CmmcLevel;
  total: number;
  accepted: number;
  needsWork: number;
  underReview: number;
  inProgress: number;
  notStarted: number;
  percent: number;
  sprsScore?: number;
};

export const SPRS_MAX_SCORE = 110;
export const SPRS_MIN_SCORE = -203;

export function computeProgressFromStatuses(
  level: CmmcLevel,
  statuses: Record<string, DerivedPracticeStatus>,
): ProgressSummary {
  const practices = getPracticesForLevel(level);
  const summary: ProgressSummary = {
    level,
    total: practices.length,
    accepted: 0,
    needsWork: 0,
    underReview: 0,
    inProgress: 0,
    notStarted: 0,
    percent: 0,
  };
  let pointsLost = 0;

  for (const practice of practices) {
    const status = statuses[practice.id] ?? "not_started";
    switch (status) {
      case "accepted":
        summary.accepted += 1;
        break;
      case "needs_work":
        summary.needsWork += 1;
        break;
      case "under_review":
        summary.underReview += 1;
        break;
      case "in_progress":
        summary.inProgress += 1;
        break;
      case "not_started":
        summary.notStarted += 1;
        break;
    }
    if (status !== "accepted") pointsLost += practice.pointValue;
  }

  summary.percent =
    summary.total === 0 ? 0 : Math.round((summary.accepted / summary.total) * 100);
  if (level === 2) {
    summary.sprsScore = Math.max(SPRS_MIN_SCORE, SPRS_MAX_SCORE - pointsLost);
  }
  return summary;
}

export async function computeProgress(level: CmmcLevel): Promise<ProgressSummary> {
  const statuses = await listPracticeStatuses();
  return computeProgressFromStatuses(level, statuses);
}
