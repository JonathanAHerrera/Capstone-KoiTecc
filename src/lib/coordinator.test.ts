import { describe, expect, test } from "vitest";
import type { InterviewFindingStatusValue } from "@/ai/interview-schema";
import { buildCoordinatorTasks } from "@/lib/coordinator";
import { getFamilies } from "@/lib/practices";
import type { DerivedPracticeStatus } from "@/lib/practice-types";

const families = getFamilies(1);
const firstFamily = families[0];

describe("buildCoordinatorTasks", () => {
  test("an unchecked family becomes a single 'start_check' task, not one per practice", () => {
    const { tasks, doneCount, totalCount } = buildCoordinatorTasks(families, {}, {});
    expect(doneCount).toBe(0);
    expect(totalCount).toBe(families.reduce((sum, family) => sum + family.practices.length, 0));
    expect(tasks).toHaveLength(families.length);
    expect(tasks.every((task) => task.kind === "start_check")).toBe(true);
  });

  test("prioritizes fixes, counts accepted as done, and routes under_review to 'awaiting'", () => {
    const statuses: Record<string, DerivedPracticeStatus> = {
      [firstFamily.practices[0].id]: "needs_work",
      [firstFamily.practices[1].id]: "accepted",
      [firstFamily.practices[2].id]: "under_review",
    };
    const findings: Record<string, InterviewFindingStatusValue> = {
      [firstFamily.practices[3].id]: "not_met",
    };

    const { tasks, awaiting, doneCount } = buildCoordinatorTasks(families, statuses, findings);

    expect(doneCount).toBe(1);
    expect(awaiting).toHaveLength(1);
    expect(awaiting[0].kind).toBe("awaiting_review");
    expect(awaiting[0].id).toBe(firstFamily.practices[2].id);

    // The needs_work fix is the single most urgent thing.
    expect(tasks[0].kind).toBe("fix_needs_work");
    expect(tasks[0].id).toBe(firstFamily.practices[0].id);

    expect(
      tasks.some((task) => task.kind === "provide_evidence" && task.id === firstFamily.practices[3].id),
    ).toBe(true);
    // This family has activity, so it is never re-offered as a 5-minute check.
    expect(tasks.some((task) => task.kind === "start_check" && task.familyCode === firstFamily.code)).toBe(false);
    // Other, untouched families still surface their check.
    expect(tasks.some((task) => task.kind === "start_check")).toBe(true);
  });

  test("a 'not_met' finding outranks an 'unclear' one within a family", () => {
    const findings: Record<string, InterviewFindingStatusValue> = {
      [firstFamily.practices[0].id]: "unclear",
      [firstFamily.practices[1].id]: "not_met",
    };
    const { tasks } = buildCoordinatorTasks(families, {}, findings);

    const familyTasks = tasks.filter((task) => task.familyCode === firstFamily.code);
    const notMetIndex = familyTasks.findIndex((task) => task.id === firstFamily.practices[1].id);
    const unclearIndex = familyTasks.findIndex((task) => task.id === firstFamily.practices[0].id);
    expect(notMetIndex).toBeGreaterThanOrEqual(0);
    expect(notMetIndex).toBeLessThan(unclearIndex);
  });
});
