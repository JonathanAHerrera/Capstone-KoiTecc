import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PiggyBank, TrendingUp } from "lucide-react";
import { ValueDriverCard } from "@/components/value/value-driver-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getOrganization } from "@/lib/org";
import { getSessionUser } from "@/lib/session";
import { computeValueEstimate, formatUsdRange, VALUE_DISCLAIMER } from "@/lib/value";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "What this is worth · CMMC Ready" };

export default async function ValuePage() {
  if (!(await getSessionUser())) redirect("/sign-in?redirect=/value");
  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const estimate = await computeValueEstimate();

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:py-7">
      <header className="flex flex-col gap-1">
        <p className="caption text-muted">{organization.name}</p>
        <h1 className="display text-[32px] leading-tight">What this is worth to you</h1>
      </header>

      {/* Hero: the one honest "money saved" figure, plus the agent's one-line reason. */}
      <section className="flex flex-col gap-4 rounded-card border border-success-edge bg-success-pale px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-ink text-canvas">
            <PiggyBank className="size-5" strokeWidth={2.25} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="caption text-success-ink/80">Estimated savings vs. hiring it out</p>
            <p className="text-[28px] font-extrabold leading-none tracking-tight text-success-ink tabular-nums">
              {formatUsdRange(estimate.savingsLow, estimate.savingsHigh)}
            </p>
          </div>
        </div>

        <p className="text-[17px] font-medium leading-snug text-ink">{estimate.narration}</p>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-success-ink">
            <TrendingUp className="size-4 shrink-0" aria-hidden />
            Earned so far: {formatUsdRange(estimate.savingsRealizedLow, estimate.savingsRealizedHigh)}
          </div>
          <ProgressBar completed={estimate.savingsRealizedHigh} total={estimate.savingsHigh} />
          <p className="text-xs text-success-ink/80">Grows as more of your requirements are accepted.</p>
        </div>
      </section>

      <section aria-label="Why this pays off" className="grid items-start gap-4 md:grid-cols-2">
        {estimate.drivers.map((driver) => (
          <ValueDriverCard key={driver.id} driver={driver} />
        ))}
      </section>

      <p className="text-xs leading-relaxed text-muted">{VALUE_DISCLAIMER}</p>
    </div>
  );
}
