import { BINDER_EXPORT_FILE_NAME, buildEvidenceBinder } from "@/lib/binder";
import { getOrganization } from "@/lib/org";

// Renders the SB 2610 evidence binder for the caller's org as downloadable markdown. Org-scoped via
// getOrganization; onboarding must be complete before a binder exists.
export async function GET() {
  const organization = await getOrganization();
  if (!organization) {
    return Response.json({ error: "Complete onboarding before exporting a binder" }, { status: 404 });
  }

  const markdown = await buildEvidenceBinder();
  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${BINDER_EXPORT_FILE_NAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
