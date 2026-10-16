"use server";

import { z } from "zod";
import { SCAM_LANGUAGES, SCAM_RISK_LEVELS, SCAM_SOURCE_KINDS } from "@/ai/scam-schema";
import type { ActionResult } from "@/app/actions";
import { createReviewerTask, type ReviewerTask } from "@/lib/reviewer-tasks";

// Only the verdict travels to the reviewer queue, never the message itself: the message may hold
// customer data or secrets and the checker deliberately keeps it out of the database.
const ScamHelpRequestSchema = z.object({
  sourceKind: z.enum(SCAM_SOURCE_KINDS),
  riskLevel: z.enum(SCAM_RISK_LEVELS),
  language: z.enum(SCAM_LANGUAGES),
  isPaymentChangeOrWire: z.boolean(),
  summary: z.string().trim().min(1).max(1000),
  reasons: z.array(z.string().trim().max(500)).max(20),
  model: z.string().max(200),
  promptVersion: z.string().max(100),
});

export type ScamHelpRequestInput = z.infer<typeof ScamHelpRequestSchema>;

export async function requestScamHelpAction(
  input: ScamHelpRequestInput,
): Promise<ActionResult<ReviewerTask>> {
  const parsed = ScamHelpRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Could not read the check result to escalate it." };
  }
  try {
    const task = await createReviewerTask({
      kind: "scam_escalation",
      summary: parsed.data.isPaymentChangeOrWire
        ? "Payment-change or wire request flagged by the scam checker."
        : `Suspicious message rated ${parsed.data.riskLevel} risk by the scam checker.`,
      // Store categorical metadata only. Model prose can echo private message content.
      detail: {
        sourceKind: parsed.data.sourceKind, riskLevel: parsed.data.riskLevel,
        language: parsed.data.language, isPaymentChangeOrWire: parsed.data.isPaymentChangeOrWire,
        model: parsed.data.model, promptVersion: parsed.data.promptVersion,
      },
    });
    return { ok: true, data: task };
  } catch (error) {
    console.error("requestScamHelpAction failed", error);
    return { ok: false, error: "Could not send the help request. Please try again." };
  }
}
