"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function AssociateInviteSignOut({
  signedInEmail,
  inviteEmail,
}: {
  signedInEmail: string;
  inviteEmail?: string;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOutAndContinue(): Promise<void> {
    setSigningOut(true);
    const { error } = await signOut();
    if (error) {
      setSigningOut(false);
      return;
    }
    const signupUrl = inviteEmail
      ? `/koitecc/associate/sign-up?email=${encodeURIComponent(inviteEmail)}`
      : "/koitecc/associate/sign-up";
    router.replace(signupUrl);
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col gap-6 px-5 pb-8 pt-[calc(32px+env(safe-area-inset-top))]">
      <header>
        <p className="caption text-muted">KOITECC ASSOCIATE SETUP</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Sign out before continuing</h1>
      </header>
      <p className="text-sm text-text-secondary">
        This browser is signed in as <strong className="text-ink">{signedInEmail}</strong>.
        {" "}Sign out, or open the invite link in a new browser or incognito window, then continue creating the employee account.
        {" "}You can also email the signup link to the employee personally.
      </p>
      {inviteEmail ? (
        <p className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          Invite email: <strong className="text-ink">{inviteEmail}</strong>
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void handleSignOutAndContinue()}
        disabled={signingOut}
        className="focus-outline min-h-11 rounded-button border-2 border-accent bg-accent/10 px-4 text-sm font-semibold text-primary-text shadow-float transition-colors hover:bg-accent/20 disabled:opacity-60"
      >
        {signingOut ? "Signing out..." : "Sign out and continue"}
      </button>
    </main>
  );
}
