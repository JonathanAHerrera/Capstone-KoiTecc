import { redirect } from "next/navigation";
import { AssociateApprovalRequiredError, getAssociateWorkspaceForCurrentUser } from "@/lib/koitecc";

export const dynamic = "force-dynamic";

export default async function CurrentAssociateWorkspacePage() {
  const associate = await getAssociateWorkspaceForCurrentUser().catch((error) => {
    if (error instanceof AssociateApprovalRequiredError) redirect("/koitecc/associate/setup");
    throw error;
  });
  redirect(`/koitecc/associates/${associate.id}`);
}
