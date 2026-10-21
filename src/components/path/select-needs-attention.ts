import type { DerivedPracticeStatus } from "@/lib/practice-types";
import type { PathNodeViewModel } from "./build-path-view-model";

export const NEEDS_ATTENTION_ROW_LIMIT = 3;

const NEEDS_ATTENTION_PRIORITY: Partial<Record<DerivedPracticeStatus, number>> = {
  needs_work: 0,
  under_review: 1,
  in_progress: 2,
};

// A practice the owner has not started yet but flagged in the gap-assessment interview still earns a
// spot, ranked below any practice they've actually begun. "not_met" (they said it's missing) sorts
// ahead of "unclear" (they weren't sure); an interview "met" is not surfaced — they said it's in
// place, it just needs evidence later. Evidence status always wins, so a started practice keeps its
// own priority above and never reaches this branch.
const INTERVIEW_FINDING_PRIORITY: Record<string, number> = {
  not_met: 3,
  unclear: 4,
};

export type NeedsAttentionSelection = {
  rows: PathNodeViewModel[];
  totalCount: number;
};

function needsAttentionPriority(node: PathNodeViewModel): number | undefined {
  const statusPriority = NEEDS_ATTENTION_PRIORITY[node.status];
  if (statusPriority !== undefined) return statusPriority;
  if (node.status === "not_started" && node.interviewFinding) {
    return INTERVIEW_FINDING_PRIORITY[node.interviewFinding];
  }
  return undefined;
}

export function selectNeedsAttention(nodes: PathNodeViewModel[]): NeedsAttentionSelection {
  const attentionNodes = nodes
    .map((node, pathIndex) => ({ node, pathIndex, priority: needsAttentionPriority(node) }))
    .filter((entry): entry is typeof entry & { priority: number } => entry.priority !== undefined)
    .sort((left, right) => left.priority - right.priority || left.pathIndex - right.pathIndex)
    .map((entry) => entry.node);

  return {
    rows: attentionNodes.slice(0, NEEDS_ATTENTION_ROW_LIMIT),
    totalCount: attentionNodes.length,
  };
}
