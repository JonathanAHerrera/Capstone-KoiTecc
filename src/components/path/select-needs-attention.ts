import type { DerivedPracticeStatus } from "@/lib/practice-types";
import type { PathNodeViewModel } from "./build-path-view-model";

export const NEEDS_ATTENTION_ROW_LIMIT = 3;

const NEEDS_ATTENTION_PRIORITY: Partial<Record<DerivedPracticeStatus, number>> = {
  needs_work: 0,
  under_review: 1,
  in_progress: 2,
};

export type NeedsAttentionSelection = {
  rows: PathNodeViewModel[];
  totalCount: number;
};

export function selectNeedsAttention(nodes: PathNodeViewModel[]): NeedsAttentionSelection {
  const attentionNodes = nodes
    .map((node, pathIndex) => ({ node, pathIndex, priority: NEEDS_ATTENTION_PRIORITY[node.status] }))
    .filter((entry): entry is typeof entry & { priority: number } => entry.priority !== undefined)
    .sort((left, right) => left.priority - right.priority || left.pathIndex - right.pathIndex)
    .map((entry) => entry.node);

  return {
    rows: attentionNodes.slice(0, NEEDS_ATTENTION_ROW_LIMIT),
    totalCount: attentionNodes.length,
  };
}
