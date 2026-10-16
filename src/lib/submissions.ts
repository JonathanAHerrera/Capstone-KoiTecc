import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, nowIsoTimestamp } from "@/db/client";
import {
  evidenceFiles,
  submissions,
  type EvidenceFileRow,
  type SubmissionRow,
  type SubmissionStatus,
} from "@/db/schema";
import { requireOrganization } from "@/lib/org";
import {
  getAllPractices,
  getFrameworkForPractice,
  getPractice,
  getPracticesForFramework,
} from "@/lib/practices";
import type { DerivedPracticeStatus, FrameworkId } from "@/lib/practice-types";
import { getLatestReviewForSubmission, type ReviewRecord } from "@/lib/reviews";

export type Submission = SubmissionRow;
export type EvidenceFile = EvidenceFileRow;

export type SubmissionWithEvidence = {
  submission: Submission;
  evidenceFiles: EvidenceFile[];
  latestReview: ReviewRecord | null;
};

export function deriveStatusFromSubmission(
  submission: Pick<Submission, "status"> | null | undefined,
): DerivedPracticeStatus {
  if (!submission) return "not_started";
  switch (submission.status) {
    case "draft":
      return "in_progress";
    case "submitted":
    case "reviewing":
      return "under_review";
    case "accepted":
      return "accepted";
    case "needs_work":
      return "needs_work";
  }
}

function assertPracticeExists(practiceId: string): void {
  if (!getPractice(practiceId)) {
    throw new Error(`Unknown practice id: ${practiceId}`);
  }
}

// Org-scoped by design: a submission id from another tenant resolves to null so callers
// (evidence viewer, status mutations, reviewer) can never reach across the tenant boundary.
export async function getSubmissionById(submissionId: string): Promise<Submission | null> {
  const organization = await requireOrganization();
  const db = await getDb();
  const rows = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, submissionId), eq(submissions.orgId, organization.id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSubmissionForPractice(practiceId: string): Promise<Submission | null> {
  const organization = await requireOrganization();
  const db = await getDb();
  const rows = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.orgId, organization.id), eq(submissions.practiceId, practiceId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOrCreateDraftSubmission(practiceId: string): Promise<Submission> {
  assertPracticeExists(practiceId);
  const existingSubmission = await getSubmissionForPractice(practiceId);
  if (existingSubmission) return existingSubmission;

  const organization = await requireOrganization();
  const db = await getDb();
  const timestamp = nowIsoTimestamp();
  const newSubmission: Submission = {
    id: nanoid(),
    orgId: organization.id,
    practiceId,
    framework: getFrameworkForPractice(practiceId) ?? null,
    status: "draft",
    note: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  // Concurrent first-visits can race on the UNIQUE(orgId, practiceId) index, so a
  // losing insert falls through to re-reading the winner's row.
  await db.insert(submissions).values(newSubmission).onConflictDoNothing();
  const storedSubmission = await getSubmissionForPractice(practiceId);
  if (!storedSubmission) {
    throw new Error(`Failed to create draft submission for ${practiceId}`);
  }
  return storedSubmission;
}

export async function getSubmissionWithEvidence(
  practiceId: string,
): Promise<SubmissionWithEvidence | null> {
  const submission = await getSubmissionForPractice(practiceId);
  if (!submission) return null;
  return getSubmissionWithEvidenceById(submission.id);
}

export async function getSubmissionWithEvidenceById(
  submissionId: string,
): Promise<SubmissionWithEvidence | null> {
  const submission = await getSubmissionById(submissionId);
  if (!submission) return null;
  const db = await getDb();
  const [files, latestReview] = await Promise.all([
    db
      .select()
      .from(evidenceFiles)
      .where(eq(evidenceFiles.submissionId, submission.id))
      .orderBy(evidenceFiles.createdAt),
    getLatestReviewForSubmission(submission.id),
  ]);
  return { submission, evidenceFiles: files, latestReview };
}

export async function listPracticeStatuses(): Promise<Record<string, DerivedPracticeStatus>> {
  const organization = await requireOrganization();
  const db = await getDb();
  const rows = await db
    .select({ practiceId: submissions.practiceId, status: submissions.status })
    .from(submissions)
    .where(eq(submissions.orgId, organization.id));
  const statusBySubmissionPractice = new Map(rows.map((row) => [row.practiceId, row]));

  const statuses: Record<string, DerivedPracticeStatus> = {};
  for (const practice of getAllPractices()) {
    statuses[practice.id] = deriveStatusFromSubmission(
      statusBySubmissionPractice.get(practice.id),
    );
  }
  return statuses;
}

export async function listPracticeStatusesForFramework(
  framework: FrameworkId,
): Promise<Record<string, DerivedPracticeStatus>> {
  const organization = await requireOrganization();
  const db = await getDb();
  const rows = await db
    .select({ practiceId: submissions.practiceId, status: submissions.status })
    .from(submissions)
    .where(eq(submissions.orgId, organization.id));
  const statusBySubmissionPractice = new Map(rows.map((row) => [row.practiceId, row]));

  const statuses: Record<string, DerivedPracticeStatus> = {};
  for (const practice of getPracticesForFramework(framework)) {
    statuses[practice.id] = deriveStatusFromSubmission(
      statusBySubmissionPractice.get(practice.id),
    );
  }
  return statuses;
}

export async function saveSubmissionNote(practiceId: string, note: string): Promise<Submission> {
  const submission = await getOrCreateDraftSubmission(practiceId);
  const trimmedNote = note.trim();
  const db = await getDb();
  const updatedAt = nowIsoTimestamp();
  await db
    .update(submissions)
    .set({ note: trimmedNote.length > 0 ? trimmedNote : null, updatedAt })
    .where(eq(submissions.id, submission.id));
  return { ...submission, note: trimmedNote.length > 0 ? trimmedNote : null, updatedAt };
}

export async function markSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus,
): Promise<Submission> {
  const organization = await requireOrganization();
  const db = await getDb();
  const updatedAt = nowIsoTimestamp();
  // The orgId predicate means a cross-tenant id updates zero rows instead of flipping a status
  // the caller doesn't own; the follow-up read confirms the row actually belongs to this org.
  await db
    .update(submissions)
    .set({ status, updatedAt })
    .where(and(eq(submissions.id, submissionId), eq(submissions.orgId, organization.id)));
  const updatedSubmission = await getSubmissionById(submissionId);
  if (!updatedSubmission) {
    throw new Error(`Submission not found: ${submissionId}`);
  }
  return updatedSubmission;
}

export async function markSubmitted(submissionId: string): Promise<Submission> {
  return markSubmissionStatus(submissionId, "submitted");
}
