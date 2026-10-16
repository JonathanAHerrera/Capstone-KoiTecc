"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, CircleHelp, MinusCircle, Sparkles } from "lucide-react";
import { disableFrameworkAction, enableFrameworkAction } from "@/app/applicability/actions";
import { getFramework } from "@/frameworks";
import { FRAMEWORKS } from "@/lib/practice-types";
import type { FrameworkApplicability } from "@/lib/applicability";

const VERDICT_PRESENTATION = {
  likely_applies: {
    label: "Likely applies",
    chipClassName: "border-success-edge bg-success-pale text-success-ink",
    Icon: Check,
  },
  may_apply: {
    label: "May apply",
    chipClassName: "border-warning-edge bg-warning-pale text-warning-ink",
    Icon: CircleHelp,
  },
  unlikely: {
    label: "Unlikely",
    chipClassName: "border-border bg-surface-alt text-text-secondary",
    Icon: MinusCircle,
  },
} as const;

export type ApplicabilityCardProps = {
  applicability: FrameworkApplicability;
  isEnabled: boolean;
};

export function ApplicabilityCard({ applicability, isEnabled }: ApplicabilityCardProps) {
  const router = useRouter();
  const [isUpdating, startUpdating] = useTransition();
  const meta = FRAMEWORKS[applicability.framework];
  const presentation = VERDICT_PRESENTATION[applicability.verdict];
  const definition = getFramework(applicability.framework);
  const isAlwaysEnabled = !definition.canDisable;
  const trackHref = definition.homeRoute;

  function handleToggle() {
    startUpdating(async () => {
      const result = isEnabled
        ? await disableFrameworkAction(applicability.framework)
        : await enableFrameworkAction(applicability.framework);
      if (result.ok) router.refresh();
    });
  }

  return (
    <article className="flex flex-col gap-3 rounded-card border border-border bg-surface px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold text-ink">{meta.shortName}</h3>
          <p className="text-sm text-text-secondary">{meta.fullName}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[13px] font-medium ${presentation.chipClassName}`}
        >
          <presentation.Icon className="size-3.5" aria-hidden />
          {presentation.label}
        </span>
      </div>

      {applicability.plainEnglish ? (
        <p className="flex gap-2 rounded-card bg-surface-alt px-3 py-2.5 text-sm text-text">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary-text" aria-hidden />
          <span>{applicability.plainEnglish}</span>
        </p>
      ) : null}

      <ul className="flex flex-col gap-1.5">
        {applicability.reasons.map((reason) => (
          <li key={reason} className="flex gap-2 text-sm text-text-secondary">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3 pt-1">
        {isAlwaysEnabled ? (
          <Link
            href={trackHref}
            className="focus-outline inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-canvas"
          >
            Open track
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={handleToggle}
              disabled={isUpdating}
              className={`focus-outline inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors ${
                isEnabled
                  ? "border border-border bg-surface text-text-secondary hover:bg-surface-alt"
                  : "bg-primary text-canvas"
              } ${isUpdating ? "opacity-60" : ""}`}
            >
              {isEnabled ? "Remove track" : "Enable this track"}
            </button>
            {isEnabled ? (
              <Link
                href={trackHref}
                className="focus-outline inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-primary-text hover:bg-surface-alt"
              >
                Open track
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            ) : null}
          </>
        )}
      </div>

      <p className="text-[13px] leading-snug text-muted">{meta.disclaimer}</p>
    </article>
  );
}
