import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createModelClient, describeModelError, resolveModel } from "@/ai/model";
import {
  clampConfidence,
  EvidenceAnalysisSchema,
  type EvidenceAnalysis,
  type EvidenceAnalysisInput,
  type EvidenceAnalysisResult,
} from "@/ai/schema";

type ContentBlock = Anthropic.Messages.ContentBlockParam;
type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const SUPPORTED_IMAGE_MEDIA_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const TEXT_MEDIA_TYPES: ReadonlySet<string> = new Set(["text/plain", "text/markdown", "text/csv"]);

// The Messages API rejects images over 5 MB; the 25 MB upload cap is for videos and PDFs.
const MAX_IMAGE_BYTES_FOR_MODEL = 5 * 1024 * 1024;

const PROMPT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "prompts",
  "analyze-evidence.v1.md",
);

let cachedSystemPrompt: string | null = null;
function loadSystemPrompt(): string {
  if (cachedSystemPrompt === null) {
    cachedSystemPrompt = readFileSync(PROMPT_PATH, "utf8");
  }
  return cachedSystemPrompt;
}

function buildControlBriefing(input: EvidenceAnalysisInput): string {
  const sizeKilobytes = (input.file.sizeBytes / 1024).toFixed(0);
  return [
    `# Control under review: ${input.controlTitle}`,
    "",
    "## What this control means",
    input.controlExplainer,
    "",
    "## Uploaded evidence",
    `kind=${input.file.kind}, name="${input.file.originalName}", type=${input.file.mimeType}, size=${sizeKilobytes} KB`,
    "",
    "## Uploader's note (context only, not evidence)",
    input.note && input.note.trim().length > 0 ? input.note.trim() : "(no note provided)",
  ].join("\n");
}

// Text passed here has already been redacted by the pipeline, so base64 image payloads are the only
// unredacted bytes the model receives. Images are not OCR'd for secrets (see redaction.ts TODO).
function buildEvidenceBlocks(input: EvidenceAnalysisInput, redactedText: string | null): ContentBlock[] {
  const { file, bytes } = input;
  if (!bytes) {
    return [{ type: "text", text: "(file contents could not be read from disk)" }];
  }

  if (SUPPORTED_IMAGE_MEDIA_TYPES.has(file.mimeType)) {
    if (bytes.byteLength > MAX_IMAGE_BYTES_FOR_MODEL) {
      return [
        {
          type: "text",
          text: "(image is larger than 5 MB and could not be sent; ask for a smaller version)",
        },
      ];
    }
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: file.mimeType as ImageMediaType,
          data: bytes.toString("base64"),
        },
      },
    ];
  }

  if (file.mimeType === "application/pdf") {
    return [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") },
      },
    ];
  }

  if (TEXT_MEDIA_TYPES.has(file.mimeType) && redactedText !== null) {
    return [
      {
        type: "text",
        text: `--- begin file contents (secrets redacted) ---\n${redactedText}\n--- end file contents ---`,
      },
    ];
  }

  return [{ type: "text", text: `(file type ${file.mimeType} is not supported for automatic scanning)` }];
}

export function buildAnalyzeUserContent(
  input: EvidenceAnalysisInput,
  redactedText: string | null,
): ContentBlock[] {
  return [
    { type: "text", text: buildControlBriefing(input) },
    ...buildEvidenceBlocks(input, redactedText),
    {
      type: "text",
      text: "Scan the evidence above against the control and return your structured analysis.",
    },
  ];
}

function buildFailureAnalysis(summary: string): EvidenceAnalysis {
  return {
    verdict: "needs_human_review",
    confidence: 0,
    summary,
    extracted: {},
    missing: [],
    nextSteps: ["Try scanning this evidence again in a moment."],
    concerns: [],
  };
}

export async function analyzeEvidenceWithAnthropic(
  input: EvidenceAnalysisInput,
  redactedText: string | null,
): Promise<EvidenceAnalysisResult> {
  const model = resolveModel();
  const base = { model, isMock: false as const };

  try {
    const client = createModelClient();
    const response = await client.messages.parse({
      model,
      max_tokens: 16000,
      system: loadSystemPrompt(),
      messages: [{ role: "user", content: buildAnalyzeUserContent(input, redactedText) }],
      output_config: { format: zodOutputFormat(EvidenceAnalysisSchema) },
    });

    const rawResponse = JSON.stringify(response.content);

    if (response.stop_reason === "refusal") {
      return {
        ...base,
        rawResponse,
        analysis: buildFailureAnalysis(
          "The scanner declined to read this file. Check that it is relevant business evidence and try again.",
        ),
      };
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      return {
        ...base,
        rawResponse,
        analysis: buildFailureAnalysis("The scanner returned an unreadable response."),
      };
    }

    return {
      ...base,
      rawResponse,
      analysis: { ...parsed, confidence: clampConfidence(parsed.confidence) },
    };
  } catch (error) {
    return {
      ...base,
      rawResponse: null,
      analysis: buildFailureAnalysis(`Automatic scan failed: ${describeModelError(error)}`),
    };
  }
}
