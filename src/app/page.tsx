import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ValueLanding } from "@/components/value/value-landing";
import { getOrganizationForUser } from "@/lib/org";
import { getSessionUser } from "@/lib/session";

export default async function HomePage() {
  await connection();
  const sessionUser = await getSessionUser();
  // Signed-out visitors see the public value pitch instead of being bounced to sign-in; signed-in
  // users go straight to their work as before.
  if (!sessionUser) {
    return <ValueLanding />;
  }
  const organization = await getOrganizationForUser(sessionUser.id);
  redirect(organization ? "/path" : "/onboarding");
}
