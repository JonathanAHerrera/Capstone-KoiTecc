import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleCheckBig, ShieldCheck } from "lucide-react";
import { CoordinatorLeadCard, CoordinatorTaskRow } from "@/components/coordinator/coordinator-task-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { computeCoordinatorPlan } from "@/lib/coordinator";
import { getOrganization } from "@/lib/org";
import { getSessionUser } from "@/lib/session";
import { FRAMEWORKS } from "@/lib/practice-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "What's next · CMMC Ready" };

export default async function CoordinatorPage() {
  if (!(await getSessionUser())) redirect("/sign-in?redirect=/coordinator");
  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const plan = await computeCoordinatorPlan();
  const percentDone = plan.totalCount === 0 ? 0 : Math.round((plan.doneCount / plan.totalCount) * 100);
  const [leadTask, ...restTasks] = plan.tasks;
  const onTrack = percentDone > 0 && percentDone < 100;

  return (
    <div className="agent-surface flex min-h-dvh flex-col gap-6 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:py-7">
      {/* Hero: the agent's voice is the first thing you meet, with readiness as support. */}
      <section className="flex flex-col gap-4 rounded-card border border-primary-edge bg-surface px-5 py-5 shadow-float">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast">
            <ShieldCheck className="size-5" strokeWidth={2.25} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="agent-label">Your readiness agent</p>
            <p className="text-sm font-semibold text-ink">What&apos;s next</p>
          </div>
          {onTrack ? (
            <span
              className="ml-auto rounded-full border px-2.5 py-1 text-xs font-semibold"
              style={{ background: "var(--agent-accent-pale)", borderColor: "var(--agent-accent-edge)", color: "var(--agent-accent)" }}
            >
              On track
            </span>
          ) : null}
        </div>

        <p className="text-[20px] font-semibold leading-snug text-ink">{plan.narration}</p>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-ink">You&apos;re {percentDone}% ready</span>
            <span className="text-sm text-text-secondary">{plan.doneCount} of {plan.totalCount} accepted</span>
          </div>
          <ProgressBar completed={plan.doneCount} total={plan.totalCount} />
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(290px,.75fr)]">
      {plan.tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-success-edge bg-success-pale px-4 py-10 text-center text-success-ink">
          <CircleCheckBig className="size-8" aria-hidden />
          <p className="font-semibold">Nothing is waiting on you.</p>
          <p className="text-sm">When a review comes back or you start a new area, your next step shows up here.</p>
        </div>
      ) : (
        <section aria-label="Next steps" className="flex flex-col gap-3">
          <h2 className="agent-label">Start here</h2>
          <CoordinatorLeadCard task={leadTask} />

          {restTasks.length > 0 ? (
            <>
              <h2 className="agent-label mt-1">Then</h2>
              <ul className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border bg-surface">
                {restTasks.map((task) => (
                  <CoordinatorTaskRow key={task.id} task={task} />
                ))}
              </ul>
            </>
          ) : null}
        </section>
      )}

      <div className="flex flex-col gap-6">
      {plan.awaiting.length > 0 ? (
        <section aria-label="With the reviewer" className="flex flex-col gap-3">
          <h2 className="agent-label">With the reviewer</h2>
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border bg-surface">
            {plan.awaiting.map((task) => (
              <CoordinatorTaskRow key={task.id} task={task} />
            ))}
          </ul>
        </section>
      ) : null}

      <aside className="rounded-card border border-border bg-surface-alt p-4">
        <p className="agent-label">How your agent works</p>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">Your plan adapts whenever you finish an interview, upload evidence, or receive a review. It will never mark evidence accepted on its own.</p>
      </aside>
      <p className="text-xs leading-relaxed text-muted">{FRAMEWORKS.cmmc.disclaimer}</p>
      </div>
      </div>
    </div>
  );
}
