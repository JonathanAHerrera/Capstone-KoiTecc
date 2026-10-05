import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Download, RadioTower, SlidersHorizontal } from "lucide-react";
import { RadarItemCard } from "@/components/radar/radar-item-card";
import { RadarProfileForm } from "@/components/radar/radar-profile-form";
import { getOrganization } from "@/lib/org";
import { getRadarProfile, listRadarDecisions } from "@/lib/radar/profile";
import { getRadarFeed } from "@/lib/radar/sources";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Standards & Policy Radar — CMMC Ready" };

export default async function RadarPage() {
  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");
  const profile = await getRadarProfile();
  const [feed, decisions] = await Promise.all([getRadarFeed(profile), listRadarDecisions()]);
  const decisionsByItemId = new Map(decisions.map((decision) => [decision.itemId, decision]));

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pb-[calc(40px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))]">
      <header className="border-b border-border-subtle pb-5">
        <Link href="/path" className="focus-outline -ml-2 inline-flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-text-secondary hover:bg-surface-alt hover:text-ink"><ChevronLeft className="size-5" aria-hidden />Path</Link>
        <div className="mt-4 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-primary-edge bg-primary-pale text-primary-text"><RadioTower className="size-5" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink">Standards & Policy Radar</h1>
            <p className="mt-1 text-sm text-text-secondary">Official changes and active threats, matched to {organization.name}.</p>
          </div>
        </div>
      </header>

      <section className="rounded-card border border-border bg-surface p-4">
        <div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-primary-text" aria-hidden /><h2 className="text-base font-semibold text-ink">Company applicability profile</h2></div>
        <p className="mt-1 text-sm text-text-secondary">The radar uses these details to rank updates. It does not automatically decide whether a rule applies.</p>
        <details open={!profile} className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-primary-text">{profile ? "Review or edit profile" : "Complete profile to personalize the radar"}</summary>
          <div className="mt-4 border-t border-border-subtle pt-4"><RadarProfileForm profile={profile} defaultGovernmentContractor={true} defaultHandlesSensitiveData={organization.handlesCui} /></div>
        </details>
      </section>

      <section aria-labelledby="source-health-heading">
        <div className="flex items-end justify-between gap-3">
          <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Live sources</p><h2 id="source-health-heading" className="mt-1 text-lg font-semibold text-ink">Current feed</h2></div>
          <p className="text-xs text-muted">Refreshed {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }).format(new Date(feed.refreshedAt))}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {feed.sourceStatuses.map((status) => <div key={status.source} className="rounded-lg border border-border bg-surface px-3 py-2"><p className="text-xs font-semibold text-ink"><span className={`mr-1.5 inline-block size-2 rounded-full ${status.ok ? "bg-success" : "bg-warning"}`} />{status.source}</p><p className="mt-0.5 truncate text-[11px] text-muted" title={status.message}>{status.message}</p></div>)}
        </div>
      </section>

      <section aria-labelledby="radar-results-heading">
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Ranked for your business</p><h2 id="radar-results-heading" className="mt-1 text-lg font-semibold text-ink">Updates to review</h2></div>
          {decisions.length > 0 ? <a href="/api/radar/export" className="focus-outline inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-text hover:bg-surface-alt"><Download className="size-4" aria-hidden />Records</a> : null}
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {feed.items.length > 0 ? feed.items.map((item) => <RadarItemCard key={item.id} item={item} decision={decisionsByItemId.get(item.id)} />) : <p className="rounded-card border border-border bg-surface p-4 text-sm text-text-secondary">Official sources are temporarily unavailable. Your profile and saved decisions are still stored locally.</p>}
        </div>
      </section>
    </div>
  );
}
