import { buildReadinessPackage } from "@/lib/export";
import { getOrganization } from "@/lib/org";

export async function GET() {
  const organization = await getOrganization();
  if (!organization) {
    return Response.json({ error: "Complete onboarding before exporting" }, { status: 404 });
  }

  const markdown = await buildReadinessPackage();
  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cmmc-readiness-package.md"',
      "Cache-Control": "no-store",
    },
  });
}
