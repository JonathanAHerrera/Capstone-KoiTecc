"use client";

import Link from "next/link";
import { AtSign } from "lucide-react";
import { useState } from "react";
import { AuthTextField } from "@/components/auth/auth-text-field";
import { BigButton } from "@/components/ui/big-button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestingReset, setRequestingReset] = useState(false);

  async function handleRequestReset(): Promise<void> {
    if (requestingReset || email.trim().length === 0) return;
    setRequestingReset(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setErrorMessage(payload?.message ?? "Could not start password reset. Please try again.");
        return;
      }
      setMessage("If an account exists for that email, a reset link is ready in the server terminal.");
    } catch {
      setErrorMessage("Could not reach the account service. Check that the app server is running.");
    } finally {
      setRequestingReset(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col gap-8 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-8">
      <header className="flex flex-col gap-2 pt-6">
        <h1 className="text-2xl font-semibold text-ink">Reset your password</h1>
        <p className="text-base text-text-secondary">
          Enter your email. For local testing, the reset link will be printed in the app server terminal.
        </p>
      </header>

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleRequestReset();
        }}
      >
        <AuthTextField
          label="Work email"
          icon={<AtSign aria-hidden />}
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          inputMode="email"
          placeholder="you@company.com"
          enterKeyHint="go"
          autoFocus
          required
        />
        {message ? (
          <p className="rounded-card border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary-text">
            {message}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}
        <BigButton type="submit" fullWidth loading={requestingReset} disabled={email.trim().length === 0}>
          Get reset link
        </BigButton>
      </form>

      <p className="mt-auto text-center text-sm text-text-secondary">
        <Link href="/sign-in" className="font-medium text-primary-text underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
