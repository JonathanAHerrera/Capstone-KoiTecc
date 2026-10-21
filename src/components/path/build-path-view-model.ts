import type { InterviewFindingStatusValue } from "@/ai/interview-schema";
import type { PathNodeState } from "@/components/ui/path-node";
import type { DerivedPracticeStatus, PracticeFamily } from "@/lib/practice-types";

export type PathNodeViewModel = {
  id: string;
  title: string;
  familyCode: string;
  familyName: string;
  plainEnglish: string;
  estimatedEffortMinutes: number;
  status: DerivedPracticeStatus;
  nodeState: PathNodeState;
  // The latest gap-assessment interview finding for this practice, when one exists. Drives the
  // adaptive path: a "not_met"/"unclear" finding surfaces an untouched practice in needs-attention.
  interviewFinding?: InterviewFindingStatusValue | null;
};

export type PathFamilyViewModel = {
  code: string;
  name: string;
  accentIndex: number;
  completedCount: number;
  totalCount: number;
  everyNodeLocked: boolean;
  nodes: PathNodeViewModel[];
};

export type PathViewModel = {
  families: PathFamilyViewModel[];
  currentPracticeId: string | null;
};

export function derivePathNodeState(
  status: DerivedPracticeStatus,
  practiceIndexInPath: number,
  currentPracticeIndexInPath: number,
): PathNodeState {
  if (status !== "not_started") return status;
  const afterCurrentPractice =
    currentPracticeIndexInPath !== -1 && practiceIndexInPath > currentPracticeIndexInPath;
  return afterCurrentPractice ? "locked" : "available";
}

export function buildPathViewModel(
  families: PracticeFamily[],
  statuses: Record<string, DerivedPracticeStatus>,
  interviewFindings: Record<string, InterviewFindingStatusValue> = {},
): PathViewModel {
  const practicesInPathOrder = families.flatMap((family) => family.practices);
  const statusFor = (practiceId: string): DerivedPracticeStatus => statuses[practiceId] ?? "not_started";
  const currentPracticeIndexInPath = practicesInPathOrder.findIndex(
    (practice) => statusFor(practice.id) !== "accepted",
  );
  const currentPracticeId =
    currentPracticeIndexInPath === -1 ? null : practicesInPathOrder[currentPracticeIndexInPath].id;

  let practiceIndexInPath = 0;
  const familyViewModels = families.map((family, familyIndex): PathFamilyViewModel => {
    const nodes = family.practices.map((practice): PathNodeViewModel => {
      const status = statusFor(practice.id);
      const nodeState = derivePathNodeState(status, practiceIndexInPath, currentPracticeIndexInPath);
      practiceIndexInPath += 1;
      return {
        id: practice.id,
        title: practice.title,
        familyCode: family.code,
        familyName: family.name,
        plainEnglish: practice.plainEnglish,
        estimatedEffortMinutes: practice.estimatedEffortMinutes,
        status,
        nodeState,
        interviewFinding: interviewFindings[practice.id] ?? null,
      };
    });
    return {
      code: family.code,
      name: family.name,
      accentIndex: familyIndex,
      completedCount: nodes.filter((node) => node.status === "accepted").length,
      totalCount: nodes.length,
      everyNodeLocked: nodes.length > 0 && nodes.every((node) => node.nodeState === "locked"),
      nodes,
    };
  });

  return { families: familyViewModels, currentPracticeId };
}
