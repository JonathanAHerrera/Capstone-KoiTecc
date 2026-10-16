import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Inbox, MessageCircle, ShieldAlert } from "lucide-react";
import { updateReviewerTaskStatusAction } from "@/app/reviewer-tasks/actions";
import {
  listOpenReviewerTasks,
  REVIEWER_TASK_KIND_LABELS,
  type ReviewerTaskStatus,
} from "@/lib/reviewer-tasks";
import { requireSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Reviewer tasks — CMMC Ready" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ReviewerTaskStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  closed: "Closed",
};

function formatTaskDate(timestamp: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export default async function ReviewerTasksPage() {
  await requireSessionUser();
  const tasks = await listOpenReviewerTasks();

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/path"
            aria-label="Back to home"
            className="focus-outline flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="caption text-muted">KOITECC workspace</p>
            <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em] text-ink">Reviewer tasks</h1>
          </div>
          <Inbox className="size-5 shrink-0 text-accent" aria-hidden />
        </div>
        <p className="mt-3 text-sm text-text-secondary">
          Follow up on incident help requests and suspicious-message escalations for this organization.
        </p>
      </header>

      {tasks.length === 0 ? (
        <section className="rounded-card border border-border bg-surface px-5 py-8 text-center">
          <MessageCircle className="mx-auto size-8 text-muted" aria-hidden />
          <h2 className="mt-3 text-base font-semibold text-ink">No open tasks</h2>
          <p className="mt-1 text-sm text-text-secondary">New requests will appear here when someone asks KOITECC for help.</p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-card border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning-ink" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="caption text-muted">{REVIEWER_TASK_KIND_LABELS[task.kind]}</p>
                  <h2 className="mt-1 font-semibold text-ink">{task.summary}</h2>
                  <p className="caption mt-1 text-muted">Requested {formatTaskDate(task.createdAt)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="status-chip border border-border bg-surface-alt text-text-secondary">
                  {STATUS_LABELS[task.status]}
                </span>
                {task.relatedIncidentId ? (
                  <Link href={`/incident/${task.relatedIncidentId}`} className="caption focus-outline text-accent hover:underline">
                    View incident
                  </Link>
                ) : null}
              </div>
              <form action={updateReviewerTaskStatusAction.bind(null, task.id, task.status === "open" ? "in_progress" : "closed")} className="mt-4">
                <button
                  type="submit"
                  className="focus-outline min-h-11 rounded-button border-2 border-accent bg-accent px-4 text-sm font-semibold text-white transition-transform hover:-translate-y-px"
                >
                  {task.status === "open" ? "Start task" : "Close task"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
