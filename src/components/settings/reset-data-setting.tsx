"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { resetAllDataAction } from "@/app/actions";

// Two-step confirm so a single stray tap can't wipe everything. On success the router is
// sent to "/", which redirects back through onboarding to the welcome screen.
export function ResetDataSetting() {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResetting, startResetting] = useTransition();

  function handleReset() {
    setErrorMessage(null);
    startResetting(async () => {
      const result = await resetAllDataAction();
      if (result.ok) {
        setIsConfirming(false);
        router.replace("/");
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-danger-ink">
          <TriangleAlert className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Reset app data</p>
          <p className="mt-1 text-sm text-text-secondary">
            Deletes your organization, all submissions, uploaded evidence, reviews, and radar decisions, then returns to
            onboarding. This cannot be undone.
          </p>
        </div>
      </div>

      {errorMessage ? (
        <p role="alert" className="mt-3 rounded-lg border border-danger-edge bg-danger-pale px-3 py-2 text-sm text-danger-ink">
          {errorMessage}
        </p>
      ) : null}

      {isConfirming ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="focus-outline inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-danger px-4 text-sm font-semibold text-canvas transition-opacity disabled:opacity-60"
          >
            <RotateCcw className="size-4" aria-hidden />
            {isResetting ? "Resetting…" : "Yes, delete everything"}
          </button>
          <button
            type="button"
            onClick={() => setIsConfirming(false)}
            disabled={isResetting}
            className="focus-outline inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-alt disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="focus-outline mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-danger-edge bg-surface px-4 text-sm font-semibold text-danger-ink hover:bg-danger-pale"
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset app data
        </button>
      )}
    </div>
  );
}
