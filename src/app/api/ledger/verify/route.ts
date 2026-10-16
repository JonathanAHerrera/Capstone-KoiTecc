import { getOrganization } from "@/lib/org";
import { verifyLedger } from "@/lib/ledger";

// Recomputes the org's hash chain and reports the first broken link (if any). Org-scoped: a caller
// only ever verifies their own tenant's ledger.
export async function GET() {
  const organization = await getOrganization();
  if (!organization) {
    return Response.json({ error: "Complete onboarding before verifying the ledger" }, { status: 404 });
  }

  const result = await verifyLedger(organization.id);
  return Response.json(result, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
