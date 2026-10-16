"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { twoFactor, useSession } from "@/lib/auth-client";

type EnrollmentStage =
  | { kind: "idle" }
  | { kind: "password" }
  | { kind: "verify"; totpUri: string; backupCodes: string[]; secret: string }
  | { kind: "disable" };

// The otpauth:// URI carries the shared secret in its `secret` query param; apps that can't scan a
// QR code let the owner type that secret in by hand. No QR library is installed yet, so we surface
// the secret directly. TODO(mfa): render a scannable QR once a client-side QR dependency is added.
function extractSecretFromTotpUri(totpUri: string): string {
  try {
    return new URL(totpUri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export function TwoFactorSetting() {
  const router = useRouter();
  const session = useSession();
  const [stage, setStage] = useState<EnrollmentStage>({ kind: "idle" });
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  const twoFactorEnabled = session.data?.user.twoFactorEnabled === true;

  function resetFlow(): void {
    setStage({ kind: "idle" });
    setPassword("");
    setTotpCode("");
    setErrorMessage(null);
    setSecretCopied(false);
  }

  async function handleStartEnrollment(): Promise<void> {
    if (submitting || password.length === 0) return;
    setSubmitting(true);
    setErrorMessage(null);
    const { data, error } = await twoFactor.enable({ password });
    setSubmitting(false);
    if (error || !data || !("totpURI" in data)) {
      setErrorMessage(error?.message ?? "Could not start setup. Check your password and try again.");
      return;
    }
    setPassword("");
    setStage({
      kind: "verify",
      totpUri: data.totpURI,
      backupCodes: data.backupCodes,
      secret: extractSecretFromTotpUri(data.totpURI),
    });
  }

  async function handleConfirmEnrollment(): Promise<void> {
    if (submitting || totpCode.length < 6) return;
    setSubmitting(true);
    setErrorMessage(null);
    const { error } = await twoFactor.verifyTotp({ code: totpCode });
    setSubmitting(false);
    if (error) {
      setErrorMessage(error.message ?? "That code didn't match. Try the current code from your app.");
      return;
    }
    resetFlow();
    router.refresh();
  }

  async function handleDisable(): Promise<void> {
    if (submitting || password.length === 0) return;
    setSubmitting(true);
    setErrorMessage(null);
    const { error } = await twoFactor.disable({ password });
    setSubmitting(false);
    if (error) {
      setErrorMessage(error.message ?? "Could not turn off two-step verification. Check your password.");
      return;
    }
    resetFlow();
    router.refresh();
  }

  async function handleCopySecret(secret: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
    } catch {
      setSecretCopied(false);
    }
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-primary-text">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Two-step verification</p>
          <p className="mt-1 text-sm text-text-secondary">
            {twoFactorEnabled
              ? "On. You'll enter a code from your authenticator app each time you sign in."
              : "Add a one-time code from an authenticator app on top of your password."}
          </p>
        </div>
      </div>

      {errorMessage ? (
        <p role="alert" className="mt-3 rounded-lg border border-danger-edge bg-danger-pale px-3 py-2 text-sm text-danger-ink">
          {errorMessage}
        </p>
      ) : null}

      {stage.kind === "idle" ? (
        twoFactorEnabled ? (
          <button
            type="button"
            onClick={() => setStage({ kind: "disable" })}
            className="focus-outline mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-danger-edge bg-surface px-4 text-sm font-semibold text-danger-ink hover:bg-danger-pale"
          >
            Turn off two-step verification
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStage({ kind: "password" })}
            className="focus-outline mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-alt"
          >
            Set up two-step verification
          </button>
        )
      ) : null}

      {stage.kind === "password" ? (
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleStartEnrollment();
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-secondary">Confirm your password to continue</span>
            <input
              type="password"
              name="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="min-h-12 rounded-lg border border-border bg-surface px-3 text-base text-ink outline-none focus:border-primary-text"
              autoFocus
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={submitting || password.length === 0}
              className="focus-outline inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-canvas transition-opacity disabled:opacity-60"
            >
              {submitting ? "Starting…" : "Continue"}
            </button>
            <button
              type="button"
              onClick={resetFlow}
              className="focus-outline inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-alt"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {stage.kind === "verify" ? (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-ink">1. Add this key to your authenticator app</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg border border-border bg-surface-alt px-3 py-2 font-mono text-sm text-ink">
                {stage.secret || stage.totpUri}
              </code>
              <button
                type="button"
                onClick={() => void handleCopySecret(stage.secret || stage.totpUri)}
                className="focus-outline inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:bg-surface-alt"
                aria-label="Copy setup key"
              >
                {secretCopied ? <Check className="size-5 text-success-ink" aria-hidden /> : <Copy className="size-5" aria-hidden />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink">2. Save your backup codes</p>
            <p className="mt-1 text-sm text-text-secondary">Each code works once if you lose your authenticator.</p>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {stage.backupCodes.map((backupCode) => (
                <li key={backupCode} className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-center font-mono text-sm text-ink">
                  {backupCode}
                </li>
              ))}
            </ul>
          </div>

          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleConfirmEnrollment();
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">3. Enter the current 6-digit code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="min-h-12 rounded-lg border border-border bg-surface px-3 text-lg tracking-[0.3em] text-ink outline-none focus:border-primary-text"
                autoFocus
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={submitting || totpCode.length < 6}
                className="focus-outline inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-canvas transition-opacity disabled:opacity-60"
              >
                {submitting ? "Verifying…" : "Turn on"}
              </button>
              <button
                type="button"
                onClick={resetFlow}
                className="focus-outline inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-alt"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {stage.kind === "disable" ? (
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleDisable();
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-secondary">Confirm your password to turn it off</span>
            <input
              type="password"
              name="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="min-h-12 rounded-lg border border-border bg-surface px-3 text-base text-ink outline-none focus:border-primary-text"
              autoFocus
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={submitting || password.length === 0}
              className="focus-outline inline-flex min-h-11 items-center justify-center rounded-lg bg-danger px-4 text-sm font-semibold text-canvas transition-opacity disabled:opacity-60"
            >
              {submitting ? "Turning off…" : "Turn off"}
            </button>
            <button
              type="button"
              onClick={resetFlow}
              className="focus-outline inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-alt"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
