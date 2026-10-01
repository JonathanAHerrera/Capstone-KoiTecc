import { createContext } from "react";

export type ToastTone = "info" | "success" | "warning" | "danger";

export type ToastOptions = {
  message: string;
  tone?: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

export type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
  dismissToast: (toastId: number) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
