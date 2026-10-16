"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import { useToast } from "@/components/ui/use-toast";

export type CopyNoticeButtonProps = {
  noticeText: string;
  label: string;
};

export function CopyNoticeButton({ noticeText, label }: CopyNoticeButtonProps) {
  const { showToast } = useToast();
  const [copyingNotice, setCopyingNotice] = useState(false);

  async function sendCopyNotice() {
    setCopyingNotice(true);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(noticeText);
      showToast({ tone: "success", message: "Draft copied to clipboard" });
    } catch {
      showToast({ tone: "danger", message: "Couldn't copy. Select the text and copy it manually." });
    } finally {
      setCopyingNotice(false);
    }
  }

  return (
    <BigButton variant="secondary" size="compact" fullWidth icon={<Copy />} loading={copyingNotice} onClick={sendCopyNotice}>
      {label}
    </BigButton>
  );
}
