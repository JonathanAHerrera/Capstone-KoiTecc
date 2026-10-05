"use client";

import { Camera, ClipboardCheck, FolderOpen, Rocket } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { GlareHover } from "@/components/ui/glare-hover";
import { SpeechBubble } from "@/components/ui/speech-bubble";
import type { CmmcLevel } from "@/lib/practice-types";
import { formatEstimatedHours, type LevelEstimate } from "./onboarding-steps";
import { READINESS_DISCLAIMER } from "./readiness-disclaimer";

export type ComingUpScreenProps = {
  companyName: string;
  targetLevel: CmmcLevel;
  levelEstimate: LevelEstimate;
  savingOrganization: boolean;
  onStartPath: () => void;
};

const HOW_IT_WORKS_STEPS = [
  { icon: <FolderOpen />, title: "Open a requirement", detail: "Each one is explained in plain English." },
  { icon: <Camera />, title: "Upload proof from your phone", detail: "Photos, screenshots, documents or a short note." },
  { icon: <ClipboardCheck />, title: "Get a readiness review", detail: "You'll hear what's missing and what to do next." },
];

export function ComingUpScreen({
  companyName,
  targetLevel,
  levelEstimate,
  savingOrganization,
  onStartPath,
}: ComingUpScreenProps) {
  return (
    <>
      <SpeechBubble>
        Here&apos;s what&apos;s coming up for <strong>{companyName.trim()}</strong>.
      </SpeechBubble>

      <GlareHover glareOpacity={0.3} playOnce className="rounded-card">
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="caption text-primary-text">Your path</p>
          <p className="display mt-1 text-[32px] text-ink">CMMC Level {targetLevel}</p>
          <p className="mt-1 text-sm text-text-secondary">
            {targetLevel === 1 ? "Self-assessment (FCI only)" : "Self-assessment preview (CUI)"}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[10px] border border-border-subtle bg-canvas px-3 py-3">
              <dt className="caption text-muted">Requirements</dt>
              <dd className="tabular-nums mt-1 text-[32px] font-medium leading-none tracking-[-0.02em] text-primary-text">{levelEstimate.count}</dd>
            </div>
            <div className="rounded-[10px] border border-border-subtle bg-canvas px-3 py-3">
              <dt className="caption text-muted">Estimated time</dt>
              <dd className="mt-1 text-[18px] font-medium leading-tight text-ink">{formatEstimatedHours(levelEstimate.minutes)}</dd>
            </div>
          </dl>
        </div>
      </GlareHover>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg">How it works</h2>
        <ol className="flex flex-col gap-3">
          {HOW_IT_WORKS_STEPS.map((step, stepIndex) => (
            <li key={step.title} className="flex items-start gap-3 rounded-card border border-border bg-surface px-4 py-3">
              <span
                className="relative flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-pale text-primary-text [&>svg]:size-6"
                aria-hidden
              >
                {step.icon}
                <span className="tabular-nums absolute -left-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-canvas">
                  {stepIndex + 1}
                </span>
              </span>
              <span className="flex flex-col">
                <span className="text-base font-medium text-ink">{step.title}</span>
                <span className="text-sm text-text-secondary">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-[13px] leading-snug text-muted">{READINESS_DISCLAIMER}</p>

      <BottomActionBar>
        <BigButton fullWidth icon={<Rocket />} loading={savingOrganization} onClick={onStartPath}>
          Start my path
        </BigButton>
      </BottomActionBar>
    </>
  );
}
