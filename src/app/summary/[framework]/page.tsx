import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { ChevronLeft, ChevronRight, Download, Info } from "lucide-react";
import { ReadinessOverview } from "@/components/summary/readiness-overview";
import { BigButton } from "@/components/ui/big-button";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusChip } from "@/components/ui/status-chip";
import { getFramework, parseFrameworkId } from "@/frameworks";
import { getOrganization } from "@/lib/org";
import { getGroupsForFramework } from "@/lib/practices";
import {
  FRAMEWORKS,
  type DerivedPracticeStatus,
  type Practice,
} from "@/lib/practice-types";
import { computeProgressForFrameworkFromStatuses, type ProgressSummary } from "@/lib/progress";
import { listPracticeStatusesForFramework } from "@/lib/submissions";

export const dynamic = "force-dynamic";

type FrameworkSummaryPageProps = { params: Promise<{ framework: string }> };

export default async function FrameworkSummaryPage({ params }: FrameworkSummaryPageProps) {
  await connection();
  const { framework: frameworkParam } = await params;
  const framework = parseFrameworkId(frameworkParam);
  if (!framework) notFound();
  // Frameworks with bespoke routes (CMMC's /summary with SPRS + POA&M) redirect out of the generic page.
  const definition = getFramework(framework);
  if (definition.hasDedicatedRoutes) redirect(definition.summaryRoute);

  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const meta = FRAMEWORKS[framework];
  const statuses = await listPracticeStatusesForFramework(framework);
  const groups = getGroupsForFramework(framework);
  const frameworkProgress = computeProgressForFrameworkFromStatuses(framework, statuses);
  const overviewProgress: ProgressSummary = {
    level: 1,
    total: frameworkProgress.total,
    accepted: frameworkProgress.accepted,
    needsWork: frameworkProgress.needsWork,
    underReview: frameworkProgress.underReview,
    inProgress: frameworkProgress.inProgress,
    notStarted: frameworkProgress.notStarted,
    percent: frameworkProgress.percent,
  };

  const openItems: { practice: Practice; status: Extract<DerivedPracticeStatus, "needs_work" | "not_started"> }[] =
    groups
      .flatMap((group) => group.practices)
      .flatMap((practice) => {
        const status = statuses[practice.id] ?? "not_started";
        return status === "needs_work" || status === "not_started" ? [{ practice, status }] : [];
      });

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pb-[calc(152px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))]">
      <header className="flex flex-col gap-3">
        <Link
          href={`/track/${framework}`}
          className="focus-outline -ml-2 inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 text-[15px] font-medium text-primary-text hover:bg-surface-alt"
        >
          <ChevronLeft className="size-6" strokeWidth={2} aria-hidden />
          Back to track
        </Link>
        <div>
          <p className="caption text-muted">{meta.fullName}</p>
          <h1 className="display text-[36px]">Your {meta.shortName} readiness</h1>
        </div>
      </header>

      <ReadinessOverview progress={overviewProgress} />

      <div className="rounded-card bg-dark-surface px-4 py-4 text-white">
        <p className="caption flex items-center gap-1.5 text-dark-eyebrow">
          <Info className="size-4 shrink-0" aria-hidden />
          Educational readiness aid
        </p>
        <p className="mt-1.5 text-sm text-white/80">{meta.disclaimer}</p>
      </div>

      <section aria-labelledby="topic-progress-heading" className="flex flex-col gap-3">
        <h2 id="topic-progress-heading" className="text-lg">
          By topic
        </h2>
        <ul className="flex flex-col gap-2">
          {groups.map((group) => {
            const acceptedCount = group.practices.filter(
              (practice) => statuses[practice.id] === "accepted",
            ).length;
            return (
              <li
                key={group.code}
                className="flex flex-col gap-1.5 rounded-card border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-medium text-ink">{group.name}</span>
                  <span className="tabular-nums shrink-0 text-[13px] font-medium text-text-secondary">
                    {acceptedCount}/{group.practices.length}
                  </span>
                </div>
                <ProgressBar
                  completed={acceptedCount}
                  total={group.practices.length}
                  label={`${group.name} progress`}
                  heightPx={8}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="open-items-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="open-items-heading" className="text-lg">
            Open items
          </h2>
          <span className="caption text-muted">{openItems.length}</span>
        </div>
        {openItems.length === 0 ? (
          <p className="rounded-card border border-success-edge bg-success-pale px-4 py-4 text-[15px] font-medium text-success-ink">
            Nothing open. Every requirement has been submitted or accepted.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {openItems.map(({ practice, status }) => (
              <li key={practice.id}>
                <Link
                  href={`/practice/${practice.id}`}
                  className="card-ring focus-outline flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 transition-colors hover:bg-canvas"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="caption text-muted">{practice.legalRef ?? practice.id}</span>
                    <span className="text-[15px] font-medium leading-snug text-ink">{practice.title}</span>
                    <StatusChip status={status} size="small" />
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[13px] leading-snug text-muted">{meta.disclaimer}</p>

      <BottomActionBar>
        <BigButton
          href={`/api/export?framework=${framework}`}
          prefetch={false}
          download
          fullWidth
          icon={<Download />}
        >
          Download readiness summary
        </BigButton>
      </BottomActionBar>
    </div>
  );
}
