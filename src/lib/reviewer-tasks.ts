import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, nowIsoTimestamp } from "@/db/client";
import { reviewerTasks, type ReviewerTaskKind, type ReviewerTaskRow } from "@/db/schema";
import { appendLedgerEntryBestEffort } from "@/lib/ledger";
import { requireOrganization } from "@/lib/org";
import { getSessionUser } from "@/lib/session";

export type ReviewerTask = ReviewerTaskRow;
export const REVIEWER_TASK_STATUSES = ["open", "in_progress", "closed"] as const;
export type ReviewerTaskStatus = (typeof REVIEWER_TASK_STATUSES)[number];

export const REVIEWER_TASK_KIND_LABELS: Readonly<Record<ReviewerTaskKind, string>> = {
  incident_help: "Incident help request",
  scam_escalation: "Suspicious message escalation",
};

export type CreateReviewerTaskInput = {
  kind: ReviewerTaskKind;
  summary: string;
  // Redacted, display-only context for the reviewer. Never put the raw message or any secret here.
  detail?: Record<string, unknown> | null;
  relatedIncidentId?: string | null;
};

// The one-tap "get help from KOITECC" behind both the incident page and the scam checker. There is
// no reviewer inbox UI yet; the row plus the help_requested ledger entry is the durable record that
// help was asked for and when, which is what the documented-program story needs.
export async function createReviewerTask(input: CreateReviewerTaskInput): Promise<ReviewerTask> {
  const organization = await requireOrganization();
  const sessionUser = await getSessionUser();
  const db = await getDb();
  const timestamp = nowIsoTimestamp();

  const task: ReviewerTask = {
    id: nanoid(),
    orgId: organization.id,
    kind: input.kind,
    status: "open",
    summary: input.summary.trim(),
    detail: input.detail ? JSON.stringify(input.detail) : null,
    relatedIncidentId: input.relatedIncidentId ?? null,
    requestedByUserId: sessionUser?.id ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.insert(reviewerTasks).values(task);

  await appendLedgerEntryBestEffort({
    orgId: organization.id,
    type: "help_requested",
    metadata: {
      reviewerTaskId: task.id,
      kind: task.kind,
      summary: task.summary,
      relatedIncidentId: task.relatedIncidentId,
    },
  });

  return task;
}

export async function listReviewerTasksForOrg(orgId: string): Promise<ReviewerTask[]> {
  const db = await getDb();
  return db
    .select()
    .from(reviewerTasks)
    .where(eq(reviewerTasks.orgId, orgId))
    .orderBy(desc(reviewerTasks.createdAt));
}

export async function listOpenReviewerTasks(): Promise<ReviewerTask[]> {
  const organization = await requireOrganization();
  const tasks = await listReviewerTasksForOrg(organization.id);
  return tasks.filter((task) => task.status !== "closed");
}

export async function updateReviewerTaskStatus(
  taskId: string,
  status: ReviewerTaskStatus,
): Promise<ReviewerTask | null> {
  const organization = await requireOrganization();
  const db = await getDb();
  const [task] = await db
    .update(reviewerTasks)
    .set({ status, updatedAt: nowIsoTimestamp() })
    .where(and(eq(reviewerTasks.id, taskId), eq(reviewerTasks.orgId, organization.id)))
    .returning();
  return task ?? null;
}
