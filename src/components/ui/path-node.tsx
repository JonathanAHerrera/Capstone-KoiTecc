"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Clock, Lock, Play, SquarePen, TriangleAlert, type LucideIcon } from "lucide-react";
import { GUMMY_PRESS_TRANSITION, GUMMY_PRESS_TRANSITION_REDUCED } from "./big-button";
import { ShineBorder } from "./shine-border";

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
    className: "border border-border bg-surface-alt text-muted",
  },
  available: {
    icon: Play,
    stateWord: "ready to start",
    className: "border border-border bg-surface text-primary-text",
  },
  in_progress: {
    icon: SquarePen,
    stateWord: "in progress",
    className: "bg-primary text-canvas shadow-[var(--shadow-primary-glow)]",
  },
  under_review: {
    icon: Clock,
    stateWord: "reviewing",
    className: "bg-info text-white",
  },
  needs_work: {
    icon: TriangleAlert,
    stateWord: "needs work",
    className: "bg-warning text-ink",
  },
};

const SHINE_RAINBOW = ["#00e676", "#35d7ff", "#7aaaff"];
const CURRENT_RING_INSET_PX = -6;
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
  const iconSizePx = Math.round(sizePx * 0.4);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: sizePx, height: sizePx }}>
      {isCurrent ? (
        <span aria-hidden className="pointer-events-none absolute rounded-full" style={{ inset: CURRENT_RING_INSET_PX }}>
          <ShineBorder shineColor={SHINE_RAINBOW} borderWidth={2} duration={8} />
        </span>
      ) : null}

      {tooltip ? (
        <motion.span
          role="presentation"
          className="caption pointer-events-none absolute left-1/2 z-10 whitespace-nowrap rounded-chip border border-primary-text bg-surface px-3 py-1.5 text-primary-text"
          style={{ bottom: sizePx + 10, x: "-50%" }}
          animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {tooltip}
          <span
            aria-hidden
            className="absolute left-1/2 -bottom-[6px] size-2.5 -translate-x-1/2 rotate-45 border-b border-r border-primary-text bg-surface"
          />
        </motion.span>
      ) : null}

      <motion.button
        type="button"
        id={id}
        aria-label={`${label}: ${accepted ? "accepted" : presentation?.stateWord}`}
        aria-current={isCurrent ? "step" : undefined}
        onClick={onClick}
        animate={poppingToAccepted && !reduceMotion ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        whileTap={{ scale: 0.94 }}
        transition={
          poppingToAccepted && !reduceMotion
            ? { duration: 0.4, ease: POP_EASE }
            : reduceMotion
              ? GUMMY_PRESS_TRANSITION_REDUCED
              : GUMMY_PRESS_TRANSITION
        }
        onAnimationComplete={() => setPoppingToAccepted(false)}
        className={[
          "focus-outline flex items-center justify-center rounded-full transition-colors duration-200",
          accepted ? "bg-success text-canvas shadow-[var(--shadow-primary-glow)]" : presentation?.className,
        ].join(" ")}
        style={{ width: sizePx, height: sizePx }}
      >
        {accepted ? (
          <svg width={iconSizePx} height={iconSizePx} viewBox="0 0 24 24" fill="none" aria-hidden>
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth={3}
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
            strokeWidth={2.25}
            fill={state === "available" ? "currentColor" : "none"}
            aria-hidden
          />
        ) : null}
      </motion.button>
    </div>
  );
}
