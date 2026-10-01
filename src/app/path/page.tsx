import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { buildPathViewModel } from "@/components/path/build-path-view-model";
import { NeedsAttentionList } from "@/components/path/needs-attention-list";
import { parseCelebrationIntensity } from "@/components/path/parse-celebration-intensity";
import { PathCelebration } from "@/components/path/path-celebration";
import { PathFamilies } from "@/components/path/path-families";
import { PathFooter } from "@/components/path/path-footer";
import { PathHeroCard } from "@/components/path/path-hero-card";
import { PathTopBar } from "@/components/path/path-top-bar";
import { selectNeedsAttention } from "@/components/path/select-needs-attention";
import { getOrganization } from "@/lib/org";
import { getFamilies, getPracticeCountForLevel } from "@/lib/practices";
import type { CmmcLevel } from "@/lib/practice-types";
import { computeProgressFromStatuses } from "@/lib/progress";
import { listPracticeStatuses } from "@/lib/submissions";

const LEVEL_TWO_TOTAL_REQUIREMENT_COUNT = 110;

export const dynamic = "force-dynamic";

type PathHomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PathHomePage({ searchParams }: PathHomePageProps) {
  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const [resolvedSearchParams, statuses] = await Promise.all([searchParams, listPracticeStatuses()]);
  const celebrationIntensity = parseCelebrationIntensity(resolvedSearchParams.celebrate);
  const targetLevel = organization.targetLevel as CmmcLevel;
  const families = getFamilies(targetLevel);
  const progress = computeProgressFromStatuses(targetLevel, statuses);
  const pathViewModel = buildPathViewModel(families, statuses);
  const needsAttention = selectNeedsAttention(pathViewModel.families.flatMap((family) => family.nodes));

  return (
    <div className="flex flex-col gap-8 px-4 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <PathCelebration intensity={celebrationIntensity} />

      <PathTopBar organizationName={organization.name} targetLevel={targetLevel} />

      <PathHeroCard progress={progress} />

      <NeedsAttentionList rows={needsAttention.rows} totalCount={needsAttention.totalCount} />

      {targetLevel === 2 ? (
        <p
          role="note"
          className="flex items-start gap-2 rounded-card border-2 border-info/30 bg-info-pale px-4 py-3 text-sm font-bold text-info-ink"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          This preview covers {getPracticeCountForLevel(2)} of the {LEVEL_TWO_TOTAL_REQUIREMENT_COUNT} Level 2 requirements.
        </p>
      ) : null}

      <PathFamilies families={pathViewModel.families} currentPracticeId={pathViewModel.currentPracticeId} />

      <PathFooter showDesignShowcaseLink={process.env.NODE_ENV !== "production"} />
    </div>
  );
}
