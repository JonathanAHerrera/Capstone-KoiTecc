import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardList, Info } from "lucide-react";
import { buildPathViewModel } from "@/components/path/build-path-view-model";
import { PathFamilies } from "@/components/path/path-families";
import { ReadinessOverview } from "@/components/summary/readiness-overview";
import { getOrganization } from "@/lib/org";
import { getGroupsForFramework } from "@/lib/practices";
import { FRAMEWORK_ORDER, FRAMEWORKS, type FrameworkId } from "@/lib/practice-types";
import { computeProgressForFrameworkFromStatuses, type ProgressSummary } from "@/lib/progress";
import { listPracticeStatusesForFramework } from "@/lib/submissions";

export const dynamic = "force-dynamic";

type TrackPageProps = { params: Promise<{ framework: string }> };

function parseFrameworkParam(value: string): FrameworkId | null {
  return FRAMEWORK_ORDER.includes(value as FrameworkId) ? (value as FrameworkId) : null;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { framework: frameworkParam } = await params;
  const framework = parseFrameworkParam(frameworkParam);
  if (!framework) notFound();
  // CMMC keeps its canonical /path experience; the generic track route is for the Texas frameworks.
  if (framework === "cmmc") redirect("/path");

  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const meta = FRAMEWORKS[framework];
  const statuses = await listPracticeStatusesForFramework(framework);
  const groups = getGroupsForFramework(framework);
  const pathViewModel = buildPathViewModel(groups, statuses);
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

  return (
    <div className="flex flex-col gap-8 px-4 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/path"
            aria-label="Back to your CMMC path"
            className="focus-outline flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="caption text-muted">{meta.jurisdiction === "texas" ? "Texas track" : "Federal track"}</p>
            <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em] text-ink">{meta.shortName}</h1>
          </div>
          <Link
            href={`/summary/${framework}`}
            aria-label={`Open ${meta.shortName} summary`}
            className="focus-outline flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <ClipboardList className="size-5" strokeWidth={2} aria-hidden />
          </Link>
        </div>
        <p className="mt-3 text-sm text-text-secondary">{meta.fullName}</p>
      </header>

      <div role="note" className="rounded-card bg-dark-surface px-4 py-4 text-white">
        <p className="caption flex items-center gap-1.5 text-dark-eyebrow">
          <Info className="size-4 shrink-0" aria-hidden />
          Educational readiness aid
        </p>
        <p className="mt-1.5 text-sm text-white/80">{meta.disclaimer}</p>
      </div>

      <ReadinessOverview progress={overviewProgress} />

      <PathFamilies families={pathViewModel.families} currentPracticeId={pathViewModel.currentPracticeId} />
    </div>
  );
}
