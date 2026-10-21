import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Info, Sparkles } from "lucide-react";
import { buildPathViewModel } from "@/components/path/build-path-view-model";
import { NeedsAttentionList } from "@/components/path/needs-attention-list";
import { parseCelebrationIntensity } from "@/components/path/parse-celebration-intensity";
import { PathCelebration } from "@/components/path/path-celebration";
import { PathFamilies } from "@/components/path/path-families";
import { PathFooter } from "@/components/path/path-footer";
import { PathHeroCard } from "@/components/path/path-hero-card";
import { PathTopBar } from "@/components/path/path-top-bar";
import { SafetyToolsLinks } from "@/components/path/safety-tools-links";
import { selectNeedsAttention } from "@/components/path/select-needs-attention";
import { TrackSwitcher, type TrackSwitcherEntry } from "@/components/path/track-switcher";
import { getInterviewFindingStatuses } from "@/lib/interview";
import { getOrganization, parseEnabledFrameworks } from "@/lib/org";
import { getFamilies, getPracticeCountForLevel } from "@/lib/practices";
import type { CmmcLevel } from "@/lib/practice-types";
import { computeProgressForFramework, computeProgressFromStatuses } from "@/lib/progress";
import { listPracticeStatuses } from "@/lib/submissions";

const LEVEL_TWO_TOTAL_REQUIREMENT_COUNT = 110;

export const dynamic = "force-dynamic";

type PathHomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PathHomePage({ searchParams }: PathHomePageProps) {
  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const [resolvedSearchParams, statuses, interviewFindings] = await Promise.all([
    searchParams,
    listPracticeStatuses(),
    getInterviewFindingStatuses(),
  ]);
  const celebrationIntensity = parseCelebrationIntensity(resolvedSearchParams.celebrate);
  const targetLevel = organization.targetLevel as CmmcLevel;
  const families = getFamilies(targetLevel);
  const progress = computeProgressFromStatuses(targetLevel, statuses);
  const pathViewModel = buildPathViewModel(families, statuses, interviewFindings);
  const needsAttention = selectNeedsAttention(pathViewModel.families.flatMap((family) => family.nodes));

  const enabledFrameworks = parseEnabledFrameworks(organization);
  const trackEntries: TrackSwitcherEntry[] = await Promise.all(
    enabledFrameworks.map(async (framework): Promise<TrackSwitcherEntry> => {
      const frameworkProgress = await computeProgressForFramework(framework);
      return {
        framework,
        accepted: frameworkProgress.accepted,
        total: frameworkProgress.total,
        percent: frameworkProgress.percent,
      };
    }),
  );

  return (
    <div className="flex flex-col gap-8 px-4 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <PathCelebration intensity={celebrationIntensity} />

      <PathTopBar organizationName={organization.name} targetLevel={targetLevel} />

      <PathHeroCard progress={progress} />

      <Link
        href="/coordinator"
        className="focus-outline flex items-center justify-between gap-3 rounded-card border border-primary-edge bg-primary-pale px-4 py-3 text-left transition-colors hover:bg-primary-pale/70"
      >
        <span className="flex items-center gap-2.5">
          <Sparkles className="size-5 text-primary-text" aria-hidden />
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-primary-text">Ask your agent what&apos;s next</span>
            <span className="text-xs text-text-secondary">A prioritized plan built from where you stand</span>
          </span>
        </span>
        <ChevronRight className="size-5 text-primary-text" aria-hidden />
      </Link>

      <TrackSwitcher entries={trackEntries} />

      <SafetyToolsLinks />

      <NeedsAttentionList rows={needsAttention.rows} totalCount={needsAttention.totalCount} />

      {targetLevel === 2 ? (
        <div role="note" className="rounded-card bg-dark-surface px-4 py-4 text-white">
          <p className="caption flex items-center gap-1.5 text-dark-eyebrow">
            <Info className="size-4 shrink-0" aria-hidden />
            Level 2 preview
          </p>
          <p className="display mt-1 text-[28px] leading-none">
            {getPracticeCountForLevel(2)} of {LEVEL_TWO_TOTAL_REQUIREMENT_COUNT} requirements
          </p>
          <p className="mt-1.5 text-sm text-white/80">This preview covers a subset of the Level 2 requirements.</p>
        </div>
      ) : null}

      <PathFamilies families={pathViewModel.families} currentPracticeId={pathViewModel.currentPracticeId} />

      <PathFooter showDesignShowcaseLink={process.env.NODE_ENV !== "production"} />
    </div>
  );
}
