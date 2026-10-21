import { describe, expect, test } from "vitest";
import type { PathNodeViewModel } from "@/components/path/build-path-view-model";
import { selectNeedsAttention } from "@/components/path/select-needs-attention";
import type { InterviewFindingStatusValue } from "@/ai/interview-schema";
import type { DerivedPracticeStatus } from "@/lib/practice-types";

function node(
  id: string,
  status: DerivedPracticeStatus,
  interviewFinding: InterviewFindingStatusValue | null = null,
): PathNodeViewModel {
  return {
    id,
    title: `Practice ${id}`,
    familyCode: "AC",
    familyName: "Access Control",
    plainEnglish: "",
    estimatedEffortMinutes: 10,
    status,
    nodeState: status === "not_started" ? "available" : status,
    interviewFinding,
  };
}

describe("selectNeedsAttention", () => {
  test("without findings, only started practices surface, ordered by status then path position", () => {
    const selection = selectNeedsAttention([
      node("a", "accepted"),
      node("b", "in_progress"),
      node("c", "needs_work"),
      node("d", "not_started"),
      node("e", "under_review"),
    ]);
    expect(selection.rows.map((row) => row.id)).toEqual(["c", "e", "b"]);
    expect(selection.totalCount).toBe(3);
  });

  test("an untouched practice flagged by the interview surfaces, below any started practice", () => {
    const selection = selectNeedsAttention([
      node("started", "in_progress"),
      node("missing", "not_started", "not_met"),
      node("unsure", "not_started", "unclear"),
      node("fine", "not_started", "met"),
      node("quiet", "not_started", null),
    ]);
    // started (priority 2) first, then not_met (3), then unclear (4). "met" and unflagged never show.
    expect(selection.rows.map((row) => row.id)).toEqual(["started", "missing", "unsure"]);
    expect(selection.totalCount).toBe(3);
  });

  test("evidence status wins: a flagged practice already accepted never surfaces", () => {
    const selection = selectNeedsAttention([
      node("done", "accepted", "not_met"),
      node("quiet", "not_started", null),
    ]);
    expect(selection.rows).toHaveLength(0);
    expect(selection.totalCount).toBe(0);
  });
});
