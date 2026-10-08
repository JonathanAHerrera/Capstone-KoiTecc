import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { FRAMEWORKS } from "@/lib/practice-types";
import { resolveReviewerModel } from "@/lib/reviewer/anthropic";
import { FrameworkEnrichmentSchema, type FrameworkApplicability } from "./types";

const ENRICHMENT_SYSTEM_PROMPT = [
  "You are a plain-English guide for Texas small-business owners weighing cybersecurity and privacy obligations.",
  "You will be given one framework, a verdict about whether it applies, and the concrete reasons behind that verdict.",
  "Write one warm, concrete paragraph (2-4 sentences) that restates why it does or does not apply, grounded ONLY in the reasons given.",
  "Never give legal advice, never claim certainty, and never invent facts beyond the reasons. Encourage confirming with counsel only when the verdict is likely_applies or may_apply.",
].join(" ");

function buildEnrichmentUserContent(applicability: FrameworkApplicability): string {
  const meta = FRAMEWORKS[applicability.framework];
  return [
    `Framework: ${meta.shortName} — ${meta.fullName}`,
    `Verdict: ${applicability.verdict}`,
    "Reasons:",
    ...applicability.reasons.map((reason) => `- ${reason}`),
  ].join("\n");
}

// Adds a friendly paragraph per framework. Strictly additive: any failure, refusal, or
// missing key leaves the deterministic reasons untouched (returns the input unchanged).
export async function enrichApplicabilityWithClaude(
  entries: FrameworkApplicability[],
): Promise<FrameworkApplicability[]> {
  const model = resolveReviewerModel();
  const client = new Anthropic();

  return Promise.all(
    entries.map(async (entry) => {
      try {
        const response = await client.messages.parse({
          model,
          max_tokens: 1024,
          system: ENRICHMENT_SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildEnrichmentUserContent(entry) }],
          output_config: { format: zodOutputFormat(FrameworkEnrichmentSchema) },
        });
        if (response.stop_reason === "refusal") return entry;
        const plainEnglish = response.parsed_output?.plainEnglish?.trim();
        return plainEnglish ? { ...entry, plainEnglish } : entry;
      } catch {
        return entry;
      }
    }),
  );
}
