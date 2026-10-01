"use client";

import { Camera, ClipboardCheck, FolderOpen, Rocket } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
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

      <div className="lip rounded-card border-2 border-border bg-surface p-4 [--lip-color:var(--color-border)]">
        <p className="caption text-primary">Your path</p>
        <p className="mt-1 text-[24px] font-black leading-tight text-ink">CMMC Level {targetLevel}</p>
        <p className="mt-0.5 text-sm font-medium text-muted">
          {targetLevel === 1 ? "Self-assessment (FCI only)" : "Self-assessment preview (CUI)"}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-canvas px-3 py-3">
            <dt className="caption text-muted">Requirements</dt>
            <dd className="tabular-nums text-[32px] font-black leading-none text-ink">{levelEstimate.count}</dd>
          </div>
          <div className="rounded-xl bg-canvas px-3 py-3">
            <dt className="caption text-muted">Estimated time</dt>
            <dd className="text-[18px] font-black leading-tight text-ink">{formatEstimatedHours(levelEstimate.minutes)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg">How it works</h2>
        <ol className="flex flex-col gap-3">
          {HOW_IT_WORKS_STEPS.map((step, stepIndex) => (
            <li key={step.title} className="flex items-start gap-3 rounded-card border-2 border-border bg-surface px-4 py-3">
              <span
                className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-pale text-primary [&>svg]:size-6"
                aria-hidden
              >
                {step.icon}
                <span className="absolute -left-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white">
                  {stepIndex + 1}
                </span>
              </span>
              <span className="flex flex-col">
                <span className="text-base font-bold text-ink">{step.title}</span>
                <span className="text-sm font-medium text-muted">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-[13px] font-medium leading-snug text-muted">{READINESS_DISCLAIMER}</p>

      <BottomActionBar>
        <BigButton fullWidth variant="success" icon={<Rocket />} loading={savingOrganization} onClick={onStartPath}>
          Start my path
        </BigButton>
      </BottomActionBar>
    </>
  );
}
