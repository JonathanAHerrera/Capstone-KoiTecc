"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/actions";
import {
  getLatestInterviewSnapshot,
  InterviewInputError,
  startInterview,
  submitInterviewAnswer,
  type InterviewSnapshot,
} from "@/lib/interview";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireSessionUserId } from "@/lib/session";

const FamilyCodeSchema = z.string().trim().min(1).max(10);
const AnswerSchema = z.object({
  interviewId: z.string().trim().min(1).max(64),
  answer: z.string().trim().min(1).max(4000),
});

// Per-user window so a stuck client or an abusive caller can't spin the model; generous enough that
// a real conversation never hits it.
const ANSWER_RATE_LIMIT = { limit: 60, windowMs: 60 * 60 * 1000 };

function describeError(error: unknown, fallback: string): string {
  if (error instanceof InterviewInputError) return error.message;
  return fallback;
}

export async function startInterviewAction(
  familyCode: string,
): Promise<ActionResult<InterviewSnapshot>> {
  const parsed = FamilyCodeSchema.safeParse(familyCode);
  if (!parsed.success) {
    return { ok: false, error: "That control family could not be opened." };
  }
  try {
    const snapshot = await startInterview(parsed.data);
    return { ok: true, data: snapshot };
  } catch (error) {
    console.error(`startInterviewAction failed for ${familyCode}`, error);
    return { ok: false, error: describeError(error, "Could not start the check. Please try again.") };
  }
}

export async function getInterviewSnapshotAction(
  familyCode: string,
): Promise<ActionResult<InterviewSnapshot | null>> {
  const parsed = FamilyCodeSchema.safeParse(familyCode);
  if (!parsed.success) {
    return { ok: false, error: "That control family could not be opened." };
  }
  try {
    const snapshot = await getLatestInterviewSnapshot(parsed.data);
    return { ok: true, data: snapshot };
  } catch (error) {
    console.error(`getInterviewSnapshotAction failed for ${familyCode}`, error);
    return { ok: false, error: describeError(error, "Could not load the check. Please try again.") };
  }
}

export async function sendInterviewAnswerAction(
  interviewId: string,
  answer: string,
): Promise<ActionResult<InterviewSnapshot>> {
  const parsed = AnswerSchema.safeParse({ interviewId, answer });
  if (!parsed.success) {
    return { ok: false, error: "Type an answer before sending." };
  }

  try {
    const userId = await requireSessionUserId();
    const rate = checkRateLimit(`interview-answer:${userId}`, ANSWER_RATE_LIMIT);
    if (!rate.allowed) {
      return {
        ok: false,
        error: `You're sending answers very quickly. Try again in about ${rate.retryAfterSeconds} seconds.`,
      };
    }

    const snapshot = await submitInterviewAnswer(parsed.data.interviewId, parsed.data.answer);
    // The adaptive path reads interview findings, so refresh it once the answer is recorded.
    revalidatePath("/path");
    revalidatePath("/coordinator");
    return { ok: true, data: snapshot };
  } catch (error) {
    console.error(`sendInterviewAnswerAction failed for ${interviewId}`, error);
    return { ok: false, error: describeError(error, "Could not send your answer. Please try again.") };
  }
}
