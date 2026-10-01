"use client";

import { motion, useReducedMotion } from "motion/react";

export type ProgressBarProps = {
  completed: number;
  total: number;
  label?: string;
  showCountLabel?: boolean;
  heightPx?: number;
  fillColor?: string;
  className?: string;
};

export function ProgressBar({
  completed,
  total,
  label,
  showCountLabel = false,
  heightPx = 12,
  fillColor = "var(--color-primary)",
  className = "",
}: ProgressBarProps) {
  const reduceMotion = useReducedMotion();
  const fraction = total > 0 ? Math.min(Math.max(completed / total, 0), 1) : 0;
  const percent = Math.round(fraction * 100);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        role="progressbar"
        aria-label={label ?? "Progress"}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        className="flex-1 overflow-hidden rounded-chip bg-border"
        style={{ height: heightPx }}
      >
        <motion.div
          className="h-full rounded-chip"
          style={{ background: fillColor }}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={
            reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 24 }
          }
        />
      </div>
      {showCountLabel ? (
        <span className="tabular-nums shrink-0 text-[13px] font-extrabold text-muted">
          {completed} / {total}
        </span>
      ) : null}
    </div>
  );
}
