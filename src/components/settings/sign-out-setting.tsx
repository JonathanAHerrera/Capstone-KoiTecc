"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";

export function SignOutSetting() {
  const router = useRouter();
  const session = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignOut(): Promise<void> {
    if (signingOut) return;
    setSigningOut(true);
    setErrorMessage(null);
    const { error } = await signOut();
    if (error) {
      setSigningOut(false);
      setErrorMessage(error.message ?? "Could not sign out. Please try again.");
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-secondary">
          <LogOut className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Signed in{session.data?.user.email ? ` as ${session.data.user.email}` : ""}</p>
          <p className="mt-1 text-sm text-text-secondary">End your session on this device.</p>
        </div>
      </div>

      {errorMessage ? (
        <p role="alert" className="mt-3 rounded-lg border border-danger-edge bg-danger-pale px-3 py-2 text-sm text-danger-ink">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        className="focus-outline mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-ink transition-opacity hover:bg-surface-alt disabled:opacity-60"
      >
        <LogOut className="size-4" aria-hidden />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
