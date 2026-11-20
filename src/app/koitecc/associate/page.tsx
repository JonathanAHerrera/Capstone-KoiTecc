import { redirect } from "next/navigation";
import { getAssociateWorkspaceForCurrentUser } from "@/lib/koitecc";

export const dynamic = "force-dynamic";

export default async function CurrentAssociateWorkspacePage() {
  const associate = await getAssociateWorkspaceForCurrentUser();
  redirect(`/koitecc/associates/${associate.id}`);
}
