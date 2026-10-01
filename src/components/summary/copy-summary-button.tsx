"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import { useToast } from "@/components/ui/use-toast";

export type CopySummaryButtonProps = {
  summaryText: string;
};

export function CopySummaryButton({ summaryText }: CopySummaryButtonProps) {
  const { showToast } = useToast();
  const [copyingSummary, setCopyingSummary] = useState(false);

  const sendCopySummary = async () => {
    setCopyingSummary(true);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(summaryText);
      showToast({ tone: "success", message: "Summary copied to clipboard" });
    } catch {
      showToast({ tone: "danger", message: "Couldn't copy. Use Download instead." });
    } finally {
      setCopyingSummary(false);
    }
  };

  return (
    <BigButton variant="secondary" size="compact" fullWidth icon={<Copy />} loading={copyingSummary} onClick={sendCopySummary}>
      Copy summary
    </BigButton>
  );
}
