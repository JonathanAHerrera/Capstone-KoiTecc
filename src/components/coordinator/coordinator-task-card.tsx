import { ArrowRight, Camera, Clock, MessagesSquare, PencilLine, Wrench, type LucideIcon } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import type { CoordinatorTask, CoordinatorTaskKind } from "@/lib/coordinator";

const KIND_PRESENTATION: Record<
  CoordinatorTaskKind,
  { label: string; icon: LucideIcon; chip: string; dot: string; cta: string }
> = {
  fix_needs_work: { label: "Fix & resubmit", icon: Wrench, chip: "border-warning-edge bg-warning-pale text-warning-ink", dot: "bg-warning-pale text-warning-ink", cta: "Open" },
  finish_draft: { label: "Finish draft", icon: PencilLine, chip: "border-primary-edge bg-primary-pale text-primary-text", dot: "bg-primary-pale text-primary-text", cta: "Open" },
  provide_evidence: { label: "Add evidence", icon: Camera, chip: "border-primary-edge bg-primary-pale text-primary-text", dot: "bg-primary-pale text-primary-text", cta: "Open" },
  start_check: { label: "5-minute check", icon: MessagesSquare, chip: "border-info-edge bg-info-pale text-info-ink", dot: "bg-info-pale text-info-ink", cta: "Start" },
  awaiting_review: { label: "With the reviewer", icon: Clock, chip: "border-border bg-surface-alt text-muted", dot: "bg-surface-alt text-muted", cta: "View" },
};

// The single most urgent task, rendered as the one thing the eye lands on after the hero.
export function CoordinatorLeadCard({ task }: { task: CoordinatorTask }) {
  const presentation = KIND_PRESENTATION[task.kind];
  const Icon = presentation.icon;
  return (
    <div className="flex flex-col gap-3 rounded-card border border-primary-edge bg-primary-pale px-5 py-5">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${presentation.chip}`}>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {presentation.label}
        </span>
        <span className="font-mono text-xs text-muted">{task.familyCode}</span>
        <span className="ml-auto text-xs text-muted">~{task.estimatedEffortMinutes} min</span>
      </div>
      <p className="text-[19px] font-bold leading-snug text-ink">{task.title}</p>
      <p className="text-sm text-text-secondary">{task.reason}</p>
      <p className="text-[15px] font-semibold text-ink">{task.action}</p>
      {task.evidenceHint ? (
        <p className="rounded-card bg-surface px-3 py-2 text-sm text-text-secondary">{task.evidenceHint}</p>
      ) : null}
      <BigButton href={task.href} fullWidth icon={<ArrowRight className="size-4" aria-hidden />}>
        {presentation.cta}
      </BigButton>
    </div>
  );
}

// The rest of the plan: a quiet divided list, not a stack of identical cards.
export function CoordinatorTaskRow({ task }: { task: CoordinatorTask }) {
  const presentation = KIND_PRESENTATION[task.kind];
  const Icon = presentation.icon;
  const actionable = task.kind !== "awaiting_review";

  const inner = (
    <>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${presentation.dot}`}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink">{task.title}</span>
          <span className="shrink-0 font-mono text-[11px] text-muted">{task.familyCode}</span>
        </span>
        <span className="mt-0.5 block text-xs text-text-secondary">{task.reason}</span>
      </span>
      {actionable ? <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden /> : null}
    </>
  );

  return (
    <li>
      {actionable ? (
        <a href={task.href} className="focus-outline flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-alt">
          {inner}
        </a>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3.5">{inner}</div>
      )}
    </li>
  );
}
