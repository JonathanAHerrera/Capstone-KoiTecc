import { z } from "zod";

// Risk vocabulary is deliberately three plain words. The checker never says "safe" or "legitimate";
// a low risk means no red flags were found, not that the message is genuine.
export const SCAM_RISK_LEVELS = ["low", "medium", "high"] as const;
export type ScamRiskLevel = (typeof SCAM_RISK_LEVELS)[number];

export const SCAM_LANGUAGES = ["en", "es"] as const;
export type ScamLanguage = (typeof SCAM_LANGUAGES)[number];

export const SCAM_SOURCE_KINDS = ["pasted_text", "forwarded_email", "photo"] as const;
export type ScamSourceKind = (typeof SCAM_SOURCE_KINDS)[number];

export const ScamAnalysisSchema = z.object({
  riskLevel: z
    .enum(SCAM_RISK_LEVELS)
    .describe(
      '"high" when the message asks for money, payment changes, credentials, or urgent secret action; "medium" when it has some red flags but no direct ask; "low" when no red flags were found.',
    ),
  language: z
    .enum(SCAM_LANGUAGES)
    .describe('The language the message is written in: "en" for English, "es" for Spanish.'),
  summary: z
    .string()
    .describe(
      "One or two plain sentences, second person, in the message's language, saying what this looks like and why. No jargon, no legal claims.",
    ),
  reasons: z
    .array(z.string())
    .describe("Specific red flags you saw, each one short and concrete, in the message's language."),
  whatToDoNext: z
    .array(z.string())
    .describe(
      "Concrete steps the reader should take, most important first, in the message's language. Never tell them to reply to, call, or click anything from inside the message.",
    ),
  isPaymentChangeOrWire: z
    .boolean()
    .describe(
      "true when the message asks to change bank, payment, or remittance details, or to send a wire, ACH, gift cards, or any payment to a new destination.",
    ),
});

export type ScamAnalysis = z.infer<typeof ScamAnalysisSchema>;

export type ScamCheckImage = {
  mimeType: string;
  bytes: Buffer;
};

export type ScamCheckInput = {
  sourceKind: ScamSourceKind;
  text: string | null;
  image: ScamCheckImage | null;
};

// What the analyzer (mock or model) receives: the pipeline has already redacted the text, flagged
// injection, and detected the language, so neither back end sees raw secrets.
export type ScamAnalyzerInput = {
  sourceKind: ScamSourceKind;
  redactedText: string | null;
  image: ScamCheckImage | null;
  detectedLanguage: ScamLanguage;
};

export type ScamCheckResult = {
  analysis: ScamAnalysis;
  model: string;
  promptVersion: string;
  isMock: boolean;
  rawResponse: string | null;
};
