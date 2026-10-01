import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildReviewerSystemPrompt, buildReviewerUserContent } from "@/lib/reviewer/prompt";
import {
  clampConfidence,
  ReviewVerdictSchema,
  type ReviewerInput,
  type ReviewerResult,
  type ReviewVerdict,
} from "@/lib/reviewer/schema";

export const DEFAULT_REVIEWER_MODEL = "claude-opus-5-5";

export function resolveReviewerModel(): string {
  const override = process.env.CMMC_REVIEWER_MODEL;
  return override && override.trim().length > 0 ? override.trim() : DEFAULT_REVIEWER_MODEL;
}

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

function describeError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    return `${error.status ?? "network"} ${error.name}: ${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function runAnthropicReviewer(input: ReviewerInput): Promise<ReviewerResult> {
  const reviewerModel = resolveReviewerModel();
  const baseResult = { reviewerModel, isMock: false as const };

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: reviewerModel,
      max_tokens: 4000,
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
      verdict: buildFailureVerdict(input, `Automated review failed: ${describeError(error)}`),
    };
  }
}
