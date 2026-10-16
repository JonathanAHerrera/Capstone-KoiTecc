import Anthropic from "@anthropic-ai/sdk";

// Single source of truth for which model the product talks to. Both the evidence scanner
// (src/ai) and the legacy practice reviewer (src/lib/reviewer) resolve the model here so a
// CMMC_REVIEWER_MODEL override moves every call site at once.
export const DEFAULT_MODEL = "claude-opus-5-5";

export function resolveModel(): string {
  const override = process.env.CMMC_REVIEWER_MODEL;
  return override && override.trim().length > 0 ? override.trim() : DEFAULT_MODEL;
}

// The scanner falls back to a deterministic mock when no key is present, so hasApiKey is the
// switch that decides real-vs-mock rather than something that throws.
export function hasApiKey(): boolean {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return typeof apiKey === "string" && apiKey.trim().length > 0;
}

export function createModelClient(): Anthropic {
  return new Anthropic();
}

export function describeModelError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    return `${error.status ?? "network"} ${error.name}: ${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
