"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function DismissibleSuccessBanner({
  message,
  visible,
}: {
  message: string;
  visible: boolean;
}) {
  const [isVisible, setIsVisible] = useState(visible);
  if (!isVisible) return null;

  return (
    <p className="flex items-center gap-3 rounded-card border border-success/40 bg-success/10 px-4 py-3 text-sm text-success-ink">
      <span className="min-w-0 flex-1">{message}</span>
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        aria-label="Dismiss message"
        className="focus-outline flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-success/15"
      >
        <X className="size-4" aria-hidden />
      </button>
    </p>
  );
}
