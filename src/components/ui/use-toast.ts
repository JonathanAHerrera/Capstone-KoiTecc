"use client";

import { useContext } from "react";
import { ToastContext } from "./toast-context";

export function useToast() {
  const toastContextValue = useContext(ToastContext);
  if (!toastContextValue) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return toastContextValue;
}
