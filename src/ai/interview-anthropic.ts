import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createModelClient, describeModelError, resolveModel } from "@/ai/model";
import {
  InterviewTurnSchema,
  type InterviewerInput,
  type InterviewTurn,
  type InterviewTurnResult,
} from "@/ai/interview-schema";

const PROMPT_VERSION = "interview.v1";
const PROMPT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "prompts",
  `${PROMPT_VERSION}.md`,
);

let cachedSystemPrompt: string | null = null;
function loadSystemPrompt(): string {
  if (cachedSystemPrompt === null) {
    cachedSystemPrompt = readFileSync(PROMPT_PATH, "utf8");
  }
  return cachedSystemPrompt;
}

// The family's practices, read from the static catalog. This is the only place the model learns
// control text, so it never has to recall it from memory.
export function buildFamilyBriefing(input: InterviewerInput): string {
  const recorded = new Map(input.findingsSoFar.map((finding) => [finding.practiceId, finding.status]));
  const practiceLines = input.practices.map((practice, index) => {
    const statusNote = recorded.has(practice.id)
      ? `  (already recorded: ${recorded.get(practice.id)})`
      : "";
    return [
      `### ${index + 1}. ${practice.id} — ${practice.title}${statusNote}`,
      `Plain-English meaning: ${practice.plainEnglish}`,
      `Why it matters: ${practice.whyItMatters}`,
      `What an assessor looks for: ${practice.assessmentObjectives.join("; ")}`,
    ].join("\n");
  });

  return [
    `# Control family under review: ${input.familyCode} — ${input.familyName} (CMMC Level ${input.level})`,
    "",
    "Walk through these practices one at a time. Ask about the ones not yet recorded; when all are recorded, finish.",
    "",
    ...practiceLines,
    "",
    "Begin (or continue) the interview. Acknowledge the owner's last answer if there was one, then ask your next question — or finish if every practice is covered.",
  ].join("\n");
}

// The conversation is reconstructed from stored state each turn: a kickoff user message carrying the
// family briefing, then the stored transcript, then the owner's latest answer. The first message
// must be a user turn, which the kickoff guarantees even before the owner has said anything.
export function buildInterviewMessages(input: InterviewerInput): Anthropic.Messages.MessageParam[] {
  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: buildFamilyBriefing(input) },
  ];
  for (const entry of input.transcript) {
    messages.push({ role: entry.role, content: entry.content });
  }
  if (input.latestUserAnswer !== null) {
    messages.push({ role: "user", content: input.latestUserAnswer });
  }
  return messages;
}

function buildFallbackTurn(message: string): InterviewTurn {
  return { assistantMessage: message, proposedFindings: [], isFamilyComplete: false };
}

// Never throws: like the reviewer and scam checker, any failure degrades to a safe turn that keeps
// the conversation moving and records nothing.
export async function interviewWithAnthropic(input: InterviewerInput): Promise<InterviewTurnResult> {
  const model = resolveModel();
  const base = { model, promptVersion: PROMPT_VERSION, isMock: false as const };

  try {
    const client = createModelClient();
    const response = await client.messages.parse({
      // Generous headroom: on claude-opus-5-5 adaptive thinking shares this budget, and a cap too
      // low truncates before the structured turn lands (parsed_output null -> fallback reply).
      model,
      max_tokens: 4000,
      system: loadSystemPrompt(),
      messages: buildInterviewMessages(input),
      output_config: { format: zodOutputFormat(InterviewTurnSchema) },
    });

    const rawResponse = JSON.stringify(response.content);

    if (response.stop_reason === "refusal") {
      return {
        ...base,
        rawResponse,
        turn: buildFallbackTurn(
          "Sorry — I can't continue that part of the check. Let's move on; tell me what you'd like to cover next.",
        ),
      };
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      return {
        ...base,
        rawResponse,
        turn: buildFallbackTurn("Sorry, I didn't catch that. Could you tell me again in your own words?"),
      };
    }

    return { ...base, rawResponse, turn: parsed };
  } catch (error) {
    return {
      ...base,
      rawResponse: null,
      turn: buildFallbackTurn(
        `Sorry, the check hit a snag (${describeModelError(error)}). Your earlier answers are saved — try sending that again.`,
      ),
    };
  }
}
