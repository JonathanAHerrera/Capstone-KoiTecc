"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound, User } from "lucide-react";
import { useState } from "react";
import { AuthTextField } from "@/components/auth/auth-text-field";
import { BigButton } from "@/components/ui/big-button";
import { signUp } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 12;

export function SignUpForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const formIsComplete =
    name.trim().length > 0 && email.trim().length > 0 && password.length >= MIN_PASSWORD_LENGTH;

  async function handleCreateAccount(): Promise<void> {
    if (!formIsComplete || creatingAccount) return;
    setCreatingAccount(true);
    setErrorMessage(null);
    const { error } = await signUp.email({ name: name.trim(), email: email.trim(), password });
    if (error) {
      setErrorMessage(error.message ?? "Could not create your account. Please try again.");
      setCreatingAccount(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
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

        <BigButton type="submit" fullWidth loading={creatingAccount} disabled={!formIsComplete}>
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
