import { readDecryptedEvidenceFile } from "@/lib/evidence";

function buildContentDisposition(originalName: string): string {
  const asciiFallback = originalName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(originalName)}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Evidence is encrypted at rest and scoped to the caller's org, so we decrypt into memory
  // (files are capped at 25 MB) rather than streaming raw bytes off disk.
  const decrypted = await readDecryptedEvidenceFile(id);
  if (!decrypted) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(decrypted.bytes), {
    status: 200,
    headers: {
      "Content-Type": decrypted.file.mimeType,
      "Content-Length": String(decrypted.bytes.byteLength),
      "Content-Disposition": buildContentDisposition(decrypted.file.originalName),
      "Cache-Control": "private, no-store",
    },
  });
}
