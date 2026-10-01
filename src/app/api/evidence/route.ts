import { EvidenceValidationError, isEvidenceKind, storeEvidenceFile } from "@/lib/evidence";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const submissionId = formData.get("submissionId");
  const kind = formData.get("kind");
  const file = formData.get("file");

  if (typeof submissionId !== "string" || submissionId.length === 0) {
    return Response.json({ error: "submissionId is required" }, { status: 400 });
  }
  if (!isEvidenceKind(kind)) {
    return Response.json(
      { error: "kind must be one of photo, document, screenshot, video, text" },
      { status: 400 },
    );
  }
  if (!(file instanceof File)) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }

  try {
    const storedFile = await storeEvidenceFile(submissionId, kind, file);
    return Response.json({ file: storedFile }, { status: 201 });
  } catch (error) {
    if (error instanceof EvidenceValidationError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/evidence failed", error);
    return Response.json({ error: "Failed to store evidence" }, { status: 500 });
  }
}
