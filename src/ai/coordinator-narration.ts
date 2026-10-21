import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createModelClient, hasApiKey, resolveModel } from "@/ai/model";

// Keep this decoupled from the coordinator's own types so src/lib can depend on src/ai (not the
// other way round): the narrator only needs each task's headline and reason.
export type NarratableTask = { title: string; reason: string };
export type CoordinatorProgress = { doneCount: number; totalCount: number };

export type CoordinatorNarration = { narration: string; isMockNarration: boolean };

const NarrationSchema = z.object({
  narration: z
    .string()
    .describe(
      "One or two short, warm sentences, second person, telling the owner what to tackle first and why. Ground it ONLY in the tasks given. No jargon, no certification or compliance claims.",
    ),
});

const SYSTEM_PROMPT = [
  "You are a friendly CMMC readiness coordinator for a non-technical small-business owner.",
  "You are given the owner's progress and their next to-do items, already prioritized.",
  "Write one or two short, encouraging sentences, in second person, pointing them at the first thing to do and why.",
  "Ground everything ONLY in the tasks you are given. Never invent tasks, never give legal advice, and never say or imply they are certified, compliant, or finished with CMMC.",
].join(" ");

// Deterministic narration — always correct, used verbatim when there is no API key and as the
// fail-closed fallback when the model errors or refuses.
function deterministicNarration(tasks: NarratableTask[], progress: CoordinatorProgress): string {
  if (tasks.length === 0) {
    return progress.totalCount > 0 && progress.doneCount === progress.totalCount
      ? "You're all caught up — every requirement at your level is accepted. Nice work."
      : "Nothing is waiting on you right now.";
  }
  const [first] = tasks;
  const remaining = tasks.length - 1;
  const tail =
    remaining > 0
      ? ` Then there ${remaining === 1 ? "is 1 more thing" : `are ${remaining} more`} after that.`
      : "";
  return `I'd start with ${first.title}: ${first.reason}${tail}`;
}

function buildUserContent(tasks: NarratableTask[], progress: CoordinatorProgress): string {
  return [
    `Progress: ${progress.doneCount} of ${progress.totalCount} requirements accepted.`,
    "Next to-do items, most important first:",
    ...tasks.slice(0, 5).map((task, index) => `${index + 1}. ${task.title} — ${task.reason}`),
  ].join("\n");
}

// Strictly additive, like the applicability enrichment: any missing key, refusal, or error falls
// back to the deterministic line so the coordinator always has something sensible to say.
export async function narrateCoordinatorPlan(
  tasks: NarratableTask[],
  progress: CoordinatorProgress,
): Promise<CoordinatorNarration> {
  const fallback = deterministicNarration(tasks, progress);
  if (!hasApiKey() || tasks.length === 0) {
    return { narration: fallback, isMockNarration: true };
  }

  try {
    const client = createModelClient();
    const response = await client.messages.parse({
      model: resolveModel(),
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserContent(tasks, progress) }],
      output_config: { format: zodOutputFormat(NarrationSchema) },
    });
    if (response.stop_reason === "refusal") return { narration: fallback, isMockNarration: false };
    const narration = response.parsed_output?.narration?.trim();
    return narration
      ? { narration, isMockNarration: false }
      : { narration: fallback, isMockNarration: false };
  } catch {
    return { narration: fallback, isMockNarration: false };
  }
}
