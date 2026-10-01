import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDotDashed,
  CircleMinus,
  Clock,
  type LucideIcon,
} from "lucide-react";

export type PracticeStatus =
  | "not_started"
  | "in_progress"
  | "under_review"
  | "needs_work"
  | "accepted"
  | "not_applicable";

export type StatusChipProps = {
  status: PracticeStatus;
  size?: "default" | "small";
  className?: string;
};

const STATUS_PRESENTATION: Record<PracticeStatus, { word: string; icon: LucideIcon; className: string }> = {
  not_started: { word: "Not started", icon: CircleDashed, className: "bg-canvas text-muted border-border" },
  in_progress: {
    word: "In progress",
    icon: CircleDotDashed,
    className: "bg-primary-pale text-primary border-primary/20",
  },
  under_review: { word: "Submitted", icon: Clock, className: "bg-info-pale text-info-ink border-info/30" },
  needs_work: {
    word: "Needs work",
    icon: CircleAlert,
    className: "bg-warning-pale text-warning-ink border-warning/40",
  },
  accepted: { word: "Met", icon: CircleCheck, className: "bg-success-pale text-success-ink border-success/40" },
  not_applicable: { word: "N/A", icon: CircleMinus, className: "bg-canvas text-muted border-border" },
};

export function StatusChip({ status, size = "default", className = "" }: StatusChipProps) {
  const presentation = STATUS_PRESENTATION[status];
  const StatusIcon = presentation.icon;
  const sizeClassName = size === "small" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]";

  return (
    <span
      className={`inline-flex shrink-0 self-start items-center gap-1.5 whitespace-nowrap rounded-chip border-2 font-extrabold uppercase tracking-[0.04em] ${sizeClassName} ${presentation.className} ${className}`}
    >
      <StatusIcon className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
      {presentation.word}
    </span>
  );
}
