import { z } from "zod";

// A readiness finding the interviewer records for one practice. "met" means the control is in
// place, "not_met" that it is not, "unclear" that the answer did not settle it. source separates an
// explicit owner attestation from an inference the model drew — the orchestrator never lets an
// inferred "met" stand (see coerceFinding), so a leading question can't manufacture a pass.
export const INTERVIEW_FINDING_STATUSES = ["met", "not_met", "unclear"] as const;
export type InterviewFindingStatusValue = (typeof INTERVIEW_FINDING_STATUSES)[number];

export const INTERVIEW_FINDING_SOURCES = ["attested", "inferred"] as const;
export type InterviewFindingSourceValue = (typeof INTERVIEW_FINDING_SOURCES)[number];

export const InterviewFindingSchema = z.object({
  practiceId: z
    .string()
    .describe("The exact catalog id of the practice this finding is about, e.g. AC.L1-b.1.i."),
  status: z
    .enum(INTERVIEW_FINDING_STATUSES)
    .describe(
      '"met" only when the owner clearly says the control is already in place; "not_met" when they say it is not or describe its absence; "unclear" when the answer does not settle it.',
    ),
  source: z
    .enum(INTERVIEW_FINDING_SOURCES)
    .describe(
      '"attested" only when the owner explicitly confirmed this themselves; "inferred" when you are reading it from what they said. Never pair "met" with "inferred".',
    ),
  rationale: z
    .string()
    .describe("One short sentence, second person, saying what the owner told you that supports this."),
});

export type InterviewFinding = z.infer<typeof InterviewFindingSchema>;

export const InterviewTurnSchema = z.object({
  assistantMessage: z
    .string()
    .describe(
      "Your next message to the owner: at most two short, plain-English sentences. Acknowledge their last answer if there was one, then ask one question about the next practice. No jargon, no legal or certification claims.",
    ),
  proposedFindings: z
    .array(InterviewFindingSchema)
    .describe(
      "Findings justified by the owner's latest answer only. Usually zero or one. Empty when the answer settled nothing.",
    ),
  isFamilyComplete: z
    .boolean()
    .describe("true only when every practice in this family has been covered and there is nothing left to ask."),
  nextPracticeId: z
    .string()
    .optional()
    .describe("The catalog id of the practice your question is about, when you are asking one."),
});

export type InterviewTurn = z.infer<typeof InterviewTurnSchema>;

// The practice fields the interviewer is given for one family — the lookup_control surface, read
// from the static catalog so the model never recalls control text from memory.
export type InterviewPracticeContext = {
  id: string;
  title: string;
  plainEnglish: string;
  whyItMatters: string;
  assessmentObjectives: string[];
  officialText: string;
};

export type InterviewTranscriptEntry = {
  role: "assistant" | "user";
  content: string;
};

// Everything an analyzer (model or mock) needs for one turn. State lives in the database and is
// rebuilt into this shape each turn; latestUserAnswer is already redacted by the orchestrator.
export type InterviewerInput = {
  familyCode: string;
  familyName: string;
  level: 1 | 2;
  practices: InterviewPracticeContext[];
  transcript: InterviewTranscriptEntry[];
  findingsSoFar: { practiceId: string; status: InterviewFindingStatusValue }[];
  latestUserAnswer: string | null;
};

export type InterviewTurnResult = {
  turn: InterviewTurn;
  model: string;
  promptVersion: string;
  isMock: boolean;
  rawResponse: string | null;
};
