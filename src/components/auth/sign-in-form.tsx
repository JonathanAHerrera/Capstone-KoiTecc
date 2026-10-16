"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { AuthTextField } from "@/components/auth/auth-text-field";
import { BigButton } from "@/components/ui/big-button";
import { signIn, twoFactor } from "@/lib/auth-client";

type SignInStep = "credentials" | "two-factor";

export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [step, setStep] = useState<SignInStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function finishSignIn(): void {
    router.push(redirectTo);
    router.refresh();
  }

  async function handleCredentials(): Promise<void> {
    if (submitting || email.trim().length === 0 || password.length === 0) return;
    setSubmitting(true);
    setErrorMessage(null);
    const { data, error } = await signIn.email({ email: email.trim(), password });
    setSubmitting(false);
    if (error) {
      setErrorMessage(error.message ?? "Those credentials didn't work. Please try again.");
      return;
    }
    // Accounts with TOTP enabled are not signed in yet; Better Auth asks for the second factor.
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      setStep("two-factor");
      return;
    }
    finishSignIn();
  }

  async function handleVerifyTotp(): Promise<void> {
    if (submitting || totpCode.trim().length < 6) return;
    setSubmitting(true);
    setErrorMessage(null);
    const { error } = await twoFactor.verifyTotp({ code: totpCode.trim() });
    setSubmitting(false);
    if (error) {
      setErrorMessage(error.message ?? "That code didn't match. Try the current code from your app.");
      return;
    }
    finishSignIn();
  }

  if (step === "two-factor") {
    return (
      <div className="flex min-h-dvh flex-col gap-8 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-8">
        <header className="flex flex-col gap-2 pt-6">
          <h1 className="text-2xl font-semibold text-ink">Enter your code</h1>
          <p className="text-base text-text-secondary">
            Open your authenticator app and enter the current 6-digit code.
          </p>
        </header>
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleVerifyTotp();
          }}
        >
          <AuthTextField
            label="Authentication code"
            icon={<ShieldCheck aria-hidden />}
            type="text"
            name="totp"
            value={totpCode}
            onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            autoComplete="one-time-code"
            inputMode="numeric"
            placeholder="123456"
            enterKeyHint="go"
            autoFocus
          />
          {errorMessage ? (
            <p className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}
          <BigButton type="submit" fullWidth loading={submitting} disabled={totpCode.length < 6}>
            Verify and sign in
          </BigButton>
          <BigButton
            type="button"
            variant="ghost"
            fullWidth
            onClick={() => {
              setStep("credentials");
              setTotpCode("");
              setErrorMessage(null);
            }}
          >
            Back
          </BigButton>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col gap-8 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-8">
      <header className="flex flex-col gap-2 pt-6">
        <h1 className="text-2xl font-semibold text-ink">Welcome back</h1>
        <p className="text-base text-text-secondary">Sign in to your readiness workspace.</p>
      </header>

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleCredentials();
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
          enterKeyHint="next"
          autoFocus
        />
        <AuthTextField
          label="Password"
          icon={<KeyRound aria-hidden />}
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="Your password"
          enterKeyHint="go"
        />

        {errorMessage ? (
          <p className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}

        <BigButton
          type="submit"
          fullWidth
          loading={submitting}
          disabled={email.trim().length === 0 || password.length === 0}
        >
          Sign in
        </BigButton>
      </form>

      <p className="mt-auto text-center text-sm text-text-secondary">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-primary-text underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
