import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { readEvidenceFile } from "@/lib/evidence";

function buildContentDisposition(originalName: string): string {
  const asciiFallback = originalName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(originalName)}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const readable = await readEvidenceFile(id);
  if (!readable) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  let fileSize: number;
  try {
    fileSize = (await stat(readable.absolutePath)).size;
  } catch {
    return Response.json({ error: "File is missing from storage" }, { status: 404 });
  }

  const nodeStream = createReadStream(readable.absolutePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": readable.file.mimeType,
      "Content-Length": String(fileSize),
      "Content-Disposition": buildContentDisposition(readable.file.originalName),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
