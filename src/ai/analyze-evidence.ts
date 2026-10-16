import { analyzeEvidenceWithAnthropic } from "@/ai/anthropic";
import { computeImageFingerprint, looksLikeReuse, sha256Hex } from "@/ai/image-fingerprint";
import { looksLikeInjection } from "@/ai/injection";
import { analyzeEvidenceWithMock, MOCK_MODEL } from "@/ai/mock";
import { hasApiKey } from "@/ai/model";
import { redactSecrets } from "@/ai/redaction";
import type {
  EvidenceAnalysis,
  EvidenceAnalysisInput,
  EvidenceAnalysisResult,
  EvidenceConcern,
} from "@/ai/schema";

const TEXT_MEDIA_TYPES: ReadonlySet<string> = new Set(["text/plain", "text/markdown", "text/csv"]);

// Evidence uploaded more than this long ago may no longer reflect the current configuration, so the
// scanner stops short of calling it sufficient on its own. APPROXIMATION: freshness is measured
// from upload time (the stored createdAt), not from a date visible inside the image — EXIF capture
// dates are stripped on ingest and we do not OCR. A model/OCR-extracted capture date would be more
// accurate; tracked as a TODO.
export const DEFAULT_FRESHNESS_WINDOW_DAYS = 365;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// Signature both back ends satisfy. redactedText is the scrubbed file text for textual evidence and
// null otherwise, so the real model never receives an unredacted SSN or account number.
export type EvidenceAnalyzer = (
  input: EvidenceAnalysisInput,
  redactedText: string | null,
) => EvidenceAnalysisResult | Promise<EvidenceAnalysisResult>;

export type AnalyzeEvidenceOptions = {
  now?: Date;
  // Fingerprints of this org's previously uploaded images; a match flags possible reuse.
  knownFingerprints?: readonly string[];
  freshnessWindowDays?: number;
  // Lets tests inject a deterministic or spy analyzer; defaults to Anthropic-or-mock.
  analyzer?: EvidenceAnalyzer;
};

export type AnalyzeEvidenceOutcome = EvidenceAnalysisResult & {
  sha256: string | null;
  fingerprint: string | null;
};

function defaultAnalyzer(
  input: EvidenceAnalysisInput,
  redactedText: string | null,
): Promise<EvidenceAnalysisResult> {
  if (hasApiKey()) return analyzeEvidenceWithAnthropic(input, redactedText);
  return Promise.resolve(analyzeEvidenceWithMock(input));
}

function isImage(mimeType: string): boolean {
  return (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/gif" ||
    mimeType === "image/webp"
  );
}

function addConcern(concerns: EvidenceConcern[], concern: EvidenceConcern): void {
  if (!concerns.includes(concern)) concerns.push(concern);
}

function addNextStep(analysis: EvidenceAnalysis, step: string): void {
  if (!analysis.nextSteps.includes(step)) analysis.nextSteps.unshift(step);
}

function addMissing(analysis: EvidenceAnalysis, item: string): void {
  if (!analysis.missing.includes(item)) analysis.missing.push(item);
}

// Runs the trust checks the model cannot be relied on to run (dedupe, freshness, injection, secret
// scrubbing), calls the chosen analyzer with redacted text, then reconciles the model's verdict
// with those machine-detected concerns. The concerns always win when they are more cautious.
export async function analyzeEvidence(
  input: EvidenceAnalysisInput,
  options: AnalyzeEvidenceOptions = {},
): Promise<AnalyzeEvidenceOutcome> {
  const now = options.now ?? new Date();
  const freshnessWindowDays = options.freshnessWindowDays ?? DEFAULT_FRESHNESS_WINDOW_DAYS;
  const analyzer = options.analyzer ?? defaultAnalyzer;
  const knownFingerprints = options.knownFingerprints ?? [];

  const pipelineConcerns: EvidenceConcern[] = [];
  const { file, bytes } = input;

  const sha256 = bytes ? sha256Hex(bytes) : null;

  let fingerprint: string | null = null;
  if (bytes && isImage(file.mimeType)) {
    fingerprint = computeImageFingerprint(bytes);
    if (knownFingerprints.some((known) => looksLikeReuse(known, fingerprint as string))) {
      addConcern(pipelineConcerns, "possible_reuse");
    }

    const uploadedAt = Date.parse(file.createdAt);
    if (Number.isFinite(uploadedAt)) {
      const ageDays = (now.getTime() - uploadedAt) / MILLISECONDS_PER_DAY;
      if (ageDays > freshnessWindowDays) addConcern(pipelineConcerns, "stale_image");
    }
  }

  let redactedText: string | null = null;
  if (bytes && TEXT_MEDIA_TYPES.has(file.mimeType)) {
    const rawText = bytes.toString("utf8");
    if (looksLikeInjection(rawText)) addConcern(pipelineConcerns, "possible_injection");
    const redaction = redactSecrets(rawText);
    redactedText = redaction.text;
    if (redaction.redactedCount > 0) addConcern(pipelineConcerns, "possible_secret");
  }

  const result = await analyzer(input, redactedText);
  const analysis: EvidenceAnalysis = {
    ...result.analysis,
    extracted: { ...result.analysis.extracted },
    missing: [...result.analysis.missing],
    nextSteps: [...result.analysis.nextSteps],
    concerns: [...result.analysis.concerns],
  };

  for (const concern of pipelineConcerns) addConcern(analysis.concerns, concern);

  // Reconcile: the most cautious signal wins. Injection means the content tried to steer the
  // verdict, so it always goes to a human regardless of what the model returned.
  if (analysis.concerns.includes("possible_injection")) {
    analysis.verdict = "needs_human_review";
    addNextStep(
      analysis,
      "A human should review this file — its text appears to contain instructions aimed at the scanner.",
    );
  } else {
    if (analysis.concerns.includes("possible_secret") && analysis.verdict === "looks_sufficient") {
      analysis.verdict = "needs_work";
      addMissing(analysis, "A version of this file with secrets (SSNs, card or account numbers) removed.");
      addNextStep(analysis, "Re-upload this file with any sensitive numbers blacked out.");
    }
    if (analysis.concerns.includes("stale_image") && analysis.verdict === "looks_sufficient") {
      analysis.verdict = "needs_work";
      addNextStep(analysis, "Upload a current screenshot or photo; this one is over a year old.");
    }
    if (analysis.concerns.includes("possible_reuse") && analysis.verdict === "looks_sufficient") {
      analysis.verdict = "needs_work";
      addNextStep(
        analysis,
        "Upload evidence specific to this control; this file looks like one already used elsewhere.",
      );
    }
  }

  return {
    analysis,
    model: result.model,
    isMock: result.isMock,
    rawResponse: result.rawResponse,
    sha256,
    fingerprint,
  };
}

export { MOCK_MODEL };
