"use client";

import type { ReactNode } from "react";
import { BigButton } from "@/components/ui/big-button";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { QuestionCard } from "@/components/ui/question-card";
import { SpeechBubble } from "@/components/ui/speech-bubble";

export type SingleChoiceOption<Value extends string> = {
  value: Value;
  label: string;
  description?: string;
  icon?: ReactNode;
};

export type SingleChoiceScreenProps<Value extends string> = {
  question: ReactNode;
  questionLabel: string;
  options: SingleChoiceOption<Value>[];
  selectedValue: Value | null;
  onSelect: (value: Value) => void;
  onContinue: () => void;
  note?: ReactNode;
  columns?: 1 | 2;
};

const LETTER_KEYS = ["A", "B", "C", "D", "E", "F"];

export function SingleChoiceScreen<Value extends string>({
  question,
  questionLabel,
  options,
  selectedValue,
  onSelect,
  onContinue,
  note,
  columns = 1,
}: SingleChoiceScreenProps<Value>) {
  return (
    <>
      <SpeechBubble>{question}</SpeechBubble>
      <div
        role="radiogroup"
        aria-label={questionLabel}
        className={columns === 2 ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}
      >
        {options.map((option, optionIndex) => (
          <QuestionCard
            key={option.value}
            label={option.label}
            description={option.description}
            icon={option.icon}
            selected={selectedValue === option.value}
            onSelect={() => onSelect(option.value)}
            letterKey={columns === 1 ? LETTER_KEYS[optionIndex] : undefined}
          />
        ))}
      </div>
      {note ? <div className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-text-secondary">{note}</div> : null}
      <BottomActionBar>
        <BigButton fullWidth disabled={selectedValue === null} onClick={onContinue}>
          Continue
        </BigButton>
      </BottomActionBar>
    </>
  );
}
