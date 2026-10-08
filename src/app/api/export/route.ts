import { buildReadinessPackage } from "@/lib/export";
import { getOrganization } from "@/lib/org";
import { FRAMEWORK_ORDER, type FrameworkId } from "@/lib/practice-types";

function resolveRequestedFramework(request: Request): FrameworkId {
  const requested = new URL(request.url).searchParams.get("framework");
  return FRAMEWORK_ORDER.includes(requested as FrameworkId)
    ? (requested as FrameworkId)
    : "cmmc";
}

export async function GET(request: Request) {
  const organization = await getOrganization();
  if (!organization) {
    return Response.json({ error: "Complete onboarding before exporting" }, { status: 404 });
  }

  const framework = resolveRequestedFramework(request);
  const markdown = await buildReadinessPackage(framework);
  const fileName =
    framework === "cmmc" ? "cmmc-readiness-package.md" : `${framework}-readiness-summary.md`;
  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
