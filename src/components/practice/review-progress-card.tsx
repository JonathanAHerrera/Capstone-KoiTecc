"use client";

import { useEffect, useState } from "react";
import { CircleCheck, LoaderCircle } from "lucide-react";

const REVIEW_PROGRESS_STEPS = ["Reading your evidence…", "Checking each objective…", "Writing feedback…"] as const;
const REVIEW_STEP_ADVANCE_INTERVAL_MS = 3000;

export function ReviewProgressCard({ practiceId }: { practiceId: string }) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveStepIndex((currentIndex) => Math.min(currentIndex + 1, REVIEW_PROGRESS_STEPS.length - 1));
    }, REVIEW_STEP_ADVANCE_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={`Reviewing ${practiceId}`}
      className="rounded-card border border-info-edge bg-surface px-4 py-4"
    >
      <p className="text-[20px] font-semibold leading-tight text-ink">Reviewing your submission</p>
      <p className="mt-1 text-sm text-text-secondary">This usually takes 10–40 seconds. You can keep this page open.</p>
      <ol className="mt-4 flex flex-col gap-2.5">
        {REVIEW_PROGRESS_STEPS.map((stepLabel, stepIndex) => {
          const stepFinished = stepIndex < activeStepIndex;
          const stepActive = stepIndex === activeStepIndex;
          return (
            <li
              key={stepLabel}
              className={`flex items-center gap-3 text-[15px] font-medium ${
                stepFinished ? "text-success-ink" : stepActive ? "text-ink" : "text-disabled"
              }`}
            >
              {stepFinished ? (
                <CircleCheck className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
              ) : stepActive ? (
                <LoaderCircle className="size-5 shrink-0 animate-spin text-info" aria-hidden />
              ) : (
                <span className="size-5 shrink-0 rounded-full border border-border" aria-hidden />
              )}
              {stepLabel}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
