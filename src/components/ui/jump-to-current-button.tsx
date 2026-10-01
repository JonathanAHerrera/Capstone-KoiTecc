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
  bottomOffsetPx = 24,
  className = "",
}: JumpToCurrentButtonProps) {
  const [targetDirection, setTargetDirection] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) return;
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTargetDirection(null);
          return;
        }
        setTargetDirection(entry.boundingClientRect.top < 0 ? "up" : "down");
      },
      { threshold: 0.5 },
    );
    intersectionObserver.observe(targetElement);
    return () => intersectionObserver.disconnect();
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
          className={`lip lip-press caption fixed right-4 z-30 flex h-12 items-center gap-2 rounded-chip bg-primary px-4 text-white [--lip-color:var(--color-primary-lip)] ${className}`}
          style={{ bottom: `calc(${bottomOffsetPx}px + env(safe-area-inset-bottom))` }}
        >
          {targetDirection === "up" ? <ArrowUp className="size-4" aria-hidden /> : <ArrowDown className="size-4" aria-hidden />}
          {label}
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
