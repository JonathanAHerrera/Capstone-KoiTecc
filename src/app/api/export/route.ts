import { buildReadinessPackage } from "@/lib/export";
import { getOrganization } from "@/lib/org";
import { DEFAULT_FRAMEWORK_ID, getFramework, parseFrameworkId } from "@/frameworks";
import type { FrameworkId } from "@/lib/practice-types";

function resolveRequestedFramework(request: Request): FrameworkId {
  const requested = new URL(request.url).searchParams.get("framework");
  return parseFrameworkId(requested) ?? DEFAULT_FRAMEWORK_ID;
}

export async function GET(request: Request) {
  const organization = await getOrganization();
  if (!organization) {
    return Response.json({ error: "Complete onboarding before exporting" }, { status: 404 });
  }

  const framework = resolveRequestedFramework(request);
  const markdown = await buildReadinessPackage(framework);
  const fileName = getFramework(framework).exportFileName;
  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
