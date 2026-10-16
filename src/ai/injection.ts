// Detects prompt-injection attempts in evidence *text* (uploaded .txt/.md/.csv or a PDF's text
// layer). Evidence is untrusted user content; an attacker could upload a document that tries to
// talk the reviewer into auto-accepting. When this fires, the pipeline forces needs_human_review
// instead of trusting the model's verdict.
//
// This is a heuristic signal, not a guarantee. It looks for the imperative "ignore your
// instructions / you are now / mark this as accepted" family of phrases that have no legitimate
// reason to appear in business evidence.

const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore (all )?(previous|prior|above) (instructions|prompts?)/i,
  /disregard (the )?(previous|prior|above|system)/i,
  /you are now\b/i,
  /pretend (to be|you are)\b/i,
  /\bas an? (ai|assistant|language model)\b/i,
  /\bsystem prompt\b/i,
  /\bmark (this|it) as (accepted|sufficient|compliant|passed)\b/i,
  /\b(return|output|respond with) (the )?verdict\b/i,
  /\boverride\b.{0,20}\b(instructions|rules|guardrails)\b/i,
  /\bnew instructions?:/i,
];

export function looksLikeInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}
