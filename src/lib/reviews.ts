import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, nowIsoTimestamp } from "@/db/client";
import { reviews, type ReviewRow, type ReviewVerdictValue } from "@/db/schema";

export type ObjectiveFinding = {
  objective: string;
  met: boolean;
  note: string;
};

export type ReviewRecord = {
  id: string;
  submissionId: string;
  verdict: ReviewVerdictValue;
  confidence: number;
  summary: string;
  objectiveFindings: ObjectiveFinding[];
  missingItems: string[];
  nextSteps: string[];
  reviewerModel: string;
  isMock: boolean;
  createdAt: string;
};

export type NewReviewInput = Omit<ReviewRecord, "id" | "createdAt"> & {
  rawResponse: string | null;
};

function parseJsonArray<T>(serialized: string): T[] {
  try {
    const parsed: unknown = JSON.parse(serialized);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function parseReviewRow(row: ReviewRow): ReviewRecord {
  return {
    id: row.id,
    submissionId: row.submissionId,
    verdict: row.verdict,
    confidence: row.confidence,
    summary: row.summary,
    objectiveFindings: parseJsonArray<ObjectiveFinding>(row.objectiveFindings),
    missingItems: parseJsonArray<string>(row.missingItems),
    nextSteps: parseJsonArray<string>(row.nextSteps),
    reviewerModel: row.reviewerModel,
    isMock: row.isMock,
    createdAt: row.createdAt,
  };
}

export async function getLatestReviewForSubmission(
  submissionId: string,
): Promise<ReviewRecord | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(reviews)
    .where(eq(reviews.submissionId, submissionId))
    .orderBy(desc(reviews.createdAt))
    .limit(1);
  return rows[0] ? parseReviewRow(rows[0]) : null;
}

export async function listReviewsForSubmission(submissionId: string): Promise<ReviewRecord[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(reviews)
    .where(eq(reviews.submissionId, submissionId))
    .orderBy(desc(reviews.createdAt));
  return rows.map(parseReviewRow);
}

export async function insertReview(input: NewReviewInput): Promise<ReviewRecord> {
  const db = await getDb();
  const row: ReviewRow = {
    id: nanoid(),
    submissionId: input.submissionId,
    verdict: input.verdict,
    confidence: input.confidence,
    summary: input.summary,
    objectiveFindings: JSON.stringify(input.objectiveFindings),
    missingItems: JSON.stringify(input.missingItems),
    nextSteps: JSON.stringify(input.nextSteps),
    reviewerModel: input.reviewerModel,
    isMock: input.isMock,
    rawResponse: input.rawResponse,
    createdAt: nowIsoTimestamp(),
  };
  await db.insert(reviews).values(row);
  return parseReviewRow(row);
}
