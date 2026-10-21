import { looksLikeInjection } from "@/ai/injection";
import { interviewWithAnthropic } from "@/ai/interview-anthropic";
import { interviewWithMock } from "@/ai/interview-mock";
import {
  InterviewTurnSchema,
  type InterviewerInput,
  type InterviewFinding,
  type InterviewTurn,
  type InterviewTurnResult,
} from "@/ai/interview-schema";
import { hasApiKey } from "@/ai/model";
import { redactSecrets } from "@/ai/redaction";

export { INTERVIEW_PROMPT_VERSION, MOCK_INTERVIEW_MODEL } from "@/ai/interview-mock";

// A single answer should never be longer than this; the interviewer wants short spoken-style replies.
export const MAX_INTERVIEW_ANSWER_CHARACTERS = 4000;

export class InterviewInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterviewInputError";
  }
}

export type Interviewer = (input: InterviewerInput) => InterviewTurnResult | Promise<InterviewTurnResult>;

export type RunInterviewTurnOptions = {
  // Lets tests inject a deterministic or spy interviewer; defaults to Anthropic-or-mock.
  interviewer?: Interviewer;
};

export type RunInterviewTurnOutcome = InterviewTurnResult & {
  injectionDetected: boolean;
  redactedSecretCount: number;
  // The owner's answer after redaction/injection-stripping — what the caller should persist as the
  // user turn, so the stored transcript never holds a raw secret. Null when no answer was sent.
  processedAnswer: string | null;
};

function defaultInterviewer(input: InterviewerInput): Promise<InterviewTurnResult> {
  if (hasApiKey()) return interviewWithAnthropic(input);
  return Promise.resolve(interviewWithMock(input));
}

// The core guardrail: a conversational agent can talk an owner into a "met" they did not actually
// claim. A "met" finding is kept only when the model marked it as the owner's own attestation; an
// inferred "met" is downgraded to "unclear" so a pass always traces back to the owner, never to the
// model's enthusiasm. Evidence-backed "accepted" is a different status the reviewer owns entirely.
export function coerceFinding(finding: InterviewFinding): InterviewFinding {
  if (finding.status === "met" && finding.source !== "attested") {
    return { ...finding, status: "unclear" };
  }
  return finding;
}

export async function runInterviewTurn(
  input: InterviewerInput,
  options: RunInterviewTurnOptions = {},
): Promise<RunInterviewTurnOutcome> {
  let latestUserAnswer: string | null = null;
  let injectionDetected = false;
  let redactedSecretCount = 0;

  if (input.latestUserAnswer !== null) {
    const trimmed = input.latestUserAnswer.trim();
    if (trimmed.length === 0) {
      throw new InterviewInputError("Type an answer before sending.");
    }
    if (trimmed.length > MAX_INTERVIEW_ANSWER_CHARACTERS) {
      throw new InterviewInputError(
        `Keep your answer to ${MAX_INTERVIEW_ANSWER_CHARACTERS.toLocaleString()} characters or fewer.`,
      );
    }
    // Redact secrets and strip instruction-shaped lines before the model ever sees the answer, so a
    // pasted password or an injected "ignore your rules" line never reaches the interviewer.
    injectionDetected = looksLikeInjection(trimmed);
    const redaction = redactSecrets(trimmed);
    redactedSecretCount = redaction.redactedCount;
    latestUserAnswer = redaction.text
      .split("\n")
      .map((line) => (looksLikeInjection(line) ? "[UNTRUSTED INSTRUCTION REMOVED]" : line))
      .join("\n");
  }

  const interviewer = options.interviewer ?? defaultInterviewer;
  const result = await interviewer({ ...input, latestUserAnswer });
  const parsed = InterviewTurnSchema.parse(result.turn);

  // Enforce what the model is not trusted to keep: findings must name a practice in THIS family, and
  // an inferred "met" is coerced down. Dropping out-of-family ids stops a stray id from writing a
  // finding against another control.
  const allowedPracticeIds = new Set(input.practices.map((practice) => practice.id));
  const findings = parsed.proposedFindings
    .filter((finding) => allowedPracticeIds.has(finding.practiceId))
    .map(coerceFinding);

  const turn: InterviewTurn = { ...parsed, proposedFindings: findings };

  return {
    turn,
    model: result.model,
    promptVersion: result.promptVersion,
    isMock: result.isMock,
    rawResponse: result.rawResponse,
    injectionDetected,
    redactedSecretCount,
    processedAnswer: latestUserAnswer,
  };
}
