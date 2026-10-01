"use client";

import { Building2 } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { SpeechBubble } from "@/components/ui/speech-bubble";
import { companyNameIsValid, MIN_COMPANY_NAME_LENGTH } from "./onboarding-steps";

export type CompanyNameScreenProps = {
  companyName: string;
  onCompanyNameChange: (companyName: string) => void;
  onContinue: () => void;
};

export function CompanyNameScreen({ companyName, onCompanyNameChange, onContinue }: CompanyNameScreenProps) {
  const continueEnabled = companyNameIsValid(companyName);

  return (
    <>
      <SpeechBubble>What&apos;s your company called?</SpeechBubble>
      <label className="flex flex-col gap-2">
        <span className="caption text-muted">Company name</span>
        <span className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 focus-within:border-primary-text focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-text">
          <Building2 className="size-6 shrink-0 text-primary-text" aria-hidden />
          <input
            type="text"
            name="companyName"
            value={companyName}
            onChange={(event) => onCompanyNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && continueEnabled) onContinue();
            }}
            autoFocus
            autoComplete="organization"
            autoCapitalize="words"
            enterKeyHint="next"
            placeholder="Acme Machining"
            maxLength={200}
            className="min-h-12 w-full bg-transparent text-lg font-medium text-ink outline-none placeholder:font-normal placeholder:text-disabled"
          />
        </span>
        <span className="text-sm text-text-secondary">
          {continueEnabled ? "This name goes on your readiness package." : `At least ${MIN_COMPANY_NAME_LENGTH} characters.`}
        </span>
      </label>
      <BottomActionBar>
        <BigButton fullWidth disabled={!continueEnabled} onClick={onContinue}>
          Continue
        </BigButton>
      </BottomActionBar>
    </>
  );
}
