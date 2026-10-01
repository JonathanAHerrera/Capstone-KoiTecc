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
      animate={selected && !reduceMotion ? { scale: [1, 0.98, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className={[
        "lip lip-press flex w-full min-h-14 items-center gap-3 rounded-card border-2 px-4 py-3 text-left",
        "outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
        selected
          ? "border-primary bg-primary-pale text-ink [--lip-color:var(--color-primary)]"
          : "border-border bg-surface text-text [--lip-color:var(--color-border)] hover:bg-canvas",
        disabled ? "opacity-60" : "",
        className,
      ].join(" ")}
    >
      {icon ? (
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl [&>svg]:size-6 ${
            selected ? "bg-primary text-white" : "bg-canvas text-primary"
          }`}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-bold leading-snug">{label}</span>
        {description ? <span className="text-sm font-medium text-muted">{description}</span> : null}
      </span>
      {letterKey ? (
        <span
          className={`hidden size-8 shrink-0 items-center justify-center rounded-lg border-2 text-[13px] font-extrabold sm:flex ${
            selected ? "border-primary text-primary" : "border-border text-muted"
          }`}
          aria-hidden
        >
          {letterKey}
        </span>
      ) : null}
    </motion.button>
  );
}
