"use client";

import { useId, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export type ProgressRingProps = {
  fraction: number;
  sizePx?: number;
  strokeWidthPx?: number;
  fillColor?: string;
  trackColor?: string;
  rainbowWhenComplete?: boolean;
  label?: string;
  children?: ReactNode;
  className?: string;
};

const RAINBOW_RING_STOPS = [
  { offset: "0%", color: "#3fa199" },
  { offset: "35%", color: "#ce63de" },
  { offset: "70%", color: "#ff5765" },
  { offset: "100%", color: "#ff8316" },
];

export function ProgressRing({
  fraction,
  sizePx = 96,
  strokeWidthPx = 10,
  fillColor = "var(--color-primary-text)",
  trackColor = "var(--color-border-subtle)",
  rainbowWhenComplete = true,
  label = "Progress",
  children,
  className = "",
}: ProgressRingProps) {
  const reduceMotion = useReducedMotion();
  const gradientId = useId();
  const clampedFraction = Math.min(Math.max(fraction, 0), 1);
  const radius = (sizePx - strokeWidthPx) / 2;
  const center = sizePx / 2;
  const complete = clampedFraction >= 1 && rainbowWhenComplete;

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
        {complete ? (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              {RAINBOW_RING_STOPS.map((stop) => (
                <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
          </defs>
        ) : null}
        <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidthPx} />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={complete ? `url(#${gradientId})` : fillColor}
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
