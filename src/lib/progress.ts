import { getFramework } from "@/frameworks";
import { getGroupsForFramework, getPracticesForLevel } from "@/lib/practices";
import type { CmmcLevel, DerivedPracticeStatus, FrameworkId, Practice } from "@/lib/practice-types";
import { listPracticeStatuses, listPracticeStatusesForFramework } from "@/lib/submissions";

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

export type FrameworkProgressSummary = {
  framework: FrameworkId;
  total: number;
  accepted: number;
  needsWork: number;
  underReview: number;
  inProgress: number;
  notStarted: number;
  percent: number;
  // CMMC only; Texas frameworks have no SPRS score.
  sprsScore?: number;
};

export function computeProgressForFrameworkFromStatuses(
  framework: FrameworkId,
  statuses: Record<string, DerivedPracticeStatus>,
): FrameworkProgressSummary {
  const practices: Practice[] = getGroupsForFramework(framework).flatMap((group) => group.practices);
  const summary: FrameworkProgressSummary = {
    framework,
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
  if (getFramework(framework).scoring.kind === "sprs") {
    summary.sprsScore = Math.max(SPRS_MIN_SCORE, SPRS_MAX_SCORE - pointsLost);
  }
  return summary;
}

export async function computeProgressForFramework(
  framework: FrameworkId,
): Promise<FrameworkProgressSummary> {
  const statuses = await listPracticeStatusesForFramework(framework);
  return computeProgressForFrameworkFromStatuses(framework, statuses);
}
