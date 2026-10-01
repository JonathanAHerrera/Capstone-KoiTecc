"use client";

import { useEffect, type ReactNode } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

export type StatTileProps = {
  value: number;
  label: string;
  icon?: ReactNode;
  accentColor?: string;
  prefix?: string;
  suffix?: string;
  countUpOnMount?: boolean;
  className?: string;
};

export function StatTile({
  value,
  label,
  icon,
  accentColor = "var(--color-primary)",
  prefix = "",
  suffix = "",
  countUpOnMount = true,
  className = "",
}: StatTileProps) {
  const reduceMotion = useReducedMotion();
  const tickerMotionValue = useMotionValue(countUpOnMount && !reduceMotion ? 0 : value);
  const roundedTickerValue = useTransform(tickerMotionValue, (latestValue) => Math.round(latestValue).toString());

  useEffect(() => {
    const tickerAnimation = animate(tickerMotionValue, value, {
      duration: reduceMotion || !countUpOnMount ? 0 : 0.8,
      ease: "easeOut",
    });
    return () => tickerAnimation.stop();
  }, [value, reduceMotion, countUpOnMount, tickerMotionValue]);

  return (
    <div
      className={`lip flex min-w-0 flex-col items-center gap-1 rounded-card border-2 border-border bg-surface px-3 py-4 text-center [--lip-color:var(--color-border)] ${className}`}
    >
      {icon ? (
        <span className="flex items-center [&>svg]:size-7" style={{ color: accentColor }} aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="tabular-nums text-[40px] font-black leading-none sm:text-[48px]" style={{ color: accentColor }}>
        {prefix}
        <motion.span>{roundedTickerValue}</motion.span>
        {suffix}
      </span>
      <span className="caption text-muted">{label}</span>
    </div>
  );
}
