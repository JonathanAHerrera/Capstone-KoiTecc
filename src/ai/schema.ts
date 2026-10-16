import { z } from "zod";
import type { EvidenceFileRow } from "@/db/schema";

// Verdict vocabulary is deliberately narrow and never says "compliant" or "passed". The scanner
// reports whether the evidence *looks* sufficient, needs work, or needs a human to decide.
export const EVIDENCE_VERDICTS = ["looks_sufficient", "needs_work", "needs_human_review"] as const;
export type EvidenceVerdict = (typeof EVIDENCE_VERDICTS)[number];

// Concerns are machine-detected signals (not model opinions) that the pipeline raises before or
// alongside the model so the UI can explain *why* something was flagged for a human.
export const EVIDENCE_CONCERNS = [
  "stale_image",
  "possible_reuse",
  "unreadable",
  "possible_injection",
  "possible_secret",
] as const;
export type EvidenceConcern = (typeof EVIDENCE_CONCERNS)[number];

export const EvidenceAnalysisSchema = z.object({
  verdict: z
    .enum(EVIDENCE_VERDICTS)
    .describe(
      'Use "looks_sufficient" only when the evidence itself plausibly demonstrates the control; "needs_work" when something concrete is missing; "needs_human_review" when the content cannot be trusted or judged automatically.',
    ),
  confidence: z
    .number()
    .describe("0 to 1; how confident you are in the verdict given the evidence quality"),
  summary: z
    .string()
    .describe("At most two plain-English sentences, second person, no compliance claims"),
  extracted: z
    .record(z.string(), z.string())
    .describe(
      "Observable facts pulled from the evidence: visible dates, org or product names, settings shown. Never include secrets.",
    ),
  missing: z
    .array(z.string())
    .describe("Specific evidence that is absent, unreadable, or insufficient; empty when sufficient"),
  nextSteps: z
    .array(z.string())
    .describe("Concrete actions the uploader should take next, most important first"),
  concerns: z
    .array(z.enum(EVIDENCE_CONCERNS))
    .describe("Signals that reduce trust in the evidence; empty when none apply"),
});

export type EvidenceAnalysis = z.infer<typeof EvidenceAnalysisSchema>;

// What the pipeline hands the model/mock for a single evidence file. redactedBytes is the
// metadata-stripped, secret-scrubbed payload; rawText is the extracted text (already redacted)
// when the file is textual.
export type EvidenceAnalysisInput = {
  file: EvidenceFileRow;
  bytes: Buffer | null;
  controlTitle: string;
  controlExplainer: string;
  note: string | null;
};

export type EvidenceAnalysisResult = {
  analysis: EvidenceAnalysis;
  model: string;
  isMock: boolean;
  rawResponse: string | null;
};

export function clampConfidence(confidence: number): number {
  if (!Number.isFinite(confidence)) return 0;
  return Math.min(1, Math.max(0, confidence));
}
