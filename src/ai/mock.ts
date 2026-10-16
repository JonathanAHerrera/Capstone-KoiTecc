import type { EvidenceAnalysis, EvidenceAnalysisInput, EvidenceAnalysisResult } from "@/ai/schema";

export const MOCK_MODEL = "mock-evidence-scanner";

// Deterministic stand-in used whenever ANTHROPIC_API_KEY is absent (local dev, CI, tests). It never
// inspects pixels; it decides from what the pipeline already resolved — whether readable content of
// an accepted kind reached it. The pipeline layers machine-detected concerns (stale, reuse,
// injection, secrets) on top of and, where needed, overrides this verdict, so the mock only has to
// produce a sensible baseline.
export function analyzeEvidenceWithMock(input: EvidenceAnalysisInput): EvidenceAnalysisResult {
  const { file, bytes, controlTitle, note } = input;
  const hasReadableContent = bytes !== null && bytes.byteLength > 0;
  const isVideo = file.mimeType.startsWith("video/");

  const analysis: EvidenceAnalysis = hasReadableContent && !isVideo
    ? {
        verdict: "looks_sufficient",
        confidence: 0.6,
        summary: `Offline scan (no model key set): a readable ${file.kind} was uploaded for "${controlTitle}", so it is treated as plausibly sufficient. A real scan would read the file contents.`,
        extracted: { fileName: file.originalName, fileKind: file.kind },
        missing: [],
        nextSteps: ["Keep the original file somewhere a reviewer can retrieve it."],
        concerns: [],
      }
    : {
        verdict: "needs_work",
        confidence: 0.9,
        summary: isVideo
          ? `Offline scan (no model key set): videos are not read automatically. Upload a screenshot or photo of the specific detail for "${controlTitle}".`
          : `Offline scan (no model key set): no readable file reached the scanner for "${controlTitle}".`,
        extracted: { fileName: file.originalName, fileKind: file.kind },
        missing: isVideo
          ? ["A screenshot or photo showing the relevant detail, since videos are not scanned."]
          : ["A readable image, PDF, or text file showing the control in place."],
        nextSteps: [
          note && note.trim().length > 0
            ? "Re-upload the evidence file so the scanner can read it."
            : "Upload the evidence file and add a short note describing what it shows.",
        ],
        concerns: [],
      };

  return { analysis, model: MOCK_MODEL, isMock: true, rawResponse: null };
}
