"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { X } from "lucide-react";

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  dragToDismiss?: boolean;
  className?: string;
};

const DISMISS_DRAG_DISTANCE_PX = 120;
const DISMISS_DRAG_VELOCITY = 500;

export function BottomSheet({ open, onClose, title, children, dragToDismiss = true, className = "" }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const handleDragEnd = (_event: unknown, dragInfo: PanInfo) => {
    if (dragInfo.offset.y > DISMISS_DRAG_DISTANCE_PX || dragInfo.velocity.y > DISMISS_DRAG_VELOCITY) onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative flex w-full max-w-[640px] flex-col rounded-t-[20px] bg-surface shadow-sheet ${className}`}
            style={{ maxHeight: "90dvh", paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            drag={dragToDismiss ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-center justify-center pb-1 pt-3" aria-hidden>
              <span className="h-1 w-9 rounded-chip bg-border" />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 pb-2">
              {title ? <h2 className="text-lg font-semibold text-ink">{title}</h2> : <span />}
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="focus-outline flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-alt"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-2">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
