"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Clock, Lock, Play, SquarePen, TriangleAlert, type LucideIcon } from "lucide-react";

export type PathNodeState = "locked" | "available" | "in_progress" | "under_review" | "needs_work" | "accepted";

export type PathNodeProps = {
  state: PathNodeState;
  isCurrent?: boolean;
  label: string;
  tooltip?: string;
  onClick?: () => void;
  sizePx?: number;
  id?: string;
  className?: string;
};

const STATE_PRESENTATION: Record<
  Exclude<PathNodeState, "accepted">,
  { icon: LucideIcon; className: string; stateWord: string }
> = {
  locked: {
    icon: Lock,
    stateWord: "locked",
    className: "bg-border text-disabled opacity-60 [--lip-color:var(--color-border-strong)]",
  },
  available: {
    icon: Play,
    stateWord: "ready to start",
    className: "bg-primary text-white [--lip-color:var(--color-primary-lip)]",
  },
  in_progress: {
    icon: SquarePen,
    stateWord: "in progress",
    className: "bg-primary text-white [--lip-color:var(--color-primary-lip)]",
  },
  under_review: {
    icon: Clock,
    stateWord: "submitted for review",
    className: "bg-info text-white [--lip-color:var(--color-info-lip)]",
  },
  needs_work: {
    icon: TriangleAlert,
    stateWord: "needs work",
    className: "bg-warning text-white [--lip-color:var(--color-warning-lip)]",
  },
};

const POP_EASE: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

export function PathNode({
  state,
  isCurrent = false,
  label,
  tooltip,
  onClick,
  sizePx = 72,
  id,
  className = "",
}: PathNodeProps) {
  const reduceMotion = useReducedMotion();
  const previousStateRef = useRef(state);
  const [poppingToAccepted, setPoppingToAccepted] = useState(false);

  useEffect(() => {
    if (previousStateRef.current !== "accepted" && state === "accepted") {
      setPoppingToAccepted(true);
    }
    previousStateRef.current = state;
  }, [state]);

  const accepted = state === "accepted";
  const presentation = accepted ? null : STATE_PRESENTATION[state];
  const StateIcon = presentation?.icon;
  const iconSizePx = Math.round(sizePx * 0.42);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: sizePx, height: sizePx }}>
      {isCurrent && !reduceMotion ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute rounded-full border-4 border-primary"
          style={{ inset: -6 }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.1, 0.55] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : isCurrent ? (
        <span aria-hidden className="pointer-events-none absolute rounded-full border-4 border-primary/40" style={{ inset: -6 }} />
      ) : null}

      {tooltip ? (
        <motion.span
          role="presentation"
          className="caption pointer-events-none absolute left-1/2 z-10 whitespace-nowrap rounded-chip border-2 border-primary bg-surface px-3 py-1.5 text-primary shadow-sm"
          style={{ bottom: sizePx + 8, x: "-50%" }}
          animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {tooltip}
          <span
            aria-hidden
            className="absolute left-1/2 -bottom-[7px] size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-primary bg-surface"
          />
        </motion.span>
      ) : null}

      <motion.button
        type="button"
        id={id}
        aria-label={`${label}: ${accepted ? "met" : presentation?.stateWord}`}
        aria-current={isCurrent ? "step" : undefined}
        aria-disabled={state === "locked" ? true : undefined}
        onClick={onClick}
        animate={poppingToAccepted && !reduceMotion ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, ease: POP_EASE }}
        onAnimationComplete={() => setPoppingToAccepted(false)}
        className={[
          "lip lip-press flex items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
          "[--lip-height:6px]",
          accepted ? "bg-gold text-white [--lip-color:var(--color-gold-lip)]" : presentation?.className,
        ].join(" ")}
        style={{ width: sizePx, height: sizePx }}
      >
        {accepted ? (
          <svg width={iconSizePx} height={iconSizePx} viewBox="0 0 24 24" fill="none" aria-hidden>
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: poppingToAccepted ? 0 : 1 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: poppingToAccepted ? 0.15 : 0 }}
            />
          </svg>
        ) : StateIcon ? (
          <StateIcon
            style={{ width: iconSizePx, height: iconSizePx }}
            strokeWidth={2.5}
            fill={state === "available" ? "currentColor" : "none"}
            aria-hidden
          />
        ) : null}
      </motion.button>
    </div>
  );
}
