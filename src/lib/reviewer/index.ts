import { listEvidenceFilesForSubmission, readEvidenceFileBytes } from "@/lib/evidence";
import { getPractice } from "@/lib/practices";
import { runAnthropicReviewer } from "@/lib/reviewer/anthropic";
import { runMockReviewer } from "@/lib/reviewer/mock";
import type { ReviewerEvidenceInput, ReviewerInput, ReviewerResult } from "@/lib/reviewer/schema";
import { insertReview, type ReviewRecord } from "@/lib/reviews";
import { getSubmissionById, markSubmissionStatus } from "@/lib/submissions";

export type { ReviewRecord } from "@/lib/reviews";
export type { ReviewVerdict } from "@/lib/reviewer/schema";

export function hasAnthropicApiKey(): boolean {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return typeof apiKey === "string" && apiKey.trim().length > 0;
}

async function loadReviewerEvidence(submissionId: string, needsFileBytes: boolean) {
  const files = await listEvidenceFilesForSubmission(submissionId);
  const evidence: ReviewerEvidenceInput[] = [];
  for (const file of files) {
    let bytes: Buffer | null = null;
    if (needsFileBytes && !file.mimeType.startsWith("video/")) {
      try {
        bytes = await readEvidenceFileBytes(file);
      } catch {
        bytes = null;
      }
    }
    evidence.push({ file, bytes });
  }
  return evidence;
}

export async function reviewSubmission(submissionId: string): Promise<ReviewRecord> {
  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    throw new Error(`Submission not found: ${submissionId}`);
  }
  const practice = getPractice(submission.practiceId);
  if (!practice) {
    throw new Error(`Submission ${submissionId} references unknown practice ${submission.practiceId}`);
  }

  const useRealReviewer = hasAnthropicApiKey();
  await markSubmissionStatus(submissionId, "reviewing");

  const input: ReviewerInput = {
    practice,
    submission,
    evidence: await loadReviewerEvidence(submissionId, useRealReviewer),
  };

  let result: ReviewerResult;
  try {
    result = useRealReviewer ? await runAnthropicReviewer(input) : runMockReviewer(input);
  } catch (error) {
    // Any reviewer failure must leave the submission out of the "reviewing" state so
    // the user can retry instead of seeing a permanently spinning status.
    await markSubmissionStatus(submissionId, "needs_work");
    throw error;
  }

  const review = await insertReview({
    submissionId,
    verdict: result.verdict.verdict,
    confidence: result.verdict.confidence,
    summary: result.verdict.summary,
    objectiveFindings: result.verdict.objectiveFindings,
    missingItems: result.verdict.missingItems,
    nextSteps: result.verdict.nextSteps,
    reviewerModel: result.reviewerModel,
    isMock: result.isMock,
    rawResponse: result.rawResponse,
  });
  await markSubmissionStatus(submissionId, review.verdict);
  return review;
}
