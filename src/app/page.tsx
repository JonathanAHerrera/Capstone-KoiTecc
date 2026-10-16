import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getOrganizationForUser } from "@/lib/org";
import { getSessionUser } from "@/lib/session";

export default async function HomePage() {
  await connection();
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in");
  }
  const organization = await getOrganizationForUser(sessionUser.id);
  redirect(organization ? "/path" : "/onboarding");
}
