import type { InterviewFindingStatusValue } from "@/ai/interview-schema";
import { narrateCoordinatorPlan } from "@/ai/coordinator-narration";
import { getInterviewFindingStatuses } from "@/lib/interview";
import { requireOrganization } from "@/lib/org";
import { getFamilies } from "@/lib/practices";
import type { CmmcLevel, DerivedPracticeStatus, PracticeFamily } from "@/lib/practice-types";
import { listPracticeStatuses } from "@/lib/submissions";

export type CoordinatorTaskKind =
  | "fix_needs_work"
  | "finish_draft"
  | "provide_evidence"
  | "start_check"
  | "awaiting_review";

export type CoordinatorTask = {
  id: string;
  kind: CoordinatorTaskKind;
  title: string;
  familyCode: string;
  familyName: string;
  action: string;
  reason: string;
  evidenceHint: string | null;
  estimatedEffortMinutes: number;
  href: string;
  priority: number;
};

export type CoordinatorPlan = {
  tasks: CoordinatorTask[];
  // The under_review subset, split out so the UI can show it as "with the reviewer" (not a to-do).
  awaiting: CoordinatorTask[];
  doneCount: number;
  totalCount: number;
  narration: string;
  isMockNarration: boolean;
};

// Lower number = more urgent. A needs_work fix comes before an untouched control; an untouched
// control the owner flagged "not in place" comes before one they weren't sure about; a whole family
// they haven't checked yet is one "take the check" task rather than a wall of empty to-dos.
const PRIORITY = {
  fix_needs_work: 0,
  finish_draft: 10,
  not_met: 20,
  unclear: 30,
  met_needs_proof: 40,
  no_evidence: 45,
  start_check: 50,
  awaiting_review: 60,
} as const;

function evidenceHintFor(family: PracticeFamily, practiceId: string): string | null {
  const practice = family.practices.find((candidate) => candidate.id === practiceId);
  const example = practice?.evidenceExamples[0];
  return example ? `Send me: ${example}` : null;
}

// Pure core: turn the org's live state into an ordered, concrete to-do list. Deterministic so the
// agent never invents a task, works with no API key, and is unit-testable without a database.
export function buildCoordinatorTasks(
  families: PracticeFamily[],
  statuses: Record<string, DerivedPracticeStatus>,
  interviewFindings: Record<string, InterviewFindingStatusValue>,
): { tasks: CoordinatorTask[]; awaiting: CoordinatorTask[]; doneCount: number; totalCount: number } {
  const tasks: CoordinatorTask[] = [];
  const awaiting: CoordinatorTask[] = [];
  let order = 0;
  let doneCount = 0;
  let totalCount = 0;

  for (const family of families) {
    const familyChecked = family.practices.some((practice) => {
      const status = statuses[practice.id] ?? "not_started";
      return status !== "not_started" || interviewFindings[practice.id] != null;
    });

    for (const practice of family.practices) {
      totalCount += 1;
      order += 1;
      const status = statuses[practice.id] ?? "not_started";
      const finding = interviewFindings[practice.id] ?? null;

      const common = {
        id: practice.id,
        title: practice.title,
        familyCode: family.code,
        familyName: family.name,
        estimatedEffortMinutes: practice.estimatedEffortMinutes,
        href: `/practice/${practice.id}`,
        evidenceHint: evidenceHintFor(family, practice.id),
      };

      if (status === "accepted") {
        doneCount += 1;
        continue;
      }

      if (status === "needs_work") {
        tasks.push({ ...common, kind: "fix_needs_work", priority: PRIORITY.fix_needs_work + order / 1000, action: "Address the review notes and resubmit.", reason: "A review flagged gaps to close." });
        continue;
      }

      if (status === "under_review") {
        awaiting.push({ ...common, kind: "awaiting_review", priority: PRIORITY.awaiting_review + order / 1000, action: "Waiting on the reviewer — nothing to do right now.", reason: "You've submitted this; a review is in progress.", evidenceHint: null });
        continue;
      }

      if (status === "in_progress") {
        tasks.push({ ...common, kind: "finish_draft", priority: PRIORITY.finish_draft + order / 1000, action: "Finish your draft and submit it for review.", reason: "You started this but haven't submitted it yet." });
        continue;
      }

      // status === "not_started" from here down.
      if (finding === "not_met") {
        tasks.push({ ...common, kind: "provide_evidence", priority: PRIORITY.not_met + order / 1000, action: "Set this up, then add proof and submit.", reason: "You told the check this isn't in place yet." });
        continue;
      }
      if (finding === "unclear") {
        tasks.push({ ...common, kind: "provide_evidence", priority: PRIORITY.unclear + order / 1000, action: "Confirm how this works, then add proof.", reason: "You weren't sure about this in the check." });
        continue;
      }
      if (finding === "met") {
        tasks.push({ ...common, kind: "provide_evidence", priority: PRIORITY.met_needs_proof + order / 1000, action: "Add proof and submit for review.", reason: "You said this is in place — let's get it on the record." });
        continue;
      }

      // not_started, no interview finding: if the family hasn't been checked at all, a single
      // "take the check" task below covers it; otherwise ask for evidence directly.
      if (familyChecked) {
        tasks.push({ ...common, kind: "provide_evidence", priority: PRIORITY.no_evidence + order / 1000, action: "Add evidence and submit for review.", reason: "No evidence yet for this requirement." });
      }
    }

    if (!familyChecked) {
      order += 1;
      tasks.push({
        id: `check:${family.code}`,
        kind: "start_check",
        title: `${family.name} check`,
        familyCode: family.code,
        familyName: family.name,
        action: "Take the 5-minute check.",
        reason: `I don't know where you stand on ${family.name.toLowerCase()} yet — a few questions will tell me.`,
        evidenceHint: null,
        estimatedEffortMinutes: 5,
        href: `/interview/${family.code}`,
        priority: PRIORITY.start_check + order / 1000,
      });
    }
  }

  tasks.sort((left, right) => left.priority - right.priority);
  return { tasks, awaiting, doneCount, totalCount };
}

export async function computeCoordinatorPlan(): Promise<CoordinatorPlan> {
  const organization = await requireOrganization();
  const level = organization.targetLevel as CmmcLevel;

  const [statuses, interviewFindings] = await Promise.all([
    listPracticeStatuses(),
    getInterviewFindingStatuses(),
  ]);
  const families = getFamilies(level);
  const { tasks, awaiting, doneCount, totalCount } = buildCoordinatorTasks(
    families,
    statuses,
    interviewFindings,
  );

  const { narration, isMockNarration } = await narrateCoordinatorPlan(tasks, { doneCount, totalCount });
  return { tasks, awaiting, doneCount, totalCount, narration, isMockNarration };
}
