import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleCheckBig } from "lucide-react";
import { CoordinatorTaskCard } from "@/components/coordinator/coordinator-task-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SpeechBubble } from "@/components/ui/speech-bubble";
import { computeCoordinatorPlan } from "@/lib/coordinator";
import { getOrganization } from "@/lib/org";
import { FRAMEWORKS } from "@/lib/practice-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "What's next · CMMC Ready" };

export default async function CoordinatorPage() {
  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const plan = await computeCoordinatorPlan();
  const percentDone = plan.totalCount === 0 ? 0 : Math.round((plan.doneCount / plan.totalCount) * 100);

  return (
    <div className="flex flex-col gap-6 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="flex flex-col gap-1">
        <h1 className="display text-[26px] leading-tight">What&apos;s next</h1>
        <p className="text-sm text-text-secondary">
          Your readiness agent looks at where you stand and lines up the next steps.
        </p>
      </header>

      <SpeechBubble>{plan.narration}</SpeechBubble>

      <section aria-label="Progress" className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-ink">{plan.doneCount} of {plan.totalCount} accepted</span>
          <span className="text-text-secondary">{percentDone}%</span>
        </div>
        <ProgressBar completed={plan.doneCount} total={plan.totalCount} />
      </section>

      {plan.tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-success-edge bg-success-pale px-4 py-8 text-center text-success-ink">
          <CircleCheckBig className="size-8" aria-hidden />
          <p className="font-semibold">Nothing is waiting on you.</p>
          <p className="text-sm">When a review comes back or you start a new area, your next steps show up here.</p>
        </div>
      ) : (
        <section aria-label="Next steps" className="flex flex-col gap-2">
          <h2 className="caption text-muted">Next steps</h2>
          <ul className="flex flex-col gap-2.5">
            {plan.tasks.map((task) => (
              <CoordinatorTaskCard key={task.id} task={task} />
            ))}
          </ul>
        </section>
      )}

      {plan.awaiting.length > 0 ? (
        <section aria-label="With the reviewer" className="flex flex-col gap-2">
          <h2 className="caption text-muted">With the reviewer</h2>
          <ul className="flex flex-col gap-2.5">
            {plan.awaiting.map((task) => (
              <CoordinatorTaskCard key={task.id} task={task} />
            ))}
          </ul>
        </section>
      ) : null}

      <p role="note" className="rounded-card border border-border bg-surface-alt px-3 py-2 text-xs text-text-secondary">
        {FRAMEWORKS.cmmc.disclaimer}
      </p>
    </div>
  );
}
