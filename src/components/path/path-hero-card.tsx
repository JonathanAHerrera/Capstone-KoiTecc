import Link from "next/link";
import { CircleAlert, CircleCheck, Target } from "lucide-react";
import { GlareHover } from "@/components/ui/glare-hover";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SpeechBubble } from "@/components/ui/speech-bubble";
import { StatTile } from "@/components/ui/stat-tile";
import { readinessRemainingCount } from "@/components/summary/readiness-overview";
import type { ProgressSummary } from "@/lib/progress";

export type PathHeroCardProps = {
  progress: ProgressSummary;
};

function ProgressGuideMessage({ progress }: { progress: ProgressSummary }) {
  const remainingCount = readinessRemainingCount(progress);
  if (progress.accepted === 0) {
    return (
      <>
        Tap the <strong>first step</strong> to begin. Most take 15–30 minutes.
      </>
    );
  }
  if (remainingCount === 0 && progress.needsWork === 0) {
    return (
      <>
        Every requirement has an accepted review.{" "}
        <Link href="/summary" className="text-primary-text underline underline-offset-4">
          Open your summary
        </Link>
        .
      </>
    );
  }
  return (
    <>
      Nice. <strong>{remainingCount}</strong> to go
      {progress.needsWork > 0 ? (
        <>
          , <strong>{progress.needsWork}</strong> to fix
        </>
      ) : null}
      .
    </>
  );
}

export function PathHeroCard({ progress }: PathHeroCardProps) {
  const fraction = progress.total === 0 ? 0 : progress.accepted / progress.total;

  return (
    <section aria-label="Your progress" className="flex flex-col gap-4">
      <GlareHover glareOpacity={0.3} playOnce className="rounded-card">
        <div className="flex items-center gap-4 rounded-card border border-border bg-surface p-4">
          <ProgressRing fraction={fraction} sizePx={104} strokeWidthPx={10} label="Requirements accepted">
            <span className="tabular-nums text-[26px] font-medium leading-none tracking-[-0.02em] text-ink">{progress.percent}%</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="caption text-muted">Readiness</p>
            <p className="mt-1 text-lg font-semibold leading-tight text-ink">
              <span className="tabular-nums">{progress.accepted}</span> of{" "}
              <span className="tabular-nums">{progress.total}</span> requirements accepted
            </p>
            <p className="mt-1 text-sm text-text-secondary">Level {progress.level} readiness review, not an assessment.</p>
          </div>
        </div>
      </GlareHover>

      <div className="grid grid-cols-3 gap-3">
        <StatTile value={progress.accepted} label="Accepted" icon={<CircleCheck />} accentColor="var(--color-success-ink)" />
        <StatTile value={progress.needsWork} label="Needs work" icon={<CircleAlert />} accentColor="var(--color-warning-ink)" />
        <StatTile value={readinessRemainingCount(progress)} label="Remaining" icon={<Target />} />
      </div>

      <SpeechBubble>
        <ProgressGuideMessage progress={progress} />
      </SpeechBubble>
    </section>
  );
}
