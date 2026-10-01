"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { ToastContext, type ToastOptions, type ToastTone } from "./toast-context";

type ActiveToast = ToastOptions & { id: number };

const TONE_STYLES: Record<ToastTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "bg-dark-surface text-white" },
  success: { icon: CircleCheck, className: "bg-success-ink text-white" },
  warning: { icon: TriangleAlert, className: "bg-warning-ink text-white" },
  danger: { icon: CircleAlert, className: "bg-danger-ink text-white" },
};

const DEFAULT_TOAST_DURATION_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [activeToasts, setActiveToasts] = useState<ActiveToast[]>([]);
  const nextToastIdRef = useRef(1);

  const dismissToast = useCallback((toastId: number) => {
    setActiveToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const toastId = nextToastIdRef.current++;
      setActiveToasts((currentToasts) => [...currentToasts.slice(-2), { ...options, id: toastId }]);
      window.setTimeout(() => dismissToast(toastId), options.durationMs ?? DEFAULT_TOAST_DURATION_MS);
    },
    [dismissToast],
  );

  const toastContextValue = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={toastContextValue}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-[calc(12px+env(safe-area-inset-top))]"
      >
        <AnimatePresence>
          {activeToasts.map((toast) => {
            const tone = TONE_STYLES[toast.tone ?? "info"];
            const ToneIcon = tone.icon;
            return (
              <motion.div
                key={toast.id}
                role="status"
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className={`pointer-events-auto flex w-full max-w-[608px] items-center gap-3 rounded-card px-4 py-3 text-[15px] font-medium shadow-float ${tone.className}`}
              >
                <ToneIcon className="size-5 shrink-0" aria-hidden />
                <span className="flex-1">{toast.message}</span>
                {toast.actionLabel ? (
                  <button
                    type="button"
                    onClick={() => {
                      toast.onAction?.();
                      dismissToast(toast.id);
                    }}
                    className="rounded-chip bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25"
                  >
                    {toast.actionLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => dismissToast(toast.id)}
                  className="flex size-11 -mr-2 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
