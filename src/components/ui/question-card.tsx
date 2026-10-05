"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export type QuestionCardProps = {
  label: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onSelect: () => void;
  letterKey?: string;
  disabled?: boolean;
  className?: string;
};

export const CARD_PRESS_TRANSITION = { type: "spring", visualDuration: 0.18, bounce: 0.4 } as const;
export const CARD_PRESS_TRANSITION_REDUCED = { type: "spring", visualDuration: 0.18, bounce: 0 } as const;

export function QuestionCard({
  label,
  description,
  icon,
  selected,
  onSelect,
  letterKey,
  disabled = false,
  className = "",
}: QuestionCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={reduceMotion ? CARD_PRESS_TRANSITION_REDUCED : CARD_PRESS_TRANSITION}
      className={[
        "card-ring focus-outline flex w-full min-h-14 items-center gap-3 rounded-card border px-4 py-3 text-left transition-colors duration-150",
        selected ? "border-primary-text bg-selected text-ink" : "border-border bg-surface text-text",
        disabled ? "opacity-60" : "",
        className,
      ].join(" ")}
    >
      {icon ? (
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] [&>svg]:size-6 ${
            selected ? "bg-primary text-canvas" : "bg-surface-alt text-primary-text"
          }`}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-medium leading-snug">{label}</span>
        {description ? <span className="text-sm text-text-secondary">{description}</span> : null}
      </span>
      {letterKey ? (
        <span
          className={`hidden size-8 shrink-0 items-center justify-center rounded-lg border text-[13px] font-semibold sm:flex ${
            selected ? "border-primary-text text-primary-text" : "border-border text-muted"
          }`}
          aria-hidden
        >
          {letterKey}
        </span>
      ) : null}
    </motion.button>
  );
}
