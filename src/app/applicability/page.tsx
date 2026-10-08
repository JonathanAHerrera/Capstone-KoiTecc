import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ChevronLeft, Compass, Info } from "lucide-react";
import { ApplicabilityCard } from "@/components/applicability/applicability-card";
import { TexasProfileForm } from "@/components/applicability/texas-profile-form";
import { computeApplicability } from "@/lib/applicability";
import { getOrganization, parseEnabledFrameworks, type TexasProfileInput } from "@/lib/org";
import { getRadarProfile } from "@/lib/radar/profile";
import { hasAnthropicApiKey } from "@/lib/reviewer";

export const dynamic = "force-dynamic";

export default async function ApplicabilityPage() {
  await connection();
  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const radarProfile = await getRadarProfile();
  const [applicability, enabledFrameworks] = await Promise.all([
    computeApplicability(organization, radarProfile),
    Promise.resolve(parseEnabledFrameworks(organization)),
  ]);
  const enabledSet = new Set(enabledFrameworks);

  const initialProfile: TexasProfileInput = {
    handlesTexasResidentData: organization.handlesTexasResidentData,
    sellsToStateOfTexas: organization.sellsToStateOfTexas,
    texasPhysicalPresence: organization.texasPhysicalPresence,
    processesPersonalDataAtScale: organization.processesPersonalDataAtScale,
  };

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))]">
      <header className="flex flex-col gap-3">
        <Link
          href="/path"
          className="focus-outline -ml-2 inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 text-[15px] font-medium text-primary-text hover:bg-surface-alt"
        >
          <ChevronLeft className="size-6" strokeWidth={2} aria-hidden />
          Back to path
        </Link>
        <div className="flex items-start gap-2.5">
          <Compass className="mt-1 size-7 shrink-0 text-primary-text" aria-hidden />
          <div>
            <p className="caption text-muted">What applies to me?</p>
            <h1 className="display text-[32px] leading-tight">Which rules reach your business</h1>
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          Answer a few questions and we&apos;ll map the federal and Texas frameworks most likely to apply, then let you
          turn each one into a track.
        </p>
      </header>

      <TexasProfileForm initialProfile={initialProfile} />

      <div className="rounded-card bg-dark-surface px-4 py-4 text-white">
        <p className="caption flex items-center gap-1.5 text-dark-eyebrow">
          <Info className="size-4 shrink-0" aria-hidden />
          {hasAnthropicApiKey() ? "AI-assisted guidance" : "Rule-based guidance"}
        </p>
        <p className="mt-1.5 text-sm text-white/80">
          These verdicts are an educational starting point, not legal advice. Confirm obligations with qualified
          counsel before acting.
        </p>
      </div>

      <section aria-labelledby="results-heading" className="flex flex-col gap-3">
        <h2 id="results-heading" className="text-lg font-semibold text-ink">
          Your frameworks
        </h2>
        <div className="flex flex-col gap-3">
          {applicability.map((entry) => (
            <ApplicabilityCard
              key={entry.framework}
              applicability={entry}
              isEnabled={enabledSet.has(entry.framework)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
