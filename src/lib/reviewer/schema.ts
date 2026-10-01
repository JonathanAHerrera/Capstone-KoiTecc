import { z } from "zod";
import type { EvidenceFileRow } from "@/db/schema";
import type { Practice } from "@/lib/practice-types";
import type { Submission } from "@/lib/submissions";

export const ReviewVerdictSchema = z.object({
  verdict: z
    .enum(["accepted", "needs_work"])
    .describe("accepted only when the evidence plausibly demonstrates every assessment objective"),
  confidence: z
    .number()
    .describe("0 to 1; how confident the reviewer is in the verdict given the evidence quality"),
  summary: z
    .string()
    .describe("At most two plain-English sentences, written in second person to the uploader"),
  objectiveFindings: z
    .array(
      z.object({
        objective: z.string().describe("The assessment objective text, verbatim"),
        met: z.boolean(),
        note: z.string().describe("What in the evidence supports or fails this objective"),
      }),
    )
    .describe("One entry per assessment objective, in the order given"),
  missingItems: z
    .array(z.string())
    .describe("Specific evidence that is absent, unreadable, or insufficient; empty when accepted"),
  nextSteps: z
    .array(z.string())
    .describe("Concrete actions the uploader should take next, most important first"),
});

export type ReviewVerdict = z.infer<typeof ReviewVerdictSchema>;

export type ReviewerEvidenceInput = {
  file: EvidenceFileRow;
  bytes: Buffer | null;
};

export type ReviewerInput = {
  practice: Practice;
  submission: Submission;
  evidence: ReviewerEvidenceInput[];
};

export type ReviewerResult = {
  verdict: ReviewVerdict;
  reviewerModel: string;
  isMock: boolean;
  rawResponse: string | null;
};

export function clampConfidence(confidence: number): number {
  if (!Number.isFinite(confidence)) return 0;
  return Math.min(1, Math.max(0, confidence));
}
