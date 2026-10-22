"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp } from "lucide-react";

export type JumpToCurrentButtonProps = {
  targetElementId: string;
  label?: string;
  bottomOffsetPx?: number;
  className?: string;
};

export function JumpToCurrentButton({
  targetElementId,
  label = "Jump to current",
  bottomOffsetPx = 75,
  className = "",
}: JumpToCurrentButtonProps) {
  const [targetDirection, setTargetDirection] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    let animationFrameId = 0;
    const updateTargetDirection = () => {
      const targetElement = document.getElementById(targetElementId);
      if (!targetElement) {
        setTargetDirection(null);
        return;
      }
      const targetRect = targetElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const targetVisible = targetRect.bottom > viewportHeight * 0.1 && targetRect.top < viewportHeight * 0.85;
      setTargetDirection(targetVisible ? null : targetRect.top < 0 ? "up" : "down");
    };
    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateTargetDirection);
    };
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [targetElementId]);

  const scrollToTarget = () => {
    document.getElementById(targetElementId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <AnimatePresence>
      {targetDirection ? (
        <motion.button
          type="button"
          onClick={scrollToTarget}
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className={`btn-plate focus-outline fixed right-4 z-30 [--btn-plate-color:var(--color-primary-lip)] [--btn-surface:var(--color-primary)] [--btn-surface-hover:var(--color-primary-hover)] [--btn-surface-pressed:var(--color-primary-pressed)] [--btn-text:var(--color-primary-contrast)] [--radius-plate:9999px] [--radius-btn:9999px] sm:right-6 ${className}`}
          style={{
            bottom: `calc(${bottomOffsetPx}px + env(safe-area-inset-bottom))`,
          }}
        >
          <span className="btn-plate-body h-10 px-4 text-sm font-medium">
            {targetDirection === "up" ? <ArrowUp className="size-4" aria-hidden /> : <ArrowDown className="size-4" aria-hidden />}
            {label}
          </span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
