import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { AssociateInviteSignOut } from "@/components/koitecc/associate-invite-sign-out";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "KoiTecc associate sign up — CMMC Ready",
};

type AssociateSignUpPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function KoiTeccAssociateSignUpPage({
  searchParams,
}: AssociateSignUpPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawEmail = Array.isArray(resolvedSearchParams.email)
    ? resolvedSearchParams.email[0]
    : resolvedSearchParams.email;
  const initialEmail =
    rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : undefined;
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    if (
      initialEmail &&
      sessionUser.email.toLowerCase() === initialEmail.toLowerCase()
    ) {
      redirect("/koitecc/associate/setup");
    }
    return (
      <AssociateInviteSignOut
        signedInEmail={sessionUser.email}
        inviteEmail={initialEmail}
      />
    );
  }

  return (
    <SignUpForm
      redirectTo="/koitecc/associate/setup"
      signInHref="/koitecc/associate/sign-in"
      initialEmail={initialEmail}
      lockEmail={initialEmail !== undefined}
    />
  );
}
