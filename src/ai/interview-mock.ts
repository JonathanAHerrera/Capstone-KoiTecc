import type {
  InterviewerInput,
  InterviewPracticeContext,
  InterviewTurnResult,
} from "@/ai/interview-schema";

export const INTERVIEW_PROMPT_VERSION = "interview.v1";
export const MOCK_INTERVIEW_MODEL = "mock-interviewer";

function buildQuestion(practice: InterviewPracticeContext, isFirst: boolean): string {
  const lead = isFirst
    ? `Let's start with ${practice.title}.`
    : `Thanks. Next, ${practice.title}.`;
  return `${lead} In plain terms: ${practice.plainEnglish} How is that handled in your business today?`;
}

// Deterministic stand-in used whenever ANTHROPIC_API_KEY is absent (local dev, CI, tests, demos).
// It walks the family's practices in order and records every answer as "unclear"/"inferred": with
// no model it cannot judge whether a control is really in place, and recording an honest "unclear"
// is exactly what the guardrail would force an inferred pass down to anyway.
export function interviewWithMock(input: InterviewerInput): InterviewTurnResult {
  const base = {
    model: MOCK_INTERVIEW_MODEL,
    promptVersion: INTERVIEW_PROMPT_VERSION,
    isMock: true as const,
    rawResponse: null,
  };

  const answeredCount = input.findingsSoFar.length;
  const proposedFindings = [];

  // The owner just answered the question about the practice at answeredCount; record it, then move on.
  if (input.latestUserAnswer !== null && answeredCount < input.practices.length) {
    const answered = input.practices[answeredCount];
    proposedFindings.push({
      practiceId: answered.id,
      status: "unclear" as const,
      source: "inferred" as const,
      rationale:
        "Recorded from your answer. The offline check can't confirm this is in place — add evidence so a reviewer can confirm it.",
    });
  }

  const nextIndex = input.latestUserAnswer !== null ? answeredCount + 1 : answeredCount;

  if (nextIndex >= input.practices.length) {
    return {
      ...base,
      turn: {
        assistantMessage: `That's everything for ${input.familyName}. Your answers are saved — open any practice I flagged to add evidence when you're ready.`,
        proposedFindings,
        isFamilyComplete: true,
      },
    };
  }

  const nextPractice = input.practices[nextIndex];
  return {
    ...base,
    turn: {
      assistantMessage: buildQuestion(nextPractice, nextIndex === 0),
      proposedFindings,
      isFamilyComplete: false,
      nextPracticeId: nextPractice.id,
    },
  };
}
