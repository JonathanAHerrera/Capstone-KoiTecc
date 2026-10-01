import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ChevronLeft, Download, Info } from "lucide-react";
import { READINESS_DISCLAIMER } from "@/components/onboarding/readiness-disclaimer";
import { buildSummaryText } from "@/components/summary/build-summary-text";
import { CopySummaryButton } from "@/components/summary/copy-summary-button";
import { FamilyProgressList } from "@/components/summary/family-progress-list";
import { NeedsAttentionList, selectNeedsAttentionItems } from "@/components/summary/needs-attention-list";
import { ReadinessOverview } from "@/components/summary/readiness-overview";
import { BigButton } from "@/components/ui/big-button";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { getOrganization } from "@/lib/org";
import type { CmmcLevel, DerivedPracticeStatus, Practice } from "@/lib/practice-types";
import { getFamilies, getPracticesForLevel } from "@/lib/practices";
import { computeProgressFromStatuses } from "@/lib/progress";
import { listPracticeStatuses } from "@/lib/submissions";

export const metadata: Metadata = {
  title: "Readiness summary — CMMC Ready",
};

const LEVEL2_TOTAL_REQUIREMENT_COUNT = 110;

function sumPointsAtRisk(practices: Practice[], statuses: Record<string, DerivedPracticeStatus>): number {
  return practices.reduce(
    (pointsAtRisk, practice) => (statuses[practice.id] === "accepted" ? pointsAtRisk : pointsAtRisk + practice.pointValue),
    0,
  );
}

export default async function SummaryPage() {
  await connection();
  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const level: CmmcLevel = organization.targetLevel;
  const statuses = await listPracticeStatuses();
  const practices = getPracticesForLevel(level);
  const families = getFamilies(level);
  const progress = computeProgressFromStatuses(level, statuses);
  const needsAttentionItems = selectNeedsAttentionItems(practices, statuses);
  const pointsAtRisk = level === 2 ? sumPointsAtRisk(practices, statuses) : null;
  const summaryText = buildSummaryText({
    organizationName: organization.name,
    level,
    progress,
    families,
    statuses,
    needsAttentionItems,
    pointsAtRisk,
  });

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pb-[calc(152px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))]">
      <header className="flex flex-col gap-3">
        <Link
          href="/path"
          className="-ml-2 inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 text-[15px] font-extrabold text-primary hover:bg-surface"
        >
          <ChevronLeft className="size-6" strokeWidth={2.5} aria-hidden />
          Back to path
        </Link>
        <div>
          <p className="caption text-muted">{organization.name}</p>
          <h1 className="text-[26px]">Your Level {level} readiness</h1>
        </div>
      </header>

      <ReadinessOverview progress={progress} />

      {level === 1 ? (
        <p className="flex items-start gap-3 rounded-card border-2 border-info/30 bg-info-pale px-4 py-3 text-sm font-medium text-info-ink">
          <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <strong>Level 1 has no score:</strong> all {progress.total} requirements must be MET before you can affirm in
            SPRS.
          </span>
        </p>
      ) : (
        <div className="flex flex-col gap-2 rounded-card border-2 border-info/30 bg-info-pale px-4 py-3 text-sm font-medium text-info-ink">
          <p className="flex items-start gap-3">
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              This preview covers <strong>{progress.total} of {LEVEL2_TOTAL_REQUIREMENT_COUNT}</strong> Level 2
              requirements.
            </span>
          </p>
          <p className="pl-8">
            Points at risk among covered requirements: <strong className="tabular-nums">{pointsAtRisk}</strong>
          </p>
        </div>
      )}

      <FamilyProgressList families={families} statuses={statuses} />

      <NeedsAttentionList level={level} items={needsAttentionItems} />

      <p className="text-[13px] font-medium leading-snug text-muted">{READINESS_DISCLAIMER}</p>

      <BottomActionBar>
        <BigButton href="/api/export" download fullWidth icon={<Download />}>
          Download readiness package
        </BigButton>
        <CopySummaryButton summaryText={summaryText} />
      </BottomActionBar>
    </div>
  );
}
