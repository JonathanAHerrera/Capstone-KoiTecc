import type { ReviewerInput, ReviewerResult, ReviewVerdict } from "@/lib/reviewer/schema";

export const MOCK_REVIEWER_MODEL = "mock-reviewer";
export const MOCK_MINIMUM_NOTE_LENGTH = 20;

export function runMockReviewer(input: ReviewerInput): ReviewerResult {
  const { practice, submission, evidence } = input;
  const allowedEvidence = evidence.filter((item) => practice.evidenceTypes.includes(item.file.kind));
  const noteLength = submission.note?.trim().length ?? 0;
  const hasAllowedEvidence = allowedEvidence.length > 0;
  const hasSufficientNote = noteLength >= MOCK_MINIMUM_NOTE_LENGTH;
  const accepted = hasAllowedEvidence && hasSufficientNote;

  const missingItems: string[] = [];
  if (!hasAllowedEvidence) {
    if (evidence.length > 0) {
      missingItems.push(
        `The uploaded evidence kind is not accepted for this practice. Accepted kinds: ${practice.evidenceTypes.join(", ")}.`,
      );
    }
    for (const example of practice.evidenceExamples.slice(0, 3)) {
      missingItems.push(example);
    }
  }
  if (!hasSufficientNote) {
    missingItems.push(
      `A short note (at least ${MOCK_MINIMUM_NOTE_LENGTH} characters) explaining what the evidence shows and how it was produced.`,
    );
  }

  const objectiveFindings = practice.assessmentObjectives.map((objective) => ({
    objective,
    met: accepted,
    note: accepted
      ? `Mock reviewer: ${allowedEvidence.length} evidence file(s) and a note were provided, so this objective is treated as plausibly demonstrated.`
      : "Mock reviewer: evidence or note is missing, so this objective cannot be confirmed yet.",
  }));

  const summary = accepted
    ? `Mock review (no ANTHROPIC_API_KEY set). ${allowedEvidence.length} evidence file(s) of an accepted kind plus a descriptive note were found for ${practice.id}, so this practice is marked accepted for readiness tracking. A real reviewer would inspect the file contents.`
    : `Mock review (no ANTHROPIC_API_KEY set). ${practice.id} needs more before it can be accepted: ${
        !hasAllowedEvidence ? "no accepted evidence file was uploaded" : ""
      }${!hasAllowedEvidence && !hasSufficientNote ? " and " : ""}${
        !hasSufficientNote ? "the note is too short to explain the evidence" : ""
      }.`;

  const nextSteps = accepted
    ? ["Move on to the next practice.", "Keep the original evidence files somewhere an assessor can retrieve them."]
    : [
        ...(!hasAllowedEvidence
          ? [`Upload one of: ${practice.evidenceTypes.join(", ")} — for example, ${practice.evidenceExamples[0] ?? "a relevant document"}.`]
          : []),
        ...(!hasSufficientNote
          ? ["Write one or two sentences describing what the evidence shows."]
          : []),
        "Submit for review again.",
      ];

  const verdict: ReviewVerdict = {
    verdict: accepted ? "accepted" : "needs_work",
    confidence: accepted ? 0.6 : 0.9,
    summary,
    objectiveFindings,
    missingItems,
    nextSteps,
  };

  return { verdict, reviewerModel: MOCK_REVIEWER_MODEL, isMock: true, rawResponse: null };
}
