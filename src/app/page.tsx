import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getOrganization } from "@/lib/org";

export default async function HomePage() {
  await connection();
  const organization = await getOrganization();
  redirect(organization ? "/path" : "/onboarding");
}
