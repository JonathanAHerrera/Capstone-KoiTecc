import { CircleAlert, CircleCheck, CircleDashed } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatTile } from "@/components/ui/stat-tile";
import type { ProgressSummary } from "@/lib/progress";

export type ReadinessOverviewProps = {
  progress: ProgressSummary;
};

export function readinessRemainingCount(progress: ProgressSummary): number {
  return progress.total - progress.accepted - progress.needsWork;
}

export function ReadinessOverview({ progress }: ReadinessOverviewProps) {
  const allAccepted = progress.total > 0 && progress.accepted === progress.total;

  return (
    <section aria-label="Readiness overview" className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-4 py-6">
        <ProgressRing
          fraction={progress.total === 0 ? 0 : progress.accepted / progress.total}
          sizePx={160}
          strokeWidthPx={12}
          fillColor="var(--color-primary-text)"
          label="Percent of requirements accepted"
        >
          <span className="flex flex-col items-center leading-none">
            <span className={`tabular-nums display text-[56px] ${allAccepted ? "gradient-text" : "text-ink"}`}>
              {progress.percent}
              <span className="text-[28px]">%</span>
            </span>
            <span className="caption mt-1 text-muted">ready</span>
          </span>
        </ProgressRing>
        <p className="text-center text-sm text-text-secondary">
          {progress.accepted} of {progress.total} requirements accepted
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatTile value={progress.accepted} label="Accepted" icon={<CircleCheck />} accentColor="var(--color-success-ink)" />
        <StatTile value={progress.needsWork} label="Needs work" icon={<CircleAlert />} accentColor="var(--color-warning-ink)" />
        <StatTile value={readinessRemainingCount(progress)} label="Remaining" icon={<CircleDashed />} accentColor="var(--color-text-secondary)" />
      </div>
    </section>
  );
}
