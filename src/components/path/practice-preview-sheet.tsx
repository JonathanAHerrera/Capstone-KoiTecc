"use client";

import { ArrowRight, Clock } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { StatusChip } from "@/components/ui/status-chip";
import type { PathNodeViewModel } from "./build-path-view-model";

export type PracticePreviewSheetProps = {
  node: PathNodeViewModel | null;
  open: boolean;
  onClose: () => void;
};

function openButtonLabel(status: PathNodeViewModel["status"]) {
  switch (status) {
    case "not_started":
      return "Start";
    case "accepted":
      return "Open";
    case "needs_work":
      return "Fix it";
    default:
      return "Continue";
  }
}

export function PracticePreviewSheet({ node, open, onClose }: PracticePreviewSheetProps) {
  return (
    <BottomSheet open={open && node !== null} onClose={onClose} title={node?.title ?? "Requirement"}>
      {node ? (
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={node.status} size="small" />
            <span className="caption text-muted">
              {node.id} · {node.familyName}
            </span>
          </div>
          <p className="text-[17px] leading-snug text-ink">{node.plainEnglish}</p>
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
            <Clock className="size-4" aria-hidden />
            About {node.estimatedEffortMinutes} min
          </p>
          <BigButton fullWidth href={`/practice/${node.id}`} icon={<ArrowRight />}>
            {openButtonLabel(node.status)}
          </BigButton>
        </div>
      ) : null}
    </BottomSheet>
  );
}
