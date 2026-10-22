import { and, desc, eq, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, nowIsoTimestamp } from "@/db/client";
import { incidents, reviewerTasks, type ReviewerTaskKind, type ReviewerTaskRow } from "@/db/schema";
import { appendLedgerEntryBestEffort } from "@/lib/ledger";
import { requireOrganization } from "@/lib/org";
import { getSessionUser } from "@/lib/session";

export type ReviewerTask = ReviewerTaskRow;
export const REVIEWER_TASK_STATUSES = ["open", "in_progress", "closed"] as const;
export type ReviewerTaskStatus = (typeof REVIEWER_TASK_STATUSES)[number];

export const REVIEWER_TASK_KIND_LABELS: Readonly<Record<ReviewerTaskKind, string>> = {
  incident_help: "Incident help request",
  scam_escalation: "Suspicious message escalation",
  general_help: "KoiTecc help request",
};

export type CreateReviewerTaskInput = {
  kind: ReviewerTaskKind;
  summary: string;
  // Redacted, display-only context for the reviewer. Never put the raw message or any secret here.
  detail?: Record<string, unknown> | null;
  relatedIncidentId?: string | null;
};

// The help actions create a durable reviewer task and ledger entry so requests are visible to KOITECC.
export async function createReviewerTask(input: CreateReviewerTaskInput): Promise<ReviewerTask> {
  const organization = await requireOrganization();
  const sessionUser = await getSessionUser();
  const db = await getDb();
  const timestamp = nowIsoTimestamp();

  if (input.relatedIncidentId) {
    const [incident] = await db.select({ id: incidents.id }).from(incidents)
      .where(and(eq(incidents.id, input.relatedIncidentId), eq(incidents.orgId, organization.id))).limit(1);
    if (!incident) throw new Error("Incident not found.");
    const [existing] = await db.select().from(reviewerTasks).where(and(
      eq(reviewerTasks.orgId, organization.id), eq(reviewerTasks.relatedIncidentId, incident.id),
      eq(reviewerTasks.kind, input.kind), ne(reviewerTasks.status, "closed"),
    )).limit(1);
    if (existing) return existing;
  }

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
  const organization = await requireOrganization();
  if (organization.id !== orgId) throw new Error("Organization not found.");
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
