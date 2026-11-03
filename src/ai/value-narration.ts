import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createModelClient, hasApiKey, resolveModel } from "@/ai/model";

// Kept decoupled from the value engine's own types (like coordinator-narration), so src/lib can
// depend on src/ai and not the other way round: the narrator only needs each driver's headline.
export type NarratableValueDriver = { headline: string; audience: "dod" | "texas" | "both" };
export type ValueNarrationInput = {
  drivers: NarratableValueDriver[];
  savingsLow: number;
  savingsHigh: number;
  handlesCui: boolean;
};

export type ValueNarration = { narration: string; isMockNarration: boolean };

const NarrationSchema = z.object({
  narration: z
    .string()
    .describe(
      "One or two short, warm sentences, second person, naming the single biggest reason this pays off for the owner's business. Ground it ONLY in the drivers and savings range given. No guarantees, no legal or financial advice, no certification claims.",
    ),
});

const SYSTEM_PROMPT = [
  "You explain, for a non-technical small-business owner, why getting ready pays off for their business.",
  "You are given their value drivers (already decided) and an estimated range of what doing the prep themselves saves versus hiring a consultant.",
  "Write one or two short, encouraging sentences, in second person, naming the single biggest reason it is worth it.",
  "Ground everything ONLY in the drivers and range you are given. Treat every figure as an illustrative estimate.",
  "Never promise a guarantee of savings, a contract award, or avoided penalties; never give legal or financial advice; never say or imply they are certified or compliant.",
].join(" ");

// Round half the gap for a clean spoken figure; the UI shows the precise range.
function formatUsd(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

// Deterministic narration — always correct, used verbatim with no API key and as the fail-closed
// fallback on refusal or error. Grounded only in the inputs.
function deterministicNarration(input: ValueNarrationInput): string {
  const savings = `an estimated ${formatUsd(input.savingsLow)}–${formatUsd(input.savingsHigh)} you'd otherwise pay an outside consultant`;
  if (input.handlesCui) {
    return `For defense work, getting these in place is what makes you eligible to bid — and doing the prep yourself keeps ${savings}.`;
  }
  if (input.savingsHigh > 0) {
    return `Doing this yourself keeps ${savings}, and it puts real protections between your business and a costly incident.`;
  }
  return "Getting ready puts real protections between your business and a costly incident.";
}

function buildUserContent(input: ValueNarrationInput): string {
  return [
    `Estimated prep savings vs. a consultant: ${formatUsd(input.savingsLow)}–${formatUsd(input.savingsHigh)}.`,
    input.handlesCui ? "This business handles CUI / does federal defense work." : "This business is not flagged for federal defense work.",
    "Value drivers:",
    ...input.drivers.map((driver, index) => `${index + 1}. [${driver.audience}] ${driver.headline}`),
  ].join("\n");
}

// Strictly additive, like coordinator narration and the applicability enrichment: any missing key,
// refusal, or error falls back to the deterministic line.
export async function narrateValueEstimate(input: ValueNarrationInput): Promise<ValueNarration> {
  const fallback = deterministicNarration(input);
  if (!hasApiKey() || input.drivers.length === 0) {
    return { narration: fallback, isMockNarration: true };
  }

  try {
    const client = createModelClient();
    const response = await client.messages.parse({
      model: resolveModel(),
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserContent(input) }],
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
