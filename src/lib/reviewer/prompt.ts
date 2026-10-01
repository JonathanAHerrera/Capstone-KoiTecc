import type Anthropic from "@anthropic-ai/sdk";
import type { ReviewerEvidenceInput, ReviewerInput } from "@/lib/reviewer/schema";

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
const MAX_TEXT_CHARACTERS_FOR_MODEL = 60_000;

export function buildReviewerSystemPrompt(): string {
  return [
    "You are a CMMC readiness reviewer helping a small defense contractor prepare for a CMMC Level 1 or Level 2 assessment.",
    "You are NOT a certified assessor and NOT a C3PAO. You cannot certify, attest, or pass anyone. Never say or imply the organization is certified, compliant, or has passed; say the evidence does or does not plausibly demonstrate the practice.",
    "",
    "Your job: judge whether the uploaded evidence plausibly demonstrates each assessment objective for one practice, the way a careful internal reviewer would before an assessor sees it.",
    "",
    "Rules:",
    "- Evaluate every assessment objective individually and report a finding for each, in the order given.",
    "- Return verdict \"accepted\" only when every objective is plausibly met by the evidence itself (not by the note alone). Otherwise return \"needs_work\".",
    "- Be specific about what is missing. Name the exact artifact that would close the gap (for example: \"a screenshot of the user list showing the disabled account for the departed employee\"), not generic advice.",
    "- Visible dates, organization names, user names, device names, and account names are the strongest signal that evidence is real and current. Note when they are present; when they are absent, say exactly which one would make the evidence convincing.",
    "- A screenshot or photo of a single device, account, or room does not prove coverage of the whole fleet or organization. When a practice applies to all systems or all users, ask for evidence of the policy, the management console, or a sample across devices before accepting.",
    "- Reject evidence that is unreadable, blurry, cropped so the relevant detail is not visible, irrelevant to the practice, or appears to be a stock image, product catalog image, template, or screenshot of someone else's environment.",
    "- If an upload appears to contain secrets such as passwords, API keys, Social Security numbers, or full account numbers, say so in the summary and missingItems, do not repeat the secret, and ask for a redacted version before accepting.",
    "- The submitter's note is context, not evidence. A note can explain what a photo shows; it cannot substitute for the photo.",
    "- Videos are not sent to you. If a video is the only evidence, ask for a representative screenshot or photo of the specific detail you need.",
    "- Use the practice's AI review guidance and common failures to decide what good evidence looks like.",
    "- Write for a non-technical small-business owner in second person: short sentences, plain English, no jargon without explanation. Keep the summary to at most two sentences.",
    "- Set confidence between 0 and 1 based on how clearly the evidence supports your verdict.",
  ].join("\n");
}

function describeEvidenceFile(evidence: ReviewerEvidenceInput, index: number): string {
  const { file } = evidence;
  const sizeKilobytes = (file.sizeBytes / 1024).toFixed(0);
  return `Evidence ${index + 1}: kind=${file.kind}, name="${file.originalName}", type=${file.mimeType}, size=${sizeKilobytes} KB`;
}

function buildEvidenceBlocks(evidence: ReviewerEvidenceInput, index: number): ContentBlock[] {
  const { file, bytes } = evidence;
  const label = describeEvidenceFile(evidence, index);

  if (!bytes) {
    return [{ type: "text", text: `${label}\n(file contents could not be read from disk)` }];
  }

  if (file.mimeType.startsWith("video/")) {
    return [
      {
        type: "text",
        text: `${label}\nvideo uploaded: ${file.originalName}, ${(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB. Videos are not sent for review; ask for a screenshot or photo if you need to see a specific detail.`,
      },
    ];
  }

  if (SUPPORTED_IMAGE_MEDIA_TYPES.has(file.mimeType)) {
    if (bytes.byteLength > MAX_IMAGE_BYTES_FOR_MODEL) {
      return [
        {
          type: "text",
          text: `${label}\n(image is larger than 5 MB and could not be sent; ask the uploader to re-upload a smaller or compressed version)`,
        },
      ];
    }
    return [
      { type: "text", text: label },
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

  if (file.mimeType.startsWith("image/")) {
    return [
      {
        type: "text",
        text: `${label}\n(image format ${file.mimeType} is not supported for review; ask the uploader to re-upload as JPEG or PNG)`,
      },
    ];
  }

  if (file.mimeType === "application/pdf") {
    return [
      { type: "text", text: label },
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") },
      },
    ];
  }

  if (TEXT_MEDIA_TYPES.has(file.mimeType)) {
    const fullText = bytes.toString("utf8");
    const truncated = fullText.length > MAX_TEXT_CHARACTERS_FOR_MODEL;
    const text = truncated ? fullText.slice(0, MAX_TEXT_CHARACTERS_FOR_MODEL) : fullText;
    return [
      {
        type: "text",
        text: `${label}\n--- begin file contents${truncated ? " (truncated)" : ""} ---\n${text}\n--- end file contents ---`,
      },
    ];
  }

  return [{ type: "text", text: `${label}\n(unsupported file type; contents not sent)` }];
}

function buildPracticeBriefing(input: ReviewerInput): string {
  const { practice, submission } = input;
  const lines = [
    `# Practice under review: ${practice.id} — ${practice.title}`,
    `Level: ${practice.level}  |  Family: ${practice.family} (${practice.familyName})  |  NIST SP 800-171 ref: ${practice.nist171Ref}`,
    "",
    "## Official requirement",
    practice.officialText,
    "",
    "## Plain-English meaning",
    practice.plainEnglish,
    "",
    "## Assessment objectives (report one finding per objective, in this order)",
    ...practice.assessmentObjectives.map((objective, index) => `${index + 1}. ${objective}`),
    "",
    "## Accepted evidence kinds",
    practice.evidenceTypes.join(", "),
    "",
    "## Examples of good evidence",
    ...practice.evidenceExamples.map((example) => `- ${example}`),
    "",
    "## AI review guidance for this practice",
    practice.aiReviewGuidance,
    "",
    "## Common failures to watch for",
    ...practice.commonFailures.map((failure) => `- ${failure}`),
    "",
    "## Submitter's note",
    submission.note && submission.note.trim().length > 0 ? submission.note.trim() : "(no note provided)",
    "",
    `## Uploaded evidence (${input.evidence.length} file${input.evidence.length === 1 ? "" : "s"})`,
    input.evidence.length === 0
      ? "(no evidence files were uploaded)"
      : "Each file follows, labeled in order.",
  ];
  return lines.join("\n");
}

export function buildReviewerUserContent(input: ReviewerInput): ContentBlock[] {
  const blocks: ContentBlock[] = [{ type: "text", text: buildPracticeBriefing(input) }];
  input.evidence.forEach((evidence, index) => {
    blocks.push(...buildEvidenceBlocks(evidence, index));
  });
  blocks.push({
    type: "text",
    text: "Review the evidence above against every assessment objective and return your structured verdict.",
  });
  return blocks;
}
