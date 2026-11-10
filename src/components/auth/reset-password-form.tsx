"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { AuthTextField } from "@/components/auth/auth-text-field";
import { BigButton } from "@/components/ui/big-button";

const MIN_PASSWORD_LENGTH = 12;

export function ResetPasswordForm({ token }: { token: string | undefined }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  async function handleResetPassword(): Promise<void> {
    if (resettingPassword) return;
    if (!token) {
      setErrorMessage("This reset link is missing or invalid.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmation) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    setResettingPassword(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setErrorMessage(payload?.message ?? "Could not reset your password. Request a new link and try again.");
        return;
      }
      setMessage("Your password was reset. You can now sign in with the new password.");
    } catch {
      setErrorMessage("Could not reach the account service. Check that the app server is running.");
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col gap-8 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-8">
      <header className="flex flex-col gap-2 pt-6">
        <h1 className="text-2xl font-semibold text-ink">Choose a new password</h1>
        <p className="text-base text-text-secondary">Use at least 12 characters.</p>
      </header>

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleResetPassword();
        }}
      >
        <AuthTextField
          label="New password"
          icon={<KeyRound aria-hidden />}
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="At least 12 characters"
          required
        />
        <AuthTextField
          label="Confirm new password"
          icon={<KeyRound aria-hidden />}
          type="password"
          name="password-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password"
          placeholder="Enter it again"
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
        <BigButton type="submit" fullWidth loading={resettingPassword} disabled={!token}>
          Reset password
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
