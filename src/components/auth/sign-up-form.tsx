"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound, User } from "lucide-react";
import { useState } from "react";
import { AuthTextField } from "@/components/auth/auth-text-field";
import { BigButton } from "@/components/ui/big-button";

const MIN_PASSWORD_LENGTH = 12;
const SIGN_UP_TIMEOUT_MS = 15_000;

type SignUpErrorResponse = {
  code?: string;
  message?: string;
  error?: {
    message?: string;
  };
};

export function SignUpForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);

  async function handleCreateAccount(): Promise<void> {
    if (creatingAccount) return;
    if (name.trim().length === 0) {
      setErrorMessage("Enter your name.");
      return;
    }
    if (email.trim().length === 0) {
      setErrorMessage("Enter your work email.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setCreatingAccount(true);
    setErrorMessage(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), SIGN_UP_TIMEOUT_MS);
    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as SignUpErrorResponse | null;
        if (payload?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
          setErrorMessage("An account with this email already exists. Sign in instead.");
        } else {
          setErrorMessage(
            payload?.message ??
              payload?.error?.message ??
              "Could not create your account. Please try again.",
          );
        }
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "Account creation timed out. Check that the app server is running, then try again."
          : "Could not reach the account service. Check your connection and try again.",
      );
    } finally {
      window.clearTimeout(timeout);
      setCreatingAccount(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col gap-8 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-8">
      <header className="flex flex-col gap-2 pt-6">
        <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
        <p className="text-base text-text-secondary">
          One secure login for your business&apos;s readiness workspace.
        </p>
      </header>

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleCreateAccount();
        }}
      >
        <AuthTextField
          label="Your name"
          icon={<User aria-hidden />}
          type="text"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          required
          autoCapitalize="words"
          placeholder="Jordan Rivera"
          enterKeyHint="next"
          maxLength={120}
        />
        <AuthTextField
          label="Work email"
          icon={<AtSign aria-hidden />}
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          autoCapitalize="none"
          inputMode="email"
          placeholder="you@company.com"
          enterKeyHint="next"
          maxLength={254}
        />
        <AuthTextField
          label="Password"
          icon={<KeyRound aria-hidden />}
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          placeholder="At least 12 characters"
          enterKeyHint="go"
          maxLength={128}
          hint={
            password.length > 0 && password.length < MIN_PASSWORD_LENGTH
              ? `${MIN_PASSWORD_LENGTH - password.length} more characters needed.`
              : "Use 12+ characters. A passphrase is easiest to remember."
          }
        />

        {errorMessage ? (
          <p className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}

        <BigButton type="submit" fullWidth loading={creatingAccount} disabled={creatingAccount}>
          Create account
        </BigButton>
      </form>

      <p className="mt-auto text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary-text underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
