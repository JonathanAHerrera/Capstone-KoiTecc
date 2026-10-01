"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export type ProgressRingProps = {
  fraction: number;
  sizePx?: number;
  strokeWidthPx?: number;
  fillColor?: string;
  trackColor?: string;
  label?: string;
  children?: ReactNode;
  className?: string;
};

export function ProgressRing({
  fraction,
  sizePx = 96,
  strokeWidthPx = 10,
  fillColor = "var(--color-primary)",
  trackColor = "var(--color-border)",
  label = "Progress",
  children,
  className = "",
}: ProgressRingProps) {
  const reduceMotion = useReducedMotion();
  const clampedFraction = Math.min(Math.max(fraction, 0), 1);
  const radius = (sizePx - strokeWidthPx) / 2;
  const center = sizePx / 2;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clampedFraction * 100)}
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: sizePx, height: sizePx }}
    >
      <svg width={sizePx} height={sizePx} viewBox={`0 0 ${sizePx} ${sizePx}`} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidthPx} />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidthPx}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clampedFraction }}
          transition={
            reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 22, mass: 0.8 }
          }
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      ) : null}
    </div>
  );
}
