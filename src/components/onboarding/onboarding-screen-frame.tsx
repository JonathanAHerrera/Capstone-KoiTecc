"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";

export type OnboardingScreenFrameProps = {
  completedSteps: number;
  totalSteps: number;
  onBack?: () => void;
  bottomPaddingPx?: number;
  children: ReactNode;
};

export function OnboardingScreenFrame({
  completedSteps,
  totalSteps,
  onBack,
  bottomPaddingPx = 112,
  children,
}: OnboardingScreenFrameProps) {
  return (
    <div
      className="flex min-h-dvh flex-col px-4 pt-[calc(8px+env(safe-area-inset-top))]"
      style={{ paddingBottom: `calc(${bottomPaddingPx}px + env(safe-area-inset-bottom))` }}
    >
      <div className="flex h-12 items-center gap-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="focus-outline -ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface-alt"
          >
            <ChevronLeft className="size-7" strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <span className="size-11 shrink-0" aria-hidden />
        )}
        <ProgressBar
          completed={completedSteps}
          total={totalSteps}
          label="Onboarding progress"
          showCountLabel
          heightPx={10}
          className="flex-1"
        />
      </div>
      <div className="flex flex-1 flex-col gap-6 pt-4">{children}</div>
    </div>
  );
}
