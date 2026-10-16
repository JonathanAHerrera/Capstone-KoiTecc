import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  createModelClient,
  DEFAULT_MODEL,
  describeModelError,
  resolveModel,
} from "@/ai/model";
import { buildReviewerSystemPrompt, buildReviewerUserContent } from "@/lib/reviewer/prompt";
import {
  clampConfidence,
  ReviewVerdictSchema,
  type ReviewerInput,
  type ReviewerResult,
  type ReviewVerdict,
} from "@/lib/reviewer/schema";

// Model selection now lives in src/ai/model.ts so the evidence scanner and this legacy practice
// reviewer resolve the same model and honor the same CMMC_REVIEWER_MODEL override. These re-exports
// keep existing import sites (src/lib/applicability/enrich.ts) working.
export const DEFAULT_REVIEWER_MODEL = DEFAULT_MODEL;
export const resolveReviewerModel = resolveModel;

function buildFailureVerdict(input: ReviewerInput, summary: string): ReviewVerdict {
  return {
    verdict: "needs_work",
    confidence: 0,
    summary,
    objectiveFindings: input.practice.assessmentObjectives.map((objective) => ({
      objective,
      met: false,
      note: "Not evaluated because the automated review did not complete.",
    })),
    missingItems: [],
    nextSteps: ["Try submitting for review again in a moment."],
  };
}

export async function runAnthropicReviewer(input: ReviewerInput): Promise<ReviewerResult> {
  const reviewerModel = resolveReviewerModel();
  const baseResult = { reviewerModel, isMock: false as const };

  try {
    const client = createModelClient();
    const response = await client.messages.parse({
      model: reviewerModel,
      max_tokens: 16000,
      system: buildReviewerSystemPrompt(),
      messages: [{ role: "user", content: buildReviewerUserContent(input) }],
      output_config: { format: zodOutputFormat(ReviewVerdictSchema) },
    });

    const rawResponse = JSON.stringify(response.content);

    if (response.stop_reason === "refusal") {
      return {
        ...baseResult,
        rawResponse,
        verdict: buildFailureVerdict(
          input,
          "The reviewer declined to evaluate this submission. Check that the uploaded files are relevant business evidence and try again.",
        ),
      };
    }

    const parsedVerdict = response.parsed_output;
    if (!parsedVerdict) {
      return {
        ...baseResult,
        rawResponse,
        verdict: buildFailureVerdict(input, "Reviewer returned an unreadable response"),
      };
    }

    return {
      ...baseResult,
      rawResponse,
      verdict: { ...parsedVerdict, confidence: clampConfidence(parsedVerdict.confidence) },
    };
  } catch (error) {
    return {
      ...baseResult,
      rawResponse: null,
      verdict: buildFailureVerdict(input, `Automated review failed: ${describeModelError(error)}`),
    };
  }
}
