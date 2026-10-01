import { deleteEvidenceFile } from "@/lib/evidence";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const deleted = await deleteEvidenceFile(id);
    if (!deleted) {
      return Response.json({ error: "Evidence file not found" }, { status: 404 });
    }
    return Response.json({ deleted: true, id });
  } catch (error) {
    console.error(`DELETE /api/evidence/${id} failed`, error);
    return Response.json({ error: "Failed to delete evidence" }, { status: 500 });
  }
}
