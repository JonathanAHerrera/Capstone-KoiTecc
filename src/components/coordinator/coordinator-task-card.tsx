import { ArrowRight, Camera, Clock, MessagesSquare, PencilLine, Wrench, type LucideIcon } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import type { CoordinatorTask, CoordinatorTaskKind } from "@/lib/coordinator";

const KIND_PRESENTATION: Record<
  CoordinatorTaskKind,
  { label: string; icon: LucideIcon; accent: string; cta: string }
> = {
  fix_needs_work: { label: "Fix & resubmit", icon: Wrench, accent: "border-warning-edge bg-warning-pale text-warning-ink", cta: "Open" },
  finish_draft: { label: "Finish draft", icon: PencilLine, accent: "border-primary-edge bg-primary-pale text-primary-text", cta: "Open" },
  provide_evidence: { label: "Add evidence", icon: Camera, accent: "border-primary-edge bg-primary-pale text-primary-text", cta: "Open" },
  start_check: { label: "5-minute check", icon: MessagesSquare, accent: "border-info-edge bg-info-pale text-info-ink", cta: "Start" },
  awaiting_review: { label: "With the reviewer", icon: Clock, accent: "border-border bg-surface-alt text-text-secondary", cta: "View" },
};

export function CoordinatorTaskCard({ task }: { task: CoordinatorTask }) {
  const presentation = KIND_PRESENTATION[task.kind];
  const Icon = presentation.icon;
  const actionable = task.kind !== "awaiting_review";

  return (
    <li className="flex flex-col gap-2 rounded-card border border-border bg-surface px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${presentation.accent}`}>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {presentation.label}
        </span>
        <span className="font-mono text-xs text-muted">{task.familyCode}</span>
        <span className="ml-auto text-xs text-muted">~{task.estimatedEffortMinutes} min</span>
      </div>

      <p className="text-[15px] font-semibold text-ink">{task.title}</p>
      <p className="text-sm text-text-secondary">{task.reason}</p>
      <p className="text-sm font-medium text-ink">{task.action}</p>
      {task.evidenceHint ? (
        <p className="rounded-card bg-surface-alt px-3 py-2 text-sm text-text-secondary">{task.evidenceHint}</p>
      ) : null}

      {actionable ? (
        <BigButton href={task.href} size="compact" variant="secondary" className="self-start" icon={<ArrowRight className="size-4" aria-hidden />}>
          {presentation.cta}
        </BigButton>
      ) : null}
    </li>
  );
}
